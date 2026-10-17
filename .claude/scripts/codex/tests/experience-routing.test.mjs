import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const workflows = JSON.parse(
  fs.readFileSync(path.join(repoRoot, ".claude", "workflows.json"), "utf8")
).workflows;

function occurrence(sequence, id) {
  return sequence.find((step) => typeof step === "object" && step?.id === id);
}

function indexOfSkill(sequence, skill) {
  const index = sequence.findIndex((step) => (typeof step === "string" ? step === skill : step?.skill === skill));
  assert.ok(index >= 0, `required workflow skill is absent: ${skill}`);
  return index;
}

test("TC-EA-ROUTE-004: removing the E2E predecessor fails the ordering oracle", () => {
  const sequence = workflows["workflow-e2e"].sequence.filter(
    (step) => (typeof step === "string" ? step : step?.skill) !== "e2e-test"
  );
  assert.throws(() => indexOfSkill(sequence, "e2e-test"), /required workflow skill is absent: e2e-test/);
});

test("TC-EA-ROUTE-001: changes review routes the conditional experience gate after final holistic review", () => {
  const workflow = workflows["workflow-review-changes"];
  const experience = occurrence(workflow.sequence, "experience-review");

  assert.ok(experience, "workflow-review-changes must declare an experience-review occurrence");
  assert.equal(experience.skill, "experience-review");
  assert.match(experience.applicability.when, /configured|likely.*observable/i);
  assert.match(experience.applicability.skipReason, /NOT-APPLICABLE/i);
  assert.match(experience.applicability.skipReason, /evidence/i);
  assert.ok(indexOfSkill(workflow.sequence, "why-review") < workflow.sequence.indexOf(experience));
  assert.ok(workflow.sequence.indexOf(experience) < workflow.sequence.indexOf(occurrence(workflow.sequence, "domain-refresh")));
  assert.match(experience.args, /--fix-loop --loop-owner=caller/, "experience review joins the coordinator loop read-only");
  assert.ok(occurrence(workflow.sequence, "domain-refresh"), "the domain refresh remains present");
});

test("TC-EA-ROUTE-002: unified E2E workflow routes authoring into one convergence loop", () => {
  const workflow = workflows["workflow-e2e"];
  const author = occurrence(workflow.sequence, "e2e-author");
  const e2eContext = workflow.preActions.injectContext;

  assert.ok(author, "workflow-e2e must declare the conditional E2E authoring occurrence");
  assert.equal(author.skill, "e2e-test");
  assert.match(author.applicability.when, /changes.*recording.*update-ui/i);
  assert.match(author.applicability.skipReason, /prompt.*context.*whole/i);
  const converge = occurrence(workflow.sequence, "e2e-converge");
  assert.ok(converge, "workflow-e2e must declare the e2e-test --mode=verify --fix-loop convergence occurrence");
  assert.equal(converge.skill, "e2e-test");
  assert.equal(converge.args, "--mode=verify --fix-loop");
  assert.ok(workflow.sequence.indexOf(author) < workflow.sequence.indexOf(converge));
  assert.ok(workflow.sequence.indexOf(converge) < indexOfSkill(workflow.sequence, "docs-manager"));
  assert.doesNotMatch(e2eContext, /workflow-e2e-green/i);
  assert.match(e2eContext, /same-scope.*rerun|same scope.*rerun/i);
  assert.match(e2eContext, /explicit acceptance/i);
  assert.match(e2eContext, /report-only.*experience-review/i);
  assert.equal(workflow.sequence.some((step) => (typeof step === "string" ? step : step?.skill) === "test"), false);
});

// Greenfield reviews its foundation through workflow-review-changes, and its first slice runs
// workflow-implement-spec --mode=greenfield-slice, so both paths carry the gate (P41 D7).
test("TC-EA-ROUTE-003: feature, bugfix, refactor, greenfield and implement-spec paths (the greenfield first slice included) inherit the gate", () => {
  for (const workflowId of [
    "workflow-feature",
    "workflow-bugfix",
    "workflow-refactor",
    "workflow-greenfield-init",
    "workflow-implement-spec",
  ]) {
    const workflow = workflows[workflowId];
    for (const sequence of [workflow.sequence, ...Object.values(workflow.variants ?? {}).map((variant) => variant.sequence)].filter(Array.isArray)) {
      assert.ok(
        indexOfSkill(sequence, "workflow-review-changes") >= 0,
        `${workflowId} must route through workflow-review-changes in every mode`
      );
    }
  }
  assert.ok(workflows["workflow-implement-spec"].variants["greenfield-slice"], "the greenfield first slice has its own implement-spec mode");
});
