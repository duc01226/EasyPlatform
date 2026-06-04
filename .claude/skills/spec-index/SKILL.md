---
name: spec-index
version: 4.0.0
description: '[General] Use when you need to (re)generate a DERIVED navigation index, cross-capability ERD, or reimplementation guide assembled FROM the canonical Feature Specs under docs/specs/**. Never extracts a separate A-E engineering tree.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

> **Portability:** `docs/specs/` is the fixed Feature Spec root.

**Goal:** Generate, on demand, a regenerable single-writer navigation layer (catalog + cross-capability ERD + rebuild guide) **assembled FROM** the canonical tech-free 8-section Feature Specs under `docs/specs/{Bucket}/` — so a bucket can be browsed or replatformed without ever forking a second, hand-maintained source of truth. The Feature Specs are the source of truth; this skill only assembles regenerable aids over them.

**Summary:**

- This skill is a DERIVED-aid assembler only: it reads §1 Overview, §5 Domain Model Mermaid, and §8 TCs from existing Feature Specs to build `INDEX.md` (default), an optional cross-capability `{Bucket}.erd.md`, and an optional `{Bucket}.reimplementation-guide.md` — it NEVER authors business content.
- Hard prohibition is the load-bearing rule: never emit the retired A-E engineering tree, `M##` dirs, `00-module-registry.md`, `01-domain-erd.md`, `06-reimplementation-guide.md`, or `docs/specs/README.md`/`PRIORITY-INDEX.md`. Use the `{Bucket}.*` filenames instead.
- Step 0 Scope Gate via `AskUserQuestion` (bucket + mode + artifacts) is BLOCKING and runs before any read; if the target bucket has no `README.*.md` specs, STOP and route to `/spec` — never fabricate a spec to index.
- Every generated file carries the `> DERIVED — regenerate via /spec-index; do NOT hand-edit` banner, links each row/entity back to its source spec, and keeps INDEX/ERD prose tech-free — only the reimplementation guide may name a target stack.

> **Renamed:** repurposes the former `/spec-discovery` skill (v4.0.0 derived-aid rewrite) — `/spec-discovery` no longer resolves as a slash command; use `/spec-index`.

> **[SCOPE]** This skill assembles a **DERIVED** index / ERD / reimplementation guide over the canonical Feature Specs. It MUST NOT emit a per-module A-E engineering bundle (`A-domain-model`, `B-business-rules`, `C-api-contracts`, `D-events`, `E-user-journeys`), `M##` directories, `00-module-registry.md`, `01-domain-erd.md`, or `06-reimplementation-guide.md` — those are not part of the spec model; their content lives in the Feature Spec (thin-index-only contract: output is DERIVED — never emit A-E bundle files). Authority: [`docs/project-reference/spec-system-reference.md`](../../../docs/project-reference/spec-system-reference.md).

**Inputs:** the canonical 8-section Feature Specs (§1 Overview, §5 Domain Model Mermaid, §8 TCs). Code is the technical source of truth — read it ONLY to resolve cross-spec ERD relationships or a reimplementation build order, never to populate a parallel spec layer.

**Modes:**

| Mode    | Trigger                            | Input                                           | Output                                                                    |
| ------- | ---------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------- |
| `index` | default — refresh derived aids     | Feature Specs in the target bucket(s)           | `INDEX.md` catalog (+ optional ERD / reimplementation guide), all DERIVED |
| `audit` | explicit request — staleness check | Feature Spec mtimes/git vs derived-artifact age | Stale-list report (which derived aids lag their source specs)             |

**Workflow:** `/scout` (locate specs) → `/spec-index` (assemble derived aids) → `/review-changes` → `/watzup`

**Key Rules:**

- **[BLOCKING]** Output is **DERIVED and regenerable** — every generated file carries a `> DERIVED — regenerate via /spec-index; do NOT hand-edit` banner. It is NEVER a second source of truth.
- **[BLOCKING]** MUST NOT emit `M##` dirs, `A-E` files, `00-module-registry.md`, `01-domain-erd.md`, `06-reimplementation-guide.md`, `docs/specs/README.md`, or `docs/specs/PRIORITY-INDEX.md` (all retired). See **Hard Prohibitions**.
- §1-7 of a Feature Spec are tech-free; the derived INDEX/ERD inherit that. The **reimplementation guide is the sole artifact allowed to name a target stack** (it is a rebuild guide — `spec-principles.md` §3 exception).
- Every catalog row / ERD entity links back to the source Feature Spec; mark `[UNVERIFIED]` rather than guessing.
- Read [`docs/project-reference/spec-principles.md`](../../../docs/project-reference/spec-principles.md) §3 (tech-agnostic + banned-token list) before writing any prose.

---

## App Bucket Mapping

Derived aids are organized by **App Bucket** (matches the single-home spec tree). Resolve service→bucket assignments from the canonical table in [`docs/project-reference/spec-system-reference.md`](../../../docs/project-reference/spec-system-reference.md) → **App Bucket Mapping** — do not inline project-specific bucket names in this skill.

---

## Step 0 — Scope Gate (MANDATORY FIRST)

Before reading anything, use `AskUserQuestion`. Confirm:

| Dimension      | Question                                                                                                  | Auto-Default    |
| -------------- | --------------------------------------------------------------------------------------------------------- | --------------- |
| **Bucket** ★   | Which App Bucket(s) — one bucket, several, or all of `docs/specs/`?                                       | — must confirm  |
| **Mode** ★     | `index` (regenerate derived aids) OR `audit` (report which derived aids are stale vs their source specs)? | `index`         |
| **Artifacts**  | Which derived aids: bucket `INDEX.md` / cross-capability ERD / reimplementation guide?                    | `INDEX.md` only |
| **Stack note** | (reimplementation guide only) Name a target rebuild stack, or keep stack-neutral build order?             | Stack-neutral   |

> **[BLOCKING]** If the target bucket has **no** Feature Specs matching `docs/specs/{Bucket}/README.*.md`, STOP and route the user to `/spec` — there is nothing to derive from. NEVER fabricate a spec to index.

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
> **DERIVED — regenerate via `/spec-index`; do NOT hand-edit.** Source of truth: the Feature Specs in `docs/specs/{Bucket}/README.*.md`.

# {Bucket} — Feature Index

| Capability                 | Summary             | Feature Code | TCs | Status         |
| -------------------------- | ------------------- | ------------ | --- | -------------- |
| [{Name}](README.{Name}.md) | {one-line overview} | {FC}         | {n} | {Active/Draft} |
```

> `/spec` owns the canonical Feature Specs only. `/spec-index` owns this derived `INDEX.md` and regenerates it deterministically from the specs, so there is one writer for the derived navigation file.

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

- Every generated file opens with the `> DERIVED — regenerate via /spec-index; do NOT hand-edit` banner + a regenerate date.
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

**[BLOCKING]** After completing, use `AskUserQuestion` — DO NOT skip:

- **"/docs-update (Recommended)"** — sync the Feature Specs + Section 8 if any source content was found stale during indexing
- **"/watzup"** — wrap up if index generation is the final step
- **"Skip, continue manually"** — user decides

---

## Related Skills

| Skill                | Relationship                                                                                                   | When to Call                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `/spec`              | **Source owner** — authors the canonical 8-section Feature Spec and flags when derived refresh may be required | Before spec-index — the specs must exist to index          |
| `/spec [mode=tests]` | **Source owner** — owns Section 8 TCs that this skill counts in the catalog                                    | When TCs change and the index TC counts must refresh       |
| `/docs-update`       | **Orchestrator** — may call spec-index to refresh derived aids after a doc sync                                | After code/spec changes need a full doc sync               |
| `/review-changes`    | **Trigger** — detects spec changes and surfaces stale derived aids                                             | After spec changes; it will suggest regenerating the index |

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
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing.** Before changing a constant, limit, flag, wording, or pattern, read nearby context and history.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

## Closing Reminders

- **IMPORTANT MUST ATTENTION Goal:** Give readers a regenerable, single-writer navigation layer (catalog + cross-capability ERD + rebuild guide) assembled FROM the canonical Feature Specs — so a bucket can be browsed or replatformed without ever forking a second, hand-maintained source of truth

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries — MUST ATTENTION each canonical body above):**

- **Cross-Service Check:** scan producers/consumers/sagas/contracts; flag breaking-change risk.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** NEVER present a guess as fact; traced proof, confidence >80% to act.

- **IMPORTANT MUST ATTENTION [BLOCKING]** Output is DERIVED — never emit `M##`/A-E/`00-module-registry`/`01-domain-erd`/`06-reimplementation-guide`/QA-dashboard files (see Hard Prohibitions); use `{Bucket}.*` filenames instead — why: an A-E bundle becomes a second source of truth competing with the Feature Spec
- **IMPORTANT MUST ATTENTION [BLOCKING]** The Feature Spec (`docs/specs/{Bucket}/README.{Feature}.md`) is the source of truth — this skill assembles, never authors, business content — why: a derived aid that asserts canonical authority corrupts the single-writer contract
- **IMPORTANT MUST ATTENTION [BLOCKING]** Confirm bucket + mode + artifacts via `AskUserQuestion` BEFORE Step 1 — NEVER auto-start; if the bucket has no `README.*.md` specs, STOP and route to `/spec` instead of fabricating a spec to index
- **IMPORTANT MUST ATTENTION [BLOCKING]** Context compaction/session resume → `TaskList` FIRST; resume existing tasks, never re-run a completed generation pass — why: summaries describe intent, not filesystem state
- **IMPORTANT MUST ATTENTION [BLOCKING]** Stamp the DERIVED banner + regenerate date on every generated file; write after each artifact, never accumulate large outputs in context
- **IMPORTANT MUST ATTENTION [REQUIRED]** INDEX/ERD prose tech-agnostic (read `spec-principles.md` §3 banned-token list FIRST); only a reimplementation guide may name a target stack (rebuild-guide exception)
- **IMPORTANT MUST ATTENTION [REQUIRED]** Every catalog row / ERD entity links to an existing Feature Spec — grep the source path to confirm it resolves; mark `[UNVERIFIED]` rather than guessing — why: dangling links silently rot the navigation layer
- **IMPORTANT MUST ATTENTION** Read code ONLY to resolve a cross-spec ERD relationship or a reimplementation build order — never to populate a parallel spec layer — why: code is the technical source of truth, not a spec substitute
- **IMPORTANT MUST ATTENTION** Cite `file:line` evidence for every extracted field and link (confidence >80% to act, <60% mark `[UNVERIFIED]`) — NEVER fabricate a capability name, feature code, or TC count; grep the source spec to confirm
- **IMPORTANT MUST ATTENTION** Before authoring any new derived format, grep 3+ existing `INDEX.md`/`*.erd.md` siblings and match their structure — verify the new bucket shares the same spec layout before copying a nearby pattern
- **IMPORTANT MUST ATTENTION** Break task scope into small `TaskCreate` todos (one per artifact) before acting; mark each `completed` immediately after its file is written; keep exactly one `in_progress`

**Anti-Rationalization:**

| Evasion                                               | Rebuttal                                                                                                             |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| "User wants full detail — regenerate the A-E bundle"  | A-E is not part of the spec model. Offer the derived index/ERD; the detail already lives in the Feature Spec + code. |
| "I'll write the ERD as `01-domain-erd.md`"            | Wrong filename. Use `{Bucket}.erd.md` with the DERIVED banner.                                                       |
| "The index can be the source of truth, it's complete" | NEVER — it is derived/regenerable. §1-7 + §8 of the Feature Spec are canonical.                                      |
| "No specs in this bucket, I'll extract from code"     | STOP. Route to `/spec`. This skill indexes existing specs; it does not author new ones.                              |
| "Scope is obvious, skip Step 0 AskUserQuestion"       | BLOCKING — NEVER auto-start. Bucket, mode, and artifact set MUST be confirmed first.                                 |
| "I'll just trust the spec link, no need to verify"    | Grep the source path. A dangling link makes the derived navigation layer worse than none.                            |
| "TC count looks about right, skip re-reading §8"      | NEVER guess counts. Re-read `## 8. Test Specifications`; mark `[UNVERIFIED]` if unresolved.                          |

**[TASK-PLANNING]** MUST ATTENTION analyze task scope and break into small todo tasks/sub-tasks via TaskCreate before acting.

> **[IMPORTANT]** Break into many small todo tasks systematically before starting — this is critical.

**IMPORTANT MUST ATTENTION** Output is DERIVED + regenerable — never a second source of truth; the Feature Spec is canonical.
**IMPORTANT MUST ATTENTION** Confirm bucket + mode + artifacts via `AskUserQuestion` BEFORE any read; no specs → STOP, route to `/spec`.
**IMPORTANT MUST ATTENTION** Cite `file:line` for every extracted field; mark `[UNVERIFIED]` rather than guessing; never emit retired A-E/`M##`/QA-dashboard files.

---
