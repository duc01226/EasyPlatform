#!/usr/bin/env node
/**
 * Prompt Context Assembler - UserPromptSubmit Hook
 *
 * Assembles all UserPromptSubmit context injections into a single hook:
 * - Session info, rules, modularization reminders, Plan Context
 * - Development rules file content
 * - Lessons learned (docs/project-reference/lessons.md)
 * - Lesson-learned reminder (task planning + /learn prompt)
 *
 * Replaces: dev-rules-reminder + lessons-injector (UserPromptSubmit) + lesson-learned-reminder
 *
 * Exit Codes:
 *   0 - Success (non-blocking, allows continuation)
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const { loadConfig, resolvePlanPath, getReportsPath, resolveNamingPattern, normalizePath } = require('./lib/ck-config-utils.cjs');
const { injectLessons, injectCriticalContext, injectWorkflowProtocol, injectLessonReminder } = require('./lib/prompt-injections.cjs');

// ═══════════════════════════════════════════════════════════════════════════
// DEDUPLICATION
// ═══════════════════════════════════════════════════════════════════════════

const {
    PROJECT_STRUCTURE: PROJECT_STRUCTURE_MARKER,
    CLAUDE_MD: CLAUDE_MD_MARKER,
    PROJECT_CONFIG_SUMMARY: PROJECT_CONFIG_SUMMARY_MARKER,
    DEDUP_LINES,
    TOP_DEDUP_LINES
} = require('./lib/dedup-constants.cjs');
const { generateProjectSummary } = require('./lib/project-config-loader.cjs');
const { readAndInjectDoc } = require('./lib/context-injector-base.cjs');

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function execSafe(cmd) {
    try {
        return execSync(cmd, {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe']
        }).trim();
    } catch (e) {
        return null;
    }
}

function resolveWorkflowPath(filename) {
    const localPath = path.join(process.cwd(), '.claude', 'workflows', filename);
    const globalPath = path.join(os.homedir(), '.claude', 'workflows', filename);
    if (fs.existsSync(localPath)) return `.claude/workflows/${filename}`;
    if (fs.existsSync(globalPath)) return `~/.claude/workflows/${filename}`;
    return null;
}

function resolveScriptPath(filename) {
    const localPath = path.join(process.cwd(), '.claude', 'scripts', filename);
    const globalPath = path.join(os.homedir(), '.claude', 'scripts', filename);
    if (fs.existsSync(localPath)) return `.claude/scripts/${filename}`;
    if (fs.existsSync(globalPath)) return `~/.claude/scripts/${filename}`;
    return null;
}

function resolveSkillsVenv() {
    const isWindows = process.platform === 'win32';
    const venvBin = isWindows ? 'Scripts' : 'bin';
    const pythonExe = isWindows ? 'python.exe' : 'python3';

    const localVenv = path.join(process.cwd(), '.claude', 'skills', '.venv', venvBin, pythonExe);
    const globalVenv = path.join(os.homedir(), '.claude', 'skills', '.venv', venvBin, pythonExe);

    if (fs.existsSync(localVenv)) {
        return isWindows ? '.claude\\skills\\.venv\\Scripts\\python.exe' : '.claude/skills/.venv/bin/python3';
    }
    if (fs.existsSync(globalVenv)) {
        return isWindows ? '~\\.claude\\skills\\.venv\\Scripts\\python.exe' : '~/.claude/skills/.venv/bin/python3';
    }
    return null;
}

function buildPlanContext(sessionId, config) {
    const { plan, paths } = config;
    const gitBranch = execSafe('git branch --show-current');
    const resolved = resolvePlanPath(sessionId, config);
    const reportsPath = getReportsPath(resolved.path, resolved.resolvedBy, plan, paths);

    // Compute naming pattern directly for reliable injection
    const namePattern = resolveNamingPattern(plan, gitBranch);

    const planLine =
        resolved.resolvedBy === 'session'
            ? `- Plan: ${resolved.path}`
            : resolved.resolvedBy === 'branch'
              ? `- Plan: none | Suggested: ${resolved.path}`
              : `- Plan: none`;

    // Validation config (injected so LLM can reference it)
    const validation = plan.validation || {};
    const validationMode = validation.mode || 'prompt';
    const validationMin = validation.minQuestions || 3;
    const validationMax = validation.maxQuestions || 8;

    return {
        reportsPath,
        gitBranch,
        planLine,
        namePattern,
        validationMode,
        validationMin,
        validationMax
    };
}

function wasRecentlyInjected(transcriptPath) {
    try {
        if (!transcriptPath || !fs.existsSync(transcriptPath)) return false;
        const lines = fs.readFileSync(transcriptPath, 'utf-8').split('\n');
        return isMarkerInContext(lines, '[IMPORTANT] Consider Modularization', DEDUP_LINES.DEV_RULES_MODULARIZATION);
    } catch (e) {
        return false;
    }
}

/**
 * Check if marker exists in cached transcript lines — bottom (recency) OR top (primacy).
 * Prevents duplicate injection when content is at top of context from earlier prompts.
 * @param {string[]} lines - Pre-split transcript lines
 * @param {string} marker - Marker string to search for
 * @param {number} bottomWindow - Number of trailing lines to check
 * @param {number} [topWindow=50] - Number of leading lines to check
 * @returns {boolean}
 */
function isMarkerInContext(lines, marker, bottomWindow, topWindow = TOP_DEDUP_LINES) {
    if (!lines || lines.length === 0) return false;
    if (lines.slice(-bottomWindow).some(l => l.includes(marker))) return true;
    if (lines.slice(0, topWindow).some(l => l.includes(marker))) return true;
    return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// REMINDER TEMPLATE (all output in one place for visibility)
// ═══════════════════════════════════════════════════════════════════════════

function buildReminder({
    thinkingLanguage,
    responseLanguage,
    catalogScript,
    skillsVenv,
    reportsPath,
    plansPath,
    docsPath,
    planLine,
    gitBranch,
    namePattern,
    validationMode,
    validationMin,
    validationMax
}) {
    // Build language instructions based on config
    // Auto-default thinkingLanguage to 'en' when only responseLanguage is set
    const effectiveThinking = thinkingLanguage || (responseLanguage ? 'en' : null);
    const hasThinking = effectiveThinking && effectiveThinking !== responseLanguage;
    const hasResponse = responseLanguage;
    const languageLines = [];

    if (hasThinking || hasResponse) {
        languageLines.push(`## Language`);
        if (hasThinking) {
            languageLines.push(`- Thinking: Use ${effectiveThinking} for reasoning (logic, precision).`);
        }
        if (hasResponse) {
            languageLines.push(`- Response: Respond in ${responseLanguage} (natural, fluent).`);
        }
        languageLines.push(``);
    }

    return [
        // ─────────────────────────────────────────────────────────────────────────
        // LANGUAGE (thinking + response, if configured)
        // ─────────────────────────────────────────────────────────────────────────
        ...languageLines,

        // ─────────────────────────────────────────────────────────────────────────
        // SESSION CONTEXT
        // ─────────────────────────────────────────────────────────────────────────
        `## Session`,
        `- DateTime: ${new Date().toLocaleString()}`,
        `- CWD: ${process.cwd()}`,
        ``,

        // ─────────────────────────────────────────────────────────────────────────
        // RULES
        // ─────────────────────────────────────────────────────────────────────────
        `## Rules`,
        `- Markdown files are organized in: Plans → "plans/" directory, Docs → "docs/" directory`,
        `- **IMPORTANT:** DO NOT create markdown files out of "plans/" or "docs/" directories UNLESS the user explicitly requests it.`,
        ...(catalogScript
            ? [
                  `- Activate skills: Run \`python ${catalogScript} --skills\` to generate a skills catalog and analyze it, then activate the relevant skills that are needed for the task during the process.`,
                  `- Execute commands: Run \`python ${catalogScript} --commands\` to generate a commands catalog and analyze it, then execute the relevant SlashCommands that are needed for the task during the process.`
              ]
            : []),
        ...(skillsVenv ? [`- Python scripts in .claude/skills/: Use \`${skillsVenv}\``] : []),
        `- When skills' scripts are failed to execute, always fix them and run again, repeat until success.`,
        `- Follow **YAGNI (You Aren't Gonna Need It) - KISS (Keep It Simple, Stupid) - DRY (Don't Repeat Yourself)** principles`,
        `- **Class Responsibility Rule:** Logic belongs in LOWEST layer (Entity/Model > Service > Component/Handler). Backend: mapping → Command/DTO, not Handler. Frontend: constants/columns/roles → Model class, not Component.`,
        `- Sacrifice grammar for the sake of concision when writing reports.`,
        `- In reports, list any unresolved questions at the end, if any.`,
        `- **After context compaction:** Call \`TaskList\` before \`TaskCreate\` — resume existing tasks, do NOT create duplicates.`,
        `- Ensure token consumption efficiency while maintaining high quality.`,
        ``,

        // ─────────────────────────────────────────────────────────────────────────
        // MODULARIZATION
        // ─────────────────────────────────────────────────────────────────────────
        `## **[IMPORTANT] Consider Modularization:**`,
        `- Check existing modules before creating new`,
        `- Analyze logical separation boundaries (functions, classes, concerns)`,
        `- Use kebab-case naming with descriptive names, it's fine if the file name is long because this ensures file names are self-documenting for LLM tools (Grep, Glob, Search)`,
        `- Write descriptive code comments`,
        `- After modularization, continue with main task`,
        `- When not to modularize: Markdown files, plain text files, bash scripts, configuration files, environment variables files, etc.`,
        ``,

        // ─────────────────────────────────────────────────────────────────────────
        // PATHS
        // ─────────────────────────────────────────────────────────────────────────
        `## Paths`,
        `Reports: ${reportsPath} | Plans: ${plansPath}/ | Docs: ${docsPath}/`,
        ``,

        // ─────────────────────────────────────────────────────────────────────────
        // PLAN CONTEXT
        // ─────────────────────────────────────────────────────────────────────────
        `## Plan Context`,
        planLine,
        `- Reports: ${reportsPath}`,
        ...(gitBranch ? [`- Branch: ${gitBranch}`] : []),
        `- Validation: mode=${validationMode}, questions=${validationMin}-${validationMax}`,
        ``,

        // ─────────────────────────────────────────────────────────────────────────
        // NAMING (computed pattern for consistent file naming)
        // ─────────────────────────────────────────────────────────────────────────
        `## Naming`,
        `- Report: \`${reportsPath}{type}-${namePattern}.md\``,
        `- Plan dir: \`${plansPath}/${namePattern}/\``,
        `- Replace \`{type}\` with: agent name, report type, or context`,
        `- Replace \`{slug}\` in pattern with: descriptive-kebab-slug`
    ];
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);

        const payload = JSON.parse(stdin);

        // ═══════════════════════════════════════════════════════════════════════════
        // WORKFLOW PROTOCOL — ABSOLUTE FIRST (primacy position #1)
        // Injected BEFORE everything else for maximum primacy attention.
        // Bottom bookend is the compact [WORKFLOW-GATE] at the very end of this hook.
        // "always" → ask user via AskUserQuestion before activating
        // "never"  → auto-execute workflow directly (no confirmation)
        // "off"    → skip entirely (no workflow detection)
        // ═══════════════════════════════════════════════════════════════════════════
        const wfConfig = loadConfig({
            includeProject: false,
            includeAssertions: false
        });
        const confirmationMode = wfConfig.workflow?.confirmationMode || 'always';
        if (confirmationMode !== 'off') {
            const workflowProtocol = injectWorkflowProtocol(payload.transcript_path, confirmationMode);
            if (workflowProtocol) console.log(workflowProtocol);
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // ALWAYS INJECT: Critical context (skipDedup on UserPromptSubmit — always visible)
        // ═══════════════════════════════════════════════════════════════════════════
        const criticalTop = injectCriticalContext(payload.transcript_path, true);
        if (criticalTop) console.log(criticalTop);

        // ═══════════════════════════════════════════════════════════════════════════
        // MAIN BLOCK: Session context, rules, modularization, dev rules
        // Skipped when recently injected (dedup), but critical context always runs
        // ═══════════════════════════════════════════════════════════════════════════

        const skipMainBlock = wasRecentlyInjected(payload.transcript_path);

        if (!skipMainBlock) {
            const sessionId = process.env.CK_SESSION_ID || null;
            const config = loadConfig({
                includeProject: false,
                includeAssertions: false
            });
            const catalogScript = resolveScriptPath('generate_catalogs.py');
            const skillsVenv = resolveSkillsVenv();
            const { reportsPath, gitBranch, planLine, namePattern, validationMode, validationMin, validationMax } = buildPlanContext(sessionId, config);

            const output = buildReminder({
                thinkingLanguage: config.locale?.thinkingLanguage,
                responseLanguage: config.locale?.responseLanguage,
                catalogScript,
                skillsVenv,
                reportsPath,
                plansPath: normalizePath(config.paths?.plans) || 'plans',
                docsPath: normalizePath(config.paths?.docs) || 'docs',
                planLine,
                gitBranch,
                namePattern,
                validationMode,
                validationMin,
                validationMax
            });

            console.log(output.join('\n'));

            // DEV RULES: Moved to dev-rules-injector.cjs (PreToolUse: Edit|Write|MultiEdit|Skill)
            // Now only injected when AI is about to code or review, not on every prompt.
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // ALWAYS INJECT: Lessons + lesson-learned reminder (own dedup logic)
        // These must run regardless of main block dedup — they have independent
        // dedup windows (LESSONS: ~51 lines, LESSON_LEARNED: ~50 lines)
        // ═══════════════════════════════════════════════════════════════════════════

        const lessons = injectLessons(payload.transcript_path);
        if (lessons) console.log(lessons);

        // Cache transcript lines once — avoids re-reading the same file for each dedup check
        let transcriptLines = null;
        try {
            if (payload.transcript_path && fs.existsSync(payload.transcript_path)) {
                transcriptLines = fs.readFileSync(payload.transcript_path, 'utf-8').split('\n');
            }
        } catch {
            /* non-blocking */
        }

        // Project structure reference — inject once per session, re-injects after compaction
        try {
            if (!isMarkerInContext(transcriptLines, PROJECT_STRUCTURE_MARKER, DEDUP_LINES.PROJECT_STRUCTURE)) {
                const projStructContent = readAndInjectDoc('docs/project-reference/project-structure-reference.md');
                if (projStructContent) console.log(projStructContent);
            }
        } catch {
            /* non-blocking */
        }

        // CLAUDE.md key rules re-injection — prevents context drift in long sessions
        // CLAUDE.md is loaded once at session start but drifts to weak attention zone.
        // Re-inject key rules (not full file) when marker scrolls out of dedup window.
        try {
            if (!isMarkerInContext(transcriptLines, CLAUDE_MD_MARKER, DEDUP_LINES.CLAUDE_MD)) {
                const claudeMdPath = path.resolve(process.env.CLAUDE_PROJECT_DIR || '.', 'CLAUDE.md');
                if (fs.existsSync(claudeMdPath)) {
                    const content = fs.readFileSync(claudeMdPath, 'utf-8');
                    // Extract TL;DR section (key rules) — not the full file
                    const tldrMatch = content.match(/## TL;DR[^\n]*\n([\s\S]*?)(?=\n## [A-Z])/);
                    if (tldrMatch) {
                        console.log(`\n${CLAUDE_MD_MARKER}\n`);
                        console.log(tldrMatch[1].trim());
                        console.log('');
                    }
                }
            }
        } catch {
            /* non-blocking */
        }

        // Project config summary — compact structural map (modules, stack, context groups)
        // Injected after CLAUDE.md so AI has the structural overview for planning decisions.
        try {
            if (!isMarkerInContext(transcriptLines, PROJECT_CONFIG_SUMMARY_MARKER, DEDUP_LINES.PROJECT_CONFIG_SUMMARY)) {
                const summary = generateProjectSummary();
                if (summary) {
                    console.log(`\n${PROJECT_CONFIG_SUMMARY_MARKER}\n`);
                    console.log(summary);
                    console.log('');
                }
            }
        } catch {
            /* non-blocking */
        }

        // AI Mistake Prevention: REMOVED from UserPromptSubmit (Phase 1 — attention optimization).
        // Now injected ONLY via mindset-injector.cjs on PreToolUse (Edit|Write|MultiEdit|Skill).
        // Rationale: Tier 3 advisory content was diluting Tier 0 urgency markers (47→5 reduction).

        // ═══════════════════════════════════════════════════════════════════════════
        // GRAPH PROTOCOL REMINDER — TWO TIERS:
        //   1. FULL reference (with dedup) — detailed CLI commands, sub-agent block
        //   2. COMPACT mandatory reminder (ALWAYS injected, no dedup) — 2 lines at very end
        // Tier 2 ensures graph protocol stays in AI attention window even in long sessions.
        // ═══════════════════════════════════════════════════════════════════════════
        try {
            const graphDbPath = path.join(process.env.CLAUDE_PROJECT_DIR || '.', '.code-graph', 'graph.db');
            if (fs.existsSync(graphDbPath)) {
                const graphMarker = '[graph] Knowledge graph active';

                // Tier 1: Full reference (deduped — top+bottom check)
                if (!isMarkerInContext(transcriptLines, graphMarker, 50)) {
                    console.log(
                        [
                            `${graphMarker}. **ACTION REQUIRED for investigation/scout/review/fix/debug tasks:**`,
                            `- **Grep/Glob/Search-first:** When query is semantic (not file-specific), grep/glob/search for key terms FIRST to find entry point files`,
                            `- **Graph expand:** Run \`python .claude/scripts/code_graph connections <file> --json\` on discovered files`,
                            `- **Full system trace:** Run \`python .claude/scripts/code_graph trace <file> --direction both --json\` to see full upstream (callers, frontend) + downstream (events, bus messages, consumers) flow. Use \`--direction downstream\` for impact-only analysis.`,
                            `- For frontend↔backend API tracing → run \`/graph-connect-api\` skill to match HTTP calls with backend routes`,
                            `- **After Grep/Search finds key files:** Run \`python .claude/scripts/code_graph trace <found-file> --direction both --json\` on the most important 2-3 files from search results to discover full system flow instantly.`,
                            `- **Required for sub-agents:** Include this in sub-agent prompts involving code investigation:\n> "**Graph DB active.** After grep finds key files, run graph trace to discover callers, bus consumers, event chains. Commands: python .claude/scripts/code_graph trace <file> --direction both --json | connections <file> --json. Pattern: grep → trace → grep."`,
                            `- Graph finds structural + implicit relationships (MESSAGE_BUS, events, API endpoints) instantly vs grepping 15K files.`,
                            `- Run at least ONE graph command on key files before concluding any investigation, fix, review, or plan.`
                        ].join('\n')
                    );
                }
            }
        } catch {
            /* silent */
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // TIER 2: Compact graph mandatory reminder (ALWAYS injected, NO dedup)
        // Only 2 lines — minimal token cost (~30 tokens per injection).
        // Generic: only fires if .code-graph/graph.db exists.
        // ═══════════════════════════════════════════════════════════════════════════
        try {
            const graphDbForCompact = path.join(process.env.CLAUDE_PROJECT_DIR || '.', '.code-graph', 'graph.db');
            if (fs.existsSync(graphDbForCompact)) {
                console.log(
                    `**[GRAPH-GATE]** Run at least ONE \`python .claude/scripts/code_graph trace <file> --direction both --json\` on key files before concluding any investigation, fix, review, or plan.`
                );
            }
        } catch {
            /* silent */
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // TIER 0: Compact workflow mandatory reminder (ALWAYS injected, NO dedup)
        // Fires for both "always" and "never" modes with mode-appropriate content.
        // ═══════════════════════════════════════════════════════════════════════════
        if (confirmationMode === 'always') {
            console.log(
                `**[BLOCKING] [WORKFLOW-GATE] MANDATORY IMPORTANT MUST ATTENTION CRITICAL — Do not skip for any reason. First tool call: \`AskUserQuestion\` for workflow detection. Match prompt against catalog → ask user → then proceed.**`
            );
        } else if (confirmationMode === 'never') {
            console.log(
                `**[BLOCKING] [WORKFLOW-GATE] MANDATORY IMPORTANT MUST ATTENTION CRITICAL — Do not skip for any reason. First action: workflow detection. Match prompt against catalog → \`/workflow-start\` → then proceed.**`
            );
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // LESSON REMINDER — ABSOLUTE LAST output.
        // "Check lessons learned" prompt at recency position ensures AI always
        // evaluates session mistakes before finishing.
        // ═══════════════════════════════════════════════════════════════════════════
        const reminder = injectLessonReminder(payload.transcript_path);
        if (reminder) console.log(reminder);

        process.exit(0);
    } catch (error) {
        console.error(`Prompt context assembler error: ${error.message}`);
        process.exit(0);
    }
}

main();
