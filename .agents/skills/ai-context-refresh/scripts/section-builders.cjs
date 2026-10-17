#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Section builders — convert project-config.json data to markdown sections.
 * Each function returns a string (markdown content) or null (skip section).
 */

// Relocatable roots resolve through the portability accessors so the Claude runtime and the Codex
// mirror generator cannot disagree about where a project's docs and specs live. The require is
// OPTIONAL for the same reason generate-claude-md.cjs:31-37 makes its loader require optional — the
// content-guard and bootstrap paths run a compact copied skill that carries no hooks/lib. When the
// accessors are unavailable the builders degrade to the documented defaults, i.e. exactly the
// literal roots this file used before.
const PORTABILITY = (() => {
    try {
        const loader = require('../../../hooks/lib/project-config-loader.cjs');
        const paths = require('../../../hooks/lib/ck-path-utils.cjs');
        if (typeof loader.getDocsRoot !== 'function' || typeof loader.getSpecDocsPath !== 'function') return null;
        return {
            getDocsRoot: loader.getDocsRoot,
            getSpecDocsPath: loader.getSpecDocsPath,
            getConfiguredProjectConfigPath: loader.getConfiguredProjectConfigPath,
            normalizeRootPath: paths.normalizeRootPath,
            escapesRepoRoot: paths.escapesRepoRoot,
            joinRoot: paths.joinRoot
        };
    } catch {
        return null;
    }
})();

// Documented defaults, duplicated here ONLY as the degraded-mode answer. Resolution itself is never
// reimplemented — it lives in project-config-loader.cjs PORTABILITY_TOKENS.
const DEFAULT_DOCS_TREE = 'docs';
const DEFAULT_REF_DOCS_ROOT = 'docs/project-reference';
const DEFAULT_SPEC_ROOT = 'docs/specs';
const DEFAULT_ADR_ROOT = 'docs/adr';
const DEFAULT_PROJECT_CONFIG = 'docs/project-config.json';

/** Canonical reference-doc filenames the doc-lookup table always routes to. */
const REFERENCE_DOC_ROWS = [
    ['Spec paths, TC format, canonical vs derived spec artifacts', 'spec-system-reference.md'],
    ['Spec quality, AI-implementability, tech-agnostic prose', 'spec-principles.md'],
    ['Behavior or public contract changes, spec-test-code sync', 'workflow-spec-test-code-cycle-reference.md']
];

// Reference docs the doc-lookup table already routes by fixed rows; the `referenceDocs[]` pass skips them.
const FIXED_ROUTE_DOCS = new Set([
    'docs-index-reference.md',
    'lessons.md',
    'feature-spec-reference.md',
    ...REFERENCE_DOC_ROWS.map(([, file]) => file)
]);

/**
 * When-to-read triggers for the framework-owned reference docs (the SCAN_SKILL_MAP docs in
 * project-reference-registry.cjs plus the custom-prompts and skill-protocols indexes that
 * session-init-helpers.cjs REFERENCE_DOC_CATALOG seeds). The trigger says WHEN to open a doc;
 * the project's own `referenceDocs[].purpose` says WHAT it holds. A custom doc has no
 * trigger here and is routed by its purpose alone.
 */
const REFERENCE_DOC_TRIGGERS = Object.freeze({
    'project-structure-reference.md': 'Where code lives, modules, stack, setup — before planning or investigating',
    'domain-entities-reference.md': 'Domain concepts, entities, relationships, data ownership — before planning or design',
    'code-review-rules.md': 'Before editing or reviewing code — rules, anti-patterns, checklists',
    'backend-patterns-reference.md': 'Backend code — services, APIs, data access, validation, messaging',
    'frontend-patterns-reference.md': 'Frontend code — components, state, API calls',
    'scss-styling-guide.md': 'Style files — styling conventions, theming, responsive rules',
    'design-system/README.md': 'UI design — tokens, components, app-to-doc map',
    'integration-test-reference.md': 'Writing, fixing, or reviewing integration tests',
    'performance-test-reference.md': 'Planning, writing, running, fixing, or reviewing performance / load / capacity tests',
    'e2e-test-reference.md': 'Writing, running, or reviewing E2E / user-flow tests',
    'seed-test-data-reference.md': 'Seeding or reviewing development/test data',
    'custom-prompts-reference.md': 'A saved project prompt, playbook, or runbook may apply (`/custom-prompt`)',
    'skill-protocols-reference.md': 'Before running any skill — project overlays layered on it'
});

// A purpose that OPENS with, or parenthesizes, an N/A marker ("N/A — …", "Backend patterns (N/A for …)").
// Anchored so ordinary prose ("mocks are not applicable here") never hides a real doc.
const NOT_APPLICABLE_PURPOSE = /^\s*(?:N\/A|not applicable)\b|\(\s*(?:N\/A|not applicable)\b/i;

/** True when a `referenceDocs[]` entry declares its doc N/A: explicit `notApplicable: true`, or an N/A purpose marker. */
function declaresNotApplicable(doc) {
    return doc?.notApplicable === true || NOT_APPLICABLE_PURPOSE.test(String(doc?.purpose || ''));
}

/** True when `docPath` is a selected reference doc the project declares N/A. Such a doc is named once, never routed. */
function isDeclaredNotApplicable(config, docPath) {
    const referenceRoot = referenceDocsRoot(config);
    return (Array.isArray(config?.referenceDocs) ? config.referenceDocs : []).some(doc =>
        typeof doc?.filename === 'string' && docPath === underRoot(referenceRoot, doc.filename.trim()) &&
        declaresNotApplicable(doc));
}

/** Slash-free `docsRoots.projectReference` root; default `docs/project-reference`. */
function referenceDocsRoot(config) {
    if (!PORTABILITY) return DEFAULT_REF_DOCS_ROOT;
    return PORTABILITY.normalizeRootPath(PORTABILITY.getDocsRoot('projectReference', config || {})) || DEFAULT_REF_DOCS_ROOT;
}

/**
 * Slash-free business spec root; default `docs/specs`.
 *
 * `getSpecDocsPath()` GUARANTEES a trailing slash while the `{SPEC_ROOT}` token resolves slash-free
 * (`project-config-loader.cjs:110-113,169-181`) — the two forms are NOT interchangeable. Every use
 * below CONSTRUCTS a path, so the accessor's slash is trimmed once here and each construction site
 * supplies its own separator.
 */
function specRootPath(config) {
    if (!PORTABILITY) return DEFAULT_SPEC_ROOT;
    return PORTABILITY.normalizeRootPath(PORTABILITY.getSpecDocsPath(config || {})) || DEFAULT_SPEC_ROOT;
}

/** Join a resolved root with segments; a trailing `''` segment requests a trailing slash. */
function underRoot(root, ...segments) {
    if (PORTABILITY) return PORTABILITY.joinRoot(root, ...segments);
    const wantsSlash = segments.length > 0 && segments[segments.length - 1] === '';
    const joined = [root, ...segments.filter(Boolean)].join('/');
    return wantsSlash ? `${joined}/` : joined;
}

/**
 * Resolve the DOCS TREE that `buildDocIndex` scans — the parent of the configured project-reference
 * root, mirroring the one derivation rule already in `session-init-helpers.cjs:27-30`
 * (`DOCS_DIR = path.dirname(REFERENCE_DOCS_DIR)`).
 *
 * SINGLE-SEGMENT GUARD (mandatory, not defensive): `docsRoots.projectReference.path = "reference"`
 * is a legal config value whose `path.dirname` is `'.'` — the REPO ROOT. Scanning that would walk
 * `node_modules/`, `tmp/` and every sibling tree and emit the result into the generated CLAUDE.md.
 * When the parent degenerates to the repo root (or escapes it) the configured root ITSELF is the
 * docs tree, and `projectDir` is never walked.
 *
 * @returns {{root: string, dir: string}} repo-relative slash-free root + its absolute directory
 */
function resolveDocsTree(config, projectDir) {
    const asFallback = () => ({ root: DEFAULT_DOCS_TREE, dir: path.join(projectDir, DEFAULT_DOCS_TREE) });
    if (!PORTABILITY) return asFallback();
    const referenceRoot = PORTABILITY.normalizeRootPath(PORTABILITY.getDocsRoot('projectReference', config || {}));
    if (!referenceRoot || PORTABILITY.escapesRepoRoot(referenceRoot)) return asFallback();
    const parent = PORTABILITY.normalizeRootPath(path.posix.dirname(referenceRoot));
    const degenerate = !parent || parent === '.' || parent === '/' || PORTABILITY.escapesRepoRoot(parent);
    const root = degenerate ? referenceRoot : parent;
    return { root, dir: path.join(projectDir, ...root.split('/')) };
}

/** Visible stand-in for an unresolvable docs tree — keeps the section (and its markers) alive. */
function docsNoteBlock(reason) {
    return '```\n(doc-index unavailable) ' + reason + '\n```';
}

// A runtime backing-service (any datastore/cache/broker, e.g. a DB or message
// queue) is modeled as a kind:"infrastructure" module carrying a meta.port —
// exactly the set buildInfraPorts renders in its own ports table. These are
// runtime dependencies, NOT source-code modules, so they must NOT pollute the
// "Apps/Services" list (buildTldr) or the "Key File Locations" tree
// (buildKeyLocations). Infrastructure CODE modules (an orchestrator/IaC project)
// carry no meta.port and are kept — they ARE real source locations.
function isInfraBackingService(mod) {
    return mod?.kind === 'infrastructure' && mod?.meta?.port != null;
}

const REDACTED_CREDENTIAL = '[REDACTED — use a secret-manager reference]';
const SECRET_VALUE_PATTERN = /\b(?:password|passwd|passphrase|pwd?|pass|token|secret|api[\s_-]*key|private[\s_-]*key|client[\s_-]*secret|access[\s_-]*key|credential)\b["']?\s*[:=]/i;
const SECRET_URI_PATTERN = /^[a-z][a-z\d+.-]*:\/\/[^/\s:@]+:[^@\s]+@/i;
const PRIVATE_KEY_PATTERN = /-----BEGIN [^-]*PRIVATE KEY-----/i;
const TOKEN_PATTERN = /\b(?:sk|pk|ghp|github_pat|xox[baprs]-|AKIA)[A-Za-z0-9_-]{8,}\b/;

function renderCredentialReference(value) {
    if (value === undefined || value === null || value === '') return '—';
    // JSON text follows the same structural policy as config objects, including
    // escaped keys. Never serialize arbitrary fields in a credentials container.
    if (typeof value === 'string' && /^[\[{]/.test(value.trim())) {
        try { value = JSON.parse(value); } catch (_) { return REDACTED_CREDENTIAL; }
    }
    if (typeof value !== 'string') {
        if (!value || Array.isArray(value) || typeof value !== 'object' ||
            Object.keys(value).length !== 1 || !Object.hasOwn(value, 'reference') ||
            typeof value.reference !== 'string' ||
            !/^(?:vault|op):\/\/[^\s@?#]+$/i.test(value.reference)) return REDACTED_CREDENTIAL;
        value = value.reference;
    }
    const text = value.trim();
    if (!text) return '—';
    if (SECRET_VALUE_PATTERN.test(text) || SECRET_URI_PATTERN.test(text) ||
        PRIVATE_KEY_PATTERN.test(text) || TOKEN_PATTERN.test(text)) return REDACTED_CREDENTIAL;
    // Keep references readable in a table while preventing config text from
    // injecting rows or arbitrary Markdown into the generated root.
    return text.replace(/[|\r\n]/g, char => char === '|' ? '\\|' : ' ');
}

function buildTldr(config) {
    const name = config.project?.name || 'Project';
    const desc = config.project?.description || '';
    const langs = config.project?.languages?.join(', ') || '';
    const framework = config.framework?.name || '';
    const modules = config.modules || [];
    const apps = modules.filter(m => !isInfraBackingService(m)).map(m => m.name).join(', ');

    const techParts = [langs, framework].filter(Boolean).join(' + ');
    const lines = [
        `> **Project:** ${name}${desc ? ` — ${desc}` : ''}`,
        `>`,
        techParts ? `> **Tech Stack:** ${techParts}` : null,
        `>`,
        apps ? `> **Apps/Services:** ${apps}` : null
    ].filter(Boolean);

    return lines.join('\n');
}

const literal = value => `\`${String(value).replace(/`/g, '\\`')}\``;

function ruleBearingGroups(config) {
    return (config.contextGroups || []).filter(group =>
        group && Array.isArray(group.rules) && group.rules.some(rule => typeof rule === 'string' && rule.trim())
    );
}

/**
 * How `SECTION:golden-rules` delivers path-scoped rules. Invariant: path rules always reach the
 * agent — inline, or via the convention hook plus its `--lookup` CLI. Compact (names + pointer)
 * requires ALL of: `portability.inlinePathRules === false`, a usable conventions lib,
 * `conventionInjection.enabled === true`, every rule-bearing group deliverable by that lib
 * (a nameless or duplicate-named group is not), no rule-bearing group read-only (`on: read`; the
 * lookup prints only what a change delivers), and every rule-bearing group ranked within the
 * per-path class cap (`maxClassesPerEdit`), and a worst-case digest within `maxChars`. A path's
 * matches are a subset of the global order, so a global rank inside the cap can never be cut on
 * any path; a digest within the budget is never reduced, so no rule text is dropped. Any missing
 * precondition keeps the rules inline; `reason` names it so the generator can warn.
 * @returns {{ requested: boolean, compact: boolean, reason: string|null, conventions: object|null, entries: object[] }}
 */
function pathRulesDelivery(config, projectDir) {
    const requested = config.portability?.inlinePathRules === false;
    const groups = ruleBearingGroups(config);
    const inline = reason => ({ requested, compact: false, reason, conventions: null, entries: [] });
    if (!requested || groups.length === 0) return inline(null);
    const conventions = loadFileConventions(process.env, process.cwd(), projectDir);
    if (!conventions || typeof conventions.isEnabled !== 'function') return inline('the conventions lib (.claude/hooks/lib/file-conventions.cjs) is unavailable');
    if (!conventions.isEnabled(config)) return inline('conventionInjection.enabled is not true');
    const ordered = conventions.sortEntries(conventions.injectableEntries(config));
    const entries = ordered.filter(entry => entry.rules.length);
    const delivered = new Set(entries.map(entry => entry.group));
    const label = group => (typeof group.name === 'string' && group.name.trim() ? literal(group.name) : '(unnamed)');
    const undeliverable = groups.filter(group => !delivered.has(group));
    if (undeliverable.length) {
        return inline(`rule-bearing group(s) ${undeliverable.map(label).join(', ')} cannot be delivered by the hook (nameless or duplicate name)`);
    }
    // The complete CLI is the mandatory pre-action carrier, not the bounded PostToolUse digest.
    // Older standalone library copies lack this capability and retain the conservative inline guard.
    if (config.conventionInjection?.completeLookup === true && conventions.COMPLETE_LOOKUP_VERSION === 1 && typeof conventions.lookupComplete === 'function') {
        return { requested, compact: true, reason: null, conventions, entries, completeLookup: true };
    }
    const readOnly = entries.filter(entry => entry.on === (conventions.TRIGGER_READ || 'read'));
    if (readOnly.length) {
        return inline(`rule-bearing group(s) ${readOnly.map(entry => literal(entry.name)).join(', ')} are read-only (on: read); the lookup prints only what a change delivers`);
    }
    if (typeof conventions.resolveSettings !== 'function') return inline('the conventions lib does not expose resolveSettings');
    const settings = conventions.resolveSettings(config);
    const cap = settings.maxClassesPerEdit;
    const beyondCap = entries.filter(entry => ordered.indexOf(entry) >= cap);
    if (beyondCap.length) {
        return inline(`rule-bearing group(s) ${beyondCap.map(entry => literal(entry.name)).join(', ')} rank beyond the per-path class cap (maxClassesPerEdit ${cap}), so a path matching more classes could drop them`);
    }
    if (typeof conventions.buildDigest !== 'function' || !Number.isInteger(conventions.PATH_CAP)) return inline('the conventions lib does not expose the digest budget');
    const worst = digestUpperBound(conventions, ordered, cap);
    if (worst > settings.maxChars) {
        return inline(`a worst-case digest (${worst} chars) exceeds conventionInjection.maxChars ${settings.maxChars}, so an oversized digest could drop rule text`);
    }
    return { requested, compact: true, reason: null, conventions, entries };
}

/**
 * Upper bound on any digest the hook or lookup can build: the frame and every class's non-rule
 * lines rendered once with the longest accepted path and a multi-file label, plus the `cap`
 * largest rule sets. The frame is measured in both wordings — a read opens conditionally and an
 * edit with the mandatory instruction (BR-PFCI-20) — and the longer one counts, since either can
 * reach a file. Rule de-duplication only shrinks a real digest, so a digest within this bound is
 * never reduced (BR-PFCI-08) and keeps every rule-bearing class in full form.
 */
function digestUpperBound(conventions, ordered, cap) {
    const worstPath = 'x'.repeat(conventions.PATH_CAP);
    const rels = new Array(1000).fill(worstPath);
    const bare = ordered.map(entry => ({ ...entry, rules: [] }));
    const triggers = [conventions.TRIGGER_EDIT || 'edit', conventions.TRIGGER_READ || 'read'];
    const frame = Math.max(...triggers.map(trigger =>
        conventions.buildDigest(bare, rels, { maxChars: Infinity }, { fileExists: () => true, trigger }).text.length));
    const ruleLengths = ordered
        .map(entry => entry.rules.reduce((sum, rule) => sum + rule.length + 3, 0))
        .sort((a, b) => b - a)
        .slice(0, cap);
    return frame + ruleLengths.reduce((sum, length) => sum + length, 0);
}

// How many scanned content extensions the inline rule text names before it counts the rest.
const CONTENT_EXTENSIONS_NAMED = 6;

/** Project path/document map only; execution policy belongs outside root files. */
function buildProjectContextMap(config) {
    const list = value => Array.isArray(value) ? value.filter(nonBlank) : [];
    const rows = (config.contextGroups || []).flatMap(group => {
        // The doc fields of a group, as file-conventions `docsOf` reads them: a class may declare its
        // docs in `referenceDocs` alone.
        const docs = [...new Set([group.patternsDoc, group.guideDoc, ...list(group.referenceDocs)].filter(nonBlank))]
            .filter(doc => !/(?:^|[\\/])\.(?:claude|agents|codex|opencode)(?:[\\/]|$)/.test(doc));
        if (!docs.length) return [];
        const includes = [...list(group.pathRegexes), ...list(group.pathGlobs), ...list(group.fileNameRegexes)];
        const excludes = [...list(group.excludePathRegexes), ...list(group.excludePathGlobs)];
        const scope = [includes.join(', ') || group.name,
            list(group.fileExtensions).length ? `extensions: ${group.fileExtensions.join(', ')}` : '',
            excludes.length ? `exclude: ${excludes.join(', ')}` : ''].filter(Boolean).join('; ');
        return [`| ${tableCell(scope)} | ${docs.map(codeCell).join(', ')} |`];
    });
    return rows.length ? `Read the relevant project convention before changing these files.\n\n| Files | Project reference |\n|---|---|\n${rows.join('\n')}` : null;
}

function buildGoldenRules(config, projectDir) {
    const groups = ruleBearingGroups(config);
    if (groups.length === 0) return null;

    const delivery = pathRulesDelivery(config, projectDir);
    if (delivery.compact) {
        const names = delivery.entries.map(entry => literal(entry.name)).join(', ');
        if (delivery.completeLookup) return [
            `**Path-scoped project rules** — loaded before action. Groups with rules: ${names}.`,
            '',
            `- BEFORE the first read, grep, edit or test of a target, run \`${delivery.conventions.LOOKUP_COMMAND} <path> --complete\`. Read ALL returned pages and required references. This applies to shell access and file tools.`,
            '- The lookup includes every matching rule and document; follow its --page continuation until complete. Repeat for each target path when planning a change.',
            '- Automatic PostToolUse reminders are bounded accelerators, never proof of complete pre-read coverage. Apply rules only to their matching paths.'
        ].join('\n');
        return [
            `**Path-scoped project rules** — delivered just in time, not inlined here. Groups with rules: ${names}.`,
            '',
            "- The convention hook injects each matching group's full rule text and required docs when a matching file is read or edited, per the group's trigger, through the host's file tools.",
            `- A shell read or edit gets no digest: run \`${delivery.conventions.LOOKUP_COMMAND} <path>\` before the first read, edit or test of that path.`,
            "- Before planning a change, run the lookup for each target path; the Skill Activation table below indexes every group's matchers and pre-read docs.",
            "- Apply a group's rules only to files it matches; never promote a path-scoped rule to a global reminder."
        ].join('\n');
    }

    const renderMatchers = (label, values) => values.length
        ? `${label}: ${values.map(literal).join(', ')}`
        : null;
    const renderedGroups = groups.map(group => {
        const contentExtensions = Array.isArray(group.contentExtensions) ? group.contentExtensions.filter(nonBlank) : [];
        const includes = [
            ...(group.pathRegexes || []).map(value => `path regex ${literal(value)}`),
            ...(group.pathGlobs || []).map(value => `path glob ${literal(value)}`),
            ...(group.fileNameRegexes || []).map(value => `filename regex ${literal(value)}`),
            // Content signals are an include matcher too: name them, or the rule text would claim fewer files than the hook matches.
            // The first few scanned types are named and the rest counted (the lookup command answers for a concrete file), so a long
            // extension list does not weigh on every session.
            ...(Array.isArray(group.contentRegexes) && group.contentRegexes.some(nonBlank) && contentExtensions.length
                ? [`content signals (${nonBlank(group.contentLabel) ? group.contentLabel.trim() : 'file content'}) in ${contentExtensions.slice(0, CONTENT_EXTENSIONS_NAMED).map(literal).join(', ')}${contentExtensions.length > CONTENT_EXTENSIONS_NAMED ? ` +${contentExtensions.length - CONTENT_EXTENSIONS_NAMED} more` : ''} files`]
                : [])
        ];
        const scope = [
            includes.length ? `include any of: ${includes.join(', ')}` : 'no valid include matcher configured',
            renderMatchers('extensions', group.fileExtensions || []),
            renderMatchers('exclude path regexes', group.excludePathRegexes || []),
            renderMatchers('exclude path globs', group.excludePathGlobs || [])
        ].filter(Boolean).join('; ');
        const rules = [...new Set(group.rules.map(rule => rule.trim()).filter(Boolean))]
            .map((rule, index) => `  ${index + 1}. ${rule}`)
            .join('\n');
        return `- **${group.name || 'unnamed'}** — ${scope}\n${rules}`;
    });

    return `**Path-scoped project rules:**\n\nApply a group's rules only when the file matches at least one include matcher, matches one configured extension when an extension filter is present, and matches none of that group's exclusions.\n\n${renderedGroups.join('\n\n')}`;
}

function buildDecisionQuickRef(config) {
    const modules = config.modules || [];
    if (modules.length === 0) return null;

    const rows = [];
    const skippedNotApplicable = [];
    // A pattern doc the project's own `referenceDocs` declares N/A is never routed.
    const applicable = doc => {
        if (!isDeclaredNotApplicable(config, doc)) return true;
        skippedNotApplicable.push(`\`${tableCell(doc)}\``);
        return false;
    };
    // Configuration must name a convention; a database/broker technology alone does not
    // establish an application's data-access or messaging architecture.
    if (config.framework?.backendPatternsDoc) {
        if (applicable(config.framework.backendPatternsDoc)) rows.push(`| Backend conventions | Read \`${config.framework.backendPatternsDoc}\` |`);
    }
    if (config.framework?.frontendPatternsDoc) {
        if (applicable(config.framework.frontendPatternsDoc)) rows.push(`| Frontend conventions | Read \`${config.framework.frontendPatternsDoc}\` |`);
    }

    const workflowPatterns = config.workflowPatterns || {};
    for (const [field, label] of [
        ['architectureStyle', 'Architecture style'],
        ['codeHierarchy', 'Code hierarchy'],
        ['crossModuleValidation', 'Cross-module validation'],
        ['cssMethodology', 'Styling methodology'],
        ['stateManagement', 'State management']
    ]) {
        const value = workflowPatterns[field];
        if (typeof value === 'string' && value.trim()) {
            rows.push(`| ${label} | ${tableCell(value.trim())} |`);
        }
    }

    if (typeof config.messaging?.consumerConvention === 'string' && config.messaging.consumerConvention.trim()) {
        rows.push(`| Message consumer convention | ${tableCell(config.messaging.consumerConvention.trim())} |`);
    }

    // Add module-specific patterns
    for (const mod of modules) {
        if (mod.meta?.repository) {
            rows.push(`| ${tableCell(mod.name)} repository | \`${tableCell(mod.meta.repository)}\` |`);
        }
    }

    // Only N/A docs left: return a visible body, never null. `--mode update` keeps an existing body
    // when a builder returns null, so null here would leave stale rows routing to the N/A docs.
    if (rows.length === 0 && skippedNotApplicable.length > 0) {
        return `**Decision Quick-Ref:** no configured pattern doc applies — ${skippedNotApplicable.join(', ')} declared N/A in \`referenceDocs\`.`;
    }
    if (rows.length === 0) return null;
    return `**Decision Quick-Ref:**\n\n| Task | Pattern |\n|---|---|\n${rows.join('\n')}`;
}

function buildKeyLocations(config) {
    const modules = (config.modules || []).filter(m => !isInfraBackingService(m));
    if (modules.length === 0) return null;

    const lines = modules.map(m => {
        const displayPath = (m.pathRegex || '').replace(/\[\\\\\/\]/g, '/').replace(/\\\\/g, '');
        return `${displayPath.padEnd(40)} # ${m.description || m.name}`;
    });

    return '```\n' + lines.join('\n') + '\n```';
}

function buildDevCommands(config) {
    const commands = config.testing?.commands;
    const lines = [];
    if (commands && typeof commands === 'object') {
        for (const [key, cmd] of Object.entries(commands)) {
            if (typeof cmd === 'string') {
                lines.push(`${cmd.padEnd(45)} # ${key}`);
            } else if (typeof cmd === 'object') {
                for (const [subkey, subcmd] of Object.entries(cmd)) {
                    lines.push(`${subcmd.padEnd(45)} # ${key}: ${subkey}`);
                }
            }
        }
    }

    // Optional freetext caveat rendered below the command block (e.g. platform-specific
    // invocation rules). Config-sourced so it survives every regeneration instead of
    // being a hand-edit the next `--mode update` silently wipes. Rendered independently of
    // the command block so a note configured WITHOUT commands is not silently dropped.
    const note = config.testing?.commandsNote;
    const hasNote = typeof note === 'string' && note.trim().length > 0;

    if (lines.length === 0 && !hasNote) return null;

    const parts = [];
    if (lines.length > 0) parts.push('```bash\n' + lines.join('\n') + '\n```');
    if (hasNote) parts.push(note.trim());
    return parts.join('\n\n');
}

function buildInfraPorts(config) {
    // Look for infrastructure modules or well-known infra services
    const infra = [];
    const modules = config.modules || [];

    for (const mod of modules) {
        if (mod.kind === 'infrastructure' && mod.meta?.port) {
            infra.push({
                service: mod.name,
                port: String(mod.meta.port),
                credentials: renderCredentialReference(mod.meta.credentials)
            });
        }
    }

    if (infra.length === 0) return null;

    const rows = infra.map(i => `| ${i.service} | ${i.port} | ${i.credentials} |`);
    return `| Service | Port | Credentials |\n|---|---|---|\n${rows.join('\n')}`;
}

function buildApiPorts(config) {
    const modules = config.modules || [];
    const services = modules.filter(m => m.kind === 'backend-service' && m.meta?.port);
    if (services.length === 0) return null;

    const rows = services.map(s => {
        const ports = Array.isArray(s.meta.ports) ? s.meta.ports.join(', ') : String(s.meta.port);
        return `| ${s.name} | ${ports} |`;
    });

    return `| API Service | Port |\n|---|---|\n${rows.join('\n')}`;
}

// A guide doc the project declares N/A in `referenceDocs` is never linked as a guide. The section
// still renders this notice instead of returning null: `--mode update` PRESERVES a marker body whose
// builder returns null (generate-claude-md.cjs updateMarkedSections), so null would leave a stale
// "Full guide" link that contradicts the Doc Lookup N/A list.
function notApplicableGuideNotice(kind, doc) {
    return `No ${kind} guide applies: \`${path.basename(doc)}\` is declared not applicable in \`referenceDocs\` (skip unless the project adds that stack).`;
}

// Placeholder values ("none", "N/A", "not-applicable") are declarations of absence, not E2E evidence.
const ABSENT_VALUE = /^\s*(?:none|n\/?a|not[- ]applicable)\s*$/i;

function buildIntegrationTesting(config) {
    const doc = config.framework?.integrationTestDoc;
    if (!doc) return null;
    if (isDeclaredNotApplicable(config, doc)) return notApplicableGuideNotice('integration-test', doc);
    return `See [${path.basename(doc)}](${doc}) for integration test patterns and setup.`;
}

function buildE2eTesting(config) {
    const e2e = config.e2eTesting || {};
    const configuredDoc = config.framework?.e2eTestDoc || e2e.guideDoc;
    const docNotApplicable = !!configuredDoc && isDeclaredNotApplicable(config, configuredDoc);
    const doc = docNotApplicable ? null : configuredDoc;
    const frameworks = config.testing?.frameworks || [];
    const execution = e2e.execution || {};
    const hasE2e = frameworks.some(f => /selenium|playwright|cypress|specflow/i.test(f)) ||
        (!!e2e.framework && !ABSENT_VALUE.test(String(e2e.framework))) || Object.keys(execution).length > 0;

    if (!configuredDoc && !hasE2e) return null;

    // Compose a stack descriptor from structured e2eTesting.architecture so the
    // generated line is at least as rich as a hand-authored one (avoids the
    // info-loss that otherwise forces a section to stay hand-authored).
    const PRETTY = {
        selenium: 'Selenium WebDriver',
        playwright: 'Playwright',
        cypress: 'Cypress',
        specflow: 'SpecFlow BDD',
        'page-object-model': 'Page Object Model'
    };
    const arch = e2e.architecture || {};
    const stack = [arch.webDriverType, arch.bddFramework, arch.pattern]
        .map(k => PRETTY[k]).filter(Boolean).join(' + ');
    const docLink = doc
        ? `Full guide: [${path.basename(doc)}](${doc}) for E2E test patterns, test organization, and execution configuration.`
        : '';

    // Keep generated root context useful without copying commands, credentials,
    // storage state, or arbitrary config text into a broadly consumed document.
    // The project-config remains the source of truth for exact values.
    const executionLines = [];
    const surfaceIds = Array.isArray(execution.surfaceIds) ? execution.surfaceIds : [];
    const surfaces = Array.isArray(config.experienceVerification?.surfaces)
        ? config.experienceVerification.surfaces
        : [];
    if (surfaceIds.length > 0) {
        const lifecycle = surfaceIds.map(id => {
            const surface = surfaces.find(s => s?.id === id);
            return `\`${String(id).replace(/[|\r\n]/g, ' ')}\`${surface?.localRun ? ' (localRun configured)' : ' (localRun must be verified/discovered)'}`;
        });
        executionLines.push(`- **E2E surfaces:** ${lifecycle.join(', ')}; use each surface's configured localRun owner.`);
    } else if (Object.keys(execution).length > 0) {
        executionLines.push('- **E2E surfaces:** resolve surface IDs and localRun ownership from `experienceVerification.surfaces[]`; do not invent lifecycle details.');
    }
    if (execution.auth) {
        const mode = execution.auth.mode ? `\`${String(execution.auth.mode).replace(/[|\r\n]/g, ' ')}\`` : 'configured mode';
        executionLines.push(`- **E2E authentication:** ${mode}; use configured non-secret references/fixtures or the documented manual-login path, never raw credentials.`);
    }
    if (execution.data) {
        const mode = execution.data.mode ? `\`${String(execution.data.mode).replace(/[|\r\n]/g, ' ')}\`` : 'configured policy';
        executionLines.push(`- **E2E data:** ${mode}; use the configured seed/cleanup policy and record data identity without exposing secrets.`);
    }
    if (execution.browser) {
        const runner = execution.browser.runner ? ` runner \`${String(execution.browser.runner).replace(/[|\r\n]/g, ' ')}\`` : '';
        const headed = execution.browser.headed === true ? 'headed/visible' : execution.browser.headed === false ? 'headless' : 'configured visibility';
        const configuredDelay = Number.isSafeInteger(execution.browser.actionDelayMs) && execution.browser.actionDelayMs >= 0
            ? execution.browser.actionDelayMs
            : null;
        const pacing = configuredDelay === null
            ? 'Apply action delays only when the project contract documents them.'
            : `Apply the configured ${configuredDelay}ms post-action delay only for the project-defined pacing need.`;
        executionLines.push(`- **E2E browser:**${runner}; ${headed}. Use runner-native waits or an evidenced project helper for observable readiness and postconditions; waits must not weaken the final assertion. ${pacing} A delay is never a readiness or settle signal.`);
    }
    if (execution.evidence) {
        const capture = Array.isArray(execution.evidence.capture) ? execution.evidence.capture.join(', ') : 'configured capture set';
        executionLines.push(`- **E2E evidence:** capture ${capture}; store under the configured evidence root, read the evidence, and apply the configured redaction policy.`);
    }
    if (execution.convergence) {
        const attempts = execution.convergence.maxAttempts ? `max ${execution.convergence.maxAttempts} attempts` : 'bounded attempts';
        executionLines.push(`- **E2E convergence:** ${attempts}; preserve scope, classify failures before edits, review fixes, and escalate when the contract cannot converge.`);
    }
    const executionProfile = executionLines.length > 0
        ? `\n\nE2E execution profile (read \`docs/project-config.json → e2eTesting.execution\` for exact project facts):\n${executionLines.join('\n')}`
        : '';

    if (stack && docLink) return `${stack}. ${docLink}${executionProfile}`;
    if (stack) return `E2E stack: ${stack}.${executionProfile}`;
    if (docLink) return `${docLink}${executionProfile}`;
    if (!hasE2e) return notApplicableGuideNotice('E2E', configuredDoc);
    return `E2E testing framework(s): ${frameworks.join(', ')}${executionProfile}`;
}

// Per-file convention classes share one renderer with the file-convention-inject hook and the
// `--lookup` CLI (static parity). Resolution: the sibling framework lib (canonical
// `.claude/skills/...` layout), then the consuming project's `.claude/hooks/lib` (a mirrored
// copy such as `.agents/skills/...` has no sibling hooks/lib). Only when neither exists does a
// compact copied skill keep the historical guide-doc-only table. The project root is the
// generator's resolved project directory when given, else CLAUDE_PROJECT_DIR, else the cwd.
function loadFileConventions(env = process.env, cwd = process.cwd(), projectDir) {
    const envRoot = env && typeof env.CLAUDE_PROJECT_DIR === 'string' && env.CLAUDE_PROJECT_DIR.trim()
        ? env.CLAUDE_PROJECT_DIR.trim()
        : null;
    const projectRoot = typeof projectDir === 'string' && projectDir.trim() ? projectDir : (envRoot || cwd);
    const candidates = [
        path.join(__dirname, '..', '..', '..', 'hooks', 'lib', 'file-conventions.cjs'),
        path.join(projectRoot, '.claude', 'hooks', 'lib', 'file-conventions.cjs')
    ];
    const usable = lib => lib
        && ['injectableEntries', 'sortEntries', 'conventionTag', 'normalizedExtensions'].every(name => typeof lib[name] === 'function')
        && typeof lib.LOOKUP_COMMAND === 'string';
    for (const candidate of candidates) {
        try {
            if (!fs.existsSync(candidate)) continue;
            const lib = require(candidate);
            if (usable(lib)) return lib;
        } catch {
            /* try the next location */
        }
    }
    return null;
}

/** Display form of a path regex in the static table (approximate; the lookup CLI is exact). */
function activationPattern(regex) {
    return regex.replace(/\[\\\\\/\]/g, '/').replace(/\\\\/g, '') + '**';
}

const nonBlank = value => typeof value === 'string' && value.trim();

function tableCell(text) {
    return String(text).replace(/[|\r\n]/g, char => char === '|' ? '\\|' : ' ');
}

/**
 * Static wording for a class's content signals, or '' when it has none (or the shared lib predates
 * them, so an older mirrored copy renders the path-only row it always did). Names the label and the
 * scanned file types; the lookup CLI answers for a concrete file.
 */
function contentSignalSummary(conventions, group) {
    if (!conventions || typeof conventions.contentRegexSources !== 'function' || typeof conventions.normalizedContentExtensions !== 'function') return '';
    if (!conventions.contentRegexSources(group).length) return '';
    const extensions = conventions.normalizedContentExtensions(group);
    if (!extensions.length) return '';
    const label = typeof conventions.contentLabelOf === 'function' ? conventions.contentLabelOf(group) : '';
    return `${label || 'file content'} in ${extensions.length} code file types`;
}

const SKILL_ACTIVATION_INTRO = 'When editing files matching these path patterns, pre-read the listed context first:';

function buildSkillActivation(config, projectDir) {
    const groups = config.contextGroups || [];
    if (groups.length === 0) return null;
    if (pathRulesDelivery(config, projectDir).completeLookup) {
        return 'Path rules and pre-read documents use the complete lookup above; the Doc Lookup below routes task-level references. No duplicate path table is loaded.';
    }
    const header = '| Path Pattern | Skill / Auto-Context | Pre-Read Files |\n|---|---|---|';
    const conventions = loadFileConventions(process.env, process.cwd(), projectDir);

    if (!conventions) {
        const legacyRows = groups
            .filter(g => g.patternsDoc || g.guideDoc)
            .map(g => {
                const patterns = g.pathRegexes?.map(activationPattern) || [];
                const doc = g.patternsDoc || g.guideDoc || '';
                return `| ${patterns.length ? patterns.map(p => `\`${p}\``).join(', ') : g.name} | _(auto-context)_ | \`${doc}\` |`;
            });
        if (legacyRows.length === 0) return null;
        return `${SKILL_ACTIVATION_INTRO}\n\n${header}\n${legacyRows.join('\n')}`;
    }

    const entries = conventions.sortEntries(conventions.injectableEntries(config));
    if (entries.length === 0) return null;
    const rows = entries.map(entry => {
        const group = entry.group;
        const list = value => (Array.isArray(value) ? value.filter(nonBlank) : []);
        const patterns = list(group.pathRegexes).map(activationPattern)
            .concat(list(group.pathGlobs))
            .concat(list(group.fileNameRegexes).map(r => `name:${r}`));
        const excludes = list(group.excludePathRegexes).map(activationPattern).concat(list(group.excludePathGlobs));
        const extensions = conventions.normalizedExtensions(group);
        // Membership is extension filter AND any include AND no exclude (BR-PFCI-02): a row that
        // omitted the filter or the exclusions would claim files the hook never matches.
        let patternCell = patterns.length ? patterns.map(p => `\`${tableCell(p)}\``).join(', ') : tableCell(entry.name);
        if (extensions.length) patternCell += ` ext ${extensions.map(e => `\`${tableCell(e)}\``).join(', ')}`;
        // A class that also matches by file content (BR-PFCI-13 static parity): name the signal and the file types scanned.
        const contentSignals = contentSignalSummary(conventions, group);
        if (contentSignals) patternCell += ` · content signals: ${tableCell(contentSignals)}`;
        if (excludes.length) patternCell += ` · not ${excludes.map(p => `\`${tableCell(p)}\``).join(', ')}`;
        const skillCell = entry.skills.length ? entry.skills.map(s => `\`${tableCell(s)}\``).join(', ') : '_(auto-context)_';
        const docCell = entry.docs.map(d => `\`${tableCell(d)}\``).concat(`\`${conventions.conventionTag(entry)}\``).join(', ');
        return `| ${patternCell} | ${skillCell} | ${docCell} |`;
    });
    return `${SKILL_ACTIVATION_INTRO} (a shell read or edit gets no digest: \`${conventions.LOOKUP_COMMAND} <path>\`)\n\n${header}\n${rows.join('\n')}`;
}

function buildDocIndex(config, projectDir) {
    const { root: docsRoot, dir: docsDir } = resolveDocsTree(config, projectDir);
    // NEVER return falsy here. generate-claude-md.cjs drops the WHOLE section INCLUDING its
    // `<!-- SECTION:doc-index -->` markers when a builder returns falsy (`:452-459` skips the open
    // marker, `:465-472` pushes the close marker only `if (sections[currentKey])`). That drop is
    // correct for a section that does not APPLY to a project; "I could not find the docs tree" is a
    // different case, and returning null for it deleted the markers so `--mode update` could never
    // restore the block. A visible note keeps the markers and makes the miss recoverable.
    if (!fs.existsSync(docsDir)) return docsNoteBlock(`no documentation tree at the resolved path: ${docsRoot}/`);

    // Count markdown at ANY depth, not just the top level. A one-level count is correct only for
    // a flat docs folder, which every `docs/<x>/` here happened to be EXCEPT `docs/specs/` — whose
    // canonical layout is always nested (`<Capability>/README.*.md`). That folder therefore
    // reported `(0 files)` permanently while holding three specs, contradicting two other lines of
    // the same generated file. Depth-capped so a stray deep tree cannot make generation expensive.
    const countMarkdownDeep = (dir, depth = 0) => {
        if (depth > 4) return 0;
        let total = 0;
        for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
            if (item.name.startsWith('.')) continue;
            if (item.isDirectory()) total += countMarkdownDeep(path.join(dir, item.name), depth + 1);
            else if (item.name.endsWith('.md')) total += 1;
        }
        return total;
    };

    const tree = [];
    const entries = fs.readdirSync(docsDir, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
        if (entry.name.startsWith('.')) continue;
        if (entry.isDirectory()) {
            const subfiles = countMarkdownDeep(path.join(docsDir, entry.name));
            tree.push(`${docsRoot}/${entry.name}/  (${subfiles} files)`);
        } else if (entry.name.endsWith('.md')) {
            tree.push(`${docsRoot}/${entry.name}`);
        }
    }

    if (tree.length === 0) return docsNoteBlock(`no documents under the resolved path: ${docsRoot}/`);
    return '```\n' + tree.join('\n') + '\n```';
}

/** Slash-free ADR root; default `docs/adr`. */
function adrRootPath(config) {
    if (!PORTABILITY) return DEFAULT_ADR_ROOT;
    return PORTABILITY.normalizeRootPath(PORTABILITY.getDocsRoot('adr', config || {})) || DEFAULT_ADR_ROOT;
}

/** Repo-relative POSIX display path of the project config, resolved like the generator's own read. */
function projectConfigDisplayPath(projectDir) {
    try {
        const configured = PORTABILITY?.getConfiguredProjectConfigPath?.();
        if (configured) {
            const relative = path.relative(projectDir, configured).split(path.sep).join('/');
            if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) return relative;
        }
    } catch {
        /* fall back to the documented default */
    }
    return DEFAULT_PROJECT_CONFIG;
}

const existsUnder = (projectDir, relative) => fs.existsSync(path.join(projectDir, ...relative.split('/')));

/** Inline-code table cell for one path. */
const codeCell = value => `\`${tableCell(value)}\``;

/** Render one doc-lookup row `{ topic, files }`; every cell is escaped, so a `|` never splits the row. */
const renderLookupRow = row => `| ${tableCell(row.topic)} | ${row.files.map(codeCell).join(' + ')} |`;

/**
 * Discovery rows added when the generator knows the project directory. Every row names a file that
 * exists on disk, so the table can never route an agent to a document the project does not have.
 * @returns {{top: {topic: string, files: string[]}[], bottom: {topic: string, files: string[]}[], notApplicable: string[]}}
 */
function buildDiscoveryRows(config, projectDir, referenceRoot, routedPaths) {
    const top = [];
    const bottom = [];
    const notApplicable = [];
    const pushRow = (target, topic, files) => {
        const present = files.filter(file => existsUnder(projectDir, file) && !routedPaths.has(file));
        if (present.length === 0) return;
        present.forEach(file => routedPaths.add(file));
        target.push({ topic, files: present });
    };

    pushRow(top, 'Any project question or task — start here: paths, commands, modules, conventions', [projectConfigDisplayPath(projectDir)]);
    pushRow(top, 'Where a topic is documented — keyword-to-doc routing', [underRoot(referenceRoot, 'docs-index-reference.md')]);
    pushRow(top, 'Any non-trivial task — learned project guardrails', [underRoot(referenceRoot, 'lessons.md')]);

    for (const doc of Array.isArray(config.referenceDocs) ? config.referenceDocs : []) {
        const filename = typeof doc?.filename === 'string' ? doc.filename.trim() : '';
        // A traversing or absolute name is invalid config (project-reference-registry.cjs rejects it); never probe it.
        if (['skill-protocols-reference.md', 'custom-prompts-reference.md'].includes(filename)) continue;
        if (!filename || FIXED_ROUTE_DOCS.has(filename) || path.isAbsolute(filename) || /(^|[\\/])\.\.([\\/]|$)/.test(filename)) continue;
        const docPath = underRoot(referenceRoot, filename);
        if (routedPaths.has(docPath) || !existsUnder(projectDir, docPath)) continue;
        const purpose = typeof doc.purpose === 'string' ? doc.purpose.trim() : '';
        if (declaresNotApplicable(doc)) {
            notApplicable.push(codeCell(filename));
            routedPaths.add(docPath);
            continue;
        }
        const trigger = REFERENCE_DOC_TRIGGERS[filename];
        // First clause only: the table is always-on context; the doc itself carries the detail.
        const summary = purpose.split(/(?<=\.)\s|;\s/)[0].replace(/\.$/, '');
        const topic = trigger && summary ? `${trigger}. Holds: ${summary}` : trigger || summary || filename;
        pushRow(bottom, topic, [docPath]);
    }

    const adrRoot = adrRootPath(config);
    const adrDir = path.join(projectDir, ...adrRoot.split('/'));
    let hasAdr = false;
    try {
        hasAdr = fs.statSync(adrDir).isDirectory() && fs.readdirSync(adrDir).some(name => name.endsWith('.md'));
    } catch {
        /* no ADR root: no row */
    }
    if (hasAdr) bottom.push({ topic: 'Why the architecture or a convention is the way it is — accepted decisions and trade-offs', files: [underRoot(adrRoot, '')] });

    return { top, bottom, notApplicable };
}

/**
 * The doc-lookup table: which document to open for a given question or task.
 *
 * Without `projectDir` it renders only the config-derived spec/pattern rows (the historical shape,
 * pinned byte-for-byte by TC-DOCROOT-065; a pattern doc declared N/A is omitted). With `projectDir`, which the generator always passes, it
 * adds existence-gated discovery rows: the always-on start-here docs, every selected `referenceDocs[]`
 * entry with a when-to-read trigger, and the ADR root. Framework navigation stays in the configuration skill.
 */
function buildDocLookup(config, projectDir) {
    const modules = config.modules || [];
    const featureRoot = specRootPath(config);
    const referenceRoot = referenceDocsRoot(config);

    // Fixed rows are DATA `{ topic, files }` rendered once at the end, so filtering never has to
    // re-parse rendered markdown and every cell goes through the same escaping.
    const rows = modules
        .filter(m => m.meta?.domain)
        .map(m => ({ topic: m.meta.domain, files: [underRoot(featureRoot, m.name, '')] }));

    rows.push({
        topic: 'Feature specs, capability behavior, business rules, test cases',
        files: [underRoot(featureRoot, ''), underRoot(referenceRoot, 'feature-spec-reference.md')]
    });
    for (const [topic, file] of REFERENCE_DOC_ROWS) rows.push({ topic, files: [underRoot(referenceRoot, file)] });

    const hasProjectDir = typeof projectDir === 'string' && projectDir.length > 0;
    const discovery = hasProjectDir
        ? buildDiscoveryRows(config, projectDir, referenceRoot, new Set())
        : null;
    // Add framework docs; a pattern doc declared N/A is never routed (with a project directory the
    // closing note names it once instead).
    if (config.framework?.backendPatternsDoc && !isDeclaredNotApplicable(config, config.framework.backendPatternsDoc)) {
        rows.push({ topic: 'Backend patterns, CQRS, validation', files: [config.framework.backendPatternsDoc] });
    }
    if (config.framework?.frontendPatternsDoc && !isDeclaredNotApplicable(config, config.framework.frontendPatternsDoc)) {
        rows.push({ topic: 'Frontend patterns, components, stores', files: [config.framework.frontendPatternsDoc] });
    }

    if (!discovery) return `| If user prompt mentions... | Read first |\n|---|---|\n${rows.map(renderLookupRow).join('\n')}`;

    // The fixed rows obey the same promises as the discovery rows: a path missing on disk, or a doc the
    // project declares N/A, is dropped from its row, and a row left with no path is dropped entirely.
    const notApplicable = [...discovery.notApplicable];
    const existingRows = rows.map(row => {
        const present = row.files.filter(file => {
            if (!existsUnder(projectDir, file)) return false;
            if (!isDeclaredNotApplicable(config, file)) return true;
            const name = codeCell(path.posix.relative(referenceRoot, file));
            if (!notApplicable.includes(name)) notApplicable.push(name);
            return false;
        });
        return present.length ? { topic: row.topic, files: present } : null;
    }).filter(Boolean);

    // A doc already routed by a fixed row above must not be routed twice below: a discovery row
    // naming any fixed path is dropped whole, as the fixed row already sends the reader there.
    const fixedPaths = new Set(existingRows.flatMap(row => row.files));
    const bottom = discovery.bottom.filter(row => !row.files.some(file => fixedPaths.has(file)));
    const allRows = [...discovery.top, ...existingRows, ...bottom].map(renderLookupRow);
    const skip = notApplicable.length
        ? `\n\nDeclared not applicable in \`referenceDocs\` (skip unless the project adds that stack): ${notApplicable.join(', ')}.`
        : '';
    // Never render a header-only table: say what to do instead.
    if (allRows.length === 0) return `No project reference documents are configured or present.${skip}`;
    const intro = 'Match the question or task to a row and read that doc before answering, planning, or editing; ' +
        'every row names a file or folder that exists in this repo.';
    return `${intro}\n\n| If user prompt mentions... | Read first |\n|---|---|\n${allRows.join('\n')}${skip}`;
}

module.exports = {
    buildTldr,
    REDACTED_CREDENTIAL,
    renderCredentialReference,
    buildGoldenRules,
    buildProjectContextMap,
    pathRulesDelivery,
    buildDecisionQuickRef,
    buildKeyLocations,
    buildDevCommands,
    buildInfraPorts,
    buildApiPorts,
    buildIntegrationTesting,
    buildE2eTesting,
    buildSkillActivation,
    activationPattern,
    buildDocIndex,
    buildDocLookup,
    declaresNotApplicable
};
