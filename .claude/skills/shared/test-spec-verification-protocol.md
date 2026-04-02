# Test Spec Verification Protocol

> **TL;DR — Cross-reference code changes against TC-{FEAT}-{NNN} test specifications. Flag untested code paths, missing TCs for new functions, and stale evidence in existing TCs. Code without test specs is invisible to QA.**

> **MANDATORY** for: `/review-changes`, `/code-review`, `/review-post-task`
> **When to read:** During any code review evaluating changed code in projects with test specifications
> **Key principle:** Every changed code path should map to a test case. New code without TCs is a test gap. Changed code with existing TCs needs evidence re-verification.

---

<HARD-GATE>
DO NOT skip test spec verification because "this project doesn't have test specs yet."
If specs don't exist, flag it as "No test specs found — recommend /tdd-spec to create them."
If specs DO exist, you MUST cross-reference. Skipping is a VIOLATION.
</HARD-GATE>

## Step 1: Locate Test Specifications

From the changed files, determine the module/feature and find test specs:

1. **Feature docs (primary):** `docs/business-features/{Service}/detailed-features/{Feature}.md` → Section 17 (Test Specifications)
2. **Test specs dashboard:** `docs/test-specs/{module}/` → aggregated TC index
3. **Module code mapping:** Use `.claude/skills/shared/references/module-codes.md` — maps service names to 2-4 letter feature codes (e.g., GM=GoalManagement, AUTH=Authentication, CAN=Candidate) used in TC IDs

**If no test specs found:**

- Log: `INFO: No test specifications found for changed module. Recommend running /tdd-spec to generate them.`
- Continue with remaining review — do NOT skip the entire protocol

## Step 2: TC Coverage Check

For each **changed code path** (new function, modified function, new endpoint, changed business rule):

- [ ] **Find matching TC:** Search for `TC-{FEAT}-{NNN}` that covers this code path
- [ ] **Verify TC exists:** If no TC covers the changed path → flag: `WARN: New/changed code at {file}:{line} has no test specification`
- [ ] **Check TC decade:** Verify the right TC category covers the change:

| TC Decade | Category        | When to verify                             |
| --------- | --------------- | ------------------------------------------ |
| 001-009   | CRUD operations | Data create/read/update/delete changes     |
| 011-019   | Validation      | Input validation, business rule changes    |
| 021-029   | Permission/Auth | Authorization checks, role-based access    |
| 031-039   | Workflow/Events | State machine, event handler, saga changes |
| 041-049   | Integration     | Cross-service, API boundary changes        |
| 051-059   | Edge cases      | Error handling, boundary condition changes |

## Step 3: Evidence Verification

For each TC found in Step 2:

- [ ] **Evidence field populated:** TC has `Evidence: {file}:{line}` (not "TBD" or empty)
- [ ] **Evidence file exists:** `grep -l` or `Read` to verify the referenced file exists
- [ ] **Evidence line valid:** The referenced line range contains relevant code (not stale after refactoring)
- [ ] **Evidence matches change:** If the changed code IS the evidence target, verify TC assertions still hold after the change

## Step 4: Cross-Cutting TC Verification

Based on what the code change touches, verify cross-cutting TCs exist:

- [ ] **Auth-gated code changed** → TC-{FEAT}-021 through TC-{FEAT}-029 (Permission TCs) must exist
- [ ] **Data model changed** → TC-{FEAT}-001 through TC-{FEAT}-009 (CRUD TCs) must exist
- [ ] **Validation rules changed** → TC-{FEAT}-011 through TC-{FEAT}-019 (Validation TCs) must exist
- [ ] **Event/message emitted** → TC-{FEAT}-031 through TC-{FEAT}-039 (Workflow TCs) must exist

## Step 5: Regression Risk Assessment

- [ ] **Changed function with existing TCs:** Flag these TCs for re-verification — the implementation changed, so test assertions may need updating
- [ ] **Deleted code with TCs:** Flag orphaned TCs — code was removed but TC still references it
- [ ] **Renamed/moved code:** Flag TCs with stale file paths in Evidence field

## Output Format

Add to review report:

```markdown
### Test Spec Verification

**Module:** {module-code} | **TCs Found:** {count} | **Gaps:** {count}

| Changed Code        | TC Coverage                      | Status            |
| ------------------- | -------------------------------- | ----------------- |
| `{file}:{function}` | TC-{FEAT}-{NNN}                  | ✅ Covered        |
| `{file}:{function}` | None found                       | ⚠️ Gap — needs TC |
| `{file}:{function}` | TC-{FEAT}-{NNN} (stale evidence) | ⚠️ Re-verify      |

**Recommendations:**

- Run `/tdd-spec` to generate missing TCs for: {list}
- Re-verify TCs: {list} (evidence may be stale after changes)
```

## Skip Conditions

- **No test specs exist AND project has no `docs/business-features/`:** Log info and skip (framework/utility projects)
- **Documentation-only changes:** Skip entirely
- **Config/env changes:** Only check Step 4 cross-cutting (auth config changes need auth TCs)

---

## Closing Reminders

- **MUST** locate test specs (Section 17 in feature docs or docs/test-specs/) before reviewing code
- **MUST** flag new functions/endpoints/handlers without corresponding TC as "needs test spec"
- **MUST** verify cross-cutting TCs exist when auth or data model code changes
- **MUST NOT** skip verification because "project doesn't have specs" — flag the gap and recommend /tdd-spec
- **MUST** check TC evidence fields point to actual code (not stale references)

> **REMINDER — Test Spec Verification Protocol:** Every changed code path should map to a TC-{FEAT}-{NNN}. New code without TCs is invisible to QA. Changed code with existing TCs needs evidence re-verification. If no specs exist, recommend /tdd-spec to create them.
