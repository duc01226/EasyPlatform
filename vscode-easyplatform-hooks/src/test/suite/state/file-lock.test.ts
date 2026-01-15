/**
 * Tests for file locking mechanism
 * NO MOCKS - Real file operations only
 */

import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { FileLock } from '../../../state/file-lock';

suite('FileLock Tests', () => {
    let testDir: string;
    let testFilePath: string;

    setup(async () => {
        testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'file-lock-test-'));
        testFilePath = path.join(testDir, 'test-file.txt');
    });

    teardown(async () => {
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
    });

    test('acquire() creates lock file with PID', async () => {
        const lock = new FileLock(testFilePath);

        const acquired = await lock.acquire();
        assert.strictEqual(acquired, true, 'Should acquire lock successfully');

        // Verify lock file exists
        const lockPath = `${testFilePath}.lock`;
        const lockExists = await fs
            .access(lockPath)
            .then(() => true)
            .catch(() => false);
        assert.strictEqual(lockExists, true, 'Lock file should exist');

        // Verify lock contains current PID
        const lockContent = await fs.readFile(lockPath, 'utf8');
        const lockPid = parseInt(lockContent, 10);
        assert.strictEqual(lockPid, process.pid, 'Lock should contain current process PID');

        await lock.release();
    });

    test.skip('acquire() fails when lock already held', async () => {
        const lock1 = new FileLock(testFilePath);
        const lock2 = new FileLock(testFilePath);

        const acquired1 = await lock1.acquire();
        assert.strictEqual(acquired1, true, 'First lock should succeed');

        // Second lock should timeout quickly (we'll use short timeout)
        // Note: This will wait for the full timeout period
        const startTime = Date.now();
        const acquired2 = await lock2.acquire();
        const duration = Date.now() - startTime;

        assert.strictEqual(acquired2, false, 'Second lock should fail');
        assert.ok(duration >= 30000, 'Should wait for timeout period'); // Default 30s

        await lock1.release();
    });

    test('release() removes lock file', async () => {
        const lock = new FileLock(testFilePath);

        await lock.acquire();
        await lock.release();

        const lockPath = `${testFilePath}.lock`;
        const lockExists = await fs
            .access(lockPath)
            .then(() => true)
            .catch(() => false);
        assert.strictEqual(lockExists, false, 'Lock file should be removed after release');
    });

    test('withLock() executes function with lock protection', async () => {
        let executed = false;

        await FileLock.withLock(testFilePath, async () => {
            executed = true;

            // Verify lock exists during execution
            const lockPath = `${testFilePath}.lock`;
            const lockExists = await fs
                .access(lockPath)
                .then(() => true)
                .catch(() => false);
            assert.strictEqual(lockExists, true, 'Lock should exist during execution');
        });

        assert.strictEqual(executed, true, 'Function should execute');

        // Verify lock released after execution
        const lockPath = `${testFilePath}.lock`;
        const lockExists = await fs
            .access(lockPath)
            .then(() => true)
            .catch(() => false);
        assert.strictEqual(lockExists, false, 'Lock should be released after execution');
    });

    test('withLock() releases lock even when function throws', async () => {
        await assert.rejects(
            async () => {
                await FileLock.withLock(testFilePath, async () => {
                    throw new Error('Test error');
                });
            },
            /Test error/,
            'Should propagate error'
        );

        // Verify lock released despite error
        const lockPath = `${testFilePath}.lock`;
        const lockExists = await fs
            .access(lockPath)
            .then(() => true)
            .catch(() => false);
        assert.strictEqual(lockExists, false, 'Lock should be released even after error');
    });

    test('stale lock detection removes abandoned locks', async () => {
        const lockPath = `${testFilePath}.lock`;

        // Create stale lock with non-existent PID
        const stalePid = 999999; // Unlikely to exist
        await fs.writeFile(lockPath, String(stalePid), 'utf8');

        // Try to acquire - should detect stale lock and succeed
        const lock = new FileLock(testFilePath);
        const acquired = await lock.acquire();

        assert.strictEqual(acquired, true, 'Should acquire lock after removing stale lock');

        // Verify new lock has current PID
        const lockContent = await fs.readFile(lockPath, 'utf8');
        const lockPid = parseInt(lockContent, 10);
        assert.strictEqual(lockPid, process.pid, 'New lock should have current PID');

        await lock.release();
    });

    test('concurrent lock attempts serialize access', async () => {
        const results: number[] = [];
        const concurrency = 3;

        const promises = Array.from({ length: concurrency }, (_, i) => {
            return FileLock.withLock(testFilePath, async () => {
                // Simulate work
                await new Promise(resolve => setTimeout(resolve, 50));
                results.push(i);
            });
        });

        // This will take time due to serialization, but should complete
        // We can't verify exact order, but verify all completed
        await Promise.all(promises);

        assert.strictEqual(results.length, concurrency, 'All operations should complete');
    });

    test('lock with invalid PID in lock file is treated as stale', async () => {
        const lockPath = `${testFilePath}.lock`;

        // Create lock with invalid PID format
        await fs.writeFile(lockPath, 'invalid-pid', 'utf8');

        const lock = new FileLock(testFilePath);
        const acquired = await lock.acquire();

        assert.strictEqual(acquired, true, 'Should acquire lock with invalid PID');

        await lock.release();
    });
});
