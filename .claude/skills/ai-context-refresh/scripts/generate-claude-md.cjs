#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const builders = require('./section-builders.cjs');
let resolveMutationProjectRoot;
try {
    ({ resolveMutationProjectRoot } = require('../../../scripts/lib/project-root.cjs'));
} catch {
    // The content-guard and bootstrap paths intentionally support a compact
    // copied skill.  If the optional shared resolver is not present, retain the
    // explicit consuming directory or the invocation cwd without weakening the
    // generator's required-source checks below.
    resolveMutationProjectRoot = ({ cwd = process.cwd(), env = process.env } = {}) => {
        const explicit = env?.CLAUDE_PROJECT_DIR;
        if (explicit !== undefined && explicit !== null && String(explicit).trim() !== '') {
            if (!path.isAbsolute(String(explicit).trim())) {
                throw new Error('CLAUDE_PROJECT_DIR must be an absolute path');
            }
            const rootDir = path.resolve(String(explicit).trim());
            let exists = false;
            try { exists = fs.statSync(rootDir).isDirectory(); } catch {}
            if (!exists) throw new Error('CLAUDE_PROJECT_DIR must name an existing directory');
            return { rootDir, source: 'env-fallback' };
        }
        return { rootDir: path.resolve(cwd), source: 'cwd-fallback' };
    };
}

const PROJECT_DIR = resolveMutationProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env: process.env, allowUnmarkedRoot: true }).rootDir;
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
// Managed blocks of older generated roots. The universal hook delivers what they carried (the workflow
// route, the critical-thinking and AI-mistake protocols, the project overlays), so the generator
// strips them from an existing root and never writes one. `SKILLS_BLOCK_RE` also matches the
// prettier fences older roots wrapped around the catalog block.
const GATE_BLOCK_RE = /<!-- CK:WORKFLOW-GATE -->[\s\S]*?<!-- \/CK:WORKFLOW-GATE -->/g;
const ROUTE_POINTER_BLOCK_RE = /<!-- CK:WORKFLOW-ROUTE-POINTER -->[\s\S]*?<!-- \/CK:WORKFLOW-ROUTE-POINTER -->/g;
const SKILLS_BLOCK_RE = /(?:<!-- prettier-ignore-start -->\s*)?<!-- CK:WORKFLOW-SKILLS -->[\s\S]*?<!-- \/CK:WORKFLOW-SKILLS -->(?:\s*<!-- prettier-ignore-end -->)?/g;
const PROJECT_PROTOCOLS_BLOCK_RE = /<!-- CK:PROJECT-PROTOCOLS -->[\s\S]*?<!-- \/CK:PROJECT-PROTOCOLS -->/g;
const CK_AIMP_CLOSE = '<!-- /CK:AI-MISTAKE-PREVENTION -->';
const CK_CRIT_BLOCK_RE = /(?:<!-- prettier-ignore-start -->\s*)?<!-- CK:CRITICAL-THINKING -->[\s\S]*?<!-- \/CK:CRITICAL-THINKING -->(?:\s*<!-- prettier-ignore-end -->)?/g;
const CK_AIMP_BLOCK_RE = /(?:<!-- prettier-ignore-start -->\s*)?<!-- CK:AI-MISTAKE-PREVENTION -->[\s\S]*?<!-- \/CK:AI-MISTAKE-PREVENTION -->(?:\s*<!-- prettier-ignore-end -->)?/g;
// The completeness sentinel of older generated roots.
const LEGACY_SENTINEL_RE = /<!--\s*CK:UNIVERSAL-GUIDES\s+v\d+\s*-->/gi;

const SECTION_OPEN = /^<!-- SECTION:(\S+) -->$/;
const SECTION_CLOSE = /^<!-- \/SECTION:(\S+) -->$/;

/**
 * Strip the managed blocks older generated roots carried (route pointer, workflow gate, skills
 * catalog, the two protocol blocks, the project-protocol block) and the completeness sentinel.
 * The generator writes none of them: the project root holds project information only.
 */
function cleanLegacyManagedBlocks(content) {
    let text = removeManagedRoutingSection(migrateLegacyRouting(content.replace(/^\uFEFF/, '')));
    const hadManagedFooter = text.trimEnd().endsWith(CK_AIMP_CLOSE);
    // Global regexes cover a block stamped at both ends of the file. The leading-newline strip is
    // CRLF-aware: a `\r\n\r\n\r\n` run has no consecutive `\n`, so an LF-only pattern would leave the
    // blank gap a stripped block left behind.
    text = text
        .replace(LEGACY_SENTINEL_RE, '')
        .replace(GATE_BLOCK_RE, '')
        .replace(ROUTE_POINTER_BLOCK_RE, '')
        .replace(SKILLS_BLOCK_RE, '')
        .replace(PROJECT_PROTOCOLS_BLOCK_RE, '')
        .replace(CK_CRIT_BLOCK_RE, '')
        .replace(CK_AIMP_BLOCK_RE, '')
        .replace(/^(?:\r?\n)+/, '');
    // The former full-framework footer was generated after trimming EOF whitespace, so removing
    // that footer may safely collapse only the separator it owned. Other roots' trailing spaces and
    // newlines are user-owned and stay byte-for-byte.
    if (hadManagedFooter) text = text.replace(/\s+$/, '');
    return text;
}

/**
 * Normalize EOF only: the generator owns no closing block.
 */
function stampFooter(content) {
    return content.endsWith('\n') ? content : `${content}\n`;
}

// Known generated routing paragraphs. Project-authored prose under the same heading is preserved.
const ROUTING_BODY_TEMPLATE =
    'Apply the single CK:WORKFLOW-GATE above. A skill named as a noun is not an invocation; ' +
    'explicit execution requests win. Mixed research/modification intent follows the modification route. ' +
    'Route choice grants no operation authority.';
const ROUTING_BODY_MIGRATED =
    'Apply the single CK:WORKFLOW-GATE above; route choice grants no operation authority.';
const ROUTING_BODY_DISABLED =
    'Workflow auto-detect is OFF for this project (`portability.workflowAutoDetect: false`), so this file ' +
    'carries no routing gate and no workflow catalog. Do not infer a workflow or skill route from the ' +
    'prompt and do not go looking for a catalog to route against — execute the request directly. Run a ' +
    'workflow or skill only when the user names one explicitly. This changes route SELECTION only: every ' +
    'quality gate, task-planning rule, evidence obligation and confirmation gate in this file still binds, ' +
    'and routing grants no operation authority.';
const MANAGED_ROUTING_BODIES = [ROUTING_BODY_TEMPLATE, ROUTING_BODY_MIGRATED, ROUTING_BODY_DISABLED];
const FIRST_ACTION_HEADING_RE = /^##[ \t]+First Action Decision.*$/m;

/**
 * Remove only the known generated routing paragraph. If no project-authored content remains,
 * remove the now-empty heading and its optional separator too.
 */
function removeManagedRoutingSection(content) {
    const heading = content.match(FIRST_ACTION_HEADING_RE);
    if (!heading) return content;
    const bodyStart = content.indexOf(heading[0]) + heading[0].length;
    const rest = content.slice(bodyStart);
    const nextHeading = rest.search(/^##[ \t]+/m);
    const bodyRaw = nextHeading === -1 ? rest : rest.slice(0, nextHeading);

    const paragraphs = bodyRaw.split(/(\r?\n[ \t]*\r?\n)/);
    const managedAt = paragraphs.findIndex(part => MANAGED_ROUTING_BODIES.includes(part.trim()));
    if (managedAt === -1) return content;
    paragraphs.splice(managedAt, 1);
    const remaining = paragraphs.join('').replace(/^\s*---\s*$/m, '').trim();
    const tail = content.slice(bodyStart + bodyRaw.length);
    if (!remaining) return `${content.slice(0, heading.index)}${tail.replace(/^(?:\r?\n)+/, '')}`;
    return `${content.slice(0, bodyStart)}\n\n${remaining}\n\n${tail.replace(/^(?:\r?\n)+/, '')}`;
}

// Exact known generated prose only. Unknown edits to this unmarked area remain
// user-owned; never infer ownership from a heading or a loose routing keyword.
function migrateLegacyRouting(content) {
    const legacy = [
        '1. Explicit slash command (e.g. `/plan`, `/feature-implement`) → execute it.',
        '2. Workflow Catalog has a matching workflow → ask via `ask user question tool` whether to activate the workflow or run the underlying skill directly.',
        '3. No matching workflow AND prompt would modify files → MUST invoke `/plan <prompt>` first.',
        '4. No matching workflow AND prompt is read-only/conversational → answer directly.'
    ];
    for (const eol of ['\r\n', '\n']) {
        const heading = `## First Action Decision (before any tool call)${eol}${eol}`;
        content = content.replace(heading + legacy.join(eol),
            heading + 'Apply the single CK:WORKFLOW-GATE above; route choice grants no operation authority.');
    }
    return content;
}

// Sections and callouts older roots carried and a generated root no longer holds: the universal hook
// delivers their rules now, except the Git section, whose rules live in the development rules doc. The strip
// removes an H2 section with its body (an H2 section runs to the next H2 heading or the end of the
// file); generated SECTION regions inside one and the kept H3 subsections survive, and so does
// every other line. It runs only on request (`--strip-legacy-universal`) because the prose is
// hand-editable: update mode names what remains instead.
const LEGACY_UNIVERSAL_HEADINGS = [
    /^## Project Reference Loading\b/,
    /^## Task Planning Rules\b/,
    /^## Generated Artifact Storage\b/,
    /^## Workflow Step Advancement/,
    /^## Search Existing Code First\b/,
    /^## Code Responsibility Hierarchy\b/,
    /^## Evidence-Based Reasoning/,
    /^## Graph Intelligence\b/,
    /^## Git & Version-Control Discipline\b/,
    /^## Canonical Ownership\b/,
    /^## Project Protocol Overlays\b/,
    /^## Design Gate\b/,
    /^## AI-Engineering Gate\b/,
    /^## Continuous Improvement/,
    /^## First Action Decision\b/,
    /^## Common AI Mistake Prevention\b/,
    /^## Critical Thinking Mindset\b/,
    /^## Closing Reminders\b/
];
const LEGACY_KEPT_SUBSECTIONS = [/^### Path → Reference Doc\b/];
const LEGACY_CALLOUT_LEAD = /^> \*\*\[(?:WORKFLOW-GATE|PROJECT-PROTOCOL-OVERLAY|ROOT-CAUSE-FIX|DESIGN-GATE|AI-ENGINEERING-GATE|CRITICAL-THINKING-MINDSET)\]/;
// One-line paragraph of older roots (the first principles the discovery protocol carries now).
const LEGACY_PARAGRAPH_LEAD = /^\*\*First Principles:\*\*/;

function legacyHeadingOf(line) {
    return LEGACY_UNIVERSAL_HEADINGS.some(re => re.test(line)) ? line.trim() : null;
}

/** Legacy universal H2 headings and callouts still present in a root (report only). */
function findLegacyUniversalContent(content) {
    const found = [];
    let inFence = false;
    for (const raw of content.split('\n')) {
        const line = raw.replace(/\r$/, '');
        const trimmed = line.trim();
        if (SECTION_OPEN.test(trimmed)) inFence = true;
        else if (SECTION_CLOSE.test(trimmed)) inFence = false;
        if (inFence) continue;
        const heading = legacyHeadingOf(line);
        if (heading) found.push(heading);
        else if (LEGACY_CALLOUT_LEAD.test(line) || LEGACY_PARAGRAPH_LEAD.test(line)) found.push(line.slice(0, 60).trim());
    }
    return found;
}

/**
 * Remove the legacy universal sections and callouts from a root.
 * @returns {{text: string, removed: string[]}}
 */
function stripLegacyUniversalContent(content) {
    const eol = content.includes('\r\n') ? '\r\n' : '\n';
    const lines = content.split(/\r?\n/);
    const out = [];
    const removed = [];
    let inFence = false;
    let dropping = false;
    let keepingSub = false;
    let inCallout = false;
    // A removal never changes user whitespace elsewhere: only the blank run that removal itself leaves
    // behind (a blank before it plus a blank after it) collapses to one blank line.
    let afterRemoval = false;
    const keep = line => {
        if (afterRemoval && line.trim() === '' && out.length && out[out.length - 1].trim() === '') return;
        afterRemoval = false;
        out.push(line);
    };
    const drop = label => {
        if (label) removed.push(label);
        afterRemoval = true;
    };
    for (const line of lines) {
        const trimmed = line.trim();
        if (SECTION_OPEN.test(trimmed)) {
            inFence = true;
            dropping = false;
            inCallout = false;
            keep(line);
            continue;
        }
        if (SECTION_CLOSE.test(trimmed)) {
            inFence = false;
            keep(line);
            continue;
        }
        if (inFence) {
            keep(line);
            continue;
        }
        if (/^## /.test(line)) {
            inCallout = false;
            keepingSub = false;
            const heading = legacyHeadingOf(line);
            dropping = heading !== null;
            if (dropping) {
                drop(heading);
                continue;
            }
        } else if (dropping && /^### /.test(line)) {
            keepingSub = LEGACY_KEPT_SUBSECTIONS.some(re => re.test(line));
            if (!keepingSub) {
                drop();
                continue;
            }
        }
        if (dropping && !keepingSub) {
            drop();
            continue;
        }
        if (LEGACY_PARAGRAPH_LEAD.test(line)) {
            drop(line.slice(0, 60).trim());
            continue;
        }
        if (LEGACY_CALLOUT_LEAD.test(line)) {
            inCallout = true;
            drop(line.slice(0, 60).trim());
            continue;
        }
        if (inCallout) {
            if (/^>/.test(line)) {
                drop();
                continue;
            }
            inCallout = false;
        }
        keep(line);
    }
    return { text: out.join(eol), removed };
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
    'golden-rules': c => builders.buildProjectContextMap(c),
    'decision-quick-ref': c => builders.buildDecisionQuickRef(c),
    'key-locations': c => builders.buildKeyLocations(c),
    'dev-commands': c => builders.buildDevCommands(c),
    'infra-ports': c => builders.buildInfraPorts(c),
    'api-ports': c => builders.buildApiPorts(c),
    'integration-testing': c => builders.buildIntegrationTesting(c),
    'e2e-testing': c => builders.buildE2eTesting(c),
    'skill-activation': () => null,
    'doc-index': (c, d) => builders.buildDocIndex(c, d),
    'doc-lookup': (c, d) => builders.buildDocLookup(c, d)
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
    // Match on the TRIMMED line — CLAUDE.md is often CRLF, so a raw line ends in "\r"
    // and SECTION_OPEN's `$` anchor would fail (the marker "looks" absent), misrouting
    // detectMode() to smart-merge and silently skipping the back-fill guard on Windows.
    return content.split('\n').some(l => SECTION_OPEN.test(l.trim()));
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
    reportInlinePathRules(config);
    return sections;
}

// `portability.inlinePathRules: false` is a request, not a guarantee: without hook delivery the
// builder keeps the rules inline so none is lost. Say so, naming the missing precondition.
function reportInlinePathRules(config) {
    const delivery = builders.pathRulesDelivery(config, PROJECT_DIR);
    if (delivery.requested && !delivery.compact && delivery.reason) {
        console.warn(`[WARN] INLINE_PATH_RULES: portability.inlinePathRules is false but ${delivery.reason}; ` +
            'SECTION:golden-rules keeps the path rules inline.');
    }
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
    const hasBuilder = key => Object.prototype.hasOwnProperty.call(sections, key)
        && typeof sections[key] === 'string' && sections[key].length > 0;
    const lines = existing.split('\n');
    let openKey = null;
    for (const line of lines) {
        const open = line.trim().match(SECTION_OPEN);
        const close = line.trim().match(SECTION_CLOSE);
        if (open) {
            if (openKey) throw new Error(`Nested SECTION:${open[1]}; preserve existing root and repair markers first`);
            openKey = open[1];
        }
        if (close) {
            if (openKey !== close[1]) throw new Error(`Unmatched SECTION:${close[1]}; preserve existing root and repair markers first`);
            openKey = null;
        }
    }
    if (openKey) throw new Error(`Unclosed SECTION:${openKey}; preserve existing root and repair markers first`);

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
            if (hasBuilder(currentKey)) {
                output.push('');
                output.push(sections[currentKey]);
                output.push('');
            }
            inSection = true;
            oldBody = [];
            continue;
        }

        if (closeMatch) {
            if (currentKey && hasBuilder(currentKey)) {
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
                            `(config-sourced) or the AI-context template static prose so regeneration preserves it.`
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
            if (!hasBuilder(currentKey)) output.push(line); // no builder owns this body
        }
        // Skip old content inside sections — replaced above
    }

    return output.join('\n');
}

// E2E is an optional, config-sourced section that may be enabled after a project already has
// marker-managed CLAUDE.md. Unlike the universal guides, it is intentionally not back-filled into
// every project: insert it only when the builder has verified E2E evidence/profile data. This keeps
// an existing root's unmanaged prose intact while making `--mode update` effective for newly added
// E2E configuration. The init template carries the same marker for fresh roots.
function backfillGeneratedE2eSection(content, sections) {
    const e2e = sections['e2e-testing'];
    if (!e2e || content.split('\n').some(line => line.trim() === '<!-- SECTION:e2e-testing -->')) return content;

    const block = `<!-- SECTION:e2e-testing -->\n\n${e2e}\n\n<!-- /SECTION:e2e-testing -->`;
    // Keep the generated section near the other generated setup sections. Prefer the template's
    // stable location, then degrade safely for older roots that lack one of those markers.
    const anchors = [
        '<!-- /SECTION:dev-commands -->',
        '<!-- /SECTION:integration-testing -->',
        '<!-- /SECTION:tldr -->'
    ];
    for (const anchor of anchors) {
        const at = content.indexOf(anchor);
        if (at === -1) continue;
        const end = at + anchor.length;
        return `${content.slice(0, end)}\n\n${block}${content.slice(end)}`;
    }

    const firstHeading = content.search(/^##\s+/m);
    if (firstHeading !== -1) {
        return `${content.slice(0, firstHeading).replace(/\s+$/, '')}\n\n${block}\n\n${content.slice(firstHeading)}`;
    }
    return `${content.replace(/\s+$/, '')}\n\n${block}\n`;
}

// The template gives doc-lookup its own heading so the Codex projection (sync-context-workflows.mjs
// AGENTS_PROJECTION_HEADINGS) can carry it. Roots initialized before that heading hold the marker
// headless (often at EOF), and `updateMarkedSections` rewrites bodies in place only — so without this
// back-fill no existing adopter's AGENTS.md would ever receive the table. A heading already naming
// "doc lookup" (the smart-merge alias) is normalized; any other preceding line gets the heading inserted.
const DOC_LOOKUP_HEADING = '## Doc Lookup — What to Read When';

function backfillDocLookupHeading(content) {
    const eol = content.includes('\r\n') ? '\r\n' : '\n';
    const lines = content.split(/\r?\n/);
    const at = lines.findIndex(line => line.trim() === '<!-- SECTION:doc-lookup -->');
    if (at === -1) return content;
    let prev = at - 1;
    while (prev >= 0 && lines[prev].trim() === '') prev--;
    const previous = prev >= 0 ? lines[prev].trim() : '';
    if (previous === DOC_LOOKUP_HEADING) return content;
    if (/^##\s+.*doc lookup/i.test(previous)) {
        lines[prev] = DOC_LOOKUP_HEADING;
    } else {
        lines.splice(at, 0, DOC_LOOKUP_HEADING, '');
    }
    return lines.join(eol);
}

/**
 * Render the exact marker-managed update without writing it. The sync runner uses this
 * function through `--check` to decide whether CLAUDE.md needs an update before it writes
 * any Codex mirror. Keeping the check and update paths on one renderer prevents a dry-run
 * from approving bytes that the real update would not produce.
 *
 * @param {string} existing
 * @param {Record<string, string>} sections
 * @param {{ report?: boolean, stripLegacy?: boolean }} options
 * @returns {string}
 */
function buildUpdateOutput(existing, sections, { report = true, stripLegacy = false } = {}) {
    let output = updateMarkedSections(existing, sections, report ? undefined : () => {});
    if (!sections['golden-rules']) {
        output = output.replace(/^[ \t]*<!-- SECTION:golden-rules -->[\s\S]*?^[ \t]*<!-- \/SECTION:golden-rules -->[ \t]*\r?\n?/gm, '');
    }
    // Retire this owned section explicitly: a null builder normally preserves an
    // old section to protect custom data, but skill policy no longer belongs in roots.
    output = output.replace(/^[ \t]*<!-- SECTION:skill-activation -->[\s\S]*?^[ \t]*<!-- \/SECTION:skill-activation -->[ \t]*\r?\n?/gm, '');
    output = output.replace(/^## Automatic Skill Activation[ \t]*\r?\n(?:[ \t]*\r?\n)*(?=## |$)/gm, '');
    output = output.replace('This file holds project information only. The framework rules every agent follows are delivered by hooks, not written here.', '');

    const withE2e = backfillGeneratedE2eSection(output, sections);
    if (withE2e !== output) {
        output = withE2e;
        if (report) console.log('[OK] Back-filled generated E2E section from project configuration');
    }

    const withDocLookupHeading = backfillDocLookupHeading(output);
    if (withDocLookupHeading !== output) {
        output = withDocLookupHeading;
        if (report) console.log(`[OK] Back-filled "${DOC_LOOKUP_HEADING}" heading for the Codex projection`);
    }

    output = cleanLegacyManagedBlocks(output);
    if (stripLegacy) {
        const stripped = stripLegacyUniversalContent(output);
        output = stripped.text;
        if (report && stripped.removed.length) {
            console.log(`[OK] Removed ${stripped.removed.length} legacy universal section(s) a generated root no longer carries: ${stripped.removed.join(' | ')}`);
        }
    } else if (report) {
        const legacy = findLegacyUniversalContent(output);
        if (legacy.length) {
            console.warn(`[WARN] LEGACY_UNIVERSAL_CONTENT: ${legacy.length} section(s) a generated root no longer carries are still in this root: ${legacy.join(' | ')}. Run --mode update --strip-legacy-universal to remove them (a backup is written first).`);
        }
    }

    return stampFooter(output);
}

/**
 * Read-only state probe for the portable sync coordinator.
 *
 * Exit meanings are intentionally distinct from ordinary failures:
 *   0  current (a markerless root is project-owned: nothing is generated into it)
 *   10 missing — init required
 *   11 marker-managed and stale — update required
 */
function checkClaudeMd() {
    if (!fs.existsSync(CLAUDE_MD_PATH)) {
        console.log('[CHECK] CLAUDE.md missing (init required)');
        return 10;
    }

    const existing = fs.readFileSync(CLAUDE_MD_PATH, 'utf-8');
    const config = loadConfig();
    if (!hasMarkers(existing)) {
        console.log('[CHECK] CLAUDE.md is markerless: a project-owned root with no generated sections (run /ai-context-refresh to add them)');
        return 0;
    }

    const expected = buildUpdateOutput(existing, buildSections(config), { report: false });
    // Line endings are formatting, not a managed-content signal. The real update path preserves
    // user-owned mixed/legacy line endings around generated content, so the probe compares the
    // same rendered bytes after normalizing only CRLF-vs-LF representation.
    const normalizeLineEndings = value => value.replace(/\r\n/g, '\n');
    if (normalizeLineEndings(expected) === normalizeLineEndings(existing)) {
        console.log('[CHECK] CLAUDE.md is current');
        return 0;
    }
    console.log('[CHECK] CLAUDE.md requires marker-managed update');
    return 11;
}

function parseBackupPath(args) {
    let destination = null;
    for (let i = 0; i < args.length; i++) {
        if (args[i] !== '--backup-path' && !args[i].startsWith('--backup-path=')) continue;
        if (destination !== null) throw new Error('Duplicate --backup-path option');
        const value = args[i] === '--backup-path' ? args[++i] : args[i].slice('--backup-path='.length);
        if (!value || value.startsWith('--') || !path.isAbsolute(value) || /[\x00-\x1f]/.test(value)) {
            throw new Error('--backup-path requires a valid absolute file path');
        }
        // Resolve the existing parent to reject aliases of protected default/root paths.
        // No directory is created: an unavailable parent is an invalid destination.
        const parent = fs.realpathSync(path.dirname(value));
        destination = path.join(parent, path.basename(value));
        const projectReal = fs.realpathSync(PROJECT_DIR);
        const comparable = p => process.platform === 'win32' ? p.toLowerCase() : p;
        if (['CLAUDE.md', '.claude-md.backup'].some(name =>
            comparable(destination) === comparable(path.join(projectReal, name)))) {
            throw new Error('--backup-path must be separate from CLAUDE.md and the legacy default backup');
        }
    }
    return destination;
}

function createBackup(explicitPath = null) {
    if (explicitPath !== null) {
        // COPYFILE_EXCL atomically refuses occupied files, directories and symlinks.
        // The pre-write root is required; a failure never reaches the root writer.
        fs.copyFileSync(CLAUDE_MD_PATH, explicitPath, fs.constants.COPYFILE_EXCL);
        console.log(`[OK] Owned backup created: ${explicitPath}`);
        return;
    }
    if (fs.existsSync(CLAUDE_MD_PATH)) {
        fs.copyFileSync(CLAUDE_MD_PATH, BACKUP_PATH);
        console.log(`[OK] Backup created: ${path.basename(BACKUP_PATH)}`);
    }
}

// Whole-root size includes preserved user prose. Report overflow, never truncate it
// or force an init rewrite; host adapters own their separate managed-byte budgets.
function reportRootSize(output) {
    const bytes = Buffer.byteLength(output, 'utf8');
    if (bytes > 32768) {
        console.warn(`[WARN] ROOT_OVERFLOW: ${bytes} bytes exceeds 32768-byte host reference budget; ` +
            'full content preserved without truncation. Verify the host managed projection before use.');
    }
}

function main() {
    const args = process.argv.slice(2);
    const backupPath = parseBackupPath(args);
    const modeIndex = args.indexOf('--mode');
    const modeFlag = args.find(a => a.startsWith('--mode='))?.slice('--mode='.length) ||
        (modeIndex >= 0 ? args[modeIndex + 1] : undefined);
    const isDetect = args.includes('--detect');

    if (isDetect) {
        const detected = detectMode();
        console.log(`[DETECT] Mode: ${detected}`);
        console.log(`[DETECT] CLAUDE.md: ${fs.existsSync(CLAUDE_MD_PATH) ? 'EXISTS' : 'MISSING'}`);
        console.log(`[DETECT] project-config.json: ${fs.existsSync(CONFIG_PATH) ? 'EXISTS' : 'MISSING'}`);
        process.exit(0);
    }

    if (args.includes('--check')) {
        process.exitCode = checkClaudeMd();
        return;
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
        const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
        const output = populateTemplate(template, sections);

        // Replace top-level placeholders
        const projectName = config.project?.name || 'Project';
        const finalOutput = output.replace(/\{project-name\}/g, projectName).replace(/\{project-description\}/g, config.project?.description || '');

        const stamped = stampFooter(finalOutput);
        reportRootSize(stamped);
        createBackup(backupPath);
        fs.writeFileSync(CLAUDE_MD_PATH, stamped, 'utf-8');
        console.log(`[OK] CLAUDE.md created (init mode)`);
    } else if (mode === 'update') {
        if (!fs.existsSync(CLAUDE_MD_PATH)) {
            console.error('[ERROR] CLAUDE.md not found. Use --mode init first.');
            process.exit(1);
        }
        const existing = fs.readFileSync(CLAUDE_MD_PATH, 'utf-8');
        const stamped = buildUpdateOutput(existing, sections, { stripLegacy: args.includes('--strip-legacy-universal') });
        reportRootSize(stamped);
        createBackup(backupPath);
        fs.writeFileSync(CLAUDE_MD_PATH, stamped, 'utf-8');
        console.log(`[OK] CLAUDE.md updated (${generated.length} sections synced)`);
    } else if (mode === 'smart-merge') {
        console.log('[INFO] Smart-merge: CLAUDE.md has no markers. AI should handle migration.');
        console.log('[INFO] Run /ai-context-refresh in update mode after AI adds markers.');
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
    try {
        main();
    } catch (err) {
        console.error(`[ERROR] ${err.message}`);
        process.exitCode = 1;
    }
}

module.exports = {
    updateMarkedSections,
    buildUpdateOutput,
    backfillDocLookupHeading,
    DOC_LOOKUP_HEADING,
    checkClaudeMd,
    SECTION_OPEN,
    SECTION_CLOSE,
    CURATED_CALLOUT,
    cleanLegacyManagedBlocks,
    stripLegacyUniversalContent,
    findLegacyUniversalContent,
    removeManagedRoutingSection,
    ROUTING_BODY_TEMPLATE,
    ROUTING_BODY_MIGRATED,
    ROUTING_BODY_DISABLED,
};
