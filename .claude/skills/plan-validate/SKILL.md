---
name: plan-validate
version: 2.0.0
description: '[Planning] Use when you need to validate a plan with critical questions interview.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Force every assumption-laden plan decision and every preservation-critical behavior through explicit user confirmation BEFORE implementation — by interviewing the user with critical questions that validate assumptions and surface issues — so no unstated assumption silently reaches code.

**Summary:**

- Classify the plan first (Phase 0: bugfix/feature/migration/refactor/other) — the type weights which question categories fire, and any fix/bug/regression/broken/defect keyword makes the Preservation question BLOCKING (never skip it).
- The output is a real `AskUserQuestion` interview, not a self-answer: honor the `questions` MIN-MAX range from `## Plan Context`, give 2-4 concrete options per question, and treat the Preservation "Unsure" answer as BLOCKED → route to `/plan`.
- If the plan introduces new tech/packages, you MUST probe whether alternatives were evaluated before accepting the choice.
- Persist results by adding only a `## Validation Summary` (confirmed decisions + action items) to `plan.md` — NEVER edit phase files; close by offering implement/refine/skip via `AskUserQuestion`.

**Workflow:**

1. **Detect Plan Type** — Classify plan (bugfix/feature/migration/refactor) to weight question categories
2. **Read Plan** — Parse plan.md + phase files for decisions, assumptions, risks
3. **Extract Topics** — Scan architecture, assumptions, tradeoffs, risks, scope keywords
4. **Generate Questions** — Formulate concrete questions with 2-4 options each
5. **Interview User** — Present questions using configured count range
6. **Document Answers** — Add Validation Summary section to plan.md

**Key Rules:**

- MUST ATTENTION use `AskUserQuestion` — NEVER auto-decide on behalf of user
- NEVER ask about non-decision points — only genuine choices affecting implementation
- Bugfix plans ALWAYS trigger Preservation question (keywords: fix, bug, regression, broken, defect)
- NEVER modify phase files — only document what needs updating

## First Principle — Easy to Change

> **The success metric of every coding decision is _future change cost_.**
> DRY, SRP, abstraction, design patterns, naming, layering, tests — every
> technique exists to serve one goal: **making the next change cheaper**.

Evaluating code, refactor, test, abstraction, ask:
**does this make next change cheaper or more expensive?**

- Reject "best practices" raising change cost (premature abstraction,
  speculative generality, leaky indirection, ceremony without payoff).
- Name real enemies in findings: **coupling, hidden state, duplicated
  knowledge, unclear intent, irreversible decisions exposed too early**.
- Simpler design easy to change beats sophisticated design that isn't.

Apply this lens **before** invoking any specific rule, pattern, or checklist
below — if a downstream rule raises change cost, this principle wins.

---

## Phase 0: Detect Plan Type

Classify plan type BEFORE generating questions — drives question category weighting:

| Plan Type     | Detection                                                         | Mandatory Extra Categories            |
| ------------- | ----------------------------------------------------------------- | ------------------------------------- |
| **Bugfix**    | Title/frontmatter: `fix`, `bug`, `regression`, `broken`, `defect` | Preservation (BLOCKING)               |
| **Feature**   | New capability, no fix keywords                                   | Architecture, Assumptions, Test Specs |
| **Migration** | Schema change, EF migration, data move                            | Risks, Preservation, Scope            |
| **Refactor**  | Restructure/clean up, no behavior change                          | Preservation, Tradeoffs               |
| **Other**     | None of above                                                     | Architecture, Scope                   |

**Bugfix detection is BLOCKING** — NEVER skip Preservation question when fix/bug/regression/broken/defect keywords present.

## Plan Resolution

1. `$ARGUMENTS` provided → use that path
2. Check `## Plan Context` section → use active plan path
3. No plan found → ask user to specify path or run `/plan` first

## Configuration (from injected context)

Check `## Plan Context` section:

- `mode` — auto/prompt/off behavior
- `questions` — range like `3-8` (min-max)

Use as hard constraints.

## Workflow

### Step 1: Read Plan Files

Read plan directory:

- `plan.md` — overview + phases list
- `phase-*.md` — all phase files
- Flag: decision points, assumptions, risks, tradeoffs

### Step 2: Extract Question Topics

| Category         | Keywords                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------ |
| **Architecture** | approach, pattern, design, structure, database, API                                        |
| **Assumptions**  | assume, expect, should, will, must, default                                                |
| **Tradeoffs**    | tradeoff, vs, alternative, option, choice, either/or                                       |
| **Risks**        | risk, might, could fail, dependency, blocker, concern                                      |
| **Scope**        | phase, MVP, future, out of scope, nice to have                                             |
| **New Tech/Lib** | install, add package, new dependency, npm install, dotnet add, unfamiliar framework names  |
| **Test Specs**   | TC-, test case, coverage, TDD, test specification                                          |
| **Preservation** | auto-trigger on bugfix keywords in title/frontmatter — scan Preservation Inventory section |

### Step 3: Generate Questions

**Format rules:**

- 2-4 concrete options per question
- Mark recommended with "(Recommended)" suffix
- "Other" option automatic — do NOT add
- Surface implicit decisions

**Examples:**

```
Category: Architecture
Question: "How should validation results be persisted?"
Options:
1. Save to plan.md frontmatter (Recommended) — updates existing plan
2. Create validation-answers.md — separate answers file
3. Don't persist — ephemeral validation only
```

```
Category: Assumptions
Question: "Plan assumes API rate limiting not needed. Correct?"
Options:
1. Yes, not needed for MVP
2. No, add basic rate limiting now (Recommended)
3. Defer to Phase 2
```

```
Category: Preservation (MANDATORY when title/frontmatter: fix, bug, regression, broken, defect)
Question: "List 2-3 inputs where CURRENT code is correct. Will fix change behavior on any?"
Options (multi-select):
1. "Current code correct on: {input A}. Fix preserves behavior." (Recommended)
2. "Current code correct on: {input B}. Fix CHANGES behavior because: {justification}"
3. "Current code has NO preserved-correctness inputs — every input was broken" (rare; requires confirmation)
4. "Unsure — need to investigate" (STOP: run /plan preservation analysis)
```

**Follow-up rules:**

- Option 2 selected → `plan.md` Preservation Inventory MUST cite Preservation TC asserting new behavior is intended
- Option 4 selected → return BLOCKED status, recommend `/plan` before proceeding
- Option 3 selected → `AskUserQuestion` follow-up: "Confirm: current code has NO preserved invariant? [Yes, every input broken / No, missed some — re-investigate]"

### Step 4: Interview User

Use `AskUserQuestion` — NEVER skip or auto-answer.

**Rules:**

- Use question count from `## Plan Context` → `Validation: mode=X, questions=MIN-MAX`
- Group related questions (max 4 per tool call)
- Focus: assumptions, risks, tradeoffs, architecture
- MANDATORY IMPORTANT MUST ATTENTION: if plan introduces new tech/packages, ask: "Plan uses {lib}. Were alternatives evaluated? Confirm choice or research more?"

### Step 5: Document Answers

Add `## Validation Summary` to `plan.md`:

```markdown
## Validation Summary

**Validated:** {date}
**Questions asked:** {count}

### Confirmed Decisions

- {decision 1}: {user choice}
- {decision 2}: {user choice}

### Action Items

- [ ] {changes needed based on answers}
```

NEVER modify phase files — only document what needs updating.

## Output

After validation:

- Questions asked count
- Key decisions confirmed
- Items flagged for plan revision
- Recommendation: proceed to implementation OR revise plan first

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing, use `AskUserQuestion` to present:

- **"/feature-implement (Recommended)"** — Begin implementation with validated plan
- **"/refine"** — If plan needs PBI refinement first
- **"Skip, continue manually"** — User decides

---

> **[BLOCKING]** MUST ATTENTION use `AskUserQuestion` to interview user. Completing without asking ≥1 question = violation.

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. For simple tasks, AI MUST ATTENTION ask user whether to skip.

> **External Memory:** Complex/lengthy work → write findings + results to `plans/reports/` — prevents context loss.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim requires `file:line` proof or traced evidence with confidence % (>80% act, <80% verify first).

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

<!-- SYNC:plan-quality -->

> **Plan Quality** — Every plan phase MUST ATTENTION include test specifications.
>
> 1. Add `## Test Specifications` section with TC-{FEATURE}-{NNN} IDs to every phase file
> 2. Map every functional requirement to ≥1 TC (or explicit `TBD` with rationale)
> 3. TC IDs follow `TC-{FEATURE}-{NNN}` format — reference by ID, never embed full content
> 4. Before any new workflow step: call `TaskList` and re-read the phase file
> 5. On context compaction: call `TaskList` FIRST — never create duplicate tasks
> 6. Verify TC satisfaction per phase before marking complete (evidence must be `file:line`, not TBD)
>
> **Mode:** TDD-first → reference existing TCs with `Evidence: TBD`. Implement-first → use TBD → `/spec [mode=tests]` fills after.

<!-- /SYNC:plan-quality -->

<!-- SYNC:cross-service-check -->

> **Cross-Service Check** — Microservices/event-driven: MANDATORY before concluding investigation, plan, spec, or feature doc. Missing downstream consumer = silent regression.
>
> | Boundary            | Grep terms                                                                      |
> | ------------------- | ------------------------------------------------------------------------------- |
> | Event producers     | `Publish`, `Dispatch`, `Send`, `emit`, `EventBus`, `outbox`, `IntegrationEvent` |
> | Event consumers     | `Consumer`, `EventHandler`, `Subscribe`, `@EventListener`, `inbox`              |
> | Sagas/orchestration | `Saga`, `ProcessManager`, `Choreography`, `Workflow`, `Orchestrator`            |
> | Sync service calls  | HTTP/gRPC calls to/from other services                                          |
> | Shared contracts    | OpenAPI spec, proto, shared DTO — flag breaking changes                         |
> | Data ownership      | Other service reads/writes same table/collection → Shared-DB anti-pattern       |
>
> **Per touchpoint:** owner service · message name · consumers · risk (NONE / ADDITIVE / BREAKING).
>
> **BLOCKED until:** Producers scanned · Consumers scanned · Sagas checked · Contracts reviewed · Breaking-change risk flagged

<!-- /SYNC:cross-service-check -->

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

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.
  <!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:plan-quality:reminder -->

**IMPORTANT MUST ATTENTION** include `## Test Specifications` with TC IDs per phase. Call `TaskList` before creating new tasks.

<!-- /SYNC:plan-quality:reminder -->

<!-- SYNC:cross-service-check:reminder -->

**IMPORTANT MUST ATTENTION** microservices/event-driven: scan producers, consumers, sagas, contracts in task scope. Per touchpoint: owner · message · consumers · risk (NONE/ADDITIVE/BREAKING). Missing consumer = silent regression.

<!-- /SYNC:cross-service-check:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:sequential-thinking-protocol:reminder -->

**MUST ATTENTION** apply sequential-thinking — multi-step Thought N/M, REVISION/BRANCH/HYPOTHESIS markers, confidence % closer; see `/sequential-thinking` skill.

<!-- /SYNC:sequential-thinking-protocol:reminder -->

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

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Force every assumption-laden plan decision and every preservation-critical behavior through explicit user confirmation BEFORE implementation — by interviewing the user with critical questions that validate assumptions and surface issues — so no unstated assumption silently reaches code.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Nested Task Creation:** child skill still creates visible phase tasks; link parent when nested.
- **Task Tracking & External Report:** bootstrap task breakdown first; persist findings incrementally to `plans/reports/`.
- **Critical Thinking:** MUST ATTENTION apply critical + sequential thinking; cite proof; confidence >80% to act.
- **Sequential Thinking:** structured multi-step Thought N/M with REVISION/BRANCH/HYPOTHESIS markers and confidence closer.
- **Project Reference Docs:** read required project-reference docs before target work; always include `lessons.md`.
- **Understand Code First:** MUST ATTENTION read code and grep 3+ patterns before any modification.
- **Plan Quality:** include `## Test Specifications` with TC-{FEATURE}-{NNN} IDs per phase.
- **Cross-Service Check:** scan producers, consumers, sagas, contracts; flag breaking-change risk.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**IMPORTANT MUST ATTENTION** validate decisions with the user via `AskUserQuestion` — NEVER auto-decide or self-answer; completing without ≥1 question is a protocol violation — why: the user owns every assumption-laden choice, not the agent
**IMPORTANT MUST ATTENTION** detect plan type FIRST (Phase 0) BEFORE generating questions — bugfix keywords (fix, bug, regression, broken, defect) make the Preservation question BLOCKING, never skipped — why: detection drives which categories fire and the Preservation gate
**IMPORTANT MUST ATTENTION** NEVER modify phase files — persist results by adding ONLY a `## Validation Summary` (confirmed decisions + action items) to `plan.md` — why: phase files are the plan's source of truth and validation is a read-then-annotate pass

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting (including a task per file read); call `TaskList` first on context loss, never duplicate — why: resume existing tasks rather than re-plan after compaction
- **MANDATORY IMPORTANT MUST ATTENTION** honor the `questions` MIN-MAX range and `mode` from `## Plan Context` as hard constraints; give 2-4 concrete options per question, never go below min — why: the interview budget is configured, not improvised
- **MANDATORY IMPORTANT MUST ATTENTION** treat the Preservation "Unsure" answer as BLOCKED → return BLOCKED status and route to `/plan` preservation analysis before any implementation — why: an unverified preserved-correctness invariant is a silent regression risk
- **MANDATORY IMPORTANT MUST ATTENTION** if the plan introduces new tech/packages, probe whether alternatives were evaluated before accepting the choice — why: unevaluated dependency choices raise future change cost
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` proof or traced evidence with confidence % for every claim (>80% act, <80% verify first); admit uncertainty rather than present a guess as fact — why: speculation drives wrong validation questions
- **MANDATORY IMPORTANT MUST ATTENTION** search 3+ existing patterns and read the plan + phase files BEFORE generating questions — match the codebase's local conventions over generic framework defaults — why: questions grounded in actual code surface real decisions, not invented ones
- **MANDATORY IMPORTANT MUST ATTENTION** apply the Easy-to-Change lens before any rule below — flag decisions that raise future change cost (coupling, hidden state, duplicated knowledge, unclear intent, irreversible early choices)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review task to verify work quality

**Anti-Rationalization:**

| Evasion                            | Rebuttal                                                         |
| ---------------------------------- | ---------------------------------------------------------------- |
| "Plan is simple, skip validation"  | Simple plans still have implicit decisions. Apply anyway.        |
| "Already know the answers"         | Show user responses as proof. No responses = no validation.      |
| "Preservation doesn't apply here"  | If title has fix/bug/regression/broken/defect → ALWAYS applies.  |
| "Phase 0 not needed"               | Detection drives the Preservation gate. NEVER skip.              |
| "Only ask a few questions"         | Use the `questions` range from Plan Context. Never go below min. |
| "I'll just answer for the user"    | `AskUserQuestion` is mandatory. Self-answer = no validation.     |
| "New library is obviously fine"    | Probe whether alternatives were evaluated before accepting it.   |
| "I'll edit the phase files inline" | NEVER. Add only a `## Validation Summary` to `plan.md`.          |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

**IMPORTANT MUST ATTENTION** detect plan type (Phase 0) FIRST — bugfix keywords make Preservation BLOCKING.
**IMPORTANT MUST ATTENTION** validate with the user via `AskUserQuestion` — NEVER auto-decide.
**IMPORTANT MUST ATTENTION** NEVER modify phase files — add only a `## Validation Summary` to `plan.md`.

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.
