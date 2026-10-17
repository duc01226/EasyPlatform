import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { carrierTestProfile, diskReader, readSpecCarriers, skipMissingCarrierParsers, withTempProject, writeProjectFile } from "./support/spec-carrier-test-support.mjs";

const require = createRequire(import.meta.url);
const owner = "specs/operations/021-queue.md";
const yamlFile = "contract-data/operations/document.yaml";
const yamlSource = `scenario_ref: SCN-OPS-1\nlifecycle: reviewed\ncoverage:\n  rules: [operations/021 REQ-1]\n  criteria: [operations/021 AC-1]\nexamples:\n  - name: queued\n    given: { quantity: 2 }\n    then: { accepted: true }\n`;

async function readFixture(t, executorSource) {
  return withTempProject(t, async rootDir => {
    const executorFile = "checks/operations/document.test.ts";
    await writeProjectFile(rootDir, owner, "# Queue contract\n");
    await writeProjectFile(rootDir, yamlFile, yamlSource);
    await writeProjectFile(rootDir, executorFile, executorSource);
    const result = await readSpecCarriers({
      rootDir, profile: carrierTestProfile, selectedFiles: [yamlFile, executorFile], readText: diskReader(rootDir),
    });
    return { result, executorFile };
  });
}

test("direct parseDocument output cannot prove a plain-object list adapter", async t => {
  // Given: YAML parsed as a Document, whose top-level case lists are available only through toJS().
  // When: the source reads `document.examples` without converting the Document.
  // Then: the public reader emits no YAML carrier row and retains UNKNOWN for the executor.
  // Business Intent / Invariant Guarded: an API result shape must match the fields claimed by its adapter.
  // Failure Signal: any row or missing UNKNOWN is a fabricated coverage relation.
  if (skipMissingCarrierParsers(t, "typescript", "yaml")) return;
  const document = require("yaml").parseDocument(yamlSource); // portability:optional-adopter-dependency
  assert.equal(document.examples, undefined);
  assert.equal(document.toJS().examples[0].name, "queued");
  const { result, executorFile } = await readFixture(t, `
import { parseDocument } from 'yaml'; import { readFileSync } from 'node:fs'; import path from 'node:path';
const yamlPath = path.resolve(__dirname, '../../contract-data/operations/document.yaml');
const document = parseDocument(readFileSync(yamlPath, 'utf8'));
const cases = [...document.examples].map(row => adapt(row));
`);

  assert.deepEqual(result.records.filter(record => record.dialect === "yaml-cases-v1"), []);
  assert.ok(result.unknown.some(item => item.file === executorFile && item.code === "UNRESOLVED_EXECUTOR"));
});

test("parseDocument toJS normalization links only its own configured YAML lists", async t => {
  // Given: the same parser and file imports with the Document converted to its plain value.
  // When: the adapter uses the normalized declaration's configured `examples` list.
  // Then: one YAML row links to this selected executor with no UNKNOWN result.
  // Business Intent / Invariant Guarded: supported normalization preserves exact parser-to-adapter identity.
  // Failure Signal: a missing row, wrong executor, or unresolved diagnostic breaks the public contract.
  if (skipMissingCarrierParsers(t, "typescript", "yaml")) return;
  const { result, executorFile } = await readFixture(t, `
import { parseDocument } from 'yaml'; import { readFileSync } from 'node:fs'; import path from 'node:path';
const yamlPath = path.resolve(__dirname, '../../contract-data/operations/document.yaml');
const contract = parseDocument(readFileSync(yamlPath, 'utf8')).toJS();
const cases = [...contract.examples].map(row => adapt(row));
`);
  const rows = result.records.filter(record => record.dialect === "yaml-cases-v1");

  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].executors.map(executor => executor.file), [executorFile]);
  assert.deepEqual(result.unknown, []);
});
