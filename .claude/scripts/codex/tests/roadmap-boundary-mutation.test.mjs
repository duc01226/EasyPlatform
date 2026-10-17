import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..", "..");
const verifierPath = path.join(repoRoot, ".claude", "scripts", "codex", "verify-sdd-semantic-compliance.mjs");

const signals = (overrides = {}) => ({
  multipleIndependentOutcomes: false,
  ambiguousOrResearchHeavy: false,
  releaseScopeDecomposition: false,
  oversizedTaskThatMustSplit: false,
  ...overrides,
});

const fullDecomposition = () => ({
  outcome_slices: [{
    id: "SLICE-001",
    outcome: "Actor completes outcome",
    releasable_when: "Visible result",
    owning_artifact: "TASK-001",
  }],
  dependencies_order: [{ before: "SLICE-001", after: "N/A", reason: "No predecessor" }],
  non_goals: [{ statement: "Later work", owner: "PO" }],
  risks_evidence: [{ risk: "Uncertainty", evidence_needed: "Observed result", status: "open", owner: "PO" }],
  deferred_work_owner: [{ item: "Later work", owner: "PO", follow_up_artifact: "TASK-002", target_slice: "N/A" }],
});

const importMutant = async (source, mutantName) => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "roadmap-boundary-mutant-"));
  const tempModule = path.join(tempRoot, "verify-sdd-semantic-compliance.mjs");
  await fs.writeFile(tempModule, source, "utf8");
  const module = await import(`${pathToFileURL(tempModule).href}?mutant=${encodeURIComponent(mutantName)}`);
  return { tempRoot, module };
};

test("roadmap boundary mutation harness kills all four named mutants", async () => {
  const source = (await fs.readFile(verifierPath, "utf8")).replaceAll("\r\n", "\n");
  const baseline = await import(pathToFileURL(verifierPath).href);

  const controls = [
    {
      name: "MUT-ROADMAP-001-no-default-writer",
      expectedCode: "ROADMAP-DEFAULT-WRITER",
      transform: (input) => input.replace("    noDefaultWriter: true,\n", ""),
      dirty: (policy) => ({
        routes: policy.defaultRouteIds.map((routeId, index) => ({
          routeId,
          sequence: index === 0 ? ["product-roadmap"] : ["isLargeIdea", "large_idea_decomposition"],
          text: "isLargeIdea large_idea_decomposition",
        })),
      }),
    },
    {
      name: "MUT-ROADMAP-002-missing-or-operand",
      expectedCode: "ROADMAP-DECOMPOSITION-SCHEMA",
      transform: (input) => input.replace('    "oversizedTaskThatMustSplit",\n', ""),
      dirty: () => ({ signals: signals({ oversizedTaskThatMustSplit: true }) }),
    },
    {
      name: "MUT-ROADMAP-003-missing-required-field",
      expectedCode: "ROADMAP-DECOMPOSITION-SCHEMA",
      transform: (input) => input
        .replace('    "deferred_work_owner",\n', "")
        .replace('  deferred_work_owner: ["item", "owner", "follow_up_artifact", "target_slice"],\n', ""),
      dirty: () => {
        const decomposition = fullDecomposition();
        delete decomposition.deferred_work_owner;
        return { signals: signals({ releaseScopeDecomposition: true }), decomposition };
      },
    },
    {
      name: "MUT-ROADMAP-004-writer-guard",
      expectedCode: "ROADMAP-EXPLICIT-ROUTE",
      transform: (input) => input.replace("    explicitRequestOnly: true,\n", ""),
      dirty: () => ({
        standalone: {
          explicitRequest: false,
          text: "product-roadmap create docs/product-roadmap.md",
        },
      }),
    },
  ];

  let killed = 0;
  const evidence = [];
  for (const control of controls) {
    const dirty = control.dirty(baseline.ROADMAP_BOUNDARY_POLICY);
    const baselineFailures = baseline.evaluateRoadmapBoundary(dirty);
    assert.ok(
      baselineFailures.some((finding) => finding.code === control.expectedCode),
      `${control.name} dirty fixture must fail before mutation`
    );

    const mutatedSource = control.transform(source);
    assert.notEqual(mutatedSource, source, `${control.name} must transform a named policy symbol`);
    const { tempRoot, module: mutated } = await importMutant(mutatedSource, control.name);
    try {
      const mutatedFailures = mutated.evaluateRoadmapBoundary(dirty);
      const mutantAcceptedDirtyFixture = !mutatedFailures.some(
        (finding) => finding.code === control.expectedCode
      );
      assert.equal(mutantAcceptedDirtyFixture, true, `${control.name} must be killed by its designated fixture`);
      killed += 1;
      evidence.push({
        mutant: control.name,
        transformed: "ROADMAP_BOUNDARY_POLICY",
        baseline: control.expectedCode,
        mutated: "accepted dirty fixture",
        assertion: "killed",
      });
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  }

  assert.equal(killed, 4);
  assert.equal(evidence.length, 4);
  console.log(`ROADMAP_BOUNDARY_MUTATION_KILL ${killed}/4 (100%)`, JSON.stringify(evidence));
});
