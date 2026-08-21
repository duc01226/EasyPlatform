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

// Working-tree line endings belong to the git checkout (`core.autocrlf=true` materializes the
// LF-in-index sources as CRLF on Windows), never to the content — the builder always emits LF.
// Normalize every file read so these assertions compare CATALOG CONTENT and cannot fail purely
// because of the platform that checked the repo out.
const normalizeEol = (text) => text.replace(/\r\n/g, "\n");

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

// TC-WSC-006 — quoted frontmatter scalars are DECODED, not merely de-wrapped.
//
// The regression: unquote() stripped the quote wrapper but left the escaping that wrapper implies,
// so a single-quoted description carrying an apostrophe (`'a bug''s root cause'` — the YAML encoding
// every normalization pass emits) rendered the literal artifact `bug''s` into the catalog, and from
// there into CLAUDE.md, AGENTS.md and every Codex mirror. Three real skill descriptions shipped that
// way. Nothing downstream could catch it: the mirrors are byte-compared against each other, so an
// artifact present in ALL of them is perfectly consistent and perfectly wrong.
//
// Driven through the public builder rather than the private unquote(), so the test pins the OUTPUT
// contract and survives the helper being renamed or extracted to a shared module.
test("TC-WSC-006 decodes quoted frontmatter scalars instead of leaking their escapes", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wsc-unquote-"));
  const skillsDir = path.join(tmp, ".claude", "skills");
  fs.mkdirSync(skillsDir, { recursive: true });
  fs.writeFileSync(
    path.join(tmp, ".claude", "workflows.json"),
    JSON.stringify({
      workflows: {
        "workflow-x": { name: "X", whenToUse: "test", sequence: ["sq-skill", "dq-skill", "bare-skill"] },
      },
    })
  );
  const writeSkill = (name, descriptionLine) => {
    fs.mkdirSync(path.join(skillsDir, name), { recursive: true });
    fs.writeFileSync(
      path.join(skillsDir, name, "SKILL.md"),
      `---\nname: ${name}\ndescription: ${descriptionLine}\n---\n\nbody\n`
    );
  };
  // Single-quoted: `''` is the ONLY escape YAML defines for this style.
  writeSkill("sq-skill", "'Use when investigating a bug''s root cause'");
  // Double-quoted: backslash escapes.
  writeSkill("dq-skill", '"Use the \\"quoted\\" path"');
  // Unquoted plain scalar must pass through untouched.
  writeSkill("bare-skill", "Use when nothing needs escaping");

  const out = buildWorkflowSkillsCatalog({ rootDir: tmp, sections: ["skills"] });
  assert.ok(out.includes("Use when investigating a bug's root cause"), "single-quoted '' must decode to '");
  assert.ok(!out.includes("bug''s"), "the doubled-quote artifact must not reach the rendered catalog");
  assert.ok(out.includes('Use the "quoted" path'), 'double-quoted \\" must decode to "');
  assert.ok(!out.includes('\\"quoted\\"'), "the backslash artifact must not reach the rendered catalog");
  assert.ok(out.includes("Use when nothing needs escaping"), "plain scalars must pass through unchanged");
});

// TC-WSC-007 — surface invariant over the REAL skill set: no escape artifact survives into the
// catalog this repo actually ships. TC-WSC-006 pins the decoder; this pins the product, so the leak
// is caught no matter which of the frontmatter parsers regresses (the same de-wrap-only logic was
// independently reimplemented in three scripts, and the fix had to land in each).
test("TC-WSC-007 the real catalog carries no YAML escape artifacts", () => {
  const out = buildWorkflowSkillsCatalog({ rootDir: repoRoot, sections: ["workflows", "skills"] });
  const artifacts = out.split("\n").filter((l) => /''|\\"/.test(l));
  assert.deepEqual(
    artifacts,
    [],
    `rendered catalog rows still carry a YAML escape artifact:\n${artifacts.join("\n")}`
  );
});

// TC-WSC-008 — the builder is the source of the static Claude catalog.  Checking only the
// in-memory builder lets workflow changes reach the live workflow registry while the Tier-1
// Claude activation catalog keeps an older sequence.
test("TC-WSC-008 shipped Claude workflow catalog matches the canonical builder", () => {
  const claudeMd = normalizeEol(fs.readFileSync(path.join(repoRoot, "CLAUDE.md"), "utf8"));
  const from = claudeMd.indexOf(CK_SKILLS_START);
  const to = claudeMd.indexOf(CK_SKILLS_END, from + CK_SKILLS_START.length);

  assert.notEqual(from, -1, "CLAUDE.md must contain the workflow catalog start marker");
  assert.notEqual(to, -1, "CLAUDE.md must contain the workflow catalog end marker");

  const shipped = claudeMd.slice(from + CK_SKILLS_START.length, to).trim();
  // CLAUDE.md owns routing in its static workflow gate; this marked block is generated from
  // the workflow and skill sections only.
  const expected = buildWorkflowSkillsCatalog({ rootDir: repoRoot, sections: ["workflows", "skills"] });
  assert.equal(shipped, expected, "regenerate CLAUDE.md from the workflow catalog builder");
});

// TC-WSC-009 — the framework guide calls its feature sequence "full". Keep that human-facing
// execution contract synchronized with the canonical workflow registry's terminal refresh.
test("TC-WSC-009 framework guide carries the current workflow count and conditional feature refresh", () => {
  const guide = normalizeEol(
    fs.readFileSync(
      path.join(repoRoot, ".claude", "docs", "claude-ai-agent-framework-guide.md"),
      "utf8"
    )
  );

  assert.match(guide, /Workflow Catalog \(19 Workflows\)/);
  assert.match(guide, /workflow-integration-test-green/);
  assert.match(guide, /test → scan --target=domain-entities → docs-update/);
  assert.match(guide, /only when the final diff changes an entity\/model, DTO\/data contract, persistence schema\/migration, or entity-sync evidence/i);
  assert.match(guide, /otherwise complete the scan task with a cited skip reason/i);
});

// TC-WSC-010 (builder half) — block wraps cleanly with the exported markers
test("exported CK markers are stable", () => {
  assert.equal(CK_SKILLS_START, "<!-- CK:WORKFLOW-SKILLS -->");
  assert.equal(CK_SKILLS_END, "<!-- /CK:WORKFLOW-SKILLS -->");
});
