> The `tech-spec` skill (`../SKILL.md`) loads this body for `[mode=generate]` and `[mode=audit]`. It is the **derivation + template** procedure: project code + tests into `{TechRoot}/{Service}/{Component}.md`. The host SKILL.md owns the generator contract (C1–C9), the scope gate, and the Hard Prohibitions — this body carries only the derivation greps and the emit templates. For §8 TC ↔ test-code reconciliation, see `sync.md` (`[mode=sync]`).
>
> **`{TechRoot}` = `docs/project-config.json` → `specRoots.technical.path`.** Resolve it at run time. NEVER hardcode a root. `{Service}` and `{Component}` are **patterns**, never literal names.

## Contents

- [Profile and generator applicability](#profile-and-generator-applicability)
- [Mode: Generate the DERIVED Technical View](#mode-generate-the-derived-technical-view)
- [The Determinism Contract — read before emitting anything](#the-determinism-contract--read-before-emitting-anything)
- [Step G1 — Derive the Use Case Inventory](#step-g1--derive-the-use-case-inventory)
- [Step G2 — Derive the TC ↔ Test Map](#step-g2--derive-the-tc--test-map)
- [Step G3 — Derive the Cross-Service Topology](#step-g3--derive-the-cross-service-topology)
- [Step G4 — The Technical Coverage Report (derived, reported — never a gate on the business tree)](#step-g4--the-technical-coverage-report-derived-reported--never-a-gate-on-the-business-tree)
- [Step G5 — The Harvest Candidate Report (REPORT ONLY — C9)](#step-g5--the-harvest-candidate-report-report-only--c9)
- [The Emit Template — fixed sections, declared order](#the-emit-template--fixed-sections-declared-order)
- [Mode: Audit](#mode-audit)

## Profile and generator applicability

Resolve `specArtifacts`, `techSpecScan`, and the generator's supported annotation contract before deriving anything. This reference applies only to the annotation-derived `TestSpec` / `TechnicalSpec` view. If a native artifact profile applies, return `UNSUPPORTED` for native technical-view generation before invoking the generator; do not translate native scenarios into duplicate TC annotations or emit an empty view. With no native profile, preserve the strict §8/TC default for annotation adopters. An absent `techSpecScan` is `NOT CONFIGURED`, never a successful zero-case map.

# Mode: Generate the DERIVED Technical View

## The Determinism Contract — read before emitting anything

**The tree's flagship oracle is C6: regenerate over unchanged source ⇒ empty diff.** An LLM is not naturally deterministic, so determinism here is **structural, not aspirational** — it is a consequence of never judging (C8) and never composing (below).

| Layer                                                | Determinism         | Mechanism                                                                                                   |
| ---------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------- |
| **File set** (which `{Component}.md` exist)          | **Deterministic**   | Derived from a grep over the code tree — same code, same set                                                |
| **Section structure + order + headings**             | **Deterministic**   | The fixed template below. No run may add, drop, or reorder a section                                        |
| **Anchors + IDs + banner + regenerate line**         | **Deterministic**   | Mechanical: `[Source:]` anchors, TC IDs, `{TestProject}::{TestClass}::{TestMethodName}` links               |
| **Tables**                                           | **Deterministic**   | Grepped facts in the **declared sort order** below — an undeclared sort is a non-determinism source disguised as a table |
| **Free-form prose**                                  | **NOT deterministic** | ⚠️ **The residual — which is why there is none. See the rule below**                                       |

> **[BLOCKING] The templated-prose rule.** Every emitted sentence is a **template instantiated with mechanically-derived values** — never free narration. **A fact that cannot be templated is emitted in a table, never in a sentence.**
>
> - ✅ `` `{Component}` handles {N} write operations, {M} read operations, {K} event-driven operations, and {J} background jobs. ``
> - ❌ *"This component is the heart of the ordering flow and is fairly complex, so take care when modifying the retry path."*
>
> **Why this rule is load-bearing twice over:** (1) it is what makes C6 achievable — composed prose drifts between runs and turns the oracle into a coin flip; (2) **it is the secret-safety control** — a generator that instantiates fixed templates over named, grepped fields **cannot** incidentally paste a connection string, token, or customer datum it happened to read in config, a seeder, or a fixture. An un-templated narrator can. Determinism and secret-safety share one mechanism.
>
> **If C6 proves flaky, SHRINK THE PROSE SURFACE. NEVER relax the oracle** — a relaxed oracle is how a derived tree quietly becomes a hand-maintained sibling.

**Declared sort keys (pinned — a table without its declared sort is non-deterministic):**

| Table                    | Sort key                                                                       |
| ------------------------ | ------------------------------------------------------------------------------ |
| Use Case Inventory       | `Layer` ascending (lexical)                                                    |
| Operation catalog        | `Kind` (Write, Read, Event, Background — in that fixed order), then `Operation` ascending (lexical) |
| TC ↔ test map            | `TC ID` ascending (lexical)                                                    |
| Cross-service topology   | `Boundary` (Producers, Consumers, Sagas, Sync calls, Shared contracts, Data ownership — fixed order), then `Message` ascending (lexical) |
| Coverage report          | Row order fixed by the template (never re-sorted)                              |
| Harvest candidate report | `[Source:]` anchor ascending (lexical)                                         |

---

## Step G1 — Derive the Use Case Inventory

**Goal:** count ALL operations the component owns. This is a **derived count** — the generator emits it because it counted, not because a mandate demands it.

> **[BLOCKING — C8] This is a count, not a judgment.** Do not assess importance, risk, or business relevance of any operation. Count it, anchor it, emit it.

**Write / read / event / background discovery greps** — substitute your stack's markers:

```bash
# Command handlers (CQRS write side) — grep your stack's command-handler marker
grep -r "{command-handler-marker}" {module-source-root}/ --include="{backend-source-glob}" -l
# Mutating HTTP endpoints — grep your web framework's create/update/delete route markers
grep -r "{write-endpoint-markers}" {module-source-root}/ --include="{backend-source-glob}" -l
# Read HTTP endpoints — grep your web framework's GET route markers
grep -r "{read-endpoint-markers}" {module-source-root}/ --include="{backend-source-glob}" -l
```

**Event-driven (K) and background (J) discovery** — grep your stack's consumer/handler and scheduled-job markers over `{module-source-root}`.

**Actor/Role discovery (feeds the Permissions & Roles derivation):**

```bash
# Authorization markers (permission checks + role guards) — substitute your stack's auth markers
grep -r "{authorization-markers}" {module-source-root}/ --include="{backend-source-glob}" -l
# Role / permission enumerations
grep -r "{role-and-permission-enum-markers}" {module-source-root}/ --include="{backend-source-glob}" -n | head -20
# Frontend route guards (if applicable) — substitute your UI framework's route-guard markers
grep -r "{route-guard-markers}" {frontend-root}/ --include="{frontend-source-glob}" -l 2>/dev/null | grep -i {module} | head -5
```

> **The roles this grep yields are architecture-derived** (authorization attributes and guards). They are emitted here as a **derived technical count**. **A role is a business noun; a permission attribute is not** — the *business* actor list lives in the Feature Spec and is owned by `/spec`. This skill never sources a business actor list, and never lets an auth attribute mint a business TC count.

**Use Case Inventory Output:**

| Layer    | Write Ops (N) | Read Ops (M) | Event-Driven (K) | Background (J) |  Total  | Actor Roles       |
| -------- | :-----------: | :----------: | :--------------: | :------------: | :-----: | ----------------- |
| {Module} |       N       |      M       |        K         |       J        | N+M+K+J | [roles from grep] |

**[GATE — BLOCKING before emitting the operation catalog]:**

- If Grand Total ≥ 20: MUST split the derivation into operation groups (≤20 ops each). Create one `TaskCreate` per group before starting any derivation phase.
- Actor catalog must list ≥1 role or flag as "No roles found — verify auth attributes manually"

> **The `≥20 ops → batch` mandate is a tractability control, not a floor.** It survives here verbatim because a large fan-out exhausts context mid-run and loses artifacts (C4). It is **not** a TC-count rule and it mints nothing.

> **⚠️ Both floor shapes exist and are NOT interchangeable — do not normalize them.**
>
> | Shape       | Includes                                    | Where it applies                                                     |
> | ----------- | ------------------------------------------- | -------------------------------------------------------------------- |
> | **N+M+K+J** | write + read + event-driven + **background** | The Use Case Inventory total above, and the technical coverage report |
> | **N+M+K**   | write + read + event-driven (**no `J`**)     | The §8 TC-authoring floor shape used by the business tree            |
>
> **Emit the shape the section declares. Never merge them into one number**, and never silently add `J` to an `N+M+K` context — the two shapes count different populations, and collapsing them makes a coverage claim false in one of the two places it is read.

---

## Step G2 — Derive the TC ↔ Test Map

**GENERATED, never hand-moved.** The map is a grep + join over annotations that **already exist in the test code**: business coverage uses the configured test-spec annotation (key `TestSpec`, value `TC-{FEATURE}-{NNN}`), while technical-only regression coverage may use a technical annotation (default key `TechnicalSpec`) that never joins to business §8.

1. Grep the configured test paths for the test-spec annotation → extract every TC ID and its owning test method.
2. Join: `TC ID → [{TestProject}::{TestClass}::{TestMethodName}, …]`. **One TC may be covered by many tests** (integration + unit, across components/services) — the annotation is the join key. **NEVER split a business TC to achieve a 1:1 map.**
3. Emit the map sorted by `TC ID` ascending.

> **[BLOCKING]** This skill **reads** TC IDs; it never **creates**, renames, renumbers, or deletes one. §8 of the Feature Spec is the canonical TC registry and `/spec [mode=tests]` owns it (**C2**).
> **[M2/M3 — keep anchors portable]** Facts carry the abstract `[Source: {namespace}/{service}/{id}]` anchor. The sole physical reference permitted is the operational `{TestProject}::{TestClass}::{TestMethodName}` link.

---

## Step G3 — Derive the Cross-Service Topology

Execute the host SKILL.md's `SYNC:cross-service-check` scan over `{module-source-root}`. Emit per touchpoint: **owner service · message name · consumers · risk (NONE / ADDITIVE / BREAKING)**, sorted by the declared key.

> The BLOCKED-until gate is satisfied here with **real grepped evidence** — this is the skill that actually derives the topology. Do not mark it N/A on a component that produces or consumes anything.

---

## Step G4 — The Technical Coverage Report (derived, reported — never a gate on the business tree)

Emit the component's technical coverage against its own inventory. **These are technical coverage obligations over architecture-derived counts** — the technical tree counts handlers, and it must not stop counting them.

| Check                        | Required                                       | Actual | Status    |
| ---------------------------- | ---------------------------------------------- | ------ | --------- |
| CRUD/Core covered            | ≥ Write Ops (N) from inventory                 | {n}    | PASS/FAIL |
| Read/View covered            | ≥ Read Ops with filters (M)                    | {n}    | PASS/FAIL |
| Event/Background covered     | ≥ Event-Driven (K) + Background (J)            | {n}    | PASS/FAIL |
| Permission paths covered     | ≥ derived actor-role count × 2                 | {n}    | PASS/FAIL |
| **Total**                    | ≥ Grand Total (N+M+K+J)                        | {n}    | PASS/FAIL |

Plus the per-operation coverage checks:

- **No orphan operation:** every write/read operation from the Use Case Inventory appears in ≥1 covered chain.
- **Operation → coverage:** every operation in the Use Case Inventory maps to ≥1 covering test, or is reported as a gap.
- **Chain count** ≥ the operation-catalog entry count (Grand Total from the Use Case Inventory).
- **[C-gate]** Chain entry count ≥ Grand Total from the Use Case Inventory.
- **[TC-gate]** Covering-test count ≥ Grand Total from the Use Case Inventory.

> **[BLOCKING] What this report is, and is NOT.**
>
> - It **IS** a derived count of technical coverage against grepped architecture, emitted in the technical tree where architecture-bound counting is correct.
> - It **IS NOT** a mandate that mints business test cases. **A FAIL here NEVER instructs `/spec` to author a TC**, and this skill never writes §8. A gap routes to `/integration-test` (a missing *test*), or is simply reported.
> - **Grand Total is a count the generator emits because it counted** — not a floor imposed on any business artifact. The business tree's §8 floor is business-sourced and is owned by `/spec`; this number has no authority over it.
>
> **Why the distinction is the point:** an architecture-derived number driving a *business* TC count is what made an auth attribute able to move a business floor. Counting handlers is correct **here** and wrong **there**. This is a re-homing, not an amnesty — the count survives, at the address where it is legitimate.

---

## Step G5 — The Harvest Candidate Report (REPORT ONLY — C9)

When the derivation surfaces an invariant **enforced at ≥2 points with no business rule citing it**, emit it to the candidate report:

| Candidate | Enforcement sites (`[Source:]` anchors) | Observable rule | Route |
| --------- | --------------------------------------- | --------------- | ----- |
| {id}      | {≥2 anchors}                            | {templated}     | `/spec [mode=update]` |

> **[BLOCKING — C9]** This report **never gates**. It is **exit 0**, never an `error`, never a build gate, never a precondition on regeneration. It **routes**; it never writes a rule.
> **A detection changes the report, never the tree** — so it cannot break C6. Regenerating the same source twice must still produce an empty diff whether or not a candidate was detected.
> The detector is a **structural proxy** with false positives (the rule-citation link is prose, not a key) and false negatives (an invariant enforced at a single chokepoint is invisible to a ≥2-point counter). **Recall is unmeasured.** Treat the output as a candidate list for human adjudication — nothing more.

---

## The Emit Template — fixed sections, declared order

Emit exactly these sections, in exactly this order. No run may add, drop, or reorder.

For a generated view over 200 physical lines, add a linked `## Contents` after the title and before the first section. Derive its labels and anchors from the actual section headings; this navigation does not add a semantic section. Keep compact views unchanged.

````markdown
> **DERIVED — regenerate with the tech-spec skill; do NOT hand-edit.** Source of truth: the code and tests under `[Source: {namespace}/{service}]`. Regenerated: {YYYY-MM-DD}.

# {Service} / {Component} — Technical View

## 1. Surface

`{Component}` handles {N} write operations, {M} read operations, {K} event-driven operations, and {J} background jobs.

| Layer    | Write Ops (N) | Read Ops (M) | Event-Driven (K) | Background (J) |  Total  | Actor Roles       |
| -------- | :-----------: | :----------: | :--------------: | :------------: | :-----: | ----------------- |
| {Module} |       N       |      M       |        K         |       J        | N+M+K+J | [roles from grep] |

## 2. Operation Catalog

| Kind | Operation | `[Source:]` anchor |
| ---- | --------- | ------------------ |

## 3. TC ↔ Test Map

| TC ID | Covering tests | Status |
| ----- | -------------- | ------ |

## 4. Cross-Service Topology

| Boundary | Owner service | Message | Consumers | Risk |
| -------- | ------------- | ------- | --------- | ---- |

## 5. Technical Coverage

| Check | Required | Actual | Status |
| ----- | -------- | ------ | ------ |

## 6. Harvest Candidates (report only — routes to `/spec [mode=update]`; never gates)

| Candidate | Enforcement sites | Observable rule | Route |
| --------- | ----------------- | --------------- | ----- |
````

> **[BLOCKING]** Write each file immediately after instantiating it; do NOT accumulate large outputs in context (**C4**).
> **[BLOCKING]** The banner is literal: `> DERIVED — regenerate with the tech-spec skill; do NOT hand-edit`. A file missing it is a build failure.
> **[BLOCKING]** No section of this template is an authoring surface. There is **no** section for a business rule, user story, acceptance criterion, or free-form insight — **by design, not by omission** (**C2**). Do not add one.

---

# Mode: Audit

Report which derived views lag their source. **Never mutates.**

1. For each `{TechRoot}/{Service}/{Component}.md`, read its regenerate date / compare against the mtime or git log of its `[Source:]` anchors.
2. Emit a stale-list: `{Component}` · regenerate date · newest source change · verdict (FRESH / STALE).
3. Route: `→ run /tech-spec [mode=generate]` for the configured technical root, then verify the
   regenerated view for each STALE component. The standalone generator intentionally owns one
   full-root generation contract; do not invent unsupported `--scope` or `--all` arguments.

> Audit reports staleness; it does not regenerate. A STALE view is not a defect in the view — it is the expected state of a projection whose source moved. **Regenerate; never patch.**
