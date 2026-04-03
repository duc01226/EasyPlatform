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
const {
    injectLessons,
    injectCriticalContext,
    injectAiMistakePrevention,
    injectWorkflowProtocol,
    injectLessonReminder
} = require('./lib/prompt-injections.cjs');

// ═══════════════════════════════════════════════════════════════════════════
// DEDUPLICATION
// ═══════════════════════════════════════════════════════════════════════════

const {
    PROJECT_STRUCTURE: PROJECT_STRUCTURE_MARKER,
    CLAUDE_MD: CLAUDE_MD_MARKER,
    PROJECT_CONFIG_SUMMARY: PROJECT_CONFIG_SUMMARY_MARKER,
    DEDUP_LINES
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
        const transcript = fs.readFileSync(transcriptPath, 'utf-8');
        return transcript
            .split('\n')
            .slice(-DEDUP_LINES.DEV_RULES_MODULARIZATION)
            .some(line => line.includes('[IMPORTANT] Consider Modularization'));
    } catch (e) {
        return false;
    }
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
        `- **[CRITICAL] Class Responsibility Rule:** Logic belongs in LOWEST layer (Entity/Model > Service > Component/Handler). Backend: mapping → Command/DTO, not Handler. Frontend: constants/columns/roles → Model class, not Component.`,
        `- Sacrifice grammar for the sake of concision when writing reports.`,
        `- In reports, list any unresolved questions at the end, if any.`,
        `- **[CRITICAL] After context compaction:** ALWAYS call \`TaskList\` before \`TaskCreate\` — resume existing tasks, do NOT create duplicates (prevents orphan tasks).`,
        `- IMPORTANT: Ensure token consumption efficiency while maintaining high quality.`,
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
            let projStructRecentlyInjected = false;
            if (transcriptLines) {
                projStructRecentlyInjected = transcriptLines.slice(-DEDUP_LINES.PROJECT_STRUCTURE).some(l => l.includes(PROJECT_STRUCTURE_MARKER));
            }
            if (!projStructRecentlyInjected) {
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
            let claudeMdRecentlyInjected = false;
            if (transcriptLines) {
                claudeMdRecentlyInjected = transcriptLines.slice(-DEDUP_LINES.CLAUDE_MD).some(l => l.includes(CLAUDE_MD_MARKER));
            }
            if (!claudeMdRecentlyInjected) {
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
            let configSummaryRecentlyInjected = false;
            if (transcriptLines) {
                configSummaryRecentlyInjected = transcriptLines.slice(-DEDUP_LINES.PROJECT_CONFIG_SUMMARY).some(l => l.includes(PROJECT_CONFIG_SUMMARY_MARKER));
            }
            if (!configSummaryRecentlyInjected) {
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

        // ═══════════════════════════════════════════════════════════════════════════
        // WORKFLOW PROTOCOL — injected BEFORE AI Mistake Prevention for primacy.
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

        const aiMistake = injectAiMistakePrevention(payload.transcript_path, true);
        if (aiMistake) console.log(aiMistake);

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
                let graphRecentlyInjected = false;
                if (transcriptLines) {
                    graphRecentlyInjected = transcriptLines.slice(-50).some(l => l.includes(graphMarker));
                }

                // Tier 1: Full reference (deduped — only when not recently injected)
                if (!graphRecentlyInjected) {
                    console.log(
                        [
                            `${graphMarker}. **ACTION REQUIRED for investigation/scout/review/fix/debug tasks:**`,
                            `- **Grep/Glob/Search-first:** When query is semantic (not file-specific), grep/glob/search for key terms FIRST to find entry point files`,
                            `- **Graph expand:** Run \`python .claude/scripts/code_graph connections <file> --json\` on discovered files`,
                            `- **Full system trace:** Run \`python .claude/scripts/code_graph trace <file> --direction both --json\` to see full upstream (callers, frontend) + downstream (events, bus messages, consumers) flow. Use \`--direction downstream\` for impact-only analysis.`,
                            `- For frontend↔backend API tracing → run \`/graph-connect-api\` skill to match HTTP calls with backend routes`,
                            `- **After Grep/Search finds key files:** Run \`python .claude/scripts/code_graph trace <found-file> --direction both --json\` on the most important 2-3 files from search results to discover full system flow instantly.`,
                            `- **MANDATORY for sub-agents:** ALWAYS include this instruction block in every sub-agent prompt involving code investigation:\n> "**Graph DB active.** After grep finds key files, STOP AND DECIDE: (A) Run graph trace NOW — discovers callers, bus consumers, event chains that grep CANNOT find. (B) Continue searching — ONLY if you haven't found entry-point files yet. Commands: python .claude/scripts/code_graph trace <file> --direction both --json (full flow) | --node-mode file (file-level, less noise) | python .claude/scripts/code_graph connections <file> --json (1-hop). Pattern: grep → trace → grep."`,
                            `- Graph finds structural + implicit relationships (MESSAGE_BUS, events, API endpoints) INSTANTLY vs grepping 15K files. USE IT on every important file found.`,
                            `- **MANDATORY:** You MUST run at least ONE graph command on key files before concluding any investigation, fix, review, or plan. See CLAUDE.md "Graph Intelligence" section.`
                        ].join('\n')
                    );
                }
            }
        } catch {
            /* silent */
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // ALWAYS INJECT: Critical context at bottom (skipDedup — bookend visibility)
        // ═══════════════════════════════════════════════════════════════════════════
        const criticalBottom = injectCriticalContext(payload.transcript_path, true);
        if (criticalBottom) console.log(criticalBottom);

        const reminder = injectLessonReminder(payload.transcript_path);
        if (reminder) console.log(reminder);

        // ═══════════════════════════════════════════════════════════════════════════
        // TIER 2: Compact workflow mandatory reminder (ALWAYS injected, NO dedup)
        // Bottom bookend — mirrors the graph-gate pattern for maximum recency.
        // Fires for both "always" and "never" modes with mode-appropriate content.
        // ~30 tokens per injection.
        // ═══════════════════════════════════════════════════════════════════════════
        if (confirmationMode === 'always') {
            console.log(
                `**[MANDATORY-WORKFLOW-GATE] MUST detect nearest workflow from catalog and ask user via \`AskUserQuestion\` BEFORE any tool call or response. Skipping workflow detection is FORBIDDEN.**`
            );
        } else if (confirmationMode === 'never') {
            console.log(
                `**[MANDATORY-WORKFLOW-GATE] MUST detect nearest workflow from catalog and auto-execute it directly (no confirmation). Skipping workflow detection is FORBIDDEN.**`
            );
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // TIER 2: Compact graph mandatory reminder (ALWAYS injected, NO dedup)
        // Positioned as VERY LAST output — maximum recency attention.
        // Only 2 lines — minimal token cost (~30 tokens per injection).
        // Generic: only fires if .code-graph/graph.db exists.
        // ═══════════════════════════════════════════════════════════════════════════
        try {
            const graphDbForCompact = path.join(process.env.CLAUDE_PROJECT_DIR || '.', '.code-graph', 'graph.db');
            if (fs.existsSync(graphDbForCompact)) {
                console.log(
                    `**[MANDATORY-GRAPH-GATE] MUST run at least ONE \`python .claude/scripts/code_graph trace <file> --direction both --json\` on key files before concluding any investigation, fix, review, or plan. Proceeding without graph evidence when graph.db exists is FORBIDDEN.**`
                );
            }
        } catch {
            /* silent */
        }

        process.exit(0);
    } catch (error) {
        console.error(`Prompt context assembler error: ${error.message}`);
        process.exit(0);
    }
}

main();
