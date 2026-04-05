#!/usr/bin/env node
'use strict';

/**
 * Sync Copilot Instructions — Generates two tiers of Copilot instruction files:
 *
 * 1. Project-specific: .github/copilot-instructions.md
 *    - TL;DR golden rules, decision table, project-reference summaries with READ prompts
 *
 * 2. Common protocol: .github/instructions/common-protocol.instructions.md
 *    - Workflow catalog, execution protocol, dev rules, prompt protocol
 *
 * 3. Per-group instruction files: .github/instructions/{group}.instructions.md
 *    - Enhanced with registry summaries + READ prompts per doc
 *
 * Usage:
 *   node .claude/scripts/sync-copilot-workflows.cjs           # Apply changes
 *   node .claude/scripts/sync-copilot-workflows.cjs --dry-run  # Preview only
 *
 * Sources of truth:
 *   - .claude/workflows.json              → workflow catalog
 *   - .claude/docs/development-rules.md → dev rules
 *   - docs/copilot-registry.json          → project-reference file registry
 *   - CLAUDE.md                           → TL;DR golden rules (template in script)
 *
 * NOTE: Script generates structural content only. For richer summaries with
 * section headings extracted from actual files, run the /sync-to-copilot skill
 * which instructs the AI to read each file and enrich the generated output.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const WORKFLOWS_PATH = path.join(ROOT, '.claude', 'workflows.json');
const DEV_RULES_PATH = path.join(ROOT, '.claude', 'docs', 'development-rules.md');
const PROJECT_CONFIG_PATH = path.join(ROOT, 'docs', 'project-config.json');
const COPILOT_REGISTRY_PATH = path.join(ROOT, 'docs', 'copilot-registry.json');
const COPILOT_MAIN_PATH = path.join(ROOT, '.github', 'copilot-instructions.md');
const INSTRUCTIONS_DIR = path.join(ROOT, '.github', 'instructions');
// Old file path — removed during migration
const OLD_COPILOT_PATH = path.join(ROOT, '.github', 'common.copilot-instructions.md');

// ═══════════════════════════════════════════════════════════════════════════
// REGISTRY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Load copilot registry from docs/copilot-registry.json.
 * Returns { registry, instructionFileConfig, projectInstructions }
 */
function loadCopilotRegistry() {
    try {
        if (!fs.existsSync(COPILOT_REGISTRY_PATH)) {
            console.warn(`Warning: ${COPILOT_REGISTRY_PATH} not found`);
            return { registry: [], instructionFileConfig: {}, projectInstructions: {} };
        }
        const data = JSON.parse(fs.readFileSync(COPILOT_REGISTRY_PATH, 'utf8'));
        return {
            registry: data.registry || [],
            instructionFileConfig: data.instructionFileConfig || {},
            projectInstructions: data.projectInstructions || {}
        };
    } catch (e) {
        console.warn(`Warning: Failed to load copilot registry: ${e.message}`);
        return { registry: [], instructionFileConfig: {}, projectInstructions: {} };
    }
}

/**
 * Load project config from docs/project-config.json.
 * Returns { name, description } from project field, or defaults.
 */
function loadProjectConfig() {
    try {
        if (!fs.existsSync(PROJECT_CONFIG_PATH)) {
            return { name: 'Project', description: '' };
        }
        const data = JSON.parse(fs.readFileSync(PROJECT_CONFIG_PATH, 'utf8'));
        return {
            name: data.project?.name || 'Project',
            description: data.project?.description || ''
        };
    } catch (e) {
        console.warn(`Warning: Failed to load project config: ${e.message}`);
        return { name: 'Project', description: '' };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW CATALOG (reused from original)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extract keywords from whenToUse field — condensed keyword string.
 */
function extractKeywords(whenToUse) {
    if (!whenToUse) return '';
    return whenToUse
        .split(/[,;]/)
        .map(clause => clause.trim().toLowerCase())
        .map(c => c.replace(/^(user wants to |user reports |user has |user wants |wants to )/i, ''))
        .map(c => c.split(/\s+/).slice(0, 6).join(' '))
        .filter(c => c.length > 2)
        .join(', ');
}

/**
 * Build workflow catalog markdown from workflows.json.
 * @param {Object} config - Parsed workflows.json
 * @returns {string} Workflow catalog markdown (no top-level heading)
 */
function buildWorkflowCatalog(config) {
    const { workflows, commandMapping, settings } = config;
    const lines = [];

    const handoffIds = new Set(['po-ba-handoff', 'ba-dev-handoff', 'dev-qa-handoff', 'qa-po-acceptance', 'design-dev-handoff', 'sprint-retro']);

    const standardEntries = [];
    const handoffEntries = [];

    for (const [id, wf] of Object.entries(workflows)) {
        const keywords = extractKeywords(wf.whenToUse);
        if (!keywords) continue;
        const entry = { id, name: wf.name, keywords };
        if (handoffIds.has(id)) handoffEntries.push(entry);
        else standardEntries.push(entry);
    }

    standardEntries.sort((a, b) => a.name.localeCompare(b.name));
    handoffEntries.sort((a, b) => a.name.localeCompare(b.name));

    // Keyword lookup table
    lines.push('### Quick Keyword Lookup');
    lines.push('');
    lines.push('| If prompt contains... | Workflow ID | Workflow Name |');
    lines.push('| --------------------- | ----------- | ------------- |');
    for (const entry of standardEntries) {
        lines.push(`| ${entry.keywords} | \`${entry.id}\` | **${entry.name}** |`);
    }
    lines.push('');

    // Workflow details
    lines.push('### Workflow Details');
    lines.push('');

    const allEntries = Object.entries(workflows)
        .filter(([, wf]) => wf.whenToUse)
        .sort(([a], [b]) => a.localeCompare(b));

    for (const [id, wf] of allEntries) {
        const sequence = wf.sequence.map(step => commandMapping[step]?.copilot || commandMapping[step]?.claude || `/${step}`).join(' \u2192 ');
        const confirm = wf.confirmFirst ? ' | Confirm first' : '';
        lines.push(`**${id}** \u2014 ${wf.name}${confirm}`);
        lines.push(`  Use: ${wf.whenToUse}`);
        if (wf.whenNotToUse) lines.push(`  Not for: ${wf.whenNotToUse}`);
        lines.push(`  Steps: ${sequence}`);
        lines.push('');
    }

    // Role handoffs
    if (handoffEntries.length > 0) {
        lines.push('### Role Handoff Workflows');
        lines.push('');
        lines.push('| Handoff | Workflow ID |');
        lines.push('| ------- | ----------- |');
        for (const entry of handoffEntries) {
            lines.push(`| ${entry.name} | \`${entry.id}\` |`);
        }
        lines.push('');
    }

    // Execution protocol
    lines.push('### Workflow Execution Protocol');
    lines.push('');
    lines.push('1. **DETECT:** Match prompt against keyword table above');
    lines.push('2. **ASK:** ALWAYS ask user to confirm: "Activate [Workflow] (Recommended)" vs "Execute directly"');
    lines.push('3. **ACTIVATE (if confirmed):** Start the workflow, announce to user');
    lines.push('4. **CREATE TASKS:** Use task tracking for ALL workflow steps BEFORE starting');
    lines.push('5. **EXECUTE:** Follow each step in sequence, updating status as you progress');
    lines.push('');
    lines.push('> **IMPORTANT:** MUST ATTENTION create todo tasks for ALL steps. Do NOT skip any steps in the selected workflow.');
    lines.push('');
    if (settings?.allowOverride && settings?.overridePrefix) {
        lines.push(`**Override:** Prefix prompt with \`${settings.overridePrefix}\` to bypass workflow detection.`);
        lines.push('');
    }

    return lines.join('\n');
}

/**
 * Build dev rules section from development-rules.md.
 * @returns {string|null} Dev rules markdown, or null if not found
 */
function buildDevRulesContent() {
    if (!fs.existsSync(DEV_RULES_PATH)) return null;
    const content = fs.readFileSync(DEV_RULES_PATH, 'utf8').trim();
    return [
        content,
        '',
        '### Modularization',
        '',
        '- Check existing modules before creating new',
        '- Analyze logical separation boundaries (functions, classes, concerns)',
        '- Use kebab-case naming with descriptive names',
        '- Write descriptive code comments',
        '- After modularization, continue with main task',
        '- When not to modularize: Markdown files, plain text files, bash scripts, configuration files'
    ].join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// FILE GENERATORS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate .github/copilot-instructions.md — project-specific content.
 * All content is driven by docs/copilot-registry.json (projectInstructions)
 * and docs/project-config.json (project name/description).
 * @param {Array} registry - Registry entries from copilot-registry.json
 * @param {Object} projectInstructions - projectInstructions from copilot-registry.json
 * @param {Object} projectConfig - { name, description } from project-config.json
 * @returns {string} Full file content
 */
function generateProjectSpecificFile(registry, projectInstructions, projectConfig) {
    const projName = projectConfig.name || 'Project';
    const projDesc = projectConfig.description || '';
    const pi = projectInstructions || {};

    const lines = [
        '<!-- AUTO-GENERATED by .claude/scripts/sync-copilot-workflows.cjs — DO NOT EDIT MANUALLY -->',
        '<!-- Re-generate: node .claude/scripts/sync-copilot-workflows.cjs -->',
        '<!-- For richer summaries, run /sync-to-copilot skill (AI reads files and enriches) -->',
        '',
        `# ${projName} - Copilot Instructions`,
        ''
    ];

    if (projDesc) {
        lines.push(`> ${projDesc}`);
        lines.push('');
    }

    lines.push('---');
    lines.push('');

    // Golden rules (from config)
    const goldenRules = pi.goldenRules || [];
    if (goldenRules.length > 0) {
        lines.push('## TL;DR - Golden Rules');
        lines.push('');
        goldenRules.forEach((rule, i) => {
            lines.push(`${i + 1}. ${rule}`);
        });
        lines.push('');
        lines.push('**Architecture Hierarchy** - Place logic in LOWEST layer: `Entity/Model > Service > Component/Handler`');
        lines.push('');
    }

    // Decision quick-ref (from config)
    const quickRef = pi.decisionQuickRef || [];
    if (quickRef.length > 0) {
        lines.push('**Decision Quick-Ref:**');
        lines.push('');
        lines.push('| Task | Pattern |');
        lines.push('| ---- | ------- |');
        for (const entry of quickRef) {
            lines.push(`| ${entry.task} | ${entry.pattern} |`);
        }
        lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('## Search Existing Code FIRST');
    lines.push('');
    lines.push('Before writing ANY code:');
    lines.push('');
    lines.push('1. **Grep/Glob search** for similar patterns (find 3+ examples)');
    lines.push('2. **Follow codebase pattern**, NOT generic framework docs');
    lines.push('3. **Provide evidence** in plan (file:line references)');
    lines.push('');

    // Key file locations (from config)
    const keyFiles = pi.keyFileLocations || [];
    if (keyFiles.length > 0) {
        lines.push('---');
        lines.push('');
        lines.push('## Key File Locations');
        lines.push('');
        lines.push('```');
        // Pad paths to align descriptions
        const maxLen = Math.max(...keyFiles.map(f => f.path.length));
        for (const entry of keyFiles) {
            lines.push(`${entry.path.padEnd(maxLen + 1)}# ${entry.description}`);
        }
        lines.push('```');
        lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('## Project Reference Docs Index');
    lines.push('');
    lines.push('> These docs contain detailed patterns and conventions. **READ the full file** when working in the matching context.');
    lines.push('> Summaries below are concise — always read the source doc for complete guidance.');
    lines.push('');

    // Registry-driven docs index
    if (registry.length > 0) {
        lines.push('| Doc | Summary | READ When |');
        lines.push('| --- | ------- | --------- |');

        for (const entry of registry) {
            const docPath = `docs/project-reference/${entry.file}`;
            const docLink = `[${entry.title}](${docPath})`;
            lines.push(`| ${docLink} | ${entry.summary} | ${entry.whenToRead} |`);
        }

        lines.push('');
        lines.push(
            '> **How to use:** When your task matches a "READ When" trigger above, **read the full file** before writing code. These docs contain project-specific patterns that differ from generic framework defaults.'
        );
    } else {
        lines.push('_No project reference docs registered. Run /scan-project-structure to populate._');
    }

    // Dev commands (from config)
    const devCommands = pi.devCommands || {};
    const commandGroups = Object.entries(devCommands);
    if (commandGroups.length > 0) {
        lines.push('');
        lines.push('---');
        lines.push('');
        lines.push('## Development Commands');
        lines.push('');
        lines.push('```bash');
        commandGroups.forEach(([group, cmds], i) => {
            lines.push(`# ${group}`);
            for (const cmd of cmds) {
                lines.push(cmd);
            }
            if (i < commandGroups.length - 1) lines.push('');
        });
        lines.push('```');
    }

    lines.push('');

    return lines.join('\n');
}

/**
 * Generate .github/instructions/common-protocol.instructions.md — generic protocols.
 * Contains prompt protocol, task rules, workflow catalog, dev rules.
 * @param {Object} workflowConfig - Parsed workflows.json
 * @returns {string} Full file content
 */
function generateCommonProtocolFile(workflowConfig) {
    const workflowCount = Object.keys(workflowConfig.workflows).length;
    const catalog = buildWorkflowCatalog(workflowConfig);
    const devRules = buildDevRulesContent();

    const lines = [
        '---',
        'applyTo: "**/*"',
        '---',
        '',
        '<!-- AUTO-GENERATED by .claude/scripts/sync-copilot-workflows.cjs — DO NOT EDIT MANUALLY -->',
        '<!-- Sources: .claude/workflows.json, .claude/docs/development-rules.md -->',
        '',
        '# Common Development Protocol',
        '',
        '> Generic coding rules, principles, and workflows. For project-specific patterns, see `.github/copilot-instructions.md` and other `.github/instructions/*.instructions.md` files.',
        '',
        '---',
        '',
        '## PROMPT PROTOCOL (MANDATORY)',
        '',
        '**Confirm Before Execute:** If the user prompt could be complex or vague, you **MANDATORY IMPORTANT MUST ATTENTION** first confirm your understanding and clarify intent before executing. Restate what you understood, ask clarifying questions if ambiguous, and only proceed after confirmation.',
        '',
        '**Workflow Detection:** DETECT matching workflow from catalog below -> ASK user to confirm (Recommended) or skip -> WAIT for choice -> ACTIVATE if confirmed. Never auto-activate. Override: `quick:` prefix bypasses.',
        '',
        '---',
        '',
        '## BEFORE EDITING FILES (MANDATORY)',
        '',
        '**Task Creation:** For 2+ files or 20+ lines, create tasks BEFORE editing. Override: `quick:` prefix.',
        '',
        '**Search First:** MUST ATTENTION grep/glob for existing patterns (3+ examples) before implementing .ts/.cs/.html/.scss. Follow codebase patterns, cite evidence. Override: user says "skip search".',
        '',
        '**Code Responsibility Hierarchy:** Place logic in LOWEST layer: Entity/Model > Service > Component/Handler.',
        '',
        '---',
        '',
        `## Workflow Catalog (${workflowCount} workflows)`,
        '',
        catalog,
        '',
        '---'
    ];

    // Add dev rules if available
    if (devRules) {
        lines.push('');
        lines.push('## Development Rules');
        lines.push('');
        lines.push(
            '> **Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**'
        );
        lines.push('');
        lines.push(devRules);
        lines.push('');
        lines.push('---');
    }

    lines.push('');

    return lines.join('\n');
}

/**
 * Generate per-group .github/instructions/*.instructions.md files.
 * Enhanced with READ prompts per doc for on-demand context loading.
 * @param {boolean} dryRun - If true, log but don't write
 * @returns {number} Number of files written
 */
function generateInstructionFiles(dryRun = false) {
    const { registry, instructionFileConfig } = loadCopilotRegistry();
    if (registry.length === 0) return 0;

    // Group entries (skip "common" — handled separately)
    const groups = {};
    for (const entry of registry) {
        if (entry.group === 'common') continue;
        if (!groups[entry.group]) groups[entry.group] = [];
        groups[entry.group].push(entry);
    }

    if (!dryRun) fs.mkdirSync(INSTRUCTIONS_DIR, { recursive: true });

    let count = 0;
    for (const [group, entries] of Object.entries(groups)) {
        const config = instructionFileConfig[group];
        if (!config) {
            console.warn(`Warning: unknown group "${group}" in copilot registry, skipping`);
            continue;
        }

        const lines = [
            '---',
            `applyTo: "${config.applyTo}"`,
            '---',
            '',
            '<!-- AUTO-GENERATED by .claude/scripts/sync-copilot-workflows.cjs — DO NOT EDIT MANUALLY -->',
            `<!-- Source: docs/project-reference/ (group: ${group}) -->`,
            '',
            `# Project Reference - ${group}`,
            '',
            '> **IMPORTANT:** These are summaries. READ the full doc file when working in the matching context.',
            ''
        ];

        for (const entry of entries) {
            const docPath = `docs/project-reference/${entry.file}`;
            const relLink = `../../${docPath}`;

            lines.push(`## [${entry.title}](${relLink})`);
            lines.push('');
            lines.push(`**Summary:** ${entry.summary}`);
            lines.push('');
            lines.push(`> **READ** \`${docPath}\` when: ${entry.whenToRead}`);
            lines.push('');
        }

        const content = lines.join('\n');
        const filePath = path.join(INSTRUCTIONS_DIR, config.filename);

        if (dryRun) {
            console.log(`\n--- Would write: ${config.filename} (${entries.length} entries) ---`);
            console.log(content);
        } else {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`  Generated: .github/instructions/${config.filename} (${entries.length} entries)`);
        }
        count++;
    }
    return count;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

function main() {
    const dryRun = process.argv.includes('--dry-run');

    // Load workflows.json
    if (!fs.existsSync(WORKFLOWS_PATH)) {
        console.error(`ERROR: ${WORKFLOWS_PATH} not found`);
        process.exit(1);
    }
    const workflowConfig = JSON.parse(fs.readFileSync(WORKFLOWS_PATH, 'utf8'));
    const workflowCount = Object.keys(workflowConfig.workflows).length;
    console.log(`Source: .claude/workflows.json (${workflowCount} workflows)`);

    // Load registry and project config
    const { registry, projectInstructions } = loadCopilotRegistry();
    const projectConfig = loadProjectConfig();
    console.log(`Source: docs/copilot-registry.json (${registry.length} docs)`);
    console.log(`Source: docs/project-config.json (project: ${projectConfig.name})`);

    if (fs.existsSync(DEV_RULES_PATH)) {
        console.log(`Source: .claude/docs/development-rules.md`);
    }

    // Generate content
    const projectSpecific = generateProjectSpecificFile(registry, projectInstructions, projectConfig);
    const commonProtocol = generateCommonProtocolFile(workflowConfig);

    if (dryRun) {
        console.log('\n--- DRY RUN: copilot-instructions.md ---\n');
        console.log(projectSpecific);
        console.log('\n--- DRY RUN: common-protocol.instructions.md ---\n');
        console.log(commonProtocol);
        console.log('\n--- DRY RUN: Instruction files ---\n');
        generateInstructionFiles(true);
        console.log('\n--- END DRY RUN ---');
        process.exit(0);
    }

    // Ensure directories exist
    fs.mkdirSync(path.dirname(COPILOT_MAIN_PATH), { recursive: true });
    fs.mkdirSync(INSTRUCTIONS_DIR, { recursive: true });

    // Write project-specific file
    fs.writeFileSync(COPILOT_MAIN_PATH, projectSpecific, 'utf8');
    console.log(`Updated: .github/copilot-instructions.md`);

    // Write common protocol file
    const commonPath = path.join(INSTRUCTIONS_DIR, 'common-protocol.instructions.md');
    fs.writeFileSync(commonPath, commonProtocol, 'utf8');
    console.log(`Updated: .github/instructions/common-protocol.instructions.md`);

    // Write per-group instruction files
    const instrCount = generateInstructionFiles(false);
    console.log(`Generated ${instrCount} per-group instruction files`);

    // Clean up old file if it exists
    if (fs.existsSync(OLD_COPILOT_PATH)) {
        fs.unlinkSync(OLD_COPILOT_PATH);
        console.log(`Removed: .github/common.copilot-instructions.md (migrated to new structure)`);
    }

    console.log(`\nDone. Synced ${workflowCount} workflows + ${registry.length} doc refs.`);
    console.log(`Run /sync-to-copilot skill to enrich summaries with AI-extracted content.`);
}

// Export for testing
module.exports = {
    buildWorkflowCatalog,
    extractKeywords,
    buildDevRulesContent,
    generateProjectSpecificFile,
    generateCommonProtocolFile,
    generateInstructionFiles,
    loadCopilotRegistry,
    loadProjectConfig
};

if (require.main === module) {
    main();
}
