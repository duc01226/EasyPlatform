---
name: spec-clarify
version: 2.0.0
description: "[Code Quality] Use to validate a spec artifact's decisions with the user across three contexts — a freshly-authored Feature Spec (idea-to-spec), an existing canonical spec before PBI decomposition (spec-to-pbi), or a refined idea + §8 test-specs (idea-to-pbi deep mode). Detects the context, walks every applicable validation category, and runs an exhaustive but budget-bounded blocking clarification gate so every non-obvious or conflicting decision is confirmed before the artifact drives downstream work."
context-budget: medium
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Close the gap between a spec artifact that is internally well-formed and one that is COMPLETE-AND-CONFIRMED against the broader discovered system — so the artifact (a freshly-authored Feature Spec, an existing canonical spec headed for decomposition, or a refined idea + §8 test-specs) is finalized only after every related/affected behavior is reflected, every needed and pre-existing invariant is captured, every encoded assumption is classified, and every NON-OBVIOUS or CONFLICTING decision has been confirmed by the user through an exhaustive-but-budget-bounded blocking clarification gate.

**Summary:**

- **Context-aware (Phase 0):** detects which artifact it is validating — `AUTHORED-SPEC` (idea-to-spec: a freshly-authored, `provisional: true` §1-8), `EXISTING-SPEC` (spec-to-pbi: a non-provisional canonical §1-8 headed for decomposition), or `TEST-SPEC` (idea-to-pbi deep mode: a refined idea + §8 TCs, no §1-7 draft) — and tunes which sections/categories it audits. The detection precedence + ambiguous→`AskUserQuestion` fallback are in Phase 0; the category catalog + per-context audit matrix live in `references/clarify-interview.md`.
- Runs in the validation slot of its flow — AFTER the artifact exists (and, for AUTHORED, after `/review-artifact` checks the spec in isolation against the M1-M6 mandates and `/why-review` checks rationale). This skill adds the two things neither does: completeness-vs-the-discovered-system, and a BLOCKING user-confirmation loop on every non-obvious decision.
- It is NOT a duplicate of `review-artifact`: that one judges the artifact against itself (sections present, ACs testable, M1-M6 prose clean). `spec-clarify` judges it against the SYSTEM (does it reflect every related spec, every existing invariant, every operation the idea implies) and against the USER (are the encoded assumptions actually what the user wants).
- **Exhaustive within a budget:** walk EVERY applicable validation category (per the matrix), classify every assumption/default/scope-boundary/ambiguity the artifact encodes as **OBVIOUS** (document and proceed), **NON-OBVIOUS** (must confirm with the user), or **CONFLICTS** (disagrees with a discovered spec or invariant → must reconcile), then route NON-OBVIOUS + CONFLICTS + high-impact items to the gate up to a configured `Spec Validation: questions=MIN-MAX` budget (per-context defaults when absent). NEVER silently pick a NON-OBVIOUS decision — the whole value is the active question; the budget (not "ask only a few") is the fatigue control.
- Runs INLINE on the main agent (NOT a sub-agent): the Step 4 clarification gate is a BLOCKING `AskUserQuestion` loop, and `AskUserQuestion` only works on the main interactive agent — a sub-agent cannot ask the user. Before applying confirmed decisions, validate this skill's OWN findings through the terminal `/why-review --validate-findings` gate, at parity with the other review-family skills.

**Workflow:**

0. **Phase 0 — Spec-Context Detection** — detect `AUTHORED-SPEC` / `EXISTING-SPEC` / `TEST-SPEC` and resolve the question budget; ambiguous context → 1 `AskUserQuestion` to confirm
1. **Completeness pass** — cross-reference the artifact against the discovered system landscape (per-context emphasis); find missing stories/AC/rules/TCs and uncovered invariants
2. **Hypothesis & decision audit (category-driven)** — walk every applicable category in `references/clarify-interview.md`; enumerate and classify every encoded assumption as OBVIOUS / NON-OBVIOUS / CONFLICTS
3. **Brainstorm open questions** — questions whose answers would change the artifact + a pre-mortem
4. **Clarification gate** — BLOCKING `AskUserQuestion` on NON-OBVIOUS + CONFLICTS + high-impact items, exhaustive within the MIN-MAX budget (≤4/call, recommended-first)
5. **Apply** — write confirmed decisions back into the artifact + a Decisions Log
6. **Report + verdict** — CLARIFIED or NEEDS-AUTHORING-FIX, after validating own findings

**Key Rules:**

- Detect the validation context FIRST (Phase 0); it tunes which sections/categories are audited and the question budget. Ambiguous → confirm with one `AskUserQuestion`.
- Completeness is judged against the SYSTEM, not the artifact alone — every related/affected behavior must be reflected.
- Walk EVERY applicable category (breadth is mandatory); route NON-OBVIOUS + CONFLICTS + high-impact items to the gate up to the configured/default budget. The budget — not "surface only a few" — is the fatigue control.
- NON-OBVIOUS and CONFLICTS decisions MUST go to the user; only OBVIOUS decisions are documented-and-proceeded.
- Runs INLINE (no `execution-mode: subagent`) because the clarification gate needs `AskUserQuestion`, which requires the main interactive agent.
- This complements — never duplicates — `review-artifact` (isolation / M1-M6) and `why-review` (rationale).

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Why This Skill Exists

A Feature Spec can be internally perfect — all 8 sections present, every AC testable, every prose line tech-agnostic — and still be WRONG, because:

1. It silently omits a related behavior the discovered system already owns (a spec that doesn't reflect an adjacent capability's invariant ships a contradiction).
2. It encodes a default, scope boundary, or ambiguous behavior that the AUTHOR picked but the USER never confirmed (the most expensive specs fail not on what they said, but on what they assumed without asking).
3. It leaves open questions whose answers would materially change §1-8 — and nobody surfaced them before code started.

`review-artifact --type=spec-tests` and `--type=design` check the spec **in isolation** against the M1-M6 mandates and an adversarial section-quality checklist. `why-review` checks the **rationale** of decisions already made. Neither one (a) cross-references the spec against the broader discovered system, nor (b) actively ASKS THE USER to confirm the non-obvious choices. `spec-clarify` is the gate that does both — completeness-vs-system plus a blocking human-confirmation loop — so the spec is finalized confirmed, not merely well-formed.

**Delineation from sibling skills (so reviewers see NO duplication):**

| Skill                                                 | Judges the spec against…                                                          | Output                                 | Asks the user?                                        |
| ----------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------- |
| `review-artifact --type=spec-tests` / `--type=design` | ITSELF — M1-M6 mandates, AC testability, adversarial section quality              | PASS / WARN / FAIL                     | No (AI self-review)                                   |
| `why-review`                                          | the RATIONALE of its decisions                                                    | PASS / NEEDS-WORK + validated findings | Only to escalate (`AskUserQuestion`)                  |
| `spec-clarify` (this skill)                           | the SYSTEM + the USER — completeness vs discovered landscape, confirmed decisions | CLARIFIED / NEEDS-AUTHORING-FIX        | **YES — blocking gate on every non-obvious decision** |

**Why not just extend `review-artifact`?** Self-review cannot ask the user, and adding a blocking interactive gate to a skill designed to run as a fresh sub-agent breaks the sub-agent contract (a sub-agent cannot run `AskUserQuestion`). The completeness-vs-system pass and the human-confirmation loop need a distinct, inline invocation point.

## Alternatives Considered

| Approach                                                                    | Pros                                                 | Cons                                                                                                                                                                 | Decision                                                                                                                                                          |
| --------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add a "completeness + confirm" phase to `review-artifact --type=spec-tests` | No new skill; one place to maintain                  | `review-artifact` runs fresh sub-agents for re-review; a sub-agent cannot run `AskUserQuestion`, so the confirm loop is impossible there                             | Rejected — the blocking user gate is structurally incompatible with the sub-agent re-review model                                                                 |
| Fold the open-questions brainstorm into `why-review`                        | `why-review` already does adversarial rationale work | `why-review` validates decisions already MADE; it does not surface decisions the author never realized they made, nor confirm them with the user                     | Rejected — different purpose (rationale of made decisions vs surfacing+confirming unmade ones)                                                                    |
| Fully autonomous — AI resolves every ambiguity by best-guess, no user gate  | Fastest; no human round-trip                         | Automation bias: a silently-picked NON-OBVIOUS default ships a spec the user never agreed to; the failure surfaces only in code                                      | Rejected — the cost of a wrong silent default exceeds one confirmation round                                                                                      |
| Run BEFORE authoring instead of after                                       | Catches gaps earlier                                 | Before authoring there is no concrete artifact to audit for hypotheses/conflicts; the assumptions are not yet encoded                                                | Rejected — this gate operates on a CONCRETE artifact; earlier discovery is `scout`/`spec-discovery`'s job                                                         |
| A separate `spec-validate` skill (mirroring `plan-validate`) per flow       | Clean single-purpose per context                     | +1 skill per context = SYNC-carrier + mirror + catalog drift; duplicates this skill's completeness-vs-system engine three times                                      | Rejected — the three contexts share ONE core (audit a concrete artifact vs system + user); a Phase-0 branch over one skill is the lower future-change-cost choice |
| Keep the single AUTHORED context + minimal gate                             | Smallest skill                                       | Fails the two PBI flows (spec-to-pbi has NO spec-decision gate; idea-to-pbi has only plan/PBI gates) and the "ask a lot of questions / all important aspects" intent | Rejected — leaves the exact gaps this upgrade exists to close                                                                                                     |

## Risk Assessment

| Risk                                                                                                               | Likelihood | Impact | Mitigation                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------ | ---------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Silent decision** — AI classifies a NON-OBVIOUS choice as OBVIOUS to avoid asking                                | High       | High   | Step 2 forces an explicit OBVIOUS/NON-OBVIOUS/CONFLICTS label per item; the Anti-Rationalization table rebuts "it's obvious"; ambiguity defaults to NON-OBVIOUS                                                                                                                                                                                                                                    |
| **Overlap creep** — drifts into re-checking M1-M6 / AC testability and duplicates `review-artifact`                | Medium     | Medium | Scope is fixed to completeness-vs-system + confirmation; `[HARD]`→§8 coverage is a CROSS-CHECK only — the detailed TC quality audit is deferred to `review-artifact --type=spec-tests`                                                                                                                                                                                                             |
| **Question fatigue** — the widened, category-driven audit asks too many questions                                  | Medium     | Medium | The configured `Spec Validation: questions=MIN-MAX` budget (per-context default when absent) is the hard cap; ask ≥MIN only when ≥MIN genuine decisions exist, never invent filler; ≤4 options per `AskUserQuestion` call; recommended option first. Only NON-OBVIOUS + CONFLICTS + high-impact items become questions — breadth of _probing_ is exhaustive, breadth of _asking_ is budget-bounded |
| **Context mis-detection** — Phase 0 picks the wrong context and audits the wrong sections                          | Medium     | High   | Explicit detection-precedence table (provisional flag + §-presence + active workflow); ambiguous → 1 `AskUserQuestion` to confirm before auditing                                                                                                                                                                                                                                                  |
| **Unvalidated findings applied** — AI rewrites §1-8 from a phantom completeness gap                                | Medium     | High   | Step 6 runs `/why-review --validate-findings` on this skill's own findings BEFORE applying any decision                                                                                                                                                                                                                                                                                            |
| **Stale landscape** — the discovered-system report is outdated, so completeness is judged against a wrong baseline | Low        | Medium | Step 0 verifies the discovery inputs exist and are current; a missing/stale landscape is itself a NEEDS-AUTHORING-FIX finding                                                                                                                                                                                                                                                                      |

## Phase 0: Spec-Context Detection (run FIRST)

Before resolving inputs, detect WHICH artifact is being validated — the context tunes which sections/categories are audited and the question budget. The full per-context audit matrix + category catalog live in [`references/clarify-interview.md`](./references/clarify-interview.md).

| Context         | Signals                                                                   | Artifact under validation   | Audit emphasis                                                                                               |
| --------------- | ------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `AUTHORED-SPEC` | active `idea-to-spec`; full §1-8 present; `provisional: true` frontmatter | the freshly-authored §1-8   | full §1-8                                                                                                    |
| `EXISTING-SPEC` | active `spec-to-pbi`; full §1-8 present; NOT provisional                  | the existing canonical §1-8 | full §1-8, weighted to decomposition-driving decisions (§3 US/AC, §4 BR, §5 ERD, §6 flows, §7 perms, §8 TCs) |
| `TEST-SPEC`     | active `idea-to-pbi` deep mode; refined idea + §8 TCs, no §1-7 draft      | refined idea + §8 TCs       | refined-idea coverage + §8 TC decisions + implied rules                                                      |

**Detection precedence:** full §1-8 + `provisional: true` → `AUTHORED-SPEC`; full §1-8 + NOT provisional → `EXISTING-SPEC`; only §8 / refined-idea (no §1-7 draft) → `TEST-SPEC`. **Ambiguous → 1 `AskUserQuestion`** to confirm the context before auditing.

**Question budget:** read the injected `Spec Validation: questions=MIN-MAX` line (workflow `injectContext` supplies it per flow). When absent (standalone run), fall back to the per-context defaults in `references/clarify-interview.md` — `AUTHORED-SPEC` 5-10, `EXISTING-SPEC` 4-8, `TEST-SPEC` 3-6. The budget bounds the Step 4 gate: ask ≥MIN when ≥MIN genuine decisions exist, never exceed MAX.

State `Context: {AUTHORED-SPEC | EXISTING-SPEC | TEST-SPEC} | Budget: {MIN-MAX} (injected | default)` before Step 0.

## Inputs (Step 0)

Resolve and confirm these inputs exist BEFORE the completeness pass. A missing input is a finding, not a reason to guess.

1. **The artifact under validation** — resolved per the detected context: `AUTHORED-SPEC` / `EXISTING-SPEC` → the full §1-8 Feature Spec (§1 Overview, §2 Glossary, §3 User Stories & Acceptance Criteria, §4 Business Rules with `[HARD]`/`[SOFT]` markers, §5 Domain Model, §6 Process Flows, §7 Permissions & Roles, §8 Test Specifications `TC-{FEATURE}-{NNN}`); `TEST-SPEC` → the refined idea + the §8 TC set (no §1-7 draft yet). Read `docs/project-reference/feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md` first.
2. **The `spec-discovery` landscape report** — `plans/{plan-dir}/research/spec-discovery-{slug}.md` (Related Specs, Related Code, Affected Specs, Gaps, Invariant Landscape, Open Questions), the investigation of related/overlapping/affected specs + code. This is the baseline against which completeness is judged. For `TEST-SPEC` the landscape also comes from `spec-discovery` (present in the `idea-to-pbi` deep-mode sequence). If it is absent (skill run standalone), fall back to `scout` + `investigate` plus the derived `/spec-index` artifacts (index / ERD / reimplementation guide) under `docs/specs/`, and flag the absence as a finding.
3. **The originating idea / brainstorm** — the requirement that the artifact is meant to satisfy; its implied operations and edge cases drive the missing-coverage check.
4. **The domain-analysis output** — bounded contexts, aggregates, entities, domain events, and the invariants the artifact must respect.

State `Inputs resolved: ... | Missing (flag as finding): ...` before Step 1.

## Workflow

Run **Phase 0 (Spec-Context Detection)** above first — it sets the context + budget that the steps below consume.

0. **Inputs** — resolve the four inputs above (artifact resolved per the detected context); flag any missing one as a finding.
1. **Completeness pass (vs system)** — judge the artifact against the discovered landscape, NOT against itself, weighting the sections the context emphasizes (see the per-context matrix in `references/clarify-interview.md`):
    - **Cross-reference completeness** — every related/affected spec from the landscape is reflected (a behavior the system already owns and this feature touches must appear, or its absence must be deliberate and noted). For `TEST-SPEC`, judge the refined idea + §8 set against the landscape.
    - **Implied coverage** — missing user stories / acceptance criteria / business rules the originating idea implies but the artifact omits.
    - **Test-coverage completeness** — missing §8 TCs versus the implied operations + their edge cases (presence/scope only).
    - **Invariant coverage** — every NEEDED invariant (this feature must establish) AND every EXISTING invariant the artifact must respect (from domain-analysis / adjacent specs) is captured; each `[HARD]` §4 rule has at least one §8 property/invariant TC. This is a CROSS-CHECK that the property TC exists — defer the detailed TC-quality audit (universally-quantified property, boundary counter-case, etc.) to `review-artifact --type=spec-tests`.
2. **Hypothesis & decision audit (category-driven)** — walk EVERY applicable category for the detected context (the 9-category catalog + per-context matrix in [`references/clarify-interview.md`](./references/clarify-interview.md)); for each, run its audit prompts to surface every assumption, default value, scope boundary, and ambiguous behavior the artifact encodes. Classify each:
    - **OBVIOUS** — a single reasonable reading any competent reader shares → document it in the Decisions Log and proceed.
    - **NON-OBVIOUS** — more than one defensible reading, or a default the user has not confirmed → candidate for the Step 4 gate.
    - **CONFLICTS** — disagrees with a discovered landscape spec or an existing invariant → MUST be reconciled (and surfaced to the user). Default to NON-OBVIOUS when the classification itself is unclear.
      Probing breadth is exhaustive (every applicable category); asking breadth is the budget.
3. **Brainstorm open questions** — questions whose answers would MATERIALLY change the artifact (scope, a default, an invariant boundary, an actor/permission). Run an adversarial **pre-mortem**: "this artifact ships and the feature fails in production within 3 months — what spec gap caused it?" Each pre-mortem failure that maps to a real gap becomes either a NON-OBVIOUS question or a completeness finding.
4. **Clarification gate (BLOCKING `AskUserQuestion`)** — present the NON-OBVIOUS + CONFLICTS + high-impact items to the user as structured options, **exhaustive within the MIN-MAX budget** from Phase 0: ask ≥MIN questions when ≥MIN genuine decisions exist, never exceed MAX, ≤4 options per call, the recommended option FIRST, issue multiple `AskUserQuestion` calls when there are more than 4 decisions. When fewer than MIN genuine decisions exist, ask only the genuine ones and record "below-MIN: only N real decisions" — NEVER invent filler. Capture each answer. **NEVER silently pick a NON-OBVIOUS decision** — the active question is the entire point of this gate.
5. **Apply** — write the confirmed decisions back into the relevant artifact sections AND record them in an **"Open Questions / Decisions Log"** (resolved decisions with the user's choice + rationale, plus residual items still below 80% confidence). For `AUTHORED-SPEC`/`EXISTING-SPEC`, when the confirmed answers reveal material gaps, loop the spec author via `/spec [mode=update]` to re-author the affected sections, then re-run Step 1 against the updated spec. For `EXISTING-SPEC` this skill does NOT itself re-author — confirmed changes route through `/spec [mode=update]`; for `TEST-SPEC` the decisions feed PBI decomposition + any `/spec [mode=tests]` refinement.
6. **Report + verdict** — before applying decisions, run `/why-review --validate-findings <report-path>` on THIS skill's own findings (validate-before-fix discipline, at parity with `review-artifact` / `plan-review`); fix/drop any finding the gate flags, then apply only validated decisions. Write the report to `plans/reports/spec-clarify-{date}.md` and emit a verdict:
    - **CLARIFIED** — every NON-OBVIOUS/CONFLICTS decision confirmed by the user, completeness gaps resolved or accepted, no residual blocking question.
    - **NEEDS-AUTHORING-FIX** — material completeness gap or unreconciled conflict requires re-authoring via `/spec [mode=update]` before the spec can be finalized.

## Output

```markdown
## Spec Clarification Report

**Spec:** {spec path}
**Date:** {date}
**Verdict:** CLARIFIED | NEEDS-AUTHORING-FIX
**Confidence:** {X%} — {what was verified vs. what remains residual}

### Completeness (vs discovered system)

| Area                                   | Status | Gap / Evidence (`file:line` or spec/section ref)                              |
| -------------------------------------- | ------ | ----------------------------------------------------------------------------- |
| Related/affected specs reflected       | ✅/❌  | {which related behavior is/ isn't reflected}                                  |
| Implied stories / AC / rules           | ✅/❌  | {missing item the idea implies}                                               |
| §8 TC coverage vs operations           | ✅/❌  | {operation/edge case with no TC}                                              |
| Invariant coverage (needed + existing) | ✅/❌  | {`[HARD]` rule without a §8 property TC, or existing invariant not respected} |

### Hypothesis & Decision Audit

| #   | Encoded assumption / default / boundary | Class (OBVIOUS / NON-OBVIOUS / CONFLICTS) | Evidence |
| --- | --------------------------------------- | ----------------------------------------- | -------- |
| 1   | {assumption}                            | {class}                                   | {ref}    |

### Open Questions (pre-mortem + materially-changing)

1. {question — what changes in §1-8 depending on the answer}

### Decisions Log

| Decision               | User's confirmed choice      | Applied to | Residual confidence     |
| ---------------------- | ---------------------------- | ---------- | ----------------------- |
| {non-obvious decision} | {answer via AskUserQuestion} | §{n}       | {>=80% / <80% residual} |

### Verdict

{CLARIFIED | NEEDS-AUTHORING-FIX} — {evidence-based justification; if NEEDS-AUTHORING-FIX, the exact `/spec [mode=update]` scope}
```

## Key Rules

- **Detect the context FIRST (Phase 0)** — `AUTHORED-SPEC` / `EXISTING-SPEC` / `TEST-SPEC` tunes which sections/categories are audited and the question budget; ambiguous → 1 `AskUserQuestion` to confirm before auditing.
- **Walk every applicable category, ask within the budget** — probing breadth is exhaustive (the 9-category catalog × the per-context matrix in `references/clarify-interview.md`); the `Spec Validation: questions=MIN-MAX` budget (per-context default when absent) caps how many reach the gate. Never invent filler to hit MIN; never exceed MAX.
- **Completeness is judged against the SYSTEM** — every related/affected behavior from the discovered landscape must be reflected, or its absence deliberately noted. The artifact passing in isolation is NOT enough.
- **NON-OBVIOUS and CONFLICTS go to the user** — only OBVIOUS decisions are documented-and-proceeded; ambiguity in the classification itself defaults to NON-OBVIOUS.
- **NEVER silently pick a non-obvious decision** — the blocking `AskUserQuestion` gate is the entire value of this skill.
- **Runs INLINE, not as a sub-agent** — the clarification gate needs `AskUserQuestion`, which only the main interactive agent can run; do NOT add `execution-mode: subagent`.
- **Complements, never duplicates** — `review-artifact` owns isolation/M1-M6, `why-review` owns rationale; cross-check the `[HARD]`→§8 mapping only and defer the detailed TC-quality audit to `review-artifact --type=spec-tests`.
- **Validate before applying** — run `/why-review --validate-findings` on this skill's own findings before rewriting any §1-8 section.
- **Evidence-based** — every completeness gap, classification, and conflict cites `file:line` / a spec section / an invariant ref with a confidence percentage.

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including a final review task to verify completeness and that every non-obvious decision was confirmed.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim requires `file:line` proof or traced evidence with confidence percentage (>80% to act).

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

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `plans/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** After task-tracking bootstrap and before target/source work, read required project-reference docs and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project conventions override generic defaults.
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing or stale, auto-run `/project-init` or the narrow lower-level route before ordinary project-specific work.

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

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify findings Critical/High/Medium/Low by consequence; Critical/High block PASS until fixed or owner-accepted.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Finalize a spec artifact (authored spec / existing spec / refined-idea+§8 test-specs — detected in Phase 0) only after it is COMPLETE against the discovered system AND every NON-OBVIOUS / CONFLICTING decision across every applicable validation category has been confirmed by the user through the exhaustive-but-budget-bounded blocking clarification gate — completeness-vs-system plus human confirmation, the two things `review-artifact` (isolation/M1-M6) and `why-review` (rationale) do not do.

**Protocols in force — MUST ATTENTION honor every block below (concise digest of the SYNC/shared blocks this skill carries):**

- **Nested Task Creation:** Parent workflow rows never replace child phase tracking.
- **Project Reference Docs Guide:** Read required project docs (always `lessons.md`) before target work.
- **Task Tracking External Report:** Bootstrap tasks; persist clarification findings to `plans/reports/`.
- **Critical Thinking Mindset:** Traced `file:line` proof; confidence >80% to act.
- **Evidence Based Reasoning:** No claim without cited evidence; state confidence.
- **Understand Code First:** Read code, grep 3+ patterns before any change.
- **Double Round Trip Review:** Validate findings, fix, restart full review until clean.
- **Fresh Context Review:** Spawn fresh zero-memory sub-agent after each fix cycle (re-review only — this skill itself runs inline).
- **Review Protocol Injection:** Embed all 11 protocol bodies verbatim in any fresh sub-agent prompt.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Severity Rubric:** Classify findings Critical/High/Medium/Low by consequence.

**IMPORTANT MUST ATTENTION** judge completeness against the SYSTEM, not the spec alone — every related/affected behavior from the discovered landscape must be reflected, or its absence deliberately noted; this is the distinct value vs `review-artifact`'s isolation check — why: a spec that passes in isolation can still silently contradict an adjacent capability's invariant.
**IMPORTANT MUST ATTENTION** classify every encoded assumption/default/scope-boundary/ambiguity as OBVIOUS / NON-OBVIOUS / CONFLICTS — NON-OBVIOUS and CONFLICTS MUST go to the user gate; only OBVIOUS is documented-and-proceeded; ambiguity in the class itself defaults to NON-OBVIOUS — why: a silently-picked default ships a spec the user never agreed to.
**IMPORTANT MUST ATTENTION** detect the context FIRST (Phase 0: `AUTHORED-SPEC` / `EXISTING-SPEC` / `TEST-SPEC` by provisional-flag + §-presence + active workflow; ambiguous → 1 `AskUserQuestion`) — it tunes which sections/categories are audited and the question budget — why: the wrong context audits the wrong sections and asks the wrong questions.
**IMPORTANT MUST ATTENTION** probe EVERY applicable category (the 9-category catalog × per-context matrix in `references/clarify-interview.md`) but ask only within the `Spec Validation: questions=MIN-MAX` budget (per-context default when absent) — ask ≥MIN only when ≥MIN genuine decisions exist, never invent filler, never exceed MAX — why: breadth of probing catches every gap; the budget is the fatigue control, not "ask only a few".
**IMPORTANT MUST ATTENTION** the Step 4 clarification gate is a BLOCKING `AskUserQuestion` loop — present NON-OBVIOUS + CONFLICTS + high-impact items as ≤4 structured options (recommended first), issue multiple calls as needed, NEVER silently pick a non-obvious decision — why: the active question is the entire value of this skill.
**IMPORTANT MUST ATTENTION** this skill runs INLINE on the main agent (no `execution-mode: subagent`) — the gate needs `AskUserQuestion`, which only the main interactive agent can run; a sub-agent cannot ask the user — why: a blocking confirmation loop is structurally impossible in an isolated sub-agent.
**IMPORTANT MUST ATTENTION** before applying any decision, validate this skill's OWN findings via the terminal `/why-review --validate-findings <report-path>` gate, then apply only validated decisions and re-run Step 1 if `/spec [mode=update]` re-authored sections — why: rewriting §1-8 from a phantom completeness gap is worse than the gap.
**IMPORTANT MUST ATTENTION** complement, never duplicate — `[HARD]`→§8 property-TC mapping is a CROSS-CHECK that the TC exists; defer the detailed TC-quality audit (universal quantification, boundary counter-case) to `review-artifact --type=spec-tests` — why: re-running that audit here drifts the skill into overlap and wastes the budget.
**IMPORTANT MUST ATTENTION** cite `file:line` / spec-section / invariant evidence for every completeness gap, classification, and conflict with a confidence percentage (>80% to act, <60% DO NOT recommend); "Insufficient evidence" is valid output — why: speculation produces non-fixable findings and false conflicts.
**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting; keep one `in_progress`; add a final review task to verify every non-obvious decision was confirmed — why: untracked multi-step work loses state on compaction.

**Anti-Rationalization:**

| Evasion                                                    | Rebuttal                                                                                                                                                                                                             |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "`review-artifact` already passed, skip this"              | That was isolation / M1-M6 / AC testability. It never checked completeness-vs-system or confirmed decisions with the user. Different gate.                                                                           |
| "It's a spec, so audit the full §1-8"                      | Detect the context FIRST. `TEST-SPEC` has no §1-7 to audit; `EXISTING-SPEC` weights decomposition-driving decisions. Auditing the wrong sections wastes the budget.                                                  |
| "Only ask a couple of the most important questions"        | Probing is exhaustive across every applicable category; _asking_ is bounded by the `questions=MIN-MAX` budget. Surfacing only a few SKIPS categories — that is the gap this upgrade closed. Walk all, ask up to MAX. |
| "Fewer than MIN real decisions, so invent some to hit MIN" | NEVER invent filler. Ask only the genuine decisions and record "below-MIN: only N real decisions". MIN is a floor for _real_ questions, not a quota.                                                                 |
| "The decision is obvious, I'll just document it"           | If it is truly OBVIOUS (one reading any reader shares), document it. NON-OBVIOUS / CONFLICTS MUST go to the user gate — when unsure, it is NON-OBVIOUS.                                                              |
| "No open questions, the spec is complete"                  | Run the pre-mortem FIRST ("ships, fails in 3 months — what spec gap caused it?") before claiming none.                                                                                                               |
| "I'll run AskUserQuestion as a sub-agent to save context"  | A sub-agent cannot run `AskUserQuestion`. This skill runs INLINE — the gate only works on the main agent.                                                                                                            |
| "The conflict is minor, I'll reconcile it silently"        | A CONFLICT with a discovered spec/invariant changes behavior — surface it AND confirm the resolution with the user.                                                                                                  |
| "Findings are clearly right, apply them now"               | Validate via `/why-review --validate-findings` BEFORE rewriting any §1-8 section — a phantom gap rewrites the spec wrongly.                                                                                          |

**IMPORTANT MUST ATTENTION** judge completeness against the SYSTEM + confirm every NON-OBVIOUS / CONFLICTS decision with the user — the distinct value vs isolation review.
**IMPORTANT MUST ATTENTION** the clarification gate is a BLOCKING `AskUserQuestion` loop; runs INLINE on the main agent — NEVER silently pick a non-obvious decision.
**IMPORTANT MUST ATTENTION** validate own findings via `/why-review --validate-findings` before applying; cite `file:line`/section evidence with confidence for every claim.
