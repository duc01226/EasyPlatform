<!-- Last scanned: 2026-06-15 -->

# Feature Spec Reference

> **Goal:** route any feature-documentation task to the canonical spec system — where specs live, what the tech-free 8-section structure is, the ID/TC conventions, and the current coverage state. Feature Specs are TECH-FREE behavior contracts; code is the technical source of truth.

> **READ FIRST:** A Feature Spec is one tech-free document per module-level capability at `docs/specs/{Bucket}/README.{FeatureName}.md`, authored/maintained by `/spec` and indexed by `/spec-index`. **State today: ZERO feature specs exist** — `docs/specs/` is absent. Jump to **Coverage Gaps** for the seed route.

## App-to-Service Mapping

Derived from `docs/project-config.json` `modules[]` + verified frontend→backend wiring (no feature-spec docs exist to map from). One frontend app + one domain lib front the single example backend stack.

| App                                                            | Backend services                                                                                                                                                   | Spec directory                    | Spec count |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- | ---------- |
| `playground-text-snippet` (frontend-app)                       | `TextSnippet.Api`, `.Application`, `.Domain`, `.Infrastructure`, `.Persistence`, `.Persistence.Mongo`, `.Persistence.PostgreSql`, `.Persistence.MultiDbDemo.Mongo` | `docs/specs/{Bucket}/` _(absent)_ | **0**      |
| `text-snippet-domain` (frontend domain lib — app wiring layer) | same TextSnippet backend stack (consumed via `playground-text-snippet`)                                                                                            | `docs/specs/{Bucket}/` _(absent)_ | **0**      |

**Wiring is direct, not inferred** (95% confidence — both layers checked):

- `text-snippet-domain/src/lib/apis/text-snippet.api.ts:34` → `${textSnippetApiHost}/api/TextSnippet`; `task-item.api.ts:43` → `/api/TaskItem`.
- `textSnippetApiHost` = `http://localhost:5001` — `apps/playground-text-snippet/src/environments/environment.ts:7`; injected at `app/app.config.ts:52`.
- Matching controllers: `PlatformExampleApp.TextSnippet.Api/Controllers/TextSnippetController.cs`, `TaskItemController.cs`; route base `/api` per `project-config.json` `graphConnectors.apiEndpoints.backend.routePrefix` (line 528).
- ⚠ Port discrepancy: config `meta.port` = `5000` (`project-config.json:109-111`) but the frontend actually calls **5001** (`environment.ts:7`). Document the running host as 5001.

No `meta.domain` / bucket field exists on any module (`project-config.json` modules[]) — buckets must be derived from the `text-snippet` name stem, not a config field.

## Directory Structure

Actual `docs/` tree (top 3 levels) — glob-verified 2026-06-15. _(This target intentionally includes the tree as the source-of-truth for doc locations.)_

```
docs/
├── project-reference/                              (reference docs — hook-injected AI context)
│   ├── feature-spec-reference.md                   ← this file
│   ├── spec-principles.md                          ← spec quality / tech-agnostic M1-M6 prose rules
│   ├── spec-system-reference.md                    ← canonical-vs-derived spec system
│   ├── workflow-spec-test-code-cycle-reference.md  ← spec ↔ test ↔ code cycle
│   ├── domain-entities-reference.md / backend-patterns-reference.md / frontend-patterns-reference.md
│   ├── integration-test-reference.md / e2e-test-reference.md / seed-test-data-reference.md
│   ├── project-structure-reference.md / code-review-rules.md / scss-styling-guide.md
│   ├── docs-index-reference.md / lessons.md
│   └── design-system/README.md
└── templates/
    └── detailed-feature-spec-template.md           ← canonical 8-section template (on-disk)
```

**Absent** (glob `docs/specs/**` → "No files found"): `docs/specs/` (the fixed Feature Spec root per `.claude/skills/spec/SKILL.md:19`), `docs/business-features/`, `docs/features/`. The legacy 26-section / `docs/business-features/` model these reference docs once described is **retired** — the canonical system below supersedes it.

## Template Paths

| Template / contract             | Path                                               | Purpose                                                                                         | Exists | Used by  |
| ------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------ | -------- |
| 8-section Feature Spec template | `docs/templates/detailed-feature-spec-template.md` | Master on-disk template (YAML frontmatter + 8 tech-free sections)                               | ✅     | 0 specs  |
| Feature Spec skill              | `.claude/skills/spec/SKILL.md`                     | Authors/maintains specs — modes `init`\|`update`\|`audit`\|`amend`\|`tests`\|`sync` (+ `draft`) | ✅     | tool     |
| Canonical TC format             | `.claude/skills/shared/tc-format.md`               | Single source of truth for `TC-{FEATURE}-{NNN}` entries, GWT template, decade numbering         | ✅     | contract |
| SDD artifact contract           | `.claude/skills/shared/sdd-artifact-contract.md`   | BLOCKING AI-SDD mandates M1-M6                                                                  | ✅     | contract |
| Spec quality principles         | `docs/project-reference/spec-principles.md`        | §3 tech-agnostic surface scope + §3.2 banned prose-token list                                   | ✅     | contract |
| Spec location convention        | `docs/specs/{Bucket}/README.{FeatureName}.md`      | Prescribed authored-spec location — **convention only**, `docs/specs/` not on disk              | ❌     | 0 specs  |

Phase-4 verified: the three core template paths (`detailed-feature-spec-template.md`, `spec/SKILL.md`, `shared/tc-format.md`) all exist on disk.

## Section Structure

Canonical **tech-free 8-section Feature Spec**, exact order (`.claude/skills/spec/SKILL.md:64` + `docs/templates/detailed-feature-spec-template.md`). Frequency is **100% prescribed** (template-mandated; not sampled, since 0 specs exist):

| #   | Section                            | Source                        |
| --- | ---------------------------------- | ----------------------------- |
| 1   | Overview                           | `SKILL.md:64`; template:22,33 |
| 2   | Glossary                           | `SKILL.md:64`; template:23,43 |
| 3   | User Stories & Acceptance Criteria | `SKILL.md:64`; template:24,56 |
| 4   | Business Rules                     | `SKILL.md:64`; template:25,76 |
| 5   | Domain Model                       | `SKILL.md:64`; template:26    |
| 6   | Process Flows                      | `SKILL.md:64`; template:27    |
| 7   | Permissions & Roles                | `SKILL.md:64`; template:28    |
| 8   | Test Specifications                | `SKILL.md:64`; template:29    |
| —   | Change History (trailing)          | `SKILL.md:64,78`              |

**No technical sections** (Commands/Events/API/Cross-Service/Performance/Troubleshooting) — "code is the technical source of truth" (`SKILL.md:64`). Per-section anchors: §5 Mermaid ERD + `[Source: component/{service}/{id}]` per entity; §4 `[Source: rule/{service}/{id}]` per rule group; §8 a `TC-{FEATURE}-{NNN}` registry where each TC carries a hidden `[Source:]` carrier + `IntegrationTest:` link (`SKILL.md:69-71`).

## Documentation Conventions

**Location / naming:** Feature Spec root `docs/specs/` (fixed, `SKILL.md:19`); one spec per module-level capability (`template:13`); buckets under `docs/specs/{Bucket}/` group specs; bucket `INDEX.md` + cross-capability ERD are **DERIVED** by `/spec-index`, never authored by `/spec` (`SKILL.md:88,116`).

**ID / numbering:**

| Artifact             | Format                               | Source            |
| -------------------- | ------------------------------------ | ----------------- |
| User story           | `US-{FC}-NN`                         | template:63       |
| Acceptance criterion | `AC-{FC}-NN` (Given/When/Then)       | template:71       |
| Business rule        | `BR-{FC}-NN` + `[HARD]`/`[SOFT]`     | template:79-80    |
| Test case            | `TC-{FEATURE}-{NNN}` + `[P0]`-`[P3]` | `tc-format.md:36` |

`{FC}` = `feature_code` from YAML frontmatter (`template:3`). **TC decade numbering** (collision-proof, `tc-format.md:141-150`): 001-009 CRUD/core · 011-019 validation · 021-029 authorization · 031-039 events/jobs · 041-049 cross-service · 051-059 edge/error · 061-069 UI/journey · 071-099 feature-specific.

> ⚠ Distinct registries: the canonical Section-8 `TC-{FEATURE}-{NNN}` is **not** the E2E layer's code (`project-config.json` `e2eTesting.tcCodeFormat`:387 — "UNSTANDARDIZED: `TS-{MODULE}-{Pn}-{NNN}` / `TC-{MODULE}-{AREA}-{NNN}`"). Do not conflate.

**Required YAML frontmatter** (`template:1-9`): `module`, `service`, `feature_code`, `entities[]`, `status` (draft|active|deprecated), `owner`, `last_updated`. `mode=draft` adds `provisional: true` + unverified banner (`SKILL.md:49`).

**Required TC fields** (`tc-format.md:36-89`): Objective · Business Intent/Invariant · Preconditions · Steps (Gherkin GWT) · Acceptance (✅/❌) · Test Data (JSON) · Edge Cases · **Evidence** (`[Source:]` or `TBD (pre-implementation)`) · Related Behaviors · **IntegrationTest** · **Status** (Tested|Untested|Planned).

**Evidence / anchor rules (M2/M3/M5):** §1-7 prose strictly tech-free (banned tokens in `spec-principles.md §3.2`); technical identifiers only in evidence carriers (`**Evidence**`, `IntegrationTest`, `[Source:]`), frontmatter, and ` ```mermaid ``` ` blocks (`SKILL.md:82`). Abstract anchor taxonomy `[Source: namespace/service/id]`, namespace ∈ `operation|event|component|schema|requirement|rule|constraint|test` (`tc-format.md:91-95`) — never physical `file:line` in prose. `IntegrationTest` is the lone physical link (`{TestFile}::{MethodName}`), exempt and stack-regenerated (`tc-format.md:97-102`). TC↔test is **one-to-many**, joined by the `TestSpec=TC-{FEATURE}-{NNN}` annotation (`tc-format.md:108-127`).

**Size caps** (`SKILL.md:77`): body §1-7 ≤1200 lines; whole file ≤1800 (hard). Split capability when body>1200 OR TCs>40. **Change History** entry required for every functional change (`SKILL.md:78`).

## Coverage Gaps

**The project has ZERO feature specs — the canonical system is entirely unpopulated.**

| Gap                                                        | Evidence                                                                 | Severity                                     |
| ---------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------- |
| `docs/specs/` root absent                                  | glob `docs/specs/**` → No files found                                    | Blocking for spec-driven workflows           |
| `docs/business-features/` / `docs/features/` absent        | glob → No files found                                                    | —                                            |
| `playground-text-snippet` + `text-snippet-domain`: 0 specs | no `docs/specs/` bucket exists                                           | High                                         |
| 8 `TextSnippet.*` backend services: 0 specs                | same                                                                     | High                                         |
| No Section-8 TC registry                                   | `TC-{FEATURE}-{NNN}` defined (`tc-format.md`) but no spec carries any TC | High                                         |
| No `meta.domain` / bucket field on modules                 | only `meta.port` on `TextSnippet.Api` (`project-config.json:109-111`)    | Medium (forces name-derived bucketing)       |
| Port mismatch in config vs frontend                        | config 5000 vs frontend 5001 (`environment.ts:7`)                        | Low (reconcile when documenting API surface) |

**Starting material available** to bootstrap specs: 8 backend layer dirs, 2 controllers (`TextSnippet`, `TaskItem`), 2 frontend domain API services with verified routes, full `modules[]` registry, and canonicalized TC/spec-system contracts.

**Seed route:** run `/workflow-code-to-spec init-full` (or `/spec` `init` mode per capability) → establish `docs/specs/{Bucket}/` (derive bucket from the `text-snippet` stem) → derive specs from the two controllers + frontend APIs → generate Section-8 `TC-{FEATURE}-{NNN}` TCs (not E2E codes) → run `/spec-index` for the derived navigation index/ERD.

## M1/M2 Compliance Leaks

**N/A — no feature specs exist to scan.** `docs/specs/` is absent (glob-verified), so there is no §1-14 spec prose that could carry M1 (non-tech-agnostic prose) or M2 (source identifiers in prose) leaks.

Mandates are defined in `.claude/skills/shared/sdd-artifact-contract.md` ("AI-SDD Mandates M1-M6", BLOCKING) and `docs/project-reference/spec-principles.md` §3 + §3.2 (tech-agnostic surface + banned-token list). Summary (`SKILL.md:82`): **M1** tech-agnostic prose · **M2** no source code in prose · **M3** logical-IDs-first traceability with a separate `[Source:]` carrier · **M4** AI-implementability (one interpretation, named success/failure) · **M5** rebuild-from-scratch on any stack from §1-8 prose alone · **M6** per the artifact contract. Re-run this scan's M1/M2 leak audit once specs are authored.

---

> **Final purpose:** this is the routing map for feature-documentation work. Specs are tech-free 8-section contracts at `docs/specs/{Bucket}/README.{FeatureName}.md`; `/spec` authors, `/spec-index` derives. Until any exist, the only valid action is the seed route in **Coverage Gaps**. Re-run `/scan --target=feature-spec` after specs are created to populate Section Structure frequencies and the M1/M2 leak audit from real documents.
