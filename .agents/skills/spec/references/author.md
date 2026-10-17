> The `spec` skill (`../SKILL.md`) loads this body for `[mode=draft|init|update|audit|amend]`. The host SKILL.md selects the profile and routes to shared semantic gates; this body carries the authoring procedure.

## Contents

- [Native Profile Procedure](#native-profile-procedure)
- [Strict Default Feature-Spec Procedure](#strict-default-feature-spec-procedure)
- [Source Resolution (code vs idea) — resolve BEFORE Project Pattern Discovery](#source-resolution-code-vs-idea--resolve-before-project-pattern-discovery)
- [Project Pattern Discovery](#project-pattern-discovery)
- [Feature Documentation Generation & Verification](#feature-documentation-generation--verification)
- [\[CRITICAL\] MANDATORY CODE EVIDENCE RULE](#critical-mandatory-code-evidence-rule)
- [Output Structure](#output-structure)
- [MANDATORY 8-SECTION TECH-FREE STRUCTURE](#mandatory-8-section-tech-free-structure)
- [Step 0 — Mode Detection (MANDATORY FIRST)](#step-0--mode-detection-mandatory-first)
- [Phase 1: Module Detection & Context Gathering](#phase-1-module-detection--context-gathering)
- [Phase 1.5: Update Mode (when updating existing docs)](#phase-15-update-mode-when-updating-existing-docs)
- [Phase 2: Documentation Generation](#phase-2-documentation-generation)
- [Note: AI Companion Files Deprecated](#note-ai-companion-files-deprecated)
- [Phase 3: Derived Artifact Refresh Flag](#phase-3-derived-artifact-refresh-flag)
- [Anti-Hallucination Protocols](#anti-hallucination-protocols)
- [Phase 3.5: Verification (4 Passes)](#phase-35-verification-4-passes)
- [Quality Checklist](#quality-checklist)
- [Standalone Chain](#standalone-chain)

## Native Profile Procedure

Apply this branch when `spec` profile resolution selects a native contract from project config or the required project-reference docs. In that case, do not execute the strict-default procedure below: its eight-section template, TC IDs, Section 8, evidence syntax, numbering, size thresholds, and carrier names are conditional defaults, not additional native requirements.

1. **Resolve the owner and structure.** Read the configured business root and the project docs that name the canonical artifact, section roles, logical identifiers, ownership/lifecycle rules, evidence carriers, and case carriers. Follow any explicit local authority/supersession rules before judging declarations to conflict. Verify the target is hand-authored; a derived technical root stays with its generator. If a conflict remains, the owner is ambiguous, or an expected carrier is unsupported/unreadable, stop with `UNKNOWN`/`BLOCKED`; do not fall back to the default template.
2. **Read local examples before writing.** Inspect three or more relevant canonical siblings or case-carrier examples when available; if fewer exist, search related siblings and report the limited sample. Preserve accepted section order, identifier spelling, frontmatter, delivery slices and dependency order, lineage, and owner/scenario/variant identity. A configured root or filename does not authorize a new format.
3. **Draft or initialize through the native owner.** Keep the intent-role content distinct from normative contract details and evidence, following the owner references' rules for each role. Use the profile's requirement/acceptance/scenario identifiers and declared evidence/case fields; do not move contract detail into intent or create a second prose registry. Create a native carrier file only when its configured/local contract permits it. For an idea without implementation, use only the profile's declared draft/provisional mechanism; do not manufacture a default `Evidence: TBD` field unless the native owner defines it.
4. **Update narrowly.** Trace the changed behavior to its canonical owner; revise only the impacted native sections and cases, preserve stable identifiers and unrelated content, and reconcile lineage/status under the local lifecycle. Do not create a second numbered spec when the local tier rules require amending an owner.
5. **Amend bugs at the correct scope.** Investigate root cause and distinguish intended behavior from accidental behavior. Preserve the existing healthy contract. Add or change native scenario data only where the active profile owns that behavior; a technical-only fix does not automatically require a business case, and a missing native case is not automatically `N/A`.
6. **Keep the test contract complete.** Each scenario/case has a concrete expected outcome, owner-qualified identity, and requirement/invariant link. Across the relevant requirements and invariants, retain positive coverage, negative/boundary coverage where applicable, property domains for hard invariants, and preservation coverage for healthy behavior at risk in a bugfix. Apply the mandates that govern this artifact tree, authorship model, and operation; M6 remains a review/gate obligation, not a case-content requirement. Representation choice does not waive applicable semantic obligations.
7. **Prove traceability without overclaiming.** For every changed row, record the native carrier location and source evidence. For executable coverage, also record the executor, inspected assertion, and selected-runner result. Use manual-QC proof only when the profile explicitly authorizes it; record its approved procedure, observable expected outcome, and observed evidence without labeling it runner-executed. An ID/name match or source mapping alone is `mapped/unverified`, not executed coverage. An aggregate runner result proves only rows whose assertions were inspected and whose result was observed. If no selected execution result was observed, leave the row unverified; unresolved mappings or required unexecuted cases stay `UNKNOWN`/`BLOCKED`, never `PASS`.
8. **Keep reports disposable.** Put the trace table and extraction notes in the run's `tmp/` report. Never create a new tracked index, case registry, or generated view to make the mapping easier; request owner clarification if no declared carrier can express the contract.

### Native mode-specific behavior

| Mode | Native behavior |
| --- | --- |
| `draft` | Draft intent in the native owner format; mark provisional only as that profile specifies. Unknown product decisions remain explicit questions, not invented cases. |
| `init` | Create the owner using the configured local template/section roles and existing identifier rules; do not import the default eight-section/TC template. |
| `update` | Patch only impacted native intent/contract/case carriers; preserve identifiers, lineage, variants, and unrelated case data. |
| `audit` | Read-only report against native owners and carriers; unresolved selection or unsupported data is reported as `UNKNOWN`, not clean. |
| `amend` | Apply the local lifecycle and native case ownership after root-cause and behavior-scope adjudication; preserve healthy behavior and do not manufacture a TC. |

## Strict Default Feature-Spec Procedure

The rest of this file describes the strict default eight-section/TC representation. Run it only when the host resolved that profile. Its safeguards remain semantic requirements for a native profile only where the configured native contract expresses the corresponding obligation.

## Source Resolution (code vs idea) — resolve BEFORE Project Pattern Discovery

Every author-mode run sources from ONE of two inputs. Resolve which before any extraction:

| Source | Modes | Where §1-7 come from | §8 Evidence | Provisional? |
| ------ | ----- | -------------------- | ----------- | ------------ |
| **Code** (existing implementation) | `init`, `update`, `audit`, `amend` | grep/trace the implementation (the extraction phases below) | real `[Source: namespace/service/id]` anchors | no |
| **Idea** (requirement/prompt text, no code yet) | `draft` | derive from the requirement/idea text — NO code grep | `Evidence: TBD` (reference-only) | **yes** — `provisional: true` |

**`mode=draft` (idea → provisional spec):** the implementation does not exist yet, so the code-extraction phases (Step 1-INIT.* greps, optional graph hint, evidence verification) are **skipped**. Instead:

1. Derive §1-7 (Overview, Glossary, User Stories & AC, Business Rules, Domain Model, Process Flows & Interaction Surface, Permissions & Roles) from the supplied idea/requirement/prompt — SAME 8-section tech-free template (`detailed-feature-spec-template.md` in the templates root — default `docs/templates/`; a `docsRoots.templates.path` entry in `docs/project-config.json` overrides the path), SAME M1-M5 + M7 mandate rules, SAME size caps. Draft does NOT get a lighter template — only a lighter evidence obligation. In particular M7 binds a draft exactly as it binds a code-sourced spec: an idea-sourced §8 TC shell is still judged by the demo test, and having no code yet is never a reason to admit a technical case. For a UI-bearing idea, populate §6.2–6.5 (View Inventory, Navigation Map, Key UI States, Per-Story Interaction Flow) per the §6 sub-procedure above from the idea text, and record any companion `design_spec:`/`mockup:` path supplied with the idea in YAML frontmatter; backend-only ideas state the §6 skip reason explicitly.
2. Author §8 TC **shells** in the canonical `tc-format.md` template (Objective, GWT, AC, Test Data, Edge Cases) but set **`Evidence: TBD`** and **`Status: Planned`** — these are reference-only until code lands.
3. Flag the spec provisional: add `provisional: true` to YAML frontmatter and a header banner `> **DRAFT — provisional spec, unverified until code lands. §8 evidence is TBD.**`. Preserve the applicable branch metadata alongside the provisional marker. For a large idea, carry the complete `large_idea_decomposition` block; for an ordinary idea, do not add roadmap or milestone placeholders. Provisional means code evidence is pending, not that product scope is undecided.
4. State the next step explicitly: *"Reconcile against real code via `$spec [mode=update]` once implemented — that run upgrades every `Evidence: TBD` to a real `[Source:]` anchor and clears the provisional flag."*

**Draft → update transition rule (BLOCKING for the first code-backed run):** when `update` (or `init`, if the draft was a scratch file later replaced) runs against a spec carrying `provisional: true`, it MUST (a) replace every §8 `Evidence: TBD` with the verified `[Source: namespace/service/id]` anchor discovered from code, (b) flip each upgraded TC `Status` from `Planned` to `Untested`/`Tested` per `sync`, and (c) remove `provisional: true` + the DRAFT banner. A spec that still has any `Evidence: TBD` MUST keep its provisional flag. `tests`/`sync` need no special-casing beyond this upgrade — a TBD TC is treated as a not-yet-implemented TC.

## Project Pattern Discovery

Before implementation, search codebase for project-specific patterns:

- Search: `specs`, `feature specs`, `feature-spec-template`
- Look for: existing feature doc folders, 8-section tech-free templates

> **[BLOCKING]** Read `feature-spec-reference.md` for project-specific patterns. If not found, use search-based discovery.

# Feature Documentation Generation & Verification

Generate feature docs following project conventions.

**GOLD STANDARD:** Search existing feature docs: `find docs/specs -name "README.*.md" -type f | head -5` — `docs/specs` is the DEFAULT spec root; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path (substitute it into the command when configured).

**Template:** `detailed-feature-spec-template.md` in the templates root — default `docs/templates/`; a `docsRoots.templates.path` entry in `docs/project-config.json` overrides the path.

---

## [CRITICAL] MANDATORY CODE EVIDENCE RULE

**EVERY test case MUST ATTENTION have verifiable code evidence — non-negotiable.**

### Evidence Format

Evidence is a **stack-portable abstract anchor** — never a donor physical code coordinate or repository-root path:

```markdown
**Evidence**: `[Source: {namespace}/{service}/{id}]`
```

Namespace ∈ `operation | event | component | schema | requirement | rule | constraint | test`. Service = owning module (lowercased). Id = the artifact concept with code suffixes stripped. Physical coordinates are recoverable only via the provenance sidecar. Full contract: `shared/tc-format.md`.

### Valid vs Invalid Evidence

| Valid                                       | Invalid                                       |
| ------------------------------------------- | --------------------------------------------- |
| `[Source: operation/orders/CreateOrder]`    | physical code coordinates                     |
| `[Source: component/orders/Order]`          | `{namespace}/{service}/{id}` (template)       |
| `[Source: event/accounts/AccountUserSaved]` | "Based on CQRS pattern" (vague)               |

> **Carrier-field only:** the abstract anchor (and the `CoveredBy` coverage link) appear ONLY inside the `**Evidence**` / `CoveredBy` fields — never in a test case's behavioral description, which stays tech-agnostic (`spec-principles.md §3`). `CoveredBy` is the lone exception that keeps physical `{TestFile}::{MethodName}` link(s), test-filter expressions, or manual-QC coverage — it may list **several** covering tests, since one business TC maps to many tests (operational QA glue; see `tc-format.md` → TC ↔ Test Code Cardinality). Legacy `IntegrationTest:` is accepted only as migration input.

---

## Output Structure

All documentation MUST be placed in correct folder structure:

```
docs/
├── templates/
│   └── detailed-feature-spec-template.md  # MASTER TEMPLATE
└── specs/
    ├── {Module}/                     # One folder per service/module in your project
    │   ├── INDEX.md                  # Navigation hub
    │   └── README.{FeatureName}.md   # Tech-free Feature Spec (8-section; no line-count cap)
    └── ...
```

### Module Mapping

Search your codebase to discover the module-to-folder mapping:

```bash
# Find all service / module source directories (resolve {services-root} from the project structure reference / docs/project-config.json)
ls -d {services-root}/*/

# Find all existing feature doc modules
ls -d docs/specs/*/
```

Map each module code to its folder name and service path. Example pattern:

| Module Code | Folder Name | Service Path              |
| ----------- | ----------- | ------------------------- |
| {Module1}   | `{Module1}` | `{services-root}/{Module1}/` |
| {Module2}   | `{Module2}` | `{services-root}/{Module2}/` |

---

## MANDATORY 8-SECTION TECH-FREE STRUCTURE

All feature documentation MUST follow this section order. The doc is **tech-free** — zero technical terms in prose (no API routes, command/handler names, message-bus/event-contract schemas, code, or file paths). Code is the technical source of truth; the doc owns the business truth. Technical sections (Commands, Events-as-contracts, API Reference, Cross-Service, Performance, Troubleshooting) are NOT spec-doc content and are removed.

| #   | Section                              | Audience    |
| --- | ------------------------------------ | ----------- |
| 1   | Overview                             | All         |
| 2   | Glossary                             | All         |
| 3   | User Stories & Acceptance Criteria   | PO, BA, QA  |
| 4   | Business Rules                       | BA, Dev, QA |
| 5   | Domain Model                         | BA, Dev     |
| 6   | Process Flows & Interaction Surface  | BA, QA, UX  |
| 7   | Permissions & Roles                  | BA, Dev     |
| 8   | Test Specifications                  | QA, Dev     |

Plus YAML frontmatter (header/metadata). Domain events appear in Section 5 / Section 6 only as business-meaningful occurrences, never as bus/message schemas.

### Section 6 — Process Flows & Interaction Surface authoring sub-procedure

§6 carries a tech-agnostic interaction surface alongside the process flows, per the `SYNC:ui-intent-layer` block (carried in `spec/SKILL.md`). Author every UI-bearing spec's §6 with these subsections; describe everything by UX ROLE, observable state, and logical-ID cross-ref — NEVER by framework/route/CSS/component-class name (M1-clean):

- **6.1 Process Flows** — the existing step tables + business-trigger flow diagrams (unchanged content).
- **6.2 View Inventory** — one row per view by its UX role and purpose (e.g. "View Inventory" listing "list of items", "item editor", "confirmation step"): what information it presents, primary actions, and the driving `US-`/`OP-`.
- **6.3 Navigation Map** — how a user moves between views: entry points, transitions (business triggers), exits; trace how this surface connects to neighbouring already-built features.
- **6.4 Key UI States** — the distinct observable states per view (empty, loading, populated, error, success, permission-denied) described as what the user perceives, cross-referenced to the triggering `OP-`/`BR-`.
- **6.5 Per-Story Interaction Flow** — per `US-{FC}-NN`: the numbered click/action path from intent to outcome (actor action → observable system response), cross-referenced to the logical IDs the spec already owns.

When a companion `design-spec`/mockup exists, record its path in the spec frontmatter (`design_spec:` / `mockup:`) so the spec stays the navigable hub; keep deep visual fidelity (layout, tokens, pixel detail) OUT of §6 and in that companion. **Skip §6.2–6.5 ONLY** when the feature is backend-only (no UI) — state that reason explicitly in §6.

### Stakeholder Quick Navigation

| Audience              | Sections                                                                 |
| --------------------- | ------------------------------------------------------------------------ |
| **Product Owner**     | Overview, User Stories & Acceptance Criteria                             |
| **Business Analyst**  | User Stories & Acceptance Criteria, Business Rules, Process Flows, Domain Model |
| **QA/QC**             | Test Specifications, Acceptance Criteria, Business Rules                  |
| **Developer / AI**    | Domain Model, Test Specifications (+ the hidden `[Source:]` carriers); the technical contract lives in code |

---

## Step 0 — Mode Detection (MANDATORY FIRST)

**Before any extraction, detect mode:**

1. Check `<spec root>/{Bucket}/` exists (or `--audit` flag) — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path
2. If auto-detected module, check the entire `<spec root>/` tree — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path
3. Present detected mode via `ask user question tool` before proceeding — NEVER auto-start

**Mode routing:**

| Condition                                    | Mode       | Next Step                          |
| -------------------------------------------- | ---------- | ---------------------------------- |
| Source is an idea/requirement/prompt, **no code yet** (explicit `[mode=draft]`) | **DRAFT** | → Source Resolution (idea branch): author §1-7 from text + §8 shells with `Evidence: TBD` + provisional marker |
| `<spec root>/{Bucket}/` NOT found AND code exists to source from (default `docs/specs`; `specRoots.business.path` in `docs/project-config.json` overrides the root) | **INIT**   | → Mode: INIT                       |
| `<spec root>/{Bucket}/` exists (default `docs/specs`; `specRoots.business.path` in `docs/project-config.json` overrides the root) | **UPDATE** | → Phase 1.5 (existing update mode) |
| `[mode=amend]` arg (bugfix caller) AND doc exists | **AMEND** | → Mode: AMEND (scoped: regression TC + AC adjust only) |
| `[mode=amend]` arg (bugfix caller) AND doc does **NOT** exist | **INIT** (code exists) / **DRAFT** (no code yet), then seed bug case | → run INIT/DRAFT to create the governing spec, then add the regression `TC-{FC}-NNN` for the bug case to §8 (Status `Untested`). Do NOT no-op. |
| `--audit` flag OR user requests audit        | **AUDIT**  | → Mode: AUDIT                      |

> **Scale gate for INIT mode (workflow context only):** If `workflow-code-to-spec` is the caller AND module_count ≥ 4 → MUST spawn sub-agents (one per module) in ONE message. When `spec` is invoked STANDALONE for a single module, no scale gate applies — single-module init is always single-session.

> **Mode: AMEND (bugfix scope — NOT a re-author).** Triggered by `spec [mode=amend]` from the bugfix workflow (inserted after `investigate --mode=debug`, before `plan`). A bug fix changes a narrow slice of behavior. Do the MINIMUM — touch only the sections the bug touches.
>
> ### [GATE — BLOCKING] Business-visibility gate (**mandate M7**) — run BEFORE any other branch
>
> **This gate IS mandate M7** (`shared/sdd-artifact-contract.md` → *AI-SDD Mandates*, *Business-Visibility Gate*). Record the verdict with the mandate ID so it is greppable and a reviewer can re-check it: **M7 is enforced at BOTH authoring and review**, and a verdict that names no mandate is one a reviewer cannot audit.
>
> **Answer this first, in writing, with evidence:**
>
> > **Did this bug change what a user or QC can observe, demo, or rely on — the business rule, the user-visible outcome, or the business data state?**
>
> - **NO → TECHNICAL-ONLY. The correct output is a NO-OP on this spec.** Record `M7 TECHNICAL-ONLY — no business behavior changed; no §8 TC added` naming the surface with `file:line` evidence, and **STOP**. Route the regression to the **technical spec tree** and to an integration test, which is where regression protection belongs. **A no-op here is the CORRECT, EXPECTED result — never a coverage failure, never a gap, and never something to apologize for.**
> - **YES → BUSINESS-VISIBLE.** Continue to the amend/init branch below and author the TC in demo form (actor → flow → observable expectation).
>
> **TECHNICAL-ONLY (→ no §8 TC):** a consumer/event-handler/sync-processor not firing; a read-model or projection lag; a serialization, mapping, or round-trip persistence defect; a null-reference/exception; a query/index performance fix; a race or idempotency defect; a DI/config/migration error; a retry/timeout; a UI rendering, CSS, layout, or overflow defect; a data-load or pagination mechanic — **where the business rule, the user-visible outcome, and the business data state are all unchanged.** *(Illustrative, not exhaustive — the test below governs.)*
>
> **BUSINESS-VISIBLE (→ §8 TC required):** the system enforced the wrong business rule; a user saw a wrong value, total, status, or permission decision; a business data state ended up incorrect; a documented AC did not hold.
>
> ⚠️ **The test is NOT "can I phrase this without technical words."** Any technical case can be laundered into tech-free prose — *"the system correctly synchronizes the employee record"* is a technical TC in a business costume, and it is **exactly** the failure this gate exists to stop. **The operative test:**
>
> > **Could a QC engineer DEMO this as a business outcome, and would a stakeholder recognize the value?** If the only way to observe it is to inspect a queue, a projection, a log, a consumer, or a database row that no user-facing behavior depends on — **it is TECHNICAL-ONLY.**
>
> **Most bugfixes are TECHNICAL-ONLY, and that is normal.** The feature was always *supposed* to work this way; the code failed to deliver it. **When pre-fix and post-fix business behavior are identical — the business rule was already correctly specified — there is no new business rule to state and NO business TC to add.** The spec was not wrong; the code was.
>
> **[HARD] Never manufacture a business TC to satisfy a process.** A spec that gains a TC per bugfix becomes a changelog of defects instead of a statement of intended behavior — un-demoable, and useless for re-implementing the system on a different architecture.
>
> **Record the verdict either way, naming the surface with `file:line`.** A bare *"TECHNICAL-ONLY"* with no named surface is a rubber stamp; the citation is what makes the verdict reviewable.
>
> ---
>
> **Branch (BUSINESS-VISIBLE only) — amend vs init (mirrors `fix` standalone §3 spec-correctness check).** Before amending, confirm a governing Feature Spec exists for the buggy area under the spec root (default `docs/specs/`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path):
> - **Governing spec exists** → do the scoped AMEND below.
> - **No governing spec exists** → do NOT no-op **(this branch is reached only for a BUSINESS-VISIBLE bug — the gate above has already ruled out TECHNICAL-ONLY)**. Route to **INIT** (code exists to source from) or **DRAFT** (no code yet) to create the spec, then add the bug case as a regression `TC-{FC}-NNN` to §8. Record `No governing spec — created via {INIT|DRAFT}, bug case seeded as TC-{FC}-NNN` with `file:line` evidence.
> - **Governing spec exists, §1-§7 already correct, but NO existing TC covered the bug case** → skip the §4/§3 wording edits and add ONLY the regression `TC-{FC}-NNN` (item 3). The spec was *correct but lacked the bug case* — never leave a **business-visible** case undocumented.
>
> Scoped AMEND steps (governing spec exists):
>
> 1. **§4 Business Rules** — if the bug violated or mis-stated a rule, correct ONLY that rule's wording (preserve its `BR-{FC}-NNN` ID verbatim, keep its [HARD]/[SOFT] tag). If the spec documented the *buggy* behavior (Spec Bug per the bugfix SPEC-BUG GATE), fix the rule to the intended behavior.
> 2. **§3 Acceptance Criteria** — adjust ONLY the AC the fix changes; add a new `AC-{FC}-NN` if the fix guarantees a new behavior. Preserve existing AC IDs.
> 3. **§8 Test Specifications** — add the regression `TC-{FC}-NNN` guarding the fix (GIVEN bug repro / WHEN fixed path / THEN correct outcome) + its `CoveredBy: {File}::{Method}` once the regression test exists (Status `Untested` until it lands).
> 4. **§6 Interaction Surface** — touch ONLY if the fix changed an observable UI behavior the spec records (a view's role, a navigation transition, an observable state, or a per-story click-path); then correct ONLY that affected §6.2–6.5 line, M1-clean. Otherwise leave §6 alone.
> 5. Do NOT re-extract the domain model, re-investigate the whole module, or rewrite §1/§2/§5/§7 (or §6 beyond the scoped line in item 4).
>
> Scale doc work to change size — full INIT/UPDATE extraction is FORBIDDEN in AMEND.

---

### Mode: INIT (New Feature Doc) — Full Extraction from Zero

When no docs exist, run source-first extraction (entities, rules, flows read from source) before folding into the 8-section tech-free Feature Spec.

> **Resolve the project's layout before extracting.** Read the project's structure reference and project config to discover
> the module source root, layer/folder conventions, file globs, and framework markers (endpoint attributes, handler types,
> event/consumer types). The **extraction strategy is stack-agnostic** — inventory files → enumerate use-cases/operations →
> trace cross-service flow → fold into the 8 tech-free sections. The `{...}` placeholders and concrete commands shown below
> are illustrative; substitute the values discovered for the current stack. The emitted Feature Spec stays tech-free regardless (M1).

#### Step 1-INIT.1: Holistic investigate

Map module's codebase before reading any file in detail:

1. Run `git ls-files {module-source-root}/` (resolve `{module-source-root}` from the project structure reference / `docs/project-config.json`) — full file inventory
2. Identify: entity files, command files, query files, controller files, event handler files, frontend components
3. Build **Module Extraction Map**:
    - Entity layer: list all entity/aggregate files
    - Validation layer: list all validator files
    - Command layer: list all command handler files
    - API layer: list all controller files
    - Event layer: list all event handler + bus consumer files
    - Frontend: list all component + service + store files

#### Step 1-INIT.1.5: Use Case Enumeration [BLOCKING — MUST complete before Step 2 / Phase A]

**Goal:** Enumerate operations to discover **what the system does**, so no capability is missed when authoring §3 journeys and §7 permissions. **This number is NOT the minimum TC count for Section 8** — the business TC floor is `business_floor` (below), which reads only spec sections. Operation counts are architecture-derived and belong to the technical spec tree.

**Write-side entry points:**

```bash
# Command handlers (CQRS write side) — grep your stack's command-handler marker
#   (e.g. a CommandHandler/ICommandHandler type, a MediatR request handler, or a use-case class)
grep -r "{command-handler-marker}" {module-source-root}/ --include="{backend-source-glob}" -l
# Mutating HTTP endpoints — grep your web framework's create/update/delete route markers
#   (e.g. POST/PUT/PATCH/DELETE attributes or route decorators)
grep -r "{mutating-endpoint-markers}" {module-source-root}/ --include="{backend-source-glob}" -l
# Event consumers / background jobs — grep your stack's consumer + scheduled-job markers
grep -r "{event-consumer-and-job-markers}" {module-source-root}/ --include="{backend-source-glob}" -l
```

**Read-side entry points:**

```bash
# Query handlers (CQRS read side) — grep your stack's query-handler marker
grep -r "{query-handler-marker}" {module-source-root}/ --include="{backend-source-glob}" -l
# Read HTTP endpoints — grep your web framework's GET route markers
grep -r "{read-endpoint-markers}" {module-source-root}/ --include="{backend-source-glob}" -l
```

**Actor/Role Discovery — §7 (Permissions & Roles) AUTHORING ONLY:**

⚠️ **[HARD] These greps are a discovery aid for §7 content. They MUST NOT feed any TC count.** `count(§2 actors)` in `business_floor` reads **§2's actor list**, never this grep. A permission attribute is an implementation of a role, not the role itself — sourcing a count from it makes the floor move when authorization is refactored, with zero business change. **Use these to discover roles you then write into §2 as business nouns; from that point on, §2 is the only source.**

```bash
# Authorization markers (permission checks + role guards) — substitute your stack's auth markers
grep -r "{authorization-markers}" {module-source-root}/ --include="{backend-source-glob}" -l
# Role / permission enumerations
grep -r "{role-and-permission-enum-markers}" {module-source-root}/ --include="{backend-source-glob}" -n | head -20
# Frontend route guards (if applicable) — substitute your UI framework's route-guard markers
grep -r "{route-guard-markers}" {frontend-root}/ --include="{frontend-source-glob}" -l 2>/dev/null | grep -i {module} | head -5
```

**[GATE — BLOCKING before Phase A extraction]:**

- **The minimum Section 8 (Test Specifications) TC count is `business_floor`** — defined below. **It is NOT a function of the operation count.** The enumeration above informs *what to write about*; it MUST NOT set *how many* business TCs exist.
- If `business_floor` ≥ 20: MUST split extraction into operation groups (≤20 ops each). Create one todo tracking per group before starting any extraction phase.
- Actor catalog must list ≥1 role or flag as "No roles found — verify §2's actor list manually"

**The business TC floor:**

```
business_floor = (§3 US × AC)
               + count([HARD] §4 business rules)
               + count(§5 entity invariants)
               + count(§5 state transitions) × 2     // valid + invalid
               + count(§2 actors) × 2                // authorized + unauthorized
               + count(observable §6 states)
```

**All inputs are business-shaped; _re-architecting cannot move the number_.** That sentence is the whole point of the floor, and it is true **only because every term names the spec section it reads from**. Adding a handler, a consumer, an event handler, or a background job does **not** move `business_floor` — none of them is an input to it.

**[HARD] No term may be fed by a source grep.** The floor's inputs are a **closed set of spec-section references**. This block MUST contain zero `grep`/`rg` over `{module-source-root}`.

- **`count(§2 actors)` reads §2's actor list — NEVER a permission-guard grep.** A role is a business noun; a permission attribute is not. Sourcing actors from `{authorization-markers}` would let a new auth attribute move a "business" floor by +2 with zero business change — a technical floor wearing a business name.
- **Falsifier (the test that matters):** add an authorization attribute naming a new role, **and** add a handler → **`business_floor` MUST NOT move.** If it moves, this gate is architecture-derived regardless of what it is called.

> **Why this floor and not an operation count.** A business spec must be re-implementable on *any* architecture — the same feature as a monolith or as microservices yields the **same** user stories, acceptance criteria, and TCs. A floor derived from handler/consumer/job counts makes the spec a mirror of one implementation: re-architect, and the "business" TC count changes though no business behavior did. Operation-derived coverage is a **real obligation** — it belongs to the **technical** spec tree, which is architecture-bound by design.

#### Step 1-INIT.2: Domain Model Extraction (Phase A)

For each entity in Entity layer:

1. Read entity file
2. Extract: name, purpose (1 sentence), attributes (name, required, constraint, business meaning), lifecycle states, invariants
3. Identify relationships: FK fields, navigation properties, collection fields → cardinality
4. Write entity description with `[Source: component/{service}/{Entity}]` abstract anchor (physical coords → provenance sidecar)
5. Collect all entities for ERD generation

**ERD Generation (mandatory after all entities extracted):**

- Generate Mermaid `erDiagram` block
- Tech-agnostic types only: `string`, `number`, `boolean`, `date`, `list`, `map`
- Mark aggregate roots with `%% [AGGREGATE: ...]`
- Cross-module references as stubs: `%% [CROSS-REF: module-name]`
- Save ERD in `tmp/analysis/{Module}-erd.md` for Section 5

#### Step 1-INIT.3: Business Rules Extraction (Phase B)

For each validator/command handler in Validation layer:

1. Read file, extract validation rules (field → rule → error condition → error message)
2. Extract authorization rules (operation → who can perform → condition)
3. Extract state machine transitions if entity has lifecycle states
4. Write with `[Source: rule/{service}/{RuleName}]` abstract anchor per rule group

#### Step 1-INIT.4: API Contracts Extraction (Phase C)

For each application-layer entry point — read in this priority order:

1. **CQRS command handlers** (the command-handler folder) — one entry per handler class. Extract: handler name → business operation name (tech-agnostic), command fields, validation rules referenced, output type.
2. **CQRS query handlers** (the query-handler folder) — one entry per handler class. Extract: operation name, filter parameters, return shape, pagination.
3. **Event consumers** (the event-handler folder) — one entry per consumer. Extract: event consumed, side effects produced, output state changes.
4. **Background jobs** — one entry per job. Extract: schedule/trigger, operation performed, side effects.
5. **REST controllers** — supplementary only (HTTP adapter layer). Extract: HTTP method + path + auth required + DTO shape for operations NOT already covered by handlers above.

Write operation description in business language only — no language/framework type names or class names. Write with `[Source: operation/{service}/{Operation}]` abstract anchor per entry.

**MUST: Every business capability a user can observe or invoke → exactly one Phase C entry.** After Phase C: confirm every §3 user story and every observable §6 state is reachable through ≥1 entry. If a capability has no entry → create fill tasks before Phase D.

**Coverage is measured against business capabilities, not against the operation count.** Two handlers serving one user-visible capability are **one** entry, not two; one handler serving two distinct capabilities is **two**. The mapping is deliberately not 1:1 with the architecture — that is what makes the spec survive re-implementation.

#### Step 1-INIT.4.5: Cross-Service Scope Trace (optional graph hint; before Domain Model events)

Before capturing domain events as occurrences, discover ALL consumers and producers by grep/read of the project's message/event markers (bus-message, consumer, integration-event types — see the project's message-bus reference). Optional: when the cross-service blast radius is hard to see by grep and `.code-graph/graph.db` exists, graph analysis can add hints (it may be stale — verify by reading):

```bash
# Trace cross-service flow from the primary entity/model file
python .claude/scripts/code_graph trace {path-to-primary-entity-file} --direction both --json

# Find all files connected to the primary service entry point (e.g. the primary controller/endpoint file)
python .claude/scripts/code_graph connections {path-to-primary-controller-file} --json
```

**Grep for the project's message/event markers** (the primary method; the only one when `.code-graph/graph.db` is unavailable):

```bash
grep -rn "{message-bus-and-event-markers}" {module-source-root}/ --include="{backend-source-glob}"
```

Use the grep/read results (and any graph hint) to enumerate: outbound events (produces), inbound events (consumes), cross-service reactions. Feed business-visible findings into **Section 5 (Domain Model)** as business-meaningful occurrences (e.g. "Order Placed" → owner notified, order becomes active) and into **Section 8 (Test Specifications)** only when the case passes M7 as a demoable business outcome. Technical-only publish/consume, payload, retry, idempotency, and projection mechanics belong in the technical spec tree and test code — NEVER as bus/message/payload schemas in the business Feature Spec.

#### Step 1-INIT.4.6: Full-Chain Vertical Trace [BLOCKING — the completeness backbone]

**Why this step exists:** Phases A–D enumerate each layer *in isolation* (entities, rules, operations, events). A spec authored from layer-parallel inventories silently misses behavior that lives only in the *seams* — a UI action whose handler was never enumerated, a write operation that no screen ever invokes (dead or headless?), a read model populated by an event with no documented producer. **A correct, nothing-missed spec requires tracing the COMPLETE vertical slice front-to-back for every user-facing capability**, not just listing the layers. This is the operative guard for "the spec is correct and nothing is missed."

**For EACH user-facing capability (and each background/event-driven flow), trace the full chain end-to-end:**

```
UI view / entry point
  → user action (click / submit / navigation)
    → API call / route
      → command OR query handler (application layer)
        → domain entity + business rule(s) invoked / invariant enforced
          → persistence (state change)
          → domain/integration event emitted (if any)
            → consumer(s) / saga / background reaction
              → read model / projection updated
  → API response
    → UI observable state change (success / error / empty / loading / permission-denied)
```

**Tooling (use in this order; each link must be evidenced, never inferred):**

1. **Frontend→backend links — grep the UI service/data layer for API call sites** (optionally `graph-code --mode=connect-api` as a stale-able hint): map each view/screen action to the backend route/operation it invokes. This is the seam Phase C (backend-only) and Phase E (UI-only) each see from one side; this step JOINS them.
2. **Backend flow — read the code** (optionally `graph-code --mode=trace`: `python .claude/scripts/code_graph trace {entry-file} --direction both --json`, a stale-able hint): from each handler, trace down to entity/rule and outward to events/consumers. Reuse the 1-INIT.4.5 cross-service output for the event tail.
3. **Read-side closure:** for every write that emits an event, trace to the projection/read model and to the view that displays it — so the chain returns to the UI, not just to persistence.

**Output — Full-Chain Trace Map** (working note in `tmp/analysis/{Module}-chain-map.md`; folds into §6 flows + §8 TCs):

| Chain ID | UI view + action | API/operation | Handler | Entity + BR enforced | Event(s) | Consumer/read-model | UI outcome state | Status |
| -------- | ---------------- | ------------- | ------- | -------------------- | -------- | ------------------- | ---------------- | ------ |
| CH-{MOD}-01 | {view} · {action} | {operation} | {OP-id} | {entity} · {BR-id} | {event or —} | {consumer/projection or —} | {success/error state} | COMPLETE / BROKEN |

**[GATE — BLOCKING before Phase E / §6 / §8] Chain Reconciliation — flag every unmatched link:**

- [ ] **No orphan UI:** every view/action in the UI inventory maps to ≥1 backend operation — an action with no backend link is either dead UI or a missing-operation discovery (investigate, don't drop).
- [ ] **No orphan capability:** every §3 user story and every observable §6 state appears in ≥1 chain — surfaced in a view, OR explicitly justified as observable only through a later business outcome, with the reason recorded.
- [ ] **Event closure:** every emitted domain/integration event has both a traced producer AND ≥1 consumer/read-model (or is recorded as fire-and-observe with no consumer by design); no event dead-ends silently.
- [ ] **Read-side closure:** every event-driven projection/read model terminates at a view or a documented downstream consumer — the chain returns to an observable outcome.
- [ ] **BROKEN links surfaced, never hidden:** any chain that cannot be completed end-to-end is recorded `Status: BROKEN` with the missing link named and confidence stated — a BROKEN chain is a spec-correctness finding, not an omission.

**Feeds:** each `COMPLETE` chain → one §6.5 Per-Story Interaction Flow + ≥1 §8 TC spanning the full slice (not a handler-only TC); each `BROKEN`/headless chain → an explicit note in §6 (or the §6 backend-only skip reason) and a `Status: Planned`/flagged TC. **Skip the UI columns ONLY** for a backend-only module (no UI) — still trace operation → entity → event → consumer → read model and run the operation/event/read-side reconciliation rows.

#### Step 1-INIT.5: Events & Jobs Extraction (Phase D)

For each event handler and bus consumer:

1. Extract: event name, trigger, payload fields, ordering guarantee
2. Background jobs: schedule, purpose, side effects, abort condition
3. Write with `[Source: event/{service}/{Event}]` abstract anchor (use `operation/{service}/{Job}` for background jobs)

> **Working notes only — NOT doc prose.** Payload fields / ordering guarantees / schedules captured here are extraction notes. They fold into **Section 5 (Domain Model)** as business-meaningful occurrences (what happens, who reacts, the business outcome) and into **Section 8** only when they produce a demoable business outcome — NEVER into prose as bus/message/payload schemas (those are the code's responsibility). Technical-only event/job mechanics belong in the technical spec tree and test code. See Step 1-INIT.7.

#### Step 1-INIT.6: User Journey Synthesis (Phase E)

**Sources — all three required:**

1. **Backend operations** (from Phase C): every write op → one user story; every read/query with filter params → one search/list/view story
2. **UI routes and screens**: each distinct route/page in frontend module = one screen story
3. **Actor catalog** (from Step 1-INIT.1.5): every actor MUST appear in ≥1 story

**User Story format (MANDATORY for every story):**

> "As a {actor from actor catalog}, I want to {action verb + object}, so that {business outcome}."

**Story template:**

```markdown
## Journey: {JourneyName}

- **User Story:** As a {actor}, I want to {action}, so that {outcome}.
- **Actor:** {exact role name from actor catalog}
- **Operation Type:** write | read | event-driven | background | ui-screen
- **Trigger:** {what starts this journey}
- **Preconditions:** {what must already exist}
- **Happy Path:** 1. {Step 1} ...
- **Alternative Paths:** {Condition A} → {what happens}
- **Outcome:** {what actor achieves}
- **Acceptance Criteria:**
    - GIVEN {precondition} WHEN {action} THEN {outcome}
      [Source: operation/{service}/{Operation}]
```

**Per-phase E completeness checklist (BLOCKING before proceeding to Step 1-INIT.7):**

- [ ] Journey count ≥ Phase C entry count
- [ ] Every actor in actor catalog appears in ≥1 journey
- [ ] Every UI route discovered has ≥1 screen story
- [ ] Every GET/query with filter params has a search/list/view story
- [ ] Every story uses "As a / I want / So that" format
- [ ] Every story has `[Source: operation/{service}/{Operation}]` abstract anchor

#### Step 1-INIT.7: Transform to 8-Section Tech-Free Format

After extraction is complete, fold the extracted content into the 8 business sections. Technical artifacts (commands/handlers, API routes, message/event contracts, UI component names) are the code's responsibility and are NOT written into the doc — they only *inform* the business sections and test cases below:

| Extracted Phase    | Target Section(s)                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| Phase A entities   | Section 5 (Domain Model) — relationships + business-meaning columns, plain types + `[Source: component/{service}/{Entity}]` |
| Phase B rules      | Section 4 (Business Rules, BR-XX) + Section 3 (the acceptance criteria they constrain)                         |
| Phase C operations | Section 3 (User Stories & AC — the business need behind each operation) + Section 8 (Test Specs) — **NOT** a Commands/API section |
| Phase D events     | Section 5 (Domain Model — as business-meaningful occurrences) + Section 8 only for demoable business outcomes — **NEVER** as bus/message schemas |
| Phase E journeys   | Section 6 (§6.1 Process Flows) + Section 3 (User Stories & AC) + Section 8 (Test Specs)                        |
| UI interaction surface (UI-bearing features) | Section 6 (§6.2 View Inventory, §6.3 Navigation Map, §6.4 Key UI States, §6.5 Per-Story Interaction Flow) per the §6 sub-procedure — UX roles + observable states + `US-`/`OP-`/`BR-` cross-refs only; record companion `design_spec:`/`mockup:` frontmatter when present; backend-only specs state the §6 skip |
| Auth rules         | Section 7 (Permissions & Roles — business RBAC matrix, no auth-implementation detail)                          |

**[BLOCKING] Section 8 Readiness Gate** — Before writing Section 8 (Test Specifications), verify foundational sections are complete:

| Section                    | Required for TC writing?              | Check                                 |
| -------------------------- | ------------------------------------- | ------------------------------------- |
| S3 User Stories & AC       | Yes — each TC proves an AC-XX         | ≥1 US-XX with AC-XX present           |
| S4 Business Rules          | Yes — TCs reference BR-XX             | ≥1 BR-XX with error condition present |
| S5 Domain Model            | Yes — TCs assert entity/field state   | ≥1 entity with business-meaning cols  |
| S7 Permissions & Roles     | Yes — TCs must include access checks  | Role-permission matrix present        |

If 2 or more of these sections are missing or empty → use `ask user question tool` to ask user whether to proceed with placeholder TCs or halt and complete foundational sections first.

**[BLOCKING] Section 8 Quantity Gate (runs after Readiness Gate):**

Before writing any TCs, verify the planned TC count meets the **business** floor:

| Check          | Required                  | Planned | Status    |
| -------------- | ------------------------- | ------- | --------- |
| Permission TCs | ≥ count(§2 actors) × 2    | {n}     | PASS/FAIL |
| **Total**      | ≥ `business_floor`        | {n}     | PASS/FAIL |

If any row FAILS or planned count < `business_floor`: split TC generation into operation-group batches (≤20 ops per todo tracking). Do NOT write TCs until all batch tasks are planned and the total is ≥ `business_floor`.

⚠️ **This gate deliberately does NOT contain rows for Write Ops (N), Read Ops (M), or Event-Driven (K) + Background (J).** Those rows made the business TC count a function of the architecture — a `K + J` row mints a business TC for every consumer, event handler, and background job, which is exactly how sync/consumer/event-handler test cases entered a tech-free business spec. **Those coverage obligations are real and are NOT abolished — they are owned by the technical spec tree**, where counting handlers is correct because a technical spec is architecture-bound by definition.

**`count(§2 actors)` reads §2's actor list.** Never source it from a permission-guard grep — see the `business_floor` definition.

**[REQUIRED] TC ID Collision Prevention** — `docs/specs` below is the DEFAULT spec root; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path (substitute it when configured):

```bash
grep -n "TC-{FEATURE}-" docs/specs/{Bucket}/README.*.md 2>/dev/null | sort | tail -10
```

Note the highest existing ID before assigning new ones. See `.claude/skills/shared/tc-format.md` — Decade-Based Numbering for range rules.

> **[REQUIRED] Doc Network Step (INIT mode — INSERT; UPDATE mode — VERIFY):**
>
> **INIT mode:** Before completing INIT, **insert** a `## Related Documentation` section into the feature doc.
> Place it immediately after the frontmatter header (before Section 1 content).
> Note: This step fires late in the INIT workflow — retroactively insert at the document top before saving.
>
> **UPDATE mode:** Do NOT re-insert this section if it already exists — instead **verify** that the links are current
> (paths match current module structure, no broken references). If the section is missing from an older doc, add it now.
>
> ```markdown
> ## Related Documentation
>
> | Type              | Path                                                         | Description                                              |
> | ----------------- | ------------------------------------------------------------ | -------------------------------------------------------- |
> | Spec Index (derived) | `<spec root>/{Bucket}/INDEX.md` — default `docs/specs`; `specRoots.business.path` in `docs/project-config.json` overrides the root | DERIVED navigation catalog over the Feature Specs (regenerate via $spec [mode=index]) — §8 in this doc is the canonical business TC registry |
> | Integration Tests | `{configured-test-path}/` | Test code; linked to TCs by the configured test-spec annotation (key `TestSpec`) |
> | Parent Feature    | _(if sub-feature)_                                           |                                                          |
> | Child Features    | _(if this doc is a parent)_                                  |                                                          |
> ```
>
> Fill in `{app-bucket}`, `{system-name}`, `{Module}`, `{ServiceName}` from the current module context.
> Use `(not yet created)` for paths that don't exist yet — they serve as navigational intent markers.
>
> **Why:** This section is the navigation hub for all consumers of this feature area. Without it,
> every AI session must scan the entire docs tree to find related artifacts.

---

### Mode: AUDIT (Staleness Detection)

Audit is read-only for existing docs. Use the root already resolved by `SKILL.md`; the procedure below applies only to the strict default profile. The [native audit branch](#native-mode-specific-behavior) reports against its declared owners/carriers and preserves `UNKNOWN` for unresolved selection or unsupported data.

1. Read `<spec root>/{Bucket}/README.{Feature}.md` frontmatter → `last_updated`
2. Run `git log --since="{last_updated}" --name-only -- {module-source-root}/`
3. If changed files found → flag sections using [Section Impact Mapping](#step-152-section-impact-mapping), including §6 STALE when UI-affecting changes imply new or changed views, navigation, observable states or click-paths no longer reflected in §6.2–6.5.
4. Output `<spec root>/{Bucket}/AUDIT-{date}.md`:

    ```markdown
    # Feature Doc Audit — {date}

    ## {FeatureName}

    | Section                    | Status     | Changed Source Files            | Action              |
    | -------------------------- | ---------- | ------------------------------- | ------------------- |
    | Section 5 (Domain Model)   | ⚠️ STALE   | EntityX (changed 2026-04-18)    | Re-extract entities |
    | Section 6 (Interaction Surface) | ⚠️ STALE | ViewY (changed 2026-04-18)  | Refresh §6.2–6.5 (view/nav/state/click-path) |
    | Section 4 (Business Rules) | ✅ Current | —                               | —                   |
    ```

---

## Phase 1: Module Detection & Context Gathering

### Step 1.0: Auto-Detect Modules from Git Changes (Default)

When no module specified, auto-detect from git changes:

1. `git diff --name-only HEAD` (staged + unstaged); if none → `git diff --name-only HEAD~1`
2. Extract unique module names using Module Mapping table
3. For each module: check if `<spec root>/{Bucket}/` exists — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path
4. Docs exist → **Phase 1.5 (Update Mode)**; missing → skip (no scratch creation without user request)
5. Only `.claude/`, `docs/`, config files changed → report "No business feature docs impacted" and exit

**Path-to-Module Detection Rules:**

Search your codebase to build the path-to-module mapping. Common patterns:

| Changed File Path Pattern                           | Detected Module                   |
| --------------------------------------------------- | --------------------------------- |
| `{services-root}/{Module}/**`                       | {Module}                          |
| `{frontend-apps-dir}/{app-name}/**`                 | {Module} (map app name to module) |
| `{configured-ui-source-root}/{domain-lib}/{feature}/**` | {Module} (map feature to module)  |

Build a project-specific mapping by examining:

```bash
ls -d {services-root}/*/
ls -d {frontend-apps-dir}/*/
```

### Step 1.1: Identify Target Module

Module source priority: (1) user-specified → (2) domain-implied (grep to verify) → (3) auto-detected from git diff (Step 1.0)

### Step 1.2: Read Existing Documentation

1. `docs/project-reference/feature-spec-reference.md` — project-reference docs root default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path
2. `<spec root>/{Bucket}/INDEX.md` (if exists) — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path
3. Existing `<spec root>/{Bucket}/README.*.md` Feature Specs (if any) — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path

### Step 1.3: Codebase Analysis

Grep evidence from source:

- **Entities**: the module's entity/model folder
- **Commands**: the module's command-handler folder
- **Queries**: the module's query-handler folder
- **Controllers**: the module's controller / endpoint folder
- **Frontend**: `{frontend-apps-dir}/{app}/` or `{frontend-libs-dir}/{lib}/`

### Step 1.4: Feature Analysis

Build knowledge model in `tmp/analysis/[feature-name].md`. Discover: entities/enums, commands/queries/events/jobs, controllers/DTOs, frontend components, cross-service bus messages.

---

## Phase 1.5: Update Mode (when updating existing docs)

When UPDATING existing feature docs (not from scratch):

#### Step 1.5.0: Check Derived Spec Artifacts

1. Check the configured Feature Spec root at `<spec root>/{Bucket}/` for the impacted app bucket — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path
2. Note overlapping Feature Specs and derived bucket indexes/ERDs from git diff + spec registry
3. Flag output: "Derived spec artifact refresh may be required for: {list}" — do NOT trigger `[mode=index]` directly (separation of concerns)

### Step 1.5.1: Diff Analysis

1. Identify source (git diff, branch, commit)
2. Categorize changes: entity, command, query, frontend, i18n
3. Map each change to impacted sections (table below)

### Step 1.5.2: Section Impact Mapping

| Change Type            | Impacted Sections                                                                |
| ---------------------- | -------------------------------------------------------------------------------- |
| New entity property    | 5 (Domain Model), 4 (Business Rules if it adds a constraint)                      |
| New capability/operation | 3 (User Stories & AC), 4 (Business Rules), 6 (§6.1 Process Flows if a new journey) |
| UI behavior change (new/changed view, navigation, observable state, or click-path) | 6 (§6.2 View Inventory, §6.3 Navigation Map, §6.4 Key UI States, §6.5 Per-Story Interaction Flow — refresh the affected interaction-surface subsections); refresh companion `design_spec:`/`mockup:` frontmatter if the linked artifact moved |
| New access/role rule   | 7 (Permissions & Roles)                                                          |
| New filter/query       | 3 (User Stories & AC — a view/search story)                                      |
| Any new business-visible functionality | **8 (Test Specifications)** — MANDATORY                                          |
| Any change             | 1 (Overview) — only if scope shifts                                              |

### Step 1.5.3: Mandatory Test Coverage (Section 8 — Test Specifications)

**CRITICAL**: When documenting ANY new business-visible functionality, MUST update:

- **Section 8 (Test Specifications)**: Add business test cases (TC-{FEATURE}-{NNN}) for new or changed demoable user/QC outcomes. Technical-only changes with no business-visible result produce zero business TCs and are routed to the technical spec tree and test code.

> **[BLOCKING] TC Format:** Use canonical format in `.claude/skills/shared/tc-format.md`. NEVER use abbreviated flat GIVEN/WHEN/THEN — use full template with all required fields (Objective, Preconditions, GWT steps, Acceptance Criteria, Test Data, Edge Cases, Evidence, CoveredBy, Status). Section 8 owned exclusively by `spec [mode=tests]` — the author modes populate it only during authoring (INIT with real `[Source:]`, DRAFT with `Evidence: TBD`). Existing TCs MUST NOT be overwritten during UPDATE mode (the draft→update run only UPGRADES `Evidence: TBD` → real anchors, never rewrites the TC body).

> **[BLOCKING] TC ID Collision Prevention:** Before assigning new TC IDs, check highest existing ID (`docs/specs` below is the DEFAULT spec root; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path):
>
> ```bash
> grep -n "TC-{FEATURE}-" docs/specs/{Bucket}/README.*.md | sort | tail -5   # docs/specs = default spec root; specRoots.business.path in docs/project-config.json overrides it
> ```
>
> Assign next sequential ID. See `.claude/skills/shared/tc-format.md` — Decade-Based Numbering section for range rules.

**Failure to update Section 8 for business-visible changed behavior = blocking quality issue. Adding Section 8 cases for technical-only changes that do not pass M7 is also a blocking quality issue.**

---

## Phase 2: Documentation Generation

Generate at `<spec root>/{Bucket}/README.{FeatureName}.md` — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path.

### Key Format Examples

**Business Requirements (FR-XX)**:

```markdown
#### FR-{MOD}-01: {Requirement Title}

| Aspect          | Details                           |
| --------------- | --------------------------------- |
| **Description** | {What this requirement enables}   |
| **Scope**       | {Who can use / affected entities} |
| **Evidence**    | `[Source: {namespace}/{service}/{id}]` |
```

**User Stories (US-XX)**:

```markdown
#### US-{MOD}-01: {Story Title}

**As a** {role}
**I want** {goal/desire}
**So that** {benefit/value}

**Acceptance Criteria**:

- [ ] AC-01: {Criterion with evidence reference}
- [ ] AC-02: {Criterion with evidence reference}

**Related Requirements**: FR-{MOD}-01, FR-{MOD}-02
**Evidence**: `[Source: {namespace}/{service}/{id}]`
```

**Test Summary Table (MANDATORY)**:

```markdown
| Category    | P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low) |  Total  |
| ----------- | :-----------: | :-------: | :---------: | :------: | :-----: |
| {Category1} |      {N}      |    {N}    |     {N}     |   {N}    |   {N}   |
| **Total**   |    **{N}**    |  **{N}**  |   **{N}**   | **{N}**  | **{N}** |
```

**Test Case Format (TC-XX)**:

> **[BLOCKING] Canonical TC format authority:** `.claude/skills/shared/tc-format.md` — always use for full TC template. Below is the minimum required format for feature docs Section 8 (Test Specifications).

```markdown
#### TC-{FEATURE}-001: {Test Name} [P0]

**Objective:** {One sentence: what behavior this TC verifies}

**Business Intent / Invariant Guarded:** {the always-true rule this TC protects — name the [HARD] business rule (§4) or §5 invariant; for an Invariant/Property TC, state it as "for ALL {inputs in domain}, {invariant} holds"}

**Preconditions:**

- {Required system state}

**GIVEN** {initial context}
**WHEN** {action performed}
**THEN** {expected outcome}

**Acceptance Criteria:**

- Success: {observable outcome}
- Failure: {error condition + message}

**Test Data:** `{ "field": "value" }`

**Edge Cases:**

- {Invalid scenario} → {Expected error/behavior}

**Evidence:** `[Source: {namespace}/{service}/{id}]`
**CoveredBy:** one or more covering tests for the configured test environment — `{TestFile}::{MethodName}` (comma-separated **on one line** when several cover this TC), a test-filter expression (e.g. `TestSpec=TC-{FEATURE}-{NNN}`), `Manual-QC`, or `Untested`
**Status:** Tested | Untested | Planned
```

**Permission Matrix** (Section 7 — Permissions & Roles):

```markdown
| Role  | View | Create | Edit | Delete | Special     |
| ----- | :--: | :----: | :--: | :----: | ----------- |
| Admin |  ✅  |   ✅   |  ✅  |   ✅   | Full access |
```

### Domain Model ERD (MANDATORY in Section 5)

Every feature doc MUST include a Mermaid `erDiagram` in Section 5:

```mermaid
erDiagram
    {EntityA} {
        string id PK
        string name
        string status
    }
    {EntityB} {
        string id PK
        string entityAId FK
    }
    {EntityA} ||--o{ {EntityB} : "contains"
```

**ERD rules (same as the `[mode=index]` standard):**

- Tech-agnostic types only: `string`, `number`, `boolean`, `date`, `list`, `map`
- No implementation class names or ORM types
- Mark aggregate roots: `%% [AGGREGATE: EntityName]`
- Cross-module stubs: `%% [CROSS-REF: module-name]`

`[Source: component/{service}/{Entity}]` abstract anchor required after the ERD block.

**Business Rules (Section 4) Format:**

Each rule group MUST include `[Source: rule/{service}/{RuleName}]`:

```markdown
### BR-{MOD}-01: {Rule Group Name}

| Field/Operation | Rule         | Error Condition | Error Message      | Strength |
| --------------- | ------------ | --------------- | ------------------ | -------- |
| {field}         | {constraint} | {when violated} | {message constant} | [HARD]/[SOFT] |

**Invariant (universal form):** for ALL {inputs in domain}, {the rule holds} — e.g. "for ALL line items, amount ≥ 0".

[Source: rule/{service}/{RuleName}]
```

> **[Universal-quantification — author rules as properties, not just rows]** The field→rule→error table records a rule at a *point* (one field, one violation). For every **[HARD]** rule, ALSO state it once in universal form — "for ALL {inputs in domain}, {invariant} holds" — directly under the table. This is not ceremony: the §8 Invariant/Property TC (`spec [mode=tests]`) and the Pattern 9 property test (`integration-test`) are derived **verbatim** from this universal statement (it becomes the TC's `inputDomain` + `invariant`). A rule with no universal form forces the test author to re-derive it (or skip it), which is exactly how a [HARD] rule ends up guarded by two hand-picked examples instead of a property.

> **[SOFT→HARD challenge — run for EVERY [SOFT] tag before finalizing §4]** Strength is not free-choice. For each rule you are tempted to tag `[SOFT]`, ask: *does violating it corrupt data, breach authorization/tenant isolation, lose money, or break a §5 entity invariant?* If **yes to any → it is `[HARD]`.** Under-tagging is silent and dangerous: the invariant-coverage gate counts `[HARD]` rules (`spec [mode=tests]` → property-TC count ≥ count([HARD] BR) + count(§5 invariants)), so a mis-tagged `[SOFT]` rule passes the gate with **zero** property TCs and ships unguarded across its input space. When a [SOFT] tag survives the challenge, that is a deliberate decision — record the one-line reason it cannot corrupt state.

---

## Note: AI Companion Files Deprecated

No `.ai.md` companion files. Single `README.{Feature}.md` only output. Template: `detailed-feature-spec-template.md` in the templates root (authoritative) — default `docs/templates`; a `docsRoots.templates.path` entry in `docs/project-config.json` overrides the path.

### Key Principles (v4.0)

- **No code details** in sections 1-7 — no file paths, no source-code types, no API/command/handler/message names
- **Evidence stays in carriers** — use `[Source: namespace/service/id]` fields for requirements, rules, entities and TCs; never fold source identifiers into narrative prose.
- **Acceptance criteria MUST cross-reference BR-{FC}-NN** — each AC names the business rules it enforces
- **Split criteria** — no line-count cap applies to Feature Specs. **Split** the capability when TCs>40 or when two distinct module-level capabilities emerge:
    1. Create `README.{FeatureName}-Part1.md` and `README.{FeatureName}-Part2.md`
    2. Keep Business Rules (S4) + Domain Model (S5) in Part1; secondary stories/edge cases → Part2
    3. Preserve TC ID continuity — both parts share `TC-{FEATURE}-` prefix; NEVER renumber
    4. Add cross-references: each part includes "**See also:** README.{FeatureName}-Part{N}.md" in header
    5. Flag that derived spec artifacts must be refreshed so `$spec [mode=index]` can relink both parts
- **YAML frontmatter** required: module, service, feature_code, entities[], status, last_updated. When `isLargeIdea=true`, also require the complete `large_idea_decomposition` block and its stable slice IDs. Only the explicit roadmap branch carries `roadmap`, `milestone_id`, and `scope_brief`; ordinary specs omit those fields, while EXEMPT/framework branches carry their own explicit applicability metadata.
- **Audit mode produces AUDIT-{date}.md** — NEVER modifies existing docs
- **Init mode uses source-first extraction phases** — all entities, rules, APIs MUST be read from source before writing

---

## Phase 3: Derived Artifact Refresh Flag

After creating/updating Feature Specs, do **not** edit `<spec root>/{Bucket}/INDEX.md` directly (default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path). Flag that derived spec artifacts may need refresh:

1. Record the bucket(s) affected by the Feature Spec change.
2. State: "Derived spec artifact refresh may be required for: {bucket list}."
3. Leave regeneration to `$spec [mode=index]`, which owns `INDEX.md` and other derived navigation aids.

## Anti-Hallucination Protocols

### DOCUMENTATION_ACCURACY_CHECKPOINT

Before writing documentation, verify:

- Read actual code implementing this?
- Line number references accurate and current?
- Code snippet as evidence available?

### TEST CASE EVIDENCE VERIFICATION

For every test case, perform the four evidence checks in **Phase 3.5 → First Pass — Test Case Evidence Audit (Section 8)** below; correct inaccurate references immediately.

---

## Phase 3.5: Verification (4 Passes)

### First Pass — Test Case Evidence Audit (Section 8)

**EVERY test case:**

1. Resolve the TC's abstract evidence anchor through the provenance sidecar to its current source location.
2. Read that source and verify it supports the test assertion.
3. Check Edge Cases against error constants in the configured location, if the project defines one.
4. Correct stale provenance immediately; keep physical coordinates in the sidecar and the abstract anchor in the TC.

### Second Pass — Domain Model Verification

- Read EACH entity file referenced in Section 5
- Verify property names and business meanings accurate (no implementation types — use business meaning column)
- Check enum values exist in actual source
- Remove documented properties not found in source

### Third Pass — Cross-Reference Audit

- 8 tech-free sections present in correct order (no technical terms in prose)
- Test Summary counts match actual TC count in Section 8
- All internal links work
- No template placeholders remain (`{namespace}`, `{service}`, `{id}`)
- ErrorMessage constants match edge case messages
- YAML frontmatter present and complete

**CRITICAL: ANY pass finds hallucinated content → re-investigate and fix before completing.**

### Fourth Pass — AI-Implementability Check

Flag items requiring implementation assumptions:

- **S3 (User Stories & Acceptance Criteria):** Every US-XX has ≥1 AC-XX with explicit success AND failure outcome in Given/When/Then. Vague AC → INCOMPLETE.
- **S4 (Business Rules):** Every BR-XX needs: trigger condition, rule content, error message, `[Source: rule/{service}/{RuleName}]`. Missing field → flag.
- **S3↔S4 linkage:** Every acceptance criterion that enforces a constraint references the BR-XX it enforces. AC with an unstated rule → flag.
- **S6 (Process Flows & Interaction Surface — UI/UX re-implementability):** For every UI-bearing capability, §6.2 View Inventory, §6.3 Navigation Map, §6.4 Key UI States, and §6.5 Per-Story Interaction Flow are all present and M1-clean (UX roles/states/flows only — zero framework/route/CSS/component-class names). Every US-XX with a user-facing outcome has a §6.5 click-path; every view lists its observable states; the companion `design_spec:`/`mockup:` path is recorded in frontmatter when one exists. Missing/partial §6 on a UI feature (with no explicit backend-only skip reason) → INCOMPLETE — the app cannot be rebuilt on another stack from business logic + tests alone without the interaction surface.
- **S7 (Permissions & Roles):** Permission matrix with explicit role × action × condition cells. Blank cells → flag.
- **Concrete examples:** ≥1 example (input + expected output) per core operation. Abstract-only → LOW.

If >3 INCOMPLETE items → HALT, present gap list via ask user question tool before completing.

_Reference: `.claude/skills/shared/sdd-artifact-contract.md` → "AI-Implementability Gate" (and mandate M4) for the AI-implementability criteria. `docs/project-reference/spec-principles.md` (project-reference docs root default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) carries only repo-local prose/evidence rules._

### M5 — Rebuild-From-Scratch Test

See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M7)" for BLOCKING criteria. Before completing, answer this for the whole doc:

> **Could a team with zero knowledge of this codebase re-implement the identical business behavior on ANY stack — using §1-8 prose alone, with `[Source:]` evidence stripped out?**

If the answer is NO because the prose depends on framework/product/language wording, class or file references, or a single hidden interpretation → the doc FAILS M5 (and likely M1/M2/M4). Rework the offending sections into tech-agnostic, single-interpretation business behavior before marking complete.

---

## Quality Checklist

### Mandate Compliance (M1-M5 + M7)

See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M7)" for BLOCKING criteria. M6 is absent from this checklist by design — it binds the REVIEWER (a review that passes an M1-M5/M7 violation is itself defective), never the artifact. The artifact-facing set is M1-M5 and M7.

- [ ] **Mandate Quality Check:** §1-8 prose contains ZERO banned tech terms (`spec-principles.md` §3.2) and NO code identifiers (class/method names, file paths, namespaces) outside evidence carriers (M1/M2)
- [ ] Every FR / BR / operation carries a logical ID (FR-/BR-/OP-/TC-) AND a separate `[Source: namespace/service/id]` abstract-anchor evidence carrier (never physical code coordinates or repository-root paths) — `[Source:]` retained, not folded into prose (M3)
- [ ] Every requirement is testable with one interpretation and named success/failure outcomes (M4)
- [ ] Rebuild-From-Scratch Test answered YES — doc is re-implementable on any stack from §1-8 prose alone (M5)
- [ ] **Business-visibility:** every §8 case passes the demo test applied to its BODY — *"what would a stakeholder SEE change?"* — no answer → FAIL as TECHNICAL-ONLY. A `When` that is an invocation (a handler runs, a consumer receives, a job fires, data syncs) or a `Then` asserting schema/type/nullability/call-count FAILS. Judge the BODY, never the title or ID. No TC count is derived from an architecture inventory (M7 — see the Business-visibility gate above)

> **M1 governs vocabulary; M7 governs subject matter.** A technical case in impeccably tech-free prose satisfies M1 while violating M7 — so a clean pass on the M1/M2 banned-token check above is NOT evidence of M7 compliance. Only the demo test decides.

### Structure

- [ ] Documentation placed in `<spec root>/{Bucket}/README.{FeatureName}.md` — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path
- [ ] Feature Spec follows template format (8 tech-free sections, in order)
- [ ] **YAML frontmatter** present with module, service, feature_code, entities[]
- [ ] **Applicability and Decomposition Gate** passes: embedded large-idea specs carry the complete decomposition block and stable slice IDs; explicit-roadmap specs carry approved roadmap metadata; ordinary specs omit roadmap placeholders; isolated/framework changes carry their explicit branch
- [ ] Derived spec artifact refresh flagged for `$spec [mode=index]` when Feature Specs were created, renamed, split, or deleted
- [ ] Stakeholder navigation table present
- [ ] **Split criteria** — no line-count cap applies; split when TCs>40 or distinct module-level capabilities emerge (follow split procedure in Key Principles)
- [ ] **No code details** in sections 1-7 (no file paths, no source-code types, no command/handler/API/message names)
- [ ] **Acceptance criteria reference BR-{FC}-NN** IDs they enforce
- [ ] **§6 Interaction Surface complete for UI-bearing features** — §6.2 View Inventory, §6.3 Navigation Map, §6.4 Key UI States, §6.5 Per-Story Interaction Flow all present, M1-clean, and `US-`/`OP-`/`BR-`-cross-referenced; companion `design_spec:`/`mockup:` recorded in frontmatter; backend-only features state the §6 skip reason explicitly (so the spec carries business logic + tests + UI/UX = re-implementable on any stack)

### Test Case Evidence (MANDATORY)

- [ ] **EVERY test case has Evidence field** with `[Source: namespace/service/id]` abstract-anchor format (never `file:line`)
- [ ] **No template placeholders** remain (`{namespace}`, `{service}`, `{id}`)
- [ ] **Provenance verified** — abstract anchors resolve through the sidecar to inspected, current source locations
- [ ] **Edge case errors match** constants from the configured error-constants location, if one exists
- [ ] **Test Summary counts match** actual number of test cases in Section 8

### Anti-Hallucination

- [ ] All entity properties verified against source code
- [ ] All enum values verified against actual enum definitions
- [ ] No invented methods, properties, or models
- [ ] All code snippets copied from actual files

### Section 5 (Domain Model)

- [ ] Mermaid `erDiagram` present with all entities
- [ ] ERD uses only tech-agnostic types
- [ ] `[Source: component/{service}/{Entity}]` abstract anchor after each entity definition and after ERD block
- [ ] Aggregate roots marked with `%% [AGGREGATE: ...]`

### Section 4 (Business Rules)

- [ ] `[Source: rule/{service}/{RuleName}]` abstract anchor present after each rule group table
- [ ] Error messages verified against the configured error-constants location or equivalent constants file

### Init Mode Checklist

- [ ] Phase A extraction complete before Section 5 (Domain Model) written
- [ ] Phase B extraction complete before Section 4 (Business Rules) written
- [ ] Phase C extraction complete before Section 3 (User Stories & AC) + Section 8 (Test Specs) written
- [ ] Phase D extraction complete before Section 5 domain-event occurrences written
- [ ] Phase E extraction complete before Section 6 (Process Flows) + Section 8 (Test Specs) written

### Completeness Gates (Init Mode)

- [ ] [C-gate] Every business capability (§3 user story / observable §6 state) has ≥1 Phase C entry
- [ ] [E-gate] Phase E journey count ≥ Phase C entry count
- [ ] [Actor-gate] Every §2 actor appears in ≥1 Phase E journey
- [ ] [TC-gate] Section 8 TC count ≥ `business_floor`
- [ ] [Source-gate] Every Phase C entry and every Phase E journey has `[Source: namespace/service/id]` abstract anchor
- [ ] [Chain-gate] Full-Chain Reconciliation (Step 1-INIT.4.6) passed — no orphan UI, no orphan operation, event + read-side closure verified; every BROKEN chain recorded as a spec-correctness finding (never silently dropped)

## Standalone Chain

> **When called outside a workflow**, follow this chain to keep all spec layers in sync.
> Skip steps already done in the same session.

```
spec [author mode] (you are here)
  │
  ├─ AFTER this skill:
  │
  ├─ [REQUIRED] → spec [mode=tests] (CREATE or UPDATE)
  │     Section 8 is incomplete without an explicit `spec [mode=tests]` run.
  │     CREATE: new feature doc just created → write TCs from spec.
  │     UPDATE: existing doc updated → update TCs to match changed behavior.
  │
  ├─ [REQUIRED] → $work-item --mode=review --type=spec-tests
  │     Validates TC coverage, GIVEN/WHEN/THEN completeness, no duplicate TC codes.
  │
  ├─ [REQUIRED] → spec [mode=sync]
  │     Forward-syncs Section 8 TCs ↔ executing test code (§8 canonical; test code implements it).
  │
  ├─ [RECOMMENDED] → $integration-test [from-changes or from-prompt mode]
  │     Generates/updates integration test files from changed TCs.
  │
  └─ [RECOMMENDED] → $docs-manager --mode=update
        If code changes triggered this doc update, run $docs-manager --mode=update for full chain including
        spec [mode=index] (Phase 2.5) and spec [mode=tests] (Phase 3).
```

### Doc Network Principle

> **[REQUIRED]** Every feature doc managed by this skill must have a `## Related Documentation` section:
>
> **INIT mode:** INSERT the section (place immediately after frontmatter, before Section 1 content)
> **UPDATE mode:** VERIFY the section exists and links are current; add it if missing from an older doc
>
> Do not re-add if already present. Check before marking this skill complete.

Template to insert or verify in `<spec root>/{Bucket}/README.{FeatureName}.md` — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path:

```markdown
## Related Documentation

| Type              | Link                                                                                                          | Description                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Spec Index (derived) | [docs/specs/{Bucket}/INDEX.md](../../specs/{Bucket}/INDEX.md) — default root `docs/specs`; `specRoots.business.path` in `docs/project-config.json` overrides it | DERIVED navigation catalog over the Feature Specs (regenerate via $spec [mode=index]) — §8 here is the canonical business TC registry |
| Integration Tests | `{configured-test-path}/`                                                  | Test code linked to TCs via the configured test-spec annotation (key `TestSpec`) |
| Related Modules   | _(list any cross-module dependencies here)_                                                                   |                                                                |
```

Fill in `{Bucket}`, `{FeatureName}`, `{Module}`, and `{ServiceName}` from context.

This section enables:

- Humans navigating from Feature Spec → bucket index → test evidence
- `$docs-manager --mode=update` detecting when a Feature Spec or bucket index is stale
- Future AI sessions knowing what exists without a full scan
