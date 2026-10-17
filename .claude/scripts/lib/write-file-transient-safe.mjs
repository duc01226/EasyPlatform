import fs from 'node:fs/promises';

// Windows can refuse to open a generated mirror file for writing while a scanner or indexer (antivirus,
// an editor or agent host watching the mirror folders) holds it; the refusal clears within milliseconds.
// Retry only those transient codes with a bounded backoff (~3 s in total), then fail closed with the original error.
const TRANSIENT_WRITE_CODES = new Set(['EBUSY', 'EPERM', 'EACCES', 'UNKNOWN']);

export async function writeFileTransientSafe(filePath, data, encoding = 'utf8', { attempts = 8, baseDelayMs = 25, write = fs.writeFile } = {}) {
    for (let attempt = 1; ; attempt += 1) {
        try {
            return await write(filePath, data, encoding);
        } catch (error) {
            if (attempt >= attempts || !TRANSIENT_WRITE_CODES.has(error?.code)) throw error;
            await new Promise(resolve => setTimeout(resolve, baseDelayMs * 2 ** (attempt - 1)));
        }
    }
}
