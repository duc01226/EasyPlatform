---
name: workflow-spec-archaeology
version: 2.0.0
description: '[Workflow] Trigger Spec Archaeology workflow — existing codebase → holistic scout → task-decomposed plan → per-module deep investigation → tech-agnostic specification bundle (domain model, business rules, API contracts, integration events, user journeys) → reimplementation-ready spec set for any AI agent or engineering team.'
disable-model-invocation: true
---

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> - **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> - **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> - **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> - **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> - **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> - **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> - **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> - **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> - **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> - **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:incremental-persistence -->

> **Incremental Result Persistence** — MANDATORY for all sub-agents or heavy inline steps processing >3 files.
>
> 1. **Before starting:** Create report file `plans/reports/{skill}-{date}-{slug}.md`
> 2. **After each file/section reviewed:** Append findings to report immediately — never hold in memory
> 3. **Return to main agent:** Summary only (per SYNC:subagent-return-contract) with `Full report:` path
> 4. **Main agent:** Reads report file only when resolving specific blockers
>
> **Why:** Context cutoff mid-execution loses ALL in-memory findings. Each disk write survives compaction. Partial results are better than no results.
>
> **Report naming:** `plans/reports/{skill-name}-{YYMMDD}-{HHmm}-{slug}.md`

<!-- /SYNC:incremental-persistence -->

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

<!-- /SYNC:subagent-return-contract -->

## Quick Summary

**Goal:** Reverse-engineer tech-agnostic spec bundle from existing codebase — reimplementation-ready output for any AI agent or engineering team.

**Workflow:** `/scout` → `/plan` (N×M tasks) → `/plan-review` → `/why-review` → `/plan-validate` → `/spec-archaeology` (+ Phase F) → `/review-artifact` → `/watzup` → `/workflow-end`

**Key Rules:**

- MUST ATTENTION TaskCreate one task per module × phase BEFORE extraction — verify TaskList count ≥ N×M
- 4+ modules → BLOCKING: spawn all sub-agents in ONE message — NEVER inline single-session
- Context compaction/session resume → `TaskList` FIRST, read completeness tracker, NEVER re-scout/re-plan
- All output tech-agnostic — NEVER framework names, language constructs, class names
- Every claim cites `[Source: file:line]` — mark `[UNVERIFIED]` not blank

---

Activate spec-archaeology workflow via `/workflow-start spec-archaeology`.

**Steps:**

```
/scout             → holistic codebase map — module registry, entry points, integration boundaries
                     (instruct /scout: produce Module Registry per spec-archaeology Step 1 format —
                      NOT a task-file list; output: specs/{date}-{system-name}/00-module-registry.md)
/plan              → decompose into per-module per-phase tasks (N modules × M phases = N×M tasks)
                     → verify TaskList count ≥ N×M before proceeding (task count gate)
/plan-review       → validate task breakdown and coverage completeness (N×M task count confirmed?)
/why-review        → validate approach: is spec-archaeology the right tool? any simpler path?
/plan-validate     → user confirms scope, module list, extraction phases, and task count
/spec-archaeology  → execute tasks: per-task investigate deeply → extract → write immediately
                     → includes Phase F: spec bundle assembly + README completeness index
/review-artifact   → quality review: source citations, tech-agnostic, completeness
                     → fresh sub-agent re-review gate after any gap found (max 2 rounds)
/watzup            → session summary: modules covered, files generated, open questions
/workflow-end
```

> **Scale routing (enforced during /plan):**
>
> - 1–3 modules → single-session extraction (all steps in one context)
> - 4–10 modules → sub-agent parallel extraction (one sub-agent per module, spawned in ONE message)
> - 10+ modules → incremental coverage (one module-group per session, completeness tracker maintained)

> **[BLOCKING SCALE GATE]** If `module_count ≥ 4` at the end of `/plan`: you **MUST** spawn sub-agents. Single-session inline extraction with 4+ modules is a workflow violation — do NOT proceed to `/spec-archaeology` without spawning module sub-agents.

> **[BLOCKING — Context Compaction / Session Resume]** At any session start or after context compaction:
>
> 1. `TaskList` FIRST — resume existing tasks, NEVER create duplicates
> 2. Read `specs/{date}-{system-name}/README.md` completeness table — skip already-extracted modules (✅)
> 3. NEVER re-run `/scout` or `/plan` in a resumed session

## When to Use

- **Re-implement on new tech stack** — full spec to brief any AI agent
- **Onboard new team** — spec bundle as knowledge handoff artifact
- **Compliance documentation** — prove system behavior in plain language
- **Tech migration** — tech-agnostic spec before writing new code
- **Generate future backlog** — spec bundle → PBIs via `product-discovery`
- **Verify design intent** — compare spec bundle against original vision
- **Clone/fork business logic** — AI agent needs reimplementation spec

## When NOT to Use

| Goal                            | Use Instead                             |
| ------------------------------- | --------------------------------------- |
| Understand one specific feature | `investigation`                         |
| Write tests for existing code   | `write-integration-test`                |
| Update existing docs            | `documentation`                         |
| Refactor or optimize            | `refactor` / `performance`              |
| No existing codebase            | `greenfield-init` / `product-discovery` |

## Key Mechanics

### 1. Scout → Module Registry

`/scout` maps entire codebase high-level before any module read. Capture: directory structure + layer boundaries; entry points (bootstrap, router, DI container); module catalog + responsibilities + file counts; cross-cutting concerns (auth, logging, error handling); data store ownership; integration boundaries (message bus, external clients, webhooks, scheduled jobs).

Output: `specs/{date}-{system-name}/00-module-registry.md` — mandatory plan foundation. **No plan without it.**

### 2. Plan → N×M Task Decomposition

`/plan` converts module registry → concrete task breakdown. `TaskCreate` EVERY task before extraction begins.

- **One task per module × phase** — 10 modules × 5 phases = 50 tasks minimum
- **≤50 files per task** — split large modules: "Business Rules: Orders (Part 1: Commands)", "(Part 2: Event Handlers)"
- **Dependency order** — Phase A (domain model) before Phase B (business rules) per module
- **Priority** — core domain modules first, infrastructure last

Output: `specs/{date}-{system-name}/extraction-plan.md`

### 3. Per-Task Deep Investigation

READ (grep → narrow → read) → TRACE (call chain, validators, triggers) → EXTRACT (this phase/module only) → WRITE (`[Source: file:line]` every claim) → VERIFY (mark `[UNVERIFIED]` without source) → COMPLETE

NEVER accumulate across tasks — write output after each. Primary safeguard against context overflow on large codebases.

### 4. Sub-Agent Parallel Extraction (4+ modules)

4+ modules → spawn one sub-agent per module in ONE message. Each receives: Module Registry + task list + output path. Sub-agents run phases A–E in parallel. Main context assembles final bundle.

Each sub-agent prompt MUST include: module name, task list, output path, tech-agnostic contract, SYNC protocols (critical-thinking, evidence-based, incremental-persistence, cross-scope boundary).

### 5. Quality Review Loop

`/review-artifact` checks: `[Source: file:line]` on every entity/operation/rule; zero tech-specific terms; complete state machine transitions; ≥1 error case per operation; all registry modules present.

Gap found → fix task → re-investigate ��� fix → spawn **fresh `code-reviewer` sub-agent** (max 2 rounds). PASS = zero `[UNVERIFIED]` without exclusion reason + zero tech terms. NEVER inline re-review — main agent rationalizes its own output.

### 6. Handoff at /workflow-end

Presents: spec bundle summary (N files, X modules, Y phases); completeness matrix; open questions (confidence <80%); next steps: `/product-discovery` (future backlog from spec), `/greenfield-init` (re-implementation plan), `/feature-docs` (expand individual features).

## Conditional Skip Rules

| Step               | Skip When                                                                |
| ------------------ | ------------------------------------------------------------------------ |
| Phase C (API)      | Scope is internal library with no public operations                      |
| Phase D (Events)   | System has no async messaging, no background jobs, no webhooks           |
| Phase E (Journeys) | System is backend-only with no user-facing UI flows                      |
| `/why-review`      | User has already confirmed approach; no alternative approaches available |

---

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting — one task per module per phase; verify TaskList count ≥ N×M before proceeding
- **MANDATORY IMPORTANT MUST ATTENTION** scout holistically FIRST — Module Registry MUST exist before plan creation
- **MANDATORY IMPORTANT MUST ATTENTION** plan decomposes big→small — every task ≤50 files in scope
- **MANDATORY IMPORTANT MUST ATTENTION** each task: read files → trace paths → extract → write output immediately (never batch)
- **MANDATORY IMPORTANT MUST ATTENTION** all output tech-agnostic — no framework names, no language constructs
- **MANDATORY IMPORTANT MUST ATTENTION** every claim cites `[Source: file:line]` — mark `[UNVERIFIED]` not blank
- **MANDATORY IMPORTANT MUST ATTENTION** 4+ modules → BLOCKING: must spawn sub-agents in ONE message; never inline single-session for 4+ modules
- **MANDATORY IMPORTANT MUST ATTENTION** context compaction / session resume → `TaskList` first, read completeness tracker, NEVER re-run scout or plan
- **MANDATORY IMPORTANT MUST ATTENTION** after any fix in `/review-artifact` → spawn fresh `code-reviewer` sub-agent — NEVER inline re-review

<!-- SYNC:critical-thinking-mindset:reminder -->

- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
      <!-- /SYNC:critical-thinking-mindset:reminder -->
      <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
    <!-- /SYNC:ai-mistake-prevention:reminder -->
