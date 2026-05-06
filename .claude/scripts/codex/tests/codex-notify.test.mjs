import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, '..', '..', '..', '..');
const notifyScript = path.join(repoRoot, '.claude', 'scripts', 'codex', 'codex-notify.mjs');

async function dryRunNotify(rawPayload) {
    const { stdout } = await execFileAsync(process.execPath, [notifyScript, rawPayload], {
        cwd: repoRoot,
        env: { ...process.env, CODEX_NOTIFY_DRY_RUN: '1' }
    });
    return JSON.parse(stdout);
}

test('codex-notify degrades safely for non-object JSON payloads', async () => {
    for (const rawPayload of ['null', '[]', '"done"', 'false']) {
        const notification = await dryRunNotify(rawPayload);
        assert.equal(notification.title, 'Codex notification');
        assert.equal(notification.message, rawPayload);
    }
});

test('codex-notify preserves object payload behavior and invalid JSON fallback', async () => {
    const completed = await dryRunNotify('{"type":"task_completed","last_agent_message":"done"}');
    assert.deepEqual(completed, {
        title: 'Codex task complete',
        message: 'done'
    });

    const invalid = await dryRunNotify('{not-json');
    assert.deepEqual(invalid, {
        title: 'Codex notification',
        message: '{not-json'
    });
});
