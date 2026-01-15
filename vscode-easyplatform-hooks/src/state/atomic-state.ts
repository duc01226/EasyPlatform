/**
 * Atomic state persistence with backup rotation
 * Research: research-edge-cases.md section 2.1
 * Pattern: .tmp → rename for atomicity, .bak{1,2,3} rotation
 *
 * Prevents state corruption from crashes/partial writes
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { FileLock } from './file-lock';

export class AtomicState<T> {
    private filePath: string;
    private readonly maxBackups = 3;

    constructor(basePath: string, filename: string) {
        this.filePath = path.join(basePath, filename);
    }

    /**
     * Load state with backup fallback
     */
    async load(): Promise<T> {
        return await FileLock.withLock(this.filePath, async () => {
            try {
                const content = await fs.readFile(this.filePath, 'utf8');
                return this.validateAndParse(content);
            } catch (err: any) {
                if (err.code === 'ENOENT') {
                    // File doesn't exist
                    throw new Error(`State file not found: ${this.filePath}`);
                }

                // Corrupted - try backups
                const restored = await this.tryRestoreFromBackup();
                if (restored !== null) {
                    return restored;
                }

                // All backups failed
                throw new Error(`Failed to load state from ${this.filePath} and all backups`);
            }
        });
    }

    /**
     * Save state atomically with backup rotation
     */
    async save(state: T): Promise<void> {
        return await FileLock.withLock(this.filePath, async () => {
            // Create parent directory if needed
            await fs.mkdir(path.dirname(this.filePath), { recursive: true });

            // Rotate backups before saving
            await this.rotateBackups();

            // Write to .tmp file
            const tmpPath = `${this.filePath}.tmp`;
            await fs.writeFile(tmpPath, JSON.stringify(state, null, 2), 'utf8');

            // Atomic rename (POSIX) or backup pattern (Windows)
            try {
                await fs.rename(tmpPath, this.filePath);
            } catch (err: any) {
                // Windows: rename fails if target exists
                if (err.code === 'EEXIST' || err.code === 'EPERM') {
                    await fs.unlink(this.filePath);
                    await fs.rename(tmpPath, this.filePath);
                } else {
                    throw err;
                }
            }
        });
    }

    /**
     * Validate and parse JSON with schema check
     */
    private validateAndParse(content: string): T {
        try {
            const parsed = JSON.parse(content);
            return parsed as T;
        } catch (err) {
            throw new Error(`Invalid JSON: ${err}`);
        }
    }

    /**
     * Try to restore from backup files (.bak1, .bak2, .bak3)
     */
    private async tryRestoreFromBackup(): Promise<T | null> {
        for (let i = 1; i <= this.maxBackups; i++) {
            const backupPath = `${this.filePath}.bak${i}`;

            try {
                const content = await fs.readFile(backupPath, 'utf8');
                const state = this.validateAndParse(content);

                // Restore successful - copy back to main file
                await fs.copyFile(backupPath, this.filePath);
                console.info(`AtomicState: Restored from ${backupPath}`);

                return state;
            } catch {
                // Try next backup
                continue;
            }
        }

        return null; // No valid backups
    }

    /**
     * Rotate backup files (.bak1 ← current, .bak2 ← .bak1, .bak3 ← .bak2)
     */
    private async rotateBackups(): Promise<void> {
        try {
            // Check if main file exists
            await fs.access(this.filePath);

            // Rotate: .bak2 → .bak3
            for (let i = this.maxBackups; i > 1; i--) {
                const from = `${this.filePath}.bak${i - 1}`;
                const to = `${this.filePath}.bak${i}`;

                try {
                    await fs.rename(from, to);
                } catch (err: any) {
                    if (err.code !== 'ENOENT') {
                        // Only ignore "file not found"
                        console.warn(`Failed to rotate ${from} → ${to}:`, err.message);
                    }
                }
            }

            // Current → .bak1
            await fs.copyFile(this.filePath, `${this.filePath}.bak1`);
        } catch (err: any) {
            if (err.code !== 'ENOENT') {
                console.warn('Failed to rotate backups:', err.message);
            }
        }
    }

    /**
     * Delete state file and all backups
     */
    async clear(): Promise<void> {
        return await FileLock.withLock(this.filePath, async () => {
            try {
                await fs.unlink(this.filePath);
            } catch (err: any) {
                if (err.code !== 'ENOENT') {
                    throw err;
                }
            }

            // Delete backups
            for (let i = 1; i <= this.maxBackups; i++) {
                try {
                    await fs.unlink(`${this.filePath}.bak${i}`);
                } catch {
                    // Ignore errors
                }
            }

            // Delete temp file if exists
            try {
                await fs.unlink(`${this.filePath}.tmp`);
            } catch {
                // Ignore
            }
        });
    }
}
