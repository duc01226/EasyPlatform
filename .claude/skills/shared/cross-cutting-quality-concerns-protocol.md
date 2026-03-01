# Cross-Cutting Quality Concerns Protocol

**Version:** 1.0.0 | **Last Updated:** 2026-03-10

Every PBI, user story, test spec, and integration test MUST consider these cross-cutting concerns. This protocol is the single source of truth — referenced by `/refine`, `/story`, `/tdd-spec`, `/integration-test`, and their review skills.

---

## 1. Authorization & Access Control

**Priority:** Required — every feature must address this.

### Questions to Ask During Refinement

| Question                                         | Context                 | Output                  |
| ------------------------------------------------ | ----------------------- | ----------------------- |
| Who can perform this action? (roles/permissions) | Every feature           | Roles table in PBI      |
| Are there role-based visibility rules?           | Data display features   | Visibility rules in AC  |
| Does this need new permissions/claims?           | New endpoints/actions   | Permission requirements |
| Is multi-tenant isolation needed?                | Multi-org/SaaS features | Tenant isolation rules  |

### What Each Skill Must Produce

| Skill               | Required Output                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| `/refine`           | `## Authorization` section: roles table, permission matrix, new claims needed                           |
| `/story`            | At least 1 authorization scenario per story (unauthorized access → rejection)                           |
| `/tdd-spec`         | Authorization TCs: authorized access, unauthorized rejection, role-based visibility                     |
| `/integration-test` | Tests with multiple user contexts (`TestUserContextFactory.CreateAdmin()`, `CreateRegularUser()`, etc.) |

### Authorization Section Template (for PBIs)

```markdown
## Authorization & Access Control

| Role      | Can Create | Can Read | Can Update    | Can Delete | Notes        |
| --------- | ---------- | -------- | ------------- | ---------- | ------------ |
| Admin     | ✅         | ✅       | ✅            | ✅         | Full access  |
| Manager   | ✅         | ✅       | ✅ (own team) | ❌         | Team-scoped  |
| Employee  | ❌         | ✅ (own) | ✅ (own)      | ❌         | Self-service |
| Anonymous | ❌         | ❌       | ❌            | ❌         | No access    |

**New permissions needed:** {Yes/No — list if yes}
**Multi-tenant isolation:** {Yes/No}
```

---

## 2. Seed Data & Data Seeder

**Priority:** Recommended — assess for every feature, skip if not applicable.

### Seed Data Categories

| Category               | Description                                             | Owner                       | When Needed                                      |
| ---------------------- | ------------------------------------------------------- | --------------------------- | ------------------------------------------------ |
| **Reference data**     | Static lookups (countries, statuses, types, categories) | Application code            | Features with dropdowns, filters, type selectors |
| **Configuration data** | Default settings, feature flags, system config          | Application code            | Features with configurable behavior              |
| **Demo data**          | Realistic sample data for QC/staging environments       | Application code (optional) | QC testing, demos, UAT                           |
| **Test data**          | Entities for automated test scenarios                   | Test project                | Integration/E2E testing                          |
| **Performance data**   | Large-volume data for load testing                      | Test tooling/scripts        | Features handling lists, reports, exports        |

### Questions to Ask During Refinement

| Question                                                       | Context                    | Output                        |
| -------------------------------------------------------------- | -------------------------- | ----------------------------- |
| Does this feature need default/reference data to function?     | Every feature with lookups | Seed data requirements in PBI |
| Are there lookup tables or enum-like data that must exist?     | Dropdown/filter features   | Reference data list           |
| Does the application need a data seeder for test environments? | Integration testing        | Seed data story               |
| Is seed data part of application logic (useful for QC too)?    | Test environments          | Application-level seeder      |

### What Each Skill Must Produce

| Skill               | Required Output                                                                    |
| ------------------- | ---------------------------------------------------------------------------------- |
| `/refine`           | `## Seed Data Requirements` section if applicable (or "N/A — no seed data needed") |
| `/story`            | Seed data setup story in Sprint 0 if reference/config data needed                  |
| `/tdd-spec`         | Seed data TCs: verify reference data exists, verify seeder runs correctly          |
| `/integration-test` | Test data factory methods, shared fixture setup for common entities                |

---

## 3. Test Data Setup for Integration Testing

**Priority:** Required for `/tdd-spec` and `/integration-test` skills.

### Test Data Patterns

| Pattern             | When to Use                        | Example                                                      |
| ------------------- | ---------------------------------- | ------------------------------------------------------------ |
| **Per-test inline** | Simple tests, unique data          | `var order = new CreateOrderCommand { Name = UniqueName() }` |
| **Factory methods** | Repeated entity creation           | `TestDataFactory.CreateValidOrder()`                         |
| **Builder pattern** | Complex entities with many fields  | `new OrderBuilder().WithStatus(Active).WithItems(3).Build()` |
| **Shared fixture**  | Reference data needed by all tests | `CollectionFixture.SeedReferenceData()`                      |

### Rules

- Every test creates its own data — no shared mutable state between tests
- Use unique identifiers for ALL string data (prevents test pollution)
- Factory methods return valid entities by default — tests override only what they test
- Cross-entity dependencies: create parent first, then child (e.g., create User, then create Order for that User)

---

## 4. Performance Test Data

**Priority:** Recommended — assess for features with data volume concerns.

### Questions to Ask

| Question                                 | Threshold        | Output                              |
| ---------------------------------------- | ---------------- | ----------------------------------- |
| How many records expected in production? | >1000 records    | Performance TC with volume          |
| Does this feature have list/grid/export? | Any list feature | Pagination/performance requirements |
| Are there aggregate queries or reports?  | Report features  | Query performance TCs               |

### Performance TC Template

```markdown
#### TC-{FEATURE}-{NNN}: Performance — {Feature} with realistic data volume [P1]

**Objective:** Verify {feature} performs within SLA under production-like data volume

**Preconditions:**

- {N} records seeded (matching expected production volume)

**Test Steps:**
Given {N} {entities} exist in the database
When user {performs action}
Then response completes within {X}ms
And no timeout or memory errors occur
```

---

## 5. Data Migration

**Priority:** Recommended — assess when entity schema changes.

### Questions to Ask During Refinement

| Question                                                                   | Context                           | Output                     |
| -------------------------------------------------------------------------- | --------------------------------- | -------------------------- |
| Does this change entity schema (new fields, removed fields, type changes)? | Entity modifications              | Migration task in plan     |
| Does existing data need transformation?                                    | Schema changes with existing data | Data migration script      |
| Is backward compatibility needed during rollout?                           | Production deployments            | Rolling migration strategy |
| Is the migration reversible?                                               | High-risk changes                 | Rollback plan              |

### What Each Skill Must Produce

| Skill               | Required Output                                                              |
| ------------------- | ---------------------------------------------------------------------------- |
| `/refine`           | `## Data Migration` section if schema changes (or "N/A — no schema changes") |
| `/story`            | Data migration story if schema changes affect existing data                  |
| `/tdd-spec`         | Migration TCs: data transforms correctly, rollback works, no data loss       |
| `/integration-test` | Migration test: verify entities load correctly after schema change           |

---

## Quick Reference — Concern Applicability

| Concern          | Always Ask?      | Skip When                             |
| ---------------- | ---------------- | ------------------------------------- |
| Authorization    | **Yes — always** | Never skip                            |
| Seed Data        | Assess           | Pure UI changes, no data dependencies |
| Test Data Setup  | Assess           | No integration tests planned          |
| Performance Data | Assess           | Feature handles <100 records          |
| Data Migration   | Assess           | No entity/schema changes              |

---

## Cross-Reference

- **Consumed by:** `/refine`, `/story`, `/tdd-spec`, `/integration-test`, `/refine-review`, `/story-review`, `/tdd-spec-review`
- **Related:** `.claude/skills/shared/scaffold-production-readiness-protocol.md` (infrastructure concerns)
- **Scope:** This protocol covers data & access concerns; scaffold protocol covers tooling & infrastructure concerns
