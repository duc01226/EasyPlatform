'use strict';

/**
 * OS-essentials child environment (tests/lib/os-essentials-env.cjs) and the scrubbed-environment spawns
 * that rely on it.
 *
 * Intent protected: a test that scrubs a child's environment still hands it the keys the operating system
 * needs. On Windows a child without SystemDrive / ProgramData / ALLUSERSPROFILE resolves registry paths that
 * contain those variables literally, so a process that touches the shell writes its cache files
 * (`%SystemDrive%\ProgramData\Microsoft\Windows\Caches\*.db`) under its working directory, which is the
 * repository root when the test passes no `cwd`. The scrub must still drop feature switches, provider keys
 * and the project dir, and must redirect HOME and the temp keys (Portable Test Contract).
 *
 * Portability: pure-object cases name the platform they model; the real-process case uses a temp cwd and
 * reads only what the host itself defines.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { OS_ESSENTIAL_ENV_KEYS, osEssentialsEnv } = require('../lib/os-essentials-env.cjs');

const CLAUDE_DIR = path.resolve(__dirname, '..', '..', '..');
const WINDOWS_FOLDER_KEYS = ['SYSTEMDRIVE', 'PROGRAMDATA', 'ALLUSERSPROFILE'];
const NOISE = { CK_COMMIT_SKILL_ROUTE: '0', TELEGRAM_BOT_TOKEN: 'x', CLAUDE_PROJECT_DIR: '/elsewhere', NODE_OPTIONS: '--inspect', HOME: '/home/dev', USERPROFILE: 'C:\\Users\\dev', TEMP: 'C:\\Temp' };

const tests = [
    {
        name: '[os-essentials-env] Windows: the OS essentials keep their own spelling and every other inherited key is dropped',
        fn: () => {
            // Given a Windows-shaped environment with mixed-case names and developer-machine noise
            const base = {
                Path: 'C:\\bin', PATHEXT: '.EXE', SystemRoot: 'C:\\Windows', windir: 'C:\\Windows', ComSpec: 'C:\\Windows\\System32\\cmd.exe',
                SystemDrive: 'C:', ProgramData: 'C:\\ProgramData', ALLUSERSPROFILE: 'C:\\ProgramData', 'ProgramFiles(x86)': 'C:\\PF86', ...NOISE
            };
            // When the scrubbed environment is built
            const env = osEssentialsEnv({}, base, 'win32');
            // Then the well-known folder keys the shell needs are kept as the host spelled them
            for (const key of ['Path', 'PATHEXT', 'SystemRoot', 'windir', 'ComSpec', 'SystemDrive', 'ProgramData', 'ALLUSERSPROFILE', 'ProgramFiles(x86)']) {
                assert.equal(env[key], base[key], `${key} must be kept`);
            }
            // And no switch, provider key, project dir, home or temp key is copied
            for (const key of Object.keys(NOISE)) assert.equal(key in env, false, `${key} must be dropped`);
        }
    },
    {
        name: '[os-essentials-env] overrides win over the base on a case-insensitive host, set the home and temp keys, and undefined removes a key',
        fn: () => {
            const base = { Path: 'C:\\bin', SystemDrive: 'C:', ProgramData: 'C:\\ProgramData' };
            // When overrides name a key in another case, redirect home and temp, and delete a key
            const env = osEssentialsEnv({ PATH: 'C:\\fixture', HOME: 'C:\\fx', USERPROFILE: 'C:\\fx', TMPDIR: 'C:\\fx', TEMP: 'C:\\fx', TMP: 'C:\\fx', PROGRAMDATA: undefined }, base, 'win32');
            // Then there is one PATH (the override), the redirects are present, and the deleted key is gone while the rest stay
            assert.deepEqual(Object.keys(env).filter(key => key.toUpperCase() === 'PATH'), ['PATH']);
            assert.equal(env.PATH, 'C:\\fixture');
            for (const key of ['HOME', 'USERPROFILE', 'TMPDIR', 'TEMP', 'TMP']) assert.equal(env[key], 'C:\\fx', key);
            assert.equal(Object.keys(env).some(key => key.toUpperCase() === 'PROGRAMDATA'), false, 'an undefined override deletes the key');
            assert.equal(env.SystemDrive, 'C:');
        }
    },
    {
        name: '[os-essentials-env] POSIX: names match exactly, essentials stay, noise is dropped and no Windows key is invented',
        fn: () => {
            // Given a POSIX environment
            const base = { PATH: '/usr/bin', LANG: 'C.UTF-8', TZ: 'UTC', Path: '/not/the/path', HOME: '/home/dev', ...NOISE };
            // When the scrubbed environment is built
            const env = osEssentialsEnv({ HOME: '/tmp/fx' }, base, 'linux');
            // Then only the exact-name essentials and the override remain
            assert.deepEqual(env, { PATH: '/usr/bin', LANG: 'C.UTF-8', TZ: 'UTC', HOME: '/tmp/fx' });
        }
    },
    {
        name: '[os-essentials-env] a real child keeps what the host defines for the Windows well-known folders and sees none of the dropped keys',
        fn: () => {
            const cwd = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ose-')));
            try {
                // Given a parent that carries a feature switch next to the OS keys
                const base = { ...process.env, CK_OSE_PROBE: '1' };
                const env = osEssentialsEnv({ HOME: cwd, USERPROFILE: cwd, TMPDIR: cwd, TEMP: cwd, TMP: cwd }, base);
                // When a real node child lists its environment names
                const run = spawnSync(process.execPath, ['-e', 'process.stdout.write(JSON.stringify(Object.keys(process.env)))'], { cwd, env, encoding: 'utf8', windowsHide: true, timeout: 20000 });
                assert.equal(run.status, 0, run.stderr);
                const seen = JSON.parse(run.stdout).map(key => key.toUpperCase());
                // Then every Windows well-known folder key the host defines reached the child, and the switch did not
                if (process.platform === 'win32') {
                    for (const key of WINDOWS_FOLDER_KEYS) {
                        if (Object.keys(process.env).some(name => name.toUpperCase() === key)) assert.ok(seen.includes(key), `${key} must reach the child`);
                    }
                }
                assert.equal(seen.includes('CK_OSE_PROBE'), false);
                // And the child wrote nothing into its working directory
                assert.deepEqual(fs.readdirSync(cwd), []);
            } finally {
                fs.rmSync(cwd, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
            }
        }
    },
    {
        name: '[os-essentials-env] every scrubbed-environment allow-list and bare spawn in the shipped tests names the Windows well-known folder keys',
        fn: () => {
            // Given the allow-lists that build a child environment from scratch
            const sites = [
                'hooks/tests/suites/content-presence.test.cjs',
                'skills/html-export/tests/test-env.cjs',
                'skills/presentation-builder/tests/create-presentation.test.cjs'
            ];
            const problems = [];
            for (const rel of sites) {
                const file = path.join(CLAUDE_DIR, ...rel.split('/'));
                if (!fs.existsSync(file)) continue; // a project that ships without that skill or suite
                const text = fs.readFileSync(file, 'utf8');
                for (const key of WINDOWS_FOLDER_KEYS) if (!text.includes(`'${key}'`)) problems.push(`${rel}: allow-list lacks ${key}`);
            }
            // And the shared helper lists them too
            for (const key of WINDOWS_FOLDER_KEYS) assert.ok(OS_ESSENTIAL_ENV_KEYS.includes(key), `helper lacks ${key}`);
            // And no spawn builds its environment from SystemRoot and PATH alone
            const bare = /env:\s*\{\s*SystemRoot:\s*process\.env\.SystemRoot\s*,\s*PATH:\s*process\.env\.PATH\s*\}/;
            for (const rel of ['hooks/tests/suites/git-operation-lease.test.cjs', 'hooks/tests/suites/protocol-delivery.test.cjs']) {
                const file = path.join(CLAUDE_DIR, ...rel.split('/'));
                if (fs.existsSync(file) && bare.test(fs.readFileSync(file, 'utf8'))) problems.push(`${rel}: spawns with a bare SystemRoot+PATH environment`);
            }
            // Then nothing drifted
            assert.deepEqual(problems, [], problems.join('\n'));
        }
    }
];

module.exports = { name: 'os-essentials-env', tests };
