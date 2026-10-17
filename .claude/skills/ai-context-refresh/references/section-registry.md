# Section Registry — CLAUDE.md Marker Keys

Maps each section marker key to its data source in `docs/project-config.json`.

## Registry

| Key                   | Heading in CLAUDE.md | Config Source                                                                             | Builder Function          | Conditional                                         |
| --------------------- | -------------------- | ----------------------------------------------------------------------------------------- | ------------------------- | --------------------------------------------------- |
| `tldr`                | TL;DR                | `project.name`, `project.description`, `project.languages`, `modules[]`, `framework.name` | `buildTldr`               | No                                                  |
| `golden-rules` | Source Conventions | `contextGroups[]` path patterns and project documentation only | `buildProjectContextMap` | Empty when no project docs are declared; no hook instructions or skill policy |
| `decision-quick-ref`  | Decision Quick-Ref   | `modules[].meta.repository`, `framework.{backendPatternsDoc,frontendPatternsDoc}`, `workflowPatterns.{architectureStyle,codeHierarchy,crossModuleValidation,cssMethodology,stateManagement}`, `messaging.consumerConvention` | `buildDecisionQuickRef`   | Yes — skip if no modules                            |
| `key-locations`       | Key File Locations   | `modules[].pathRegex` converted to display paths                                          | `buildKeyLocations`       | Yes — skip if no modules                            |
| `dev-commands`        | Development Commands | `testing.commands.*`, `infrastructure.cicd.*`                                             | `buildDevCommands`        | Yes — skip if no testing.commands                   |
| `infra-ports`         | Infrastructure Ports | `modules[]` where `kind=infrastructure` or ports from docker-compose                      | `buildInfraPorts`         | Yes — skip if no infra ports found                  |
| `api-ports`           | API Service Ports    | `modules[]` where `kind=backend-service` and `meta.port` exists                           | `buildApiPorts`           | Yes — skip if no backend services with ports        |
| `integration-testing` | Integration Testing  | `framework.integrationTestDoc`, scan for test projects                                    | `buildIntegrationTesting` | Yes — skip if no integrationTestDoc; a doc declared N/A in `referenceDocs` renders a one-line "No integration-test guide applies" notice |
| `e2e-testing`         | E2E Testing          | `framework.e2eTestDoc` / `e2eTesting.guideDoc`, `testing.frameworks[]`, `e2eTesting.framework` (placeholder `none`/`N/A` is not evidence), optional `e2eTesting.execution`, and `experienceVerification.surfaces[]` | `buildE2eTesting`         | Yes — skip only when no guide doc is configured AND no E2E evidence/profile; a configured guide declared N/A with no evidence renders a one-line "No E2E guide applies" notice |
| `skill-activation` | Retired | None | None | Removed on update; roots carry no skill policy |
| `doc-index`           | Documentation Index  | Scan `docs/` directory tree                                                               | `buildDocIndex`           | Yes — skip if no docs/ dir                          |
| `doc-lookup`          | Doc Lookup — What to Read When | `modules[].meta.domain` rows under the business spec root (default `docs/specs/`; `specRoots.business.path` in `docs/project-config.json` overrides), fixed spec-reference rows, `framework.{backend,frontend}PatternsDoc`; with the project dir also existence-gated start-here rows (project config, docs index, `lessons.md`), one when-to-read row per `referenceDocs[]` entry (`notApplicable: true` or a purpose that opens with / parenthesizes `N/A` → named once as a skip, not routed), the ADR root (`docsRoots.adr.path`, default `docs/adr`); excludes framework navigation | `buildDocLookup`          | No — always rendered                                |

## Heading-to-Key Mapping (for Smart-Merge)

Used when updating an existing CLAUDE.md without markers — matches `##` headings to section keys:

| Heading Pattern (case-insensitive)   | Key                   |
| ------------------------------------ | --------------------- |
| `tl;dr`, `what you must know`        | `tldr`                |
| `golden rule`                        | `golden-rules`        |
| `decision quick`                     | `decision-quick-ref`  |
| `key file location`, `file location` | `key-locations`       |
| `development command`, `dev command` | `dev-commands`        |
| `infrastructure port`                | `infra-ports`         |
| `api.*port`, `service port`          | `api-ports`           |
| `integration test`                   | `integration-testing` |
| `e2e test`, `end.to.end`             | `e2e-testing`         |
| `skill activation`                   | `skill-activation`    |
| `documentation (index\|system)`      | `doc-index`           |
| `doc lookup`                         | `doc-lookup`          |
