<!-- GENERIC SOURCE — bootstrapped into docs/project-reference/feature-spec-reference.md on first SessionStart if that file is absent.
     Contains ONLY the project-agnostic Feature Spec contract. Project-specific inventory (app-to-service map,
     feature-code registry, gold-standard doc paths, thin-index list) is filled BELOW the SCAN-MANAGED boundary
     by /scan --target=feature-spec — never author project domain in this generic source. -->

<!-- CRITICAL RULES (primacy anchor):
1. MUST ATTENTION use the tech-free 8-section Feature Spec template for all business feature docs
2. MUST ATTENTION include test specifications (Section 8) with TC-{FEATURE}-{NNN} format, Business Intent / Invariant Guarded, and Evidence field
3. MUST ATTENTION study gold standard docs before writing new feature docs
-->

> **[IMPORTANT]** MUST ATTENTION use the tech-free 8-section Feature Spec template · MUST ATTENTION include TC-{FEATURE}-{NNN} test cases (Section 8) with `Business Intent / Invariant Guarded` and `Evidence: [Source: namespace/service/id]` (abstract anchor — legacy `[Source: FilePath:Line]` is DEPRECATED) · MUST ATTENTION study gold standard docs before writing.

# Feature Documentation Reference

## Quick Summary

**Goal:** All business feature docs follow the tech-free 8-section Feature Spec template — a single doc a BA, QA/QC, or AI fully understands from one read — with correct test spec format and verifiable code evidence.

**Key Rules:**

- MUST ATTENTION follow the 8-section structure in exact order (see below); §1-7 prose is STRICTLY tech-free
- MUST ATTENTION include Section 8 (Test Specifications) with `TC-{FEATURE}-{NNN}` IDs, `Business Intent / Invariant Guarded`, and `Evidence: [Source: namespace/service/id]` (abstract anchor; legacy `[Source: FilePath:Line]` DEPRECATED)
- MUST ATTENTION study gold standard docs before writing any new feature doc
- MUST keep feature doc path: `docs/specs/{Bucket}/README.{FeatureName}.md`
- MUST keep body (sections 1-7) ≤1200 lines and whole file ≤1800 lines (hard cap); split the capability when body>1200 OR TCs>40

---

## Directory Convention

Feature docs path: `docs/specs/{Bucket}/README.{FeatureName}.md` (body ≤1200 / file ≤1800 lines; split when body>1200 OR TCs>40). Each bucket also includes `INDEX.md`. The spec root is fixed at `docs/specs/` for all projects.

## Template Paths

- **Master template:** your configured `workflowPatterns.featureDocTemplate` (default `docs/templates/detailed-feature-spec-template.md`, tech-free 8-section, v4.0). Generated on first SessionStart from `.claude/templates/detailed-feature-spec-template.md` if absent.
- ~~AI companion template~~ — Deprecated. Single doc per feature.

## 8-Section Structure

MUST ATTENTION follow exact section order. **All 8 sections are tech-free** — no framework/product/language/persistence/messaging/auth names in §1-7 prose (technical identifiers live ONLY in evidence carriers). Technical contracts (commands, message/event schemas, API routes, cross-service wiring, performance internals) are **NOT doc content** — code is the technical source of truth.

- 1\. **Overview** — 2-3 plain sentences: what the capability does, who uses it, why it matters
- 2\. **Glossary** — domain / ubiquitous-language terms (DDD)
- 3\. **User Stories & Acceptance Criteria** — `US-{FC}-NN` (As a / I want / So that) each with `AC-{FC}-NN` (Given/When/Then)
- 4\. **Business Rules** — `BR-{FC}-NN` invariants, validation, state transitions; plain IF/THEN; `[HARD]`/`[SOFT]`; `[Source: rule/{service}/{id}]` per rule group
- 5\. **Domain Model** — entities, value objects, enums, relationships; Mermaid ERD + business-meaning columns; **plain types only** (text/number/date/yes-no); `[Source: component/{service}/{id}]` per entity. Business-meaningful domain events surface here as occurrences, never as bus/message schemas
- 6\. **Process Flows** — key user journeys as step tables / simple diagrams (business actions; key screens as business steps/states, not component names)
- 7\. **Permissions & Roles** — business RBAC matrix (Role × View/Create/Edit/Delete + scope rules); no auth-implementation detail
- 8\. **Test Specifications** — `TC-{FEATURE}-{NNN}` BDD, each linked to the `AC-`/`BR-` it proves; MUST ATTENTION carry `Business Intent / Invariant Guarded` and a hidden `Evidence: [Source: namespace/service/id]` carrier + `IntegrationTest:` field (legacy `[Source: FilePath:Line]` DEPRECATED)

## M1-M6 Compliance for All Sections

MUST ATTENTION all 8 sections satisfy the BLOCKING AI-SDD mandates: M1 (tech-agnostic prose — no framework/product/language-type names in §1-7 narrative), M2 (no source code refs — class/method/file-path identifiers live only in evidence fields, never prose), M3 (logical IDs `FR-`/`BR-`/`OP-`/`US-`/`TC-` as the primary spine, plus `Evidence: [Source: namespace/service/id]` as the secondary carrier — legacy `[Source: FilePath:Line]` DEPRECATED), M4 (testable, single-interpretation, unambiguous), and M5 (rebuild-from-scratch: a team with zero codebase knowledge can re-implement the behavior on any stack from §1-8 prose alone). The full BLOCKING criteria are defined in `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M6)"; this reference adds only the 8-section structure and TC format on top.

## Test Case ID Format

**Single format:** `TC-{FEATURE}-{NNN}` (e.g., TC-GM-001, TC-KD-011). `{FEATURE}` is a short feature code; the per-project code registry lives below the SCAN-MANAGED boundary.

- **Source of truth:** Section 8 (canonical TC registry)
- **Code link:** the project's test-spec trait/tag convention (e.g. `[Trait("TestSpec", "TC-{FEATURE}-{NNN}")]` for xUnit) links the integration test back to its TC

## Evidence Rule

EVERY test case MUST ATTENTION carry a machine-readable evidence anchor:

```markdown
**Evidence:** `[Source: {namespace}/{service}/{id}]` (namespace ∈ operation | event | component | schema | requirement | rule | constraint | test)
```

The abstract `[Source: namespace/service/id]` form is canonical (see `.claude/skills/shared/tc-format.md`). The legacy `[Source: {FilePath}:{LineNumber}]` form is **DEPRECATED** — it is stack-fragile and breaks on refactor; do not author it in new or migrated docs. The lone exception is the per-TC `IntegrationTest:` link, which stays a physical `{TestFile}::{MethodName}` path. NEVER use `TBD` placeholders in shipped docs. NEVER omit the Evidence field.

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

- `docs/specs/{Bucket}/README.{Exemplar}Feature.md` (worked proof)

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
2. MUST ATTENTION include test specifications (Section 8) with TC-{FEATURE}-{NNN} format, Business Intent / Invariant Guarded, and Evidence field
3. MUST ATTENTION study gold standard docs before writing new feature docs
-->

## Closing Reminders

- **IMPORTANT MUST ATTENTION** use the tech-free 8-section Feature Spec template in exact order for ALL business feature docs — §1-7 strictly tech-free, no technical sections (code is the technical source of truth)
- **IMPORTANT MUST ATTENTION** Section 8 (Test Specifications) MUST include `TC-{FEATURE}-{NNN}` IDs, `Business Intent / Invariant Guarded`, and `Evidence: [Source: namespace/service/id]` for every test case (legacy `[Source: FilePath:Line]` DEPRECATED)
- **IMPORTANT MUST ATTENTION** study gold standard docs (below the SCAN-MANAGED boundary) before writing any new feature doc
- **IMPORTANT MUST ATTENTION** keep body (sections 1-7) ≤1200 lines, whole file ≤1800 (hard); split when body>1200 OR TCs>40 — not shorter stubs, not sprawling dumps
- **IMPORTANT MUST ATTENTION** NEVER ship docs with `TBD` Evidence placeholders — every TC requires a canonical `[Source: namespace/service/id]` anchor (legacy `FilePath:Line` DEPRECATED)
- **IMPORTANT MUST ATTENTION** add final review task to verify all 8 sections present, §1-7 tech-free, all TCs have Business Intent / Invariant Guarded and Evidence fields, doc length in range
