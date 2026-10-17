'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { assertTrue, assertContains, assertNotContains } = require('../lib/assertions.cjs');
const { childEnv } = require('../lib/hook-runner.cjs');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR;
const routing = require(path.join(PROJECT_DIR, '.claude', 'scripts', 'lib', 'workflow-routing-config.cjs'));
const hook = require(path.join(PROJECT_DIR, '.claude', 'hooks', 'lib', 'workflow-route-delivery.cjs'));
// Cases that build this repository's own route output assert the gate of the default (compatible)
// delivery profile, whichever profile the developer or this checkout selected for their own sessions.
const COMPATIBLE_PROFILE = { config: { contextDelivery: { profile: 'compatible' } } };
const catalogLib = require(path.join(PROJECT_DIR, '.claude', 'scripts', 'lib', 'workflow-skills-catalog.cjs'));
const generator = require(path.join(PROJECT_DIR, '.claude', 'skills', 'ai-context-refresh', 'scripts', 'generate-claude-md.cjs'));

async function fixture(files, fn) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-routing-'));
    try {
        for (const [relative, body] of Object.entries(files || {})) {
            const file = path.join(dir, relative);
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, body, 'utf8');
        }
        return await fn(dir);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

// ── Routing payload cap (TC-WFR-*) ────────────────────────────────────────────────────────────
// The route is TWO hook outputs: the route output (state line, gate, project protocol) from
// `hook.buildInjection`, and the catalog output from `hook.buildCatalogInjection`. A host cuts any one
// output above its cap (10,000 chars) to a preview, so the catalog output alone is measured against
// 9,500 (pinned by TC-WFR-001) and alone falls back to a smaller form; the gate and a project protocol
// are never dropped or cut by the framework and never cost the catalog its form (TC-WFR-024). Past the
// host limit the route output says so on its second line (TC-WFR-026).
const PAYLOAD_CAP = 9500;
// Semantic anchor the wf-cycle W5 runtime check requires (verify-workflow-cycle-compliance.mjs).
const ADVANCEMENT_CLAUSE = /advance only after (?:all|every)(?: members?)? return/i;
const BARRIER_TOKEN = /\[[^\]]*∥[^\]]*\]/g;
const FIXTURE_GATE_BODY = 'FIXTURE-GATE-BODY: route before acting.';
const FIXTURE_GATE = `<!-- fixture gate -->\n\n${hook.GATE_MARKER}\n\n${FIXTURE_GATE_BODY}\n\n<!-- /CK:WORKFLOW-GATE -->\n`;
// A gate body several thousand chars longer than FIXTURE_GATE (~3,900 chars, about the shipped gate's size).
const FULL_SIZE_GATE_BODY = `${FIXTURE_GATE_BODY}\n${'> Assess scope, risk and ambiguity, then declare the route.\n'.repeat(66)}`;
const FULL_SIZE_GATE = FIXTURE_GATE.replace(FIXTURE_GATE_BODY, FULL_SIZE_GATE_BODY);
const INDEX_POINTER = /Read `\.claude\/workflows\.json`[^\n]*`start-workflow <id>`/;
const COMPACT_HEADER = '| Workflow | Activation | When to use | Parallel phases |';
const CATALOG_HEADING = '## Workflow & Skills Catalog';
const GATE_FILE = '.claude/skills/shared/workflow-first-gate.md';
// A root file from a previous generation, still holding the retired route pointer block. The payload ignores root files.
const ROOT_WITH_POINTER = '# Project\n\n<!-- CK:WORKFLOW-ROUTE-POINTER -->\n\n> pointer\n\n<!-- /CK:WORKFLOW-ROUTE-POINTER -->\n';
// A root file from before the gate moved to the hook: it still holds the gate marker and body.
const ROOT_WITH_LEGACY_GATE = `# Project\n\n${hook.GATE_MARKER}\n\n> legacy gate\n\n<!-- /CK:WORKFLOW-GATE -->\n`;
const GROUPED_REGISTRY = JSON.stringify({
    version: '1.0.0',
    workflows: {
        'workflow-grouped': {
            name: 'Grouped', activation: 'confirm', whenToUse: 'review a change with parallel reviewers',
            preActions: { injectContext: 'Use the selected workflow context.' },
            sequence: ['investigate', 'review-a', 'review-b', 'review-c', 'finish'],
            parallelGroups: [{
                id: 'reviews', members: ['review-a', 'review-b', 'review-c'], conditionalMembers: ['review-c'], barrier: true
            }]
        },
        'workflow-plain': {
            name: 'Plain', whenToUse: 'do one plain thing',
            preActions: { injectContext: 'Use the selected workflow context.' },
            sequence: ['investigate', 'plain-step', 'finish']
        }
    }
});

/**
 * A registry sized past this framework's own: 30 workflows with long ids, hints past the cap,
 * 18 steps each over 40 distinct step skills, and an all-return barrier in every third workflow.
 */
function syntheticRegistry(count = 30, steps = 18) {
    const tiers = ['auto', 'confirm', 'manual'];
    const workflows = {};
    for (let index = 1; index <= count; index += 1) {
        const id = `workflow-synthetic-${String(index).padStart(2, '0')}-route`;
        const sequence = Array.from({ length: steps }, (_, step) => `synthetic-step-${String((index + step) % 40).padStart(2, '0')}`);
        const entry = {
            name: `Synthetic ${index}`,
            activation: tiers[index % tiers.length],
            whenToUse: 'user wants to run a long synthetic route with many clauses and words, check every hint is capped before it reaches the model, measure the payload against the host cap, and keep going with more words',
            preActions: { injectContext: 'Use the selected workflow context.' },
            sequence
        };
        if (index % 3 === 0 && steps >= 8) {
            entry.parallelGroups = [{
                id: 'synthetic-gates', members: sequence.slice(5, 8), conditionalMembers: [sequence[7]], barrier: true
            }];
        }
        workflows[id] = entry;
    }
    return { version: '1.0.0', workflows };
}

/**
 * A registry whose rows are short in the tiers-only index but long wherever barrier marks render:
 * every workflow has one three-member all-return barrier with long step names.
 */
function wideGroupRegistry(count) {
    const workflows = {};
    for (let index = 1; index <= count; index += 1) {
        const members = [1, 2, 3].map(member => `parallel-reviewer-step-with-a-long-name-${index}-${member}`);
        workflows[`workflow-wide-${String(index).padStart(3, '0')}`] = {
            name: `Wide ${index}`,
            activation: 'confirm',
            whenToUse: 'review a change with three parallel reviewers',
            preActions: { injectContext: 'Use the selected workflow context.' },
            sequence: ['investigate', ...members, 'finish'],
            parallelGroups: [{ id: 'reviews', members, barrier: true }]
        };
    }
    return { version: '1.0.0', workflows };
}

// A one-word hint renders whole up to 130 characters; each padded workflow starts at 3.
const PAD_PER_HINT = 127;

/**
 * A registry whose compact catalog can be sized to the character: `count` three-step workflows whose
 * one-word hints hold 3 characters plus their share of `pad`, so the catalog grows one character per
 * padding character.
 */
function paddedRegistry(count, pad = 0) {
    const workflows = {};
    let remaining = pad;
    for (let index = 1; index <= count; index += 1) {
        const share = Math.min(remaining, PAD_PER_HINT);
        remaining -= share;
        workflows[`workflow-padded-${String(index).padStart(3, '0')}`] = {
            name: `Padded ${index}`,
            whenToUse: 'p'.repeat(3 + share),
            preActions: { injectContext: 'Use the selected workflow context.' },
            sequence: ['investigate', 'padded-step', 'finish']
        };
    }
    if (remaining > 0) throw new Error(`paddedRegistry: ${count} workflows cannot hold ${pad} characters of padding`);
    return { version: '1.0.0', workflows };
}

/** Given/When helper: build the payload inside a clean fixture whose HOME and temp dirs point at it. */
async function isolatedFixture(files, fn) {
    return fixture(files, async dir => {
        const keys = ['HOME', 'USERPROFILE', 'TMPDIR', 'TEMP', 'TMP'];
        const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
        for (const key of keys) process.env[key] = dir;
        try {
            return await fn(dir);
        } finally {
            for (const key of keys) {
                if (saved[key] === undefined) delete process.env[key];
                else process.env[key] = saved[key];
            }
        }
    });
}

/** Rows in the payload whose first cell is a workflow id. */
function workflowRow(payload, id) {
    return payload.split(/\r?\n/).find(line => line.startsWith(`| \`${id}\` |`));
}

/** True when `payload` holds any catalog table row (a line opening with a back-ticked id cell). */
function hasWorkflowRows(payload) {
    return payload.split(/\r?\n/).some(line => line.startsWith('| `'));
}

/** The catalog output is wrapped in its own markers and nothing else. */
function assertCatalogBlock(catalog, label) {
    assertTrue(catalog.startsWith(`${hook.CATALOG_START}\n`) && catalog.endsWith(`\n${hook.CATALOG_END}`),
        `${label}: the catalog output must be wrapped in its own markers`);
    assertNotContains(catalog, hook.ROUTE_START, `${label}: the catalog output carries no route block`);
    assertNotContains(catalog, hook.GATE_MARKER, `${label}: the catalog output carries no gate`);
}

/** The route output carries the gate and no part of the catalog. */
function assertNoCatalog(route, label) {
    assertNotContains(route, hook.CATALOG_START, `${label}: the route output carries no catalog block`);
    assertNotContains(route, CATALOG_HEADING, `${label}: the route output carries no catalog`);
    assertTrue(!hasWorkflowRows(route), `${label}: the route output carries no workflow rows`);
}

// Self-checks of THIS repository's registry are gated on the shared synchronous framework-repo
// guard, so an adopter's own registry never fails them; the synthetic fixtures carry the portable
// size contract. The guard's parity with framework-repo.helper.mjs is the content-presence tripwire.
const FRAMEWORK_REPO_SKIP = require('../lib/framework-repo-guard.cjs').isFrameworkRepo(PROJECT_DIR)
    ? false
    : 'asserts the framework repo workflow registry only';

// A case that needs a throwaway git repository skips, with this reason, on a host without git.
const GIT_SKIP = (() => {
    try {
        execFileSync('git', ['--version'], { stdio: 'ignore', windowsHide: true });
        return false;
    } catch {
        const reason = 'git is not available on this host';
        console.log(`  [workflow-routing-switch] skipping git cases — ${reason}`);
        return reason;
    }
})();

// git in a throwaway repository must not inherit the developer's git config, nor a git hook's GIT_DIR /
// GIT_INDEX_FILE redirection, which would point `git init` at the host repository. Home and temp point at
// the fixture (Portable Test Contract, "Clean machine").
function fixtureGitEnv(dir) {
    const overrides = {};
    for (const key of Object.keys(process.env)) {
        if (/^GIT_/i.test(key)) overrides[key] = undefined;
    }
    return childEnv({
        ...overrides,
        HOME: dir, USERPROFILE: dir, TMPDIR: dir, TEMP: dir, TMP: dir, XDG_CONFIG_HOME: undefined,
        GIT_CONFIG_NOSYSTEM: '1',
        // A file that does not exist reads as an empty config on every OS.
        GIT_CONFIG_GLOBAL: path.join(dir, 'no-global-gitconfig')
    });
}

const config = value => JSON.stringify({ portability: { workflowAutoDetect: value } });
const input = (session, transcript) => ({
    hook_event_name: 'UserPromptSubmit', session_id: session, transcript_path: transcript, prompt: 'hello'
});
const writer = outputs => (text, done) => { outputs.push(text); done(true); };
// A stubbed resolver: the hook reads the mode from `resolveWorkflowRouteMode` and nothing else.
const stubMode = (mode, source = 'default') => ({ resolveWorkflowRouteMode: () => ({ mode, source }) });
// The resolver reads the developer's own environment and home by default; fixtures pass neither.
const hermetic = dir => ({ rootDir: dir, env: {}, homeDir: dir });

async function enabledRun({ root, store, session = 's1', transcript, now = 1000, content = 'route-v1', outputs = [], part }) {
    return hook.run(input(session, transcript), {
        part,
        projectDir: root,
        storeRoot: store,
        now,
        content,
        routing: stubMode('ask'),
        write: writer(outputs)
    });
}

module.exports = {
    name: 'workflow-routing-switch',
    tests: [
        {
            name: '[workflow-routing-switch] TC-WRS-001 absent and malformed config default ON',
            fn: () => fixture({}, dir => {
                assertTrue(routing.resolveWorkflowAutoDetect(hermetic(dir)).enabled === true);
                fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
                fs.writeFileSync(path.join(dir, 'docs', 'project-config.json'), '{bad', 'utf8');
                assertTrue(routing.resolveWorkflowAutoDetect(hermetic(dir)).enabled === true);
                assertTrue(routing.readWorkflowAutoDetect({}) === true);
                assertTrue(routing.readWorkflowAutoDetect({ portability: { workflowAutoDetect: 'true' } }) === true);
            })
        },
        {
            name: '[workflow-routing-switch] TC-WRS-002 tracked team config opts in and out',
            fn: () => fixture({ 'docs/project-config.json': config(true) }, dir => {
                assertTrue(routing.resolveWorkflowAutoDetect(hermetic(dir)).enabled === true);
                fs.writeFileSync(path.join(dir, 'docs', 'project-config.json'), config(false));
                assertTrue(routing.resolveWorkflowAutoDetect(hermetic(dir)).enabled === false);
            })
        },
        {
            name: '[workflow-routing-switch] TC-WRS-003 projectConfigPath relocation is honored',
            fn: () => fixture({
                '.claude/.ck.json': JSON.stringify({ portability: { projectConfigPath: 'config/team.json' } }),
                'config/team.json': config(true),
                'docs/project-config.json': config(false)
            }, dir => {
                const resolved = routing.resolveWorkflowAutoDetect(hermetic(dir));
                assertTrue(resolved.configPath === path.join(dir, 'config', 'team.json'));
                assertTrue(resolved.enabled === true);
            })
        },
        {
            name: '[workflow-routing-switch] TC-WRS-004 .claude local override wins both ways',
            fn: () => fixture({
                'docs/project-config.json': config(true),
                '.claude/.ck.local.json': config(false)
            }, dir => {
                const tracked = routing.resolveWorkflowAutoDetect({ ...hermetic(dir), scope: routing.SCOPE_TEAM });
                assertTrue(tracked.enabled === true);
                assertTrue(tracked.source === routing.SOURCE_PROJECT_CONFIG);
                let resolved = routing.resolveWorkflowAutoDetect(hermetic(dir));
                assertTrue(resolved.enabled === false);
                assertTrue(resolved.source === routing.SOURCE_LOCAL_OVERRIDE);
                assertTrue(resolved.localPath === path.join(dir, '.claude', '.ck.local.json'));
                fs.writeFileSync(path.join(dir, 'docs', 'project-config.json'), config(false));
                fs.writeFileSync(path.join(dir, '.claude', '.ck.local.json'), config(true));
                resolved = routing.resolveWorkflowAutoDetect(hermetic(dir));
                assertTrue(resolved.enabled === true);
            })
        },
        {
            name: '[workflow-routing-switch] TC-WRS-005 malformed local file falls through to team',
            fn: () => fixture({
                'docs/project-config.json': config(true), '.claude/.ck.local.json': '{bad'
            }, dir => assertTrue(routing.resolveWorkflowAutoDetect(hermetic(dir)).enabled === true))
        },
        {
            name: '[workflow-routing-switch] TC-WRS-006 both schemas declare a boolean switch',
            fn: () => {
                const { CK_SCHEMA } = require(path.join(PROJECT_DIR, '.claude', 'hooks', 'lib', 'ck-config-schema.cjs'));
                const { SCHEMA } = require(path.join(PROJECT_DIR, '.claude', 'hooks', 'lib', 'project-config-schema.cjs'));
                assertTrue(CK_SCHEMA.portability.properties.workflowAutoDetect.type === 'boolean');
                assertTrue(SCHEMA.portability.properties.workflowAutoDetect.type === 'boolean');
            }
        },
        {
            // Intent: the ignore rules shipped in `.claude/.gitignore` keep a developer's local override out of
            // git in any adopter layout. Proven in a throwaway repository holding only that file, so the check
            // never depends on the host project being a git work tree.
            name: '[workflow-routing-switch] TC-WRS-007 portable local file is git-ignored',
            skip: GIT_SKIP,
            fn: () => fixture({
                '.claude/.gitignore': fs.readFileSync(path.join(PROJECT_DIR, '.claude', '.gitignore'), 'utf8')
            }, dir => {
                const git = args => execFileSync('git', args, {
                    cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, env: fixtureGitEnv(dir)
                });
                git(['init', '-q']);
                const ignored = git(['check-ignore', '-v', '--', '.claude/.ck.local.json']);
                assertContains(ignored, '.claude/.gitignore');
                assertContains(ignored, '/.ck.local.json');
                // `-v` prints the winning rule as <source>:<line>:<pattern> and exits 0 for a negated one too.
                const pattern = ignored.split('\t')[0].split(':').slice(2).join(':');
                assertTrue(!pattern.startsWith('!'), `the winning rule must ignore the file, not re-include it: ${pattern}`);
            })
        },
        {
            // Intent: an opt-out must reach the model even though the tracked gate, skill descriptions and
            // skill-level next-step workflow suggestions still say "auto-select" — a silent hook let them win.
            // TC-WFR-005: the payload cap work leaves the OFF notice path unchanged.
            name: '[workflow-routing-switch] TC-WRS-008 TC-WFR-005 disabled hook delivers the OFF notice once, never the gate or catalog',
            fn: async () => fixture({}, async dir => {
                // Given routing resolves OFF for this checkout
                const store = path.join(dir, 'state');
                const outputs = [];
                const offRun = now => hook.run(input('off'), {
                    projectDir: dir, storeRoot: store, now,
                    routing: stubMode('off', 'environment'),
                    write: writer(outputs)
                });
                // When the first prompt arrives
                const first = await offRun(1000);
                // Then the notice supersedes auto-select, keeps explicit requests and quality gates, and carries no route payload
                assertContains(first, hook.OFF_START);
                assertContains(first, 'Workflow auto-routing is OFF');
                assertContains(first, 'overrides every auto-select instruction');
                assertContains(first, 'skip that step and continue the skill');
                assertContains(first, 'only when the user explicitly asks');
                assertContains(first, 'Every quality gate');
                assertNotContains(first, '<!-- CK:WORKFLOW-GATE -->', 'the OFF notice must not re-deliver the gate');
                assertNotContains(first, '## Workflow & Skills Catalog', 'the OFF notice must not deliver the catalog');
                // And a second prompt in the same session is deduplicated
                assertTrue(await offRun(2000) === '', 'the OFF notice must deduplicate like the full payload');
                assertTrue(outputs.length === 1);
            })
        },
        {
            // Intent: the notice skips only a step that would START a workflow; a step that merely OFFERS one to the
            // user stays as written, and nothing the assistant chooses for routing is started (BR-WFR-08).
            name: '[workflow-routing-switch] TC-WRS-008 the OFF notice skips only workflow-starting steps and never lets a workflow or routing skill start',
            fn: async () => fixture({}, async dir => {
                const notice = await hook.run(input('off-wording'), {
                    projectDir: dir, storeRoot: path.join(dir, 'state'), now: 1000,
                    routing: stubMode('off', 'environment'), write: writer([])
                });
                // Every way the assistant could start a workflow by itself is forbidden
                assertContains(notice, 'Do not choose or start a workflow yourself');
                assertContains(notice, 'not through `start-workflow`, a `workflow-*` skill, or a skill step that would start a workflow');
                // A step that only offers a workflow to the user is not skipped
                assertContains(notice, 'A step that only offers a workflow to the user as an option stays as written');
                assertNotContains(notice, 'recommends switching to a workflow', 'a recommending step is not skipped wholesale');
                // The skill exception matches the documented wording: the one skill the user names
                assertContains(notice, 'or the one skill the user names');
                assertNotContains(notice, 'no skill you chose for routing');
                // And the only `off` payload stays short
                assertTrue(notice.length < 1500, `the OFF notice is ${notice.length} chars`);
            })
        },
        {
            name: '[workflow-routing-switch] TC-WRS-024 flipping the switch re-delivers the other form in the same session',
            fn: async () => fixture({}, async dir => {
                // Given one session and a switch the developer flips between prompts
                const store = path.join(dir, 'state');
                let enabled = true;
                const runAt = now => hook.run(input('flip'), {
                    projectDir: dir, storeRoot: store, now, content: 'route-v1',
                    routing: stubMode(enabled ? 'ask' : 'off'),
                    write: writer([])
                });
                assertContains(await runAt(1000), 'route-v1');
                // When routing is switched off, then back on
                enabled = false;
                const off = await runAt(2000);
                enabled = true;
                const on = await runAt(3000);
                // Then each change reaches the model instead of being suppressed by the earlier delivery
                assertContains(off, hook.OFF_START, 'switching OFF must deliver the notice');
                assertContains(on, 'route-v1', 'switching back ON must re-deliver the route payload');
            })
        },
        {
            // Intent: a developer-local opt-out must win over a team config that still stamps the gate into CLAUDE.md.
            name: '[workflow-routing-switch] TC-WRS-025 team ON with a local OFF override delivers the OFF notice through the real resolver',
            fn: async () => fixture({
                'docs/project-config.json': config(true),
                '.claude/.ck.local.json': config(false)
            }, async dir => {
                // Given the team keeps routing ON and this checkout's git-ignored override turns it OFF
                const store = path.join(dir, 'state');
                // When a prompt arrives and the hook resolves the switch itself (no stubbed resolver)
                const out = await hook.run(input('local-off'), { projectDir: dir, storeRoot: store, env: {}, homeDir: dir, write: writer([]) });
                // Then the model receives the OFF notice, not silence and not the route payload
                assertContains(out, hook.OFF_START);
                assertNotContains(out, '<!-- CK:RUNTIME-WORKFLOW-ROUTE -->');
            })
        },
        {
            name: '[workflow-routing-switch] TC-WRS-009 enabled hook delivers once then deduplicates',
            fn: async () => fixture({}, async dir => {
                const store = path.join(dir, 'state');
                const outputs = [];
                assertContains(await enabledRun({ root: dir, store, outputs }), 'route-v1');
                assertTrue(await enabledRun({ root: dir, store, outputs, now: 2000 }) === '');
                assertTrue(outputs.length === 1);
            })
        },
        {
            name: '[workflow-routing-switch] TC-WRS-010 content hash change re-arms delivery',
            fn: async () => fixture({}, async dir => {
                const store = path.join(dir, 'state');
                await enabledRun({ root: dir, store });
                assertContains(await enabledRun({ root: dir, store, content: 'route-v2', now: 2000 }), 'route-v2');
            })
        },
        {
            name: '[workflow-routing-switch] TC-WRS-011 4.5 MB transcript growth re-arms delivery',
            fn: async () => fixture({ 'history.jsonl': '' }, async dir => {
                const store = path.join(dir, 'state');
                const transcript = path.join(dir, 'history.jsonl');
                await enabledRun({ root: dir, store, transcript });
                fs.truncateSync(transcript, hook.SETTINGS.reinjectAfterBytes);
                assertContains(await enabledRun({ root: dir, store, transcript, now: 2000 }), 'route-v1');
            })
        },
        {
            name: '[workflow-routing-switch] TC-WRS-012 transcript shrink re-arms after context replacement',
            fn: async () => fixture({ 'history.jsonl': '1234567890' }, async dir => {
                const store = path.join(dir, 'state');
                const transcript = path.join(dir, 'history.jsonl');
                await enabledRun({ root: dir, store, transcript });
                fs.truncateSync(transcript, 2);
                assertContains(await enabledRun({ root: dir, store, transcript, now: 2000 }), 'route-v1');
            })
        },
        {
            name: '[workflow-routing-switch] TC-WRS-013 blind sessions stay deduplicated and session isolation re-arms',
            fn: async () => fixture({}, async dir => {
                const store = path.join(dir, 'state');
                await enabledRun({ root: dir, store, session: 'a', now: 1000 });
                assertContains(await enabledRun({ root: dir, store, session: 'b', now: 1100 }), 'route-v1');
                assertTrue(await enabledRun({ root: dir, store, session: 'a', now: 86400000 }) === '');
            })
        },
        {
            name: '[workflow-routing-switch] TC-WRS-014 output failure is nonblocking and releases its lock',
            fn: async () => fixture({}, async dir => {
                const store = path.join(dir, 'state');
                const first = await hook.run(input('writer-failure'), {
                    projectDir: dir,
                    storeRoot: store,
                    content: 'route-v1',
                    routing: stubMode('ask'),
                    write: () => { throw new Error('simulated output failure'); }
                });
                assertTrue(first === '');
                assertContains(await enabledRun({ root: dir, store, session: 'writer-failure', now: 2000 }), 'route-v1');
            })
        },
        {
            // Intent (BR-WFR-03): the route text exists only in the hook payload. A root file that also carried
            // it would contradict a person's `auto` or `off` mode, so the tracked files hold no route text at all.
            name: '[workflow-routing-switch] TC-WRS-015 tracked outputs carry no route text and the runtime payload has the gate and catalog',
            skip: FRAMEWORK_REPO_SKIP,
            fn: () => {
                for (const relative of ['CLAUDE.md', 'AGENTS.md']) {
                    const text = fs.readFileSync(path.join(PROJECT_DIR, relative), 'utf8');
                    assertNotContains(text, '<!-- CK:WORKFLOW-ROUTE-POINTER -->', `${relative} must carry no route pointer`);
                    assertNotContains(text, '<!-- CK:WORKFLOW-GATE -->', `${relative} must not carry the route gate body`);
                    assertNotContains(text, '**Workflow question**', `${relative} must not carry route rules`);
                    assertNotContains(text, '<!-- CK:WORKFLOW-SKILLS -->', `${relative} must not carry the route catalog`);
                    assertNotContains(text, '[MANDATORY FIRST ACTION]', `${relative} must not mandate route selection`);
                }
                assertTrue(!fs.existsSync(path.join(PROJECT_DIR, '.codex', 'CODEX_CONTEXT.md')), 'the retired Codex context file is gone');
                // The runtime payload is two outputs: the route output holds the gate, the catalog output the catalog
                const payload = hook.buildInjection(PROJECT_DIR, '', 'ask', 'default', COMPATIBLE_PROFILE);
                assertContains(payload, '<!-- CK:WORKFLOW-GATE -->');
                assertNoCatalog(payload, 'route output');
                const catalog = hook.buildCatalogInjection(PROJECT_DIR);
                assertContains(catalog, CATALOG_HEADING);
                assertCatalogBlock(catalog, 'catalog output');
                // A root from a previous generation loses its pointer and gate blocks on regeneration, whatever the team mode
                for (const root of [ROOT_WITH_POINTER, ROOT_WITH_LEGACY_GATE]) {
                    const cleaned = generator.cleanLegacyManagedBlocks(root);
                    assertNotContains(cleaned, '<!-- CK:WORKFLOW-ROUTE-POINTER -->', 'a regenerated root holds no pointer');
                    assertNotContains(cleaned, '<!-- CK:WORKFLOW-GATE -->', 'a regenerated root holds no gate');
                    assertContains(cleaned, '# Project', 'project text survives');
                }
                assertTrue(typeof generator.stampHeader === 'undefined', 'the generator no longer stamps a route pointer');
            }
        },
        {
            // Intent (BR-WFR-06): the runtime payload a hook-running host adds before each prompt tells the
            // model to ask the one workflow question before starting a self-matched workflow of ANY tier
            // (the `auto` row included), and that an explicit request needs no question. The gate (route
            // output) and the catalog's tier legend (catalog output) both carry it, whatever the root files
            // hold, so neither output lets a tier start on its own.
            name: '[workflow-routing-switch] TC-WRS-026 TC-WFR-012 runtime payload asks the workflow question before any tier starts',
            fn: () => {
                const shippedGate = fs.readFileSync(path.join(PROJECT_DIR, GATE_FILE), 'utf8');
                const STALE_SELF_START = /route gate may select and start it|never self-start a `manual`|ask once before self-starting/;
                return isolatedFixture({ '.claude/workflows.json': GROUPED_REGISTRY, [GATE_FILE]: shippedGate }, async noRoot => {
                    // Given an `auto` and a `confirm` workflow and no root instruction file
                    // When the two runtime outputs are built in the default `ask` mode
                    const full = hook.buildInjection(noRoot);
                    const catalog = hook.buildCatalogInjection(noRoot);
                    // Then the full gate asks the three-option question for every tier and exempts explicit requests
                    assertContains(full, '**Workflow question** (every tier)');
                    assertContains(full, '(a) the full workflow `<id>`');
                    assertContains(full, '(b) a slimmer custom route listing its steps, keeping every required gate');
                    assertContains(full, '(c) execute directly, no workflow or skill');
                    assertContains(full, 'runs any tier with no question');
                    assertContains(full, 'ask the workflow question (below) only when YOUR route is to start a catalog workflow');
                    assertContains(full, 'a direct, single-skill or custom-simple route (a Catalog-fit downgrade included) proceeds without asking');
                    assertNotContains(full, 'a route that matches a catalog workflow', 'a matched-but-downgraded route must not be told to ask');
                    // And the catalog's tier legend says the same next to the rows, the `auto` row included
                    assertContains(catalog, 'before you start a catalog workflow, in every tier; a direct, single-skill or custom-simple route asks nothing');
                    assertContains(catalog, 'An explicit request runs every tier with no question');
                    assertTrue(Boolean(workflowRow(catalog, 'workflow-plain')), 'the auto-tier row must be listed');
                    for (const [label, output] of [['route output', full], ['catalog output', catalog]]) {
                        assertTrue(!STALE_SELF_START.test(output), `the ${label} must not let a tier start on its own`);
                    }
                    // And root files that carry only the pointer never shrink either output: the gate is always delivered
                    await isolatedFixture({
                        '.claude/workflows.json': GROUPED_REGISTRY,
                        [GATE_FILE]: shippedGate,
                        'CLAUDE.md': ROOT_WITH_POINTER,
                        'AGENTS.md': ROOT_WITH_POINTER
                    }, withRoot => {
                        const withPointer = hook.buildInjection(withRoot);
                        assertTrue(withPointer === full, 'root files never change the route output');
                        assertContains(withPointer, '**Workflow question** (every tier)');
                        assertTrue(hook.buildCatalogInjection(withRoot) === catalog, 'root files never change the catalog output');
                        assertTrue(!STALE_SELF_START.test(withPointer), 'the payload must not let a tier start on its own');
                    });
                    // And in `auto` mode the same question is asked, the full workflow recommended first (P46)
                    const auto = hook.buildInjection(noRoot, '', 'auto');
                    const autoCatalog = hook.buildCatalogInjection(noRoot, 'auto');
                    assertContains(auto, '**Workflow question** (every tier)');
                    assertContains(auto, 'NEVER starts before the answer');
                    assertContains(auto, '**Route mode `auto`:**');
                    assertContains(auto, 'Mid-session: never auto-activate a workflow or ask to start one.');
                    assertContains(auto, 'runs any tier with no question');
                    assertTrue(!STALE_SELF_START.test(auto), 'mode auto must not let a tier start on its own');
                    assertContains(autoCatalog, '**Activation (mode auto):**');
                    assertContains(autoCatalog, 'before a catalog workflow you selected starts, recommending the full workflow first');
                });
            }
        },
        {
            name: '[workflow-routing-switch] TC-WRS-016 custom route protocol resolves team then local-override, local wins',
            fn: () => fixture({
                'docs/project-config.json': JSON.stringify({ portability: { workflowRouteProtocol: 'TEAM RULE' } }),
                'docs/extra.md': 'EXTRA FILE RULE'
            }, dir => {
                let resolved = routing.resolveWorkflowRouteProtocol({ rootDir: dir });
                assertTrue(resolved.text === 'TEAM RULE', 'team inline protocol must resolve');
                assertTrue(resolved.source === routing.SOURCE_PROJECT_CONFIG);
                assertTrue(routing.readWorkflowRouteProtocol(dir) === 'TEAM RULE');

                fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
                fs.writeFileSync(path.join(dir, '.claude', '.ck.local.json'),
                    JSON.stringify({ portability: { workflowRouteProtocol: { text: 'LOCAL RULE', path: 'docs/extra.md' } } }), 'utf8');
                resolved = routing.resolveWorkflowRouteProtocol({ rootDir: dir });
                assertTrue(resolved.text === 'LOCAL RULE\n\nEXTRA FILE RULE', 'local text+file protocol must win and concatenate');
                assertTrue(resolved.source === routing.SOURCE_LOCAL_OVERRIDE);
                assertTrue(resolved.overriddenLocally === true);
                assertTrue(routing.resolveWorkflowRouteProtocol({ rootDir: dir, scope: routing.SCOPE_TEAM }).text === 'TEAM RULE');
            })
        },
        {
            name: '[workflow-routing-switch] TC-WRS-017 escaping or malformed protocol layer expresses no opinion',
            fn: () => fixture({
                'docs/project-config.json': JSON.stringify({ portability: { workflowRouteProtocol: 'TEAM RULE' } }),
                '.claude/.ck.local.json': JSON.stringify({ portability: { workflowRouteProtocol: { path: '../escape.md' } } })
            }, dir => {
                assertTrue(routing.readWorkflowRouteProtocol(dir) === 'TEAM RULE', 'escaping path falls through to team');
                fs.writeFileSync(path.join(dir, '.claude', '.ck.local.json'), '{bad', 'utf8');
                assertTrue(routing.readWorkflowRouteProtocol(dir) === 'TEAM RULE', 'malformed local falls through to team');
                fs.writeFileSync(path.join(dir, '.claude', '.ck.local.json'),
                    JSON.stringify({ portability: { workflowRouteProtocol: 42 } }), 'utf8');
                assertTrue(routing.readWorkflowRouteProtocol(dir) === 'TEAM RULE', 'non-string/non-object falls through to team');
            })
        },
        {
            name: '[workflow-routing-switch] TC-WRS-018 absent protocol adds no block and a configured protocol is marker-wrapped',
            fn: () => {
                const plain = hook.buildInjection(PROJECT_DIR, '', 'ask', 'default', COMPATIBLE_PROFILE);
                assertNotContains(plain, hook.PROTOCOL_START, 'no protocol configured must add no block');
                const withProtocol = hook.buildInjection(PROJECT_DIR, 'Custom rule: prefer direct execution.', 'ask', 'default', COMPATIBLE_PROFILE);
                assertContains(withProtocol, hook.PROTOCOL_START);
                assertContains(withProtocol, 'Custom rule: prefer direct execution.');
                assertContains(withProtocol, hook.PROTOCOL_END);
                assertTrue(hook.buildProtocolSection('   ') === '', 'blank protocol must render no block');
                assertTrue(hook.buildProtocolSection('x').startsWith(hook.PROTOCOL_START));
            }
        },
        {
            name: '[workflow-routing-switch] TC-WRS-019 both schemas declare the route-protocol union',
            fn: () => {
                const { CK_SCHEMA } = require(path.join(PROJECT_DIR, '.claude', 'hooks', 'lib', 'ck-config-schema.cjs'));
                const { SCHEMA, validateConfig } = require(path.join(PROJECT_DIR, '.claude', 'hooks', 'lib', 'project-config-schema.cjs'));
                for (const schema of [CK_SCHEMA, SCHEMA]) {
                    const field = schema.portability.properties.workflowRouteProtocol;
                    assertTrue(Array.isArray(field.oneOf), 'workflowRouteProtocol must declare a union');
                    assertTrue(field.oneOf.some(alt => alt.type === 'string') && field.oneOf.some(alt => alt.type === 'object'));
                }
                assertTrue(validateConfig({ project: { name: 'x' }, portability: { workflowRouteProtocol: 'rule' } }).valid);
                const missing = validateConfig({ project: { name: 'x' }, portability: { workflowRouteProtocol: { path: 'docs/does-not-exist.md' } } });
                assertTrue(missing.valid && missing.warnings.some(w => w.includes('workflowRouteProtocol.path')), 'missing file is a warning, not an error');
                const bad = validateConfig({ project: { name: 'x' }, portability: { workflowRouteProtocol: { path: '../x.md' } } });
                assertTrue(!bad.valid && bad.errors.some(error => error.includes('workflowRouteProtocol.path')), 'escaping path must fail closed');
            }
        },
        {
            name: '[workflow-routing-switch] TC-WRS-020 hook payload carries the custom protocol and re-arms on change',
            fn: async () => {
                const store = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-proto-run-'));
                try {
                    const runWith = (protocol, now) => hook.run(input('proto-session'), {
                        projectDir: PROJECT_DIR, storeRoot: store, now, protocol,
                        routing: stubMode('ask'),
                        write: writer([])
                    });
                    const first = await runWith('PROTOCOL ALPHA', 1000);
                    assertContains(first, hook.PROTOCOL_START);
                    assertContains(first, 'PROTOCOL ALPHA');
                    assertTrue(await runWith('PROTOCOL ALPHA', 2000) === '', 'identical protocol must deduplicate');
                    assertContains(await runWith('PROTOCOL BETA', 3000), 'PROTOCOL BETA');
                } finally {
                    fs.rmSync(store, { recursive: true, force: true });
                }
            }
        },
        {
            name: '[workflow-routing-switch] TC-WRS-021 canonical privacy policy refuses normalized sensitive protocol paths',
            fn: () => fixture({
                'docs/project-config.json': JSON.stringify({ portability: { workflowRouteProtocol: { path: '.env/' } } }),
                '.env': 'SECRET_TOKEN=do-not-inject'
            }, dir => {
                assertTrue(routing.readWorkflowRouteProtocol(dir) === '', 'a normalized .env path must express no opinion, not leak the file');
                const { validateConfig } = require(path.join(PROJECT_DIR, '.claude', 'hooks', 'lib', 'project-config-schema.cjs'));
                const result = validateConfig({ project: { name: 'x' }, portability: { workflowRouteProtocol: { path: '.env/' } } });
                assertTrue(!result.valid && result.errors.some(e => e.includes('privacy-sensitive')), 'schema must fail closed on a sensitive path');
            })
        },
        {
            name: '[workflow-routing-switch] TC-WRS-022 oversized protocol file is truncated to a bounded payload',
            fn: () => fixture({
                'docs/project-config.json': JSON.stringify({ portability: { workflowRouteProtocol: { path: 'docs/big.md' } } }),
                'docs/big.md': 'A'.repeat(routing.MAX_PROTOCOL_FILE_BYTES + 5000)
            }, dir => {
                const text = routing.readWorkflowRouteProtocol(dir);
                assertTrue(text.length > 0, 'an oversized protocol must still resolve');
                assertTrue(text.length < routing.MAX_PROTOCOL_FILE_BYTES + 200, 'payload must be bounded near the cap');
                assertContains(text, `truncated at ${routing.MAX_PROTOCOL_FILE_BYTES} bytes`, 'truncation must be visible, not silent');
            })
        },
        {
            name: '[workflow-routing-switch] TC-WRS-023 missing and blank files stay fail-soft and physical escapes are refused',
            fn: () => {
                const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-routing-physical-'));
                const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-routing-outside-'));
                const configPath = path.join(root, 'docs', 'project-config.json');
                try {
                    fs.mkdirSync(path.dirname(configPath), { recursive: true });
                    const setPath = protocolPath => fs.writeFileSync(
                        configPath,
                        JSON.stringify({ portability: { workflowRouteProtocol: { path: protocolPath } } }),
                        'utf8'
                    );

                    setPath('docs/missing.md');
                    assertTrue(routing.readWorkflowRouteProtocol(root) === '', 'a missing protocol file must express no opinion');

                    fs.writeFileSync(path.join(root, 'docs', 'missing.md'), ' \n\t', 'utf8');
                    assertTrue(routing.readWorkflowRouteProtocol(root) === '', 'a blank protocol file must express no opinion');

                    fs.writeFileSync(path.join(outside, 'secret.md'), 'OUTSIDE_SECRET', 'utf8');
                    const escape = path.join(root, 'docs', 'escape');
                    fs.symlinkSync(outside, escape, process.platform === 'win32' ? 'junction' : 'dir');
                    setPath('docs/escape/secret.md');
                    assertTrue(routing.readWorkflowRouteProtocol(root) === '', 'a physical symlink/reparse escape must not be read');
                } finally {
                    fs.rmSync(root, { recursive: true, force: true });
                    fs.rmSync(outside, { recursive: true, force: true });
                }
            }
        },
        {
            // Intent: an output over the host cap is cut to a preview, so the model routes on a fragment.
            name: '[workflow-routing-switch] [cap] TC-WFR-001 payload size guard: a 30-workflow registry fits under 9,500 chars',
            fn: () => isolatedFixture({
                '.claude/workflows.json': JSON.stringify(syntheticRegistry(30)),
                [GATE_FILE]: FIXTURE_GATE,
                'CLAUDE.md': ROOT_WITH_POINTER
            }, dir => {
                // Given a registry larger than the framework's own
                const registry = syntheticRegistry(30);
                // When the catalog output is built
                const catalog = hook.buildCatalogInjection(dir);
                // Then it fits the cap in the compact form and still names every workflow with its activation tier
                assertTrue(catalog.length <= PAYLOAD_CAP, `catalog output is ${catalog.length} chars, cap ${PAYLOAD_CAP}`);
                assertContains(catalog, COMPACT_HEADER, 'a catalog that fits must keep the compact form, not the index fallback');
                assertTrue(!INDEX_POINTER.test(catalog), 'the pointer-only index is a fallback, never the default');
                for (const [id, workflow] of Object.entries(registry.workflows)) {
                    const row = workflowRow(catalog, id);
                    assertTrue(Boolean(row), `missing row for ${id}`);
                    assertContains(row, `| ${workflow.activation} · 18 steps |`, `${id} must show its tier and step count`);
                    // A registry too large for full hints keeps its rows with the shorter whole-clause hints (BR-WFR-02)
                    const hint = row.split(' | ')[2];
                    assertTrue(hint.length <= catalogLib.COMPACT_HINT_FALLBACK_MAX && !hint.endsWith('…'), `${id}: shorter whole-clause hint expected, got ${hint.length} chars`);
                }
                // And the full-hint compact rows really did overflow, so the shorter tier is what kept the compact form
                const fullRows = catalogLib.buildWorkflowSkillsCatalog({ rootDir: dir, sections: ['workflows'], compact: true });
                assertTrue(fullRows.length > PAYLOAD_CAP, `precondition: full hints overflow the cap (${fullRows.length} chars)`);
                // And it is an output of its own: the route output carries the gate and none of the catalog
                assertCatalogBlock(catalog, '30 workflows');
                assertNoCatalog(hook.buildInjection(dir), '30 workflows');
            })
        },
        {
            // Intent: a registry too large for the compact rows must shrink to an index rather than be cut to
            // a preview by the host. Only the registry decides that: the gate is delivered in its own output.
            name: '[workflow-routing-switch] [cap] TC-WFR-001 index-with-marks fallback: 60 workflows too large for the compact rows fit under 9,500 chars',
            fn: () => isolatedFixture({
                '.claude/workflows.json': JSON.stringify(syntheticRegistry(60)),
                [GATE_FILE]: FULL_SIZE_GATE
            }, dir => {
                // Given a 60-workflow registry whose compact rows alone overflow the cap (measured with the real builder)
                const registry = syntheticRegistry(60);
                const compactRows = catalogLib.buildWorkflowSkillsCatalog({ rootDir: dir, sections: ['workflows'], compact: true });
                assertTrue(compactRows.length > PAYLOAD_CAP, `precondition: the compact rows must overflow (${compactRows.length} chars)`);
                // When the catalog output is built
                const catalog = hook.buildCatalogInjection(dir);
                // Then it fits the cap as the index with parallel-phase marks
                assertTrue(catalog.length <= PAYLOAD_CAP, `catalog output is ${catalog.length} chars, cap ${PAYLOAD_CAP}`);
                assertNotContains(catalog, COMPACT_HEADER, 'the compact catalog overflows here, so the index replaces it');
                // And it keeps the advancement clause and the pointer to the registry
                assertTrue(ADVANCEMENT_CLAUSE.test(catalog), 'the advancement clause must stay');
                assertTrue(INDEX_POINTER.test(catalog), 'the index must point at .claude/workflows.json and start-workflow <id>');
                // And every workflow keeps its id and tier, with its barrier token when it declares one
                for (const [id, workflow] of Object.entries(registry.workflows)) {
                    const row = workflowRow(catalog, id);
                    assertTrue(Boolean(row), `missing index row for ${id}`);
                    assertContains(row, `| ${workflow.activation} |`, `${id} must show its tier`);
                    const expected = (workflow.parallelGroups || []).length;
                    assertTrue((row.match(BARRIER_TOKEN) || []).length === expected, `${id}: expected ${expected} barrier token(s): ${row}`);
                }
                // And the gate is untouched by the fallback: its marker and whole body arrive in the route output
                const route = hook.buildInjection(dir);
                assertContains(route, hook.GATE_MARKER);
                assertContains(route, FULL_SIZE_GATE_BODY, 'the gate body must be delivered whole');
                assertNoCatalog(route, '60 workflows');
            })
        },
        {
            name: '[workflow-routing-switch] [cap] TC-WFR-001 pointer-only fallback drops workflow rows when even the index overflows',
            fn: () => isolatedFixture({
                '.claude/workflows.json': JSON.stringify(syntheticRegistry(250, 3)),
                [GATE_FILE]: FULL_SIZE_GATE
            }, dir => {
                // Given 250 workflows: even the tiers-only index overflows the cap (measured with the real builder)
                const tiersIndex = catalogLib.buildWorkflowPointerCatalog({ rootDir: dir, rows: 'tiers' });
                assertTrue(tiersIndex.length > PAYLOAD_CAP, `precondition: the tiers-only index must overflow (${tiersIndex.length} chars)`);
                // When the catalog output is built
                const catalog = hook.buildCatalogInjection(dir);
                // Then only the mandatory parts remain, under the cap
                assertTrue(catalog.length <= PAYLOAD_CAP, `catalog output is ${catalog.length} chars, cap ${PAYLOAD_CAP}`);
                assertTrue(ADVANCEMENT_CLAUSE.test(catalog), 'the advancement clause must stay');
                assertTrue(INDEX_POINTER.test(catalog), 'the pointer to the registry must stay');
                assertTrue(!workflowRow(catalog, 'workflow-synthetic-01-route'), 'workflow rows are dropped at this size');
                assertTrue(!hasWorkflowRows(catalog), 'no workflow row of any id remains');
                assertCatalogBlock(catalog, '250 workflows');
                // And the gate body is still delivered whole, in the route output
                assertContains(hook.buildInjection(dir), FULL_SIZE_GATE_BODY, 'the gate body must be delivered whole');
            })
        },
        {
            // Intent: BR-WFR-01's middle fallback. When the index with parallel-phase marks is still
            // over the cap, rows with tier only must be tried before every row is dropped.
            name: '[workflow-routing-switch] [cap] TC-WFR-001 tiers-only index fallback: rows keep id and tier when the marked index overflows',
            fn: () => isolatedFixture({ [GATE_FILE]: FULL_SIZE_GATE }, dir => {
                // Given a registry grown (measured with the real builders, not a hard-coded count) until
                // the marked index no longer fits the catalog output
                const registryFile = path.join(dir, '.claude', 'workflows.json');
                let registry = null;
                let catalog = '';
                let tiersBody = '';
                // Grow by ~25% per step: the tiers-only window spans many sizes, and each build costs time.
                for (let count = 1; count <= 400 && !catalog; count += Math.max(1, Math.floor(count / 4))) {
                    registry = wideGroupRegistry(count);
                    fs.writeFileSync(registryFile, JSON.stringify(registry), 'utf8');
                    tiersBody = catalogLib.buildWorkflowPointerCatalog({ rootDir: dir, rows: 'tiers' });
                    const built = hook.buildCatalogInjection(dir);
                    if (built.includes(tiersBody)) catalog = built;
                }
                assertTrue(Boolean(catalog), 'precondition: some registry size lands on the tiers-only index');
                const overhead = catalog.length - tiersBody.length;
                const groupsBody = catalogLib.buildWorkflowPointerCatalog({ rootDir: dir, rows: 'groups' });
                assertTrue(overhead + groupsBody.length > PAYLOAD_CAP,
                    `precondition: the marked index must overflow (${overhead + groupsBody.length} chars)`);
                // When the catalog output is built (above)
                // Then it fits the cap as the tiers-only index
                assertTrue(catalog.length <= PAYLOAD_CAP, `catalog output is ${catalog.length} chars, cap ${PAYLOAD_CAP}`);
                assertNotContains(catalog, COMPACT_HEADER, 'the compact catalog overflows here');
                // And every workflow keeps a two-column `| id | tier |` row with no barrier mark
                for (const [id, workflow] of Object.entries(registry.workflows)) {
                    assertTrue(workflowRow(catalog, id) === `| \`${id}\` | ${workflow.activation} |`,
                        `${id}: expected a two-column tier row, got ${workflowRow(catalog, id)}`);
                }
                const markedRows = catalog.split(/\r?\n/).filter(line => line.startsWith('| `') && line.includes('∥'));
                assertTrue(markedRows.length === 0, `tiers-only rows carry no barrier mark: ${markedRows[0]}`);
                // And the advancement clause and the pointer to the registry stay
                assertTrue(ADVANCEMENT_CLAUSE.test(catalog), 'the advancement clause must stay');
                assertTrue(INDEX_POINTER.test(catalog), 'the index must point at .claude/workflows.json and start-workflow <id>');
                // And the gate body is still delivered whole, in the route output
                assertContains(hook.buildInjection(dir), FULL_SIZE_GATE_BODY, 'the gate body must be delivered whole');
            })
        },
        {
            // Intent: BR-WFR-01 never drops or cuts a configured protocol: the route output holds all of it
            // even when that keeps the output over the cap, and it never costs the catalog its form.
            name: '[workflow-routing-switch] [cap] TC-WFR-001 a protocol larger than the cap is sent complete in the route output and the catalog stays compact',
            fn: () => isolatedFixture({
                '.claude/workflows.json': GROUPED_REGISTRY,
                [GATE_FILE]: FIXTURE_GATE,
                'CLAUDE.md': ROOT_WITH_POINTER
            }, dir => {
                // Given a small registry and a project protocol longer than the cap on its own
                const protocol = Array.from({ length: 400 }, (_, line) => `Project route rule ${line}: prefer the lean route.`).join('\n');
                assertTrue(protocol.length > PAYLOAD_CAP, `precondition: protocol is ${protocol.length} chars`);
                // When the two outputs are built
                const route = hook.buildInjection(dir, protocol);
                const catalog = hook.buildCatalogInjection(dir);
                // Then the route output is returned whole, over the cap: the gate and the protocol uncut
                assertTrue(route.length > PAYLOAD_CAP, `route output is ${route.length} chars`);
                assertContains(route, `${hook.PROTOCOL_START}\n${protocol}\n${hook.PROTOCOL_END}`, 'the protocol must be delivered whole');
                assertContains(route, hook.GATE_MARKER);
                assertContains(route, FIXTURE_GATE_BODY, 'the gate body must be delivered with the protocol');
                assertTrue(route.startsWith(`${hook.ROUTE_START}\n`) && route.endsWith(`\n${hook.ROUTE_END}`), 'the route block is closed, not cut');
                assertNoCatalog(route, 'oversized protocol');
                // And the catalog output is unaffected: compact, every row, the advancement clause, under the cap
                assertTrue(catalog.length <= PAYLOAD_CAP, `catalog output is ${catalog.length} chars, cap ${PAYLOAD_CAP}`);
                assertContains(catalog, COMPACT_HEADER, 'a large protocol must not cost the catalog its compact form');
                assertTrue(Boolean(workflowRow(catalog, 'workflow-grouped')) && Boolean(workflowRow(catalog, 'workflow-plain')), 'every row stays');
                assertTrue(ADVANCEMENT_CLAUSE.test(catalog), 'the advancement clause must stay');
                assertNotContains(catalog, hook.PROTOCOL_START, 'the protocol belongs to the route output only');
                assertTrue(catalog === hook.buildCatalogInjection(dir, 'ask'), 'the catalog output does not depend on the protocol');
            })
        },
        {
            // Intent: BR-WFR-01 says "at most 9,500": a catalog output of exactly the cap is kept, one more
            // character falls to the next form.
            name: '[workflow-routing-switch] [cap] TC-WFR-001 a compact payload of exactly 9,500 chars is kept; 9,501 falls back, first without the step-skill names, then to the index',
            fn: () => isolatedFixture({ [GATE_FILE]: FIXTURE_GATE }, dir => {
                const count = 60;
                const ids = Object.keys(paddedRegistry(count).workflows);
                const registryFile = path.join(dir, '.claude', 'workflows.json');
                const build = pad => {
                    fs.writeFileSync(registryFile, JSON.stringify(paddedRegistry(count, pad)), 'utf8');
                    return hook.buildCatalogInjection(dir);
                };
                // Given a registry whose hints are sized (measured with the real builder) so the compact
                // catalog lands exactly on the cap: the output grows one character per hint character
                const base = build(0);
                assertContains(base, 'Step skills:', 'precondition: the unpadded registry keeps the full compact catalog');
                const pad = PAYLOAD_CAP - base.length;
                assertTrue(pad > 0 && pad < count * PAD_PER_HINT, `precondition: an unpadded catalog of ${base.length} chars leaves room to pad to the cap`);
                // When the catalog output is built at the cap and one character over it
                const atCap = build(pad);
                const overCap = build(pad + 1);
                // Then exactly 9,500 keeps the compact catalog with its step-skill names
                assertTrue(atCap.length === PAYLOAD_CAP, `catalog output is ${atCap.length} chars`);
                assertContains(atCap, COMPACT_HEADER, 'a catalog at the cap must keep the compact form');
                assertContains(atCap, 'Step skills:', 'a catalog at the cap keeps the step-skill names');
                // And 9,501 drops only the step-skill names: every workflow row stays, under the cap
                assertContains(overCap, COMPACT_HEADER, 'one over the cap keeps the compact rows');
                assertNotContains(overCap, 'Step skills:', 'one over the cap drops the step-skill names first');
                assertTrue(ids.every(id => Boolean(workflowRow(overCap, id))), 'every row stays');
                assertTrue(overCap.length <= PAYLOAD_CAP, `fallback catalog output is ${overCap.length} chars`);
                // And a registry too large even for the compact rows falls to the index, still under the cap
                const far = build(count * PAD_PER_HINT);
                assertNotContains(far, COMPACT_HEADER, 'a catalog far over the cap must fall back to the index');
                assertTrue(INDEX_POINTER.test(far), 'the fallback is the index');
                assertTrue(ids.every(id => Boolean(workflowRow(far, id))), 'the index keeps a row per workflow');
                assertTrue(far.length <= PAYLOAD_CAP, `index catalog output is ${far.length} chars`);
            })
        },
        {
            name: '[workflow-routing-switch] [cap] TC-WFR-001 payload size guard: this framework registry fits under 9,500 chars',
            skip: FRAMEWORK_REPO_SKIP,
            fn: () => {
                // Given this repository's own registry
                const registry = JSON.parse(fs.readFileSync(path.join(PROJECT_DIR, '.claude', 'workflows.json'), 'utf8'));
                // When the catalog output is built
                const catalog = hook.buildCatalogInjection(PROJECT_DIR);
                // Then it fits the cap and every workflow row is model-visible
                assertTrue(catalog.length <= PAYLOAD_CAP, `catalog output is ${catalog.length} chars, cap ${PAYLOAD_CAP}`);
                for (const id of Object.keys(registry.workflows)) {
                    assertTrue(Boolean(workflowRow(catalog, id)), `missing row for ${id}`);
                }
            }
        },
        {
            // Intent (BR-WFR-01, review finding F1): a gate edit must never cost this framework's own
            // catalog its compact form again. The catalog is an output of its own, measured alone, so the
            // shipped registry keeps the compact catalog in both modes while the gate arrives in full.
            name: '[workflow-routing-switch] [cap] TC-WFR-024 the catalog is its own output: this framework registry keeps the compact catalog',
            skip: FRAMEWORK_REPO_SKIP,
            fn: () => {
                // Given this repository's own registry and shipped gate file
                const registry = JSON.parse(fs.readFileSync(path.join(PROJECT_DIR, '.claude', 'workflows.json'), 'utf8'));
                const gateFile = fs.readFileSync(path.join(PROJECT_DIR, GATE_FILE), 'utf8');
                for (const mode of ['ask', 'auto']) {
                    // When the two outputs are built for the mode
                    const catalog = hook.buildCatalogInjection(PROJECT_DIR, mode);
                    const route = hook.buildInjection(PROJECT_DIR, '', mode, 'default', COMPATIBLE_PROFILE);
                    // Then the catalog output fits the cap in the compact form, with a row per workflow
                    assertTrue(catalog.length <= PAYLOAD_CAP, `${mode}: catalog output is ${catalog.length} chars, cap ${PAYLOAD_CAP}`);
                    assertContains(catalog, COMPACT_HEADER, `${mode}: the framework registry must keep the compact catalog`);
                    assertContains(catalog, 'Step skills:', `${mode}: the compact catalog keeps its line of step-skill names`);
                    assertTrue(!INDEX_POINTER.test(catalog), `${mode}: the index is a fallback this registry must not need`);
                    for (const id of Object.keys(registry.workflows)) {
                        assertTrue(Boolean(workflowRow(catalog, id)), `${mode}: missing row for ${id}`);
                    }
                    assertCatalogBlock(catalog, mode);
                    // And the route output is the full gate for that mode, with no catalog
                    assertContains(route, hook.renderGateForMode(gateFile, mode), `${mode}: the route output must carry the full gate`);
                    assertContains(route, mode === 'ask' ? '**Workflow question** (every tier)' : '**Route mode `auto`:**');
                    assertNotContains(route, COMPACT_HEADER, `${mode}: the route output carries no catalog header`);
                    assertNoCatalog(route, mode);
                    // And without a project protocol it fits one hook output, so no host cuts the gate to a preview
                    assertTrue(route.length <= PAYLOAD_CAP, `${mode}: route output is ${route.length} chars, cap ${PAYLOAD_CAP}`);
                }
            }
        },
        {
            // Intent (BR-WFR-01): the catalog's form depends on the registry alone. A longer gate or a project
            // protocol of any size is delivered in the route output and never pushes the catalog to a smaller form.
            name: '[workflow-routing-switch] [cap] TC-WFR-024 a gate or project protocol of any size never changes the catalog form',
            fn: () => isolatedFixture({
                '.claude/workflows.json': JSON.stringify(syntheticRegistry(30)),
                [GATE_FILE]: FIXTURE_GATE
            }, async dir => {
                const registry = syntheticRegistry(30);
                const gatePath = path.join(dir, ...GATE_FILE.split('/'));
                const protocol = Array.from({ length: 400 }, (_, line) => `Project route rule ${line}: prefer the lean route.`).join('\n');
                assertTrue(protocol.length > PAYLOAD_CAP, `precondition: protocol is ${protocol.length} chars`);
                // Both outputs come from the hook itself, resolving the mode and the protocol from the fixture project
                let session = 0;
                const deliver = async part => {
                    const outputs = [];
                    session += 1;
                    await hook.run(input(`form-${session}`), {
                        part, projectDir: dir, storeRoot: path.join(dir, 'state'), env: {}, homeDir: dir, now: 1000, write: writer(outputs)
                    });
                    return outputs.join('');
                };
                // Given (a) a short gate
                const shortRoute = await deliver('route');
                const shortCatalog = await deliver('catalog');
                // And (b) the same registry with a gate several thousand characters longer
                fs.writeFileSync(gatePath, FULL_SIZE_GATE, 'utf8');
                const longRoute = await deliver('route');
                const longCatalog = await deliver('catalog');
                assertTrue(longRoute.length - shortRoute.length > 3000, `precondition: the gate grew by ${longRoute.length - shortRoute.length} chars`);
                // And (c) a project protocol larger than the cap on top of it
                fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
                fs.writeFileSync(path.join(dir, 'docs', 'project-config.json'), JSON.stringify({ portability: { workflowRouteProtocol: protocol } }), 'utf8');
                const protocolRoute = await deliver('route');
                const protocolCatalog = await deliver('catalog');
                assertContains(protocolRoute, `${hook.PROTOCOL_START}\n${protocol}\n${hook.PROTOCOL_END}`, 'precondition: the protocol is configured and delivered whole');
                assertTrue(protocolRoute.length > PAYLOAD_CAP, `precondition: the route output is ${protocolRoute.length} chars`);
                // Then the catalog output is byte-identical across the three
                assertTrue(longCatalog === shortCatalog, 'a longer gate must not change the catalog output');
                assertTrue(protocolCatalog === shortCatalog, 'a project protocol must not change the catalog output');
                assertTrue(shortCatalog === `${hook.buildCatalogInjection(dir)}\n`, 'the hook delivers the built catalog output and nothing else');
                // And it is the compact catalog with its step-skill names and a row per workflow, under the cap
                assertTrue(shortCatalog.length <= PAYLOAD_CAP, `catalog output is ${shortCatalog.length} chars, cap ${PAYLOAD_CAP}`);
                assertContains(shortCatalog, COMPACT_HEADER, 'the catalog keeps the compact form');
                assertContains(shortCatalog, 'Step skills:', 'the catalog keeps its step-skill names');
                assertTrue(!INDEX_POINTER.test(shortCatalog), 'no index fallback');
                for (const id of Object.keys(registry.workflows)) {
                    assertTrue(Boolean(workflowRow(shortCatalog, id)), `missing row for ${id}`);
                }
                assertNotContains(shortCatalog, hook.PROTOCOL_START, 'the protocol belongs to the route output only');
                assertNotContains(shortCatalog, FIXTURE_GATE_BODY, 'the gate belongs to the route output only');
            })
        },
        {
            // Intent (BR-WFR-01, AC-WFR-25): the framework never drops or cuts the gate or a project protocol,
            // so a long protocol takes the route output past what a host shows in full and the host then shows
            // a preview only. The output must say so where a preview still shows it, and the protocol size it
            // names must be the size that really fits. The line appears only past the host limit, so it can
            // never be what pushes an output over that limit.
            name: '[workflow-routing-switch] [cap] TC-WFR-026 a route output past the host limit says so on its second line and names the protocol size that fits',
            fn: () => isolatedFixture({
                '.claude/workflows.json': JSON.stringify(syntheticRegistry(3)),
                [GATE_FILE]: FULL_SIZE_GATE
            }, async dir => {
                const SIZE_LINE = 'Route output size: ';
                const HOST_LIMIT = 10000;
                assertTrue(hook.HOST_OUTPUT_LIMIT === HOST_LIMIT && hook.PAYLOAD_CAP === PAYLOAD_CAP, 'the limit and the cap this case measures against');
                const routeWith = length => hook.buildInjection(dir, 'p'.repeat(length), 'ask');
                const gate = hook.renderGateForMode(FULL_SIZE_GATE, 'ask');
                // Given the gate alone, and what a protocol block adds besides its own text
                const bare = hook.buildInjection(dir, '', 'ask');
                const wrapping = routeWith(1).length - bare.length - 1;
                const atLimit = HOST_LIMIT - bare.length - wrapping;
                assertTrue(bare.length < PAYLOAD_CAP && atLimit > 0, `precondition: the gate alone is ${bare.length} chars`);
                // When the protocol lands the output exactly on the host limit
                const whole = routeWith(atLimit);
                // Then nothing is added: the output is the state line, the gate and the protocol
                assertTrue(whole.length === HOST_LIMIT, `route output is ${whole.length} chars`);
                assertNotContains(whole, SIZE_LINE, 'an output the host shows in full carries no size line');
                assertNotContains(routeWith(PAYLOAD_CAP - bare.length - wrapping + 1), SIZE_LINE, 'between the cap and the host limit no line is added either');
                // When the protocol is one character longer
                const protocol = 'p'.repeat(atLimit + 1);
                const over = hook.buildInjection(dir, protocol, 'ask');
                const lines = over.split('\n');
                // Then the second line, right after the state line, states the size and the host's limit
                assertTrue(lines[0] === hook.ROUTE_START && lines[1].startsWith('Route mode: ask'), 'the block still opens with its marker and state line');
                assertTrue(lines[2].startsWith(`${SIZE_LINE}${HOST_LIMIT + 1} characters, over the ${HOST_LIMIT} a host shows in full`), `size line: ${lines[2]}`);
                assertContains(lines[2], 'only a preview', 'it says what the host does');
                assertContains(lines[2], `\`${GATE_FILE}\``, 'it names the gate file to read in full');
                assertContains(lines[2], '`portability.workflowRouteProtocol`', 'it names the protocol setting');
                assertContains(lines[2], `that protocol is ${protocol.length} characters`, 'it gives the protocol size');
                // And the gate and the protocol still follow it whole: the framework cut nothing
                assertTrue(lines.filter(line => line.startsWith(SIZE_LINE)).length === 1, 'one size line');
                assertContains(over, gate, 'the gate is still whole');
                assertContains(over, `${hook.PROTOCOL_START}\n${protocol}\n${hook.PROTOCOL_END}`, 'the protocol is still whole');
                assertTrue(over.replace(`${lines[2]}\n`, '').length === HOST_LIMIT + 1, 'only the size line was added');
                // And the size it names is the size that fits: that protocol lands exactly on the cap, one more is over it
                const fits = Number((lines[2].match(/keeps this block whole at (\d+) or fewer/) || [])[1]);
                assertTrue(Number.isInteger(fits) && fits > 0 && fits < atLimit, `named size: ${fits}`);
                assertTrue(routeWith(fits).length === PAYLOAD_CAP, `a protocol of the named size gives ${routeWith(fits).length} chars`);
                assertTrue(routeWith(fits + 1).length === PAYLOAD_CAP + 1, 'one character more is over the cap');
                // And the hook delivers that same text for a configured protocol
                fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
                fs.writeFileSync(path.join(dir, 'docs', 'project-config.json'), JSON.stringify({ portability: { workflowRouteProtocol: protocol } }), 'utf8');
                const outputs = [];
                await hook.run(input('size-line'), { projectDir: dir, storeRoot: path.join(dir, 'state'), env: {}, homeDir: dir, now: 1000, write: writer(outputs) });
                assertTrue(outputs.join('') === `${over}\n`, 'the delivered route output is the built one, size line included');
                // Given a gate that alone is past the host limit, with no protocol
                fs.rmSync(path.join(dir, 'docs', 'project-config.json'));
                const hugeGate = FIXTURE_GATE.replace(FIXTURE_GATE_BODY, `${FIXTURE_GATE_BODY}\n${'> Route before acting.\n'.repeat(500)}`);
                fs.writeFileSync(path.join(dir, ...GATE_FILE.split('/')), hugeGate, 'utf8');
                const gateOnly = hook.buildInjection(dir, '', 'ask').split('\n')[2];
                // Then the line names no protocol size: no protocol would fit
                assertTrue(gateOnly.startsWith(SIZE_LINE), `size line: ${gateOnly}`);
                assertContains(gateOnly, 'the gate alone fills that size');
                assertNotContains(gateOnly, 'that protocol is', 'no protocol size without a protocol that could fit');
            })
        },
        {
            // Intent (BR-WFR-01): the spec and the configuration guide tell a project that a route protocol
            // of about 3,300 characters fits. That number follows the shipped gate's length, so a gate edit
            // that makes it false must turn this case red, not leave the guidance wrong.
            name: '[workflow-routing-switch] [cap] TC-WFR-026 the documented protocol size keeps this framework\'s route output within the cap',
            skip: FRAMEWORK_REPO_SKIP,
            fn: () => {
                const DOCUMENTED_PROTOCOL_SIZE = 3300;
                for (const mode of ['ask', 'auto']) {
                    // Given this repository's shipped gate and a project protocol of the documented size
                    const route = hook.buildInjection(PROJECT_DIR, 'p'.repeat(DOCUMENTED_PROTOCOL_SIZE), mode, 'default', COMPATIBLE_PROFILE);
                    // Then the route output fits the cap, so every host shows it in full and it carries no size line
                    assertTrue(route.length <= PAYLOAD_CAP, `${mode}: a ${DOCUMENTED_PROTOCOL_SIZE}-char protocol gives a route output of ${route.length} chars, cap ${PAYLOAD_CAP}`);
                    assertNotContains(route, 'Route output size: ', `${mode}: no size line within the cap`);
                }
            }
        },
        {
            // Intent (BR-WFR-03): the gate is delivered in full with the guidance, whatever the root files hold,
            // because the root files carry no route text any more; losing it would leave the route nowhere.
            name: '[workflow-routing-switch] [cap] TC-WFR-002 gate delivered in full whatever the root files hold',
            fn: async () => {
                // A directory at a root-file path is present but unreadable as a file on every OS
                // (chmod cannot make a file unreadable on Windows).
                const asDirectory = name => ({ [`${name}/.keep`]: '' });
                const layouts = [
                    { label: 'no root file', files: {} },
                    { label: 'CLAUDE.md without any route block', files: { 'CLAUDE.md': '# Project\n' } },
                    { label: 'CLAUDE.md and AGENTS.md carrying the pointer', files: { 'CLAUDE.md': ROOT_WITH_POINTER, 'AGENTS.md': ROOT_WITH_POINTER } },
                    { label: 'AGENTS.md alone carrying the pointer', files: { 'AGENTS.md': ROOT_WITH_POINTER } },
                    { label: 'CLAUDE.md from before the gate moved (still carrying the gate)', files: { 'CLAUDE.md': ROOT_WITH_LEGACY_GATE, 'AGENTS.md': ROOT_WITH_LEGACY_GATE } },
                    { label: 'CLAUDE.md present but unreadable', files: { ...asDirectory('CLAUDE.md'), 'AGENTS.md': ROOT_WITH_POINTER } }
                ];
                for (const { label, files } of layouts) {
                    await isolatedFixture({ '.claude/workflows.json': GROUPED_REGISTRY, [GATE_FILE]: FIXTURE_GATE, ...files }, dir => {
                        // Given a project whose root instruction files are: <label>
                        // When the two runtime outputs are built
                        const route = hook.buildInjection(dir);
                        const catalog = hook.buildCatalogInjection(dir);
                        // Then the gate body and its marker are always delivered, never a pointer to a root file
                        assertContains(route, hook.GATE_MARKER, `${label}: the gate marker must be delivered`);
                        assertContains(route, FIXTURE_GATE_BODY, `${label}: the gate body must be delivered`);
                        assertContains(route, hook.GATE_END_MARKER, `${label}: the gate must be delivered to its end`);
                        assertNoCatalog(route, label);
                        for (const output of [route, catalog]) {
                            assertNotContains(output, 'The routing gate is in the root instruction file', `${label}: no pointer to a root-file gate`);
                        }
                        // And the barrier contract stays, in the catalog output
                        assertContains(catalog, '[review-a ∥ review-b ∥ review-c*]', `${label}: the parallel-phase marks stay`);
                        assertTrue(ADVANCEMENT_CLAUSE.test(catalog), `${label}: the advancement clause must stay`);
                    });
                }
            }
        },
        {
            // Intent (BR-WFR-03): the gate file is the single home of the route rules; it holds no root pointer
            // block (no root file carries routing text) and keeps an `ask` variant that renders for each mode.
            name: '[workflow-routing-switch] [cap] TC-WFR-003 the gate file carries no root pointer block and keeps the ask lines',
            fn: () => {
                const gateFile = fs.readFileSync(path.join(PROJECT_DIR, GATE_FILE), 'utf8');
                assertNotContains(gateFile, 'CK:WORKFLOW-ROUTE-POINTER', 'the gate file carries no root pointer block');
                // The gate block keeps an ask variant and renders for each mode
                const ask = hook.renderGateForMode(gateFile, 'ask');
                const auto = hook.renderGateForMode(gateFile, 'auto');
                assertContains(ask, '**Workflow question** (every tier)');
                assertNotContains(ask, '**Route mode `auto`:**');
                assertContains(auto, '**Route mode `auto`:**');
                assertContains(auto, '**Workflow question** (every tier)');
                for (const text of [ask, auto]) {
                    assertNotContains(text, 'CK:GATE-MODE', 'no fence line may reach the model');
                    assertContains(text, 'An explicit workflow request always runs, mid-session included');
                    assertContains(text, 'Mixed research and modification intent is a modification', 'the mixed-intent rule rides in the delivered gate');
                }
                // A gate text with no fences and no block (a project's own file) is returned whole
                assertTrue(hook.renderGateForMode('plain gate text\n', 'auto') === 'plain gate text');
            }
        },
        {
            // Intent: parallel phases are an execution contract; the compact catalog drops step lists but
            // must still tell the model which steps start together and that it waits for all of them.
            name: '[workflow-routing-switch] [cap] TC-WFR-010 barrier tokens kept in a fixture with one grouped workflow',
            fn: () => isolatedFixture({
                '.claude/workflows.json': GROUPED_REGISTRY,
                [GATE_FILE]: FIXTURE_GATE,
                'CLAUDE.md': ROOT_WITH_POINTER
            }, dir => {
                // Given one workflow with one all-return barrier and one without
                // When the compact catalog output is built
                const payload = hook.buildCatalogInjection(dir);
                assertContains(payload, COMPACT_HEADER, 'precondition: this registry renders the compact catalog');
                // Then the grouped row carries its barrier token, the plain row none, and the clause is present
                const grouped = workflowRow(payload, 'workflow-grouped');
                assertTrue(Boolean(grouped), 'the grouped workflow must have a row');
                assertTrue((grouped.match(BARRIER_TOKEN) || []).length === 1, `expected one barrier token: ${grouped}`);
                assertContains(grouped, '[review-a ∥ review-b ∥ review-c*]');
                assertNotContains(grouped, 'investigate', 'compact rows must not carry the full step list');
                assertTrue((workflowRow(payload, 'workflow-plain').match(BARRIER_TOKEN) || []).length === 0, 'a plain workflow shows no barrier');
                assertTrue(ADVANCEMENT_CLAUSE.test(payload), 'the advancement clause must stay');
            })
        },
        {
            name: '[workflow-routing-switch] [cap] TC-WFR-010 barrier tokens kept for every grouped workflow in this framework registry',
            skip: FRAMEWORK_REPO_SKIP,
            fn: () => {
                const { resolveAllWorkflowManifests } = require(path.join(PROJECT_DIR, '.claude', 'scripts', 'lib', 'workflow-manifest.cjs'));
                // Given this repository's registry, including groups declared inside variants
                const registry = JSON.parse(fs.readFileSync(path.join(PROJECT_DIR, '.claude', 'workflows.json'), 'utf8'));
                // When the catalog output is built
                const payload = hook.buildCatalogInjection(PROJECT_DIR);
                // Then each grouped row has at least one token per group, and the advancement clause is present
                let grouped = 0;
                for (const id of Object.keys(registry.workflows)) {
                    const groups = resolveAllWorkflowManifests(registry, id, { rootDir: PROJECT_DIR })
                        .reduce((sum, manifest) => sum + (manifest.parallelGroups || []).length, 0);
                    if (groups === 0) continue;
                    grouped += 1;
                    const tokens = (workflowRow(payload, id) || '').match(BARRIER_TOKEN) || [];
                    assertTrue(tokens.length >= groups, `${id}: expected ${groups} barrier token(s), found ${tokens.length}`);
                }
                assertTrue(grouped > 0, 'the registry declares at least one parallel group');
                assertTrue(ADVANCEMENT_CLAUSE.test(payload), 'the advancement clause must stay');
            }
        },
        {
            // Intent: BR-WFR-09. A compaction drops the delivered reminder from the context, so the next prompt
            // must carry it again. Codex writes no `compact_boundary` subtype; its rollout records a compaction
            // as a top-level `{"type":"compacted"}` record, and only that record may re-arm delivery.
            name: '[workflow-routing-switch] TC-WFR-013 a Codex top-level compacted record re-arms the reminder, a nested one does not, and a Claude compact_boundary does',
            fn: () => isolatedFixture({}, async dir => {
                // Given a Codex rollout that starts with its session line, and a reminder delivered on the first prompt
                const store = path.join(dir, 'state');
                const rollout = path.join(dir, 'rollout.jsonl');
                const record = (type, payload, at) => `${JSON.stringify({ timestamp: new Date(at).toISOString(), type, payload })}\n`;
                fs.writeFileSync(rollout, record('session_meta', { id: 'codex-session' }, 500), 'utf8');
                const outputs = [];
                const prompt = now => enabledRun({ root: dir, store, session: 'codex-session', transcript: rollout, now, outputs });
                assertContains(await prompt(1000), 'route-v1', 'the first prompt receives the reminder');
                // When a second prompt arrives with no compaction since the delivery
                // Then it stays silent (already delivered)
                assertTrue(await prompt(2000) === '', 'no compaction since delivery → no repeat');
                // Boundary counter-case: "compacted" nested in another record's payload, or quoted in a message, is not a compaction
                fs.appendFileSync(rollout, record('response_item', { type: 'compacted', note: 'nested, not a record type' }, 2500), 'utf8');
                fs.appendFileSync(rollout, record('response_item', { type: 'message', content: 'the log says {"type":"compacted"} here' }, 2500), 'utf8');
                assertTrue(await prompt(3000) === '', 'a nested or quoted "compacted" must not re-arm the reminder');
                // When the rollout records a compaction as its own top-level record after the delivery
                fs.appendFileSync(rollout, record('compacted', { message: '', replacement_history: [] }, 3500), 'utf8');
                // Then the next prompt receives the reminder again, once
                assertContains(await prompt(4000), 'route-v1', 'a top-level Codex compaction must re-arm the reminder');
                assertTrue(await prompt(5000) === '', 'one compaction → one re-delivery');
                assertTrue(outputs.length === 2, `expected two deliveries, got ${outputs.length}`);
                // And on Claude, a `compact_boundary` record in the transcript re-arms the reminder the same way
                const transcript = path.join(dir, 'claude.jsonl');
                fs.writeFileSync(transcript, `${JSON.stringify({ type: 'user', message: { role: 'user', content: 'hi' } })}\n`, 'utf8');
                const claudePrompt = now => enabledRun({ root: dir, store, session: 'claude-session', transcript, now });
                assertContains(await claudePrompt(1000), 'route-v1', 'the first Claude prompt receives the reminder');
                assertTrue(await claudePrompt(2000) === '', 'no Claude compaction since delivery → no repeat');
                fs.appendFileSync(transcript, `${JSON.stringify({ type: 'system', subtype: 'compact_boundary', timestamp: new Date(2500).toISOString() })}\n`, 'utf8');
                assertContains(await claudePrompt(3000), 'route-v1', 'a Claude compact_boundary must re-arm the reminder');
            })
        },
        {
            // Intent: BR-WFR-09 / AC-WFR-24. The catalog is an output of its own, so it needs its own way back
            // into the context: a compaction (either host's record), growth of the conversation record by the
            // re-arm distance or a shrunk record must deliver it again, whatever the route output does.
            name: '[workflow-routing-switch] TC-WFR-025 the catalog output is delivered again after a compaction, record growth or a shrunk record',
            fn: () => isolatedFixture({}, async dir => {
                const store = path.join(dir, 'state');
                const catalog = (session, transcript, now) => enabledRun({ root: dir, store, session, transcript, now, content: 'catalog-v1', part: 'catalog' });
                // Given a Codex rollout whose catalog was delivered on the first prompt
                const rollout = path.join(dir, 'rollout.jsonl');
                const record = (type, payload, at) => `${JSON.stringify({ timestamp: new Date(at).toISOString(), type, payload })}\n`;
                fs.writeFileSync(rollout, record('session_meta', { id: 'codex-catalog' }, 500), 'utf8');
                assertContains(await catalog('codex-catalog', rollout, 1000), 'catalog-v1', 'the first prompt receives the catalog');
                assertTrue(await catalog('codex-catalog', rollout, 2000) === '', 'no compaction since delivery → no repeat');
                // When the rollout records a compaction as its own top-level record
                fs.appendFileSync(rollout, record('compacted', { message: '', replacement_history: [] }, 2500), 'utf8');
                // Then the next prompt receives the catalog again, once
                assertContains(await catalog('codex-catalog', rollout, 3000), 'catalog-v1', 'a Codex compaction must bring the catalog back');
                assertTrue(await catalog('codex-catalog', rollout, 4000) === '', 'one compaction → one re-delivery');
                // And on Claude, a `compact_boundary` record brings it back the same way
                const transcript = path.join(dir, 'claude.jsonl');
                fs.writeFileSync(transcript, `${JSON.stringify({ type: 'user', message: { role: 'user', content: 'hi' } })}\n`, 'utf8');
                assertContains(await catalog('claude-catalog', transcript, 1000), 'catalog-v1');
                assertTrue(await catalog('claude-catalog', transcript, 2000) === '', 'no Claude compaction since delivery → no repeat');
                fs.appendFileSync(transcript, `${JSON.stringify({ type: 'system', subtype: 'compact_boundary', timestamp: new Date(2500).toISOString() })}\n`, 'utf8');
                assertContains(await catalog('claude-catalog', transcript, 3000), 'catalog-v1', 'a Claude compact_boundary must bring the catalog back');
                // When the conversation record grows by the re-arm distance
                const grown = path.join(dir, 'grown.jsonl');
                fs.writeFileSync(grown, '', 'utf8');
                assertContains(await catalog('grown', grown, 1000), 'catalog-v1');
                fs.truncateSync(grown, hook.SETTINGS.reinjectAfterBytes);
                assertContains(await catalog('grown', grown, 2000), 'catalog-v1', 'growth by the re-arm distance must bring the catalog back');
                // When the conversation record shrinks because its context was replaced
                const shrunk = path.join(dir, 'shrunk.jsonl');
                fs.writeFileSync(shrunk, '1234567890', 'utf8');
                assertContains(await catalog('shrunk', shrunk, 1000), 'catalog-v1');
                fs.truncateSync(shrunk, 2);
                assertContains(await catalog('shrunk', shrunk, 2000), 'catalog-v1', 'a shrunk record must bring the catalog back');
            })
        }
    ]
};
