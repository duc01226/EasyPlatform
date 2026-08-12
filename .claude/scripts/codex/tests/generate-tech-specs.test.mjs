import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
// here = <repo>/.claude/scripts/codex/tests → four levels up is the repo root.
const repoRoot = path.resolve(here, "..", "..", "..", "..");
const SCRIPT = path.join(repoRoot, ".claude", "skills", "tech-spec", "scripts", "generate-tech-specs.mjs");

// Must match DERIVED_BANNER in generate-tech-specs.mjs — a mismatch would make every
// fixture look "non-derived" and the happy-path test would fail loudly rather than
// silently pass, which is the intent.
const DERIVED_BANNER = "> DERIVED — regenerate with the tech-spec skill; do NOT hand-edit.";

const ANNOTATION_PATTERN = '\\[Trait\\("((?:TestSpec)|(?:TechnicalSpec))"\\s*,\\s*"([^"]+)"\\)\\]';

const ANNOTATED_SOURCE = `
public class OrderTests
{
    [Trait("TechnicalSpec", "TS-ORDER-001")]
    public async Task Should_Persist_Order()
    {
    }
}
`;

async function makeProject({ technicalPath = "out", sourceRoot = "src", withSource = true } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "tech-spec-gen-"));
  await fs.mkdir(path.join(root, "docs"), { recursive: true });
  await fs.writeFile(
    path.join(root, "docs", "project-config.json"),
    JSON.stringify({
      specRoots: { technical: { path: technicalPath } },
      techSpecScan: { sourceRoot, fileExtensions: [".cs"], annotationPattern: ANNOTATION_PATTERN },
    }),
    "utf8"
  );
  if (withSource) {
    await fs.mkdir(path.join(root, sourceRoot, "Services", "Orders"), { recursive: true });
    await fs.writeFile(path.join(root, sourceRoot, "Services", "Orders", "OrderTests.cs"), ANNOTATED_SOURCE, "utf8");
  } else {
    await fs.mkdir(path.join(root, sourceRoot), { recursive: true });
  }
  return root;
}

function runGenerator(cwd) {
  return spawnSync(process.execPath, [SCRIPT], { cwd, encoding: "utf8" });
}

async function listFiles(dir) {
  const out = [];
  async function walk(p) {
    let items;
    try {
      items = await fs.readdir(p, { withFileTypes: true });
    } catch {
      return;
    }
    for (const item of items) {
      const full = path.join(p, item.name);
      if (item.isDirectory()) await walk(full);
      else out.push(path.relative(dir, full).split(path.sep).join("/"));
    }
  }
  await walk(dir);
  return out.sort();
}

// THE regression test for the data-loss defect. The original removeGeneratedMarkdown
// validated and deleted in ONE loop, so a hand-edited file aborted the run only AFTER
// the files before it were already removed — and writeTechnicalViews never ran.
//
// Ordering matters: collectFiles does NOT sort, so traversal order is filesystem
// dependent. Names are chosen so the hand-edited file sorts LAST, and the assertion is
// on the invariant (every file survives), not on which file threw. Asserting only
// "it throws" would pass against the buggy code and fail open.
test("generate-tech-specs deletes NOTHING when any file in the technical root is non-derived (TC-TSPEC-001)", async () => {
  const root = await makeProject();
  const outDir = path.join(root, "out");
  await fs.mkdir(outDir, { recursive: true });

  await fs.writeFile(path.join(outDir, "a-derived.md"), `${DERIVED_BANNER}\n\n# A\n`, "utf8");
  await fs.writeFile(path.join(outDir, "b-derived.md"), `${DERIVED_BANNER}\n\n# B\n`, "utf8");
  await fs.writeFile(path.join(outDir, "c-derived.md"), `${DERIVED_BANNER}\n\n# C\n`, "utf8");
  await fs.writeFile(path.join(outDir, "zz-hand-authored.md"), "# Hand written, not derived\n", "utf8");

  const before = await listFiles(outDir);
  assert.equal(before.length, 4, "precondition: 4 files staged");

  const result = runGenerator(root);

  assert.notEqual(result.status, 0, "generator must refuse to run");
  assert.match(result.stderr, /Refusing to delete anything/);
  assert.match(result.stderr, /zz-hand-authored\.md/, "error must name the offending file");

  const after = await listFiles(outDir);
  assert.deepEqual(after, before, "NO file may be deleted when any file is non-derived");
});

test("generate-tech-specs regenerates cleanly when every file is derived (TC-TSPEC-002)", async () => {
  const root = await makeProject();
  const outDir = path.join(root, "out");
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, "stale.md"), `${DERIVED_BANNER}\n\n# Stale\n`, "utf8");

  const result = runGenerator(root);

  assert.equal(result.status, 0, `expected success, got stderr: ${result.stderr}`);
  const after = await listFiles(outDir);
  assert.ok(!after.includes("stale.md"), "stale derived output must be removed");
  assert.ok(after.length > 0, "new views must be written");

  // Output must itself carry the banner, or the NEXT run would refuse to clean it up.
  const written = await fs.readFile(path.join(outDir, after[0]), "utf8");
  assert.ok(written.startsWith(DERIVED_BANNER), "generated output must be re-deletable by the next run");
});

test("generate-tech-specs refuses a technical root outside the repository (TC-TSPEC-003)", async () => {
  // The escape target is derived from this run's unique mkdtemp name. A fixed name like
  // "../escape-hatch" resolves into the SHARED os.tmpdir(), so one leftover directory from
  // any other run (or another tool) makes this assertion fail for a reason unrelated to
  // the guard under test. Uniqueness keeps the failure signal honest.
  const root = await makeProject();
  const escapeName = `escape-${path.basename(root)}`;
  await fs.writeFile(
    path.join(root, "docs", "project-config.json"),
    JSON.stringify({
      specRoots: { technical: { path: `../${escapeName}` } },
      techSpecScan: { sourceRoot: "src", fileExtensions: [".cs"], annotationPattern: ANNOTATION_PATTERN },
    }),
    "utf8"
  );

  const escaped = path.resolve(root, "..", escapeName);
  await assert.rejects(fs.access(escaped), "precondition: escape target must not pre-exist");

  const result = runGenerator(root);

  assert.notEqual(result.status, 0, "traversal path must be rejected");
  assert.match(result.stderr, /Refusing to write outside repository/);
  await assert.rejects(fs.access(escaped), "nothing may be created outside the project root");
});

// A scan matching nothing is a misconfiguration, not an empty success. Reporting
// status:"ok" with annotations:0 is indistinguishable from a correct empty run.
test("generate-tech-specs fails loudly when the scan matches no annotations (TC-TSPEC-004)", async () => {
  const root = await makeProject({ withSource: false });

  const result = runGenerator(root);

  assert.notEqual(result.status, 0, "a zero-annotation scan must NOT exit 0");
  assert.match(result.stderr, /no-annotations-found/);
  assert.doesNotMatch(result.stderr, /"status":\s*"ok"/);
});

// Regression for the second door into the data-loss failure mode: making the scan
// config-driven meant capture group 1 could be ANY string, but the renderer indexes a
// fixed two-key map by it. A bad pattern threw only AFTER removeGeneratedMarkdown had
// legitimately deleted the old output — files gone, nothing written. Validation now
// happens at the parse boundary, which runs before any deletion.
test("generate-tech-specs rejects a bad annotationPattern BEFORE deleting anything (TC-TSPEC-007)", async () => {
  for (const [label, pattern] of [
    ["unknown trait name", '\\[Trait\\("(Category)"\\s*,\\s*"([^"]+)"\\)\\]'],
    ["missing second group", '\\[Trait\\("(TestSpec)"'],
  ]) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "tech-spec-badpattern-"));
    await fs.mkdir(path.join(root, "docs"), { recursive: true });
    await fs.writeFile(
      path.join(root, "docs", "project-config.json"),
      JSON.stringify({
        specRoots: { technical: { path: "out" } },
        techSpecScan: { sourceRoot: "src", fileExtensions: [".cs"], annotationPattern: pattern },
      }),
      "utf8"
    );
    await fs.mkdir(path.join(root, "src", "Services", "Orders"), { recursive: true });
    await fs.writeFile(
      path.join(root, "src", "Services", "Orders", "OrderTests.cs"),
      '\npublic class OrderTests\n{\n    [Trait("Category", "Unit")]\n    [Trait("TestSpec", "TS-1")]\n    public async Task Should_Do()\n    {\n    }\n}\n',
      "utf8"
    );

    const outDir = path.join(root, "out");
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(path.join(outDir, "existing-derived.md"), `${DERIVED_BANNER}\n\n# Existing\n`, "utf8");

    const result = runGenerator(root);

    assert.notEqual(result.status, 0, `${label}: must fail`);
    assert.match(result.stderr, /Invalid techSpecScan\.annotationPattern/, `${label}: must name the real cause`);
    assert.doesNotMatch(result.stderr, /TypeError/, `${label}: must not crash on undefined`);
    await assert.doesNotReject(
      fs.access(path.join(outDir, "existing-derived.md")),
      `${label}: existing derived output must SURVIVE a bad pattern`
    );
  }
});

test("generate-tech-specs fails loudly when techSpecScan is absent (TC-TSPEC-006)", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "tech-spec-noscan-"));
  await fs.mkdir(path.join(root, "docs"), { recursive: true });
  await fs.writeFile(
    path.join(root, "docs", "project-config.json"),
    JSON.stringify({ specRoots: { technical: { path: "out" } } }),
    "utf8"
  );

  const result = runGenerator(root);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing docs\/project-config\.json techSpecScan/);
});
