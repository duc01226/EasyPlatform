<!-- Generic bootstrap source for `feature-spec-reference.md`. Project-specific examples and mappings belong in the adopter project. -->

# Feature Documentation Reference

## Quick Summary

**Goal:** Guide feature-spec authoring through the project-configured profile or the strict portable default while preserving shared SDD quality rules and traceable evidence.

**Summary:**

- MUST ATTENTION resolve the business root, local feature template, and optional `specArtifacts` profile before applying format rules.
- MUST ATTENTION with a profile use its section roles, identifier grammars, and evidence carriers; NEVER add a duplicate TC registry or Section 8.
- MUST ATTENTION without a profile follow the strict 8-section and `TC-{FEATURE}-{NNN}` contract below.
- MUST ATTENTION apply the shared M1-M7 contract in either branch; identifiers and matching text NEVER prove the behavior ran.

> **Shared SDD contract:** Every profile preserves its applicable M1-M7 and invariant, evidence, execution, and review obligations. MUST ATTENTION READ `.claude/skills/shared/sdd-artifact-contract.md` for the complete rules.

## Configured Artifact Profile

Read and validate `docs/project-config.json` before authoring or reviewing a feature spec. When `specArtifacts` is present:

- MUST ATTENTION resolve the business root from project configuration and the feature shape from `workflowPatterns.featureDocTemplate` or the project reference.
- MUST ATTENTION use `specArtifacts.sections` to classify `intent`, `contracts`, and `evidence`; unknown headings have no implicit role. Follow the project verifier for unknown-heading handling.
- MUST ATTENTION use the configured `requirement`, `acceptance`, and `scenario` prefixes and grammars, plus the declared `carriers` roots, extensions, and mapped fields. Trace every reported test outcome to its actual assertion or structured evidence row.
- MUST ATTENTION keep applicable shared M1-M7 obligations intact. A section or carrier mapping does not waive semantic, evidence, execution, or review requirements. Read `.claude/skills/shared/sdd-artifact-contract.md` for the full contract.
- MUST ATTENTION treat a declared but invalid profile as a configuration error; NEVER fall back silently to `TC` rules.

> **Default-profile boundary:** MUST ATTENTION apply the 8-section layout, `TC-*` registry, `CoveredBy` format, and scan-managed feature-code tables below only when `specArtifacts` is absent. Resolve roots and templates from configuration in both branches.

## Directory Convention

Feature docs path: `{Bucket}/README.{FeatureName}.md` inside the business spec root — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path (no line-count cap; split when TCs>40 or distinct module-level capabilities emerge). Each bucket also includes `INDEX.md`. The bucket layout under the resolved root is identical for every project.

## Template Paths

- **Master template:** your configured `workflowPatterns.featureDocTemplate` in `docs/project-config.json` (default `detailed-feature-spec-template.md` in the templates root, itself defaulting to `docs/templates` unless a `docsRoots.templates.path` entry overrides it; tech-free 8-section, v4.1). Generated on first SessionStart from `.claude/templates/detailed-feature-spec-template.md` if absent.
- ~~AI companion template~~ — Deprecated. Single doc per feature.

## 8-Section Structure

MUST ATTENTION follow exact section order. **All 8 sections are tech-free** — no framework/product/language/persistence/messaging/auth names in §1-7 prose (technical identifiers live ONLY in evidence carriers). Technical contracts (commands, message/event schemas, API routes, cross-service wiring, performance internals) are **NOT business-spec content** — code is the technical source of truth; generated technical views belong under the configured technical root.

- 1\. **Overview** — 2-3 plain sentences: what the capability does, who uses it, why it matters
- 2\. **Glossary** — domain / ubiquitous-language terms (DDD)
- 3\. **User Stories & Acceptance Criteria** — `US-{FC}-NN` (As a / I want / So that) each with `AC-{FC}-NN` (Given/When/Then)
- 4\. **Business Rules** — `BR-{FC}-NN` invariants, validation, state transitions; plain IF/THEN; `[HARD]`/`[SOFT]`; `[Source: rule/{service}/{id}]` per rule group
- 5\. **Domain Model** — entities, value objects, enums, relationships; Mermaid ERD + business-meaning columns; **plain types only** (text/number/date/yes-no); `[Source: component/{service}/{id}]` per entity. Business-meaningful domain events surface here as occurrences, never as bus/message schemas
- 6\. **Process Flows & Interaction Surface** — key user journeys plus the tech-agnostic UI/UX intent layer so a UI-bearing capability can be re-built on any stack from prose alone. Five subsections:
    - **6.1 Process Flows** — key user journeys as step tables / simple diagrams (business actions; key screens as business steps/states, not component names)
    - **6.2 View Inventory** — each view/screen by UX ROLE + purpose, the information it presents, primary actions, and the driving `US-`/`OP-`; describe by role, never by an implementation name
    - **6.3 Navigation Map** — how a user moves between views (entry points, transitions on business triggers, exits) and how this surface connects to neighbouring features
    - **6.4 Key UI States** — the distinct observable states per view (default / loading / empty / error / success / permission-gated) as what the user perceives, with the triggering `OP-`/`BR-`
    - **6.5 Per-Story Interaction Flow** — per `US-{FC}-NN`, the numbered click/action path from intent to observable system response, cross-referenced to `US-`/`OP-`/`BR-`

    §6's interaction surface stays **tech-agnostic intent** (UX-role names + observable states + logical-ID cross-refs) — it names ZERO frameworks/routes/URLs/CSS/component classes; the deep visual fidelity lives in the companion `design-spec`/mockup, whose path is recorded in the optional `design_spec:` / `mockup:` frontmatter keys. Skip §6.2–6.5 only when the feature is backend-only (no UI) and state that reason.

- 7\. **Permissions & Roles** — business RBAC matrix (Role × View/Create/Edit/Delete + scope rules); no auth-implementation detail
- 8\. **Test Specifications** — `TC-{FEATURE}-{NNN}` BDD, each linked to the `AC-`/`BR-` it proves; MUST ATTENTION carry `Business Intent / Invariant Guarded`, `Evidence: [Source: namespace/service/id]`, and `CoveredBy:` coverage carrier (legacy `IntegrationTest:` and `[Source: FilePath:Line]` are migration inputs only)

## M1-M7 Compliance for All Sections

MUST ATTENTION all 8 sections satisfy the BLOCKING AI-SDD mandates: M1 (tech-agnostic prose — no framework/product/language-type names in §1-7 narrative), M2 (no source code refs — class/method/file-path identifiers live only in evidence fields, never prose), M3 (logical IDs `FR-`/`BR-`/`OP-`/`US-`/`TC-` as the primary spine, plus `Evidence: [Source: namespace/service/id]` as the secondary carrier — legacy `[Source: FilePath:Line]` DEPRECATED), M4 (testable, single-interpretation, unambiguous), M5 (rebuild-from-scratch: a team with zero codebase knowledge can re-implement the behavior on any stack from §1-8 prose alone), and M7 (business-visibility — see below). The full BLOCKING criteria are defined in `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M7)"; this reference adds only the 8-section structure and TC format on top.

**M7 — Business-visibility.** A Feature Spec is a business-tree artifact. Apply the demo test to each §8 case's BODY: _"what would a stakeholder SEE change?"_ — no answer → FAIL as TECHNICAL-ONLY. Every `Given` = a state a user could arrange; every `When` = an action a user could take; every `Then` = an outcome a user could see. FAIL a `When` that is an invocation (a handler runs, a consumer receives, a job fires, data syncs) or a `Then` asserting schema/type/nullability/call-count, and FAIL any §8 TC count derived from an architecture inventory. Judge the BODY, never the title or ID.

MUST ATTENTION **M1 governs vocabulary; M7 governs subject matter.** A technical case in impeccably tech-free prose satisfies M1 while violating M7 — that gap is the most common way business specs rot. Ask what a user could SEE, not which words were used.

## Test Case ID Format

**Single format:** `TC-{FEATURE}-{NNN}` (e.g., TC-GM-001, TC-KD-011). `{FEATURE}` is a short feature code; the per-project code registry lives below the SCAN-MANAGED boundary.

- **Source of truth:** Section 8 (canonical business TC registry)
- **Code link:** the project's test-spec trait/tag convention (e.g. `[Trait("TestSpec", "TC-{FEATURE}-{NNN}")]` for xUnit) links the integration test back to its TC

## Evidence Rule

EVERY test case MUST ATTENTION carry a machine-readable evidence anchor:

```markdown
**Evidence:** `[Source: {namespace}/{service}/{id}]` (namespace ∈ operation | event | component | schema | requirement | rule | constraint | test)
```

The abstract `[Source: namespace/service/id]` form is canonical (see `.claude/skills/shared/tc-format.md`). The legacy `[Source: {FilePath}:{LineNumber}]` form is **DEPRECATED** — it is stack-fragile and breaks on refactor; do not author it in new or migrated docs. The per-TC `CoveredBy:` link may use a physical `{TestFile}::{MethodName}` path, `TestSpec=...` filter, or manual-QC coverage because it is an operational coverage carrier, not narrative prose. Legacy `IntegrationTest:` is accepted only as migration input. NEVER use `TBD` placeholders in shipped docs. NEVER omit the Evidence field.

---

<!-- ════════════════════════════════════════════════════════════════════════════
     SCAN-MANAGED BOUNDARY — everything below is filled per-project by /scan --target=feature-spec.
     Do NOT hand-author project domain above this line. On a fresh project these are
     placeholders until the first scan runs.
     ════════════════════════════════════════════════════════════════════════════ -->

## App-to-Service Mapping

> _Filled by `/scan --target=feature-spec`._ Maps each app bucket → service folder → the features it owns.

| Module   | Folder     | Features                       |
| -------- | ---------- | ------------------------------ |
| {Bucket} | `{Folder}` | {Comma-separated capabilities} |

## Gold Standard References

> _Filled by `/scan --target=feature-spec`._ MUST ATTENTION study before writing new feature docs. Until populated, study the master template structure.

- `{Bucket}/README.{Exemplar}Feature.md` in the business spec root (worked proof)

## Feature Code Registry

> _Filled by `/scan --target=feature-spec`._ `{FEATURE}` codes used in `TC-{FEATURE}-{NNN}` IDs, one row per capability.

| Code   | Feature   | Module   |
| ------ | --------- | -------- |
| {Code} | {Feature} | {Module} |

## Thin-Index Files

> _Filled by `/scan --target=feature-spec`._ Module-level entries that delegate to capability sub-docs (NOT standalone docs).

- `{Bucket}/README.{Parent}Feature.md` → splits to {Child1}, {Child2}

---

<!-- CRITICAL RULES (recency anchor):
1. MUST ATTENTION use the tech-free 8-section Feature Spec template for all business feature docs
2. MUST ATTENTION include business test specifications (Section 8) with TC-{FEATURE}-{NNN} format, Business Intent / Invariant Guarded, Evidence, and CoveredBy fields
3. MUST ATTENTION study gold standard docs before writing new feature docs
-->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Guide feature-spec authoring through the project-configured profile or the strict portable default while preserving shared SDD quality rules and traceable evidence.

- MUST ATTENTION resolve the business root, feature template, and `specArtifacts` profile before choosing a format.
- MUST ATTENTION with a profile use its section roles, IDs, and evidence carriers; without one, follow the strict default 8-section/TC contract.
- MUST ATTENTION preserve shared M1-M7 obligations, inspect real assertions, and keep conditional outcomes conditional.
- MUST ATTENTION use project-owned references and templates; never invent paths, IDs, proof, or project-specific inventory.
