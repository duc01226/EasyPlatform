#!/usr/bin/env node
'use strict';

/**
 * agent-files-skill-gate.cjs - PreToolUse project-context router for the Skill tool.
 *
 * Companion to init-prompt-gate.cjs (UserPromptSubmit). Catches the "skill called
 * before the project is bootstrapped" path: if a non-meta skill runs while a root
 * agent-instruction file (CLAUDE.md / AGENTS.md) is missing, guide the model to the
 * generator skill (/claude-md-init for CLAUDE.md, /sync-codex for AGENTS.md).
 *
 * Only fires once the project has content AND project-config.json is populated —
 * /claude-md-init reads the config to generate CLAUDE.md, so an earlier offer would
 * be meaningless. Config enforcement itself is owned by init-prompt-gate.cjs.
 *
 * Dedup: shares the agent-files dismiss flag with the prompt gate, so "skip init"
 * silences both for 24h and this hook does not nag on every skill call.
 *
 * Exit Codes:
 *   0 - Allow. Missing context is surfaced as guidance, not a stop.
 *
 * @hook PreToolUse
 * @matcher Skill
 * @module agent-files-skill-gate
 */

const fs = require('fs');
const { getAgentFileIssues, isAgentFilesDismissed, buildOfferMessage } = require('./lib/agent-files-state.cjs');
const { isConfigPopulated: _isConfigPopulated, getConfiguredProjectConfigPath } = require('./lib/project-config-loader.cjs');
const { hasProjectContent } = require('./lib/session-init-helpers.cjs');

// Resolve the configured config path once at load (mirrors init-prompt-gate.cjs);
// honors portability.projectConfigPath, fail-open to docs/project-config.json.
const CONFIG_PATH = getConfiguredProjectConfigPath();

// Skills that must never be blocked: meta utilities + the routes that FIX the
// missing-file state. Matched against the normalized skill base name.
const ALLOWED_SKILLS = new Set([
    'project-init',
    'init-project',
    'claude-md-init',
    'sync-codex',
    'project-config',
    'graph-build',
    'help',
    'ck-help',
    'memory',
    'checkpoint',
    'recover',
    'context',
    'watzup',
    'compact'
]);

function normalizeSkill(skill) {
    return String(skill || '')
        .replace(/^\/+/, '')
        .toLowerCase()
        .trim();
}

function isAllowedSkill(skill) {
    const norm = normalizeSkill(skill);
    if (!norm) return true;
    if (ALLOWED_SKILLS.has(norm)) return true;
    // Base name before ':' and the scan family: the parameterized `scan` host
    // (`scan`, `scan --target=<key>`) plus remaining scan-* orchestrators.
    if (ALLOWED_SKILLS.has(norm.split(':')[0])) return true;
    return /^scan/.test(norm);
}

function isConfigPopulated() {
    if (!fs.existsSync(CONFIG_PATH)) return false;
    try {
        return _isConfigPopulated(JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')));
    } catch {
        return false;
    }
}

function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);

        let payload;
        try {
            payload = JSON.parse(stdin);
        } catch {
            process.exit(0); // fail-open on unparseable payload
        }

        if (payload.tool_name !== 'Skill') process.exit(0);

        const skillName = payload.tool_input?.skill || '';
        if (isAllowedSkill(skillName)) process.exit(0);

        // Dormant in empty/uninitialized projects (matches session-init + prompt gate).
        if (!hasProjectContent()) process.exit(0);

        // Config not populated → init-prompt-gate owns that gate; don't double-block,
        // and /claude-md-init can't generate a meaningful CLAUDE.md yet anyway.
        if (!isConfigPopulated()) process.exit(0);

        // Dismissed for the day → allow.
        if (isAgentFilesDismissed()) process.exit(0);

        const issues = getAgentFileIssues();
        if (issues.length === 0) process.exit(0); // both root files present + complete

        // WARN — route the AI to the generator skill(s), then allow the call.
        console.log(
            ['', `[project-context] Skill \`${skillName}\` needs root agent-instruction setup first.`, buildOfferMessage(issues)].join('\n')
        );
        process.exit(0);
    } catch {
        // Fail-open — never trap the user on an unexpected error.
        // Static message only: this is a should-never-happen path and error.message
        // could surface an fs path; gate dynamic detail behind CK_DEBUG if ever needed.
        console.error('agent-files-skill-gate: unexpected error, allowing.');
        process.exit(0);
    }
}

module.exports = { isAllowedSkill, normalizeSkill, isConfigPopulated };

if (require.main === module) {
    main();
}
