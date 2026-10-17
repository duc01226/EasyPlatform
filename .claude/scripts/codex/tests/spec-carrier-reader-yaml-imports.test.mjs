import test from "node:test";
import assert from "node:assert/strict";
import { diskReader, readSpecCarriers, carrierTestProfile, skipMissingCarrierParsers, withTempProject, writeProjectFile } from "./support/spec-carrier-test-support.mjs";

const owner = "specs/operations/021-queue.md";
const yamlFile = "contract-data/operations/imports.yaml";
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

async function readFixture(t, executorSource) {
  if (skipMissingCarrierParsers(t, "typescript", "yaml")) return null;
  return withTempProject(t, async rootDir => {
    const executorFile = "checks/operations/imports.test.ts";
    await writeProjectFile(rootDir, owner, "# Queue contract\n");
    await writeProjectFile(rootDir, yamlFile, yamlSource);
    await writeProjectFile(rootDir, executorFile, executorSource);
    const result = await readSpecCarriers({
      rootDir, profile: carrierTestProfile, selectedFiles: [yamlFile, executorFile], readText: diskReader(rootDir),
    });
    return { result, executorFile };
  });
}

async function assertUnresolved(t, executorSource) {
  const fixture = await readFixture(t, executorSource);
  if (!fixture) return;
  const { result, executorFile } = fixture;
  assert.deepEqual(result.records.filter(record => record.dialect === "yaml-cases-v1"), []);
  assert.ok(result.unknown.some(item => item.file === executorFile && item.code === "UNRESOLVED_EXECUTOR"));
}

async function assertResolved(t, executorSource) {
  const fixture = await readFixture(t, executorSource);
  if (!fixture) return;
  const { result, executorFile } = fixture;
  const records = result.records.filter(record => record.dialect === "yaml-cases-v1");
  assert.equal(records.length, 1);
  assert.ok(records[0].executors.some(executor => executor.file === executorFile));
}

test("local parser and filesystem lookalikes cannot prove a YAML executor", async t => {
  // Given: a path-proven contract load with ordinary local functions named like imported helpers.
  // When: the reader inspects source without executing those helpers.
  // Then: identifier spelling alone creates no YAML executor record.
  // Business Intent / Invariant Guarded: executor evidence must originate in configured runtime modules.
  // Failure Signal: any YAML row means an unrelated helper was accepted as parser or filesystem proof.
  await assertUnresolved(t, `
import path from 'node:path';
function readFileSync(file) { return process.env.CONTRACT_TEXT; }
function parse(text) { return JSON.parse(text); }
function load() {
  const contractPath = path.resolve(__dirname, '../../contract-data/operations/imports.yaml');
  const contract = parse(readFileSync(contractPath, 'utf8'));
  const cases = [...contract.examples].map(row => adapt(row));
}
`);
});

test("a local parser shadowing a valid YAML import cannot prove the loaded contract", async t => {
  // Given: a correct YAML import that is shadowed at the call site by a local function.
  // When: the executor reader joins a static path with the parsed binding.
  // Then: the unrelated local call remains unresolved and contributes no YAML coverage.
  // Business Intent / Invariant Guarded: lexical binding identity is part of executor provenance.
  // Failure Signal: a YAML row means the import was used despite a nearer runtime declaration.
  await assertUnresolved(t, `
import { readFileSync } from 'node:fs'; import path from 'node:path'; import { parse } from 'yaml';
function load() {
  const parse = text => JSON.parse(text);
  const contractPath = path.resolve(__dirname, '../../contract-data/operations/imports.yaml');
  const contract = parse(readFileSync(contractPath, 'utf8'));
  const cases = [...contract.examples].map(row => adapt(row));
}
`);
});

test("a local filesystem shadowing a valid Node import cannot prove a YAML load", async t => {
  // Given: the correct filesystem import is shadowed by a local function at the read call.
  // When: the reader inspects the path and parser calls without running project code.
  // Then: the unresolved filesystem provenance contributes no YAML executor record.
  // Business Intent / Invariant Guarded: every source step in the static load chain has proven ownership.
  // Failure Signal: a YAML row means a local function was confused with node:fs.
  await assertUnresolved(t, `
import { readFileSync } from 'node:fs'; import path from 'node:path'; import { parse } from 'yaml';
function load() {
  function readFileSync(file) { return process.env.CONTRACT_TEXT; }
  const contractPath = path.resolve(__dirname, '../../contract-data/operations/imports.yaml');
  const contract = parse(readFileSync(contractPath, 'utf8'));
  const cases = [...contract.examples].map(row => adapt(row));
}
`);
});

test("aliased module imports still prove the same YAML executor", async t => {
  // Given: the parser and filesystem functions are statically imported under local aliases.
  // When: the reader traces those bindings to their declared modules and configured YAML path.
  // Then: the valid executor remains linked to the one YAML case row.
  // Business Intent / Invariant Guarded: safe aliasing remains portable without weakening provenance.
  // Failure Signal: a missing executor link means the import alias was not resolved correctly.
  await assertResolved(t, `
import { readFileSync as readText } from 'node:fs'; import path from 'node:path'; import { parse as parseYaml } from 'yaml';
function load() {
  const contractPath = path.resolve(__dirname, '../../contract-data/operations/imports.yaml');
  const contract = parseYaml(readText(contractPath, 'utf8'));
  const cases = [...contract.examples].map(row => adapt(row));
}
`);
});

test("namespace and CommonJS imports retain exact module provenance across unrelated scopes", async t => {
  // Given: supported ESM namespace and CommonJS module bindings plus same-spelled locals in a disjoint function.
  // When: the public reader resolves parser, filesystem, path, and contract references at their use sites.
  // Then: each valid module form links one YAML row without unrelated declarations contaminating it.
  // Business Intent / Invariant Guarded: import evidence belongs to the lexically visible runtime binding.
  // Failure Signal: a missing row exposes false scope coupling or an unrecognized supported import form.
  const sources = [
    ["ESM namespace imports with unrelated declarations", `import * as fs from 'node:fs'; import * as path from 'node:path'; import * as yaml from 'yaml';
const yamlPath = path.resolve(__dirname, '../../contract-data/operations/imports.yaml');
const contract = yaml.parse(fs.readFileSync(yamlPath, 'utf8')); const cases = [...contract.examples].map(row => adapt(row));
function unrelated() { const fs = {}; const path = {}; const yaml = {}; const yamlPath = process.env.PATH; const contract = {}; const cases = []; }`],
    ["CommonJS namespace imports", `const fs = require('fs'); const path = require('path'); const yaml = require('yaml');
const yamlPath = path.resolve(__dirname, '../../contract-data/operations/imports.yaml');
const contract = yaml.parse(fs.readFileSync(yamlPath, 'utf8')); const cases = [...contract.examples].map(row => adapt(row));`],
    ["CommonJS destructured imports", `const { readFileSync: readText } = require('node:fs'); const { parse: parseYaml } = require('yaml'); const path = require('node:path');
const yamlPath = path.resolve(__dirname, '../../contract-data/operations/imports.yaml');
const contract = parseYaml(readText(yamlPath, 'utf8')); const cases = [...contract.examples].map(row => adapt(row));`],
  ];
  for (const [name, source] of sources) await t.test(name, async subtest => assertResolved(subtest, source));
});

test("out-of-scope paths and untrusted module imports cannot create executor evidence", async t => {
  // Given: valid YAML data and apparent loads using an out-of-scope path or untrusted/type-only module provenance.
  // When: the public reader inspects each source form without executing it.
  // Then: no unsupported binding produces YAML coverage.
  // Business Intent / Invariant Guarded: spelling, type-only imports, and unrelated scopes are not runtime proof.
  // Failure Signal: any YAML row shows an unbound or untrusted value was treated as coverage evidence.
  const sources = [
    ["out-of-scope path declaration", `import { parse } from 'yaml'; import { readFileSync } from 'node:fs'; import path from 'node:path';
function unrelated() { const yamlPath = '../../contract-data/operations/imports.yaml'; }
const contract = parse(readFileSync(yamlPath, 'utf8')); const cases = [...contract.examples].map(row => adapt(row));`],
    ["wrong ESM path module", `import path from 'wrong-path'; import { parse } from 'yaml'; import { readFileSync } from 'node:fs';
const yamlPath = path.resolve(__dirname, '../../contract-data/operations/imports.yaml'); const contract = parse(readFileSync(yamlPath, 'utf8')); const cases = [...contract.examples].map(row => adapt(row));`],
    ["wrong CJS path module", `const path = require('wrong-path'); const { parse } = require('yaml'); const { readFileSync } = require('node:fs');
const yamlPath = path.resolve(__dirname, '../../contract-data/operations/imports.yaml'); const contract = parse(readFileSync(yamlPath, 'utf8')); const cases = [...contract.examples].map(row => adapt(row));`],
    ["wrong YAML parser module", `import { parse } from 'wrong-yaml'; import { readFileSync } from 'node:fs'; import path from 'node:path';
const yamlPath = path.resolve(__dirname, '../../contract-data/operations/imports.yaml'); const contract = parse(readFileSync(yamlPath, 'utf8')); const cases = [...contract.examples].map(row => adapt(row));`],
    ["wrong filesystem module", `import { parse } from 'yaml'; import { readFileSync } from 'wrong-fs'; import path from 'node:path';
const yamlPath = path.resolve(__dirname, '../../contract-data/operations/imports.yaml'); const contract = parse(readFileSync(yamlPath, 'utf8')); const cases = [...contract.examples].map(row => adapt(row));`],
    ["wrong CJS parser module", `const { parse } = require('wrong-yaml'); const { readFileSync } = require('node:fs'); const path = require('node:path');
const yamlPath = path.resolve(__dirname, '../../contract-data/operations/imports.yaml'); const contract = parse(readFileSync(yamlPath, 'utf8')); const cases = [...contract.examples].map(row => adapt(row));`],
    ["wrong CJS filesystem module", `const { parse } = require('yaml'); const { readFileSync } = require('wrong-fs'); const path = require('node:path');
const yamlPath = path.resolve(__dirname, '../../contract-data/operations/imports.yaml'); const contract = parse(readFileSync(yamlPath, 'utf8')); const cases = [...contract.examples].map(row => adapt(row));`],
    ["ESM named path member used as a namespace", `import { resolve as path } from 'node:path'; import { parse } from 'yaml'; import { readFileSync } from 'node:fs';
const yamlPath = path.resolve(__dirname, '../../contract-data/operations/imports.yaml'); const contract = parse(readFileSync(yamlPath, 'utf8')); const cases = [...contract.examples].map(row => adapt(row));`],
    ["function-scoped var shadows the imported path namespace", `import path from 'node:path'; import { parse } from 'yaml'; import { readFileSync } from 'node:fs';
function load() { var path = {}; const yamlPath = path.resolve(__dirname, '../../contract-data/operations/imports.yaml'); const contract = parse(readFileSync(yamlPath, 'utf8')); const cases = [...contract.examples].map(row => adapt(row)); }`],
    ["a shadowed require parameter cannot prove a CJS namespace", `import { parse } from 'yaml'; import { readFileSync } from 'node:fs';
function load(require) { const path = require('node:path'); const yamlPath = path.resolve(__dirname, '../../contract-data/operations/imports.yaml'); const contract = parse(readFileSync(yamlPath, 'utf8')); const cases = [...contract.examples].map(row => adapt(row)); }`],
    ["type-only parser and filesystem imports", `import type { parse } from 'yaml'; import type { readFileSync } from 'node:fs'; import path from 'node:path';
const yamlPath = path.resolve(__dirname, '../../contract-data/operations/imports.yaml'); const contract = parse(readFileSync(yamlPath, 'utf8')); const cases = [...contract.examples].map(row => adapt(row));`],
  ];
  for (const [name, source] of sources) await t.test(name, async subtest => assertUnresolved(subtest, source));
});

test("a destructured CJS path member cannot stand in for its module namespace", async t => {
  // Given: the path receiver is a named CJS export rather than the whole module object.
  // When: the public reader checks a valid parser/filesystem load through that receiver.
  // Then: the unsupported namespace shape emits no YAML row and remains unresolved.
  // Business Intent / Invariant Guarded: executor provenance requires the configured module object.
  // Failure Signal: a YAML row or missing UNKNOWN shows a named function was accepted as a namespace.
  await assertUnresolved(t, `
const { resolve: path } = require('node:path');
const { readFileSync } = require('node:fs'); const { parse } = require('yaml');
const yamlPath = path.resolve(__dirname, '../../contract-data/operations/imports.yaml');
const contract = parse(readFileSync(yamlPath, 'utf8')); const cases = [...contract.examples].map(row => adapt(row));
`);
});
