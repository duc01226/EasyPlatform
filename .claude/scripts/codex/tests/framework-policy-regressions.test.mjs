import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, promises as fs, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..", "..");
const require = createRequire(import.meta.url);
const { getDocsRoot } = require("../../../hooks/lib/project-config-loader.cjs");

async function read(rel) {
  return fs.readFile(path.join(repoRoot, ...rel.split("/")), "utf8");
}

// A skill's contract is its SKILL.md plus every `references/*.md` (sorted), read as one text, so a
// pinned phrase holds wherever the skill keeps it (a mode section may move to a point-of-use reference).
async function readSkillContract(name) {
  const dir = path.join(repoRoot, ".claude", "skills", name);
  const texts = [await fs.readFile(path.join(dir, "SKILL.md"), "utf8")];
  const refs = await fs.readdir(path.join(dir, "references")).catch((error) => {
    if (error?.code === "ENOENT") return [];
    throw error;
  });
  for (const file of refs.filter((entry) => entry.endsWith(".md")).sort()) {
    texts.push(await fs.readFile(path.join(dir, "references", file), "utf8"));
  }
  return texts.join("\n");
}

async function readIfExists(rel) {
  try {
    return await read(rel);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

test("retired dispatch protocol is absent from skill injection tiers", async () => {
  const source = await read(".claude/scripts/sync-hooks-to-skills.py");
  assert.match(source, /ORCHESTRATOR_SKILL_BLOCK_ORDER = \[\]/);
  assert.doesNotMatch(source, /parallel-subagent-dispatch/);
});

test("large ideas use embedded decomposition and ordinary workflows do not add a roadmap writer", async () => {
  const [contract, initiativeToTask, initiativeToSpec, specToTask, presentation, mockup, roadmap] = await Promise.all([
    read(".claude/skills/shared/product-roadmap-contract.md"),
    read(".claude/skills/workflow-planned-work/references/mode-idea-to-tasks.md"),
    read(".claude/skills/workflow-planned-work/references/mode-idea-to-spec.md"),
    read(".claude/skills/workflow-planned-work/references/mode-spec-to-tasks.md"),
    read(".claude/skills/feature-presentation/SKILL.md"),
    read(".claude/skills/work-item/references/mode-mockup.md"),
    read(".claude/skills/product-roadmap/SKILL.md"),
  ]);
  for (const content of [contract, initiativeToTask, initiativeToSpec, specToTask]) {
    assert.match(content, /isLargeIdea/);
    assert.match(content, /large_idea_decomposition/);
    assert.match(content, /outcome_slices/);
    assert.match(content, /deferred_work_owner/);
  }
  // The verifier evaluates the signal names the shared contract declares; a name that exists on one
  // side only would make the decomposition check silently inapplicable.
  const { ROADMAP_BOUNDARY_POLICY } = await import("../verify-sdd-semantic-compliance.mjs");
  assert.equal(ROADMAP_BOUNDARY_POLICY.largeIdeaSignals.length, 4);
  for (const signal of ROADMAP_BOUNDARY_POLICY.largeIdeaSignals) {
    assert.ok(contract.includes(signal), `shared roadmap contract declares the ${signal} signal the verifier evaluates`);
  }
  assert.match(presentation, /all-task presentation/i);
  assert.match(presentation, /Decomposition & boundaries/i);
  assert.match(mockup, /Decomposition boundary/);
  assert.match(roadmap, /explicitly requested/i);
  assert.match(roadmap, /do not create.*docs\/product-roadmap\.md/i);
});

test("shared-protocol maintenance documents both skill tiers without fixed inventory counts (CR-095)", async () => {
  const skill = await read(".claude/skills/sync-skills-shared-protocols/SKILL.md");
  assert.match(skill, /ORCHESTRATOR_SKILL_BLOCK_ORDER/);
  assert.match(skill, /on-disk target inventory/);
  assert.doesNotMatch(skill, /all 163 skills|all 29 agents|183 updated/);
});

test("plan and plan --mode=review keep decision-boundary altitude and verify-last order (CR-092, CR-093)", async () => {
  const [plan, review] = await Promise.all([
    read(".claude/skills/plan/SKILL.md"),
    read(".claude/skills/plan/references/mode-review.md"),
  ]);
  assert.match(plan, /Important technical decisions/);
  assert.match(plan, /Areas and owners to touch/);
  assert.match(plan, /Discovery before edit/);
  assert.match(plan, /After all implementation: run one whole-change static review/);
  assert.match(review, /Plan altitude/);
  assert.match(review, /Verify-last/);
});

test("docs-manager --mode=update reserves spec and generated-doc paths to canonical child skills (CR-096)", async () => {
  const skill = await read(".claude/skills/docs-manager/references/mode-update.md");
  assert.match(skill, /Keep Feature Specs, test specs, derived indexes\/ERDs, technical views and demo guides outside every context-patching brief\/write set/);
  assert.match(skill, /The owning child skill performs those writes/);
  assert.match(skill, /specRoots.business.path/);
});

const NO_STAMP_POLICY_INDEX_FIXTURE = "# Docs index\n\nNo applicable stamp rule is declared.\n";
const EXPLICIT_LAST_VERIFIED_INDEX_FIXTURE =
  "# Docs index\n\n## Narrow edits\nImpact-scoped patches add `<!-- Last verified: YYYY-MM-DD -->`.\n";

function hasImpactScopedLastVerifiedRule(localDocsIndex) {
  return localDocsIndex
    .replace(/\r\n/g, "\n")
    .split("\n")
    .some((line) => /impact-scoped/i.test(line) && /Last verified/i.test(line));
}

function assertDocsUpdateStampPolicy(skillInput, localDocsIndexFixture) {
  const skill = skillInput.replace(/\r\n/g, "\n");
  const start = skill.indexOf("## Stamp discipline");
  const end = skill.indexOf("## Business intent and coverage gates", start);
  assert.ok(start >= 0 && end > start, "stamp policy remains discoverable");
  const stampPolicy = skill.slice(start, end);
  assert.match(stampPolicy, /Resolve and read `docs-index-reference\.md`[\s\S]*`docsRoots\.projectReference\.path`/);
  assert.match(stampPolicy, /Only a full scan may[^\n.]*Last scanned/i);
  assert.match(stampPolicy, /If an applicable local rule explicitly requires `Last verified`, write or update it exactly as specified/i);
  assert.match(stampPolicy, /Honor its scope, format, placement and no-stamp exceptions/i);
  assert.match(stampPolicy, /otherwise write NO tracked date stamp/i);
  assert.match(stampPolicy, /Only completed full owner scans record `--record-verified/);
  assert.match(stampPolicy, /scoped\/editorial checks[\s\S]*never clear full-scan staleness/);
  assert.match(stampPolicy, /impact-scoped pass MUST NOT add, update, or move `Last scanned`/i);
  assert.match(stampPolicy, /A verify pass that changes nothing writes nothing, regardless of any local stamp rule/i);
  assert.match(stampPolicy, /Remove a disallowed pre-existing `Last verified` only during an otherwise-required content patch, never a stamp-only write/i);
  assert.match(stampPolicy, /doc-stamp-guard\.cjs --check <doc> --candidate <file> --baseline <baseline-file>/);
  assert.match(stampPolicy, /Exit 3 = no-op/i);
  assert.match(stampPolicy, /Exit 4 = concurrent change/i);
  if (hasImpactScopedLastVerifiedRule(localDocsIndexFixture)) {
    assert.match(stampPolicy, /If an applicable local rule explicitly requires `Last verified`, write or update it exactly as specified/i);
  } else {
    assert.match(stampPolicy, /otherwise write NO tracked date stamp/i);
  }

  assert.doesNotMatch(skill, /NEVER write .*Last verified.*tracked doc/i, "there must be no absolute Last verified prohibition");
  assert.doesNotMatch(skill, /(?:every|all) impact-scoped[^\n.]{0,120}(?:must|shall|always|required)[^\n.]{0,80}Last verified/i, "there must be no universal Last verified mandate");
  assert.doesNotMatch(skill, /Last verified[^\n.]{0,100}(?:must|shall|always|required)[^\n.]{0,80}(?:every|all) impact-scoped/i, "there must be no universal Last verified mandate");
}

test("docs-manager --mode=update keeps local stamp rules optional and the no-rule default portable (TC-FIT-026)", async () => {
  const skill = await read(".claude/skills/docs-manager/references/mode-update.md");

  assert.equal(hasImpactScopedLastVerifiedRule(NO_STAMP_POLICY_INDEX_FIXTURE), false);
  assert.equal(hasImpactScopedLastVerifiedRule(EXPLICIT_LAST_VERIFIED_INDEX_FIXTURE), true);
  assertDocsUpdateStampPolicy(skill, NO_STAMP_POLICY_INDEX_FIXTURE);
  assertDocsUpdateStampPolicy(skill, EXPLICIT_LAST_VERIFIED_INDEX_FIXTURE);

  for (const forbiddenRule of [
    "NEVER write `<!-- Last verified: YYYY-MM-DD -->` into a tracked doc.",
    "Every impact-scoped patch must write `Last verified`.",
  ]) {
    assert.throws(
      () => assertDocsUpdateStampPolicy(`${skill}\n${forbiddenRule}`, EXPLICIT_LAST_VERIFIED_INDEX_FIXTURE),
      { code: "ERR_ASSERTION" },
    );
  }

  const lastScannedMutant = skill.replaceAll(
    "An impact-scoped pass MUST NOT add, update, or move `Last scanned`.",
    "An impact-scoped pass MAY update `Last scanned`.",
  );
  assert.notEqual(lastScannedMutant, skill, "Last-scanned mutation anchor exists");
  assert.throws(() => assertDocsUpdateStampPolicy(lastScannedMutant, NO_STAMP_POLICY_INDEX_FIXTURE), { code: "ERR_ASSERTION" });
});

test("the configured docs-index Last verified rule is honored when present (TC-FIT-026 local integration)", async (t) => {
  const configInput = await readIfExists("docs/project-config.json");
  if (configInput === null) {
    t.skip("adopter has no docs/project-config.json; portable fixture contract still runs");
    return;
  }

  const config = JSON.parse(configInput);
  const referenceRoot = getDocsRoot("projectReference", config).replace(/\/+$/, "");
  const [skill, localDocsIndex] = await Promise.all([
    read(".claude/skills/docs-manager/references/mode-update.md"),
    readIfExists(`${referenceRoot}/docs-index-reference.md`),
  ]);
  if (localDocsIndex === null) {
    t.skip("adopter has no resolved docs-index-reference.md; portable fixture contract still runs");
    return;
  }

  assertDocsUpdateStampPolicy(skill, localDocsIndex);
  if (!hasImpactScopedLastVerifiedRule(localDocsIndex)) return;

  const stampRule = localDocsIndex
    .replace(/\r\n/g, "\n")
    .split("\n")
    .find((line) => /impact-scoped/i.test(line) && /Last verified/i.test(line));
  if (!stampRule || !/impact-scoped patch adds `<!-- Last verified: YYYY-MM-DD -->` on following line/i.test(stampRule)) {
    return;
  }

  assert.match(stampRule, /only full `scan --target=<key>` may move `<!-- Last scanned: -->`/i);
  assert.match(stampRule, /files with no scan stamp \(`CLAUDE\.md`, `\.claude\/\*\*`\) get \*\*no\*\* stamp/i);
});

test("docs-manager follows the docs-manager --mode=update local stamp contract", async () => {
  const role = (await read(".claude/agents/docs-manager.md")).replace(/\r\n/g, "\n");
  const stampRule = role.split("\n").find((line) => /Stamp discipline:/i.test(line));

  assert.ok(stampRule, "docs-manager must keep one explicit stamp rule");
  assert.match(stampRule, /follow Stamp discipline in `\.claude\/skills\/docs-manager\/references\/mode-update\.md`/i);
  assert.match(stampRule, /update `Last verified` only when the resolved local docs-index explicitly requires it/i);
  assert.match(stampRule, /Preserve explicit no-stamp paths such as `CLAUDE\.md` and `\.claude\/\*\*`/);
  assert.match(stampRule, /Only after a completed full owner scan record verification in the untracked ledger/i);
  assert.doesNotMatch(stampRule, /impact-scoped patch writes NO stamp at all/i);
});

test("adjudication and scale contracts retain exact artifact semantics (CR-099..101)", async () => {
  const [canonical, understand, scale] = await Promise.all([
    read(".claude/skills/shared/sync-inline-versions.md"),
    read(".claude/skills/understand/SKILL.md"),
    read(".claude/skills/understand/references/scale-protocol.md"),
  ]);
  assert.match(understand, /S2.*never assigns fragment ownership/i);
  assert.match(scale, /`[^`]*G\{n\}\.\{axis\}\.md`/);
  for (const verdict of ["SOURCE-WRONG", "TEST-WRONG", "TEST-NOT-OPTIMAL", "ENVIRONMENT-BLOCKED", "AMBIGUOUS"]) {
    assert.match(canonical, new RegExp(verdict));
  }
  assert.match(canonical, /verdict before trace\/edit|provisional verdict[\s\S]{0,160}before touching/i);
});

// CR-017 carrier predicate. The one round-eligibility predicate lives in SYNC:review-policy;
// a converted skill carries that protocol as a guide line (shared P25 recognizer, never a copied
// line format) and the text lives in its projection file `shared/protocols/<tag>.md`.
const BLOCKING_PREDICATE_TAG = "review-policy";
const BLOCKING_PREDICATE_RE = /blockingFindings\(round, findings, hardGates\)/;
const guideCarrier = require("../../lib/protocol-guide-carrier.cjs");
function carriesBlockingPredicate(content, projectionText, { acceptGuide }) {
  if (BLOCKING_PREDICATE_RE.test(content)) return true;
  return acceptGuide && projectionText != null && guideCarrier.hasGuideEntry(content, BLOCKING_PREDICATE_TAG) &&
    BLOCKING_PREDICATE_RE.test(projectionText);
}

test("review convergence uses one blocking predicate and byte-identical low-only exit (CR-017, CR-018)", async () => {
  const [canonical, loop] = await Promise.all([
    read(".claude/skills/shared/sync-inline-versions.md"),
    // The outer zero-fix loop is workflow-review-changes' optional `--fix-loop` mode (references/fix-loop.md).
    readSkillContract("workflow-review-changes"),
  ]);
  assert.match(canonical, /blockingFindings\(round, findings, hardGates\)/);
  assert.match(canonical, /binary gate/i);
  assert.match(loop, /only LOWs remain/);
  assert.match(loop, /no content changed after the final full pass/);
  assert.match(loop, /Any edit after a review invalidates its verdict; review the settled target again/);

  const reviewCarriers = [
    ".claude/skills/architecture/references/mode-full.md",
    ".claude/skills/architecture/references/mode-review.md",
    ".claude/skills/changes-review/SKILL.md",
    ".claude/skills/code-quality-review/SKILL.md",
    ".claude/skills/domain-analysis/references/mode-review.md",
    ".claude/skills/knowledge-review/SKILL.md",
    ".claude/skills/work-item/references/mode-review.md",
    ".claude/skills/performance-review/SKILL.md",
    ".claude/skills/production-readiness-review/SKILL.md",
    ".claude/skills/security-audit/SKILL.md",
    ".claude/skills/ui-design/references/mode-review.md",
    ".claude/skills/why-review/SKILL.md",
  ];
  for (const rel of reviewCarriers) {
    const content = await read(rel);
    assert.doesNotMatch(content, /SYNC:double-round-trip-review|^- `double-round-trip-review`/m,
      `${rel} must not carry the retired body or guide`);
    assert.doesNotMatch(content, /Issues found \(FAIL, or any non-zero findings\)/, rel);
  }
  // Leaf reviewer agents no longer run the round loop (the orchestrating skills above own the
  // predicate), but none may restate a conflicting any-finding-fails rule of its own.
  for (const name of ["architect", "code-reviewer", "integration-tester", "planner", "security-auditor", "spec-compliance-reviewer", "ui-ux-designer"]) {
    const rel = `.claude/agents/${name}.md`;
    assert.doesNotMatch(await read(rel), /Issues found \(FAIL, or any non-zero findings\)/, rel);
  }
});

test("CR-017 carrier predicate accepts a guide entry backed by its projection and fails when both forms are missing (TC-PDL-065)", () => {
  // Given a skill that holds a guide entry for the protocol instead of its body, and a projection that holds the predicate
  const guided = [guideCarrier.GUIDE_BLOCK_START, "",
    guideCarrier.formatGuideLine({ tag: BLOCKING_PREDICATE_TAG, summary: "Fix loop", when: "running a review", path: `.claude/skills/shared/protocols/${BLOCKING_PREDICATE_TAG}.md` }),
    "", guideCarrier.GUIDE_BLOCK_END].join("\n");
  const projection = "> Compute blockingFindings(round, findings, hardGates) once per round.";
  // When the skill is checked, Then it passes
  assert.equal(carriesBlockingPredicate(guided, projection, { acceptGuide: true }), true);
  // When the guide is removed too (both forms missing), Then it fails
  assert.equal(carriesBlockingPredicate("# Skill\n", projection, { acceptGuide: true }), false);
  // When the projection is missing or lost the predicate, Then it fails
  assert.equal(carriesBlockingPredicate(guided, null, { acceptGuide: true }), false);
  assert.equal(carriesBlockingPredicate(guided, "> no predicate here", { acceptGuide: true }), false);
  // When an agent carries only a guide, Then it fails (agents keep full text)
  assert.equal(carriesBlockingPredicate(guided, projection, { acceptGuide: false }), false);
  // And an inline body still passes for both
  assert.equal(carriesBlockingPredicate(projection, null, { acceptGuide: false }), true);
});

test("investigation and fan-out skills keep the graph hint optional and retain shard discipline (CR-020..023)", async () => {
  const [investigate, discovery, understand, scale, scan] = await Promise.all([
    read(".claude/skills/investigate/SKILL.md"),
    read(".claude/skills/spec/references/mode-discovery.md"),
    read(".claude/skills/understand/SKILL.md"),
    read(".claude/skills/understand/references/scale-protocol.md"),
    read(".claude/skills/scan/SKILL.md"),
  ]);
  assert.match(investigate, /Post-Grep Graph Hint \(optional\)/i);
  assert.match(investigate, /grep may not reveal/i);
  assert.match(discovery, /unique (?:artifact|report path)/i);
  assert.match(discovery, /reducer/i);
  assert.match(understand, /S2.*never assigns fragment ownership/i);
  assert.match(scale, /S2 gather agents receive no fragment path/i);
  assert.match(scale, /G\{n\}\.\{axis\}\.md/);
  assert.match(scale, /ORCHESTRATOR spawns axis agents/i);
  assert.match(scale, /Merge shards in SECTION order/i);
  assert.match(scale, /Cap: ≤ 3 axis agents per group/i);
  assert.match(scan, /unique shard/i);
  assert.match(scan, /sole writer/i);
});

test("mutating workflow closures refresh domain-entity references before docs-manager --mode=update or delegate to workflow-review-changes (CR-102)", async () => {
  const workflows = JSON.parse(await read(".claude/workflows.json")).workflows;
  // Workflows that still own the terminal refresh carry scan -> docs-manager --mode=update explicitly.
  for (const id of ["workflow-review-changes"]) {
    const sequence = workflows[id].sequence;
    const scanIndex = sequence.findIndex(step => typeof step === "string" ? step === "scan --target=domain-entities" : step.skill === "scan" && step.args === "--target=domain-entities");
    assert.ok(scanIndex >= 0, `${id} must carry the refresh step`);
    assert.equal(sequence[scanIndex + 1].skill, "docs-manager");
    assert.equal(sequence[scanIndex + 1].args, "--mode=update");
    assert.match(workflows[id].preActions.domainEntityReferenceRefresh, /cited skip reason/);
  }
  // Workflows that delegate their review/docs tail to the nested workflow-review-changes must name
  // it in every mode — the nested workflow owns the scan -> docs-manager --mode=update refresh and the
  // cited-skip-reason rule. Greenfield reviews its foundation this way, and its first slice runs
  // workflow-implement-spec --mode=greenfield-slice, which reviews the slice (P41 D7).
  for (const id of ["workflow-greenfield-init", "workflow-implement-spec", "workflow-refactor"]) {
    const modes = [workflows[id].sequence, ...Object.values(workflows[id].variants ?? {}).map((variant) => variant.sequence)].filter(Array.isArray);
    for (const sequence of modes) {
      assert.ok(
        sequence.some((step) => (typeof step === "string" ? step : step?.skill) === "workflow-review-changes"),
        `${id} must delegate the terminal domain-entity refresh to workflow-review-changes in every mode`
      );
    }
  }
});

test("plan creation never runs --mode=review and reviews its own plan once with why-review", async () => {
  const plan = await read(".claude/skills/plan/SKILL.md");
  assert.match(plan, /Plan creation never runs `--mode=review` or `--mode=execute`/);
  // Business intent: a generated plan gets one independent rationale review and one fix pass before the user validates it
  assert.match(plan, /## Self-Review Pass[\s\S]*run one `\/why-review --review-only` pass on the saved plan \(it validates its own findings and edits nothing\)[\s\S]*one review pass and one fix pass, with no second review round/);
  assert.match(plan, /A workflow owns this run and lists its own `\/plan --mode=review` step\*\* — that step reviews the plan/);
  assert.match(plan, /Standalone invocation:\*{0,2}[\s\S]*finish without a further review question: the plan was reviewed/);
  assert.match(plan, /Workflow invocation:\*{0,2}[\s\S]*Do not ask about review, execution, or other next steps/);
  assert.doesNotMatch(plan, /run `--mode=review` automatically|then run `\/plan --mode=review`/i);
});

test("not-yet-specified work stays apart from non-goals in the plan and the large-idea decomposition", async () => {
  const [plan, contract, execute, review] = await Promise.all([
    read(".claude/skills/plan/SKILL.md"), read(".claude/skills/shared/product-roadmap-contract.md"),
    read(".claude/skills/plan/references/mode-execute.md"), read(".claude/skills/plan/references/mode-review.md"),
  ]);
  // The plan lists what cannot yet be asked precisely, by one test, and never files it under non-goals
  assert.match(plan, /\*\*Not yet specified:\*\*[^\n]*cannot yet state as a precise question[^\n]*what it waits on and who settles it/);
  assert.match(plan, /whether the question can be stated precisely now, not whether it can be answered now/);
  assert.match(plan, /A non-goal is out of scope by decision: give the reason, and never list it as not yet specified/);
  assert.match(plan, /Is every not-yet-specified item named with what it waits on, and kept apart from the non-goals\?/);
  // The list has a meaning for execution, and a blocking decision can never be parked on it
  assert.match(plan, /A phase that depends on an item names it as a blocking open question; a phase that does not may execute/);
  assert.match(plan, /Never file here a decision that changes product intent, a public contract or anything irreversible: that one blocks and goes to the user/);
  assert.match(plan, /A not-yet-specified item is the one exception: it names what it waits on and who settles it instead/);
  assert.match(execute, /a phase that depends on an item still on it does not start — return that item to the user as an open question; phases that do not depend on it proceed/);
  assert.match(review, /no product-intent, public-contract or irreversible decision parked there/);
  assert.doesNotMatch(plan, /Not yet specified[^\n]*(may|can) (hold|carry|include)[^\n]*(product intent|irreversible)/i);
  // The decomposition offers the same list as an optional key that never replaces one of the five required fields
  assert.match(contract, /not_yet_specified: # optional, outside the five required fields/);
  assert.match(contract, /`not_yet_specified` is optional and never replaces a required field/);
  assert.match(contract, /Work ruled out of the idea belongs in `non_goals`: scope puts an item there, sharpness never does/);
  assert.match(contract, /once it can, move it to the field that owns it \(a slice, `risks_evidence` or `deferred_work_owner`\) and delete the entry/);
});

test("plan review reports once by default and fixes only under the shared opt-in loop", async () => {
  const [review, planSkill, planner] = await Promise.all([
    read(".claude/skills/plan/references/mode-review.md"), read(".claude/skills/plan/SKILL.md"), read(".claude/agents/planner.md"),
  ]);
  assert.match(planSkill, /--mode=review supports review-only or --fix-loop/);
  assert.match(review, /Standalone defaults to review-only/);
  assert.match(review, /review-only writes only the report/);
  assert.match(review, /run the full domain pass once and hand off/);
  assert.match(review, /fix-loop repairs validated findings, then repeats the complete review/i);
  assert.match(review, /one shared three-round budget/);
  assert.match(review, /caller-owned leaves never start another loop or edit/);
  assert.match(planSkill, /Plan creation never runs `--mode=review`/);
  assert.match(planSkill, /When `--mode=review`, read `references\/mode-review\.md` in full FIRST/);
  assert.match(planner, /never invoke `\/plan --mode=review` automatically/);
  const connections = planner.slice(planner.indexOf("<!-- AGENT-SKILL-CONNECTIONS:START -->"), planner.indexOf("<!-- AGENT-SKILL-CONNECTIONS:END -->"));
  assert.match(connections, /- `plan`/);
  assert.doesNotMatch(connections, /mode-review|One-Round Contract/);
});

// Protect the mode contract, not retired phase numbering or unlimited test retries.
function assertChangesReviewFixLoop(text) {
  assert.match(text, /Review-only is the standalone default/);
  assert.match(text, /`--fix-loop` enables the shared three-round loop/);
  assert.match(text, /--loop-owner=caller/);
  assert.match(text, /triage every changed file/i);
  assert.match(text, /tasks for triage, review, validation, fixes, fresh re-review and final checks/);
  assert.match(text, /why-review --validate-findings <report>/);
  assert.match(text, /apply authorized fixes, then freshly review the whole updated target/);
  assert.match(text, /At exhaustion, ask before a bounded extension/);
  assert.match(text, /Update relevant specs\/docs before the final pass/);
  assert.match(text, /original pre-review snapshot/);
  assert.match(text, /Never reconstruct or capture a new snapshot at issuance/);
  assert.doesNotMatch(text, /NO round cap|SELF-FIX each validated finding/);
}

test("changes-review keeps report-only defaults and bounded fresh fix-loop evidence", async () => {
  const text = (await readSkillContract("changes-review")).replace(/\r\n/g, "\n");
  assertChangesReviewFixLoop(text);
  for (const [before, after] of [
    ["why-review --validate-findings <report>", "optionally validate"],
    ["freshly review the whole updated target", "reuse the old verdict"],
    ["At exhaustion, ask before a bounded extension", "automatically extend"],
    ["Update relevant specs/docs before the final pass", "skip docs"],
  ]) {
    assert.notEqual(text.replaceAll(before, after), text, `mutation anchor exists: ${before}`);
    assert.throws(() => assertChangesReviewFixLoop(text.replaceAll(before, after)), { code: "ERR_ASSERTION" });
  }
  const retiredLoopSkill = ["changes", "review", "loop"].join("-");
  await assert.rejects(fs.access(path.join(repoRoot, ".claude", "skills", retiredLoopSkill)));
});

// Given the integration-test convergence loop is an OPTIONAL `--fix-loop` flag of `integration-test --mode=verify`
// (not a separate skill), When its documentation and workflow wiring are read, Then the flag is advertised
// top and bottom, the mode is delimited, every loop gate survives (five-way Fault Verdict, owning-layer fix,
// per-round fix-diff review, Round Integrity, 2-consecutive-green exit, cap/escalation, Goal Contract binding),
// each round is the flagless default pass, and the retired skill id stays gone — so dropping a gate,
// recursing the flag, or re-introducing the standalone loop skill fails here.
// Built from parts so the repo-wide "no retired skill id" grep stays at zero hits.
const RETIRED_IT_LOOP_SKILL = ["integration", "test", "verify", "loop"].join("-");

// Sensor row N1 (P26 scratch run). A converted skill carries a shared protocol as a guide line (the
// shared P25 recognizer, never a copied line format) that the hook resolves to the projection file
// `<skills root>/shared/protocols/<tag>.md`; the guide counts only while that file exists and is
// non-empty. A skill with neither form still fails.
function carriesProtocolTag(text, tag, skillsDir = path.join(repoRoot, ".claude", "skills")) {
  if (text.includes(`<!-- SYNC:${tag} -->`)) return true;
  if (!guideCarrier.hasGuideEntry(text, tag)) return false;
  const projection = path.join(skillsDir, "shared", "protocols", `${tag}.md`);
  return existsSync(projection) && readFileSync(projection, "utf8").trim().length > 0;
}

test("integration-test --mode=verify protocol carrier check accepts a guide entry backed by its projection (TC-PDL-065, N1)", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "n1-guide-"));
  try {
    // Given a skills root whose projection file holds the protocol, and a skill carrying only its guide line
    const tag = "goal-contract-satisfaction-loop";
    const skillsDir = path.join(tmp, "skills");
    const projection = path.join(skillsDir, "shared", "protocols", `${tag}.md`);
    await fs.mkdir(path.dirname(projection), { recursive: true });
    await fs.writeFile(projection, "> **Goal Contract** — fixture body.\n");
    const guided = [guideCarrier.GUIDE_BLOCK_START, "",
      guideCarrier.formatGuideLine({ tag, summary: "Save the goal", when: "executing work", path: `.claude/skills/shared/protocols/${tag}.md` }),
      "", guideCarrier.GUIDE_BLOCK_END].join("\n");
    // When the carrier check runs, Then the guide carrier passes and an inline body still passes
    assert.equal(carriesProtocolTag(guided, tag, skillsDir), true);
    assert.equal(carriesProtocolTag(`<!-- SYNC:${tag} -->\n\nbody\n\n<!-- /SYNC:${tag} -->`, tag, skillsDir), true);
    // When the guide is removed too (both forms missing), Then it fails
    assert.equal(carriesProtocolTag("# Skill\n", tag, skillsDir), false);
    // When the projection file is empty or missing, Then the guide alone fails
    await fs.writeFile(projection, "  \n");
    assert.equal(carriesProtocolTag(guided, tag, skillsDir), false);
    await fs.rm(projection);
    assert.equal(carriesProtocolTag(guided, tag, skillsDir), false);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

// The mode section lives in references/fix-loop.md (one delimited block, no SYNC body); the verify-mode reference
// (`text`, references/mode-verify.md) holds the BLOCKING first-read pointer, the flag advertisement, and the inline
// protocol bodies; integration-test/SKILL.md (`itSkillText`) holds the mode dispatch, the frontmatter and the protocol
// guide lines. `ref` is the fix-loop reference text.
let itSkillText = "";
function assertIntegrationTestVerifyFixLoop(text, ref) {
  assert.equal(text.includes("<!-- FIX-LOOP-MODE:START -->") || text.includes("<!-- FIX-LOOP-MODE:END -->"), false, "mode-verify.md holds no FIX-LOOP-MODE block (the mode lives in references/fix-loop.md)");
  assert.equal(ref.split("<!-- FIX-LOOP-MODE:START -->").length - 1, 1, "exactly one delimited --fix-loop mode opener");
  assert.equal(ref.split("<!-- FIX-LOOP-MODE:END -->").length - 1, 1, "exactly one delimited --fix-loop mode closer");
  const mode = ref.match(/<!-- FIX-LOOP-MODE:START -->([\s\S]*?)<!-- FIX-LOOP-MODE:END -->/)?.[1] ?? "";
  // The default path loads only the pointer: a mandatory first read of the reference when the flag is present.
  assert.match(text, /## Mode: `--fix-loop` — Read `references\/fix-loop\.md` First \(BLOCKING\)/, "mode-verify.md carries the BLOCKING first-read pointer heading");
  assert.match(text, /When the flag is present, read `references\/fix-loop\.md` in full FIRST \(BLOCKING\)/);
  assert.match(text, /\*\*When `--fix-loop` is passed, read `references\/fix-loop\.md` FIRST \(BLOCKING\)/, "Quick Summary points at the reference");
  // The shared convergence-loop skeleton is read from its single owner, by the reference and by the default flake rule.
  assert.match(ref, /\.claude\/skills\/shared\/verify-convergence-loop\.md` — read it before round 1/);
  assert.match(text, /READ `\.claude\/skills\/shared\/verify-convergence-loop\.md` § 1 whenever a required test is red in one run and green in another/);
  assert.match(mode, /^\s*## Mode: `--fix-loop`/, "the delimited block is the --fix-loop mode section");
  // The surviving skill dispatches the verify mode with a BLOCKING read-first line and advertises the flag.
  assert.match(itSkillText, /\*\*\[BLOCKING\]\*\* When `--mode=verify`, read `references\/mode-verify\.md` in full FIRST/, "SKILL.md dispatches --mode=verify");
  assert.match(itSkillText, /read `references\/fix-loop\.md` in full before any loop work/, "SKILL.md points --fix-loop at its reference");
  const frontmatter = itSkillText.slice(0, itSkillText.indexOf("\n---", 4));
  assert.match(frontmatter, /^version: 3\.0\.0$/m);
  assert.match(frontmatter, /^description: '[^'\n]*--fix-loop[^'\n]*'$/m, "frontmatter description advertises the flag");
  const summary = text.slice(text.indexOf("## Quick Summary"), text.indexOf("## First Principle"));
  assert.match(summary, /\*\*`--fix-loop` \(OPTIONAL mode flag — absent by default, and absence changes nothing in this skill\):\*\*/);
  const closing = text.slice(text.lastIndexOf("## Closing Reminders"));
  assert.match(closing, /\*\*IMPORTANT MUST ATTENTION `--fix-loop` \(OPTIONAL mode — only when the flag is passed\):\*\*/);
  // Scope gate + no recursion: each round is this skill's own default pass, never the flag again.
  assert.match(mode, /Without the flag, skip this whole section/);
  assert.match(mode, /\*\*MUST ATTENTION NEVER self-invoke with the flag\.\*\* Each round's verification is THIS skill's default pass \(Steps 1–5\) WITHOUT `--fix-loop`/);
  assert.match(mode, /Inside a round the default pass REPORTS; it does not fix\./);
  for (const heading of ["FL-0 — Resolve Verification Scope + Goal Contract", "FL-0b — Bind the Convergence Loop", "FL-1 — Round Loop", "FL-2 — Convergence & Escalation Gate", "FL-3 — Terminal Spec/Doc Sync + Recap", "Fix-Loop Convergence Detection — Why Five Conditions"]) {
    assert.ok(mode.includes(`### ${heading}`), `missing ${heading}`);
  }
  // Scope, Goal Contract, and convergence binding.
  assert.match(mode, /Resolve `\{scope\}` — WHOLE SYSTEM by default/);
  assert.match(mode, /Resolve\/create the Goal Contract/);
  assert.match(mode, /\*\*1\. Protocol loop — ALWAYS binding \(hook\/command-independent\)\.\*\*/);
  assert.match(mode, /\/goal accelerator unavailable — loop bound by protocol/);
  // Adjudication: the five-way verdict taxonomy, written before any edit.
  assert.match(mode, /Combine \(a\) \+ \(b\) into ONE written Fault Verdict per failure, BEFORE any edit/);
  for (const verdict of ["TEST-WRONG", "TEST-NOT-OPTIMAL", "SOURCE-WRONG", "ENVIRONMENT-BLOCKED", "AMBIGUOUS"]) {
    assert.match(mode, new RegExp(`\\| \\*\\*${verdict}\\*\\*\\s+\\|`), `verdict row ${verdict}`);
  }
  assert.match(mode, /`\/integration-test --mode=review` — REPORT-ONLY/);
  assert.match(mode, /Fix the source at the \*\*lowest owning layer\*\*/);
  assert.match(mode, /CONDITIONAL — run `\/changes-review` on the round's fix diff only when ANY fix landed/);
  assert.match(mode, /Round Integrity Check \(no fake green\) — BLOCKING/);
  // Exit and escalation.
  assert.match(mode, /reported \*\*zero failures across 2 consecutive runs without a DB reset\*\*, AND the Round Integrity Check passed/);
  assert.match(mode, /Round cap `N` hit with failures still open/);
  assert.match(mode, /\*\*Increasing failures = STOP\.\*\*/);
  // Shared protocols referenced, not re-copied, and carried once in the skill body.
  assert.match(mode, /are carried once \(guide lines in `integration-test\/SKILL\.md`, full bodies in `references\/mode-verify\.md`\); never re-copy them into this section/);
  assert.doesNotMatch(mode, /<!-- SYNC:/, "mode section references shared protocols instead of duplicating SYNC blocks");
  for (const tag of ["goal-contract-satisfaction-loop", "trade-off-interrogation-gate", "test-failure-fault-adjudication", "integration-test-execution-discipline"]) {
    assert.ok(carriesProtocolTag(`${itSkillText}\n${text}`, tag), `carries SYNC:${tag} (inline body, or a guide entry backed by its projection file)`);
  }
  assert.ok(!text.includes(RETIRED_IT_LOOP_SKILL) && !ref.includes(RETIRED_IT_LOOP_SKILL), "no reference to the retired standalone loop skill");
}

test("integration-test --mode=verify --fix-loop carries the retired loop skill's gates without changing the default path", async () => {
  itSkillText = (await read(".claude/skills/integration-test/SKILL.md")).replace(/\r\n/g, "\n");
  const text = (await read(".claude/skills/integration-test/references/mode-verify.md")).replace(/\r\n/g, "\n");
  const ref = (await read(".claude/skills/integration-test/references/fix-loop.md")).replace(/\r\n/g, "\n");
  assertIntegrationTestVerifyFixLoop(text, ref);
  // The flagless default path keeps its own snapshot contract.
  assert.match(text, /\*\*Filter:\*\* Run only projects relevant to the current change, unless the user explicitly asks for all\./);
  assert.match(text, /6\. \*\*RECOMMEND `\/workflow-integration-test --mode=green` whenever this run ends with ANY failure\.\*\*/);
  for (const [before, after] of [
    ["**MUST ATTENTION NEVER self-invoke with the flag.** Each round's verification is THIS skill's default pass (Steps 1–5) WITHOUT `--fix-loop`", "**Re-invoke with the flag each round.**"],
    ["Round Integrity Check (no fake green) — BLOCKING", "Round Integrity Check (advisory)"],
    ["| **AMBIGUOUS**           |", "| **UNCLEAR**             |"],
    ["**Increasing failures = STOP.**", "**Increasing failures = continue.**"],
    ["<!-- FIX-LOOP-MODE:END -->", ""],
  ]) {
    const mutantRef = ref.replaceAll(before, after);
    const mutantText = text.replaceAll(before, after);
    assert.ok(mutantRef !== ref || mutantText !== text, `mutation anchor exists: ${before}`);
    assert.throws(() => assertIntegrationTestVerifyFixLoop(mutantText, mutantRef), { code: "ERR_ASSERTION" });
  }
  // The pointer is load-bearing: dropping the mandatory first read, or inlining the mode block back into SKILL.md, fails.
  assert.throws(() => assertIntegrationTestVerifyFixLoop(text.replaceAll("read `references/fix-loop.md` in full FIRST (BLOCKING)", "may read references/fix-loop.md"), ref), { code: "ERR_ASSERTION" });
  assert.throws(() => assertIntegrationTestVerifyFixLoop(`${text}\n${ref}`, ref), { code: "ERR_ASSERTION" });
  assert.throws(() => assertIntegrationTestVerifyFixLoop(`${text}\nSee /${RETIRED_IT_LOOP_SKILL}.`, ref), { code: "ERR_ASSERTION" });
  await assert.rejects(fs.access(path.join(repoRoot, ".claude", "skills", RETIRED_IT_LOOP_SKILL)), "the retired loop skill directory must stay removed");
  // The green variant drives the loop through the flag on the surviving skill.
  const workflows = JSON.parse(await read(".claude/workflows.json")).workflows;
  const sequence = workflows["workflow-integration-test"].variants.green.sequence;
  assert.equal(typeof sequence[1] === "string" ? sequence[1] : [sequence[1].skill, sequence[1].args].filter(Boolean).join(" "), "integration-test --mode=verify --fix-loop");
  assert.ok(!JSON.stringify(workflows).includes(RETIRED_IT_LOOP_SKILL), "workflows.json must not name the retired loop skill");
});


test("retired protocols cannot be delivered by hooks or restored through guide registries", async () => {
  const canonical = await read(".claude/skills/shared/sync-inline-versions.md");
  const groups = JSON.parse(await read(".claude/skills/shared/protocol-groups.json"));
  const index = JSON.parse(await read(".claude/skills/shared/protocols/index.json"));
  for (const tag of ["nested-task-creation", "fresh-context-review", "parallel-subagent-dispatch", "double-round-trip-review"]) {
    assert.doesNotMatch(canonical, new RegExp(`^## SYNC:${tag}(?::[^\\s]+)?$`, "m"));
    assert.ok(Object.values(groups.groups).every(group => !Object.hasOwn(group.tags, tag)));
    assert.ok(index.tags.every(row => row.tag !== tag));
    assert.equal(await readIfExists(`.claude/skills/shared/protocols/${tag}.md`), null);
  }
});

test("protocol reminders retain applicability and do not introduce automatic architecture rules", async () => {
  const canonical = await read(".claude/skills/shared/sync-inline-versions.md");
  const { extractSyncBody } = require("../../lib/extract-sync-block.cjs");
  const reminder = tag => extractSyncBody(canonical, `${tag}:reminder`);
  assert.match(reminder("ui-system-context"), /Before planning, implementing or changing frontend UI.*honor explicit N\/A/);
  assert.doesNotMatch(reminder("ui-system-context"), /before any UI change/);
  assert.doesNotMatch(reminder("design-patterns-quality"), /same-suffix|base class/);
  assert.match(reminder("complexity-prevention"), /project evidence.*real owner or consumer/);
  assert.doesNotMatch(reminder("complexity-prevention"), />3|anemic models|downshift/);
  assert.match(reminder("plan-granularity"), /avoid microtasks and recursive sub-plans/);
  assert.doesNotMatch(reminder("plan-granularity"), /Failing phases/);
  assert.match(reminder("ui-wireframe-protocol"), /fitting.*actual component owners/);
  assert.doesNotMatch(reminder("ui-wireframe-protocol"), /ASCII wireframe|with tiers/);
  assert.match(reminder("sequential-thinking-protocol"), /implicitly when visible markers would clutter/);
  assert.doesNotMatch(reminder("output-quality-principles"), />=8|first and last 5/);
});
