import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { carrierTestProfile, diskReader, readSpecCarriers, skipMissingCarrierParsers, withTempProject, writeProjectFile } from "./support/spec-carrier-test-support.mjs";

test("dynamic titles, computed metadata and ownerless references stay UNKNOWN instead of disappearing", async t => {
  if (skipMissingCarrierParsers(t, "typescript")) return;
  await withTempProject(t, async rootDir => {
    const file = "checks/unit/invalid.spec.js";
    await writeProjectFile(rootDir, "spec-library/ledger/019-ledger.md", "# Ledger\n");
    await writeProjectFile(rootDir, file, `
// it('CASE-900 fake comment', () => {});
const cases = [
  { id: 'valid', scn: 'CASE-1', reqs: 'ledger/019 RULE-1', why: 'valid literal', input: makeInput() },
  { [computed]: 'hidden metadata', scn: 'CASE-2', reqs: 'ledger/019 RULE-1', why: 'bad', input: makeInput() },
];
describe('ledger (ledger/019 RULE-1)', () => {
  it('CASE-1: static case', () => { cases.map(item => item.input); });
  it('also consumes cases', () => cases.map(item => item.input));
  it(\`CASE-\${suffix}\`, () => {});
});
it('CASE-3: ownerless selected case', () => {});
`);
    const profile = {
      specRoots: { business: { path: "spec-library", authorship: "hand" } },
      specArtifacts: {
        version: 1,
        kind: "engineering-contract",
        sections: { intent: ["Intent"], contracts: ["Contract"], evidence: ["Proof"] },
        identifiers: {
          requirement: { prefix: "RULE-", grammar: "decimal-lower-suffix" },
          acceptance: { prefix: "CHECK-", grammar: "decimal-lower-suffix" },
          scenario: { prefix: "CASE-", grammar: "hyphen-tokens" },
        },
        ownership: "spec-path-and-case-id",
        carriers: [
          { dialect: "js-title-v1", roots: ["checks"], extensions: [".spec.js"], suiteCalls: ["describe"], caseCalls: ["it"] },
          { dialect: "js-keyed-cases-v1", roots: ["checks"], extensions: [".spec.js"], binding: "cases", fields: { variant: "id", scenario: "scn", requirements: "reqs", rationale: "why", input: "input" } },
        ],
      },
    };
    const result = await readSpecCarriers({ rootDir, profile, selectedFiles: [file], readText: diskReader(rootDir) });

    assert.ok(result.unknown.some(item => item.reason.includes("computed case metadata")));
    assert.ok(result.unknown.some(item => item.reason.includes("dynamic or compound test title")));
    assert.ok(result.unknown.some(item => item.reason.includes("no explicit or inherited canonical spec owner") && item.file === file), "CASE-3 has no owner and remains visible as UNKNOWN");
    assert.ok(!result.records.some(record => record.scenarioId === "CASE-900"), "comment text is not a test declaration");
    assert.ok(!result.records.some(record => record.variantId === "hidden metadata"));
    assert.ok(result.unknown.some(item => item.code === "UNKNOWN" && item.reason.includes("multiple possible test executors") && item.file === file));
  });
});

test("duplicate owner+scenario+variant rows are excluded from records and reported explicitly", async t => {
  if (skipMissingCarrierParsers(t, "typescript")) return;
  await withTempProject(t, async rootDir => {
    const file = "checks/duplicate.spec.js";
    await writeProjectFile(rootDir, "spec-library/payments/017-owner.md", "# Payments\n");
    await writeProjectFile(rootDir, file, `
const rows = [
  { id: 'same', scn: 'CASE-4', reqs: 'payments/017 RULE-4', why: 'first', input: one() },
  { id: 'same', scn: 'CASE-4', reqs: 'payments/017 RULE-4', why: 'second', input: two() },
];
describe('payments (payments/017 RULE-4)', () => {
  it('runs rows', () => rows.forEach(run));
});
`);
    const profile = {
      specRoots: { business: { path: "spec-library", authorship: "hand" } },
      specArtifacts: {
        version: 1, kind: "engineering-contract",
        sections: { intent: ["Intent"], contracts: ["Contract"], evidence: ["Proof"] },
        identifiers: { requirement: { prefix: "RULE-", grammar: "decimal-lower-suffix" }, acceptance: { prefix: "CHECK-", grammar: "decimal-lower-suffix" }, scenario: { prefix: "CASE-", grammar: "hyphen-tokens" } },
        ownership: "spec-path-and-case-id",
        carriers: [
          { dialect: "js-title-v1", roots: ["checks"], extensions: [".spec.js"], suiteCalls: ["describe"], caseCalls: ["it"] },
          { dialect: "js-keyed-cases-v1", roots: ["checks"], extensions: [".spec.js"], binding: "rows", fields: { variant: "id", scenario: "scn", requirements: "reqs", rationale: "why", input: "input" } },
        ],
      },
    };
    const result = await readSpecCarriers({ rootDir, profile, selectedFiles: [file], readText: diskReader(rootDir) });

    assert.deepEqual(result.records, []);
    assert.equal(result.unknown.filter(item => item.code === "DUPLICATE_IDENTITY").length, 2);
  });
});

test("configured identifier prefixes and grammars remain adopter-owned after context extraction", async t => {
  if (skipMissingCarrierParsers(t, "typescript")) return;
  await withTempProject(t, async rootDir => {
    const ownerPath = "specs/library/043-adopter-carriers.md";
    const file = "checks/context.spec.js";
    await writeProjectFile(rootDir, ownerPath, "# Adopter carriers\n");
    await writeProjectFile(rootDir, file, `
describe('library/043 RULE-1 CHECK-2a', () => {
  it('CASE-auth-1 valid', () => {});
  it('CASE-auth--2 malformed', () => {});
});
`);
    const profile = structuredClone(carrierTestProfile);
    profile.specArtifacts.identifiers = {
      requirement: { prefix: "RULE-", grammar: "decimal-lower-suffix" },
      acceptance: { prefix: "CHECK-", grammar: "decimal-lower-suffix" },
      scenario: { prefix: "CASE-", grammar: "hyphen-tokens" },
    };
    profile.specArtifacts.carriers = [
      { dialect: "js-title-v1", roots: ["checks"], extensions: [".spec.js"], suiteCalls: ["describe"], caseCalls: ["it"] },
    ];

    const result = await readSpecCarriers({ rootDir, profile, selectedFiles: [file], readText: diskReader(rootDir) });

    assert.equal(result.records.length, 1);
    assert.equal(result.records[0].scenarioId, "CASE-auth-1");
    assert.equal(result.records[0].ownerPath, ownerPath);
    assert.deepEqual(result.records[0].requirementIds, ["RULE-1"]);
    assert.deepEqual(result.records[0].acceptanceIds, ["CHECK-2a"]);
    assert.ok(result.unknown.some(item => item.reason === "test title contains a malformed configured scenario identifier"));
  });
});

test("malformed JavaScript reports UNKNOWN with a source span", async t => {
  if (skipMissingCarrierParsers(t, "typescript")) return;
  const malformedFile = "checks/malformed-ast.test.js";
  await withTempProject(t, async rootDir => {
    const malformed = await readSpecCarriers({
      rootDir,
      profile: carrierTestProfile,
      selectedFiles: [malformedFile],
      listFiles: async () => [malformedFile],
      readText: async () => "describe('catalog/040 REQ-14', () => { it('SCN-BATCH-001', () => {});",
    });
    assert.deepEqual(malformed.records, []);
    assert.ok(malformed.unknown.some(item => item.code === "UNKNOWN" && item.file === malformedFile && item.span));
  });
});

test("an unavailable TypeScript parser reports MISSING_PARSER", async () => {
  const missingFile = "checks/missing-parser.test.ts";
  const missing = await readSpecCarriers({
    rootDir: path.join(os.tmpdir(), `framework-fit-no-typescript-${process.pid}`),
    profile: carrierTestProfile,
    selectedFiles: [missingFile],
    listFiles: async () => [missingFile],
    readText: async () => "describe('SCN-BATCH-001', () => {});",
  });
  assert.deepEqual(missing.records, []);
  assert.ok(missing.unknown.some(item => item.code === "MISSING_PARSER" && item.file === missingFile));
});
