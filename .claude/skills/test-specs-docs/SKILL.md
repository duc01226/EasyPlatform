---
name: test-specs-docs
version: 1.1.0
description: '[Documentation] Sync test specifications between feature docs and docs/test-specs/ dashboard (bidirectional). Use when syncing test specs, updating indexes, reverse-syncing to feature docs, or maintaining cross-module views. Triggers on "test specs", "sync test specs", "test specifications", "reverse sync", "update dashboard", "QA documentation".'

allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task, TaskCreate
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

## Quick Summary

**Goal:** Sync test specifications between feature docs (Section 17) and docs/test-specs/ dashboard. Supports forward sync (feature docs → dashboard), reverse sync (dashboard → feature docs), and bidirectional reconciliation. Feature docs are the canonical TC registry.

**Workflow:**

1. **Context Gathering** — Identify module, read feature doc Section 17 for canonical TCs
2. **Sync Test Specs** — Aggregate TCs from feature docs into docs/test-specs/ dashboard views
3. **Index Updates** — Update PRIORITY-INDEX.md and master README.md

**Key Rules:**

- Test case IDs follow `TC-{FEATURE}-{NNN}` format
- Every test case MUST reference actual source code (anti-hallucination)
- MUST READ `references/test-spec-template.md` before executing
- Verify IDs against PRIORITY-INDEX.md to avoid duplicates
- **Source of truth:** Feature docs Section 17 is the canonical TC registry. This skill SYNCS from there.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models)

## Project Pattern Discovery

Before implementation, search your codebase for project-specific patterns:

- Search for: `test-specs`, `TC-`, test specifications
- Look for: existing test spec folders, priority indexes, module test documents

> **MANDATORY IMPORTANT MUST** Read the `integration-test-reference.md` companion doc for project-specific patterns and code examples.
> If file not found, continue with search-based discovery above.

# Test Specifications Documentation

Generate comprehensive test specifications following project conventions with Given-When-Then format and code evidence.

---

## Prerequisites

**MUST READ** `references/test-spec-template.md` before executing -- contains full module test spec template, Given-When-Then best practices, acceptance criteria format, evidence requirements, and complete example required by Phase 2.

## Output Structure

```
docs/test-specs/
  README.md              # Master index
  PRIORITY-INDEX.md      # All tests by P0-P3
  INTEGRATION-TESTS.md   # Cross-module scenarios
  VERIFICATION-REPORT.md # Verification status
  {Module}/README.md     # Module test specs
```

---

## Test Case ID Format

```
TC-{FEATURE}-{NNN}
```

**⚠️ MUST READ** `shared/references/module-codes.md` for module codes, feature codes, and TC ID formats.

### TC Code Numbering Rules

When creating new `TC-{FEATURE}-{NNN}` codes:

1. **Always check the feature doc's first** — `docs/business-features/{App}/detailed-features/` contains existing TC codes. New codes must not collide.
2. **Existing docs use decade-based grouping** — e.g., GM: 001-004 (CRUD), 011-013 (validation), 021-023 (permissions), 031-033 (events). Find the next free decade.
3. **If a collision is unavoidable** — renumber in the doc side only. Keep `[Trait("TestSpec")]` in .cs files unchanged and add a renumbering note in the doc.
4. **Feature doc is the canonical registry** — the `[Trait("TestSpec")]` in test files is for traceability, not the source of truth for numbering.

---

## Priority Classification

| Priority        | Description                    | Guideline                                       |
| --------------- | ------------------------------ | ----------------------------------------------- |
| **P0** Critical | Security, auth, data integrity | If this fails, users can't work or data at risk |
| **P1** High     | Core business workflows        | Core happy-path for business operations         |
| **P2** Medium   | Secondary features             | Enhances but doesn't block core workflows       |
| **P3** Low      | UI enhancements, non-essential | Nice-to-have polish                             |

---

## Workflow

### Phase 1: Context Gathering

1. **Identify target module** from user request or codebase search
2. **Read existing specs**: `docs/test-specs/README.md`, `docs/test-specs/{Module}/README.md`, `PRIORITY-INDEX.md`
3. **Gather code evidence**: Validation logic, business rules, authorization, edge cases

### Phase 2: Write Test Specifications

**⚠️ MUST READ:** `references/test-spec-template.md` for full module template, GWT best practices, and complete example.

Each test case requires: Priority, Preconditions, Given-When-Then steps, Acceptance Criteria (success + failure), Test Data (JSON), Edge Cases, Evidence (controller + handler refs + code snippets), Related Files table.

### Phase 3: Index Updates

1. Add new test cases to `PRIORITY-INDEX.md` in appropriate priority section
2. Ensure master `docs/test-specs/README.md` links to module

### Phase 4: Reverse Sync (test-specs/ → feature docs) — Optional

When user says "sync test specs to feature docs" or "reverse sync":

1. Read `docs/test-specs/{Module}/README.md` — extract all TCs
2. Read target feature doc Section 17 — extract existing TCs
3. Identify TCs present in test-specs/ but missing from feature doc Section 17
4. For each missing TC: use `Edit` to insert into feature doc Section 17
5. Preserve feature doc format (full TC template with GWT, evidence, etc.)

**Direction detection:**

- "sync test specs" / "update dashboard" → Forward (feature docs → test-specs/) — Phase 2-3
- "sync to feature docs" / "reverse sync" / "update feature docs from test specs" → Reverse — Phase 4
- "full sync" / "bidirectional sync" → Both directions

---

## Anti-Hallucination Protocols

- Every test case MUST reference actual source code
- Read validation logic before writing acceptance criteria
- Verify authorization policies from controller attributes
- Verify line numbers are current using Grep
- Read PRIORITY-INDEX.md before assigning new IDs - never duplicate

---

## Quality Checklist

- [ ] Test case IDs follow TC-{FEATURE}-{NNN} format (unified)
- [ ] All IDs unique (verified against PRIORITY-INDEX.md)
- [ ] Priority assigned per classification guidelines
- [ ] Given-When-Then format for all test steps
- [ ] Acceptance criteria include success AND failure cases
- [ ] Test data in JSON format
- [ ] Edge cases with expected outcomes
- [ ] Code evidence with file paths and line numbers
- [ ] Code snippets in `<details>` blocks
- [ ] Related files table (Backend/Frontend layers)
- [ ] PRIORITY-INDEX.md updated
- [ ] Links to business-features docs

## References

| File                               | Contents                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `references/test-spec-template.md` | Full module template, GWT best practices, acceptance criteria format, evidence requirements, complete example |

---

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break work into many small todo tasks
- Always add a final review todo task to verify work quality and identify fixes/enhancements
