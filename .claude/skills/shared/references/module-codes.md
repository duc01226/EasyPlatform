# Module & Test Case ID Reference

> Single source of truth for all test-related skills. Referenced by: `test-spec`, `test-specs-docs`, `integration-test`, `tasks-test-generation`.

Module codes and test case ID formats are project-specific. Define your project's mapping in CLAUDE.md or a project-level configuration file.

## Template

### Service-Level Codes

Used in: `test-spec` TC IDs (`TC-{SVC}-{NNN}`), `test-specs-docs` TC IDs (`TC-{SVC}-{FEATURE}-{NNN}`)

| Code | Service/Module |
|------|----------------|
| SVC  | Your Service   |
| COM  | Common/Shared  |

### Feature-Level Codes

Used in: `integration-test` code comments (`TC-{2LETTER}-{NNN}`), `test-specs-docs` 4-segment IDs (`TC-{SVC}-{FEATURE}-{NNN}`)

| 2-Letter | 3-Letter | Feature     | Notes |
|----------|----------|-------------|-------|
| FT       | FEA      | FeatureName | Description |

### TC ID Formats

| Context          | Format                     | Example    | Notes                          |
|------------------|----------------------------|------------|--------------------------------|
| test-spec        | `TC-{SVC}-{NNN}`           | TC-SVC-015 | Service-level code (3 letters) |
| test-specs-docs  | `TC-{SVC}-{FEATURE}-{NNN}` | TC-SVC-FEA-001 | Service + feature code + sequence |
| integration-test | `TC-{FEATURE}-{NNN}`       | TC-FT-001  | 2-letter feature code in comments |

### Migration Policy

**New-only:** Existing tests and docs keep their current TC codes. New tests and docs follow this reference. No retroactive renames.
