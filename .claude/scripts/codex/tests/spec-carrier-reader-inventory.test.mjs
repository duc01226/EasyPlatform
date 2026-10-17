import test from "node:test";
import assert from "node:assert/strict";
import {
  diskReader,
  rawReadSpecCarriers,
  readSpecCarriers,
  skipMissingCarrierParsers,
  withTempProject,
  writeProjectFile,
} from "./support/spec-carrier-test-support.mjs";

const yamlCarrier = {
  dialect: "yaml-cases-v1", roots: ["spec-library"], extensions: [".yaml"],
  fields: { scenario: "id", status: "status", requirements: "covers.requirements", acceptance: "covers.acceptance_criteria", lists: ["cases", "reconciliation"], variant: "id", input: "input", expected: "expected" },
};
const jsCarrier = {
  dialect: "js-title-v1", roots: ["checks"], extensions: [".spec.js"], suiteCalls: ["describe"], caseCalls: ["it"],
};
const profileFor = carriers => ({
  specRoots: { business: { path: "spec-library", authorship: "hand" } },
  specArtifacts: {
    version: 1, kind: "engineering-contract",
    sections: { intent: ["Intent"], contracts: ["Contract"], evidence: ["Proof"] },
    identifiers: {
      requirement: { prefix: "RULE-", grammar: "decimal-lower-suffix" },
      acceptance: { prefix: "CHECK-", grammar: "decimal-lower-suffix" },
      scenario: { prefix: "CASE-", grammar: "hyphen-tokens" },
    },
    ownership: "spec-path-and-case-id",
    carriers,
  },
});

test("omitting a YAML executor from selectedFiles does not infer coverage from a scenario title", async t => {
  if (skipMissingCarrierParsers(t, "yaml")) return;
  await withTempProject(t, async rootDir => {
    const yamlFile = "spec-library/accounts/031/contract.yaml";
    await writeProjectFile(rootDir, "spec-library/accounts/031-owner.md", "# Account spec\n");
    const yaml = [
      "id: CASE-3", "status: approved", "covers:", "  requirements: [accounts/031 RULE-3]",
      "  acceptance_criteria: [accounts/031 CHECK-3]", "cases:", "  - id: first",
      "    input: { amount: 1 }", "    expected: { ok: true }", "reconciliation: []", "",
    ].join("\n");
    await writeProjectFile(rootDir, yamlFile, yaml);
    await writeProjectFile(rootDir, "checks/contract.spec.js", "describe('CASE-3', () => { it('reads data', () => {}); });\n");
    const result = await readSpecCarriers({ rootDir, profile: profileFor([jsCarrier, yamlCarrier]), selectedFiles: [yamlFile], readText: diskReader(rootDir) });

    assert.deepEqual(result.records, []);
    assert.ok(result.unknown.some(item => item.code === "UNRESOLVED_EXECUTOR"));
  });
});

test("an unreadable selected native file and an aliased YAML carrier remain UNKNOWN", async t => {
  if (skipMissingCarrierParsers(t, "yaml")) return;
  await withTempProject(t, async rootDir => {
    const profile = profileFor([yamlCarrier]);
    const missing = "spec-library/missing.yaml";
    const unreadable = await rawReadSpecCarriers({
      rootDir, profile, selectedFiles: [missing], listFiles: async () => [missing], readText: async () => null,
      resolvePhysicalPath: async () => null,
    });
    assert.ok(unreadable.unknown.some(item => item.code === "UNREADABLE_SOURCE"));

    await writeProjectFile(rootDir, "spec-library/ops/021-owner.md", "# Owner\n");
    const yamlFile = "spec-library/ops/contracts.yaml";
    const yaml = [
      "id: CASE-2", "status: approved", "covers:", "  requirements: [ops/021 RULE-2]",
      "  acceptance_criteria: [ops/021 CHECK-2]", "cases: &rows", "  - id: one",
      "    input: { value: 1 }", "    expected: { ok: true }", "reconciliation: *rows", "",
    ].join("\n");
    await writeProjectFile(rootDir, yamlFile, yaml);
    const aliased = await readSpecCarriers({ rootDir, profile, selectedFiles: [yamlFile], readText: diskReader(rootDir) });
    assert.ok(aliased.unknown.some(item => item.reason.includes("aliases")));
    assert.deepEqual(aliased.records, []);
  });
});

test("missing, malformed, or unavailable candidate inventory fails closed before reading carriers", async () => {
  const selected = "checks/carrier.spec.js";
  const invalidCases = [
    ["missing", undefined, "MISSING_INVENTORY"],
    ["non-array", async () => null, "INVALID_INVENTORY"],
    ["unsafe path", async () => ["../outside.spec.js"], "INVALID_INVENTORY"],
    ["duplicate path", async () => [selected, selected], "INVALID_INVENTORY"],
    ["throwing callback", async () => { throw new Error("candidate unavailable"); }, "INVENTORY_UNAVAILABLE"],
  ];
  for (const [label, listFiles, code] of invalidCases) {
    let reads = 0;
    const result = await rawReadSpecCarriers({
      rootDir: process.cwd(), profile: profileFor([jsCarrier]), selectedFiles: [selected], listFiles,
      readText: async () => { reads += 1; return "describe('spec accounts/031 RULE-3', () => { it('CASE-3', () => {}); });"; },
    });
    assert.deepEqual(result.records, [], label);
    assert.ok(result.unknown.some(item => item.code === code), label);
    assert.equal(reads, 0, label);
  }
});

test("selected paths absent from the candidate are UNKNOWN and never read", async t => {
  await withTempProject(t, async rootDir => {
    const file = "checks/deleted.spec.js";
    await writeProjectFile(rootDir, file, "describe('spec accounts/031 RULE-3', () => { it('CASE-3', () => {}); });");
    let reads = 0;
    const result = await rawReadSpecCarriers({
      rootDir, profile: profileFor([jsCarrier]), selectedFiles: [file], listFiles: async () => [],
      readText: async () => { reads += 1; return "worktree bytes must not be used"; },
    });
    assert.deepEqual(result.records, []);
    assert.ok(result.unknown.some(item => item.code === "SELECTED_NOT_IN_CANDIDATE"));
    assert.equal(reads, 0);
    assert.equal(result.readCount, 0);
  });
});

test("an adopter-local YAML package export boundary fails closed as MISSING_PARSER", async t => {
  await withTempProject(t, async rootDir => {
    const file = "spec-library/ops/021/contracts.yaml";
    await writeProjectFile(rootDir, "node_modules/yaml/package.json", JSON.stringify({ name: "yaml", exports: {} }));
    await writeProjectFile(rootDir, file, "id: CASE-2\nstatus: approved\ncovers: {}\ncases: []\nreconciliation: []\n");
    const result = await readSpecCarriers({ rootDir, profile: profileFor([yamlCarrier]), selectedFiles: [file], readText: diskReader(rootDir) });

    assert.deepEqual(result.records, []);
    assert.ok(result.unknown.some(item => item.code === "MISSING_PARSER" && item.file === file));
  });
});

test("owner lookup follows a candidate rename and ignores a stale worktree path", async t => {
  if (skipMissingCarrierParsers(t, "typescript")) return;
  await withTempProject(t, async rootDir => {
    const carrier = "checks/owner.spec.js";
    const oldOwner = "spec-library/catalog/040-old-owner.md";
    const newOwner = "spec-library/catalog/040-renamed-owner.md";
    const source = "describe('spec catalog/040 RULE-4', () => { it('CASE-4 is retained', () => {}); });";
    await writeProjectFile(rootDir, carrier, source);
    await writeProjectFile(rootDir, oldOwner, "# stale worktree owner\n");

    const pathsRead = [];
    const candidateRead = async relativePath => {
      pathsRead.push(relativePath);
      if (relativePath === carrier) return source;
      if (relativePath === newOwner) return "# candidate owner\n";
      if (relativePath === oldOwner) return "# stale worktree owner\n";
      return null;
    };
    const renamed = await rawReadSpecCarriers({
      rootDir, profile: profileFor([jsCarrier]), selectedFiles: [carrier],
      listFiles: async () => [carrier, newOwner], readText: candidateRead,
    });
    assert.equal(renamed.records.length, 1);
    assert.equal(renamed.records[0].ownerPath, newOwner);
    assert.ok(!pathsRead.includes(oldOwner), "the removed pre-rename path is never read");

    pathsRead.length = 0;
    const deleted = await rawReadSpecCarriers({
      rootDir, profile: profileFor([jsCarrier]), selectedFiles: [carrier],
      listFiles: async () => [carrier], readText: candidateRead,
    });
    assert.deepEqual(deleted.records, []);
    assert.ok(deleted.unknown.some(item => item.code === "UNRESOLVED_OWNER"));
    assert.ok(!pathsRead.includes(oldOwner), "a staged deletion cannot fall back to a stale worktree owner");
  });
});
