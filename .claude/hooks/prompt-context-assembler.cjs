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
const { injectLessons, injectCriticalContext, injectWorkflowProtocol } = require('./lib/prompt-injections.cjs');
const { readMarker, writeMarker } = require('./lib/context-tracker.cjs');
const { SESSION_ID_DEFAULT } = require('./lib/ck-paths.cjs');

// ═══════════════════════════════════════════════════════════════════════════
// DEDUPLICATION
// ═══════════════════════════════════════════════════════════════════════════

const {
    DEDUP_LINES
} = require('./lib/dedup-constants.cjs');
const { isMarkerInContext } = require('./lib/transcript-utils.cjs');

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
        `- Markdown files organized in: Plans → "plans/" directory, Docs → "docs/" directory`,
        `- **IMPORTANT:** DO NOT create markdown files out of "plans/" or "docs/" directories UNLESS user explicitly requests it.`,
        ...(catalogScript
            ? [
                  `- Activate skills: Run \`python ${catalogScript} --skills\` to generate skills catalog and analyze, then activate relevant skills needed for task.`,
                  `- Execute commands: Run \`python ${catalogScript} --commands\` to generate commands catalog and analyze, then execute relevant SlashCommands needed for task.`
              ]
            : []),
        ...(skillsVenv ? [`- Python scripts in .claude/skills/: Use \`${skillsVenv}\``] : []),
        `- When skills' scripts fail, fix and run again, repeat until success.`,
        `- Follow **YAGNI (You Aren't Gonna Need It) - KISS (Keep It Simple, Stupid) - DRY (Don't Repeat Yourself)** principles`,
        `- **Class Responsibility Rule:** Logic belongs in LOWEST layer (Entity/Model > Service > Component/Handler). Backend: mapping → Command/DTO, not Handler. Frontend: constants/columns/roles → Model class, not Component.`,
        `- Sacrifice grammar for concision in reports.`,
        `- In reports, list unresolved questions at end, if any.`,
        `- **After context compaction:** Call \`TaskList\` before \`TaskCreate\` — resume existing tasks, do NOT create duplicates.`,
        `- Ensure token consumption efficiency while maintaining high quality.`,
        ``,

        // ─────────────────────────────────────────────────────────────────────────
        // MODULARIZATION
        // ─────────────────────────────────────────────────────────────────────────
        `## **[IMPORTANT] Consider Modularization:**`,
        `- Check existing modules before creating new`,
        `- Analyze logical separation boundaries (functions, classes, concerns)`,
        `- Use kebab-case naming with descriptive names — long file names fine, ensures self-documenting for LLM tools (Grep, Glob, Search)`,
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

/**
 * Build post-compact re-verify warning block.
 * Fires once per compact event (warningShown dedup), then silences.
 * @param {string|null} sessionId - Session ID from payload.session_id
 * @returns {string|null} Warning block or null if no compact pending
 */
function buildPostCompactWarning(sessionId) {
    if (!sessionId) return null;
    try {
        const marker = readMarker(sessionId);
        if (!marker?.compactState?.gitStatus || marker.compactState.warningShown) {
            return null;
        }
        // Mark as shown before injecting (prevents repeat on this and future prompts)
        marker.compactState.warningShown = true;
        writeMarker(sessionId, marker);

        const lines = `\`\`\`\n${marker.compactState.gitStatus}\n\`\`\``;

        return [
            `## ⚠️ CONTEXT COMPACTED — Re-verify before continuing`,
            ``,
            `Context compacted since last prompt. Summary may not reflect what`,
            `actually persisted in environment.`,
            ``,
            `**Git status at compact time:**`,
            lines,
            ``,
            `**MANDATORY:** Before resuming in-progress task:`,
            `1. Run \`git status\` — compare against snapshot above`,
            `2. Re-read files you were editing`,
            `3. Treat all "completed" claims in summary as UNVERIFIED HYPOTHESES`,
            ``
        ].join('\n');
    } catch (_e) {
        return null; // fail-open — never block on a warning injection
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);

        const payload = JSON.parse(stdin);

        const isSessionStart = payload.hook_event_name === 'SessionStart';

        // SessionStart output is truncated at ~2KB by the harness — skip injection entirely.
        // Full context is injected on first UserPromptSubmit where there is no size limit.
        if (isSessionStart) process.exit(0);

        // ═══════════════════════════════════════════════════════════════════════════
        // WORKFLOW PROTOCOL — ABSOLUTE FIRST (primacy position #1)
        // Two-tier injection:
        //   Tier 1 (compact, no dedup) — always fires, anchors TOP attention
        //   Tier 2 (full protocol, deduped) — fires when not recently injected
        // Bottom bookend mirrors Tier 1 in prompt-context-assembler-closers.cjs.
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
            // Tier 1: compact gate — no dedup, always at top (primacy anchor)
            console.log(confirmationMode === 'never'
                ? `**[BLOCKING] [WORKFLOW-GATE] MANDATORY IMPORTANT MUST ATTENTION CRITICAL \u2014 Do not skip for any reason. First action: workflow detection. Find best-match or compose custom workflow \u2192 \`/workflow-start\` or custom steps \u2192 then proceed.**`
                : `**[BLOCKING] [WORKFLOW-GATE] MANDATORY IMPORTANT MUST ATTENTION CRITICAL \u2014 Do not skip for any reason. First tool call: \`AskUserQuestion\` for workflow detection. Find best-match OR compose custom workflow \u2192 present all options with recommendation \u2192 ask user \u2192 then proceed.**`
            );
            // Tier 2: full protocol — deduped (100-line window)
            const workflowProtocol = injectWorkflowProtocol(payload.transcript_path, confirmationMode);
            if (workflowProtocol) console.log(workflowProtocol);
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // POST-COMPACT RE-VERIFY WARNING (fires once per compact event)
        // Placed after workflow protocol (primacy #1) but before other context.
        // ═══════════════════════════════════════════════════════════════════════════
        const postCompactWarning = buildPostCompactWarning(payload.session_id || SESSION_ID_DEFAULT);
        if (postCompactWarning) console.log(postCompactWarning);

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

        // NOTE: Graph protocol, workflow-gate compact reminder, and lesson-learned reminder
        // are injected by prompt-context-assembler-closers.cjs (a separate hook in the same UPS
        // array, registered after this file). Split to keep each hook under the harness
        // per-hook 10,000 character limit — content is dynamic so splitting adds safety margin.

        // NOTE: project-structure-reference.md, CLAUDE.md TL;DR re-injection, and
        // project-config-summary are injected by separate hooks later in the same UPS array:
        //   prompt-context-assembler-docs.cjs / prompt-context-assembler-docs-p2.cjs
        //   prompt-context-assembler-claude.cjs / prompt-context-assembler-project-config.cjs

        // AI Mistake Prevention: REMOVED from UserPromptSubmit (Phase 1 — attention optimization).
        // Now injected ONLY via mindset-injector.cjs on PreToolUse (Edit|Write|MultiEdit|Skill).
        // Rationale: Tier 3 advisory content was diluting Tier 0 urgency markers (47→5 reduction).

        process.exit(0);
    } catch (error) {
        console.error(`Prompt context assembler error: ${error.message}`);
        process.exit(0);
    }
}

main();
