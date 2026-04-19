---
name: tdd-spec
version: 1.0.0
category: Testing
description: '[Testing] Generate or update test specifications in feature docs (Section 15) with unified TC-{FEATURE}-{NNN} format. Supports TDD-first, implement-first, update, and sync modes.'
triggers: 'tdd spec, tdd test, test driven, write test specs, create test cases, update test specs, test specifications for feature, test spec for feature, sync test specs, generate test specs from code, update test specs after changes, test specs from PR, test specs from pull request, code to test specs'
---

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> - **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> - **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> - **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> - **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> - **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> - **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> - **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> - **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> - **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> - **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->

# TDD Spec — Test-Driven Specification Writer

> **[MANDATORY]** You MUST ATTENTION use `TaskCreate` to break ALL work into small tasks BEFORE starting. NEVER skip task creation.

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

<!-- SYNC:rationalization-prevention -->

> **Rationalization Prevention** — AI skips steps via these evasions. Recognize and reject:
>
> | Evasion                      | Rebuttal                                                      |
> | ---------------------------- | ------------------------------------------------------------- |
> | "Too simple for a plan"      | Simple + wrong assumptions = wasted time. Plan anyway.        |
> | "I'll test after"            | RED before GREEN. Write/verify test first.                    |
> | "Already searched"           | Show grep evidence with `file:line`. No proof = no search.    |
> | "Just do it"                 | Still need TaskCreate. Skip depth, never skip tracking.       |
> | "Just a small fix"           | Small fix in wrong location cascades. Verify file:line first. |
> | "Code is self-explanatory"   | Future readers need evidence trail. Document anyway.          |
> | "Combine steps to save time" | Combined steps dilute focus. Each step has distinct purpose.  |

<!-- /SYNC:rationalization-prevention -->

> **Graph Context (MANDATORY when graph.db exists):** Before generating test specs, run graph impact analysis. This reveals cross-service consumers, event handlers, and implicit connections (MESSAGE_BUS, API_ENDPOINT, TRIGGERS_EVENT) that tests must cover.

## Quick Summary

**Goal:** Generate or update test specifications in feature docs Section 15 (canonical TC registry) using the unified `TC-{FEATURE}-{NNN}` format. Supports 5 modes: TDD-first, implement-first, update (post-change/PR), sync, and from-integration-tests.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

> **MANDATORY IMPORTANT MUST ATTENTION** Plan ToDo Task to READ the following project-specific reference doc:
>
> <!-- SYNC:evidence-based-reasoning -->
>
> > **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs proof.
> >
> > 1. Cite `file:line`, grep results, or framework docs for EVERY claim
> > 2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
> > 3. Cross-service validation required for architectural changes
> > 4. "I don't have enough evidence" is valid and expected output
> >
> > **BLOCKED until:** `- [ ]` Evidence file path (`file:line`) `- [ ]` Grep search performed `- [ ]` 3+ similar patterns found `- [ ]` Confidence level stated
> >
> > **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> > **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`
>
> <!-- /SYNC:evidence-based-reasoning -->
>
> <!-- SYNC:cross-cutting-quality -->
>
> > **Cross-Cutting Quality** — Check across all changed files:
> >
> > 1. **Error handling consistency** — same error patterns across related files
> > 2. **Logging** — structured logging with correlation IDs for traceability
> > 3. **Security** — no hardcoded secrets, input validation at boundaries, auth checks present
> > 4. **Performance** — no N+1 queries, unnecessary allocations, or blocking calls in async paths
> > 5. **Observability** — health checks, metrics, tracing spans for new endpoints
>
> <!-- /SYNC:cross-cutting-quality -->
>
> - `.claude/skills/tdd-spec/references/tdd-spec-template.md` — TC template format
> - `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (content auto-injected by hook — check for [Injected: ...] header before reading)
> - `docs/project-reference/integration-test-reference.md` — Integration test patterns, fixture setup, seeder conventions, lessons learned (MUST READ before reviewing/writing integration tests)
> - `docs/test-specs/` — Test specifications by module (read existing TCs before generating new to avoid duplicates and maintain TC ID continuity)

**Workflow:**

1. **Mode Detection** — Determine mode: TDD-first, implement-first, update, sync, or from-integration-tests
2. **Investigation** — Analyze PBI/codebase/existing TCs/git changes based on mode
3. **TC Generation** — Generate TC outlines, review interactively with user
4. **Write to Feature Doc** — Upsert TCs into target feature doc Section 15
5. **Dashboard Sync** — Optionally update `docs/test-specs/` cross-module dashboard
6. **Next Steps** — Suggest follow-on actions based on mode

**Key Rules:**

- **Unified format:** `TC-{FEATURE}-{NNN}` — feature codes in `docs/project-reference/feature-docs-reference.md`
- **Source of truth:** Feature docs Section 15 is the canonical TC registry
- **Evidence required:** Every TC MUST ATTENTION have `Evidence: {FilePath}:{LineRange}` or `TBD (pre-implementation)` for TDD-first mode
- **Minimum 4 categories:** Positive (happy path), negative (error handling), **authorization** (role-based access), edge cases (for bugfix specs: MANDATORY Preservation Tests category — see `references/tdd-spec-template.md#preservation-tests-mandatory-for-bugfix-specs`)
- **Cross-cutting TC categories:**
    - **Authorization TCs (mandatory):** Authorized access succeeds, unauthorized access rejected, role-based visibility verified
    - **Seed Data TCs (if applicable):** Reference data exists, seeder runs correctly
    - **Performance TCs (if applicable):** Feature performs within SLA under production-like data volume
    - **Data Migration TCs (if applicable):** Data transforms correctly, rollback works, no data loss
    - **Preservation TCs (MANDATORY for bugfixes):** ≥1 preservation test per "Healthy input" row in the plan's Preservation Inventory. Authored from OLD code's semantics BEFORE fix lands. See `references/tdd-spec-template.md#preservation-tests-mandatory-for-bugfix-specs`.
- **Interactive review:** ALWAYS use `AskUserQuestion` to review TC list with user before writing

---

## Quick Reference

### Related Skills

| Skill              | Relationship                                                                |
| ------------------ | --------------------------------------------------------------------------- |
| `test-spec`        | Heavyweight planning/investigation → feeds into this skill                  |
| `test-specs-docs`  | Dashboard writer → syncs FROM feature docs Section 15                       |
| `integration-test` | Code generator → generates integration tests FROM TCs written by this skill |
| `feature-docs`     | Feature doc creator → creates the Section 15 that this skill populates      |

### Output Locations

| Artifact                  | Path                                                                     |
| ------------------------- | ------------------------------------------------------------------------ |
| TCs (canonical)           | `docs/business-features/{App}/detailed-features/{feature}.md` Section 15 |
| Dashboard (optional)      | `docs/test-specs/{Module}/README.md` Implementation Index                |
| Priority index (optional) | `docs/test-specs/PRIORITY-INDEX.md`                                      |

> **Phase-Mapped Coverage:** When a plan exists with multiple phases, generate test cases
> PER PHASE — not just per feature. Each phase's success criteria MUST ATTENTION have ≥1 test case.

### Frontend/UI Context (if applicable)

> When this task involves frontend or UI changes,

<!-- SYNC:ui-system-context -->

> **UI System Context** — For ANY task touching `.ts`, `.html`, `.scss`, or `.css` files:
>
> **MUST ATTENTION READ before implementing:**
>
> 1. `docs/project-reference/frontend-patterns-reference.md` — component base classes, stores, forms
> 2. `docs/project-reference/scss-styling-guide.md` — BEM methodology, SCSS variables, mixins, responsive
> 3. `docs/project-reference/design-system/README.md` — design tokens, component inventory, icons
>
> Reference `docs/project-config.json` for project-specific paths.

<!-- /SYNC:ui-system-context -->

- Component patterns: `docs/project-reference/frontend-patterns-reference.md`
- Styling/BEM guide: `docs/project-reference/scss-styling-guide.md`
- Design system tokens: `docs/project-reference/design-system/README.md`

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

1. `docs/project-reference/feature-docs-reference.md` — identify the correct `{FEATURE}` code for TC IDs
2. Target feature doc — check if Section 15 exists, read existing TCs to avoid ID collisions

**If target feature doc doesn't exist:**

- Suggest running `/feature-docs` first, OR
- Create a minimal Section 15 stub in the appropriate feature doc

### Phase 2: Investigation

**TDD-first mode:**

1. Read the PBI/story document (from `team-artifacts/pbis/` or user-provided)
2. Extract acceptance criteria
3. Identify test categories: CRUD operations, validation rules, **authorization** (mandatory), workflows, edge cases, **seed data**, **performance data**, **data migration**
4. Cross-reference with existing feature doc requirements (Sections 1-14)
5. Cross-reference PBI Authorization section → generate authorization TCs (unauthorized access rejection per role)
6. Cross-reference PBI Seed Data section → generate seed data TCs if reference/config data needed
7. Cross-reference PBI Data Migration section → generate migration TCs if schema changes exist

**Implement-first mode:**

1. Grep for commands/queries in the target service: `grep -r "class.*Command.*:" src/Services/{service}/`
2. Grep for entities and domain events
3. Trace code paths: Controller → Command → Handler → Entity → Event Handler
4. Identify testable behaviors from actual implementation

**Update mode (post-change / post-bugfix / post-PR):**

1. Read existing Section 15 TCs
2. `git diff` or `git diff main...HEAD` (for PRs) to find code changes since TCs were last updated
3. Identify: new commands/queries not covered, changed behaviors, removed features
4. For bugfixes: add a regression TC for the bug that was fixed (e.g., `TC-GM-040: Regression — goal title validation bypass`)
5. Generate gap analysis
6. Update **both** feature docs Section 15 AND `docs/test-specs/` dashboard

**Sync mode (bidirectional reconciliation):**

1. Read feature docs Section 15 TCs for target module
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
4. Write extracted TCs to feature doc Section 15 (if not already there)
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

### Phase 4: Write to Feature Doc Section 15

**This is the canonical write — feature docs own the TCs.**

1. Locate Section 15 in target feature doc
2. If Section 15 exists: append new TCs after existing ones, preserving existing TC IDs
3. If Section 15 doesn't exist: create it from template
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
2. "/workflow-review-changes — Review all changes"
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

- ❌ Writing TCs to `docs/test-specs/` as the primary destination (use feature docs Section 15)
- ❌ Using `TC-{SVC}-{NNN}` or `TC-{SVC}-{FEATURE}-{NNN}` format (use unified `TC-{FEATURE}-{NNN}`)
- ❌ Generating TCs without reading existing Section 15 (causes ID collisions)
- ❌ Skipping the interactive review step (user must approve TC list)
- ❌ Writing TCs without Evidence field (every TC needs it, even if `TBD`)

---

## See Also

- `test-spec` — Heavyweight test planning and investigation (use BEFORE this skill for complex features)
- `test-specs-docs` — Dashboard sync skill (aggregates TCs from feature docs to `docs/test-specs/`)
- `integration-test` — Integration test code generator (use AFTER this skill to generate test stubs)
- `feature-docs` — Feature doc creator (creates the Section 15 that this skill populates)
- `refine` — PBI refinement (feeds acceptance criteria into this skill's TDD-first mode)

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use `AskUserQuestion` to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `pbi-to-tests` workflow** (Recommended) — tdd-spec → tdd-spec-review → quality-gate
> 2. **Execute `/tdd-spec` directly** — run this skill standalone

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/integration-test (Recommended)"** — Generate integration test code from specs
- **"/test"** — Run tests to verify implementation
- **"Skip, continue manually"** — user decides

## Closing Reminders

**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality.
**MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:

<!-- SYNC:rationalization-prevention:reminder -->

- **IMPORTANT MUST ATTENTION** never skip steps via "too simple" or "already searched" evasions. Plan anyway, test first, show grep evidence.
      <!-- /SYNC:rationalization-prevention:reminder -->
      <!-- SYNC:evidence-based-reasoning:reminder -->
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% do NOT recommend.
      <!-- /SYNC:evidence-based-reasoning:reminder -->
      <!-- SYNC:cross-cutting-quality:reminder -->
- **IMPORTANT MUST ATTENTION** check error handling, logging, security, performance, and observability across changed files.
      <!-- /SYNC:cross-cutting-quality:reminder -->
      <!-- SYNC:ui-system-context:reminder -->
- **IMPORTANT MUST ATTENTION** read frontend-patterns-reference, scss-styling-guide, design-system/README before any UI change.
      <!-- /SYNC:ui-system-context:reminder -->
      <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
      <!-- /SYNC:critical-thinking-mindset:reminder -->
      <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
      <!-- /SYNC:ai-mistake-prevention:reminder -->
