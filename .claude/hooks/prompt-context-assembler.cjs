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

const { DEV_RULES: DEV_RULES_MARKER, DEDUP_LINES } = require('./lib/dedup-constants.cjs');

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function execSafe(cmd) {
    try {
        return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
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

    return { reportsPath, gitBranch, planLine, namePattern, validationMode, validationMin, validationMax };
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

function wasDevRulesRecentlyInjected(transcriptPath) {
    try {
        if (!transcriptPath || !fs.existsSync(transcriptPath)) return false;
        const transcript = fs.readFileSync(transcriptPath, 'utf-8');
        return transcript
            .split('\n')
            .slice(-DEDUP_LINES.DEV_RULES)
            .some(line => line.includes(DEV_RULES_MARKER));
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
            const config = loadConfig({ includeProject: false, includeAssertions: false });
            const devRulesPath = resolveWorkflowPath('development-rules.md');
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

            // INJECT DEV RULES FILE CONTENT (own dedup window — independent of main block)
            if (devRulesPath && !wasDevRulesRecentlyInjected(payload.transcript_path)) {
                const fullPath = path.resolve(process.cwd(), devRulesPath);
                if (fs.existsSync(fullPath)) {
                    const rulesContent = fs.readFileSync(fullPath, 'utf-8');
                    console.log('\n---\n');
                    console.log(`## ${DEV_RULES_MARKER}\n`);
                    console.log(`**Source:** \`${devRulesPath}\`\n`);
                    console.log('---\n');
                    console.log(rulesContent);
                    console.log('\n---\n');
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // ALWAYS INJECT: Lessons + lesson-learned reminder (own dedup logic)
        // These must run regardless of main block dedup — they have independent
        // dedup windows (LESSONS: ~51 lines, LESSON_LEARNED: ~50 lines)
        // ═══════════════════════════════════════════════════════════════════════════

        const lessons = injectLessons(payload.transcript_path);
        if (lessons) console.log(lessons);

        const aiMistake = injectAiMistakePrevention(payload.transcript_path, true);
        if (aiMistake) console.log(aiMistake);

        const workflowProtocol = injectWorkflowProtocol(payload.transcript_path);
        if (workflowProtocol) console.log(workflowProtocol);

        // ═══════════════════════════════════════════════════════════════════════════
        // ALWAYS INJECT: Critical context at bottom (skipDedup — bookend visibility)
        // ═══════════════════════════════════════════════════════════════════════════
        const criticalBottom = injectCriticalContext(payload.transcript_path, true);
        if (criticalBottom) console.log(criticalBottom);

        const reminder = injectLessonReminder(payload.transcript_path);
        if (reminder) console.log(reminder);

        process.exit(0);
    } catch (error) {
        console.error(`Prompt context assembler error: ${error.message}`);
        process.exit(0);
    }
}

main();
