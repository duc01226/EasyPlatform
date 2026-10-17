---
name: feature-implement
description: '[Implementation] Use when the user asks to build a feature from an idea or description with no plan file yet: research and trace the code, create and get the plan approved, build each phase with its tests, review, verify once, sync specs and docs. Existing plan: plan --mode=execute.'
---

> Codex compatibility note:
> - Invoke `$skill-name`: load the registered `.agents/skills/<name>/SKILL.md` and execute it with Codex tools; no separate `Skill` tool or Claude mode switch is needed. Author `.claude/**`; mirrors are generated.
> - Track steps before execution and keep progress/evidence current. Explicit skill requests execute their protocol. Use the native question tool for required questions.
> - Map foreign tool names to available host capabilities. A name mismatch needs no approval; an actually unavailable required capability stops with its step/evidence and a user question before adaptation.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Preserve protocol order unless the user approves a deviation. Workflows use `$start-workflow`: gates stay fixed; other steps may flex with logged reasons and evidence.
<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, merge steps without explicit user approval. Inside a workflow run, `$start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: `in_progress` on start, `completed` on end.
> **[BLOCKING]** Every completed/skipped step MUST include evidence or explicit skip reason.
> **[BLOCKING]** If Task tools unavailable, maintain equivalent step-by-step plan tracker with same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **Work tracking:** Keep the project's tracked work current in the same change, as its root instructions (`CLAUDE.md` or `AGENTS.md`) say. When the project uses the portable tracker (`taskTracking.mode` is `observe` or `linked`), read [the linked work integration guide](../task-track/references/integration-guide.md) at capture, start, saved-work, verification, handoff and close-out checkpoints. Use the actual linked producer and exact items; retain the primary outcome and record optional upkeep once through the common owner. Continue untracked when no link exists; acceptance remains explicit.

## Quick Summary

**Goal:** Ship a correct, fully-verified feature that satisfies the saved Goal Contract — implemented with deep research, comprehensive planning, and maximum quality verification (planned, reviewed, tested, documented) — with no skipped quality gate on any non-trivial change.

**Summary:** Resolve the saved goal and spec contract, research and trace the feature, obtain an approved plan, implement every phase with its tests written together, review statically, verify once with a mutation check (`SYNC:verify-last-order`), reconcile specs and docs, and close with evidence; use fast mode only when every trivial-task condition is satisfied.

**Workflow:**

1. **Research** — Deep investigation, multiple researcher subagents
2. **Plan** — Detailed plan via `$plan`; user approval required
3. **Implement** — Execute with full code review + SRE review
4. **Review, then verify once** — static review fix-loop over the whole changeset, then run all tests once with a mutation check (fix and re-run to green; re-review only if that edited anything), update docs

**Key Rules:**

- Maximum thoroughness: research → plan → implement → review → test → docs
- User approval required at plan stage
- Break work into todo tasks; add final self-review task

> **feature-implement vs plan --mode=execute:** `feature-implement` takes an idea/feature description and goes idea → research → **plan (created here)** → shipped. Use `$plan --mode=execute` instead when a plan file already exists and you only need disciplined phase-by-phase execution + commit. feature-implement owns the front of the pipeline (research + planning); plan --mode=execute owns the back (phase gates + auto-commit + `--parallel`/`--approval`/`--tests` flags).

## Contents

- [Quick Summary](#quick-summary)
- [Standalone Mode Pipeline (skip entirely only when `nested=true` — a `\[Workflow\]` row that merely exists in the current task list does not count)](#standalone-mode-pipeline-skip-entirely-only-when-nestedtrue--a-workflow-row-that-merely-exists-in-tasklist-does-not-count)
- [First Principle — Easy to Change · Easy to Scale · Easy to Maintain](#first-principle--easy-to-change--easy-to-scale--easy-to-maintain)
- [Default Mode Policy](#default-mode-policy)
- [Workflow](#workflow)
- [When to Use](#when-to-use)
- [Quality Gates](#quality-gates)
- [Next Steps (Standalone: MUST ATTENTION ask user via `ask user question tool`. Skip only when `nested=true` — a `\[Workflow\]` row that merely exists in the current task list does not count.)](#next-steps-standalone-must-attention-ask-user-via-ask-user-question-tool-skip-only-when-nestedtrue--a-workflow-row-that-merely-exists-in-tasklist-does-not-count)
- [Closing Reminders](#closing-reminders)

## Standalone Mode Pipeline (skip entirely only when `nested=true` — a `[Workflow]` row that merely exists in the current task list does not count)

> **MANDATORY — standalone `$feature-implement` only.** When invoked OUTSIDE a workflow, wrap the core spine in this quality loop. Detect nesting via the current task list FIRST: if THIS run is a step of a `[Workflow]` row (its own phase tasks are linked to that parent row, `nested=true` — a `[Workflow]` row that merely exists in the current task list, such as an abandoned one, does not count), SKIP this section — the surrounding workflow already sequences plan/review/why-review around this skill (e.g. `workflow-feature` wraps feature-implement with exactly these steps).
>
> Create these as todo tracking tasks up front, in order, then execute them:
>
> 1. **`$spec` — spec-driven, BEFORE any plan or code.** Resolve config/required-reference artifact profile first (invalid/unresolved → BLOCKED); create or update its tech-free canonical owner under the business spec root. Use the eight-section Feature Spec only when no native contract is declared, preserving native roles, identifiers and carriers otherwise. Work under that selected owner (default `docs/specs/`; `specRoots.business.path` in `docs/project-config.json` overrides) so the plan and implementation satisfy an agreed contract, not chat memory. Decide the case from evidence: net-new capability with no code yet → `$spec [mode=draft]` (provisional, `Evidence: TBD`); enhancement to an already-documented feature → `$spec [mode=update]`; behavior/contract change to existing spec → `$spec [mode=amend]`; buggy/undocumented area that now warrants a spec → `$spec [mode=init]`. If a governing spec already exists and fully covers this change, record `Spec verified current — no change` with `file:line` evidence and proceed. **Skip ONLY in fast mode** (ALL Default Mode Policy trivial-task conditions met — no behavior/contract change); record the skip reason. Decide the case explicitly — skip only the authoring, never the decision.
> 2. **`$plan`** — author the implementation plan from the spec. feature-implement's Comprehensive Planning phase (Step 2) satisfies this; emit a reviewable plan artifact under the plans root (default `plans/`; `docsRoots.plans.path` in `docs/project-config.json` overrides). Map each plan phase's `## Test Specifications` to the selected canonical owner/case/variant and intended executor/assertion evidence; §8 `TC-{FEATURE}-{NNN}` only for the absent-profile strict default.
> 3. **Proceed** — execute the core implementation spine up to the static code review (research already done → implement every phase with its tests → Step 4 review); the single Step 5 verify runs LAST, after every review below.
> 4. **`$spec [mode=sync]`** — *spec-driven closure.* Reconcile the selected owner/case/variant ↔ configured test carriers and inspected assertions/results; strict-default §8 TCs only when no native contract exists. Replace provisional evidence with verified source evidence through its owner, never invent execution. Run `$spec [mode=tests]` first if the implementation introduced behavior not yet captured as a test case. Skip only when step 1 was skipped (fast-mode trivial, no spec touched).
> 6. **`$changes-review --defer=whole-target`** — review the diff before commit (step 7 owns the rationale review).
> 7. **`$why-review`** — review rationale and change quality of the implementation.
> 8. **Verify once (Step 5)** — full tests + mutation check on the settled tree, then the documentation update and final report; a fix made here re-runs items 6-7 before the task is done (`SYNC:verify-last-order`).

## First Principle — Easy to Change · Easy to Scale · Easy to Maintain

> The full gate is `SYNC:core-engineering-principles` (protocol guide below; a hook delivers its text); its closing digest ends this file.

---

## Default Mode Policy

> **Default mode HARD (full rigor).** Every section below — deep research, mandatory `$plan`, full `code-reviewer` review, mandatory tests, mandatory `$docs-manager --mode=update` — applies by default.
>
> **Opt out to fast mode ONLY when ALL true** (task genuinely trivial):
>
> - Single-file edit, ≤30 lines changed
> - No design choice (only one reasonable approach)
> - No cross-service impact, no contract change, no new dependency
> - No new pattern — follows existing codebase pattern
> - Existing tests cover change OR change non-functional (typo, comment, log message)
>
> **Any condition fails → use full protocol below.** When in doubt, default hard. Skipping review/tests on non-trivial change ships bugs.
>
> **Fast mode skips (and only skips):** researcher subagent phase (direct grep instead), mandatory `code-reviewer` review (self-review only), separate test phase (verify inline). Does NOT skip `$plan` step, test execution, `$docs-manager --mode=update` triage.

### Backend Context (if applicable)

> When task involves backend changes, read these directly before implementing:

Both docs below sit under the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path):

- CQRS commands/queries, validation, repositories, entity events: `backend-patterns-reference.md`
- Entity catalog, relationships, cross-service sync: `domain-entities-reference.md`
- **Repository type (service-specific):** when the project declares a per-service repository abstraction (`backendServices.serviceRepositories` in `docs/project-config.json`), use that repository type for the service — NEVER the generic root repository base.

### Frontend/UI Context (if applicable)

> When task involves frontend or UI changes:

All three live under the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path):

- Component patterns: `frontend-patterns-reference.md`
- Styling reference: `configured styling reference`
- Design system tokens: `design-system/README.md`

**AI surface?** Only if the task creates or changes a model call, prompt, agent, tool/MCP, retrieval or eval (see `node .claude/scripts/ai-signal-scan.cjs`): read `.claude/skills/shared/protocols/ai-engineering-gate.md` and apply it; otherwise skip this line.

**Ultrathink** plan and implement these tasks with maximum verification:

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.**

<tasks>$ARGUMENTS</tasks>

**Mode:** Extra research, detailed planning, mandatory reviews.

## Workflow

### 0. Goal Contract Read (BEFORE implementation)

- Resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop`: active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` (plans root default `plans/`; `docsRoots.plans.path` in `docs/project-config.json` overrides) → create from the current request via `.claude/templates/goal-contract-template.md`.
- Read the saved success criteria BEFORE any code change — implementation serves the saved criteria, not chat memory.
- After implementation and verification, append an Iteration Log entry to the goal file: result, evidence references (`file:line`, command output), remaining gaps mapped to criteria.

### 1. Deep Research Phase

- Launch 2-3 `researcher` subagents in parallel covering:
    - Technical approach validation
    - Edge cases, failure modes
    - Security implications
    - Performance considerations
- Use `$investigate` for comprehensive codebase analysis
- Research reports max 150 lines each
- **External Memory:** Write all research to `tmp/analysis/{task-name}.analysis.md`. Re-read ENTIRE file before planning.
- **Pre-Implementation Trace Gate:** For bugfix, failed verification, stale/incorrect final output, regression, or behavior-changing fix plans, MUST ATTENTION confirm the plan/referenced analysis includes `Debugger Trace: End -> Start`, all feeder paths, hypothesis matrix, owning fix layer, and forward convergence proof. If missing, STOP and produce the missing-trace list before editing.

> After implementing, verify by grep/read that no related files need updates (optionally `python .claude/scripts/code_graph connections <file> --json` on modified files as a stale-able hint).

### Optional Graph Hint Before Implementation

Optional: when grep and reading files alone may not reveal a high-risk blast radius (shared contract, many callers, cross-module/cross-service flow, public API), the code graph (`.code-graph/graph.db`) can add callers, dependents and impacted tests. Treat it as a hint, NOT proof: the graph can be stale or incomplete (it lags uncommitted edits and unindexed paths) — verify anything that matters by reading the files/grep. Skip it for low-risk or local changes. When it applies, before writing code:

- `python .claude/scripts/code_graph trace <file> --direction both --json` — what calls this code AND what it triggers
- `python .claude/scripts/code_graph trace <file> --direction downstream --json` — all downstream consumers
- May hint at implicit dependencies (bus message consumers, event handlers) — confirm by reading

### 2. Comprehensive Planning

- Use `planner` subagent with all research reports
- Create full plan directory:
    - `plan.md` — overview with risk assessment
    - `phase-XX-*.md` — detailed phase files
    - Success criteria per phase
    - Rollback strategy

### 3. Verified Implementation

- Implement every phase, writing each phase's tests in the same pass as its code
- After each phase:
    - Run type-check, compile ONLY — no test run, no mutation run, no review per phase (`SYNC:verify-last-order`)
    - Self-review before proceeding

### Batch Checkpoint (Large Plans)

For plans with 10+ tasks, execute in batches with human review:

1. **Execute batch** — Complete next 3 tasks (or user-specified size)
2. **Report** — Show implementation, verification output, any concerns
3. **Wait** — Say "Ready for feedback" and STOP. Do NOT continue automatically.
4. **Apply feedback** — Incorporate changes, execute next batch
5. **Repeat** until all tasks complete

<HARD-GATE>
Plans with 10+ tasks — do NOT execute all tasks continuously without checkpoint.
Stop after every batch for human review. Prevents runaway execution where early
mistakes compound through later tasks.
</HARD-GATE>

### 4. Mandatory Code Review (static)

- Use `code-reviewer` subagent over the whole changeset; the review reads code and tests and runs NO test suite
- Apply the canonical review policy: Round 1 exits on zero open validated findings (LOW deferral);
  Round 2 fixes only validated CRITICAL/HIGH/MEDIUM findings, while
  LOW-only findings are recorded as deferred and do not reopen the loop.
- Failed binary gates (tests, required artifacts, security must-fix, parity)
  block at every round and are never relabeled LOW.
- Start a fresh full review after every fix cycle; a fix may write or amend tests but does not run them.
- Stop when the current round's severity bar is clear; cap at three review rounds and
  escalate repeated/no-progress CRITICAL/HIGH/MEDIUM findings rather than
  looping open-ended.

### 5. Mandatory Verify (tests + mutation check, once)

- Use `tester` subagent ONCE for the full affected suite; then run the mutation check yourself (`tester` is read-only) on every changed core-logic line and new rule
- Tests cover: happy path scenarios, edge cases from research, error handling paths
- Exercise the owned integration behavior through real paths. Use realistic valid fixtures and project-supported test doubles only at designated external seams; deterministic AI tests mock the model at one seam (AE-6.2), and default CI makes no live paid calls. Never mock away the invariant under test.
- Any red test or surviving mutant: record the provisional verdict, fix at the owner, re-run until all tests pass and every mutant is killed
- If fixing edited any source or test file, re-run the Step 4 review over the settled tree; a re-review that applies a fix sends you back here (capped at 3 turns, then escalate via `ask user question tool`)
- Done = a green verify AND no edit after the last review; an edit after the last green run invalidates it

### 6. Documentation Update

- Use `docs-manager` to update relevant docs
- Update plan status inline
- Record architectural decisions

### 7. Final Report

- Summary of all changes
- Test coverage metrics
- Security considerations addressed
- Unresolved questions (if any)
- Ask user to review and approve

## When to Use

- Critical production features
- Security-sensitive changes
- Public API modifications
- Database schema changes
- Cross-service integrations

## Quality Gates

| Gate     | Criteria                  |
| -------- | ------------------------- |
| Research | 2+ researcher reports     |
| Planning | Full plan directory       |
| Review   | No blocking findings under the current severity bar; deferred LOWs listed; static, before the verify |
| Tests    | Verified once after review: all pass, owned behavior real, designated external/model seam doubles allowed, required mutants killed |
| Docs     | Updated if needed         |

---

## Next Steps (Standalone: MUST ATTENTION ask user via `ask user question tool`. Skip only when `nested=true` — a `[Workflow]` row that merely exists in the current task list does not count.)

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If this skill was called **outside a workflow**, MUST ATTENTION use `ask user question tool` to present these options. Do NOT skip because task seems "simple" or "obvious" — user decides:

- **"Proceed with full workflow (Recommended)"** — Detect best workflow to continue from here (feature implemented). Ensures review, testing, docs steps aren't skipped.
- **"$code-simplifier"** — Simplify and clean up implementation
- **"$workflow-review-changes"** — Review changes before commit
- **"Skip, continue manually"** — user decides

> If THIS run is a step of a `[Workflow]` row (`nested=true`: its own phase tasks are linked to that parent row; a `[Workflow]` row that merely exists in the current task list, such as an abandoned one, does not count), skip — workflow handles sequencing.

> **[IMPORTANT]** Use todo tracking to break ALL work into small tasks BEFORE starting. Prevents context loss from long files. Keep task depth proportional to the work.

- `domain-entities-reference.md` under the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models)
- The business spec root (default `docs/specs/`; `specRoots.business.path` in `docs/project-config.json` overrides) — Canonical case contracts by selected owner/profile (strict-default TCs only when absent); generate/update via `$spec [mode=tests]` after implementation

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `core-engineering-principles` — Core quality gate: easy to change, easy to scale, easy to maintain, judged by future change cost; planning, implementing or reviewing any change → .claude/skills/shared/protocols/core-engineering-principles.md
- `design-distinctiveness-gate` — Design identity gate DD-1 to DD-8: subject, design plan, generic test, restraint; designing, implementing or reviewing a visual surface → .claude/skills/shared/protocols/design-distinctiveness-gate.md
- `design-review-checklist` — Executable front-end design review protocol CL-1 to CL-6; reviewing, planning or building front-end work → .claude/skills/shared/protocols/design-review-checklist.md
- `domain-entity-change-gate` — DDD entity, value object and aggregate change gate; planning, implementing or reviewing a domain model change → .claude/skills/shared/protocols/domain-entity-change-gate.md
- `end-to-start-debugger-trace` — Walk backward from the observed end state through every feeder path before fixing; investigating non-trivial bugs or failed verification, changing code behavior, or tracing unclear code flow → .claude/skills/shared/protocols/end-to-start-debugger-trace.md
- `graph-assisted-investigation` — Optional hint: a code-graph query can add callers and dependents when grep may miss a high-risk blast radius, and it can be stale; a high-risk change where grep and reading alone may miss the blast radius → .claude/skills/shared/protocols/graph-assisted-investigation.md
- `measured-capacity-engineering` — Model demand, reduce measured work safely and prove capacity before scaling; planning, building, testing or reviewing hot paths, caches or capacity → .claude/skills/shared/protocols/measured-capacity-engineering.md
- `plan-quality` — Plans decide direction, affected owners, risks and final proof without pre-writing implementation; writing or reviewing a plan → .claude/skills/shared/protocols/plan-quality.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `source-test-drift-check` — When source behavior changes, reconcile the affected tests from evidence; code, fix, test or review work changes behavior → .claude/skills/shared/protocols/source-test-drift-check.md
- `task-tracking-external-report` — Task breakdown before the work and report files written incrementally; starting any multi-step skill, plan or review → .claude/skills/shared/protocols/task-tracking-external-report.md
- `ui-copywriting` — User-visible strings are design content; writing or reviewing UI text → .claude/skills/shared/protocols/ui-copywriting.md
- `ui-system-context` — Resolve the project's UI conventions before a UI change; changing a user-interface surface → .claude/skills/shared/protocols/ui-system-context.md
- `understand-code-first` — Read and trace the target and existing patterns before changing code; planning or editing code → .claude/skills/shared/protocols/understand-code-first.md
- `ux-journey-gate` — Journey-first UX gate UX-1 to UX-11: report journeys, read the design authority, generate, then check every UI/UX gate; generating, specifying, planning, mocking up or reviewing a user-facing surface → .claude/skills/shared/protocols/ux-journey-gate.md
- `verify-last-order` — Build all phases and write tests, review statically, then verify once with a mutation check; planning or running any code-changing task → .claude/skills/shared/protocols/verify-last-order.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** A finding names a reachable trigger path (caller, input, state or event that reaches the defect) and a consequence; an unreachable concern is an observation, and unsettled reachability is `NOT VERIFIABLE` only when the concern would be MEDIUM or higher (an observation otherwise) — never a speculative LOW.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** for code work, read the target and relevant conventions before planning or editing; seek 3+ fitting examples when available and record fewer/none. Do not impose code discovery on work with no code surface. The code graph is optional, stale-able advice for high-risk impact, never a requirement.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:plan-quality:reminder -->

**MUST ATTENTION** Plan at decision-and-boundary altitude: resolve `specArtifacts`; map behavior to existing or planned test owners without fabricating future evidence; name bounded executor discovery; author tests with implementation; run suites only at the final verify gate after all implementation and static review; list a task-specific quality-gates checklist (gate · applies · verification · evidence · owner phase) before the phases.

<!-- /SYNC:plan-quality:reminder -->

<!-- SYNC:ui-system-context:reminder -->

**IMPORTANT MUST ATTENTION** Before planning, implementing or changing frontend UI, find and read the current project's design system, tokens, shared components/UI controls and related usage examples; follow house conventions and reuse what fits. Start with project config and selected UI references, then inspect the actual component owners. Record searched paths and any gap before adding a control; honor explicit N/A. A reminder is not proof of discovery.

<!-- /SYNC:ui-system-context:reminder -->

<!-- SYNC:graph-assisted-investigation:reminder -->

**Optional advice:** the code graph (`.code-graph/graph.db`) can hint at a high-risk blast radius grep misses; it can be stale, so verify by reading files. Never required.

<!-- /SYNC:graph-assisted-investigation:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:end-to-start-debugger-trace:reminder -->

**IMPORTANT MUST ATTENTION** for non-trivial bugs, failed verification, regression fixes, behavior-changing code or unclear code flow, trace backward from the observed output through every feeder path before fixing. Establish hypotheses, the authoritative invariant owner and forward proof; retain validation at untrusted boundaries. Ordinary artifact review or graph lookup alone does not trigger a debugging workflow.

<!-- /SYNC:end-to-start-debugger-trace:reminder -->


<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:design-distinctiveness-gate:reminder -->

- **MUST ATTENTION** apply the design distinctiveness gate (`DD-1`–`DD-8`) to any user-facing visual surface: ground it in the named subject/audience/job and confirm when the brief is silent (`DD-1`) · every choice carries a WHY, token names included (`DD-2`) · write a design plan (colour 4–6 named hex · type families+roles+scale · layout prose+ASCII+alignment · principles) then run the BLOCKING generic test and state what you revised BEFORE coding (`DD-3`) · audit every free axis against the T1–T5 tell catalog — cream+serif+`#D97757`, acid-on-black, broadsheet, the SaaS-card kit, template chrome (ALL-CAPS eyebrows, `A · B · C`, spaced-em-dash labels, `#0B0B0B`, mono data labels, trailing `→`) — a match is a missed decision, never a defect (`DD-4`) · 1–2 clearly distinct families, real scale, <80ch, no single-word headline accent / ALL-CAPS labels / redundant eyebrows (`DD-5`) · numbering only on real sequences; hero = the subject's most characteristic thing, not big-number+gradient (`DD-6`) · one orchestrated motion moment, never per-section entrances plus universal card hovers (`DD-7`) · spend boldness once, critique the BUILT page, remove one accessory (`DD-8`). The brief's stated direction OUTRANKS the tell catalog; project design-system docs OUTRANK these clauses — genuine conflicts go to the user, NEVER resolved silently. Cite findings as `DD-<clause>` + `file:line`. Skip ONLY for surfaces with no user-facing visuals, stated explicitly.

<!-- /SYNC:design-distinctiveness-gate:reminder -->

<!-- SYNC:ui-copywriting:reminder -->

- **MUST ATTENTION** treat user-visible words as design content: end-user vocabulary, not system vocabulary (notifications, not webhook config) · active-voice CTAs that say what happens ("Save changes", never "Submit") · ONE name per action across the whole flow (Publish → "Published") · errors explain what happened and how to fix it and NEVER apologize or stay vague, empty screens invite action · sentence case, plain verbs, no filler, one job per element · real subject-specific copy, never lorem — and read every string for TRUTH: one coherent story, not three products' content on one screen. Skip ONLY when no user-visible text changes, stated explicitly.

<!-- /SYNC:ui-copywriting:reminder -->

<!-- SYNC:design-review-checklist:reminder -->

- **MUST ATTENTION** when the change/plan/artifact has an applicable user-facing UI surface, READ `.claude/docs/design-review-checklist.md` and run it: `CL-1` establish context first (platform · user · task · metric · constraints · scope · artifacts — state missing context and its confidence impact) · `CL-2` evidence or nothing, cite a location per finding, NEVER invent a measurement (unmeasurable → `NOT VERIFIABLE`), tag `MEASURED`/`OBSERVED`/`HEURISTIC` · `CL-3` rank `P0`–`P4`, cap at top 10 by severity, NEVER pad, concrete fix on every `P0`/`P1` · `CL-4` sweep §A–§N plus §R over whole surfaces (changed files → affected views, composition reconstructed, render or `ENVIRONMENT-BLOCKED`), including surface load B12–B15, container fit E9–E11, §H by usage, Field Necessity Matrix for input, applying only relevant platform/product sections and the WCAG 2.2 AA web baseline plus any stricter applicable legal/project requirement, or the documented standard for other platforms · `CL-5` short on time → use the §P prompts · `CL-6` report in the §O shape · for source code, assess component ownership, base abstractions, reuse, and duplication using the project's documented taxonomy or observed boundaries. Project design-system docs and ADRs OUTRANK the checklist; report a defect ONCE across `UI-*`/`DD-*`/`CL-*`. For a plan, bind only applicable sections and states to acceptance criteria, and name each UI view's primary task, container, information priority, and creation-vs-deferred inputs; a plan review flags a UI phase that omits them. Skip when the work has no user-facing UI surface, and state why.

<!-- /SYNC:design-review-checklist:reminder -->

<!-- SYNC:measured-capacity-engineering:reminder -->

**MUST ATTENTION** capacity work: model demand/SLO and distinguish sessions from RPS/in-flight work; disclose load model and offered vs achieved demand; reduce measured work at a safe owner; preserve cache authorization/freshness/bounds; prove cold-state, overload recovery and justified headroom before scaling. Static review returns a verification plan, not invented throughput. Retain the hosting skill's scores, gates and authority.

<!-- /SYNC:measured-capacity-engineering:reminder -->

<!-- SYNC:domain-entity-change-gate:reminder -->

**MUST ATTENTION** only for relevant entity/VO/aggregate changes, read `domain-analysis/references/entity-quality.md`: establish fit → plan owned decisions/proof → implement through all write/load paths → review the same rules. Keep simple models simple; unresolved material decisions or required proof block. Use one caller-owned review pass.

<!-- /SYNC:domain-entity-change-gate:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Ship a correct, fully-verified feature that satisfies the saved Goal Contract — implemented with deep research, comprehensive planning, and maximum quality verification (planned, reviewed, tested, documented) — with no skipped quality gate on any non-trivial change.

**IMPORTANT MUST ATTENTION** follow the pipeline in order: resolve the Goal Contract → decide/create/sync the spec → research and trace → author and review the plan → implement every phase with its tests (compile only between phases) → static review fix-loop until the current severity bar is clear → run spec sync, changes-review, and why-review (static) → run full tests + mutation check once, LAST, fix and re-run to green, re-review only if that edited anything → update docs/status → emit the final evidence report; use fast mode only when every opt-out condition passes.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries; each line is a signpost to its canonical body above):**

- **End-To-Start Debugger Trace:** Trace observed output backward through every feeder path before fixing.
- **Source/Test Drift Check:** When source behavior changes, reconcile affected tests from evidence.
- **UI System Context:** Read frontend, SCSS, and design-system docs before any UI change.
- **Graph-Assisted Investigation (optional):** the code graph is a stale-able hint for high-risk blast radius, never required.
- **Nested Task Creation:** Expand child phase tasks and link the parent when nested.
- **Task Tracking External Report:** Bootstrap task tracking; persist plan/review findings incrementally to disk.
- **Understand Code First:** Search 3+ patterns and read code before any modification.
- **Plan Quality:** Map every phase’s Test Specifications to the selected canonical owner/case/variant and evidence; default TC IDs only when the profile is absent.

- **MANDATORY IMPORTANT MUST ATTENTION** default mode HARD — opt out to fast mode ONLY when ALL trivial-task conditions met
- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks via todo tracking BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add final review todo task to verify work quality
- **MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via `ask user question tool` — never auto-decide
- **MANDATORY IMPORTANT MUST ATTENTION** NEVER skip `code-reviewer` review or test execution on non-trivial change

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break into small todo tasks and sub-tasks via todo tracking.

<!-- SYNC:core-engineering-principles:reminder -->

**MUST ATTENTION** Core Engineering Principles — every plan, implementation and review must be **Easy to change** (reuse first, one owner per rule, interfaces/adapters at volatile boundaries, no speculative abstraction) · **Easy to scale** (extend by addition, bounded growth, explicit boundaries, sized to the project's real profile) · **Easy to maintain** (intent-named tests that fail when the rule breaks across happy/error/edge paths; harness green locally and in CI). Before done: next change → how many edit sites? 10× → what breaks? which test goes red?

<!-- /SYNC:core-engineering-principles:reminder -->

<!-- SYNC:verify-last-order:reminder -->

**IMPORTANT MUST ATTENTION** code-changing work runs tests ONCE, last: build all phases + write tests → static review fix-loop → verify once with mutation check → fix and re-run to green → re-review only if step 4 edited anything. No per-phase or in-review test runs.

<!-- /SYNC:verify-last-order:reminder -->
