# `/plan --mode=validate` — critical-questions plan validation reference

> Loaded by `plan/SKILL.md`'s Mode Dispatch when invoked as `/plan --mode=validate [plan-path]`, or by its Standalone Validation Chain right after a standalone plan is saved. Invoked directly, this contract REPLACES default plan creation for the invocation: interview the user about a finished plan, record the answers on `plan.md`, stop. Chained, it runs the same interview on the plan just saved and returns to the chain. Either way the interview itself never rewrites the plan or its phase files. As a workflow step that validates a plan written earlier in the same run, it ends by applying the answers through `plan/SKILL.md` → Standalone Validation Chain step 2 (Apply the answers), which owns those edits, so the plan that executes carries every confirmed decision.

> **[BLOCKING]** Run declared steps in order. NEVER skip, reorder, or merge without explicit user approval. Inside a workflow run, `/start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step/sub-skill, update todo tracking: `in_progress` at start, `completed` at end.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or an explicit skip reason.
> **[BLOCKING]** If Task tools unavailable, maintain an equivalent step tracker with the same status transitions.

## Contents

- [Quick Summary](#quick-summary)
- [First Principle — Easy to Change · Easy to Scale · Easy to Maintain](#first-principle--easy-to-change--easy-to-scale--easy-to-maintain)
- [Phase 0: Detect Plan Type](#phase-0-detect-plan-type)
- [Plan Resolution](#plan-resolution)
- [Phase 0.5: Applicability / Plan Gate](#phase-05-applicability--plan-gate)
- [Configuration (from injected context)](#configuration-from-injected-context)
- [Workflow](#workflow)
- [Output](#output)
- [Next Steps](#next-steps)
- [Mode protocols](#mode-protocols)
- [Prompt-Enhance Closing Anchors](#prompt-enhance-closing-anchors)
- [Closing Reminders](#closing-reminders)

## Quick Summary

**Goal:** Force every assumption-laden plan decision and every preservation-critical behavior through explicit user confirmation BEFORE implementation — by interviewing the user with critical questions that validate assumptions and surface issues — so no unstated assumption silently reaches code.

**Summary:**

- **Purpose:** validate a finished plan via a critical-questions interview so every assumption-laden decision and every preservation-critical behavior is user-confirmed BEFORE implementation — no unstated assumption silently reaches code.
- **Main steps (run in order):** Phase 0 Detect Plan Type → resolve plan path (`$ARGUMENTS` / `## Plan Context` / ask) → load `mode` + `questions` range (a round size, never an interview cap) → Phase 0.5 resolve Applicability / Plan Gate → Step 1 Read `plan.md` + all `phase-*.md`, flag decisions/assumptions/risks/tradeoffs → Step 2 Extract topics across 9 categories (Applicability, Architecture, Assumptions, Tradeoffs, Risks, Scope, New Tech/Lib, Test Specs, Preservation) → Step 3 Generate decision cards (2-4 concrete options each with what it gives and costs, a reasoned recommendation, surface implicit decisions, plus probes of the plan's Quality Gates & Concerns Checklist) → Step 3.5 Brief the user on what the plan will do → Step 4 Interview via `ask user question tool` (≤4 per call) in dependency-ordered rounds until every material decision is asked → Step 5 Play back and document answers → offer implement/refine/skip (direct invocation only; a chained run returns to the plan skill).
- **Phase 0 weights everything:** plan type (bugfix/feature/migration/refactor/other) decides which question categories fire; any fix/bug/regression/broken/defect keyword makes the Preservation question BLOCKING — never skip it.
- **The output is a REAL interview, not a self-answer:** brief the user on the plan before the first question, ask EVERY material decision as a self-contained decision card (2-4 concrete options, what each gives and costs, a reasoned recommendation), use the `questions` MIN-MAX range as a round size and never as a cap, treat the Preservation "Unsure" answer as BLOCKED → route to `/plan`; if the plan adds new tech/packages, probe whether alternatives were evaluated before accepting the choice.
- **Persist results narrowly:** add ONLY a `## Validation Summary` (confirmed decisions + action items) to `plan.md` — NEVER edit phase files; a direct invocation closes by offering implement/refine/skip via `ask user question tool`, a chained run returns to the plan skill without that prompt.
- **Applicability is mandatory for every plan:** read `.claude/skills/shared/product-roadmap-contract.md`, verify the plan's branch-specific `## Plan Gate`, and ask the owner to confirm the embedded slice/decomposition, explicit roadmap outcome, framework technical outcome, or EXEMPT boundary plus non-goals, scenario proof, commands, evidence, and approval. `BLOCKED`, `OPEN`, `MISSING`, or `REQUIRED` cannot be silently upgraded.

**Workflow:**

1. **Detect Plan Type** — Classify plan (bugfix/feature/migration/refactor) to weight question categories
2. **Read Plan** — Parse plan.md + phase files for decisions, assumptions, risks
3. **Extract Topics** — Scan architecture, assumptions, tradeoffs, risks, scope keywords
4. **Generate Questions** — Write each decision as a card: what is decided, why it matters, 2-4 options with pros and cons, a reasoned recommendation
5. **Brief User** — Show what the plan will do and the context the answers need, before the first question
6. **Interview User** — Ask in dependency-ordered rounds until every material decision is asked
7. **Document Answers** — Play the answers back, then add Validation Summary section to plan.md

**Key Rules:**

- MUST ATTENTION use `ask user question tool` — NEVER auto-decide on behalf of user — why: the user owns every assumption-laden choice, not the agent
- Ask ONLY about genuine choices affecting implementation — NEVER about non-decision points — why: noise questions burn the interview budget and erode trust
- Brief the user BEFORE the first question and make every question a self-contained decision card — why: a user who must open the plan to answer will guess or rubber-stamp
- Ask EVERY material decision; the `questions` range sizes a round, never the interview — why: a decision dropped to fit a number reaches code unconfirmed
- Bugfix plans ALWAYS trigger the Preservation question (keywords: fix, bug, regression, broken, defect) — why: an unverified preserved-correctness invariant is a silent regression
- Persist via a `## Validation Summary` on `plan.md` — NEVER modify phase files — why: phase files are the plan's source of truth; validation is a read-then-annotate pass
- For embedded, explicit-roadmap, framework/library, or EXEMPT plans, include the final applicability status and exact owning paths in that same summary; use each branch only when the plan records its required evidence and owner.

## First Principle — Easy to Change · Easy to Scale · Easy to Maintain

> The full gate is `SYNC:core-engineering-principles` (a guide line in `plan/SKILL.md`; a hook delivers its text); its closing digest ends this file.

---

## Phase 0: Detect Plan Type

Classify plan type BEFORE generating questions; it drives category weighting:

| Plan Type     | Detection                                                         | Mandatory Extra Categories            |
| ------------- | ----------------------------------------------------------------- | ------------------------------------- |
| **Bugfix**    | Title/frontmatter: `fix`, `bug`, `regression`, `broken`, `defect` | Preservation (BLOCKING)               |
| **Feature**   | New capability, no fix keywords                                   | Architecture, Assumptions, Test Specs |
| **Migration** | Schema change, EF migration, data move                            | Risks, Preservation, Scope            |
| **Refactor**  | Restructure/clean up, no behavior change                          | Preservation, Tradeoffs               |
| **Other**     | None of above                                                     | Architecture, Scope                   |

**Bugfix detection is BLOCKING** — NEVER skip Preservation question when fix/bug/regression/broken/defect keywords present.

## Plan Resolution

1. Chained from a standalone plan creation → use the plan path that creation just saved (a workflow plan step that runs the chain, because its workflow lists no validate step, counts as one)
2. `$ARGUMENTS` provided (the path after the mode flag) → use that path
3. Else use the active path from `## Plan Context`
4. No plan → ask user for a path or run `/plan` first

## Phase 0.5: Applicability / Plan Gate

Before extracting technical questions, classify the plan's branch.

- Embedded large-idea: read the owning task/spec; verify complete `large_idea_decomposition`, selected slice, non-goals/deferred owners, and conditional scenario artifact when needed. Do not require the product roadmap (default `docs/product-roadmap.md`; a `docsRoots.productRoadmap.path` entry in `docs/project-config.json` overrides the path) or a product milestone.
- Explicit roadmap: read the product roadmap (default `docs/product-roadmap.md`; a `docsRoots.productRoadmap.path` entry in `docs/project-config.json` overrides the path), selected milestone scope brief, and `scenario-analysis.md`.
- Framework/library: read technical scope, operational scenarios, generated-carrier evidence, and commands.
- Verify one `## Plan Gate` in `plan.md`: matching branch/outcome/boundaries; explicit non-goals; lifecycle terms when applicable; branch decision state; known or explicitly inapplicable skeleton/configuration; build/test/run commands; redacted evidence; `Human approval: APPROVED`.
- Missing upstream artifacts or `BLOCKED`/`OPEN`/`MISSING`/`REQUIRED` values create a blocking Applicability question. Do not implement or recommend `implement` while unresolved.
- Isolated brownfield/bugfix: verify the shared contract's EXEMPT branch: scope brief and plan reason/owner, required sibling scenario (for a light-profile plan, the inline evidence in `shared/product-roadmap-contract.md` → Light-profile evidence satisfies both), explicit `EXEMPT` roadmap/milestone, explicit `N/A` product-decision rationale, known commands/evidence/approval. Retain preservation/spec/test/review questions.

## Configuration (from injected context)

Check `## Plan Context` section; when it is absent, read the effective `plan.validation` settings, which merge the user, project and checkout settings files (the later one wins), with `node -e "console.log(JSON.stringify(require('./.claude/hooks/lib/ck-config-loader.cjs').loadConfig().plan.validation))"`; the default range is `3-8`:

- `mode` — `auto` | `prompt` | `off`: decides only whether a standalone plan creation starts this interview; a workflow plan step that runs the chain counts as one (`plan/SKILL.md` → Standalone Validation Chain: `auto` runs it, `prompt` asks first, `off` skips it). A direct `--mode=validate` invocation and a `/plan --mode=validate` workflow step always run it, and inside a workflow the setting never skips the Plan Gate approval question.
- `questions` — MIN-MAX range (e.g. `3-8`)

MAX is the most questions in one round, and rounds continue until every material decision is asked. MIN asks you to look wider: with fewer than MIN genuine decisions, ask those and record `below-MIN: only N real decisions surfaced` — never invent a filler question.

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
| **Product Readiness** | roadmap-applicable or EXEMPT plan — scan the applicable `## Plan Gate` branch, scope/scenario refs, non-goals, definitions, evidence, and human approval |

### Step 3: Generate Questions

**Quality-gates probes (BLOCKING — read `references/plan-quality-checklist.md` in full first; its Validate duty owns them).** When the plan has a `## Quality Gates & Concerns Checklist`, ask about it as genuine decisions, each with 2-4 concrete options: which gate is most likely to fail and what would prevent it; what evidence would change a verdict (a PASS expectation or a NO row); which NO row was marked too quickly and what would make it YES; which open concern has no settling step. A plan with no checklist gets one blocking question: add a task-derived checklist now or accept the exemption. Validate never edits the plan beyond `## Validation Summary`: record the answer there — "add now" becomes an action item routed to `/plan` (which authors the section), "accept the exemption" is recorded as the owner's accepted exemption. Count these inside the `questions` range of the round that asks them; never add a question that only restates the plan.

**Format rules — every question is a decision card the user can answer without opening the plan** (card fields: Decision Interview protocol rule 4, inline below):

- Name the plan section the decision comes from; cite evidence for what the plan assumes now (plan section, `file:line`, spec section)
- 2-4 concrete options per question; for each option state what it gives, what it costs and what or who it affects
- Mark recommended with "(Recommended)" suffix, put it first, and give the reason plus what would change the recommendation
- "Other" option automatic — do NOT add
- Surface implicit decisions
- A decision with a single reading any competent reader shares, proved by cited evidence, is not asked: record it under `### Assumptions Not Asked` with that evidence

For a roadmap-applicable plan, ask a Product Readiness question before lower-level choices:

> Does the plan implement the owning slice/outcome or technical boundary exactly, with the stated non-goals, lifecycle definitions where applicable, scenario proof, known skeleton/commands, redacted evidence, and human approval?

Offer concrete choices such as: **Yes, approve the Plan Gate (Recommended)**; **No, revise the scope/plan**; **A product decision remains open**; **This plan is an explicitly accepted isolated-change exemption**. Never answer this question from the plan author's confidence alone.

**Examples:**

```
Category: Architecture
Deciding: where validation results are stored (plan.md, "Important technical decisions")
Why it matters: the executor reads confirmed decisions there; a second file can drift from the plan
Plan assumes now: results go into plan.md; no alternative recorded
Options:
1. In plan.md (Recommended) — gives: one file the executor already reads · costs: a longer plan.md · why: nothing to keep in sync; change if several plans share one answer set
2. Separate validation-answers.md — gives: a short plan.md · costs: two files that can disagree
3. Not stored — gives: nothing to maintain · costs: answers lost after this session
Reversible: yes, a text move
```

```
Category: Assumptions
Deciding: whether the first release rate-limits the API (plan.md, "Outcome and boundaries")
Why it matters: one client can exhaust the service; adding a limit later changes a public contract
Plan assumes now: no rate limiting; no evidence given
Options:
1. Add basic rate limiting now (Recommended) — gives: protection from day one · costs: one more phase · why: the endpoint is public; change this if only internal callers exist
2. Not in the first release — gives: a smaller release · costs: outage risk, and a contract change later
3. Defer to a named later phase — gives: the smaller release with a dated follow-up · costs: the same risk until then
Reversible: adding a limit later breaks callers that assumed none
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
- Option 3 selected → `ask user question tool` follow-up: "Confirm: current code has NO preserved invariant? [Yes, every input broken / No, missed some — re-investigate]"

### Step 3.5: Brief the User (BLOCKING — before the first question)

Before the first `ask user question tool` call, show this briefing in the conversation, in plain language, built from the plan and nothing invented:

- **Goal** — the outcome and for whom, with the plan path
- **What will be done** — the phases in order, one line each: what it produces, the areas it touches
- **Scope** — in, non-goals, deferred work with its owner, what is not yet specified
- **Decisions already taken** — choice, why, the alternative given up and its cost
- **Assumptions** — what the plan takes for granted that the user has not confirmed
- **Risks** — main risks, what would force a re-plan, anything hard to undo
- **Proof** — the tests, gates and evidence that prove completion
- **State** — Plan Gate branch and approval; anything `BLOCKED`, `OPEN`, `MISSING` or `REQUIRED`
- **This interview** — how many decisions, in how many rounds, on which topics

Short enough to read in a couple of minutes, complete enough that the user never opens the plan to answer; add a small table or diagram when a flow, data shape or option comparison is clearer that way. Never ask a question whose context the briefing or its own card does not supply.

### Step 4: Interview User

> **Decision log:** inside a workflow, read the run's `## Decisions` first (`/start-workflow` → Step Execution Protocol, Decision log): ask only what it leaves open or new evidence reopened, cite reused answers instead of asking again, and append every new answer.

Use `ask user question tool` — NEVER skip or auto-answer.

**Rules:**

- Run Step 3.5 first, then ask in rounds (protocol rule 3); the `questions` range from Configuration sizes one round, never the interview
- Group related questions (max 4 per tool call); a round larger than one call continues in the next call
- Show a card's context in the conversation just before the call when it does not fit the question text
- Tell the user how many decisions remain, then ask the next round until none remains
- The user may stop at any round: record every unasked card as an unconfirmed assumption in the Validation Summary, never as confirmed
- Focus: assumptions, risks, tradeoffs, architecture
- MANDATORY IMPORTANT MUST ATTENTION: if plan introduces new tech/packages, ask: "Plan uses {lib}. Were alternatives evaluated? Confirm choice or research more?"

### Step 5: Document Answers

First play the answers back in one list — decision → chosen option → what changes in the plan — so the user can catch a misread answer. Then add `## Validation Summary` to `plan.md`:

```markdown
## Validation Summary

**Validated:** {date}
**Questions asked:** {count} in {rounds} round(s) {add `below-MIN: only N real decisions surfaced` when that applies}

### Applicability

- **Branch:** DECOMPOSITION-EMBEDDED | EXPLICIT-ROADMAP | FRAMEWORK-LIBRARY | EXEMPT | BLOCKED
- **Owning artifact / roadmap:** `{paths}` or `NOT APPLICABLE — embedded/framework/EXEMPT`
- **Slice / milestone / technical outcome:** `{ID and outcome}`
- **Scope handoff / scenarios:** `{paths or conditional N/A}`
- **Plan Gate:** DECOMPOSITION-EMBEDDED | READY | FRAMEWORK-LIBRARY | EXEMPT | BLOCKED
- **Human approval:** APPROVED | REQUIRED

### Confirmed Decisions

- {decision 1}: {user choice}
- {decision 2}: {user choice}

### Assumptions Not Asked

- {decision left unasked}: {assumed value} — {why: obvious from {evidence} | the user stopped the interview}

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

> **Inside a workflow:** when this skill runs as a step of an active workflow, skip the prompts in this section and return the result — the workflow's next step decides what runs (`/start-workflow` → Step Execution Protocol, Workflow-step mode).

**Chained from a standalone plan creation:** present none of the options below. Return the `## Validation Summary` to the Standalone Validation Chain in `plan/SKILL.md`, which applies the action items and closes with no further question. A workflow plan step that runs the chain counts as chained.

**MANDATORY IMPORTANT MUST ATTENTION** after completing a direct `--mode=validate` invocation, use `ask user question tool` to present:

- **"/feature-implement (Recommended)"** — Begin implementation with validated plan
- **"/work-item --mode=refine"** — If plan needs task refinement first
- **"Skip, continue manually"** — User decides

---

> **[BLOCKING]** MUST ATTENTION use `ask user question tool` to interview user. Completing without asking ≥1 question = violation.

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting. Keep task depth proportional to the work.

> **External Memory:** Complex/lengthy work → write findings + results to `tmp/reports/` — prevents context loss.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim requires `file:line` proof or traced evidence with confidence % (>80% act, <80% verify first).

## Mode protocols

The protocols below apply to this mode only; their full text is inline so this reference is self-contained. The `plan` skill already carries `core-engineering-principles`, `cross-service-check` and `plan-quality`.


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
> **Stop conditions:** confidence <70% on any critical decision → stop and escalate via ask user question tool (70-80% → verify first) · ≥3 revisions on same thought → re-frame the problem · branch count >3 → split into sub-task.
>
> **Implicit mode:** apply methodology internally without visible markers when adding markers would clutter the response (routine work where reasoning aids accuracy).

<!-- /SYNC:sequential-thinking-protocol -->

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

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:plan-quality:reminder -->

**MUST ATTENTION** Plan at decision-and-boundary altitude: resolve `specArtifacts`; map behavior to existing or planned test owners without fabricating future evidence; name bounded executor discovery; author tests with implementation; run suites only at the final verify gate after all implementation and static review; list a task-specific quality-gates checklist (gate · applies · verification · evidence · owner phase) before the phases.

<!-- /SYNC:plan-quality:reminder -->

<!-- SYNC:cross-service-check:reminder -->

**IMPORTANT MUST ATTENTION** microservices/event-driven: scan producers, consumers, sagas, contracts in task scope. Per touchpoint: owner · message · consumers · risk (NONE/ADDITIVE/BREAKING). Missing consumer = silent regression.

<!-- /SYNC:cross-service-check:reminder -->

<!-- SYNC:sequential-thinking-protocol:reminder -->

**MUST ATTENTION** use structured reasoning for complex or ambiguous work, implicitly when visible markers would clutter. Verify hypotheses, revise assumptions, and close with confidence, assumptions, open questions and a concrete next action.

<!-- /SYNC:sequential-thinking-protocol:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->


## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this mode; NEVER skip, reorder, or merge steps without explicit user approval; inside a workflow run, `/start-workflow` → Workflow-step mode bounds this
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Force every assumption-laden plan decision and every preservation-critical behavior through explicit user confirmation BEFORE implementation — by interviewing the user with critical questions that validate assumptions and surface issues — so no unstated assumption silently reaches code.

**IMPORTANT MUST ATTENTION Main steps:** detect plan type → resolve the plan and applicability gate → read plan/phase files → extract decision topics → brief the user → ask every material decision in rounds → play back and document confirmed answers → offer implement/refine/skip (direct invocation only; a chained run returns to the plan skill).

**IMPORTANT MUST ATTENTION Applicability:** validate the embedded decomposition/slice evidence, explicit roadmap milestone chain, framework technical evidence, or EXEMPT reason/owner plus non-goals, definitions, scenario proof where applicable, skeleton/commands, redacted evidence, and human approval before offering implementation; unresolved intent or evidence is BLOCKED.

**Protocols in force (concise digest of the SYNC/shared blocks this mode carries):**

- **Nested Task Creation:** child skill still creates visible phase tasks; link parent when nested.
- **Task Tracking & External Report:** bootstrap task breakdown first; persist findings incrementally to `tmp/reports/`.
- **Sequential Thinking:** structured multi-step Thought N/M with REVISION/BRANCH/HYPOTHESIS markers and confidence closer.
- **Understand Code First:** MUST ATTENTION read code and grep 3+ patterns before any modification.
- **Plan Quality:** include `## Test Specifications` with TC-{FEATURE}-{NNN} IDs per phase.
- **Cross-Service Check:** scan producers, consumers, sagas, contracts; flag breaking-change risk.

**IMPORTANT MUST ATTENTION** run the main steps IN ORDER — Phase 0 Detect Plan Type → resolve plan path → load `mode` + `questions` range → Phase 0.5 Product Readiness / Plan Gate → Step 1 Read `plan.md` + all `phase-*.md` (flag decisions/assumptions/risks/tradeoffs) → Step 2 Extract topics (9 categories) → Step 3 Generate decision cards (2-4 options each, pros and cons, a reasoned recommendation) → Step 3.5 Brief the user on the plan → Step 4 Interview via `ask user question tool` (≤4 per call) in rounds until every material decision is asked → Step 5 Play back and document answers → offer implement/refine/skip (direct invocation only) — why: the pipeline IS the work; never collapse or skip a step from memory

**IMPORTANT MUST ATTENTION** validate decisions with the user via `ask user question tool` — NEVER auto-decide or self-answer; completing without ≥1 question is a protocol violation — why: the user owns every assumption-laden choice, not the agent
**IMPORTANT MUST ATTENTION** detect plan type FIRST (Phase 0) BEFORE generating questions — bugfix keywords (fix, bug, regression, broken, defect) make the Preservation question BLOCKING, never skipped — why: detection drives which categories fire and the Preservation gate
**IMPORTANT MUST ATTENTION** NEVER modify phase files — persist results by adding ONLY a `## Validation Summary` (confirmed decisions + action items) to `plan.md` — why: phase files are the plan's source of truth and validation is a read-then-annotate pass

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting; call `TaskList` first on context loss, never duplicate — why: resume existing tasks rather than re-plan after compaction
- **MANDATORY IMPORTANT MUST ATTENTION** brief the user on the plan before the first question, then ask EVERY material decision as a decision card (2-4 concrete options, what each gives and costs, a reasoned recommendation); the `questions` MIN-MAX range sizes a round, never the interview; never invent a filler question — why: a user who lacks context rubber-stamps, and a decision dropped to fit a number reaches code unconfirmed
- **MANDATORY IMPORTANT MUST ATTENTION** treat the Preservation "Unsure" answer as BLOCKED → return BLOCKED status and route to `/plan` preservation analysis before any implementation — why: an unverified preserved-correctness invariant is a silent regression risk
- **MANDATORY IMPORTANT MUST ATTENTION** if the plan introduces new tech/packages, probe whether alternatives were evaluated before accepting the choice — why: unevaluated dependency choices raise future change cost
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` proof or traced evidence with confidence % for every claim (>80% act, <80% verify first); admit uncertainty rather than present a guess as fact — why: speculation drives wrong validation questions
- **MANDATORY IMPORTANT MUST ATTENTION** search 3+ existing patterns and read the plan + phase files BEFORE generating questions — match the codebase's local conventions over generic framework defaults — why: questions grounded in actual code surface real decisions, not invented ones
- **MANDATORY IMPORTANT MUST ATTENTION** apply the Easy-to-Change lens before any rule below — flag decisions that raise future change cost (coupling, hidden state, duplicated knowledge, unclear intent, irreversible early choices)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review task to verify work quality

**Anti-Rationalization:**

| Evasion                            | Rebuttal                                                            |
| ---------------------------------- | ------------------------------------------------------------------- |
| "Plan is simple, skip validation"  | Simple plans still have implicit decisions. Apply anyway.           |
| "Already know the answers"         | Show user responses as proof. No responses = no validation.         |
| "Preservation doesn't apply here"  | If title has fix/bug/regression/broken/defect → ALWAYS applies.     |
| "Phase 0 not needed"               | Detection drives the Preservation gate. NEVER skip.                 |
| "Only ask a few questions"         | Ask every material decision. The range sizes a round, not the interview. |
| "The user can read the plan"       | Brief first. A user who must open the plan to answer will guess.    |
| "The options speak for themselves" | State what each gives and costs, the recommendation and why.        |
| "I'll just answer for the user"    | `ask user question tool` is mandatory. Self-answer = no validation.        |
| "New library is obviously fine"    | Probe whether alternatives were evaluated before accepting it.      |
| "I'll edit the phase files inline" | NEVER. Add only a `## Validation Summary` to `plan.md`.             |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

**IMPORTANT MUST ATTENTION** detect plan type (Phase 0) FIRST — bugfix keywords make Preservation BLOCKING.
**IMPORTANT MUST ATTENTION** validate with the user via `ask user question tool` — NEVER auto-decide.
**IMPORTANT MUST ATTENTION** NEVER modify phase files — add only a `## Validation Summary` to `plan.md`.

<!-- SYNC:core-engineering-principles:reminder -->

**MUST ATTENTION** Core Engineering Principles — every plan, implementation and review must be **Easy to change** (reuse first, one owner per rule, interfaces/adapters at volatile boundaries, no speculative abstraction) · **Easy to scale** (extend by addition, bounded growth, explicit boundaries, sized to the project's real profile) · **Easy to maintain** (intent-named tests that fail when the rule breaks across happy/error/edge paths; harness green locally and in CI). Before done: next change → how many edit sites? 10× → what breaks? which test goes red?

<!-- /SYNC:core-engineering-principles:reminder -->
