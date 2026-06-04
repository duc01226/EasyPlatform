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

const SCRIPT = path.resolve(__dirname, '..', 'test-doc-sync-gate.cjs');

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
