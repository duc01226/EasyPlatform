#!/usr/bin/env node
/**
 * Workflow Router Part 3 - UserPromptSubmit Hook
 *
 * Injects the THIRD PART of the workflow catalog. Works in tandem with
 * workflow-router.cjs (part 1) and workflow-router-p2.cjs (part 2) to keep
 * each hook's output under the harness per-hook size limit. Together they
 * deliver the full catalog.
 *
 * Dedup marker: '## Workflow Catalog (part 3)' — independent of parts 1 and 2.
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { loadWorkflowConfig } = require('./lib/wr-config.cjs');
const { loadConfig } = require('./lib/ck-config-loader.cjs');

const CATALOG_P3_MARKER = '## Workflow Catalog (part 3)';
const DEDUP_BOTTOM_LINES = 150;
const DEDUP_TOP_LINES = 50;

// ═══════════════════════════════════════════════════════════════════════════
// DEDUP
// ═══════════════════════════════════════════════════════════════════════════

function wasCatalogP3RecentlyInjected(transcriptPath) {
    try {
        if (!transcriptPath || !fs.existsSync(transcriptPath)) return false;
        const lines = fs.readFileSync(transcriptPath, 'utf-8').split('\n');
        if (lines.slice(-DEDUP_BOTTOM_LINES).some(l => l.includes(CATALOG_P3_MARKER))) return true;
        if (lines.slice(0, DEDUP_TOP_LINES).some(l => l.includes(CATALOG_P3_MARKER))) return true;
        return false;
    } catch {
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// CATALOG GENERATION (third part)
// ═══════════════════════════════════════════════════════════════════════════

function buildCatalogPart3(config, quickMode) {
    const { workflows, commandMapping } = config;

    const allEntries = Object.entries(workflows)
        .filter(([, wf]) => wf.whenToUse)
        .sort(([a], [b]) => a.localeCompare(b));
    const thirdCount = Math.ceil(allEntries.length / 3);
    const lastThird = allEntries.slice(thirdCount * 2);

    const lines = [];
    lines.push('');
    lines.push(CATALOG_P3_MARKER);
    lines.push('');

    for (const [id, wf] of lastThird) {
        const sequence = wf.sequence.map(step => commandMapping[step]?.claude || `/${step}`).join(' \u2192 ');
        const confirm = wf.confirmFirst ? ' | \u26a0\ufe0f Confirm' : '';
        lines.push(`**${id}** \u2014 ${wf.name}${confirm}`);
        lines.push(`  Use: ${wf.whenToUse} | Not for: ${wf.whenNotToUse || 'N/A'} | Steps: ${sequence}`);
    }

    lines.push('');

    if (quickMode) {
        lines.push('> **Quick mode active** - Skip confirmation, execute workflow directly.');
        lines.push('');
    }

    return lines.join('\n');
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
        const userPrompt = payload.prompt || '';

        // SessionStart output is truncated — skip injection entirely.
        if (isSessionStart) process.exit(0);

        if (!userPrompt.trim()) process.exit(0);

        // Read user config for workflow.confirmationMode
        const ckConfig = loadConfig({ includeProject: false, includeAssertions: false });
        const confirmationMode = ckConfig.workflow?.confirmationMode || 'always';
        if (confirmationMode === 'off') process.exit(0);

        const config = loadWorkflowConfig();
        if (!config.settings?.enabled) process.exit(0);

        // Transcript dedup — skip if part 3 already in context
        if (wasCatalogP3RecentlyInjected(payload.transcript_path)) process.exit(0);

        const quickMode = confirmationMode === 'never' ||
            (config.settings.allowOverride && config.settings.overridePrefix &&
             userPrompt.toLowerCase().trim().startsWith(config.settings.overridePrefix.toLowerCase()));

        const output = buildCatalogPart3(config, quickMode);
        console.log(output);

        process.exit(0);
    } catch (error) {
        console.error(`<!-- Workflow router p3 error: ${error.message} -->`);
        process.exit(0);
    }
}

if (require.main === module) {
    main();
}
