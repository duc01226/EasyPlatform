import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const modulePath = path.join(root, ".claude/scripts/lib/workflow-manifest.cjs");
const { resolveWorkflowManifest: resolve, resolveAllWorkflowManifests: resolveAll } = require(modulePath);
const availableSkills = new Set(["investigate", "plan", "spec", "why-review", "workflow-end"]);
const options = { availableSkills };
const occurrence = (id, skill = "spec", extra = {}) => ({ id, skill, ...extra });
const document = (entry = {}) => ({ version: "1.0.0", workflows: { "workflow-test": {
  name: "Synthetic", description: "Fixture", whenToUse: "Fixture", preActions: { injectContext: "Fixture context" },
  sequence: ["investigate", "spec [mode=tests]", "workflow-end"], ...entry,
} } });
const run = (doc, extra = {}) => resolve(doc, "workflow-test", { ...options, ...extra });
const variantDoc = () => document({ defaultMode: "audit", variants: {
  audit: { sequence: [occurrence("inspect", "spec", { args: "[mode=audit]" }), occurrence("close", "workflow-end")] },
  update: { sequence: [occurrence("write", "spec", { args: "[mode=update]" }), occurrence("close", "workflow-end")] },
} });

// TC-HARNESS-007: executable manifest invariants, not instruction-text efficacy.
test("legacy: preserves order, arguments and repeated skill occurrences", () => {
  const result = run(document({ sequence: ["spec [mode=tests]", "spec [mode=sync]", "spec [mode=tests]"] }));
  assert.deepEqual(result.occurrences.map(({ skill, args }) => [skill, args]), [["spec", "[mode=tests]"], ["spec", "[mode=sync]"], ["spec", "[mode=tests]"]]);
  assert.equal(new Set(result.occurrences.map(x => x.id)).size, 3);
  assert.equal(result.mode, "default");
});

test("legacy: IDs and fingerprint repeat, but IDs are version/source scoped", () => {
  const doc = document();
  assert.deepEqual(run(doc), run(structuredClone(doc)));
  const changed = structuredClone(doc); changed.version = "2.0.0";
  assert.notEqual(run(doc).occurrences[0].id, run(changed).occurrences[0].id);
  const inserted = document({ sequence: ["plan", ...doc.workflows["workflow-test"].sequence] });
  assert.notEqual(run(doc).occurrences[0].id, run(inserted).occurrences[1].id);
});

test("legacy: command-key barriers resolve to occurrence IDs and retain conditional members", () => {
  const result = run(document({ parallelGroups: [{ id: "reviewers", members: ["investigate", "spec [mode=tests]"], conditionalMembers: ["spec [mode=tests]"], barrier: true }] }));
  assert.deepEqual(result.parallelGroups[0].members, result.occurrences.slice(0, 2).map(x => x.id));
  assert.equal(result.occurrences[1].barrier, "reviewers");
  assert.notEqual(result.occurrences[1].applicability.when, "always");
  assert.ok(result.occurrences[1].applicability.skipReason);
});

// P41 D6: phases group a mode's steps into one todo per phase. Each rule the resolver enforces has its own rejecting case,
// so deleting any check turns a case red.
test("phases: every grouping rule rejects its own violation; a valid grouping resolves", () => {
  const steps = [occurrence("look", "investigate"), occurrence("draft", "spec"), occurrence("ship", "plan", { args: "--mode=execute" }), occurrence("close", "workflow-end")];
  const gates = [{ id: "run-closed", satisfiedBy: ["workflow-end"] }, { id: "spec-synced", satisfiedBy: ["spec"] }];
  const valid = () => [
    { id: "discover", steps: ["look"] },
    { id: "specify", steps: ["draft"], exit: ["spec-synced"] },
    { id: "build", steps: ["ship"] },
    { id: "close", steps: ["close"], exit: ["run-closed"] },
  ];
  const doc = (phases, extra = {}) => document({ sequence: steps, outcomeGates: gates, phases, ...extra });
  const ok = run(doc(valid()));
  assert.deepEqual(ok.phases.map(phase => phase.id), ["discover", "specify", "build", "close"]);
  assert.deepEqual(run(document({ sequence: steps })).phases, [], "a mode without phases resolves to none");
  const cases = [
    ["not an array", () => "discover", /non-empty array/],
    ["empty list", () => [], /non-empty array/],
    ["unknown field", () => { const p = valid(); p[0].note = "x"; return p; }, /Unknown phase/],
    ["unknown phase id", () => { const p = valid(); p[0].id = "explore"; return p; }, /out-of-order phase/],
    ["out of order", () => { const p = valid(); [p[0], p[1]] = [p[1], p[0]]; return p; }, /out-of-order phase/],
    ["repeated phase", () => { const p = valid(); p[2].id = "specify"; return p; }, /out-of-order phase/],
    ["empty steps", () => { const p = valid(); p[2].steps = []; return p; }, /needs step IDs/],
    ["bad exit list", () => { const p = valid(); p[3].exit = "run-closed"; return p; }, /Invalid exit/],
    ["missing step", () => { const p = valid(); p[2].steps = []; p.splice(2, 1); return p; }, /every occurrence once, in sequence order/],
    ["extra step", () => { const p = valid(); p[0].steps = ["look", "ghost"]; return p; }, /every occurrence once, in sequence order/],
    ["steps out of sequence order", () => { const p = valid(); p[0].steps = ["draft"]; p[1].steps = ["look"]; return p; }, /every occurrence once, in sequence order/],
    ["undeclared exit gate", () => { const p = valid(); p[3].exit.push("tests-pass"); return p; }, /undeclared outcome gate/],
    ["gate exit twice", () => { const p = valid(); p[2].exit = ["spec-synced"]; return p; }, /exit of two phases/],
    ["exit before its satisfier", () => { const p = valid(); p[1].exit = []; p[0].exit = ["spec-synced"]; return p; }, /no satisfier in or before the phase/],
    ["gate with no exit", () => { const p = valid(); p[1].exit = []; return p; }, /is no phase's exit/],
  ];
  for (const [label, make, pattern] of cases) assert.throws(() => run(doc(make())), pattern, label);
  // Legacy string steps cannot be named by a phase
  assert.throws(() => run(document({ sequence: ["investigate", "workflow-end"], outcomeGates: [gates[0]], phases: [{ id: "discover", steps: ["x"] }] })), /explicit occurrence objects/);
  // A barrier group stays inside one phase
  const grouped = doc(valid(), { parallelGroups: [{ id: "pair", members: ["draft", "ship"], barrier: true }] });
  assert.throws(() => run(grouped), /spans two phases/);
});

test("phases: the resolver's phase list matches the schema enum, in order", () => {
  const { PHASES } = require(modulePath);
  const schema = JSON.parse(fs.readFileSync(path.join(root, ".claude/workflows.schema.json"), "utf8"));
  assert.deepEqual(schema.definitions.Phase.properties.id.enum, PHASES);
});

test("variants: selected complete list replaces default and enumerates all modes", () => {
  const doc = variantDoc();
  const original = structuredClone(doc);
  assert.deepEqual(run(doc).sequence, ["spec [mode=audit]", "workflow-end"]);
  assert.deepEqual(run(doc, { mode: "update" }).sequence, ["spec [mode=update]", "workflow-end"]);
  assert.deepEqual(resolveAll(doc, "workflow-test", options).map(x => x.mode), ["audit", "update"]);
  assert.notEqual(run(doc).fingerprint, run(doc, { mode: "update" }).fingerprint);
  assert.deepEqual(doc, original, "resolution must not rewrite the canonical input");
});

test("variants: a variant adds its own outcome gates to the shared entry gates, scoped to the selected mode", () => {
  const skills = new Set(["investigate", "spec", "workflow-end"]);
  const gated = (extra = {}) => document({ defaultMode: "audit", outcomeGates: [{ id: "run-closed", satisfiedBy: ["workflow-end"] }], variants: {
    audit: { outcomeGates: [{ id: "review-converged", satisfiedBy: ["spec [mode=audit]"] }], sequence: [occurrence("inspect", "spec", { args: "[mode=audit]" }), occurrence("close", "workflow-end")] },
    update: { outcomeGates: [{ id: "spec-synced", satisfiedBy: ["spec"], when: "The update changed behavior" }], sequence: [occurrence("write", "spec", { args: "[mode=update]" }), occurrence("close", "workflow-end")] },
  }, ...extra });
  const gateIds = (doc, mode) => run(doc, { mode, availableSkills: skills }).outcomeGates.map(gate => gate.id);
  assert.deepEqual(gateIds(gated(), "audit"), ["run-closed", "review-converged"]);
  assert.deepEqual(gateIds(gated(), "update"), ["run-closed", "spec-synced"]);
  assert.equal(run(gated(), { mode: "update", availableSkills: skills }).outcomeGates[1].when, "The update changed behavior");
  // a variant cannot redefine an entry gate, and a variant gate must be provable in its own mode
  const clash = gated(); clash.workflows["workflow-test"].variants.audit.outcomeGates = [{ id: "run-closed", satisfiedBy: ["workflow-end"] }];
  assert.throws(() => run(clash, { availableSkills: skills }), /Duplicate outcome gate in workflow-test: run-closed/);
  const unprovable = gated(); unprovable.workflows["workflow-test"].variants.update.outcomeGates = [{ id: "review-converged", satisfiedBy: ["spec [mode=audit]"] }];
  assert.throws(() => run(unprovable, { mode: "update", availableSkills: skills }), /has no satisfying step in workflow-test\/update/);
  // a workflow without variants keeps resolving its entry-level gates unchanged
  const legacy = document({ outcomeGates: [{ id: "run-closed", satisfiedBy: ["workflow-end"] }] });
  assert.deepEqual(run(legacy, { availableSkills: skills }).outcomeGates.map(gate => gate.id), ["run-closed"]);
});

test("variants: semantic identity survives unrelated insertion; source changes invalidate resume", () => {
  const doc = variantDoc(); const before = run(doc);
  doc.workflows["workflow-test"].variants.audit.sequence.unshift(occurrence("prepare", "investigate"));
  const after = run(doc);
  assert.equal(before.occurrences[0].id, after.occurrences[1].id);
  assert.notEqual(before.fingerprint, after.fingerprint);
  doc.workflows["workflow-test"].preActions.injectContext = "Changed contract";
  assert.notEqual(after.fingerprint, run(doc).fingerprint);
});

test("variants: preserve conditional tasks and isolate base groups/metadata", () => {
  const doc = variantDoc();
  Object.assign(doc.workflows["workflow-test"], { parallelGroups: [{ id: "base", members: ["investigate", "spec [mode=tests]"], barrier: true }], stepMeta: { investigate: { executionMode: "subagent" } } });
  doc.workflows["workflow-test"].variants.audit.sequence[0].applicability = { when: "target exists", skipReason: "No target" };
  const result = run(doc);
  assert.equal(result.occurrences.length, 2);
  assert.deepEqual(result.occurrences[0].applicability, { when: "target exists", skipReason: "No target" });
  assert.deepEqual(result.parallelGroups, []);
  assert.deepEqual(result.stepMeta, {});
});

test("variants: unknown modes never fall back, including bounded name domain", () => {
  // Domain: all 27 length-three words over a/b/c, plus empty, inherited and malformed keys.
  for (const a of "abc") for (const b of "abc") for (const c of "abc") {
    assert.throws(() => run(variantDoc(), { mode: a + b + c }), /Unknown workflow mode/);
  }
  for (const mode of ["", "default", "constructor", "toString", "../audit", null, 1]) assert.throws(() => run(variantDoc(), { mode }));
  assert.throws(() => run(document(), { mode: "audit" }), /Unknown workflow mode/);
});

test("metadata: preserves both selected fields for legacy repeats and explicit variant IDs", () => {
  // Full command keys target every identical legacy occurrence, not other args.
  for (const executionMode of ["subagent", "inline"]) for (const contextBudget of ["low", "medium", "high", "critical"]) {
    const meta = { executionMode, contextBudget };
    const legacy = run(document({ sequence: ["spec [mode=tests]", "spec [mode=sync]", "spec [mode=tests]"],
      stepMeta: { "spec [mode=tests]": meta } }));
    assert.deepEqual(legacy.stepMeta, { [legacy.occurrences[0].id]: meta, [legacy.occurrences[2].id]: meta });
    const explicit = run(document({ sequence: [occurrence("first"), occurrence("second")], stepMeta: { second: meta } }));
    assert.deepEqual(explicit.stepMeta, { second: meta });
    const doc = variantDoc();
    doc.workflows["workflow-test"].stepMeta = { investigate: { executionMode: "inline" } };
    doc.workflows["workflow-test"].variants.audit.stepMeta = { inspect: meta };
    assert.deepEqual(run(doc).stepMeta, { inspect: meta });
    assert.deepEqual(run(doc, { mode: "update" }).stepMeta, {}, "complete variant must not inherit metadata");
    assert.notEqual(legacy.stepMeta[legacy.occurrences[0].id], meta, "normalization copies metadata");
  }
});

test("invalid metadata: duplicate IDs rejected across bounded insertion positions", () => {
  // Domain: sequence lengths 1..8, each possible duplicate insertion position.
  for (let n = 1; n <= 8; n++) for (let i = 0; i <= n; i++) {
    const sequence = Array.from({ length: n }, (_, j) => occurrence(`step-${j}`));
    sequence.splice(i, 0, occurrence("step-0", "plan"));
    assert.throws(() => run(document({ sequence })), /Duplicate occurrence ID/);
  }
});

test("invalid metadata: reject absent skills, malformed occurrence/applicability/variant fields", () => {
  // Pins the portable declaration; external Ajv execution is separately recorded.
  const preActions = JSON.parse(fs.readFileSync(path.join(root, ".claude/workflows.schema.json"), "utf8")).definitions.PreActions;
  assert.equal(preActions.additionalProperties, false);
  assert.equal(preActions.properties.domainEntityReferenceRefresh.type, "string");
  const pattern = new RegExp(preActions.properties.domainEntityReferenceRefresh.pattern);
  assert.equal(pattern.test("Refresh when applicable"), true);
  for (const value of ["", " ", "\n"]) assert.equal(pattern.test(value), false);
  for (const step of [null, 42, "", "../spec", occurrence("x", "ghost"), occurrence("x", "../spec"), occurrence("x", "spec", { args: [] }), occurrence("x", "spec", { typo: true }), occurrence("x", "spec", { applicability: { when: "maybe" } })]) {
    assert.throws(() => run(document({ sequence: [step] })));
  }
  for (const entry of [{ sequence: [] }, { sequence: "spec" }, { variants: {} }, { defaultMode: "audit" }, { defaultMode: "wrong", variants: variantDoc().workflows["workflow-test"].variants }, { defaultMode: "audit", variants: { audit: { sequence: ["spec"] } } }, { defaultMode: "audit", variants: { audit: { sequence: [occurrence("x")], patch: [] } } }]) assert.throws(() => run(document(entry)));
  assert.throws(() => run(document({ stepMeta: { ghost: { executionMode: "inline" } } })));
  for (const entry of [{ parallelGroups: null }, { stepMeta: null }]) assert.throws(() => run(document(entry)));
  assert.throws(() => run({ ...document(), version: null }));
});

test("barriers: explicit IDs disambiguate repeated skills, contiguous unordered membership accepted", () => {
  const result = run(document({ sequence: [occurrence("first"), occurrence("second"), occurrence("close", "workflow-end")], parallelGroups: [{ id: "reviews", members: ["second", "first"], barrier: true }] }));
  assert.deepEqual(result.occurrences.map(x => x.barrier), ["reviews", "reviews", null]);
});

test("barriers: reject ambiguity, missing/overlapping/noncontiguous/invalid membership", () => {
  const sequence = [occurrence("one"), occurrence("two"), occurrence("three")];
  const group = { id: "reviews", members: ["one", "two"], barrier: true };
  for (const groups of [[{ ...group, members: ["one", "three"] }], [{ ...group, members: ["one", "ghost"] }], [{ ...group, members: ["one", "one"] }], [{ ...group, members: ["one"] }], [{ ...group, barrier: false }], [{ ...group, conditionalMembers: ["three"] }], [group, { ...group, id: "again" }], [group, group]]) assert.throws(() => run(document({ sequence, parallelGroups: groups })));
  assert.throws(() => run(document({ sequence: ["spec", "spec", "workflow-end"], parallelGroups: [{ ...group, members: ["spec", "workflow-end"] }] })), /ambiguous/i);
});

test("fingerprint: object key order does not change source identity", () => {
  const doc = variantDoc();
  function reverse(value) { return Array.isArray(value) ? value.map(reverse) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).reverse().map(([k, v]) => [k, reverse(v)])) : value; }
  assert.equal(run(doc).fingerprint, run(reverse(doc)).fingerprint);
});

function fixture(t, doc = variantDoc()) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "workflow-manifest-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const scripts = path.join(dir, ".claude/scripts");
  fs.mkdirSync(path.join(scripts, "codex/tests"), { recursive: true });
  fs.mkdirSync(path.join(scripts, "lib"), { recursive: true });
  fs.copyFileSync(modulePath, path.join(scripts, "lib/workflow-manifest.cjs"));
  fs.copyFileSync(path.join(root, ".claude/scripts/lib/project-root.cjs"), path.join(scripts, "lib/project-root.cjs"));
  fs.copyFileSync(path.join(root, ".claude/scripts/codex/read-workflow-entry.mjs"), path.join(scripts, "codex/read-workflow-entry.mjs"));
  fs.writeFileSync(path.join(dir, ".claude/workflows.json"), JSON.stringify(doc));
  for (const skill of availableSkills) {
    fs.mkdirSync(path.join(dir, ".claude/skills", skill), { recursive: true });
    fs.writeFileSync(path.join(dir, ".claude/skills", skill, "SKILL.md"), "---\nname: synthetic\n---\n");
  }
  return { dir, scripts, cli: path.join(scripts, "codex/read-workflow-entry.mjs") };
}

test("CLI: clean copy supports mode/output aliases and preserves entry metadata", t => {
  const { cli, dir } = fixture(t);
  for (const args of [[], ["--mode", "audit"], ["--output=audit"], ["--mode=audit"], ["--output", "audit"]]) {
    const result = spawnSync(process.execPath, [cli, "workflow-test", ...args], { cwd: dir, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const actual = JSON.parse(result.stdout);
    assert.equal(actual.name, "Synthetic");
    assert.equal(actual.preActions.injectContext, "Fixture context");
    assert.deepEqual(actual.occurrences.map(x => x.id), ["inspect", "close"]);
    assert.deepEqual(actual.sequence, ["spec [mode=audit]", "workflow-end"]);
  }
  for (const args of [["--mode=ghost"], ["--output"], ["--mode="], ["--mode", "audit", "--output", "update"], ["--bogus"], ["--mode", "--output"]]) {
    const result = spawnSync(process.execPath, [cli, "workflow-test", ...args], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
  }
});

test("CLI: context/skill validation and hostile workflow keys fail closed", t => {
  const doc = document(); const { dir, cli } = fixture(t, doc);
  for (const id of ["constructor", "toString", "__proto__", "unknown"]) {
    assert.throws(() => resolve(doc, id, options), /Unknown workflow ID/);
    assert.equal(spawnSync(process.execPath, [cli, id]).status, 1);
  }
  fs.rmSync(path.join(dir, ".claude/skills/spec/SKILL.md"));
  assert.match(spawnSync(process.execPath, [cli, "workflow-test"], { encoding: "utf8" }).stderr, /Missing skill/);
  doc.workflows["workflow-test"].preActions.injectContext = " ";
  fs.writeFileSync(path.join(dir, ".claude/workflows.json"), JSON.stringify(doc));
  assert.match(spawnSync(process.execPath, [cli, "workflow-test"], { encoding: "utf8" }).stderr, /injectContext/);
});

test("seeded semantic mutants: existing invariant tests kill fallback, duplicate acceptance and metadata loss", t => {
  const { scripts } = fixture(t);
  const testPath = path.join(scripts, "codex/tests/workflow-manifest.test.mjs");
  fs.copyFileSync(fileURLToPath(import.meta.url), testPath);
  const source = fs.readFileSync(modulePath, "utf8");
  const childEnv = { ...process.env };
  delete childEnv.NODE_TEST_CONTEXT;
  const mutants = [
    ["unknown-mode fallback", "const mode = own(options, \"mode\") ? options.mode : (entry.defaultMode ?? \"default\");", "const mode = modes.includes(options.mode) ? options.mode : (entry.defaultMode ?? \"default\");", "variants: unknown modes", /Missing expected exception/],
    ["duplicate-ID acceptance", "check(!ids.has(record.id), `Duplicate occurrence ID: ${record.id}`);", "/* mutant: accept duplicate identity */", "invalid metadata: duplicate IDs", /Missing expected exception/],
    ["metadata loss", "value: { ...meta }", "value: {}", "metadata: preserves both selected fields", /Expected values to be strictly deep-equal/],
  ];
  for (const [name, before, after, pattern, diagnostic] of mutants) {
    assert.equal(source.split(before).length, 2, `exactly one mutation target: ${name}`);
    fs.writeFileSync(path.join(scripts, "lib/workflow-manifest.cjs"), source.replace(before, after));
    const result = spawnSync(process.execPath, ["--test", `--test-name-pattern=${pattern}`, testPath], { encoding: "utf8", env: childEnv });
    assert.equal(result.status, 1, `${name} must fail the unchanged invariant test\n${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, diagnostic);
    // Node 22 renders TAP totals as `# fail`; Node 24 uses `ℹ fail`.
    // Preserve the mutation oracle while accepting both supported reporters.
    assert.match(result.stdout, /(?:#|ℹ) fail 1/);
    t.diagnostic(`${name}: KILLED by unchanged ${pattern} test (exit ${result.status})`);
  }
});

test("variants: shipped research/spec/integration-test workflows resolve every complete mode", () => {
  const registry = JSON.parse(fs.readFileSync(path.join(root, ".claude/workflows.json"), "utf8"));
  const expected = {
    "workflow-research": {
      synthesis: ["web-research --chain=deep-dive", "knowledge-synthesis", "knowledge-review --fix-loop", "workflow-end", "watzup"],
      "business-eval": ["web-research --chain=deep-dive", "market-analysis", "business-evaluation", "knowledge-review --fix-loop", "workflow-end", "watzup"],
      marketing: ["web-research --chain=deep-dive", "market-analysis", "strategy-builder", "knowledge-review --fix-loop", "workflow-end", "watzup"],
      course: ["web-research --chain=deep-dive", "course-builder", "knowledge-review --fix-loop", "workflow-end", "watzup"]
    },
    "workflow-code-to-spec": {
      "init-full": ["investigate", "plan", "plan --mode=validate", "spec [mode=init]", "spec [mode=tests]", "work-item --mode=review --type=spec-tests --fix-loop", "docs-manager --mode=update", "workflow-end", "watzup"],
      update: ["workflow-review-changes --review-only", "spec [mode=update]", "spec [mode=tests]", "work-item --mode=review --type=spec-tests --fix-loop", "spec [mode=sync]", "docs-manager --mode=update", "workflow-end", "watzup"],
      audit: ["investigate", "spec [mode=audit]", "why-review --validate-findings", "workflow-end", "watzup"]
    },
    "workflow-integration-test": {
      write: ["investigate", "spec [mode=tests]", "work-item --mode=review --type=spec-tests", "integration-test", "integration-test --mode=review", "integration-test --mode=verify", "spec [mode=sync]", "docs-manager --mode=update", "workflow-end", "watzup"],
      green: ["investigate", "integration-test --mode=verify --fix-loop", "spec [mode=sync]", "docs-manager --mode=update", "workflow-end", "watzup"]
    }
  };
  for (const [workflowId, modes] of Object.entries(expected)) {
    const manifests = resolveAll(registry, workflowId, { rootDir: root });
    assert.deepEqual(Object.fromEntries(manifests.map(manifest => [manifest.mode, manifest.sequence])), modes);
    assert.ok(manifests.every(manifest => manifest.fingerprint && manifest.occurrences.every(item => item.id)));
  }
});

test("plan --mode=review is confined to confirmed large/init workflows and no workflow invokes understand", () => {
  const registry = JSON.parse(fs.readFileSync(path.join(root, ".claude/workflows.json"), "utf8"));
  const withPlanReview = [];
  const withUnderstand = [];
  for (const [workflowId, entry] of Object.entries(registry.workflows)) {
    const skills = (entry.sequence ?? []).map(step => typeof step === "string" ? step : step.skill);
    const invocations = (entry.sequence ?? []).map(step => typeof step === "string" ? step : `${step.skill}${step.args ? ` ${step.args}` : ""}`);
    if (invocations.some(step => /^plan\s+.*--mode=review\b/.test(step))) withPlanReview.push(workflowId);
    if (skills.includes("understand")) withUnderstand.push(workflowId);
  }
  assert.deepEqual(withPlanReview.sort(), ["workflow-big-feature", "workflow-greenfield-init"]);
  assert.deepEqual(withUnderstand, []);
  assert.equal(registry.workflows["workflow-big-feature"].activation, "confirm");
  assert.equal(registry.workflows["workflow-greenfield-init"].activation, "confirm");
  for (const workflowId of ["workflow-big-feature", "workflow-greenfield-init"]) {
    const skill = fs.readFileSync(path.join(root, ".claude", "skills", workflowId, "SKILL.md"), "utf8");
    // Self-routing stops at the route gate's one workflow question: full workflow with its step count,
    // a slimmer custom route, or direct execution; an explicit request skips it.
    assert.match(skill, /When the AI routes here on its own[\s\S]*ask the route gate's one workflow question[\s\S]*current step count[\s\S]*slimmer custom[\s\S]*direct execution/);
    assert.match(skill, /recommending the full workflow only when no leaner route would satisfy the request/);
    assert.match(skill, /An explicit user request for this workflow needs no question/);
  }
});

test("production workflows declare required and opt-in near-end E2E handoffs", () => {
  const registry = JSON.parse(fs.readFileSync(path.join(root, ".claude/workflows.json"), "utf8"));
  const cases = [
    ["workflow-implement-spec", "test", false],
    ["workflow-implement-spec", "test", true, "greenfield-slice"],
    ["workflow-big-feature", "test", true],
    ["workflow-feature", "test", false],
    ["workflow-bugfix", "demo-guide", false],
  ];
  for (const [workflowId, nextSkill, required, mode] of cases) {
    const manifest = resolve(registry, workflowId, { rootDir: root, ...(mode ? { mode } : {}) });
    const index = manifest.occurrences.findIndex(item => item.skill === "workflow-e2e");
    assert.ok(index > 0, `${workflowId} must include workflow-e2e`);
    // Verify-last order: the near-end E2E handoff comes after the static review and after the verify
    // step that follows it (`integration-test --mode=verify` or `test`), never before either.
    const reviewIndex = manifest.occurrences.findIndex(item => item.skill === "workflow-review-changes");
    assert.ok(reviewIndex >= 0 && reviewIndex < index - 1, `${workflowId} must run its review before the verify that precedes E2E`);
    const previous = manifest.occurrences[index - 1];
    assert.ok(previous.skill === "test" || (previous.skill === "integration-test" && /(^|\s)--mode=verify(\s|$)/.test(previous.args)), `${workflowId} E2E must follow a verify step`);
    assert.equal(manifest.occurrences[index].args, "--source=context");
    assert.equal(manifest.occurrences[index + 1].skill, nextSkill);
    if (required) {
      assert.equal(manifest.occurrences[index].applicability.when, "always");
      assert.equal(manifest.occurrences[index].applicability.skipReason, null);
    } else {
      assert.match(manifest.occurrences[index].applicability.when, /explicitly requests E2E/i);
      assert.match(manifest.occurrences[index].applicability.skipReason, /disabled by default/i);
    }
  }
});

test("E2E visual review is gated by the project contract and reviews generated screenshots", () => {
  const skillFiles = [
    ".claude/skills/e2e-test/SKILL.md",
    ".claude/skills/workflow-e2e/SKILL.md",
    ".claude/skills/e2e-test/references/mode-verify.md",
  ];
  for (const relativePath of skillFiles) {
    const source = fs.readFileSync(path.join(root, relativePath), "utf8");
    // No framework-wide default: the gate resolves from the request and the project contract.
    assert.match(source, /no framework-wide screenshot default|requested or required by the project contract/i, relativePath);
    // An explicit false can never waive a project-required gate.
    assert.match(source, /false value cannot waive a project-required/i, relativePath);
    // Each required capture is read case by case before synthesis.
    assert.match(source, /case[- ]by[- ]case|read each case|read and record every/i, relativePath);
    assert.match(source, /experience-review/, relativePath);
  }
});
