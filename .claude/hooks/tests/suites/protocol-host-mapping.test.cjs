'use strict';

/**
 * Protocol delivery host mapping — spec ContextDelivery/README.ProtocolDelivery.md §8 "Host
 * Registration Tests" under the business spec root (default `docs/specs`; `specRoots.business.path`
 * in `docs/project-config.json` overrides it).
 *
 * Guards: the primary host (Claude) registers every skill-load group's entry file and the skill overlay
 * reminder, with no arguments, on the skill-use, skill-file-read, command-expansion and agent-start
 * load paths, and the universal bins on the prompt and agent-start events (BR-PDL-15); only its
 * file-read registrations carry the skill-file condition, so an ordinary read starts no protocol
 * process (BR-PDL-09); the agent-start registration carries no agent-type filter, so every agent type
 * reaches the steps (BR-PDL-08); the second host (Codex) maps delivery to its prompt, shell-read and
 * agent-start events without changing any existing step (BR-PDL-06) and starts delivery steps without
 * the version-control lookup (BR-PDL-09); the third host (OpenCode) bridges every group on its skill
 * tool and file read, carries the file-read condition into its table and reports the other load
 * paths as skipped (BR-PDL-15), and resolves a skill named in its own field (BR-PDL-10); the second-host skill copy carries full text only for protocols on the inline list,
 * which is decided empty, and a listed protocol is never also delivered there (BR-PDL-06). Each test
 * name starts with its TC id (spec join key).
 *
 * Portability: TC-PDL-021, 058 and 060 assert this framework repo's own shipped settings and agents,
 * so they skip elsewhere through the synchronous framework-repo guard (`skip` is read while the list
 * is built; an async guard would report a false pass). Every other case renders a temp fixture
 * project (its own settings and hook tree) with HOME, USERPROFILE, TMPDIR, TEMP and TMP pointed at the
 * temp dir and inherited switches (CK_*, CLAUDE_*, CODEX_*, OPENCODE_*, NODE_OPTIONS) removed.
 * Commands run through the platform shell (cmd.exe on Windows, /bin/sh elsewhere), exactly as the
 * hosts run them; paths are built with node:path. Fixtures are removed in `finally`.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const { childEnv, makeHookTreeProject, removeTempDir } = require('../lib/hook-runner.cjs');
const { isFrameworkRepo } = require('../lib/framework-repo-guard.cjs');

const HOOKS_DIR = path.resolve(__dirname, '..', '..');
const CLAUDE_DIR = path.resolve(HOOKS_DIR, '..');
const REPO_ROOT = path.resolve(CLAUDE_DIR, '..');
const CODEX_SYNC = path.join(CLAUDE_DIR, 'scripts', 'codex', 'sync-hooks.mjs');
const OPENCODE_SYNC = path.join(CLAUDE_DIR, 'scripts', 'opencode', 'sync-hooks.mjs');
const GUIDE_CARRIER_REL = path.join('.claude', 'scripts', 'lib', 'protocol-guide-carrier.cjs');

// The five skill-load groups have an entry file each; the universal bundle is delivered by bins (universal-hook-delivery.test.cjs).
const ENTRY_GROUPS = ['review', 'evidence-trace', 'workflow-task', 'spec-test', 'design'];
const INDEX_GROUPS = [...ENTRY_GROUPS, 'universal'];
const BIN_COUNT = 4;
const BINS = Array.from({ length: BIN_COUNT }, (_, i) => i + 1);
const OVERLAY_FILE = 'skill-overlay-remind.cjs';
const READ_CONDITION = 'Read(**/SKILL.md)';
const CONTEXT_LIMIT = 3000;
const PROTOCOLS_DIR = '.claude/skills/shared/protocols';
const SPAWN_TIMEOUT_MS = 60000;

// Computed synchronously at load: the runner reads `skip` before it runs a test.
const LIVE_SKIP = isFrameworkRepo(REPO_ROOT) ? false : 'asserts the framework repo\'s own settings and agents (framework-repo signal)';

const entryCommand = group => `node "$CLAUDE_PROJECT_DIR"/.claude/hooks/protocol-inject-${group}.cjs`;
const entryRel = group => `.claude/hooks/protocol-inject-${group}.cjs`;
const binName = n => `universal-${n}`;
const overlayCommand = `node "$CLAUDE_PROJECT_DIR"/.claude/hooks/${OVERLAY_FILE}`;
const overlayRel = `.claude/hooks/${OVERLAY_FILE}`;
/** A skill-load entry, the overlay reminder or a universal bin: the handlers the host mapping treats as delivery steps. */
const isProtocolCommand = command => /(?:protocol-inject-[a-z0-9-]+|skill-overlay-remind)\.cjs/.test(String(command || ''));
/** The commands of one skill-load registration: the five groups, then the overlay reminder. */
const skillLoadCommands = () => [...ENTRY_GROUPS.map(entryCommand), overlayCommand];
const skillLoadRels = () => [...ENTRY_GROUPS.map(entryRel), overlayRel];

// ── independent second-host JavaScript launcher contracts ────────────────────
// Fixed JS constructors protect exact hook argv; POSIX adds its runtime resolver,
// while commandWindows carries this native Node command.
const GIT_STEPS = [
    "const gitHelperPath = path.join(root, '.claude', 'hooks', 'lib', 'windows-git.cjs');",
    "try { if (fs.existsSync(gitHelperPath)) { const git = require(gitHelperPath); const result = git.resolveWindowsGit(); if (result && result.outcome === git.OUTCOMES.READY) Object.assign(process.env, git.withGitEnvironment(process.env, result.capability)); } } catch {}"
];
const TODAY_LAUNCHER = [
    "const fs = require('node:fs');",
    "const path = require('node:path');",
    'const hookPath = process.argv[1];',
    'let root = process.cwd();',
    'for (let candidate = root; ; candidate = path.dirname(candidate)) {',
    "if (fs.existsSync(path.join(candidate, '.claude'))) { root = candidate; break; }",
    'if (path.dirname(candidate) === candidate) break;',
    '}',
    'process.chdir(root);',
    'process.env.CLAUDE_PROJECT_DIR = root;',
    ...GIT_STEPS,
    'require(path.join(root, hookPath));'
].join(' ');
const LEAN_LAUNCHER = TODAY_LAUNCHER.replace(` ${GIT_STEPS.join(' ')}`, '');
const todayRender = hookRel => `node -e "${TODAY_LAUNCHER}" -- ${JSON.stringify(hookRel)}`;
const leanRender = hookRel => `node -e "${LEAN_LAUNCHER}" -- ${JSON.stringify(hookRel)}`;
const quotePosix = value => `'${value.replaceAll("'", "'\\''")}'`;
const nativeCommand = handler => process.platform === 'win32' ? handler.commandWindows : handler.command;
// Existing steps that run no Git and start before every shell call, so they share the lean launcher.
const LEAN_EXISTING_HOOKS = new Set(['.claude/hooks/failure-investigation-remind.cjs']);

function assertLauncher(handler, hookRel, lean, label) {
    const javascript = lean ? LEAN_LAUNCHER : TODAY_LAUNCHER;
    assert.equal(handler.commandWindows, (lean ? leanRender : todayRender)(hookRel), `${label}: exact native JS/hook argv`);
    assert.match(handler.command, /^\/bin\/sh -c '/, `${label}: POSIX runtime resolver prefix`);
    const suffix = ` ck-node -e ${quotePosix(javascript)} -- ${quotePosix(hookRel)}`;
    assert.ok(handler.command.endsWith(suffix), `${label}: exact quoted JS/hook suffix with no extra argv`);
    assert.ok(handler.command.includes('exec "$ck_node" "$@";'), `${label}: resolver forwards exact argv`);
    if (lean) {
        assert.ok(!handler.command.includes('windows-git.cjs'), `${label}: no Git step`);
        assert.ok(!handler.commandWindows.includes('windows-git.cjs'), `${label}: no native Git step`);
    }
}


// ── environment ─────────────────────────────────────────────────────────────

function scrubbedEnv(temp, extra = {}) {
    const overrides = { HOME: temp, USERPROFILE: temp, TMPDIR: temp, TEMP: temp, TMP: temp, NODE_OPTIONS: undefined };
    for (const key of Object.keys(process.env)) {
        if (/^(?:CK_|CLAUDE_|CODEX_|OPENCODE_)/i.test(key)) overrides[key] = undefined;
    }
    return childEnv({ ...overrides, ...extra });
}

function writeFile(file, content) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
}

// ── settings helpers ────────────────────────────────────────────────────────

function readLiveSettings() {
    return JSON.parse(fs.readFileSync(path.join(CLAUDE_DIR, 'settings.json'), 'utf8'));
}

/** Every protocol handler registered on `event`: [{ group, matcher, handler }]. */
function protocolHandlers(settings, event) {
    return (settings.hooks?.[event] || []).flatMap(group => (group.hooks || [])
        .filter(handler => isProtocolCommand(handler.command))
        .map(handler => ({ matcher: group.matcher ?? null, handler })));
}

/** Settings with every protocol handler removed (empty groups and events dropped). */
function withoutProtocol(settings) {
    const hooks = {};
    for (const [event, groups] of Object.entries(settings.hooks || {})) {
        const kept = groups
            .map(group => ({ ...group, hooks: (group.hooks || []).filter(handler => !isProtocolCommand(handler.command)) }))
            .filter(group => group.hooks.length > 0);
        if (kept.length > 0) hooks[event] = kept;
    }
    return { ...settings, hooks };
}

/** A rendered Codex mirror with every protocol handler removed (empty groups and events dropped). */
function mirrorWithoutProtocol(mirror) {
    return withoutProtocol(mirror).hooks;
}

/** The settings a temp copy of the framework ships: existing steps plus the delivery registrations. */
function fixtureSettings() {
    const cmd = rel => `node "$CLAUDE_PROJECT_DIR"/.claude/hooks/${rel}`;
    const protocol = (extra = {}) => skillLoadCommands().map(command => ({ command, ...extra, type: 'command' }));
    const bins = BINS.map(n => ({ command: entryCommand(binName(n)), type: 'command' }));
    return {
        hooks: {
            PostToolUse: [
                { hooks: [{ command: cmd('file-convention-inject.cjs'), type: 'command' }], matcher: 'Read|Edit|Write|MultiEdit|NotebookEdit' },
                { hooks: protocol(), matcher: 'Skill' },
                { hooks: protocol({ if: READ_CONDITION }), matcher: 'Read' }
            ],
            PreToolUse: [
                {
                    hooks: [{ command: cmd('doc-sync-gate.cjs'), type: 'command' }, { command: cmd('review-commit-gate.cjs'), type: 'command' }],
                    matcher: 'Bash'
                }
            ],
            SessionEnd: [{ hooks: [{ command: cmd('notifications/notify.cjs'), timeout: 3, type: 'command' }] }],
            SessionStart: [{ hooks: bins, matcher: 'compact|clear' }],
            SubagentStart: [{ hooks: [...ENTRY_GROUPS.map(group => ({ command: entryCommand(group), type: 'command' })), ...bins] }],
            UserPromptExpansion: [{ hooks: protocol() }],
            // The workflow route is two prompt hooks, one registration group each (the gate, then the catalog).
            UserPromptSubmit: [
                { hooks: bins },
                { hooks: [{ command: cmd('workflow-route-inject.cjs'), type: 'command' }] },
                { hooks: [{ command: cmd('workflow-catalog-inject.cjs'), type: 'command' }] }
            ]
        }
    };
}

/** Render the Codex mirror for `settings` in a fresh project `root` through the real generator. */
function renderCodex(root, settings, temp) {
    writeFile(path.join(root, '.claude', 'settings.json'), `${JSON.stringify(settings, null, 2)}\n`);
    const result = spawnSync(process.execPath, [CODEX_SYNC], {
        cwd: root,
        env: scrubbedEnv(temp, { CLAUDE_PROJECT_DIR: root }),
        encoding: 'utf8',
        windowsHide: true,
        timeout: SPAWN_TIMEOUT_MS
    });
    assert.equal(result.status, 0, `codex sync failed: ${result.stderr}`);
    return {
        mirror: JSON.parse(fs.readFileSync(path.join(root, '.codex', 'hooks.json'), 'utf8')),
        report: JSON.parse(fs.readFileSync(path.join(root, 'tmp', 'hooks.sync.report.json'), 'utf8'))
    };
}

/**
 * SEC-10: with protocol delivery registered, every existing handler renders exactly as the
 * settings without it render, including both platform commands and all handler fields.
 * Independent launcher constructors additionally protect each existing hook's exact JS/argv.
 */
function assertExistingStepsUnchanged(settings, temp, label) {
    const withRoot = fs.mkdtempSync(path.join(temp, 'with-'));
    const withoutRoot = fs.mkdtempSync(path.join(temp, 'without-'));
    const withProtocol = renderCodex(withRoot, settings, temp).mirror;
    const baseline = renderCodex(withoutRoot, withoutProtocol(settings), temp).mirror.hooks;
    const stripped = mirrorWithoutProtocol(withProtocol);
    assert.deepEqual(Object.keys(stripped), Object.keys(baseline), `${label}: existing Codex events changed`);
    for (const [event, groups] of Object.entries(baseline)) {
        assert.equal(stripped[event].length, groups.length, `${label}: ${event} group count changed`);
        groups.forEach((group, index) => {
            assert.equal(JSON.stringify(stripped[event][index]), JSON.stringify(group),
                `${label}: existing step changed: ${event}[${index}] ${group.hooks.map(h => h.command.slice(-60)).join(', ')}`);
            for (const handler of group.hooks) {
                // The whole handler, not only its command: an added field (say, the delivery
                // allowance leaking onto every handler) changes the hash the host trusts.
                if (!handler.command.startsWith('/bin/sh -c ') && !Object.hasOwn(handler, 'commandWindows')) continue;
                assert.equal(typeof handler.commandWindows, 'string', `${label}: native Windows launcher missing`);
                const hookRel = /-- "([^"\n]+)"$/.exec(handler.commandWindows)?.[1];
                assert.ok(hookRel, `${label}: existing launcher has exactly one hook argument`);
                assertLauncher(handler, hookRel, LEAN_EXISTING_HOOKS.has(hookRel), `${label}: ${hookRel}`);
                assert.deepEqual(Object.keys(handler), ['type', 'command', 'commandWindows', ...(Object.hasOwn(handler, 'timeout') ? ['timeout'] : [])],
                    `${label}: existing handler fields changed`);
                assert.equal(handler.type, 'command');
            }
        });
    }
    return withProtocol;
}

// ── delivery fixture (a project the real entry files can deliver in) ───────

const marker = tag => `[[FULL:${tag}]]`;

function guideBlock(tags) {
    const lines = tags.map(tag => `- \`${tag}\` — Fixture summary for ${tag}; when it applies → ${PROTOCOLS_DIR}/${tag}.md`);
    return ['<!-- PROTOCOL-GUIDES:START -->', ...lines, '<!-- PROTOCOL-GUIDES:END -->'].join('\n');
}

/** Protocol index, group data, a converted skill (both skill roots) and the guide recognizer. */
function writeDeliveryFixture(root, tags = ['review-alpha']) {
    const rows = tags.map(tag => ({ tag, group: 'review' })).map(spec => {
        writeFile(path.join(root, ...PROTOCOLS_DIR.split('/'), `${spec.tag}.md`), `> **${spec.tag}** — fixture protocol ${marker(spec.tag)}\n`);
        return { ...spec, summary: `Fixture summary for ${spec.tag}`, when: 'when it applies', file: `${PROTOCOLS_DIR}/${spec.tag}.md`, parts: [{ file: `${PROTOCOLS_DIR}/${spec.tag}.md` }] };
    });
    writeFile(path.join(root, ...PROTOCOLS_DIR.split('/'), 'index.json'), JSON.stringify({ binChars: 9500, groups: INDEX_GROUPS, tags: rows }, null, 2));
    writeFile(path.join(root, '.claude', 'skills', 'shared', 'protocol-groups.json'), JSON.stringify({
        version: 1,
        binChars: 9500,
        groups: Object.fromEntries(INDEX_GROUPS.map(group => [group, { description: `${group} fixture`, tags: {} }])),
        inlineSkills: []
    }, null, 2));
    const skill = `---\nname: conv-a\ndescription: fixture skill\n---\n\n# conv-a\n\n${guideBlock(tags)}\n`;
    writeFile(path.join(root, '.claude', 'skills', 'conv-a', 'SKILL.md'), skill);
    writeFile(path.join(root, '.agents', 'skills', 'conv-a', 'SKILL.md'), skill);
    fs.mkdirSync(path.dirname(path.join(root, GUIDE_CARRIER_REL)), { recursive: true });
    fs.copyFileSync(path.join(REPO_ROOT, GUIDE_CARRIER_REL), path.join(root, GUIDE_CARRIER_REL));
}

/** Run a rendered host command through the platform shell, from `cwd`, with `input` on stdin. */
function runShellCommand(command, cwd, input, env) {
    const result = spawnSync(command, { cwd, env, input: JSON.stringify(input), encoding: 'utf8', shell: true, windowsHide: true, timeout: SPAWN_TIMEOUT_MS });
    return { code: result.status, stdout: result.stdout || '', stderr: result.stderr || '' };
}

function contextOf(stdout) {
    return stdout ? JSON.parse(stdout).hookSpecificOutput.additionalContext : '';
}

// ── module-load logger (the TC-PDL-067 technique) ──────────────────────────

const PRELOAD_SOURCE = `'use strict';
const Module = require('module');
const fs = require('fs');
const log = process.env.PDL_LOAD_LOG;
const record = entry => { try { fs.appendFileSync(log, JSON.stringify(entry) + '\\n'); } catch {} };
const load = Module._load;
Module._load = function (request, parent, isMain) {
    let file = request;
    try { file = Module._resolveFilename(request, parent, isMain); } catch {}
    record({ type: 'load', file });
    return load.apply(this, arguments);
};
const cp = require('child_process');
for (const name of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']) {
    const original = cp[name];
    cp[name] = function (...args) {
        record({ type: 'spawn', fn: name, command: String(args[0]) });
        return original.apply(this, args);
    };
}
`;

function readLog(file) {
    if (!fs.existsSync(file)) return [];
    return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
}

// ── live framework data (TC-PDL-060) ────────────────────────────────────────

/** Frontmatter `name` of every agent definition that declares `skills:`. */
function skillPreloadingAgents(agentsDir) {
    const names = [];
    for (const file of fs.readdirSync(agentsDir).filter(name => name.endsWith('.md'))) {
        const lines = fs.readFileSync(path.join(agentsDir, file), 'utf8').replace(/^﻿/, '').split(/\r?\n/);
        if (lines[0].trim() !== '---') continue;
        const end = lines.findIndex((line, i) => i > 0 && line.trim() === '---');
        const front = lines.slice(1, end < 0 ? 0 : end);
        const name = front.map(line => /^name:\s*(.+?)\s*$/.exec(line)).find(Boolean)?.[1].replace(/^(['"])(.*)\1$/, '$2');
        if (name && front.some(line => /^skills:/.test(line))) names.push(name);
    }
    return names;
}

// ── second-host inline list fixture (TC-PDL-024, TC-PDL-025) ────────────────

const CODEX_MIGRATE = path.join(CLAUDE_DIR, 'scripts', 'codex', 'migrate-claude-to-codex.mjs');
const CODEX_COMPAT = path.join(CLAUDE_DIR, 'scripts', 'codex', 'compat-rewrite.mjs');
const INLINE_TAGS = ['review-alpha', 'review-beta'];
const canonicalBody = tag => `> **${tag}** — canonical fixture body ${marker(tag)}\n>\n> Second line of ${tag}.`;

/** The guide block of a skill text, with each guide line's path reduced to its file name. */
function normalizeGuideBlock(text) {
    const block = /<!-- PROTOCOL-GUIDES:START -->[\s\S]*?<!-- PROTOCOL-GUIDES:END -->/.exec(String(text).replace(/\r\n?/g, '\n'));
    assert.ok(block, 'the skill has a guide block');
    return block[0].replace(/→ \S*\/([^/\s]+\.md)$/gm, '→ $1');
}

/**
 * Write a converted skill, the canonical protocol source and the delivery data into `root`, then
 * generate the second-host skill copy through the real generator (`materializeSkillMirror`) in a
 * scrubbed child whose project root is `root`. `inlineTags` null = the shipped default list.
 */
function generateInlineMirror(root, inlineTags) {
    writeDeliveryFixture(root, INLINE_TAGS);
    writeFile(path.join(root, '.claude', 'skills', 'shared', 'sync-inline-versions.md'),
        `# Canonical fixture\n\n${INLINE_TAGS.map(tag => `## SYNC:${tag}\n\n${canonicalBody(tag)}`).join('\n\n---\n\n')}\n`);
    fs.rmSync(path.join(root, '.agents'), { recursive: true, force: true });
    const temp = fs.mkdtempSync(path.join(root, 'tmp-run-'));
    const driver = path.join(temp, 'drive-mirror.mjs');
    fs.writeFileSync(driver, [
        "import { pathToFileURL } from 'node:url';",
        'const [migratePath, compatPath, target, listJson] = process.argv.slice(2);',
        'const { materializeSkillMirror } = await import(pathToFileURL(migratePath).href);',
        'const { buildSkillReferenceMap } = await import(pathToFileURL(compatPath).href);',
        'const list = JSON.parse(listJson);',
        "await materializeSkillMirror(target, buildSkillReferenceMap(['conv-a', 'shared']), list === null ? {} : { inlineTags: list });"
    ].join('\n'));
    const target = path.join(root, '.agents', 'skills');
    const run = spawnSync(process.execPath, [driver, CODEX_MIGRATE, CODEX_COMPAT, target, JSON.stringify(inlineTags)], {
        cwd: root, env: scrubbedEnv(temp, { CLAUDE_PROJECT_DIR: root }), encoding: 'utf8', windowsHide: true, timeout: SPAWN_TIMEOUT_MS
    });
    assert.equal(run.status, 0, `second-host copy failed: ${run.stderr}`);
    return {
        source: fs.readFileSync(path.join(root, '.claude', 'skills', 'conv-a', 'SKILL.md'), 'utf8'),
        mirrorSkill: fs.readFileSync(path.join(target, 'conv-a', 'SKILL.md'), 'utf8')
    };
}

/** The review group's second-host delivery plan for a prompt naming the fixture skill. */
function planCodexReviewDelivery(root) {
    const { planDelivery } = require(path.join(HOOKS_DIR, 'lib', 'protocol-delivery.cjs'));
    return planDelivery({ hook_event_name: 'UserPromptSubmit', prompt: 'please use $conv-a here', turn_id: 't1', session_id: 's1', cwd: root },
        'review', { projectRoot: root, host: 'codex' });
}

// ── tests ───────────────────────────────────────────────────────────────────

const tests = [
    {
        name: 'TC-PDL-021 the primary host registers every skill-load group and the overlay reminder on skill use, skill-file read and command expansion, and the universal bins on prompt, agent start and the compact session start',
        skip: LIVE_SKIP,
        fn: () => {
            // Given the shipped primary-host settings and the protocol group data
            const settings = readLiveSettings();
            const groupData = JSON.parse(fs.readFileSync(path.join(CLAUDE_DIR, 'skills', 'shared', 'protocol-groups.json'), 'utf8'));
            assert.deepEqual(Object.keys(groupData.groups), INDEX_GROUPS, 'the six delivery groups');
            assert.equal(groupData.groups.universal.bins.length, BIN_COUNT, 'the shipped universal layout has the bins this suite expects');
            const loadPaths = [
                ['PostToolUse', 'Skill'],
                ['PostToolUse', 'Read'],
                ['UserPromptExpansion', null]
            ];
            for (const [event, matcher] of loadPaths) {
                // When the registrations of one load path are listed
                const handlers = protocolHandlers(settings, event).filter(entry => entry.matcher === matcher);
                const commands = handlers.map(entry => entry.handler.command);
                // Then each group's entry file and the overlay reminder are registered exactly once, with no arguments, and exist
                assert.deepEqual(commands, skillLoadCommands(), `${event} ${matcher || '(no matcher)'}: one bare registration per group, then the overlay reminder`);
                for (const rel of skillLoadRels()) assert.ok(fs.existsSync(path.join(REPO_ROOT, ...rel.split('/'))), `${rel} exists`);
                // And all share one registration group per load path
                assert.equal(new Set(handlers.map(entry => entry.matcher)).size, 1, `${event}: one registration group`);
            }
            // And the agent start carries the five groups and then the four bins, in one registration group
            const agentStart = protocolHandlers(settings, 'SubagentStart');
            assert.deepEqual(agentStart.map(entry => entry.handler.command), [...ENTRY_GROUPS, ...BINS.map(binName)].map(entryCommand), 'SubagentStart: groups then bins');
            assert.equal(new Set(agentStart.map(entry => entry.matcher)).size, 1, 'SubagentStart: one registration group');
            // And the prompt event carries the bins, one bare registration each, in a registration group of their own that comes first
            const prompt = protocolHandlers(settings, 'UserPromptSubmit');
            assert.deepEqual(prompt.map(entry => entry.handler.command), BINS.map(binName).map(entryCommand), 'UserPromptSubmit: the bins only');
            assert.equal(settings.hooks.UserPromptSubmit[0].hooks.length, BIN_COUNT, 'the bins are the first prompt registration group');
            for (const n of BINS) assert.ok(fs.existsSync(path.join(HOOKS_DIR, `protocol-inject-${binName(n)}.cjs`)), `bin ${n} entry file exists`);
            assert.equal(fs.existsSync(path.join(HOOKS_DIR, 'protocol-inject-universal.cjs')), false, 'the retired single universal entry file is gone');
            // And the bins are also registered on the session start of a compaction or a clear (the `compact|clear` sources only), so a
            // compaction that no prompt follows still re-delivers the bundle; nothing else protocol-related sits there
            const sessionStart = protocolHandlers(settings, 'SessionStart');
            assert.deepEqual(sessionStart.map(entry => entry.handler.command), BINS.map(binName).map(entryCommand), 'SessionStart: the bins only');
            assert.deepEqual([...new Set(sessionStart.map(entry => entry.matcher))], ['compact|clear'], 'SessionStart: the compact and clear sources only, never startup or resume');
            // And no protocol entry is registered anywhere else
            const elsewhere = Object.keys(settings.hooks).filter(event => !['PostToolUse', 'UserPromptExpansion', 'SubagentStart', 'UserPromptSubmit', 'SessionStart'].includes(event))
                .filter(event => protocolHandlers(settings, event).length > 0);
            assert.deepEqual(elsewhere, [], 'protocol entries on an unexpected event');
            assert.equal(protocolHandlers(settings, 'PostToolUse').length, (ENTRY_GROUPS.length + 1) * 2, 'PostToolUse: Skill and Read only');
        }
    },
    {
        name: 'TC-PDL-058 only primary-host file-read registrations carry the skill-file condition',
        skip: LIVE_SKIP,
        fn: () => {
            // Given the shipped primary-host settings
            const settings = readLiveSettings();
            // When every protocol handler is listed with its event and matcher
            const all = Object.keys(settings.hooks).flatMap(event => protocolHandlers(settings, event).map(entry => ({ event, ...entry })));
            const perLoadPath = ENTRY_GROUPS.length + 1;
            assert.equal(all.length, perLoadPath * 3 + (ENTRY_GROUPS.length + BIN_COUNT) + BIN_COUNT + BIN_COUNT, 'three skill-load paths, the agent start, the prompt event and the compact session start');
            // Then each handler under PostToolUse `Read` has exactly the skill-file condition
            const reads = all.filter(entry => entry.event === 'PostToolUse' && entry.matcher === 'Read');
            assert.equal(reads.length, perLoadPath);
            for (const entry of reads) assert.equal(entry.handler.if, READ_CONDITION, `${entry.handler.command}: file-read condition`);
            // And no other protocol handler carries a condition (on a non-tool event it would never run)
            for (const entry of all.filter(item => !(item.event === 'PostToolUse' && item.matcher === 'Read'))) {
                assert.equal(Object.hasOwn(entry.handler, 'if'), false, `${entry.event} ${entry.matcher}: ${entry.handler.command} must carry no condition`);
            }
        }
    },
    {
        name: 'TC-PDL-060 the agent-start registration admits every agent type (skill preloaders, Explore, Plan, general-purpose and any custom agent: each receives the universal bins)',
        skip: LIVE_SKIP,
        fn: () => {
            // Given the shipped agent definitions and settings; the hooks decide per agent whether to deliver
            // (skill preload for the group entries, every agent for the universal bins)
            const preloaders = skillPreloadingAgents(path.join(CLAUDE_DIR, 'agents'));
            const required = [...preloaders, 'Explore', 'Plan', 'general-purpose'];
            // When the agent-start registrations are read
            const handlers = protocolHandlers(readLiveSettings(), 'SubagentStart');
            assert.equal(handlers.length, ENTRY_GROUPS.length + BIN_COUNT);
            // Then no matcher narrows them: an agent-name list would miss a general-purpose or custom agent,
            // and every agent type must receive the universal bundle
            for (const entry of handlers) {
                const admitted = name => entry.matcher === null || entry.matcher === '*' || String(entry.matcher).split('|').includes(name);
                for (const name of required) assert.ok(admitted(name), `SubagentStart registration for ${entry.handler.command} must admit ${name}`);
                assert.equal(entry.matcher, null, `SubagentStart registration for ${entry.handler.command} carries no agent-type matcher`);
            }
        }
    },
    {
        name: 'TC-PDL-022 the second host maps delivery to the prompt, shell-read and agent-start events without changing existing steps',
        fn: () => {
            const temp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pdl-host-')));
            try {
                // Given the second-host sync on a temporary copy with protocol delivery registered
                const settings = fixtureSettings();
                // When it runs (with and without the protocol registrations)
                const mirror = assertExistingStepsUnchanged(settings, temp, 'fixture');
                const report = renderCodex(fs.mkdtempSync(path.join(temp, 'report-')), settings, temp).report;
                const hooks = mirror.hooks;
                const protocolGroups = event => (hooks[event] || []).filter(group => group.hooks.some(handler => isProtocolCommand(handler.command)));
                const expectEntries = (group, label, rels = skillLoadRels()) => {
                    assert.equal(group.hooks.length, rels.length, `${label}: exact entry count`);
                    group.hooks.forEach((handler, index) => assertLauncher(handler, rels[index], true, `${label}[${index}]`));
                    for (const handler of group.hooks) {
                        assert.equal(handler.additionalContextLimit, CONTEXT_LIMIT, `${label}: allowance`);
                        assert.equal(Object.hasOwn(handler, 'if'), false, `${label}: no condition on the second host`);
                    }
                };
                // Then the native bins keep their place on the prompt event and the remapped load-path group follows every native group, each with an allowance of 3,000
                const prompt = protocolGroups('UserPromptSubmit');
                assert.equal(prompt.length, 2, 'the bins group and the remapped load-path group');
                const binRels = BINS.map(n => entryRel(binName(n)));
                expectEntries(prompt[0], 'UserPromptSubmit bins', binRels);
                assert.equal(hooks.UserPromptSubmit[0], prompt[0], 'the bins are the first prompt group');
                expectEntries(prompt[1], 'UserPromptSubmit remapped');
                assert.equal(hooks.UserPromptSubmit.at(-1), prompt[1], 'the remapped group follows every native prompt group');
                // And each group has a shell-read step (the confirmation run kept the shell mapping on)
                const post = protocolGroups('PostToolUse');
                assert.deepEqual(post.map(group => group.matcher), ['Bash'], 'PostToolUse protocol steps sit on the shell tool only');
                expectEntries(post[0], 'PostToolUse Bash');
                // And agent start mirrors with the filter anchored for the second host's regex matcher
                const agent = protocolGroups('SubagentStart');
                assert.equal(agent.length, 1);
                assert.equal(agent[0].matcher, undefined, 'no agent-type filter: every agent type reaches the steps');
                expectEntries(agent[0], 'SubagentStart', [...ENTRY_GROUPS.map(entryRel), ...binRels]);
                // And the bins' compact|clear session start mirrors verbatim (the second host's SessionStart accepts both sources), alone on that event
                const start = protocolGroups('SessionStart');
                assert.equal(start.length, 1);
                assert.equal(start[0].matcher, 'compact|clear', 'SessionStart keeps the compact and clear sources');
                expectEntries(start[0], 'SessionStart compact|clear', binRels);
                assert.equal(hooks.SessionStart.length, 1, 'no other step mirrors on SessionStart in this fixture');
                assert.equal(report.skipped_events.some(entry => entry.event === 'SessionStart'), false, 'session start is not skipped');
                // And no delivery step is keyed to file read or skill use
                for (const [event, groups] of Object.entries(hooks)) {
                    for (const group of groups.filter(item => item.hooks.some(handler => isProtocolCommand(handler.command)))) {
                        const tools = String(group.matcher || '').split('|');
                        assert.ok(!tools.includes('Read') && !tools.includes('Skill'), `${event} ${group.matcher}: protocol step keyed to Read/Skill`);
                    }
                }
                assert.equal(hooks.UserPromptExpansion, undefined, 'the second host has no command-expansion event');
                // And the dropped and remapped paths are reported with their reasons
                assert.deepEqual(report.skipped_events.filter(entry => entry.event === 'UserPromptExpansion'),
                    [{ event: 'UserPromptExpansion', reason: 'remapped-to-user-prompt-submit' }]);
                const dropped = report.skipped_groups.filter(entry => entry.reason === 'matcher-names-no-codex-tool');
                assert.deepEqual(dropped.map(entry => `${entry.event}:${entry.matcher}`), ['PostToolUse:Skill', 'PostToolUse:Read']);
                assert.deepEqual(report.codex_only_groups.map(entry => [entry.event, entry.matcher, entry.hooks, entry.derived_from.matcher]),
                    [['PostToolUse', 'Bash', ENTRY_GROUPS.length + 1, 'Read']]);
                assert.equal(report.skipped_events.some(entry => entry.event === 'SubagentStart'), false, 'agent start is not skipped');
                // And, in the framework repo, the shipped settings keep every existing step byte-identical too
                if (!LIVE_SKIP) assertExistingStepsUnchanged(readLiveSettings(), temp, 'shipped settings');
            } finally {
                fs.rmSync(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
            }
        }
    },
    {
        name: 'TC-PDL-059 every generated delivery step names one existing entry file with no arguments, and the second-host launcher delivers from a subdirectory',
        fn: async () => {
            const fixture = makeHookTreeProject('pdl059');
            const temp = fs.mkdtempSync(path.join(fixture, 'tmp-run-'));
            try {
                // Given a copy of the hook tree, a converted skill and its mirrors generated from the settings
                writeDeliveryFixture(fixture);
                const settings = fixtureSettings();
                const { mirror } = renderCodex(fixture, settings, temp);
                const protocolHandlers = Object.values(mirror.hooks).flat().flatMap(group => group.hooks)
                    .filter(handler => isProtocolCommand(handler.command));
                assert.equal(protocolHandlers.length, (ENTRY_GROUPS.length + 1) * 2 + (ENTRY_GROUPS.length + BIN_COUNT) + BIN_COUNT + BIN_COUNT, 'prompt, shell-read, agent-start, native bin and compact session-start steps');
                // Then every platform step has exact JS plus exactly one existing entry file and no extra argv.
                for (const handler of protocolHandlers) {
                    const match = /^node -e "[^"]+" -- "(\.claude\/hooks\/(?:protocol-inject-[a-z0-9-]+|skill-overlay-remind)\.cjs)"$/.exec(handler.commandWindows);
                    assert.ok(match, `not an exact native launcher command: ${handler.commandWindows?.slice(-80)}`);
                    assertLauncher(handler, match[1], true, match[1]);
                    assert.ok(fs.existsSync(path.join(fixture, ...match[1].split('/'))), `${match[1]} exists`);
                }
                // When the prompt step and the shell-read step for the review group run from a subdirectory
                const sub = path.join(fixture, 'packages', 'app');
                fs.mkdirSync(sub, { recursive: true });
                const env = scrubbedEnv(temp);
                const reviewCommand = event => nativeCommand(mirror.hooks[event].flatMap(group => group.hooks)
                    .find(handler => handler.command.includes('protocol-inject-review.cjs')));
                const prompt = runShellCommand(reviewCommand('UserPromptSubmit'), sub,
                    { hook_event_name: 'UserPromptSubmit', prompt: 'please use $conv-a here', turn_id: 't1', session_id: 's1', cwd: sub }, env);
                const shell = runShellCommand(reviewCommand('PostToolUse'), sub,
                    { hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command: 'Get-Content -Raw .agents/skills/conv-a/SKILL.md' }, turn_id: 't2', session_id: 's2', cwd: fixture }, env);
                // Then each resolves the project root from the subdirectory and delivers the protocol
                for (const [label, result] of [['prompt', prompt], ['shell read', shell]]) {
                    assert.equal(result.code, 0, `${label}: ${result.stderr}`);
                    assert.ok(contextOf(result.stdout).includes(marker('review-alpha')), `${label}: delivered (stdout: ${result.stdout.slice(0, 200)})`);
                }
                // And the OpenCode bridge table names the same bare entry files, each resolving to a file
                const { buildHooksConfig } = await import(pathToFileURL(OPENCODE_SYNC).href);
                const bridged = Object.values(buildHooksConfig(settings).hooks).flat().flatMap(group => group.hooks)
                    .map(handler => handler.command).filter(isProtocolCommand);
                assert.ok(bridged.length >= ENTRY_GROUPS.length, 'the bridge carries protocol steps');
                for (const hookRel of bridged) {
                    assert.match(hookRel, /^\.claude\/hooks\/(?:protocol-inject-[a-z0-9-]+|skill-overlay-remind)\.cjs$/, 'one bare path, no arguments');
                    assert.ok(fs.existsSync(path.join(fixture, ...hookRel.split('/'))), `${hookRel} exists`);
                }
            } finally {
                removeTempDir(fixture);
            }
        }
    },
    {
        name: 'TC-PDL-070 second-host delivery steps start on the lean launcher and existing steps render as before',
        fn: async () => {
            // Given the exported second-host command renderer
            const { normalizeCommand } = await import(pathToFileURL(CODEX_SYNC).href);
            // When it renders a protocol entry and an existing hook
            const protocol = { command: normalizeCommand(entryCommand('review')),
                commandWindows: normalizeCommand(entryCommand('review'), { windows: true }) };
            const existingCommand = 'node "$CLAUDE_PROJECT_DIR"/.claude/hooks/review-commit-gate.cjs';
            const existing = { command: normalizeCommand(existingCommand), commandWindows: normalizeCommand(existingCommand, { windows: true }) };
            // Then both platform commands preserve independent exact JS/argv; delivery carries no Git lookup.
            assertLauncher(protocol, entryRel('review'), true, 'protocol');
            assertLauncher(existing, '.claude/hooks/review-commit-gate.cjs', false, 'existing');

            const fixture = makeHookTreeProject('pdl070');
            try {
                const temp = fs.mkdtempSync(path.join(fixture, 'tmp-run-'));
                const preload = path.join(temp, 'load-logger.cjs');
                fs.writeFileSync(preload, PRELOAD_SOURCE);
                const sub = path.join(fixture, 'packages', 'app');
                fs.mkdirSync(sub, { recursive: true });
                const log = path.join(temp, 'load.jsonl');
                // When the protocol command runs from a subdirectory for a second-host prompt with no `$`
                const result = runShellCommand(nativeCommand(protocol), sub,
                    { hook_event_name: 'UserPromptSubmit', prompt: 'explain the build', turn_id: 't1', session_id: 's1', cwd: sub },
                    scrubbedEnv(temp, { NODE_OPTIONS: `--require "${preload.replace(/\\/g, '/')}"`, PDL_LOAD_LOG: log }));
                // Then it prints nothing, exits 0, never loads the Git helper and spawns no child process
                assert.equal(result.code, 0, result.stderr);
                assert.equal(result.stdout, '');
                const entries = readLog(log);
                assert.ok(entries.some(entry => entry.type === 'load' && /protocol-inject-review\.cjs$/.test(entry.file)), 'the logger saw the entry load');
                assert.deepEqual(entries.filter(entry => entry.type === 'load' && /windows-git\.cjs$/.test(entry.file)), [], 'windows-git.cjs loaded');
                assert.deepEqual(entries.filter(entry => entry.type === 'spawn'), [], 'a child process was spawned');
            } finally {
                removeTempDir(fixture);
            }
        }
    },
    {
        name: 'TC-PDL-023 the third-host bridge lists every group and the overlay reminder on the skill tool and file read, conditions only the file read, and reports the rest as skipped',
        fn: async () => {
            const fixture = makeHookTreeProject('pdl023');
            try {
                // Given the third-host sync on a temporary copy with protocol delivery registered on all four load paths
                const settings = fixtureSettings();
                writeFile(path.join(fixture, '.claude', 'settings.json'), `${JSON.stringify(settings, null, 2)}\n`);
                const { buildHooksConfig, materializeOpencodeHooks } = await import(pathToFileURL(OPENCODE_SYNC).href);
                // When it runs
                const { pluginText, report } = await materializeOpencodeHooks({ rootDir: fixture });
                const { hooks } = buildHooksConfig(settings);
                assert.ok(pluginText.includes(JSON.stringify(hooks, null, 2)), 'the generated bridge carries exactly the compiled table');
                // Then each group is listed once on the skill tool, with no condition
                const post = hooks.PostToolUse;
                const byMatcher = matcher => post.filter(group => group.matcher === matcher);
                assert.equal(byMatcher('Skill').length, 1, 'one skill-tool group');
                assert.deepEqual(byMatcher('Skill')[0].hooks, skillLoadRels().map(command => ({ type: 'command', command })));
                // And once on the file read, each entry carrying the skill-file condition
                assert.equal(byMatcher('Read').length, 1, 'one file-read group');
                assert.deepEqual(byMatcher('Read')[0].hooks, skillLoadRels().map(command => ({ type: 'command', command, if: READ_CONDITION })));
                // And every other step keeps its earlier two-key shape
                for (const [event, groups] of Object.entries(hooks)) {
                    for (const handler of groups.flatMap(group => group.hooks).filter(item => !isProtocolCommand(item.command))) {
                        assert.deepEqual(Object.keys(handler), ['type', 'command'], `${event}: ${handler.command} changed shape`);
                    }
                }
                // And typed-command expansion and agent start are reported as skipped, never dropped silently
                for (const event of ['UserPromptExpansion', 'SubagentStart']) {
                    assert.deepEqual(report.skipped_events.filter(entry => entry.event === event), [{ event, reason: 'unsupported-by-opencode' }]);
                    assert.equal(hooks[event], undefined, `${event} has no bridge entry`);
                }
                // And every bridged entry resolves to a file of the copied tree
                assert.deepEqual(report.missing_hook_files.filter(isProtocolCommand), [], 'a protocol entry file is missing');
            } finally {
                removeTempDir(fixture);
            }
        }
    },
    {
        name: 'TC-PDL-027 a third-host skill tool load, naming the skill in its own field, appends the review group message to the result',
        fn: async () => {
            const fixture = makeHookTreeProject('pdl027');
            const temp = fs.mkdtempSync(path.join(fixture, 'tmp-run-'));
            try {
                // Given a converted skill, a skill with no guide block, and the bridge generated from the settings
                writeDeliveryFixture(fixture);
                writeFile(path.join(fixture, '.claude', 'skills', 'plain-b', 'SKILL.md'), '---\nname: plain-b\ndescription: unconverted fixture skill\n---\n\n# plain-b\n');
                writeFile(path.join(fixture, '.claude', 'settings.json'), `${JSON.stringify(fixtureSettings(), null, 2)}\n`);
                const { materializeOpencodeHooks } = await import(pathToFileURL(OPENCODE_SYNC).href);
                const { pluginPath } = await materializeOpencodeHooks({ rootDir: fixture });
                // When the bridge receives the skill tool's completion, the skill named in `name` (the third host's field)
                const driver = path.join(temp, 'drive-bridge.mjs');
                fs.writeFileSync(driver, [
                    "import { pathToFileURL } from 'node:url';",
                    'const [pluginPath, root, eventsJson] = process.argv.slice(2);',
                    'const { EasyClaudeHooks } = await import(pathToFileURL(pluginPath).href);',
                    'const hooks = await EasyClaudeHooks({ directory: root });',
                    'const results = [];',
                    'for (const event of JSON.parse(eventsJson)) {',
                    "    const output = { title: 'skill', output: event.output, metadata: {} };",
                    "    await hooks['tool.execute.after'](event.input, output);",
                    '    results.push(output.output);',
                    '}',
                    'process.stdout.write(JSON.stringify(results));'
                ].join('\n'));
                const events = [
                    { input: { tool: 'skill', sessionID: 's027', callID: 'c1', args: { name: 'conv-a' } }, output: 'CONV_A_SKILL_TEXT' },
                    { input: { tool: 'skill', sessionID: 's027b', callID: 'c2', args: { name: 'plain-b' } }, output: 'PLAIN_B_SKILL_TEXT' }
                ];
                const run = spawnSync(process.execPath, [driver, pluginPath, fixture, JSON.stringify(events)], {
                    cwd: fixture, env: scrubbedEnv(temp), encoding: 'utf8', windowsHide: true, timeout: SPAWN_TIMEOUT_MS
                });
                assert.equal(run.status, 0, `bridge driver failed: ${run.stderr}`);
                const [converted, plain] = JSON.parse(run.stdout);
                // Then the review group message follows the skill text in the tool result
                assert.ok(converted.startsWith('CONV_A_SKILL_TEXT\n\n'), `tool result kept and extended: ${converted.slice(0, 120)}`);
                assert.ok(converted.includes(marker('review-alpha')), `review protocol appended (result: ${converted.slice(0, 200)})`);
                // And a skill with no guide block gets nothing appended
                assert.equal(plain, 'PLAIN_B_SKILL_TEXT');
            } finally {
                removeTempDir(fixture);
            }
        }
    },
    {
        name: 'TC-PDL-024 a protocol on the second-host inline list is full text in the second-host skill copy, leaves its guide block and is not delivered there',
        fn: () => {
            const fixture = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pdl024-')));
            try {
                // Given a converted skill declaring two protocols, and an inline list naming one of them
                const { mirrorSkill, source } = generateInlineMirror(fixture, ['review-beta']);
                const carrier = require(path.join(REPO_ROOT, GUIDE_CARRIER_REL));
                // Then the copy holds the listed protocol's full canonical body
                assert.ok(mirrorSkill.includes(`<!-- SYNC:review-beta -->\n\n${canonicalBody('review-beta')}\n\n<!-- /SYNC:review-beta -->`), 'listed protocol inline');
                // And a guide entry, never a body, for the other
                assert.deepEqual(carrier.guideTags(mirrorSkill), ['review-alpha'], 'the unlisted protocol stays a guide entry and the listed one leaves the block');
                assert.ok(!mirrorSkill.includes(marker('review-alpha')), 'the unlisted protocol has no body in the copy');
                assert.deepEqual(carrier.guideTags(source), ['review-alpha', 'review-beta'], 'the source skill is unchanged');
                // And second-host delivery for that skill covers only the unlisted protocol, so nothing arrives twice
                const plan = planCodexReviewDelivery(fixture);
                assert.deepEqual(plan.tags, ['review-alpha']);
                assert.ok(!plan.text.includes(marker('review-beta')), 'the listed protocol was also delivered');
                // Boundary: a listed protocol the skill does not declare changes nothing
                const other = generateInlineMirror(fs.mkdtempSync(path.join(fixture, 'undeclared-')), ['review-gamma']);
                assert.equal(normalizeGuideBlock(other.mirrorSkill), normalizeGuideBlock(other.source), 'guide block changed for an undeclared listed protocol');
            } finally {
                removeTempDir(fixture);
            }
        }
    },
    {
        name: 'TC-PDL-025 with the decided empty inline list the second-host copy holds guide entries only and its guide block matches the source',
        fn: async () => {
            const fixture = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pdl025-')));
            try {
                // Given the shipped inline list, which is decided empty
                const { CODEX_INLINE_TAGS } = await import(pathToFileURL(CODEX_MIGRATE).href);
                assert.deepEqual([...CODEX_INLINE_TAGS], [], 'the decided second-host inline list is empty');
                // When the second-host copy of a converted skill is generated with the default list
                const { mirrorSkill, source } = generateInlineMirror(fixture, null);
                const carrier = require(path.join(REPO_ROOT, GUIDE_CARRIER_REL));
                // Then every protocol appears as a guide entry and the copy's guide block matches the source
                assert.deepEqual(carrier.guideTags(mirrorSkill), ['review-alpha', 'review-beta']);
                assert.equal(normalizeGuideBlock(mirrorSkill), normalizeGuideBlock(source), 'guide block differs from the source');
                // And no protocol body is copied
                for (const tag of ['review-alpha', 'review-beta']) {
                    assert.ok(!mirrorSkill.includes(`<!-- SYNC:${tag} -->`) && !mirrorSkill.includes(marker(tag)), `${tag}: full body in the copy`);
                }
                // And second-host delivery covers both
                assert.deepEqual(planCodexReviewDelivery(fixture).tags, ['review-alpha', 'review-beta']);
            } finally {
                removeTempDir(fixture);
            }
        }
    },
    {
        // The generated second-host skill copies of this framework repo, after every group converted (P50).
        // Guarded like TC-PDL-021: the mirror is this repo's generated output (an adopter regenerates its own).
        name: 'TC-PDL-042 the second-host skill mirror holds listed protocols inline and every other converted protocol as a guide entry',
        skip: LIVE_SKIP,
        fn: async () => {
            // Given the shipped inline list, the inline skills and every converted source skill's guide entries
            const { CODEX_INLINE_TAGS } = await import(pathToFileURL(CODEX_MIGRATE).href);
            const listed = new Set(CODEX_INLINE_TAGS);
            const carrier = require(path.join(REPO_ROOT, GUIDE_CARRIER_REL));
            const groups = JSON.parse(fs.readFileSync(path.join(CLAUDE_DIR, 'skills', 'shared', 'protocol-groups.json'), 'utf8'));
            const inline = new Set(groups.inlineSkills || []);
            const sourceDir = path.join(CLAUDE_DIR, 'skills');
            const mirrorDir = path.join(REPO_ROOT, '.agents', 'skills');
            const problems = [];
            let checked = 0;
            for (const name of fs.readdirSync(sourceDir)) {
                const source = path.join(sourceDir, name, 'SKILL.md');
                const mirror = path.join(mirrorDir, name, 'SKILL.md');
                if (inline.has(name) || !fs.existsSync(source) || !fs.existsSync(mirror)) continue;
                const tags = carrier.guideTags(fs.readFileSync(source, 'utf8'));
                if (tags.length === 0) continue;
                checked++;
                // When the mirror copy is read
                const copy = fs.readFileSync(mirror, 'utf8').replace(/\r\n?/g, '\n');
                const guided = new Set(carrier.guideTags(copy));
                for (const tag of tags) {
                    const body = new RegExp(`^<!-- SYNC:${tag} -->$`, 'm').test(copy);
                    // Then a listed tag is a body and leaves the guide block; every other tag stays a guide, never a body
                    if (listed.has(tag) && (!body || guided.has(tag))) problems.push(`${name}: listed ${tag} is not inline`);
                    if (!listed.has(tag) && (body || !guided.has(tag))) problems.push(`${name}: ${tag} is not a guide entry`);
                }
            }
            assert.ok(checked > 0, 'no converted skill has a second-host copy to check (vacuous; run the Codex sync)');
            assert.deepEqual(problems, [], `second-host copy disagrees with the inline list (regenerate with /sync-codex):\n  ${problems.join('\n  ')}`);
        }
    }
];

module.exports = { name: 'protocol-host-mapping', tests };
