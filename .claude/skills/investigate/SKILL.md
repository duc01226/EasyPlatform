---
name: investigate
description: '[Fix & Debug] Use when you need to investigate and explain how existing features or logic work. Flag: --mode=explain produces a one-way developer-narrative explanation (Purpose → How → Why → Impact) tuned by coding level; use /understand for the standalone prompt-driven explainer.'
version: 2.2.1
---

## Quick Summary

**Goal:** Produce an evidence-backed understanding of how existing code works through READ-ONLY exploration with zero changes — every claim traced to `file:line` or explicitly marked "inferred" — so the next decision or change rests on verified system flow, never assumption.

**Summary:**

- Classify scope FIRST (Phase 0: quick / deep / debug / recommendation) — depth and deliverables (analysis file, validation chain) flow from this, so never skip straight to grepping.
- Graph is MANDATORY, not optional: the main agent MUST run at least one `code_graph` command on 2-3 key files before concluding — graph surfaces callers, bus consumers, and importers that grep alone misses (sub-agents cannot use graph).
- Stay strictly READ-ONLY and cite `file:line` for every claim; unverified statements MUST be marked "inferred", and recommending any code change forces the full validation chain (all impls/registrations/usages/cross-service impact + confidence declaration).
- `--mode=explain` only changes the deliverable (one-way developer narrative → git-ignored `tmp/understand/{branch}.md` ledger) — the same evidence gate, graph rule, and READ-ONLY constraint still bind; deep scope writes to `.ai/workspace/analysis/[feature]-investigation.md` and must be re-read in full before presenting.

**Workflow:**

1. **Phase 0: Classify** — Determine scope (quick / deep / debug / recommendation) before acting
2. **Discovery** — Search codebase for related files (Entities > Commands > Events > Controllers)
3. **Graph Expand** — Run graph queries on 2-3 key files (MANDATORY, main agent only)
4. **Knowledge Graph** — Read + document purpose, symbols, dependencies per file
5. **Flow Mapping** — Trace entry points through pipeline to exit points
6. **Analysis** — Extract business rules, validation, authorization, error handling
7. **Synthesis** — Write executive summary to `.ai/workspace/analysis/[feature]-investigation.md`
8. **Present** — Deliver structured findings, offer deeper dives

**Modes:**

- **Default (analysis)** — investigate for an engineer audience: structured findings + analysis file. Everything below applies.
- **`--mode=explain`** (developer narrative) — same READ-ONLY evidence gate, but the deliverable is a one-way developer explanation (Purpose → How → Why → Impact), tuned by coding level, written to a git-ignored ledger. See [Mode: Explain](#mode-explain-developer-narrative). Use `/understand [target]` when you want the standalone prompt-driven explainer instead of a full investigation run.

**Key Rules:**

- Strictly READ-ONLY — NEVER make code changes
- Every claim needs `file:line` proof — mark unverified as "inferred"
- MUST ATTENTION run at least ONE graph command on key files before concluding
- MUST ATTENTION Plan ToDo Task to READ `project-structure-reference.md` (if not found, search: project documentation, coding standards, architecture docs)

## Phase 0: Scope Classification

**Classify before acting** — route to correct depth:

| Scope              | Signals                                        | Depth                                                                                                                                                           |
| ------------------ | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Quick**          | Single feature/function, clear entry point     | grep → trace → answer (no analysis file needed)                                                                                                                 |
| **Deep**           | Multi-service, cross-boundary, ambiguous scope | Full workflow + knowledge graph template + analysis file                                                                                                        |
| **Debug**          | Error/crash/unexpected behavior                | Root-cause-debugging protocol above                                                                                                                             |
| **Recommendation** | Code change suggested (removal, refactor)      | Validation chain protocol below — MANDATORY                                                                                                                     |
| **Explain**        | `--mode=explain` flag                          | Investigation-local developer narrative — see [Mode: Explain](#mode-explain-developer-narrative). Use `/understand` for the standalone prompt-driven explainer. |

Quick scope: Skip knowledge graph template + analysis file. Grep → graph trace → present findings.
Deep scope: MUST ATTENTION write to `.ai/workspace/analysis/[feature]-investigation.md`.
Explain scope: same READ-ONLY evidence gate; deliverable is an in-chat developer narrative + a git-ignored ledger (NOT the analysis file).

## Investigation Mindset (NON-NEGOTIABLE)

**Skeptical. Every claim needs `file:line` traced proof. Confidence >80% to act.**

- NEVER assume code works as named — verify by reading actual implementations
- MUST ATTENTION include `file:line` for every finding; unproven claims MUST ATTENTION be marked "inferred"
- ALWAYS grep related usages, consumers, cross-service references — NEVER assume completeness
- ALWAYS trace actual call paths with evidence — NEVER rely on signatures alone

### Logical-ID Extraction & Business-Intent Rule (M3/M5)

See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M6)" for BLOCKING criteria. When extracting operations, business rules, or events into findings:

- Assign each extracted operation/rule/event a logical ID (FR-/BR- for operations and rules) as the PRIMARY identifier. Keep the `[Source: namespace/service/id]` abstract-anchor evidence (never physical code coordinates or repository-root paths — those live only in the provenance sidecar) as a SEPARATE carrier — never fold the source link into the rule statement itself (M3).
- For every rule, explain **WHY** it exists (the business intent / invariant it protects), not only **WHAT** the code does. State the rule in tech-agnostic business terms so the finding is reusable by a rebuild team on any stack (M5).

## Workflow

1. **Discovery** — Search for all related files. Priority: Entities > Commands/Queries > EventHandlers > Controllers > Consumers > Components.
2. **Graph Expand (MANDATORY — DO NOT SKIP)** — **YOU (main agent) MUST ATTENTION run graph queries YOURSELF** on key files from Step 1. Sub-agents CANNOT use graph — only you can. Pick 2-3 key files (entities, commands, bus messages):
    ```bash
    python .claude/scripts/code_graph connections <key_file> --json
    python .claude/scripts/code_graph query callers_of <FunctionName> --json
    python .claude/scripts/code_graph query importers_of <file_path> --json
    # "ambiguous" → search to disambiguate, retry with qualified name
    python .claude/scripts/code_graph search <keyword> --kind Function --json
    # Trace how two nodes connect
    python .claude/scripts/code_graph find-path <source> <target> --json
    # Filter by service, limit results
    python .claude/scripts/code_graph query callers_of <name> --limit 5 --filter "ServiceName" --json
    ```
    Graph reveals complete dependency network (callers, importers, tests, inheritance) grep alone misses. Also run `/graph-connect-api` for frontend-to-backend API mapping.
3. **Knowledge Graph** — Read + analyze each file (from grep + graph results). Document purpose, symbols, dependencies, data flow. Batch in groups of 10; update progress after each batch. Per-file template:

4. **Flow Mapping** — Trace entry points through processing pipeline to exit points. Map data transformations, persistence, side effects, cross-service boundaries.
5. **Analysis** — Extract business rules, validation, authorization, error handling. Document happy path AND edge cases.
6. **Synthesis** — Executive summary answering original question. Key files, patterns used, text-based flow diagrams.
7. **Present** — Structured output (see Output Format). Offer deeper dives on subtopics.

**If preceded by `/scout`:** Use Scout's numbered file list as analysis targets. Skip redundant discovery. Prioritize HIGH PRIORITY files.

## Investigation Techniques

### Discovery Search Patterns

Grep `{FeatureName}` combined with: `EventHandler`, `BackgroundJob`, `Consumer`, `Service`, `Component`.

**Priority order (stack-neutral strategy):** (1) Domain model (entities/aggregates) → (2) Use-cases (commands/queries) → (3) Event handlers (side-effect logic) → (4) Entry points (controllers/API/route handlers) → (5) Cross-service consumers (message/event subscribers) → (6) Background jobs/schedulers → (7) UI components/stores → (8) Services/helpers. _Concrete locators (folder names, file globs, framework markers) vary by stack — discover them from the project's structure reference + project config._

### Dependency Tracing

**Backend (trace these relationships — locator syntax per stack):** method/function callers (grep backend source files), dependency injectors (grep the interface/type in constructors or DI wiring), domain-event subscribers (the framework's domain-event handler type), cross-service message handlers (the cross-service message/event contract across services), repository/data-access usage (the repository/data-access interface).

**Frontend:** component users (grep the component selector in templates), service importers (grep the class in source files), store/state chains (state-effect → API call → response handler → state), routes (grep the component in routing files). _Concrete file globs and framework primitives: see the project's frontend reference + config._

### Data Flow Mapping

Document as: `[Entry] → [Validation] → [Processing] → [Persistence] → [Side Effects]`

**MUST ATTENTION trace:** (1) Entry points, (2) Processing pipeline, (3) Data transformations, (4) Persistence points, (5) Exit points/responses, (6) Cross-service message bus boundaries.

### Common Investigation Scenarios

| Question Type               | Steps                                                                                   |
| --------------------------- | --------------------------------------------------------------------------------------- |
| "How does X work?"          | Entry points → command/query handlers → entity changes → side effects                   |
| "Where is logic for Y?"     | Keywords in commands/queries/entities → event handlers → helpers → frontend stores      |
| "What happens when Z?"      | Identify trigger → trace handler chain → document side effects + error handling         |
| "Why does A behave like B?" | Find code path → identify decision points → check config/feature flags → document rules |

### Project Pattern Recognition

**Backend** (search for `backend-patterns-reference` in docs/): CQRS commands/queries, entity event handlers, message bus consumers, repository extensions, validation fluent API, authorization attributes.

**Frontend** (search for `frontend-patterns-reference` in docs/): component base classes, view-model/state store base, reactive data-fetch effects with loading/error state handling, API service base class.

### Graph Intelligence (MANDATORY when graph.db exists)

**MUST ATTENTION orchestrate grep → graph → grep dynamically:** (1) Grep key terms to find entry files, (2) Use `connections`/`batch-query`/`trace --direction both` to expand dependency network, (3) Grep again to verify content. `trace` follows ALL edge types including MESSAGE_BUS and TRIGGERS_EVENT.

```bash
python .claude/scripts/code_graph connections <file> --json     # Full picture
python .claude/scripts/code_graph query callers_of <name> --json
python .claude/scripts/code_graph query importers_of <file> --json
python .claude/scripts/code_graph query tests_for <name> --json
python .claude/scripts/code_graph batch-query <f1> <f2> --json
```

## Evidence Collection

**Deep scope — MANDATORY:** Write analysis to `.ai/workspace/analysis/[feature-name]-investigation.md`. MUST ATTENTION re-read ENTIRE file before presenting findings.

Structure: Metadata (original question) → Progress → File List → Knowledge Graph (per-file entries per SYNC:knowledge-graph-template) → End-to-Start Debugger Trace (when bug/fix/behavior-changing) → Data Flow → Findings.

**Rule:** Every 10 files → MUST ATTENTION update progress, re-check alignment with original question.

### Analysis Phases

**Comprehensive:** (1) Happy path, (2) Error paths, (3) Edge cases, (4) Authorization checks, (5) Validation per layer. Extract: core business rules, state transitions, side effects.

**Synthesis:** Executive summary (1-para answer, top 5-10 key files, patterns used) + step-by-step walkthrough with `file:line` references + flow diagrams.

### Output Format

MUST ATTENTION include: (1) Direct answer (1-2 paragraphs), (2) Step-by-step "How It Works" with `file:line` refs, (3) Key Files table, (4) Data Flow diagram, (5) "Want to Know More?" subtopics.

For bug, failed-verification, or behavior-changing investigations, MUST ATTENTION also include:

```markdown
### Debugger Trace: End -> Start

- Observed final state:
- Final reader/query/renderer/assertion:
- Backward hops: reader -> storage/projection/cache -> writer -> consumer/handler/job -> producer/origin
- Feeder paths scanned:
- Unknown or unverified paths:

### Hypothesis Matrix

| RC  | Hypothesis | Evidence for | Evidence against | Status | Verification |
| --- | ---------- | ------------ | ---------------- | ------ | ------------ |
```

### Guidelines

- **Evidence-based** — every claim needs code evidence; MUST ATTENTION mark unverified as "inferred"
- **Question-focused** — ALWAYS tie findings back to original question
- **Read-only** — NEVER suggest changes unless explicitly asked
- **Layered** — Start simple, offer deeper detail on request

## Related Skills

`scout` (pre-discovery) | `workflow-feature` (implementation) | `debug-investigate` (debugging) | `graph-query` (natural language queries)

---

## Mode: Explain (Developer Narrative)

**Trigger:** `/investigate --mode=explain [target]`. Manual-only — never auto-inserted into workflows. Use `/understand [target]` for the standalone prompt-driven explainer.

**What changes vs default investigate:** ONLY the deliverable's audience, shape, and write target. The evidence gate is **identical and NON-NEGOTIABLE** — strictly READ-ONLY on code & plans, every concrete claim cites `file:line`, at least ONE graph command runs on key files before concluding, confidence >80% to assert. Explain mode NEVER relaxes any of these. If a narrative point lacks `file:line` proof, mark it "inferred" exactly as in default mode.

**Goal:** make the **developer** understand the work via a clear, detailed, **one-way** explanation of **WHAT** it is, its **PURPOSE** (why it exists), **HOW** it works (mechanics), and **WHY this way** (trade-offs + rejected alternatives). AI derives WHAT to explain from the prompt. No fixed agenda; scope flexes to whatever is named.

### Contract (read first)

- **DERIVE SCOPE FROM THE PROMPT.** No target named → default to the **current working context**: active tasks (`TaskList`) + working-tree changes (`git diff --name-only` + untracked via `git ls-files --others --exclude-standard`) + active plan / latest `/watzup` summary if present.
- **NEVER ASK THE USER A QUESTION.** Strictly one-way: no teach-back, no quiz, no `AskUserQuestion`, no ambiguity question, no comprehension gate. Infer the most likely target, state the assumption in one line, proceed. (The pre-skill workflow-detection gate is a separate concern, already exempt when the developer explicitly invokes the skill.)
- **OPT-IN, NEVER BLOCKS.** Explain and end. Never traps the developer in a loop; never gates commit/implementation/workflow progress.
- **ALWAYS EXPLAIN IN FULL — REGARDLESS OF CODING LEVEL.** Always cover purpose + how + why. Coding level only tunes vocabulary/analogy density (ELI5 ↔ terse-for-experts) — it NEVER decides _whether_ to explain and NEVER trims the three sections.
- **EXPLAIN THE WHOLE SCOPE, LEAD WITH THE NON-OBVIOUS.** Cover everything in scope, but order by leverage — open with highest-blast-radius / highest-future-change-cost / most-surprising parts; treat boilerplate/CRUD briefly. Nothing silently omitted.
- **WRITES ONLY to a project-root temp folder.** Never edits source or plan files; never writes the `.ai/workspace/analysis/...` analysis file. Its only write target is the ledger at `tmp/understand/{branch}.md` (see Step E3).

### Step E0 — Resolve scope & read the style dial

1. **Derive scope from the prompt:**

    | Prompt signal                                          | Scope to explain                                                                                             |
    | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
    | Bare invocation, no target named                       | **Default: current working context** — active tasks + working-tree changes + active plan / latest `/watzup`. |
    | Names a change set / PR / "what I just did"            | The diff and its rationale.                                                                                  |
    | Names a plan / "the approach" / "before we build"      | The active plan: problem, approach, rejected alternatives, risks, phase order.                               |
    | Names a subsystem / file / feature / "how does X work" | That code path — read files, run a graph trace, explain the flow.                                            |
    | Names a single decision / "why X over Y"               | That decision and its trade-offs.                                                                            |
    | Names a concept / bug / error                          | That concept or root cause.                                                                                  |
    | Ambiguous / multiple plausible targets                 | **Do NOT ask.** Infer most likely (default current context), state the assumption in one line, proceed.      |

    State the resolved scope in one line before continuing (e.g. `Explaining: current working changes (3 files) + active task #42`).

2. **Read the style dial (NOT a skip gate).** Resolve coding level (first found wins): env `CK_CODING_LEVEL` → `.claude/.ck.json` `codingLevel` → default `3`. Level tunes how the explanation reads only — it NEVER drops purpose/how/why. `5/-1` God Mode (terse, lead with the non-obvious trade-off) · `4` Tech Lead (concise, design trade-offs) · `3` Senior (balanced) · `2` Mid (fuller mechanics) · `1` Junior (WHY before HOW, step-by-step) · `0` ELI5 (one concept at a time, analogies). Note the level in one line, then explain. Do not offer a skip; do not ask anything.

### Step E1 — Gather the material (proportional to scope)

- **Current working context:** `TaskList`; `git diff --name-only` (+ untracked); active plan + latest `/watzup`. Extract: what's being worked on, what changed, why, new behavior.
- **A plan:** read `plan.md` + `phase-*.md`. Extract: problem, chosen approach, rejected alternatives, design decisions, risks, phase order.
- **A subsystem / "how does X work":** read the files; run `python .claude/scripts/code_graph trace <file> --direction both --json`. Extract: entry points, data flow, key invariants.
- **A single decision:** the relevant code + rationale (comments, git blame, the plan's alternatives section).

Don't read the whole repo to explain one decision.

### Step E2 — Order topics by leverage

Cover the whole scope; use this only to ORDER. **Blast radius** (run `/graph-blast-radius` or graph trace on key files — high reach → explain first, deepest) · **Future-change-cost** (schema, public contract, cross-service message, shared/framework layer → high priority) · **Surprise** (anything a competent engineer would NOT guess — call out explicitly). Boilerplate/generated/mechanical renames get a one-line mention.

### Step E3 — Maintain the understanding ledger

> **[HARD RULE] Write the ledger ONLY to a project-root temp folder — NEVER inside `.claude/`, the source tree, or any tracked path.**
>
> Path: `tmp/understand/{branch}.md` (use `temp/understand/{branch}.md` if the project already uses `temp/`). Create the `understand/` subdir if absent. `{branch}` = current git branch with `/` → `-`. Ensure the temp folder is git-ignored.
>
> **[ANNOUNCE — the chat is the deliverable]** The understanding lives in the **in-chat explanation**, not the file. Whenever you write/append the ledger, state its path inline (`Understanding ledger updated → tmp/understand/{branch}.md`). NEVER let the explanation exist only inside the temp file.

Append (never overwrite) a checklist with three groups: **Problem** (why it exists, prior limitation, the branches) · **Solution** (design, business logic, edge cases, why this over alternatives) · **Impact** (what/who changes, blast radius, follow-ups).

### Step E4 — Explain: Purpose → How → Why (the deliverable)

Deliver in-chat, in this order, for **every** level (depth/vocabulary tuned per E0; all sections always present). Cite `file:line` for every concrete claim.

1. **WHAT** — one-line orientation: name the thing and where it lives.
2. **PURPOSE (why-it-exists)** — what problem it solves; the prior limitation / alternative branch that made it necessary. Lead here.
3. **HOW (mechanics)** — walk the flow: entry points, data flow, key invariants, what calls what (use the graph trace). Show code paths + business logic + handled edge cases.
4. **WHY-this-way (trade-offs)** — why this over the obvious alternative(s); what it cost, what it bought, what is now expensive to reverse. Surface non-obvious decisions explicitly ("we did X instead of Y because Z").
5. **IMPACT (blast radius & follow-ups)** — what/who changes, upstream/downstream reach, open follow-ups.

Proactively offer a simpler restatement/analogy for any dense point. Responding to a developer's `eli5`/`elii` follow-up is fine — what's forbidden is _you_ posing questions to them.

### Step E5 — Recap & close (no quiz, no loop)

Mark ledger items `explained`. Close with a 2–3 line recap (purpose in one sentence, key mechanic in one, highest-leverage trade-off / blast-radius note in one). End there. Do NOT quiz, do NOT ask the developer to restate, do NOT loop, NEVER block the next step.

**NOT for:** investigation/docs/design/research where nothing was built or planned to understand; forcing comprehension as a hard gate; reviewing code quality (use `/code-review`, `/review-changes`).

**Anti-Rationalization:** "Senior dev, skip it" → NEVER skip by level. · "I'll quiz them" → one-way only, never ask. · "Ambiguous — I'll ask which" → infer + state assumption, proceed. · "Dump everything" → derive scope first, order by leverage. · "Skip trade-offs" → WHY-this-way is mandatory. · "Drop ledger by the skill" → only `tmp/understand/{branch}.md`. · "Write the doc and move on silently" → the chat is the deliverable; announce the ledger path.

---

## Investigation & Recommendation Protocol

Applies when recommending code changes (removal, refactoring, replacement). MUST ATTENTION complete full validation chain.

### Validation Chain (NEVER skip steps)

**NEVER recommend code changes without completing ALL steps:**

1. Interface/API identified → 2. ALL implementations found → 3. ALL registrations traced → 4. ALL usage sites verified → 5. Cross-service impact (ALL services) → 6. Impact assessment → 7. Confidence declaration → **ONLY THEN** output recommendation.

**If ANY step incomplete → STOP.** State "Insufficient evidence to recommend."

### Breaking Change Risk Matrix

| Risk       | Criteria                                                      | Required Evidence                                              |
| ---------- | ------------------------------------------------------------- | -------------------------------------------------------------- |
| **HIGH**   | Removing registrations, deleting classes, changing interfaces | Full usage trace + impact + cross-service check (all services) |
| **MEDIUM** | Refactoring methods, changing signatures                      | Usage trace + test verification + cross-service check          |
| **LOW**    | Renaming variables, formatting, comments                      | Code review only                                               |

### Removal Checklist (ALL MUST ATTENTION pass)

- [ ] No static references (`rg "ClassName" {configured-source-roots}` returns no live references)
- [ ] No string literals / dynamic invocations (reflection, factory, message bus)
- [ ] No DI registrations (`services.Add*<ClassName>`)
- [ ] No config references (appsettings, env vars)
- [ ] No test dependencies
- [ ] Cross-service impact checked (ALL microservices)

**Incomplete checklist → state:** `Confidence: <90% — did not verify [missing items]`

### Evidence Hierarchy

(1) Code evidence (grep/read) → (2) Test evidence → (3) Documentation → (4) Inference. Recommendations based on inference alone FORBIDDEN — MUST ATTENTION upgrade to code evidence.

### Confidence Levels

**95-100%** full trace + all services | **80-94%** main paths verified | **60-79%** partially traced | **<60% DO NOT RECOMMEND**

**Format:** `Confidence: 85% — Verified main usage in ServiceC, did not check ServiceA/ServiceB`

### Service Comparison Pattern

Find working reference → compare implementations → identify differences → verify WHY each difference exists → recommend based on proven pattern, NEVER assumptions.

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

- `docs/project-reference/domain-entities-reference.md` — domain entity catalog, relationships, cross-service sync (when task involves business entities/models).

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

<!-- SYNC:knowledge-graph-template -->

    > **Knowledge Graph Template** — For each analyzed file, document: filePath, type (entity, command, query, event handler, controller, consumer, component, store, service, or repository-specific equivalent), architecturalPattern, content summary, symbols, dependencies, businessContext, referenceFiles, relevanceScore (1-10), evidenceLevel (verified/inferred), abstractions, and moduleContext. Investigation fields: entryPoints, outputPoints, dataTransformations, errorScenarios. Messaging fields: messageName, messageProducers, crossBoundaryIntegration. UI fields: componentHierarchy, stateManagementStores, dataBindingPatterns, validationStrategies.

<!-- /SYNC:knowledge-graph-template -->

<!-- SYNC:root-cause-debugging -->

> **Root Cause Debugging** — Systematic approach, never guess-and-check.
>
> 1. **Reproduce** — Confirm the issue exists with evidence (error message, stack trace, screenshot)
> 2. **Isolate** — Narrow to specific file/function/line using binary search + graph trace
> 3. **Trace** — Follow data flow from input to failure point. Read actual code, don't infer.
> 4. **Hypothesize** — Form theory with confidence %. State what evidence supports/contradicts it
> 5. **Verify** — Test hypothesis with targeted grep/read. One variable at a time.
> 6. **Fix** — Address root cause, not symptoms. Verify fix doesn't break callers via graph `connections`
>
> **NEVER:** Guess without evidence. Fix symptoms instead of cause. Skip reproduction step.

<!-- /SYNC:root-cause-debugging -->

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

<!-- SYNC:understand-code-first:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.
  <!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:graph-assisted-investigation:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** run at least ONE graph command on key files when graph.db exists. Pattern: grep → graph trace → grep verify.
  <!-- /SYNC:graph-assisted-investigation:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.
  <!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:knowledge-graph-template:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** document per-file: type, pattern, symbols, dependencies, relevanceScore, evidenceLevel.
  <!-- /SYNC:knowledge-graph-template:reminder -->

<!-- SYNC:fix-layer-accountability:reminder -->

**IMPORTANT MUST ATTENTION** trace full data flow and fix at the owning layer, not the crash site. Audit all access sites before adding `?.`.

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

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Produce evidence-backed understanding of how existing code works — strictly READ-ONLY, every claim traced to `file:line` or explicitly marked "inferred" — so the next decision or change rests on verified system flow, never assumption.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries; each line is a signpost — the canonical body above binds):**

- **End-to-Start Debugger Trace:** start at observed end state, trace backward, build hypothesis matrix before fixing.
- **Knowledge Graph Template:** document per-file type, pattern, symbols, dependencies, relevance, evidence level.
- **Root Cause Debugging:** reproduce, isolate, trace, hypothesize, verify, fix cause — never guess-and-check.
- **Nested Task Creation:** expand child phase tasks; link parent workflow row when nested.
- **Project Reference Docs Guide:** read required project docs first; conventions override generic defaults.
- **Task Tracking & External Report:** bootstrap task breakdown; persist plan/review findings incrementally to disk.
- **Critical Thinking:** trace every claim, confidence >80% to act, never present guess as fact.
- **Sequential Thinking:** multi-step Thought N/M with revision/branch/hypothesis markers and confidence closer.
- **Understand Code First:** MUST ATTENTION read code and grep 3+ patterns before writing, planning, or fixing.
- **Graph-Assisted Investigation:** run one graph command on key files when graph.db exists.
- **Cross-Service Check:** scan producers, consumers, sagas, contracts — missing consumer is silent regression.
- **Fix-Layer Accountability:** trace full data flow, fix at owning layer, not crash site.
- **Source/Test Drift Check:** when source behavior changes, inspect affected tests for intended-behavior alignment.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**IMPORTANT MUST ATTENTION** stay strictly READ-ONLY — NEVER edit code, plans, or specs during investigation; deliver findings only — why: investigation that mutates state stops being investigation and corrupts the baseline the next step trusts.
**IMPORTANT MUST ATTENTION** cite `file:line` for every claim; mark unverified statements "inferred" — confidence >80% to act, <60% DO NOT recommend — why: an unmarked guess reads as fact and propagates into the next decision.
**IMPORTANT MUST ATTENTION** run at least ONE `code_graph` command on 2-3 key files before concluding — graph surfaces callers, bus consumers, importers grep alone misses (sub-agents cannot use graph — only the main agent) — why: grep sees text, not the call/event/import edges that define real reach.

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting; mark one `in_progress`, complete each immediately after its evidence lands.
- **MANDATORY IMPORTANT MUST ATTENTION** Phase 0: classify scope (quick / deep / debug / recommendation) before acting — depth, analysis file, and validation chain all flow from this; DECLARE scope before skipping any step.
- **MANDATORY IMPORTANT MUST ATTENTION** read required project docs first (always `lessons.md`; `project-structure-reference.md` for architecture) — project conventions override generic framework assumptions — why: local patterns differ from framework defaults and silently invalidate generic reasoning.
- **MANDATORY IMPORTANT MUST ATTENTION** grep 3+ similar patterns and read the actual implementations before concluding — NEVER assume code works as named; verify by reading — why: a name promises behavior the body may not deliver.
- **MANDATORY IMPORTANT MUST ATTENTION** evaluate pattern FIT before reusing a nearby example — confirm the new context shares the same base classes, scope, lifetime, and preconditions — why: closest example ≠ matching constraints.
- **MANDATORY IMPORTANT MUST ATTENTION** deep scope → write analysis to `.ai/workspace/analysis/[feature]-investigation.md`; re-read the ENTIRE file before presenting (never work from memory after a long context).
- **MANDATORY IMPORTANT MUST ATTENTION** recommendation scope → complete ALL validation chain steps (impls → registrations → usages → cross-service impact → confidence) before any code-change suggestion; ANY step incomplete → STOP and state "Insufficient evidence to recommend."
- **MANDATORY IMPORTANT MUST ATTENTION** microservices/event-driven → scan producers, consumers, sagas, and shared contracts in scope — a missed downstream consumer is a silent regression.
- **MANDATORY IMPORTANT MUST ATTENTION** bug/behavior-changing investigation → run the End-to-Start Debugger Trace (observed final state → backward hops → feeder paths → hypothesis matrix → owning fix layer) before concluding cause; ask "whose responsibility?" and locate the invariant owner, not the crash site.

**Anti-Rationalization:**

| Evasion                                            | Rebuttal                                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------ |
| "Simple investigation, skip graph"                 | Graph reveals callers + bus consumers grep misses. Run it anyway.              |
| "Already grepped, enough evidence"                 | Show `file:line` proof. No citation = no evidence; unverified = mark inferred. |
| "Quick task, skip TaskCreate"                      | Still need tracking. Create tasks, mark done immediately.                      |
| "Recommendation is obvious, skip validation chain" | Risk matrix applies regardless of confidence. Complete ALL steps or STOP.      |
| "Deep scope wastes time for this"                  | Classify first. If quick, fine — but DECLARE scope before skipping steps.      |
| "Nearby example is close enough, copy it"          | Closest ≠ matching preconditions. Verify base class, scope, lifetime first.    |
| "I'll just fix what I found while here"            | READ-ONLY. Investigation never mutates; hand findings to the fix step.         |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

**IMPORTANT MUST ATTENTION** READ-ONLY always · cite `file:line` or mark "inferred" · run ONE graph command before concluding — these three bind every scope and mode.
