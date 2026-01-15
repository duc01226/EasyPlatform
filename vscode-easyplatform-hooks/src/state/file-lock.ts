/**
 * Advisory file locking for concurrent access protection
 * Research: research-edge-cases.md section 2.2
 * Pattern: Learned from .claude/hooks/lib/ace-playbook-state.cjs
 *
 * Prevents race conditions when multiple processes access same state file
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export class FileLock {
    private lockPath: string;
    private readonly lockTimeout = 30000; // 30 seconds
    private readonly retryInterval = 100; // 100ms

    constructor(filePath: string) {
        this.lockPath = `${filePath}.lock`;
    }

    /**
     * Acquire lock with timeout and stale detection
     */
    async acquire(): Promise<boolean> {
        const startTime = Date.now();

        // Ensure parent directory exists
        await fs.mkdir(path.dirname(this.lockPath), { recursive: true });

        while (Date.now() - startTime < this.lockTimeout) {
            try {
                // Try to create lock file (fails if exists)
                await fs.writeFile(this.lockPath, String(process.pid), { flag: 'wx' });
                return true;
            } catch (err: any) {
                if (err.code === 'EEXIST') {
                    // Lock exists - check if stale
                    const isStale = await this.isLockStale();
                    if (isStale) {
                        // Remove stale lock and retry
                        await this.forceRelease();
                        continue;
                    }

                    // Wait and retry
                    await this.sleep(this.retryInterval);
                } else {
                    throw err;
                }
            }
        }

        return false; // Timeout
    }

    /**
     * Release lock
     */
    async release(): Promise<void> {
        try {
            await fs.unlink(this.lockPath);
        } catch (err: any) {
            // Lock file already removed - no-op
            if (err.code !== 'ENOENT') {
                throw err;
            }
        }
    }

    /**
     * Force release (for stale locks)
     */
    private async forceRelease(): Promise<void> {
        try {
            await fs.unlink(this.lockPath);
        } catch {
            // Ignore errors
        }
    }

    /**
     * Check if lock is stale (owning process no longer exists)
     */
    private async isLockStale(): Promise<boolean> {
        try {
            const content = await fs.readFile(this.lockPath, 'utf8');
            const pid = parseInt(content, 10);

            if (isNaN(pid)) {
                return true; // Invalid PID
            }

            // Check if process exists (cross-platform)
            return !this.isProcessAlive(pid);
        } catch {
            return true; // Cannot read lock file
        }
    }

    /**
     * Check if process is alive (cross-platform)
     */
    private isProcessAlive(pid: number): boolean {
        try {
            // Signal 0 checks existence without killing
            process.kill(pid, 0);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Sleep helper
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Execute function with lock (convenience wrapper)
     */
    static async withLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
        const lock = new FileLock(filePath);
        const acquired = await lock.acquire();

        if (!acquired) {
            throw new Error(`Failed to acquire lock for ${filePath} after timeout`);
        }

        try {
            return await fn();
        } finally {
            await lock.release();
        }
    }
}
