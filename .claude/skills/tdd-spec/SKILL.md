---
name: tdd-spec
version: 1.0.0
category: Testing
description: '[Testing] Generate or update test specifications in feature docs (Section 17) with unified TC-{FEATURE}-{NNN} format. Supports TDD-first, implement-first, update, and sync modes.'
triggers: 'tdd spec, tdd test, test driven, write test specs, create test cases, update test specs, test specifications for feature, test spec for feature, sync test specs, generate test specs from code, update test specs after changes, test specs from PR, test specs from pull request, code to test specs'
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task, TaskCreate, AskUserQuestion
---

# TDD Spec — Test-Driven Specification Writer

> **[MANDATORY]** You MUST use `TaskCreate` to break ALL work into small tasks BEFORE starting. NEVER skip task creation.

## Quick Summary

**Goal:** Generate or update test specifications in feature docs Section 17 (canonical TC registry) using the unified `TC-{FEATURE}-{NNN}` format. Supports 5 modes: TDD-first, implement-first, update (post-change/PR), sync, and from-integration-tests.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

> **MANDATORY IMPORTANT MUST** Plan ToDo Task to READ the following project-specific reference doc:
>
> - `.claude/skills/shared/references/module-codes.md` — TC ID format and feature codes
> - `.claude/skills/shared/evidence-based-reasoning-protocol.md` — Evidence requirements
> - `.claude/skills/tdd-spec/references/tdd-spec-template.md` — TC template format
> - `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models)

**Workflow:**

1. **Mode Detection** — Determine mode: TDD-first, implement-first, update, sync, or from-integration-tests
2. **Investigation** — Analyze PBI/codebase/existing TCs/git changes based on mode
3. **TC Generation** — Generate TC outlines, review interactively with user
4. **Write to Feature Doc** — Upsert TCs into target feature doc Section 17
5. **Dashboard Sync** — Optionally update `docs/test-specs/` cross-module dashboard
6. **Next Steps** — Suggest follow-on actions based on mode

**Key Rules:**

- **Unified format:** `TC-{FEATURE}-{NNN}` — see `module-codes.md` for feature codes
- **Source of truth:** Feature docs Section 17 is the canonical TC registry
- **Evidence required:** Every TC MUST have `Evidence: {FilePath}:{LineRange}` or `TBD (pre-implementation)` for TDD-first mode
- **Minimum 3 categories:** Positive (happy path), negative (error handling), edge cases
- **Interactive review:** ALWAYS use `AskUserQuestion` to review TC list with user before writing

---

## Quick Reference

### Related Skills

| Skill              | Relationship                                                                |
| ------------------ | --------------------------------------------------------------------------- |
| `test-spec`        | Heavyweight planning/investigation → feeds into this skill                  |
| `test-specs-docs`  | Dashboard writer → syncs FROM feature docs Section 17                       |
| `integration-test` | Code generator → generates integration tests FROM TCs written by this skill |
| `feature-docs`     | Feature doc creator → creates the Section 17 that this skill populates      |

### Output Locations

| Artifact                  | Path                                                                     |
| ------------------------- | ------------------------------------------------------------------------ |
| TCs (canonical)           | `docs/business-features/{App}/detailed-features/{feature}.md` Section 17 |
| Dashboard (optional)      | `docs/test-specs/{Module}/README.md` Implementation Index                |
| Priority index (optional) | `docs/test-specs/PRIORITY-INDEX.md`                                      |

---

## Detailed Workflow

### Phase 1: Mode Detection & Context

Detect mode from user prompt and context:

| Mode                       | Signal                                            | Action                                                            |
| -------------------------- | ------------------------------------------------- | ----------------------------------------------------------------- |
| **TDD-first**              | PBI/story exists, code not yet written            | Generate specs from requirements                                  |
| **Implement-first**        | Code already exists, no/incomplete TCs            | Generate specs from codebase analysis                             |
| **Update**                 | Existing TCs + code changes / bugfix / PR         | Diff existing TCs against current code/PR, find gaps, update both |
| **Sync**                   | User says "sync test specs" or bidirectional need | Reconcile feature docs ↔ docs/test-specs/ (either direction)      |
| **From-integration-tests** | Tests exist with test spec annotations, no docs   | Extract TC metadata from test code → write to feature docs        |

**Must read FIRST:**

1. `module-codes.md` — identify the correct `{FEATURE}` code for TC IDs
2. Target feature doc — check if Section 17 exists, read existing TCs to avoid ID collisions

**If target feature doc doesn't exist:**

- Suggest running `/feature-docs` first, OR
- Create a minimal Section 17 stub in the appropriate feature doc

### Phase 2: Investigation

**TDD-first mode:**

1. Read the PBI/story document (from `team-artifacts/pbis/` or user-provided)
2. Extract acceptance criteria
3. Identify test categories: CRUD operations, validation rules, permission checks, workflows, edge cases
4. Cross-reference with existing feature doc requirements (Sections 1-16)

**Implement-first mode:**

1. Grep for commands/queries in the target service: `grep -r "class.*Command.*:" src/Services/{service}/`
2. Grep for entities and domain events
3. Trace code paths: Controller → Command → Handler → Entity → Event Handler
4. Identify testable behaviors from actual implementation

**Update mode (post-change / post-bugfix / post-PR):**

1. Read existing Section 17 TCs
2. `git diff` or `git diff main...HEAD` (for PRs) to find code changes since TCs were last updated
3. Identify: new commands/queries not covered, changed behaviors, removed features
4. For bugfixes: add a regression TC for the bug that was fixed (e.g., `TC-GM-040: Regression — goal title validation bypass`)
5. Generate gap analysis
6. Update **both** feature docs Section 17 AND `docs/test-specs/` dashboard

**Sync mode (bidirectional reconciliation):**

1. Read feature docs Section 17 TCs for target module
2. Read `docs/test-specs/{Module}/README.md` TCs
3. Read test files: grep for test spec annotations in `src/Services/{service}*.IntegrationTests/`
4. Build 3-way comparison table:

```
| TC ID | In Feature Doc? | In test-specs/? | In Test Code? | Action Needed |
|-------|----------------|-----------------|---------------|---------------|
| TC-OM-001 | ✅ | ✅ | ✅ | None |
| TC-OM-025 | ✅ | ❌ | ✅ | Add to test-specs/ |
| TC-OM-030 | ❌ | ✅ | ❌ | Add to feature doc |
```

5. Reconcile: write missing TCs to whichever system lacks them
6. Feature docs remain source of truth — any conflict uses feature doc version

**From-integration-tests mode (reverse-engineer specs from existing tests):**

1. Grep for `[Trait("TestSpec", "TC-...")]` in target test project
2. For each test method: extract TC ID, method name, test description from comments
3. Read the test method body to generate GWT steps and evidence
4. Write extracted TCs to feature doc Section 17 (if not already there)
5. Useful when: tests were written before the spec system existed, or imported from another project

### Phase 3: TC Generation with Interactive Review

1. Generate TC outlines as a summary table:

```
| TC ID | Name | Priority | Category | Status |
|-------|------|----------|----------|--------|
| TC-GM-037 | Create goal with cascading key results | P0 | CRUD | New |
| TC-GM-038 | Reject goal without required title | P1 | Validation | New |
| TC-GM-039 | External user cannot access goals | P0 | Permission | New |
```

2. Use `AskUserQuestion` to review with user:

```
Question: "These {N} test cases cover {feature}. Review the list:"
Options:
- "Approve as-is (Recommended)" — Proceed to writing
- "Add missing scenario" — Describe what's missing
- "Adjust priorities" — Change P0/P1/P2 assignments
- "Regenerate" — Re-analyze and try again
```

3. Iterate until user approves.

### Phase 4: Write to Feature Doc Section 17

**This is the canonical write — feature docs own the TCs.**

1. Locate Section 17 in target feature doc
2. If Section 17 exists: append new TCs after existing ones, preserving existing TC IDs
3. If Section 17 doesn't exist: create it from template
4. Use `Edit` tool to upsert — never overwrite existing TCs

**TC format** (from `tdd-spec-template.md`):

```markdown
#### TC-{FEATURE}-{NNN}: {Descriptive Test Name} [{Priority}]

**Objective:** {What this test verifies}

**Preconditions:**

- {Setup requirement}

**Test Steps:**
\`\`\`gherkin
Given {initial state}
And {additional context}
When {action}
Then {expected outcome}
And {additional verification}
\`\`\`

**Acceptance Criteria:**

- ✅ {Success behavior}
- ❌ {Failure behavior}

**Test Data:**
\`\`\`json
{ "field": "value" }
\`\`\`

**Edge Cases:**

- {Boundary condition}

**Evidence:** `{FilePath}:{LineRange}` or `TBD (pre-implementation)`
```

**Evidence rules by mode:**

- **TDD-first:** `Evidence: TBD (pre-implementation)` — will be updated after implementation
- **Implement-first:** `Evidence: {actual file}:{actual lines}` — trace to real code
- **Update:** Update existing evidence references if code moved

### Phase 5: Update docs/test-specs/ Dashboard (Optional)

If `docs/test-specs/{Module}/README.md` exists:

1. Update the Implementation Index section with new TC→test method mappings
2. For TDD-first: map to expected test method names (will be created by `/integration-test`)
3. Update `PRIORITY-INDEX.md` with new TC entries in correct priority tier

**Skip this phase** if user says "skip dashboard" or if no `docs/test-specs/` file exists for the module.

### Phase 6: Next Step Suggestion

Based on mode, suggest via `AskUserQuestion`:

**TDD-first:**

```
1. "/integration-test — Generate test stubs from these TCs (Recommended)"
2. "/plan — Plan the feature implementation"
3. "Done for now — I'll implement later"
```

**Implement-first:**

```
1. "/integration-test — Generate integration tests (Recommended)"
2. "/review-changes — Review all changes"
3. "Done for now"
```

**Update (post-change/PR):**

```
1. "/integration-test — Generate/update tests for changed TCs (Recommended)"
2. "/test — Run existing tests to verify coverage"
3. "/test-specs-docs — Sync dashboard with updated TCs"
4. "Done for now"
```

**Sync:**

```
1. "/test-specs-docs — Sync dashboard after reconciliation (Recommended)"
2. "/integration-test — Generate tests for any TCs missing test coverage"
3. "Done for now"
```

**From-integration-tests:**

```
1. "/test-specs-docs — Sync dashboard with newly documented TCs (Recommended)"
2. "/test — Run tests to verify all documented TCs pass"
3. "Done for now"
```

---

## Anti-Patterns

- ❌ Writing TCs to `docs/test-specs/` as the primary destination (use feature docs Section 17)
- ❌ Using `TC-{SVC}-{NNN}` or `TC-{SVC}-{FEATURE}-{NNN}` format (use unified `TC-{FEATURE}-{NNN}`)
- ❌ Generating TCs without reading existing Section 17 (causes ID collisions)
- ❌ Skipping the interactive review step (user must approve TC list)
- ❌ Writing TCs without Evidence field (every TC needs it, even if `TBD`)

---

## See Also

- `test-spec` — Heavyweight test planning and investigation (use BEFORE this skill for complex features)
- `test-specs-docs` — Dashboard sync skill (aggregates TCs from feature docs to `docs/test-specs/`)
- `integration-test` — Integration test code generator (use AFTER this skill to generate test stubs)
- `feature-docs` — Feature doc creator (creates the Section 17 that this skill populates)
- `refine` — PBI refinement (feeds acceptance criteria into this skill's TDD-first mode)

---

## Workflow Recommendation

> **IMPORTANT MUST:** If you are NOT already in a workflow, use `AskUserQuestion` to ask the user:
>
> 1. **Activate `pbi-to-tests` workflow** (Recommended) — tdd-spec → quality-gate
> 2. **Execute `/tdd-spec` directly** — run this skill standalone
