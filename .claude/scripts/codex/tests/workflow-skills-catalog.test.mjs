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
  renderWorkflowsSection,
  condenseWhenToUse,
  baseSkill,
  resolvedModeSequences,
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

// TC-WSC-001b — every declared variant is rendered from the same resolved manifest producer used
// by activation; explicit occurrence objects must never leak as `[object Object]`.
test("TC-WSC-001b renders every workflow mode and resolved occurrence sequence", () => {
  const out = buildWorkflowSkillsCatalog({ rootDir: repoRoot, sections: ["workflows"] });
  assert.ok(!out.includes("[object Object]"), "catalog must render occurrence commands, not objects");
  for (const [workflowId, workflow] of Object.entries(workflowsDoc.workflows)) {
    const row = out.split("\n").find((line) => line.startsWith(`| \`${workflowId}\` |`));
    assert.ok(row, `missing workflow row: ${workflowId}`);
    for (const { mode, sequence } of resolvedModeSequences(repoRoot, workflowId, workflow)) {
      if (workflow.variants) assert.ok(row.includes(`${mode}:`), `missing mode label ${workflowId}/${mode}`);
      for (const step of sequence) assert.ok(row.includes(step), `missing resolved step ${workflowId}/${mode}: ${step}`);
    }
  }
});

// TC-WSC-002 — every distinct step-skill has a non-empty description
test("TC-WSC-002 lists every distinct step-skill with a non-empty description", () => {
  const out = buildWorkflowSkillsCatalog({ rootDir: repoRoot, sections: ["skills"] });
  const distinct = new Set();
  for (const wf of Object.values(workflowsDoc.workflows)) {
    const sequences = wf.variants
      ? Object.values(wf.variants).flatMap((variant) => variant.sequence || [])
      : wf.sequence || [];
    for (const step of sequences) {
      const token = typeof step === "string" ? step : `${step.skill} ${step.args || ""}`;
      distinct.add(baseSkill(token));
    }
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

// TC-WSC-004 — condenseWhenToUse matches an independent reference copy of the whole-clause rule (BR-WFR-02), and no
// shipped hint ends mid-clause: a cut mark appears only when the first clause alone is longer than the cap.
test("TC-WSC-004 condenseWhenToUse parity for all workflow whenToUse strings", () => {
  function referenceExtract(whenToUse, { maxClauses = 5, maxLen = 190 } = {}) {
    if (!whenToUse || typeof whenToUse !== "string") return "";
    const clauses = whenToUse
      .split(/[,;]/)
      .map((c) => c.trim().toLowerCase())
      .map((c) =>
        c.replace(
          /^(?:user (?:wants to|reports|has)|wants to|po(?:\/| or )ba(?: or user)? wants(?: to)?|generate|create|after)\s+/i,
          ""
        )
      )
      .filter((c) => c.length > 2);
    const picked = [];
    const seen = new Set();
    let length = 0;
    for (const clause of clauses) {
      if (seen.has(clause)) continue;
      const added = (picked.length ? 2 : 0) + clause.length;
      if (picked.length && length + added > maxLen) break;
      seen.add(clause);
      picked.push(clause);
      length += added;
      if (picked.length >= maxClauses) break;
    }
    let out = picked.join(", ");
    if (out.length > maxLen) out = `${out.slice(0, maxLen).replace(/[\s,]+\S*$/, "")}…`;
    return out.replace(/\|/g, "\\|");
  }
  for (const [id, wf] of Object.entries(workflowsDoc.workflows)) {
    const hint = condenseWhenToUse(wf.whenToUse);
    assert.equal(hint, referenceExtract(wf.whenToUse));
    // No shipped hint is cut mid-clause: a cut mark appears only when the first clause alone exceeds the cap
    const firstClause = wf.whenToUse.split(/[,;]/)[0].trim();
    if (hint.endsWith("…")) assert.ok(firstClause.length > 190, `${id}: hint cut mid-clause: ${hint}`);
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
        "workflow-x": {
          name: "X",
          whenToUse: "test",
          sequence: ["ghost-step", "missing-step"],
          preActions: { injectContext: "Use the selected workflow context." },
        },
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
        "workflow-x": {
          name: "X",
          whenToUse: "test",
          sequence: ["sq-skill", "dq-skill", "bare-skill"],
          preActions: { injectContext: "Use the selected workflow context." },
        },
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

test("TC-WSC-008 tracked context carries no route text and the runtime builder remains complete", (t) => {
  const claudeMdPath = path.join(repoRoot, "CLAUDE.md");
  if (!fs.existsSync(claudeMdPath)) {
    t.skip("root CLAUDE.md is not part of a .claude-only adopter copy");
    return;
  }
  const claudeMd = normalizeEol(fs.readFileSync(claudeMdPath, "utf8"));
  assert.equal(claudeMd.includes("<!-- CK:WORKFLOW-ROUTE-POINTER -->"), false, "the route is delivered by the route hook only, never by a root pointer");
  assert.equal(claudeMd.includes("<!-- CK:WORKFLOW-GATE -->"), false, "the gate is delivered by the route hook only, never by the root file");
  assert.equal(claudeMd.includes(CK_SKILLS_START), false, "CLAUDE.md must omit the runtime catalog");
  assert.equal(
    fs.existsSync(path.join(repoRoot, ".agents", "skills", "shared", "workflow-first-gate.md")),
    false,
    "canonical shared internals are not copied as independently editable static skill mirrors"
  );
  const expected = buildWorkflowSkillsCatalog({ rootDir: repoRoot, sections: ["workflows", "skills"] });
  assert.match(expected, /### Workflows Index \(\d+\)/);
  for (const workflowId of Object.keys(workflowsDoc.workflows)) assert.match(expected, new RegExp('`' + workflowId + '`'));
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

  const workflowCount = Object.keys(workflowsDoc.workflows).length;
  assert.match(guide, new RegExp(`Workflow Catalog \\(${workflowCount} Workflows\\)`));
  assert.match(guide, /workflow-integration-test[^\n]*--mode=green/);
  assert.match(guide, /scan --target=domain-entities → docs-manager --mode=update/);
  assert.match(guide, /only when the final diff changes an entity\/model, DTO\/data contract, persistence schema\/migration, or entity-sync evidence/i);
  assert.match(guide, /otherwise complete the scan task with a cited skip reason/i);
});

// TC-WSC-011 — a declared all-return barrier is ONE parallel step in the catalog, so a reader
// selecting a route sees the phase shape instead of a misleading step-to-step chain.
test("TC-WSC-011 renders every declared parallel group as one bracketed step", () => {
  const { resolveAllWorkflowManifests } = require(path.join(repoRoot, ".claude", "scripts", "lib", "workflow-manifest.cjs"));
  const out = buildWorkflowSkillsCatalog({ rootDir: repoRoot, sections: ["workflows"] });
  assert.match(out, /`\[a ∥ b\]` = one parallel phase \(all-return barrier\)/);
  let groupCount = 0;
  for (const workflowId of Object.keys(workflowsDoc.workflows)) {
    const row = out.split("\n").find((line) => line.startsWith(`| \`${workflowId}\` |`));
    for (const manifest of resolveAllWorkflowManifests(workflowsDoc, workflowId, { rootDir: repoRoot })) {
      for (const group of manifest.parallelGroups || []) {
        groupCount += 1;
        const members = manifest.occurrences
          .map((occurrence, index) => ({ occurrence, step: manifest.sequence[index] }))
          .filter(({ occurrence }) => occurrence.barrier === group.id)
          .map(({ occurrence, step }) => `${step}${group.conditionalMembers.includes(occurrence.id) ? "*" : ""}`);
        const expected = `[${members.join(" ∥ ")}]`;
        assert.ok(row.includes(expected), `${workflowId}/${manifest.mode}/${group.id}: expected ${expected}`);
      }
    }
  }
  assert.ok(groupCount > 0, "the shipped registry declares at least one parallel group");
});

// TC-WSC-010 (builder half) — block wraps cleanly with the exported markers
test("exported CK markers are stable", () => {
  assert.equal(CK_SKILLS_START, "<!-- CK:WORKFLOW-SKILLS -->");
  assert.equal(CK_SKILLS_END, "<!-- /CK:WORKFLOW-SKILLS -->");
});

// The 8 canonical portability token names (loader PORTABILITY_TOKENS). Asserted as literal braces
// so a bare `{SPEC_ROOT}` reaching the GENERATED catalog table fails, whatever it should have been.
const PORTABILITY_TOKEN_NAMES = [
  "SPEC_ROOT",
  "SPEC_ROOT_TECHNICAL",
  "REF_DOCS_ROOT",
  "ADR_ROOT",
  "TEMPLATES_ROOT",
  "PLANS_ROOT",
  "TEAM_ARTIFACTS_ROOT",
  "PRODUCT_ROADMAP_DOC",
];

// TC-DOCROOT-048 — `whenToUse` is a ROUTED field: tokens resolve from the configured root before
// the `When to use` column is rendered, and no token brace survives into the generated table.
test("TC-DOCROOT-048 renderWorkflowsSection resolves whenToUse tokens from config", () => {
  const config = { specRoots: { business: { path: "spec-library" } } };
  // Steps are rendered from the real registry, so the row must carry a REAL workflow id; only the
  // routed `whenToUse` field is replaced with a tokenised fixture value.
  const [fixtureId, shippedWorkflow] = Object.entries(workflowsDoc.workflows)[0];
  const entries = [
    [
      fixtureId,
      {
        ...shippedWorkflow,
        whenToUse: "User edits {SPEC_ROOT}/{Bucket}, a plan in {PLANS_ROOT}",
      },
    ],
  ];

  const out = renderWorkflowsSection(entries, repoRoot, config);
  const row = out.split("\n").find((line) => line.startsWith(`| \`${fixtureId}\``));
  assert.ok(row, out);
  // `condenseWhenToUse` lower-cases the hint, so compare case-insensitively.
  const hint = row.toLowerCase();
  assert.ok(hint.includes("spec-library"), row);
  assert.ok(hint.includes("{plans_root}") === false, row);
  assert.ok(hint.includes("a plan in plans"), row);
  assert.ok(hint.includes("{bucket}"), "unknown braces survive verbatim");
  for (const token of PORTABILITY_TOKEN_NAMES) {
    assert.ok(
      !hint.includes(`{${token.toLowerCase()}}`),
      `unresolved {${token}} reached the catalog table`
    );
  }
});

// TC-DOCROOT-049 (catalog half) — an EMPTY config renders every token at its DOCUMENTED DEFAULT.
//
// Originally phrased as "a no-op on token-free content". Phase 05 tokenised the routed fields, so
// the `When to use` cell now equals `condenseWhenToUse(whenToUse RESOLVED to the defaults)` rather
// than the raw string. The invariant that still binds — and the one the backward-compat claim
// rests on — is that a `{}` config resolves every token to the default the loader documents.
//
// PORTABILITY: this test used to assert `render(entries, repoRoot, {})` equals
// `render(entries, repoRoot)`. Those are NOT the same thing. Omitting the config argument means
// "LOAD the project config from disk", which equals the `{}` rendering only in a repo that
// overrides no root — i.e. the upstream framework repo. Every adopter that relocates a root (the
// entire point of `specRoots` / `docsRoots`) failed here, so the assertion was testing "nobody
// customized anything", not the backward-compat claim in its own name. The two real invariants are
// asserted separately below: `{}` renders the DEFAULTS, and an omitted config renders the LOADED
// config. Both hold in any repo, configured or not.
test("TC-DOCROOT-049 empty-config catalog rendering resolves every token to its default", () => {
  const entries = Object.entries(workflowsDoc.workflows).sort((a, b) => a[0].localeCompare(b[0]));

  const withEmptyConfig = renderWorkflowsSection(entries, repoRoot, {});

  // An OMITTED config means "load from disk" — so it must equal rendering with the config the
  // loader actually returns for this repo, whatever that repo configured.
  const { loadProjectConfig } = require(
    path.join(repoRoot, ".claude", "hooks", "lib", "project-config-loader.cjs")
  );
  assert.equal(
    renderWorkflowsSection(entries, repoRoot),
    renderWorkflowsSection(entries, repoRoot, loadProjectConfig()),
    "omitting the config argument must resolve tokens from the LOADED project config"
  );

  for (const [id, wf] of entries) {
    const { resolvePortabilityTokens } = require(
      path.join(repoRoot, ".claude", "hooks", "lib", "project-config-loader.cjs")
    );
    const expected = condenseWhenToUse(resolvePortabilityTokens(wf.whenToUse, {})) || id;
    const row = withEmptyConfig.split("\n").find((line) => line.startsWith(`| \`${id}\``));
    assert.ok(row, `missing row for ${id}`);
    assert.ok(row.includes(expected), `${id}: When-to-use cell must render the resolved whenToUse`);
  }

  for (const token of PORTABILITY_TOKEN_NAMES) {
    assert.equal(
      withEmptyConfig.includes(`{${token}}`),
      false,
      `a bare {${token}} reached the generated CLAUDE.md/AGENTS.md catalog table`
    );
  }

  // Same omitted-vs-empty distinction at the whole-catalog level: omitting `config` loads from
  // disk, so it is compared against the LOADED config, not against `{}`.
  assert.equal(
    buildWorkflowSkillsCatalog({ rootDir: repoRoot, config: loadProjectConfig() }),
    buildWorkflowSkillsCatalog({ rootDir: repoRoot })
  );
});

// TC-WSC-012 — activation tiers. Intent: a heavy workflow marked `manual` must never be startable by
// the model on its own, so the catalog must say so AND the wrapper skill must hide itself from model
// invocation (Claude `disable-model-invocation`; the Codex mirror derives its policy from that flag).
// A tier and a flag that disagree leave one host auto-starting the workflow the other forbids.
test("TC-WSC-012 activation tiers render per row and agree with the wrapper skill invocation flag", () => {
  const { activationTier, ACTIVATION_TIERS } = require(path.join(repoRoot, ".claude", "scripts", "lib", "workflow-skills-catalog.cjs"));
  // Framework tiers only (`activation: null`): this checks the shipped registry against the wrapper
  // flag, so a developer's local tier settings must not reach it (the effective tier is TC-WFR-009).
  const out = buildWorkflowSkillsCatalog({ rootDir: repoRoot, sections: ["workflows"], activation: null });
  assert.match(out, /\| Workflow \| Activation \| When to use \| Steps \|/);
  // Every tier asks the workflow question before a catalog-workflow start (direct, single-skill and custom-simple routes ask nothing); the tier only orders the recommendation.
  assert.match(out, /\*\*Activation:\*\* ask the workflow question .*before you start a catalog workflow, in every tier; a direct, single-skill or custom-simple route asks nothing; the tier only orders the recommendation.*`auto` by catalog fit.*`confirm` the full workflow only when no leaner route would do.*`manual` never the full workflow first/);
  assert.doesNotMatch(out, /may select and start it|never select or start it yourself/);
  const mismatches = [];
  for (const [workflowId, workflow] of Object.entries(workflowsDoc.workflows)) {
    if (workflow.activation !== undefined) {
      assert.ok(ACTIVATION_TIERS.includes(workflow.activation), `${workflowId}: unknown activation ${workflow.activation}`);
    }
    const tier = activationTier(workflow);
    const counts = resolvedModeSequences(repoRoot, workflowId, workflow).map(({ sequence }) => sequence.length);
    const label = Math.min(...counts) === Math.max(...counts) ? `${counts[0]} steps` : `${Math.min(...counts)}–${Math.max(...counts)} steps`;
    const row = out.split("\n").find((line) => line.startsWith(`| \`${workflowId}\` |`));
    assert.ok(row && row.includes(`| ${tier} · ${label} |`), `${workflowId}: expected Activation cell "${tier} · ${label}"`);

    const wrapper = path.join(repoRoot, ".claude", "skills", workflowId, "SKILL.md");
    if (!fs.existsSync(wrapper)) continue;
    const frontmatter = normalizeEol(fs.readFileSync(wrapper, "utf8")).split("\n---\n")[0];
    const hidden = /^disable-model-invocation:\s*true\s*$/m.test(frontmatter);
    if (hidden !== (tier === "manual")) mismatches.push(`${workflowId}: activation=${tier}, disable-model-invocation=${hidden}`);
  }
  assert.deepEqual(mismatches, [], `manual tier and wrapper invocation flag disagree:\n${mismatches.join("\n")}`);
});

// TC-WFR-004 — compact rows (runtime-hook form). Intent: the routing payload fits the hook cap
// only if rows drop their step lists, yet the model still needs each workflow's id, tier, size and
// trigger to route, and the parallel phases it must start together and wait on.
test("TC-WFR-004 compact rows: id, tier, step count and capped hint; barrier tokens only; names-only skills", () => {
  const { COMPACT_HINT_MAX } = require(path.join(repoRoot, ".claude", "scripts", "lib", "workflow-skills-catalog.cjs"));
  // The published limit (BR-WFR-02, AC-WFR-02): a change to the cap is a spec change, not a silent code edit
  assert.equal(COMPACT_HINT_MAX, 190, "BR-WFR-02 publishes a 190-character hint cap");
  // Given a fixture registry with a grouped workflow, a plain one, and one whose only hint source
  // (its name) is far longer than the cap, built in a temp project that HOME and temp point at
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wsc-compact-"));
  const envKeys = ["HOME", "USERPROFILE", "TMPDIR", "TEMP", "TMP"];
  const savedEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  for (const key of envKeys) process.env[key] = tmp;
  try {
    fs.mkdirSync(path.join(tmp, ".claude"), { recursive: true });
    const longName = Array.from({ length: 60 }, (_, index) => `word${index}`).join(" ");
    fs.writeFileSync(
      path.join(tmp, ".claude", "workflows.json"),
      JSON.stringify({
        version: "1.0.0",
        workflows: {
          "workflow-grouped": {
            name: "Grouped",
            activation: "confirm",
            whenToUse: "review a change with parallel reviewers",
            preActions: { injectContext: "Use the selected workflow context." },
            sequence: ["investigate", "review-a", "review-b", "review-c", "finish"],
            parallelGroups: [
              { id: "reviews", members: ["review-a", "review-b", "review-c"], conditionalMembers: ["review-c"], barrier: true },
            ],
          },
          "workflow-plain": {
            name: "Plain",
            whenToUse: "do one plain thing",
            preActions: { injectContext: "Use the selected workflow context." },
            sequence: ["investigate", "plain-step", "finish"],
          },
          "workflow-long-name": {
            name: longName,
            activation: "manual",
            preActions: { injectContext: "Use the selected workflow context." },
            sequence: ["plain-step", "finish"],
          },
        },
      })
    );
    assert.ok(longName.length > COMPACT_HINT_MAX + 100, "fixture name must exceed the hint cap");

    // When the catalog is rendered in compact mode
    const out = buildWorkflowSkillsCatalog({ rootDir: tmp, sections: ["workflows", "skills"], compact: true });
    const row = (id) => out.split("\n").find((line) => line.startsWith(`| \`${id}\` |`));

    // Then each row carries id, tier and step count, and a hint within the cap
    const grouped = row("workflow-grouped");
    const plain = row("workflow-plain");
    const longRow = row("workflow-long-name");
    assert.ok(grouped && grouped.includes("| confirm · 5 steps | review a change with parallel reviewers |"), grouped);
    assert.ok(plain && plain.includes("| auto · 3 steps | do one plain thing |"), plain);
    assert.ok(longRow && longRow.includes("| manual · 2 steps | word0 word1"), longRow);
    const longHint = longRow.split(" | ")[2];
    assert.ok(longHint.length <= COMPACT_HINT_MAX && longHint.endsWith("…"), `hint must be capped and marked: ${longHint}`);
    // And the whole-clause rule holds at its boundary (BR-WFR-02): a hint of exactly the cap is kept whole, and a clause
    // that would take the hint past the cap is left out, so the hint ends on a whole clause with no cut mark
    const [a, b] = ["a".repeat(62), "b".repeat(62)];
    const exact = `${a}, ${b}, ${"c".repeat(62)}`;
    assert.equal(exact.length, COMPACT_HINT_MAX);
    assert.equal(condenseWhenToUse(exact), exact, "a hint of exactly the cap is kept whole");
    assert.equal(condenseWhenToUse(`${a}, ${b}, ${"c".repeat(63)}`), `${a}, ${b}`, "a clause past the cap is left out, never cut mid-phrase");
    // And a clause is never cut by its word count: 25 words under the cap stay whole, with the next clause after them
    const manyWords = Array.from({ length: 25 }, (_, i) => `word${i}`).join(" ");
    assert.ok(manyWords.length < COMPACT_HINT_MAX);
    assert.equal(condenseWhenToUse(`${manyWords}, tail clause`), `${manyWords}, tail clause`, "a multi-word clause under the cap is kept whole");
    // And only a first clause longer than the cap is shortened: kept (never dropped), at most the cap, marked with a cut mark
    const overlong = condenseWhenToUse(Array.from({ length: 40 }, (_, i) => `word${i}`).join(" "));
    assert.ok(overlong.startsWith("word0 word1 ") && overlong.endsWith("…") && overlong.length <= COMPACT_HINT_MAX, `an overlong first clause is shortened and marked: ${overlong}`);
    // And no full step list survives: a grouped row keeps only its barrier token, a plain row nothing
    assert.ok(grouped.endsWith("| [review-a ∥ review-b ∥ review-c*] |"), grouped);
    for (const step of ["investigate", "finish", "plain-step", " → "]) {
      for (const line of [grouped, plain, longRow]) {
        assert.ok(!line.includes(step), `compact row leaked step list text "${step}": ${line}`);
      }
    }
    assert.ok(/\|\s*\|$/.test(plain), `plain row must end with an empty barrier cell: ${plain}`);
    // And the barrier legend (the advancement rule) and the names-only skills line replace the rest
    assert.match(out, /advance only after ALL return/);
    assert.match(out, /\| Workflow \| Activation \| When to use \| Parallel phases \|/);
    assert.ok(out.includes("Step skills: finish, investigate, plain-step, review-a, review-b, review-c"), out);
    assert.ok(!out.includes("### Workflow Skills"), "compact mode must not render the skills table");
    assert.ok(!out.includes("| Skill | Use for |"), "compact mode must not render the skills table");
  } finally {
    for (const key of envKeys) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// TC-WFR-004 (shipped registry) — the compact row of every shipped workflow keeps exactly the
// barrier tokens the full row renders, and no plain step outside them.
test("TC-WFR-004 compact rows of the shipped registry keep every barrier token and drop the steps", () => {
  const full = buildWorkflowSkillsCatalog({ rootDir: repoRoot, sections: ["workflows"] });
  const compact = buildWorkflowSkillsCatalog({ rootDir: repoRoot, sections: ["workflows"], compact: true });
  const token = /\[[^\]]*∥[^\]]*\]/g;
  for (const workflowId of Object.keys(workflowsDoc.workflows)) {
    const pick = (text) => text.split("\n").find((line) => line.startsWith(`| \`${workflowId}\` |`));
    const fullRow = pick(full);
    const compactRow = pick(compact);
    assert.ok(compactRow, `missing compact row: ${workflowId}`);
    assert.deepEqual(compactRow.match(token) || [], fullRow.match(token) || [], `${workflowId}: barrier tokens differ`);
    assert.ok(!compactRow.includes(" → "), `${workflowId}: compact row carries a step chain`);
    assert.equal(compactRow.split(" | ")[1], fullRow.split(" | ")[1], `${workflowId}: tier/step-count cell differs`);
  }
});

// TC-GWF-016 — roles describe steps; they never add or remove one. Intent: the routing catalog
// sizes each workflow by its declared steps, so annotating a step as gate/optional (which turns a
// name into a record) must leave every rendered step count unchanged.
test("TC-GWF-016 declaring roles, gates and intent leaves every rendered step count unchanged", () => {
  // Given a fixture registry holding one annotated workflow and its unannotated twin, in a temp
  // project that HOME and temp point at
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wsc-roles-"));
  const envKeys = ["HOME", "USERPROFILE", "TMPDIR", "TEMP", "TMP"];
  const savedEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  for (const key of envKeys) process.env[key] = tmp;
  try {
    const plainSequence = ["investigate", "plan", "demo-guide", "test", "workflow-end"];
    const base = { whenToUse: "fixture", preActions: { injectContext: "Use the selected workflow context." } };
    fs.mkdirSync(path.join(tmp, ".claude"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, ".claude", "workflows.json"),
      JSON.stringify({
        version: "1.0.0",
        workflows: {
          "workflow-annotated": {
            ...base,
            name: "Annotated",
            intent: "Ship the fixture change with green tests.",
            outcomeGates: [
              { id: "tests-pass", satisfiedBy: ["test"] },
              { id: "run-closed", satisfiedBy: ["workflow-end"] },
            ],
            sequence: [
              "investigate",
              { id: "draft", skill: "plan", role: "core" },
              { id: "demo", skill: "demo-guide", role: "optional", applicability: { when: "User-facing", skipReason: "Backend only" } },
              { id: "verify", skill: "test", role: "gate" },
              { id: "close", skill: "workflow-end", role: "gate" },
            ],
          },
          "workflow-plain": { ...base, name: "Plain", sequence: plainSequence },
        },
      })
    );

    // When the compact routing catalog is rendered
    const out = buildWorkflowSkillsCatalog({ rootDir: tmp, sections: ["workflows"], compact: true });
    const row = (id) => out.split("\n").find((line) => line.startsWith(`| \`${id}\` |`));

    // Then both rows count the same five steps: a step written as a record is counted once
    const expected = `| auto · ${plainSequence.length} steps |`;
    assert.ok(row("workflow-plain")?.includes(expected), row("workflow-plain"));
    assert.ok(row("workflow-annotated")?.includes(expected), row("workflow-annotated"));
    // And no annotation field leaks into the routing text
    for (const leaked of ["Ship the fixture change", "tests-pass", "optional", "User-facing"]) {
      assert.ok(!out.includes(leaked), `catalog leaked annotation text: ${leaked}`);
    }
  } finally {
    for (const key of envKeys) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  // And on the shipped registry every row counts exactly the declared steps of each mode
  const compact = buildWorkflowSkillsCatalog({ rootDir: repoRoot, sections: ["workflows"], compact: true });
  for (const [workflowId, workflow] of Object.entries(workflowsDoc.workflows)) {
    const counts = workflow.variants
      ? Object.values(workflow.variants).map((variant) => variant.sequence.length)
      : [workflow.sequence.length];
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    const label = min === max ? `${min} steps` : `${min}–${max} steps`;
    const compactRow = compact.split("\n").find((line) => line.startsWith(`| \`${workflowId}\` |`));
    assert.ok(compactRow && compactRow.includes(` · ${label} |`), `${workflowId}: expected "${label}" in ${compactRow}`);
  }
});

test("TC-WSC-013 an absent or unknown activation value renders as auto", () => {
  const { activationTier } = require(path.join(repoRoot, ".claude", "scripts", "lib", "workflow-skills-catalog.cjs"));
  const [id, shipped] = Object.entries(workflowsDoc.workflows)[0];
  const { activation: _dropped, ...withoutTier } = shipped;
  for (const [entry, expected] of [
    [withoutTier, "auto"],
    [{ ...shipped, activation: "someday" }, "auto"],
    [{ ...shipped, activation: " Manual " }, "manual"],
  ]) {
    assert.equal(activationTier(entry), expected);
    const row = renderWorkflowsSection([[id, entry]], repoRoot, {}).split("\n").find((line) => line.startsWith(`| \`${id}\` |`));
    assert.ok(row.includes(`| ${expected} · `), `expected ${expected} tier in: ${row}`);
  }
});

// ── Per-project activation tiers (BR-WFR-04/05, release A phase P05) ───────────────────────────
// Every case builds its own temp project (registry, team config, personal file) with HOME and the
// temp dirs pointed at it and the inherited framework switches blanked, so neither this repo's
// config nor the developer's own `.claude/.ck.local.json` can reach the assertions.
const routingConfig = require(path.join(repoRoot, ".claude", "scripts", "lib", "workflow-routing-config.cjs"));
const { buildWorkflowPointerCatalog } = require(path.join(repoRoot, ".claude", "scripts", "lib", "workflow-skills-catalog.cjs"));

const TIER_FIXTURE_WORKFLOWS = {
  "workflow-auto": { name: "Auto", activation: "auto", whenToUse: "fix a small thing", sequence: ["investigate", "fix"] },
  "workflow-feature": { name: "Feature", activation: "confirm", whenToUse: "build a feature", sequence: ["plan", "build", "review"] },
  "workflow-heavy": { name: "Heavy", activation: "manual", whenToUse: "run a large program", sequence: ["plan", "build", "review", "ship"] },
  "workflow-untiered": { name: "Untiered", whenToUse: "do an untiered thing", sequence: ["investigate"] },
};
const TIER_FRAMEWORK = { "workflow-auto": "auto", "workflow-feature": "confirm", "workflow-heavy": "manual", "workflow-untiered": "auto" };

function withTierProject({ team, personal, raw = {} }, fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wsc-tier-"));
  const redirected = ["HOME", "USERPROFILE", "TMPDIR", "TEMP", "TMP"];
  const blanked = Object.keys(process.env).filter((key) => /^CK_/.test(key)).concat(["CLAUDE_PROJECT_DIR"]);
  const saved = Object.fromEntries([...redirected, ...blanked].map((key) => [key, process.env[key]]));
  for (const key of redirected) process.env[key] = tmp;
  for (const key of blanked) delete process.env[key];
  try {
    fs.mkdirSync(path.join(tmp, ".claude"), { recursive: true });
    fs.mkdirSync(path.join(tmp, "docs"), { recursive: true });
    const workflows = Object.fromEntries(Object.entries(TIER_FIXTURE_WORKFLOWS).map(([id, wf]) => [
      id, { ...wf, preActions: { injectContext: "Use the selected workflow context." } },
    ]));
    fs.writeFileSync(path.join(tmp, ".claude", "workflows.json"), JSON.stringify({ version: "1.0.0", workflows }));
    const write = (rel, value) => fs.writeFileSync(path.join(tmp, rel), typeof value === "string" ? value : JSON.stringify(value, null, 2));
    if (team !== undefined) write(path.join("docs", "project-config.json"), team);
    if (personal !== undefined) write(path.join(".claude", ".ck.local.json"), personal);
    for (const [rel, value] of Object.entries(raw)) write(rel, value);
    return fn(tmp);
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const teamConfig = (workflowActivation) => ({ project: { name: "fixture" }, portability: { workflowActivation } });
// The tier cell of one workflow row in a catalog body: `| <tier> · N steps |` or pointer `| <tier> |`.
function rowTiers(body) {
  const tiers = {};
  for (const line of body.split("\n")) {
    const match = line.match(/^\| `(workflow-[a-z-]+)` \| (auto|confirm|manual)\b/);
    if (match) tiers[match[1]] = match[2];
  }
  return tiers;
}
// Every catalog form the route hook can deliver, each resolved from the project under `rootDir`.
const catalogForms = (rootDir) => ({
  full: buildWorkflowSkillsCatalog({ rootDir, sections: ["workflows"] }),
  compact: buildWorkflowSkillsCatalog({ rootDir, sections: ["workflows", "skills"], compact: true }),
  groups: buildWorkflowPointerCatalog({ rootDir, rows: "groups" }),
  tiers: buildWorkflowPointerCatalog({ rootDir, rows: "tiers" }),
});

// TC-WFR-006 — a broad project default can never loosen a workflow the framework marked stricter.
test("TC-WFR-006 effective tier tightens: default raises auto to confirm and never lowers manual", () => {
  // Property: for EVERY (framework tier, default tier) pair the effective tier is the stricter one.
  const order = routingConfig.ACTIVATION_TIERS;
  assert.deepEqual([...order], ["auto", "confirm", "manual"], "tier order is auto < confirm < manual");
  for (const framework of order) {
    for (const floor of order) {
      const expected = order[Math.max(order.indexOf(framework), order.indexOf(floor))];
      const actual = routingConfig.effectiveActivationTier("workflow-x", { activation: framework }, { default: floor, overrides: {} });
      assert.equal(actual, expected, `framework ${framework} + default ${floor}`);
    }
  }
  // Boundary counter-case: framework manual with default auto stays manual, never auto.
  assert.equal(routingConfig.effectiveActivationTier("workflow-x", { activation: "manual" }, { default: "auto" }), "manual");

  // Given a project whose team config sets the default to confirm
  withTierProject({ team: teamConfig({ default: "confirm" }) }, (dir) => {
    // When the effective tiers of an auto and a manual workflow are resolved
    const resolve = (workflowId) => routingConfig.resolveActivationTier({ rootDir: dir, workflowId, workflow: TIER_FIXTURE_WORKFLOWS[workflowId] });
    // Then the auto workflow is raised to confirm and the manual one stays manual
    assert.equal(resolve("workflow-auto"), "confirm");
    assert.equal(resolve("workflow-untiered"), "confirm", "an untiered workflow counts as auto, so it is raised too");
    assert.equal(resolve("workflow-heavy"), "manual");
    // And no catalog form the hook can deliver shows an auto row (SC-6), while manual stays manual
    for (const [form, body] of Object.entries(catalogForms(dir))) {
      const tiers = rowTiers(body);
      assert.deepEqual(tiers, { "workflow-auto": "confirm", "workflow-feature": "confirm", "workflow-heavy": "manual", "workflow-untiered": "confirm" }, `${form} rows`);
    }
  });

  // Edge: with no default and no override every workflow keeps its framework tier
  withTierProject({ team: { project: { name: "fixture" } } }, (dir) => {
    assert.deepEqual(rowTiers(catalogForms(dir).full), TIER_FRAMEWORK);
  });
});

// TC-WFR-007 — an override pins one workflow's tier, even when that loosens it.
test("TC-WFR-007 override loosens explicitly: a named workflow gets exactly its override tier", () => {
  // Given default confirm and the feature workflow overridden to auto (plus a stale override naming
  // a workflow that does not exist)
  const settings = { default: "confirm", overrides: { "workflow-feature": "auto", "workflow-heavy": "auto", "workflow-gone": "manual" } };
  withTierProject({ team: teamConfig(settings) }, (dir) => {
    const resolve = (workflowId) => routingConfig.resolveActivationTier({ rootDir: dir, workflowId, workflow: TIER_FIXTURE_WORKFLOWS[workflowId] });
    // When the overridden workflows are resolved, Then each is exactly its override — the override
    // wins over the default AND over a stricter framework tier
    assert.equal(resolve("workflow-feature"), "auto");
    assert.equal(resolve("workflow-heavy"), "auto", "an override may loosen a framework manual tier");
    // And the workflows it does not name still follow the default; the unknown id changes nothing
    assert.equal(resolve("workflow-auto"), "confirm");
    assert.equal(resolve("workflow-untiered"), "confirm");
    // And the catalog row of the overridden workflow shows its override
    assert.deepEqual(rowTiers(catalogForms(dir).compact), {
      "workflow-auto": "confirm", "workflow-feature": "auto", "workflow-heavy": "auto", "workflow-untiered": "confirm",
    });
  });
  // An override is looked up by the workflow's own id only — never through an inherited key.
  assert.equal(routingConfig.effectiveActivationTier("toString", {}, routingConfig.readWorkflowActivation(teamConfig({}))), "auto");
});

// TC-WFR-009 — the tier the assistant reads is the tier the project enforces.
test("TC-WFR-009 catalog shows effective tier: default manual renders manual on every row of every form", () => {
  // Given default manual and no override
  withTierProject({ team: teamConfig({ default: "manual", overrides: {} }) }, (dir) => {
    // When every catalog form is rendered, Then each row reads manual, never its framework tier
    for (const [form, body] of Object.entries(catalogForms(dir))) {
      const tiers = rowTiers(body);
      assert.deepEqual(Object.keys(tiers).sort(), Object.keys(TIER_FIXTURE_WORKFLOWS).sort(), `${form}: a workflow row is missing`);
      for (const [workflowId, tier] of Object.entries(tiers)) assert.equal(tier, "manual", `${form}: ${workflowId}`);
    }
    // And the legend tells the reader the rows are effective tiers, not the registry values
    assert.match(catalogForms(dir).compact, /Rows show the effective tier: project config may tighten/);
    // And the pointer-only form, which renders no rows, still tells the reader the registry tier
    // is not final and names the project setting plus the resolver (BR-WFR-04 in every form)
    const pointerOnly = buildWorkflowPointerCatalog({ rootDir: dir, rows: "none" });
    assert.deepEqual(rowTiers(pointerOnly), {}, "the pointer-only form has no workflow rows");
    assert.match(pointerOnly, /tier[^\n]*may be tightened or overridden by `portability\.workflowActivation`[^\n]*`start-workflow` resolves the effective tier/);
  });
  // Edge: the same project with one override to auto shows auto on that row alone
  withTierProject({ team: teamConfig({ default: "manual", overrides: { "workflow-feature": "auto" } }) }, (dir) => {
    const tiers = rowTiers(catalogForms(dir).full);
    assert.equal(tiers["workflow-feature"], "auto");
    for (const workflowId of ["workflow-auto", "workflow-heavy", "workflow-untiered"]) assert.equal(tiers[workflowId], "manual", workflowId);
  });
});

// TC-WFR-011 (tier layering) — a developer tightens routing for their own checkout without touching
// the team configuration. (The routing-switch half of this case is TC-WRS-025 in the hook suite.)
test("TC-WFR-011 personal file wins over the team configuration for tier settings", () => {
  const team = teamConfig({ overrides: { "workflow-feature": "auto" } });
  // Given the team sets no default and the personal file sets default manual
  withTierProject({ team, personal: { portability: { workflowAutoDetect: false, workflowActivation: { default: "manual" } } } }, (dir) => {
    const teamPath = path.join(dir, "docs", "project-config.json");
    const before = fs.readFileSync(teamPath, "utf8");
    // When the catalog is rendered, Then the personal default applies to every row the team did not
    // pin, and the team's per-workflow override still stands (no personal override for it)
    const tiers = rowTiers(catalogForms(dir).compact);
    assert.deepEqual(tiers, { "workflow-auto": "manual", "workflow-feature": "auto", "workflow-heavy": "manual", "workflow-untiered": "manual" });
    const resolved = routingConfig.resolveWorkflowActivation({ rootDir: dir });
    assert.equal(resolved.default, "manual");
    assert.equal(resolved.defaultSource, routingConfig.SOURCE_LOCAL_OVERRIDE);
    // And the team scope (tracked generators) never sees the personal value
    const teamScope = routingConfig.resolveWorkflowActivation({ rootDir: dir, scope: routingConfig.SCOPE_TEAM });
    assert.equal(teamScope.default, null);
    // And the team configuration is untouched
    assert.equal(fs.readFileSync(teamPath, "utf8"), before);
  });
  // A personal override for the same workflow wins over the team override for that workflow only
  withTierProject({ team, personal: { portability: { workflowActivation: { overrides: { "workflow-feature": "manual" } } } } }, (dir) => {
    assert.deepEqual(rowTiers(catalogForms(dir).full), { ...TIER_FRAMEWORK, "workflow-feature": "manual" });
  });
  // Each override is its own value: a personal override for another workflow keeps the team's
  // override for the feature workflow (per-key layering, not a wholesale replacement)
  withTierProject({ team, personal: { portability: { workflowActivation: { overrides: { "workflow-heavy": "confirm" } } } } }, (dir) => {
    assert.deepEqual(rowTiers(catalogForms(dir).full), { ...TIER_FRAMEWORK, "workflow-feature": "auto", "workflow-heavy": "confirm" });
  });
  // Edge: an unreadable personal file, or an invalid personal value, expresses no opinion — the team value applies
  for (const personal of ["{not json", { portability: { workflowActivation: { default: "strict", overrides: { "workflow-feature": "sometimes" } } } }]) {
    withTierProject({ team: teamConfig({ default: "confirm", overrides: { "workflow-feature": "auto" } }), personal }, (dir) => {
      assert.deepEqual(rowTiers(catalogForms(dir).full), {
        "workflow-auto": "confirm", "workflow-feature": "auto", "workflow-heavy": "manual", "workflow-untiered": "confirm",
      }, `personal ${JSON.stringify(personal)}`);
    });
  }
  // And the team layer honours a relocated project-config path declared in .claude/.ck.json
  withTierProject({ raw: {
    [path.join(".claude", ".ck.json")]: { portability: { projectConfigPath: "config/team.json" } },
  } }, (dir) => {
    fs.mkdirSync(path.join(dir, "config"), { recursive: true });
    fs.writeFileSync(path.join(dir, "config", "team.json"), JSON.stringify(teamConfig({ default: "manual" })));
    assert.equal(rowTiers(catalogForms(dir).tiers)["workflow-auto"], "manual");
  });
});

// BR-WFR-07 — only known tiers are accepted: a typo never changes a tier at runtime, and every
// validator that reads these settings (team project config, personal `.ck.local.json`) names it.
test("TC-WSC-014 activation tiers: runtime ignores an unknown tier and both validators name it", () => {
  const { WORKFLOW_ACTIVATION_TIERS: projectTiers, validateConfig } = require(path.join(repoRoot, ".claude", "hooks", "lib", "project-config-schema.cjs"));
  const { WORKFLOW_ACTIVATION_TIERS: ckTiers, validateCkConfig } = require(path.join(repoRoot, ".claude", "hooks", "lib", "ck-config-schema.cjs"));
  assert.deepEqual([...projectTiers], [...routingConfig.ACTIVATION_TIERS], "project-config schema tiers drifted from the resolver");
  assert.deepEqual([...ckTiers], [...routingConfig.ACTIVATION_TIERS], "ck-config schema tiers drifted from the resolver");

  // Runtime: an invalid team default or override is no opinion — framework tiers apply
  withTierProject({ team: teamConfig({ default: "Manual", overrides: { "workflow-auto": 3 } }) }, (dir) => {
    assert.deepEqual(rowTiers(catalogForms(dir).full), TIER_FRAMEWORK);
  });

  // Personal file validator: valid settings pass without an unknown-key warning
  const valid = validateCkConfig({ portability: { workflowActivation: { default: "confirm", overrides: { "workflow-feature": "auto" } } } });
  assert.ok(valid.valid, valid.errors.join("; "));
  assert.ok(!valid.warnings.some((warning) => warning.includes("workflowActivation")), valid.warnings.join("; "));
  // ...and an unknown tier is an error naming the setting and the three allowed tiers
  const badDefault = validateCkConfig({ portability: { workflowActivation: { default: "strict" } } });
  assert.ok(!badDefault.valid);
  assert.ok(badDefault.errors.some((error) => error.includes("portability.workflowActivation.default") && error.includes("auto, confirm, manual")), badDefault.errors.join("; "));
  const badOverride = validateCkConfig({ portability: { workflowActivation: { overrides: { "workflow-feature": "sometimes" } } } });
  assert.ok(badOverride.errors.some((error) => error.includes("portability.workflowActivation.overrides.workflow-feature") && error.includes("auto, confirm, manual")), badOverride.errors.join("; "));
  // Team validator accepts the same valid shape
  assert.ok(validateConfig({ project: { name: "fixture" }, portability: { workflowActivation: { default: "confirm", overrides: { "workflow-feature": "auto" } } } }).valid);
});

// TC-WFR-028 (BR-WFR-16): the catalog and the concise route tell a bug, a feature, already-specified work,
// a behavior-preserving restructure and not-yet-built work apart by observable behavior, so size alone never
// picks a workflow. A renamed or removed workflow must update the line in the same change.
test("TC-WFR-028 the catalog and the concise route pick a workflow by observable behavior and name only registered workflows", () => {
  const registered = new Set(Object.keys(workflowsDoc.workflows));
  const namedIn = (line) => [...line.matchAll(/`(workflow-[a-z0-9-]+)`/g)].map((match) => match[1]);
  // Given each catalog form that lists when to use each workflow, in both route modes
  for (const mode of ["ask", "auto"]) {
    for (const compact of [true, false]) {
      const out = buildWorkflowSkillsCatalog({ rootDir: repoRoot, sections: ["workflows"], compact, mode });
      const where = `${compact ? "compact" : "full"} / ${mode}`;
      // When the behavior line is read
      const lines = out.split("\n").filter((line) => line.startsWith("**Judge by observable behavior:**"));
      assert.equal(lines.length, 1, `${where}: exactly one behavior line`);
      const [line] = lines;
      // Then it maps each kind of behavior to its workflow and keeps size out of the choice
      assert.match(line, /met its spec and now fails → `workflow-bugfix`/, where);
      assert.match(line, /not yet in a canonical spec → `workflow-feature` \(`workflow-big-feature` when large or ambiguous\)/, where);
      assert.match(line, /specified but not yet built → `workflow-implement-spec`/, where);
      assert.match(line, /stays the same → `workflow-refactor` \(a local tidy-up stays direct\)/, where);
      assert.match(line, /planning only, nothing built \(an idea, or specs to turn into tasks\) → `workflow-planned-work`; a new product from scratch → `workflow-greenfield-init`/, where);
      assert.match(line, /Size alone never makes a task a workflow/, where);
      // And every workflow it names is registered
      const unknown = namedIn(line).filter((id) => !registered.has(id));
      assert.deepEqual(unknown, [], `${where}: the behavior line names unregistered workflows`);
    }
  }
  // Given the concise route cue
  const route = normalizeEol(fs.readFileSync(path.join(repoRoot, ".claude", "skills", "shared", "protocols", "concise-workflow-route.md"), "utf8"));
  // Then it carries the same discriminator and every workflow it names is registered
  assert.match(route, /^Judge by observable behavior: it worked or met its spec and now fails → bug; it changes and is not yet specified → feature; specified but not yet built → implement-spec; it stays the same → refactor; planning only, nothing built \(an idea, or specs to turn into tasks\) → planned work; a new product → greenfield\. Size alone never makes a task a workflow\.$/m);
  for (const id of ["workflow-bugfix", "workflow-implement-spec", "workflow-refactor", "workflow-planned-work", "workflow-greenfield-init"]) {
    assert.ok(route.includes(`\`${id}\``), `concise route lost its ${id} cue`);
  }
  assert.deepEqual(namedIn(route).filter((id) => !registered.has(id)), [], "the concise route names unregistered workflows");
});
