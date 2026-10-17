import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../../../");
const modulePath = path.join(repoRoot, ".claude", "scripts", "lib", "workflow-baseline.cjs");
const baseline = require(modulePath);

const BASE = 1_000_000;

function git(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], windowsHide: true }).trim();
}

function fixture(t, { privacyAvailable = true } = {}) {
  // A supplied store is refused when ANY component is a link (fail-closed by design), and macOS's
  // os.tmpdir() sits behind `/var -> /private/var`. Canonicalize the fixture root so these tests
  // supply a link-free store on every host rather than testing the host's temp layout.
  const parent = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "workflow-baseline-test-")));
  const root = path.join(parent, "repo");
  const storeDir = path.join(parent, "store");
  fs.mkdirSync(root, { recursive: true });
  git(root, ["init", "--quiet"]);
  git(root, ["config", "user.email", "baseline-test@example.invalid"]);
  git(root, ["config", "user.name", "Baseline Test"]);
  fs.writeFileSync(path.join(root, "README.md"), "initial\n", "utf8");
  git(root, ["add", "README.md"]);
  git(root, ["commit", "--quiet", "-m", "baseline"]);
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  return { root, storeDir, options: { rootDir: root, storeDir, privacyAvailable, now: BASE } };
}

test("baseline captures Git identity/status metadata without reading unowned content", (t) => {
  const fx = fixture(t);
  const result = baseline.captureBaseline({ ...fx.options, runId: "clean" });
  assert.equal(result.snapshotCount, 0);
  assert.equal(result.metadataOnly, false);
  assert.match(result.baseline.git.head, /^[0-9a-f]{40}$/);
  assert.match(result.baseline.git.indexIdentity, /^[0-9a-f]{64}$/);
  const report = baseline.reportBaseline({ ...fx.options, runId: "clean", now: BASE + 1 });
  assert.equal(report.status, "QUALIFIED");
  assert.deepEqual(report.ownedChanges, []);
  assert.deepEqual(report.unownedChanges, []);
});

test("snapshot approval does not claim ownership, including inherited exclusions", (t) => {
  const fx = fixture(t);
  fs.writeFileSync(path.join(fx.root, "unowned.txt"), "UNOWNED_CONTENT_SENTINEL\n");
  for (const approveSnapshots of [true, false]) {
    const runId = `unowned-${approveSnapshots}`;
    const result = baseline.captureBaseline({ ...fx.options, runId,
      snapshotPaths: ["unowned.txt"], approveSnapshots });
    assert.equal(result.snapshotCount, 0);
    assert.equal(result.ownedCount, 0);
    assert.match(result.baseline.ownership.paths[0].reason, /not explicitly claimed as owned/);
    assert.ok(!fs.readFileSync(result.manifestPath, "utf8").includes("UNOWNED_CONTENT_SENTINEL"));
    assert.deepEqual(fs.readdirSync(path.join(path.dirname(result.manifestPath), "snapshots")), []);
    const child = baseline.captureBaseline({ ...fx.options, runId: `${runId}-child`, parentRunId: runId,
      snapshotPaths: ["unowned.txt"], approveSnapshots: true });
    assert.equal(child.snapshotCount, 0);
    assert.equal(child.ownedCount, 0);
    const report = baseline.reportBaseline({ ...fx.options, runId, now: BASE + 1 });
    assert.ok(!report.ownedChanges.includes("unowned.txt"));
  }
  const owned = baseline.captureBaseline({ ...fx.options, runId: "owned-global",
    ownedPaths: ["unowned.txt"], snapshotPaths: ["unowned.txt"], approveSnapshots: true });
  assert.equal(owned.snapshotCount, 1);
  assert.equal(owned.ownedCount, 1);
  assert.equal(baseline.readSnapshot({ ...fx.options, runId: "owned-global", path: "unowned.txt" }).text, "UNOWNED_CONTENT_SENTINEL\n");
});

function loadBaselineSource(source, contentReads) {
  const facade = Object.create(fs);
  facade.readFileSync = (file, ...args) => {
    if (contentReads.targets.has(String(file))) contentReads.count += 1;
    return fs.readFileSync(file, ...args);
  };
  const loaded = { exports: {} };
  const localRequire = createRequire(modulePath);
  require("node:vm").runInNewContext(source, {
    require: name => name === "node:fs" ? facade : localRequire(name),
    module: loaded, process, Buffer
  }, { filename: modulePath });
  return loaded.exports;
}

function assertLegacyOwnership(t, source) {
  for (const kind of ["regular-file", "excluded"]) {
    const fx = fixture(t);
    const captured = baseline.captureBaseline({ ...fx.options, runId: "legacy",
      ownedPaths: ["APPROVED:README.md"], snapshotPaths: ["README.md"] });
    // Exact markerless legacy row shape: neither previous valid claims nor
    // excluded candidates proved ownership with an affirmative field.
    const legacy = captured.baseline;
    legacy.ownership.paths = [{ path: "README.md", approved: kind === "regular-file",
      exists: true, kind, reason: kind === "excluded" ? "explicit snapshot approval is required" : null,
      claimedAtMs: BASE }];
    const unrelated = { path: "unclaimed.txt", approved: false, exists: false, kind: "excluded",
      reason: "legacy diagnostic metadata", claimedAtMs: BASE };
    legacy.ownership.paths.push(unrelated);
    if (kind === "excluded") legacy.snapshots = [];
    const text = JSON.stringify(legacy);
    fs.writeFileSync(captured.manifestPath, text);
    const contentReads = { count: 0, targets: new Set([
      path.join(fx.root, "README.md"), path.join(path.dirname(captured.manifestPath), "snapshots", "001.bin")
    ]) };
    const current = loadBaselineSource(source, contentReads);
    assert.equal(current.loadBaseline({ ...fx.options, runId: "legacy" }).manifest.ownership.paths[0].owned, undefined);
    assert.throws(() => current.readSnapshot({ ...fx.options, runId: "legacy", path: "README.md" }), /explicit ownership claim/);
    const child = current.captureBaseline({ ...fx.options, runId: "child", parentRunId: "legacy",
      snapshotPaths: ["README.md"], approveSnapshots: true });
    assert.equal(child.snapshotCount, 0, kind);
    assert.equal(child.ownedCount, 0, kind);
    assert.equal(contentReads.count, 0, "legacy content must not be opened");
    assert.equal(fs.readFileSync(captured.manifestPath, "utf8"), text, "reading/inheriting must preserve metadata");
    fs.writeFileSync(path.join(fx.root, "README.md"), "changed\n");
    const before = current.reportBaseline({ ...fx.options, runId: "legacy" });
    assert.equal(before.ownedChanges.length, 0);
    assert.ok(before.unownedChanges.includes("README.md"));
    const denied = current.checkpointBaseline({ ...fx.options, runId: "legacy", path: "README.md", expectedBefore: "changed\n" });
    assert.match(denied.reason, /explicitly approved owned path/);
    assert.equal(contentReads.count, 0);
    const claimed = current.claimBaseline({ ...fx.options, runId: "legacy", paths: ["APPROVED:README.md"] });
    assert.equal(claimed.ownedCount, 1);
    assert.equal(claimed.manifest.ownership.paths[0].owned, true);
    assert.equal(JSON.stringify(claimed.manifest.ownership.paths.find(row => row.path === "unclaimed.txt")), JSON.stringify(unrelated));
    if (kind === "regular-file") {
      assert.equal(current.readSnapshot({ ...fx.options, runId: "legacy", path: "README.md" }).text, "initial\n");
    } else {
      assert.throws(() => current.readSnapshot({ ...fx.options, runId: "legacy", path: "README.md" }), /no eligible snapshot/);
    }
    assert.ok(current.reportBaseline({ ...fx.options, runId: "legacy" }).ownedChanges.includes("README.md"));
    const reclaimed = current.captureBaseline({ ...fx.options, runId: "reclaimed", parentRunId: "legacy",
      snapshotPaths: ["README.md"], approveSnapshots: true });
    assert.equal(reclaimed.snapshotCount, 1);
    assert.equal(reclaimed.ownedCount, 1);
    assert.equal(current.readSnapshot({ ...fx.options, runId: "reclaimed", path: "README.md" }).text, "changed\n");
  }
}

test("legacy unknown ownership requires explicit reclaim before content and attribution", t => {
  assertLegacyOwnership(t, fs.readFileSync(modulePath, "utf8"));
});

test("legacy ownership permissive-map mutant is killed by the same semantic oracle", t => {
  const source = fs.readFileSync(modulePath, "utf8");
  const anchor = "record.owned === true";
  assert.equal(source.split(anchor).length, 2, "single canonical ownership predicate");
  const mutant = source.replace(anchor, "record.owned !== false");
  assert.throws(() => assertLegacyOwnership(t, mutant), error => error.code === "ERR_ASSERTION");
});

test("owned and unowned changes are separated, including an intermediate commit", (t) => {
  const fx = fixture(t);
  baseline.captureBaseline({ ...fx.options, runId: "ownership" });
  fs.writeFileSync(path.join(fx.root, "README.md"), "owned edit\n", "utf8");
  fs.writeFileSync(path.join(fx.root, "unowned.txt"), "external\n", "utf8");
  baseline.claimBaseline({ ...fx.options, runId: "ownership", paths: ["README.md"] , now: BASE + 1 });
  const report = baseline.reportBaseline({ ...fx.options, runId: "ownership", now: BASE + 2 });
  assert.equal(report.status, "AMBIGUOUS");
  assert.deepEqual(report.ownedChanges, ["README.md"]);
  assert.deepEqual(report.unownedChanges, ["unowned.txt"]);

  git(fx.root, ["add", "README.md"]);
  git(fx.root, ["commit", "--quiet", "-m", "owned-change"]);
  const committed = baseline.reportBaseline({ ...fx.options, runId: "ownership", now: BASE + 3 });
  assert.equal(committed.intermediateCommit, true);
  assert.equal(committed.status, "AMBIGUOUS");

  // Porcelain -z rename records are a pair; the destination is the one path that closure
  // attribution must expose, not a bogus second status record.
  fs.renameSync(path.join(fx.root, "README.md"), path.join(fx.root, "RENAMED.md"));
  git(fx.root, ["add", "-A"]);
  baseline.claimBaseline({ ...fx.options, runId: "ownership", paths: ["RENAMED.md"], now: BASE + 4 });
  const renamed = baseline.reportBaseline({ ...fx.options, runId: "ownership", now: BASE + 4 });
  assert.ok(renamed.ownedChanges.includes("RENAMED.md"), "rename destination must be reported");
  assert.ok(!renamed.ownedChanges.includes(""), "rename pair must not create an empty path");
});

test("approved bounded UTF-8 snapshots are readable and never copy text into metadata", (t) => {
  const fx = fixture(t);
  const sentinel = "APPROVED_SENTINEL_ONLY_IN_SNAPSHOT";
  fs.writeFileSync(path.join(fx.root, "owned.txt"), `${sentinel}\n`, "utf8");
  const result = baseline.captureBaseline({ ...fx.options, runId: "snapshot", ownedPaths: ["APPROVED:owned.txt"], snapshotPaths: ["owned.txt"] });
  assert.equal(result.snapshotCount, 1);
  const loaded = baseline.loadBaseline({ ...fx.options, runId: "snapshot", now: BASE + 1 });
  const manifestText = fs.readFileSync(loaded.path, "utf8");
  assert.ok(!manifestText.includes(sentinel), "snapshot content must not be written to metadata");
  const read = baseline.readSnapshot({ ...fx.options, runId: "snapshot", path: "owned.txt", now: BASE + 1 });
  assert.equal(read.text, `${sentinel}\n`);
  assert.match(read.sha256, /^[0-9a-f]{64}$/);

  assert.throws(
    () => baseline.readSnapshot({ ...fx.options, runId: "snapshot", path: "owned.txt", privacyAvailable: false, now: BASE + 1 }),
    /privacy guarantee unavailable/
  );
});

test("unapproved, sensitive, escaped and privacy-unavailable candidates stay metadata-only", (t) => {
  const fx = fixture(t, { privacyAvailable: false });
  const sentinel = "SECRET_SENTINEL_SHOULD_NOT_BE_READ";
  fs.writeFileSync(path.join(fx.root, "plain.txt"), "plain\n", "utf8");
  fs.writeFileSync(path.join(fx.root, "unapproved.txt"), "unapproved\n", "utf8");
  fs.writeFileSync(path.join(fx.root, ".env"), `${sentinel}=1\n`, "utf8");
  const result = baseline.captureBaseline({
    ...fx.options,
    runId: "rejects",
    ownedPaths: ["APPROVED:plain.txt", "unapproved.txt", "APPROVED:.env", "APPROVED:../outside.txt"],
    snapshotPaths: ["plain.txt", ".env", "../outside.txt"],
  });
  assert.equal(result.snapshotCount, 0);
  assert.equal(result.metadataOnly, true);
  const text = fs.readFileSync(result.manifestPath, "utf8");
  assert.ok(!text.includes(sentinel));
  assert.ok(text.includes("privacy guarantee unavailable"));
  assert.ok(text.includes("sensitive path"));
  assert.ok(text.includes("escapes project root"));
});

test("symlink, binary, invalid UTF-8 and oversize files are rejected before snapshot persistence", (t) => {
  const fx = fixture(t);
  fs.writeFileSync(path.join(fx.root, "binary.bin"), Buffer.from([0, 255, 1]));
  fs.writeFileSync(path.join(fx.root, "large.txt"), Buffer.alloc(baseline.MAX_FILE_BYTES + 1, 65));
  fs.writeFileSync(path.join(fx.root, "target.txt"), "target\n", "utf8");
  let symlinkCreated = true;
  try { fs.symlinkSync("target.txt", path.join(fx.root, "link.txt")); } catch { symlinkCreated = false; }
  const owned = ["APPROVED:binary.bin", "APPROVED:large.txt"];
  const snapshots = ["binary.bin", "large.txt"];
  if (symlinkCreated) { owned.push("APPROVED:link.txt"); snapshots.push("link.txt"); }
  const result = baseline.captureBaseline({ ...fx.options, runId: "invalid", ownedPaths: owned, snapshotPaths: snapshots });
  assert.equal(result.snapshotCount, 0);
  const manifest = JSON.stringify(result.baseline);
  assert.match(manifest, /invalid UTF-8|exceeds 262144|symlink\/reparse/);
});

test("bounded path property generator never accepts an escaping or sensitive candidate", (t) => {
  const fx = fixture(t);
  // Deterministic xorshift corpus over the finite path grammar used by the policy boundary.  This
  // is a bounded property check, not a universality claim: every accepted candidate must stay
  // under the canonical root and every generated sensitive/escape form must be rejected before
  // content access.
  const segments = ["src", "docs", "safe.txt", ".env", "credentials.json", "..", ".", "nested", "id_rsa", "a%2Fb", "unicode-世界.txt"];
  let seed = 0x9e3779b9;
  const next = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return seed >>> 0;
  };
  for (let i = 0; i < 256; i += 1) {
    const count = 1 + (next() % 4);
    const parts = [];
    for (let j = 0; j < count; j += 1) parts.push(segments[next() % segments.length]);
    const candidate = parts.join("/");
    try {
      const accepted = baseline.relativeCandidate(fx.root, candidate);
      const rel = path.relative(fx.root, accepted.real);
      assert.ok(rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel)), `accepted path escaped root: ${candidate}`);
      assert.ok(!/(?:^|\/)(?:\.env(?:\.|$)|credentials|id_rsa)(?:\/|$)/i.test(accepted.value), `accepted sensitive path: ${candidate}`);
    } catch (error) {
      assert.match(String(error.message), /escapes project root|sensitive path|invalid encoded path|identify a file|resolved path escapes/);
    }
  }
});

test("checkpoint compares only approved owned text and records endpoint/TOCTOU evidence", (t) => {
  const fx = fixture(t);
  const original = "before\n";
  fs.writeFileSync(path.join(fx.root, "checkpoint.txt"), original, "utf8");
  baseline.captureBaseline({ ...fx.options, runId: "checkpoint", ownedPaths: [{ path: "checkpoint.txt", approveSnapshot: true }] });
  const matched = baseline.checkpointBaseline({ ...fx.options, runId: "checkpoint", path: "checkpoint.txt", expectedBefore: original, now: BASE + 1 });
  assert.equal(matched.status, "MATCHED");
  assert.match(matched.toctou, /AMBIGUOUS/);
  fs.writeFileSync(path.join(fx.root, "checkpoint.txt"), "after\n", "utf8");
  const mismatch = baseline.checkpointBaseline({ ...fx.options, runId: "checkpoint", path: "checkpoint.txt", expectedBefore: original, now: BASE + 2 });
  assert.equal(mismatch.status, "AMBIGUOUS");
  assert.match(mismatch.reason, /mismatch/);
});

test("expiry is a hard read boundary at exactly 24 hours and cleanup removes only exact snapshots", (t) => {
  const fx = fixture(t);
  fs.writeFileSync(path.join(fx.root, "owned.txt"), "expire me\n", "utf8");
  baseline.captureBaseline({ ...fx.options, runId: "expiry", ownedPaths: ["APPROVED:owned.txt"], snapshotPaths: ["owned.txt"] });
  const expired = baseline.loadBaseline({ ...fx.options, runId: "expiry", now: BASE + baseline.MAX_AGE_MS });
  assert.equal(expired.eligibility.eligible, false);
  assert.throws(() => baseline.readSnapshot({ ...fx.options, runId: "expiry", path: "owned.txt", now: BASE + baseline.MAX_AGE_MS }), /expired/);
  const cleaned = baseline.cleanupExpiredRuns({ ...fx.options, now: BASE + baseline.MAX_AGE_MS });
  assert.deepEqual(cleaned.deletedRuns, ["expiry"]);
  assert.equal(fs.existsSync(path.join(fx.storeDir, "expiry")), false);
});

test("Git-unavailable closure is ambiguous instead of falsely qualified", (t) => {
  const fx = fixture(t);
  baseline.captureBaseline({ ...fx.options, runId: "git-unavailable" });
  const gitDir = path.join(fx.root, ".git");
  const hidden = path.join(fx.root, ".git-hidden");
  fs.renameSync(gitDir, hidden);
  // Stop Git discovery at this fixture even when its temp root lives beneath another repository.
  // An invalid local gitdir indirection makes metadata unavailable without falling through to an
  // ancestor checkout (the Windows symlinked-temp contract intentionally uses the repo's tmp/).
  fs.writeFileSync(gitDir, "gitdir: .git-unavailable\n", "utf8");
  let report;
  try {
    report = baseline.reportBaseline({ ...fx.options, runId: "git-unavailable", now: BASE + 1 });
  } finally {
    fs.rmSync(gitDir, { force: true });
    fs.renameSync(hidden, gitDir);
  }
  assert.equal(report.status, "AMBIGUOUS");
  assert.match(report.ambiguous[0].reason, /Git metadata unavailable/);
});

test("nested baselines inherit owned scope and close is best-effort/idempotent", (t) => {
  const fx = fixture(t);
  fs.writeFileSync(path.join(fx.root, "owned.txt"), "owned\n", "utf8");
  baseline.captureBaseline({ ...fx.options, runId: "parent", ownedPaths: ["owned.txt"] });
  const child = baseline.captureBaseline({ ...fx.options, runId: "child", parentRunId: "parent", now: BASE + 1 });
  assert.equal(child.baseline.ownership.inheritedFrom, "parent");
  assert.ok(child.baseline.ownership.paths.some((entry) => entry.path === "owned.txt"));
  assert.equal(baseline.closeBaseline({ ...fx.options, runId: "child", now: BASE + 2 }).closed, true);
  assert.throws(() => baseline.closeBaseline({ ...fx.options, runId: "child", now: BASE + 3 }), /ENOENT|no such file|baseline/i);
});

// Intent: the DEFAULT store — the only one workflow-end uses — works when the host temp root itself
// sits behind a link (macOS: os.tmpdir() is /var/folders/… with /var -> /private/var), while a link
// at or below that root, or anywhere in a supplied store path, is still refused.
test("default store accepts a linked OS temp root but still refuses links beneath it", (t) => {
  const fx = fixture(t, { privacyAvailable: false });
  const parent = path.dirname(fx.root);
  const linkType = process.platform === "win32" ? "junction" : "dir";
  const realTemp = path.join(parent, "os-temp-real");
  const linkTemp = path.join(parent, "os-temp-link");
  fs.mkdirSync(realTemp);
  try {
    fs.symlinkSync(realTemp, linkTemp, linkType);
  } catch (error) {
    if (["EACCES", "EPERM", "ENOSYS", "ENOTSUP", "EOPNOTSUPP"].includes(error && error.code)) {
      t.skip(`directory symlink/junction creation is unavailable on ${process.platform}: ${error.code}`);
      return;
    }
    throw error;
  }
  // os.tmpdir() reads TMPDIR on POSIX and TEMP/TMP on Windows; a child process keeps the override
  // away from every other test in this file.
  const captureWithDefaultStore = (runId) => spawnSync(process.execPath, ["-e", `
    const baseline = require(${JSON.stringify(modulePath)});
    try {
      const result = baseline.captureBaseline({ rootDir: ${JSON.stringify(fx.root)}, runId: ${JSON.stringify(runId)}, privacyAvailable: false, now: ${BASE} });
      console.log(JSON.stringify({ manifestPath: result.manifestPath }));
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  `], { env: { ...process.env, TMPDIR: linkTemp, TEMP: linkTemp, TMP: linkTemp }, encoding: "utf8", timeout: 60000, windowsHide: true });

  const accepted = captureWithDefaultStore("linked-temp-root");
  assert.equal(accepted.status, 0, accepted.stderr);
  const { manifestPath } = JSON.parse(accepted.stdout);
  assert.ok(fs.existsSync(manifestPath), manifestPath);
  assert.ok(manifestPath.startsWith(realTemp + path.sep), `store must live under the canonical temp root: ${manifestPath}`);

  const defaultStore = path.join(realTemp, "easy-claude-workflow-baselines");
  fs.rmSync(defaultStore, { recursive: true, force: true });
  const redirectTarget = path.join(parent, "redirect-target");
  fs.mkdirSync(redirectTarget);
  fs.symlinkSync(redirectTarget, defaultStore, linkType);
  const redirected = captureWithDefaultStore("linked-store-leaf");
  assert.equal(redirected.status, 1, redirected.stdout);
  assert.match(redirected.stderr, /symlink\/reparse/);
  assert.deepEqual(fs.readdirSync(redirectTarget), [], "a refused store must receive no write");

  // Only the host temp root is trusted: a supplied store is never canonicalized, whether the link
  // sits above it or IS the store.
  assert.throws(() => baseline.captureBaseline({ ...fx.options, runId: "supplied-linked",
    storeDir: path.join(linkTemp, "supplied-store") }), /symlink\/reparse/);
  const suppliedTarget = path.join(parent, "supplied-target");
  const suppliedLink = path.join(parent, "supplied-link");
  fs.mkdirSync(suppliedTarget);
  fs.symlinkSync(suppliedTarget, suppliedLink, linkType);
  assert.throws(() => baseline.captureBaseline({ ...fx.options, runId: "supplied-link-store",
    storeDir: suppliedLink }), /symlink\/reparse/);
  assert.deepEqual(fs.readdirSync(suppliedTarget), [], "a refused supplied store must receive no write");
});

test("seeded expiry mutant is killed by the exact-boundary counter-case", (t) => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "workflow-baseline-mutant-"));
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  const mutantModule = path.join(parent, ".claude", "scripts", "lib", "workflow-baseline.cjs");
  // The module's hook-lib dependency closure: every file it requires must be copied, or the
  // control run fails to load and proves nothing.
  const hookLibDeps = ["sensitive-path-policy.cjs", "ck-path-utils.cjs"];
  const copiedDeps = hookLibDeps.map(name => path.join(parent, ".claude", "hooks", "lib", name));
  const copiedTest = path.join(parent, ".claude", "scripts", "codex", "tests", "workflow-baseline.test.mjs");
  for (const file of [mutantModule, ...copiedDeps, copiedTest]) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }
  const source = fs.readFileSync(modulePath, "utf8");
  const before = "at < createdAt || at >= expiresAt || at - createdAt >= MAX_AGE_MS";
  assert.equal(source.split(before).length, 2, "expiry mutation target must exist exactly once");
  hookLibDeps.forEach((name, index) => fs.copyFileSync(path.join(repoRoot, ".claude", "hooks", "lib", name), copiedDeps[index]));
  fs.copyFileSync(fileURLToPath(import.meta.url), copiedTest);
  const env = { ...process.env, TMPDIR: parent, TEMP: parent, TMP: parent };
  delete env.NODE_TEST_CONTEXT;
  const runCounterCase = () => spawnSync(process.execPath,
    ["--test", "--test-name-pattern=^expiry is a hard read boundary", copiedTest],
    { cwd: parent, encoding: "utf8", env, timeout: 60000, windowsHide: true });

  // The same existing regression must load and pass before mutation. A loader
  // failure is infrastructure failure, never evidence of a killed mutant.
  fs.writeFileSync(mutantModule, source, "utf8");
  const control = runCounterCase();
  assert.equal(control.error, undefined);
  assert.equal(control.status, 0, `${control.stdout}\n${control.stderr}`);
  // Node 22 renders TAP totals as `# pass`; Node 24 uses `ℹ pass`.
  // The process outcome is the invariant, not a reporter-specific glyph.
  assert.match(control.stdout, /(?:#|ℹ) pass 1\b/);
  assert.match(control.stdout, /(?:#|ℹ) fail 0\b/);

  fs.writeFileSync(mutantModule, source.replace(before,
    "at < createdAt || at > expiresAt || at - createdAt > MAX_AGE_MS"), "utf8");
  const child = runCounterCase();
  assert.equal(child.error, undefined);
  assert.equal(child.status, 1, `${child.stdout}\n${child.stderr}`);
  assert.match(child.stdout, /ERR_ASSERTION/);
  assert.match(child.stdout, /true !== false/);
  assert.match(child.stdout, /(?:#|ℹ) fail 1\b/);
  assert.doesNotMatch(`${child.stdout}\n${child.stderr}`, /MODULE_NOT_FOUND/);
  t.diagnostic("expiry mutant KILLED by unchanged exact-boundary assertion; unmodified control passes");
});
