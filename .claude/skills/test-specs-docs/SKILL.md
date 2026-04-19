---
name: test-specs-docs
version: 1.1.0
description: '[Documentation] Sync test specifications between feature docs and docs/test-specs/ dashboard (bidirectional). Use when syncing test specs, updating indexes, reverse-syncing to feature docs, or maintaining cross-module views. Triggers on "test specs", "sync test specs", "test specifications", "reverse sync", "update dashboard", "QA documentation".'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

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

- `docs/test-specs/` — Test specifications dashboard (canonical sync target; read all module READMEs before syncing)

## Quick Summary

**Goal:** Sync test specifications between feature docs (Section 15) and docs/test-specs/ dashboard. Supports forward sync (feature docs → dashboard), reverse sync (dashboard → feature docs), and bidirectional reconciliation. Feature docs are the canonical TC registry.

**Workflow:**

1. **Context Gathering** — Identify module, read feature doc Section 15 for canonical TCs
2. **Sync Test Specs** — Aggregate TCs from feature docs into docs/test-specs/ dashboard views
3. **Index Updates** — Update PRIORITY-INDEX.md and master README.md

**Key Rules:**

- Test case IDs follow `TC-{FEATURE}-{NNN}` format
- Every test case MUST ATTENTION reference actual source code (anti-hallucination)
- MUST ATTENTION READ `references/test-spec-template.md` before executing
- Verify IDs against PRIORITY-INDEX.md to avoid duplicates
- **Source of truth:** Feature docs Section 15 is the canonical TC registry. This skill SYNCS from there.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (content auto-injected by hook — check for [Injected: ...] header before reading)

## Project Pattern Discovery

Before implementation, search your codebase for project-specific patterns:

- Search for: `test-specs`, `TC-`, test specifications
- Look for: existing test spec folders, priority indexes, module test documents

> **MANDATORY IMPORTANT MUST ATTENTION** Read the `integration-test-reference.md` companion doc for project-specific patterns and code examples.
> If file not found, continue with search-based discovery above.

# Test Specifications Documentation

Generate comprehensive test specifications following project conventions with Given-When-Then format and code evidence.

---

## Prerequisites

**MUST ATTENTION READ** `references/test-spec-template.md` before executing -- contains full module test spec template, Given-When-Then best practices, acceptance criteria format, evidence requirements, and complete example required by Phase 2.

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

**TC format:** `TC-{FEATURE}-{NNN}` — feature codes in `docs/project-reference/feature-docs-reference.md` and each feature doc's Section 15.

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

**⚠️ MUST ATTENTION READ:** `references/test-spec-template.md` for full module template, GWT best practices, and complete example.

Each test case requires: Priority, Preconditions, Given-When-Then steps, Acceptance Criteria (success + failure), Test Data (JSON), Edge Cases, Evidence (controller + handler refs + code snippets), Related Files table.

### Phase 3: Index Updates

1. Add new test cases to `PRIORITY-INDEX.md` in appropriate priority section
2. Ensure master `docs/test-specs/README.md` links to module

### Phase 4: Reverse Sync (test-specs/ → feature docs) — Optional

When user says "sync test specs to feature docs" or "reverse sync":

1. Read `docs/test-specs/{Module}/README.md` — extract all TCs
2. Read target feature doc Section 15 — extract existing TCs
3. Identify TCs present in test-specs/ but missing from feature doc Section 15
4. For each missing TC: use `Edit` to insert into feature doc Section 15
5. Preserve feature doc format (full TC template with GWT, evidence, etc.)

**Direction detection:**

- "sync test specs" / "update dashboard" → Forward (feature docs → test-specs/) — Phase 2-3
- "sync to feature docs" / "reverse sync" / "update feature docs from test specs" → Reverse — Phase 4
- "full sync" / "bidirectional sync" → Both directions

---

## Anti-Hallucination Protocols

- Every test case MUST ATTENTION reference actual source code
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

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/watzup (Recommended)"** — Wrap up session and review all changes
- **"/review-changes"** — Review all uncommitted changes before commit
- **"Skip, continue manually"** — user decides

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
  **MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:
- **IMPORTANT MUST ATTENTION** READ `references/test-spec-template.md` before starting
- **IMPORTANT MUST ATTENTION** READ `docs/project-reference/feature-docs-reference.md` for TC ID formats and feature codes
- **IMPORTANT MUST ATTENTION** READ `CLAUDE.md` before starting
      <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
      <!-- /SYNC:critical-thinking-mindset:reminder -->
      <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
      <!-- /SYNC:ai-mistake-prevention:reminder -->
