#!/usr/bin/env node
/**
 * project-help overview generator.
 *
 * Answers "what IS this — the framework installed here, and the project it is
 * installed in" from live sources only:
 *
 *   --framework   skills/agents/workflows/hooks inventory, entry points, mirrors
 *   --skills      the skill catalog, grouped by the [Category] tag it declares
 *   --structure   repo layout, workspace members, configured modules
 *   --stack       languages, framework, data stores, API, infrastructure
 *   --commands    the verification commands this project actually declares
 *   --docs        the documentation planes and which is authoritative for what
 *   --all         every section (default)
 *
 * Config-option help lives in the sibling generator:
 *   node .claude/skills/project-config/scripts/project-config-help.cjs
 *
 * PORTABILITY CONTRACT (PORT-001): plain `node` >= 18, `node:` built-ins only.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

function resolveProjectRoot() {
    const marker = path.join('.claude', 'skills');
    for (const start of [__dirname, process.cwd()]) {
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
    console.error('[project-help] Could not locate a .claude/skills directory from here.');
    process.exit(2);
}

// Documentation-plane defaults live ONLY in the loader's PORTABILITY_TOKENS; resolve through it
// (same pattern as project-config-help.cjs) so this overview never forks a second copy of them.
let loader;
try {
    loader = require(path.join(ROOT, '.claude', 'hooks', 'lib', 'project-config-loader.cjs'));
} catch (error) {
    console.error(`[project-help] Failed to load project-config-loader.cjs: ${error.message}`);
    process.exit(2);
}

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

function readJson(relative) {
    try {
        return JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf-8'));
    } catch {
        return null;
    }
}

function exists(relative) {
    return fs.existsSync(path.join(ROOT, relative));
}

function listDir(relative, onlyDirs) {
    try {
        return fs.readdirSync(path.join(ROOT, relative), { withFileTypes: true })
            .filter(entry => (onlyDirs ? entry.isDirectory() : true))
            .map(entry => entry.name)
            .sort();
    } catch {
        return [];
    }
}

function countFiles(relative, exts) {
    const acc = [];
    (function walk(dir) {
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }
        for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === 'node_modules' || entry.name === '.git') continue;
                walk(full);
            } else if (!exts || exts.includes(path.extname(entry.name))) {
                acc.push(full);
            }
        }
    })(path.join(ROOT, relative));
    return acc;
}

// ── config ──────────────────────────────────────────────────────────────────
const CK = readJson('.claude/.ck.json') || {};
const CONFIG_PATH = (CK.portability && CK.portability.projectConfigPath) || 'docs/project-config.json';
const CONFIG = readJson(CONFIG_PATH) || {};

// ── skill catalog, read from each SKILL.md frontmatter ──────────────────────
function frontmatterValue(content, key) {
    const match = content.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
    if (!match) return '';
    return match[1].trim().replace(/^['"]|['"]$/g, '');
}

let SKILLS_CACHE = null;
function skills() {
    if (SKILLS_CACHE) return SKILLS_CACHE;
    const base = path.join(ROOT, '.claude', 'skills');
    const rows = [];
    for (const name of listDir('.claude/skills', true)) {
        if (name.startsWith('_')) continue;
        const file = path.join(base, name, 'SKILL.md');
        if (!fs.existsSync(file)) continue;
        let content = '';
        try {
            content = fs.readFileSync(file, 'utf-8');
        } catch {
            continue;
        }
        const head = content.split(/^---\s*$/m)[1] || '';
        const description = frontmatterValue(head, 'description');
        const categoryMatch = description.match(/^\[([^\]]+)\]\s*/);
        rows.push({
            name,
            category: categoryMatch ? categoryMatch[1] : 'Uncategorized',
            description: description.replace(/^\[[^\]]+\]\s*/, ''),
            status: frontmatterValue(head, 'status') || 'active',
            hasScripts: fs.existsSync(path.join(base, name, 'scripts')),
            hasReferences: fs.existsSync(path.join(base, name, 'references'))
        });
    }
    SKILLS_CACHE = rows;
    return rows;
}

// ── sections ────────────────────────────────────────────────────────────────
function renderFramework() {
    const skillRows = skills();
    const agents = listDir('.claude/agents').filter(f => f.endsWith('.md'));
    const workflows = readJson('.claude/workflows.json');
    const workflowIds = workflows && typeof workflows === 'object'
        ? Object.keys(workflows.workflows || workflows).filter(k => !k.startsWith('$'))
        : [];
    const hooks = countFiles('.claude/hooks', ['.cjs', '.mjs', '.js']);
    const settings = readJson('.claude/settings.json') || {};

    say('# The portable .claude framework, as installed here');
    say('');
    say(`Project root      : ${ROOT}`);
    say(`Project           : ${(CONFIG.project && CONFIG.project.name) || '(project-config missing)'}`);
    say(`Config file       : ${CONFIG_PATH}${exists(CONFIG_PATH) ? '' : '  (MISSING — run /project-init)'}`);
    say(`Skills            : ${skillRows.length}`);
    say(`Agents            : ${agents.length}`);
    say(`Workflows         : ${workflowIds.length}`);
    say(`Hook modules      : ${hooks.length}`);
    say(`Hook events wired : ${Object.keys(settings.hooks || {}).join(', ') || 'none'}`);

    heading('What each layer is for');
    say('  .claude/skills/       A procedure you invoke as /<name>. SKILL.md is the contract;');
    say('                        scripts/ holds its deterministic helpers, references/ its detail.');
    say('  .claude/agents/       Sub-agent definitions. A sub-agent inherits knowledge ONLY from its');
    say('                        own .md file — never assume it can see this session.');
    say('  .claude/workflows*    Multi-skill canonical sequences, invoked via /start-workflow <id>.');
    say('  .claude/hooks/        Event-time enforcement (session start, pre/post tool use). This is');
    say('                        the layer that makes a convention stick instead of drift.');
    say('  .claude/scripts/      Catalog generation and shared SYNC-block injection.');
    say(`  ${CONFIG_PATH}   The single project-shaped input every skill reads.`);

    heading('Mirror topology (generated — never hand-edit)');
    const mirrors = [
        ['.claude/', 'CANONICAL source. Edit here.'],
        ['.agents/', exists('.agents') ? 'GENERATED Codex mirror of .claude/skills + agents.' : 'not present'],
        ['.codex/', exists('.codex') ? 'GENERATED Codex host config.' : 'not present'],
        ['AGENTS.md', exists('AGENTS.md') ? 'GENERATED root instruction mirror of CLAUDE.md.' : 'not present'],
        ['CLAUDE.md', exists('CLAUDE.md') ? 'Root instruction file (generated by /ai-context-refresh).' : 'not present']
    ];
    for (const [name, note] of mirrors) say(`  ${pad(name, 14)} ${note}`);
    if (exists('.claude/skills/sync-codex/scripts/run-codex-sync.mjs')) {
        say('');
        say('  Regenerate mirrors: node .claude/skills/sync-codex/scripts/run-codex-sync.mjs');
    }

    heading('Where to go next');
    say('  --skills                                   the full skill catalog');
    say('  /project-config --help                     every configurable option and what it moves');
    say('  node .claude/skills/project-config/scripts/project-config-help.cjs --consumers');
    say('  /project-init --help                       what setup decides, and what it would do here');
}

function renderSkills(filter) {
    const rows = skills().filter(row => !filter
        || row.name.toLowerCase().includes(filter.toLowerCase())
        || row.description.toLowerCase().includes(filter.toLowerCase()));

    say(`# Skill catalog${filter ? ` — matching "${filter}"` : ''} (${rows.length})`);
    say('');
    say('legend: [S] has scripts · [R] has references');

    const byCategory = new Map();
    for (const row of rows) {
        if (!byCategory.has(row.category)) byCategory.set(row.category, []);
        byCategory.get(row.category).push(row);
    }
    for (const [category, group] of [...byCategory.entries()].sort()) {
        heading(`${category} (${group.length})`);
        for (const row of group) {
            const flags = `${row.hasScripts ? '[S]' : '   '}${row.hasReferences ? '[R]' : '   '}`;
            const deprecated = row.status !== 'active' ? ` (${row.status.toUpperCase()})` : '';
            say(`  ${flags} /${pad(row.name, 32)}${deprecated} ${row.description}`);
        }
    }
}

function renderStructure() {
    say('# Repository structure');
    say('');
    const topLevel = listDir('.', true).filter(name => !name.startsWith('.') && name !== 'node_modules');
    say(`Top-level directories: ${topLevel.join(', ')}`);

    const workspaceFile = ['pnpm-workspace.yaml', 'package.json', 'turbo.json'].find(exists);
    if (workspaceFile) say(`Workspace manifest   : ${workspaceFile}`);

    for (const container of ['apps', 'packages', 'src', 'services', 'libs']) {
        const members = listDir(container, true);
        if (!members.length) continue;
        heading(`${container}/ (${members.length})`);
        say('  ' + members.join('  '));
        for (const member of members) {
            const nested = listDir(`${container}/${member}`, true);
            if (nested.length > 4 && !exists(`${container}/${member}/package.json`)) {
                say(`  ${container}/${member}/ (${nested.length}): ${nested.join(', ')}`);
            }
        }
    }

    const modules = CONFIG.modules;
    if (modules && typeof modules === 'object') {
        // `modules` is an array of {name, kind, pathRegex, description} in the current
        // schema; older configs used a name-keyed object. Normalise both.
        const entries = Array.isArray(modules)
            ? modules.map(m => [(m && m.name) || '(unnamed)', m])
            : Object.entries(modules);
        heading(`Configured modules (${entries.length}) — how skills bucket a changed path`);
        for (const [name, value] of entries) {
            const describe = value && typeof value === 'object'
                ? (value.description || value.purpose || Object.keys(value).join(', '))
                : String(value);
            const where = value && typeof value === 'object' && value.pathRegex ? ` [${value.pathRegex}]` : '';
            say(`  ${pad(name, 22)}${where}`);
            say(`      ${String(describe).slice(0, 150)}`);
        }
    }

    if (CONFIG.architectureRules) {
        heading('Architecture rules declared in project-config');
        for (const [name, value] of Object.entries(CONFIG.architectureRules)) {
            say(`  ${pad(name, 24)} ${JSON.stringify(value).slice(0, 140)}`);
        }
    }
}

function renderStack() {
    say('# Technical stack (declared in project-config)');
    say('');
    const project = CONFIG.project || {};
    say(`Name            : ${project.name || '(unset)'}`);
    if (project.description) say(`Description     : ${project.description}`);
    if (project.languages) say(`Languages       : ${[].concat(project.languages).join(', ')}`);
    if (project.packageManagers) say(`Package manager : ${[].concat(project.packageManagers).join(', ')}`);
    if (project.monorepoTool) say(`Monorepo tool   : ${project.monorepoTool}`);
    if (CONFIG.framework && CONFIG.framework.name) say(`Framework       : ${CONFIG.framework.name}`);
    if (CONFIG.styling && CONFIG.styling.approach) say(`Styling         : ${CONFIG.styling.approach}`);
    if (CONFIG.componentSystem && CONFIG.componentSystem.name) say(`Component system: ${CONFIG.componentSystem.name}`);
    if (CONFIG.designSystem && CONFIG.designSystem.canonicalDoc) say(`Design system   : ${CONFIG.designSystem.canonicalDoc}`);

    for (const [label, key] of [['Databases', 'databases'], ['Messaging', 'messaging'], ['API', 'api'], ['Infrastructure', 'infrastructure'], ['Testing', 'testing'], ['E2E', 'e2eTesting'], ['Localization', 'localization']]) {
        const section = CONFIG[key];
        if (!section || typeof section !== 'object') continue;
        heading(label);
        for (const [name, value] of Object.entries(section)) {
            if (name.startsWith('_')) continue;
            const rendered = typeof value === 'object' ? JSON.stringify(value) : String(value);
            say(`  ${pad(name, 24)} ${rendered.slice(0, 150)}`);
        }
    }
}

function renderCommands() {
    say('# Verification commands this project declares');
    say('');
    say('These come from project-config, not from framework defaults. Scope a run to the delta —');
    say('running more than the change requires is waste, running less is an unverified claim.');

    // Command maps are spelled `commands` or `runCommands` depending on the section,
    // so probe both rather than assuming one name.
    const sources = ['testing', 'e2eTesting', 'integrationTestVerify', 'codebaseHealth', 'formatting', 'framework'];
    for (const section of sources) {
        const node = CONFIG[section];
        if (!node || typeof node !== 'object') continue;
        for (const field of ['commands', 'runCommands']) {
            const commands = node[field];
            if (!commands || typeof commands !== 'object' || Array.isArray(commands)) continue;
            heading(`${section}.${field}`);
            for (const [name, command] of Object.entries(commands)) {
                if (name.startsWith('_')) continue;
                say(`  ${pad(name, 24)} ${typeof command === 'string' ? command : JSON.stringify(command)}`);
            }
        }
        for (const field of ['quickRunCommand', 'runScript', 'startupScript', 'systemCheckCommand']) {
            if (typeof node[field] === 'string') say(`  ${pad(`${section}.${field}`, 40)} ${node[field]}`);
        }
    }

    const e2e = CONFIG.e2eTesting && CONFIG.e2eTesting.execution;
    if (e2e) {
        heading('E2E execution profile');
        say(`  surfaces  : ${[].concat(e2e.surfaceIds || []).join(', ') || '(none)'}`);
        if (e2e.auth) say(`  auth      : ${JSON.stringify(e2e.auth)}`);
        if (e2e.data) say(`  data      : ${JSON.stringify(e2e.data)}`);
        if (e2e.browser) say(`  browser   : ${JSON.stringify(e2e.browser)}`);
        if (e2e.evidence) say(`  evidence  : ${JSON.stringify(e2e.evidence)}`);
        if (e2e.convergence) say(`  converge  : ${JSON.stringify(e2e.convergence)}`);
    }
}

function renderDocs() {
    say('# Documentation planes — which one is authoritative for what');
    say('');
    const root = token => loader.resolvePortabilityToken(token, CONFIG);
    const rows = [
        ['Business specs', root('SPEC_ROOT'), 'WHAT the system must do. The contract behind every test.'],
        ['Technical specs', root('SPEC_ROOT_TECHNICAL'), 'Derived technical view of the business specs.'],
        ['Reference docs', root('REF_DOCS_ROOT'), 'GENERATED projections of the codebase that skills read instead of re-deriving conventions.'],
        ['Decisions (ADR)', root('ADR_ROOT'), 'WHY a choice was made. Durable, never renumbered.'],
        ['Templates', root('TEMPLATES_ROOT'), 'Document skeletons for the artifacts above.'],
        ['Plans', root('PLANS_ROOT'), 'Implementation plans produced by /plan.'],
        ['Team artifacts', root('TEAM_ARTIFACTS_ROOT'), 'Initiatives, tasks, stories — product-side artifacts.'],
        ['Product roadmap', root('PRODUCT_ROADMAP_DOC'), 'Milestone selection. Written only by an explicit roadmap request.'],
        ['Disposable output', 'tmp/', 'Regenerable output: reports, evidence, logs, traces. Never source, never docs.']
    ];
    say(`  ${pad('PLANE', 18)} ${pad('PATH', 28)} PURPOSE`);
    for (const [label, location, purpose] of rows) {
        say(`  ${pad(label, 18)} ${pad(location, 28)} ${purpose}`);
        if (!exists(location.replace(/\/$/, ''))) say(`  ${pad('', 18)} ${pad('', 28)} (not present in this repo)`);
    }

    heading('Root instruction files');
    for (const file of ['CLAUDE.md', 'AGENTS.md', 'README.md']) {
        if (!exists(file)) continue;
        const size = fs.statSync(path.join(ROOT, file)).size;
        say(`  ${pad(file, 14)} ${(size / 1024).toFixed(1)} KB`);
    }

    say('');
    say('Per-document purposes and their regenerating owners:');
    say('  node .claude/skills/project-config/scripts/project-config-help.cjs --docs');
}

// ── CLI ─────────────────────────────────────────────────────────────────────
function main() {
    const argv = process.argv.slice(2);
    let mode = 'all';
    let filter = null;
    for (const raw of argv) {
        const arg = raw.trim();
        if (!arg) continue;
        const [flag, value] = arg.startsWith('--') ? arg.slice(2).split('=') : [arg.replace(/^-+/, ''), undefined];
        if (['framework', 'skills', 'structure', 'stack', 'commands', 'docs', 'all'].includes(flag)) {
            mode = flag;
            if (value) filter = value;
        } else if (flag === 'search') {
            mode = 'skills';
            filter = value || null;
        } else if (!arg.startsWith('-')) {
            mode = 'skills';
            filter = arg;
        }
    }

    const sections = {
        framework: renderFramework,
        skills: () => renderSkills(filter),
        structure: renderStructure,
        stack: renderStack,
        commands: renderCommands,
        docs: renderDocs
    };

    if (mode === 'all') {
        renderFramework();
        say('');
        say('');
        renderStructure();
        say('');
        say('');
        renderStack();
        say('');
        say('');
        renderCommands();
        say('');
        say('');
        renderDocs();
    } else {
        sections[mode]();
    }

    console.log(out.join('\n'));
}

main();
