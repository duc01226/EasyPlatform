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
// generated/updated CLAUDE.md so the routing rule survives in Codex mirrors with no hooks.
const WORKFLOW_GATE_PATH = path.join(__dirname, '..', '..', 'shared', 'workflow-first-gate.md');
const GATE_OPEN = '<!-- CK:WORKFLOW-GATE -->';
const GATE_CLOSE = '<!-- /CK:WORKFLOW-GATE -->';
const GATE_BLOCK_RE = /<!-- CK:WORKFLOW-GATE -->[\s\S]*?<!-- \/CK:WORKFLOW-GATE -->/g;
// Concise workflows-index + composable step-skills reference, derived from workflows.json.
// Stamped right after the gate so CLAUDE.md carries the same workflow/skill catalog the
// hookless Codex mirrors get. The block is idempotently strip-and-restamped.
const SKILLS_BLOCK_RE = /<!-- CK:WORKFLOW-SKILLS -->[\s\S]*?<!-- \/CK:WORKFLOW-SKILLS -->/g;
// Full always-on protocol blocks (critical-thinking + ai-mistake-prevention) baked into CLAUDE.md
// at BOTH top (after the catalog — strong primacy) and bottom (recency anchor) so a hookless
// read of CLAUDE.md reaches the same protocol the hookless mirrors render. Build-source is the
// canonical markdown (sync-inline-versions.md `:full`), read via the shared parser — the
// generator never couples to hooks/lib. Marker-wrapped so the bake is idempotently strip-and-restamped
// here, deduped from the AGENTS.md CLAUDE-mirror by sync-context-workflows.mjs, and located by the
// Phase 04 freshness verifiers.
const SYNC_INLINE_PATH = path.join(__dirname, '..', '..', 'shared', 'sync-inline-versions.md');
const CK_CRIT_OPEN = '<!-- CK:CRITICAL-THINKING -->';
const CK_CRIT_CLOSE = '<!-- /CK:CRITICAL-THINKING -->';
const CK_AIMP_OPEN = '<!-- CK:AI-MISTAKE-PREVENTION -->';
const CK_AIMP_CLOSE = '<!-- /CK:AI-MISTAKE-PREVENTION -->';
const CK_CRIT_BLOCK_RE = /<!-- CK:CRITICAL-THINKING -->[\s\S]*?<!-- \/CK:CRITICAL-THINKING -->/g;
const CK_AIMP_BLOCK_RE = /<!-- CK:AI-MISTAKE-PREVENTION -->[\s\S]*?<!-- \/CK:AI-MISTAKE-PREVENTION -->/g;

// Inline fallback keeps the generator portable if the shared file is absent in a partial install.
const WORKFLOW_GATE_FALLBACK = `${GATE_OPEN}

> **[WORKFLOW-GATE] — routing is your FIRST action, before any tool call.**
> This rule is hook-independent: it binds Claude and Codex equally.
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
 * Build the CK:WORKFLOW-SKILLS block (Workflows Index + composable step-skills index) from
 * workflows.json. Returns '' if the shared builder is unavailable so CLAUDE.md generation
 * never fails on a partial install (the gate alone still stamps).
 *
 * Hook-independent by design: CLAUDE.md is authored AS IF Claude has no hooks, so the full
 * workflow SELECTION catalog is baked statically here — the Workflows Index (id, when-to-use,
 * steps for every workflow) plus the composable step-skills table. No runtime hook
 * re-injects this catalog at runtime — this static bake is the sole, self-contained source:
 * the ability to pick the right workflow from this file ALONE never depends on any hook. This
 * keeps CLAUDE.md at information parity with the hookless mirrors, which bake the same
 * selection catalog independently from workflows.json (AGENTS.md via sync-context-workflows.mjs,
 * which strips this CK block from the CLAUDE mirror and regenerates its own Codex-native copy).
 * Per-workflow EXECUTION protocol is intentionally NOT
 * baked here — it is loaded on demand by the start-workflow skill (available to every harness),
 * keeping the always-on context lean. Single source of truth for both surfaces:
 * .claude/scripts/lib/workflow-skills-catalog.cjs over .claude/workflows.json.
 */
function loadWorkflowSkillsCatalog() {
    try {
        const { buildWorkflowSkillsCatalog, CK_SKILLS_START, CK_SKILLS_END } = require('../../../scripts/lib/workflow-skills-catalog.cjs');
        const body = buildWorkflowSkillsCatalog({ rootDir: PROJECT_DIR, sections: ['workflows', 'skills'] });
        return `${CK_SKILLS_START}\n${body}\n${CK_SKILLS_END}`;
    } catch {
        return '';
    }
}

/**
 * Build the marker-wrapped full-protocol blocks (critical-thinking + ai-mistake-prevention)
 * from the canonical source via the shared SYNC parser. Returns ONE string carrying both
 * marker-wrapped blocks (used identically at top and bottom), or '' when the source/blocks are
 * unavailable so CLAUDE.md generation never fails on a partial install (gate + catalog still stamp).
 *
 * Approach C: the generator reads canonical `:full` markdown — it does NOT import hooks/lib.
 * Codex mirrors use `.claude/scripts/lib/hookless-prompt-protocol.cjs`, which composes
 * this same canonical text without depending on hook prompt-injection modules. The shared parser
 * normalizes CRLF, so the bake is correct regardless of the working-tree checkout's line endings.
 */
function loadFullProtocolBlocks() {
    try {
        const { extractSyncBody } = require('../../../scripts/lib/extract-sync-block.cjs');
        const md = fs.readFileSync(SYNC_INLINE_PATH, 'utf-8');
        const crit = extractSyncBody(md, 'critical-thinking-mindset:full');
        const aimp = extractSyncBody(md, 'ai-mistake-prevention:full');
        if (!crit || !aimp) {
            // Fail LOUD, not silent: a missing/partial canonical source must not let the
            // generator ship a protocol-less file as "complete" (the sentinel is gated on
            // protocol availability via sentinelJustified()). Warn so the gap is visible.
            console.error(
                '[WARN] Shared protocol source incomplete — critical-thinking/ai-mistake-prevention :full block(s) ' +
                    `not found in ${SYNC_INLINE_PATH}. CLAUDE.md will NOT be stamped complete until this is restored.`
            );
            return '';
        }
        const critBlock = `${CK_CRIT_OPEN}\n\n${crit}\n\n${CK_CRIT_CLOSE}`;
        const aimpBlock = `${CK_AIMP_OPEN}\n\n${aimp}\n\n${CK_AIMP_CLOSE}`;
        return `${critBlock}\n\n${aimpBlock}`;
    } catch (err) {
        console.error(
            `[WARN] Shared protocol source unavailable (${err && err.message ? err.message : err}). ` +
                'CLAUDE.md will NOT be stamped complete until the canonical :full blocks are readable.'
        );
        return '';
    }
}

const SECTION_OPEN = /^<!-- SECTION:(\S+) -->$/;
const SECTION_CLOSE = /^<!-- \/SECTION:(\S+) -->$/;

// Universal-guides sentinel — stamped at the top of every generated/updated CLAUDE.md.
// The agent-files bootstrap gate reads this to tell a complete file from a project-only
// one. MUST match agent-files-state.cjs UNIVERSAL_GUIDES_VERSION / SENTINEL_RE — the
// agent-files-gate.test.cjs sync test enforces the lockstep.
const UNIVERSAL_GUIDES_VERSION = 6;
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
    /evidence-based reasoning/i,
    /lesson extraction/i,
    /version-control discipline/i
];

function hasGuides(text) {
    return REQUIRED_ANCHORS.every(re => re.test(text));
}

// Markers wrapping the baked shared-protocol blocks. The sentinel (v4+) is a promise that
// BOTH the prose guides AND the shared hookless protocol are present, so it may only be
// stamped when the protocol blocks are actually in the file — mirrors the agent-files gate
// completeness contract (agent-files-state.cjs hasClaudeProtocol) so generator and gate agree.
const CK_PROTOCOL_PRESENT_RES = [/<!--\s*CK:CRITICAL-THINKING\s*-->/i, /<!--\s*CK:AI-MISTAKE-PREVENTION\s*-->/i];

function hasProtocolBlocks(text) {
    return CK_PROTOCOL_PRESENT_RES.every(re => re.test(text));
}

// True only when the universal-guides sentinel is justified: prose guides present AND the
// shared protocol either already baked into `text` OR available to be baked now. Binding the
// sentinel to protocol availability is what stops a protocol-less file from shipping as
// "complete" when the canonical `:full` source failed to load (loadFullProtocolBlocks → '').
function sentinelJustified(text) {
    if (!hasGuides(text)) return false;
    return hasProtocolBlocks(text) || loadFullProtocolBlocks() !== '';
}

/**
 * Ensure the sentinel state matches the actual content (idempotent).
 * The sentinel asserts "universal guides AND shared protocol present", so it is stamped ONLY
 * when sentinelJustified() holds; otherwise any stale/false sentinel is stripped so the
 * bootstrap gate keeps flagging the file incomplete instead of being fooled by a promise the
 * content does not keep.
 *   - justified + no/old sentinel  → stamp current-version sentinel at the top
 *   - justified + current sentinel → normalize in place (idempotent)
 *   - not justified                → strip any stale/false sentinel, no stamp
 */
function ensureSentinel(content) {
    const text = content.replace(/^﻿/, '');
    if (!sentinelJustified(text)) {
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
    // Strip every managed block (gate, skills catalog, AND both protocol blocks — top + bottom
    // copies via the global regexes) so re-stamping is idempotent and the EOF footer copy is
    // removed here before stampFooter() re-appends a single fresh one.
    text = text
        .replace(GATE_BLOCK_RE, '')
        .replace(SKILLS_BLOCK_RE, '')
        .replace(CK_CRIT_BLOCK_RE, '')
        .replace(CK_AIMP_BLOCK_RE, '')
        .replace(/^\n+/, '')
        .replace(/\n{3,}/g, '\n\n');
    if (!hasGuides(text)) return text;
    const gate = loadWorkflowGate();
    const skills = loadWorkflowSkillsCatalog();
    const protocol = loadFullProtocolBlocks();
    // Order: gate (#1 primacy) → workflow/skills catalog → full protocol (still within the first
    // screenful). The route-gate must stay the first stamped block; protocol never precedes it.
    let header = skills ? `${gate}\n\n${skills}` : gate;
    if (protocol) header = `${header}\n\n${protocol}`;
    const m = text.match(SENTINEL_RE);
    if (m) {
        const at = text.indexOf(m[0]) + m[0].length;
        return `${text.slice(0, at)}\n\n${header}\n\n${text.slice(at).replace(/^\n+/, '')}`;
    }
    return `${header}\n\n${text}`;
}

/**
 * Append the full-protocol blocks at EOF as the recency anchor (Primacy-Recency: the same
 * critical rules at top AND bottom survive long context windows). Composed as
 * `stampFooter(stampHeader(content))` at the write sites — stampHeader has already stripped any
 * prior footer copy, so this appends exactly one. No-op when the protocol source is unavailable.
 */
function stampFooter(content) {
    const protocol = loadFullProtocolBlocks();
    if (!protocol) return content;
    return `${content.replace(/\s+$/, '')}\n\n${protocol}\n`;
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

// A curated prose callout: a line carrying a **bold** span (e.g. "**Platform (Windows):** …").
// These are hand-added annotations the data-driven builders do NOT reproduce; silently losing one
// on `--mode update` is the single drift no mirror verifier catches. Table/command/code lines have
// no standalone bold span, so this keys on genuine callouts only — low noise, high signal.
const CURATED_CALLOUT = /\*\*[^*\n]+\*\*/;

// Normalize markdown backslash-escapes before the drop comparison. The committed CLAUDE.md is
// prettier-managed, so prettier escapes characters with markdown meaning (`_SharedCommon` →
// `\_SharedCommon`, `*` → `\*`). The data-driven builders emit the raw, unescaped form, so a
// byte-literal `includes` would report a curated line as "dropped" when only the escaping differs
// and the content is in fact reproduced. Stripping `\` before a punctuation char on BOTH sides
// makes the comparison escape-insensitive — eliminating that false positive while still catching
// genuinely dropped callouts.
function normalizeMdEscapes(s) {
    return s.replace(/\\([\\`*_{}\[\]()#+\-.!~|<>])/g, '$1');
}

// `--mode update` REPLACES each managed section's body with its builder output, discarding whatever
// was there. updateMarkedSections surfaces (advisory, never throws) any curated callout that lived
// in the old body but is absent from the new builder output — converting the silent content-loss
// that dropped the Windows/Design notes this session into a visible WARN that names the durable home.
function updateMarkedSections(existing, sections, onWarn = msg => console.warn(msg)) {
    const lines = existing.split('\n');
    const output = [];
    let inSection = false;
    let currentKey = null;
    let oldBody = [];

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
            oldBody = [];
            continue;
        }

        if (closeMatch) {
            if (currentKey && sections[currentKey]) {
                const newContent = sections[currentKey];
                const newNormalized = normalizeMdEscapes(newContent);
                const dropped = oldBody
                    .map(l => l.trim())
                    .filter(l => CURATED_CALLOUT.test(l) && !newContent.includes(l) && !newNormalized.includes(normalizeMdEscapes(l)));
                if (dropped.length > 0) {
                    onWarn(
                        `[WARN] SECTION:${currentKey} — --mode update dropped ${dropped.length} curated callout line(s) ` +
                            `the builder does not reproduce:\n` +
                            dropped.map(l => `    - ${l}`).join('\n') +
                            `\n  If intentional, ignore. Otherwise move the content into docs/project-config.json ` +
                            `(config-sourced) or the claude-md template static prose so regeneration preserves it.`
                    );
                }
            }
            output.push(line); // keep close marker
            inSection = false;
            currentKey = null;
            oldBody = [];
            continue;
        }

        if (!inSection) {
            output.push(line);
        } else {
            oldBody.push(line); // buffer old body for the content-loss guard above
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

        fs.writeFileSync(CLAUDE_MD_PATH, stampFooter(stampHeader(finalOutput)), 'utf-8');
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

        fs.writeFileSync(CLAUDE_MD_PATH, stampFooter(stampHeader(output)), 'utf-8');
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

// Run only as a CLI. Importing the module (e.g. the content-loss-guard unit test) must NOT
// trigger a real CLAUDE.md regeneration off the test runner's argv.
if (require.main === module) {
    main();
}

module.exports = { updateMarkedSections, SECTION_OPEN, SECTION_CLOSE, CURATED_CALLOUT };
