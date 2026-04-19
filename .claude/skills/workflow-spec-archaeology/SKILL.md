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

Activate the `spec-archaeology` workflow. Run `/workflow-start spec-archaeology` with the user's prompt as context.

**Steps:**

```
/scout             → holistic codebase map — module registry, entry points, integration boundaries
/plan              → decompose into per-module per-phase tasks (N modules × M phases = N×M tasks)
/plan-review       → validate task breakdown and coverage completeness
/plan-validate     → user confirms scope, module list, and extraction phases
/why-review        → validate approach: is spec-archaeology the right tool? any simpler path?
/spec-archaeology  → execute tasks: per-task investigate deeply → extract → write immediately
/review-artifact   → quality review of generated spec files (source citations, tech-agnostic, completeness)
/docs-update       → assemble final spec bundle README and completeness index
/watzup            → session summary: modules covered, files generated, open questions
/workflow-end
```

> **Scale routing (auto-applied during /plan):**
>
> - 1–3 modules → single-session extraction (all steps in one context)
> - 4–10 modules → sub-agent parallel extraction (one sub-agent per module)
> - 10+ modules → incremental coverage (one module-group per session, completeness tracker maintained)

## When to Use

- You want to **re-implement the same product on a new tech stack** — need the full spec to brief any AI agent
- You need to **onboard a new team** with zero knowledge of the existing codebase — spec bundle is the handoff artifact
- You are doing **compliance documentation** — need to prove what the system does in plain language
- You are doing a **tech migration** — need a tech-agnostic spec before writing any new code
- You want to **generate a future-state backlog from an existing system** — spec bundle → PBIs via `product-discovery` workflow
- You want to **verify the system matches its intended design** — compare spec bundle against original product vision
- An AI agent needs to **build a clone or fork** of the system's business logic

## When NOT to Use

- You want to understand one specific feature → use `investigation` workflow
- You want to write test cases for existing code → use `write-integration-test` workflow
- You want to update existing documentation → use `documentation` workflow
- You want to refactor or optimize the code → use `refactor` or `performance` workflow
- You have NO existing codebase → use `greenfield-init` or `product-discovery` instead

## Key Mechanics

### 1. Scout First — Holistic Codebase Map

The `/scout` step maps the entire codebase at a high level before any module is read in detail:

- Directory structure and layer boundaries
- Entry points (bootstrap, router/handler registration, DI container)
- Module/service enumeration with responsibilities and file counts
- Cross-cutting concerns (auth, logging, error handling)
- Data store access points and ownership
- Integration boundaries (message bus, external clients, webhook handlers, scheduled jobs)

**Output:** `specs/{date}-{system-name}/00-module-registry.md`

This registry is the mandatory foundation for the plan. No plan without it.

### 2. Plan = Task Decomposition (Big → Small)

The `/plan` step converts the module registry into a concrete task breakdown:

- **One task per module per extraction phase** — for a 10-module system with 5 phases: 50 tasks
- **Scope each task to ≤50 files** — large modules split into sub-parts (e.g., "Business Rules: Orders (Part 1: Commands)", "Part 2: Event Handlers")
- **Dependency-order tasks** — Phase A (domain model) before Phase B (business rules) for the same module
- **Priority order** — core domain modules first, infrastructure/utility last

`TaskCreate` is called for EVERY task before extraction begins. The `/plan-review` confirms no modules are missing from the registry. `/plan-validate` gets user confirmation.

**Output:** `specs/{date}-{system-name}/extraction-plan.md`

### 3. Per-Task Deep Investigation

Each task follows a strict protocol:

1. **Read** — grep to narrow file set, then read all files in scope
2. **Trace** — trace code paths: what calls what, what validates what, what triggers what
3. **Extract** — extract spec content for this phase/module only
4. **Write** — write immediately to spec file with `[Source: file:line]` on every claim
5. **Verify** — re-read spec against source; mark `[UNVERIFIED]` for anything without a traceable source
6. **Complete** — mark task done, move to next

**Never accumulate across tasks.** Write output after each task. This is the primary safeguard against context window overrun on large codebases.

### 4. Sub-Agent Parallel Extraction (4+ Modules)

When the plan identifies 4+ modules, spawn sub-agents:

- One sub-agent per module (or group of closely related small modules)
- Each sub-agent receives: Module Registry, its assigned task list, output path
- Sub-agents run phases A–E in parallel
- Main context assembles the final bundle from sub-agent outputs

Each sub-agent prompt includes: assigned module name, task list, output file path, and the tech-agnostic output contract.

### 5. Quality Review Loop

After all extraction tasks complete, `/review-artifact` runs a quality pass:

- Every entity/operation/rule has a `[Source: file:line]`
- No tech-specific terms in any spec document
- All state machines have complete transitions
- All operations have at least one error case documented
- All modules from registry are present in the spec

Any failure creates a fix task → re-investigate → fix → re-check. Loop continues until all checks pass.

### 6. Handoff at /workflow-end

AI presents:

- Spec bundle summary: N spec files, X modules covered, Y extraction phases completed
- Completeness matrix: which phases ran for which modules
- Open questions: anything that couldn't be extracted with confidence ≥80%
- Recommended next steps:
    - `/product-discovery` — use spec bundle as input to generate a future-state backlog
    - `/greenfield-init` — start re-implementation planning from the spec bundle
    - `/feature-docs` — expand individual features into full detailed docs

## Conditional Skip Rules

| Step               | Skip When                                                                |
| ------------------ | ------------------------------------------------------------------------ |
| Phase C (API)      | Scope is internal library with no public operations                      |
| Phase D (Events)   | System has no async messaging, no background jobs, no webhooks           |
| Phase E (Journeys) | System is backend-only with no user-facing UI flows                      |
| `/why-review`      | User has already confirmed approach; no alternative approaches available |

---

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting — created at plan time, one task per module per phase
- **MANDATORY IMPORTANT MUST ATTENTION** scout holistically FIRST — module registry MUST exist before plan creation
- **MANDATORY IMPORTANT MUST ATTENTION** plan decomposes big→small — every task ≤50 files in scope
- **MANDATORY IMPORTANT MUST ATTENTION** each task: read files → trace paths → extract → write output immediately (never batch)
- **MANDATORY IMPORTANT MUST ATTENTION** all output tech-agnostic — no framework names, no language constructs
- **MANDATORY IMPORTANT MUST ATTENTION** every claim cites `[Source: file:line]` — mark `[UNVERIFIED]` not blank

        <!-- SYNC:critical-thinking-mindset:reminder -->

- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
  <!-- /SYNC:critical-thinking-mindset:reminder -->
  <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
  <!-- /SYNC:ai-mistake-prevention:reminder -->
