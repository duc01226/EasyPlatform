import test from "node:test";
import assert from "node:assert/strict";
import { diskReader, readSpecCarriers, carrierTestProfile, skipMissingCarrierParsers, withTempProject, writeProjectFile } from "./support/spec-carrier-test-support.mjs";

const owner = "specs/operations/021-queue.md";
const yamlFile = "contract-data/operations/shadowed.yaml";
const yamlSource = `
scenario_ref: SCN-OPS-1
lifecycle: reviewed
coverage:
  rules: [operations/021 REQ-1]
  criteria: [operations/021 AC-1]
examples:
  - name: queued
    given: { quantity: 2 }
    then: { accepted: true }
`;

async function assertUnresolved(t, executorSource, executorFile = "checks/operations/shadowed.test.js") {
  if (skipMissingCarrierParsers(t, "typescript", "yaml")) return;
  await withTempProject(t, async rootDir => {
    await writeProjectFile(rootDir, owner, "# Queue contract\n");
    await writeProjectFile(rootDir, yamlFile, yamlSource);
    await writeProjectFile(rootDir, executorFile, executorSource);
    const result = await readSpecCarriers({
      rootDir, profile: carrierTestProfile, selectedFiles: [yamlFile, executorFile], readText: diskReader(rootDir),
    });
    assert.deepEqual(result.records.filter(record => record.dialect === "yaml-cases-v1"), []);
    assert.ok(executorSource.includes("from 'yaml'") && result.unknown.some(item => item.file === executorFile && item.code === "UNRESOLVED_EXECUTOR"), "path/shadow fixture must include the real parser import");
  });
}

async function assertResolved(t, executorSource, executorFile = "checks/operations/shadowed.test.ts") {
  if (skipMissingCarrierParsers(t, "typescript", "yaml")) return;
  await withTempProject(t, async rootDir => {
    await writeProjectFile(rootDir, owner, "# Queue contract\n");
    await writeProjectFile(rootDir, yamlFile, yamlSource);
    await writeProjectFile(rootDir, executorFile, executorSource);
    const result = await readSpecCarriers({
      rootDir, profile: carrierTestProfile, selectedFiles: [yamlFile, executorFile], readText: diskReader(rootDir),
    });
    const yamlRecords = result.records.filter(record => record.dialect === "yaml-cases-v1");
    assert.equal(yamlRecords.length, 1);
    assert.ok(executorSource.includes("from 'yaml'") && yamlRecords[0].executors.some(executor => executor.file === executorFile), "positive fixture must use the configured parser import");
  });
}

test("a nested path binding that shadows the Node import cannot establish executor evidence", async t => {
  // Given: a YAML loader whose local `path` shadows the imported Node namespace.
  // When: executor provenance is read from syntax only.
  // Then: the shadowed call remains unresolved and contributes no YAML coverage.
  // Business Intent / Invariant Guarded: executor evidence names only a statically proven runtime path.
  // Failure Signal: any YAML record or missing unresolved-executor finding indicates a false link.
  await assertUnresolved(t, `
import { readFileSync } from 'node:fs'; import path from 'node:path'; import { parse } from 'yaml';
function load() {
  const path = { resolve: () => process.env.CONTRACT_PATH };
  const contractPath = path.resolve(__dirname, '../../contract-data/operations/shadowed.yaml');
  const contract = parse(readFileSync(contractPath, 'utf8'));
  const cases = [...contract.examples].map(row => adapt(row));
}
`);
});

test("shadowed source-directory aliases cannot be mistaken for immutable path inputs", async t => {
  // Given: module-level path aliases shadowed by parameters at the path call site.
  // When: the reader resolves the apparent Node path expression.
  // Then: it leaves the configured YAML executor unresolved.
  // Business Intent / Invariant Guarded: only immutable, unshadowed path components establish provenance.
  // Failure Signal: a YAML record means a shadowed parameter was replaced with an unrelated module binding.
  await assertUnresolved(t, `
import { readFileSync } from 'node:fs'; import path from 'node:path'; import { parse } from 'yaml';
const root = __dirname; const suffix = '../../contract-data/operations/shadowed.yaml';
function load(root, suffix) {
  const contractPath = path.resolve(root, suffix);
  const contract = parse(readFileSync(contractPath, 'utf8'));
  const cases = [...contract.examples].map(row => adapt(row));
}
`);
});

test("a shadowed parsed-contract binding cannot join an unrelated adapter", async t => {
  // Given: a statically loaded contract and a different function parameter with the same name.
  // When: YAML executor and list-adapter bindings are joined.
  // Then: the ambiguous contract name cannot prove that the adapter consumes the loaded YAML.
  // Business Intent / Invariant Guarded: joins preserve lexical source-binding identity.
  // Failure Signal: YAML records show the adapter parameter was conflated with the parsed contract.
  await assertUnresolved(t, `
import { readFileSync } from 'node:fs'; import path from 'node:path'; import { parse } from 'yaml';
function load() {
  const contractPath = path.resolve(__dirname, '../../contract-data/operations/shadowed.yaml');
  const contract = parse(readFileSync(contractPath, 'utf8'));
  return execute(contract);
}
function execute(contract) {
  const cases = [...contract.examples].map(row => adapt(row));
}
`);
});

test("a type-only path import cannot establish runtime YAML executor evidence", async t => {
  // Given: a TypeScript executor that uses an erased type-only path import as a runtime value.
  // When: its source is inspected without type-checking or executing it.
  // Then: the unresolved call does not become executor evidence.
  // Business Intent / Invariant Guarded: only runtime value bindings support path provenance.
  // Failure Signal: a YAML record means an erased import was mistaken for a runtime module.
  await assertUnresolved(t, `
import type path from 'node:path';
import { readFileSync } from 'node:fs'; import { parse } from 'yaml';
function load() {
  const contractPath = path.resolve(__dirname, '../../contract-data/operations/shadowed.yaml');
  const contract = parse(readFileSync(contractPath, 'utf8'));
  const cases = [...contract.examples].map(row => adapt(row));
}
`, "checks/operations/shadowed.test.ts");
});

test("a type-only alias does not shadow the runtime __dirname value", async t => {
  // Given: a TypeScript-only name shares the spelling of Node's runtime directory global.
  // When: the YAML path resolver checks the value binding used by path.resolve.
  // Then: the actual runtime global still establishes its configured executor path.
  // Business Intent / Invariant Guarded: type-space declarations cannot erase valid value-space evidence.
  // Failure Signal: a missing YAML row means a type-only alias was mistaken for a runtime shadow.
  await assertResolved(t, `
import type { Root as __dirname } from './project-types';
import { readFileSync } from 'node:fs'; import path from 'node:path'; import { parse } from 'yaml';
function load() {
  const contractPath = path.resolve(__dirname, '../../contract-data/operations/shadowed.yaml');
  const contract = parse(readFileSync(contractPath, 'utf8'));
  const cases = [...contract.examples].map(row => adapt(row));
}
`);
});

test("object destructuring cannot hide a shadowed path parameter", async t => {
  // Given: an object-bound path parameter shadows the imported Node namespace.
  // When: a YAML path is resolved inside that function.
  // Then: the apparent path call stays unresolved.
  // Business Intent / Invariant Guarded: destructured value bindings preserve lexical ownership.
  // Failure Signal: a YAML record means object binding names were omitted.
  await assertUnresolved(t, `
import { readFileSync } from 'node:fs'; import path from 'node:path'; import { parse } from 'yaml';
function load({ path }) {
  const contractPath = path.resolve(__dirname, '../../contract-data/operations/shadowed.yaml');
  const contract = parse(readFileSync(contractPath, 'utf8'));
  const cases = [...contract.examples].map(row => adapt(row));
}
`);
});

test("array destructuring cannot hide a shadowed path parameter", async t => {
  // Given: an array-bound path parameter shadows the imported Node namespace.
  // When: a YAML path is resolved inside that function.
  // Then: the apparent path call stays unresolved.
  // Business Intent / Invariant Guarded: array binding names preserve lexical ownership.
  // Failure Signal: a YAML record means array binding names were omitted.
  await assertUnresolved(t, `
import { readFileSync } from 'node:fs'; import path from 'node:path'; import { parse } from 'yaml';
function load([path]) {
  const contractPath = path.resolve(__dirname, '../../contract-data/operations/shadowed.yaml');
  const contract = parse(readFileSync(contractPath, 'utf8'));
  const cases = [...contract.examples].map(row => adapt(row));
}
`);
});

test("a local path function declaration cannot impersonate the Node namespace", async t => {
  // Given: a function-scoped declaration shadows the module-level Node path import.
  // When: that local function is used to resolve a YAML carrier path.
  // Then: no executor link is emitted from the spelling alone.
  // Business Intent / Invariant Guarded: declarations participate in value-binding identity.
  // Failure Signal: a YAML record means a shadowing function was ignored.
  await assertUnresolved(t, `
import { readFileSync } from 'node:fs'; import path from 'node:path'; import { parse } from 'yaml';
function load() {
  function path() { return { resolve: () => process.env.CONTRACT_PATH }; }
  const contractPath = path.resolve(__dirname, '../../contract-data/operations/shadowed.yaml');
  const contract = parse(readFileSync(contractPath, 'utf8'));
  const cases = [...contract.examples].map(row => adapt(row));
}
`);
});

test("a local path class declaration cannot impersonate the Node namespace", async t => {
  // Given: a function-scoped class declaration shadows the Node path import.
  // When: its static method appears to resolve a YAML carrier path.
  // Then: the reader leaves that executor unresolved.
  // Business Intent / Invariant Guarded: class declarations participate in value-binding identity.
  // Failure Signal: a YAML record means a shadowing class was ignored.
  await assertUnresolved(t, `
import { readFileSync } from 'node:fs'; import path from 'node:path'; import { parse } from 'yaml';
function load() {
  class path { static resolve() { return process.env.CONTRACT_PATH; } }
  const contractPath = path.resolve(__dirname, '../../contract-data/operations/shadowed.yaml');
  const contract = parse(readFileSync(contractPath, 'utf8'));
  const cases = [...contract.examples].map(row => adapt(row));
}
`);
});
