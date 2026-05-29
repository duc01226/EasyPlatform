---
name: review-ui
description: '[Code Quality] Use when reviewing UI/frontend changes for long-content overflow, responsive multi-screen layout, flex-vs-fixed sizing, z-index discipline, and SCSS/BEM styling quality.'
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->

## Codex Project-Reference Loading (No Hooks)

Codex does not receive Claude hook-based doc injection.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec/test-case planning or TC mapping: `feature-docs-reference.md`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Validate UI/frontend changes for the five visual-quality dimensions that break in production but slip past correctness review — long-content overflow & truncation, responsive multi-screen layout, flex-grow vs fixed sizing, z-index scale discipline, and SCSS/CSS/BEM styling quality.

**Default scope:** All uncommitted frontend changes (staged + unstaged) matching the frontend path and file-extension patterns declared by the project configuration/docs index. Override: specify files, directories, components, or full frontend codebase.

> **CONDITIONAL — SKIP when no frontend files in scope.** In workflow context this skill is SKIPPED when the diff has no files matching the project frontend path/extension patterns. If invoked standalone with no frontend changes → announce `"No frontend changes detected — review-ui skipped"` and report clean.

> **ROUTING BOUNDARY (read before starting):**
>
> - **`review-ui` (this skill)** — the project UI review GATE wired into the `review` / `review-changes` workflows. Purpose: find issues, assign severity, give project-specific fix guidance citing real reuse targets (sourced from the project reference docs). Sibling of `review-architecture`.
> - **`web-design-guidelines`** — a generic, standalone accessibility / UX checklist. Cross-read it for a11y depth (WCAG, focus order, ARIA, contrast); do NOT duplicate its content here.
> - **`ui-ux-designer`** — specialized UI/UX, accessibility, responsive layout, and design-token review/authoring sub-agent when the local agent catalog provides it.

> **MANDATORY MUST ATTENTION** Plan tasks to READ UI rules BEFORE reviewing:
>
> 1. Project styling rules doc — BEM convention, mixins, variables, responsive patterns **(READ FIRST — primary styling rules source; resolve via project config/docs index)**
> 2. Project design-system/token doc — design tokens, especially the **Z-Index & Layering** section
> 3. Project frontend architecture/patterns doc — base component classes, state/store, API service, lifecycle teardown rules shared with `review-architecture`
> 4. Project code-review rules doc — anti-patterns and conventions **(read directly; do not rely on hook-injected conversation text)**
>
> Not found → search: "scss styling", "design tokens", "frontend patterns". Rules come from docs — NOT general knowledge.

**Workflow:**

1. **Phase 0: Load UI Rules** — Resolve and read the four project UI/styling rule docs above
2. **Phase 1: Determine Scope** — Changed frontend files (default) or user-specified scope
3. **Phase 2: Blast Radius** — Run graph trace if graph.db exists
4. **Phase 3: UI Category Review** — Check each file against all 5 applicable categories
5. **Phase 4: Finalize** — Generate compliance report with PASS/BLOCKED/WARN verdicts
6. **Round 2: Fresh UI/UX review sub-agent** — after any fix cycle, using the local sub-agent selection guide

**Key Rules:**

- Write findings to `plans/reports/ui-review-{date}-{slug}.md`
- BLOCKED = must fix before merge | WARN = review and decide | PASS = compliant
- Every violation needs `file:line` proof + grep 3+ counterexamples before flagging
- Skill reviews only — NEVER fixes code

## Your Mission

<task>
$ARGUMENTS
</task>

## First Principle — Easy to Change

> **The success metric of every coding decision is _future change cost_.**
> DRY, SRP, abstraction, design patterns, naming, layering, tests — every
> technique exists to serve one goal: **making the next change cheaper**.

When evaluating styling, a layout, a token, or a component, ask:
**does this make the next change cheaper or more expensive?**

- Reject "best practices" that raise change cost (hardcoded values forcing
  per-file edits, hand-rolled overflow handling, raw breakpoints,
  copy-pasted truncation CSS).
- Name the real enemies in findings: **magic values, duplicated styling
  knowledge, fixed sizing that fights the viewport, cross-system token
  mixing, z-index escalation wars**.
- A simpler layout that survives 320px and a 200-char value beats a
  pixel-perfect fixed layout that breaks on either.

Apply this lens **before** invoking any specific rule, pattern, or checklist
below — if a downstream rule would raise change cost, this principle wins.

---

## Review Mindset (NON-NEGOTIABLE)

Skeptical. Every claim needs traced proof, confidence >80%.

- NEVER flag a styling violation without reading the actual SCSS/template + tracing the rendered element
- Every finding MUST include `file:line` evidence
- Before flagging a pattern violation: grep 3+ existing examples — codebase convention wins
- Question: "Is this actually a violation, or an established exception (icon dimensions, fixed brand assets, genuinely fixed UI)?"

## Phase 0: Load UI Rules (MANDATORY FIRST)

> **MUST ATTENTION:** Read project UI docs BEFORE reviewing. Rules come from docs, not general knowledge.

- MUST ATTENTION read the project styling rules doc — extract BEM convention, mixin names, variable names, responsive breakpoint mixins, nesting limits
- MUST ATTENTION read the project design-system/token doc — extract design tokens and the **Z-Index & Layering** section
- MUST ATTENTION read the project frontend architecture/patterns doc — extract base component classes, store/effect patterns, API service base, lifecycle teardown pattern
- MUST ATTENTION read the project code-review rules doc — extract frontend anti-patterns and review rules directly

> **CROSS-SYSTEM WARNING (carry through every category):** Do NOT mix token systems with incompatible root-size, namespace, or layer assumptions in one file. When flagging a fix, recommend whichever token system the file already imports/uses; never introduce another system unless the project docs explicitly require migration.

## Phase 1: Determine Scope

**Default (no override):** Review all uncommitted frontend changes.

```bash
git status          # List changed files
git diff            # Staged + unstaged changes
git diff --cached   # Staged only
```

- Collect file list to review
- Filter to files matching the project frontend path/extension patterns resolved from project config/docs
- If ZERO frontend files match → announce `"No frontend changes detected — review-ui skipped"` and report clean (honor the CONDITIONAL skip)

## Phase 2: Blast Radius (if graph.db exists)

- If `.code-graph/graph.db` exists: run graph trace on key changed component files
- Record: impacted file count, shared-component fan-out (a changed shared-library component affects every consumer app), risk level
- Prioritize review by highest-impact files first (shared library components > app-local components)
- Graph unavailable: note "Graph not available — skipping blast radius" and proceed

For each changed component/style file with downstream impact:

```bash
python .claude/scripts/code_graph trace <changed-file> --direction both --json
```

Use `--node-mode file` first (10-30x less noise), then `--node-mode function` for detail. Flag shared-component consumers impacted by a styling or layout change.

## Phase 3: UI Category Review

Create report: `plans/reports/ui-review-{date}-{slug}.md`

For EACH file in scope, evaluate against ALL applicable categories. Skip categories not applicable to the file type (e.g., a pure `.ts` store file skips overflow/sizing/z-index but still hits Category 5's architecture checks).

> **Apply the `Think:` reasoning prompt before each category — derive violations, do NOT recite checklists.**

---

### Category 1: Long-Content Overflow & Truncation — Severity: WARN (HIGH when a flex child truncates with no `min-width: 0`)

**Think:** Does every text container survive a 200-char value? Single-line or multi-line? Can the user still read the full value when it is truncated?

**Detection signals:**

- Hand-rolled `text-overflow: ellipsis` (with `white-space: nowrap` / `overflow: hidden` re-declared by hand) instead of the project mixin/directive
- A flex child that truncates but has **NO `min-width: 0`** — the flex-overflow trap: a flex item's default `min-width: auto` refuses to shrink below content width, so ellipsis never triggers
- Truncated text with **NO tooltip / `title`** to reveal the full value

**DECISION RULE the reviewer enforces:**

- Single-line labels / table cells / chips → ellipsis **+ tooltip-on-overflow**
- Multi-line prose / descriptions → wrap or `-webkit-line-clamp`

**Project fix guidance** (cite real reuse targets from the resolved styling rules doc):

- Prefer the project's documented overflow/ellipsis directive, component, or utility. It must expose the full value only when the element actually overflows and must handle the flex `min-width` trap.
- OR the project's documented truncate/text-ellipsis mixins or utility classes from the styling rules doc.
- Multi-line: use the project-documented clamp pattern.

**GOOD vs BAD:** a utility/token-driven truncation that exposes the full value on overflow (tooltip/`title`) is correct; a hand-rolled substring / width-math truncation, or truncated text with no tooltip, is the anti-pattern. Cite the styling rules doc for the project's reuse targets.

---

### Category 2: Responsive Multi-Screen via Flex — Severity: WARN

**Think:** Is this usable at 320 / 768 / 1024 / 1440? Does the layout flex, or is it a fixed grid that overflows the small screen?

**Detection signals:**

- Raw `@media (max-width: NNNpx)` / `(min-width: NNNpx)` in component SCSS that bypasses the breakpoint mixins
- Non-flex fixed layouts that cannot reflow

**Project fix guidance:**

- The project documented responsive-flex mixins/utilities
- Breakpoints from the project breakpoint tokens — NEVER inline pixel breakpoints

**Anti-patterns:** raw `@media` pixel breakpoints that bypass the project's breakpoint mixins, and non-flex fixed grids that cannot reflow. Cite the styling rules doc for documented offenders; grep the changeset for the same patterns.

---

### Category 3: Flex-Grow vs Fixed Width/Height (prefer min/max) — Severity: WARN

**Think:** Must this size be fixed, or can it grow/shrink with content + viewport?

**Detection signals:**

- Fixed `width:` / `height:` in px (≥ ~3 digits) on containers / cards / forms / dialogs

**Project fix guidance:**

- Prefer `flex: 1` / `flex-grow` + `max-width` / `min-width` caps, and `min-width: 0` on truncating flex children
- The project flex-container mixin/utility documented in the styling rules doc
- Reserve fixed px for icons / borders / genuinely fixed UI

**Anti-patterns:** large fixed `width:` / `height:` in px on containers / cards / forms / dialogs (e.g. `width: 964px`, `height: 772px`) that should flex with content + viewport. Cite the styling rules doc for documented offenders.

---

### Category 4: Z-Index Scale Discipline — Severity: BLOCKED (HARD GATE)

**Think:** Which layer does this surface belong to (base / raised / dropdown / sticky / modal / toast)?

**Detection signals:**

- Raw numeric `z-index` (literal value instead of a token)
- **ANY `z-index` with `!important` → BLOCKED** (an escalation war that the next dev will only beat with a bigger literal)

**Project fix guidance — use tokens:**

- The project documented z-index layer tokens
- Existing legacy/framework token systems only when the current file already uses that system
- The semantic layer variables declared canonical by the project design-system doc

Cross-reference the project design-system **Z-Index & Layering** map. The chosen token MUST match the surface's semantic layer.

**GOOD vs BAD:** a `z-index` set from a semantic token / layer scale is correct; a raw literal (e.g. `z-index: 99999`, `z-index: 10000`) or `z-index: N !important` is the anti-pattern. Cite the design-system and styling docs for the project's token scale and documented offenders.

---

### Category 5: SCSS/CSS Best Practices & BEM — Severity: WARN (BLOCKED on `!important`, chained BEM modifiers)

**Think:** Does this stylesheet read cleanly, follow BEM, and use tokens — or does it hardcode, over-nest, and chain modifiers?

**Detection signals:**

- Nesting > 3 levels
- Hardcoded hex colors (should use CSS vars / design tokens)
- `px` where `rem` is expected
- Chained BEM modifiers (`.block__element.--modifier`) — `.--mod` MUST be a separate class, NEVER chained → BLOCKED
- Template elements missing BEM classes
- `!important` → BLOCKED

Apply fixes per the resolved project styling rules doc.

**Frontend architecture checks (OWNED JOINTLY WITH `review-architecture` Category 8 — reference, do not drift):**

> These checks are lifted from `review-architecture` Category 8 so the two skills stay synchronized. They are **owned jointly**; when one changes, update both. They apply to the `.ts` files in scope:

- Components MUST extend the project-documented base component/form/store component classes (BLOCKED)
- State MUST use the project-documented store/effect pattern — NEVER ad hoc local state when the project provides a canonical store pattern (BLOCKED)
- API services MUST extend the project-documented API service base — NEVER raw HTTP clients when the project provides a service abstraction (BLOCKED)
- All subscriptions MUST use `.pipe(this.untilDestroyed())` — NEVER manual unsubscribe (BLOCKED)
- All template elements MUST have BEM classes (WARN)
- Logic in lowest layer: Model > Service > Component (WARN)

---

## Phase 4: Finalize — UI Compliance Report

Update report with final sections:

### Verdict Scoring

| Verdict     | Condition                                       |
| ----------- | ----------------------------------------------- |
| **BLOCKED** | 1+ BLOCKED findings — must fix before merge     |
| **WARN**    | 0 BLOCKED, 1+ WARN findings — review and decide |
| **PASS**    | 0 BLOCKED, 0 WARN — UI compliant                |

### Report Structure

```markdown
# UI Review Report — {date}

## Scope

- Files reviewed: {count}
- Components / apps affected: {list}
- Blast radius: {summary from Phase 2}

## Verdict: {PASS | WARN | BLOCKED}

## BLOCKED Findings (Must Fix)

### {Category}: {description}

- **File:** {path}:{line}
- **Rule:** {rule from project UI doc}
- **Evidence:** {what was found}
- **Fix:** {reuse target to use — directive / mixin / token}

## WARN Findings (Review)

### {Category}: {description}

- **File:** {path}:{line}
- **Rule:** {rule from project UI doc}
- **Evidence:** {what was found}
- **Recommendation:** {suggested action}

## PASS Categories

- {list of categories that passed with no findings}

## UI Health Summary

- Long-content Overflow & Truncation: {PASS/WARN/BLOCKED}
- Responsive Multi-Screen: {PASS/WARN/BLOCKED}
- Flex-Grow vs Fixed Sizing: {PASS/WARN/BLOCKED}
- Z-Index Scale Discipline: {PASS/WARN/BLOCKED}
- SCSS/CSS Best Practices & BEM: {PASS/WARN/BLOCKED}
- Frontend Architecture (joint w/ review-architecture): {PASS/WARN/BLOCKED/N/A}
```

---

## Systematic Review Protocol (10+ changed frontend files)

1. **Categorize** — Group files by app / shared-library / component concern
2. **Parallel Sub-Agents** — Launch one UI/UX-specialized sub-agent per group with the UI-category checklist
3. **Synchronize** — Collect findings, cross-reference shared-component consumers and cross-system token mixing
4. **Consolidate** — Single holistic report with per-category verdicts

---

## Phase 5: Why-Review Self-Validation Gate (MANDATORY when findings exist)

> **Purpose:** Adversarial validation of own findings BEFORE handoff. Catches over-flagged Highs, false positives, and severity inflation at the source rather than letting them propagate downstream.

**Trigger:** Any finding produced (Critical, High, Medium, OR Low). Skip ONLY when the report's verdict is unconditional PASS with literally zero findings.

**Protocol:**

1. Read own finalized report from `plans/reports/{skill}-{date}-{slug}.md`
2. Invoke `$why-review` skill with arg: `validate findings in plans/reports/{skill}-{date}-{slug}.md — verify each finding has file:line proof, steel-man each rejected interpretation, and stress-test severity classifications`
3. Read why-review output from `plans/reports/why-review-{date}.md`
4. **If why-review demotes/removes any finding:** UPDATE own finalized report with revised severities, remove false positives, and add a `## Why-Review Validation Notes` section citing what changed and why
5. **If why-review confirms all findings:** Append `## Why-Review Validation` line to own report stating "All N findings re-validated against actual code; no severity changes."

**Skip conditions (record explicit reason if skipping):**

- Verdict is unconditional PASS with zero findings → log "Skipped — no findings to validate"
- Why-review skill itself is the active context (avoid recursion)

**Why this exists:** AI sub-agent reports inherit confirmation bias — the orchestrator absorbs severity claims as ground truth. The 2026-05-09 review incident produced 5 Highs; adversarial validation demoted 3 of them. Codify this as standard practice.

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If NOT already in a workflow, MUST use a direct user question to ask user. Do NOT judge task complexity or decide "simple enough to skip" — user decides, not you:
>
> 1. **Activate `review-changes` workflow** (Recommended) — review-changes → [parallel: review-architecture + review-ui + review-domain-entities + performance + integration-test-review + security] → code-simplifier → code-review → integration-test-verify → why-review (synthesis) → plan → why-review → plan-validate → why-review → cook → workflow-review-changes (fresh-subagent re-review gate) → docs-update → watzup → workflow-end
> 2. **Execute `$review-ui` directly** — run this skill standalone

---

## Next Steps

**MANDATORY MUST ATTENTION — NO EXCEPTIONS:** After completing, use a direct user question to present:

- **"$code-simplifier" (Recommended)** — Simplify and refine the styling/component code
- **"$web-design-guidelines"** — Generic accessibility / UX checklist for a11y depth
- **"Skip, continue manually"** — user decides

## AI Agent Integrity Gate (NON-NEGOTIABLE)

Before reporting ANY work done:

1. **Grep every removed name.** Extraction/rename/delete → grep confirms 0 dangling refs across ALL file types (SCSS `@use`, template class refs, TS imports)
2. **Ask WHY before changing.** Existing values intentional until proven otherwise — a fixed `width` may be a genuinely fixed UI element; no "fix" without traced rationale
3. **Verify ALL outputs.** One compiled stylesheet ≠ all consumers — a shared-component style change affects every consuming app
4. **Evaluate pattern fit.** Copying a nearby mixin/token? Verify the file imports/uses the SAME token system and does not mix incompatible project token systems
5. **New artifact = wired artifact.** Created a class/mixin? Prove it is imported, referenced in the template, and reachable

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting. Simple tasks: ask user whether to skip.

<!-- OVERRIDE:fresh-context-review -->

> **Fresh Sub-Agent Review** — Eliminate orchestrator confirmation bias via isolated sub-agents.
>
> **Why:** The main agent knows what it (or `$cook`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** Round 2 of ANY review AND every recursive re-review iteration after fixes. NOT needed when Round 1 already PASSes with zero issues.
>
> **How:**
>
> 1. Spawn a NEW `spawn_agent` tool call — use the UI/UX-specialized agent_type from the local sub-agent selection guide
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. Never reference protocols by file path; AI compliance drops behind file-read indirection (see `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `plans/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - NEVER reuse a sub-agent across rounds — every iteration spawns a NEW `spawn_agent` call
> - NEVER skip fresh-subagent review because "last round was clean" — every fix triggers a fresh round
> - Max 3 fresh-subagent rounds per review — escalate via a direct user question if still failing; do NOT silently loop or fall back to any prior protocol
> - Track iteration count in conversation context (session-scoped, no persistent files)

<!-- /OVERRIDE:fresh-context-review -->

## Sub-Agent Type Override

> **MANDATORY:** UI reviews spawn the UI/UX-specialized sub-agent defined by the local sub-agent selection guide.
> Keep `agent_type: "ui-ux-designer"` in the canonical template below when that agent type exists in the local catalog.
> **Rationale:** The shared sub-agent selection guide routes frontend UI/UX, accessibility, responsive layout, and design-token work to the UI/UX specialization. Do not fall back to a generic code-reviewer catch-all unless the local catalog lacks a UI/UX reviewer.

<!-- OVERRIDE:review-protocol-injection -->

> **Review Protocol Injection** — Every fresh sub-agent review prompt MUST embed 10 protocol blocks VERBATIM. The template below has ALL 10 bodies already expanded inline. Copy the template wholesale into the Agent call's `prompt` field at runtime, replacing only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific values. Do NOT touch the embedded protocol sections.
>
> **Why inline expansion:** Placeholder markers would force file-read indirection at runtime. AI compliance drops significantly behind indirection (see `SYNC:shared-protocol-duplication-policy`). Therefore the template carries all 10 protocol bodies pre-embedded.

### Subagent Type Selection

- `ui-ux-designer` — default for UI reviews when the local agent catalog provides it
- `code-reviewer` — fallback only when the local catalog lacks a UI/UX-specialized reviewer

### Canonical Agent Call Template (Copy Verbatim)

```
spawn_agent({
  description: "Fresh Round {N} UI review",
  agent_type: "ui-ux-designer",
  prompt: `
## Task
{review-specific task — e.g., "Review all uncommitted frontend changes for UI quality: long-content overflow, responsive layout, flex-vs-fixed sizing, z-index discipline, SCSS/BEM" | "Review SCSS/template files under {path}"}

## Round
Round {N}. You have ZERO memory of prior rounds. Re-read all target files from scratch via your own tool calls. Do NOT trust anything from the main agent beyond this prompt.

## Protocols (follow VERBATIM — these are non-negotiable)

### Evidence-Based Reasoning
Speculation is FORBIDDEN. Every claim needs proof.
1. Cite file:line, grep results, or framework docs for EVERY claim
2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
3. Cross-service validation required for architectural changes
4. "I don't have enough evidence" is valid and expected output
BLOCKED until: Evidence file path (file:line) provided; Grep search performed; 3+ similar patterns found; Confidence level stated.
Forbidden without proof: "obviously", "I think", "should be", "probably", "this is because".
If incomplete → output: "Insufficient evidence. Verified: [...]. Not verified: [...]."

### Bug Detection
MUST check categories 1-4 for EVERY review. Never skip.
1. Null Safety: Can params/returns be null? Are they guarded? Optional chaining gaps? .find() returns checked?
2. Boundary Conditions: Off-by-one (< vs <=)? Empty collections handled? Zero/negative values? Max limits?
3. Error Handling: Try-catch scope correct? Silent swallowed exceptions? Error types specific? Cleanup in finally?
4. Resource Management: Connections/streams closed? Subscriptions unsubscribed on destroy? Timers cleared? Memory bounded?
5. Concurrency (if async): Missing await? Race conditions on shared state? Stale closures? Retry storms?
6. Stack-Specific: JS: === vs ==, typeof null. C#: async void, missing using, LINQ deferred execution.
Classify: CRITICAL (crash/corrupt) → FAIL | HIGH (incorrect behavior) → FAIL | MEDIUM (edge case) → WARN | LOW (defensive) → INFO.

### Design Patterns Quality
Priority checks for every code change:
1. DRY via OOP: Same-suffix classes (*Entity, *Dto, *Service) MUST share base class. 3+ similar patterns → extract to shared abstraction.
2. Right Responsibility: Logic in LOWEST layer (Entity > Domain Service > Application Service > Controller). Never business logic in controllers.
3. SOLID: Single responsibility (one reason to change). Open-closed (extend, don't modify). Liskov (subtypes substitutable). Interface segregation (small interfaces). Dependency inversion (depend on abstractions).
4. After extraction/move/rename: Grep ENTIRE scope for dangling references. Zero tolerance.
5. YAGNI gate: NEVER recommend patterns unless 3+ occurrences exist. Don't extract for hypothetical future use.
Anti-patterns to flag: God Object, Copy-Paste inheritance, Circular Dependency, Leaky Abstraction.

### Logic & Intention Review
Verify WHAT code does matches WHY it was changed.
1. Change Intention Check: Every changed file MUST serve the stated purpose. Flag unrelated changes as scope creep.
2. Happy Path Trace: Walk through one complete success scenario through changed code.
3. Error Path Trace: Walk through one failure/edge case scenario through changed code.
4. Acceptance Mapping: If plan context available, map every acceptance criterion to a code change.
NEVER mark review PASS without completing both traces (happy + error path).

### Test Spec Verification
Map changed code to test specifications.
1. From changed files → find TC-{FEATURE}-{NNN} in docs/business-features/{Service}/detailed-features/{Feature}.md Section 15.
2. Every changed code path MUST map to a corresponding TC (or flag as "needs TC").
3. New functions/endpoints/handlers → flag for test spec creation.
4. Verify TC evidence fields point to actual code (file:line, not stale references).
5. Auth changes → TC-{FEATURE}-02x exist? Data changes → TC-{FEATURE}-01x exist?
6. If no specs exist → log gap and recommend $tdd-spec.
NEVER skip test mapping. Untested code paths are the #1 source of production bugs.

### Fix-Layer Accountability
NEVER fix at the crash site. Trace the full flow, fix at the owning layer. The crash site is a SYMPTOM, not the cause.
MANDATORY before ANY fix:
1. Trace full data flow — Map the complete path from data origin to crash site across ALL layers (storage → backend → API → frontend → UI). Identify where bad state ENTERS, not where it CRASHES.
2. Identify the invariant owner — Which layer's contract guarantees this value is valid? Fix at the LOWEST layer that owns the invariant, not the highest layer that consumes it.
3. One fix, maximum protection — If fix requires touching 3+ files with defensive checks, you are at the wrong layer — go lower.
4. Verify no bypass paths — Confirm all data flows through the fix point. Check for direct construction skipping factories, clone/spread without re-validation, raw data not wrapped in domain models, mutations outside the model layer.
BLOCKED until: Full data flow traced (origin → crash); Invariant owner identified with file:line evidence; All access sites audited (grep count); Fix layer justified (lowest layer that protects most consumers).
Anti-patterns (REJECT): "Fix it where it crashes" (crash site ≠ cause site, trace upstream); "Add defensive checks at every consumer" (scattered defense = wrong layer); "Both fix is safer" (pick ONE authoritative layer).

### Rationalization Prevention
AI skips steps via these evasions. Recognize and reject:
- "Too simple for a plan" → Simple + wrong assumptions = wasted time. Plan anyway.
- "I'll test after" → RED before GREEN. Write/verify test first.
- "Already searched" → Show grep evidence with file:line. No proof = no search.
- "Just do it" → Still need task tracking. Skip depth, never skip tracking.
- "Just a small fix" → Small fix in wrong location cascades. Verify file:line first.
- "Code is self-explanatory" → Future readers need evidence trail. Document anyway.
- "Combine steps to save time" → Combined steps dilute focus. Each step has distinct purpose.

### Graph-Assisted Investigation
MANDATORY when .code-graph/graph.db exists.
HARD-GATE: MUST run at least ONE graph command on key files before concluding any investigation.
Pattern: Grep finds files → trace --direction both reveals full system flow → Grep verifies details.
- Investigation/Scout: trace --direction both on 2-3 entry files
- Fix/Debug: callers_of on buggy function + tests_for
- Feature/Enhancement: connections on files to be modified
- Code Review: tests_for on changed functions
- Blast Radius: trace --direction downstream
CLI: python .claude/scripts/code_graph {command} --json. Use --node-mode file first (10-30x less noise), then --node-mode function for detail.

### Understand Code First
HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
1. Search 3+ similar patterns (grep/glob) — cite file:line evidence.
2. Read existing files in target area — understand structure, base classes, conventions.
3. Run python .claude/scripts/code_graph trace <file> --direction both --json when .code-graph/graph.db exists.
4. Map dependencies via connections or callers_of — know what depends on your target.
5. Write investigation to .ai/workspace/analysis/ for non-trivial tasks (3+ files).
6. Re-read analysis file before implementing — never work from memory alone.
7. NEVER invent new patterns when existing ones work — match exactly or document deviation.
BLOCKED until: Read target files; Grep 3+ patterns; Graph trace (if graph.db exists); Assumptions verified with evidence.

## Reference Docs (READ before reviewing)
- {resolved project styling rules doc}
- {resolved project design-system/token doc, especially Z-Index & Layering}
- {resolved project frontend architecture/patterns doc}
- {resolved project code-review rules doc}

## Target Files
{explicit file list OR "run git diff and filter by the project frontend path/extension patterns"}

## Output
Write a structured report to plans/reports/ui-review-round{N}-{date}.md with sections:
- Status: PASS | FAIL
- Issue Count: {number}
- Critical Issues (with file:line evidence)
- High Priority Issues (with file:line evidence)
- Medium / Low Issues
- Cross-cutting findings (cross-system token mixing, shared-component fan-out)

Return the report path and status to the main agent.
Every finding MUST have file:line evidence. Speculation is forbidden.
`
})
```

### Rules

- DO copy the template wholesale — including all 10 embedded protocol sections
- DO replace only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific content
- DO keep the UI/UX-specialized `agent_type` for UI reviews when the local catalog provides it (see Sub-Agent Type Override above)
- DO NOT paraphrase, summarize, or skip any protocol section
- DO NOT pass file contents inline — the sub-agent reads via its own tool calls so it has a fresh context
- DO NOT reference protocols by file path or tag name — the bodies are already embedded above
- DO NOT introduce placeholder markers for the protocols — they must stay literally expanded

<!-- /OVERRIDE:review-protocol-injection -->

> **Critical Purpose:** UI quality — no content overflow without escape, no broken responsive layouts, no fixed sizing fighting the viewport, no z-index escalation wars, no styling/BEM drift.

> **External Memory:** Complex/lengthy work → write findings to `plans/reports/`. Prevents context loss, serves as deliverable.

> **Evidence Gate:** MANDATORY MUST ATTENTION — every finding requires `file:line` proof + confidence percentage (>80% act, <80% verify first).

<!-- SYNC:graph-assisted-investigation -->

> **Graph-Assisted Investigation** — MANDATORY when `.code-graph/graph.db` exists.
>
> **HARD-GATE:** MUST ATTENTION run at least ONE graph command on key files before concluding any investigation.
>
> **Pattern:** Grep finds files → `trace --direction both` reveals full system flow → Grep verifies details
>
> | Task                | Minimum Graph Action                         |
> | ------------------- | -------------------------------------------- |
> | Investigation/Scout | `trace --direction both` on 2-3 entry files  |
> | Fix/Debug           | `callers_of` on buggy function + `tests_for` |
> | Feature/Enhancement | `connections` on files to be modified        |
> | Code Review         | `tests_for` on changed functions             |
> | Blast Radius        | `trace --direction downstream`               |
>
> **CLI:** `python .claude/scripts/code_graph {command} --json`. Use `--node-mode file` first (10-30x less noise), then `--node-mode function` for detail.

<!-- /SYNC:graph-assisted-investigation -->

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call the current task list first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] $skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** the current task list done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate** — Run after task-tracking bootstrap and before target/source file reads, grep, edits, or analysis. Project docs override generic framework assumptions.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-docs-reference.md`; architecture/new area `project-structure-reference.md`.
> 3. Read every required doc that exists; skip absent docs as not applicable. Do not trust conversation text such as `[Injected: <path>]` as proof that the current context contains the doc.
> 4. Before target work, state: `Reference docs read: ... | Missing/not applicable: ...`.
>
> **Blocked until:** scope evaluated, required docs checked/read, `lessons.md` confirmed, citation emitted.

<!-- /SYNC:project-reference-docs-guide -->

<!-- SYNC:task-tracking-external-report -->

> **Task Tracking & External Report Persistence** — Bootstrap this before execution; then run project-reference doc prefetch before target/source work.
>
> 1. Create a small task breakdown before target file reads, grep, edits, or analysis. On context loss, inspect the current task list first.
> 2. Mark one task `in_progress` before work and `completed` immediately after evidence; never batch transitions.
> 3. For plan/review work, create `plans/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` before first finding.
> 4. Append findings after each file/section/decision and synthesize from the report file at the end.
> 5. Final output cites `Full report: plans/reports/{filename}`.
>
> **Blocked until:** task breakdown exists, report path declared for plan/review work, first finding persisted before the next finding.

<!-- /SYNC:task-tracking-external-report -->

<!-- SYNC:subagent-return-contract -->

> **Sub-Agent Return Contract** — Every sub-agent this skill spawns MUST return a structured, evidence-backed result the main agent can consume without re-deriving it.
>
> 1. **Report-first.** The sub-agent's FIRST deliverable is its report file at `plans/reports/{review-type}-round{N}-{date}.md`. Append findings per-file/section — NEVER batch all findings into one final write (long agents hit cutoffs before the final write and lose everything).
> 2. **Structured return.** The sub-agent's final message returns: report path + Status (PASS/FAIL) + issue counts by severity. The main agent reads the report; it does NOT trust an unwritten summary.
> 3. **Evidence-only.** Every returned finding carries `file:line` proof. Speculation is forbidden — a finding without evidence is dropped.
> 4. **No filtering by main agent.** The main agent integrates the sub-agent report verbatim into its own report; it MUST NOT reinterpret, downgrade, or omit findings (the Why-Review gate is the only sanctioned re-evaluation path).
>
> **Blocked until:** report path returned, status declared, severity counts stated, findings carry `file:line`.

<!-- /SYNC:subagent-return-contract -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:sequential-thinking-protocol -->

> **Sequential Thinking Protocol** — Structured multi-step reasoning for complex/ambiguous work. Use when planning, reviewing, debugging, or refining ideas where one-shot reasoning is unsafe.
>
> **Trigger when:** complex problem decomposition · adaptive plans needing revision · analysis with course correction · unclear/emerging scope · multi-step solutions · hypothesis-driven debugging · cross-cutting trade-off evaluation.
>
> **Format (explicit mode — visible thought trail):**
>
> 1. `Thought N/M: [aspect]` — one aspect per thought, state assumptions/uncertainty
> 2. `Thought N/M [REVISION of Thought K]: ...` — when prior reasoning invalidated; state Original / Why revised / Impact
> 3. `Thought N/M [BRANCH A from Thought K]: ...` — explore alternative; converge with decision rationale
> 4. `Thought N/M [HYPOTHESIS]: ...` then `[VERIFICATION]: ...` — test before acting
> 5. `Thought N/N [FINAL]` — only when verified, all critical aspects addressed, confidence >80%
>
> **Mandatory closers:** Confidence % stated · Assumptions listed · Open questions surfaced · Next action concrete.
>
> **Stop conditions:** confidence <80% on any critical decision → escalate via ask the user directly · ≥3 revisions on same thought → re-frame the problem · branch count >3 → split into sub-task.
>
> **Implicit mode:** apply methodology internally without visible markers when adding markers would clutter the response (routine work where reasoning aids accuracy).
>
> **Deep-dive:** see `$sequential-thinking` skill (`.claude/skills/sequential-thinking/SKILL.md`) for worked examples (api-design, debug, architecture), advanced techniques (spiral refinement, hypothesis testing, convergence), and meta-strategies (uncertainty handling, revision cascades).

<!-- /SYNC:sequential-thinking-protocol -->

<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs proof.
>
> 1. Cite `file:line`, grep results, or framework docs for EVERY claim
> 2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
> 3. Cross-service validation required for architectural changes
> 4. "I don't have enough evidence" is valid and expected output
>
> **BLOCKED until:** `- [ ]` Evidence file path (`file:line`) `- [ ]` Grep search performed `- [ ]` 3+ similar patterns found `- [ ]` Confidence level stated
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->

<!-- SYNC:design-patterns-quality -->

> **Design Patterns Quality** — Priority checks for every code change:
>
> 1. **DRY via OOP:** Identify classes/modules with the same purpose, naming pattern, or lifecycle. Apply your knowledge of the project's language/framework to determine the idiomatic abstraction (base class, mixin, trait, protocol, decorator). 3+ similar patterns → extract to shared abstraction.
> 2. **Right Responsibility:** Logic in LOWEST layer (Entity > Domain Service > Application Service > Controller). Never business logic in controllers.
> 3. **SOLID:** Single responsibility (one reason to change). Open-closed (extend, don't modify). Liskov (subtypes substitutable). Interface segregation (small interfaces). Dependency inversion (depend on abstractions).
> 4. **After extraction/move/rename:** Grep ENTIRE scope for dangling references. Zero tolerance.
> 5. **YAGNI gate:** NEVER recommend patterns unless 3+ occurrences exist. Don't extract for hypothetical future use.
>
> **Anti-patterns to flag:** God Object, Copy-Paste inheritance, Circular Dependency, Leaky Abstraction.
>
> **Serial Attention for Design Quality** — Scan one quality dimension at a time (serial passes), not all concerns at once. — why: split attention misses violations that single-focus passes catch.
>
> 1. **Identify applicable dimensions** — Based on the code's language, domain, and patterns, determine which quality dimensions apply: DRY, SOLID principles (SRP/OCP/LSP/ISP/DIP), OOP idioms, cohesion/coupling, GRASP, Law of Demeter, CQRS invariants, etc. Your list is NOT fixed — derive from what the code actually does.
> 2. **One focused pass per dimension** — Dedicate single-focus attention to EACH dimension in sequence. Do NOT mix concerns across passes.
> 3. **Threshold: 3+ similar patterns = MANDATORY extraction** — Not optional suggestion. Flag as mandatory structural fix requiring action.
> 4. **2+ violations of same kind = structural finding** — Report as "pattern problem" needing architectural resolution, not a list of individual instances.

<!-- /SYNC:design-patterns-quality -->

<!-- SYNC:complexity-prevention -->

> **Complexity Prevention (Ousterhout)** — MANDATORY. Measure code by cost of change: one business change should map to one code change. Flag ALL of the following in review:
>
> 1. **Change amplification** — small business change forces edits in >3 places → structural flaw. Count edit sites for a plausible future change (add variant, add field, add authorization). >3 = reject.
> 2. **Cognitive load** — reader must hold too much context to safely modify. Flag deep inheritance, long parameter lists, boolean traps, implicit ordering dependencies.
> 3. **Cross-cutting duplication at entry points** — logging, error handling, validation, auth, transactions reimplemented per controller/handler/route. Lift to middleware / interceptor / filter / decorator / aspect.
> 4. **Leaked implementation technology** — repos returning `IQueryable`/`QuerySet`/`Criteria`/raw cursors/ORM entities to callers. Return finished results + intent-revealing methods (`GetActiveVipUsers()` not `Query()`).
> 5. **Type-switch scattering** — `switch`/`if`-chains on enum/discriminator in >1 place. New variant = new file, not N edits. One factory/registry switch at the boundary OK; scattered switches = reject.
> 6. **Anemic models** — domain objects with only getters/setters, logic floats in services. Move invariants/behavior onto the object (`order.Checkout()`, not `order.Status = ...`).
> 7. **Primitive obsession** — raw `string`/`int`/`decimal` for account numbers, emails, money, percentages, date ranges, with re-validation at every entry. Wrap in value objects / records / structs that validate once at construction.
> 8. **Inline cross-cutting concerns** — authorization/tenant isolation/audit/sanitization hand-written at top of every handler. Flag intent with declarative markers (`@RequirePermission("Order.Delete")`), enforce once centrally.
> 9. **Shallow modules** — tiny class, big interface (many public methods, many flags, many ctor params) wrapping little logic. A module is deep when a small interface hides a lot of implementation. If interface ≈ implementation cost to learn → inline.
> 10. **Missing base class for repeated component/handler lifecycle** — 3+ forms/CRUD handlers/list views reimplementing loading/dirty/submit/pagination → extract to base class / hook / composable / mixin / trait.
> 11. **Premature vs delayed abstraction** — rule-of-three. First occurrence: write it. Second: notice duplication. Third: extract. Don't build generic frameworks before real variation; don't copy-paste for the 4th time.
> 12. **Embedded utility logic not extracted to helpers** — inline paging loops (`while (hasMore) { skip += take; ... }`), ad-hoc datetime math, string parsing/formatting, collection partitioning, retry/backoff loops, URL/query-string building. If the algorithm is non-trivial AND stack-generic (not business-specific), extract to `util`/`helper`/`extensions` and let consumers call one line. Inline duplicates → duplicated bug surface.
> 13. **Logic in wrong (higher) layer — downshift to callee** — business/derivation logic written in the caller when the callee owns the data. Defaults: Controller code that should be App Service. App Service code that should be Domain Service or Entity. Component code that should be ViewModel/Store/Service. Caller reaching into callee's data shape to compute something → move the computation behind an intent-revealing method on the callee. Lowest responsible layer wins (Entity > Domain Service > App Service > Controller · Model/VM > Store > Component). Higher-layer placement = duplicated logic when a sibling caller needs the same thing.
> 14. **Owner owns the rule — extract on first write** — if a caller inlines logic that derives, normalizes, validates, or computes from another type's data, MOVE it to the owning type. Single use is sufficient — the trigger is wrong responsibility, not duplication. Sibling callers always arrive; inline copies drift silently with no compile error and no name to grep. **Common offenders:** _Backend_ — inlined rules in application-layer handlers / commands / queries / services / controllers that belong on the domain entity / value object / domain service. _Frontend_ — inlined derivations / formatting / validation in components that belong on the model / store / view-model / API service. **Fix:** name the rule once as a method (static or instance) on the owning type; callers invoke by name. Future variant → SECOND named method on the owner, never an inline near-duplicate. **Right responsibility first; reuse is the consequence.**
>
> **Extraction target — where the named rule lives:**
>
> | Shape of the rule                             | Goes to                       |
> | --------------------------------------------- | ----------------------------- |
> | Pure function over an entity's own data       | static method on the entity   |
> | Behavior that mutates / guards entity state   | instance method on the entity |
> | Always-true invariant on a primitive value    | value object constructor      |
> | Needs DI (repo / settings / clock)            | helper class registered in DI |
> | Domain-agnostic algorithm reused across types | util / extension method       |
> | Pure shape / projection conversion            | DTO mapping                   |
>
> **Pre-commit edit-site test (reject if answer is "many"):**
>
> | Change Scenario                                 | Should touch              |
> | ----------------------------------------------- | ------------------------- |
> | Add new variant (customer type, payment method) | 1 new file                |
> | Change HTTP error response format               | 1 middleware/filter       |
> | Add timestamp field to every persisted entity   | 1 base entity/interceptor |
> | Add authorization to a new endpoint             | 1 declarative marker      |
> | Swap database/ORM                               | Data layer only           |
> | Change business calculation rule                | 1 method on owning entity |
> | Add loading indicator pattern to forms          | 1 base component/hook     |
> | Add validation rule to a domain primitive       | 1 value-object ctor       |
> | Change paging/retry/datetime algorithm          | 1 helper/util function    |
> | Change a derivation of entity data              | 1 method on the entity    |
>
> **Operating heuristics:**
>
> - Write the call site first.
> - Count edit sites for plausible future change.
> - Prefer removing code over adding it.
> - Surface assumptions at boundaries, hide details inside.
> - **Pre-reuse scan** — before writing a non-trivial block, grep for similar algorithms (`while.*skip`, `DateTime.*Add`, `split`/`join` chains, paging loops, retry loops). Match existing helper → call it. None exists but pattern is stack-generic → extract to util before second caller appears.
> - **Layer placement test** — ask "if a sibling caller needed this tomorrow, would they re-derive it?" If yes, the logic is in the wrong layer. Move it down.
> - **Open-case-for-future-reuse** — if reviewer spots a block that is likely to appear in another feature (domain-agnostic algorithm, shared lifecycle, recurring derivation), do NOT rationalize with pure YAGNI. Either extract now (if cheap) or create a tracked TODO with the exact extraction target so the second caller does not duplicate silently. Silent duplication is the default failure mode.
> - When in doubt ask: "What would need to change if the requirement shifts?"
>
> **The measure of good code is the cost of change.** Not shortest. Not cleverest. Not most abstracted. Cheapest to safely modify having read a small local portion.

<!-- /SYNC:complexity-prevention -->

<!-- SYNC:double-round-trip-review -->

> **Fix-Triggered Re-Review Loop** — Re-review is triggered by a FIX CYCLE, not by a round number. Review purpose: `review → if issues → fix → re-review` until a round finds no issues. **A clean review ENDS the loop — no further rounds required.**
>
> **Round 1:** Main-session review. Read target files, build understanding, note issues. Output findings + verdict (PASS / FAIL).
>
> **Decision after Round 1:**
>
> - **No issues found (PASS, zero findings)** → review ENDS. Do NOT spawn a fresh sub-agent for confirmation.
> - **Issues found (FAIL, or any non-zero findings)** → fix the issues, then spawn a fresh sub-agent for Round 2 re-review.
>
> **Fresh sub-agent re-review (after every fix cycle):** Spawn a NEW `spawn_agent` tool call — never reuse a prior agent. Sub-agent re-reads ALL files from scratch with ZERO memory of prior rounds. See `SYNC:fresh-context-review` for the spawn mechanism and `SYNC:review-protocol-injection` for the canonical Agent prompt template. Each fresh round must catch:
>
> - Cross-cutting concerns missed in the prior round
> - Interaction bugs between changed files
> - Convention drift (new code vs existing patterns)
> - Missing pieces that should exist but don't
> - Subtle edge cases the prior round rationalized away
> - Regressions introduced by the fixes themselves
>
> **Loop termination:** After each fresh round, repeat the same decision: clean → END; issues → fix → next fresh round. Continue until a round finds zero issues, or **3 fresh-subagent rounds max**, then escalate to user via a direct user question.
>
> **Rules:**
>
> - A clean Round 1 ENDS the review — no mandatory Round 2
> - NEVER skip the fresh sub-agent re-review after a fix cycle (every fix invalidates the prior verdict)
> - NEVER reuse a sub-agent across rounds — every iteration spawns a NEW Agent call
> - Main agent READS sub-agent reports but MUST NOT filter, reinterpret, or override findings
> - Max 3 fresh-subagent rounds per review — if still FAIL, escalate via a direct user question (do NOT silently loop)
> - Track round count in conversation context (session-scoped)
> - Final verdict must incorporate ALL rounds executed
>
> **Report must include `## Round N Findings (Fresh Sub-Agent)` for every round N≥2 that was executed.**

<!-- /SYNC:double-round-trip-review -->

<!-- SYNC:fresh-context-review -->

> **Fresh Sub-Agent Review** — Eliminate orchestrator confirmation bias via isolated sub-agents.
>
> **Why:** The main agent knows what it (or `$cook`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** ONLY after a fix cycle. A review round that finds zero issues ENDS the loop — do NOT spawn a confirmation sub-agent. A review round that finds issues triggers: fix → fresh sub-agent re-review.
>
> **How:**
>
> 1. Spawn a NEW `spawn_agent` tool call — use `code-reviewer` agent_type for code reviews, `general-purpose` for plan/doc/artifact reviews
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. Never reference protocols by file path; AI compliance drops behind file-read indirection (see `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `plans/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - SKIP fresh sub-agent when the prior round found zero issues (no fixes = nothing new to verify)
> - NEVER skip fresh sub-agent after a fix cycle — every fix invalidates the prior verdict
> - NEVER reuse a sub-agent across rounds — every fresh round spawns a NEW `spawn_agent` call
> - Max 3 fresh-subagent rounds per review — escalate via a direct user question if still failing; do NOT silently loop or fall back to any prior protocol
> - Track iteration count in conversation context (session-scoped, no persistent files)

<!-- /SYNC:fresh-context-review -->

<!-- SYNC:source-test-drift-check -->

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix.

<!-- /SYNC:source-test-drift-check -->

<!-- SYNC:understand-code-first -->

> **Understand Code First** — HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
>
> 1. Search 3+ similar patterns (`grep`/`glob`) — cite `file:line` evidence
> 2. Read existing files in target area — understand structure, base classes, conventions
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists
> 4. Map dependencies via `connections` or `callers_of` — know what depends on your target
> 5. Write investigation to `.ai/workspace/analysis/` for non-trivial tasks (3+ files)
> 6. Re-read analysis file before implementing — never work from memory alone. — why: long context drifts from the file; the file is ground truth
> 7. NEVER invent new patterns when existing ones work — match exactly or document deviation. — why: divergent patterns fragment the codebase and slow every future reader
>
> **BLOCKED until:** `- [ ]` Read target files `- [ ]` Grep 3+ patterns `- [ ]` Graph trace (if graph.db exists) `- [ ]` Assumptions verified with evidence

<!-- /SYNC:understand-code-first -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:design-patterns-quality:reminder -->

**IMPORTANT MUST ATTENTION** check DRY via OOP, right responsibility layer, SOLID. Grep for dangling refs after moves.

<!-- /SYNC:design-patterns-quality:reminder -->

<!-- SYNC:complexity-prevention:reminder -->

**IMPORTANT MUST ATTENTION** apply complexity prevention — one business change = one code change. Flag change amplification (>3 edit sites for future change), scattered type-switches, anemic models, primitive obsession, leaked technology through abstractions, shallow modules, un-extracted utility logic (paging/datetime/string/retry → helpers), and logic in the wrong higher layer (downshift to callee/entity/VM). Don't rationalize silent duplication with pure YAGNI.

<!-- /SYNC:complexity-prevention:reminder -->

<!-- SYNC:graph-assisted-investigation:reminder -->

**IMPORTANT MUST ATTENTION** run at least ONE graph command on key files when graph.db exists. Pattern: grep → trace → verify.

<!-- /SYNC:graph-assisted-investigation:reminder -->

<!-- SYNC:source-test-drift-check:reminder -->

**IMPORTANT MUST ATTENTION** when source behavior changes, inspect affected tests; decide from evidence whether tests update to match intent or the source change is an unintended bug.

<!-- /SYNC:source-test-drift-check:reminder -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:subagent-return-contract:reminder -->

**IMPORTANT MUST ATTENTION** every spawned sub-agent returns report path + status + severity counts; appends findings per-file (never batched); main agent integrates verbatim, never filters.

<!-- /SYNC:subagent-return-contract:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:sequential-thinking-protocol:reminder -->

**MUST ATTENTION** apply sequential-thinking — multi-step Thought N/M, REVISION/BRANCH/HYPOTHESIS markers, confidence % closer; see `$sequential-thinking` skill.

<!-- /SYNC:sequential-thinking-protocol:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `plans/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** After task-tracking bootstrap and before target/source work, read required project-reference docs and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project conventions override generic defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

## Closing Reminders

**MUST ATTENTION** break work into small tasks using task tracking BEFORE starting
**MUST ATTENTION** resolve and read project UI/styling docs BEFORE reviewing — rules come from docs, not general knowledge
**MUST ATTENTION** SKIP this skill when no files match the project frontend path/extension patterns
**MUST ATTENTION** every violation requires `file:line` proof — NEVER speculate
**MUST ATTENTION** grep 3+ counterexamples before flagging any pattern violation
**MUST ATTENTION** `z-index` with `!important` and chained BEM modifiers are HARD-GATE BLOCKED
**MUST ATTENTION** NEVER mix incompatible project token systems in one file — recommend whichever system the file already imports/uses
**MUST ATTENTION** fresh-eyes Round 2 uses the UI/UX-specialized sub-agent from the local sub-agent selection guide
**MUST ATTENTION** run at least ONE graph command on key files when graph.db exists
**MUST ATTENTION** NEVER fix code — review and report only
**MUST ATTENTION** apply `Think:` reasoning prompt before checking each category — derive violations, don't recite checklists
**MUST ATTENTION** use a direct user question to present next steps after completing review

**Anti-Rationalization:**

| Evasion                                   | Rebuttal                                                                                |
| ----------------------------------------- | --------------------------------------------------------------------------------------- |
| "Too simple for a UI review"              | Simple templates still overflow on a 200-char value. Apply all 5 categories.            |
| "Already read the docs"                   | Show the extracted rule (mixin name, token name) — no recall = no read.                 |
| "Just flag obvious z-index literals"      | Gray areas matter most. Trace the surface's semantic layer before recommending a token. |
| "Fixed width is fine, it looks right"     | Looks right at 1440px ≠ usable at 320px. Apply the flex/min-max decision rule.          |
| "web-design-guidelines already covers UI" | That is a11y/UX, not the project styling gate. Different scope — do both.               |

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> token, mixin, and layout must answer one question: _does this make the next
> change cheaper or more expensive?_ If it doesn't reduce future change cost,
> reject it. Magic values, duplicated styling knowledge, fixed sizing that
> fights the viewport, cross-system token mixing, and z-index escalation wars
> are the real enemies — call them out by name.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** Match prompt against workflow catalog
2. **ANALYZE:** Find best-match workflow AND evaluate if a custom step combination would fit better
3. **ASK (REQUIRED FORMAT):** Use a direct user question with this structure unless the user explicitly invoked a workflow/skill and the local protocol treats explicit invocation as confirmation:
    - Question: "Which workflow do you want to activate?"
    - Option 1: "Activate **[BestMatch Workflow]** (Recommended)"
    - Option 2: "Activate custom workflow: **[step1 → step2 → ...]**" (include one-line rationale)
4. **ACTIVATE (if confirmed):** Call `$workflow-start <workflowId>` for standard; sequence custom steps manually
5. **CREATE TASKS:** task tracking for ALL workflow steps
6. **EXECUTE:** Follow each step in sequence
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
   **Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
   **Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
