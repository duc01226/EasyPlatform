import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..", "..");
const claudeRoot = path.join(repoRoot, ".claude");
const { resolveSpecArtifactProfile, matchesSpecArtifactIdentifier } = require(
  path.join(claudeRoot, "hooks", "lib", "spec-artifact-profile.cjs")
);

async function markdownFiles(root) {
  const found = [];
  async function visit(directory) {
    let entries;
    // A sibling test (skill-layout-golden) creates and removes `.claude/skills/__golden__`; a
    // directory that disappears between parent enumeration and this readdir must not crash the
    // scan (the parity assertions below still bind every carrier that IS present).
    try { entries = await fs.readdir(directory, { withFileTypes: true }); }
    catch { return; }
    for (const entry of entries) {
      // `__golden__` is the sibling `skill-layout-golden` test's scratch skill, created and removed
      // during that test's own run. It is never a framework carrier, so it is not part of this scan.
      if (entry.name === "__golden__") continue;
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(file);
      else if (entry.isFile() && entry.name.endsWith(".md")) found.push(file);
    }
  }
  await visit(root);
  return found.sort();
}

function canonicalBody(source, tag) {
  const heading = `## SYNC:${tag}`;
  const start = source.indexOf(heading);
  assert.notEqual(start, -1, `canonical SYNC:${tag} section exists`);
  const bodyStart = start + heading.length;
  const separators = [source.indexOf("\n---\n", bodyStart), source.indexOf("\n## SYNC:", bodyStart)]
    .filter(index => index >= 0);
  const end = separators.length ? Math.min(...separators) : source.length;
  return source.slice(bodyStart, end).trim().replace(/\r\n?/g, "\n");
}

function consumerBody(source, tag) {
  const open = `<!-- SYNC:${tag} -->`;
  const close = `<!-- /SYNC:${tag} -->`;
  const start = source.indexOf(open);
  if (start < 0) return null;
  assert.equal(source.indexOf(open, start + open.length), -1, `one SYNC:${tag} opening fence`);
  const bodyStart = start + open.length;
  const end = source.indexOf(close, bodyStart);
  assert.notEqual(end, -1, `SYNC:${tag} has a closing fence`);
  assert.equal(source.indexOf(close, end + close.length), -1, `one SYNC:${tag} closing fence`);
  return source.slice(bodyStart, end).trim().replace(/\r\n?/g, "\n");
}

function unrelatedNativeProfile() {
  return {
    specArtifacts: {
      version: 1,
      kind: "engineering-contract",
      sections: {
        intent: ["Capability Behavior"],
        contracts: ["Public Interface"],
        evidence: ["Executable Scenarios"],
      },
      identifiers: {
        requirement: { prefix: "MUST-", grammar: "hyphen-tokens" },
        acceptance: { prefix: "CHECK-", grammar: "hyphen-tokens" },
        scenario: { prefix: "CASE-", grammar: "hyphen-tokens" },
      },
      ownership: "spec-path-and-case-id",
      carriers: [{
        dialect: "yaml-cases-v1",
        roots: ["quality/contracts"],
        extensions: [".yml"],
        acceptedStatuses: ["reviewed", "accepted"],
        fields: {
          scenario: "case_id",
          status: "status",
          requirements: "coverage.requirements",
          acceptance: "coverage.acceptance",
          lists: ["examples"],
          variant: "variant",
          input: "given",
          expected: "then",
        },
      }],
    },
  };
}

test("Given no native artifact declaration, When the profile resolver runs, Then strict portable defaults remain selected", async () => {
  // Business Intent / Invariant Guarded: an absent profile selects the documented default without masking an explicit native contract.
  // Failure Signal: the resolver or spec guidance treats absence as an implicit native profile, or hard-codes the default unconditionally.
  const specSkill = await fs.readFile(path.join(claudeRoot, "skills", "spec", "SKILL.md"), "utf8");
  const profile = resolveSpecArtifactProfile({});

  assert.equal(profile, null);
  assert.match(specSkill, /Strict default representation:[\s\S]*only when no native case profile is explicitly declared/i);
  assert.match(specSkill, /No explicit native case contract exists in config or the required project references/);
  assert.match(specSkill, /Native profile[\s\S]*do not create TC IDs, Section 8, or a parallel case registry/i);
});

test("Given an adopter with different headings, IDs, roots, fields, and statuses, When its profile resolves, Then native conventions stay configurable", () => {
  // Business Intent / Invariant Guarded: project-specific artifact vocabulary is selected from data, never copied into shared defaults.
  // Failure Signal: the profile resolver rejects an unrelated valid vocabulary or rewrites its identifiers/roots/statuses.
  const profile = resolveSpecArtifactProfile(unrelatedNativeProfile());

  assert.deepEqual(profile.sections, {
    intent: ["Capability Behavior"],
    contracts: ["Public Interface"],
    evidence: ["Executable Scenarios"],
  });
  assert.equal(profile.carriers[0].roots[0], "quality/contracts");
  assert.deepEqual(profile.carriers[0].acceptedStatuses, ["reviewed", "accepted"]);
  assert.equal(profile.carriers[0].fields.requirements, "coverage.requirements");
  assert.equal(matchesSpecArtifactIdentifier(profile, "scenario", "CASE-order-cancelled"), true);
  assert.equal(matchesSpecArtifactIdentifier(profile, "scenario", "SCN-order-cancelled"), false);
});

test("Given the post-change spec-sync workflow, When the catalog and wrapper are read, Then their native/default routing preserves every ordered quality gate", async () => {
  // Business Intent / Invariant Guarded: post-change reconciliation remains complete and uses the project's owner/carrier model.
  // Failure Signal: either sequence drops/reorders a gate, or the native branch falls through to TC/Section 8 defaults.
  const catalog = JSON.parse(await fs.readFile(path.join(claudeRoot, "workflows.json"), "utf8"));
  const workflow = catalog.workflows["workflow-spec-sync"];
  const skill = await fs.readFile(path.join(claudeRoot, "skills", "workflow-spec-sync", "SKILL.md"), "utf8");
  const injected = workflow.preActions.injectContext;
  const steps = skill.match(/^\*\*Steps:\*\* (.+)$/m)?.[1].split(" → ").map(step => step.trim().replace(/^\//, ""));
  const expected = [
    "spec [mode=tests]", "work-item --mode=review --type=spec-tests", "integration-test", "spec [mode=sync]",
    "workflow-review-changes --tests=defer", "integration-test --mode=verify", "test --proven=@verify", "workflow-end", "watzup",
  ];

  assert.deepEqual(workflow.sequence.map((step) => (typeof step === "string" ? step : [step.skill, step.args].filter(Boolean).join(" "))), expected);
  assert.deepEqual(steps, expected);
  assert.ok(injected.includes("A native contract may be declared by config or local references"));
  assert.ok(/strict portable defaults only when neither config nor local references declares a native artifact contract/i.test(injected));
  assert.ok(injected.includes("UNKNOWN/BLOCKED"));
  assert.ok(skill.includes("A native contract declared by config or local references takes precedence over portable format defaults"));
  assert.ok(/a missing or conflicting required placement, ID, owner, carrier, or companion link remains `UNKNOWN`\/`BLOCKED`/i.test(skill));
});

test("Given canonical UI-intent guidance, When consumer copies are reconciled, Then universal UX intent stays native-aware and default-only syntax stays fenced", async () => {
  // Business Intent / Invariant Guarded: every UI-bearing owner retains view, navigation, state, and action intent without forcing one project's headings or IDs.
  // Failure Signal: any canonical consumer drift, fixed-section leak before the fallback, or loss of UNKNOWN routing fails this test.
  const canonicalFile = path.join(claudeRoot, "skills", "shared", "sync-inline-versions.md");
  const canonical = await fs.readFile(canonicalFile, "utf8");
  const consumers = [
    ...(await markdownFiles(path.join(claudeRoot, "skills"))),
    ...(await markdownFiles(path.join(claudeRoot, "agents"))),
  ];
  const tags = ["ui-intent-layer", "ui-intent-layer:full", "ui-intent-layer:reminder"];

  for (const tag of tags) {
    const expected = canonicalBody(canonical, tag);
    const dimensions = tag === "ui-intent-layer:reminder"
      ? [[/views/i, "views"], [/navigation/i, "navigation"], [/states/i, "states"], [/user-action flows/i, "user-action flows"]]
      : [[/view inventory/i, "view inventory"], [/navigation map/i, "navigation map"], [/observable states/i, "observable states"], [/action flows/i, "action flows"]];
    for (const [pattern, label] of dimensions) assert.ok(pattern.test(expected), `${tag} preserves ${label}`);
    assert.match(expected, /UNKNOWN/);
    const fallback = expected.search(/strict portable fallback|strict fallback only/i);
    assert.notEqual(fallback, -1, `${tag} has an explicit default-only branch`);
    assert.match(expected.slice(fallback), /only when neither|when neither/i, `${tag} scopes fallback to an absent native contract`);
    assert.doesNotMatch(expected.slice(0, fallback), /§6|US-|OP-|BR-|design_spec:|mockup:/);

    let copies = 0;
    for (const file of consumers) {
      let text;
      try {
        text = await fs.readFile(file, "utf8");
      } catch (error) {
        // A file collected during enumeration can still vanish before it is read when a concurrent
        // test creates and removes its own scratch skill. Only that race is tolerated; any other read
        // failure still fails the scan, and the `copies > 0` guard below keeps parity non-vacuous.
        if (error.code === "ENOENT") continue;
        throw error;
      }
      const body = consumerBody(text, tag);
      if (body === null) continue;
      copies += 1;
      assert.equal(body, expected, `${path.relative(claudeRoot, file)} :: SYNC:${tag}`);
    }
    if (tag !== "ui-intent-layer:full") assert.ok(copies > 0, `${tag} has at least one propagated consumer`);
  }
});

