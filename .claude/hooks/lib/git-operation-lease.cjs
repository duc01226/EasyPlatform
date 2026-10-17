#!/usr/bin/env node
'use strict';

/**
 * Operation bookkeeping, NEVER proof of user consent or native permission.
 * Callers must obtain actual Git intent separately and resolve the effective Git
 * repository (including redirects) before calling checkLease. Missing/ambiguous
 * host repository or session metadata yields no match, with no project fallback.
 * Leases last at most 15 minutes; check/import never refresh their original time.
 * sourceRequest is a bounded, non-secret request identifier/description, not a transcript.
 * CLI: node git-operation-lease.cjs issue|import|check|revoke|revoke-session < explicit-options.json
 * Revoke requires leaseId; lifecycle callers use revokeSessionLeases on clear/exit.
 * Compact does not issue, import, refresh or revoke. Crashes rely on expiry.
 * Storage is not tamper-proof: any process with write access can forge bookkeeping.
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const MAX_LIFETIME_MS = 15 * 60 * 1000;
// `discard` covers every irreversible working-tree/history operation the removed git-commit-block.cjs hook gated
// (`reset --hard`, `clean -f`, `checkout -- <path>`, `branch -D`, `stash drop`, a force push…).
// It exists so an explicitly-requested destructive command has SOME path to consent: without a
// mintable term the gate would be unclearable, and an unclearable gate is one the user turns off
// wholesale. `amend` needs no term: it is a recoverable commit (the replaced commit stays in the
// reflog), gated by the review receipt like any other commit.
const OPERATIONS = Object.freeze(['add', 'commit', 'push', 'discard']);
const ID_PATTERN = /^[a-f0-9]{32}$/;
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const text = (value, limit) => typeof value === 'string' && value.length <= limit && value.trim() === value &&
    value.length > 0 && !/[\x00-\x1f\x7f]/.test(value);

function canonicalDirectory(value) {
    if (!text(value, 32768) || !path.isAbsolute(value)) throw new Error('An existing absolute directory is required');
    const canonical = fs.realpathSync.native(value);
    if (!fs.statSync(canonical).isDirectory()) throw new Error('Directory required');
    return canonical;
}

function scope(options, includeRepository = true) {
    if (!text(options.sessionId, 256) || options.sessionId.toLowerCase() === 'default') throw new Error('Real sessionId required');
    const project = canonicalDirectory(options.projectDir);
    const repository = includeRepository ? canonicalDirectory(options.repository) : undefined;
    const now = options.now === undefined ? Date.now() : options.now;
    if (!Number.isSafeInteger(now) || now <= 0) throw new Error('Valid clock required');
    const projectHash = hash(project);
    const sessionHash = hash(options.sessionId);
    const store = options.storeDir === undefined ? path.join(os.tmpdir(), 'ck', 'git-operation-leases') : options.storeDir;
    if (!text(store, 32768) || !path.isAbsolute(store)) throw new Error('Absolute storeDir required');
    return { project, repository, projectHash, sessionHash, repositoryHash: repository && hash(repository), now,
        directory: path.join(store, projectHash, sessionHash) };
}

function validRecord(record, context, active = true) {
    return record && record.schemaVersion === 1 && ID_PATTERN.test(record.leaseId) &&
        record.project === context.project && record.projectHash === context.projectHash &&
        record.sessionHash === context.sessionHash && text(record.repository, 32768) &&
        record.repositoryHash === hash(record.repository) &&
        (!context.repository || (record.repository === context.repository && record.repositoryHash === context.repositoryHash)) &&
        text(record.sourceRequest, 512) && Array.isArray(record.operations) && record.operations.length > 0 &&
        record.operations.every(op => OPERATIONS.includes(op)) && new Set(record.operations).size === record.operations.length &&
        Number.isSafeInteger(record.issuedAt) && record.issuedAt > 0 && Number.isSafeInteger(record.expiresAt) &&
        record.expiresAt > record.issuedAt && record.expiresAt - record.issuedAt <= MAX_LIFETIME_MS &&
        (!active || (record.revokedAt === undefined && record.issuedAt <= context.now && context.now < record.expiresAt));
}

function leasePath(context, leaseId) {
    if (typeof leaseId !== 'string' || !ID_PATTERN.test(leaseId)) throw new Error('Valid leaseId required');
    return path.join(context.directory, `${leaseId}.json`);
}

function readRecord(file) {
    try {
        const stat = fs.lstatSync(file);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 8192) return null;
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (_) { return null; }
}

// Exclusive per-record lock serializes import/revoke. A crashed lock denies mutation;
// it never authorizes execution. Unique temp + rename publishes whole records only.
function replaceRecord(context, leaseId, makeRecord) {
    fs.mkdirSync(context.directory, { recursive: true, mode: 0o700 });
    const file = leasePath(context, leaseId);
    const lock = `${file}.lock`;
    const descriptor = fs.openSync(lock, 'wx', 0o600);
    const temporary = `${file}.${crypto.randomBytes(8).toString('hex')}.tmp`;
    try {
        const record = makeRecord(readRecord(file), fs.existsSync(file));
        const serialized = JSON.stringify(record);
        // Reserve room for the revocation timestamp within the reader's 8192-byte cap.
        if (Buffer.byteLength(serialized) > (record.revokedAt === undefined ? 8000 : 8192)) throw new Error('Lease record too large');
        fs.writeFileSync(temporary, serialized, { flag: 'wx', mode: 0o600 });
        fs.renameSync(temporary, file);
        return record;
    } finally {
        fs.closeSync(descriptor);
        try { fs.unlinkSync(temporary); } catch (_) { /* No published partial record. */ }
        fs.unlinkSync(lock);
    }
}

function importLease(options) {
    const context = scope(options);
    const record = options.record;
    if (!validRecord(record, context)) throw new Error('Invalid, expired, future or mismatched lease');
    return replaceRecord(context, record.leaseId, (_, exists) => {
        if (exists) throw new Error('Lease already recorded; import cannot renew or replay');
        return record;
    });
}

function issueLease(options) {
    const context = scope(options);
    const ttlMs = options.ttlMs === undefined ? MAX_LIFETIME_MS : options.ttlMs;
    if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0 || ttlMs > MAX_LIFETIME_MS) throw new Error('Lifetime must be 1..900000 ms');
    const record = { schemaVersion: 1, leaseId: crypto.randomBytes(16).toString('hex'),
        project: context.project, repository: context.repository, projectHash: context.projectHash,
        repositoryHash: context.repositoryHash, sessionHash: context.sessionHash, operations: options.operations,
        issuedAt: context.now, expiresAt: context.now + ttlMs, sourceRequest: options.sourceRequest };
    return importLease({ ...options, now: context.now, record });
}

function listRecords(context) {
    try { return fs.readdirSync(context.directory).filter(name => /^[a-f0-9]{32}\.json$/.test(name)); }
    catch (_) { return []; }
}

function checkLease(options) {
    try {
        const context = scope(options);
        if (!OPERATIONS.includes(options.operation)) return false;
        return listRecords(context).some(name => {
            const record = readRecord(path.join(context.directory, name));
            return validRecord(record, context) && name === `${record.leaseId}.json` && record.operations.includes(options.operation);
        });
    } catch (_) { return false; }
}

function revokeRecord(context, leaseId) {
    const file = leasePath(context, leaseId);
    const current = readRecord(file);
    if (!validRecord(current, context, false) || current.leaseId !== leaseId || current.revokedAt !== undefined) return false;
    replaceRecord(context, leaseId, record => {
        if (!validRecord(record, context, false) || record.leaseId !== leaseId || record.revokedAt !== undefined) throw new Error('Lease changed');
        return { ...record, revokedAt: context.now };
    });
    return true;
}

function revokeLease(options) {
    return revokeRecord(scope(options), options.leaseId);
}

function revokeSessionLeases(options) {
    const context = scope(options, false);
    let revoked = 0;
    for (const name of listRecords(context)) if (revokeRecord(context, name.slice(0, -5))) revoked++;
    return revoked;
}

module.exports = { MAX_LIFETIME_MS, OPERATIONS, canonicalDirectory, issueLease, importLease, checkLease, revokeLease, revokeSessionLeases };

if (require.main === module) {
    try {
        const command = process.argv[2];
        const actions = { issue: issueLease, import: importLease, check: checkLease, revoke: revokeLease,
            'revoke-session': revokeSessionLeases };
        if (process.argv.length !== 3 || !Object.hasOwn(actions, command)) throw new Error('Use issue|import|check|revoke|revoke-session with explicit JSON stdin');
        const options = JSON.parse(fs.readFileSync(0, 'utf8'));
        if (Object.hasOwn(options, 'now')) throw new Error('CLI uses the real clock');
        const result = actions[command](options);
        process.stdout.write(`${JSON.stringify(result)}\n`);
        process.exitCode = result === false ? 1 : 0;
    } catch (error) {
        process.stderr.write(`Git lease bookkeeping failed: ${error.message}\n`);
        process.exitCode = 2;
    }
}
