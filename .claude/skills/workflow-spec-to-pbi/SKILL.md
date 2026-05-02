---
name: workflow-spec-to-pbi
version: 1.0.0
description: '[Workflow] Trigger Spec to PBI Backlog workflow - convert an existing engineering spec bundle into complete, prioritized, dependency-aware PBIs and stories.'
disable-model-invocation: true
---

**IMPORTANT MANDATORY Steps:** /scout -> /spec-discovery -> /domain-analysis -> /why-review -> /plan -> /why-review -> /plan-review -> /why-review -> /plan-validate -> /why-review -> /refine -> /why-review -> /refine-review -> /story -> /why-review -> /story-review -> /pbi-challenge -> /dor-gate -> /pbi-mockup -> /prioritize -> /docs-update -> /watzup -> /workflow-end

> **[BLOCKING]** Each step MUST invoke its Skill tool. Marking a workflow step completed without skill invocation is a workflow violation.

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

**Goal:** Convert an existing engineering spec bundle into a complete, sprint-ready PBI backlog.

**Canonical input:** `docs/specs/{app-bucket}/{system-name}/`

**Primary outputs:**

- `team-artifacts/pbis/{date}-pbi-{slug}.md` for each generated PBI.
- `team-artifacts/backlog/spec-to-pbi-{date}-backlog.md` with priority order and dependency graph.
- `plans/reports/spec-to-pbi-{date}-{system-name}.md` with coverage matrix and unresolved questions.

## When to Use

- User wants to create all PBIs from an existing engineering spec.
- User wants to split a very large spec into small sprint-ready PBIs.
- User wants a dependency-aware and priority-ranked backlog from `docs/specs/`.
- User wants shared/foundation tasks identified before feature PBIs.

## When Not to Use

- Raw product vision without a spec bundle -> use `/workflow-product-discovery`.
- One informal idea -> use `/workflow-idea-to-pbi`.
- Spec creation/update only -> use `/workflow-spec-driven-dev`.
- Implementation after PBIs are ready -> use `/workflow-feature` or `/workflow-big-feature`.

## Protocol

### 1. Activate

Run `/workflow-start spec-to-pbi` with the user's prompt as context.

### 2. Load Spec Context

Locate and read:

- `docs/specs/{app-bucket}/{system-name}/README.md`
- `docs/specs/{app-bucket}/{system-name}/00-module-registry.md`
- `docs/specs/{app-bucket}/{system-name}/01-domain-erd.md`
- Per-module `README.md`, `A-domain-model.md`, `B-business-rules.md`, `C-api-contracts.md`, `D-events-jobs.md`, and `E-user-journeys.md`

If the spec path is missing or ambiguous, ask the user for the exact spec bundle path before generating PBIs.

### 3. Freshness Gate

Run `/spec-discovery` in audit mode before PBI generation.

- If stale behavior is found, run/update the impacted spec sections before generating PBIs.
- If only structural/doc formatting is stale, record the risk and continue.
- If critical domain/API/business-rule sections are stale, stop and ask whether to update specs first.

### 4. Coverage Matrix

Create a matrix with one row per independently deliverable item:

| Spec Source      | Module     | Feature/Operation | Domain Impact             | Shared Dependency | PBI Type                                      | Status  |
| ---------------- | ---------- | ----------------- | ------------------------- | ----------------- | --------------------------------------------- | ------- |
| `{file:section}` | `{module}` | `{feature}`       | entity/state/event/API/UI | yes/no            | feature/foundation/shared/migration/test-data | planned |

Every source feature/operation must map to exactly one of:

- Generated PBI
- Shared/foundation PBI
- Existing PBI reference
- Explicit out-of-scope decision with reason

### 5. Large Spec Decomposition

Apply these scale rules before creating PBIs:

| Scope                      | Required Breakdown                                                |
| -------------------------- | ----------------------------------------------------------------- |
| 1-3 modules                | Process inline with one task per module and feature group         |
| 4-10 modules               | Split by module, then feature/operation group                     |
| 10+ modules                | Incremental module-group batches with coverage matrix checkpoints |
| Any PBI > 8 story points   | Split with SPIDR until each PBI is <= 8 story points              |
| Cross-cutting prerequisite | Create shared/foundation PBI before dependent feature PBIs        |

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
2. Run `/refine-review`.
3. Run `/story` to create vertical-slice stories.
4. Run `/story-review`.
5. Run `/pbi-challenge`.
6. Run `/dor-gate`.
7. Run `/pbi-mockup` only when UI is involved.

Each PBI MUST include:

- Source spec references with `file:section` evidence.
- GIVEN/WHEN/THEN acceptance criteria.
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

Run `/docs-update` after `/prioritize` and before `/watzup`.

Purpose:

- Sync generated PBIs/stories/backlog outputs back into business feature docs where applicable.
- Sync feature doc Section 15 test specifications and `docs/specs/` dashboards.
- Verify engineering spec bundle indexes, feature docs, and TDD/spec docs do not drift after PBI generation.
- Record skipped sub-phases explicitly when no impacted docs exist.

### 9. Completion Criteria

Workflow can close only when:

- Every spec source item is represented in the coverage matrix.
- Every generated PBI has dependency and priority fields.
- Shared/foundation PBIs are explicit and ordered before dependents.
- Domain-analysis findings are attached where domain changes are implied.
- The final backlog artifact ranks all PBIs and explains what to do first.
- `/docs-update` has run as the near-final sync gate, with specs, feature docs, and TDD/spec dashboards either updated or explicitly marked unchanged.

## Closing Reminders

- **MUST** use the spec bundle as canonical input; do not invent unrelated opportunities.
- **MUST** decompose big specs into small PBIs before story generation.
- **MUST** include dependency, priority, domain impact, and shared-task details.
- **MUST** write artifacts incrementally after each module/feature.
- **MUST** run `/prioritize` once at the end across all generated PBIs.
- **MUST** run `/docs-update` after `/prioritize` and before `/watzup` to keep specs, feature docs, and TDD/spec docs synchronized.
