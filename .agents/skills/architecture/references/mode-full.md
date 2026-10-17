# `$architecture --mode=full` — whole-project architecture and production-readiness audit reference

> Loaded by `architecture/SKILL.md`'s Mode Dispatch when invoked as `$architecture --mode=full [scope]`. Formerly `/architecture-review-full`. This contract is the whole invocation: run it exactly as written, standalone or as a workflow step. `$ARGUMENTS` in this file means the invocation text after `--mode=full`.

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval. Inside a workflow run, `$start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

## Quick Summary

**Goal:** Audit the WHOLE project's architecture, scalability, and production readiness in ONE pass: cover all three owning lenses inline or through authorized specialists, dedup intentional cross-references, and synthesize ONE consolidated Architecture Health Report with one combined verdict — this is a THIN orchestrator; NEVER re-implement child reviews.

**Summary:**

- Resolve scope → load shared context → review all three lenses inline or through authorized specialists → merge/dedup into one on-disk report → coverage sweep and self-audit → merged `$why-review --validate-findings` validation → finalize the worst-case verdict → report, or repair and freshly repeat the audit in standalone fix-loop. Report lifecycle: `IN PROGRESS → VALIDATING → FINISHED`; standalone fix-loop owns scoped validated repairs between complete audit passes.
- Run INLINE as a thin orchestrator. Children load their complete contracts: `architecture --mode=scalability` (`architect`, project `/20` plus gates even under diff scope), `architecture --mode=review` (`architect`, 13-category PASS/WARN/BLOCKED) and `production-readiness-review` (`code-reviewer`, SRE `/24` plus 8-item gate). Preserve sibling routes and every contributing source; one underlying issue receives one finding/severity.
- After `Faces merged: 3/3`, sweep architecture knowledge §20.2 for INFO coverage gaps, frame remaining risks with §20.4 judgments, and self-audit §20.3 red flags before validation. Coverage gaps and merged Technique/Scenario advice never affect the combined verdict.
- Copy the scalability child's non-scoring TVC evidence: Unit/Integration/System/E2E applicability, owners/roots/data, full/focused commands, zero-match behavior, CI/platform entry, unique run/data identity and repeat proof. Missing applicable evidence blocks handoff; missing child output stays UNVERIFIED. Do not re-derive child review logic.

**Workflow:**

1. **Step 1: Resolve Scope** — infer from `$ARGUMENTS` and conversation; map to each lens and record the review plan.
2. **Step 2: Load Project Reference Docs Once** — warm shared context before fan-out.
3. **Step 3: Review the Three Lenses** — choose inline review or authorized specialists from scope, risk and context. When delegating independent work, dispatch together and wait for all returns before repairs.
4. **Step 4: Progressive Synthesis (IN PROGRESS)** — open the ONE consolidated report at status `🚧 IN PROGRESS` when fan-out starts; merge + dedup each child's findings into it AS that child returns — never held in memory to the end; then run the §20.2 coverage sweep and the §20.3 self-audit over the merged set.
5. **Step 5: Fix-Report-Per-Review `$why-review` Gate** — ONE merged `$why-review` pass that walks each of the three review faces + the dedup and fixes the report in place (severities, false positives, dedup-dropped issues).
6. **Step 6: Finalize (FINISHED)** — lock the combined verdict (worst-case rollup) and flip the report status to `✅ FINISHED`.
7. **Completion** — report in review-only/caller-owned mode; standalone fix-loop repairs after validation and freshly repeats every lens under the shared cap.

**Key Rules (top 3 critical first):**

- MUST ATTENTION cover scalability, architecture compliance and production readiness using their owning skills; choose inline or delegated execution in the review plan.
- MUST ATTENTION dedup the intentional overlaps — one underlying issue = one finding citing every reporting child; NEVER let cross-referencing siblings triple-count it.
- MUST ATTENTION validate findings before repairs. Review-only/caller-owned passes hand off; standalone fix-loop may repair within authority and freshly repeat the three lenses under one budget.
- Dispatch independent delegated lenses together; honor the all-return barrier before repairs (`SYNC:parallel-phase-advancement` discipline).
- Write the consolidated report to `tmp/reports/architecture-full-review-{YYMMDD}-{HHmm}-{slug}.md`.

## Contents

- [Quick Summary](#quick-summary)
- [Your Mission](#your-mission)
- [Review Mindset (NON-NEGOTIABLE)](#review-mindset-non-negotiable)
- [Step 1: Resolve Scope](#step-1-resolve-scope)
- [Step 2: Load Project Reference Docs Once](#step-2-load-project-reference-docs-once)
- [Step 3: Review the Three Lenses](#step-3-review-the-three-lenses)
- [Step 4: Progressive Synthesis → One Report (status `IN PROGRESS`)](#step-4-progressive-synthesis--one-report-status-in-progress)
- [Step 5: Fix-Report-Per-Review `$why-review` Gate (status `VALIDATING`) — MANDATORY when findings exist](#step-5-fix-report-per-review-why-review-gate-status-validating--mandatory-when-findings-exist)
- [Step 6: Finalize (status `FINISHED`)](#step-6-finalize-status-finished)
- [Next Steps](#next-steps)
- [Mode protocols](#mode-protocols)
- [Prompt-Enhance Closing Anchors](#prompt-enhance-closing-anchors)
- [Closing Reminders](#closing-reminders)

## Your Mission

<task>
$ARGUMENTS
</task>

## Review Mindset (NON-NEGOTIABLE)

Skeptical coordinator. Cover all three lenses through their owners and synthesize the evidence; delegation is a planning choice.

- Trust each child's `file:line` evidence, but NEVER inflate severity by counting the same underlying issue three times — dedup first, then rank.
- A finding survives to the report only after the Step 5 `$why-review` gate; an unvalidated sub-agent claim is a hypothesis, not a finding.
- Preserve every route-to-sibling pointer a child emits — the combined report is the union of owned findings, not a re-review.

## Step 1: Resolve Scope

Decide audit scope, then map to each child's arguments.

- If `$ARGUMENTS` names files/dirs, or contains `full` / `whole` / `diff` / `changes`, use that directly.
- Otherwise infer the requested target from the conversation; default a standalone whole-project audit to the current repository. Record scope and applicability in the review plan. Ask only for an indispensable fact with no defensible default.

**Scope → child args mapping:**

| Chosen scope             | `architecture --mode=scalability`                             | `architecture --mode=review`          | `production-readiness-review`                                               |
| ------------------------ | ------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------- |
| Whole project            | `mode=audit` over the whole repo                              | scope override `full codebase` | args = all backend service/API roots (per `project-structure-reference.md`) |
| Current changes (diff)   | `mode=audit` focused on the services/modules the diff touches | default uncommitted diff       | default uncommitted service/API diff                                        |
| Specific path            | `mode=audit` scoped to that path's services/modules           | scope override = that path     | that path's service/API files                                               |
| New / greenfield foundation | **`mode=init`** over the planned/scaffolded structure      | scope override = the scaffold  | the scaffolded service/API entry points (record `N/A — <evidence>` for anything not yet built) |

> **[GREENFIELD SCOPE]** `mode=init` makes this skill’s `SYNC:engineering-foundation-gate` **BLOCKING** rather than advisory: each `MISSING-WARRANTED` dimension requires an explicit foundation decision.

> **MUST ATTENTION — `architecture --mode=scalability` always grades the PROJECT, even under diff scope.** A project-grader by design ("do not use as the every-change diff reviewer"). Under diff scope it still emits the `/20` scorecard, focused on the services/modules the diff touches — it never degrades into a pure per-line diff reviewer. Document this nuance in the consolidated report so its scorecard is read as a project posture, not a diff verdict.

## Step 2: Load Project Reference Docs Once

Warm shared context BEFORE fan-out so synthesis reasons from the same ground truth the children use. Read once here (each child re-reads what it needs via its own tool calls):

- `docs/project-config.json`
- Under the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path): `project-structure-reference.md`, `backend-patterns-reference.md`, `frontend-patterns-reference.md`, `code-review-rules.md`
- Accepted ADRs under the ADR root (default `docs/adr/**`; a `docsRoots.adr.path` entry in `docs/project-config.json` overrides the path), when present

## Step 3: Review the Three Lenses

Plan coverage of all three lenses. Run their owning skill procedures inline when useful, or delegate independent lenses to authorized specialists. For a parallel batch, dispatch every member together and wait for all returns before repairs (`SYNC:parallel-phase-advancement`). No fixed agent count is required.

Each lens records its complete findings under `tmp/reports/`. Delegated reviewers return the `SYNC:subagent-return-contract` summary and report path; inline lenses checkpoint their results in the same coverage ledger.

| #   | Child skill                       | `agent_type` | Whole-project args                                                   | Diff-scope args                                                                | Emits                             |
| --- | --------------------------------- | --------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------- |
| 1   | `architecture --mode=scalability` | `architect`     | `mode=audit` over whole repo                                         | `mode=audit` focused on the diff's services/modules (still grades the project) | Scorecard `/20` + pass/fail gates |
| 2   | `architecture --mode=review`             | `architect`     | scope override `full codebase`                                       | default uncommitted diff                                                       | 13-category PASS/WARN/BLOCKED     |
| 3   | `production-readiness-review`     | `code-reviewer` | all backend service/API roots (per `project-structure-reference.md`) | default uncommitted service/API diff                                           | SRE `/24` + 8-item gate           |

Brief each sub-agent with its invocation — `$architecture --mode=scalability <args>`, `$architecture --mode=review <args>`, `$production-readiness-review <args>` — and name the file to read in full before its first finding — `.claude/skills/architecture/references/mode-scalability.md` for face 1, `.claude/skills/architecture/references/mode-review.md` for face 2, `.claude/skills/production-readiness-review/SKILL.md` for face 3 (the `architect` agent does not preload the mode references, and a face that skips its reference never loads the mode's gates).

Each sub-agent prompt states: READ-ONLY findings/score mode (no fixes); re-read all target files from scratch via its own tool calls; write full report incrementally to `tmp/reports/`; return only the return-contract summary.

**Each of the three faces feeds TWO validation gates downstream — state this in each sub-agent's prompt so it knows its findings will be adversarially validated, not trusted as-is:** (1) the Step 5 fix-report-per-review `$why-review` gate that walks its face and fixes its findings in the consolidated report; (2) inside `workflow-architecture-audit`, the workflow-level FINAL `$why-review` gate that re-reviews the whole finalized report. A face's findings are hypotheses until they survive both — so every finding it emits MUST carry `file:line` proof + confidence that can withstand validation.

## Step 4: Progressive Synthesis → One Report (status `IN PROGRESS`)

Exactly ONE report file for the whole audit — created ONCE, grown across Steps 4→6, never re-created per review. Open it when fan-out starts and evolve its status through its lifecycle: `🚧 IN PROGRESS` (Step 4) → `🔍 VALIDATING` (Step 5) → `✅ FINISHED` (Step 6).

Write to `tmp/reports/architecture-full-review-{YYMMDD}-{HHmm}-{slug}.md`.

**On fan-out start — create the file with status `🚧 IN PROGRESS`** and a status line naming which of the three review faces have returned so far (e.g. `Faces merged: 0/3`). The single source of truth the whole audit synthesizes into — do NOT hold findings in memory until the end.

**Header — all three sub-scores + ONE combined verdict** (each sub-score is `⏳ pending` until its face returns):

- Scalability Scorecard: `X/20` + verdict (STRONG / NEEDS WORK / HIGH RISK)
- Architecture Compliance: PASS / WARN / BLOCKED
- SRE Readiness: `X/24` + verdict (PASS / NEEDS WORK / NOT READY)
- Testability & Verification Contract: `TVC: PASS | PARTIAL | BLOCKED` or `N/A — evidence`, copied from the child contract result; this is non-scoring and not a fourth review face.
- **Combined Verdict:** `⏳ pending until FINISHED` — computed in Step 6 as the worst-case rollup across the three (any BLOCKED / NOT READY / HIGH RISK dominates). Do NOT assert a combined verdict while status is `IN PROGRESS`.

**Merge each face AS it returns.** Account for all three lens results; wait for all delegated members before repairs — but merge them into the file one face at a time (updating `Faces merged: N/3` each time) so a mid-synthesis context loss leaves the partial report on disk, not in memory. When ≥2 children report the same underlying issue, record it ONCE, citing every source. Dedup on these KNOWN overlap axes (the siblings cross-reference each other here by design):

| Overlap axis                                                            | `architecture --mode=review` face                            | Sibling face(s)                                                                               |
| ----------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Module isolation / loose coupling / horizontal scaling / DRY regression | Category 11 (scalability & coupling regression)       | `architecture --mode=scalability` {module isolation, loose coupling, horizontal scaling, DRY} |
| Quality tooling / CI / observability                                    | Category 0 (quality-tooling baseline)                 | `architecture --mode=scalability` {Build & CI, Observability}                                 |
| Recorded-decision / clean-architecture conformance                      | Category 9 (ADR conformance)                          | `architecture --mode=scalability` {clean architecture}                                        |
| DB performance / capacity ceilings                                      | `production-readiness-review` DB-perf + capacity gate | `architecture --mode=scalability` {horizontal scaling}                                        |
| Technique applicability (advisory) — scale-tier technique matrix         | Category 11 INFO advisory matrix                      | `architecture --mode=scalability` + `production-readiness-review` advisory matrices           |
| Scenario stress (advisory) — big-traffic/big-data/failure/self-heal      | Category 11 INFO scenario-stress matrix               | `architecture --mode=scalability` + `production-readiness-review` scenario-stress matrices     |
| Data / consistency / tenancy — dual write, idempotency, breaking migration, tenant isolation | Category 12 (data, consistency & tenancy boundaries) | `production-readiness-review` {migration safety, rollback}; `security-audit` owns authz depth; `performance-review` owns query-plan depth |

**Merged Testability & Verification Contract (non-scoring):** Copy the `TVC` status and evidence from the `architecture --mode=scalability` child into the consolidated report, then retain the architecture --mode=design/scaffold/harness owner links rather than re-deriving the contract. Use `UNVERIFIED — child result absent` when the child did not emit it; never infer PASS, especially for E2E.

| Tier | Applicability + evidence | Owner | Runner/config/root | Data + run identity | Full command | Focused/partial command | Zero-match behavior | CI / simple Windows/macOS/Linux entry point | Repeat proof |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Unit | `APPLICABLE` / `N/A — {evidence}` | {owner} | {runner/config/root} | {identity + fixture policy} | `{command}` | `{filter}` | `{non-zero behavior}` | {CI / command} | `{result or planned owner}` |
| Integration/System | `APPLICABLE` / `N/A — {evidence}` | {owner} | {runner/config/root} | {identity + additive/public-path policy} | `{command}` | `{filter}` | `{non-zero behavior}` | {CI / command} | `{two no-reset runs}` |
| E2E | `APPLICABLE` / `N/A — {evidence}` | {owner} | {runner/config/root} | {identity + reachable-data policy} | `{command}` | `{filter}` | `{non-zero behavior}` | {CI / command} | `{result or evidence-backed N/A}` |

This roll-up is a status/evidence section only: it is not a fourth sub-score and never changes the three child scores or the combined-verdict calculation. A blocked contract remains an explicit setup follow-up.

For each merged finding: assign ONE severity per `SYNC:severity-rubric` (do not sum severities across duplicate reports), cite each reporting child's `file:line`, and PRESERVE each child's route-to-sibling pointers. — why: undeduped, three intentionally-cross-referencing reviewers inflate severity counts and bury distinct issues.

**Merged advisory Technique Applicability Matrix (does NOT change the combined verdict):** all three children emit a scale-tier Technique Applicability Matrix from `SYNC:scale-technique-gate`; dedup the three views of the same technique onto ONE advisory matrix in the consolidated report. **Pin ONE authoritative scale tier for the merged matrix — `architecture --mode=scalability`'s derived tier is canonical (owns scalability grading); if another child's derived tier DIVERGES, record the divergence as a one-line note and key the merged matrix's `tier-warranted?` column to the pinned tier, rather than merging contradictory warranted-sets.** This only SELECTS which already-derived tier the matrix is keyed to — it does NOT re-derive any child's findings (respecting "you do not re-derive them" above). It is **advisory/INFO only** — a `MISSING-WARRANTED` technique is guidance, never a severity, and NEVER feeds the worst-case combined-verdict rollup. This orchestrator adds no own gate marker; the matrix is inherited from the children.

**Merged advisory Scenario Stress Matrix (does NOT change the combined verdict):** the same three children each emit a Scenario Stress Matrix from `SYNC:scenario-stress-eval` (top-down: big-traffic / big-data / dependency-failure / node-loss / data-corruption / self-heal survival vs. business need). Dedup the three views of the same scenario onto ONE advisory matrix in the consolidated report, exactly as for the technique matrix. **Pin ONE authoritative scale tier AND business-criticality read — `architecture --mode=scalability`'s derived `T`-tier + `B`-tier is canonical (owns scalability grading); if another child's derived tier/criticality DIVERGES, record it as a one-line note and key the merged matrix to the pinned values, rather than merging contradictory in-scope sets.** This only SELECTS which already-derived tier/criticality the matrix is keyed to — it does NOT re-derive any child's scenario findings. It is **advisory/INFO only** — a `FAILS-HARD` or `OVER-HARDENED` scenario is guidance, never a severity, and NEVER feeds the worst-case combined-verdict rollup. The criticality-signal floor and anti-over-engineering guard live in the children's matrices; this orchestrator adds no own gate marker and inherits the matrix from the children.

**Completeness lens over the merged set (orchestrator-only — the children cannot see across faces).** Once `Faces merged: 3/3`, sweep the merged report against the design-review script in `.claude/docs/architecture-knowledge.md` §20.2 and record any question NO face answered as an explicit `Coverage gap: {question} — not covered by any face` line. Frame each remaining risk against the five judgments in §20.4 — *when to add complexity · when to split · when consistency can be relaxed · when to buy vs build · when GOOD ENOUGH is correct* — so the consolidated report tells the reader which JUDGMENT is at stake, not only which rule was broken. A coverage gap is an INFO note, never a severity, and NEVER feeds the combined-verdict rollup. — why: three scoped reviewers each correctly stay in lane, so a question that belongs to no lane is invisible to every one of them and only this orchestrator can see it.

**Self-audit the merged report (MANDATORY before Step 5):** run the 11 thinking red flags in §20.3 across the merged findings — especially **a recommendation whose SACRIFICE is unnamed**, **"best practice" with no named forces**, and **a scale claim with no evidence**. Any hit is demoted or removed here, not passed to `$why-review` as ground truth. — why: the orchestrator's synthesis is where three children's confirmation biases compound into one authoritative-sounding report.

Step 4 ends only when `Faces merged: 3/3` — all three sub-scores are populated, the non-scoring TVC status is copied (or explicitly marked `UNVERIFIED`), the §20.2 coverage sweep is recorded, and every finding is on disk.

## Step 5: Fix-Report-Per-Review `$why-review` Gate (status `VALIDATING`) — MANDATORY when findings exist

Flip the report status to `🔍 VALIDATING`, then run ONE merged `$why-review` pass that WALKS EACH of the three review faces (one merged pass, NOT three per-face passes — a single invocation is strictly more thorough because it also validates the cross-face dedup separate per-face passes cannot see). The "fix report after each review" gate: every face's findings are validated, the report fixed IN PLACE.

1. Read the consolidated report from `tmp/reports/architecture-full-review-{date}-{slug}.md`.
2. Invoke `$why-review` with: `validate findings in {report-path} — WALK EACH review face (architecture --mode=scalability, architecture --mode=review, production-readiness-review) in turn: for each face verify every finding it contributed has file:line proof and a correctly-classified severity, steel-man each rejected interpretation; THEN validate the cross-face dedup did not drop or merge-away a distinct issue`.
3. `$why-review` demotes/removes any finding → FIX the report in place: revise severities, remove false positives, restore any distinct issue the dedup wrongly collapsed, and add a `## Why-Review Fix Notes` section listing per-face what changed + why.
4. `$why-review` confirms all findings → append `## Why-Review Validation` stating "All N merged findings re-validated across 3 faces; no severity changes."

Skip ONLY on an unconditional zero-open-finding PASS (LOW deferral) across all three children (log the skip reason, then proceed to Step 6 to finalize the clean PASS), or under `--defer=validate` below (Step 6 then finalizes the report as pending the deferred gate).

**`--defer=validate`** (passed by a workflow whose next gate is its own report-level `$why-review`, such as `workflow-architecture-audit`): record `Validation: deferred to <occurrence-id>` and go to Step 6. That gate walks each face exactly as items 1-4 describe, fixes the report in place and appends the `## Why-Review Validation` evidence, in its one pass — the merged findings are validated once, never twice.

## Step 6: Finalize (status `FINISHED`)

The report is now validated — or, under `--defer=validate`, marked `Validation: deferred to <occurrence-id>` — lock it and hand off a stable artifact.

1. Compute the **Combined Verdict** as the worst-case rollup across the three sub-scores (validated, or pending the deferred gate) (any BLOCKED / NOT READY / HIGH RISK dominates); write it into the header, replacing the `⏳ pending` placeholder.
2. Flip the report status (`🔍 VALIDATING`, or the pre-validation status under `--defer=validate`) to `✅ FINISHED` and append a `## Finalization` block: the three sub-scores, the non-scoring TVC status/source, the combined verdict, the total validated finding count by severity, and the `Faces merged: 3/3` confirmation.
3. This finalized report is the single deliverable the downstream workflow-level `$why-review` step and `docs-manager --mode=update` consume. Do NOT emit a second report file or re-synthesize — one file, finalized once; under `--defer=validate` the named gate revises this same file in place.

> **Two-tier validation (why this skill runs `$why-review` AND the workflow adds a `why-review` step):** Step 5 here is the FINDING-level, per-face fix that also protects standalone use of this skill. The workflow-level `why-review` step that follows is the REPORT-level final gate over the finalized artifact (verdict-rollup correctness, dedup completeness, cross-review severity consistency) and the machine-visible guarantee in the rendered sequence. Distinct altitudes; do not collapse one into the other — except under `--defer=validate`, where the workflow's gate performs both tiers in its one pass (the per-face walk of Step 5 items 1-4, then the report-level checks); standalone use always runs Step 5.

## Next Steps

> **Inside a workflow:** when this skill runs as a step of an active workflow, skip the prompts in this section and return the result — the workflow's next step decides what runs (`$start-workflow` → Step Execution Protocol, Workflow-step mode).

**MANDATORY — NO EXCEPTIONS:** After completing, use `ask user question tool` to present:

- **"$plan (fix validated findings)" (Recommended)** — plan the fixes for the validated findings (review-only findings hand off; standalone fix-loop owns authorized repairs and fresh audit).
- **"$linter-setup → $harness-setup"** — stand up (or complete) the mechanical quality harness. **Offer this FIRST whenever the `SYNC:engineering-foundation-gate` matrix marks F7 (mechanical harness) or F4 (test-strength proof) `MISSING-WARRANTED` or `PARTIAL-WITH-PATH`.**
- **"$code-simplifier"** — simplify and refine implicated code.
- **"Skip, continue manually"** — user decides.

> **[BROWNFIELD HARNESS ROUTE]** `linter-setup` and `harness-setup` inventory existing projects before proposing changes. Apply the gate’s **ratchet** rule: fail-on-NEW while tolerating the existing baseline is `PRESENT`.

> **Repair ownership.** Review-only and caller-owned audits return validated findings without fixes. Standalone `--fix-loop` repairs authorized findings at their owner after Step 5 validation, then repeats Steps 1–6 over the updated target, including all three lenses and their interactions. Create fresh review tasks, retain spent rounds, and apply the shared cap/LOW/extension rules. A pre-fix scorecard never proves the repaired target clean.

> **[IMPORTANT]** Use todo tracking to break ALL work into small tasks BEFORE starting. Keep task depth proportional to the work.

> **External Memory:** Complex/lengthy work → write intermediate findings + final results to `tmp/reports/` — prevents context loss, serves as deliverable.

> **Evidence Gate:** MANDATORY — every claim, finding, recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% verify first).

## Mode protocols

The protocols below apply to this mode only; their full text is inline so this reference is self-contained.

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
> - **Boundary naming:** When the category exposes public or cross-layer types, APIs, events, or modules, verify that names describe the capability, domain purpose, or contract rather than the current provider/framework/transport; concrete adapters may carry those details. Check callers and implementations before flagging a name, and treat generic names (`Manager`, `Helper`, `Utils`, `Data`) as signals rather than automatic violations.
> - **Test coverage:** Are the changed paths covered by tests? Are existing tests still valid after the change?
> - **Documentation:** Do related docs, specs, or READMEs reflect the changes?
>
> **Step 4 — Create sub-tasks and execute.** For each identified concern: create a todo tracking sub-task, work through it with `file:line` evidence, mark done. No findings without proof.
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


<!-- SYNC:engineering-foundation-gate -->

> **Engineering Foundation Gate** — Conditional, evidence-gated, profile-tiered: can the team build/run/test/change safely, repeatably, as it grows? Design companions: `scale-technique-gate` (techniques), `scenario-stress-eval` (scenario survival). **State OUTCOMES, never tools:** detect stack, research options, present 2–3, record user choice.
>
> 1. **Derive profile FIRST from evidence.** `Lifecycle` **G** greenfield (foundation being created) / **B** brownfield (foundation exists, under audit) · scale `T0`–`T3` (**reuse** `scale-technique-catalog.md`) · criticality `B0`–`B3` with its criticality-signal floor (**reuse** `scenario-stress-catalog.md`) · repo shape `R0` single module / `R1` few (2–5) / `R2` many modules, multi-team / `R3` monorepo estate · runtime surface. Cite `file:line`/config/CI + confidence. Unknown axis → state the assumption and take the **LOWER** tier; NEVER default to `T3`/`B3`/`R3`.
> 2. **Judge all 7 dimensions; none omitted.** Named owners supply depth:
>    - **F1 Reproducible environment** (ALL profiles — the floor) — Document clean-machine-to-running path; pin toolchains, lock dependencies, declare every external prerequisite and how to obtain/fake it; environment-inject config, never machine-implicit; deterministic build. → `scaffold` · `architecture --mode=scalability`
>    - **F2 Supported execution modes** (used/required modes only; no universal second mode) — document/exercise developer/test/deployment paths (host/container, local/managed, simulator/device), sharing config where possible. One mode fits → verify, comparison `N/A-by-profile`; invent no Docker/Compose/host path. Broken/irreproducible claimed or required modes are defects. → `scaffold` · `production-readiness-review`
>    - **F3 Environment-portable tests** (local+CI all profiles; production-shaped `T1+`/`B2+`) — the SAME suites run against local, CI and production-like targets, **parameterized by configuration, never by forked test code**. Missing capability → `ENVIRONMENT-BLOCKED`, never a silent pass; unsafe-in-production tests are excluded by an **enforced** mechanism. _"Runs in prod"_ means a safe, declared, **NON-MUTATING** subset. → `test-architecture-execution-contract` · `integration-test --mode=review`
>    - **F4 Test-strength proof** (wherever tests exist) — Prove tests **fail when code is wrong**, strongest first: (a) **automated fault injection** scoped to CHANGED code; (b) **deliberate defect-seeding drill — the universal fallback:** break the code behind a top invariant, run the suite, record **WHICH NAMED TEST went red**, restore — nothing red ⇒ write the killing test; (c) **assertion-intent audit:** flag assertions that survive an inverted implementation, check only non-nullness/type, re-assert the input, or assert infrastructure bookkeeping. **Line coverage is a DIAGNOSTIC, never a gate.** **Scope:** verify the PROJECT HAS a test-strength mechanism; PER-CHANGE enforcement belongs to `integration-test --mode=review` Gate 1's Mutation Probe Ledger. Report gaps once. → `harness-setup` · `integration-test --mode=review`
>    - **F5 Performance & scale-under-data** (`T1+`/`B2+` for a real tier; `T0`/`B0` = one documented largest-expected-volume check) — **MEASURE performance with a runnable check that CAN FAIL** and documented command; **realistic volume AND shape** (distribution, cardinality, skew); **named latency/throughput/memory budgets the run ASSERTS**; growth across **≥2 volumes ~10× apart**; resource exhaustion as a **tested, bounded** outcome (backpressure, paging or a clean error, not an OOM kill; no unbounded result-sets, accumulation or concurrency on the paths that matter). Label each number a regression signal or a capacity statement. → `performance-review` · `seed-test-data`
>    - **F6 Build & change scalability** (`R1+` declared style + boundaries; `R2+` computable affected set, enforced checks, measured incrementality) — build/test cost and blast radius **do NOT grow with the codebase**. Requires: a **COMPUTABLE** affected module set from declared inter-module dependencies; **measured** incrementality and caching; boundaries enforced **MECHANICALLY**; a **declared**, enforced architecture style; implementation behind abstraction so a technology swaps without touching business code; a fast scoped inner-loop check. **Scope:** cite existing `architecture --mode=scalability` **G2 Build & CI Scalability**/**G4** verdicts; do not re-score. → `architecture --mode=scalability` · `architecture --mode=review` (diff-level boundary drift) · `complexity-prevention`
>    - **F7 Mechanical quality harness** (format + lint + type/static analysis + build/test at ALL profiles; architecture-fitness `R1+`; dependency health + secret scanning wherever real data ships, unconditional at `B2+`; complexity/duplication + drift `R1+`/`T1+`) — **account for EVERY class or record it `N/A` with a reason:** formatting · lint/correctness · type & static analysis · complexity & duplication · **executable architecture-fitness** · dependency vulnerability & license · secret scanning · build/test gates plus the **F4** signal · documentation/config drift. Local and CI run the **SAME** command, configuration and version; checks **ENFORCE**, not warn; strictest reasonable defaults, loosened only with a recorded reason; cheap checks first. Brownfield adoption uses a **ratchet** — fail on NEW violations, tolerate the baseline — which counts as `PRESENT`. → `linter-setup` · `harness-setup` · `security-audit`
> 3. **One verdict per dimension:** `PRESENT` (proven by cited evidence) · `MISSING-WARRANTED` · `PARTIAL-WITH-PATH` (gap + concrete incremental step) · `N/A-by-profile` (below the warranting profile — **a correctly-lean project is a PASS, never a deficiency**) · `OVER-ENGINEERED` (present but unwarranted → advise AGAINST, name the carrying cost) · `UNVERIFIED` (could not be checked; **NEVER score an unverified dimension `PRESENT`**).
> 4. **Authority:** **CREATING** (greenfield init/scaffold/build-test-CI plan) → `MISSING-WARRANTED` is **BLOCKING**; warranted omissions need explicit decisions. **AUDITING** (brownfield/architecture/changes review) → **ADVISORY ONLY** matrix + prioritized adoption path; **NEVER mutate any score, `/20`, `/24`, verdict band, or gate PASS/FAIL**.
> 5. **Symmetric anti-over-engineering guard.** Do NOT demand a container mode of a single-author utility, a distributed load platform for a small internal service, affected-set computation for a single module, or overlapping analyzers for one defect class; module splits follow real module and team count, never aesthetics. Symmetrically, never UNDER-harden a `B2+` system merely because its traffic is low.
> 6. **Every brownfield finding names a smallest independently valuable next step.** Default ladder: pin the toolchain & commit the lockfile → one local command that CI also runs → ratchet the harness on (fail-on-new) → run the defect-seeding drill on the top invariants → repair the missing execution mode → seed a realistic volume and assert ONE budget → declare the style, then enforce dependency direction. Deviate on evidence and say why.
> 7. **Output — Foundation Readiness Matrix:** `dimension | warranted at this profile? | present? | verdict | evidence (file:line/config/CI) | smallest next step`, after the derived profile (per-axis evidence + confidence), before the adoption path (brownfield) or blocking list (greenfield). Full catalog → `.claude/docs/engineering-foundation-catalog.md`. **Drift-guard: profile axes, dimensions, verdicts and warranting tiers are AUTHORITATIVE in that catalog — update it FIRST, then re-run `.claude/scripts/inject_engineering_foundation_gate.py` to re-propagate. Scale tier stays single-sourced in `scale-technique-catalog.md`; business criticality in `scenario-stress-catalog.md`.**
>
> **BLOCKED until:** `- [ ]` profile derived from evidence (lifecycle + `T` + `B` + `R`, lower tier when unknown) `- [ ]` all 7 dimensions judged, none omitted `- [ ]` matrix emitted with `file:line`/config/CI evidence `- [ ]` anti-over-engineering guard applied `- [ ]` authority confirmed — creating ⇒ blocking, auditing ⇒ advisory-only with no score mutation `- [ ]` every brownfield gap carries a smallest-next-step

<!-- /SYNC:engineering-foundation-gate -->

<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Do not present inference as fact; ground material claims in evidence appropriate to the task.
>
> 1. Cite `file:line` for repository claims, configuration or reference paths for project rules, and URLs or artifact locations for external or observed claims.
> 2. State confidence when a conclusion is uncertain; verify material assumptions before acting and withhold recommendations when evidence is insufficient.
> 3. Trace the consumers, boundaries, or dependencies that exist in the affected path; do not assume services, modules, or architectural styles that the project does not use.
> 4. "I don't have enough evidence" is valid and expected output.
>
> **BLOCKED until:** material claims have traceable evidence, relevant searches are complete, and uncertainties are stated. Search comparable patterns when the task has existing implementations; record when none are available.
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->


<!-- SYNC:goal-contract-satisfaction-loop -->

> **Goal Contract Satisfaction Loop** — Persist the user goal in an external file, execute against it, and loop review/fix until every saved required criterion passes or a blocker escalates. Bounded closed loop — NEVER open-ended autonomous exploration.
>
> 1. **Resolve the active goal** (in order): active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md` (plans root default `plans`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path) → create a new Goal Contract from the current user request (template: `.claude/templates/goal-contract-template.md`).
> 2. **Required sections:** Original Request, Purpose, Success Criteria (checkboxes; mark required vs optional), Constraints, Evidence Required, Iteration Log, Goal Satisfaction matrix.
> 3. **Before work:** read the active goal and map planned work to saved success criteria — execution serves the saved criteria, never chat memory alone.
> 4. **After execution/verification:** append an Iteration Log entry — result, evidence references (`file:line`, command output, report path), remaining gaps.
> 5. **Review gate:** emit a Goal Satisfaction matrix — `| Success Criterion | Evidence | Status |` with PASS/FAIL/BLOCKED. Overall PASS requires every required criterion PASS.
> 6. **Loop rule (retry):** required criterion FAIL → validate the gap is real → fix → re-review only the affected criteria. Stop cleanly when all required criteria PASS.
> 7. **Escalation rule (stop):** two consecutive iterations with no criterion progressing, or a blocker needing user input → mark the criterion BLOCKED with a user-facing reason and escalate. NEVER loop indefinitely.
> 8. **Skip rule:** tiny conversational tasks may skip the goal file ONLY with a recorded one-line reason. User-accepted gate skips are recorded in the goal file with reason and scope.
> 9. **Security:** NEVER store secrets, tokens, credentials, or private customer data in goal files — store evidence references and redact sensitive values.
>
> **Blocked until:** active goal resolved (or skip reason recorded) · saved success criteria read before edits · iteration evidence appended after execution · Goal Satisfaction matrix emitted before any PASS verdict.

<!-- /SYNC:goal-contract-satisfaction-loop -->

<!-- SYNC:graph-assisted-investigation -->

> **Graph-Assisted Investigation (optional advice)** — Optional: for high-risk blast radius (shared contract, many callers, cross-module/cross-service flow, public API), `.code-graph/graph.db` may add callers, dependents and impacted tests beyond grep/read. Treat it as a hint, NOT proof: stale or incomplete graphs lag uncommitted edits and unindexed paths. verify anything that matters by reading files/grep. Skip it for low-risk or local changes.
>
> An absent or stale graph is never a finding and never blocks, fails or gates work.
>
> **Pattern:** grep/read → optional graph suggestions → grep/read verification.
>
> | Situation                          | Optional graph query                         |
> | ---------------------------------- | -------------------------------------------- |
> | High-risk investigation            | `trace --direction both` on 2-3 entry files  |
> | Fix/debug with wide reach          | `callers_of` on buggy function + `tests_for` |
> | Feature touching a shared contract | `connections` on files to be modified        |
> | Review of a high-risk change       | `tests_for` on changed functions             |
> | Blast radius                       | `trace --direction downstream`               |
>
> **CLI:** `python .claude/scripts/code_graph {command} --json`. Start `--node-mode file` (10-30x less noise), then `--node-mode function` for detail.

<!-- /SYNC:graph-assisted-investigation -->


<!-- SYNC:review-principle-awareness -->

> **Review Applicability / Current-Principles Awareness** — Every review must first classify the change context (greenfield foundation, brownfield feature/refactor, test/docs/config/UI/infra, or actor-facing/machine surface) and take notice of the applicable current principles below. This is an evidence-gated applicability check, not a mandate to flag or build every item.
>
> **Detailed protocol routing — read/apply only when warranted:**
> - `SYNC:scale-ready-foundation` — greenfield foundation is blocking; big-feature brownfield fit/adapt/defer; architecture review is advisory when auditing. Detailed carriers: `workflow-greenfield-init`, `workflow-big-feature`.
> - `SYNC:test-architecture-execution-contract` — assertion-bearing tests use the project's configured/native format, name the guarded intent/technical contract, and assert an owned outcome; GWT is one valid format. Detailed carriers: `integration-test`, `workflow-greenfield-init`, and the test-architecture review path.
> - `SYNC:ai-agent-as-user-access` — when an AI/machine actor or future contract is evidenced, inspect identity/delegation, capability boundaries, selected API/CLI/MCP/WebMCP/event/SDK surface, safety/consent, audit/observability, and native-format contract tests. Detailed carriers: `workflow-greenfield-init`, `workflow-big-feature`, `architecture --mode=review`.
> - `SYNC:design-system-check` — when UI changes, inspect the design-system and component-contract obligations; route visual/UX depth to the owning UI review.
>
> **Review behavior:** Check only principles applicable to the reviewed scope; record `APPLY-NOW`, `ADAPT-IN-SLICE`, `DEFER-AS-OPPORTUNITY`, `NOT-APPLICABLE`, `BLOCKED`, or `UNVERIFIED` with `file:line`/config/CI evidence, status/severity, owner/route, and next step/revisit trigger. Do not invent findings from a generic checklist, flag unrelated pre-existing gaps as regressions, silently expand the requested scope, or mutate a parent gate merely because advice exists.
>
> **Ownership:** `changes-review` coordinates the applicability pass and routes depth to the owning specialist (`architecture --mode=review`, `integration-test --mode=review`, `security-audit`, `performance-review`, `ui-design --mode=review`, `production-readiness-review`, or another matching review). A specialist reports its own lens and does not duplicate or override another review's verdict; existing brownfield gaps stay advisory unless new, safety-relevant, or explicitly in scope.
>
> **Required review note:** `context/scope | principle/protocol checked | evidence | status/verdict | severity | owner/route | next step/revisit trigger`.
>
> **BLOCKED when:** an applicable principle is required for safety/correctness but missing, unowned, or untestable. Otherwise record an evidence-backed `NOT-APPLICABLE`, advisory, `DEFER-AS-OPPORTUNITY`, or `UNVERIFIED` result according to the lifecycle and change context; creating a greenfield foundation remains subject to its own blocking protocol.

<!-- /SYNC:review-principle-awareness -->

<!-- SYNC:review-protocol-injection -->

> **Review Protocol Injection** — Fresh reviewer prompts MUST embed 11 protocol blocks VERBATIM, copied WHOLESALE; these are review-tier renderings. When canonical `SYNC:` protocols change, update their renderings here in the same edit. Copy this template into the Agent `prompt`; replace only `{placeholders}` in Task / Round / Reference Docs / Target Files / Output. Never alter embedded sections at dispatch.
>
> **Why inline expansion:** Fresh reviewers need every rule immediately; file pointers/placeholders depend on reads or hooks that may not fire. The hybrid policy (`SYNC:shared-protocol-duplication-policy`) therefore retains all 11 full bodies in this template, copied wholesale.

### Subagent Type Selection

- `code-reviewer` — for code reviews (reviewing source files, git diffs, implementation)
- `general-purpose` — for plan / doc / artifact reviews (reviewing markdown plans, docs, specs)

### Canonical Agent Call Template (Copy Verbatim)

```
spawn_agent({
  description: "Fresh Round {N} review",
  agent_type: "code-reviewer",
  prompt: `
## Task
{review-specific task — e.g., "Review all uncommitted changes for code quality" | "Review plan files under {plan-dir}" | "Review integration tests in {path}"}

## Round
Round {N}; ZERO prior-round memory. Re-read every target with your own tools. Trust no main-agent information beyond this prompt.

## Protocols (follow VERBATIM — these are non-negotiable)

### Spec ↔ Tests ↔ Code Triangulation
FIRST review the WHOLE PACKAGE. Read `docs/project-config.json`: valid `specArtifacts` profiles select configured `intent/contracts/evidence` roles, identifiers, ownership and test-carrier dialects; only absent profiles use strict-default §3 ACs / §4 BRs / §5 invariants / §8 TCs. Malformed/unsupported declarations are `BLOCKED`, never absent/fallback. Load governing artifact, tests, and changed code TOGETHER; judge mutual consistency before isolated checks.
1. Locate canonical owner sections, guarding tests, and implementing code. Native profiles: preserve owner path + case/scenario ID + optional variant; resolve configured carriers to actual tests. Missing faces are findings (SPEC-GAP / TEST-GAP / DEAD-SPEC).
2. Triangulate pairwise; log every disagreement and classify its wrong face:
   - code vs spec: behavior absent from configured `intent/contracts` (or strict-default §3/§4/§5/§8) → CODE-EXTRA or SPEC-STALE; a hard contract/invariant with no enforcing path → CODE-WRONG.
   - tests vs spec: native case without executing assertions, or assertions absent from native rules/cases → TEST-GAP or SPEC-SILENT. Without `specArtifacts`, check strict-default §8 TCs.
   - tests vs code: uncovered changed path → TEST-GAP; test passing a deliberately broken invariant → WEAK-TEST (apply the mutation thinking in Bug Detection).
3. Hidden-rule capture: enforced but unstated invariants (SPEC-SILENT) MUST become findings, additions to configured `intent`/`contracts`, and `evidence` links to native cases with inspected executing assertions. Without profiles, use strict-default §3/§4/§5/§8 and TC. Enrich; never silently pass.
4. Proceed only after agreement or all disagreements are logged; re-review enriched spec/test packages.
NEVER PASS unlogged spec/test/code disagreements. Diff = entry point; package = judgment unit.

### Evidence-Based Reasoning
Speculation FORBIDDEN; prove every claim.
1. Every claim: cite file:line, grep results, or framework docs
2. Confidence: >80% act freely; 60-80% verify first; <60% DO NOT recommend
3. Cross-service validation required for architectural changes
4. Insufficient evidence is valid/expected output
5. Review decision autonomy: choose evidence-supported review approaches, recommendations and next steps without asking the user. Record rationale and preserve every evidence gate. Read-only leaves return remedies to their owner. Only round-limit extension, indispensable facts with no defensible default, and actual missing action authority require a question; never infer consent, accept an open risk or perform an unauthorized operation.
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
Admit a finding only with a reachable trigger path (the caller, input or state that reaches the defect) and a consequence; a concern no supported path reaches is an observation, and unsettled reachability is `NOT VERIFIABLE` only when the concern would be MEDIUM or higher.
Classify every finding by consequence (never by effort): CRITICAL = immediate material security/safety/data-loss risk or failed binary gate → block; HIGH = material correctness, contract, privacy, or authority risk → must fix; MEDIUM = bounded consequential edge/resilience/maintainability gap → must clear the current round, or escalate with an explicit residual-risk follow-up that does not create a clean pass; LOW = non-blocking polish with no credible present impact → record/defer from round 2; `NOT VERIFIABLE` is unresolved evidence, not LOW.

### Design Patterns Quality
Every code change:
1. Consistency/reuse: follow documented patterns; justify extraction cost by repetition or real consumer need. Similar names alone never require shared bases.
2. Responsibility: follow config/references/accepted decisions/code; place behavior with its owner. Assume no entity/service/controller hierarchy or forbidden layer without evidence.
3. Apply cohesion/coupling/dependency principles where paradigm assumptions fit; SOLID suits OO boundaries, not every language/codebase.
4. After extraction/move/rename: Grep ENTIRE scope for dangling references. Zero tolerance.
5. YAGNI: repetition prompts evaluation, never numeric extraction thresholds. Extract when shared change reasons, real consumers, or evidenced ownership/substitution lower total change cost; no hypothetical-use patterns.
6. Purpose naming: public/cross-layer abstractions name consumer capability/domain/contract, not provider/SDK/framework/database/transport. `IStorage`/`Storage` → `AzureBlobStorage`; use `IAzureStorage` only when Azure-specific semantics are intentionally part of the contract.
7. Contract-fit: read callers/all implementations; narrow over-broad abstractions (`IObjectStore`, `DocumentStore`), never reward misleading generic names.
8. Naming signals: `Manager`, `Helper`, `Utils`, `Data`, `Thing`, `Service`, `Interface`, type decorations/unexplained abbreviations are defects only when hiding purpose/scope/responsibility.
9. Concrete names: provider/strategy/transport/test-double names may distinguish real behavior (`AzureBlobStorage`, `InMemoryStorage`, `RetryingStorage`); exclude from caller contracts unless promised.
10. Preserve local interface syntax/naming: `.NET` `I` prefixes and Google TypeScript unmarked interfaces are both valid.
Anti-patterns to flag: God Object, Copy-Paste inheritance, Circular Dependency, Leaky Abstraction.

### Logic & Intention Review
Verify behavior matches change intent.
1. Every changed file MUST serve stated purpose; flag unrelated scope creep.
2. Trace one complete success scenario through changed code.
3. Trace one failure/edge scenario through changed code.
4. With plan context, map every acceptance criterion to code.
5. Test/spec changes: tests name protected business rule/invariant and fail when it breaks.
6. Migration exclusion: no migration-code tests; schema/data migrations are one-time paths, not core application logic.
NEVER PASS without both happy/error traces.

### Test Spec Verification
Map changed code to test specs.
1. Discover test/spec format in docs, test cases, BDD features, or spec folders.
2. Every changed path MUST map to a test case/spec or be flagged "needs test case".
3. New functions/endpoints/handlers → test-spec creation flag.
4. Exclude migrations from test/spec creation: one-time execution, not core application logic.
5. Verify existing spec evidence resolves actual code (file:line); flag stale references.
6. Meaningful cases name business intent/invariants; flag implementation-mirroring behavior-only cases.
7. Auth/data changes → verify corresponding authorization and data-state test cases exist.
8. Missing changed-path specs → log gap, recommend project test-spec workflow.
NEVER skip test mapping; uncovered paths risk production bugs.

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
Trace execution/data flow; fix the violated contract's owner, never assume the crash site.
MANDATORY before ANY fix:
1. Trace actual origin, transformations, boundaries, failure; invent no absent layers.
2. Identify invalid-state/behavior contract owner from architecture/code evidence.
3. Fix authoritative owner; retain untrusted-boundary validation. Justify multi-file fixes by owned contracts, not file-count thresholds.
4. Inspect relevant existing bypass entries: constructors/adapters/parsers/caches/persistence.
BLOCKED until: The affected path is traced; the owner is supported by file:line evidence; relevant consumers and bypass paths are checked; and the correction point fits the project's architecture.
Anti-patterns (REJECT): assuming the symptom site is the owner; scattering workarounds without tracing the contract; assuming the lowest technical layer is always authoritative; removing validation from a real trust boundary to force a single correction point.

### Rationalization Prevention
AI skips steps via these evasions. Recognize and reject:
- "Too simple for a plan" → Simple + wrong assumptions = wasted time. Plan anyway.
- "I'll test after" → RED before GREEN. Write/verify test first.
- "Already searched" → Show grep evidence with file:line. No proof = no search.
- "Just do it" → Still need todo tracking. Skip depth, never skip tracking.
- "Just a small fix" → Small fix in wrong location cascades. Verify file:line first.
- "Code is self-explanatory" → Future readers need evidence trail. Document anyway.
- "Combine steps to save time" → Combined steps dilute focus. Each step has distinct purpose.

### Graph-Assisted Investigation (optional advice)
Optional: for high-risk blast radius (shared contract/many callers/cross-module/cross-service/public API), .code-graph/graph.db suggests callers/dependents/impacted tests. Treat it as a hint, NOT proof: stale/incomplete graphs lag uncommitted edits/unindexed paths. Verify important results by files/grep; skip low-risk/local changes. An absent or stale graph is never a finding.
Pattern: grep/read → optional graph suggestions → grep/read verification.
- High-risk investigation: trace --direction both on 2-3 entry files
- Fix/debug with wide reach: callers_of on buggy function + tests_for
- Feature touching a shared contract: connections on files to be modified
- Review of a high-risk change: tests_for on changed functions
- Blast radius: trace --direction downstream
CLI: python .claude/scripts/code_graph {command} --json. Use --node-mode file first (10-30x less noise), then --node-mode function for detail.

### Understand Code First
HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
1. Search 3+ similar patterns (grep/glob) — cite file:line evidence.
2. Read existing files in target area — understand structure, base classes, conventions.
3. Optional high-risk hints: python .claude/scripts/code_graph trace <file> --direction both --json if .code-graph/graph.db exists; verify stale-capable caller/dependent hints by files.
4. Map dependents by grep/read callers; optional graph connections/callers_of adds hints.
5. Write investigation to tmp/analysis/ for non-trivial tasks (3+ files).
6. Re-read analysis file before implementing — never work from memory alone.
7. NEVER invent new patterns when existing ones work — match exactly or document deviation.
BLOCKED until: Read target files; Grep 3+ patterns; Assumptions verified with evidence. (The code graph is optional advice, never a gate.)

## Reference Docs (READ before reviewing)
Read only lane-resolved docs; do not re-resolve the whole set.
- `code-review-rules.md`, inside the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path)
- {lane-specific docs the orchestrator resolved — e.g., the pattern doc for the files under review, integration-test-reference.md for a test lane, the governing spec for a spec-compliance lane}

## Target Files
{explicit file list OR "run git diff to see uncommitted changes" OR "read all files under {plan-dir}"}

## Output
Write a structured report to tmp/reports/{review-type}-round{N}-{date}.md with sections:
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
- DO choose `code-reviewer` agent_type for code reviews and `general-purpose` for plan / doc / artifact reviews
- DO NOT paraphrase, summarize, or skip any protocol section
- DO NOT pass file contents inline — the sub-agent reads via its own tool calls so it has a fresh context
- DO NOT reference protocols by file path or tag name — the bodies are already embedded above
- DO NOT introduce placeholder markers for the protocols — they must stay literally expanded

<!-- /SYNC:review-protocol-injection -->

<!-- SYNC:severity-rubric -->

> **Severity Rubric** — Use one consequence-based scale across reviews, skills, agents, workflows and hosts. Choose the highest credible tier supported by evidence; never lower it to pass a round. Effort, cost, preference, annoyance, frequency alone and round-budget pressure do not determine severity.
>
> **Finding vs observation:** admit a finding only with an affected user/system/data/contract, shipped consequence, reachable supported trigger (caller, input, state or event sequence), evidence location and confidence percentage. Assess exposure/likelihood and reversibility/detectability before assigning a tier.
>
> **Keep as observations:** advice, preference, duplicates, unsupported concerns, unreachable paths, issues already reported by this change’s compiler/type checker/linter/tests, intended behavior changes, reasoned suppressions predating the change, and pre-existing issues neither touched nor made reachable. Review newly added suppressions. Observations/INFO do not reopen loops.
>
> | Tier | Consequence and boundary examples | Action |
> | --- | --- | --- |
> | CRITICAL | Immediate material security, safety or authority harm; auth bypass; secrets/PII exposure; irreversible destruction; data loss/corruption; critical-path silent failure. | Block immediately; escalate. |
> | HIGH | Material supported-path correctness, invariant, privacy/authority, public-contract or compatibility failure; likely user/downstream harm; missing proof for a behavior-changing fix. | Fix before PASS/merge. |
> | MEDIUM | Bounded consequential edge, resilience, observability, testability, maintainability or architectural gap; credible future defect. | Clear this round; escalate decisions needing an owner. A follow-up is not a clean pass. |
> | LOW | Proven non-blocking polish with no credible present correctness, security, privacy, authority, availability or data-integrity impact: wording, formatting, minor docs/conventions, optional cleanup, cosmetics. | Record/defer; alone never opens another round from round 2 or increases the budget. |
>
> **Consequence decision tree:** check binary gates separately, then select the first evidenced tier from CRITICAL → HIGH → MEDIUM → LOW. Missing evidence is **NOT VERIFIABLE**, not a fifth tier or a LOW fallback: name the missing proof. Unsettled reachability is NOT VERIFIABLE for potential MEDIUM+ impact and an observation for polish. Claims potentially affecting required behavior, security, privacy, authority, availability, data integrity or a gate remain evidence blockers until proved or explicitly owner-accepted with scope, rationale and residual risk. Owner acceptance does not make an open MEDIUM a clean pass or a failed gate pass.
>
> **Hard gates and rounds:** failed tests, required artifacts, security must-fix checks, generated parity and policy compliance block every round, independently of finding severity. The executable helper carries failures as synthetic CRITICAL blockers; reports name the gate and failure evidence. Default review budget is three rounds; unresolved findings or failed required checks at the cap ask the user for a bounded extension under `SYNC:review-policy`. Failed checks never pass by severity deferral.
>
> **Domain-vocabulary normalization and scores:**
> - `BLOCKED`/`HARD FAIL`/`FAIL` are local blocking verdicts, not automatic CRITICAL; classify by consequence while preserving the owning gate. `WARN` can be any tier; `PASS`/compliant is not a finding. INFO/advisory remains observational unless material consequence is evidenced.
> - UI `P0/P1/P2/P3/P4` start at CRITICAL/HIGH/MEDIUM/LOW/LOW; raise only with evidence. P0/P1 accessibility or task-completion floors remain blocking gates.
> - Criterion `0/1/2` → CRITICAL or HIGH (unmet readiness)/MEDIUM (partial consequential gap)/pass; polish is LOW, never forced to `0`.
> - Impact × likelihood: high impact/exposure → CRITICAL/HIGH; material impact with bounded exposure → HIGH/MEDIUM; low impact/exposure → LOW. Record both axes and justify the highest credible tier.
> - Aggregate scorecards and `/20` verdict bands stay separate; sub-80 areas prompt investigation, not automatic severity. Keep advisory deductions separate from blockers. Emit numeric SRE/readiness or impact/likelihood scores with consequence and normalized tier.

<!-- /SYNC:severity-rubric -->

<!-- SYNC:subagent-return-contract -->

> **Sub-Agent Return Contract** — When this skill spawns a sub-agent, the sub-agent MUST return ONLY the structured envelope below. Main agent reads the envelope first, then opens the referenced report for synthesis, acceptance, deduplication, or repair planning; a full report is never pasted inline.
>
> ```markdown
> ## Sub-Agent Result: [skill-name]
>
> Status: ✅ PASS | ⚠️ PARTIAL | ❌ FAIL
> Confidence: [0-100]%
> Run ID: [stable run identifier]
> Task ID: [parent task or phase identifier]
> Attempt ID: [monotonic attempt/revision identifier]
> Target: [exact files/paths or scope] @ [target fingerprint/commit]
> Changed paths: [none | exact paths]
> Finding totals: Critical=[n] | High=[n] | Medium=[n] | Low=[n]
> Acceptance: PENDING | ACCEPTED | REJECTED — parent records the decision
>
> ### Findings (Critical/High surfaced — max 10 bullets)
>
> - [severity] [file:line] [finding]
>
> ### Gaps / Unverified
>
> - [missing host, runtime, coverage, or evidence limitation]
>
> ### Actions Taken
>
> - [file changed] [what changed]
>
> ### Blockers (if any)
>
> - [blocker description, or `none`]
>
> Full report: tmp/reports/[skill-name]-[date]-[slug].md
> ```
>
> The ten-bullet limit is a transport limit, not a visibility limit: the full report may contain more than ten Medium/Low findings when no named blocker exists, and the parent MUST read it when synthesizing or deduplicating. The parent MUST reject a stale, duplicate, or superseded `Attempt ID` and MUST accept the current attempt before advancing a dependent step. Read-only leaves write repair proposals/reports only; they do not edit source, generated carriers, or user files.
>
> **Context budget** — the return payload is a SUMMARY, not a transcript: no raw file contents / full diffs / verbatim logs inline, no re-pasted source. Everything beyond the envelope lives in the incrementally-written report. A sub-agent that would exceed the summary shape MUST persist the detail and return only the pointer; bounded transport must never become bounded visibility.

<!-- /SYNC:subagent-return-contract -->

<!-- SYNC:systematic-review-batching -->

> **Adaptive Review Planning** — Triage the complete target and make a short plan before deep review. Optimize attention and time while preserving coverage and all applicable quality gates.
>
> 1. **Understand the work.** Inventory all changed paths/status and intent; distinguish behavior, contracts, tests, docs/config and mechanical outputs. Identify risk, dependency links and governing rules. Prioritize the paths whose failure has the largest consequence; size alone does not decide depth.
> 2. **Choose an approach.** Review inline when useful. Group connected behavior with its callers, tests and rules; use authorized specialist agents for independent work or necessary expertise. Decide grouping, read sizes and concurrency from the actual working set, context headroom and delegation cost. There are no universal file, line, byte or group-size caps, and no mandated split or hierarchy. Preserve host limits and leave room to reason.
> 3. **Track and persist.** Create todo tasks for the planned review work, findings validation and fix/re-review checks. Track coverage so every file is reviewed or accounted for by relevant evidence; generated/mechanical changes can use verified generator/parity or pattern checks with an explicit rationale. Read relevant source and rules on demand, persist findings and remaining work as you go, and resume from that record after interruption. If context is tight, checkpoint and regroup; never silently truncate or call unreviewed work clean.
> 4. **Coordinate and validate.** Give each delegated reviewer a clear scope, governing rules, report path and the required full review protocol template. Independent readers may run together; fixes wait until their reports return. Validate findings before acting, preserve rejected/re-tiered candidates and reconcile conflicts by evidence. The coordinator independently checks material findings, uncertain claims and cross-group interactions, choosing additional validation where risk warrants it. Reconcile all coverage and required checks before the final verdict.
>
> **Quality bar:** a thousand-file review may need several passes, but file count never waives end-to-end correctness, required rules, tests, finding validation or fresh post-fix review.

<!-- /SYNC:systematic-review-batching -->

<!-- SYNC:task-tracking-external-report -->

> **Task Tracking & External Report Persistence** — Bootstrap this before execution; then run project-reference doc prefetch before target/source work.
>
> 1. Create a small task breakdown before target file reads, grep, edits, or analysis. On context loss, inspect the current task list first.
> 2. Mark one task `in_progress` before work and `completed` immediately after evidence; never batch transitions.
> 3. For plan/review work, create `tmp/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` before first finding.
> 4. Append findings after each file/section/decision and synthesize from the report file at the end.
> 5. Final output cites `Full report: tmp/reports/{filename}`.
>
> **Blocked until:** task breakdown exists, report path declared for plan/review work, first finding persisted before the next finding.

<!-- /SYNC:task-tracking-external-report -->

<!-- SYNC:test-architecture-execution-contract -->

> **Test Architecture & Execution Contract** — Treat testability as a setup/architecture acceptance condition. Identify the test types and execution modes required by the project contract and task risk (for example unit, integration/system, E2E, performance/scale). Record `APPLICABLE` only with evidence of a relevant runner/framework/configuration; otherwise record `N/A — <evidence>` and never fabricate coverage or impose a universal tier threshold.
>
> 0. **Make the protected intent explicit in the project's test format.** Every assertion-bearing test states the behavior or technical invariant it protects and makes its inputs, trigger, and owned outcome understandable. Use `Given / When / Then` when the project's spec/config selects it or it fits; otherwise keep the project's native organization (property/fuzz tests describe the input space and property; harness and mutation tests use their native contract). Do not rewrite a test solely to adopt a framework-wide syntax.
>    Link the case to the configured owner/case/scenario identity and its `intent` or `contracts` role when `specArtifacts` is valid; when absent, record `Business Intent / Invariant Guarded` (or the technical contract). A malformed declared profile blocks without fallback. One behavior per case. The final assertion proves the outcome the test owns, not only an internal call, delivery bookkeeping, or setup side effect. Fixture/runner glue is exempt only when it holds no assertion. Convert legacy brownfield cases when touched; a broader migration is a named owned opportunity, and a safety-critical case without clear phases is `BLOCKED`.
>
> 1. **Matrix before implementation:** for each required test type record applicability, owner, runner/framework, test root, fixture/data strategy, full command, focused/partial command, zero-match behavior, CI gate, a simple entry point when useful, each supported execution mode, and the environments the project promises to support.
> 1a. **E2E profile handoff:** also record the selected `surfaceIds[]`, the linked `localRun` owner, auth mode/reference, seed/data mode, browser runner/engine/headed setting, action-delay policy, evidence root/capture/redaction policy, and convergence cap. Missing fields stay explicit blockers or N/A; never fill them from generic browser defaults.
> 2. **Runnable scopes:** full and focused commands are copy-ready, fail on invalid or zero-match selections, report exact counts and exit status, and are safe to repeat. E2E uses the configured browser/service commands and the project's synchronization strategy.
> 2a. **E2E organization gate (when E2E is applicable):** reuse the configured/discovered test organization — fixtures, shared helpers, scoped locator handles, page objects, or another evidenced structure — and record its actual owners. A Page Object Model is one valid pattern, never a universal requirement.
> 2b. **E2E reuse and DRY gate:** keep shared lifecycle, locator, readiness, auth, data, and evidence behavior at the project's existing reusable owner and final outcome assertions in the test. Reuse or compose existing helpers before creating new ones, keep one canonical owner per selector/action/wait, and treat duplicated wrappers or setup as a review signal; extract when a shared owner reduces change cost without crossing project boundaries.
> 2c. **E2E test layering:** test reusable behavior at its actual owner where the harness supports it; feature tests cover user outcomes and local composition. Do not invent component tiers or lower-tier contract tests the project does not use.
> 2d. **E2E synchronization:** wait for observable readiness and outcome conditions with bounded runner-native waits or the configured helper, with useful timeout diagnostics; apply action delays only when the project contract specifies them, and never use fixed sleeps as readiness evidence.
> 3. **Fresh valid state (when mutable or shared state applies):** isolate each test/run through the project's supported setup and public paths. Use unique identities for shared mutable data, realistic valid data for the behavior under test, and idempotent/restart-safe setup when fixtures or seeders persist. Intentional accumulation is additive and integrity-checked; never hide contamination with destructive reset.
>    Run-scoped cleanup, when supported, is opt-in and idempotent: after evidence capture it removes only ephemeral resources owned by the current run — never persistent/additive data or another run's data, never a shared-state reset, never a substitute for no-reset proof.
> 4. **Isolation and fidelity:** isolate mutable/shared data and parallel workers; share only immutable/reference data. Use realistic input and observable arrange barriers where behavior depends on them. Do not widen retries or weaken assertions to make a scenario pass.
> 5. **Evidence gate:** report command, scope, identity/data mode, exact result, and repeat proof; for persistent-state suites, verify repeatability without destructive reset at the level the project gate requires. Line coverage is diagnostic only; use property/invariant, mutation, change, or behavior signals when the tooling supports them.
> 6. **Execution modes and environment reach:** exercise each mode and environment the project declares it supports (for example host/container or local/CI), parameterizing targets rather than maintaining needless forks; record unexercised declared capabilities as a gap. A production-shaped target applies only when the project requires it; tests that can reach production need an enforced safe scope and report `ENVIRONMENT-BLOCKED` when it is missing. Pin dependencies and declare external prerequisites where the reproducibility contract requires. Depth → `SYNC:engineering-foundation-gate` **F1/F2/F3**.
>
> **Ownership:** Architecture/harness defines the matrix; scaffold/workflow makes it runnable; test writers implement tier-specific cases; reviewers verify the contract; the runner reports; seed-data owners preserve uniqueness, idempotency, realism, and accumulation integrity. Missing required evidence blocks setup completion.

<!-- /SYNC:test-architecture-execution-contract -->

<!-- SYNC:trade-off-interrogation-gate -->

> **Trade-Off Interrogation Gate** — ALWAYS ask these THREE questions before ANY verdict, score, finding, or recommendation — about the thing under review AND about every recommendation YOU make. — why: naming a benefit without its price is an endorsement, not a review; the costliest trade-offs are the ones nobody wrote down.
>
> **Review/audit decisions:** apply `SYNC:review-decision-autonomy` before any user-choice or confirmation prompt below. Select the supported recommendation and record its rationale; round-limit extension, indispensable missing facts and operation authority retain their explicit boundaries.
>
> 1. **Is there any trade-off?** Name what it SACRIFICES. "None" / "pure win" is an unfinished analysis, NOT an answer — to claim none, state which dimensions you checked and why each is unaffected: future change cost · complexity · performance/latency · memory/cost · coupling · reversibility · migration burden · operational load · blast radius · security posture · testability · team skill/ramp · delivery time · UX.
> 2. **Is it worth it?** Weigh gain against sacrifice EXPLICITLY — what is gained (with a metric) · what it costs · WHO pays · WHEN it comes due — then emit **WORTH IT / NOT WORTH IT / UNCLEAR**. "Better" with no metric and no cost FAILS this question. NOT WORTH IT → withdraw or replace the recommendation, never keep it as-is.
> 3. **Is the trade-off material enough to CONFIRM WITH THE USER?** A material trade-off is the user's call, never yours. **MATERIAL** when ANY holds: irreversible / one-way door (data migration, public contract, storage format, vendor lock-in) · cost shifted onto someone else (another team, ops/on-call, future maintainer, end user) · one quality attribute traded for another (correctness↔speed, security↔convenience, latency↔cost, simplicity↔flexibility) · a boundary crossed (client↔server tier, service contract, event contract, shared library) · a high-consequence path (auth, money, data integrity, breaking change, High/Medium residual risk) · the worth-it verdict is UNCLEAR.
>
> **MATERIAL → STOP and confirm via `ask user question tool` BEFORE the verdict stands** — state the trade-off, both options, what each sacrifices, and your recommendation. **NOT material →** record it inline with a one-line justification and proceed.
>
> **Non-asking execution contexts — ESCALATE BY HANDOFF, never by silence.** `ask user question tool` reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. When you are running in such a context, the obligation is **redirected, never waived** — do ALL of: (a) complete questions 1 and 2 normally; (b) decide materiality and record it in the Trade-Off Assessment row with `confirmed? = NO — cannot ask from this context`; (c) **name the unconfirmed MATERIAL trade-off explicitly in your returned summary/verdict so the CALLER (or parent orchestrator) escalates it via `ask user question tool` on your behalf** — a material trade-off mentioned only inside a report file on disk is NOT a handoff; (d) do not emit an unqualified PASS — mark the verdict as carrying an unconfirmed material trade-off, so the caller's gate stays closed until the user answers. The caller inherits the escalation duty the moment it reads your return.
>
> This carve-out is about **reachability, not convenience**: it applies ONLY where the tool genuinely cannot reach the user (spawned sub-agent, terminal validate/verdict-only mode, non-interactive/headless run). It is NEVER a licence to skip the question, to self-approve a one-way door, or to downgrade materiality because asking is inconvenient — if you CAN ask, you MUST ask.
>
> **Emit a Trade-Off Assessment row** per reviewed decision and per recommendation: `| decision | sacrifices | gain (metric) | who pays, when | WORTH IT/NOT/UNCLEAR | material? | confirmed? |`.
>
> **BLOCKED until:** trade-off named (or dimensions-checked justification given) · worth-it verdict emitted · materiality decided · every MATERIAL trade-off either confirmed with the user OR — in a non-asking context — handed off in the returned verdict for the caller to confirm. A MATERIAL trade-off that is neither confirmed nor handed off can NEVER be PASS, and NEVER gets buried as a Low-severity note.
>
> **NEVER** answer "no trade-off" without checking · decide a material trade-off silently on the user's behalf · let convergence/delivery pressure authorize walking through a one-way door · bundle several material trade-offs into one vague "proceed?".

<!-- /SYNC:trade-off-interrogation-gate -->

<!-- SYNC:measured-capacity-engineering -->

> **Measured Capacity Engineering** — Apply when planning, building, testing or reviewing a hot path, cache, capacity claim or scaling decision. Preserve the hosting skill's authority, phase order, scores and gates; unrelated work skips this protocol. **Priorities:** model demand and the SLO, remove measured work safely, then prove capacity and recovery before adding infrastructure.
>
> 1. **Define capacity as a workload contract.** Record endpoint/journey mix, think time, reads/writes, payloads, data volume/skew, authentication, environment and latency/error targets. Distinguish active sessions, open connections, in-flight requests, offered RPS and achieved successful RPS. A benchmark's hardware price, user count or CPU limit is not a portable capacity guarantee; DAU requires a separate usage model.
> 2. **Choose and disclose the load model.** Use closed-loop users for journeys; use an open arrival-rate model when testing independently arriving demand. Closed loops can reduce offered traffic as latency rises. Report attempted/completed work, errors/timeouts and dropped iterations, verify generator headroom, and separate component tests from the full journey. Repeat controlled runs with realistic data, warm steady state, cold/expiry cache, sustained load and recovery as warranted; static evidence yields a verification plan, never an invented capacity result.
> 3. **Locate the limiting resource.** Correlate tail latency with queue/pool wait and per-process CPU, runtime stalls, memory/GC, database query plans and lock waits, disk and network. Co-located components compete for resources; high aggregate CPU alone does not identify its owner. Compare one hypothesis-changing optimization at a time under the same workload, then re-profile because the bottleneck can move.
> 4. **Reduce work before multiplying resources.** Bound/filter at the data source, verify query access paths, batch repeated calls, trim payloads and keep synchronous hot-path work small. Select the smallest evidenced fix; urgent capacity or availability requirements can justify scaling first. Read `.claude/skills/performance-review/references/performance-knowledge.md` §10.1 when designing a capacity experiment and §6.1 before selecting a cache layer.
> 5. **Place reuse at the earliest safe boundary.** Compare request/process, shared data and proxy/client caches by work avoided, hit rate, key cardinality, freshness and operating cost. Cache lookup must preserve authorization and all response-varying inputs; personalized data is private/bypassed unless isolation and authorization before every hit are proven. Bound bytes/entries, lifetime and refill concurrency; specify write invalidation, stale-data policy, cross-instance behavior and cold-cache fallback. Verify cross-user isolation and mutation visibility as well as speed.
> 6. **Budget overload and recovery.** Find the measured SLO boundary and keep justified headroom; no universal CPU percentage defines safety. Bound queues, concurrency, pools, retries and dependency demand across all replicas. Exercise cache loss, deploy/warmup and overload: verify bounded degradation/shedding and recovery after demand falls, without dropping correctness, authorization or durability to win a benchmark.
> 7. **Scale the evidenced owner incrementally.** Compare tuning/offload and vertical capacity with horizontal replicas or component separation; name state/session/cache coherence, shared dependency limits, availability and operational costs. A single-instance design can be efficient while failing an availability requirement. Choose distribution only for measured pressure or explicit business/availability needs, with an owner, revisit trigger and reversible next step.
>
> **Evidence output:** workload/SLO/environment | load model and offered/achieved demand | limiting-resource proof | before/after distributions and errors | cache correctness/cold-state proof (if applicable) | headroom/recovery | cost/trade-off and next scaling trigger. Record unavailable measurements explicitly. **Closing priorities:** model demand → reduce work safely → prove capacity/recovery; retain the hosting contract and never generalize anecdotal numbers.

<!-- /SYNC:measured-capacity-engineering -->

<!-- SYNC:graph-assisted-investigation:reminder -->

**Optional advice:** the code graph (`.code-graph/graph.db`) can hint at a high-risk blast radius grep misses; it can be stale, so verify by reading files. Never required.

<!-- /SYNC:graph-assisted-investigation:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->


<!-- SYNC:systematic-review-batching:reminder -->

**MUST ATTENTION** Triage all files, write a short review plan and create review/validation/fix/re-review tasks first. Choose inline work or authorized specialists from risk, relationships and context headroom; no fixed file/line/byte caps. Persist coverage, reconcile interactions and validate findings before fixes or PASS.

<!-- /SYNC:systematic-review-batching:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** A finding names a reachable trigger path (caller, input, state or event that reaches the defect) and a consequence; an unreachable concern is an observation, and unsettled reachability is `NOT VERIFIABLE` only when the concern would be MEDIUM or higher (an observation otherwise) — never a speculative LOW.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

<!-- SYNC:category-review-thinking:reminder -->

- **MANDATORY** Derive review categories from file language + directory semantics + change nature; create a sub-task per category.
- **MANDATORY** Derive each category's concerns from first principles with `file:line` evidence — never a fixed checklist.

<!-- /SYNC:category-review-thinking:reminder -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval; inside a workflow run, `$start-workflow` → Workflow-step mode bounds this
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

**Review/audit invocations:** follow `SYNC:review-decision-autonomy` for every decision prompt; choose supported recommendations without asking, preserve round-extension approval and actual authority.

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **what does it SACRIFICE?** name the dimensions checked (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it MATERIAL enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm via `ask user question tool` BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; never bury one as a Low-severity note, never decide it silently, and never let delivery or convergence pressure authorize a one-way door — an un-walked-back one-way door is the user's call, not the reviewer's.
- **MANDATORY — a context that cannot ask escalates BY HANDOFF, never by silence.** `ask user question tool` reaches only the main interactive agent, so a sub-agent or a terminal/verdict-only mode cannot ask. There the duty is REDIRECTED, not waived: still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, and **state the unconfirmed MATERIAL trade-off in your RETURNED verdict so the CALLER escalates it** (a note only in an on-disk report is not a handoff); never emit an unqualified PASS. If you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->


<!-- SYNC:test-architecture-execution-contract:reminder -->

**MUST ATTENTION** Each assertion-bearing test names the behavior or technical contract it protects and asserts an outcome it owns. Use the project's configured/native test format — Given/When/Then is one valid format, never a framework-wide requirement. When `specArtifacts` is valid, link configured owner/case/variant identity and `intent/contracts` evidence; when absent, name the guarded business intent or technical contract. A malformed declared profile BLOCKS without fallback. Broad test-format migration → assign an owner and next step, never rewrite cases outside scope.

**MUST ATTENTION** Before implementation record evidence-backed applicability for the test types and modes the task/project contract requires: copy-ready full and focused commands where available, zero-match behavior, a useful platform-appropriate entry point, supported execution modes and environments, state-isolation requirements, exact results, and repeat evidence where persistent state makes it relevant. Exercise claimed modes; report a missing required capability as `ENVIRONMENT-BLOCKED`. Never invent production targets or impose a test format. Browser/UI E2E uses the configured runner's waits or project helper for observable readiness and outcomes; apply action pacing only where the project contract specifies it. Reuse the project's evidenced test organization — require a POM, base class, or component taxonomy only when the project actually selects it.

<!-- /SYNC:test-architecture-execution-contract:reminder -->

<!-- SYNC:engineering-foundation-gate:reminder -->

**IMPORTANT MUST ATTENTION** evidence-backed lifecycle/scale/criticality/repo/runtime profile; unknowns take lower tiers. Judge all 7 outcomes: **F1** reproducible build/run/test · **F2** exercise supported/required modes; dual modes only when warranted · **F3** applicable local/CI/production-shaped test portability · **F4** test-strength proof; no universal mutation tool · **F5** measured performance at warranted scale/risk · **F6** build/change scalability at meaningful module boundaries · **F7** stack/profile-fit mechanical checks. Evidence-backed `N/A-by-profile` is valid; prevent over-engineering. Creation blocks warranted omissions; brownfield advises without score changes, with smallest next steps. Catalog: `.claude/docs/engineering-foundation-catalog.md`; update first, re-run `inject_engineering_foundation_gate.py`.

<!-- /SYNC:engineering-foundation-gate:reminder -->

<!-- SYNC:review-principle-awareness:reminder -->

**IMPORTANT MUST ATTENTION** Every review first checks the change context and routes only applicable principles to their detailed protocols: scale-ready foundation, test intent in the project's native format (GWT is one option), AI-agent-as-user access, and UI/component design when relevant. Record evidence-backed apply/adapt/defer/N/A/block/unverified status with owner and next step; do not invent unrelated findings or expand scope.

<!-- /SYNC:review-principle-awareness:reminder -->

<!-- SYNC:measured-capacity-engineering:reminder -->

**MUST ATTENTION** capacity work: model demand/SLO and distinguish sessions from RPS/in-flight work; disclose load model and offered vs achieved demand; reduce measured work at a safe owner; preserve cache authorization/freshness/bounds; prove cold-state, overload recovery and justified headroom before scaling. Static review returns a verification plan, not invented throughput. Retain the hosting skill's scores, gates and authority.

<!-- /SYNC:measured-capacity-engineering:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** Testability contract: resolve evidence-backed Unit/Integration/System/E2E rows, copy-ready full/focused commands, zero-match failures, owner/root/data, CI/simple Windows/macOS/Linux entry, unique run identity, and repeat proof before claiming setup, review, or test completion.
**IMPORTANT MUST ATTENTION Goal:** Audit the WHOLE project's architecture, scalability, and production readiness in ONE pass: cover all three owning lenses inline or through authorized specialists, dedup intentional cross-references, and synthesize ONE consolidated Architecture Health Report with one combined verdict — this is a THIN orchestrator; NEVER re-implement child reviews.

**IMPORTANT MUST ATTENTION — Main steps (execute in order, NEVER skip/merge):** (1) Resolve scope (infer from args/conversation; map to each lens) → (2) Load project reference docs once → (3) Review all three owning lenses inline or through authorized specialists; wait for all delegated returns before repairs → (4) Progressive synthesis into ONE report at status `IN PROGRESS` — merge + dedup each face AS it returns, never held in memory, then run the §20.2 coverage sweep + §20.3 self-audit over the merged set → (5) Fix-report-per-review `$why-review` gate (one merged pass walking each of the three faces + the dedup, status `VALIDATING`) → (6) Finalize — lock the combined verdict + flip status to `FINISHED` → report in review-only/caller-owned mode, or repair and freshly repeat in standalone fix-loop. The report lifecycle is `IN PROGRESS → VALIDATING → FINISHED` on ONE file, never re-created.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries; each is a signpost — the canonical body above governs, NEVER skip one):**

- **Graph-Assisted Investigation (optional):** the code graph is a stale-able hint for high-risk blast radius, never required.
- **Sub-Agent Return Contract:** The three children return only the summary; full reports on disk.
- **Nested Task Creation:** Pre-expand each child's phase list and link the workflow row before spawning.
- **Task Tracking & External Report:** Bootstrap tasks; persist the consolidated report to `tmp/reports/`.
- **Evidence-Based Reasoning:** Cite `file:line` for every claim; confidence >80% to act.
- **Double Round-Trip Review:** Validate → fix downstream only for current-round blocking findings → full re-review; Round 1 requires zero open findings, while Round 2 requires zero CRITICAL/HIGH/MEDIUM with LOW deferred and binary gates still blocking.
- **Fresh Context Review:** Spawn fresh zero-memory sub-agents; never reuse across rounds.
- **Review Protocol Injection:** Embed all protocol bodies verbatim in sub-agent prompts.
- **Systematic Batching:** each child owns bounded working sets and complete coverage within its assigned scope; follow its report-only fan-out limits.
- **Severity Rubric:** Classify Critical/High/Medium/Low by consequence; map sub-scores onto it.
- **Category Review Thinking:** each child derives its concerns from first principles, not a checklist.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**IMPORTANT MUST ATTENTION** plan coverage of all three owning review lenses; choose inline or authorized specialists from risk, relationships and available context. Preserve every applicable domain gate.
**IMPORTANT MUST ATTENTION** dispatch independent delegated work together and wait for all returns before repairs; keep each lens accounted for in the coverage ledger.
**IMPORTANT MUST ATTENTION** dedup the intentional overlaps — one underlying issue = ONE finding citing every reporting child, ONE severity per `SYNC:severity-rubric`, never summed across duplicate reports; preserve every route-to-sibling pointer
**IMPORTANT MUST ATTENTION** `architecture --mode=scalability` ALWAYS grades the PROJECT even under diff scope — read its `/20` scorecard as project posture, not a diff verdict.
**IMPORTANT MUST ATTENTION** Step 5 validates before repairs. Review-only/caller-owned passes hand off; standalone fix-loop repairs within authority and freshly repeats every lens under one shared budget, default cap three.
**IMPORTANT MUST ATTENTION** two orchestrator-only duties in Step 4 that NO child can perform: (a) sweep the merged report against the design-review script (`.claude/docs/architecture-knowledge.md` §20.2) and record every unanswered question as an INFO `Coverage gap` line, framing remaining risk against the five judgments (§20.4); (b) run the 11 thinking red flags (§20.3) across the merged findings and demote/remove any hit BEFORE `$why-review` sees it — why: three correctly-in-lane reviewers are all blind to a question belonging to no lane, and synthesis is exactly where three children's confirmation biases compound into one authoritative-sounding report. A coverage gap is INFO only and NEVER feeds the combined-verdict rollup.

The following are all MANDATORY:

- **MANDATORY** break work into small todo tasks via todo tracking BEFORE starting; mark one `in_progress`, complete it immediately after evidence.
- **MANDATORY** read required project-reference docs first (`project-structure-reference.md`, `backend-patterns-reference.md`, `code-review-rules.md`, always `lessons.md`) and cite `Reference docs read: ...` — why: project conventions override generic assumptions.
- **MANDATORY** every merged finding carries `file:line` proof + confidence (>80% to act, <80% verify first) — NEVER synthesize a finding from inference.
- **Optional advice:** the code graph (`.code-graph/graph.db`) can hint at a high-risk blast radius grep may miss; it may be stale — verify by reading. Never required.
- **MANDATORY** validate decisions with the user via `ask user question tool` for scope resolution and next-step routing — never auto-decide the scope.


**Anti-Rationalization:**

| Evasion | Required action |
| --- | --- |
| “The children agree, so validation can skip” | Validate each face and cross-face dedup in Step 5 unless the declared zero-open-finding skip applies. |
| “The missing child result implies PASS” | Keep missing TVC output UNVERIFIED and wait for all three faces before finalization. |
| “Fix it while merging” | Correct the report first. Review-only/caller-owned passes hand off; standalone fix-loop repairs validated findings after all review lenses finish, then freshly repeats the audit. |
