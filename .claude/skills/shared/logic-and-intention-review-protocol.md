# Logic & Intention Review Protocol

> **TL;DR — Code can be clean, well-architected, and pass all quality checks while being functionally WRONG. This protocol catches logic errors that code-quality reviews miss. Verify WHAT the code does matches WHY it was changed.**

> **MANDATORY** for: `/review-changes`, `/code-review`, `/review-post-task`
> **When to read:** During any code review that evaluates uncommitted or recently-committed changes
> **Key principle:** Every changed line must serve the stated purpose. Unrelated changes are noise. Wrong logic is worse than bad style.

---

<HARD-GATE>
DO NOT mark a review as PASS without completing at least the Change Intention Check and one Logic Trace.
Skipping logic review because "the code looks clean" is a VIOLATION — clean code can be wrong code.
</HARD-GATE>

## 1. Change Intention Check (MANDATORY)

**Goal:** Every changed file must serve the stated purpose of the change.

- [ ] **Identify purpose:** Read git diff summary, plan context, commit message, or PR description to understand WHY this change exists
- [ ] **File-by-file alignment:** For each changed file, answer: "Does this file change serve the stated purpose?" Flag unrelated modifications as `WARN: Unrelated change in {file}`
- [ ] **Scope creep detection:** Are there "while I'm here" refactors or cleanups mixed in? Flag for separate commit
- [ ] **Missing changes:** Based on the stated purpose, are there files that SHOULD have been changed but weren't? Flag as `WARN: Expected change missing in {file}`

## 2. Logic Trace (MANDATORY — at least one per review)

**Goal:** Verify the code actually does what it's supposed to do, not just that it's well-formatted.

- [ ] **Happy path trace:** Pick the primary use case. Trace data flow from entry point through each changed function to the output. Does the result match the requirement?
- [ ] **Error path trace:** Pick one failure scenario. Trace what happens when input is invalid, service is down, or data is missing. Does the error handling produce the correct behavior?
- [ ] **Semantic correctness questions** (ask for each changed function):
    - Is the filter/query logic correct? (wrong `AND`/`OR`, missing conditions, inverted checks)
    - Is the sort order right? (ascending vs descending, wrong comparison key)
    - Are boundary conditions matching the spec? (`<` vs `<=`, inclusive vs exclusive ranges)
    - Are business rules correctly encoded? (discount calculation, permission checks, state transitions)

## 3. Acceptance Criteria Mapping (when plan/PBI context available)

**Goal:** Every acceptance criterion has a corresponding code change.

- [ ] **Extract criteria:** From plan, PBI, or user story — list each acceptance criterion
- [ ] **Map to code:** For each criterion, identify which changed file(s) implement it
- [ ] **Flag gaps:** Criteria without corresponding code changes → `FAIL: Acceptance criterion "{X}" has no implementation evidence`
- [ ] **Flag extras:** Code changes not mapped to any criterion → `WARN: Change in {file} not traced to any requirement`

## 4. Side Effect Analysis

**Goal:** Identify what else the change might break.

- [ ] **Event/message consumers:** If changed code emits events or bus messages, trace all consumers. Are they still compatible?
- [ ] **Shared state:** If changed code modifies shared state (cache, singleton, DB), who else reads it?
- [ ] **Cascading updates:** If an entity is modified, are there computed properties, views, or denormalized data that need updating?
- [ ] **API contract:** If function signatures changed, are all callers updated?

## Skip Conditions

- **Trivial changes** (typo fix, comment update, formatting only): Skip sections 2-4, only verify section 1
- **Config-only changes** (env vars, feature flags): Skip section 2, verify sections 1, 3, 4
- **Documentation-only changes**: Skip entire protocol

---

## Closing Reminders

- **MUST** complete Change Intention Check (section 1) for EVERY review — no exceptions
- **MUST** trace at least one happy path + one error path through changed logic (section 2)
- **MUST** flag unrelated changes mixed into the diff as scope creep
- **MUST NOT** mark a review as PASS without verifying logic correctness — clean code can be wrong code
- **MUST** map acceptance criteria to code changes when plan/PBI context is available

> **REMINDER — Logic & Intention Review Protocol:** Verify WHAT the code does matches WHY it was changed. Every changed line must serve the stated purpose. Clean code can be wrong code — trace at least one happy path and one error path through the logic.
