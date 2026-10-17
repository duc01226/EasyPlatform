import test from "node:test";
import assert from "node:assert/strict";
import { diskReader, rawReadSpecCarriers, readSpecCarriers, recordIdentity, repoRoot, skipMissingCarrierParsers, withTempProject, writeProjectFile } from "./support/spec-carrier-test-support.mjs";

const jsFields = { variant: "key", scenario: "case", requirements: "rules", rationale: "reason", input: "given" };

function relocatedProfile(lists = ["examples", "legacy_cases"], acceptedStatuses = ["reviewed"]) {
  return {
    specRoots: {
      business: { path: "spec-library", authorship: "hand", m1Policy: "strict" },
      technical: { path: "spec-library/technical-view", authorship: "derived", m1Policy: "exempt" },
    },
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
        { dialect: "js-keyed-cases-v1", roots: ["checks"], extensions: [".spec.js"], binding: "cases", fields: { ...jsFields, variant: "id" } },
        { dialect: "yaml-cases-v1", roots: ["contract-data"], extensions: [".yml"], fields: {
          scenario: "scenario_ref", status: "review", requirements: "coverage.rules", acceptance: "coverage.criteria",
          lists, variant: "name", input: "given", expected: "then",
        }, acceptedStatuses },
      ],
    },
  };
}

const ownerSource = "# Queue contract\n";
const yamlSource = `
"<<": ordinary
scenario_ref: CASE-7-A
review: reviewed
coverage:
  rules: [ops/021 RULE-9]
  criteria: ['ops/021 CHECK-3']
examples:
  - name: yaml-variant
    given: { raw: 'data, not evaluated' }
    then: { accepted: true }
legacy_cases:
  - name: legacy-variant
    given:
      value: old
    then:
      accepted: false
`;

test("relocated adopters keep native JS cases and link YAML only through the parsed list adapter", async t => {
  // Given: an adopter with relocated roots, RULE/CHECK/CASE identifiers, renamed fields, and status `reviewed`.
  // When: its configured YAML rows are read with the statically connected JS executor.
  // Then: the native rows retain their owner, identity, status eligibility, and executor link.
  // Business Intent / Invariant Guarded: local roots, IDs, field names, and lifecycle values stay adopter-configurable.
  // Failure Signal: a path/ID/status assumption that ignores the adopter profile or an unverified executor breaks these assertions.
  if (skipMissingCarrierParsers(t, "typescript", "yaml")) return;
  await withTempProject(t, async rootDir => {
    const jsFile = "checks/unit/cases.spec.js";
    const yamlFile = "contract-data/queue/019-examples.yml";
    await writeProjectFile(rootDir, "spec-library/ops/021-queue-contract.md", ownerSource);
    await writeProjectFile(rootDir, jsFile, `
import { parse } from 'yaml';
import { readFileSync } from 'node:fs';
import path from 'node:path';
const CONTRACT_PATH = path.resolve(__dirname, '../../contract-data/queue/019-examples.yml');
const contract = parse(readFileSync(CONTRACT_PATH, 'utf8'));
const cases = [...contract.examples, ...contract.legacy_cases].map(row => adapt(row));
describe('queue contract (ops/021 RULE-9)', () => {
  it('executes the declared rows', () => cases.forEach(run));
});
`);
    await writeProjectFile(rootDir, yamlFile, yamlSource);
    const config = relocatedProfile();
    const selectedFiles = [jsFile, yamlFile];
    const first = await readSpecCarriers({ rootDir, profile: config, selectedFiles, readText: diskReader(rootDir) });
    const reversed = await readSpecCarriers({ rootDir, profile: config, selectedFiles: [...selectedFiles].reverse(), readText: diskReader(rootDir) });
    const yamlRecords = first.records.filter(record => record.dialect === "yaml-cases-v1");

    assert.equal(first.records.filter(record => record.dialect === "js-keyed-cases-v1").length, 0);
    assert.equal(yamlRecords.length, 2);
    assert.ok(first.records.every(record => record.ownerPath === "spec-library/ops/021-queue-contract.md"));
    assert.ok(first.records.every(record => record.requirementIds.includes("RULE-9")));
    assert.ok(first.records.some(record => record.acceptanceIds.includes("CHECK-3")));
    assert.ok(yamlRecords.every(record => record.executors.length === 1 && record.executors[0].file === jsFile));
    assert.deepEqual(first.records.map(recordIdentity).sort(), reversed.records.map(recordIdentity).sort());
    assert.deepEqual(first.unknown, []);

    const adapterFile = "checks/unit/adapter.spec.js";
    await writeProjectFile(rootDir, adapterFile, `
import { readFileSync } from 'node:fs'; import path from 'node:path'; import { parse } from 'yaml'; const CONTRACT_PATH = path.resolve(__dirname, '../../contract-data/queue/020-examples.yml');
const contract = parse(readFileSync(CONTRACT_PATH, 'utf8'));
const cases = [...contract.examples, ...contract.legacy_cases].map(row => adapt(row));
describe('queue adapter', () => {
  it('executes the imported examples', () => cases.forEach(run));
});
`);
    const omittedYaml = await readSpecCarriers({ rootDir, profile: config, selectedFiles: [adapterFile], readText: diskReader(rootDir) });
    assert.deepEqual(omittedYaml.records, [], "an omitted YAML adapter is not misreported as a local keyed-case carrier");
    assert.ok(omittedYaml.unknown.some(item => item.code === "SELECTION_OMISSION" && item.file === adapterFile));
  });
});

test("for-of const declarations without initializers do not abort YAML executor discovery", async t => {
  // Given: a valid YAML-backed executor with an unrelated const for-of binding.
  // When: the configured reader traverses all const declarations.
  // Then: it returns the configured YAML rows and keeps their proven executor links.
  // Business Intent / Invariant Guarded: unrelated valid TypeScript syntax cannot abort configured case evidence extraction.
  // Failure Signal: a throw, missing YAML row, or lost executor link fails these assertions.
  if (skipMissingCarrierParsers(t, "typescript", "yaml")) return;
  await withTempProject(t, async rootDir => {
    const jsFile = "checks/unit/for-of.spec.js";
    const yamlFile = "contract-data/queue/021-for-of.yml";
    await writeProjectFile(rootDir, "spec-library/ops/021-queue-contract.md", ownerSource);
    await writeProjectFile(rootDir, jsFile, `
import { parse } from 'yaml';
import { readFileSync } from 'node:fs';
import path from 'node:path';
const CONTRACT_PATH = path.resolve(__dirname, '../../contract-data/queue/021-for-of.yml');
const contract = parse(readFileSync(CONTRACT_PATH, 'utf8'));
const cases = [...contract.examples, ...contract.legacy_cases].map(row => adapt(row));
for (const row of cases) { void row; }
describe('queue contract (ops/021 RULE-9)', () => {
  it('executes the declared rows', () => cases.forEach(run));
});
`);
    await writeProjectFile(rootDir, yamlFile, yamlSource);

    const result = await readSpecCarriers({
      rootDir,
      profile: relocatedProfile(),
      selectedFiles: [jsFile, yamlFile],
      readText: diskReader(rootDir),
    });
    const yamlRecords = result.records.filter(record => record.dialect === "yaml-cases-v1");

    assert.equal(yamlRecords.length, 2);
    assert.ok(yamlRecords.every(record => record.ownerPath === "spec-library/ops/021-queue-contract.md"));
    assert.ok(yamlRecords.every(record => record.executors.length === 1 && record.executors[0].file === jsFile));
    assert.deepEqual(result.unknown, []);
  });
});

test("an incidental YAML path and unrelated cases.map stay unresolved while another keyed carrier remains extractable", async t => {
  // Given: incidental and mismatched YAML references plus an independent valid keyed case.
  // When: adapter provenance is checked against the parsed YAML binding.
  // Then: unverified YAML rows remain UNKNOWN while the independent keyed row survives.
  // Business Intent / Invariant Guarded: only proven source bindings establish carrier coverage.
  // Failure Signal: a false YAML link or suppression of the independent case changes the asserted result.
  if (skipMissingCarrierParsers(t, "typescript", "yaml")) return;
  await withTempProject(t, async rootDir => {
    const yamlFile = "contract-data/queue/020-examples.yml";
    const jsFile = "checks/unit/incidental.spec.js";
    const mismatchedFile = "checks/unit/mismatched-binding.spec.js";
    const independentFile = "checks/unit/native.spec.js";
    await writeProjectFile(rootDir, "spec-library/ops/021-queue-contract.md", ownerSource);
    await writeProjectFile(rootDir, yamlFile, yamlSource.replace("examples:", "cases:").replace("legacy_cases:\n  - name: legacy-variant\n    given:\n      value: old\n    then:\n      accepted: false\n", ""));
    await writeProjectFile(rootDir, jsFile, `
const YAML_PATH = 'contract-data/queue/020-examples.yml';
const unrelated = { cases: [{ id: 'unrelated', given: {}, then: {} }] };
const cases = unrelated.cases.map(row => row);
`);
    await writeProjectFile(rootDir, mismatchedFile, `
import { parse } from 'yaml';
import { readFileSync } from 'node:fs';
const contract = parse(readFileSync('contract-data/queue/020-examples.yml', 'utf8'));
const unrelated = { cases: [{ id: 'unrelated', given: {}, then: {} }] };
const cases = unrelated.cases.map(row => row);
`);
    await writeProjectFile(rootDir, independentFile, `
const cases = [
  { id: 'js-variant', case: 'CASE-7-A', rules: 'ops/021 RULE-9', reason: 'independent source case', given: makeInput() },
];
describe('queue cases (ops/021 RULE-9)', () => it('executes rows', () => cases.forEach(run)));
`);
    const result = await readSpecCarriers({
      rootDir, profile: relocatedProfile(["cases"]), selectedFiles: [yamlFile, jsFile, mismatchedFile, independentFile], readText: diskReader(rootDir),
    });
    const yamlRecords = result.records.filter(record => record.dialect === "yaml-cases-v1");

    assert.ok(result.records.some(record => record.dialect === "js-keyed-cases-v1" && record.variantId === "js-variant"
      && record.carrierFile === independentFile));
    assert.equal(yamlRecords.length, 0, "a YAML row without a verified executor is not emitted as covered");
    assert.ok(result.unknown.some(item => item.file === yamlFile && item.code === "UNRESOLVED_EXECUTOR"));
    assert.ok(result.unknown.some(item => item.file === jsFile && item.code === "UNRESOLVED_EXECUTOR"
      && item.reason.includes("not statically tied to a parsed contract binding")));
    assert.ok(result.unknown.some(item => item.file === jsFile && item.reason.includes("not initialized by a literal array")));
    assert.ok(result.unknown.some(item => item.file === mismatchedFile && item.code === "UNRESOLVED_EXECUTOR"
      && item.reason.includes("not statically connected to one configured list adapter binding")));
  });
});

test("dotted YAML row-list paths fail profile validation before candidate inventory or source reads", async () => {
  // Given: an unsupported dotted row-list path in an adopter profile.
  // When: the public carrier reader validates the profile.
  // Then: it reports INVALID_PROFILE before inventory or source I/O.
  // Business Intent / Invariant Guarded: unsupported profile shapes fail closed before touching candidate content.
  // Failure Signal: a missing error or any inventory/read callback fails this test.
  let inventoryCalls = 0;
  let sourceReads = 0;
  const file = "contract-data/queue/nested.yml";
  const result = await rawReadSpecCarriers({
    rootDir: repoRoot,
    profile: relocatedProfile(["cases", "contract.reconciliation"]),
    selectedFiles: [file],
    listFiles: async () => { inventoryCalls += 1; return [file]; },
    readText: async () => { sourceReads += 1; return "unread"; },
  });

  assert.deepEqual(result.records, []);
  assert.equal(result.unknown.length, 1);
  assert.equal(result.unknown[0].code, "INVALID_PROFILE");
  assert.match(result.unknown[0].reason, /fields\.lists.*literal property name path/);
  assert.equal(result.readCount, 0);
  assert.equal(inventoryCalls, 0);
  assert.equal(sourceReads, 0);
});
