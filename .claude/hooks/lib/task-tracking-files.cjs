'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { relativePath, LIMITS } = require('./task-tracking-config.cjs');

const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

/** Literal relative path, checked at every existing ancestor; links are never write authority. */
function scopedPath(root, relative) {
    if (!relativePath(relative)) fail('UNSAFE_PATH', 'Use an exact project-relative path');
    const canonicalRoot = fs.realpathSync(root);
    const parts = relative.replace(/\\/g, '/').split('/');
    let current = canonicalRoot;
    for (const part of parts) {
        current = path.join(current, part);
        try {
            const stat = fs.lstatSync(current);
            if (stat.isSymbolicLink()) fail('UNSAFE_PATH', 'Linked paths are unsupported');
            const actual = fs.realpathSync(current);
            const remainder = path.relative(canonicalRoot, actual);
            if (remainder === '..' || remainder.startsWith(`..${path.sep}`) || path.isAbsolute(remainder)) fail('UNSAFE_PATH', 'Path escapes the selected checkout');
        } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    return current;
}

function readBytes(root, relative, limit = LIMITS.recordBytes) {
    const file = scopedPath(root, relative);
    const before = fs.lstatSync(file);
    if (!before.isFile() || before.nlink !== 1) fail('UNSAFE_PATH', 'Expected a regular unlinked file');
    if (before.size > limit) fail('LIMIT_EXCEEDED', 'Input exceeds the selected byte budget');
    // NOFOLLOW protects the final component on platforms supporting the flag.
    const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
    try {
        const opened = fs.fstatSync(fd);
        if (opened.dev !== before.dev || opened.ino !== before.ino || opened.size > limit) fail('CONFLICT', 'File changed during inspection');
        // Retained record slices must not retain the maximum permitted file size.
        // One sentinel byte detects growth without reading an unbounded changed file.
        const buffer = Buffer.alloc(opened.size + 1);
        let size = 0;
        while (size < buffer.length) {
            const count = fs.readSync(fd, buffer, size, buffer.length - size, size);
            if (!count) break;
            size += count;
        }
        if (size > limit) fail('LIMIT_EXCEEDED', 'Input exceeds the selected byte budget');
        const after = fs.fstatSync(fd);
        if (after.size > limit) fail('LIMIT_EXCEEDED', 'Input exceeds the selected byte budget');
        if (size !== opened.size || after.size !== opened.size || after.mtimeMs !== opened.mtimeMs || after.ctimeMs !== opened.ctimeMs) fail('CONFLICT', 'File changed during inspection');
        return buffer.subarray(0, size);
    } finally { fs.closeSync(fd); }
}

function ensureDirectory(root, relative) {
    const target = scopedPath(root, relative);
    fs.mkdirSync(target, { recursive: true });
    scopedPath(root, relative);
    return target;
}

/**
 * Atomic visibility for cooperating writers. The final check/rename gap is not editor CAS.
 * `limit` bounds the published bytes and the reads of the content being replaced; it is the record byte budget unless the caller owns another.
 */
function publishBytes(root, relative, bytes, expectedHash, limit = LIMITS.recordBytes) {
    if (path.posix.dirname(relative.replace(/\\/g, '/')) === '.') fail('UNSAFE_PATH', 'Canonical records need a configured owner directory');
    return publish(root, relative, bytes, expectedHash, limit);
}

/**
 * Replaces one existing file that sits directly in the checkout root, with the same atomic visibility. It exists for a
 * project file a person placed there, never for a record: it creates nothing, so it needs the inspected content hash,
 * and it takes a bare file name only.
 */
function replaceRootFile(root, name, bytes, expectedHash, limit = LIMITS.recordBytes) {
    if (typeof name !== 'string' || /[\\/]/.test(name)) fail('UNSAFE_PATH', 'Expected the name of a file directly in the checkout root');
    if (typeof expectedHash !== 'string') fail('UNSAFE_PATH', 'A file in the checkout root is only replaced against its inspected content, never created');
    return publish(root, name, bytes, expectedHash, limit);
}

function publish(root, relative, bytes, expectedHash, limit) {
    if (!Buffer.isBuffer(bytes) || bytes.length > limit) fail('LIMIT_EXCEEDED', 'Output exceeds the record byte budget');
    const parent = path.posix.dirname(relative.replace(/\\/g, '/'));
    const directory = parent === '.' ? fs.realpathSync(root) : ensureDirectory(root, parent);
    const target = scopedPath(root, relative);
    let mode = 0o644;
    if (expectedHash !== null) {
        if (hash(readBytes(root, relative, limit)) !== expectedHash) fail('CONFLICT', 'Current content differs from the inspected record');
        mode = fs.statSync(target).mode & 0o777;
    }
    const temporary = path.join(directory, `.${path.basename(target)}.${crypto.randomUUID()}.tmp`);
    let fd;
    let published = false;
    try {
        fd = fs.openSync(temporary, 'wx', mode);
        if (expectedHash !== null && process.platform !== 'win32') fs.fchmodSync(fd, mode);
        fs.writeFileSync(fd, bytes);
        fs.fsyncSync(fd);
        fs.closeSync(fd); fd = undefined;
        scopedPath(root, relative);
        if (expectedHash === null) fs.linkSync(temporary, target); // exclusive create, never overwrite a competing file
        else {
            if (hash(readBytes(root, relative, limit)) !== expectedHash) fail('CONFLICT', 'Current content changed before publication');
            fs.renameSync(temporary, target);
        }
        published = true;
        let directoryFlushed = false;
        let directoryFd;
        try { directoryFd = fs.openSync(directory, 'r'); fs.fsyncSync(directoryFd); directoryFlushed = true; }
        catch { /* Atomic visibility is distinct from power-loss durability. */ }
        finally { if (directoryFd !== undefined) fs.closeSync(directoryFd); }
        return { contentHash: hash(bytes), directoryFlushed };
    } finally {
        if (fd !== undefined) fs.closeSync(fd);
        try { fs.unlinkSync(temporary); } catch (error) { if (error.code !== 'ENOENT' && !published) throw error; }
    }
}

/** Caller holds its cooperating-writer lock; final hash/unlink is not arbitrary-editor CAS. */
function removeBytes(root, relative, expectedHash) {
    const target = scopedPath(root, relative);
    if (hash(readBytes(root, relative)) !== expectedHash) fail('CONFLICT', 'Current content changed before removal');
    fs.unlinkSync(target);
    let directoryFd;
    let directoryFlushed = false;
    try { directoryFd = fs.openSync(path.dirname(target), 'r'); fs.fsyncSync(directoryFd); directoryFlushed = true; }
    catch { /* Path removal visibility is distinct from power-loss durability. */ }
    finally { if (directoryFd !== undefined) fs.closeSync(directoryFd); }
    return { directoryFlushed };
}

module.exports = { fail, hash, scopedPath, readBytes, ensureDirectory, publishBytes, replaceRootFile, removeBytes };
