#!/usr/bin/env node
/**
 * Dev Rules Reminder - Template Building
 *
 * Reminder template building and injection checking.
 * Part of dev-rules-reminder.cjs modularization.
 *
 * @module dr-template
 */

'use strict';

const fs = require('fs');
const { buildWorkflowProgressLines } = require('./dr-context.cjs');

/**
 * Check if reminder was recently injected in transcript
 * @param {string|undefined} transcriptPath - Path to transcript file
 * @returns {boolean} True if recently injected
 */
function wasRecentlyInjected(transcriptPath) {
  try {
    if (!transcriptPath || !fs.existsSync(transcriptPath)) return false;
    const transcript = fs.readFileSync(transcriptPath, 'utf-8');
    // Check last 150 lines (hook output is ~30 lines, so this covers ~5 user prompts)
    return transcript.split('\n').slice(-150).some(line => line.includes('[IMPORTANT] Consider Modularization'));
  } catch (e) {
    return false;
  }
}

/**
 * Build reminder template with all context
 * @param {Object} options - Reminder options
 * @returns {string[]} Array of reminder lines
 */
function buildReminder({
  thinkingLanguage,
  responseLanguage,
  devRulesPath,
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

  // Build workflow progress reminder (if active workflow exists)
  const workflowLines = buildWorkflowProgressLines();

  return [
    // ─────────────────────────────────────────────────────────────────────────
    // ACTIVE WORKFLOW (if any) - placed at top for visibility
    // ─────────────────────────────────────────────────────────────────────────
    ...workflowLines,
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
    ...(devRulesPath ? [`- Read and follow development rules: "${devRulesPath}"`] : []),
    `- Markdown files are organized in: Plans → "plans/" directory, Docs → "docs/" directory`,
    `- **IMPORTANT:** DO NOT create markdown files out of "plans/" or "docs/" directories UNLESS the user explicitly requests it.`,
    ...(catalogScript ? [
      `- Activate skills: Run \`python ${catalogScript} --skills\` to generate a skills catalog and analyze it, then activate the relevant skills that are needed for the task during the process.`,
      `- Execute commands: Run \`python ${catalogScript} --commands\` to generate a commands catalog and analyze it, then execute the relevant SlashCommands that are needed for the task during the process.`
    ] : []),
    ...(skillsVenv ? [`- Python scripts in .claude/skills/: Use \`${skillsVenv}\``] : []),
    `- When skills' scripts are failed to execute, always fix them and run again, repeat until success.`,
    `- Follow **YAGNI (You Aren't Gonna Need It) - KISS (Keep It Simple, Stupid) - DRY (Don't Repeat Yourself)** principles`,
    `- **[CRITICAL] Class Responsibility Rule:** Logic belongs in LOWEST layer (Entity/Model > Service > Component/Handler). Backend: mapping → Command/DTO, not Handler. Frontend: constants/columns/roles → Model class, not Component.`,
    `- Sacrifice grammar for the sake of concision when writing reports.`,
    `- In reports, list any unresolved questions at the end, if any.`,
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

module.exports = {
  wasRecentlyInjected,
  buildReminder
};
