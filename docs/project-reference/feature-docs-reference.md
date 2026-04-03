<!-- Last scanned: 2026-04-03 -->

# Feature Docs Reference

**MUST use 26-section template for all feature docs. MUST include `file:line` evidence for every test case. MUST place docs in `docs/business-features/{Module}/detailed-features/`.**

## App-to-Service Mapping

| Frontend App              | Backend Service Layers                                                                                             | Domain Lib            | Doc Directory                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------- | ------------------------------------- |
| `playground-text-snippet` | TextSnippet.Api, .Application, .Domain, .Infrastructure, .Persistence, .Persistence.Mongo, .Persistence.PostgreSql | `text-snippet-domain` | `docs/business-features/TextSnippet/` |

### Backend Layer Paths

| Layer               | Path Pattern                                                    | Contains                                                              |
| ------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------- |
| API                 | `src/Backend/PlatformExampleApp.TextSnippet.Api/Controllers/`   | Controllers (TextSnippetController, TaskItemController)               |
| Application         | `src/Backend/PlatformExampleApp.TextSnippet.Application/`       | UseCaseCommands/, UseCaseQueries/, UseCaseEvents/, Dtos/, MessageBus/ |
| Domain              | `src/Backend/PlatformExampleApp.TextSnippet.Domain/`            | Entities/, Repositories/, Services/, ValueObjects/, Events/           |
| Infrastructure      | `src/Backend/PlatformExampleApp.TextSnippet.Infrastructure/`    | External service integrations                                         |
| Persistence (EF)    | `src/Backend/PlatformExampleApp.TextSnippet.Persistence/`       | EF Core (SQL Server/PostgreSQL)                                       |
| Persistence (Mongo) | `src/Backend/PlatformExampleApp.TextSnippet.Persistence.Mongo/` | MongoDB persistence                                                   |
| Shared              | `src/Backend/PlatformExampleApp.Shared/`                        | Cross-service DTOs, message contracts                                 |
| Identity            | `src/Backend/PlatformExampleApp.Ids/`                           | Authentication/authorization                                          |

### Frontend Layer Paths

| Layer               | Path                                                          |
| ------------------- | ------------------------------------------------------------- |
| App                 | `src/Frontend/apps/playground-text-snippet/src/app/`          |
| Domain Lib          | `src/Frontend/libs/apps-domains/text-snippet-domain/src/lib/` |
| Domain Components   | `src/Frontend/libs/apps-domains-components/`                  |
| Shared Components   | `src/Frontend/libs/apps-shared-components/`                   |
| Platform Core       | `src/Frontend/libs/platform-core/`                            |
| Platform Components | `src/Frontend/libs/platform-components/`                      |

## Feature Doc Structure

### Required File Layout

```
docs/business-features/{Module}/
  README.md                          # Module overview
  INDEX.md                           # Navigation hub
  API-REFERENCE.md                   # Endpoint documentation
  TROUBLESHOOTING.md                 # Issue resolution guide
  detailed-features/
    README.{FeatureName}.md          # Full doc (26 sections, 1000+ lines)
    README.{FeatureName}.ai.md       # AI companion (max 300 lines)
```

### Mandatory 26-Section Order

| #   | Section                    | Audience               |
| --- | -------------------------- | ---------------------- |
| 1   | Executive Summary          | PO, BA                 |
| 2   | Business Value             | PO, BA                 |
| 3   | Business Requirements      | PO, BA                 |
| 4   | Business Rules             | BA, Dev                |
| 5   | Process Flows              | BA, Dev, Architect     |
| 6   | Design Reference           | BA, UX, Dev            |
| 7   | System Design              | Dev, Architect         |
| 8   | Architecture               | Dev, Architect         |
| 9   | Domain Model               | Dev, Architect         |
| 10  | API Reference              | Dev, Architect         |
| 11  | Frontend Components        | Dev                    |
| 12  | Backend Controllers        | Dev                    |
| 13  | Cross-Service Integration  | Dev, Architect         |
| 14  | Security Architecture      | Dev, Architect         |
| 15  | Performance Considerations | Dev, Architect, DevOps |
| 16  | Implementation Guide       | Dev                    |
| 17  | Test Specifications        | QA                     |
| 18  | Test Data Requirements     | QA                     |
| 19  | Edge Cases Catalog         | QA, Dev                |
| 20  | Regression Impact          | QA                     |
| 21  | Troubleshooting            | Dev, QA, DevOps        |
| 22  | Operational Runbook        | DevOps                 |
| 23  | Roadmap and Dependencies   | PO, BA                 |
| 24  | Related Documentation      | All                    |
| 25  | Glossary                   | PO, BA                 |
| 26  | Version History            | All                    |

## Templates

| Template              | Path                                               | Purpose                                  |
| --------------------- | -------------------------------------------------- | ---------------------------------------- |
| Detailed Feature Docs | `docs/templates/detailed-feature-docs-template.md` | 26-section master template (1050 lines)  |
| AI Companion          | `docs/templates/feature-docs-ai-template.md`       | Code-focused AI context file (249 lines) |
| ADR                   | `docs/templates/adr-template.md`                   | Architecture Decision Records            |
| Changelog Entry       | `docs/templates/changelog-entry-template.md`       | Keep a Changelog format                  |

### AI Companion Sections

Quick Reference, Domain Model, API Contracts, Validation Rules, Service Boundaries, Critical Paths, Test Focus Areas, Usage Notes. MUST be under 300 lines (standard) or 500 lines (extended). MUST link back to full doc. MUST include `Last synced:` timestamp.

## Conventions

### Numbering Codes

| Artifact               | Format               | Example          |
| ---------------------- | -------------------- | ---------------- |
| Functional Requirement | `FR-{MOD}-NN`        | `FR-TS-01`       |
| User Story             | `US-{MOD}-NN`        | `US-TS-01`       |
| Test Case              | `TC-{MOD}-NNN`       | `TC-TS-001`      |
| Business Rule          | `BR-{MOD}-NN`        | `BR-TS-01`       |
| Test Case Priority     | `[P0]`-`[P3]` suffix | `TC-TS-001 [P0]` |

### Evidence Rules

- MUST use `{RelativeFilePath}:{LineNumber}` or `{RelativeFilePath}:{StartLine}-{EndLine}`
- NEVER use template placeholders (`{FilePath}`, `{LineRange}`) in final docs
- NEVER use vague references ("Based on CQRS pattern")
- Every TC-{MOD}-XXX MUST include `IntegrationTest:` field pointing to test file and method
- Missing integration test MUST set `Status: Untested`
- Integration test code MUST have `[Trait("TestSpec", "TC-{MOD}-XXX")]` attribute

### Section Impact Mapping (Updates)

| Change Type            | Impacted Sections                                         |
| ---------------------- | --------------------------------------------------------- |
| New entity property    | 3 (Requirements), 9 (Domain Model), 10 (API Reference)    |
| New API endpoint       | 10 (API Reference), 12 (Controllers), 14 (Security)       |
| New frontend component | 11 (Frontend Components)                                  |
| New filter/query       | 3 (Requirements), 10 (API Reference)                      |
| Any new functionality  | **17, 18, 19, 20 (Test sections) -- MANDATORY**           |
| Any change at all      | **1 (Executive Summary), 26 (Version History) -- ALWAYS** |

### Stakeholder Navigation

MUST include role-based quick navigation table at top of every feature doc:

| Role                | Start Section         | Key Sections                                       |
| ------------------- | --------------------- | -------------------------------------------------- |
| Product Owner       | Executive Summary     | Business Value, Success Metrics, Roadmap           |
| Business Analyst    | Business Requirements | Business Rules, Process Flows, Acceptance Criteria |
| Developer           | Architecture          | Domain Model, API Reference, Implementation Guide  |
| Technical Architect | System Design         | Cross-Service Integration, Performance, Security   |
| QA/QC               | Test Specifications   | Test Data, Edge Cases, Regression                  |
| DevOps/Support      | Troubleshooting       | Operational Runbook                                |

## Coverage Gaps

- No feature docs exist yet in `docs/business-features/` (directory structure defined but pending)
- TextSnippet module listed as `Status: Pending` in business-features index
- `docs/templates/`, `docs/business-features/`, `docs/test-specs/`, `docs/release-notes/` are tracked in git but deleted from working tree

**MUST use 26-section template. MUST include `file:line` evidence for every test case. MUST update Sections 1 and 26 on any change. MUST update Sections 17-20 for any new functionality.**
