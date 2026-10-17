import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const readerPath = path.join(repoRoot, ".claude/scripts/codex/read-workflow-entry.mjs");
const expectedApplicability = {
  when: "The work has a commercial market and either this product's addressable market is not already sized or this feature changes that sizing.",
  skipReason: "This scope has no commercial market to size (for example, an internal tool, migration, or infrastructure-only change), or this product's addressable market is already sized and unchanged by this feature.",
};
const expectedSequence = [
  "initiative", "web-research --chain=deep-dive", "market-analysis", "business-evaluation",
  "spec [mode=discovery]", "domain-analysis", "tech-stack-research", "architecture --mode=design",
  "architecture --mode=scalability", "why-review", "scenario", "plan", "plan --mode=review",
  "work-item --mode=refine", "work-item --mode=review --type=task", "work-item --mode=challenge --reuse=task-review", "work-item --mode=story",
  "work-item --mode=dor --reuse=task-review", "work-item --mode=mockup --explore", "spec", "spec [mode=tests]", "work-item --mode=review --type=spec-tests",
  "spec [mode=clarify]", "plan", "plan --mode=review", "plan --mode=validate", "scaffold", "architecture --mode=review",
  "scan-all --targets=ui-system,backend-patterns,integration-tests,project-structure", "plan --mode=execute", "seed-test-data",
  "integration-test", "spec [mode=sync]", "workflow-review-changes --tests=defer", "integration-test --mode=verify",
  "workflow-e2e --source=context", "test --proven=@verify", "workflow-end", "watzup",
];

async function readBigFeatureWorkflow() {
  const { stdout } = await execFileAsync(process.execPath, [readerPath, "workflow-big-feature"], { cwd: repoRoot });
  return JSON.parse(stdout);
}

function findMarketOccurrence(workflow) {
  return workflow.occurrences.find((occurrence) => occurrence.skill === "market-analysis");
}

function normalizeStep(step) {
  return typeof step === "string" ? step : `${step.skill}${step.args ? ` ${step.args}` : ""}`;
}

function runMatchesFixture(applicability, fixture) {
  const hasCommercialMarketClause = applicability.when.includes("The work has a commercial market and");
  const notYetSizedClause = applicability.when.includes("addressable market is not already sized");
  const changedSizingClause = applicability.when.includes("this feature changes that sizing");
  const notYetSized = fixture.addressableMarketAlreadySized === false && notYetSizedClause;
  const changedSizing = fixture.featureChangesSizing === true && changedSizingClause;
  return hasCommercialMarketClause && fixture.hasCommercialMarket === true && (notYetSized || changedSizing);
}

function skipMatchesFixture(applicability, fixture) {
  const noMarketClause = applicability.skipReason.includes("no commercial market to size");
  const unchangedSizingClause = applicability.skipReason.includes("already sized and unchanged by this feature");
  const noMarket = fixture.hasCommercialMarket === false && noMarketClause;
  const alreadySizedAndUnchanged = fixture.addressableMarketAlreadySized === true &&
    fixture.featureChangesSizing === false && unchangedSizingClause;
  return noMarket || alreadySizedAndUnchanged;
}

test("market-analysis occurrence pins exact applicability text", async () => {
  // Given: read-workflow-entry returns the normalized Big Feature occurrence metadata.
  const workflow = await readBigFeatureWorkflow();
  const occurrence = findMarketOccurrence(workflow);

  // When: selecting the applicability contract for the sole market-analysis occurrence.
  const applicability = occurrence?.applicability;

  // Then: both complete registry values remain exact and hand-authored.
  assert.deepEqual(applicability, expectedApplicability);
});

test("market-analysis applicability satisfies the complete decision table", async () => {
  // Given: the normalized market-analysis applicability and four contrasting scopes.
  const workflow = await readBigFeatureWorkflow();
  const applicability = findMarketOccurrence(workflow)?.applicability;
  const cases = [
    { fixture: { hasCommercialMarket: false, addressableMarketAlreadySized: true, featureChangesSizing: true }, expected: [false, true] },
    { fixture: { hasCommercialMarket: true, addressableMarketAlreadySized: false, featureChangesSizing: false }, expected: [true, false] },
    { fixture: { hasCommercialMarket: true, addressableMarketAlreadySized: true, featureChangesSizing: true }, expected: [true, false] },
    { fixture: { hasCommercialMarket: true, addressableMarketAlreadySized: true, featureChangesSizing: false }, expected: [false, true] },
  ];

  // When: evaluate run and skip clauses for no-market-with-change, new, changed, and unchanged scopes.
  const actual = cases.map(({ fixture }) => [
    runMatchesFixture(applicability, fixture),
    skipMatchesFixture(applicability, fixture),
  ]);

  // Then: only new/changed commercial sizing runs; both no-market and unchanged sizing skip.
  assert.deepEqual(actual, cases.map(({ expected }) => expected));
});

test("market-analysis parity, consumer obligations, and all workflow steps stay aligned", async () => {
  // Given: the normalized workflow entry and its skill/evaluation consumers.
  const workflow = await readBigFeatureWorkflow();
  const occurrence = findMarketOccurrence(workflow);
  const skillPath = path.join(repoRoot, ".claude/skills/workflow-big-feature/SKILL.md");
  const evaluationPath = path.join(repoRoot, ".claude/skills/business-evaluation/SKILL.md");
  const [skill, evaluationSkill] = await Promise.all([
    fs.readFile(skillPath, "utf8"), fs.readFile(evaluationPath, "utf8"),
  ]);

  // When: compare declared applicability, required consumer guidance, and ordered skill identities.
  const { when, skipReason } = occurrence.applicability;
  const sequence = workflow.sequence.map(normalizeStep);
  const skillChain = sequence.map((step) => `/${step}`).join(" -> ");
  const mandatoryChains = [...skill.matchAll(/^\*\*IMPORTANT MANDATORY Steps:\*\* (.+)$/gm)].map((match) => match[1]);
  const displayChains = [...skill.matchAll(/^\*\*Steps:\*\* (.+)$/gm)];

  // Then: registry and skill agree, evaluation does not re-derive, research gates remain, and no step moves.
  assert.equal(skill.split(when).length - 1, 1);
  assert.equal(skill.split(skipReason).length - 1, 1);
  assert.match(skill, /every market-sizing figure N\/A with the exact skip reason/i);
  assert.match(skill, /never waives `\/web-research --chain=deep-dive`.*required user confirmations/i);
  assert.match(evaluationSkill, /mark every market-sizing figure.*N\/A with that reason/i);
  assert.match(evaluationSkill, /NEVER re-derive sizing/);
  assert.match(workflow.preActions.injectContext, /research phase .* is validated with the user once via ask user question tool, and the business case gets one go\/no-go confirmation/);
  assert.equal(sequence.length, 39);
  assert.deepEqual(sequence, expectedSequence);
  assert.equal(sequence[sequence.indexOf("market-analysis") + 1], "business-evaluation");
  // The registry owns the chain; the skill carries exactly ONE parity line (the verifier parses it) and no display copy.
  assert.deepEqual(mandatoryChains, [skillChain]);
  assert.equal(displayChains.length, 0);
});
