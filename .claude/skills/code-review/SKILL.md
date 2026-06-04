---
name: code-review
version: 2.4.0
description: '[Code Quality] Use when evaluating review feedback, requesting targeted code-quality review, or verifying completion claims.'
execution-mode: subagent
context-budget: critical
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Ensure reviewed code is correct, easy to change, convention-aligned, and verification-backed before acceptance or handoff — via receiving feedback with verification (not performative agreement), requesting targeted systematic reviews through the code-reviewer subagent, and enforcing verification gates before completion claims.

> **Routing boundary:** If the user asks to review current changes, uncommitted work, staged/unstaged diffs, or a branch-to-branch diff, use `review-changes` instead.

> **Shared engine (keep in sync):** `code-review` and `review-changes` share the same review-protocol `SYNC:` blocks. Canonical source: `.claude/skills/shared/sync-inline-versions.md`; policy: `SYNC:shared-protocol-duplication-policy`. When you change a shared block in one skill, update the canonical file AND the sibling skill so the two never drift. The skills differ only in entry intent (explicit scope / feedback / completion-gate vs git diff) — not in review quality.

> **MANDATORY** Before reviewing, search for project-specific reference docs:
>
> **Coding standards** — search: `code-review-rules`, `coding-standards`, `style-guide`, `contributing`
> **Architecture** — search: `patterns-reference`, `architecture`, `adr`
> **Test conventions** — search: `integration-test-reference`, `test-guide`, `test-conventions`
> **Design system** — search: `design-system`, `design-tokens`, `component-library`
>
> Read found docs before reviewing. None found → rely on tech stack knowledge from file extensions/directory structure.

**Workflow:**

1. **Create Review Report** — Init `plans/reports/code-review-{date}-{slug}.md`
2. **Phase 0: Blast Radius** — Run graph analysis first if `.code-graph/graph.db` exists
3. **Phase 0.3: Risk Detection** — Detect dependency, migration, bus/event, API, security, config, and infra risks
4. **Phase 0.5: Plan Compliance** — Verify changed files and tests against active plan when present
5. **Phase 0.7: Surface Detection** — Classify files by language + directory semantics + change nature → route sub-agents; invoke `/review-ui` when frontend/UI files are present
6. **Phase 1: File-by-File** — Review each file, update report with correctness, convention, DRY, intent, test, and docs checks
7. **Phase 2: Holistic** — Re-read accumulated report, assess overall approach, architecture, duplication, and cross-boundary behavior
8. **Phase 3: Final Result** — Update report with overall assessment, critical issues, recommendations, docs staleness, and test gaps
9. **Fix Loop: Validate → Fix → Full Re-Review** — When findings exist, validate them first, fix only validated findings, then restart the full review after the fix cycle

**Key Rules:**

- **Report-Driven**: Build report incrementally; re-read for big picture
- **Detect First**: Run graph blast radius when available, then classify change types and file surfaces before any review
- **Easy to Change for Code**: Treat future change cost as the primary code-quality metric; DRY, SOLID, abstraction, and patterns are tools only when they reduce change amplification
- **No Performative Agreement**: Technical evaluation only ("You're right!" banned)
- **Verification Gates**: Evidence required before completion claims
- **Review Current Diffs Elsewhere**: Current changes, staged/unstaged diffs, and branch diffs belong to `review-changes`
- **A clean review pass ENDS the review.** Do not spend a fresh-context pass re-reviewing known findings before validation/fix; only re-review after fixes change the target.

# Code Review

Three practices: receiving feedback with technical rigor, requesting systematic reviews via code-reviewer subagent, enforcing verification gates before completion claims.

> Run `python .claude/scripts/code_graph query tests_for <function> --json` on changed functions to flag coverage gaps.

## Review Mindset (NON-NEGOTIABLE)

**Skeptical. Every claim needs traced proof `file:line`. Confidence >80% to act.**

- NEVER accept code correctness at face value — trace call paths
- NEVER include finding without `file:line` evidence (grep results, read confirmations)
- ALWAYS question: "Does this actually work?" → trace it. "Is this all?" → grep cross-service
- ALWAYS verify side effects: check consumers + dependents before approving

## First Principle — Easy to Change

> **The success metric of every coding decision is _future change cost_.**
> DRY, SRP, abstraction, design patterns, naming, layering, tests — every
> technique exists to serve one goal: **making the next change cheaper**.

When evaluating code, a refactor, a test, or an abstraction, ask:
**does this make the next change cheaper or more expensive?**

- Reject "best practices" that raise change cost (premature abstraction,
  speculative generality, leaky indirection, ceremony without payoff).
- Name the real enemies in findings: **coupling, hidden state, duplicated
  knowledge, unclear intent, irreversible decisions exposed too early**.
- Favor project-owned boundaries around external libraries, for example
  component/service input-output contracts, when they localize future library
  changes; reject pass-through wrappers that add ceremony without lowering
  change cost.
- A simpler design that is easy to change beats a sophisticated design that
  isn't.

Apply this lens **before** invoking any specific rule, pattern, or checklist
below — if a downstream rule would raise change cost, this principle wins.

---

## Core Principles (ENFORCE ALL)

| Principle          | Rule                                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| **YAGNI**          | Flag code solving hypothetical problems (unused params, speculative interfaces)                             |
| **KISS**           | Flag unnecessary complexity. "Is there a simpler way?"                                                      |
| **DRY**            | Grep for similar/duplicate code. 3+ similar patterns → flag for extraction                                  |
| **Clean Code**     | Readable > clever. Names reveal intent. Functions do ONE thing. Nesting <=3. Methods <30 lines              |
| **Convention**     | MUST ATTENTION grep 3+ existing examples before flagging violations. Codebase convention wins over textbook |
| **No Bugs**        | Trace logic paths. Verify edge cases (null, empty, boundary). Check error handling                          |
| **Proof Required** | Every claim backed by `file:line` evidence. Speculation is forbidden                                        |
| **Doc Staleness**  | Cross-ref changed files against related docs. Flag stale/missing updates                                    |

**Technical correctness over social comfort.** Verify before implementing. Evidence before claims.

## Graph-Enhanced Review (RECOMMENDED if graph.db exists)

1. `python .claude/scripts/code_graph graph-blast-radius --json` — prioritize files by impact (most dependents first)
2. `python .claude/scripts/code_graph query tests_for <function_name> --json` — flag untested changed functions
3. `python .claude/scripts/code_graph trace <file> --direction downstream --json` — downstream impact (events, bus, cross-service)
4. `python .claude/scripts/code_graph trace <file> --direction both --json` — full flow context for controllers/commands/handlers
5. Wide blast radius (>20 impacted nodes) = high-risk. Flag in report.

## Review Approach (Report-Driven Two-Phase — CRITICAL)

**MANDATORY FIRST: Create Todo Tasks**

| Task                                                                                                 | Status      |
| ---------------------------------------------------------------------------------------------------- | ----------- |
| `[Review] Create report file`                                                                        | in_progress |
| `[Review Phase 0] Run graph blast-radius if available`                                               | pending     |
| `[Review Phase 0.3] Detect high-risk change types`                                                   | pending     |
| `[Review Phase 0.5] Plan compliance check (skip if no active plan)`                                  | pending     |
| `[Review Phase 0.7] Detect categories + route sub-agents`                                            | pending     |
| `[Review Phase 0.7b] /review-ui sub-review — skip if no frontend/UI files in changeset`              | pending     |
| `[Review Phase 1] File-by-file review + update report`                                               | pending     |
| `[Review Phase 2] Holistic assessment`                                                               | pending     |
| `[Review Phase 3] Final findings, docs triage, and test sync findings`                               | pending     |
| `[Review Fix Loop] Validate findings, fix validated issues, and full re-review if fixes are applied` | pending     |
| `[Review Final] Consolidate all rounds`                                                              | pending     |

**Step 0: Create Report File**

Create `plans/reports/code-review-{date}-{slug}.md` with Scope, Files to Review sections.

**Phase 0: Graph Blast Radius (FIRST WHEN AVAILABLE)**

If `.code-graph/graph.db` exists, run graph impact analysis before reviewing:

- `python .claude/scripts/code_graph graph-blast-radius --json` or the project equivalent
- Record impacted files count, untested changed functions, and risk level in the report
- Prioritize high-impact files during Phase 1

If graph data is unavailable, record "Graph not available — skipping blast radius" and continue.

**Phase 0.3: Detect High-Risk Change Types**

Before file review, inspect the target diff or explicit file set for:

- Bugfix, failed verification, stale/incorrect final output, regression, or behavior-changing fix — require `Debugger Trace: End -> Start`, all feeder paths, hypothesis matrix, owning fix layer, and forward convergence proof; missing trace evidence is a High/Critical review finding
- Dependency upgrades — semver, breaking changes, advisories, peer compatibility
- Migrations or schema changes — rollback, lock/volume impact, zero-downtime deployment, idempotent backfill
- Bus events/messages — consumer existence, idempotency, retries, poison/dead-letter handling
- API contract changes — backward compatibility, caller alignment, auth, required response fields
- Security changes — enforcement coverage, privilege escalation, negative tests, duplicated permission strings
- Config/env changes — all environments covered, no secrets, fail-fast behavior, setup docs
- Infra changes — dev/prod parity, pinned versions, CI/CD permissions, reproducible builds

Create focused review tasks for every true signal and complete them before dimensional review.

**Phase 0.5: Plan Compliance Check (CONDITIONAL)**

If active plan context exists, verify scope, test evidence, and success criteria against the plan before file review; otherwise record the skip reason.

**Goal Contract mapping (CONDITIONAL — when an active goal exists):** Resolve the active Goal Contract per the goal-contract-satisfaction-loop protocol (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md`). When found, map the reviewed changes to the saved success criteria in the report — which criteria this changeset advances (with `file:line` evidence), which it leaves untouched, and any change serving NO saved criterion (flag as scope drift unless justified). Record `No active goal — mapping skipped.` when none exists; do NOT create a goal file from inside a review.

**Phase 0.7: Detect Review Categories**

Before any review — classify the changeset and route sub-agents:

| Signal in changed files                                                          | Route to                                                |
| -------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Auth/permission/token/encryption files                                           | `security-auditor`                                      |
| Query files, caching, batch processing                                           | `performance-optimizer`                                 |
| Source code (logic, handlers, services)                                          | `code-reviewer`                                         |
| Frontend/UI files (components, templates, `.html`/`.scss`/`.css`, design-system) | `/review-ui` skill (see Phase 0.7b)                     |
| Docs, plans, specs, markdown                                                     | `general-purpose`                                       |
| Mixed changeset with security/perf files                                         | Spawn specialized sub-agent first, then `code-reviewer` |

**Phase 0.7b: Frontend/UI Sub-Review (CONDITIONAL — `/review-ui`)**

If the changeset contains any frontend/UI files matching the project's configured UI patterns (components, templates, `.html`/`.scss`/`.css`, design-system tokens), invoke the `/review-ui` skill as a sub-review so UI-specific concerns are covered — long-content overflow (wrap vs ellipsis+tooltip), responsive multi-screen flex, flex-grow with min/max over fixed px, semantic z-index discipline (no raw numbers, no `!important`), and BEM classes on all template elements. Fold its findings into this report's Phase 3 results.

**Skip (record reason)** when no frontend/UI files are present in the changeset — log "Skipped Phase 0.7b — no frontend/UI files in changeset".

**Phase 0.8: Derive Review Categories**

Group changed files by: file language (extension), directory semantics (path), change nature (new entity, schema, config, UI, test).

For each category: name it, create sub-task, derive concerns using `SYNC:category-review-thinking` (first principles — NOT a fixed checklist).

> Category list = Phase 1 work breakdown. Each category → own section in report.

**Phase 1: File-by-File Review (Build Report)**

For EACH file, immediately update report:

- File path, Change Summary, Purpose, Issues Found
- **Convention check:** Grep 3+ similar patterns — does new code follow existing convention?
- **Correctness check:** Trace logic — null, empty, boundary, error cases handled?
- **DRY check:** Grep for similar/duplicate code — does this logic exist elsewhere?
- **Intention check:** Does the change serve the stated purpose? Flag unrelated modifications
- **Test check:** Changed behavior has corresponding test/spec coverage or a documented gap
- **Documentation check:** Related docs/specs/READMEs still match the changed behavior

**Phase 2: Holistic Review (Re-read Report)**

After all files reviewed, re-read accumulated report:

- **Technical Solution**: Overall approach coherent as unified plan?
- **Responsibility**: Logic in LOWEST layer? Business logic not in controllers?
- **Data ownership**: Constants/config in model/entity, not controller/component?
- **Duplication**: Grep to verify — duplicated logic across changes?
- **Architecture**: Clean Architecture? Service boundaries respected?
- **Plan Compliance**: If active plan → check `## Plan Context`: impl matches requirements, TCs have code evidence (not "TBD"), no requirement unaddressed
- **Design Patterns**: Pattern opportunities (switch→Strategy)? Anti-patterns (God Object, Copy-Paste, Circular Dep)? DRY via base classes?
- **Cross-Boundary Behavior**: Callers/callees aligned? API/event contracts consistent? New wiring reachable?
- **Test Sync**: Business logic changes have corresponding tests or explicit user-facing gap
- **Translation Sync**: Multilingual UI text changes have translation updates or explicit risk acceptance
- **Bugfix Trace Completeness**: If the diff is a bugfix or behavior-changing fix, the review report must state whether final-state trace, feeder paths, hypothesis matrix, owning fix layer, forward convergence proof, and tests/proof mapping are complete

**MUST ATTENTION CHECK — Spec-Loop Test Discipline (changed core logic):** Beyond the happy/error path traces above, hold changed core logic to a hard-to-fake bar. Apply a **MUTATION-SCORE** bar — a surviving mutant means a missing invariant, so demand the killing test — and do NOT accept a line-coverage % as proof of test strength. Flag any `[HARD]`/§5 invariant whose only coverage is example tests with no universally-quantified **property TC** (plus boundary counter-case) as a HIGH finding. Every behavior-changing finding requires a **Dual-Feedback row** (does it feed the spec? does it feed the tests? a blank axis = INCOMPLETE) — record it in the report. Adjudicate any spec divergence per `SYNC:spec-drift-adjudication` (CODE-WRONG / SPEC-STALE / AMBIGUOUS / **SPEC-SILENT**); a **SPEC-SILENT** finding — the code correctly enforces an invariant NO spec artifact states — has BOTH axes non-N/A: Spec feedback = add the missing §4 BR / §3 AC (+ §5 invariant if applicable) and a §8 TC via `/spec [update]` + `/spec [mode=tests]`; Test feedback = the new property/regression test guarding the now-written invariant — never leave a discovered invariant only in code or only in tests. Review the **whole package** (spec + tests + code), not just the diff, so the spec is enriched, not just patched.

**MUST ATTENTION CHECK — Clean Code:** YAGNI (unused params, speculative interfaces)? KISS (simpler exists)? Methods >30 lines or nesting >3?

**MUST ATTENTION CHECK — Correctness:** Null/empty/boundary handled? Error paths caught? Async race conditions? Trace happy + error paths.

**Documentation Staleness Check:**

For each changed file — grep file name/module across `docs/` and AI tooling dirs. Changed behavior → flag stale doc (specific section + what changed). **Flag the staleness only — never auto-fix docs here.**

Common staleness patterns: count/limit changed → docs embedding that number | API/contract changed → API usage docs | hook/skill added/removed → catalogs/README | schema changed → entity reference docs.

**Phase 3: Final Review Result**

Update report: Overall Assessment, Critical Issues, High Priority, Architecture Recommendations, Documentation Staleness, Positive Observations.

If documentation staleness is detected, recommend `docs-update` and list exact stale sections; do not silently pass stale docs.

## Validated Fix + Full Re-Review (MANDATORY when findings are fixed)

After Phase 3, do not spawn a fresh reviewer just to re-review the same finding set. First validate findings, then fix only validated findings. Because fixes change the review target, restart the full review after the fix cycle. If that restarted protocol uses sub-agents, construct each Agent call with the canonical template from `SYNC:review-protocol-injection`:

1. Copy Agent call shape from `SYNC:review-protocol-injection` verbatim
2. Embed full verbatim body of all 11 SYNC blocks: `SYNC:spec-tests-code-triangulation`, `SYNC:evidence-based-reasoning`, `SYNC:bug-detection`, `SYNC:design-patterns-quality`, `SYNC:complexity-prevention`, `SYNC:logic-and-intention-review`, `SYNC:test-spec-verification`, `SYNC:fix-layer-accountability`, `SYNC:rationalization-prevention`, `SYNC:graph-assisted-investigation`, `SYNC:understand-code-first`
3. Task: `"Run a full fresh code-review pass over the current assigned scope after validated fixes were applied. Focus: cross-cutting concerns, interaction bugs, convention drift, missing pieces, subtle edge cases, logic errors, test spec gaps, and regressions introduced by the fixes."`
4. Target Files: `"use the explicit files, plan scope, or reviewer-provided target range"`
5. Report: `plans/reports/code-review-rerun{N}-{date}.md`

After sub-agent returns:

1. **Read** report from `plans/reports/code-review-rerun{N}-{date}.md`
2. **Integrate** findings as `## Re-Review {N} Findings` — DO NOT filter or override
3. **If findings remain:** validate the new finding set before any additional fixes
4. **Repeat only after another fix cycle:** restart the full review again after validated fixes are applied; if the same blocker repeats across 3 full invocations with no progress, escalate via `AskUserQuestion`

## Clean Code Rules (MUST ATTENTION CHECK)

| #   | Rule                      | Details                                                                                                                                                                |
| --- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **No Magic Values**       | All literals → named constants                                                                                                                                         |
| 2   | **Type Annotations**      | Explicit parameter and return types on all functions                                                                                                                   |
| 3   | **Single Responsibility** | One concern per method/class. Event handlers/consumers: one handler = one concern. NEVER bundle — a framework event dispatcher can swallow handler exceptions silently |
| 4   | **DRY**                   | No duplication; extract shared logic                                                                                                                                   |
| 5   | **Naming**                | Specific (`orderRecords` not `data`), Verb+Noun methods, is/has/can/should booleans, no abbreviations                                                                  |
| 6   | **Performance**           | No O(n²) (use dictionary). Project in query (not load-all). ALWAYS paginate. Batch-by-IDs (not N+1)                                                                    |
| 7   | **Entity Indexes**        | Collections: index management methods. EF Core: composite indexes. Expression fields match index order. Text search → text indexes                                     |

## Data Lifecycle Rules (MUST ATTENTION CHECK)

**Decision test:** _"Delete the DB and start fresh — does this data still need to exist?"_ Yes → **Seeder/fixture**. No → **Migration**.

| Type                 | Contains                                                                                | NEVER contains                                   |
| -------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **Seeder / Fixture** | Default records, system config, reference data (idempotent — safe to run every startup) | Schema changes                                   |
| **Migration**        | Schema changes, column adds/removes, data transforms, index changes                     | Default records, permission seeds, system config |

Apply project's language/framework conventions. Principle universal — implementation project-specific.

## Legacy Pattern Compliance

When reviewing files with legacy and modern patterns:

1. **Detect legacy signals** — search `project-config.json`, `package.json`, or equivalent for `"legacy"`, version flags, feature annotations
2. **Read what "legacy" means** — grep 3+ legacy files to understand pattern constraints vs. modern files
3. **Derive compliance rules** — what lifecycle/memory management differences exist between legacy/modern for this tech stack?
4. **Apply tech stack knowledge** to flag anti-patterns

NEVER assume any specific framework's lifecycle. Derive from codebase evidence.

## When to Use This Skill

| Practice               | Triggers                                                                                   | MUST ATTENTION READ                            |
| ---------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| **Receiving Feedback** | Review comments received, feedback unclear/questionable, conflicts with existing decisions | `references/code-review-reception.md`          |
| **Requesting Review**  | After each subagent task, major feature done, targeted review scope, after complex bug fix | `references/requesting-code-review.md`         |
| **Verification Gates** | Before any completion claim, commit, push, or PR. ANY success/satisfaction statement       | `references/verification-before-completion.md` |

## Quick Decision Tree

```
SITUATION?
│
├─ Received feedback
│  ├─ Unclear items? → STOP, ask for clarification first
│  ├─ From human partner? → Understand, then implement
│  └─ From external reviewer? → Verify technically before implementing
│
├─ Completed work
│  ├─ Major feature/task? → Request code-reviewer subagent review
│  └─ Before merge? → Request code-reviewer subagent review
│
└─ About to claim status
   ├─ Have fresh verification? → State claim WITH evidence
   └─ No fresh verification? → RUN verification command first
```

## Receiving Feedback Protocol

**Pattern:** READ → UNDERSTAND → VERIFY → EVALUATE → RESPOND → IMPLEMENT

- NEVER use performative agreement ("You're right!", "Great point!", "Thanks for...")
- NEVER implement before verification
- MUST ATTENTION restate requirement, ask questions, or push back with technical reasoning
- ask for clarification on ALL unclear items BEFORE starting
- grep for usage before implementing suggested "proper" features (YAGNI check)

**Source handling:** Human partner → implement after understanding. External reviewer → verify technically, push back if wrong.

**Full protocol:** `references/code-review-reception.md`

## Requesting Review Protocol

1. Get git SHAs: `BASE_SHA=$(git rev-parse HEAD~1)` and `HEAD_SHA=$(git rev-parse HEAD)`
2. Dispatch code-reviewer subagent with: WHAT_WAS_IMPLEMENTED, PLAN_OR_REQUIREMENTS, BASE_SHA, HEAD_SHA, DESCRIPTION
3. Act on feedback: Critical → fix immediately. Important → fix before proceeding. Minor → note for later.

**Full protocol:** `references/requesting-code-review.md`

## Verification Gates Protocol

**Iron Law: NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE**

**Gate:** IDENTIFY command → RUN it → READ output → VERIFY it confirms claim → THEN claim. Skip any step = lying.

| Claim            | Required Evidence               |
| ---------------- | ------------------------------- |
| Tests pass       | Test output shows 0 failures    |
| Build succeeds   | Build command exit 0            |
| Bug fixed        | Original symptom test passes    |
| Requirements met | Line-by-line checklist verified |

**Red Flags — STOP:** "should"/"probably"/"seems to", satisfaction before verification, committing without verification, trusting agent reports.

**Full protocol:** `references/verification-before-completion.md`

## Related

- `code-simplifier`
- `debug-investigate`
- `refactoring`

---

## Systematic Review Protocol (10+ changed files)

> When Phase 1 finds 10+ changed files, apply the **Systematic Review Batching** protocol (map-reduce: size-capped batches + hierarchical synthesis) defined below.

---

## Workflow Recommendation

> **MANDATORY — NO EXCEPTIONS:** If NOT already in a workflow, use `AskUserQuestion` to ask user:
>
> 1. **Activate `workflow-review-changes` workflow** (Recommended) — full review → validated fix cycle → re-review until clean
> 2. **Execute `/code-review` directly** — run standalone

---

## Architecture Boundary Check

For each changed file, verify no forbidden layer imports:

1. **Read rules** from `docs/project-config.json` → `architectureRules.layerBoundaries`
2. **Determine layer** — match file path against each rule's `paths` glob patterns
3. **Scan imports** — grep for the configured language's import/include statements
4. **Check violations** — import path contains forbidden layer name → violation
5. **Exclude framework** — skip files matching `architectureRules.excludePatterns`
6. **BLOCK on violation** — `"BLOCKED: {layer} layer file {filePath} imports from {forbiddenLayer} ({importStatement})"`

If `architectureRules` absent in project-config.json → skip silently.

---

## Phase 4: Why-Review Self-Validation Gate (MANDATORY when findings exist)

> **Purpose:** Adversarial validation of own findings BEFORE handoff. Catches over-flagged Highs, false positives, and severity inflation at the source rather than letting them propagate downstream.

**Trigger:** Any finding produced (Critical, High, Medium, OR Low). Skip ONLY when the report's verdict is unconditional PASS with literally zero findings.

**Protocol:**

1. Read own finalized report from `plans/reports/{skill}-{date}-{slug}.md`
2. Invoke `/why-review` skill with arg: `validate findings in plans/reports/{skill}-{date}-{slug}.md — verify each finding has file:line proof, steel-man each rejected interpretation, and stress-test severity classifications`
3. Read the validation verdict path returned by why-review, expected as `plans/reports/why-review-validate-{date}.md`
4. **If why-review demotes/removes any finding:** UPDATE own finalized report with revised severities, remove false positives, and add a `## Why-Review Validation Notes` section citing what changed and why
5. **If why-review confirms all findings:** Append `## Why-Review Validation` line to own report stating "All N findings re-validated against actual code; no severity changes."

**Skip conditions (record explicit reason if skipping):**

- Verdict is unconditional PASS with zero findings → log "Skipped — no findings to validate"
- Why-review skill itself is the active context (avoid recursion)

**Why this exists:** AI sub-agent reports inherit confirmation bias — the orchestrator absorbs severity claims as ground truth. The 2026-05-09 review incident produced 5 Highs; adversarial validation demoted 3 of them. Codify this as standard practice.

---

## Next Steps

**MANDATORY — NO EXCEPTIONS** after completing, use `AskUserQuestion`:

- **"/fix (Recommended)"** — review found issues needing fixes
- **"/watzup"** — review clean, wrap up session
- **"Skip, continue manually"** — user decides

## AI Agent Integrity Gate (NON-NEGOTIABLE)

**Completion ≠ Correctness.** Before reporting ANY work done:

1. **Grep every removed name.** Extraction/rename/delete → grep confirms 0 dangling refs across ALL file types.
2. **Ask WHY before changing.** Existing values intentional until proven otherwise.
3. **Verify ALL outputs.** One build passing ≠ all builds passing.
4. **Evaluate pattern fit.** Copying nearby code? Verify preconditions match — scope, lifetime, base class, constraints.
5. **New artifact = wired artifact.** Created something? Prove it's registered, imported, reachable by all consumers.

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

> **Critical Purpose:** Ensure quality — no flaws, bugs, missing updates, stale content. Verify code AND documentation.

> **External Memory:** Complex work → write findings incrementally to `plans/reports/` — prevents context loss, serves as deliverable.

> **Evidence Gate:** MANDATORY — every claim, finding, recommendation requires `file:line` proof + confidence % (>80% act, <80% verify first).

> **OOP & DRY:** MANDATORY — flag patterns extractable to base class/generic/helper. Same-suffix/lifecycle/responsibility classes share common base. Apply idiomatic abstraction (base class, mixin, trait, protocol) for project's language. Verify linting/analyzer configured.

<!-- SYNC:systematic-review-batching -->

> **Systematic Review Batching (map-reduce)** — When a changeset is large, do NOT review files one-by-one. Partition into size-capped batches, fire one specialized sub-agent per batch in parallel, then reduce. This bounds EVERY context — each batch agent AND the orchestrator — so coverage stays complete as file count grows.
>
> **Trigger ladder (one ordered escalation — not competing thresholds):**
>
> 1. **< 10 changed files** → sequential per-file review (default; no batching).
> 2. **≥ 10 changed files** → switch to systematic parallel mode. Announce: `"Detected {N} changed files. Switching to systematic parallel review protocol."` Then: categorize → size-capped batches → flat consolidation.
> 3. **categories > 6 OR files > 40** → additionally insert the hierarchical synthesis tier (below). Everything from rung 2 still applies.
>
> **Step 1 — Categorize.** Group changed files into logical categories derived from the project's actual structure (not forced). Category is the _concern axis_; orient with these examples, derive what fits the repository:
>
> | Category Type       | Example Groupings                                                     |
> | ------------------- | --------------------------------------------------------------------- |
> | Agent/Tooling       | AI scripts, hooks, skill definitions, workflow configs, linting rules |
> | Root config/docs    | Root README, project config, CI/CD pipeline configs                   |
> | Reference docs      | Architecture docs, patterns references, setup guides                  |
> | Feature/domain docs | Business feature documentation, spec files, ADRs                      |
> | Backend logic       | Service/handler/controller source (infer from project structure)      |
> | Frontend logic      | UI component/state/API source (infer from project structure)          |
> | Data/Schema         | Migrations, schema files, seed data                                   |
> | Tests               | Unit, integration, E2E test files                                     |
> | Infrastructure      | Docker, k8s, CI/CD, cloud manifests                                   |
>
> **Step 2 — Size-capped batches.** One sub-agent per batch of **≤8 files OR ≤2000 diff-lines**, whichever hits first. Category stays the concern axis, but any category exceeding a cap splits into multiple size-capped batches (30 backend files → 4 batches). Size caps — not category caps — make "many files" safe: a category cap alone lets one giant category blow a single agent's context.
>
> **Step 2a — Sub-agent type per batch** (match the batch's dominant concern):
>
> - Code logic (any stack) → `code-reviewer`
> - Security-sensitive changes → `security-auditor`
> - Performance-critical paths → `performance-optimizer`
> - Docs, plans, specs, configs, infra → `general-purpose`
>
> Each batch sub-agent receives: its full file list; `SYNC:category-review-thinking` as its primary thinking model — derive each category's concerns from first principles, NOT a fixed checklist (if the consuming skill does not carry that block, apply category-first thinking directly); project reference docs relevant to its concern (discover via `*patterns*`, `*conventions*`, `*style-guide*`); cross-reference verification instructions (counts, tables, links). All batch agents run in parallel and write findings to `plans/reports/` (per `SYNC:task-tracking-external-report`); reducers read from disk, never from memory.
>
> **Step 3 — Reduce.**
>
> - **Flat reduction (rung 2, ≤6 categories AND ≤40 files):** the orchestrator collects each batch report, cross-references counts/tables/contracts ACROSS batches, detects gaps visible only across categories (feature in code but missing from docs; new API endpoint with no client call), and consolidates into one categorized holistic report.
> - **Hierarchical reduction (rung 3, > 6 categories OR > 40 files):** insert a mid-tier — each concern gets ONE synthesizer agent that reads only its own batch reports and emits a single concern-synthesis. The orchestrator reads the **concern-syntheses (~5)**, never the raw batch reports — keeping the reducer's context O(#concerns), not O(#files).
>     - **Cross-concern interaction pass (mandatory at rung 3 — closes the synthesis-tier blind spot):** concern-siloed synthesis can drop an interaction spanning two concerns AND two batches (tainted source in data-layer/batch 7 → sink in api/batch 3). So: (a) each concern-synthesizer MUST emit an explicit **"cross-concern interaction candidates"** list — entities/symbols/contracts it touched that plausibly bind to another concern (shared DTOs, event names, table/collection names, exported symbols); (b) the orchestrator MUST run the Step-3 cross-reference/gap step **over those candidate lists across all concern-syntheses**, not only within a batch, before concluding. Without this pass the tier trades completeness for context-bounding on exactly the large diffs it targets.
>
> **Step 4 — Holistic assessment.** With all findings combined, judge: overall coherence as a unified intent; cross-category sync (docs match code? contracts match callers?); risk areas where categories interact; missing doc/spec updates for changed artifacts.
>
> **No silent truncation.** If any cap forces sampling or a batch is dropped for budget, ANNOUNCE the dropped/sampled scope explicitly — bounded coverage must never read as complete coverage.

<!-- /SYNC:systematic-review-batching -->

<!-- SYNC:end-to-start-debugger-trace -->

> **End-to-Start Debugger Trace** — For non-trivial bugs, failed verification, regression fixes, behavior-changing code, or unclear code flow, start from the observed final state and walk backward before proposing a fix.
>
> 1. **Frame 0: observed end state** — Name the exact user-visible output, failing assertion, log line, persisted value, API response, rendered UI, or aggregate bucket. Record the reader/query/renderer that produced it with `file:line` evidence.
> 2. **Walk backward one hop at a time** — Trace final reader -> projection/cache/storage -> writer -> consumer/handler/job -> producer/caller -> original trigger. At every hop record: input, transformation, output, owner, and evidence.
> 3. **Enumerate all feeder paths** — Find every upstream producer/caller/event/job that can write into the final path, including retry, async, cache, background, and alternate UI/API paths. Mark each path verified, ruled out, or still unknown.
> 4. **Build the hypothesis matrix** — For each plausible cause, list evidence for, evidence against, how to reproduce/verify, blast radius, and status (`primary`, `contributing`, `ruled out`, `latent`). Do not fix until competing causes are explicitly resolved or bounded.
> 5. **Choose the owning fix layer** — Identify the invariant owner and the lowest shared point that protects all downstream consumers. A fix at the symptom site is rejected unless the symptom site owns the invariant.
> 6. **Prove convergence forward** — After choosing the fix, walk start -> end again and show how the corrected state reaches the observed final output. Map each root cause to a fix part and each fix part to a test/proof.
>
> **BLOCKED until:** final state named · backward trace written · all feeder paths enumerated · hypothesis matrix completed · owning fix layer justified · forward convergence proof mapped to tests.
>
> **NEVER:** Start at the first suspicious code path. Collapse multiple producers into one "flow". Treat duplicate symptoms as duplicate records without proving the read model. Skip ruled-out hypotheses.

<!-- /SYNC:end-to-start-debugger-trace -->

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

<!-- SYNC:category-review-thinking -->

> **Category Review Thinking** — A thinking framework for reviewing any category of changed files. NOT a fixed checklist — derive concerns from domain knowledge; the examples are starting points only. Your knowledge of the category exceeds any list here — trust it.
>
> **Step 1 — Understand the category's role.** What is this category responsible for in the overall system? What invariants must it uphold? What are its consumer contracts (who depends on it, what do they expect)?
>
> **Step 2 — Read project conventions for this category.** Search for reference docs, style guides, ADRs, or READMEs specific to this area. Grep 3+ existing similar files — extract naming conventions, structural patterns, shared base classes. If no docs exist, derive conventions empirically from existing code.
>
> **Step 3 — Derive concerns from first principles.** Apply all that are relevant; expand beyond this list based on the actual category:
>
> - **Correctness:** Does the logic match the intent? Trace happy path AND error path.
> - **Boundary contracts:** Are interfaces/APIs/events/protocols honored? No implicit coupling introduced?
> - **Project conventions:** Does new code follow the patterns found in Step 2? Evidence-confirmed, not assumed.
> - **Security:** Auth enforced at every entry point? Input validated at boundaries? No secrets in the diff?
> - **Performance:** Unbounded operations? N+1 patterns? Blocking calls in async context? Unindexed queries?
> - **Maintainability:** DRY? Single responsibility? Complexity within reason? Names reveal intent?
> - **Test coverage:** Are the changed paths covered by tests? Are existing tests still valid after the change?
> - **Documentation:** Do related docs, specs, or READMEs reflect the changes?
>
> **Step 4 — Create sub-tasks and execute.** For each identified concern: create a `TaskCreate` sub-task, work through it with `file:line` evidence, mark done. No findings without proof.
>
> **Illustrative concern examples by category type** (not exhaustive — trust your knowledge beyond this):
>
> - _Server-side logic:_ handler/service structure conventions, validation layer placement, side-effect isolation, cross-service boundary enforcement, data-access layer separation, error propagation strategy
> - _Client-side logic:_ component lifecycle management, resource cleanup (subscriptions, listeners, timers), state management patterns, API integration layer separation, reactive stream composition
> - _Data/Schema:_ migration reversibility (rollback script), lock impact on table volume, backfill idempotency, index coverage for query patterns, deployment ordering
> - _Configuration:_ present in ALL environments? No secrets in diff? App fails fast if config missing (not silently null)? Documented in setup guide?
> - _Infrastructure:_ dev/prod parity? No hardcoded dev values (localhost, debug flags)? Pinned image/dependency versions? CI/CD secret requirements documented?
> - _Styles/Assets:_ follows project naming conventions? Uses design variables/tokens (no hardcoded magic values)? Correct scope (no global side effects from component styles)?
> - _Documentation:_ accurate? Links valid? Examples still match current code/behavior? Covers new scenarios?
> - _Tests:_ assertions verify specific outcomes (not just "no exception")? Idempotent (repeatable N times)? Covers edge cases, not just happy path?
> - _Security artifacts:_ all code paths reach the gate? Negative tests exist (unauthorized denied)? Both enforcement AND display control updated?
> - _Build/Tooling:_ rule changes apply consistently? No exceptions that silently swallow violations? Impact on CI runtime documented?

<!-- /SYNC:category-review-thinking -->

<!-- SYNC:subagent-return-contract -->

> **Sub-Agent Return Contract** — When this skill spawns a sub-agent, the sub-agent MUST return ONLY this structure. Main agent reads only this summary — NEVER requests full sub-agent output inline.
>
> ```markdown
> ## Sub-Agent Result: [skill-name]
>
> Status: ✅ PASS | ⚠️ PARTIAL | ❌ FAIL
> Confidence: [0-100]%
>
> ### Findings (Critical/High only — max 10 bullets)
>
> - [severity] [file:line] [finding]
>
> ### Actions Taken
>
> - [file changed] [what changed]
>
> ### Blockers (if any)
>
> - [blocker description]
>
> Full report: plans/reports/[skill-name]-[date]-[slug].md
> ```
>
> Main agent reads `Full report` file ONLY when: (a) resolving a specific blocker, or (b) building a fix plan.
> Sub-agent writes full report incrementally (per SYNC:incremental-persistence) — not held in memory.
>
> **Context budget** — the return payload is a SUMMARY, not a transcript: ≤10 finding bullets, no raw file contents / full diffs / verbatim logs inline, no re-pasted source. Everything beyond the summary lives in the `Full report` on disk. A sub-agent that would exceed the summary shape MUST write the detail to its report and return only the pointer — the orchestrator's context is the scarce resource the whole map-reduce protects.

<!-- /SYNC:subagent-return-contract -->

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call `TaskList` first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] $skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** `TaskList` done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate** — Run after task-tracking bootstrap and before target/source file reads, grep, edits, or analysis. Project docs override generic framework assumptions.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`; behavior/public-contract/spec-test-code sync `workflow-spec-test-code-cycle-reference.md`; derived spec index/ERD/reimplementation guides `spec-system-reference.md` + source Feature Specs under `docs/specs/`; architecture/new area `project-structure-reference.md`.
> 3. Read every required doc. If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `/project-init` or the narrow lower-level route (`/project-config`, `/docs-init`, `/scan-all`, `/scan --target=<key>`, `/claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `/sync-codex`; do not auto-run it.
> 4. Before target work, state: `Reference docs read: ... | Not applicable: ...`.
>
> **Ready when:** scope evaluated, required docs checked/read or setup route completed, `lessons.md` confirmed, citation emitted.

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
> **Stop conditions:** confidence <80% on any critical decision → escalate via AskUserQuestion · ≥3 revisions on same thought → re-frame the problem · branch count >3 → split into sub-task.
>
> **Implicit mode:** apply methodology internally without visible markers when adding markers would clutter the response (routine work where reasoning aids accuracy).
>
> **Deep-dive:** see `/sequential-thinking` skill (`.claude/skills/sequential-thinking/SKILL.md`) for worked examples (API design, debugging, architecture), advanced techniques (spiral refinement, hypothesis testing, convergence), and meta-strategies (uncertainty handling, revision cascades).

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

> **Validated-Finding Fix + Full Re-Review Loop** — Re-review is triggered by a validated finding fix cycle, not by a round number. Review purpose: `review → validate findings → fix validated findings → full re-review` until a complete review pass finds no issues. **A clean review ENDS the loop — no further rounds required.**
>
> **Round 1:** Main-session review. Read target files, build understanding, note issues. Output findings + verdict (PASS / FAIL).
>
> **Decision after Round 1:**
>
> - **No issues found (PASS, zero findings)** → review ENDS. Do NOT spawn a fresh sub-agent for confirmation.
> - **Issues found (FAIL, or any non-zero findings)** → run the active review skill's findings-validation gate first; for review skills the default gate is `/why-review --validate-findings <report-path>`. Fix only validated findings, then restart the full review protocol from the beginning with a fresh task breakdown.
>
> **Fresh full re-review after every fix cycle:** Re-run the whole review protocol over the current full target. When sub-agents are part of that protocol, spawn NEW `Agent` calls — never reuse prior agents. Reviewers re-read ALL files from scratch with ZERO memory of prior rounds. See `SYNC:fresh-context-review` for the spawn mechanism and `SYNC:review-protocol-injection` for the canonical Agent prompt template. Each fresh full review must catch:
>
> - Cross-cutting concerns missed in the prior round
> - Interaction bugs between changed files
> - Convention drift (new code vs existing patterns)
> - Missing pieces that should exist but don't
> - Subtle edge cases the prior round rationalized away
> - Regressions introduced by the fixes themselves
>
> **Loop termination:** After each full re-review, repeat the same decision: clean → END; issues → validate findings → fix → restart from the first review phase. Continue until a complete review pass finds zero issues. If the same validated finding repeats for 3 full invocations with no progress, or a fix requires product/owner input, escalate via `AskUserQuestion`.
>
> **Rules:**
>
> - A clean Round 1 ENDS the review — no mandatory Round 2
> - NEVER fix unvalidated findings; validate first using the caller's validation gate
> - NEVER skip the full re-review after a fix cycle (every fix invalidates the prior verdict)
> - NEVER reuse a sub-agent across rounds — every iteration that uses sub-agents spawns NEW Agent calls
> - Main agent READS sub-agent reports but MUST NOT filter, reinterpret, or override findings
> - No arbitrary sub-agent-round cap replaces the clean-review requirement; use the 3 repeated-no-progress blocker rule only to avoid infinite spinning
> - Track recursive invocation count and repeated blockers in conversation context (session-scoped)
> - Final verdict must incorporate ALL rounds executed
>
> **Report must include `## Round N Findings (Fresh Sub-Agent)` for every round N≥2 that was executed.**

<!-- /SYNC:double-round-trip-review -->

<!-- SYNC:fresh-context-review -->

> **Fresh Context Re-Review** — Eliminate orchestrator confirmation bias after fixes by restarting the full review with isolated sub-agents where applicable.
>
> **Why:** The main agent knows what it (or `/feature-implement`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** ONLY after a validated-finding fix cycle. A review round that finds zero issues ENDS the loop — do NOT spawn a confirmation sub-agent. A review round that finds issues triggers: validate findings → fix → full review restart from the first phase.
>
> **How:**
>
> 1. Start a NEW full review invocation/task breakdown; when that protocol calls for agents, spawn NEW `Agent` tool calls — use `code-reviewer` subagent_type for code reviews, `general-purpose` for plan/doc/artifact reviews
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. Never reference protocols by file path; AI compliance drops behind file-read indirection (see `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `plans/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - SKIP fresh sub-agent when the prior full review found zero issues (no fixes = nothing new to verify)
> - NEVER skip the full review restart after a fix cycle — every fix invalidates the prior verdict
> - NEVER reuse a sub-agent across rounds — every fresh round spawns a NEW `Agent` call
> - Continue until a complete full review pass has zero findings; if the same blocker repeats 3 times with no progress, escalate via `AskUserQuestion`
> - Track iteration count and repeated blockers in conversation context (session-scoped, no persistent files)

<!-- /SYNC:fresh-context-review -->

<!-- SYNC:review-protocol-injection -->

> **Review Protocol Injection** — Every fresh sub-agent review prompt MUST embed 11 protocol blocks VERBATIM. The template below has ALL 11 bodies already expanded inline. Copy the template wholesale into the Agent call's `prompt` field at runtime, replacing only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific values. Do NOT touch the embedded protocol sections.
>
> **Why inline expansion:** Placeholder markers would force file-read indirection at runtime. AI compliance drops significantly behind indirection (see `SYNC:shared-protocol-duplication-policy`). Therefore the template carries all 11 protocol bodies pre-embedded.

### Subagent Type Selection

- `code-reviewer` — for code reviews (reviewing source files, git diffs, implementation)
- `general-purpose` — for plan / doc / artifact reviews (reviewing markdown plans, docs, specs)

### Canonical Agent Call Template (Copy Verbatim)

```
Agent({
  description: "Fresh Round {N} review",
  subagent_type: "code-reviewer",
  prompt: `
## Task
{review-specific task — e.g., "Review all uncommitted changes for code quality" | "Review plan files under {plan-dir}" | "Review integration tests in {path}"}

## Round
Round {N}. You have ZERO memory of prior rounds. Re-read all target files from scratch via your own tool calls. Do NOT trust anything from the main agent beyond this prompt.

## Protocols (follow VERBATIM — these are non-negotiable)

### Spec ↔ Tests ↔ Code Triangulation
DO THIS FIRST — before any per-protocol check below. The review target is the WHOLE PACKAGE, not the diff alone: load the behavior's spec (§3 ACs / §4 BRs / §8 TCs), its tests, and the changed code TOGETHER, and reason about their mutual consistency BEFORE judging any one in isolation.
1. Locate all three faces: the Feature Spec section(s) governing the changed behavior, the tests that guard it, and the production code that implements it. A missing face is itself a finding (SPEC-GAP / TEST-GAP / DEAD-SPEC).
2. Triangulate pairwise — every disagreement is a finding; classify which face is wrong:
   - code vs spec: behavior the code does that no §3/§4/§8 rule describes → CODE-EXTRA or SPEC-STALE; a [HARD] §4 rule or §5 invariant with no enforcing code path → CODE-WRONG.
   - tests vs spec: a §8 TC with no test, or a test asserting behavior no TC/rule names → TEST-GAP or SPEC-SILENT.
   - tests vs code: a changed code path with no covering test → TEST-GAP; a test that still passes against a deliberately broken invariant → WEAK-TEST (apply the mutation thinking in Bug Detection).
3. Hidden-rule capture: any invariant the code enforces but the spec never states (SPEC-SILENT) MUST be surfaced as a finding to add into §3/§4/§8 AND guarded with a test — the enrichment loop, never a silent pass.
4. Only after the three faces agree — or every disagreement is logged as a finding — proceed to the per-protocol checks below; when enrichment adds spec/test content, re-review the package against the enriched spec.
NEVER mark review PASS while any spec/test/code face disagrees without a logged finding. The diff is the entry point; the package is the unit of judgment.

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
6. Stack-Specific: Check the configured language/runtime pitfalls and framework-specific failure modes discovered from local code.
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
5. Tests Verify Intent: For test/spec changes, verify tests name the protected business rule or invariant and would fail if that intent breaks.
6. Migration Test Exclusion: Do not write tests for migration code. Schema/data migrations are one-time execution paths, not core application logic.
NEVER mark review PASS without completing both traces (happy + error path).

### Test Spec Verification
Map changed code to test specifications.
1. Identify the project's test/spec format from existing docs, test-case files, BDD feature files, or spec folders.
2. Every changed code path MUST map to a corresponding test case/spec (or flag as "needs test case").
3. New functions/endpoints/handlers → flag for test spec creation.
4. Migration files are excluded from test/spec creation; schema/data migrations are one-time execution paths, not core application logic.
5. If spec evidence fields exist, verify they point to actual code (file:line, not stale references).
6. Verify each meaningful test case names the business intent/invariant; flag behavior-only cases that only mirror implementation details.
7. Auth/data changes → verify corresponding authorization and data-state test cases exist.
8. If no specs exist for a changed path → log the gap and recommend the project's test-spec workflow.
NEVER skip test mapping. Untested code paths are the #1 source of production bugs.

### Behavioral Delta Matrix
MANDATORY for any bugfix review. Produce input-state × pre-fix × post-fix × delta table BEFORE writing verdict.
- Minimum 3 rows; include at least one row OUTSIDE the original bug report.
- Any "REGRESSION" delta → review returns FAIL until a preservation test is added.
- Narrative descriptions do NOT substitute for the matrix.
Example rows (external-record sync fix):
| Input                 | Pre-fix | Post-fix                  | Delta      |
| --------------------- | ------- | ------------------------- | ---------- |
| Record exists (valid) | Reused  | Always recreated → orphan | REGRESSION |
| Record missing (404)  | Error   | Recreated                 | Fixed      |

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
- "Just do it" → Still need TaskCreate. Skip depth, never skip tracking.
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
- `.claude/docs/development-rules.md` — canonical development rules, code-quality guidelines, and pre-commit checklist
- docs/project-reference/code-review-rules.md
- {skill-specific reference docs — e.g., integration-test-reference.md for integration-test-review; backend-patterns-reference.md for backend reviews; frontend-patterns-reference.md for frontend reviews}

## Target Files
{explicit file list OR "run git diff to see uncommitted changes" OR "read all files under {plan-dir}"}

## Output
Write a structured report to plans/reports/{review-type}-round{N}-{date}.md with sections:
- Status: PASS | FAIL
- Issue Count: {number}
- Critical Issues (with file:line evidence)
- High Priority Issues (with file:line evidence)
- Medium / Low Issues
- Cross-cutting findings

Return the report path and status to the main agent.
Every finding MUST have file:line evidence. Speculation is forbidden.
`
})
```

### Rules

- DO copy the template wholesale — including all 11 embedded protocol sections
- DO replace only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific content
- DO choose `code-reviewer` subagent_type for code reviews and `general-purpose` for plan / doc / artifact reviews
- DO NOT paraphrase, summarize, or skip any protocol section
- DO NOT pass file contents inline — the sub-agent reads via its own tool calls so it has a fresh context
- DO NOT reference protocols by file path or tag name — the bodies are already embedded above
- DO NOT introduce placeholder markers for the protocols — they must stay literally expanded

<!-- /SYNC:review-protocol-injection -->

<!-- SYNC:rationalization-prevention -->

> **Rationalization Prevention** — AI skips steps via these evasions. Recognize and reject:
>
> | Evasion                      | Rebuttal                                                      |
> | ---------------------------- | ------------------------------------------------------------- |
> | "Too simple for a plan"      | Simple + wrong assumptions = wasted time. Plan anyway.        |
> | "I'll test after"            | RED before GREEN. Write/verify test first.                    |
> | "Already searched"           | Show grep evidence with `file:line`. No proof = no search.    |
> | "Just do it"                 | Still need TaskCreate. Skip depth, never skip tracking.       |
> | "Just a small fix"           | Small fix in wrong location cascades. Verify file:line first. |
> | "Code is self-explanatory"   | Future readers need evidence trail. Document anyway.          |
> | "Combine steps to save time" | Combined steps dilute focus. Each step has distinct purpose.  |

<!-- /SYNC:rationalization-prevention -->

<!-- SYNC:logic-and-intention-review -->

> **Logic & Intention Review** — Verify WHAT code does matches WHY it was changed.
>
> 1. **Change Intention Check:** Every changed file MUST ATTENTION serve the stated purpose. Flag unrelated changes as scope creep.
> 2. **Happy Path Trace:** Walk through one complete success scenario through changed code
> 3. **Error Path Trace:** Walk through one failure/edge case scenario through changed code
> 4. **Acceptance Mapping:** If plan context available, map every acceptance criterion to a code change
> 5. **Tests Verify Intent:** For test/spec changes, verify tests name the protected business rule or invariant and would fail if that intent breaks.
> 6. **Migration Test Exclusion:** Do not write tests for migration code. Schema/data migrations are one-time execution paths, not core application logic.
>
> **NEVER mark review PASS without completing both traces (happy + error path).**

<!-- /SYNC:logic-and-intention-review -->

<!-- SYNC:bug-detection -->

> **Bug Detection** — MUST ATTENTION check categories 1-4 for EVERY review. Never skip.
>
> 1. **Null Safety:** Can params/returns be null? Are they guarded? Optional chaining gaps? `.find()` returns checked?
> 2. **Boundary Conditions:** Off-by-one (`<` vs `<=`)? Empty collections handled? Zero/negative values? Max limits?
> 3. **Error Handling:** Try-catch scope correct? Silent swallowed exceptions? Error types specific? Cleanup in finally?
> 4. **Resource Management:** Connections/streams closed? Subscriptions unsubscribed on destroy? Timers cleared? Memory bounded?
> 5. **Concurrency (if async):** Missing `await`? Race conditions on shared state? Stale closures? Retry storms?
> 6. **Stack-Specific:** Check the configured language/runtime pitfalls and framework-specific failure modes discovered from local code.
>
> **Classify:** CRITICAL (crash/corrupt) → FAIL | HIGH (incorrect behavior) → FAIL | MEDIUM (edge case) → WARN | LOW (defensive) → INFO

<!-- /SYNC:bug-detection -->

<!-- SYNC:test-spec-verification -->

> **Test Spec Verification** — Map changed code to test specifications.
>
> 1. Identify the project's test/spec format from existing docs, test-case files, BDD feature files, or spec folders.
> 2. Every changed code path MUST ATTENTION map to a corresponding test case/spec (or flag as "needs test case")
> 3. New functions/endpoints/handlers → flag for test spec creation
> 4. Migration files are excluded from TC/test creation; schema/data migrations are one-time execution paths, not core application logic.
> 5. If spec evidence fields exist, verify they point to actual code (`file:line`, not stale references)
> 6. Verify each meaningful test case names the business intent/invariant; flag behavior-only cases that only mirror implementation details.
> 7. Auth/data changes → verify corresponding authorization and data-state test cases exist.
> 8. If no specs exist for a changed path → log the gap and recommend the project's test-spec workflow.
>
> **NEVER skip test mapping.** Untested code paths are the #1 source of production bugs.

<!-- /SYNC:test-spec-verification -->

<!-- SYNC:fix-layer-accountability -->

> **Fix-Layer Accountability** — NEVER fix at the crash site. Trace the full flow, fix at the owning layer.
>
> AI default behavior: see error at Place A → fix Place A. This is WRONG. The crash site is a SYMPTOM, not the cause.
>
> **MANDATORY before ANY fix:**
>
> 1. **Trace full data flow** — Map the complete path from data origin to crash site across ALL layers (storage → backend → API → frontend → UI). Identify where the bad state ENTERS, not where it CRASHES.
> 2. **Identify the invariant owner** — Which layer's contract guarantees this value is valid? That layer is responsible. Fix at the LOWEST layer that owns the invariant — not the highest layer that consumes it.
> 3. **One fix, maximum protection** — Ask: "If I fix here, does it protect ALL downstream consumers with ONE change?" If fix requires touching 3+ files with defensive checks, you are at the wrong layer — go lower.
> 4. **Verify no bypass paths** — Confirm all data flows through the fix point. Check for: direct construction skipping factories, clone/spread without re-validation, raw data not wrapped in domain models, mutations outside the model layer.
>
> **BLOCKED until:** `- [ ]` Full data flow traced (origin → crash) `- [ ]` Invariant owner identified with `file:line` evidence `- [ ]` All access sites audited (grep count) `- [ ]` Fix layer justified (lowest layer that protects most consumers)
>
> **Anti-patterns (REJECT these):**
>
> - "Fix it where it crashes" — Crash site ≠ cause site. Trace upstream.
> - "Add defensive checks at every consumer" — Scattered defense = wrong layer. One authoritative fix > many scattered guards.
> - "Both fix is safer" — Pick ONE authoritative layer. Redundant checks across layers send mixed signals about who owns the invariant.

<!-- /SYNC:fix-layer-accountability -->

<!-- SYNC:source-test-drift-check -->

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix. Do not write tests for migration code; schema/data migrations are one-time execution paths, not core application logic.

<!-- /SYNC:source-test-drift-check -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing.** Before changing a constant, limit, flag, wording, or pattern, read nearby context and history.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:severity-rubric -->

> **Severity Rubric** — Classify every finding by consequence, not by how easy it is to fix. One scale across all reviews so a "High" means the same thing everywhere.
>
> | Severity | Action      | Definition                                                                |
> | -------- | ----------- | ------------------------------------------------------------------------- |
> | CRITICAL | Block merge | Silent runtime failure, data corruption, validation bypass, security hole |
> | HIGH     | Must fix    | Incorrect behavior, invariant gap, architectural violation                |
> | MEDIUM   | Should fix  | Design debt, maintainability, likely future bug                           |
> | LOW      | Nice to fix | Convention, documentation, minor clarity                                  |
>
> **Score-based skills** map their numeric scale onto these tiers — do not invent a parallel vocabulary:
>
> - **0-2 criterion scoring** (e.g. production-readiness-review): `0` = CRITICAL/HIGH (criterion unmet, blocks production readiness), `1` = MEDIUM (partial, should fix), `2` = pass (no finding).
> - **Two-axis scoring** (e.g. performance-review, impact × likelihood): map the resulting cell to the nearest tier — high-impact + high-likelihood → CRITICAL/HIGH; low-impact OR low-likelihood → MEDIUM/LOW.
>
> A finding's tier drives the gate: CRITICAL/HIGH must be resolved or explicitly accepted by the owner before PASS; MEDIUM/LOW may ship with a tracked follow-up.

<!-- /SYNC:severity-rubric -->

<!-- SYNC:evidence-based-reasoning:reminder -->

- **MANDATORY MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.
  <!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:design-patterns-quality:reminder -->

- **MANDATORY MUST ATTENTION** check DRY via OOP (same-suffix → base class), right responsibility (lowest layer), SOLID. Grep for dangling refs after changes.
  <!-- /SYNC:design-patterns-quality:reminder -->

<!-- SYNC:complexity-prevention:reminder -->

- **MANDATORY MUST ATTENTION** apply complexity prevention — one business change = one code change. Flag change amplification (>3 edit sites for future change), scattered type-switches, anemic models, primitive obsession, leaked technology through abstractions, shallow modules, un-extracted utility logic (paging/datetime/string/retry → helpers), and logic in the wrong higher layer (downshift to callee/entity/VM). Don't rationalize silent duplication with pure YAGNI.
  <!-- /SYNC:complexity-prevention:reminder -->

<!-- SYNC:double-round-trip-review:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** execute the review loop: review → validate findings → fix validated findings → full re-review. A complete review pass with zero findings ENDS the review.
  <!-- /SYNC:double-round-trip-review:reminder -->

<!-- SYNC:rationalization-prevention:reminder -->

- **MANDATORY MUST ATTENTION** follow ALL steps regardless of perceived simplicity. "Too simple to plan" is evasion, not reason.
  <!-- /SYNC:rationalization-prevention:reminder -->

<!-- SYNC:graph-assisted-investigation:reminder -->

- **MANDATORY MUST ATTENTION** run at least ONE graph command on key files when graph.db exists. Pattern: grep → graph trace → grep verify.
  <!-- /SYNC:graph-assisted-investigation:reminder -->

<!-- SYNC:logic-and-intention-review:reminder -->

- **MANDATORY MUST ATTENTION** verify every changed file serves stated purpose. Trace happy + error paths. Flag scope creep.
  <!-- /SYNC:logic-and-intention-review:reminder -->

<!-- SYNC:bug-detection:reminder -->

- **MANDATORY MUST ATTENTION** check null safety, boundary conditions, error handling, resource management for every review.
  <!-- /SYNC:bug-detection:reminder -->

<!-- SYNC:test-spec-verification:reminder -->

- **MANDATORY MUST ATTENTION** map every changed function/endpoint to a test. Search for project's test spec format near changed files. Flag coverage gaps, recommend test creation.
  <!-- /SYNC:test-spec-verification:reminder -->

<!-- SYNC:translation-sync-check:reminder -->

- **MANDATORY MUST ATTENTION** for multilingual frontend/UI text changes, verify translation updates are present (or explicitly accepted by user as risk) before PASS.
  <!-- /SYNC:translation-sync-check:reminder -->

<!-- SYNC:fix-layer-accountability:reminder -->

**IMPORTANT MUST ATTENTION** trace full data flow and fix at owning layer, not crash site. Audit all access sites before adding `?.`.

<!-- /SYNC:fix-layer-accountability:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:sequential-thinking-protocol:reminder -->

**MUST ATTENTION** apply sequential-thinking — multi-step Thought N/M, REVISION/BRANCH/HYPOTHESIS markers, confidence % closer; see `/sequential-thinking` skill.

<!-- /SYNC:sequential-thinking-protocol:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:category-review-thinking:reminder -->

- **MANDATORY** Derive review categories from file language + directory semantics + change nature; create a sub-task per category.
- **MANDATORY** Derive each category's concerns from first principles with `file:line` evidence — never a fixed checklist.

<!-- /SYNC:category-review-thinking:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `plans/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** After task-tracking bootstrap and before target/source work, read required project-reference docs and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project conventions override generic defaults.
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing or stale, auto-run `/project-init` or the narrow lower-level route before ordinary project-specific work.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:end-to-start-debugger-trace:reminder -->

**IMPORTANT MUST ATTENTION** debugger trace gate: for non-trivial bug/fix/investigation/review work, start at the observed final output and trace backward through reader -> storage/projection -> writer -> consumer/job -> producer/trigger. Enumerate all feeder paths and hypotheses before fixing. **BLOCKED until** trace, hypothesis matrix, owning fix layer, and forward convergence proof exist.

<!-- /SYNC:end-to-start-debugger-trace:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:systematic-review-batching:reminder -->

- **MANDATORY** Large changeset → batch by size cap (≤8 files OR ≤2000 diff-lines), one parallel sub-agent per batch; never review many files one-by-one.
- **MANDATORY** > 6 categories OR > 40 files → add the hierarchical synthesis tier; each concern-synthesizer emits cross-concern interaction candidates and the orchestrator runs the cross-concern pass before concluding.

<!-- /SYNC:systematic-review-batching:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify findings Critical/High/Medium/Low by consequence; Critical/High block PASS until fixed or owner-accepted.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

## Closing Reminders

**IMPORTANT Goal:** Ensure reviewed code is correct, easy to change, convention-aligned, and verification-backed before acceptance or handoff.

**MUST ATTENTION Protocols in force (concise digest of the SYNC/shared blocks this skill carries — each line is a signpost to its canonical body above; the body governs):** NEVER act on the digest alone; ALWAYS read the cited canonical block when its trigger fires.

- **Systematic Batching:** Large changeset → size-capped parallel batches, reduce.
- **End To Start Debugger Trace:** Trace observed end-state backward before fixing.
- **Graph Assisted Investigation:** Run graph command on key files first.
- **Category Review Thinking:** Derive category concerns from first principles.
- **Subagent Return Contract:** Sub-agents return summary only, report on disk.
- **Nested Task Creation:** Expand child phases under workflow row.
- **Project Reference Docs Guide:** Read project docs before target work.
- **Task Tracking External Report:** Bootstrap tasks; persist findings incrementally.
- **Critical Thinking Mindset:** Traced proof per claim; never guess.
- **Sequential Thinking Protocol:** Multi-step Thought N/M with confidence closer.
- **Evidence Based Reasoning:** Cite `file:line`; confidence >80% to act.
- **Design Patterns Quality:** DRY via OOP, lowest layer, SOLID.
- **Complexity Prevention:** One business change = one code change.
- **Double Round Trip Review:** Review → validate → fix → re-review until clean.
- **Fresh Context Review:** Re-review via fresh-memory sub-agents post-fix.
- **Review Protocol Injection:** Embed all 11 protocol bodies verbatim.
- **Rationalization Prevention:** Reject step-skipping evasions; show evidence.
- **Logic And Intention Review:** Changed code matches stated purpose.
- **Bug Detection:** Check null/boundary/error/resource every review.
- **Test Spec Verification:** Map every changed path to a test.
- **Fix Layer Accountability:** Fix at owning layer, not crash site.
- **Source Test Drift Check:** Source change → reconcile affected tests.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Severity Rubric:** Classify by consequence; Critical/High block PASS.

- **MANDATORY** Nested Task Expansion Contract — when invoked inside a workflow, STILL expand internal phases via `TaskCreate` with `[N.M] $skill-name — phase` prefix and `TaskUpdate(parentTaskId, addBlockedBy: [childIds])` linkage. Workflow row is container, not substitute.
- **MANDATORY** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY** validate decisions with user via `AskUserQuestion` — never auto-decide
- **MANDATORY** add final review task to verify work quality
- **MANDATORY MUST ATTENTION** search for project-specific reference docs BEFORE reviewing (coding standards, architecture, test conventions)
- **MANDATORY MUST ATTENTION** Phase 0: detect change type FIRST — route auth/perf files to specialized sub-agents before general review
- **MANDATORY MUST ATTENTION** run `/why-review` after completing this review to validate design rationale, alternatives considered, and risk assessment

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.
> **Anti-Rationalization:**

| Evasion                          | Rebuttal                                                                      |
| -------------------------------- | ----------------------------------------------------------------------------- |
| "Purpose obvious"                | Anchor it anyway — primacy/recency keeps outcome active through long prompts. |
| "Existing reminders enough"      | Echo Goal in Closing Reminders — bottom anchor prevents drift.                |
| "Skip evidence for prompt edits" | Cite changed file evidence and verify no stale protocol text remains.         |
