#!/usr/bin/env node
/**
 * Workflow Router Part 2 - UserPromptSubmit + SessionStart Hook
 *
 * Injects the SECOND THIRD of the workflow catalog. Works in tandem with
 * workflow-router.cjs (part 1) and workflow-router-p3.cjs (part 3) to keep
 * each hook's output under the harness per-hook size limit. Together they deliver the full catalog.
 *
 * Dedup marker: '## Workflow Catalog (continued)' — independent of part 1.
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

'use strict';

const fs = require('fs');
const { loadWorkflowConfig } = require('./lib/wr-config.cjs');
const { loadConfig } = require('./lib/ck-config-loader.cjs');

const CATALOG_P2_MARKER = '## Workflow Catalog (continued)';
const DEDUP_BOTTOM_LINES = 150; // ~half catalog size
const DEDUP_TOP_LINES = 50;

// ═══════════════════════════════════════════════════════════════════════════
// DEDUP
// ═══════════════════════════════════════════════════════════════════════════

function wasCatalogP2RecentlyInjected(transcriptPath) {
    try {
        if (!transcriptPath || !fs.existsSync(transcriptPath)) return false;
        const lines = fs.readFileSync(transcriptPath, 'utf-8').split('\n');
        if (lines.slice(-DEDUP_BOTTOM_LINES).some(l => l.includes(CATALOG_P2_MARKER))) return true;
        if (lines.slice(0, DEDUP_TOP_LINES).some(l => l.includes(CATALOG_P2_MARKER))) return true;
        return false;
    } catch {
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// CATALOG GENERATION (second half)
// ═══════════════════════════════════════════════════════════════════════════

function buildCatalogPart2(config, quickMode) {
    const { workflows, commandMapping } = config;

    const allEntries = Object.entries(workflows)
        .filter(([, wf]) => wf.whenToUse)
        .sort(([a], [b]) => a.localeCompare(b));
    const thirdCount = Math.ceil(allEntries.length / 3);
    const secondThird = allEntries.slice(thirdCount, thirdCount * 2);

    const lines = [];
    lines.push('');
    lines.push(CATALOG_P2_MARKER);
    lines.push('');

    for (const [id, wf] of secondThird) {
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

        // SessionStart output is truncated at ~20KB by the harness — skip injection entirely.
        // Full catalog (both parts) is injected on first UserPromptSubmit where there is no size limit.
        if (isSessionStart) process.exit(0);

        if (!userPrompt.trim()) process.exit(0);

        // Read user config for workflow.confirmationMode
        const ckConfig = loadConfig({ includeProject: false, includeAssertions: false });
        const confirmationMode = ckConfig.workflow?.confirmationMode || 'always';
        if (confirmationMode === 'off') process.exit(0);

        const config = loadWorkflowConfig();
        if (!config.settings?.enabled) process.exit(0);

        // Transcript dedup — skip if part 2 already in context
        if (wasCatalogP2RecentlyInjected(payload.transcript_path)) process.exit(0);

        const quickMode = confirmationMode === 'never' ||
            (config.settings.allowOverride && config.settings.overridePrefix &&
             userPrompt.toLowerCase().trim().startsWith(config.settings.overridePrefix.toLowerCase()));

        const output = buildCatalogPart2(config, quickMode);
        console.log(output);

        process.exit(0);
    } catch (error) {
        console.error(`<!-- Workflow router p2 error: ${error.message} -->`);
        process.exit(0);
    }
}

if (require.main === module) {
    main();
}
