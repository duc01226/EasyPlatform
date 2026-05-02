# Section Registry — CLAUDE.md Marker Keys

Maps each section marker key to its data source in `docs/project-config.json`.

## Registry

| Key                   | Heading in CLAUDE.md | Config Source                                                                             | Builder Function          | Conditional                                         |
| --------------------- | -------------------- | ----------------------------------------------------------------------------------------- | ------------------------- | --------------------------------------------------- |
| `tldr`                | TL;DR                | `project.name`, `project.description`, `project.languages`, `modules[]`, `framework.name` | `buildTldr`               | No                                                  |
| `golden-rules`        | Golden Rules         | `contextGroups[].rules` (all groups merged)                                               | `buildGoldenRules`        | Yes — skip if no contextGroups or all rules[] empty |
| `decision-quick-ref`  | Decision Quick-Ref   | `modules[]`, `framework.*`, `messaging.*`, `databases.*`                                  | `buildDecisionQuickRef`   | Yes — skip if no modules                            |
| `key-locations`       | Key File Locations   | `modules[].pathRegex` converted to display paths                                          | `buildKeyLocations`       | Yes — skip if no modules                            |
| `dev-commands`        | Development Commands | `testing.commands.*`, `infrastructure.cicd.*`                                             | `buildDevCommands`        | Yes — skip if no testing.commands                   |
| `infra-ports`         | Infrastructure Ports | `modules[]` where `kind=infrastructure` or ports from docker-compose                      | `buildInfraPorts`         | Yes — skip if no infra ports found                  |
| `api-ports`           | API Service Ports    | `modules[]` where `kind=backend-service` and `meta.port` exists                           | `buildApiPorts`           | Yes — skip if no backend services with ports        |
| `integration-testing` | Integration Testing  | `framework.integrationTestDoc`, scan for test projects                                    | `buildIntegrationTesting` | Yes — skip if no integrationTestDoc                 |
| `e2e-testing`         | E2E Testing          | Scan for e2e test directories, `testing.frameworks[]`                                     | `buildE2eTesting`         | Yes — skip if no e2e test dirs                      |
| `skill-activation`    | Skill Activation     | `contextGroups[]` mapped to skill/doc pairs                                               | `buildSkillActivation`    | Yes — skip if no contextGroups                      |
| `doc-index`           | Documentation Index  | Scan `docs/` directory tree                                                               | `buildDocIndex`           | Yes — skip if no docs/ dir                          |
| `doc-lookup`          | Doc Lookup Guide     | `modules[].name` + `modules[].meta.domain` mapped to `docs/business-features/`            | `buildDocLookup`          | Yes — skip if no modules                            |

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
