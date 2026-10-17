#!/usr/bin/env node
/**
 * project-config help generator.
 *
 * Renders, from live sources only, the answer to "what can I configure, and what
 * does changing it affect?":
 *
 *   - every project-config option and what it controls  (SCHEMA describes)
 *   - the relocatable roots and their defaults           (PORTABILITY_TOKENS)
 *   - which reference doc serves what purpose and who
 *     regenerates it                                     (SCAN_SKILL_MAP + config)
 *   - how many skills/agents/workflows consume each
 *     option                                             (filesystem scan)
 *   - what THIS project currently declares               (the config file)
 *
 * Nothing here is hand-maintained: a list a command can produce must not be
 * transcribed into prose, or it goes stale silently.
 *
 * PORTABILITY CONTRACT (PORT-001): plain `node` >= 18, `node:` built-ins only,
 * no host package.json script, no third-party dependency.
 *
 * Usage:
 *   node .claude/skills/project-config/scripts/project-config-help.cjs [mode]
 *
 *   (no args) | --overview     Orientation: what the framework reads, required
 *                              vs optional, the roots, the top consumed options.
 *   --sections               Every top-level option, one line each.
 *   --section=<name>         One option in full, with nested fields + consumers.
 *   --consumers              Consumer counts for every option, most-used first.
 *   --consumers=<key>        Which skills/agents/workflows read that option.
 *   --docs                   Reference-doc catalog: purpose + regenerating owner.
 *   --roots                  Relocatable roots, defaults, and current values.
 *   --skills                 Skills that read project-config, and what they read.
 *   --search=<term>          Find options/docs/skills matching a term.
 *   --current                What THIS project declares, and what is defaulted.
 *   --json                   Machine-readable form of the selected mode.
 *   --help                   This usage block.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

// ── root + module resolution ────────────────────────────────────────────────
// Resolve by walking up for the schema module rather than by a fixed ../../..
// hop: the same file is mirrored into `.agents/skills/...`, where the relative
// hop would land on a `.agents/hooks/lib` that does not exist.
function resolveProjectRoot() {
    const marker = path.join('.claude', 'hooks', 'lib', 'project-config-schema.cjs');
    const starts = [__dirname, process.cwd()];
    for (const start of starts) {
        let dir = path.resolve(start);
        while (true) {
            if (fs.existsSync(path.join(dir, marker))) return dir;
            const parent = path.dirname(dir);
            if (parent === dir) break;
            dir = parent;
        }
    }
    return null;
}

const ROOT = resolveProjectRoot();
if (!ROOT) {
    console.error('[project-config --help] Could not locate .claude/hooks/lib/project-config-schema.cjs');
    console.error('Run this from inside a repository that carries the portable .claude framework.');
    process.exit(2);
}

const LIB = path.join(ROOT, '.claude', 'hooks', 'lib');
function loadLib(name) {
    try {
        return require(path.join(LIB, name));
    } catch (error) {
        console.error(`[project-config --help] Failed to load ${name}: ${error.message}`);
        process.exit(2);
    }
}

const { SCHEMA, getRequiredSections } = loadLib('project-config-schema.cjs');
const loader = loadLib('project-config-loader.cjs');
const registry = loadLib('project-reference-registry.cjs');

const { PORTABILITY_TOKENS } = loader;
// Field walker + help text for fields without an inline schema describe (help-only; hooks never load it).
const DESCRIBES_LIB = path.join(ROOT, '.claude', 'scripts', 'lib', 'config-option-describes.cjs');
function loadDescribes() {
    try {
        return require(DESCRIBES_LIB);
    } catch (error) {
        console.error(`[project-config --help] Failed to load ${path.relative(ROOT, DESCRIBES_LIB)}: ${error.message}`);
        process.exit(2);
    }
}
const { PROJECT_CONFIG_DESCRIBES, describeField, walkNestedFields } = loadDescribes();
const { SCAN_SKILL_MAP, REFERENCE_DOC_ALIASES } = registry;

// ── the configured project ──────────────────────────────────────────────────
function readConfig() {
    let configPath = 'docs/project-config.json';
    try {
        const resolved = loader.getConfiguredProjectConfigPath && loader.getConfiguredProjectConfigPath();
        if (typeof resolved === 'string' && resolved) configPath = resolved;
    } catch { /* fall through to the default path */ }

    const abs = path.resolve(ROOT, configPath);
    if (!fs.existsSync(abs)) return { configPath, exists: false, config: null, error: null };
    try {
        return { configPath, exists: true, config: JSON.parse(fs.readFileSync(abs, 'utf-8')), error: null };
    } catch (error) {
        return { configPath, exists: true, config: null, error: error.message };
    }
}

const PROJECT = readConfig();

// ── option inventory, derived from SCHEMA ───────────────────────────────────
function firstLine(text) {
    if (typeof text !== 'string' || !text.trim()) return '';
    return text.split('\n').map(s => s.trim()).filter(Boolean).join(' ');
}

// Every nested field at any depth, from every shape the schema validator accepts (properties,
// array items, map values, oneOf alternatives) — the walker lives with the help text so both help
// commands list the same fields. A field it skips is an option help can never show.
function childPaths(key, fieldSchema) {
    return walkNestedFields(key, fieldSchema).map(({ key: full, schema }) => ({
        key: full,
        type: schema.type || 'any',
        required: Boolean(schema.required),
        deprecated: Boolean(schema.deprecated),
        describe: firstLine(describeField(PROJECT_CONFIG_DESCRIBES, full, schema))
    }));
}

function buildOptions() {
    const options = [];
    for (const [key, fieldSchema] of Object.entries(SCHEMA)) {
        if (key.startsWith('_')) continue;
        const children = childPaths(key, fieldSchema);
        options.push({
            key,
            type: fieldSchema.type || 'any',
            required: Boolean(fieldSchema.required),
            deprecated: Boolean(fieldSchema.deprecated),
            describe: firstLine(describeField(PROJECT_CONFIG_DESCRIBES, key, fieldSchema)),
            children
        });
    }
    return options;
}

const OPTIONS = buildOptions();
const OPTION_BY_KEY = new Map(OPTIONS.map(o => [o.key, o]));

function declaredState(key) {
    if (!PROJECT.config) return 'unknown';
    const segments = key.split('.');
    let node = PROJECT.config;
    for (const segment of segments) {
        if (!node || typeof node !== 'object' || !(segment in node)) return 'default';
        node = node[segment];
    }
    return 'declared';
}

// ── consumer index: who reads which option ──────────────────────────────────
const SCAN_TARGETS = [
    { label: 'skill', dir: path.join(ROOT, '.claude', 'skills'), exts: ['.md'] },
    { label: 'agent', dir: path.join(ROOT, '.claude', 'agents'), exts: ['.md'] },
    { label: 'workflow', dir: path.join(ROOT, '.claude', 'workflows'), exts: ['.md', '.json', '.yaml', '.yml'] },
    { label: 'hook', dir: path.join(ROOT, '.claude', 'hooks'), exts: ['.cjs', '.mjs', '.js'] }
];

function walk(dir, exts, acc) {
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return acc;
    }
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === '.git') continue;
            walk(full, exts, acc);
        } else if (exts.includes(path.extname(entry.name))) {
            acc.push(full);
        }
    }
    return acc;
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A top-level key like `testing` or `api` is an ordinary English word, so a bare
 * word-boundary match counts prose, not consumers. Require the shape a config
 * reference actually takes: quoted/backticked, or carrying a dotted child.
 * Dotted paths are unambiguous already.
 */
function matcherFor(key) {
    const escaped = escapeRegExp(key);
    if (key.includes('.')) return new RegExp(`(?<![\\w.-])${escaped}(?![\\w-])`);
    return new RegExp('(?:[`"\']' + escaped + '(?:[`"\']|\\.)|' + escaped + '\\.[A-Za-z])');
}

let CONSUMER_INDEX = null;
function consumerIndex() {
    if (CONSUMER_INDEX) return CONSUMER_INDEX;

    const keys = [];
    for (const option of OPTIONS) {
        keys.push(option.key);
        // Array-item and map-value paths never appear literally in code; skip them.
        for (const child of option.children) if (!/[[{]/.test(child.key)) keys.push(child.key);
    }
    for (const token of Object.values(PORTABILITY_TOKENS || {})) {
        if (token && token.configPath && !keys.includes(token.configPath)) keys.push(token.configPath);
    }

    const matchers = keys.map(key => ({ key, re: matcherFor(key) }));
    const index = new Map(keys.map(key => [key, []]));
    const files = { skill: 0, agent: 0, workflow: 0, hook: 0 };

    for (const target of SCAN_TARGETS) {
        for (const file of walk(target.dir, target.exts, [])) {
            let content;
            try {
                content = fs.readFileSync(file, 'utf-8');
            } catch {
                continue;
            }
            files[target.label] += 1;
            const rel = path.relative(ROOT, file).split(path.sep).join('/');
            const name = target.label === 'skill'
                ? path.relative(target.dir, path.dirname(file)).split(path.sep).join('/') || path.basename(file)
                : path.basename(file, path.extname(file));
            for (const { key, re } of matchers) {
                if (re.test(content)) index.get(key).push({ kind: target.label, name, path: rel });
            }
        }
    }

    CONSUMER_INDEX = { index, files, keys };
    return CONSUMER_INDEX;
}

function consumersFor(key) {
    const { index } = consumerIndex();
    return index.get(key) || [];
}

function countsByKind(consumers) {
    const counts = { skill: 0, agent: 0, workflow: 0, hook: 0 };
    for (const consumer of consumers) counts[consumer.kind] += 1;
    return counts;
}

function summarizeCounts(counts) {
    return Object.entries(counts)
        .filter(([, n]) => n > 0)
        .map(([kind, n]) => `${n} ${kind}${n === 1 ? '' : 's'}`)
        .join(', ') || 'no direct consumers found';
}

// ── reference-doc catalog ───────────────────────────────────────────────────
function referenceDocCatalog() {
    const configured = new Map();
    const declared = PROJECT.config && Array.isArray(PROJECT.config.referenceDocs)
        ? PROJECT.config.referenceDocs
        : [];
    for (const doc of declared) {
        if (doc && typeof doc.filename === 'string') configured.set(doc.filename, doc);
    }

    const refRoot = safeDocsRoot('projectReference');
    const rows = [];
    const seen = new Set();

    for (const [filename, command] of Object.entries(SCAN_SKILL_MAP)) {
        seen.add(filename);
        const doc = configured.get(filename);
        rows.push({
            filename,
            kind: 'built-in',
            selected: Boolean(doc),
            purpose: doc && doc.purpose ? firstLine(doc.purpose) : '',
            owner: `/${command}`,
            exists: refRoot ? fs.existsSync(path.resolve(ROOT, refRoot, filename)) : false
        });
    }

    for (const [alias, canonical] of Object.entries(REFERENCE_DOC_ALIASES)) {
        rows.push({
            filename: alias,
            kind: 'alias',
            selected: configured.has(alias),
            purpose: `Legacy name — resolves to ${canonical}.`,
            owner: `/${SCAN_SKILL_MAP[canonical] || 'scan'}`,
            exists: false
        });
    }

    for (const [filename, doc] of configured) {
        if (seen.has(filename) || REFERENCE_DOC_ALIASES[filename]) continue;
        const target = registry.resolveReferenceDocTarget(doc);
        rows.push({
            filename,
            kind: `custom (${target.kind})`,
            selected: true,
            purpose: firstLine(doc.purpose),
            owner: target.command ? `/${target.command}` : 'hand-maintained (manual)',
            exists: refRoot ? fs.existsSync(path.resolve(ROOT, refRoot, filename)) : false
        });
    }

    return { rows, refRoot, declaredCount: declared.length };
}

function safeDocsRoot(key) {
    try {
        const value = loader.getDocsRoot(key, PROJECT.config || undefined);
        return typeof value === 'string' && value ? value : '';
    } catch {
        return '';
    }
}

function rootRows() {
    return Object.entries(PORTABILITY_TOKENS || {}).map(([token, spec]) => ({
        token,
        configPath: spec.configPath,
        default: spec.default,
        current: currentValue(spec.configPath) || spec.default,
        declared: declaredState(spec.configPath) === 'declared'
    }));
}

function currentValue(keyPath) {
    if (!PROJECT.config) return null;
    let node = PROJECT.config;
    for (const segment of keyPath.split('.')) {
        if (!node || typeof node !== 'object' || !(segment in node)) return null;
        node = node[segment];
    }
    return typeof node === 'string' ? node : null;
}

// ── rendering ───────────────────────────────────────────────────────────────
const out = [];
const say = line => out.push(line === undefined ? '' : line);
function heading(text) {
    say('');
    say(text);
    say('─'.repeat(Math.min(text.length, 78)));
}

function pad(value, width) {
    const text = String(value);
    return text.length >= width ? text : text + ' '.repeat(width - text.length);
}

function renderOverview() {
    const { files } = consumerIndex();
    say('# project-config — what you can change, and what it changes');
    say('');
    say(`Project root : ${ROOT}`);
    say(`Config file  : ${PROJECT.configPath}${PROJECT.exists ? '' : '  (MISSING — run /project-init)'}`);
    if (PROJECT.error) say(`Config error : ${PROJECT.error}`);
    if (PROJECT.config && PROJECT.config.project) say(`Project name : ${PROJECT.config.project.name || '(unset)'}`);
    say(`Framework    : ${files.skill} skill files, ${files.agent} agent files, ${files.workflow} workflow files, ${files.hook} hook modules scanned`);

    heading('How the framework reads this file');
    say('1. Every skill resolves paths through portability tokens, never hard-coded folders.');
    say('   Change a root here and every skill follows it — see `--roots`.');
    say('2. Capability sections (testing, e2eTesting, designSystem, …) are how a skill decides');
    say('   whether a lane applies to this project at all. An absent section means "not applicable",');
    say('   not "use the framework example".');
    say('3. `referenceDocs[]` selects which generated project-reference documents exist and what');
    say('   each one is for — see `--docs`.');
    say('4. `contextGroups` / `conventionInjection` decide what gets injected into CLAUDE.md and');
    say('   into the model context while you edit matching files.');

    heading('Required vs optional');
    let required = [];
    try {
        required = getRequiredSections() || [];
    } catch { /* schema helper is advisory here */ }
    say(`Required top-level sections : ${required.length ? required.join(', ') : 'project'}`);
    say(`Optional sections            : ${OPTIONS.filter(o => !o.required && !o.deprecated).length}`);
    say(`Deprecated sections          : ${OPTIONS.filter(o => o.deprecated).map(o => o.key).join(', ') || 'none'}`);
    say('Only `project.name` is mandatory. Everything else is opt-in; declare a section when the');
    say('project actually has that capability.');

    heading('Most-consumed options (how much of the framework a change moves)');
    const ranked = rankedConsumers().slice(0, 15);
    for (const row of ranked) {
        say(`  ${pad(row.key, 42)} ${summarizeCounts(row.counts)}`);
    }
    say('');
    say('Full ranking: `--consumers`.  One option: `--consumers=<key>`.');

    heading('Modes');
    say('  --sections            every option, one line each');
    say('  --section=<name>      one option in full (nested fields + consumers)');
    say('  --consumers[=<key>]   who reads what');
    say('  --docs                reference-doc catalog: purpose + regenerating owner');
    say('  --roots               relocatable roots, defaults, current values');
    say('  --skills              skills that read project-config, and what they read');
    say('  --current             what THIS project declares vs defaults');
    say('  --search=<term>       find an option, doc, or skill');
    say('  --json                machine-readable form of the selected mode');
}

function rankedConsumers() {
    const rows = [];
    for (const option of OPTIONS) {
        if (option.deprecated) continue;
        const keys = [option.key, ...option.children.map(c => c.key)];
        for (const key of keys) {
            const consumers = consumersFor(key);
            if (!consumers.length) continue;
            rows.push({ key, counts: countsByKind(consumers), total: consumers.length });
        }
    }
    // `docsRoots`, `docsRoots.plans` and `docsRoots.plans.path` are usually the same
    // mention counted three times. Keep the shortest path of an equal-count chain so the
    // ranking reads as "which option moves the framework", not as a nesting artefact.
    const totalByKey = new Map(rows.map(r => [r.key, r.total]));
    const collapsed = rows.filter(row => {
        const segments = row.key.split('.');
        for (let i = 1; i < segments.length; i += 1) {
            const ancestor = segments.slice(0, i).join('.');
            if (totalByKey.get(ancestor) === row.total) return false;
        }
        return true;
    });
    collapsed.sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
    return collapsed;
}

function renderSections() {
    say('# project-config options');
    say('');
    say('legend: [R] required · [D] deprecated · state = declared in this project or framework default');
    say('');
    for (const option of OPTIONS) {
        const flags = `${option.required ? '[R]' : '   '}${option.deprecated ? '[D]' : '   '}`;
        const state = declaredState(option.key);
        say(`${flags} ${pad(option.key, 26)} ${pad(option.type, 8)} ${pad(state, 9)} ${option.describe || '(no description in schema)'}`);
    }
    say('');
    say('Detail for one option: `--section=<name>`.');
}

function renderSection(name) {
    const option = OPTION_BY_KEY.get(name);
    if (!option) {
        const near = OPTIONS.map(o => o.key).filter(k => k.toLowerCase().includes(name.toLowerCase()));
        say(`Unknown option: ${name}`);
        if (near.length) say(`Did you mean: ${near.join(', ')}`);
        say('List them all with `--sections`.');
        return;
    }

    say(`# ${option.key}`);
    say('');
    say(`type       : ${option.type}`);
    say(`required   : ${option.required ? 'yes' : 'no'}`);
    if (option.deprecated) say('status     : DEPRECATED — do not add to a new project-config');
    say(`this project: ${declaredState(option.key)}`);
    if (option.describe) {
        say('');
        say(option.describe);
    }

    if (option.children.length) {
        heading('Fields');
        for (const child of option.children) {
            const flags = `${child.required ? '[R]' : '   '}${child.deprecated ? '[D]' : '   '}`;
            say(`${flags} ${pad(child.key, 46)} ${pad(child.type, 8)} ${child.describe}`);
        }
    }

    const token = Object.entries(PORTABILITY_TOKENS || {}).find(([, spec]) => spec.configPath === option.key
        || option.children.some(c => c.key === spec.configPath));
    if (token) {
        heading('Portability token');
        const [name2, spec] = token;
        say(`${name2} -> ${spec.configPath} (default "${spec.default}", current "${currentValue(spec.configPath) || spec.default}")`);
    }

    heading('Consumers');
    const direct = consumersFor(option.key);
    say(`${option.key}: ${summarizeCounts(countsByKind(direct))}`);
    for (const child of option.children) {
        const consumers = consumersFor(child.key);
        if (consumers.length) say(`${child.key}: ${summarizeCounts(countsByKind(consumers))}`);
    }
    say('');
    say(`Name them with \`--consumers=${option.key}\`.`);
}

function renderConsumers(key) {
    if (!key) {
        say('# Consumers per option (most-consumed first)');
        say('');
        for (const row of rankedConsumers()) {
            say(`  ${pad(row.key, 46)} ${pad(row.total, 4)}  ${summarizeCounts(row.counts)}`);
        }
        say('');
        say('Name the consumers of one option with `--consumers=<key>`.');
        return;
    }

    const consumers = consumersFor(key);
    say(`# Consumers of ${key}`);
    say('');
    if (!consumers.length) {
        say('No skill, agent, workflow, or hook references this option by name.');
        say('Either it is read indirectly through the loader, or it is unused — check `--sections` for the exact key spelling.');
        return;
    }
    say(summarizeCounts(countsByKind(consumers)));
    for (const kind of ['skill', 'agent', 'workflow', 'hook']) {
        const group = consumers.filter(c => c.kind === kind);
        if (!group.length) continue;
        heading(`${kind}s (${group.length})`);
        for (const item of group) say(`  ${item.name}`);
    }
}

function renderDocs() {
    const { rows, refRoot, declaredCount } = referenceDocCatalog();
    say('# Reference documents — which doc serves what purpose');
    say('');
    say(`Reference-doc root : ${refRoot || '(unresolved)'}  (docsRoots.projectReference.path)`);
    say(`Selected in config : ${declaredCount} referenceDocs entries`);
    say('');
    say('A reference doc is a GENERATED projection of the codebase that skills read instead of');
    say('re-deriving conventions. `referenceDocs[]` selects which ones this project keeps; each');
    say('entry carries the `purpose` string skills use to decide whether to read it. Built-in docs');
    say('are regenerated by their owning /scan target; custom docs declare scanTarget generic|manual.');

    const selected = rows.filter(r => r.selected);
    const available = rows.filter(r => !r.selected && r.kind === 'built-in');

    heading(`Selected by this project (${selected.length})`);
    for (const row of selected) {
        say(`  ${pad(row.filename, 44)} ${row.exists ? 'on disk ' : 'MISSING '} ${row.owner}`);
        if (row.purpose) say(`      purpose: ${row.purpose}`);
    }

    heading(`Built-in docs available but not selected (${available.length})`);
    for (const row of available) say(`  ${pad(row.filename, 44)} ${row.owner}`);

    heading('Other documentation roots and what they are for');
    for (const row of rootRows()) {
        const describe = describeForConfigPath(row.configPath);
        say(`  ${pad(row.current, 28)} ${describe || row.configPath}`);
    }
}

function describeForConfigPath(configPath) {
    const parts = configPath.split('.');
    let node = SCHEMA[parts[0]];
    for (let i = 1; i < parts.length && node; i += 1) {
        node = node.properties ? node.properties[parts[i]] : null;
    }
    // The leaf is usually `.path`; its parent carries the human purpose.
    if (node && node.describe) return firstLine(node.describe);
    const parentPath = parts.slice(0, -1).join('.');
    if (parentPath && parentPath !== configPath) return describeForConfigPath(parentPath);
    return '';
}

function renderRoots() {
    say('# Relocatable roots (portability tokens)');
    say('');
    say('Skills never hard-code these folders. Change the config path and every skill, hook, and');
    say('generated document follows it. An absent entry keeps the framework default.');
    say('');
    say(`  ${pad('TOKEN', 24)} ${pad('CONFIG PATH', 38)} ${pad('DEFAULT', 24)} CURRENT`);
    for (const row of rootRows()) {
        say(`  ${pad(row.token, 24)} ${pad(row.configPath, 38)} ${pad(row.default, 24)} ${row.current}${row.declared ? '' : '  (default)'}`);
    }
    heading('What each root holds');
    for (const row of rootRows()) {
        const describe = describeForConfigPath(row.configPath);
        if (describe) say(`  ${pad(row.token, 24)} ${describe}`);
    }
}

function renderSkills() {
    const { index } = consumerIndex();
    const bySkill = new Map();
    for (const [key, consumers] of index) {
        for (const consumer of consumers) {
            if (consumer.kind !== 'skill') continue;
            if (!bySkill.has(consumer.name)) bySkill.set(consumer.name, new Set());
            bySkill.get(consumer.name).add(key);
        }
    }
    const rows = [...bySkill.entries()]
        .map(([name, keys]) => ({ name, keys: [...keys].sort() }))
        .sort((a, b) => b.keys.length - a.keys.length || a.name.localeCompare(b.name));

    say('# Skills that read project-config');
    say('');
    say(`${rows.length} skill files reference at least one project-config option by name.`);
    say('');
    for (const row of rows) {
        say(`  ${pad(row.name, 42)} ${row.keys.length} option${row.keys.length === 1 ? '' : 's'}`);
        say(`      ${row.keys.join(', ')}`);
    }
}

function renderCurrent() {
    say('# What THIS project declares');
    say('');
    if (!PROJECT.exists) {
        say(`${PROJECT.configPath} does not exist. Run /project-init to create it.`);
        return;
    }
    if (PROJECT.error) {
        say(`${PROJECT.configPath} is not valid JSON: ${PROJECT.error}`);
        return;
    }

    const declared = OPTIONS.filter(o => declaredState(o.key) === 'declared');
    const missing = OPTIONS.filter(o => declaredState(o.key) !== 'declared' && !o.deprecated);
    const deprecatedDeclared = declared.filter(o => o.deprecated);

    say(`File      : ${PROJECT.configPath}`);
    say(`Declared  : ${declared.length} of ${OPTIONS.length} known sections`);
    say('');
    heading(`Declared (${declared.length})`);
    for (const option of declared) {
        say(`  ${pad(option.key, 26)} ${option.deprecated ? 'DEPRECATED — plan removal' : option.describe}`);
    }
    heading(`Not declared — framework default applies (${missing.length})`);
    for (const option of missing) say(`  ${pad(option.key, 26)} ${option.describe}`);
    if (deprecatedDeclared.length) {
        heading('Deprecated sections still present');
        for (const option of deprecatedDeclared) say(`  ${option.key}`);
    }
    heading('Unknown keys in the file (not in SCHEMA)');
    const known = new Set(Object.keys(SCHEMA));
    const unknown = Object.keys(PROJECT.config).filter(k => !known.has(k) && !k.startsWith('_'));
    say(unknown.length ? unknown.map(k => `  ${k}`).join('\n') : '  none');
    say('');
    say(`Validate structurally: node .claude/hooks/lib/project-config-schema.cjs --validate ${PROJECT.configPath}`);
}

function renderSearch(term) {
    const needle = term.toLowerCase();
    say(`# Search: ${term}`);

    const optionHits = [];
    for (const option of OPTIONS) {
        for (const candidate of [option, ...option.children]) {
            if (candidate.key.toLowerCase().includes(needle) || (candidate.describe || '').toLowerCase().includes(needle)) {
                optionHits.push(candidate);
            }
        }
    }
    heading(`Options (${optionHits.length})`);
    for (const hit of optionHits) say(`  ${pad(hit.key, 46)} ${hit.describe}`);

    const { rows } = referenceDocCatalog();
    const docHits = rows.filter(r => r.filename.toLowerCase().includes(needle) || (r.purpose || '').toLowerCase().includes(needle));
    heading(`Reference docs (${docHits.length})`);
    for (const hit of docHits) say(`  ${pad(hit.filename, 44)} ${hit.owner}`);

    const { index } = consumerIndex();
    const skillHits = new Set();
    for (const consumers of index.values()) {
        for (const consumer of consumers) {
            if (consumer.kind === 'skill' && consumer.name.toLowerCase().includes(needle)) skillHits.add(consumer.name);
        }
    }
    heading(`Skills (${skillHits.size})`);
    for (const name of [...skillHits].sort()) say(`  ${name}`);
}

// ── JSON form ───────────────────────────────────────────────────────────────
function jsonPayload(mode, argument) {
    const base = {
        projectRoot: ROOT,
        configPath: PROJECT.configPath,
        configExists: PROJECT.exists,
        projectName: PROJECT.config && PROJECT.config.project ? PROJECT.config.project.name || null : null
    };
    if (mode === 'docs') return { ...base, ...referenceDocCatalog() };
    if (mode === 'roots') return { ...base, roots: rootRows() };
    if (mode === 'consumers') {
        return argument
            ? { ...base, key: argument, consumers: consumersFor(argument) }
            : { ...base, ranking: rankedConsumers() };
    }
    if (mode === 'section') return { ...base, section: OPTION_BY_KEY.get(argument) || null };
    return {
        ...base,
        options: OPTIONS.map(o => ({
            ...o,
            state: declaredState(o.key),
            consumers: countsByKind(consumersFor(o.key))
        })),
        roots: rootRows()
    };
}

// ── CLI ─────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
    let mode = 'overview';
    let argument = null;
    let json = false;
    for (const raw of argv) {
        const arg = raw.trim();
        if (!arg) continue;
        if (arg === '--json') { json = true; continue; }
        if (arg === '--help' || arg === '-h' || arg === 'help') { mode = 'usage'; continue; }
        const [flag, value] = arg.startsWith('--') ? arg.slice(2).split('=') : [arg.replace(/^-+/, ''), undefined];
        switch (flag) {
            case 'overview': mode = 'overview'; break;
            case 'sections': mode = 'sections'; break;
            case 'section': mode = 'section'; argument = value || null; break;
            case 'consumers': mode = 'consumers'; argument = value || null; break;
            case 'docs': mode = 'docs'; break;
            case 'roots': mode = 'roots'; break;
            case 'skills': mode = 'skills'; break;
            case 'current': mode = 'current'; break;
            case 'search': mode = 'search'; argument = value || null; break;
            default:
                // A bare word is treated as a search term, so `--help styling` works.
                if (!arg.startsWith('-')) { mode = 'search'; argument = arg; }
                break;
        }
    }
    return { mode, argument, json };
}

function usage() {
    say('project-config help generator');
    say('');
    say('  node .claude/skills/project-config/scripts/project-config-help.cjs [mode] [--json]');
    say('');
    say('  (no args) | --overview   orientation + most-consumed options');
    say('  --sections               every option, one line each');
    say('  --section=<name>         one option in full');
    say('  --consumers[=<key>]      who reads what');
    say('  --docs                   reference-doc catalog and purposes');
    say('  --roots                  relocatable roots and defaults');
    say('  --skills                 skills that read project-config');
    say('  --current                declared vs defaulted in this project');
    say('  --search=<term>          find an option, doc, or skill');
}

function main() {
    const { mode, argument, json } = parseArgs(process.argv.slice(2));

    if (json) {
        console.log(JSON.stringify(jsonPayload(mode === 'usage' ? 'overview' : mode, argument), null, 2));
        return;
    }

    switch (mode) {
        case 'usage': usage(); break;
        case 'sections': renderSections(); break;
        case 'section':
            if (!argument) { say('--section requires a name, e.g. --section=docsRoots'); break; }
            renderSection(argument);
            break;
        case 'consumers': renderConsumers(argument); break;
        case 'docs': renderDocs(); break;
        case 'roots': renderRoots(); break;
        case 'skills': renderSkills(); break;
        case 'current': renderCurrent(); break;
        case 'search':
            if (!argument) { say('--search requires a term, e.g. --search=e2e'); break; }
            renderSearch(argument);
            break;
        default: renderOverview(); break;
    }

    console.log(out.join('\n'));
}

main();
