# `/spec [mode=index]` — derived spec index reference

> Loaded by `spec/SKILL.md`'s Mode Dispatch when invoked as `/spec [mode=index] [action=index|audit] [bucket=<scope>] [artifacts=INDEX[,ERD]]`. This contract REPLACES the spec authoring body for the invocation: it assembles regenerable navigation aids (index, cross-capability ERD, reimplementation guide) FROM canonical specs only, or audits them for staleness. It never authors canonical content and never becomes a source of truth.

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval. Inside a workflow run, `/start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

## Quick Summary

> **Portability:** the canonical business-spec root defaults to `docs/specs/`; `specRoots.business.path` in `docs/project-config.json` overrides it. Use project references to resolve the canonical filename pattern, section roles, owner/ID rules, carriers, output policy, and derived destination.

**Goal:** Generate only requested, regenerable navigation aids from a project's canonical specs while preserving its section, identity, evidence, and ownership rules.

**Summary:**

- **Ordered run:** MUST ATTENTION read project config + required references → confirm scope/action/artifacts/destination → discover canonical owners → resolve mapped roles, IDs, carriers and test relation → assemble requested aids → stamp/write in an approved derived location, skipping unchanged content → verify source coverage, links, policy and noncanonical status; no source → stop and report.
- **Actions:** `index` (default — regenerate derived aids) · `audit` (report derived aids stale vs source specs). Select with `action=index|audit` or the `--audit` flag; the spec-level mode is always `[mode=index]`, so the `audit` action never means the spec `audit` mode.
- **Hard boundary:** outputs are DERIVED, regenerate from exact linked sources, and never replace or duplicate canonical owners, case registries, or project-managed indexes. Honor the project's configured authorship, section, prose, and destination rules.

> **[SCOPE]** Assemble only the user-requested derived index, ERD, or reimplementation guide. Resolve the configured business root from `specRoots.business.path`, using the framework config loader's fallback only when unset. Consult `spec-system-reference.md` through the configured project-reference docs root and its docs index for canonical file patterns, exclusions, ownership, and whether an index or destination is allowed. Never create a parallel spec plane or case registry.

**Inputs:** project-configured canonical sources and project references. Read code only to resolve an explicitly requested technical relationship or build order; never use it to invent missing business intent, canonical cases, or a second spec layer.

**Actions:**

| Action  | Trigger                                  | Input                                          | Output                                                                   |
| ------- | ---------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------ |
| `index` | default — refresh requested aids       | Canonical owners selected through project config and references | Approved derived catalog (+ optional ERD / reimplementation guide) |
| `audit` | explicit request — staleness check     | Canonical owners and existing derived aids     | Stale-list report with exact source/output paths                         |

**Workflow:** `/investigate` (locate specs) → `/spec [mode=index]` (assemble derived aids) → `/changes-review` → `/watzup`

**Key Rules:**

- **[BLOCKING]** Output is **DERIVED and regenerable** — every generated file carries a `> DERIVED — regenerate via /spec [mode=index]; do NOT hand-edit` banner. It is NEVER a second source of truth.
- **[BLOCKING]** Never write into a derived or canonical location unless project config/references allow it. Never create a parallel canonical spec, case registry, or manually maintained index.
- Resolve source patterns and section roles from the configured profile and required project-reference docs. If no explicit native case profile is established, retain the strict default TC/Section 8 representation; do not infer a native format from language, file extension, or one example.
- Extract only mapped fields. Use the mapped intent sections for summaries, mapped contract/model sections for relationships, and mapped evidence sections for proof pointers. Preserve exact owner paths and logical IDs; do not turn carrier rows or tests into new canonical cases.
- **[BLOCKING] MUST ATTENTION** Keep each canonical owner path joined to its exact logical case identity in every derived reference; NEVER emit an unqualified native ID.
- **[BLOCKING] NEVER** infer coverage cardinality from test names, executor totals, or variant-row counts; trace every claimed result to its actual executor and inspected assertion.
- **[BLOCKING] ALWAYS** keep unknown owners, mappings, and outcomes explicitly `UNKNOWN`/`[UNVERIFIED]`; do not turn incomplete selection into clean coverage.
- Link each row/entity to its exact canonical owner and mark `[UNVERIFIED]` or omit it when the mapped source does not support the claim.
- Apply the project's writing and stack-detail rules from its required reference docs; do not assume every project uses the same prose restrictions or rebuild-guide exception.

---

## Contents

- [Quick Summary](#quick-summary)
- [Scope Mapping](#scope-mapping)
- [Step 0 — Project Context and Scope Gate (MANDATORY)](#step-0--project-context-and-scope-gate-mandatory)
- [Step 1 — Read the Canonical Sources](#step-1--read-the-canonical-sources)
- [Step 2 — Assemble the Derived Aids](#step-2--assemble-the-derived-aids)
- [Step 3 — Stamp & Write](#step-3--stamp--write)
- [Step 4 — Verify (self-check before completing)](#step-4--verify-self-check-before-completing)
- [Ownership Boundary (NON-NEGOTIABLE)](#ownership-boundary-non-negotiable)
- [Selective Artifact Mode](#selective-artifact-mode)
- [Next Steps](#next-steps)
- [Related Skills](#related-skills)
- [Purpose](#purpose)
- [Mode protocols](#mode-protocols)
- [Prompt-Enhance Closing Anchors](#prompt-enhance-closing-anchors)
- [Closing Reminders](#closing-reminders)

## Scope Mapping

Use the grouping and ownership model named by the configured root and project references (for example, domain, capability, module, or a single root). Do not assume an application bucket or service-to-bucket map. Keep project-specific grouping names in project references, not in this skill.

---

## Step 0 — Project Context and Scope Gate (MANDATORY)

Before reading canonical source content:

1. **MUST ATTENTION** read `docs/project-config.json`, the configured docs index (default `docs/project-reference/docs-index-reference.md`), `lessons.md`, and the required spec references from the configured reference-doc root. Resolve roots, authorship, mapped sections/identities/carriers, and the allowed derived-output location.
2. State `Reference docs read: ... | Not applicable: ...`.
3. **MUST ATTENTION** use `ask user question tool` to confirm scope and output. Do not read canonical source bodies until the user confirms.

Confirm:

| Dimension          | Question                                                                                         | Auto-default |
| ------------------ | ------------------------------------------------------------------------------------------------ | ------------ |
| **Scope** ★        | Which canonical domain/capability set or the entire configured root?                             | Must confirm |
| **Action** ★       | `index` (regenerate allowed derived aids) or `audit` (report staleness without writing)?         | `index`      |
| **Artifacts**       | Which aids allowed by local policy: catalog, ERD, reimplementation guide?                         | Catalog only |
| **Destination** ★  | Which configured/approved derived location? If none exists, where outside canonical owners?     | Must confirm |
| **Stack note**      | For a requested reimplementation guide, is a target stack explicitly required?                  | Project rule |

> **[BLOCKING]** Use the configured canonical pattern and declared exclusions; never assume `README.*.md` or a directory shape. If selection is empty, check the root and selector against project config/references, then report the exact paths/patterns searched and stop. Do not infer specs from code. If local policy rejects an index in the canonical tree and no approved derived destination exists, do not write one.

---

## Step 1 — Read the Canonical Sources

1. **MUST ATTENTION** enumerate canonical owners using the configured root plus the exact file pattern, lifecycle, companion, and exclusion rules from project references. NEVER substitute a framework-default path for a declared root.
2. Resolve the project's explicit profile before interpreting contents. Use configured section aliases, logical identifiers, owner rules, carriers, and documented case-to-test relationship. If no native profile is explicit, use the strict default TC/Section 8 contract.
3. For each owner, extract only supported fields:
   - canonical name, exact source path, and lifecycle when declared;
   - a concise intent summary from the mapped intent source;
   - an optional case/coverage summary only when its source and counting rule are explicit; do not count executor or variant rows as canonical scenarios;
   - model/relationship details for an ERD only from a mapped canonical model/contract source.
4. Preserve exact owner-qualified scenario and variant identities when a requested aid needs them. NEVER create a second case registry or infer coverage from aggregate counts; trace every claimed result to the actual executor and inspected assertion.
5. Do NOT re-derive missing business rules, contracts, relationships, or events from code. Use `[UNVERIFIED]` or omit unsupported fields.

> **Scale:** For many canonical owners, you MAY spawn read-only inventory workers that return exact source paths and mapped fields; the main agent verifies every claim before writing. This is an optimization, not a gate.

---

## Step 2 — Assemble the Derived Aids

### 2a. Catalog (default, when local policy permits)

Generate `INDEX.md` only at the user-confirmed, project-approved destination. Keep it navigational and link to canonical owners; do not duplicate requirement or scenario registries.

```markdown
> **DERIVED — regenerate via `/spec [mode=index]`; do NOT hand-edit.** Source of truth: the linked canonical artifacts under the configured root.

# {Scope} — Canonical Source Index

| Canonical source | Intent summary | Lifecycle |
| --------------- | -------------- | --------- |
| [{Source path}](<relative canonical path>) | {one-line mapped intent} | {declared state or `not declared`} |
```

The project's canonical authoring workflow owns each source. `/spec [mode=index]` is the single writer for this derived catalog.

### 2b. Cross-Capability ERD (on request)

Assemble one Mermaid ERD only when project references identify a canonical model/relationship source for the selected owners:

- Merge duplicate model concepts only when source evidence establishes they are the same; retain cross-owner links.
- Do not invent business relationships from code. Code may validate a declared relation or resolve a requested technical dependency; label unsupported relationships `[UNVERIFIED]` or omit them.
- Write to the user-confirmed, project-approved derived destination with the DERIVED banner. Follow its filename conventions.

### 2c. Reimplementation Guide (on explicit request only)

A build-order narrative over declared capability dependencies and integration touchpoints.

- Read project writing rules and the requested audience. Name a target stack only when project policy permits it; ask the user when the policy leaves the choice open.
- Write to the user-confirmed, project-approved derived destination with the DERIVED banner. Follow its filename conventions.

---

## Step 3 — Stamp & Write

- Every generated file opens with the `> DERIVED — regenerate via /spec [mode=index]; do NOT hand-edit` banner + regenerate date; write each file immediately after assembly. Do NOT accumulate large outputs in context.
- **[BLOCKING] A regeneration that produces the same content writes NOTHING — not the date either.** Before writing each file, compare the assembled candidate against the file on disk: `node .claude/hooks/lib/doc-stamp-guard.cjs --check <output path> --candidate <candidate file>`. Exit `3` = no-op → skip that file and report it `unchanged (no write)`; exit `0` = write it, banner date and all. — why: these outputs are DERIVED, so re-running the skill on unchanged specs is routine — and a rewrite that moves only the regenerate date is an unmergeable line that makes two branches conflict over a value neither of them decided.

---

## Step 4 — Verify (self-check before completing)

- **MUST ATTENTION** Selected source count matches the discovered canonical owners; report excluded companions and any unknown/unmapped owners.
- **MUST ATTENTION** Every row/entity links to an existing canonical source; no dangling links or fabricated identities.
- **MUST ATTENTION** DERIVED banner present on each generated file.
- **MUST ATTENTION** Output respects the project's authorship, section-role, prose, and destination rules.
- **MUST ATTENTION** No canonical claims, copied case registry, or hand-maintained index; derived files never assert they are the source of truth.

---

## Ownership Boundary (NON-NEGOTIABLE)

This skill produces only requested, DERIVED aids. It MUST NEVER:

- create or revise canonical business or technical content;
- create a parallel spec tree, canonical case registry, or duplicate owner-qualified scenario rows;
- write under a hand-authored root or project-reserved path without explicit local policy and user confirmation;
- impose retired filenames or folder layouts from another project on this one.

If a requested artifact conflicts with the project's canonical ownership or output policy, stop and explain the conflict. Offer an allowed derived destination or an audit-only report when available.

---

## Selective Artifact Mode

| User goal                              | Generate                                            |
| -------------------------------------- | --------------------------------------------------- |
| "Refresh the source index"             | Approved catalog destination only                   |
| "I need the data model across the app" | ERD from a mapped canonical model source             |
| "Produce a rebuild guide"              | Reimplementation guide (stack-neutral unless named) |
| "Full navigation set"                  | Only the aids allowed by local policy               |

---

## Next Steps

> **Inside a workflow:** when this skill runs as a step of an active workflow, skip the prompts in this section and return the result — the workflow's next step decides what runs (`/start-workflow` → Step Execution Protocol, Workflow-step mode).

**[BLOCKING]** After completing, use `ask user question tool` — DO NOT skip:

- **"/docs-manager --mode=update (Recommended)"** — reconcile stale canonical specs and their profile-defined case/test carriers
- **"/watzup"** — wrap up if index generation is the final step
- **"Skip, continue manually"** — user decides

---

## Related Skills

| Skill               | Relationship                                                                                          | When to Call                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `/spec`     | **Source owner** — authors or amends canonical specifications and flags when derived refresh may be required | Before `[mode=index]` — canonical owners must exist      |
| `/spec [mode=tests]` | **Strict-default source owner** — edits Section 8 TCs only when the strict default profile applies | When default-profile cases change and a derived summary is requested |
| `/docs-manager --mode=update`      | **Orchestrator** — may call `[mode=index]` to refresh derived aids after a doc sync                       | After code/spec changes need a full doc sync              |
| `/changes-review`   | **Trigger** — detects spec changes and surfaces stale derived aids                                    | After spec changes; it will suggest regenerating the index |

## Purpose

Use this mode for the [Actions](#quick-summary) above; the [Ownership Boundary](#ownership-boundary-non-negotiable) governs every output. Code may resolve only explicitly requested technical relationships or build order, never missing canonical business intent or cases.

---

## Mode protocols

The protocols below apply to this mode only; their full text is inline so this reference is self-contained. The `spec` skill already carries `cross-service-check`.


## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval; inside a workflow run, `/start-workflow` → Workflow-step mode bounds this
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses


## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Generate requested, regenerable navigation aids from exact canonical sources while preserving configured section, identity, evidence, authorship, and case/test semantics.
- **IMPORTANT MUST ATTENTION Main steps/actions/gates:** read project config and required spec references → `ask user question tool` confirms scope, action, artifacts, and approved output destination before source-body reads → discover canonical owners with the configured patterns/exclusions → map intent/contracts/evidence, identifiers, carriers, and coverage relation; strict default TC/Section 8 applies only without an explicit native profile → assemble selected aids → stamp and write each approved output immediately, with unchanged-content guard → verify selection totals, source links, section policy, DERIVED status, and no duplicate registry → after completion ask about `/docs-manager --mode=update`, `/watzup`, or continuing manually. NEVER skip gates or infer a missing source — why: a wrong root or copied case registry can silently replace the real owner.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries — MUST ATTENTION each canonical body above):**

- **Cross-Service Check:** scan producers/consumers/sagas/contracts; flag breaking-change risk.

- **Ownership:** emit only requested, approved derived aids. Preserve exact canonical owners and profile-defined identities; never create a parallel spec/case registry or a forbidden index.
- **Resolve and confirm:** read config + required references for roots, selectors/exclusions, mapped roles, IDs/carriers/cardinality, prose and destination policy. Confirm scope/action/artifacts/destination before canonical body reads. Empty selection → verify root/selector, report exact search, STOP.
- **Evidence:** link every row/entity to its canonical source; keep unresolved fields/counts/results `UNKNOWN`/`[UNVERIFIED]` or omit unsupported claims. Never infer coverage from test or variant totals; inspect each claimed executor/assertion.
- **Write and verify:** stamp the DERIVED banner + date, write each approved aid immediately, and skip unchanged candidates without changing their dates. Check source links, selected-owner totals and every output's policy/noncanonical status.
- **Code boundary:** read code only to validate a declared relationship or resolve an explicitly requested technical dependency/build order; never invent canonical content. Follow local prose/stack policy, not a universal stack exception.
- **Local fit:** before authoring a new derived format, inspect 3+ matching project artifacts and confirm their ownership/destination rules fit.
- **Tracking/recovery:** create small tasks per artifact; keep one `in_progress`, complete each after its write, and inspect existing tasks first after compaction/resume rather than repeating a completed generation pass. If task tools are unavailable, maintain equivalent statuses/evidence.
- **Parallel dispatch:** tag PAR/SEQ, group PAR into disjoint-write waves, dispatch each wave in one message and wait at the barrier before advancing.

**Anti-Rationalization:**

| Evasion                                                  | Rebuttal                                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| "The derived view can become a canonical source"        | NEVER — only configured canonical owners define requirements and cases. |
| "A familiar filename or folder pattern should work"     | Resolve the project's configured root, selectors, and naming rules first. |
| "No specs in this selection; I'll extract them from code" | Verify the root and selector, report exact paths, then STOP; code is not a replacement source. |
| "Scope is obvious; skip `ask user question tool`"              | BLOCKING — confirm scope, action, artifact set, and destination before reading canonical bodies. |
| "I'll trust the source link"                             | Verify it. A dangling link makes the derived navigation layer worse than none. |
| "Case count looks about right"                           | Count only from the selected canonical carrier and its explicit counting rule; otherwise mark unknown or omit it. |

**[TASK-PLANNING]** MUST ATTENTION analyze task scope and break into small todo tasks/sub-tasks via TaskCreate before acting.

**IMPORTANT MUST ATTENTION** Preserve canonical ownership; confirm scope/action/destination before source reads; verify linked, regenerable outputs without inventing cases or coverage.
