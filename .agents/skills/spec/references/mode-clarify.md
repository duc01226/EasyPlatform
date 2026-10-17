# `$spec [mode=clarify]` — spec clarification gate reference

> Loaded by `spec/SKILL.md`'s Mode Dispatch when invoked as `$spec [mode=clarify]`. This contract REPLACES the spec authoring body for the invocation: it audits a finished artifact against the discovered system, walks the clarification interview catalog (`clarify-interview.md`, beside this file), and blocks on every unresolved non-obvious decision via `ask user question tool`. It runs INLINE on the main agent; the profile gate below is its own and replaces the authoring profile resolution.

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval. Inside a workflow run, `$start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

## Quick Summary

**Goal:** Finalize the selected canonical artifact or separately governed case artifact only after reflecting every related behavior/invariant from the discovered system and user-confirming every encoded NON-OBVIOUS or CONFLICTING decision through an exhaustive, budget-bounded blocking clarification gate.

**Summary:**

- **Context-aware (Phase 0):** resolves the project artifact profile first, then detects `AUTHORED-SPEC`, `EXISTING-SPEC`, or `TEST-SPEC` from that profile's canonical roles, provisional markers, and active workflow. `TEST-SPEC` exists only when the selected profile has a separate test-spec artifact; native cases inside a canonical owner remain in that owner's context. The detection precedence + ambiguity gate are in Phase 0; the category catalog + per-context audit matrix live in `references/clarify-interview.md`.
- **Main steps (read-this-if-nothing-else — run in order, never skip/merge):** Phase 0 resolve profile + context + budget → Step 0 resolve the 4 inputs (artifact, `spec [mode=discovery]` landscape, originating idea, domain-analysis), flag any missing as a finding (gap-review profile for a supplied spec: artifact + request + investigation only, then stop before planning on any vague, contradictory or missing requested behavior) → Step 1 completeness pass vs the discovered SYSTEM (cross-ref, implied coverage, profile-owned cases/invariants, UI interaction surface) → Step 2 category-driven hypothesis/decision audit — walk EVERY applicable category, classify each item OBVIOUS / NON-OBVIOUS / CONFLICTS → Step 3 brainstorm materially-changing open questions + adversarial pre-mortem → Step 4 BLOCKING user-confirmation gate on NON-OBVIOUS + CONFLICTS + high-impact within the MIN-MAX budget → Step 5 apply confirmed decisions to the artifact + Decisions Log → Step 6 validate own findings via `$why-review --validate-findings`, emit CLARIFIED / NEEDS-AUTHORING-FIX / BLOCKED.
- Runs in the validation slot of its flow — AFTER the artifact exists (and, for AUTHORED, after `$work-item --mode=review` checks it in isolation against the artifact-facing mandates (M1-M5 + M7) and `$why-review` checks rationale). This skill adds the two things neither does: completeness-vs-the-discovered-system, and a BLOCKING user-confirmation loop on every non-obvious decision.
- It is NOT a duplicate of `work-item --mode=review`: that one judges the artifact against itself (sections present, ACs testable, M1-M5 + M7 clean). `spec [mode=clarify]` judges it against the SYSTEM (does it reflect every related spec, every existing invariant, every operation the idea implies) and against the USER (are the encoded assumptions actually what the user wants).
- **Exhaustive within a budget:** walk EVERY applicable validation category (per the matrix), classify every assumption/default/scope-boundary/ambiguity the artifact encodes as **OBVIOUS** (document and proceed), **NON-OBVIOUS** (must confirm with the user), or **CONFLICTS** (disagrees with a discovered spec or invariant → must reconcile), then route NON-OBVIOUS + CONFLICTS + high-impact items to the gate up to a configured `Spec Validation: questions=MIN-MAX` budget (per-context defaults when absent). NEVER silently pick a NON-OBVIOUS decision — the whole value is the active question; the budget (not "ask only a few") is the fatigue control.
- Runs INLINE on the main agent (NOT a sub-agent): the Step 4 clarification gate is a BLOCKING `ask user question tool` loop, and `ask user question tool` only works on the main interactive agent — a sub-agent cannot ask the user. Before applying confirmed decisions, validate this skill's OWN findings through the terminal `$why-review --validate-findings` gate, at parity with the other review-family skills.

**Workflow:**

0. **Phase 0 — Profile and Spec-Context Detection** — resolve profile, then detect `AUTHORED-SPEC` / `EXISTING-SPEC` / separately declared `TEST-SPEC` and question budget; ambiguous context → blocking user confirmation or `BLOCKED` if unavailable
1. **Completeness pass** — cross-reference the artifact against the discovered system landscape (per-context emphasis); find missing outcomes, requirements, profile-owned cases, and uncovered invariants
2. **Hypothesis & decision audit (category-driven)** — walk every applicable category in `references/clarify-interview.md`; enumerate and classify every encoded assumption as OBVIOUS / NON-OBVIOUS / CONFLICTS
3. **Brainstorm open questions** — questions whose answers would change the artifact + a pre-mortem
4. **Clarification gate** — BLOCKING `ask user question tool` on NON-OBVIOUS + CONFLICTS + high-impact items, exhaustive within the MIN-MAX budget (≤4/call, recommended-first)
5. **Apply** — write confirmed decisions back into the artifact + a Decisions Log
6. **Report + verdict** — CLARIFIED or NEEDS-AUTHORING-FIX, after validating own findings

**Key Rules:**

- Resolve the artifact profile, then detect validation context FIRST (Phase 0); it tunes which declared roles/categories are audited and the question budget. Ambiguous → blocking confirmation or `BLOCKED` if unavailable.
- Completeness is judged against the SYSTEM, not the artifact alone — every related/affected behavior must be reflected.
- Walk EVERY applicable category (breadth is mandatory); route NON-OBVIOUS + CONFLICTS + high-impact items to the gate up to the configured/default budget. The budget — not "surface only a few" — is the fatigue control.
- NON-OBVIOUS and CONFLICTS decisions MUST go to the user; only OBVIOUS decisions are documented-and-proceeded.
- Runs INLINE (no `execution-mode: subagent`) because the clarification gate needs `ask user question tool`, which requires the main interactive agent.
- This complements — never duplicates — `work-item --mode=review` (isolation / M1-M5 + M7) and `why-review` (rationale).

## Contents

- [Quick Summary](#quick-summary)
- [Artifact and Case Profile Gate (BLOCKING)](#artifact-and-case-profile-gate-blocking)
- [Why This Skill Exists](#why-this-skill-exists)
- [Risk Assessment](#risk-assessment)
- [Phase 0: Profile and Spec-Context Detection (run FIRST)](#phase-0-profile-and-spec-context-detection-run-first)
- [Inputs (Step 0)](#inputs-step-0)
- [Workflow](#workflow)
- [Output](#output)
- [Key Rules](#key-rules)
- [Mode protocols](#mode-protocols)
- [Prompt-Enhance Closing Anchors](#prompt-enhance-closing-anchors)
- [Closing Reminders](#closing-reminders)

## Artifact and Case Profile Gate (BLOCKING)

Before context detection, read `docs/project-config.json`, `docs/project-reference/docs-index-reference.md`, `docs/project-reference/lessons.md`, the required local spec references, the active workflow, and the matched clarification references. Resolve exactly one:

- **Strict default:** neither config nor required project references explicitly declares a native artifact/case contract. Use the eight-section / Section 8 TC rules below.
- **Native profile:** config or a required project reference explicitly declares a different canonical owner, section/field roles, logical IDs, case carrier, or case-to-test relation. A missing optional profile field in config does not erase an explicit owner contract in a required reference. MUST ATTENTION use that profile's owner, roles, IDs, and evidence form without adding a TC or Section 8 copy.
- **Unresolved:** invalid/incomplete config, conflicting references, or an unresolved owner/section/carrier means `BLOCKED`/`UNKNOWN`; do not infer the strict default from a filename, heading, or missing optional config field.

A root/template/filename change alone does not select a native model. After profile selection, detect context from active workflow plus the profile's declared artifact roles and provisional markers. In strict default, retain the §1-8/provisional rules below. A native case embedded in a canonical owner is `EXISTING-SPEC` unless the profile explicitly declares a separate test-spec artifact; only a separately owned artifact may be `TEST-SPEC`.

The semantic duties do not change: completeness against the discovered system; evidence for every gap; property and boundary coverage for universal invariants; preservation of existing behavior; business visibility where applicable; and confirmation of every non-obvious/conflicting decision before applying it. Previous user acceptance may be reused only with cited evidence that the exact decision and scope match; it never authorizes new or adjacent decisions.

Step 4 remains blocking. When a non-obvious decision, profile ambiguity, or conflict needs the user and `ask user question tool` is unavailable, the environment is unattended, or no user answer can be obtained, MUST ATTENTION preserve the unresolved questions and return `BLOCKED`/`NEEDS-CLARIFICATION`; NEVER mutate the artifact, infer a choice, or emit `CLARIFIED`. This skill stays inline for interactive confirmation; no routing or prior approval waives the active decision gate.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Why This Skill Exists

A Feature Spec can be internally perfect — all 8 sections present, every AC testable, every prose line tech-agnostic — and still be WRONG, because:

1. It silently omits a related behavior the discovered system already owns (a spec that doesn't reflect an adjacent capability's invariant ships a contradiction).
2. It encodes a default, scope boundary, or ambiguous behavior that the AUTHOR picked but the USER never confirmed (the most expensive specs fail not on what they said, but on what they assumed without asking).
3. It leaves open questions whose answers would materially change §1-8 — and nobody surfaced them before code started.

`work-item --mode=review --type=spec-tests` and `--type=design` check the spec **in isolation** against the artifact-facing mandates (M1-M5 + M7 — M6 binds the reviewer, not the artifact) and an adversarial section-quality checklist. `why-review` checks the **rationale** of decisions already made. Neither one (a) cross-references the spec against the broader discovered system, nor (b) actively ASKS THE USER to confirm the non-obvious choices. `spec [mode=clarify]` is the gate that does both — completeness-vs-system plus a blocking human-confirmation loop — so the spec is finalized confirmed, not merely well-formed.

**Delineation from sibling skills (so reviewers see NO duplication):**

| Skill                            | Judges the spec against… | Output                                   | Asks the user?                  |
| -------------------------------- | ------------------------ | ---------------------------------------- | ------------------------------- |
| `work-item --mode=review --type=spec-tests` / `--type=design` | ITSELF — artifact-facing mandates (M1-M5 + M7), AC testability, adversarial section quality | PASS / WARN / FAIL | No (AI self-review)            |
| `why-review`                     | the RATIONALE of its decisions | PASS / NEEDS-WORK + validated findings   | Only to escalate (`ask user question tool`) |
| `spec [mode=clarify]` (this skill)      | the SYSTEM + the USER — completeness vs discovered landscape, confirmed decisions | CLARIFIED / NEEDS-AUTHORING-FIX | **YES — blocking gate on every non-obvious decision** |

**Why not just extend `work-item --mode=review`?** Self-review cannot ask the user, and adding a blocking interactive gate to a skill designed to run as a fresh sub-agent breaks the sub-agent contract (a sub-agent cannot run `ask user question tool`). The completeness-vs-system pass and the human-confirmation loop need a distinct, inline invocation point.

## Risk Assessment

| Risk                                                                                       | Likelihood | Impact | Mitigation                                                                                                       |
| ------------------------------------------------------------------------------------------ | ---------- | ------ | --------------------------------------------------------------------------------------------------------------- |
| **Silent decision** — AI classifies a NON-OBVIOUS choice as OBVIOUS to avoid asking        | High       | High   | Step 2 forces an explicit OBVIOUS/NON-OBVIOUS/CONFLICTS label per item; the Anti-Rationalization table rebuts "it's obvious"; ambiguity defaults to NON-OBVIOUS |
| **Overlap creep** — drifts into re-checking M1-M5 + M7 / AC testability and duplicates `work-item --mode=review` | Medium     | Medium | Scope is fixed to completeness-vs-system + confirmation; profile-owned invariant-to-case coverage is a CROSS-CHECK only — the detailed property/case quality audit is deferred to `work-item --mode=review --type=spec-tests` |
| **Question fatigue** — the widened, category-driven audit asks too many questions                  | Medium     | Medium | The configured `Spec Validation: questions=MIN-MAX` budget (per-context default when absent) is the hard cap of one pass, and a further pass needs the user's go-ahead; ask ≥MIN only when ≥MIN genuine decisions exist, never invent filler; ≤4 options per `ask user question tool` call; recommended option first. Only NON-OBVIOUS + CONFLICTS + high-impact items become questions — breadth of *probing* is exhaustive, breadth of *asking* is budget-bounded |
| **Context mis-detection** — Phase 0 picks the wrong context and audits the wrong sections          | Medium     | High   | Resolve profile-owned roles plus active workflow/provisional state; ambiguous → blocking user confirmation, or `BLOCKED` if no user/tool is available |
| **Unvalidated findings applied** — AI rewrites a canonical owner from a phantom completeness gap | Medium     | High   | Step 6 runs `$why-review --validate-findings` on this skill's own findings BEFORE applying any decision          |
| **Stale landscape** — the discovered-system report is outdated, so completeness is judged against a wrong baseline | Low        | Medium | Step 0 verifies the discovery inputs exist and are current; a missing/stale landscape is itself a NEEDS-AUTHORING-FIX finding (normal profile; the gap-review profile judges against the request and investigated code instead) |

## Phase 0: Profile and Spec-Context Detection (run FIRST)

Resolve the profile in the blocking gate above, then detect WHICH artifact is being validated — the context tunes which declared sections/categories are audited and the question budget. The full per-context audit matrix + category catalog live in [`references/clarify-interview.md`](./clarify-interview.md).

| Context | Signals | Artifact under validation | Audit emphasis |
| --- | --- | --- | --- |
| `AUTHORED-SPEC` | active authoring workflow; selected profile's provisional marker/state; canonical owner has its declared authored roles | the provisional canonical owner | all applicable declared roles |
| `EXISTING-SPEC` | active decomposition/review workflow; canonical owner is not provisional under its declared state | the existing canonical owner | all applicable roles, weighted to decomposition-driving decisions and cases |
| `TEST-SPEC` | active workflow and selected profile explicitly define a separate test-spec artifact; no provisional canonical draft is being validated | the separate test-spec artifact plus its required idea inputs | case decisions, implied rules, and the owning requirements |

**Strict-default detection:** full §1-8 + `provisional: true` → `AUTHORED-SPEC`; full §1-8 + NOT provisional → `EXISTING-SPEC`; only §8 / refined idea (no §1-7 draft) → `TEST-SPEC`. **Native detection:** use the profile's owner roles, provisional marker, separate-artifact declaration, and active workflow. A native case embedded in the owner does not become `TEST-SPEC` by itself. If workflow and artifact evidence disagree or context remains ambiguous, ask the user before auditing; if user confirmation is unavailable, return `BLOCKED`/`NEEDS-CLARIFICATION` and do not proceed.

**Gap-review profile (`EXISTING-SPEC`, supplied spec):** when the active workflow or caller supplies an existing spec as the governing contract for implementing a request (for example `workflow-implement-spec`), this mode runs as a gap review of that spec against the request. Every other run uses the normal profile unchanged.

- **Step 0** needs only the supplied spec, the request, and the run's investigation report when one exists. A `spec [mode=discovery]` landscape or a domain-analysis input is not required, and its absence is not a finding.
- **Steps 1-3** judge the supplied spec against the request and the code the investigation traced: requested behavior with more than one defensible reading is NON-OBVIOUS; behavior that contradicts the spec itself or an invariant the existing code enforces is CONFLICTS; requested behavior the spec does not contain is a completeness gap.
- **Stop before planning** (BR-GWF-04): when any such gap exists, Step 4 briefs the user and asks them to clarify the spec or switch to `workflow-feature`, which updates the spec first. The verdict stays `NEEDS-AUTHORING-FIX` or `NEEDS-CLARIFICATION` until the spec covers the request; never guess the missing behavior or drop it silently. Planning starts only after a `CLARIFIED` verdict.

**Question budget:** read the injected `Spec Validation: questions=MIN-MAX` line (workflow `injectContext` supplies it per flow). When absent (standalone run), fall back to the per-context defaults in `references/clarify-interview.md` — `AUTHORED-SPEC` 5-10, `EXISTING-SPEC` 4-8, `TEST-SPEC` 3-6. The budget bounds one pass of the Step 4 gate: ask ≥MIN when ≥MIN genuine decisions exist, never exceed MAX in a pass; a further pass needs the user's go-ahead.

State `Profile: {STRICT-DEFAULT | NATIVE | BLOCKED} | Context: {AUTHORED-SPEC | EXISTING-SPEC | EXISTING-SPEC (gap review) | TEST-SPEC} | Budget: {MIN-MAX} (injected | default)` before Step 0.

## Inputs (Step 0)

> **Decision log:** inside a workflow, read the run's `## Decisions` first (`$start-workflow` → Step Execution Protocol, Decision log): ask only what it leaves open or new evidence reopened, cite reused answers instead of asking again, and append every new answer.

Resolve and confirm these inputs exist BEFORE the completeness pass. A missing input is a finding, not a reason to guess. The gap-review profile (Phase 0) uses only input 1, the request as input 3, and the run's investigation report; inputs 2 and 4 are not required there.

1. **The artifact under validation** — `AUTHORED-SPEC` / `EXISTING-SPEC` → the selected canonical owner and its declared roles; `TEST-SPEC` → a separately declared test-spec artifact and its source owner/idea inputs. The strict default uses the full §1-8 Feature Spec and §8 `TC-{FEATURE}-{NNN}` set. Read the configured feature/spec-system/principles references first; config's root paths locate them but do not alone define the case model.
2. **The `spec [mode=discovery]` landscape report** — `{plan-dir}/research/spec-discovery-{slug}.md` under the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path) (Related Specs, Related Code, Affected Specs, Gaps, Invariant Landscape, Open Questions), the investigation of related/overlapping/affected specs + code. This is the baseline against which completeness is judged. For `TEST-SPEC` the landscape also comes from `spec [mode=discovery]` (present in the `idea-to-tasks` deep-mode sequence of `workflow-planned-work`). If it is absent (skill run standalone), fall back to `$investigate` plus the derived `$spec [mode=index]` artifacts (index / ERD / reimplementation guide) under the business spec root (default `docs/specs/`; `specRoots.business.path` in `docs/project-config.json` overrides), and flag the absence as a finding.
3. **The originating idea / brainstorm** — the requirement that the artifact is meant to satisfy; its implied operations and edge cases drive the missing-coverage check.
4. **The domain-analysis output** — bounded contexts, aggregates, entities, domain events, and the invariants the artifact must respect.

When an earlier clarify report for this artifact exists under `tmp/reports/` with a `NEEDS-CLARIFICATION` verdict, read it too: reuse the answers it records and ask only the items it left open. Its absence is not a finding.

State `Inputs resolved: ... | Missing (flag as finding): ...` before Step 1.

## Workflow

Run **Phase 0 (Spec-Context Detection)** above first — it sets the context + budget that the steps below consume.

0. **Inputs** — resolve the four inputs above (artifact resolved per the detected context); flag any missing one as a finding. The gap-review profile resolves only the inputs Phase 0 names for it.
1. **Completeness pass (vs system)** — judge the artifact against the discovered landscape, NOT against itself, weighting the sections the context emphasizes (see the per-context matrix in `references/clarify-interview.md`):
    - **Cross-reference completeness** — every related/affected spec from the landscape is reflected (a behavior the system already owns and this feature touches must appear, or its absence must be deliberate and noted). For `TEST-SPEC`, judge the separate artifact and its owner contract against the landscape.
    - **Implied coverage** — missing user stories / acceptance criteria / business rules the originating idea implies but the artifact omits.
    - **Case-coverage completeness** — missing canonical cases for implied operations and edge cases (presence/scope only). Strict default checks §8 TCs; native profile checks its declared case carrier without adding a parallel registry.
    - **Invariant coverage** — every NEEDED invariant (this feature must establish) AND every EXISTING invariant the artifact must respect (from domain-analysis / adjacent owners) is captured; each universal hard rule maps to the selected profile's property/invariant case. This is a CROSS-CHECK that the case exists — defer property quantification and boundary counter-case quality to `work-item --mode=review --type=spec-tests`.
    - **Interaction surface completeness (UI-bearing specs)** — judge the selected profile's declared interaction fields against the implied UI. Strict default uses §6.2 view inventory, §6.3 navigation, §6.4 observable states, §6.5 story flows, plus the §6 skip reason for backend-only features. Presence/scope only — visual fidelity stays in the companion design artifact.
2. **Hypothesis & decision audit (category-driven)** — walk EVERY applicable category for the detected context (the 9-category catalog + per-context matrix in [`references/clarify-interview.md`](./clarify-interview.md)); for each, run its audit prompts to surface every assumption, default value, scope boundary, and ambiguous behavior the artifact encodes. Classify each:
    - **OBVIOUS** — a single reasonable reading any competent reader shares → document it in the Decisions Log and proceed.
    - **NON-OBVIOUS** — more than one defensible reading, or a default the user has not confirmed → candidate for the Step 4 gate.
    - **CONFLICTS** — disagrees with a discovered landscape spec or an existing invariant → MUST be reconciled (and surfaced to the user). Default to NON-OBVIOUS when the classification itself is unclear.
    Probing breadth is exhaustive (every applicable category); asking breadth is the budget.
3. **Brainstorm open questions** — questions whose answers would MATERIALLY change the artifact (scope, a default, an invariant boundary, an actor/permission). Run an adversarial **pre-mortem**: "this artifact ships and the feature fails in production within 3 months — what spec gap caused it?" Each pre-mortem failure that maps to a real gap becomes either a NON-OBVIOUS question or a completeness finding.
    > **Interaction Surface category (UI-bearing specs):** use the selected profile's interaction roles; strict default checks §6.2–§6.5. Treat ambiguous view purpose, missing observable state, and unmapped user flow as gate candidates. Classify each OBVIOUS / NON-OBVIOUS / CONFLICTS like any other; route NON-OBVIOUS + CONFLICTS to the gate within budget. Ask about UX intent only — never framework/route/CSS/component-class detail (that belongs to the companion design artifact).

4. **Clarification gate (BLOCKING user-confirmation tool)** — apply the Decision Interview protocol: brief the user first on the artifact and what the audit found, then present the NON-OBVIOUS + CONFLICTS + high-impact items as decision cards, ordered by dependency and impact so the budget goes to the highest-impact decisions first, **exhaustive within the MIN-MAX budget** from Phase 0: ask ≥MIN questions when ≥MIN genuine decisions exist, never exceed MAX in one pass, ≤4 options per call, the recommended option FIRST, issue multiple calls when there are more than 4 decisions. When fewer than MIN genuine decisions exist, ask only the genuine ones and record "below-MIN: only N real decisions" — NEVER invent filler. When the budget is spent and NON-OBVIOUS or CONFLICTS items remain, tell the user how many remain and ask one question: continue with one more pass of up to MAX questions, or stop. Run a further pass only on that answer, and ask again after each pass. When the user stops, the remaining items stay unconfirmed: keep them in the report beside the answers already given, apply nothing, and return `NEEDS-CLARIFICATION` (a later run reads that report and asks only what is still open); never emit `CLARIFIED` while a NON-OBVIOUS or CONFLICTS item is unconfirmed. Capture each answer and play the answers back before Step 5. If the tool/user is unavailable, preserve the questions and stop `BLOCKED`/`NEEDS-CLARIFICATION`; do not apply, infer, or emit `CLARIFIED`.
5. **Apply** — write only the user's confirmed decisions to the selected canonical owner/fields and record them in an **"Open Questions / Decisions Log"** with rationale and residual confidence. For `AUTHORED-SPEC`/`EXISTING-SPEC`, material owner changes go through its declared authoring procedure, then Step 1 runs again. In the strict default, use `$spec [mode=update]`; for `TEST-SPEC`, apply only through its explicitly declared owner/workflow. This skill itself never re-authors an `EXISTING-SPEC`. Inside a workflow whose spec-tests review already ran on this artifact, an applied change to the reviewed content re-runs that review on the changed part (as `rerun N` of its occurrence) before the run continues.
6. **Report + verdict** — before applying decisions, run `$why-review --validate-findings <report-path>` on THIS skill's own findings (validate-before-fix discipline, at parity with `work-item --mode=review` / `plan --mode=review`); fix/drop any finding the gate flags, then apply only validated decisions. Write the report to `tmp/reports/spec-clarify-{date}.md` and emit a verdict:
    - **CLARIFIED** — every NON-OBVIOUS/CONFLICTS decision confirmed by the user, completeness gaps resolved or accepted, no residual blocking question.
    - **NEEDS-AUTHORING-FIX** — a material completeness gap or unreconciled conflict needs correction by the selected owner's declared authoring procedure before finalization; the strict default uses `$spec [mode=update]`.
    - **BLOCKED / NEEDS-CLARIFICATION** — a profile, owner, material decision, or required user answer remains unresolved. No mutation or `CLARIFIED` verdict is permitted.

## Output

```markdown
## Spec Clarification Report

**Spec:** {spec path}
**Date:** {date}
**Profile:** STRICT-DEFAULT | NATIVE | BLOCKED
**Context:** AUTHORED-SPEC | EXISTING-SPEC | TEST-SPEC
**Verdict:** CLARIFIED | NEEDS-AUTHORING-FIX | BLOCKED / NEEDS-CLARIFICATION
**Confidence:** {X%} — {what was verified vs. what remains residual}

### Completeness (vs discovered system)

| Area                          | Status        | Gap / Evidence (`file:line` or spec/section ref)            |
| ----------------------------- | ------------- | ----------------------------------------------------------- |
| Related/affected specs reflected | ✅/❌        | {which related behavior is/ isn't reflected}                |
| Implied stories / AC / rules  | ✅/❌          | {missing item the idea implies}                             |
| Canonical case coverage vs operations | ✅/❌ | {owner/case/variant missing for an operation or edge case; strict default: §8 TC} |
| Invariant coverage (needed + existing) | ✅/❌ | {universal rule without its profile-owned property case, or existing invariant not respected} |

### Hypothesis & Decision Audit

| # | Encoded assumption / default / boundary | Class (OBVIOUS / NON-OBVIOUS / CONFLICTS) | Evidence |
| - | --------------------------------------- | ----------------------------------------- | -------- |
| 1 | {assumption}                            | {class}                                   | {ref}    |

### Open Questions (pre-mortem + materially-changing)

1. {question — what changes in the selected canonical owner depending on the answer}

### Decisions Log

| Decision | User's confirmed choice | Applied to | Residual confidence |
| -------- | ----------------------- | ---------- | ------------------- |
| {non-obvious decision} | {user-confirmed answer} | {owner section/field} | {>=80% / <80% residual} |

### Verdict

{CLARIFIED | NEEDS-AUTHORING-FIX | BLOCKED / NEEDS-CLARIFICATION} — {evidence-based justification; name the owning procedure for any required correction}
```

## Key Rules

- **Resolve profile, then detect context (Phase 0)** — use the selected owner's roles, identifiers, and provisional markers; `TEST-SPEC` exists only when separately declared. Ambiguous → blocking user confirmation or `BLOCKED` if unavailable.
- **Walk every applicable category, ask within the budget** — probing breadth is exhaustive (the 9-category catalog × the per-context matrix in `references/clarify-interview.md`); the `Spec Validation: questions=MIN-MAX` budget (per-context default when absent) caps how many reach the gate in one pass. Never invent filler to hit MIN; never exceed MAX in a pass; never start another pass without the user's go-ahead.
- **Completeness is judged against the SYSTEM** — every related/affected behavior from the discovered landscape must be reflected, or its absence deliberately noted. The artifact passing in isolation is NOT enough.
- **NON-OBVIOUS and CONFLICTS go to the user** — only OBVIOUS decisions are documented-and-proceeded; ambiguity in the classification itself defaults to NON-OBVIOUS.
- **NEVER silently pick a non-obvious decision** — the blocking user-confirmation gate is the entire value of this skill; no user/tool response means `BLOCKED`/`NEEDS-CLARIFICATION` with no mutation.
- **Runs INLINE, not as a sub-agent** — the clarification gate needs `ask user question tool`, which only the main interactive agent can run; do NOT add `execution-mode: subagent`.
- **Complements, never duplicates** — `work-item --mode=review` owns isolation/M1-M5 + M7, `why-review` owns rationale; cross-check each universal invariant against the profile-owned case and defer detailed property/case quality to `work-item --mode=review --type=spec-tests`.
- **Validate before applying** — run `$why-review --validate-findings` on this skill's own findings before updating any canonical owner.
- **Evidence-based** — every completeness gap, classification, and conflict cites `file:line` / a spec section / an invariant ref with a confidence percentage.

---

> **[IMPORTANT]** Use todo tracking to break ALL work into small tasks BEFORE starting — including a final review task to verify completeness and that every non-obvious decision was confirmed.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim requires `file:line` proof or traced evidence with confidence percentage (>80% to act).

## Mode protocols

The protocols below apply to this mode only; their full text is inline so this reference is self-contained. The `spec` skill already carries `evidence-based-reasoning`.


<!-- SYNC:decision-interview -->

> **Decision Interview** — Put decisions to the user so they can judge well; applies whenever a skill asks the user to confirm, choose or validate. The hosting skill keeps its categories, budget, gates, verdicts and record format.
>
> 1. **Facts yours, decisions theirs.** Look up every fact the repository, docs, configuration or a tool can supply. Never ask for a fact you can find; never answer a decision for the user.
> 2. **Brief first.** Before the first question show, in plain language: the goal and what will be done, scope in and out, decisions already taken and why, what is touched, main risks and anything hard to undo, how success is proved, anything blocked; cite the artifact path. Keep it readable in a couple of minutes. The user must never need to open the artifact to answer.
> 3. **Rounds by dependency.** List every material decision, silent default, assumption and conflict; material = a different answer changes scope, behavior, a contract, data, cost, risk or the order of work. A round is every decision whose prerequisites are settled; a decision that depends on an open one waits for a later round. Recompute after each round: an answer can settle, open or remove decisions.
> 4. **One decision card per question.** What is decided, in one plain sentence · why it matters · what is assumed now, with evidence · 2-4 concrete options, each with what it gives, what it costs and who or what it affects · recommended option first, marked, with the reason and what would change it · whether the choice is easy to reverse. When the user needs more information, look it up, show it and ask again.
> 5. **Every material decision, none invented.** Coverage is the goal, not a count. Read linked Decision Records and resolved decision tickets first: reuse confirmed choices only while their scope and premises still hold, citing the source in the hosting record. Missing evidence, open, changed, conflicting or unconfirmed choices remain for the human. Reuse never waives the hosting skill's gates or budget. The hosting skill owns the budget: with a round size or none, run rounds until no material decision is open and tell the user how many remain; with a hard cap, ask the highest-impact decisions first, in dependency order, and record each one left unasked as unconfirmed. A minimum asks you to look wider, never to pad: with fewer genuine decisions, ask those and say so. Never re-ask a settled decision, restate the artifact as a question, or bundle several decisions into one "proceed?".
> 6. **Close the loop.** Play answers back as decision → chosen option → what changes, and record them where the hosting skill says. The user may stop at any round: record every unasked decision as an unconfirmed assumption with its reason, never as confirmed. Do not act on the outcome until the user has seen the playback.
> 7. **No user channel.** A sub-agent or headless run returns the briefing and the open decision cards to the caller as pending. Never self-answer.
>
> **BLOCKED until:** briefed before the first question · every question a decision card · every material decision asked or recorded unconfirmed · answers played back and recorded.

<!-- /SYNC:decision-interview -->

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

<!-- SYNC:understand-code-first -->

> **Understand Existing Code First** — For code changes, read and trace the target before planning or editing; do not apply a code workflow to work with no code surface.
>
> 1. Search for relevant existing implementations and cite `file:line`; aim for 3+ comparable examples when they exist, and record when the project has fewer or none.
> 2. Read the target area and its configured project references; identify actual structure, owners, and conventions without assuming a framework, layer model, or base class.
> 3. Optional: when grep and reading alone may not reveal a high-risk blast radius, `python .claude/scripts/code_graph trace <file> --direction both --json` (when `.code-graph/graph.db` exists) can add callers and dependents — a hint that may be stale, verified by reading the files.
> 4. Map affected dependencies and callers with available repository tools (grep, reading); an absent, stale or unsupported graph never blocks or fails the task.
> 5. Write investigation to `tmp/analysis/` for non-trivial tasks (3+ files).
> 6. Re-read the analysis before implementing; update it when evidence changes.
> 7. Follow a fitting local pattern, or state why no suitable pattern exists and justify a project-appropriate choice.
>
> **BLOCKED until:** target and relevant existing patterns are inspected, applicable dependencies are traced, and material assumptions have evidence. If an item does not apply or the repository has no comparable implementation, record that fact rather than fabricating a gate result.

<!-- /SYNC:understand-code-first -->

<!-- SYNC:decision-interview:reminder -->

**MUST ATTENTION** interview: look up facts yourself · brief before the first question · ask every material decision the hosting skill's budget allows, in dependency order, as a decision card (options with gains and costs, a reasoned recommendation) · never pad or self-answer · play answers back and record unasked decisions as unconfirmed.

<!-- /SYNC:decision-interview:reminder -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** for code work, read the target and relevant conventions before planning or editing; seek 3+ fitting examples when available and record fewer/none. Do not impose code discovery on work with no code surface. The code graph is optional, stale-able advice for high-risk impact, never a requirement.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->


<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** A finding names a reachable trigger path (caller, input, state or event that reaches the defect) and a consequence; an unreachable concern is an observation, and unsettled reachability is `NOT VERIFIABLE` only when the concern would be MEDIUM or higher (an observation otherwise) — never a speculative LOW.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval; inside a workflow run, `$start-workflow` → Workflow-step mode bounds this
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses


## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Finalize the selected canonical owner or separately declared case artifact only after reflecting every related behavior/invariant from the discovered system and user-confirming every encoded NON-OBVIOUS or CONFLICTING decision through an exhaustive, budget-bounded blocking clarification gate.

**IMPORTANT MUST ATTENTION Main steps (do NOT skip, reorder, or collapse the loop):** Phase 0 resolve profile + context + budget → Step 0 resolve the 4 inputs, flag missing as findings (gap-review profile: artifact + request + investigation; discovery and domain inputs not required) → Step 1 completeness pass vs the SYSTEM → Step 2 walk EVERY applicable category, classify each item OBVIOUS / NON-OBVIOUS / CONFLICTS → Step 3 brainstorm materially-changing open questions + adversarial pre-mortem → Step 4 BLOCKING user-confirmation gate on NON-OBVIOUS + CONFLICTS + high-impact within the MIN-MAX budget → Step 5 apply only confirmed decisions + Decisions Log through the owner's procedure → Step 6 validate findings via `$why-review --validate-findings`, emit CLARIFIED / NEEDS-AUTHORING-FIX / BLOCKED — why: the audit→classify→ask→validate sequence prevents silent assumptions and unattended sessions cannot authorize decisions.

**Protocols in force — MUST ATTENTION honor every block below (concise digest of the SYNC/shared blocks this skill carries):**

- **Nested Task Creation:** Parent workflow rows never replace child phase tracking.
- **Task Tracking External Report:** Bootstrap tasks; persist clarification findings to `tmp/reports/`.
- **Evidence Based Reasoning:** No claim without cited evidence; state confidence.
- **Understand Code First:** Read code, grep 3+ patterns before any change.
- **Fresh Context Review:** Validate findings, fix only current-round blocking findings, and restart the full review until the severity bar is clear (Round 1: zero open findings (LOW deferral); Round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred); spawn a fresh zero-memory sub-agent after each fix cycle (re-review only — this skill itself runs inline).
- **Review Protocol Injection:** Embed all 11 protocol bodies verbatim in any fresh sub-agent prompt.
- **Severity Rubric:** Classify findings Critical/High/Medium/Low by consequence.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**IMPORTANT MUST ATTENTION** judge completeness against the SYSTEM, not the spec alone — every related/affected behavior from the discovered landscape must be reflected, or its absence deliberately noted; this is the distinct value vs `work-item --mode=review`'s isolation check — why: a spec that passes in isolation can still silently contradict an adjacent capability's invariant.
**IMPORTANT MUST ATTENTION** classify every encoded assumption/default/scope-boundary/ambiguity as OBVIOUS / NON-OBVIOUS / CONFLICTS — NON-OBVIOUS and CONFLICTS MUST go to the user gate; only OBVIOUS is documented-and-proceeded; ambiguity in the class itself defaults to NON-OBVIOUS — why: a silently-picked default ships a spec the user never agreed to.
**IMPORTANT MUST ATTENTION** resolve the configured/native artifact profile FIRST, then detect `AUTHORED-SPEC` / `EXISTING-SPEC` / separately declared `TEST-SPEC` from owner roles, provisional state, and active workflow; ambiguous or unavailable user confirmation → `BLOCKED`/`NEEDS-CLARIFICATION`, no mutation — why: the wrong context audits the wrong owner and unattended execution cannot confirm intent.
**IMPORTANT MUST ATTENTION** probe EVERY applicable category (the 9-category catalog × per-context matrix in `references/clarify-interview.md`) but ask only within the `Spec Validation: questions=MIN-MAX` budget (per-context default when absent) — ask ≥MIN only when ≥MIN genuine decisions exist, never invent filler, never exceed MAX in one pass, and run a further pass only on the user's go-ahead — why: breadth of probing catches every gap; the budget is the fatigue control, not "ask only a few".
**IMPORTANT MUST ATTENTION** the Step 4 user-confirmation gate is BLOCKING — present NON-OBVIOUS + CONFLICTS + high-impact items as ≤4 structured options (recommended first), issue multiple calls as needed, NEVER silently pick a non-obvious decision; if no user/tool response is available, preserve questions and return `BLOCKED`/`NEEDS-CLARIFICATION` — why: unanswered intent cannot authorize artifact mutation.
**IMPORTANT MUST ATTENTION** this skill runs INLINE on the main agent (no `execution-mode: subagent`) — the gate needs `ask user question tool`, which only the main interactive agent can run; a sub-agent cannot ask the user — why: a blocking confirmation loop is structurally impossible in an isolated sub-agent.
**IMPORTANT MUST ATTENTION** before applying any decision, validate this skill's OWN findings via `$why-review --validate-findings <report-path>`, then apply only confirmed, validated decisions through the owner procedure and re-run Step 1 — why: rewriting canonical intent from a phantom gap is worse than the gap.
**IMPORTANT MUST ATTENTION** complement, never duplicate — cross-check universal invariant → profile-owned property-case existence only; defer quantified property and boundary-case quality to `work-item --mode=review --type=spec-tests` — why: re-running that audit here drifts this skill into overlap and wastes the budget.
**IMPORTANT MUST ATTENTION** cite `file:line` / spec-section / invariant evidence for every completeness gap, classification, and conflict with a confidence percentage (>80% to act, <60% DO NOT recommend); "Insufficient evidence" is valid output — why: speculation produces non-fixable findings and false conflicts.
**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using todo tracking BEFORE starting; keep one `in_progress`; add a final review task to verify every non-obvious decision was confirmed — why: untracked multi-step work loses state on compaction.

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| "`work-item --mode=review` already passed, skip this"    | That was isolation / M1-M5 + M7 / AC testability. It never checked completeness-vs-system or confirmed decisions with the user. Different gate. |
| "It's a spec, so audit the full §1-8"            | Resolve the profile first. Only the strict default uses §1-8; native profiles use their declared roles. `TEST-SPEC` must be separately declared. Auditing the wrong sections wastes the budget. |
| "Only ask a couple of the most important questions" | Probing is exhaustive across every applicable category; *asking* is bounded by the `questions=MIN-MAX` budget. Surfacing only a few SKIPS categories — that is the gap this upgrade closed. Walk all, ask up to MAX per pass. |
| "Fewer than MIN real decisions, so invent some to hit MIN" | NEVER invent filler. Ask only the genuine decisions and record "below-MIN: only N real decisions". MIN is a floor for *real* questions, not a quota. |
| "The decision is obvious, I'll just document it" | If it is truly OBVIOUS (one reading any reader shares), document it. NON-OBVIOUS / CONFLICTS MUST go to the user gate — when unsure, it is NON-OBVIOUS. |
| "No open questions, the spec is complete"        | Run the pre-mortem FIRST ("ships, fails in 3 months — what spec gap caused it?") before claiming none. |
| "The user is unavailable; I'll assume the likely answer" | An unanswered NON-OBVIOUS choice stays unresolved. Return `BLOCKED`/`NEEDS-CLARIFICATION`; do not mutate or claim `CLARIFIED`. |
| "The conflict is minor, I'll reconcile it silently" | A CONFLICT with a discovered spec/invariant changes behavior — surface it AND confirm the resolution with the user. |
| "Findings are clearly right, apply them now"     | Validate via `$why-review --validate-findings` and get required user confirmation BEFORE changing the canonical owner — a phantom gap rewrites intent wrongly. |

**IMPORTANT MUST ATTENTION** judge completeness against the SYSTEM + confirm every NON-OBVIOUS / CONFLICTS decision with the user — the distinct value vs isolation review.
**IMPORTANT MUST ATTENTION** the clarification gate is a BLOCKING `ask user question tool` loop; runs INLINE on the main agent — if the user/tool cannot answer, preserve open questions and return `BLOCKED`/`NEEDS-CLARIFICATION`; NEVER silently pick a non-obvious decision.
**IMPORTANT MUST ATTENTION** validate own findings via `$why-review --validate-findings` before applying; cite `file:line`/section evidence with confidence for every claim.
