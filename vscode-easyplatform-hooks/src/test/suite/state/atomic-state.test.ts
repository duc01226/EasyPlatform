/**
 * Tests for atomic state persistence
 * NO MOCKS - Real file operations only
 */

import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { AtomicState } from '../../../state/atomic-state';

suite('AtomicState Tests', () => {
    let testDir: string;
    let state: AtomicState<TestState>;

    interface TestState {
        id: string;
        count: number;
        items: string[];
    }

    setup(async () => {
        // Create temp directory for each test
        testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'atomic-state-test-'));
        state = new AtomicState<TestState>(testDir, 'test-state.json');
    });

    teardown(async () => {
        // Cleanup test directory
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
    });

    test('save() creates atomic file with backup rotation', async () => {
        const testState: TestState = {
            id: 'test-1',
            count: 42,
            items: ['a', 'b', 'c']
        };

        await state.save(testState);

        // Verify main file exists
        const mainPath = path.join(testDir, 'test-state.json');
        const exists = await fs
            .access(mainPath)
            .then(() => true)
            .catch(() => false);
        assert.strictEqual(exists, true, 'Main state file should exist');

        // Verify content is correct
        const content = await fs.readFile(mainPath, 'utf8');
        const parsed = JSON.parse(content);
        assert.deepStrictEqual(parsed, testState);

        // Save again to create backup
        const testState2: TestState = {
            id: 'test-2',
            count: 100,
            items: ['x', 'y']
        };
        await state.save(testState2);

        // Verify .bak1 exists with first state
        const bak1Path = path.join(testDir, 'test-state.json.bak1');
        const bak1Exists = await fs
            .access(bak1Path)
            .then(() => true)
            .catch(() => false);
        assert.strictEqual(bak1Exists, true, 'Backup .bak1 should exist');

        const bak1Content = await fs.readFile(bak1Path, 'utf8');
        const bak1Parsed = JSON.parse(bak1Content);
        assert.deepStrictEqual(bak1Parsed, testState, 'Backup should contain previous state');
    });

    test('save() performs atomic write (no .tmp file left behind)', async () => {
        const testState: TestState = {
            id: 'atomic-test',
            count: 1,
            items: []
        };

        await state.save(testState);

        // Verify .tmp file does not exist after successful save
        const tmpPath = path.join(testDir, 'test-state.json.tmp');
        const tmpExists = await fs
            .access(tmpPath)
            .then(() => true)
            .catch(() => false);
        assert.strictEqual(tmpExists, false, 'Temporary file should not exist after save');
    });

    test('load() restores saved state correctly', async () => {
        const testState: TestState = {
            id: 'load-test',
            count: 999,
            items: ['item1', 'item2', 'item3']
        };

        await state.save(testState);
        const loaded = await state.load();

        assert.deepStrictEqual(loaded, testState, 'Loaded state should match saved state');
    });

    test('load() throws error when file does not exist', async () => {
        await assert.rejects(async () => await state.load(), /State file not found/, 'Should throw error when file does not exist');
    });

    test('load() restores from backup when main file is corrupted', async () => {
        const validState: TestState = {
            id: 'backup-test',
            count: 50,
            items: ['valid']
        };

        // Save valid state TWICE to create .bak1
        await state.save(validState);
        await state.save(validState);

        // Corrupt main file
        const mainPath = path.join(testDir, 'test-state.json');
        await fs.writeFile(mainPath, '{invalid json content', 'utf8');

        // Load should restore from .bak1
        const restored = await state.load();
        assert.deepStrictEqual(restored, validState, 'Should restore from backup');
    });

    test('backup rotation maintains 3 generations', async () => {
        const states: TestState[] = [
            { id: 'v1', count: 1, items: ['a'] },
            { id: 'v2', count: 2, items: ['b'] },
            { id: 'v3', count: 3, items: ['c'] },
            { id: 'v4', count: 4, items: ['d'] }
        ];

        // Save 4 versions
        for (const st of states) {
            await state.save(st);
            // Small delay to ensure distinct timestamps
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Verify backups exist
        const bak1Path = path.join(testDir, 'test-state.json.bak1');
        const bak2Path = path.join(testDir, 'test-state.json.bak2');
        const bak3Path = path.join(testDir, 'test-state.json.bak3');

        const bak1Exists = await fs
            .access(bak1Path)
            .then(() => true)
            .catch(() => false);
        const bak2Exists = await fs
            .access(bak2Path)
            .then(() => true)
            .catch(() => false);
        const bak3Exists = await fs
            .access(bak3Path)
            .then(() => true)
            .catch(() => false);

        assert.strictEqual(bak1Exists, true, '.bak1 should exist');
        assert.strictEqual(bak2Exists, true, '.bak2 should exist');
        assert.strictEqual(bak3Exists, true, '.bak3 should exist');

        // Verify backup contents (bak1 = v3, bak2 = v2, bak3 = v1)
        const bak1Content = JSON.parse(await fs.readFile(bak1Path, 'utf8'));
        assert.strictEqual(bak1Content.id, 'v3', '.bak1 should contain v3');
    });

    test('clear() removes state file and all backups', async () => {
        const testState: TestState = {
            id: 'clear-test',
            count: 1,
            items: []
        };

        // Create state with backups
        await state.save(testState);
        await state.save({ ...testState, count: 2 });
        await state.save({ ...testState, count: 3 });

        // Clear all
        await state.clear();

        // Verify all files removed
        const mainPath = path.join(testDir, 'test-state.json');
        const bak1Path = path.join(testDir, 'test-state.json.bak1');
        const bak2Path = path.join(testDir, 'test-state.json.bak2');

        const mainExists = await fs
            .access(mainPath)
            .then(() => true)
            .catch(() => false);
        const bak1Exists = await fs
            .access(bak1Path)
            .then(() => true)
            .catch(() => false);
        const bak2Exists = await fs
            .access(bak2Path)
            .then(() => true)
            .catch(() => false);

        assert.strictEqual(mainExists, false, 'Main file should be removed');
        assert.strictEqual(bak1Exists, false, '.bak1 should be removed');
        assert.strictEqual(bak2Exists, false, '.bak2 should be removed');
    });

    test('concurrent saves use file locking (no race condition)', async () => {
        const state1 = new AtomicState<TestState>(testDir, 'concurrent-test.json');
        const state2 = new AtomicState<TestState>(testDir, 'concurrent-test.json');

        // Concurrent saves
        const promises = [state1.save({ id: 'concurrent-1', count: 1, items: [] }), state2.save({ id: 'concurrent-2', count: 2, items: [] })];

        await Promise.all(promises);

        // Verify file is valid JSON (not corrupted by concurrent writes)
        const mainPath = path.join(testDir, 'concurrent-test.json');
        const content = await fs.readFile(mainPath, 'utf8');

        // Should not throw
        const parsed = JSON.parse(content);
        assert.ok(parsed.id === 'concurrent-1' || parsed.id === 'concurrent-2', 'Should have valid state');
    });
});
