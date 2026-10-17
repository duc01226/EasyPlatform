import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isFrameworkRepo } from './framework-repo.helper.mjs';

// Intent (BR-ADS-20, TC-ADS-034): the bundle pins no auto-compaction budget on any host, so each host
// compacts at its own default and a user's own value (`/autocompact`, `--autocompact`, user settings)
// takes effect. A shared-scope env pin in `.claude/settings.json` outranks every one of those.
//
// Framework-repo guarded: it asserts the framework's own shipped settings, which an adopting project is
// free to change (PORT-011 is the guard's tripwire). The Codex surface is covered by the sync tests in
// migrate-claude-to-codex.test.mjs (TC-ADS-035…037), because its config is generated, not shipped.
const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, '..', '..', '..', '..');
const frameworkOnly = { skip: isFrameworkRepo(repoRoot) ? false : "asserts the framework repo's own shipped settings (framework-repo signal)" };

const readJson = async relPath => JSON.parse(await fs.readFile(path.join(repoRoot, relPath), 'utf8'));

test('TC-ADS-034 the shipped host settings pin no auto-compaction budget', frameworkOnly, async () => {
    // Given the framework's shipped primary-host settings and third-host recommended defaults
    const settings = await readJson(path.join('.claude', 'settings.json'));
    const recommended = await readJson(path.join('.opencode', 'opencode.recommended.json'));

    // When their environment and model entries are read
    const env = settings.env ?? {};
    const pinnedModels = Object.entries(recommended.provider ?? {}).flatMap(([providerId, provider]) =>
        Object.entries(provider?.models ?? {})
            .filter(([, model]) => model && Object.hasOwn(model, 'limit'))
            .map(([modelId]) => `${providerId}/${modelId}`));

    // Then no compaction window is pinned for the primary host
    assert.equal(Object.hasOwn(env, 'CLAUDE_CODE_AUTO_COMPACT_WINDOW'), false,
        'the shared settings env would override /autocompact, --autocompact and every user setting');
    assert.equal(Object.hasOwn(settings, 'autoCompactWindow'), false, 'the shared scope would outrank a user autoCompactWindow');
    // Native skill-listing and tool eligibility defaults remain effective even in quiet mode.
    assert.equal(Object.hasOwn(settings, 'skillListingBudgetFraction'), false,
        'a shared skill-listing override would increase context even when injection hooks are quiet');
    assert.equal(Object.hasOwn(env, 'CLAUDE_CODE_ENABLE_TODO_TOOLS'), false,
        'the framework must not force extra tool context independently of its runtime mode');
    assert.equal(Object.hasOwn(env, 'MCP_TIMEOUT'), true, 'the unrelated startup timeout remains');
    // And no third-host model overrides its registry window
    assert.deepEqual(pinnedModels, [], 'a model limit pins the third-host compaction point');
});
