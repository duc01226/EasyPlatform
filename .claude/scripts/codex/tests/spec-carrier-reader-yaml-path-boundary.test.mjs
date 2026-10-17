import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  carrierTestProfile, diskReader, readSpecCarriers, skipMissingCarrierParsers, withTempProject, writeProjectFile,
} from "./support/spec-carrier-test-support.mjs";

test("a YAML carrier resolving through an outside junction stays UNKNOWN without suppressing keyed cases", async t => {
  // Given: a configured in-project YAML path whose real filesystem target is outside the project,
  //        plus an independent valid keyed carrier.
  // When: the public reader inspects a genuine imported parser/filesystem/path load chain.
  // Then: the escaped YAML source produces no coverage link and the keyed case remains extractable.
  // Business Intent / Invariant Guarded: metadata coverage requires physical project-root provenance.
  // Failure Signal: linked YAML rows or a missing independent keyed row show false coverage or suppression.
  if (skipMissingCarrierParsers(t, "typescript", "yaml")) return;
  await withTempProject(t, async rootDir => {
    const outsideDir = await fs.mkdtemp(path.join(path.dirname(rootDir), "reader-yaml-outside-"));
    const ownerFile = "specs/ops/021-queue-contract.md";
    const yamlFile = "contract-data/queue/019-examples.yml";
    const executorFile = "checks/unit/queue-loader.test.js";
    const keyedFile = "checks/unit/native-cases.test.js";
    const junctionPath = path.dirname(path.join(rootDir, yamlFile));
    try {
      await fs.mkdir(path.dirname(junctionPath), { recursive: true });
      await fs.symlink(outsideDir, junctionPath, process.platform === "win32" ? "junction" : "dir");
      await fs.writeFile(path.join(outsideDir, "019-examples.yml"), `
scenario_ref: SCN-QUEUE-007
lifecycle: reviewed
coverage:
  rules: [ops/021 REQ-9]
  criteria: [ops/021 AC-3]
examples:
  - name: yaml-example
    given: { value: input }
    then: { accepted: true }
reconciliation:
  - name: yaml-reconciliation
    given: { value: prior }
    then: { accepted: false }
`, "utf8");
      await writeProjectFile(rootDir, ownerFile, "# Queue contract\n");
      await writeProjectFile(rootDir, executorFile, `
import { parse } from 'yaml';
import { readFileSync } from 'node:fs';
import path from 'node:path';
const CONTRACT_PATH = path.resolve(__dirname, '../../contract-data/queue/019-examples.yml');
const contract = parse(readFileSync(CONTRACT_PATH, 'utf8'));
const cases = [...contract.examples, ...contract.reconciliation].map(row => adapt(row));
describe('queue YAML contract (ops/021 REQ-9)', () => it('executes rows', () => cases.forEach(run)));
`);
      await writeProjectFile(rootDir, keyedFile, `
const cases = [{ variant: 'independent-variant', scenario: 'SCN-QUEUE-007', requirements: 'ops/021 REQ-9', rationale: 'independent', input: makeInput() }];
describe('independent queue cases (ops/021 REQ-9)', () => it('executes its case', () => cases.forEach(run)));
`);

      const selectedFiles = [executorFile, yamlFile, keyedFile];
      const result = await readSpecCarriers({
        rootDir, profile: carrierTestProfile, selectedFiles,
        listFiles: async () => [ownerFile, ...selectedFiles], readText: diskReader(rootDir),
      });
      const projectRealPath = await fs.realpath(rootDir);
      const yamlRealPath = await fs.realpath(path.join(rootDir, yamlFile));
      const relativeYamlRealPath = path.relative(projectRealPath, yamlRealPath);
      assert.ok(relativeYamlRealPath === ".." || relativeYamlRealPath.startsWith(`..${path.sep}`) || path.isAbsolute(relativeYamlRealPath),
        "fixture must resolve outside its selected project root");
      assert.equal(result.records.filter(record => record.dialect === "yaml-cases-v1").length, 0,
        "an escaped physical YAML file must not produce coverage rows");
      assert.ok(result.unknown.some(item => item.file === yamlFile && item.code === "UNPROVEN_CARRIER_PATH"),
        "the escaped physical YAML source must be identified as unproven");
      assert.ok(result.records.some(record => record.dialect === "js-keyed-cases-v1"
        && record.carrierFile === keyedFile && record.variantId === "independent-variant"),
      "rejecting one YAML adapter must not suppress an independent keyed case");
    } finally {
      await fs.unlink(junctionPath).catch(() => {});
      await fs.rm(outsideDir, { recursive: true, force: true });
    }
  });
});
