/**
 * Project-context intake: optional config stays optional; a declared invalid config
 * warns without blocking ordinary work; exact explicit repair suppresses redundant guidance.
 * Real hook processes use content-bearing fixtures, isolated home/temp/cache roots,
 * and no inherited CK_* switches. No authoring-project state is read or changed.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { childEnv, getHookPath } = require('../lib/hook-runner.cjs');
const { assertEqual, assertTrue } = require('../lib/assertions.cjs');
const { createTempDir, cleanupTempDir } = require('../lib/test-utils.cjs');

const GATE = getHookPath('init-prompt-gate.cjs');
const CUSTOM = 'config/project-config.json';
const DEFAULT = 'docs/project-config.json';
const STATE = 'tmp/claude-temp/';
const VALID = { schemaVersion: 2, project: { name: 'fixture-project' } };

function write(dir, rel, content) {
    const target = path.join(dir, ...rel.split('/'));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, typeof content === 'string' ? content : JSON.stringify(content, null, 2), 'utf8');
}

function withProject(fn) {
    const dir = createTempDir('ck-init-prompt-gate-');
    try {
        fs.mkdirSync(path.join(dir, '.claude'));
        fs.mkdirSync(path.join(dir, 'src')); // Real adopter content: setup gates must be reachable.
        return fn(dir);
    } finally {
        cleanupTempDir(dir);
    }
}

function run(dir, prompt, { launcher = false, raw = false } = {}) {
    const overrides = {
        CLAUDE_PROJECT_DIR: dir, HOME: dir, USERPROFILE: dir,
        TMPDIR: dir, TEMP: dir, TMP: dir, LOCALAPPDATA: dir, XDG_CACHE_HOME: dir,
        CLAUDE_HOOK_DEBUG: undefined
    };
    for (const key of Object.keys(process.env)) {
        if (/^CK_/i.test(key)) overrides[key] = undefined;
    }
    const args = launcher ? ['-e', `require(${JSON.stringify(GATE)})`, '--', GATE] : [GATE];
    const result = spawnSync(process.execPath, args, {
        cwd: dir, env: childEnv(overrides),
        input: raw ? prompt : JSON.stringify({ prompt, session_id: 'fixture-session' }),
        encoding: 'utf8', timeout: 10000, windowsHide: true
    });
    assertEqual(result.error, undefined, 'hook process must complete');
    assertEqual(result.status, 0, `hook process must exit normally: ${result.stderr}`);
    assertEqual(result.stderr, '', 'fixture root must resolve without fallback errors');
    return result.stdout;
}

function isBlocked(stdout) {
    return /"decision"\s*:\s*"block"/.test(stdout);
}

// An invalid config never blocks a prompt: the model is warned that its facts are unverified and the work proceeds.
function isInvalidConfigWarning(stdout) {
    return !isBlocked(stdout) && /Project config at .+ is invalid|Unable to verify the project config/.test(stdout)
        && stdout.includes('Do not rely on the sections of that config as project facts')
        && stdout.includes('derive them from repository evidence')
        && stdout.includes('Work the user asked for proceeds')
        && stdout.includes('once, never as a precondition');
}

function assertPortableOnly(stdout, configuredPath) {
    assertTrue(!isBlocked(stdout), `missing config must not block: ${stdout}`);
    assertTrue(stdout.includes(configuredPath), 'notice names the configured config');
    assertTrue(stdout.includes('portable defaults'), 'notice explains evidence-based fallback');
    assertTrue(!stdout.includes('/ai-context-refresh'), 'no automatic root generation without config');
    assertTrue(!stdout.includes('/sync-codex'), 'no automatic mirror generation without config');
    assertTrue(!stdout.includes('/scan-all'), 'no config-dependent scan reminder without config');
    assertTrue(!stdout.includes('Automatically invoke'), 'setup must remain an optional invitation');
}

module.exports = {
    name: 'init-prompt-gate',
    tests: [
        {
            // Business Intent: healthy configured-path projects retain optional setup.
            // TestSpec: TC-PCI-001
            name: '[init-prompt-gate] TC-PCI-001 valid custom config preserves root setup',
            fn: () => withProject(dir => {
                write(dir, '.claude/.ck.json', { portability: { projectConfigPath: CUSTOM } });
                write(dir, CUSTOM, VALID);
                assertTrue(!fs.existsSync(path.join(dir, DEFAULT)), 'default config is absent');
                const stdout = run(dir, 'do normal work');
                assertTrue(!isBlocked(stdout), `valid custom config permits ordinary work: ${stdout}`);
                assertTrue(stdout.includes('/ai-context-refresh'), 'valid config still offers missing root setup');
            })
        },
        {
            // Business Intent: config-less adopters use evidence, even with content or old scan state.
            // TestSpec: TC-PCI-071
            name: '[init-prompt-gate] TC-PCI-071 missing config stays optional across paths and leftover state',
            fn: () => {
                for (const configuredPath of [DEFAULT, CUSTOM]) {
                    for (const hasStaleFlag of [false, true]) withProject(dir => {
                        if (configuredPath === CUSTOM) write(dir, '.claude/.ck.json', { portability: { projectConfigPath: CUSTOM } });
                        if (hasStaleFlag) write(dir, `${STATE}.scan-stale`, { docs: [{ filename: 'structure.md', ageDays: 90, scanSkill: 'scan --target=project-structure' }] });
                        assertPortableOnly(run(dir, 'add a login button'), configuredPath);
                        assertEqual(run(dir, 'continue ordinary work'), '', 'repeat prompt must not introduce setup or repeat the daily notice');
                        write(dir, configuredPath, { project: { name: '' } });
                        assertTrue(isInvalidConfigWarning(run(dir, 'do normal work')), 'property boundary: invalid recorded settings warn without blocking');
                    });
                }
            }
        },
        {
            // Business Intent: an adopter with no settings sees only a bounded optional invitation.
            // TestSpec: TC-PCI-011
            name: '[init-prompt-gate] TC-PCI-011 bare adopter works on portable defaults',
            fn: () => withProject(dir => {
                assertPortableOnly(run(dir, 'add a login button'), DEFAULT);
                assertEqual(run(dir, 'continue work'), '', 'ordinary work remains quiet after notice');
            })
        },
        {
            // Business Intent: the maintainer can reach the offered settings repair despite invalid facts.
            // TestSpec: TC-PCI-021
            name: '[init-prompt-gate] TC-PCI-021 invalid settings still permit explicit repair',
            fn: () => withProject(dir => {
                write(dir, DEFAULT, { project: { name: '' } });
                for (const prefix of ['/', '$']) for (const command of ['project-init', 'init-project', 'project-config']) {
                    assertEqual(run(dir, `${prefix}${command} --update`), '', 'offered repair remains available');
                }
            })
        },
        {
            // Business Intent: the optional reminder can recur after its documented one-day window.
            // TestSpec: TC-PCI-012
            name: '[init-prompt-gate] TC-PCI-012 missing-config notice expires after one day',
            fn: () => withProject(dir => {
                assertPortableOnly(run(dir, 'do normal work'), DEFAULT);
                const flag = path.join(dir, `${STATE}.init-dismissed`);
                const past = new Date(Date.now() - 25 * 60 * 60 * 1000);
                fs.utimesSync(flag, past, past);
                assertPortableOnly(run(dir, 'continue work'), DEFAULT);
            })
        },
        {
            // Business Intent: invalid declared facts are named to the model and never trusted, yet never lock the user out of the session.
            // TestSpec: TC-PCI-013
            name: '[init-prompt-gate] TC-PCI-013 invalid custom config warns with its path and schema errors without blocking',
            fn: () => withProject(dir => {
                write(dir, '.claude/.ck.json', { portability: { projectConfigPath: CUSTOM } });
                write(dir, CUSTOM, { schemaVersion: 2, project: { name: '' } });
                const stdout = run(dir, 'do normal work');
                assertTrue(isInvalidConfigWarning(stdout), `invalid config warns: ${stdout}`);
                assertTrue(stdout.includes(CUSTOM), 'warning names custom path');
                assertTrue(stdout.includes('project.name'), 'warning gives actionable validation error');
            })
        },
        {
            // Business Intent: a malformed or unreadable config (a conflicted file mid-rebase) is warned about and never blocks the prompt.
            // TestSpec: TC-PCI-013
            name: '[init-prompt-gate] TC-PCI-013 malformed or unreadable config warns without blocking',
            fn: () => {
                for (const invalidKind of ['malformed', 'directory']) withProject(dir => {
                    if (invalidKind === 'malformed') write(dir, DEFAULT, '{');
                    else fs.mkdirSync(path.join(dir, DEFAULT), { recursive: true });
                    assertTrue(isInvalidConfigWarning(run(dir, 'do normal work')), `${invalidKind} declared config warns`);
                });
            }
        },
        {
            // Business Intent: the invalid-config warning cannot be waived through advisory dismissal state or wording.
            // TestSpec: TC-PCI-013
            name: '[init-prompt-gate] TC-PCI-013 invalid config warning ignores setup dismissals',
            fn: () => withProject(dir => {
                write(dir, DEFAULT, { project: { name: '' } });
                for (const flag of ['.init-dismissed', '.agent-files-dismissed', '.graph-dismissed']) write(dir, `${STATE}${flag}`, new Date().toISOString());
                for (const prompt of ['skip init', 'skip setup', 'skip scan', 'skip graph', '/scan-all', '/graph-code --mode=build']) {
                    assertTrue(isInvalidConfigWarning(run(dir, prompt)), `invalid facts still warn for ${prompt}`);
                }
            })
        },
        {
            // Business Intent / Invariant: all three genuine repair names allow end-of-token or whitespace arguments, for both hosts.
            // TestSpec: TC-PCI-072
            name: '[init-prompt-gate] TC-PCI-072 exact slash and dollar repair commands remain available',
            fn: () => withProject(dir => {
                write(dir, DEFAULT, { project: { name: '' } });
                for (const prefix of ['/', '$']) for (const command of ['project-init', 'init-project', 'project-config']) {
                    for (const suffix of ['', ' --update', '\t--update', '\n--update']) {
                        assertEqual(run(dir, `  ${prefix}${command.toUpperCase()}${suffix}`), '', 'explicit repair must remain usable');
                        assertTrue(isInvalidConfigWarning(run(dir, `${prefix}${command}-extra${suffix}`)), 'a different action retains the warning while work proceeds');
                    }
                }
            })
        },
        {
            // Business Intent / Invariant: only the complete repair token suppresses redundant warnings, never another name or incidental mention.
            // TestSpec: TC-PCI-051
            name: '[init-prompt-gate] TC-PCI-051 repair prefixes and incidental mentions cannot suppress the invalid-config warning',
            fn: () => withProject(dir => {
                write(dir, DEFAULT, { project: { name: '' } });
                for (const prefix of ['/', '$']) for (const command of ['project-init', 'init-project', 'project-config']) {
                    for (const suffix of ['-extra', '.fake', '_extra', ':extra', '/extra', '!', '2']) {
                        const prompt = `${prefix}${command}${suffix} do normal work`;
                        assertTrue(isInvalidConfigWarning(run(dir, prompt)), `different command must still warn: ${prompt}`);
                    }
                    assertTrue(isInvalidConfigWarning(run(dir, `please mention ${prefix}${command}`)), 'incidental mention does not count as repair');
                }
            })
        },
        {
            // Business Intent: stale-document guidance offers the supported narrow refresh action.
            // TestSpec: TC-PCI-031
            name: '[init-prompt-gate] TC-PCI-031 stale references name the supported single-document scan',
            fn: () => withProject(dir => {
                write(dir, DEFAULT, { ...VALID, hooks: { codeGraph: { enabled: 'off' } } });
                write(dir, 'CLAUDE.md', '# Project instructions');
                write(dir, 'AGENTS.md', '# Project instructions');
                write(dir, `${STATE}.scan-stale`, { docs: [{ filename: 'structure.md', ageDays: 90, scanSkill: 'scan --target=project-structure' }] });
                const stdout = run(dir, 'do normal work');
                assertTrue(!isBlocked(stdout), 'staleness guidance remains advisory');
                assertTrue(stdout.includes('/scan --target=project-structure'), 'producer-owned target command remains available');
                assertTrue(stdout.includes('/scan --target=<key>'), 'generic narrow-refresh route is supported');
                assertTrue(stdout.includes('/scan-all'), 'all-document refresh route remains available');
                assertTrue(!stdout.includes('/scan-<name>'), 'removed individual scan aliases are never suggested');
            })
        },
        {
            // Technical invariant: supported node-e host launcher uses the same config-state routing.
            name: '[init-prompt-gate] Codex node-e launcher preserves missing and invalid routing',
            fn: () => withProject(dir => {
                assertPortableOnly(run(dir, 'do normal work', { launcher: true }), DEFAULT);
                write(dir, DEFAULT, { project: { name: '' } });
                assertTrue(isInvalidConfigWarning(run(dir, '$project-config-extra', { launcher: true })), 'node-e warns on nonrepair');
                assertEqual(run(dir, '$project-config --update', { launcher: true }), '', 'node-e permits exact repair');
            })
        },
        {
            // Technical invariant: bad host input adds no guidance and does not crash prompt processing.
            name: '[init-prompt-gate] empty malformed or nontext prompt input fails open quietly',
            fn: () => withProject(dir => {
                for (const input of ['', '{', 'null', '{}', '{"prompt":{}}', '{"prompt":42}', '{"prompt":"  "}']) {
                    assertEqual(run(dir, input, { raw: true }), '', 'bad input adds no context');
                }
            })
        }
    ]
};
