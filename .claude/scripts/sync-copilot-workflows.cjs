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
 * NAME NOTE: despite the name, this generates the ENTIRE Copilot instruction set
 * (project-specific + common-protocol + all per-group instruction files), not just
 * the workflow catalog. The "workflows" in the filename is historical/back-compat —
 * the /sync-to-copilot skill invokes this script (its --fast mode is the script-only
 * path; the former /sync-copilot-workflows skill was absorbed into that mode).
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
 * section headings extracted from actual files, run the sync-to-copilot skill
 * which instructs the AI to read each file and enrich the generated output.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const { buildWorkflowSkillsCatalog } = require('./lib/workflow-skills-catalog.cjs');
const WORKFLOWS_PATH = path.join(ROOT, '.claude', 'workflows.json');
const DEV_RULES_PATH = path.join(ROOT, '.claude', 'docs', 'development-rules.md');
const PROJECT_CONFIG_PATH = path.join(ROOT, 'docs', 'project-config.json');
const COPILOT_REGISTRY_PATH = path.join(ROOT, 'docs', 'copilot-registry.json');
const COPILOT_MAIN_PATH = path.join(ROOT, '.github', 'copilot-instructions.md');
const INSTRUCTIONS_DIR = path.join(ROOT, '.github', 'instructions');
// Old file path — removed during migration
const OLD_COPILOT_PATH = path.join(ROOT, '.github', 'common.copilot-instructions.md');
// Universal rules the Claude hooks inject per-prompt — baked into the Copilot mirror (Copilot has no hooks).
const PROMPT_INJECTIONS_PATH = path.join(ROOT, '.claude', 'hooks', 'lib', 'prompt-injections.cjs');
// Canonical hook-independent Workflow-First Gate — baked at the top of copilot-instructions.md so
// Copilot (no hooks, no runtime injection) gets the same routing rule as Claude/Codex.
const WORKFLOW_GATE_PATH = path.join(ROOT, '.claude', 'skills', 'shared', 'workflow-first-gate.md');

/**
 * Load the marker-delimited Workflow-First Gate block from the shared canonical file.
 * Returns null when unavailable so the generator simply omits it rather than failing the sync.
 * @returns {string|null}
 */
function loadWorkflowGate() {
    try {
        const raw = fs.readFileSync(WORKFLOW_GATE_PATH, 'utf8');
        const m = raw.match(/<!-- CK:WORKFLOW-GATE -->[\s\S]*?<!-- \/CK:WORKFLOW-GATE -->/);
        return m ? m[0] : null;
    } catch {
        return null;
    }
}

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
function extractKeywords(whenToUse, { maxClauses = 3, wordsPerClause = 6, maxLen = 130 } = {}) {
    if (!whenToUse) return '';
    const clauses = whenToUse
        .split(/[,;]/)
        .map(clause => clause.trim().toLowerCase())
        .map(c => c.replace(/^(?:user (?:wants to|reports|has)|wants to|po(?:\/| or )ba wants to|generate|create|after)\s+/i, ''))
        .map(c => c.split(/\s+/).slice(0, wordsPerClause).join(' '))
        .filter(c => c.length > 2);
    const picked = [];
    const seen = new Set();
    for (const clause of clauses) {
        if (seen.has(clause)) continue;
        seen.add(clause);
        picked.push(clause);
        if (picked.length >= maxClauses) break;
    }
    let out = picked.join(', ');
    if (out.length > maxLen) out = `${out.slice(0, maxLen).replace(/[\s,]+\S*$/, '')}…`;
    return out.replace(/\|/g, '\\|');
}

/**
 * Build workflow catalog markdown from workflows.json.
 * @param {Object} config - Parsed workflows.json
 * @returns {string} Workflow catalog markdown (no top-level heading)
 */
// TWIN: keep byte-identical with the same-named helpers in
// .claude/scripts/codex/sync-context-workflows.mjs — the rendered `[parallel ⇉ all-return barrier: ...]`
// token MUST be identical across the Copilot and Codex mirrors (cross-mirror parity is the portability proof).
// Renders `sequence` collapsing every declared parallelGroup's members into one barrier token at the
// position of the group's first-encountered member; other members are skipped. Non-grouped steps render
// via renderStep unchanged, so workflows without parallelGroups are byte-identical to the old flat join.
function renderBarrierToken(group) {
    const members = Array.isArray(group?.members) ? group.members : [];
    const conditional = new Set(Array.isArray(group?.conditionalMembers) ? group.conditionalMembers : []);
    const rendered = members.map((m) => (conditional.has(m) ? `${m}*` : m)).join(', ');
    return `[parallel ⇉ all-return barrier: ${rendered}]`;
}

function renderSequenceWithBarriers(sequence, parallelGroups, separator, renderStep) {
    const steps = Array.isArray(sequence) ? sequence : [];
    const groups = Array.isArray(parallelGroups) ? parallelGroups : [];
    if (groups.length === 0) {
        return steps.map(renderStep).join(separator);
    }
    const memberToGroup = new Map();
    for (const group of groups) {
        const members = Array.isArray(group?.members) ? group.members : [];
        for (const member of members) memberToGroup.set(member, group);
    }
    const emittedGroupIds = new Set();
    const parts = [];
    for (const step of steps) {
        const group = memberToGroup.get(step);
        if (!group) {
            parts.push(renderStep(step));
            continue;
        }
        if (emittedGroupIds.has(group.id)) continue;
        emittedGroupIds.add(group.id);
        parts.push(renderBarrierToken(group));
    }
    return parts.join(separator);
}

function buildWorkflowCatalog(config) {
    const { workflows, commandMapping, settings } = config;
    const lines = [];

    const standardEntries = [];

    for (const [id, wf] of Object.entries(workflows)) {
        const keywords = extractKeywords(wf.whenToUse);
        if (!keywords) continue;
        const entry = { id, name: String(wf.name).replace(/\|/g, '\\|'), keywords };
        standardEntries.push(entry);
    }

    standardEntries.sort((a, b) => a.name.localeCompare(b.name));

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
        const parallelGroups = Array.isArray(wf.parallelGroups) ? wf.parallelGroups : [];
        const sequence = renderSequenceWithBarriers(wf.sequence, parallelGroups, ' \u2192 ', step => commandMapping[step]?.copilot || step);
        lines.push(`**${id}** \u2014 ${wf.name}`);
        lines.push(`  Use: ${wf.whenToUse}`);
        if (wf.whenNotToUse) lines.push(`  Not for: ${wf.whenNotToUse}`);
        lines.push(`  Steps: ${sequence}`);
        if (parallelGroups.length > 0) {
            lines.push(`  Parallel phase = all-return barrier: spawn ALL members together (one message); advance only after EVERY member returns (a skipped conditional member, marked *, counts as returned). A sub-agent completion advances the step identically to an inline call.`);
        }
        lines.push('');
    }

    // Execution protocol
    lines.push('### Workflow Execution Protocol');
    lines.push('');
    lines.push('1. **DETECT:** Match prompt against keyword table above');
    lines.push('2. **ANALYZE:** Choose the best path: execute directly, use a skill, start a standard workflow, or compose a custom step combination');
    lines.push('3. **AUTO-SELECT:** Pick the best path yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow. Explicit workflow/skill prompts count as user-selected and should execute directly.');
    lines.push('4. **ACTIVATE:** Start the selected workflow, invoke the selected skill, sequence custom steps manually, or execute directly');
    lines.push('5. **CREATE TASKS:** Use task tracking for ALL workflow steps BEFORE starting');
    lines.push('6. **EXECUTE:** Advance per the "Workflow Step Advancement & Parallel Phases" rule below — model-driven; a sub-agent completion advances a step IDENTICALLY to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it). Update status as you progress.');
    lines.push('');
    lines.push('> **IMPORTANT:** MUST ATTENTION create todo tasks for ALL steps. Do NOT skip any steps in the selected workflow.');
    lines.push('');

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

/**
 * Bake the universal rules the Claude hooks inject at runtime — critical-thinking mindset,
 * AI-mistake-prevention system lessons, and learned lessons. Copilot has no hooks, so these
 * must be statically baked into the common protocol. skipDedup=true forces the full block;
 * the transcript-dedup argument is irrelevant at sync time.
 * @returns {string|null} Markdown block, or null if the injector module is unavailable.
 */
function buildUniversalRulesContent() {
    let injectors;
    try {
        injectors = require(PROMPT_INJECTIONS_PATH);
    } catch (e) {
        console.warn(`Warning: prompt-injections not loadable (${e.message}); skipping universal-rule bake`);
        return null;
    }
    const blocks = [];
    const mindset = injectors.injectCriticalContext?.(null, true);
    if (mindset) blocks.push(['## Critical Thinking & Anti-Hallucination', '', mindset.trim()].join('\n'));
    const aiMistakes = injectors.injectAiMistakePrevention?.(null, true);
    if (aiMistakes) blocks.push(aiMistakes.trim()); // already starts with its own ## heading
    const lessons = injectors.injectLessons?.(null, true);
    if (lessons) blocks.push(lessons.trim()); // already starts with its own ## heading
    return blocks.length ? blocks.join('\n\n---\n\n') : null;
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
        '<!-- For richer summaries, run the sync-to-copilot skill (AI reads files and enriches) -->',
        '',
        `# ${projName} - Copilot Instructions`,
        ''
    ];

    if (projDesc) {
        lines.push(`> ${projDesc}`);
        lines.push('');
    }

    // Workflow-First Gate — primacy anchor, before any other instruction (Copilot has no hooks).
    const workflowGate = loadWorkflowGate();
    if (workflowGate) {
        lines.push(workflowGate);
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
        lines.push('_No project reference docs registered. Run /scan --target=project-structure to populate._');
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
        '<!-- Sources: .claude/workflows.json, .claude/docs/development-rules.md, .claude/hooks/lib/prompt-injections.cjs -->',
        '',
        '# Common Development Protocol',
        '',
        '> Generic coding rules, principles, and workflows. For project-specific patterns, see `.github/copilot-instructions.md` and other `.github/instructions/*.instructions.md` files.',
        '',
        '---',
        '',
        '## PROMPT PROTOCOL (MANDATORY)',
        '',
        '**Auto-Select Before Execute:** Evaluate whether direct execution, a skill, a standard workflow, or a custom workflow is the best fit. If the prompt starts with an explicit skill/workflow command, execute it directly. Do not ask the user to choose the execution path.',
        '',
        '**Workflow Detection:** DETECT matching workflow from catalog below -> ANALYZE direct vs skill vs standard workflow vs custom fit -> AUTO-SELECT the best path without asking for workflow-selection confirmation. Preserve the explicit-invocation exception when the user already named a workflow/skill.',
        '',
        '---',
        '',
        '## PROJECT CONTEXT BOOTSTRAP (HOOKLESS)',
        '',
        'Copilot has no Claude hooks. If `docs/project-config.json`, `docs/project-reference/docs-index-reference.md`, `docs/project-reference/lessons.md`, `CLAUDE.md`, `AGENTS.md`, or a task-required reference doc is missing or stale, auto-run the suitable setup route before ordinary project-specific work: `/project-init` for broad setup, or the narrow route (`/project-config`, `/docs-init`, `/scan-all`, `/scan --target=<key>`, `/claude-md-init`) when the missing artifact is obvious. For spec, test-case, `docs/specs/`, behavior-change, or public-contract work, read `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` through the project-reference instructions. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `/sync-codex`; do not auto-run it.',
        '',
        '---',
        '',
        '## BEFORE EDITING FILES (MANDATORY)',
        '',
        '**Task Creation:** For 2+ files or 20+ lines, create tasks BEFORE editing.',
        '',
        '**Search First:** MUST ATTENTION grep/glob for existing patterns (3+ examples) before implementing .ts/.cs/.html/.scss. Follow codebase patterns, cite evidence. Override: user says "skip search".',
        '',
        '**Code Responsibility Hierarchy:** Place logic in LOWEST layer: Entity/Model > Service > Component/Handler.',
        '',
        '---',
        '',
        '## Workflow Step Advancement & Parallel Phases (MANDATORY)',
        '',
        'Workflow progression is **model-driven** — your responsibility, not a tool/hook signal (Copilot has no hooks):',
        '',
        '1. **Advancement:** a step is complete when its work returns — whether run inline (a skill/step call) or dispatched as a sub-agent. A sub-agent completion advances the step IDENTICALLY to an inline call. Do not wait for any tool event; advance by judgment and your task list.',
        '2. **Parallel phase = all-return barrier:** when steps are declared a parallel-phase group, spawn ALL members together (one message), then advance ONLY after EVERY member returns. Never start the next step — or any code-mutating step (e.g. `code-simplifier`) — until the whole group has returned. A conditional member whose trigger is absent counts as "returned."',
        '3. **Workflow-in-workflow -> sub-agent:** a step that itself activates a multi-step workflow MUST run as a sub-agent, returning only a summary (full findings to `plans/reports/`). This preserves context containment.',
        '4. **Trackers are accelerators only:** correctness MUST NOT depend on any step-tracking hook; Codex and Copilot advance entirely by this rule.',
        '',
        '---',
        '',
        `## Workflow Catalog (${workflowCount} workflows)`,
        '',
        catalog,
        '',
        '---',
        '',
        // Composable step-skills index only — the Workflow Catalog above already lists
        // workflows/steps/when-to-use, and the PROMPT PROTOCOL covers routing. This adds
        // the missing piece: the distinct step-skills an AI can compose into a custom workflow.
        buildWorkflowSkillsCatalog({ rootDir: ROOT, sections: ['skills'] }),
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

    // Universal rules (mindset + AI-mistake-prevention + lessons) — hook-parity bake.
    const universalRules = buildUniversalRulesContent();
    if (universalRules) {
        lines.push('');
        lines.push(universalRules);
        lines.push('');
        lines.push('---');
    }

    lines.push('');

    return lines.join('\n');
}

/**
 * Build per-group instruction file content WITHOUT touching the filesystem.
 * Pure function: same inputs (registry + instructionFileConfig) → same output.
 * This is the oracle the divergence verifier imports so "expected" output can
 * never drift from what the writer actually emits.
 * @returns {Map<string,string>} filename → file content (filename relative to INSTRUCTIONS_DIR)
 */
function buildInstructionFiles() {
    const { registry, instructionFileConfig } = loadCopilotRegistry();
    const files = new Map();
    if (registry.length === 0) return files;

    // Group entries (skip "common" — handled separately)
    const groups = {};
    for (const entry of registry) {
        if (entry.group === 'common') continue;
        if (!groups[entry.group]) groups[entry.group] = [];
        groups[entry.group].push(entry);
    }

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

        files.set(config.filename, lines.join('\n'));
    }
    return files;
}

/**
 * Generate per-group .github/instructions/*.instructions.md files.
 * Thin writer around buildInstructionFiles() — content is identical; this only
 * handles dry-run logging and filesystem writes.
 * @param {boolean} dryRun - If true, log but don't write
 * @returns {number} Number of files written
 */
function generateInstructionFiles(dryRun = false) {
    const files = buildInstructionFiles();
    if (files.size === 0) return 0;

    if (!dryRun) fs.mkdirSync(INSTRUCTIONS_DIR, { recursive: true });

    let count = 0;
    for (const [filename, content] of files) {
        const filePath = path.join(INSTRUCTIONS_DIR, filename);
        if (dryRun) {
            console.log(`\n--- Would write: ${filename} ---`);
            console.log(content);
        } else {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`  Generated: .github/instructions/${filename}`);
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
    console.log(`Run the sync-to-copilot skill to enrich summaries with AI-extracted content.`);
}

// Export for testing
module.exports = {
    buildWorkflowCatalog,
    extractKeywords,
    buildDevRulesContent,
    buildUniversalRulesContent,
    generateProjectSpecificFile,
    generateCommonProtocolFile,
    buildInstructionFiles,
    generateInstructionFiles,
    loadCopilotRegistry,
    loadProjectConfig,
    renderSequenceWithBarriers,
    renderBarrierToken
};

if (require.main === module) {
    main();
}
