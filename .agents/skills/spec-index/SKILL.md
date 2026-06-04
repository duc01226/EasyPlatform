---
name: spec-index
description: '[General] Use when you need to (re)generate a DERIVED navigation index, cross-capability ERD, or reimplementation guide assembled FROM the canonical Feature Specs under docs/specs/**. Never extracts a separate A-E engineering tree.'
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->

## Codex Project-Reference Loading (No Hooks)

Codex does not receive Claude hook-based doc injection.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

> **Portability:** `docs/specs/` is the fixed Feature Spec root.

**Goal:** Generate, on demand, a regenerable single-writer navigation layer (catalog + cross-capability ERD + rebuild guide) **assembled FROM** the canonical tech-free 8-section Feature Specs under `docs/specs/{Bucket}/` — so a bucket can be browsed or replatformed without ever forking a second, hand-maintained source of truth. The Feature Specs are the source of truth; this skill only assembles regenerable aids over them.

> **Renamed:** repurposes the former `/spec-discovery` skill (v4.0.0 derived-aid rewrite) — `/spec-discovery` no longer resolves as a slash command; use `$spec-index`.

> **[SCOPE]** This skill assembles a **DERIVED** index / ERD / reimplementation guide over the canonical Feature Specs. It MUST NOT emit a per-module A-E engineering bundle (`A-domain-model`, `B-business-rules`, `C-api-contracts`, `D-events`, `E-user-journeys`), `M##` directories, `00-module-registry.md`, `01-domain-erd.md`, or `06-reimplementation-guide.md` — those are not part of the spec model; their content lives in the Feature Spec (thin-index-only contract: output is DERIVED — never emit A-E bundle files). Authority: [`docs/project-reference/spec-system-reference.md`](../../../docs/project-reference/spec-system-reference.md).

**Inputs:** the canonical 8-section Feature Specs (§1 Overview, §5 Domain Model Mermaid, §8 TCs). Code is the technical source of truth — read it ONLY to resolve cross-spec ERD relationships or a reimplementation build order, never to populate a parallel spec layer.

**Modes:**

| Mode    | Trigger                            | Input                                           | Output                                                                    |
| ------- | ---------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------- |
| `index` | default — refresh derived aids     | Feature Specs in the target bucket(s)           | `INDEX.md` catalog (+ optional ERD / reimplementation guide), all DERIVED |
| `audit` | explicit request — staleness check | Feature Spec mtimes/git vs derived-artifact age | Stale-list report (which derived aids lag their source specs)             |

**Workflow:** `$scout` (locate specs) → `$spec-index` (assemble derived aids) → `$review-changes` → `$watzup`

**Key Rules:**

- **[BLOCKING]** Output is **DERIVED and regenerable** — every generated file carries a `> DERIVED — regenerate via $spec-index; do NOT hand-edit` banner. It is NEVER a second source of truth.
- **[BLOCKING]** MUST NOT emit `M##` dirs, `A-E` files, `00-module-registry.md`, `01-domain-erd.md`, `06-reimplementation-guide.md`, `docs/specs/README.md`, or `docs/specs/PRIORITY-INDEX.md` (all retired). See **Hard Prohibitions**.
- §1-7 of a Feature Spec are tech-free; the derived INDEX/ERD inherit that. The **reimplementation guide is the sole artifact allowed to name a target stack** (it is a rebuild guide — `spec-principles.md` §3 exception).
- Every catalog row / ERD entity links back to the source Feature Spec; mark `[UNVERIFIED]` rather than guessing.
- Read [`docs/project-reference/spec-principles.md`](../../../docs/project-reference/spec-principles.md) §3 (tech-agnostic + banned-token list) before writing any prose.

---

## App Bucket Mapping

Derived aids are organized by **App Bucket** (matches the single-home spec tree). Resolve service→bucket assignments from the canonical table in [`docs/project-reference/spec-system-reference.md`](../../../docs/project-reference/spec-system-reference.md) → **App Bucket Mapping** — do not inline project-specific bucket names in this skill.

---

## Step 0 — Scope Gate (MANDATORY FIRST)

Before reading anything, use a direct user question. Confirm:

| Dimension      | Question                                                                                                  | Auto-Default    |
| -------------- | --------------------------------------------------------------------------------------------------------- | --------------- |
| **Bucket** ★   | Which App Bucket(s) — one bucket, several, or all of `docs/specs/`?                                       | — must confirm  |
| **Mode** ★     | `index` (regenerate derived aids) OR `audit` (report which derived aids are stale vs their source specs)? | `index`         |
| **Artifacts**  | Which derived aids: bucket `INDEX.md` / cross-capability ERD / reimplementation guide?                    | `INDEX.md` only |
| **Stack note** | (reimplementation guide only) Name a target rebuild stack, or keep stack-neutral build order?             | Stack-neutral   |

> **[BLOCKING]** If the target bucket has **no** Feature Specs matching `docs/specs/{Bucket}/README.*.md`, STOP and route the user to `$spec` — there is nothing to derive from. NEVER fabricate a spec to index.

---

## Step 1 — Read the Source Feature Specs

1. `Glob docs/specs/{Bucket}/README.*.md` → enumerate the canonical specs.
2. For each spec, read and extract ONLY:
    - **Capability name** + file link
    - **Summary** — first sentence of `## 1. Overview`
    - **Feature code** + **TC count** + status mix from `## 8. Test Specifications`
    - **Entities + relationships** from the `## 5. Domain Model` ` ```mermaid ` block (for ERD assembly)
3. Do NOT re-derive business rules, API contracts, or events into new files — those live in the Feature Spec (§1-7) and in code. You are indexing, not extracting.

> **Scale note:** For a bucket with many specs, you MAY spawn parallel reader sub-agents (one per spec) that each return the extracted fields above. This is an optimization, not a gate — there is no per-module A-E extraction to parallelize anymore.

---

## Step 2 — Assemble the Derived Aids

### 2a. Bucket `INDEX.md` (default)

Regenerate `docs/specs/{Bucket}/INDEX.md` as a feature catalog:

```markdown
> **DERIVED — regenerate via `$spec-index`; do NOT hand-edit.** Source of truth: the Feature Specs in `docs/specs/{Bucket}/README.*.md`.

# {Bucket} — Feature Index

| Capability                 | Summary             | Feature Code | TCs | Status         |
| -------------------------- | ------------------- | ------------ | --- | -------------- |
| [{Name}](README.{Name}.md) | {one-line overview} | {FC}         | {n} | {Active/Draft} |
```

> `$spec` owns the canonical Feature Specs only. `$spec-index` owns this derived `INDEX.md` and regenerates it deterministically from the specs, so there is one writer for the derived navigation file.

### 2b. Cross-Capability ERD (on request)

Assemble one Mermaid `erDiagram` from every spec's §5 block in the bucket:

- Merge entities; dedupe by name; keep cross-capability relationships.
- Resolve a relationship only present implicitly in code by reading the code — but the ERD stays tech-free (entity + relationship names only, no class/table identifiers in prose).
- Write to `docs/specs/{Bucket}/{Bucket}.erd.md` with the DERIVED banner. **Do NOT** name it `01-domain-erd.md` (retired).

### 2c. Reimplementation Guide (on explicit request only)

A build-order narrative: capability dependency order, integration touchpoints, suggested rebuild sequence.

- This is the **only** derived artifact permitted to name a target stack (rebuild-guide exception, `spec-principles.md` §3).
- Write to `docs/specs/{Bucket}/{Bucket}.reimplementation-guide.md` with the DERIVED banner. **Do NOT** name it `06-reimplementation-guide.md` (retired).

---

## Step 3 — Stamp & Write

- Every generated file opens with the `> DERIVED — regenerate via $spec-index; do NOT hand-edit` banner + a regenerate date.
- Write each file immediately after assembling it; do NOT accumulate large outputs in context.

---

## Step 4 — Verify (self-check before completing)

- [ ] **No retired artifacts emitted** — grep your own output paths: zero `M[0-9]`, zero `A-domain-model`/`B-business-rules`/`C-api-contracts`/`D-events`/`E-user-journeys`, zero `00-module-registry`/`01-domain-erd`/`06-reimplementation-guide`, zero `docs/specs/README.md`/`PRIORITY-INDEX.md`.
- [ ] **Every catalog row links to an existing Feature Spec** (no dangling links).
- [ ] **DERIVED banner present** on each generated file.
- [ ] **§1-7-derived prose is tech-free** (INDEX/ERD); only the reimplementation guide may name a stack.
- [ ] **No canonical claims** — the derived files never assert they are the source of truth.

---

## Hard Prohibitions (R1 mitigation — NON-NEGOTIABLE)

This skill produces only the DERIVED index / ERD / reimplementation guide. Emitting an A-E engineering tree would create a second source of truth competing with the Feature Spec. Therefore this skill MUST NEVER create:

| Forbidden output                                                                                          | Why                                                                |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `M##` directories (e.g., `M01/`, `M02/`)                                                                  | Retired per-module partition                                       |
| `A-domain-model.md` / `B-business-rules.md` / `C-api-contracts.md` / `D-events.md` / `E-user-journeys.md` | Retired A-E engineering bundle — content lives in the Feature Spec |
| `00-module-registry.md`                                                                                   | Retired registry — bucket `INDEX.md` is the catalog                |
| `01-domain-erd.md`                                                                                        | Retired per-system ERD name — use `{Bucket}.erd.md`                |
| `06-reimplementation-guide.md`                                                                            | Retired per-system name — use `{Bucket}.reimplementation-guide.md` |
| `docs/specs/README.md`, `docs/specs/PRIORITY-INDEX.md`                                                    | Retired QA dashboards — Section 8 is the canonical TC registry     |
| `docs/business-features/**`                                                                               | Not a spec home — all specs live under `docs/specs/`               |

If a user explicitly asks for an A-E bundle, explain it is retired and offer the derived index/ERD instead. The thin-index-only contract applies — output is DERIVED, never an A-E bundle.

---

## Selective Artifact Mode

| User goal                              | Generate                                            |
| -------------------------------------- | --------------------------------------------------- |
| "Refresh the bucket index"             | `INDEX.md` only                                     |
| "I need the data model across the app" | Cross-capability ERD (`{Bucket}.erd.md`)            |
| "Produce a rebuild guide"              | Reimplementation guide (stack-neutral unless named) |
| "Full navigation set"                  | `INDEX.md` + ERD + reimplementation guide           |

---

## Next Steps

**[BLOCKING]** After completing, use a direct user question — DO NOT skip:

- **"$docs-update (Recommended)"** — sync the Feature Specs + Section 8 if any source content was found stale during indexing
- **"$watzup"** — wrap up if index generation is the final step
- **"Skip, continue manually"** — user decides

---

## Related Skills

| Skill                | Relationship                                                                                                   | When to Call                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `$spec`              | **Source owner** — authors the canonical 8-section Feature Spec and flags when derived refresh may be required | Before spec-index — the specs must exist to index          |
| `$spec [mode=tests]` | **Source owner** — owns Section 8 TCs that this skill counts in the catalog                                    | When TCs change and the index TC counts must refresh       |
| `$docs-update`       | **Orchestrator** — may call spec-index to refresh derived aids after a doc sync                                | After code/spec changes need a full doc sync               |
| `$review-changes`    | **Trigger** — detects spec changes and surfaces stale derived aids                                             | After spec changes; it will suggest regenerating the index |

## What Is Spec Discovery? (v4.0.0)

A **derived-index generator** over the single-home spec tree. The canonical knowledge is the tech-free 8-section Feature Spec; this skill assembles regenerable navigation aids (catalog, cross-capability ERD, rebuild guide) so readers can browse a bucket or plan a replatform without a second hand-maintained layer. It does NOT reverse-engineer code into a parallel spec bundle — that role was retired with the A-E tree.

---

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

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

## Closing Reminders

- **IMPORTANT MUST ATTENTION Goal:** Give readers a regenerable, single-writer navigation layer (catalog + cross-capability ERD + rebuild guide) over the canonical Feature Specs — so a bucket can be browsed or replatformed without ever forking a second, hand-maintained source of truth
- **IMPORTANT MUST ATTENTION [BLOCKING]** Output is DERIVED — never emit `M##`/A-E/`00-module-registry`/`01-domain-erd`/`06-reimplementation-guide`/QA-dashboard files (see Hard Prohibitions). The thin-index-only contract applies.
- **IMPORTANT MUST ATTENTION [BLOCKING]** The Feature Spec (`docs/specs/{Bucket}/README.{Feature}.md`) is the source of truth — this skill assembles, never authors, business content.
- **IMPORTANT MUST ATTENTION [BLOCKING]** Confirm bucket + mode + artifacts via a direct user question BEFORE Step 1 — NEVER auto-start.
- **IMPORTANT MUST ATTENTION [BLOCKING]** Context compaction/session resume → the current task list FIRST; never re-run a completed generation pass.
- **IMPORTANT MUST ATTENTION [BLOCKING]** Stamp the DERIVED banner + regenerate date on every generated file; write after each artifact, never accumulate.
- **IMPORTANT MUST ATTENTION [REQUIRED]** INDEX/ERD prose tech-agnostic; only a reimplementation guide may name a target stack (rebuild-guide exception).
- **IMPORTANT MUST ATTENTION [REQUIRED]** Every catalog row / ERD entity links to an existing Feature Spec; mark `[UNVERIFIED]` rather than guessing.

**Anti-Rationalization:**

| Evasion                                               | Rebuttal                                                                                                             |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| "User wants full detail — regenerate the A-E bundle"  | A-E is not part of the spec model. Offer the derived index/ERD; the detail already lives in the Feature Spec + code. |
| "I'll write the ERD as `01-domain-erd.md`"            | Wrong filename. Use `{Bucket}.erd.md` with the DERIVED banner.                                                       |
| "The index can be the source of truth, it's complete" | NEVER — it is derived/regenerable. §1-7 + §8 of the Feature Spec are canonical.                                      |
| "No specs in this bucket, I'll extract from code"     | STOP. Route to `$spec`. This skill indexes existing specs; it does not author new ones.                              |
| "Scope is obvious, skip Step 0 ask the user directly" | BLOCKING — NEVER auto-start. Bucket, mode, and artifact set MUST be confirmed first.                                 |

**[TASK-PLANNING]** MUST ATTENTION analyze task scope and break into small todo tasks/sub-tasks via task tracking before acting.

> **[IMPORTANT]** Break into many small todo tasks systematically before starting — this is critical.

---

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
   **Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
   **Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
