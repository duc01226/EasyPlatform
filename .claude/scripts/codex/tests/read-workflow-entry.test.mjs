import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { resolveWorkflowStrings } from "../read-workflow-entry.mjs";

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, "..", "..", "..", "..");
const entryScript = path.join(repoRoot, ".claude", "scripts", "codex", "read-workflow-entry.mjs");
const workflowsPath = path.join(repoRoot, ".claude", "workflows.json");

// The canonical brace set from the loader's PORTABILITY_TOKENS. Kept as literal token NAMES so the
// assertion fails on a bare `{SPEC_ROOT}` reaching the Tier-2 read regardless of what it should
// have resolved to.
const TOKEN_NAMES = [
  "SPEC_ROOT",
  "SPEC_ROOT_TECHNICAL",
  "REF_DOCS_ROOT",
  "ADR_ROOT",
  "TEMPLATES_ROOT",
  "PLANS_ROOT",
  "TEAM_ARTIFACTS_ROOT",
  "PRODUCT_ROADMAP_DOC",
];

const workflowsDoc = JSON.parse(fs.readFileSync(workflowsPath, "utf8"));
const workflowIds = Object.keys(workflowsDoc.workflows);

function runEntry(workflowId, cwd = repoRoot) {
  return execFileSync(process.execPath, [entryScript, workflowId], {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

// TC-DOCROOT-045 — no bare portability token may reach the Tier-2 canonical read that
// start-workflow/SKILL.md mandates before task tracking. Ids are ENUMERATED from workflows.json,
// never hardcoded, so a newly added workflow is covered automatically.
test("TC-DOCROOT-045 every workflow's Tier-2 read emits zero unresolved portability tokens", () => {
  assert.ok(workflowIds.length > 0, "workflows.json declares at least one workflow");
  for (const id of workflowIds) {
    const out = runEntry(id);
    for (const token of TOKEN_NAMES) {
      assert.ok(
        !out.includes(`{${token}}`),
        `${id}: unresolved {${token}} reached the Tier-2 read`
      );
    }
  }
});

// TC-DOCROOT-046 — a token in a routed field DOES resolve on the way out, from the configured
// root, and an unknown brace in the same string survives verbatim.
test("TC-DOCROOT-046 routed fields resolve from config; unknown braces survive", () => {
  const config = { specRoots: { business: { path: "spec-library" } } };
  const entry = {
    name: "Fixture",
    description: "Writes into {SPEC_ROOT}/{Bucket}",
    whenToUse: "User edits {SPEC_ROOT} or {PLANS_ROOT}/{plan-id}",
    preActions: {
      injectContext: "Read {SPEC_ROOT}/{Bucket}/spec.md and {REF_DOCS_ROOT}/lessons.md",
      readFiles: ["{SPEC_ROOT}/keep-literal.md"],
    },
    sequence: [{ id: "s1", skill: "spec", args: "", applicability: { when: "A {SPEC_ROOT} spec exists", skipReason: "No spec under {SPEC_ROOT}" } }],
    occurrences: [
      {
        id: "o1",
        skill: "spec",
        args: "",
        applicability: { when: "A {SPEC_ROOT} spec exists", skipReason: "No spec under {SPEC_ROOT}" },
      },
    ],
    variants: {
      audit: {
        sequence: [
          { id: "v1", skill: "spec", args: "", applicability: { when: "{SPEC_ROOT} audit due", skipReason: "{SPEC_ROOT} audited recently" } },
        ],
      },
    },
  };
  const frozen = JSON.parse(JSON.stringify(entry));

  const out = resolveWorkflowStrings(entry, config);

  assert.equal(out.description, "Writes into spec-library/{Bucket}");
  assert.equal(out.whenToUse, "User edits spec-library or plans/{plan-id}");
  assert.equal(
    out.preActions.injectContext,
    "Read spec-library/{Bucket}/spec.md and docs/project-reference/lessons.md"
  );
  assert.equal(out.sequence[0].applicability.when, "A spec-library spec exists");
  assert.equal(out.sequence[0].applicability.skipReason, "No spec under spec-library");
  assert.equal(out.occurrences[0].applicability.when, "A spec-library spec exists");
  assert.equal(out.variants.audit.sequence[0].applicability.when, "spec-library audit due");
  assert.equal(
    out.variants.audit.sequence[0].applicability.skipReason,
    "spec-library audited recently"
  );

  // Unrouted fields stay literal.
  assert.equal(out.name, "Fixture");
  assert.deepEqual(out.preActions.readFiles, ["{SPEC_ROOT}/keep-literal.md"]);

  // Deep copy: the input object is never mutated.
  assert.deepEqual(entry, frozen);
});

// TC-DOCROOT-047 — the empty-injectContext guard still fires BEFORE resolution, a token in a
// fixture workflows.json resolves on the way out (DEFAULTS branch — the fixture tree carries no
// .claude/hooks/lib/), and the on-disk workflows.json is byte-identical after a successful run.
test("TC-DOCROOT-047 empty injectContext throws; on-disk workflows.json is never mutated", () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "docroot-047-"));
  try {
    const codexDir = path.join(fixtureRoot, ".claude", "scripts", "codex");
    const libDir = path.join(fixtureRoot, ".claude", "scripts", "lib");
    const skillDir = path.join(fixtureRoot, ".claude", "skills", "investigate");
    fs.mkdirSync(codexDir, { recursive: true });
    fs.mkdirSync(libDir, { recursive: true });
    fs.mkdirSync(skillDir, { recursive: true });
    fs.copyFileSync(entryScript, path.join(codexDir, "read-workflow-entry.mjs"));
    for (const lib of ["workflow-manifest.cjs", "project-root.cjs"]) {
      fs.copyFileSync(path.join(repoRoot, ".claude", "scripts", "lib", lib), path.join(libDir, lib));
    }
    fs.writeFileSync(path.join(skillDir, "SKILL.md"), "# investigate\n");

    const fixtureWorkflows = {
      version: "1.0.0",
      workflows: {
        "wf-ok": {
          name: "Fixture OK",
          description: "Reads {SPEC_ROOT}/{Bucket}",
          whenToUse: "spec work under {SPEC_ROOT}",
          preActions: { injectContext: "Open {SPEC_ROOT}/{Bucket}/spec.md" },
          sequence: ["investigate"],
        },
        "wf-empty": {
          name: "Fixture Empty",
          description: "no context",
          whenToUse: "never",
          preActions: { injectContext: "   " },
          sequence: ["investigate"],
        },
      },
    };
    const fixtureWorkflowsPath = path.join(fixtureRoot, ".claude", "workflows.json");
    const serialized = `${JSON.stringify(fixtureWorkflows, null, 2)}\n`;
    fs.writeFileSync(fixtureWorkflowsPath, serialized);
    const beforeBytes = fs.readFileSync(fixtureWorkflowsPath);

    const fixtureScript = path.join(codexDir, "read-workflow-entry.mjs");
    const okOut = execFileSync(process.execPath, [fixtureScript, "wf-ok"], {
      cwd: fixtureRoot,
      encoding: "utf8",
    });
    // Defaults branch: a token resolves to a real path, never to a bare placeholder.
    assert.ok(okOut.includes("docs/specs/{Bucket}/spec.md"), okOut);
    assert.ok(!okOut.includes("{SPEC_ROOT}"), "no bare token survives the fallback branch");

    let threw = null;
    try {
      execFileSync(process.execPath, [fixtureScript, "wf-empty"], {
        cwd: fixtureRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      threw = error;
    }
    assert.ok(threw, "an empty preActions.injectContext must still fail loudly");
    assert.match(
      String(threw.stderr ?? ""),
      /missing required non-empty preActions\.injectContext/
    );

    assert.deepEqual(
      fs.readFileSync(fixtureWorkflowsPath),
      beforeBytes,
      "workflows.json must be byte-identical after a successful run (deep-copy guard)"
    );
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

// TC-DOCROOT-049 (read-entry half) — resolution is CONFINED to the routed fields.
//
// This assertion was originally phrased as "identity on token-free shipped content". Phase 05
// tokenised the routed fields, so identity is no longer the invariant that matters — confinement
// is. An empty config resolves every token to its documented default, and every field OUTSIDE the
// routed set must still come back byte-identical, which is what proves the resolver cannot reach
// `name`, `readFiles`, `stepMeta`, `parallelGroups` or a fingerprint.
const ROUTED_KEYS = new Set(["description", "whenToUse", "intent", "outcomeGates", "preActions", "sequence", "occurrences", "variants"]);

test("TC-DOCROOT-049 resolution is confined to the routed fields", () => {
  for (const [id, workflow] of Object.entries(workflowsDoc.workflows)) {
    const resolved = resolveWorkflowStrings(workflow, {});

    assert.notEqual(resolved, workflow, `${id}: the resolver must never return the input object`);
    assert.deepEqual(
      Object.keys(resolved),
      Object.keys(workflow),
      `${id}: resolution must not add, drop or reorder keys`
    );

    for (const key of Object.keys(workflow)) {
      if (ROUTED_KEYS.has(key)) continue;
      assert.deepEqual(resolved[key], workflow[key], `${id}: unrouted field "${key}" must be untouched`);
    }

    // `preActions.readFiles` is the unrouted sibling of the one routed key in that object.
    if (workflow.preActions && typeof workflow.preActions === "object") {
      for (const key of Object.keys(workflow.preActions)) {
        if (key === "injectContext") continue;
        assert.deepEqual(
          resolved.preActions[key],
          workflow.preActions[key],
          `${id}: unrouted preActions.${key} must be untouched`
        );
      }
    }

    // `outcomeGates[].when` is the one routed gate field; each gate's `id` and `satisfiedBy` stay literal.
    for (const [index, gate] of (workflow.outcomeGates ?? []).entries()) {
      assert.equal(resolved.outcomeGates[index].id, gate.id, `${id}: unrouted outcomeGates[${index}].id must be untouched`);
      assert.deepEqual(
        resolved.outcomeGates[index].satisfiedBy,
        gate.satisfiedBy,
        `${id}: unrouted outcomeGates[${index}].satisfiedBy must be untouched`
      );
    }

    for (const token of TOKEN_NAMES) {
      assert.equal(
        JSON.stringify(resolved).includes(`{${token}}`),
        false,
        `${id}: a bare {${token}} survived resolution into the Tier-2 read`
      );
    }
  }
});
