"use strict";

/**
 * Bounded, read-only workflow ownership baseline.
 *
 * The module records Git identity/status metadata and, only after an explicit owned-path approval,
 * may snapshot small regular UTF-8 text files in a user-private OS temp directory.  It never runs
 * shell text, restores files, writes into the repository, or treats a path name as permission to
 * read its contents.  All public operations are intentionally pure at the policy boundary and
 * return evidence-shaped data suitable for workflow-end reports.
 */

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { TextDecoder } = require("node:util");
const {
  hasApprovalPrefix,
  stripApprovalPrefix,
  classifySensitivePath,
} = require("../../hooks/lib/sensitive-path-policy.cjs");
const { isAbsolutePathWithin: isWithin } = require("../../hooks/lib/ck-path-utils.cjs");

const MAX_FILE_BYTES = 256 * 1024;
const MAX_RUN_BYTES = 2 * 1024 * 1024;
const MAX_SNAPSHOT_FILES = 64;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const RUN_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const TEXT_DECODER = new TextDecoder("utf-8", { fatal: true });

function fail(message) {
  throw new Error(message);
}

function own(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function assertRunId(runId) {
  if (typeof runId !== "string" || !RUN_ID.test(runId) || runId === "." || runId === "..") {
    fail("Invalid workflow baseline runId");
  }
  return runId;
}

function numericNow(value) {
  const result = value === undefined ? Date.now() : Number(value);
  if (!Number.isFinite(result) || result < 0) fail("Invalid baseline clock");
  return result;
}

function hashBuffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function hashText(value) {
  if (typeof value !== "string") fail("expectedBefore must be a string");
  const buffer = Buffer.from(value, "utf8");
  if (buffer.length > MAX_FILE_BYTES) fail(`expectedBefore exceeds ${MAX_FILE_BYTES} byte limit`);
  return hashBuffer(buffer);
}

function canonicalExisting(target) {
  try {
    return fs.realpathSync.native(target);
  } catch {
    return path.resolve(target);
  }
}

function canonicalRoot(rootDir) {
  if (typeof rootDir !== "string" || rootDir.trim() === "") fail("rootDir is required");
  const absolute = path.resolve(rootDir);
  if (!fs.existsSync(absolute)) fail("rootDir does not exist");
  const stat = fs.lstatSync(absolute);
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail("rootDir must be a real directory");
  return canonicalExisting(absolute);
}

function defaultStoreDir() {
  // The host temp root is host-configured, not a supplied store, and may itself sit behind a link
  // (macOS: os.tmpdir() is /var/folders/… with /var -> /private/var). Resolve that root once;
  // ensureStoreDir still refuses any link at or below it.
  return path.join(canonicalExisting(os.tmpdir()), "easy-claude-workflow-baselines");
}

function assertNotRootOrProject(storeDir, rootDir) {
  const absolute = path.resolve(storeDir);
  const parsedRoot = path.parse(absolute).root;
  if (absolute === parsedRoot) fail("baseline store cannot be a filesystem root");
  if (isWithin(rootDir, absolute) || isWithin(absolute, rootDir)) {
    fail("baseline store must be outside the project root");
  }
  return absolute;
}

function looksLikeReparse(stat) {
  // Node exposes symbolic links portably.  On Windows a junction/reparse target is additionally
  // rejected when its real path escapes the project; callers never dereference an unvalidated
  // candidate.  The mode bit is intentionally not guessed because Node's Windows stat mode is
  // not a stable reparse-point API across supported releases.
  return stat.isSymbolicLink();
}

function ensureStoreDir(rootDir, requestedStore, { privacyAvailable, windowsAclVerified } = {}) {
  const target = assertNotRootOrProject(requestedStore || defaultStoreDir(), rootDir);
  // Never let mkdir/realpath follow a pre-existing symlink or junction supplied as the store.
  // Validate each existing component before creating the final directory; this keeps the
  // metadata/snapshot boundary host-neutral and prevents an attacker from redirecting a run store
  // between the lexical containment check and the first write.
  const parsed = path.parse(target);
  let cursor = parsed.root;
  for (const segment of path.relative(parsed.root, target).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, segment);
    if (!fs.existsSync(cursor)) break;
    const component = fs.lstatSync(cursor);
    if (looksLikeReparse(component)) fail("baseline store path cannot contain a symlink/reparse point");
    if (!component.isDirectory() && cursor !== target) fail("baseline store parent must be a directory");
  }
  fs.mkdirSync(target, { recursive: true, mode: 0o700 });
  const stat = fs.lstatSync(target);
  if (!stat.isDirectory() || looksLikeReparse(stat)) fail("baseline store must be a real directory");

  let privateStore;
  if (privacyAvailable !== undefined) {
    privateStore = privacyAvailable === true;
  } else if (process.platform === "win32") {
    // ACL inspection is host-specific; the host-capability phase may explicitly attest that the
    // inherited temp ACL is user-private.  Without that attestation we stay metadata-only.
    privateStore = windowsAclVerified === true;
  } else {
    privateStore = (stat.mode & 0o777) === 0o700 &&
      (typeof process.getuid !== "function" || stat.uid === process.getuid());
  }
  return { path: target, privateStore };
}

function runGit(rootDir, args, { allowFailure = true } = {}) {
  try {
    return { ok: true, stdout: execFileSync("git", args, {
      cwd: rootDir,
      encoding: "buffer",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 8 * 1024 * 1024,
      windowsHide: true,
    }) };
  } catch (error) {
    if (!allowFailure) throw error;
    return { ok: false, error: String(error && error.message ? error.message : error) };
  }
}

function parseGitStatus(buffer) {
  const text = Buffer.isBuffer(buffer) ? buffer.toString("utf8") : String(buffer || "");
  const records = text.split("\0").filter(Boolean);
  const parsed = [];
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    const status = record.slice(0, 2);
    let value = record.slice(3);
    // `git status --porcelain=v1 -z` emits rename/copy pairs as two NUL-separated paths.  Keep
    // the destination as the owned/status path and retain the source for audit context; treating
    // the second path as a fresh status record would create a bogus two-letter status.
    if (/[RC]/.test(status) && index + 1 < records.length) {
      parsed.push({ status, path: value, fromPath: records[index + 1] });
      index += 1;
      continue;
    }
    parsed.push({ status, path: value });
  }
  return parsed;
}

function gitMetadata(rootDir) {
  const head = runGit(rootDir, ["rev-parse", "--verify", "HEAD"]);
  const index = runGit(rootDir, ["ls-files", "--stage", "-z"]);
  const status = runGit(rootDir, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
  const available = head.ok || index.ok || status.ok;
  return {
    available,
    head: head.ok ? head.stdout.toString("utf8").trim() : null,
    indexIdentity: index.ok ? hashBuffer(index.stdout) : null,
    worktreeIdentity: status.ok ? hashBuffer(status.stdout) : null,
    paths: status.ok ? parseGitStatus(status.stdout) : [],
    error: available ? null : [head.error, index.error, status.error].filter(Boolean).join("; ") || "Git metadata unavailable",
  };
}

function normalizeOwnedEntry(entry) {
  const rawPath = typeof entry === "string" ? entry : entry && entry.path;
  if (typeof rawPath !== "string" || rawPath.trim() === "") fail("owned path must be a non-empty string");
  const approved = hasApprovalPrefix(rawPath) || (entry && entry.approveSnapshot === true);
  const value = stripApprovalPrefix(rawPath).replace(/\\/g, "/");
  return { path: value, snapshotApproved: approved };
}

function relativeCandidate(rootDir, suppliedPath) {
  const value = stripApprovalPrefix(String(suppliedPath || "")).replace(/\\/g, "/");
  if (!value || value === "." || value === "..") fail("owned path must identify a file");
  const lexical = path.resolve(rootDir, value);
  if (!isWithin(rootDir, lexical) || lexical === rootDir) fail(`path escapes project root: ${suppliedPath}`);

  const classified = classifySensitivePath(value);
  if (!classified.valid) fail(`invalid encoded path: ${suppliedPath}`);
  if (classified.sensitive) fail(`sensitive path is not eligible for baseline content: ${value}`);

  // Validate every existing parent component before any read.  This rejects symlinked directories
  // and junctions that would otherwise make a lexical in-root path resolve outside the project.
  const relative = path.relative(rootDir, lexical);
  let cursor = rootDir;
  for (const segment of relative.split(path.sep).slice(0, -1)) {
    cursor = path.join(cursor, segment);
    if (!fs.existsSync(cursor)) break;
    const stat = fs.lstatSync(cursor);
    if (looksLikeReparse(stat)) fail(`symlink/reparse path component is not eligible: ${value}`);
  }
  const real = canonicalExisting(lexical);
  if (!isWithin(rootDir, real)) fail(`resolved path escapes project root: ${value}`);
  if (fs.existsSync(lexical)) {
    const stat = fs.lstatSync(lexical);
    if (looksLikeReparse(stat)) fail(`symlink/reparse file is not eligible: ${value}`);
  }
  return { value: value.replace(/\\/g, "/"), lexical, real };
}

function inspectCandidate(rootDir, value) {
  const candidate = relativeCandidate(rootDir, value);
  try {
    const stat = fs.lstatSync(candidate.lexical);
    if (looksLikeReparse(stat)) return { ...candidate, ok: false, reason: "symlink/reparse point" };
    if (!stat.isFile()) return { ...candidate, ok: false, reason: "not a regular file" };
    return { ...candidate, ok: true, stat };
  } catch (error) {
    if (error && error.code === "ENOENT") return { ...candidate, ok: false, reason: "file does not exist" };
    return { ...candidate, ok: false, reason: `metadata read failed: ${error.message}` };
  }
}

function inspectCandidateSafe(rootDir, value) {
  try {
    return inspectCandidate(rootDir, value);
  } catch (error) {
    return {
      value: stripApprovalPrefix(String(value || "")).replace(/\\/g, "/"),
      ok: false,
      reason: error.message,
    };
  }
}

function safeSnapshotPath(runDir, fileName) {
  if (typeof fileName !== "string" || !/^\d{3}\.bin$/.test(path.basename(fileName)) || fileName.includes("/") || fileName.includes("\\")) fail("invalid snapshot path");
  const target = path.resolve(runDir, "snapshots", fileName);
  const snapshotsDir = path.resolve(runDir, "snapshots");
  if (!isWithin(runDir, target) || !isWithin(snapshotsDir, target)) fail("invalid snapshot path");
  return target;
}

function atomicWriteJson(filePath, value) {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const temporary = path.join(directory, `.${path.basename(filePath)}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`);
  const body = `${JSON.stringify(value, null, 2)}\n`;
  try {
    fs.writeFileSync(temporary, body, { encoding: "utf8", flag: "wx", mode: 0o600 });
    fs.renameSync(temporary, filePath);
  } catch (error) {
    try { fs.unlinkSync(temporary); } catch (_) { /* best effort */ }
    throw error;
  }
}

function manifestPath(storeDir, runId) {
  return path.join(storeDir, runId, "baseline.json");
}

function readManifest(storeDir, runId) {
  const target = manifestPath(storeDir, assertRunId(runId));
  const raw = fs.readFileSync(target, "utf8");
  const value = JSON.parse(raw);
  if (!value || value.version !== 1 || value.runId !== runId) fail("invalid workflow baseline manifest");
  return { manifest: value, path: target, runDir: path.dirname(target) };
}

function checkEligibility(manifest, now) {
  const at = numericNow(now);
  const createdAt = Number(manifest.createdAtMs);
  const expiresAt = Number(manifest.expiresAtMs);
  if (!Number.isFinite(createdAt) || !Number.isFinite(expiresAt) || expiresAt <= createdAt ||
      at < createdAt || at >= expiresAt || at - createdAt >= MAX_AGE_MS) {
    return { eligible: false, reason: "baseline expired (age >= 24h); snapshots are unreadable" };
  }
  return { eligible: true, reason: null };
}

function ownedRecordMap(manifest) {
  const paths = manifest.ownership && Array.isArray(manifest.ownership.paths) ? manifest.ownership.paths : [];
  return new Map(paths.filter((record) => record.owned === true).map((record) => [record.path, record]));
}

function currentPathSet(metadata) {
  return new Set((metadata.paths || []).map((record) => record.path));
}

function captureBaseline({
  rootDir,
  runId,
  ownedPaths = [],
  snapshotPaths = [],
  approveSnapshots = false,
  storeDir,
  now,
  privacyAvailable,
  windowsAclVerified,
  parentRunId,
} = {}) {
  const root = canonicalRoot(rootDir);
  const id = assertRunId(runId);
  const clock = numericNow(now);
  const store = ensureStoreDir(root, storeDir, { privacyAvailable, windowsAclVerified });
  cleanupExpiredRuns({ rootDir: root, storeDir: store.path, now: clock, privacyAvailable: store.privateStore, windowsAclVerified });
  const runDir = path.join(store.path, id);
  if (fs.existsSync(runDir)) fail(`workflow baseline already exists: ${id}`);
  fs.mkdirSync(runDir, { recursive: false, mode: 0o700 });
  fs.mkdirSync(path.join(runDir, "snapshots"), { recursive: false, mode: 0o700 });

  const inherited = parentRunId ? loadBaseline({ rootDir: root, runId: parentRunId, storeDir: store.path, now: clock }) : null;
  if (inherited && !inherited.eligibility.eligible) fail(inherited.eligibility.reason);
  const records = new Map();
  for (const record of inherited ? ownedRecordMap(inherited.manifest).values() : []) records.set(record.path, { ...record, inheritedFrom: parentRunId });
  for (const entry of ownedPaths) {
    const normalized = normalizeOwnedEntry(entry);
    const metadata = inspectCandidateSafe(root, normalized.path);
    records.set(normalized.path, {
      path: normalized.path,
      owned: true,
      approved: normalized.snapshotApproved,
      exists: metadata.ok,
      kind: metadata.ok ? "regular-file" : "excluded",
      reason: metadata.ok ? null : metadata.reason,
      claimedAtMs: clock,
    });
  }

  const requested = new Set();
  for (const value of snapshotPaths) {
    const metadata = inspectCandidateSafe(root, value);
    const normalized = metadata.value;
    requested.add(normalized);
    if (!records.has(normalized)) {
      records.set(normalized, {
        path: normalized,
        owned: false,
        approved: false,
        exists: false,
        kind: "excluded",
        reason: metadata.reason || "snapshot path was not explicitly claimed as owned",
        claimedAtMs: clock,
      });
    }
  }
  const snapshots = [];
  let usedBytes = 0;
  let usedFiles = 0;
  const pending = [];
  for (const requestedPath of requested) {
    const record = records.get(requestedPath);
    if (!record || record.owned !== true) continue;
    const metadata = inspectCandidateSafe(root, requestedPath);
    record.exists = metadata.ok;
    record.kind = metadata.ok ? "regular-file" : "excluded";
    record.reason = metadata.ok ? null : metadata.reason;
    if (!metadata.ok) continue;
    if (!(approveSnapshots || record.approved)) {
      record.kind = "excluded";
      record.reason = "explicit snapshot approval is required";
      continue;
    }
    if (!store.privateStore) {
      record.kind = "metadata-only";
      record.reason = "user-private temp privacy guarantee unavailable";
      continue;
    }
    if (metadata.stat.size > MAX_FILE_BYTES) {
      record.kind = "excluded";
      record.reason = `file exceeds ${MAX_FILE_BYTES} byte limit`;
      continue;
    }
    if (usedFiles >= MAX_SNAPSHOT_FILES) {
      record.kind = "excluded";
      record.reason = `run exceeds ${MAX_SNAPSHOT_FILES} file limit`;
      continue;
    }
    if (usedBytes + metadata.stat.size > MAX_RUN_BYTES) {
      record.kind = "excluded";
      record.reason = `run exceeds ${MAX_RUN_BYTES} byte budget`;
      continue;
    }
    pending.push({ requestedPath, metadata });
    usedFiles += 1;
    usedBytes += metadata.stat.size;
  }

  for (const item of pending) {
    const record = records.get(item.requestedPath);
    let buffer;
    try {
      buffer = fs.readFileSync(item.metadata.lexical);
      TEXT_DECODER.decode(buffer);
    } catch (error) {
      record.kind = "excluded";
      record.reason = error instanceof TypeError ? "invalid UTF-8 text" : `content read failed: ${error.message}`;
      continue;
    }
    const after = inspectCandidate(root, item.requestedPath);
    if (!after.ok || after.stat.size !== item.metadata.stat.size || after.stat.mtimeMs !== item.metadata.stat.mtimeMs || after.stat.ino !== item.metadata.stat.ino) {
      record.kind = "ambiguous";
      record.reason = "file changed during bounded snapshot (TOCTOU ambiguous)";
      continue;
    }
    const fileName = `${String(snapshots.length + 1).padStart(3, "0")}.bin`;
    const target = safeSnapshotPath(runDir, fileName);
    try {
      fs.writeFileSync(target, buffer, { flag: "wx", mode: 0o600 });
    } catch (error) {
      record.kind = "excluded";
      record.reason = `snapshot write failed: ${error.message}`;
      continue;
    }
    const sha256 = hashBuffer(buffer);
    snapshots.push({ path: item.requestedPath, file: `snapshots/${fileName}`, size: buffer.length, sha256, approved: true, createdAtMs: clock, eligibleUntilMs: clock + MAX_AGE_MS });
    record.snapshot = true;
  }

  const baseline = {
    version: 1,
    runId: id,
    rootDir: root,
    createdAtMs: clock,
    expiresAtMs: clock + MAX_AGE_MS,
    status: "active",
    privacy: { metadataOnly: !store.privateStore, privateStore: store.privateStore, platform: process.platform },
    git: gitMetadata(root),
    ownership: { paths: [...records.values()].sort((a, b) => a.path.localeCompare(b.path)), inheritedFrom: parentRunId || null },
    snapshots,
    checkpoints: [],
    deletionFailures: [],
  };
  try {
    atomicWriteJson(path.join(runDir, "baseline.json"), baseline);
  } catch (error) {
    try { fs.rmSync(runDir, { recursive: true, force: true }); } catch (_) { /* best effort */ }
    throw error;
  }
  return {
    runId: id,
    manifestPath: path.join(runDir, "baseline.json"),
    createdAtMs: clock,
    expiresAtMs: baseline.expiresAtMs,
    metadataOnly: baseline.privacy.metadataOnly,
    ownedCount: ownedRecordMap(baseline).size,
    snapshotCount: snapshots.length,
    baseline,
  };
}

function loadBaseline({ rootDir, runId, storeDir, now, privacyAvailable, windowsAclVerified } = {}) {
  const root = canonicalRoot(rootDir);
  const id = assertRunId(runId);
  const store = ensureStoreDir(root, storeDir, { privacyAvailable, windowsAclVerified });
  const loaded = readManifest(store.path, id);
  if (loaded.manifest.rootDir !== root) fail("workflow baseline belongs to a different project root");
  const eligibility = checkEligibility(loaded.manifest, now);
  return { ...loaded, storeDir: store.path, privacy: store.privateStore, eligibility };
}

function claimBaseline({ rootDir, runId, paths = [], storeDir, now, privacyAvailable, windowsAclVerified } = {}) {
  const loaded = loadBaseline({ rootDir, runId, storeDir, now, privacyAvailable, windowsAclVerified });
  if (!loaded.eligibility.eligible) fail(loaded.eligibility.reason);
  const clock = numericNow(now);
  const records = new Map((loaded.manifest.ownership.paths || []).map(record => [record.path, record]));
  for (const entry of paths) {
    const normalized = normalizeOwnedEntry(entry);
    const metadata = inspectCandidateSafe(loaded.manifest.rootDir, normalized.path);
    records.set(normalized.path, {
      path: normalized.path,
      owned: true,
      approved: normalized.snapshotApproved,
      exists: metadata.ok,
      kind: metadata.ok ? "regular-file" : "excluded",
      reason: metadata.ok ? null : metadata.reason,
      claimedAtMs: clock,
      claimedAfterStart: true,
    });
  }
  loaded.manifest.ownership.paths = [...records.values()].sort((a, b) => a.path.localeCompare(b.path));
  atomicWriteJson(loaded.path, loaded.manifest);
  return { runId, ownedCount: ownedRecordMap(loaded.manifest).size, manifest: loaded.manifest };
}

function checkpointBaseline({ rootDir, runId, path: suppliedPath, expectedBefore, expectedBeforeHash, storeDir, now, privacyAvailable, windowsAclVerified } = {}) {
  const loaded = loadBaseline({ rootDir, runId, storeDir, now, privacyAvailable, windowsAclVerified });
  if (!loaded.eligibility.eligible) fail(loaded.eligibility.reason);
  const clock = numericNow(now);
  const result = { path: stripApprovalPrefix(String(suppliedPath || "")).replace(/\\/g, "/"), status: "AMBIGUOUS", observedHash: null, expectedHash: expectedBeforeHash || null, toctou: "A→B→C interleaving remains AMBIGUOUS even when endpoint hashes match" };
  let pathError = null;
  try {
    result.path = relativeCandidate(loaded.manifest.rootDir, suppliedPath).value;
  } catch (error) {
    pathError = error;
  }
  const owned = pathError ? null : ownedRecordMap(loaded.manifest).get(result.path);
  if (pathError) {
    result.reason = pathError.message;
  } else if (!owned || owned.approved !== true) {
    result.reason = "checkpoint requires an explicitly approved owned path";
  } else {
    if (result.expectedHash && !/^[a-f0-9]{64}$/i.test(result.expectedHash)) result.reason = "expectedBeforeHash must be a SHA-256 hex digest";
    if (!result.reason && !result.expectedHash) result.expectedHash = hashText(expectedBefore);
    const metadata = inspectCandidateSafe(loaded.manifest.rootDir, result.path);
    if (!result.reason && !metadata.ok) result.reason = metadata.reason;
    else if (!result.reason && metadata.stat.size > MAX_FILE_BYTES) result.reason = `file exceeds ${MAX_FILE_BYTES} byte limit`;
    else if (!result.reason) {
      try {
        const buffer = fs.readFileSync(metadata.lexical);
        TEXT_DECODER.decode(buffer);
        result.observedHash = hashBuffer(buffer);
        result.status = result.observedHash === result.expectedHash ? "MATCHED" : "AMBIGUOUS";
        result.reason = result.status === "MATCHED" ? "expected-before hash matched; shared-file TOCTOU remains ambiguous" : "expected-before hash mismatch";
      } catch (error) {
        result.reason = error instanceof TypeError ? "invalid UTF-8 text" : `content read failed: ${error.message}`;
      }
    }
  }
  loaded.manifest.checkpoints.push({ ...result, atMs: clock });
  atomicWriteJson(loaded.path, loaded.manifest);
  return result;
}

function reportBaseline({ rootDir, runId, storeDir, now, privacyAvailable, windowsAclVerified } = {}) {
  const loaded = loadBaseline({ rootDir, runId, storeDir, now, privacyAvailable, windowsAclVerified });
  if (!loaded.eligibility.eligible) {
    return { runId, status: "EXPIRED", eligible: false, reason: loaded.eligibility.reason, snapshotsReadable: false };
  }
  const current = gitMetadata(loaded.manifest.rootDir);
  if (!loaded.manifest.git.available || !current.available) {
    return {
      runId,
      status: "AMBIGUOUS",
      eligible: true,
      snapshotsReadable: loaded.privacy === true,
      baselineHead: loaded.manifest.git.head,
      currentHead: current.head,
      intermediateCommit: null,
      ownedChanges: [],
      unownedChanges: [],
      ambiguous: [{ reason: "Git metadata unavailable; ownership cannot be established" }],
      toctou: "AMBIGUOUS — endpoint metadata cannot prove or exclude A→B→C interleaving on shared files",
      git: { baselineAvailable: loaded.manifest.git.available, currentAvailable: current.available },
    };
  }
  const baselineSet = currentPathSet(loaded.manifest.git);
  const currentSet = currentPathSet(current);
  const allPaths = [...new Set([...baselineSet, ...currentSet])].sort();
  const owned = ownedRecordMap(loaded.manifest);
  const changed = allPaths.filter((value) => baselineSet.has(value) !== currentSet.has(value) || loaded.manifest.git.paths.find((item) => item.path === value)?.status !== current.paths.find((item) => item.path === value)?.status);
  const ownedChanges = changed.filter((value) => owned.has(value));
  const unownedChanges = changed.filter((value) => !owned.has(value));
  return {
    runId,
    status: unownedChanges.length ? "AMBIGUOUS" : "QUALIFIED",
    eligible: true,
    snapshotsReadable: true,
    baselineHead: loaded.manifest.git.head,
    currentHead: current.head,
    intermediateCommit: loaded.manifest.git.head !== current.head,
    ownedChanges,
    unownedChanges,
    ambiguous: unownedChanges.map((value) => ({ path: value, reason: "not owned by this workflow baseline" })),
    toctou: "AMBIGUOUS — endpoint metadata cannot prove or exclude A→B→C interleaving on shared files",
  };
}

function readSnapshot({ rootDir, runId, path: requestedPath, storeDir, now, privacyAvailable, windowsAclVerified } = {}) {
  const loaded = loadBaseline({ rootDir, runId, storeDir, now, privacyAvailable, windowsAclVerified });
  if (!loaded.eligibility.eligible) fail(loaded.eligibility.reason);
  if (loaded.privacy !== true) fail("user-private temp privacy guarantee unavailable; snapshot remains metadata-only");
  const normalized = relativeCandidate(loaded.manifest.rootDir, requestedPath).value;
  if (!ownedRecordMap(loaded.manifest).has(normalized)) fail("snapshot requires an explicit ownership claim; reclaim unknown legacy ownership first");
  const snapshot = (loaded.manifest.snapshots || []).find((item) => item.path === normalized);
  if (!snapshot || snapshot.approved !== true) fail("no eligible snapshot for path");
  if (numericNow(now) >= Number(snapshot.eligibleUntilMs)) fail("snapshot expired (age >= 24h)");
  const target = safeSnapshotPath(loaded.runDir, path.basename(snapshot.file));
  const stat = fs.lstatSync(target);
  if (!stat.isFile() || looksLikeReparse(stat) || stat.size > MAX_FILE_BYTES) fail("snapshot file is not eligible");
  const buffer = fs.readFileSync(target);
  if (buffer.length !== snapshot.size || hashBuffer(buffer) !== snapshot.sha256) fail("snapshot integrity mismatch");
  TEXT_DECODER.decode(buffer);
  return { path: normalized, sha256: snapshot.sha256, size: buffer.length, text: buffer.toString("utf8") };
}

function deleteExact(target, failures, label) {
  try {
    if (fs.existsSync(target)) fs.unlinkSync(target);
  } catch (error) {
    failures.push({ path: target, label, error: error.message });
  }
}

function cleanupRunDirectory(runDir, manifest, failures) {
  for (const snapshot of manifest.snapshots || []) {
    if (typeof snapshot.file !== "string") continue;
    try {
      const target = safeSnapshotPath(runDir, path.basename(snapshot.file));
      deleteExact(target, failures, "snapshot");
    } catch (error) {
      failures.push({ path: snapshot.file, label: "snapshot", error: error.message });
    }
  }
  deleteExact(path.join(runDir, "baseline.json"), failures, "manifest");
  try {
    if (fs.existsSync(path.join(runDir, "snapshots"))) fs.rmdirSync(path.join(runDir, "snapshots"));
    if (fs.existsSync(runDir)) fs.rmdirSync(runDir);
  } catch (error) {
    failures.push({ path: runDir, label: "run-directory", error: error.message });
  }
}

function closeBaseline({ rootDir, runId, storeDir, now, privacyAvailable, windowsAclVerified } = {}) {
  const loaded = loadBaseline({ rootDir, runId, storeDir, now, privacyAvailable, windowsAclVerified });
  const failures = [];
  cleanupRunDirectory(loaded.runDir, loaded.manifest, failures);
  return { runId, closed: failures.length === 0, deletionFailures: failures };
}

function cleanupExpiredRuns({ rootDir, storeDir, now, privacyAvailable, windowsAclVerified } = {}) {
  const root = canonicalRoot(rootDir);
  const store = ensureStoreDir(root, storeDir, { privacyAvailable, windowsAclVerified });
  const clock = numericNow(now);
  const deletedRuns = [];
  const deletionFailures = [];
  for (const name of fs.readdirSync(store.path)) {
    if (!RUN_ID.test(name)) continue;
    const runDir = path.join(store.path, name);
    let manifest;
    try {
      if (!fs.lstatSync(runDir).isDirectory()) continue;
      manifest = JSON.parse(fs.readFileSync(path.join(runDir, "baseline.json"), "utf8"));
    } catch {
      continue;
    }
    if (manifest.rootDir !== root) continue;
    if (checkEligibility(manifest, clock).eligible) continue;
    const failures = [];
    cleanupRunDirectory(runDir, manifest, failures);
    deletedRuns.push(name);
    deletionFailures.push(...failures);
  }
  return { deletedRuns, deletionFailures, storeDir: store.path };
}

function main() {
  const action = process.argv[2];
  const allowed = new Set(["capture", "load", "claim", "checkpoint", "report", "read-snapshot", "close", "cleanup-expired"]);
  if (!allowed.has(action)) fail(`Usage: node workflow-baseline.cjs ${[...allowed].join("|")}`);
  const input = fs.readFileSync(0, "utf8").trim();
  const payload = input ? JSON.parse(input) : {};
  if (own(payload, "now")) fail("CLI uses the host clock; now is API-test-only");
  const functions = {
    capture: captureBaseline,
    load: loadBaseline,
    claim: claimBaseline,
    checkpoint: checkpointBaseline,
    report: reportBaseline,
    "read-snapshot": readSnapshot,
    close: closeBaseline,
    "cleanup-expired": cleanupExpiredRuns,
  };
  process.stdout.write(`${JSON.stringify(functions[action](payload), null, 2)}\n`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  MAX_FILE_BYTES,
  MAX_RUN_BYTES,
  MAX_SNAPSHOT_FILES,
  MAX_AGE_MS,
  captureBaseline,
  loadBaseline,
  claimBaseline,
  checkpointBaseline,
  reportBaseline,
  readSnapshot,
  closeBaseline,
  cleanupExpiredRuns,
  relativeCandidate,
  gitMetadata,
};
