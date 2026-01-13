#!/usr/bin/env node
/**
 * Development Rules Reminder - UserPromptSubmit Hook (Optimized)
 *
 * Injects context: session info, rules, modularization reminders, and Plan Context.
 * Static env info (Node, Python, OS) now comes from SessionStart env vars.
 *
 * Sub-modules:
 *   - dr-paths.cjs    - Path resolution utilities
 *   - dr-context.cjs  - Plan context and workflow progress
 *   - dr-template.cjs - Reminder template building
 *
 * Exit Codes:
 *   0 - Success (non-blocking, allows continuation)
 */

const fs = require('fs');
const { loadConfig, normalizePath } = require('./lib/ck-config-utils.cjs');

// Dev rules reminder sub-modules
const { resolveWorkflowPath, resolveScriptPath, resolveSkillsVenv } = require('./lib/dr-paths.cjs');
const { buildPlanContext } = require('./lib/dr-context.cjs');
const { wasRecentlyInjected, buildReminder } = require('./lib/dr-template.cjs');

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  try {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    const payload = JSON.parse(stdin);
    if (wasRecentlyInjected(payload.transcript_path)) process.exit(0);

    const sessionId = process.env.CK_SESSION_ID || null;
    const config = loadConfig({ includeProject: false, includeAssertions: false });
    const devRulesPath = resolveWorkflowPath('development-rules.md');
    const catalogScript = resolveScriptPath('generate_catalogs.py');
    const skillsVenv = resolveSkillsVenv();
    const {
      reportsPath,
      gitBranch,
      planLine,
      namePattern,
      validationMode,
      validationMin,
      validationMax
    } = buildPlanContext(sessionId, config);

    const output = buildReminder({
      thinkingLanguage: config.locale?.thinkingLanguage,
      responseLanguage: config.locale?.responseLanguage,
      devRulesPath,
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
    process.exit(0);
  } catch (error) {
    console.error(`Dev rules hook error: ${error.message}`);
    process.exit(0);
  }
}

main();
