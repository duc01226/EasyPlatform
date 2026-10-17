import test from "node:test";
import assert from "node:assert/strict";
import { carrierTestProfile, diskReader, readSpecCarriers, skipMissingCarrierParsers, withTempProject, writeProjectFile } from "./support/spec-carrier-test-support.mjs";

test("no native profile preserves caller-owned strict-default behavior without reading native carriers", async t => {
  await withTempProject(t, async rootDir => {
    let calls = 0;
    const result = await readSpecCarriers({
      rootDir,
      profile: { specRoots: { business: { path: "specs" } } },
      selectedFiles: ["checks/example.test.js"],
      readText: async () => { calls += 1; return "should not be read"; },
    });

    assert.deepEqual(result.records, []);
    assert.deepEqual(result.unknown, []);
    assert.equal(result.selectedCount, 1);
    assert.equal(result.readCount, 0);
    assert.equal(calls, 0, "the strict-default TC/TestSpec mapper remains the caller's unchanged owner");
  });
});

test("js-title-v1 inherits the nearest suite owner and requirement while repeated scenarios remain separate coverage", async t => {
  if (skipMissingCarrierParsers(t, "typescript")) return;
  await withTempProject(t, async rootDir => {
    const file = "checks/guide.test.js";
    await writeProjectFile(rootDir, "specs/catalog/043-interactive-guide.md", "# Interactive guide\n");
    await writeProjectFile(rootDir, file, `
describe('catalog/043 REQ-9', () => {
  it('SCN-005: first entry', () => {});
  it('SCN-005: second entry', () => {});
  it('SCN-005: third entry', () => {});
});
`);
    const result = await readSpecCarriers({ rootDir, profile: carrierTestProfile, selectedFiles: [file], readText: diskReader(rootDir) });
    const selected = result.records.filter(record => record.dialect === "js-title-v1" && record.scenarioId === "SCN-005");

    assert.equal(selected.length, 3);
    assert.ok(selected.every(record => record.ownerPath === "specs/catalog/043-interactive-guide.md"));
    assert.ok(selected.every(record => record.requirementIds.includes("REQ-9")));
    assert.equal(new Set(selected.map(record => record.sourceSpan.start)).size, 3, "each test declaration keeps its own source identity");
    assert.ok(!result.unknown.some(item => item.file === file));
  });
});

test("js-keyed-cases-v1 preserves configured variants and links them to their aggregate executor", async t => {
  if (skipMissingCarrierParsers(t, "typescript")) return;
  await withTempProject(t, async rootDir => {
    const file = "checks/batch.test.js";
    await writeProjectFile(rootDir, "specs/catalog/040-batch-processing.md", "# Batch processing\n");
    await writeProjectFile(rootDir, file, `
const cases = [
  { variant: 'base', scenario: 'SCN-BATCH-003', requirements: 'catalog/040 REQ-14', rationale: 'base case', input: { row: 1 } },
  { variant: 'empty', scenario: 'SCN-BATCH-003', requirements: 'catalog/040 REQ-14', rationale: 'empty input', input: { row: 2 } },
  { variant: 'retry', scenario: 'SCN-BATCH-003', requirements: 'catalog/040 REQ-14', rationale: 'retry path', input: { row: 3 } },
  { variant: 'partial', scenario: 'SCN-BATCH-004', requirements: 'catalog/040 REQ-14', rationale: 'partial batch', input: { row: 4 } },
  { variant: 'complete', scenario: 'SCN-BATCH-005', requirements: 'catalog/040 REQ-14', rationale: 'complete batch', input: { row: 5 } },
  { variant: 'duplicate', scenario: 'SCN-BATCH-006', requirements: 'catalog/040 REQ-14', rationale: 'duplicate row', input: { row: 6 } },
  { variant: 'delayed', scenario: 'SCN-BATCH-007', requirements: 'catalog/040 REQ-14', rationale: 'delayed row', input: { row: 7 } },
  { variant: 'recovered', scenario: 'SCN-BATCH-008', requirements: 'catalog/040 REQ-14', rationale: 'recovered row', input: { row: 8 } },
];
describe('catalog/040 REQ-14', () => {
  it('executes all variants', () => cases.forEach(run));
});
describe('catalog/040', () => {
  it('SCN-ORPHAN-009: case missing a requirement reference', () => {});
});
`);
    const result = await readSpecCarriers({ rootDir, profile: carrierTestProfile, selectedFiles: [file], readText: diskReader(rootDir) });
    const keyed = result.records.filter(record => record.dialect === "js-keyed-cases-v1");

    assert.equal(keyed.length, 8);
    assert.equal(new Set(keyed.map(record => record.variantId)).size, 8);
    assert.equal(keyed.filter(record => record.scenarioId === "SCN-BATCH-003").length, 3);
    assert.ok(keyed.every(record => record.ownerPath === "specs/catalog/040-batch-processing.md"));
    assert.ok(keyed.every(record => record.executor?.kind === "test-call-binding-reference"));
    assert.equal(new Set(keyed.map(record => record.executor.sourceSpan.start)).size, 1, "the aggregate call owns the listed variants");
    assert.ok(keyed.every(record => record.sourceSpans.input?.start < record.sourceSpans.input?.end));
    assert.ok(keyed.every(record => !Object.hasOwn(record, "executionResult") && !Object.hasOwn(record, "status")));
    assert.ok(result.unknown.some(item => item.reason.includes("requirement reference") && item.file === file),
      "a standalone scenario without an inherited requirement remains UNKNOWN");
  });
});
