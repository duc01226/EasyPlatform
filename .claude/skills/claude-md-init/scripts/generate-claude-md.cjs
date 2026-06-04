#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const builders = require('./section-builders.cjs');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
let CONFIG_PATH = path.join(PROJECT_DIR, 'docs', 'project-config.json');
try {
    const { getConfiguredProjectConfigPath } = require('../../../hooks/lib/project-config-loader.cjs');
    CONFIG_PATH = getConfiguredProjectConfigPath();
} catch {
    // Keep the historical default when the portability loader is unavailable.
}
const CLAUDE_MD_PATH = path.join(PROJECT_DIR, 'CLAUDE.md');
const BACKUP_PATH = path.join(PROJECT_DIR, '.claude-md.backup');
const TEMPLATE_PATH = path.join(__dirname, '..', 'references', 'claude-md-template.md');
// Canonical hook-independent Workflow-First Gate (primacy anchor). Stamped at the top of every
// generated/updated CLAUDE.md so the routing rule survives in Codex/Copilot mirrors with no hooks.
const WORKFLOW_GATE_PATH = path.join(__dirname, '..', '..', 'shared', 'workflow-first-gate.md');
const GATE_OPEN = '<!-- CK:WORKFLOW-GATE -->';
const GATE_CLOSE = '<!-- /CK:WORKFLOW-GATE -->';
const GATE_BLOCK_RE = /<!-- CK:WORKFLOW-GATE -->[\s\S]*?<!-- \/CK:WORKFLOW-GATE -->/g;
// Concise workflows-index + composable step-skills reference, derived from workflows.json.
// Stamped right after the gate so CLAUDE.md carries the same workflow/skill catalog the
// hookless Codex/Copilot mirrors get. The block is idempotently strip-and-restamped.
const SKILLS_BLOCK_RE = /<!-- CK:WORKFLOW-SKILLS -->[\s\S]*?<!-- \/CK:WORKFLOW-SKILLS -->/g;
// Inline fallback keeps the generator portable if the shared file is absent in a partial install.
const WORKFLOW_GATE_FALLBACK = `${GATE_OPEN}

> **[WORKFLOW-GATE] — routing is your FIRST action, before any tool call.**
> This rule is hook-independent: it binds Claude, Codex, and Copilot equally.
>
> Classify complexity and risk first, then route it:
>
> | Request is about… | Default route |
> | --- | --- |
> | A simple, straightforward task with a clear target and low risk | **direct execution** — do it without a workflow |
> | A simple task that needs a few coordinated steps or skills | **custom simple workflow** — sequence only the necessary skills/steps |
> | A non-trivial bug, error, crash, regression, or wrong/stale output | **\`workflow-bugfix\` workflow** — \`/start-workflow workflow-bugfix\` |
> | A non-trivial new feature, capability, or enhancement | **\`workflow-feature\` workflow** — \`/start-workflow workflow-feature\` (use \`workflow-big-feature\` when scope is large/ambiguous) |
> | Anything matching a skill's or workflow's "Use" clause | that skill / workflow |
> | A one-off question, or a truly trivial edit | direct execution |
>
> 1. An explicit \`/skill\` or \`/workflow\` in the prompt is the user's choice — execute it. Otherwise auto-select; never ask which path to take.
> 2. Analyze whether the task is simple and straightforward before defaulting to a standard workflow. If the target is clear, the change is low-risk, and a short direct execution can satisfy it, choose direct execution.
> 3. For simple but multi-step work, build a custom simple workflow with only the few relevant skills/steps.
> 4. Use standard workflows for non-trivial bugs and feature/enhancement work — they force investigation, tests, and review.
> 5. Declare the route (\`Route: {workflow-id | skill | custom-simple | direct} — because {reason}\`) and create the task list BEFORE the first edit, sub-agent, or command.

${GATE_CLOSE}`;

/**
 * Load the canonical Workflow-First Gate block from the shared file, falling back to the inline
 * copy. Returns ONLY the marker-delimited block (drops the file's leading authoring comment).
 */
function loadWorkflowGate() {
    try {
        const raw = fs.readFileSync(WORKFLOW_GATE_PATH, 'utf-8');
        const m = raw.match(/<!-- CK:WORKFLOW-GATE -->[\s\S]*?<!-- \/CK:WORKFLOW-GATE -->/);
        if (m) return m[0];
    } catch {
        // Shared file unavailable — use the inline fallback below.
    }
    return WORKFLOW_GATE_FALLBACK;
}

/**
 * Build the CK:WORKFLOW-SKILLS block (composable step-skills index only) from
 * workflows.json. Returns '' if the shared builder is unavailable so CLAUDE.md generation
 * never fails on a partial install (the gate alone still stamps).
 *
 * Skills-only by design: Claude receives the full 17-workflow catalog LIVE on every prompt
 * via the workflow-router.cjs hook (richer — adds "Not for" + detection instructions +
 * active-workflow state, recency-managed). Re-stamping that same workflows index statically
 * here is pure duplication for the one runtime (Claude) that reads CLAUDE.md. The composable
 * step-skills table is NOT hook-injected, so it stays. The hookless mirrors derive their own
 * catalogs independently from workflows.json (AGENTS.md via sync-context-workflows.mjs which
 * strips this CK block and regenerates; Copilot via sync-copilot-workflows.cjs), so this
 * narrowing does not touch them.
 */
function loadWorkflowSkillsCatalog() {
    try {
        const { buildWorkflowSkillsCatalog, CK_SKILLS_START, CK_SKILLS_END } = require('../../../scripts/lib/workflow-skills-catalog.cjs');
        const body = buildWorkflowSkillsCatalog({ rootDir: PROJECT_DIR, sections: ['skills'] });
        return `${CK_SKILLS_START}\n${body}\n${CK_SKILLS_END}`;
    } catch {
        return '';
    }
}

const SECTION_OPEN = /^<!-- SECTION:(\S+) -->$/;
const SECTION_CLOSE = /^<!-- \/SECTION:(\S+) -->$/;

// Universal-guides sentinel — stamped at the top of every generated/updated CLAUDE.md.
// The agent-files bootstrap gate reads this to tell a complete file from a project-only
// one. MUST match agent-files-state.cjs UNIVERSAL_GUIDES_VERSION / SENTINEL_RE — the
// agent-files-gate.test.cjs sync test enforces the lockstep.
const UNIVERSAL_GUIDES_VERSION = 3;
const SENTINEL = `<!-- CK:UNIVERSAL-GUIDES v${UNIVERSAL_GUIDES_VERSION} -->`;
const SENTINEL_RE = /<!--\s*CK:UNIVERSAL-GUIDES\s+v(\d+)\s*-->/i;
// Static portable-guide headings the universal section always ships. MUST match
// agent-files-state.cjs REQUIRED_ANCHORS — the agent-files-gate.test.cjs sync test
// enforces the lockstep. The sentinel is a content-presence promise: it may ONLY be
// stamped when these guides are actually in the file, else the bootstrap gate would
// read a false "complete" on a project-only file that never received the guides.
const REQUIRED_ANCHORS = [
    /first action decision/i,
    /workflow step advancement/i,
    /task planning rules/i,
    /code responsibility hierarchy/i,
    /evidence-based reasoning/i
];

function hasGuides(text) {
    return REQUIRED_ANCHORS.every(re => re.test(text));
}

/**
 * Ensure the sentinel state matches the actual content (idempotent).
 * The sentinel asserts "universal guides present", so it is stamped ONLY when the
 * guides are really in `content`; when they are absent the sentinel is stripped
 * (never stamped) so the bootstrap gate keeps flagging the file as incomplete
 * instead of being fooled by a promise the content does not keep.
 *   - guides present + no/old sentinel  → stamp current-version sentinel at the top
 *   - guides present + current sentinel → normalize in place (idempotent)
 *   - guides absent                     → strip any stale/false sentinel, no stamp
 */
function ensureSentinel(content) {
    const text = content.replace(/^﻿/, '');
    if (!hasGuides(text)) {
        return text.replace(SENTINEL_RE, '').replace(/^\n+/, '');
    }
    if (SENTINEL_RE.test(text)) {
        return text.replace(SENTINEL_RE, SENTINEL);
    }
    return `${SENTINEL}\n${text}`;
}

/**
 * Stamp the top-of-file header: sentinel first, then the Workflow-First Gate immediately after it.
 * Idempotent — strips any existing gate block (wherever it sits) and re-inserts it right below the
 * sentinel so the routing rule is always the first thing the model reads. The gate is bound to the
 * same content-presence contract as the sentinel (only stamped when the universal guides are
 * present), so project-only files are never force-injected.
 */
function stampHeader(content) {
    let text = ensureSentinel(content);
    text = text
        .replace(GATE_BLOCK_RE, '')
        .replace(SKILLS_BLOCK_RE, '')
        .replace(/^\n+/, '')
        .replace(/\n{3,}/g, '\n\n');
    if (!hasGuides(text)) return text;
    const gate = loadWorkflowGate();
    const skills = loadWorkflowSkillsCatalog();
    const header = skills ? `${gate}\n\n${skills}` : gate;
    const m = text.match(SENTINEL_RE);
    if (m) {
        const at = text.indexOf(m[0]) + m[0].length;
        return `${text.slice(0, at)}\n\n${header}\n\n${text.slice(at).replace(/^\n+/, '')}`;
    }
    return `${header}\n\n${text}`;
}

/**
 * Extract the static portable-guide sections from the template, keyed by heading.
 * A section spans from a top-level `## ` heading up to the next `## ` heading or a
 * SECTION marker (marker-wrapped sections are generated, not portable), with trailing
 * `---` separators and whitespace stripped. Only placeholder-free sections qualify —
 * the universal guides carry no `{token}` substitutions, so this never injects raw
 * template placeholders.
 * @param {string} templateText
 * @returns {Array<{heading:string, text:string}>}
 */
function extractPortableGuideSections(templateText) {
    const lines = templateText.split('\n');
    const collected = [];
    let current = null;
    const flush = () => {
        if (!current) return;
        let text = current.join('\n').replace(/\s+$/, '');
        text = text.replace(/\n+\s*-{3,}\s*$/, '').replace(/\s+$/, '');
        if (text) collected.push({ heading: current[0].trim(), text });
        current = null;
    };
    for (const line of lines) {
        const trimmed = line.trim();
        if (/^##\s+/.test(trimmed)) {
            flush();
            current = [line];
            continue;
        }
        if (current) {
            if (SECTION_OPEN.test(trimmed) || SECTION_CLOSE.test(trimmed)) {
                flush();
                continue;
            }
            current.push(line);
        }
    }
    flush();
    return collected.filter(s => !/\{[a-z0-9-]+\}/i.test(s.text));
}

/**
 * Back-fill universal-guide sections that drifted out of an existing managed file.
 * For each REQUIRED_ANCHOR not already present in `content`, pull its section from the
 * template and insert the missing block (in anchor order) after the tldr close marker
 * (fallbacks: after the H1 title, else prepend). Idempotent — anchors already present
 * are skipped, so re-runs add nothing.
 *
 * CALLER CONTRACT: invoke ONLY for marker-managed files (hasMarkers === true). A
 * markerless file is project-only / pre-marker; force-injecting guides there would
 * violate the bootstrap-gate "content-presence promise" (see agent-files-state.cjs and
 * the agent-files-gate F1 invariant) and hijack a deliberately project-only CLAUDE.md.
 * @param {string} content
 * @param {string} templateText
 * @returns {string}
 */
function backfillPortableGuides(content, templateText) {
    if (REQUIRED_ANCHORS.every(re => re.test(content))) return content;
    const sections = extractPortableGuideSections(templateText);
    const blocks = [];
    for (const re of REQUIRED_ANCHORS) {
        if (re.test(content)) continue;
        const sec = sections.find(s => re.test(s.heading));
        if (sec) blocks.push(sec.text);
    }
    if (blocks.length === 0) return content;
    const block = `\n${blocks.join('\n\n---\n\n')}\n\n---\n`;

    const TLDR_CLOSE = '<!-- /SECTION:tldr -->';
    const closeIdx = content.indexOf(TLDR_CLOSE);
    if (closeIdx !== -1) {
        const nl = content.indexOf('\n', closeIdx + TLDR_CLOSE.length);
        const at = nl === -1 ? content.length : nl + 1;
        return content.slice(0, at) + block + content.slice(at);
    }
    const h1 = content.match(/^#[ \t]+.*$/m);
    if (h1) {
        const at = content.indexOf(h1[0]) + h1[0].length;
        return `${content.slice(0, at)}\n${block}${content.slice(at)}`;
    }
    return `${block.replace(/^\n/, '')}\n${content}`;
}

// Heading patterns for smart-merge (no markers)
const HEADING_MAP = [
    { pattern: /tl;dr|what you must know/i, key: 'tldr' },
    { pattern: /golden rule/i, key: 'golden-rules' },
    { pattern: /decision quick/i, key: 'decision-quick-ref' },
    { pattern: /key file location|file location/i, key: 'key-locations' },
    { pattern: /development command|dev command/i, key: 'dev-commands' },
    { pattern: /infrastructure port/i, key: 'infra-ports' },
    { pattern: /api.*port|service port/i, key: 'api-ports' },
    { pattern: /integration test/i, key: 'integration-testing' },
    { pattern: /e2e test|end.to.end/i, key: 'e2e-testing' },
    { pattern: /skill activation/i, key: 'skill-activation' },
    { pattern: /documentation (index|system)/i, key: 'doc-index' },
    { pattern: /doc lookup/i, key: 'doc-lookup' }
];

// Builder function map
const BUILDER_MAP = {
    tldr: c => builders.buildTldr(c),
    'golden-rules': c => builders.buildGoldenRules(c),
    'decision-quick-ref': c => builders.buildDecisionQuickRef(c),
    'key-locations': c => builders.buildKeyLocations(c),
    'dev-commands': c => builders.buildDevCommands(c),
    'infra-ports': c => builders.buildInfraPorts(c),
    'api-ports': c => builders.buildApiPorts(c),
    'integration-testing': c => builders.buildIntegrationTesting(c),
    'e2e-testing': c => builders.buildE2eTesting(c),
    'skill-activation': c => builders.buildSkillActivation(c),
    'doc-index': (c, d) => builders.buildDocIndex(c, d),
    'doc-lookup': c => builders.buildDocLookup(c)
};

function loadConfig() {
    if (!fs.existsSync(CONFIG_PATH)) return {};
    try {
        return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    } catch {
        console.error('[WARN] Failed to parse project-config.json, using empty config');
        return {};
    }
}

function hasMarkers(content) {
    return SECTION_OPEN.test(content.split('\n').find(l => SECTION_OPEN.test(l.trim())) || '');
}

function detectMode() {
    if (!fs.existsSync(CLAUDE_MD_PATH)) return 'init';
    const content = fs.readFileSync(CLAUDE_MD_PATH, 'utf-8');
    return hasMarkers(content) ? 'update' : 'smart-merge';
}

function buildSections(config) {
    const sections = {};
    for (const [key, builder] of Object.entries(BUILDER_MAP)) {
        const content = builder(config, PROJECT_DIR);
        if (content) sections[key] = content;
    }
    return sections;
}

function populateTemplate(template, sections) {
    const lines = template.split('\n');
    const output = [];
    let inSection = false;
    let currentKey = null;

    for (const line of lines) {
        const trimmed = line.trim();
        const openMatch = trimmed.match(SECTION_OPEN);
        const closeMatch = trimmed.match(SECTION_CLOSE);

        if (openMatch) {
            currentKey = openMatch[1];
            const content = sections[currentKey];
            if (content) {
                output.push(line); // keep open marker
                output.push('');
                output.push(content);
                output.push('');
                inSection = true;
            } else {
                // No data — skip entire section including markers
                inSection = true;
            }
            continue;
        }

        if (closeMatch) {
            if (sections[currentKey]) {
                output.push(line); // keep close marker
            }
            inSection = false;
            currentKey = null;
            continue;
        }

        if (!inSection) {
            output.push(line);
        }
        // Skip template placeholder lines inside sections
    }

    return output.join('\n');
}

function updateMarkedSections(existing, sections) {
    const lines = existing.split('\n');
    const output = [];
    let inSection = false;
    let currentKey = null;

    for (const line of lines) {
        const trimmed = line.trim();
        const openMatch = trimmed.match(SECTION_OPEN);
        const closeMatch = trimmed.match(SECTION_CLOSE);

        if (openMatch) {
            currentKey = openMatch[1];
            output.push(line); // keep open marker
            if (sections[currentKey]) {
                output.push('');
                output.push(sections[currentKey]);
                output.push('');
            }
            inSection = true;
            continue;
        }

        if (closeMatch) {
            output.push(line); // keep close marker
            inSection = false;
            currentKey = null;
            continue;
        }

        if (!inSection) {
            output.push(line);
        }
        // Skip old content inside sections — replaced above
    }

    return output.join('\n');
}

function createBackup() {
    if (fs.existsSync(CLAUDE_MD_PATH)) {
        fs.copyFileSync(CLAUDE_MD_PATH, BACKUP_PATH);
        console.log(`[OK] Backup created: ${path.basename(BACKUP_PATH)}`);
    }
}

function main() {
    const args = process.argv.slice(2);
    const modeFlag = args.find(a => a.startsWith('--mode='))?.split('=')[1] || args[args.indexOf('--mode') + 1];
    const isDetect = args.includes('--detect');

    if (isDetect) {
        const detected = detectMode();
        console.log(`[DETECT] Mode: ${detected}`);
        console.log(`[DETECT] CLAUDE.md: ${fs.existsSync(CLAUDE_MD_PATH) ? 'EXISTS' : 'MISSING'}`);
        console.log(`[DETECT] project-config.json: ${fs.existsSync(CONFIG_PATH) ? 'EXISTS' : 'MISSING'}`);
        process.exit(0);
    }

    const mode = modeFlag || detectMode();
    console.log(`[MODE] ${mode}`);

    const config = loadConfig();
    const sections = buildSections(config);

    const generated = Object.keys(sections);
    const skipped = Object.keys(BUILDER_MAP).filter(k => !sections[k]);
    console.log(`[SECTIONS] Generated: ${generated.join(', ') || 'none'}`);
    console.log(`[SECTIONS] Skipped (no data): ${skipped.join(', ') || 'none'}`);

    if (mode === 'init') {
        if (!fs.existsSync(TEMPLATE_PATH)) {
            console.error('[ERROR] Template not found:', TEMPLATE_PATH);
            process.exit(1);
        }
        createBackup();
        const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
        const output = populateTemplate(template, sections);

        // Replace top-level placeholders
        const projectName = config.project?.name || 'Project';
        const finalOutput = output.replace(/\{project-name\}/g, projectName).replace(/\{project-description\}/g, config.project?.description || '');

        fs.writeFileSync(CLAUDE_MD_PATH, stampHeader(finalOutput), 'utf-8');
        console.log(`[OK] CLAUDE.md created (init mode)`);
    } else if (mode === 'update') {
        if (!fs.existsSync(CLAUDE_MD_PATH)) {
            console.error('[ERROR] CLAUDE.md not found. Use --mode init first.');
            process.exit(1);
        }
        createBackup();
        const existing = fs.readFileSync(CLAUDE_MD_PATH, 'utf-8');
        let output = updateMarkedSections(existing, sections);

        // Back-fill universal-guide sections that drifted out of a managed file (e.g. a
        // CLAUDE.md authored before the current template version). Marker-managed files
        // only — a markerless file is project-only/pre-marker and must not be force-
        // converted (preserves the bootstrap-gate F1 content-presence invariant). The
        // back-fill is what lets ensureSentinel() stamp; without it the gate keeps
        // flagging the file incomplete forever and --mode update is a dead end.
        if (hasMarkers(existing) && fs.existsSync(TEMPLATE_PATH)) {
            const merged = backfillPortableGuides(output, fs.readFileSync(TEMPLATE_PATH, 'utf-8'));
            if (merged !== output) {
                output = merged;
                console.log('[OK] Back-filled missing universal-guide section(s) from template');
            }
        }

        fs.writeFileSync(CLAUDE_MD_PATH, stampHeader(output), 'utf-8');
        console.log(`[OK] CLAUDE.md updated (${generated.length} sections synced)`);
    } else if (mode === 'smart-merge') {
        console.log('[INFO] Smart-merge: CLAUDE.md has no markers. AI should handle migration.');
        console.log('[INFO] Run /claude-md-init in update mode after AI adds markers.');
        process.exit(0);
    } else if (mode === 'refactor') {
        console.log('[INFO] Refactor mode is AI-only. No script action needed.');
        process.exit(0);
    } else {
        console.error(`[ERROR] Unknown mode: ${mode}. Use init, update, or refactor.`);
        process.exit(1);
    }

    // Summary
    const stats = fs.statSync(CLAUDE_MD_PATH);
    const lines = fs.readFileSync(CLAUDE_MD_PATH, 'utf-8').split('\n').length;
    console.log(`[STATS] ${lines} lines, ${(stats.size / 1024).toFixed(1)}KB`);
}

main();
