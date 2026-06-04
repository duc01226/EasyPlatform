---
name: workflow-spec-to-pbi
version: 2.0.0
description: '[Workflow] Use when activating the Spec to PBI Backlog workflow to convert canonical tech-free Feature Specs into complete, prioritized, dependency-aware PBIs and stories.'
disable-model-invocation: true
---

## Quick Summary

**Goal:** Convert one or more canonical 8-section Feature Specs into a complete, sprint-ready PBI backlog.

**Canonical input:** `docs/specs/{Bucket}/README.{Feature}.md` (one tech-free 8-section Feature Spec per capability). There is no separate A-E engineering bundle — code is the technical source of truth.

**Primary outputs:**

- `team-artifacts/pbis/{date}-pbi-{slug}.md` for each generated PBI.
- `team-artifacts/backlog/spec-to-pbi-{date}-backlog.md` with priority order and dependency graph.
- `plans/reports/spec-to-pbi-{date}-{bucket}.md` with coverage matrix and unresolved questions.

**Universal Rules:**

- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- **[BLOCKING] Tech-agnostic output:** PBI / backlog / report prose stays tech-agnostic per `docs/project-reference/spec-principles.md` §3 — no framework/product/language/design-pattern names; source paths and class names appear ONLY in evidence fields (`**Evidence**`, `[Source:]`), frontmatter, and Mermaid.
- **[BLOCKING] Inherit M1-M5 + logical-ID carry:** See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M6)" for BLOCKING criteria. Every generated PBI MUST satisfy M1-M5. Carry each requirement's logical ID (`FR-`/`BR-`) from the spec's requirement/rule statements into the PBI as the PRIMARY citation spine, keeping the spec's `[Source: namespace/service/id]` abstract-anchor evidence as the SECONDARY carrier (KEEP it). Generated acceptance criteria stay tech-agnostic and observable — one valid interpretation, named failure modes, no implementation details.

## When to Use

- User wants to create all PBIs from an existing Feature Spec (or a bucket of them).
- User wants to split a very large Feature Spec into small sprint-ready PBIs.
- User wants a dependency-aware and priority-ranked backlog from `docs/specs/`.
- User wants shared/foundation tasks identified before feature PBIs.

## When Not to Use

- Raw product vision without any Feature Spec -> use `/workflow-product-discovery`.
- One informal idea -> use `/workflow-idea-to-pbi`.
- Spec creation/update only -> use `/workflow-spec-driven-dev`.
- Implementation after PBIs are ready -> use `/workflow-feature` or `/workflow-big-feature`.

## Protocol

### 1. Activate

Run `/start-workflow workflow-spec-to-pbi` with the user's prompt as context.

### 2. Load Spec Context

Locate and read, per target capability:

- `docs/specs/{Bucket}/INDEX.md` — the bucket catalog (which capabilities exist)
- `docs/specs/{Bucket}/README.{Feature}.md` — the canonical 8-section Feature Spec. Each PBI is decomposed from its sections:
    - §1 Overview / §3 User Stories & Acceptance Criteria → PBI scope + acceptance criteria
    - §4 Business Rules (`BR-`) + §3 (`US-`/`AC-`) → logical-ID citation spine (M3)
    - §5 Domain Model (Mermaid ERD) → entity/aggregate impact for `## Domain Impact`
    - §6 Process Flows → vertical-slice story boundaries
    - §7 Permissions & Roles → access-control acceptance criteria
    - §8 Test Specifications (`TC-`) → expected TC categories per PBI

If the spec path is missing or ambiguous, ask the user for the exact bucket / Feature Spec path before generating PBIs.

### 3. Freshness Gate

Run `/spec-index` in audit mode before PBI generation.

- If stale behavior is found, run/update the impacted spec sections before generating PBIs.
- If only structural/doc formatting is stale, record the risk and continue.
- If critical domain/API/business-rule sections are stale, stop and ask whether to update specs first.

### 4. Coverage Matrix

Create a matrix with one row per independently deliverable item:

| Spec Source      | Capability     | Feature/Operation | Domain Impact             | Shared Dependency | PBI Type                                      | Status  |
| ---------------- | -------------- | ----------------- | ------------------------- | ----------------- | --------------------------------------------- | ------- |
| `{Feature §sec}` | `{capability}` | `{feature}`       | entity/state/event/API/UI | yes/no            | feature/foundation/shared/migration/test-data | planned |

Every source feature/operation must map to exactly one of:

- Generated PBI
- Shared/foundation PBI
- Existing PBI reference
- Explicit out-of-scope decision with reason

### 5. Large Spec Decomposition

Apply these scale rules before creating PBIs:

| Scope                      | Required Breakdown                                                    |
| -------------------------- | --------------------------------------------------------------------- |
| 1-3 capabilities           | Process inline with one task per capability and feature group         |
| 4-10 capabilities          | Split by capability, then feature/operation group                     |
| 10+ capabilities           | Incremental capability-group batches with coverage matrix checkpoints |
| Any PBI > 8 story points   | Split with SPIDR until each PBI is <= 8 story points                  |
| Cross-cutting prerequisite | Create shared/foundation PBI before dependent feature PBIs            |

### 6. Domain Analysis Gate

Run `/domain-analysis` when any spec item includes:

- New or changed entities, aggregates, value objects, or ownership boundaries
- State machines or lifecycle transitions
- Cross-service event ownership or synchronization
- Data migration or seed/test-data needs

Record domain findings in each affected PBI under `## Domain Impact`.

### 7. PBI Generation Loop

For each matrix row that needs a new PBI:

1. Run `/refine` to create the PBI artifact.
2. Run `/review-artifact --type=pbi`.
3. Run `/story` to create vertical-slice stories.
4. Run `/review-artifact --type=story`.
5. Run `/pbi-challenge`.
6. Run `/dor-gate`.
7. Run `/pbi-mockup` only when UI is involved.

Each PBI MUST include:

- Logical requirement IDs (`FR-`/`BR-`) carried from the spec as the primary citation spine (M3).
- Source spec references with `file:section` evidence (secondary, re-anchorable carrier — KEEP).
- GIVEN/WHEN/THEN acceptance criteria — tech-agnostic and observable (M1/M4).
- Story points and complexity.
- Dependencies table with `must-before`, `can-parallel`, `blocked-by`, or `independent`.
- Priority input data for `/prioritize`.
- Test specification needs, including expected TC categories.
- Domain impact and shared/foundation task references.

### 8. Cross-PBI Prioritization

After all PBI loops finish, run `/prioritize` once across the full generated set.

The backlog artifact MUST include:

- Rank and recommended implementation order.
- Dependency graph and first-do/blocked/defer groups.
- Foundation/shared tasks first when other PBIs depend on them.
- RICE or MoSCoW rationale.
- DoR status per PBI.
- Remaining open questions.

### 8.5 Near-Final Documentation Synchronization

Run `/docs-update` after `/prioritize` and before `/workflow-end`.

Purpose:

- Sync generated PBIs/stories/backlog outputs back into the canonical Feature Specs where applicable.
- Sync Feature Spec §8 Test Specifications with the generated TC needs.
- Verify Feature Specs, derived bucket `INDEX.md`, and TDD/spec docs do not drift after PBI generation.
- Record skipped sub-phases explicitly when no impacted docs exist.

### 9. Completion Criteria

Workflow can close only when:

- Every spec source item is represented in the coverage matrix.
- Every generated PBI has dependency and priority fields.
- Shared/foundation PBIs are explicit and ordered before dependents.
- Domain-analysis findings are attached where domain changes are implied.
- The final backlog artifact ranks all PBIs and explains what to do first.
- `/docs-update` has run as the near-final sync gate, with Feature Specs (§8) and derived bucket indexes either updated or explicitly marked unchanged.

**IMPORTANT MANDATORY Steps:** /scout -> /spec-index -> /domain-analysis -> /why-review -> /plan -> /plan-review -> /plan-validate -> /why-review -> /refine -> /why-review -> /review-artifact --type=pbi -> /story -> /why-review -> /review-artifact --type=story -> /pbi-challenge -> /dor-gate -> /pbi-mockup -> /prioritize -> /docs-update -> /workflow-end -> /watzup

> **[BLOCKING]** Each step MUST invoke its Skill tool. Marking a workflow step completed without skill invocation is a workflow violation.

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

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.
> **Keep domain concepts out of generic/shared/infrastructure layers.** A reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. The leak compiles and runs, so it passes review silently while coupling the "reusable" layer to one consumer. Push domain fields/logic down into the consumer via subclass or composition.

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

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

## Closing Reminders

- **MUST** use the canonical Feature Specs as input; do not invent unrelated opportunities.
- **MUST** decompose big Feature Specs into small PBIs before story generation.
- **MUST** include dependency, priority, domain impact, and shared-task details.
- **MUST** write artifacts incrementally after each capability/feature.
- **MUST** run `/prioritize` once at the end across all generated PBIs.
- **MUST** run `/docs-update` after `/prioritize` and before `/workflow-end` to keep specs, feature docs, and TDD/spec docs synchronized.
