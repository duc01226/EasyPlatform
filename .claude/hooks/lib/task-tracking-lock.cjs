'use strict';

const fs = require('node:fs');
const crypto = require('node:crypto');
const { LIMITS } = require('./task-tracking-config.cjs');
const { fail, scopedPath, ensureDirectory, readBytes } = require('./task-tracking-files.cjs');

const LOCK_PATH = 'tmp/task-tracking/writer.lock';
const queues = new Map();

/**
 * What a refused writer is told about the lock that stayed in its way: where it is, which process wrote it and whether
 * that process still runs. The lock is only described; removing one that was left behind is the person's decision.
 */
function pendingReason(root) {
    let pid;
    try { pid = JSON.parse(readBytes(root, LOCK_PATH, 4096).toString('utf8')).pid; } catch { /* Unreadable, or gone since the last attempt. */ }
    const remove = `if no tracker command is running, delete ${LOCK_PATH} and retry`;
    // Zero and negative numbers address process groups, so only a positive process id is probed.
    if (!Number.isSafeInteger(pid) || pid <= 0) return `${LOCK_PATH} names no process that wrote it; ${remove}`;
    let running = true;
    // Signal 0 only asks whether the process exists; a process this user may not signal still exists.
    try { process.kill(pid, 0); } catch (error) { running = error.code === 'EPERM'; }
    return running ? `Another tracker process (pid ${pid}) is writing and holds ${LOCK_PATH}; retry shortly. If pid ${pid} is not a tracker command, delete ${LOCK_PATH} and retry`
        : `${LOCK_PATH} was left by a process that is no longer running (pid ${pid}); ${remove}`;
}

async function exclusive(root, work) {
    const canonicalRoot = fs.realpathSync(root);
    ensureDirectory(canonicalRoot, 'tmp/task-tracking');
    const file = scopedPath(canonicalRoot, LOCK_PATH);
    const token = crypto.randomUUID();
    const bytes = Buffer.from(JSON.stringify({ schemaVersion: 1, root: canonicalRoot, token, pid: process.pid }));
    const deadline = Date.now() + LIMITS.lockWaitMs;
    for (;;) {
        try { fs.writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 }); break; }
        catch (error) {
            if (error.code !== 'EEXIST') throw error;
            if (Date.now() >= deadline) fail('LOCK_PENDING', pendingReason(canonicalRoot));
            await new Promise(resolve => setTimeout(resolve, LIMITS.lockPollMs));
            scopedPath(canonicalRoot, LOCK_PATH);
        }
    }
    let value;
    try { value = await work(); return value; }
    finally {
        // Never reclaim an old lock by age/PID. Only this exact owner can release it.
        try {
            const current = readBytes(canonicalRoot, LOCK_PATH, 4096);
            if (!current.equals(bytes)) throw new Error('Lock ownership changed');
            fs.unlinkSync(scopedPath(canonicalRoot, LOCK_PATH));
        } catch {
            if (value && typeof value === 'object') {
                value.secondary = [...(value.secondary || []), { kind: 'writer-lock', status: 'pending', reason: 'Lock release could not be proved; inspect recovery before retrying' }];
            }
            // Preserve a successful primary result; never hide its durable receipt.
        }
    }
}

function withTrackingLock(root, work) {
    const key = fs.realpathSync(root);
    const entry = queues.get(key) || { tail: Promise.resolve(), pending: 0 };
    if (entry.pending >= LIMITS.queue) return Promise.reject(Object.assign(new Error('Tracking operation queue is full'), { code: 'QUEUE_FULL' }));
    entry.pending++;
    const result = entry.tail.then(() => exclusive(key, work));
    entry.tail = result.catch(() => undefined);
    queues.set(key, entry);
    return result.finally(() => { if (--entry.pending === 0) queues.delete(key); });
}

module.exports = { withTrackingLock, LOCK_PATH };
