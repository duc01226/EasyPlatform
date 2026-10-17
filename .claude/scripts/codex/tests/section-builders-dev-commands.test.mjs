import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Locks section-builder contracts. The functions used to `return null` the moment
// `testing.commands` was empty — silently dropping a configured `testing.commandsNote` even though
// the note is config-sourced SPECIFICALLY to survive every `--mode update` regeneration. These tests
// pin the fix: the note renders independently of the command block, so a note-only config still emits.

const require = createRequire(import.meta.url);
const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, "..", "..", "..", "..");
const { buildDevCommands, buildE2eTesting, buildIntegrationTesting, buildProjectContextMap } = require(
  path.join(repoRoot, ".claude", "skills", "ai-context-refresh", "scripts", "section-builders.cjs")
);

const NOTE = "**Platform (Windows):** invoke Python via `py -3` — NEVER `python3`.";

test("SB-DC-001 renders a configured commandsNote even when commands is empty (the dropped-note bug)", () => {
  const out = buildDevCommands({ testing: { commands: {}, commandsNote: NOTE } });
  assert.equal(out, NOTE, "note must survive an empty commands map, not be swallowed by an early return");
});

test("SB-DC-002 renders the note when commands is entirely absent", () => {
  const out = buildDevCommands({ testing: { commandsNote: NOTE } });
  assert.equal(out, NOTE);
});

test("SB-DC-003 appends the note below the command block when both are present", () => {
  const out = buildDevCommands({ testing: { commands: { all: "node test" }, commandsNote: NOTE } });
  assert.match(out, /^```bash\nnode test\s+# all\n```\n\n/, "command block first");
  assert.ok(out.endsWith("\n\n" + NOTE), "note appended after a blank line");
});

test("SB-DC-004 returns null only when BOTH commands and note are absent", () => {
  assert.equal(buildDevCommands({ testing: {} }), null);
  assert.equal(buildDevCommands({}), null);
  assert.equal(buildDevCommands({ testing: { commandsNote: "   " } }), null, "whitespace-only note is not content");
});

test("SB-DC-005 still emits the command block alone when no note is configured", () => {
  const out = buildDevCommands({ testing: { commands: { all: "node test" } } });
  assert.equal(out, "```bash\nnode test" + " ".repeat(45 - "node test".length) + " # all\n```");
});

test("SB-DC-006 describes E2E references without requiring a page-object model", () => {
  const out = buildE2eTesting({ e2eTesting: { guideDoc: "docs/project-reference/e2e-test-reference.md" } });
  assert.match(out, /test organization/);
  assert.doesNotMatch(out, /page objects/i);
});

// A guide doc the project declares N/A in `referenceDocs` must never be routed to as a guide:
// the generated root would otherwise say "Full guide: [x.md]" while its Doc Lookup lists x.md as N/A.
const E2E_DOC = "docs/project-reference/e2e-test-reference.md";
const IT_DOC = "docs/project-reference/integration-test-reference.md";
const LINK = /\]\(docs\/project-reference\//;

test("SB-DC-007 never links an E2E guide declared N/A (purpose marker or explicit flag)", () => {
  // Given an E2E guide declared N/A by a purpose marker, then by the explicit flag, and no E2E stack.
  for (const entry of [
    { filename: "e2e-test-reference.md", purpose: "E2E test patterns (N/A for framework project)" },
    { filename: "e2e-test-reference.md", purpose: "E2E test patterns", notApplicable: true },
  ]) {
    // When the E2E section is built.
    const out = buildE2eTesting({
      e2eTesting: { framework: "none", guideDoc: E2E_DOC, architecture: { pattern: "not-applicable", bddFramework: "none" } },
      testing: { frameworks: ["custom-cjs-runner"] },
      referenceDocs: [entry],
    });
    // Then it is a non-empty N/A notice with no guide link and no non-E2E runner reported.
    assert.ok(out, "a non-empty notice replaces the stale body on --mode update");
    assert.doesNotMatch(out, /Full guide/, "no guide link for an N/A doc");
    assert.doesNotMatch(out, LINK);
    assert.match(out, /`e2e-test-reference\.md` is declared not applicable/);
    assert.doesNotMatch(out, /custom-cjs-runner/, "a non-E2E runner is not reported as an E2E framework");
  }
});

test("SB-DC-008 keeps real E2E stack facts when only the guide is N/A", () => {
  // Given a real Playwright stack whose guide doc is declared N/A.
  // When the E2E section is built.
  const out = buildE2eTesting({
    e2eTesting: { framework: "playwright", guideDoc: E2E_DOC, architecture: { webDriverType: "playwright" } },
    referenceDocs: [{ filename: "e2e-test-reference.md", notApplicable: true }],
  });
  // Then the stack fact survives and only the guide link is withheld.
  assert.equal(out, "E2E stack: Playwright.");
});

test("SB-DC-009 still links an applicable E2E guide", () => {
  // Given an applicable E2E guide whose purpose merely mentions "not applicable" in passing.
  // When the E2E section is built.
  const out = buildE2eTesting({
    e2eTesting: { framework: "playwright", guideDoc: E2E_DOC },
    referenceDocs: [{ filename: "e2e-test-reference.md", purpose: "E2E test patterns — not applicable prose inside is ignored" }],
  });
  // Then the guide is linked.
  assert.match(out, /^Full guide: \[e2e-test-reference\.md\]\(docs\/project-reference\/e2e-test-reference\.md\)/);
});

test("SB-DC-010 integration-test guide: linked when applicable, notice (no link) when declared N/A", () => {
  // Given a configured integration-test guide that is applicable, then declared N/A, then not configured.
  // When the integration-testing section is built for each.
  // Then an applicable guide is linked, an N/A guide gets a link-free notice, and no guide omits the section.
  const applicable = buildIntegrationTesting({
    framework: { integrationTestDoc: IT_DOC },
    referenceDocs: [{ filename: "integration-test-reference.md", purpose: "Integration test patterns" }],
  });
  assert.equal(applicable, `See [integration-test-reference.md](${IT_DOC}) for integration test patterns and setup.`);

  const na = buildIntegrationTesting({
    framework: { integrationTestDoc: IT_DOC },
    referenceDocs: [{ filename: "integration-test-reference.md", purpose: "N/A — no integration suite" }],
  });
  assert.doesNotMatch(na, LINK);
  assert.match(na, /`integration-test-reference\.md` is declared not applicable/);
  assert.equal(buildIntegrationTesting({}), null, "no configured doc still omits the section");
});

test("SB-DC-011 source conventions list the project docs a class declares in any doc field, never framework docs", () => {
  const out = buildProjectContextMap({
    contextGroups: [
      { name: "specs", pathGlobs: ["docs/specs/**/*.md"], referenceDocs: ["docs/project-reference/spec-system-reference.md"] },
      { name: "api", pathRegexes: ["/api/"], patternsDoc: "docs/api-patterns.md", referenceDocs: ["docs/api-patterns.md", "docs/api-errors.md"] },
      { name: "hooks", pathRegexes: ["/hooks/"], guideDoc: ".claude/docs/hooks/README.md", referenceDocs: [".claude/docs/hooks/architecture.md"] },
      { name: "rules-only", pathRegexes: ["/lib/"], rules: ["Keep modules small."] },
    ],
  });
  const rows = out.split("\n").filter(line => line.startsWith("| `") || line.startsWith("| docs") || line.startsWith("| /"));
  assert.match(out, /\| Files \| Project reference \|/);
  assert.deepEqual(rows, [
    "| docs/specs/**/*.md | `docs/project-reference/spec-system-reference.md` |",
    "| /api/ | `docs/api-patterns.md`, `docs/api-errors.md` |",
  ], "a referenceDocs-only class gets a row, a doc named twice is listed once, framework-only and doc-less classes get none");
  assert.equal(buildProjectContextMap({ contextGroups: [{ name: "hooks", guideDoc: ".claude/docs/hooks/README.md" }] }), null,
    "no project doc declared: the section stays empty");
});
