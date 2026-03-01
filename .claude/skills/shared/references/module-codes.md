# Module & Test Case ID Reference

> Single source of truth for all test-related skills.
> Referenced by: `test-spec`, `test-specs-docs`, `tdd-spec`, `integration-test`.

## Unified TC Format: `TC-{FEATURE}-{NNN}`

All skills use **one format**. Feature codes are 2-4 letters. Sequential numbering per feature.

**Source of truth:** Feature docs Section 17 (canonical TC registry).
**Dashboard:** `docs/test-specs/` (aggregated cross-module views, not duplicated TCs).
**Code link:** Test annotation/attribute linking test method to TC ID (e.g., `[Trait("TestSpec", "TC-{FEATURE}-{NNN}")]`).

## Example Feature Codes

> **Customize these for your project.** The services and feature codes below are examples
> illustrating the naming convention. Replace them with your actual microservices and features.

### Service A (e.g., HR/Growth)

| Code | Feature            |
| ---- | ------------------ |
| GM   | Goal Management    |
| CI   | Check-In           |
| PR   | Performance Review |
| KD   | Kudos              |
| TM   | Time Management    |
| FT   | Form Templates     |

### Service B (e.g., Recruitment)

| Code | Feature        |
| ---- | -------------- |
| CAN  | Candidate      |
| JOB  | Job            |
| REC  | Recruitment    |
| EMP  | Employee       |
| INT  | Interview      |
| SET  | Settings       |
| MAT  | Matching       |
| JOP  | Job Opening    |
| HP   | Hiring Process |

### Service C (e.g., Surveys)

| Code | Feature             |
| ---- | ------------------- |
| SD   | Survey Design       |
| SDI  | Survey Distribution |

### Service D (e.g., Analytics)

| Code | Feature   |
| ---- | --------- |
| DASH | Dashboard |

### Service E (e.g., Identity)

| Code | Feature         |
| ---- | --------------- |
| AUTH | Authentication  |
| USER | User Management |

### Service F (e.g., Infrastructure)

| Code | Feature      |
| ---- | ------------ |
| PERM | Permissions  |
| NM   | Notification |
| PAR  | Parser       |

### Cross-Module

| Code  | Feature                  |
| ----- | ------------------------ |
| INTEG | Cross-module Integration |

## Migration Policy

**New-only:** New TCs use `TC-{FEATURE}-{NNN}`. Existing TCs keep current codes. No retroactive renames.
