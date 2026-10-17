'use strict';

/**
 * Quality-skill reminder after tool results (hooks/quality-skill-remind.cjs) — guarded contracts:
 *   deliver    the first tool result of a scope delivers the canonical `SYNC:quality-skill-routing:reminder`
 *              digest as PostToolUse additionalContext, never a decision;
 *   dedup      a repeat stays silent until the transcript grows by 150,000 tokens × BYTES_PER_TOKEN, a
 *              compaction (primary boundary or Codex `compacted` record) is recorded, or the digest changes;
 *   scope      each sub-agent scope gets its own delivery and its own compaction re-arms only it;
 *   silent     other events and a missing session id print and record nothing;
 *   off        `enabled: false` or CK_QUALITY_SKILL_REMINDER=0 prints and records nothing;
 *   fallback   the built-in digest equals the canonical `:reminder` body, which names every route
 *              (framework repo only);
 *   wiring     registered on PostToolUse for every tool (framework repo only); the real process exits 0.
 * Fixtures are temp projects removed in `finally`; the child process gets HOME/USERPROFILE/TMPDIR/
 * TEMP/TMP pointed at the fixture and every inherited CK_* key blanked.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const HOOKS_DIR = path.resolve(__dirname, '../..');
const REPO_ROOT = path.resolve(HOOKS_DIR, '..', '..');
const HOOK = path.join(HOOKS_DIR, 'quality-skill-remind.cjs');
const hook = require(HOOK);
const { BYTES_PER_TOKEN } = require(path.join(HOOKS_DIR, 'lib', 'file-conventions.cjs'));
const { isFrameworkRepo } = require(path.join(HOOKS_DIR, 'tests', 'lib', 'framework-repo-guard.cjs'));

const IS_FRAMEWORK_REPO = isFrameworkRepo(REPO_ROOT);
const SESSION = 'session-q';
const CANONICAL_REL = ['.claude', 'skills', 'shared', 'sync-inline-versions.md'];
const FIXTURE_BODY = '**Quality skills first:** fixture digest — why-review, changes-review, investigate --mode=debug.';
const ROUTES = ['`why-review`', '`changes-review`', '`workflow-review-changes`', '`test`', '`investigate --mode=debug`'];

async function withFixture(fn) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'quality-skill-remind-'));
    const project = path.join(root, 'project');
    const transcripts = path.join(root, 'transcripts');
    fs.mkdirSync(path.join(project, ...CANONICAL_REL.slice(0, -1)), { recursive: true });
    fs.mkdirSync(transcripts, { recursive: true });
    fs.writeFileSync(path.join(project, ...CANONICAL_REL), `# Shared\n\n## SYNC:quality-skill-routing:reminder\n\n${FIXTURE_BODY}\n\n---\n`);
    const fx = {
        root,
        project,
        main: path.join(transcripts, `${SESSION}.jsonl`),
        store: path.join(project, 'tmp', 'protocol-delivery'),
        sub(id) {
            const dir = path.join(transcripts, SESSION, 'subagents');
            fs.mkdirSync(dir, { recursive: true });
            const file = path.join(dir, `agent-${id}.jsonl`);
            if (!fs.existsSync(file)) fs.writeFileSync(file, '');
            return file;
        }
    };
    fs.writeFileSync(fx.main, '');
    try {
        return await fn(fx);
    } finally {
        fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
}

function toolEvent(fx, extra = {}) {
    return { hook_event_name: 'PostToolUse', session_id: SESSION, transcript_path: fx.main, cwd: fx.project, tool_name: 'Bash', tool_input: { command: 'ls' }, ...extra };
}

/** In-process run: project fixed, settings injected, output captured. */
function fire(fx, event, extra = {}) {
    return hook.run(event, { env: {}, projectDir: fx.project, rawSettings: {}, write: (_text, done) => done(true), ...extra });
}

const boundary = at => `${JSON.stringify({ type: 'system', subtype: 'compact_boundary', timestamp: new Date(at).toISOString() })}\n`;

function isolatedEnv(fx) {
    const env = { ...process.env, HOME: fx.root, USERPROFILE: fx.root, TMPDIR: fx.root, TEMP: fx.root, TMP: fx.root, CLAUDE_PROJECT_DIR: fx.project };
    for (const key of Object.keys(env)) {
        if (/^CK_/i.test(key) || /(?:API_KEY|TOKEN|SECRET|PASSWORD)/i.test(key)) env[key] = '';
    }
    return env;
}

const tests = [
    {
        name: '[quality-skill-remind] TC-QSR-001 the first tool result of a scope delivers the digest as PostToolUse context, then stays silent',
        fn: () => withFixture(async fx => {
            // When the first tool result of the session arrives
            const payload = await fire(fx, toolEvent(fx));
            // Then the digest arrives as advisory context only
            const parsed = JSON.parse(payload);
            assert.deepEqual(Object.keys(parsed), ['hookSpecificOutput'], 'no decision field');
            assert.equal(parsed.hookSpecificOutput.hookEventName, 'PostToolUse');
            assert.ok(parsed.hookSpecificOutput.additionalContext.includes(FIXTURE_BODY));
            assert.ok(parsed.hookSpecificOutput.additionalContext.startsWith(hook.MARKER_START));
            // And any later tool result inside the window stays silent, whatever the tool
            assert.equal(await fire(fx, toolEvent(fx, { tool_name: 'Read' })), '');
        })
    },
    {
        name: '[quality-skill-remind] TC-QSR-002 re-delivers only when the transcript has grown by 150K tokens',
        fn: () => withFixture(async fx => {
            assert.equal(hook.DEFAULT_REINJECT_TOKENS, 150000);
            assert.ok(await fire(fx, toolEvent(fx)));
            // One byte short of the window: still present
            fs.appendFileSync(fx.main, 'x'.repeat(hook.DEFAULT_REINJECT_TOKENS * BYTES_PER_TOKEN - 1));
            assert.equal(await fire(fx, toolEvent(fx)), '', 'inside the window');
            // Exactly the window: delivered again, then silent
            fs.appendFileSync(fx.main, 'x');
            assert.ok(await fire(fx, toolEvent(fx)), 'at the window edge');
            assert.equal(await fire(fx, toolEvent(fx)), '', 'a new window starts');
        })
    },
    {
        name: '[quality-skill-remind] TC-QSR-003 a compaction or a changed digest re-delivers at once; elapsed time alone never does',
        fn: () => withFixture(async fx => {
            const t1 = Date.parse('2026-01-01T00:00:00Z');
            assert.ok(await fire(fx, toolEvent(fx), { now: t1 }));
            assert.equal(await fire(fx, toolEvent(fx), { now: t1 + 3 * 24 * 60 * 60 * 1000 }), '', 'days later, no growth: silent');
            // The primary host's compaction boundary
            fs.appendFileSync(fx.main, boundary(t1 + 30000));
            assert.ok(await fire(fx, toolEvent(fx), { now: t1 + 60000 }), 'compaction re-arms');
            assert.equal(await fire(fx, toolEvent(fx), { now: t1 + 61000 }), '');
            // The second host's top-level compaction record
            fs.appendFileSync(fx.main, `${JSON.stringify({ timestamp: new Date(t1 + 90000).toISOString(), ordinal: 3, type: 'compacted', payload: {} })}\n`);
            assert.ok(await fire(fx, toolEvent(fx), { now: t1 + 120000 }), 'Codex compaction re-arms');
            // A changed digest
            assert.ok(await fire(fx, toolEvent(fx), { now: t1 + 121000, content: 'changed digest' }), 'content change re-delivers');
        })
    },
    {
        name: '[quality-skill-remind] TC-QSR-004 each sub-agent scope gets its own delivery and its own compaction re-arms only it',
        fn: () => withFixture(async fx => {
            const t1 = Date.parse('2026-01-01T00:00:00Z');
            const agent = id => toolEvent(fx, { agent_id: id });
            assert.ok(await fire(fx, toolEvent(fx), { now: t1 }), 'main scope');
            const transcript = fx.sub('a1');
            assert.ok(await fire(fx, agent('a1'), { now: t1 }), 'sub-agent scope');
            assert.equal(await fire(fx, agent('a1'), { now: t1 + 1000 }), '', 'deduplicated in that scope');
            // When the running sub-agent compacts (no host event reports it)
            fs.appendFileSync(transcript, boundary(t1 + 2000));
            // Then its next tool result restores the digest, and the main scope stays silent
            assert.ok(await fire(fx, agent('a1'), { now: t1 + 3000 }), 'sub-agent compaction re-arms it');
            assert.equal(await fire(fx, toolEvent(fx), { now: t1 + 3000 }), '', 'main scope unaffected');
        })
    },
    {
        name: '[quality-skill-remind] TC-QSR-005 other events, malformed input and a missing or blank session id stay silent and record nothing',
        fn: () => withFixture(async fx => {
            const silent = [
                ['PreToolUse', toolEvent(fx, { hook_event_name: 'PreToolUse' })],
                ['UserPromptSubmit', toolEvent(fx, { hook_event_name: 'UserPromptSubmit', prompt: 'review this' })],
                ['SubagentStart', toolEvent(fx, { hook_event_name: 'SubagentStart', agent_id: 'a1' })],
                ['missing session id', toolEvent(fx, { session_id: undefined })],
                ['blank session id', toolEvent(fx, { session_id: '  ' })],
                ['null', null],
                ['array', []]
            ];
            for (const [label, event] of silent) assert.equal(await fire(fx, event), '', label);
            assert.equal(fs.existsSync(fx.store), false, 'no ledger store written');
            assert.ok(await fire(fx, toolEvent(fx)), 'the first served event still delivers');
        })
    },
    {
        name: '[quality-skill-remind] TC-QSR-006 switched off by settings or env: prints and records nothing',
        fn: () => withFixture(async fx => {
            for (const value of [false, 'off', '0']) {
                assert.equal(await fire(fx, toolEvent(fx), { rawSettings: { enabled: value } }), '', `enabled: ${JSON.stringify(value)}`);
            }
            assert.equal(await fire(fx, toolEvent(fx), { env: { [hook.ENV_SWITCH]: '0' } }), '', 'env switch');
            assert.equal(fs.existsSync(fx.store), false, 'no ledger store written');
        })
    },
    {
        name: '[quality-skill-remind] TC-QSR-007 the real process emits the digest once and exits 0; bad input exits 0 with no stdout',
        fn: () => withFixture(async fx => {
            const run = input => spawnSync(process.execPath, [HOOK], { cwd: fx.project, input, encoding: 'utf8', windowsHide: true, env: isolatedEnv(fx), timeout: 20000 });
            const first = run(JSON.stringify(toolEvent(fx)));
            assert.equal(first.status, 0, first.stderr);
            assert.ok(JSON.parse(first.stdout).hookSpecificOutput.additionalContext.includes(FIXTURE_BODY));
            const repeat = run(JSON.stringify(toolEvent(fx)));
            assert.equal(repeat.status, 0);
            assert.equal(repeat.stdout, '', 'deduplicated across processes');
            for (const input of ['', 'not json', '[]']) {
                const bad = run(input);
                assert.equal(bad.status, 0, `exit 0 for ${JSON.stringify(input)}`);
                assert.equal(bad.stdout, '', `no stdout for ${JSON.stringify(input)}`);
            }
        })
    },
    {
        name: '[quality-skill-remind] TC-QSR-008 the built-in digest equals the canonical reminder, which names every route (framework repo only)',
        skip: IS_FRAMEWORK_REPO ? false : 'asserts the framework repo\'s own canonical protocol (framework-repo signal)',
        fn: () => {
            const { readCanonicalProtocol } = require(path.join(REPO_ROOT, '.claude', 'scripts', 'lib', 'canonical-protocol.cjs'));
            const reminder = readCanonicalProtocol(REPO_ROOT, hook.SYNC_TAG);
            assert.equal(hook.FALLBACK_BODY, reminder.trim(), 'fallback drifted from the canonical reminder');
            for (const route of ROUTES) assert.ok(reminder.includes(route), route);
            assert.ok(reminder.length < 600, 'the digest stays small');
            const full = readCanonicalProtocol(REPO_ROOT, 'quality-skill-routing');
            for (const route of ROUTES) assert.ok(full.includes(route), `full protocol names ${route}`);
            // A pull request reaches the review workflow by the complexity of its changes; a simple one stays with changes-review.
            for (const [label, text] of [['digest', reminder], ['full protocol', full]]) {
                assert.match(text, /`changes-review`[^;]*simple pull request/, `${label}: a simple pull request routes to changes-review`);
                assert.match(text, /`workflow-review-changes`[^;]*complex/, `${label}: the review workflow is tied to complex changes`);
                assert.doesNotMatch(text, /`workflow-review-changes`[^;]*whole pull request or/, `${label}: a whole pull request alone never selects the workflow`);
            }
            const description = name => /^description: '(.*)'$/m.exec(fs.readFileSync(path.join(REPO_ROOT, '.claude', 'skills', name, 'SKILL.md'), 'utf8'))[1];
            assert.match(description('changes-review'), /simple pull request/, 'changes-review description owns simple pull requests');
            assert.match(description('workflow-review-changes'), /complex, risky or cross-module/, 'the workflow description is conditioned on complexity');
        }
    },
    {
        name: '[quality-skill-remind] TC-QSR-009 registered on PostToolUse for every tool (framework repo only)',
        skip: IS_FRAMEWORK_REPO ? false : 'asserts the framework repo\'s own settings (framework-repo signal)',
        fn: () => {
            const settings = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.claude', 'settings.json'), 'utf8'));
            const owns = group => group.hooks.some(h => h.command.includes('quality-skill-remind.cjs'));
            const post = settings.hooks.PostToolUse.filter(owns);
            assert.equal(post.length, 1, 'one PostToolUse registration');
            assert.equal(post[0].matcher, '*');
            for (const event of Object.keys(settings.hooks).filter(name => name !== 'PostToolUse')) {
                assert.equal(settings.hooks[event].filter(owns).length, 0, `not registered on ${event}`);
            }
        }
    }
];

module.exports = { name: 'quality-skill-remind', tests };
