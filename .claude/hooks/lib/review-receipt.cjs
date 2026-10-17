#!/usr/bin/env node
'use strict';

/**
 * Review-before-commit receipt store — a bounded, short-lived proof that a
 * review fix-loop converged over the CURRENT changeset.
 *
 * This is bookkeeping, NEVER proof of user consent, a native permission, or a
 * security boundary. The store is an ordinary directory any process with write
 * access can forge. It exists so `review-commit-gate.cjs` can stop the agent
 * from committing a changeset no review fix-loop ever saw, while leaving an
 * explicit, recorded way to skip.
 *
 * Schema 2 receipts bind exact repository storage + base tree + candidate tree.
 * A pre-review snapshot names its target (`worktree`, `staged`, or a supported
 * per-statement commit descriptor); issuance recomputes that same target and
 * refuses drift. Matching is target-independent, so identical content can move
 * from worktree to index without invalidating review. Every index/tree write is
 * isolated under repository `tmp/`; candidate errors remain ERROR, never CLEAN.
 *
 * Kinds that satisfy the gate: `commit-review`, `changes-review`, `why-review`,
 * `workflow-review-changes`. `skip` is the recorded override: the `commit`
 * skill's Low-risk decision or the user's explicit request, named in `reason`.
 *
 * CLI (args, real clock):
 *   node review-receipt.cjs snapshot [--target=worktree|staged|commit-descriptor]
 *   node review-receipt.cjs issue --kind=... --scope=full-changeset --snapshot-json=<json>
 *   node review-receipt.cjs skip [--reason=...]
 *   node review-receipt.cjs check [--target=... --kind=...]
 *   node review-receipt.cjs clear
 * The CLI resolves the repository from the current working directory and the
 * store from CK_REVIEW_RECEIPT_STORE (default os.tmpdir()/ck/review-receipts).
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const REVIEW_KINDS = Object.freeze(['commit-review', 'changes-review', 'why-review', 'workflow-review-changes']);
const SKIP_KIND = 'skip';
const KINDS = Object.freeze([...REVIEW_KINDS, SKIP_KIND]);
const DEFAULT_LIFETIME_MS = 2 * 60 * 60 * 1000;
// Bounded like the git lease, but longer: a review can precede the commit by
// many turns in one working session, unlike the 15-minute destructive window.
const MAX_LIFETIME_MS = 4 * 60 * 60 * 1000;
const RECEIPT_ID_PATTERN = /^[a-f0-9]{32}$/;
const TREE_PATTERN = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;
const REVIEW_TARGETS = Object.freeze(['worktree', 'staged', 'commit-descriptor']);
const MAX_RECORD_BYTES = 8192;

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

function canonicalDirectory(value) {
    if (typeof value !== 'string' || value.length === 0 || !path.isAbsolute(value)) {
        throw new Error('An existing absolute repository directory is required');
    }
    const resolved = fs.realpathSync.native(value);
    if (!fs.statSync(resolved).isDirectory()) throw new Error('Directory required');
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function boundedText(value, label, max = 512) {
    if (typeof value !== 'string' || value.length === 0 || value.length > max ||
        value.trim() !== value || /[\x00-\x1f\x7f]/.test(value)) {
        throw new Error(`${label} must be a bounded printable string`);
    }
    return value;
}

function validKind(value) {
    if (!KINDS.includes(value)) throw new Error(`kind must be one of ${KINDS.join(', ')}`);
    return value;
}

function clock(options) {
    const now = options?.now === undefined ? Date.now() : options.now;
    if (!Number.isSafeInteger(now) || now <= 0) throw new Error('now must be a positive safe integer');
    return now;
}

function storeDirectory(options, repositoryHash) {
    // The env override lets a host relocate the store and lets tests isolate it;
    // the hook and the CLI must resolve the SAME default or the gate never clears.
    const configured = process.env.CK_REVIEW_RECEIPT_STORE;
    const store = options.storeDir === undefined
        ? (configured && configured.length > 0 ? configured : path.join(os.tmpdir(), 'ck', 'review-receipts'))
        : options.storeDir;
    if (typeof store !== 'string' || store.length === 0 || !path.isAbsolute(store)) {
        throw new Error('storeDir must be an absolute path');
    }
    return path.join(store, repositoryHash);
}

function candidateFingerprint({ repository, storageIdentity, baseTree, candidateTree }) {
    return sha256(JSON.stringify({ repository, storageIdentity, baseTree, candidateTree }));
}

function context(options) {
    const repository = canonicalDirectory(options.repository);
    const repositoryHash = sha256(repository);
    const storageIdentity = canonicalDirectory(options.storageIdentity);
    const baseTree = boundedText(options.baseTree, 'baseTree', 64);
    const candidateTree = boundedText(options.candidateTree, 'candidateTree', 64);
    if (!TREE_PATTERN.test(baseTree) || !TREE_PATTERN.test(candidateTree)) throw new Error('baseTree and candidateTree must be Git tree IDs');
    const fingerprint = candidateFingerprint({ repository, storageIdentity, baseTree, candidateTree });
    if (options.fingerprint !== undefined && options.fingerprint !== fingerprint) throw new Error('fingerprint does not match repository/storage/base/candidate identity');
    return {
        repository,
        repositoryHash,
        storageIdentity,
        baseTree,
        candidateTree,
        fingerprint,
        now: clock(options),
        directory: storeDirectory(options, repositoryHash)
    };
}

function receiptPath(ctx, kind, fingerprint) {
    return path.join(ctx.directory, `${kind}.${fingerprint}.json`);
}

function readRecord(file) {
    try {
        const stat = fs.lstatSync(file);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_RECORD_BYTES) return null;
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (_) {
        return null;
    }
}

function validRecord(record, ctx, kind, active = true) {
    return record && record.schemaVersion === 2 && RECEIPT_ID_PATTERN.test(record.receiptId) &&
        record.repository === ctx.repository && record.repositoryHash === ctx.repositoryHash &&
        record.storageIdentity === ctx.storageIdentity && record.baseTree === ctx.baseTree &&
        record.candidateTree === ctx.candidateTree && record.fingerprint === ctx.fingerprint &&
        record.kind === kind && record.scope === 'full-changeset' && REVIEW_TARGETS.includes(record.target) &&
        (record.descriptor === null || (record.descriptor && typeof record.descriptor === 'object' && !Array.isArray(record.descriptor))) &&
        Number.isSafeInteger(record.issuedAt) && record.issuedAt > 0 &&
        Number.isSafeInteger(record.expiresAt) && record.expiresAt > record.issuedAt &&
        record.expiresAt - record.issuedAt <= MAX_LIFETIME_MS &&
        (!active || (record.revokedAt === undefined && record.issuedAt <= ctx.now && ctx.now < record.expiresAt));
}

function writeRecord(ctx, kind, fingerprint, record) {
    fs.mkdirSync(ctx.directory, { recursive: true, mode: 0o700 });
    const file = receiptPath(ctx, kind, fingerprint);
    const temporary = `${file}.${crypto.randomBytes(8).toString('hex')}.tmp`;
    const contents = JSON.stringify(record);
    if (Buffer.byteLength(contents, 'utf8') > MAX_RECORD_BYTES) throw new Error('Receipt metadata exceeds the supported bound');
    fs.writeFileSync(temporary, contents, { flag: 'wx', mode: 0o600 });
    fs.renameSync(temporary, file);
    return record;
}

const FORBIDDEN_GIT_ENV = /^(?:GIT_(?:INDEX_FILE|DIR|WORK_TREE|COMMON_DIR|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES|REPLACE_REF_BASE|NO_REPLACE_OBJECTS|PREFIX|CEILING_DIRECTORIES|DISCOVERY_ACROSS_FILESYSTEM|NAMESPACE|ATTR_NOSYSTEM|ATTR_SOURCE|SHALLOW_FILE|INDEX_VERSION|LITERAL_PATHSPECS|GLOB_PATHSPECS|NOGLOB_PATHSPECS|ICASE_PATHSPECS)|GIT_CONFIG(?:_|$))/i;

// Command-scoped config (GIT_CONFIG_COUNT with KEY_n/VALUE_n pairs) that a host
// injects for remote access — e.g. a cloud container's GitHub proxy — cannot
// change what a commit contains. It is accepted only when the set is well
// formed and EVERY key is one of these; any other key (core.worktree, filters,
// hooksPath, ...) still fails closed, as do GIT_CONFIG_GLOBAL/SYSTEM/NOSYSTEM/
// PARAMETERS. The capture itself still runs with the pairs stripped.
const INJECTED_GIT_CONFIG_ENV = /^GIT_CONFIG_(?:COUNT|KEY_\d+|VALUE_\d+)$/i;
const CONTENT_NEUTRAL_CONFIG_KEY = /^(?:credential\.interactive|url\.[^\s]+\.(?:insteadof|pushinsteadof))$/i;

function contentNeutralInjectedConfig(env) {
    const count = env.GIT_CONFIG_COUNT;
    if (typeof count !== 'string' || !/^[1-9]\d?$/.test(count)) return false;
    const expected = new Set(['GIT_CONFIG_COUNT']);
    for (let i = 0; i < Number(count); i++) expected.add(`GIT_CONFIG_KEY_${i}`).add(`GIT_CONFIG_VALUE_${i}`);
    const present = Object.keys(env).filter(name => INJECTED_GIT_CONFIG_ENV.test(name));
    if (present.length !== expected.size || present.some(name => !expected.has(name))) return false;
    for (let i = 0; i < Number(count); i++) {
        const key = env[`GIT_CONFIG_KEY_${i}`];
        if (typeof key !== 'string' || !CONTENT_NEUTRAL_CONFIG_KEY.test(key)) return false;
    }
    return true;
}

function gitEnvironmentError(env) {
    const vars = env || {};
    const neutral = contentNeutralInjectedConfig(vars);
    return Object.keys(vars).find(name => FORBIDDEN_GIT_ENV.test(name) &&
        !(neutral && INJECTED_GIT_CONFIG_ENV.test(name))) || null;
}

function gitEnvironmentWithoutContext(env = process.env) {
    const clean = { ...env };
    for (const name of Object.keys(clean)) if (FORBIDDEN_GIT_ENV.test(name)) delete clean[name];
    return clean;
}

function runGit(exec, cwd, args, env, extra = {}) {
    const result = exec('git', args, {
        cwd,
        encoding: 'utf8',
        maxBuffer: 256 * 1024 * 1024,
        stdio: ['pipe', 'pipe', 'pipe'],
        ...(env ? { env } : {}),
        ...extra
    });
    return Buffer.isBuffer(result) ? result.toString('utf8') : String(result ?? '');
}

function pathIsInside(root, candidate) {
    const relative = path.relative(root, candidate);
    return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function gitPath(repository, value) {
    const resolved = path.resolve(repository, value);
    if (fs.existsSync(resolved)) return fs.realpathSync.native(resolved);
    return resolved;
}

function treeId(value, label) {
    const id = String(value || '').trim();
    if (!TREE_PATTERN.test(id)) throw Object.assign(new Error(`${label} is not a Git tree ID`), { code: 'INVALID_TREE_ID' });
    return id;
}

function boolConfig(run, key) {
    try {
        return run(['config', '--bool', '--get', key]).trim() === 'true';
    } catch (error) {
        if (error.status === 1) return false;
        throw error;
    }
}

function fileState(file) {
    try {
        const stat = fs.lstatSync(file);
        if (!stat.isFile() || stat.isSymbolicLink()) throw Object.assign(new Error('Git index must be a regular file'), { code: 'UNSAFE_INDEX_FILE' });
        return { exists: true, hash: sha256(fs.readFileSync(file)) };
    } catch (error) {
        if (error.code === 'ENOENT') return { exists: false, hash: null };
        throw error;
    }
}

function sameFileState(a, b) {
    return a?.exists === b?.exists && a?.hash === b?.hash;
}

function validateLiteralPaths(repository, cwd, paths) {
    if (!Array.isArray(paths) || paths.length === 0) throw Object.assign(new Error('Literal-path mode requires at least one file'), { code: 'INVALID_LITERAL_PATHS' });
    if (paths.length > 128 || paths.reduce((size, item) => size + (typeof item === 'string' ? item.length : 0), 0) > 4096) {
        throw Object.assign(new Error('Literal path list exceeds the supported bound'), { code: 'INVALID_LITERAL_PATHS' });
    }
    for (const value of paths) {
        if (typeof value !== 'string' || value.length === 0 || value.trim() !== value || /[\x00-\x1f\x7f]/.test(value) || path.isAbsolute(value) || /^[A-Za-z]:/.test(value)) {
            throw Object.assign(new Error('Only relative, literal file paths are supported'), { code: 'INVALID_LITERAL_PATHS' });
        }
        if (value.startsWith(':') || /[*?\[\]]/.test(value)) {
            throw Object.assign(new Error('Magic and wildcard pathspecs are unsupported; name an exact file'), { code: 'UNSUPPORTED_PATHSPEC' });
        }
        const absolute = path.resolve(cwd, value);
        if (!pathIsInside(repository, absolute)) throw Object.assign(new Error('Literal path resolves outside the repository'), { code: 'PATH_OUTSIDE_REPOSITORY' });
        let parent;
        try {
            parent = fs.realpathSync.native(path.dirname(absolute));
        } catch (_) {
            throw Object.assign(new Error('Literal path parent must exist'), { code: 'INVALID_LITERAL_PATHS' });
        }
        if (!pathIsInside(repository, parent)) throw Object.assign(new Error('Literal path follows a directory symlink outside the repository'), { code: 'PATH_OUTSIDE_REPOSITORY' });
        try {
            if (fs.statSync(absolute).isDirectory()) throw Object.assign(new Error('Literal paths must name files, not directories'), { code: 'INVALID_LITERAL_PATHS' });
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
    }
}

function descriptorForCapture(repository, storageIdentity, cwd, indexPath, descriptor) {
    if (!descriptor || typeof descriptor !== 'object' || Array.isArray(descriptor)) {
        throw Object.assign(new Error('A commit descriptor is required'), { code: 'INVALID_DESCRIPTOR' });
    }
    const mode = descriptor.mode;
    if (!['staged', 'all', 'literal-paths'].includes(mode)) throw Object.assign(new Error('Unsupported commit mode'), { code: 'UNSUPPORTED_COMMIT_MODE' });
    for (const [key, actual] of [['repository', repository], ['storageIdentity', storageIdentity], ['indexPath', indexPath]]) {
        if (descriptor[key] !== undefined && path.resolve(String(descriptor[key])) !== path.resolve(actual)) {
            throw Object.assign(new Error(`Commit descriptor ${key} changed`), { code: 'DESCRIPTOR_CONTEXT_CHANGED' });
        }
    }
    if (descriptor.cwd !== undefined && path.resolve(String(descriptor.cwd)) !== path.resolve(cwd)) {
        throw Object.assign(new Error('Commit descriptor cwd changed'), { code: 'DESCRIPTOR_CONTEXT_CHANGED' });
    }
    const literalPaths = descriptor.literalPaths === undefined ? [] : descriptor.literalPaths;
    if (!Array.isArray(literalPaths) || literalPaths.some(item => typeof item !== 'string')) {
        throw Object.assign(new Error('literalPaths must be an array of strings'), { code: 'INVALID_LITERAL_PATHS' });
    }
    if (mode === 'literal-paths') validateLiteralPaths(repository, cwd, literalPaths);
    else if (literalPaths.length !== 0) throw Object.assign(new Error('Literal paths cannot be mixed with staged or -a mode'), { code: 'MIXED_COMMIT_MODE' });
    if (descriptor.amend !== undefined && typeof descriptor.amend !== 'boolean') {
        throw Object.assign(new Error('amend must be a boolean'), { code: 'INVALID_DESCRIPTOR' });
    }
    // `amend` is recorded only when true so every non-amend descriptor keeps its prior identity.
    return { repository, storageIdentity, cwd, indexPath, mode, literalPaths: [...literalPaths], ...(descriptor.amend ? { amend: true } : {}) };
}

function errorSnapshot(target, error, repository = null, cwd = null) {
    return {
        status: 'ERROR', repository, storageIdentity: null, cwd, indexPath: null,
        baseTree: null, candidateTree: null, fingerprint: null, target,
        descriptor: null,
        errorCode: typeof error?.code === 'string' && /^[A-Z0-9_]+$/.test(error.code) ? error.code : 'CANDIDATE_COMPUTATION_FAILED',
        errorMessage: String(error?.message || 'Candidate computation failed').slice(0, 500)
    };
}

/**
 * Capture the exact content a review or supported commit invocation targets.
 * Every Git write runs against a throwaway index and object directory under the
 * repository's `tmp/`; the user's index and object database remain read-only.
 */
function captureReviewTarget(options = {}) {
    const target = options.target;
    let repository = null;
    let cwd = null;
    let actualIndexPath = null;
    let indexBefore = null;
    let temporaryDirectory = null;
    let result = null;
    const exec = options.exec || execFileSync;
    try {
        if (!REVIEW_TARGETS.includes(target)) throw Object.assign(new Error('target must be worktree, staged, or commit-descriptor'), { code: 'INVALID_TARGET' });
        const sourceRepository = canonicalDirectory(options.repository);
        const sourceCwd = options.descriptor?.cwd || options.cwd || sourceRepository;
        repository = canonicalDirectory(sourceRepository);
        cwd = canonicalDirectory(sourceCwd);
        if (!pathIsInside(repository, cwd)) throw Object.assign(new Error('Effective cwd must be inside the repository'), { code: 'CWD_OUTSIDE_REPOSITORY' });
        const unsafeVariable = gitEnvironmentError(process.env);
        if (unsafeVariable) throw Object.assign(new Error(`Unsupported ambient Git context: ${unsafeVariable}`), { code: 'UNSUPPORTED_GIT_ENVIRONMENT' });
        const cleanEnv = gitEnvironmentWithoutContext(process.env);
        const run = (args, extra = {}) => runGit(exec, repository, args, cleanEnv, extra);

        const discoveredRoot = canonicalDirectory(run(['rev-parse', '--show-toplevel']).trim());
        if (discoveredRoot !== repository) throw Object.assign(new Error('Repository identity changed during candidate capture'), { code: 'REPOSITORY_IDENTITY_CHANGED' });
        const storageRaw = run(['rev-parse', '--git-common-dir']).trim();
        const storageIdentity = canonicalDirectory(path.isAbsolute(storageRaw) ? storageRaw : path.resolve(repository, storageRaw));
        const rawIndexPath = run(['rev-parse', '--git-path', 'index']).trim();
        if (!rawIndexPath) throw Object.assign(new Error('Git did not resolve its default index path'), { code: 'INDEX_PATH_UNRESOLVED' });
        actualIndexPath = gitPath(repository, rawIndexPath);
        const rawObjectsPath = run(['rev-parse', '--git-path', 'objects']).trim();
        const objectsPath = canonicalDirectory(path.isAbsolute(rawObjectsPath) ? rawObjectsPath : path.resolve(repository, rawObjectsPath));
        if (fs.existsSync(path.join(objectsPath, 'info', 'alternates'))) {
            throw Object.assign(new Error('Alternate object stores are unsupported'), { code: 'UNSUPPORTED_ALTERNATE_OBJECT_STORE' });
        }
        const descriptor = target === 'commit-descriptor'
            ? descriptorForCapture(repository, storageIdentity, cwd, actualIndexPath, options.descriptor)
            : null;
        indexBefore = fileState(actualIndexPath);
        const sharedIndex = run(['rev-parse', '--shared-index-path']).trim();
        if (sharedIndex) throw Object.assign(new Error('Split indexes are unsupported'), { code: 'UNSUPPORTED_SPLIT_INDEX' });
        if (boolConfig(run, 'core.splitIndex')) throw Object.assign(new Error('Split-index mode is unsupported'), { code: 'UNSUPPORTED_SPLIT_INDEX' });
        if (boolConfig(run, 'core.sparseCheckout')) throw Object.assign(new Error('Sparse checkouts are unsupported'), { code: 'UNSUPPORTED_SPARSE_INDEX' });
        if (run(['ls-files', '-u', '-z']).length !== 0) throw Object.assign(new Error('Unmerged index entries must be resolved first'), { code: 'UNMERGED_INDEX' });
        const sparseEntries = run(['ls-files', '--sparse', '--stage', '-z']);
        if (sparseEntries.split('\0').some(entry => entry.startsWith('040000 '))) {
            throw Object.assign(new Error('Sparse index entries are unsupported'), { code: 'UNSUPPORTED_SPARSE_INDEX' });
        }

        let headCommit = null;
        let baseTree;
        try {
            headCommit = run(['rev-parse', '--verify', 'HEAD']).trim();
            baseTree = treeId(run(['rev-parse', `${headCommit}^{tree}`]), 'baseTree');
        } catch (headError) {
            let headRef;
            try {
                headRef = run(['symbolic-ref', '-q', 'HEAD']).trim();
            } catch (_) {
                throw Object.assign(new Error('HEAD is not a confirmed unborn branch'), { code: 'HEAD_UNRESOLVED' });
            }
            try {
                run(['show-ref', '--verify', '--quiet', headRef]);
                throw Object.assign(new Error('HEAD ref exists but could not be resolved'), { code: 'HEAD_UNRESOLVED' });
            } catch (refError) {
                if (refError.code === 'HEAD_UNRESOLVED' || refError.status !== 1) throw refError;
            }
            baseTree = treeId(run(['hash-object', '-t', 'tree', '--stdin'], { input: '' }), 'empty baseTree');
        }
        if (descriptor?.amend) {
            // An amend replaces HEAD, so the commit it produces is reviewed against HEAD's parent —
            // the same base `git reset --soft HEAD~1 && git commit` would have.
            if (!headCommit) throw Object.assign(new Error('Cannot amend: HEAD has no commit'), { code: 'AMEND_WITHOUT_HEAD' });
            const parents = run(['rev-list', '--parents', '-n', '1', headCommit]).trim().split(/\s+/).slice(1);
            if (parents.length > 1) throw Object.assign(new Error('Amending a merge commit is unsupported for receipt matching'), { code: 'UNSUPPORTED_AMEND_MERGE' });
            baseTree = parents.length === 1
                ? treeId(run(['rev-parse', `${parents[0]}^{tree}`]), 'amend baseTree')
                : treeId(run(['hash-object', '-t', 'tree', '--stdin'], { input: '' }), 'empty amend baseTree');
        }

        const projectTmp = path.join(repository, 'tmp');
        fs.mkdirSync(projectTmp, { recursive: true });
        const canonicalTmp = fs.realpathSync.native(projectTmp);
        if (!pathIsInside(repository, canonicalTmp)) throw Object.assign(new Error('Repository tmp directory resolves outside the repository'), { code: 'TEMP_DIRECTORY_OUTSIDE_REPOSITORY' });
        temporaryDirectory = fs.mkdtempSync(path.join(canonicalTmp, 'ck-review-candidate-'));
        const tempIndex = path.join(temporaryDirectory, 'index');
        const tempObjects = path.join(temporaryDirectory, 'objects');
        fs.mkdirSync(tempObjects);
        const candidateEnv = {
            ...cleanEnv,
            GIT_INDEX_FILE: tempIndex,
            GIT_OBJECT_DIRECTORY: tempObjects,
            GIT_ALTERNATE_OBJECT_DIRECTORIES: objectsPath
        };
        const candidateRun = (args, extra = {}) => runGit(exec, repository, args, candidateEnv, extra);
        const mode = target === 'commit-descriptor' ? descriptor.mode : target;
        if (mode === 'staged' || mode === 'all') {
            if (indexBefore.exists) fs.copyFileSync(actualIndexPath, tempIndex);
            else candidateRun(headCommit ? ['read-tree', headCommit] : ['read-tree', '--empty']);
        } else {
            candidateRun(headCommit ? ['read-tree', headCommit] : ['read-tree', '--empty']);
        }
        if (mode === 'worktree') {
            candidateRun(['add', '-A']);
        } else if (mode === 'all') {
            candidateRun(['add', '-u']);
        } else if (mode === 'literal-paths') {
            candidateRun(['--literal-pathspecs', 'add', '-A', '--', ...descriptor.literalPaths], { cwd });
        }
        const candidateTree = treeId(candidateRun(['write-tree']), 'candidateTree');
        const fingerprint = candidateFingerprint({ repository, storageIdentity, baseTree, candidateTree });
        result = {
            status: candidateTree === baseTree ? 'CLEAN' : 'CHANGED',
            repository, storageIdentity, cwd, indexPath: actualIndexPath,
            baseTree, candidateTree, fingerprint, target, descriptor
        };
    } catch (error) {
        result = errorSnapshot(target, error, repository, cwd);
    } finally {
        if (actualIndexPath && indexBefore) {
            try {
                if (!sameFileState(indexBefore, fileState(actualIndexPath))) {
                    result = errorSnapshot(target, Object.assign(new Error('The real Git index changed during candidate capture'), { code: 'INDEX_CHANGED_DURING_CAPTURE' }), repository, cwd);
                }
            } catch (error) {
                result = errorSnapshot(target, error, repository, cwd);
            }
        }
        if (temporaryDirectory) {
            try {
                fs.rmSync(temporaryDirectory, { recursive: true, force: true });
            } catch (error) {
                result = errorSnapshot(target, Object.assign(new Error(`Could not remove throwaway candidate state: ${error.message}`), { code: 'TEMP_CLEANUP_FAILED' }), repository, cwd);
            }
        }
    }
    return result || errorSnapshot(target, new Error('Candidate capture produced no result'), repository, cwd);
}

function sameSnapshotIdentity(a, b) {
    return a.repository === b.repository && a.storageIdentity === b.storageIdentity &&
        a.indexPath === b.indexPath && a.cwd === b.cwd && a.target === b.target &&
        a.baseTree === b.baseTree && a.candidateTree === b.candidateTree &&
        a.fingerprint === b.fingerprint && JSON.stringify(a.descriptor ?? null) === JSON.stringify(b.descriptor ?? null);
}

/** Legacy helper: returns null only for a confirmed clean worktree; Git errors throw. */
function computeChangeFingerprint(repository, exec = execFileSync) {
    const snapshot = captureReviewTarget({ repository, cwd: repository, target: 'worktree', exec });
    if (snapshot.status === 'ERROR') throw Object.assign(new Error(snapshot.errorMessage), { code: snapshot.errorCode });
    return snapshot.status === 'CLEAN' ? null : snapshot.fingerprint;
}

function issueReceipt(options) {
    const kind = validKind(options.kind);
    if (options.scope !== 'full-changeset') throw new Error("scope must be 'full-changeset'");
    const snapshot = options.snapshot;
    if (!snapshot || snapshot.status !== 'CHANGED' || !REVIEW_TARGETS.includes(snapshot.target)) {
        throw new Error('A CHANGED pre-review snapshot is required');
    }
    if (options.repository !== undefined && canonicalDirectory(options.repository) !== snapshot.repository) {
        throw new Error('The receipt repository does not match the pre-review snapshot');
    }
    if (options.fingerprint !== undefined && options.fingerprint !== snapshot.fingerprint) {
        throw new Error('The supplied fingerprint does not match the pre-review snapshot');
    }
    const current = captureReviewTarget({
        repository: snapshot.repository,
        cwd: snapshot.cwd,
        target: snapshot.target,
        ...(snapshot.descriptor ? { descriptor: snapshot.descriptor } : {}),
        ...(options.exec ? { exec: options.exec } : {})
    });
    if (current.status === 'ERROR') throw new Error(`Cannot issue receipt: candidate capture failed (${current.errorCode})`);
    if (current.status !== 'CHANGED' || !sameSnapshotIdentity(snapshot, current)) {
        throw new Error('Cannot issue receipt: the reviewed target changed; capture and review the final full changeset');
    }
    const ctx = context({
        ...options,
        repository: current.repository,
        storageIdentity: current.storageIdentity,
        baseTree: current.baseTree,
        candidateTree: current.candidateTree,
        fingerprint: current.fingerprint
    });
    const ttlMs = options.ttlMs === undefined ? DEFAULT_LIFETIME_MS : options.ttlMs;
    if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0 || ttlMs > MAX_LIFETIME_MS) {
        throw new Error(`Lifetime must be 1..${MAX_LIFETIME_MS} ms`);
    }
    return writeRecord(ctx, kind, ctx.fingerprint, {
        schemaVersion: 2,
        receiptId: crypto.randomBytes(16).toString('hex'),
        repository: ctx.repository,
        repositoryHash: ctx.repositoryHash,
        storageIdentity: ctx.storageIdentity,
        baseTree: ctx.baseTree,
        candidateTree: ctx.candidateTree,
        kind,
        scope: 'full-changeset',
        target: current.target,
        descriptor: current.descriptor,
        fingerprint: ctx.fingerprint,
        issuedAt: ctx.now,
        expiresAt: ctx.now + ttlMs,
        ...(options.reason === undefined ? {} : { reason: boundedText(String(options.reason), 'reason', 512) })
    });
}

function checkReceipt(options) {
    try {
        const kind = validKind(options.kind);
        const snapshot = options.snapshot || options;
        if (snapshot.status !== undefined && snapshot.status !== 'CHANGED') return false;
        if (options.repository !== undefined && canonicalDirectory(options.repository) !== snapshot.repository) return false;
        if (options.storageIdentity !== undefined && canonicalDirectory(options.storageIdentity) !== snapshot.storageIdentity) return false;
        if (options.baseTree !== undefined && options.baseTree !== snapshot.baseTree) return false;
        if (options.candidateTree !== undefined && options.candidateTree !== snapshot.candidateTree) return false;
        const ctx = context({ ...snapshot, ...options,
            repository: snapshot.repository,
            storageIdentity: snapshot.storageIdentity,
            baseTree: snapshot.baseTree,
            candidateTree: snapshot.candidateTree,
            fingerprint: snapshot.fingerprint
        });
        const record = readRecord(receiptPath(ctx, kind, ctx.fingerprint));
        // `validRecord` short-circuits to the null record; normalize to a real boolean.
        return validRecord(record, ctx, kind) === true;
    } catch (_) {
        return false;
    }
}

/** Return the first matching declared review kind or null. */
function matchReviewReceipt(options) {
    for (const kind of REVIEW_KINDS) {
        if (checkReceipt({ ...options, kind })) return kind;
    }
    return null;
}

function matchSkipReceipt(options) {
    return checkReceipt({ ...options, kind: SKIP_KIND }) ? SKIP_KIND : null;
}

function clearReceipts(options) {
    const repository = canonicalDirectory(options.repository);
    const directory = storeDirectory(options, sha256(repository));
    let removed = 0;
    let names = [];
    try {
        names = fs.readdirSync(directory);
    } catch (_) {
        return 0;
    }
    for (const name of names) {
        if (!/\.json$/.test(name)) continue;
        try {
            fs.unlinkSync(path.join(directory, name));
            removed++;
        } catch (_) { /* Best-effort cleanup; a held file is not an error. */ }
    }
    return removed;
}

function resolveRepository(cwd, exec = execFileSync) {
    try {
        if (gitEnvironmentError(process.env)) return null;
        const out = runGit(exec, cwd, ['rev-parse', '--show-toplevel'], gitEnvironmentWithoutContext(process.env)).trim();
        return out || null;
    } catch (_) {
        return null;
    }
}

function parseArgs(argv) {
    const options = {};
    for (const arg of argv) {
        const match = /^--([^=]+)(?:=(.*))?$/.exec(arg);
        if (!match) throw new Error(`Unsupported argument: ${arg}`);
        options[match[1]] = match[2] === undefined ? true : match[2];
    }
    return options;
}

function runCli(argv) {
    const command = argv[0];
    const allowed = new Set(['snapshot', 'issue', 'skip', 'check', 'clear']);
    if (!allowed.has(command)) {
        throw new Error('Use snapshot|issue|skip|check|clear with explicit options');
    }
    const flags = parseArgs(argv.slice(1));
    const storeDir = process.env.CK_REVIEW_RECEIPT_STORE || undefined;
    const repository = resolveRepository(process.cwd());
    if (!repository) throw new Error('Not inside a resolvable Git repository');
    const base = { repository, ...(storeDir ? { storeDir } : {}) };
    const descriptor = flags['descriptor-json'] === undefined ? undefined : JSON.parse(flags['descriptor-json']);
    if (command === 'snapshot') {
        return captureReviewTarget({ repository, cwd: process.cwd(), target: flags.target || 'worktree', ...(descriptor ? { descriptor } : {}) });
    }
    if (command === 'issue') {
        if (typeof flags['snapshot-json'] !== 'string') throw new Error('issue requires --snapshot-json=<pre-review snapshot>');
        const snapshot = JSON.parse(flags['snapshot-json']);
        return issueReceipt({ ...base, snapshot, scope: flags.scope, kind: flags.kind,
            ttlMs: flags['ttl-ms'] === undefined ? undefined : Number(flags['ttl-ms']), reason: flags.reason });
    }
    if (command === 'skip') {
        const snapshot = captureReviewTarget({ repository, cwd: process.cwd(), target: flags.target || 'worktree' });
        return issueReceipt({ ...base, snapshot, scope: 'full-changeset', kind: SKIP_KIND, reason: flags.reason });
    }
    if (command === 'clear') {
        return { removed: clearReceipts(base) };
    }
    // check the requested review target; CLEAN needs no receipt, ERROR is never clean.
    const snapshot = captureReviewTarget({ repository, cwd: process.cwd(), target: flags.target || 'worktree', ...(descriptor ? { descriptor } : {}) });
    if (snapshot.status === 'ERROR') return { status: 'ERROR', errorCode: snapshot.errorCode, valid: false };
    if (snapshot.status === 'CLEAN') return { status: 'CLEAN', fingerprint: snapshot.fingerprint, valid: true, review: null, skip: null };
    if (flags.kind !== undefined) {
        return { status: snapshot.status, kind: flags.kind, fingerprint: snapshot.fingerprint,
            valid: checkReceipt({ ...base, snapshot, kind: flags.kind }) };
    }
    return { status: snapshot.status, fingerprint: snapshot.fingerprint,
        review: matchReviewReceipt({ ...base, snapshot }), skip: matchSkipReceipt({ ...base, snapshot }) };
}

module.exports = {
    REVIEW_KINDS,
    SKIP_KIND,
    KINDS,
    DEFAULT_LIFETIME_MS,
    MAX_LIFETIME_MS,
    canonicalDirectory,
    captureReviewTarget,
    candidateFingerprint,
    computeChangeFingerprint,
    issueReceipt,
    checkReceipt,
    matchReviewReceipt,
    matchSkipReceipt,
    clearReceipts
};

if (require.main === module) {
    try {
        const result = runCli(process.argv.slice(2));
        process.stdout.write(`${JSON.stringify(result)}\n`);
        process.exitCode = result?.status === 'ERROR' ? 2 : (result && result.valid === false ? 1 : 0);
    } catch (error) {
        process.stderr.write(`Review receipt failed: ${error.message}\n`);
        process.exitCode = 2;
    }
}
