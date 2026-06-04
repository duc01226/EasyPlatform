import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, "..", "..", "..", "..");
const {
  buildWorkflowSkillsCatalog,
  condenseWhenToUse,
  baseSkill,
  CK_SKILLS_START,
  CK_SKILLS_END,
} = require(path.join(repoRoot, ".claude", "scripts", "lib", "workflow-skills-catalog.cjs"));

const workflowsDoc = JSON.parse(
  fs.readFileSync(path.join(repoRoot, ".claude", "workflows.json"), "utf8")
);

// TC-WSC-001 — all workflows present
test("TC-WSC-001 lists every workflow from workflows.json", () => {
  const out = buildWorkflowSkillsCatalog({ rootDir: repoRoot, sections: ["workflows"] });
  const expected = Object.keys(workflowsDoc.workflows).length;
  assert.match(out, new RegExp(`### Workflows Index \\(${expected}\\)`));
  for (const id of Object.keys(workflowsDoc.workflows)) {
    assert.ok(out.includes(`\`${id}\``), `missing workflow row: ${id}`);
  }
});

// TC-WSC-002 — every distinct step-skill has a non-empty description
test("TC-WSC-002 lists every distinct step-skill with a non-empty description", () => {
  const out = buildWorkflowSkillsCatalog({ rootDir: repoRoot, sections: ["skills"] });
  const distinct = new Set();
  for (const wf of Object.values(workflowsDoc.workflows)) {
    for (const step of wf.sequence || []) distinct.add(baseSkill(step));
  }
  assert.match(out, new RegExp(`### Workflow Skills \\(${distinct.size} composable steps\\)`));
  for (const skill of distinct) {
    const row = out
      .split("\n")
      .find((l) => l.startsWith(`| \`${skill}\` |`));
    assert.ok(row, `missing skill row: ${skill}`);
    const desc = row.split("|")[2].trim();
    assert.ok(desc.length > 0, `empty description for skill: ${skill}`);
  }
});

// TC-WSC-003 — deterministic
test("TC-WSC-003 output is deterministic", () => {
  const a = buildWorkflowSkillsCatalog({ rootDir: repoRoot });
  const b = buildWorkflowSkillsCatalog({ rootDir: repoRoot });
  assert.equal(a, b);
});

// TC-WSC-004 — condenseWhenToUse matches the Codex extractKeywords behavior
// (ported twin). Re-derive the reference inline so the test is self-contained.
test("TC-WSC-004 condenseWhenToUse parity for all workflow whenToUse strings", () => {
  function referenceExtract(whenToUse, { maxClauses = 3, wordsPerClause = 6, maxLen = 130 } = {}) {
    if (!whenToUse || typeof whenToUse !== "string") return "";
    const clauses = whenToUse
      .split(/[,;]/)
      .map((c) => c.trim().toLowerCase())
      .map((c) =>
        c.replace(
          /^(?:user (?:wants to|reports|has)|wants to|po(?:\/| or )ba wants to|generate|create|after)\s+/i,
          ""
        )
      )
      .map((c) => c.split(/\s+/).slice(0, wordsPerClause).join(" "))
      .filter((c) => c.length > 2);
    const picked = [];
    const seen = new Set();
    for (const clause of clauses) {
      if (seen.has(clause)) continue;
      seen.add(clause);
      picked.push(clause);
      if (picked.length >= maxClauses) break;
    }
    let out = picked.join(", ");
    if (out.length > maxLen) out = `${out.slice(0, maxLen).replace(/[\s,]+\S*$/, "")}…`;
    return out.replace(/\|/g, "\\|");
  }
  for (const wf of Object.values(workflowsDoc.workflows)) {
    assert.equal(condenseWhenToUse(wf.whenToUse), referenceExtract(wf.whenToUse));
  }
});

// TC-WSC-005 — graceful fallback for a sequence step with no SKILL.md dir
test("TC-WSC-005 falls back (no throw) for a step-skill with no SKILL.md", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wsc-fallback-"));
  fs.mkdirSync(path.join(tmp, ".claude"), { recursive: true });
  fs.writeFileSync(
    path.join(tmp, ".claude", "workflows.json"),
    JSON.stringify({
      workflows: {
        "workflow-x": { name: "X", whenToUse: "test", sequence: ["ghost-step", "missing-step"] },
      },
    })
  );
  let out;
  assert.doesNotThrow(() => {
    out = buildWorkflowSkillsCatalog({ rootDir: tmp, sections: ["skills"] });
  });
  // Steps with no SKILL.md dir fall back to a single generic label.
  assert.ok(out.includes("| `ghost-step` | (workflow step) |"));
  assert.ok(out.includes("| `missing-step` | (workflow step) |"));
});

// TC-WSC-009 (builder half) — block wraps cleanly with the exported markers
test("exported CK markers are stable", () => {
  assert.equal(CK_SKILLS_START, "<!-- CK:WORKFLOW-SKILLS -->");
  assert.equal(CK_SKILLS_END, "<!-- /CK:WORKFLOW-SKILLS -->");
});
