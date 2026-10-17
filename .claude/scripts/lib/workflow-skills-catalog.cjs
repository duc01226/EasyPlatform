"use strict";

/**
 * Shared builder for the concise Workflow & Skills catalog delivered by the default-on
 * UserPromptSubmit routing hook. Static CLAUDE/AGENTS/Codex context carries only a pointer to that hook.
 *
 * Single source of truth: .claude/workflows.json (+ each step-skill's SKILL.md
 * `description:` frontmatter). Emits a markdown BODY (no wrapping) — callers wrap:
 *   - Codex generator embeds it inside its WORKFLOWS:START/END block (applies the
 *     $-dialect rewrite itself).
 *   - Claude generator keeps the native `/` token style.
 *
 * Consumer: .claude/hooks/lib/workflow-route-delivery.cjs
 */

const fs = require("fs");
const path = require("path");
const { resolveAllWorkflowManifests } = require("./workflow-manifest.cjs");
const routingConfig = require("./workflow-routing-config.cjs");

const CK_SKILLS_START = "<!-- CK:WORKFLOW-SKILLS -->";
const CK_SKILLS_END = "<!-- /CK:WORKFLOW-SKILLS -->";

const DEFAULT_SECTIONS = ["routing", "workflows", "skills"];
// Values of `activation` in .claude/workflows.json (schema: WorkflowEntry.activation), in
// strictness order; owned by the tier resolver.
const ACTIVATION_TIERS = routingConfig.ACTIVATION_TIERS;
const ACTIVATION_LEGEND_ASK =
  "**Activation:** ask the workflow question (full workflow · slimmer custom route · execute directly) before you start a catalog workflow, in every tier; a direct, single-skill or custom-simple route asks nothing; the tier only orders the recommendation — `auto` by catalog fit, `confirm` the full workflow only when no leaner route would do, `manual` never the full workflow first. An explicit request runs every tier with no question. Rows show the effective tier: project config may tighten a workflow's `.claude/workflows.json` tier or override it.";
// Route mode `auto`: the workflow question still comes first; it only recommends the full workflow first (the route mode owner is workflow-routing-config.cjs).
const ACTIVATION_LEGEND_AUTO =
  "**Activation (mode auto):** ask the workflow question (full workflow · slimmer custom route · execute directly) before a catalog workflow you selected starts, recommending the full workflow first for an `auto` or `confirm` tier and never first for `manual`; a direct, single-skill or custom-simple route asks nothing. An explicit request runs every tier with no question. Rows show the effective tier: project config may tighten a workflow's `.claude/workflows.json` tier or override it.";
/** The tier legend for a route mode; `ask` (the default) for any other value. */
function activationLegend(mode) {
  return mode === "auto" ? ACTIVATION_LEGEND_AUTO : ACTIVATION_LEGEND_ASK;
}
// The routing discriminator (P46): which workflow a change belongs to, judged by its observable behavior, so the model can
// recommend feature, bugfix, refactor, implement-spec, planned-work or greenfield from the catalog it reads anyway.
const ROUTING_DISCRIMINATOR =
  "**Judge by observable behavior:** it worked or met its spec and now fails → `workflow-bugfix`; it changes and is not yet in a canonical spec → `workflow-feature` (`workflow-big-feature` when large or ambiguous); it is specified but not yet built → `workflow-implement-spec`; it stays the same → `workflow-refactor` (a local tidy-up stays direct); planning only, nothing built (an idea, or specs to turn into tasks) → `workflow-planned-work`; a new product from scratch → `workflow-greenfield-init`. Size alone never makes a task a workflow: a focused change in one module stays custom-simple.";
// The barrier legend carries the advancement rule (wf-cycle W5 reads it); every form renders it.
const BARRIER_LEGEND =
  "`[a ∥ b]` = one parallel phase (all-return barrier): start every member together and advance only after ALL return; `*` marks a conditional member.";
// Compact (runtime-hook) rendering: a when-to-use hint cap and the pointer that replaces step lists.
const COMPACT_HINT_MAX = 190;
// The shorter whole-clause hint a large registry falls back to before the catalog shrinks to an index (BR-WFR-02).
const COMPACT_HINT_FALLBACK_MAX = 130;
const COMPACT_STEPS_NOTE =
  "Step lists are omitted here: `start-workflow <id>` resolves the full sequence from `.claude/workflows.json` before creating tasks.";
// Pointer-only rendering: used when even the compact catalog would overflow the hook output cap.
const POINTER_ROWS = Object.freeze(["groups", "tiers", "none"]);
const POINTER_NOTE =
  "Index only — the full catalog exceeds the hook output cap. Read `.claude/workflows.json` for when-to-use and steps; `start-workflow <id>` resolves a workflow's full sequence before creating tasks. A workflow's `activation` tier there may be tightened or overridden by `portability.workflowActivation` in the project config; `start-workflow` resolves the effective tier.";
const ACTIVATION_RULE =
  "**Workflow question** (first task, every tier): when your route is to start a catalog workflow (never for a direct, single-skill or custom-simple route), never start it on your own. First ask the user ONE question — use ask user question tool to ask user, else plain text, then stop until the user answers — with three options, the recommended one first with a one-line reason: (a) the full workflow `<id>` with its step count; (b) a slimmer custom route listing its steps, keeping every required gate (root-cause investigation for bugs, tests, review, spec/doc sync on behavior change); (c) execute directly, no workflow or skill. Follow the answer without re-asking. The `activation` tier (`.claude/workflows.json`) only orders the recommendation: `auto` by catalog fit; `confirm` recommends the full workflow only when no leaner route would do; `manual` never recommends it first. An explicit user request runs every tier directly, with no question.";

// R8 LOCKSTEP. The loader (.claude/hooks/lib/project-config-loader.cjs) owns the portability token
// table; this module only runs its own resolution when that require FAILS (a stripped portable tree
// carries .claude/scripts/** without .claude/hooks/lib/). That branch resolves to the DEFAULTS —
// never a pass-through: a pass-through would render a literal `{SPEC_ROOT}` into the generated
// `## Workflow & Skills Catalog` table in CLAUDE.md / AGENTS.md, strictly worse than the hardcoded
// path it replaced. Defaults-only duplication (no config paths, no resolution logic), mirroring the
// same fallback in .claude/scripts/codex/sync-context-workflows.mjs.
const PORTABILITY_TOKEN_DEFAULTS = {
  SPEC_ROOT: "docs/specs",
  SPEC_ROOT_TECHNICAL: "docs/specs-technical",
  REF_DOCS_ROOT: "docs/project-reference",
  ADR_ROOT: "docs/adr",
  TEMPLATES_ROOT: "docs/templates",
  PLANS_ROOT: "plans",
  TEAM_ARTIFACTS_ROOT: "team-artifacts",
  PRODUCT_ROADMAP_DOC: "docs/product-roadmap.md",
};

function resolvePortabilityTokensFallback(text, config) {
  if (typeof text !== "string" || !text) return text;
  if (!text.includes("{")) return text;
  void config;
  return text.replace(/\{([A-Z][A-Z0-9_]*)\}/g, (match, token) =>
    Object.prototype.hasOwnProperty.call(PORTABILITY_TOKEN_DEFAULTS, token)
      ? PORTABILITY_TOKEN_DEFAULTS[token]
      : match
  );
}

function loadResolvePortabilityTokens() {
  try {
    const loader = require("../../hooks/lib/project-config-loader.cjs");
    if (typeof loader.resolvePortabilityTokens === "function") {
      return loader.resolvePortabilityTokens;
    }
    return resolvePortabilityTokensFallback;
  } catch {
    return resolvePortabilityTokensFallback;
  }
}

const resolvePortabilityTokens = loadResolvePortabilityTokens();

// Module lives at .claude/scripts/lib/ → repo root is three levels up.
function defaultRootDir() {
  return path.resolve(__dirname, "..", "..", "..");
}

// Collapse to a single, pipe-safe markdown table cell.
function safeCell(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\|/g, "\\|");
}

// Decode a YAML frontmatter scalar: strip the surrounding quotes AND undo the escaping that
// quote style implies. Stripping the wrapper alone is NOT enough — a single-quoted scalar encodes
// an apostrophe as a DOUBLED quote, so `'a bug''s root cause'` de-wrapped but not decoded renders
// the artifact `a bug''s root cause` into every generated surface (CLAUDE.md, AGENTS.md, the Codex
// mirrors) with nothing downstream to catch it.
//
// One of THREE copies of this contract: stripQuotes() in
// .claude/scripts/codex/migrate-claude-to-codex.mjs and unquoteYamlScalar() in
// .claude/scripts/skill-gc.cjs. They must stay behaviourally identical — the same description has
// to render the same on every surface — and `decoder-parity.test.mjs` is what enforces that. The
// single-quoted branch's repeat-until-stable collapse also absorbs the double-escaping that legacy
// non-idempotent normalization left behind; its cost is that two GENUINE consecutive apostrophes
// over-collapse to one, which is accepted (legacy double-escaping is observed; `don''''t` is not).
function unquote(value) {
  const s = String(value).trim();
  if (s.length < 2) return s;
  if (s.startsWith("'") && s.endsWith("'")) {
    let out = s.slice(1, -1);
    let previous = "";
    while (out !== previous) {
      previous = out;
      out = out.replace(/''/g, "'");
    }
    return out.trim();
  }
  if (s.startsWith('"') && s.endsWith('"')) {
    // Double-quoted YAML escapes with a backslash; only the escapes a one-line description can
    // realistically carry are decoded here.
    return s
      .slice(1, -1)
      .replace(/\\(["\\/])/g, "$1")
      .trim();
  }
  return s;
}

/**
 * Condense a workflow's `whenToUse` into a short, scannable trigger hint.
 * Every runtime surface renders the hint through this one function; TC-WSC-004 holds an independent
 * reference copy, so a change here must be made there too.
 */
function condenseWhenToUse(
  whenToUse,
  { maxClauses = 5, maxLen = COMPACT_HINT_MAX } = {}
) {
  if (!whenToUse || typeof whenToUse !== "string") return "";
  // Whole clauses, so the model reads complete triggers (BR-WFR-02): a clause that would push the hint past maxLen is
  // left out rather than cut mid-phrase; only a first clause longer than maxLen is shortened, marked "…".
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

// The base skill token of a sequence step ("work-item --mode=review --type=task" -> "work-item").
function baseSkill(step) {
  return String(step).split(/\s+/)[0];
}

function readWorkflowsDoc(rootDir) {
  const p = path.join(rootDir, ".claude", "workflows.json");
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

// The static catalog is a route-selection aid, but it must not hide the
// complete selected-mode task list. Resolve explicit variants through the
// same canonical manifest helper used by activation; legacy entries retain
// their compatibility sequence until they are migrated.
function resolvedModeSequences(rootDir, workflowId, workflow) {
  return resolveCatalogManifests(rootDir, workflowId, workflow)
    .map((manifest) => ({ mode: manifest.mode, sequence: manifest.sequence }));
}

// Tokenize one resolved mode in sequence order: a plain step is `{ text }`, and each declared
// all-return barrier collapses into one `{ text: "[a ∥ b*]", group: true }` token (`*` = conditional
// member). Shared by the full row (every token) and the compact row (group tokens only), so both
// render a barrier identically.
function groupedSequenceTokens(manifest) {
  const occurrences = Array.isArray(manifest.occurrences) ? manifest.occurrences : [];
  const groups = new Map((manifest.parallelGroups || []).map((group) => [group.id, group]));
  const tokens = [];
  let open = null;
  manifest.sequence.forEach((step, index) => {
    const occurrence = occurrences[index];
    const group = occurrence && occurrence.barrier ? groups.get(occurrence.barrier) : null;
    if (!group) {
      open = null;
      tokens.push({ text: safeCell(step), group: false });
      return;
    }
    const conditional = (group.conditionalMembers || []).includes(occurrence.id) ? "*" : "";
    if (!open || open.id !== group.id) {
      open = { id: group.id, members: [], group: true };
      tokens.push(open);
    }
    open.members.push(`${safeCell(step)}${conditional}`);
  });
  return tokens.map((token) =>
    token.group ? { text: `[${token.members.join(" ∥ ")}]`, group: true } : token
  );
}

// Render one resolved mode as its flat step list, collapsing each declared all-return barrier into
// a single bracketed step. Every flat step token stays present verbatim, so the row remains a
// complete task list for the selected mode.
function renderGroupedSequence(manifest) {
  return groupedSequenceTokens(manifest).map((token) => token.text).join(" → ");
}

// Compact form of one resolved mode: only its barrier tokens, in sequence order ('' when the mode
// declares no parallel group). The full step list is resolved by `start-workflow` at activation.
function renderBarrierGroups(manifest) {
  return groupedSequenceTokens(manifest)
    .filter((token) => token.group)
    .map((token) => token.text)
    .join(" · ");
}

function resolveCatalogManifests(rootDir, workflowId, workflow) {
  const document = readWorkflowsDoc(rootDir);
  const declared = [];
  if (Array.isArray(workflow && workflow.sequence)) declared.push(...workflow.sequence);
  if (workflow && workflow.variants && typeof workflow.variants === "object") {
    for (const variant of Object.values(workflow.variants)) {
      if (Array.isArray(variant && variant.sequence)) declared.push(...variant.sequence);
    }
  }
  // Catalog generation intentionally tolerates pseudo-steps whose skill directories are absent so
  // adopters can preview a workflow.  The resolver still validates mode/occurrence/barrier shape;
  // supplying the declared skill set only disables its filesystem-existence check for this
  // presentation surface (activation performs the real skill-file check).
  const availableSkills = new Set(
    declared
      .map((step) => (typeof step === "string" ? step.trim().split(/\s+/, 1)[0] : step && step.skill))
      .filter((skill) => typeof skill === "string" && skill.length > 0)
  );
  return resolveAllWorkflowManifests(document, workflowId, { rootDir, availableSkills });
}

function resolveSkillDescription(rootDir, skill, cache) {
  if (cache.has(skill)) return cache.get(skill);
  let desc = "";
  try {
    const raw = fs.readFileSync(
      path.join(rootDir, ".claude", "skills", skill, "SKILL.md"),
      "utf8"
    );
    const m = raw.match(/^description:\s*(.+)$/m);
    if (m) desc = unquote(m[1]);
  } catch {
    // Skill dir absent (pseudo-step) — fall through to fallback below.
  }
  if (!desc) desc = "(workflow step)";
  cache.set(skill, desc);
  return desc;
}

function renderRoutingSection() {
  return [
    "### Routing Decision Guide",
    "",
    "Assess briefly FIRST — scope, change type (answer/tweak/behavior/public contract), risk, ambiguity, artifacts actually needed — then route (declare `Route: {id|skill|custom-simple [steps]|direct} — because {key signals}`, then activate it):",
    "",
    "| Signals | Route |",
    "| --- | --- |",
    "| Question, lookup, or trivial low-risk edit; one skill covers it | **direct execution** (plain answer or that one skill) |",
    "| Focused change: one module/policy, clear intent, no public-contract change | **custom simple workflow** — sequence only the needed canonical steps |",
    "| Non-trivial bug / regression / wrong output, cause unknown or wide reach | **`workflow-bugfix`** |",
    "| Non-trivial feature or enhancement changing behavior or a contract across modules | **`workflow-feature`** (when large/ambiguous/research-heavy, select `workflow-big-feature` instead — confirm tier) |",
    "| Matches a skill's or workflow's \"Use\" clause | that skill / workflow |",
    "",
    "The table route is the default. Keep a catalog workflow only when >80% of its unconditional steps would do real work for the request; otherwise downgrade to custom-simple, trimming only steps that would do no real work. A behavior change keeps its test and review steps; a downgraded route also keeps root-cause investigation for bugs and spec/doc sync when behavior or a public contract changes. An explicit `/skill` or `/workflow` in the prompt is the user's choice — execute it. Otherwise select the route yourself and never ask which path to take, except the workflow question below, asked only when your route is to start a catalog workflow; a direct, single-skill or custom-simple route (a Catalog-fit downgrade included) proceeds without asking.",
    "",
    ACTIVATION_RULE,
    "",
    "**Mid-session: never auto-activate a workflow or ask to start one.** The workflow question applies only to the first task of a session (its first user prompt; compaction or resume does not reset it). Once work is under way (follow-up, correction, next step, or a new ask), do it directly or with the best-fit skill or a lean chain of at most 3 skills; required gates (root-cause investigation for a bug, test, review, spec/doc sync, and any other required quality gate) still run and do not count toward that cap, and continuing a workflow already running is not activating one. An explicit workflow request always runs, mid-session included — a `/workflow-*` or `/start-workflow <id>` call, or the user asking in words to use a workflow; follow it.",
  ].join("\n");
}

// `whenToUse` (and any `description` this module renders) is a ROUTED field: it lands in the
// GENERATED catalog table, so portability tokens are resolved BEFORE condensing/rendering.
// Unknown braces (`{Bucket}`, `{plan-id}`, `--type={task|story}`) are left verbatim by the resolver.
//
// `opts.compact` renders the runtime-hook form: the last column keeps only each mode's barrier
// tokens (the step list is resolved by `start-workflow` at activation) and the hint is capped at
// COMPACT_HINT_MAX. The barrier legend stays in both forms: it carries the advancement rule.
function renderWorkflowsSection(entries, rootDir, config, opts = {}) {
  const compact = opts.compact === true;
  // A caller may ask for shorter hints (never longer than the cap) so a large registry keeps its compact rows
  const hintMax = Number.isInteger(opts.hintMax) && opts.hintMax > 0 ? Math.min(opts.hintMax, COMPACT_HINT_MAX) : COMPACT_HINT_MAX;
  const activation = catalogActivation(rootDir, config, opts);
  const rows = entries.map(([id, wf]) => {
    const whenToUse = resolvePortabilityTokens(wf && wf.whenToUse, config);
    const hint = condenseWhenToUse(whenToUse, { maxLen: compact ? hintMax : COMPACT_HINT_MAX }) || safeCell((wf && wf.name) || id);
    const modes = resolveCatalogManifests(rootDir, id, wf);
    const label = modes.length > 1 ? (manifest, text) => `${safeCell(manifest.mode)}: ${text}` : (manifest, text) => text;
    const last = compact
      ? modes
          .map((manifest) => [manifest, renderBarrierGroups(manifest)])
          .filter(([, groups]) => groups)
          .map(([manifest, groups]) => label(manifest, groups))
          .join("; ")
      : modes.map((manifest) => label(manifest, renderGroupedSequence(manifest))).join("; ");
    const cell = compact ? clipCell(hint, hintMax) : hint;
    return `| \`${id}\` | ${activationTier(wf, { workflowId: id, activation })} · ${stepCountLabel(modes)} | ${cell} | ${last} |`;
  });
  return [
    `### Workflows Index (${entries.length})`,
    "",
    BARRIER_LEGEND,
    "",
    activationLegend(opts.mode),
    "",
    ROUTING_DISCRIMINATOR,
    "",
    ...(compact
      ? [COMPACT_STEPS_NOTE, "", "| Workflow | Activation | When to use | Parallel phases |"]
      : ["| Workflow | Activation | When to use | Steps |"]),
    "| --- | --- | --- | --- |",
    ...rows,
  ].join("\n");
}

/** Cap a rendered cell at `max` characters, marking the cut with an ellipsis. */
function clipCell(text, max) {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/**
 * A workflow's activation tier. Without `options.activation` it is the framework tier (an absent or
 * unknown value is `auto`, the behavior before tiers existed); with resolved project settings it is
 * the effective tier, delegated to the resolver in workflow-routing-config.cjs.
 * @param {object} workflow its `.claude/workflows.json` entry
 * @param {{workflowId?: string, activation?: object|null}} [options]
 */
function activationTier(workflow, options = {}) {
  if (options.activation) {
    return routingConfig.effectiveActivationTier(options.workflowId, workflow, options.activation);
  }
  return routingConfig.frameworkActivationTier(workflow);
}

/**
 * The tier settings a catalog renders with: `opts.activation` when the caller resolved them
 * (`null` = framework tiers); otherwise the `config` object alone (team scope) when one is given;
 * otherwise the project's team config plus the developer's local override under `rootDir`.
 */
function catalogActivation(rootDir, config, opts = {}) {
  if (opts.activation !== undefined) return opts.activation;
  return routingConfig.resolveWorkflowActivation(
    config !== undefined && config !== null ? { config } : { rootDir }
  );
}

/** Step count of the resolved sequence, as a range when the workflow's modes differ in length. */
function stepCountLabel(manifests) {
  const counts = manifests.map((manifest) => manifest.sequence.length);
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  return min === max ? `${min} steps` : `${min}–${max} steps`;
}

function renderSkillsSection(skills, rootDir, cache, config, opts = {}) {
  // Compact: names only — each step skill already reaches the model with its description through
  // the host's own skill list.
  if (opts.compact === true) return `Step skills: ${skills.join(", ")}`;
  const rows = skills.map((skill) => {
    const desc = safeCell(
      resolvePortabilityTokens(resolveSkillDescription(rootDir, skill, cache), config)
    );
    return `| \`${skill}\` | ${desc} |`;
  });
  return [
    `### Workflow Skills (${skills.length} composable steps)`,
    "",
    "Distinct step-skills used across the workflows above — compose these into a custom workflow when no standard workflow fits.",
    "",
    "| Skill | Use for |",
    "| --- | --- |",
    ...rows,
  ].join("\n");
}

/**
 * Build the concise catalog markdown body.
 * @param {object} [opts]
 * @param {string} [opts.rootDir] repo root (defaults to resolved repo root)
 * @param {string[]} [opts.sections] subset of ["routing","workflows","skills"]
 * @param {object} [opts.config] parsed project-config.json; the loader loads + caches it when omitted
 * @param {boolean} [opts.compact] runtime-hook form: barrier tokens instead of step lists, capped
 *   hints, and a names-only step-skill line
 * @param {"ask"|"auto"} [opts.mode] route mode the tier legend describes (default `ask`)
 * @param {object|null} [opts.activation] resolved tier settings (`resolveWorkflowActivation`);
 *   `null` renders framework tiers. Omitted: read from `opts.config` when given (team scope),
 *   otherwise from the team config and local override under `rootDir` (effective scope).
 * @returns {string} markdown body (no CK markers)
 */
function buildWorkflowSkillsCatalog(opts = {}) {
  const rootDir = opts.rootDir || defaultRootDir();
  const config = opts.config;
  const render = { compact: opts.compact === true, mode: opts.mode, hintMax: opts.hintMax, activation: catalogActivation(rootDir, config, opts) };
  const sections = opts.sections || DEFAULT_SECTIONS;
  const doc = readWorkflowsDoc(rootDir);

  const entries = Object.entries(doc.workflows || {}).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  for (const [workflowId, workflow] of entries) {
    const injectContext = workflow && workflow.preActions && workflow.preActions.injectContext;
    if (typeof injectContext !== "string" || injectContext.trim().length === 0) {
      throw new Error(
        `Workflow ${workflowId} is missing required non-empty preActions.injectContext`
      );
    }
  }

  const skillSet = new Set();
  for (const [workflowId, wf] of entries) {
    for (const { sequence } of resolvedModeSequences(rootDir, workflowId, wf)) {
      for (const step of sequence) skillSet.add(baseSkill(step));
    }
  }
  const skills = [...skillSet].sort((a, b) => a.localeCompare(b));

  const cache = new Map();
  const blocks = ["## Workflow & Skills Catalog", ""];
  blocks.push(
    "Runtime reference derived from `.claude/workflows.json` — use it to pick a route for the current prompt: run a standard workflow, compose a custom workflow from the step-skills, invoke a single skill, or execute directly."
  );
  blocks.push("");

  for (const section of sections) {
    if (section === "routing") blocks.push(renderRoutingSection(), "");
    else if (section === "workflows")
      blocks.push(renderWorkflowsSection(entries, rootDir, config, render), "");
    else if (section === "skills")
      blocks.push(renderSkillsSection(skills, rootDir, cache, config, render), "");
  }

  return blocks.join("\n").trimEnd();
}

/**
 * Build the pointer-only catalog body the runtime hook falls back to when the compact catalog
 * would overflow the hook output cap. Always carries the barrier legend (advancement clause) and
 * the pointer to `.claude/workflows.json` / `start-workflow <id>`.
 * @param {object} [opts]
 * @param {string} [opts.rootDir] repo root (defaults to resolved repo root)
 * @param {"groups"|"tiers"|"none"} [opts.rows] one row per workflow with tier and barrier tokens
 *   (`groups`), with tier only (`tiers`), or no workflow rows (`none`)
 * @param {object} [opts.config] parsed project config (team-scope tier settings)
 * @param {object|null} [opts.activation] resolved tier settings; see buildWorkflowSkillsCatalog
 * @param {"ask"|"auto"} [opts.mode] route mode the tier legend describes (default `ask`)
 * @returns {string} markdown body (no CK markers)
 */
function buildWorkflowPointerCatalog(opts = {}) {
  const rootDir = opts.rootDir || defaultRootDir();
  const rows = POINTER_ROWS.includes(opts.rows) ? opts.rows : "groups";
  const entries = Object.entries(readWorkflowsDoc(rootDir).workflows || {}).sort((a, b) =>
    a[0].localeCompare(b[0])
  );
  const blocks = ["## Workflow & Skills Catalog", "", POINTER_NOTE, "", BARRIER_LEGEND];
  if (rows !== "none") {
    const activation = catalogActivation(rootDir, opts.config, opts);
    const tierOf = (id, wf) => activationTier(wf, { workflowId: id, activation });
    const lines = entries.map(([id, wf]) => {
      if (rows === "tiers") return `| \`${id}\` | ${tierOf(id, wf)} |`;
      const modes = resolveCatalogManifests(rootDir, id, wf);
      const groups = modes
        .map((manifest) => [manifest, renderBarrierGroups(manifest)])
        .filter(([, text]) => text)
        .map(([manifest, text]) => (modes.length > 1 ? `${safeCell(manifest.mode)}: ${text}` : text))
        .join("; ");
      return `| \`${id}\` | ${tierOf(id, wf)} | ${groups} |`;
    });
    blocks.push(
      "",
      activationLegend(opts.mode),
      "",
      `### Workflows (${entries.length})`,
      "",
      rows === "tiers" ? "| Workflow | Activation |" : "| Workflow | Activation | Parallel phases |",
      rows === "tiers" ? "| --- | --- |" : "| --- | --- | --- |",
      ...lines
    );
  }
  return blocks.join("\n");
}

module.exports = {
  buildWorkflowSkillsCatalog,
  buildWorkflowPointerCatalog,
  POINTER_ROWS,
  renderWorkflowsSection,
  activationTier,
  ACTIVATION_TIERS,
  COMPACT_HINT_MAX,
  COMPACT_HINT_FALLBACK_MAX,
  condenseWhenToUse,
  baseSkill,
  resolvedModeSequences,
  CK_SKILLS_START,
  CK_SKILLS_END,
};
