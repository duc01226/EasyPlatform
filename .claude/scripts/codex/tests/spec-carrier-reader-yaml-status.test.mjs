import test from "node:test";
import assert from "node:assert/strict";
import { carrierTestProfile, diskReader, readSpecCarriers, skipMissingCarrierParsers, withTempProject, writeProjectFile } from "./support/spec-carrier-test-support.mjs";

test("a YAML status outside the adopter's configured lifecycle stays UNKNOWN", async t => {
  // Given: a valid adopter profile whose configured status field allows `reviewed`, and a row marked `accepted`.
  // When: the selected YAML carrier is read.
  // Then: no row is emitted and its status span reports the observed and allowed lifecycle values.
  // Business Intent / Invariant Guarded: status eligibility is project-configured and never guessed.
  // Failure Signal: accepting the row or omitting either lifecycle value from the diagnostic fails this test.
  if (skipMissingCarrierParsers(t, "yaml")) return;
  await withTempProject(t, async rootDir => {
    const file = "contract-data/queue/unreviewed.yml";
    const profile = structuredClone(carrierTestProfile);
    const yamlCarrier = profile.specArtifacts.carriers.find(carrier => carrier.dialect === "yaml-cases-v1");
    yamlCarrier.fields.status = "review";
    yamlCarrier.acceptedStatuses = ["reviewed"];
    await writeProjectFile(rootDir, "specs/operations/021-queue.md", "# Queue contract\n");
    await writeProjectFile(rootDir, file, `scenario_ref: SCN-OPS-1\nreview: accepted\ncoverage:\n  rules: [operations/021 REQ-1]\n  criteria: [operations/021 AC-1]\nexamples:\n  - name: queued\n    given: { quantity: 2 }\n    then: { accepted: true }\n`);
    const result = await readSpecCarriers({ rootDir, profile, selectedFiles: [file], readText: diskReader(rootDir) });

    assert.deepEqual(result.records, []);
    assert.ok(result.unknown.some(item => item.file === file && item.span
      && item.reason.includes("reviewed") && item.reason.includes("accepted")));
  });
});
