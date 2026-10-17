/**
 * Doc-Sync Gate Test Suite (wrapper)
 *
 * Wires the standalone test-doc-sync-gate.cjs script (classifier unit tests +
 * TC-DOCSYS-041..048 integration tests) into run-all-tests.cjs so the gate is
 * covered by the regression battery. The standalone script owns the test
 * logic — it builds isolated throwaway git repos in the OS temp dir and exits
 * non-zero on any failure; this wrapper surfaces that result without
 * duplicating individual test names.
 */

const path = require('path');
const { spawn } = require('child_process');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const assert = require('node:assert/strict');
const { osEssentialsEnv } = require('../lib/os-essentials-env.cjs');
const { validateConfig } = require('../../lib/project-config-schema.cjs');

const SCRIPT = path.resolve(__dirname, '..', 'test-doc-sync-gate.cjs');

function withConfig(projectGate, localGate, fn) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-sync-config-'));
    try {
        const dir = path.join(root, '.claude', 'hooks', 'config');
        fs.mkdirSync(dir, { recursive: true });
        fs.mkdirSync(path.join(root, 'docs'));
        const config = { project: { name: 'fixture' }, workflowPatterns: { docSyncGate: projectGate } };
        fs.writeFileSync(path.join(root, 'docs', 'project-config.json'), JSON.stringify(config));
        fs.writeFileSync(path.join(dir, 'doc-sync-gate.json'), JSON.stringify({ enabled: true, ...localGate }));
        const child = spawnSync(process.execPath, ['-e', `const c=require(process.argv[1]); const cfg=c.loadConfig(); console.log(JSON.stringify({cfg,hit:c.behavioralCodeHit('src/Area/file.ts',cfg),sibling:c.behavioralCodeHit('src/AreaExtra/file.ts',cfg),outside:c.behavioralCodeHit('other/file.ts',cfg)}));`, path.resolve(__dirname, '../../lib/doc-sync-classify.cjs')], {
            encoding: 'utf8', cwd: root, env: osEssentialsEnv({ CLAUDE_PROJECT_DIR: root,
                HOME: root, USERPROFILE: root, TMPDIR: root, TEMP: root, TMP: root })
        });
        assert.equal(child.status, 0, child.stderr);
        fn(JSON.parse(child.stdout), child.stderr, validateConfig(config));
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

function runStandalone() {
    return new Promise(resolve => {
        const proc = spawn(process.execPath, [SCRIPT], {
            cwd: path.resolve(__dirname, '..'),
            stdio: ['ignore', 'pipe', 'pipe']
        });
        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', d => (stdout += d.toString()));
        proc.stderr.on('data', d => (stderr += d.toString()));
        proc.on('close', code => resolve({ code, stdout, stderr }));
        proc.on('error', err => resolve({ code: 1, stdout, stderr: String(err) }));
    });
}

const tests = [
    {
        name: '[doc-sync-config] valid area objects match whole code prefixes only',
        fn: () => withConfig({ enforcedAreas: [{ name: 'Area', codePathPrefixes: ['src/Area'] }] }, {}, (out, stderr, validation) => {
            assert.equal(validation.valid, true, validation.errors.join('\n'));
            assert.equal(out.cfg.enabled, true);
            assert.equal(out.hit.area.name, 'Area');
            assert.equal(out.sibling, null);
            assert.equal(out.outside, null);
            assert.equal(stderr, '');
        })
    },
    {
        name: '[doc-sync-config] malformed declared areas fail validation and disable advisory with a diagnostic',
        fn: () => {
            for (const enforcedAreas of [['Area'], [null], [{ name: 'Area' }], [{ name: '', codePathPrefixes: ['src/Area'] }], [{ name: 'Area', codePathPrefixes: [] }], [{ name: 'Area', codePathPrefixes: [''] }]]) {
                withConfig({ enforcedAreas }, {}, (out, stderr, validation) => {
                    assert.equal(validation.valid, false, JSON.stringify(enforcedAreas));
                    assert.equal(out.cfg.enabled, false);
                    assert.match(stderr, /docSyncGate.*enforcedAreas/);
                });
            }
        }
    },
    {
        name: '[doc-sync-config] project opt-out overrides the shipped enabled default',
        fn: () => withConfig({ enabled: false, enforcedAreas: [] }, {}, (out, stderr, validation) => {
            assert.equal(validation.valid, true);
            assert.equal(out.cfg.enabled, false);
            assert.equal(stderr, '');
        })
    },
    {
        name: '[doc-sync-config] malformed fallback hook config is diagnosed rather than silently ignored',
        fn: () => withConfig({}, { enforcedAreas: ['Area'] }, (out, stderr) => {
            assert.equal(out.cfg.enabled, false);
            assert.match(stderr, /doc-sync-gate.*enforcedAreas/);
        })
    },
    {
        name: '[doc-sync-gate] standalone suite passes (classifier + TC-DOCSYS-041..048)',
        fn: async () => {
            const { code, stdout, stderr } = await runStandalone();
            if (code !== 0) {
                const failLines = stdout
                    .split('\n')
                    .filter(l => l.includes('[FAIL]'))
                    .join('\n');
                throw new Error(
                    `test-doc-sync-gate.cjs exited ${code}\n${failLines || stdout.slice(-800)}` +
                        (stderr ? `\nstderr: ${stderr.slice(-300)}` : '')
                );
            }
        }
    }
];

module.exports = {
    name: 'doc-sync-gate',
    tests
};
