# relocated-project (test fixture)

Fixture project for `.claude/hooks/tests/suites/docroot-relocation.test.cjs`.
Every relocatable root is declared NON-DEFAULT, so an accessor that ignores
configuration resolves to a path that does not exist here and the test fails.

| Config key                        | Framework default         | Fixture value              | Variance class                                |
| --------------------------------- | ------------------------- | -------------------------- | --------------------------------------------- |
| `specRoots.business.path`         | `docs/specs`              | `spec-library`             | plain, single segment                         |
| `specRoots.technical.path`        | `docs/specs-technical`    | `spec-library-derived`     | segment-boundary sibling of the business root |
| `docsRoots.projectReference.path` | `docs/project-reference`  | `documentation/reference`  | nested two levels                             |
| `docsRoots.adr.path`              | `docs/adr`                | `documentation/Decisions`  | CASE                                          |
| `docsRoots.templates.path`        | `docs/templates`          | `documentation\blueprints` | BACKSLASH                                     |
| `docsRoots.plans.path`            | `plans`                   | `work-plans`               | plain; beats the `.ck.json` tier              |
| `docsRoots.teamArtifacts.path`    | `team-artifacts`          | `artifacts/`               | TRAILING SLASH                                |
| `docsRoots.productRoadmap.path`   | `docs/product-roadmap.md` | `documentation/roadmap.md` | file, relocated tree                          |

`reference/` exists only for the single-segment `resolveDocsTree` variant (TC-DOCROOT-165).
