# Refinement Definition of Ready (DoR) Checklist Protocol

**Version:** 1.0.0 | **Last Updated:** 2026-03-12

Every PBI MUST pass the DoR gate before entering grooming. This protocol defines the checklist, validation rules, and failure modes. Referenced by `/dor-gate`, `/pbi-challenge`, `/refine-review`, and `ba-refinement-context.cjs` hook.

---

## 1. DoR Checklist Items

All items are **Required** — every item must pass for DoR gate to succeed.

| #   | Criterion                       | Pass Condition                                                                                                                                           | Owner                              |
| --- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| 1   | **User story template**         | PBI contains "As a {role}, I want {goal}, so that {benefit}" format                                                                                      | BA Drafters                        |
| 2   | **AC testable and unambiguous** | All AC use GIVEN/WHEN/THEN format. No "should", "might", "TBD", "etc.", "various", "appropriate"                                                         | BA Drafters                        |
| 3   | **Wireframes/mockups attached** | UI features have `## UI Layout` section per `ui-wireframe-protocol.md` (wireframe + components + states + tokens). Backend-only: "N/A" explicitly stated | UX BA                              |
| 4   | **UI design ready**             | Visual design completed for UI features. Component decomposition tree included for refine/story detail level. Backend-only: "N/A"                        | Designer BA                        |
| 5   | **AI pre-review passed**        | `/refine-review` or `/pbi-challenge` returned PASS or WARN (not FAIL)                                                                                    | Dev BA PIC                         |
| 6   | **Story points estimated**      | PBI has `story_points` field with value 1-21 AND `complexity` field (Low/Medium/High)                                                                    | AI estimation, Dev BA PIC verifies |
| 7   | **Dependencies table complete** | PBI has dependencies table with columns: Dependency, Type (must-before/can-parallel/blocked-by/independent), Status                                      | BA Drafters                        |

---

## 2. Validation Rules

### What counts as "testable"?

- AC can be verified by a QA engineer without asking clarifying questions
- AC specifies exact expected behavior (input → output)
- AC includes measurable criteria (not subjective: "looks good", "is fast")

### What counts as "unambiguous"?

- No vague quantifiers: "some", "many", "various", "appropriate", "relevant"
- No conditional ambiguity: "should", "might", "could", "may"
- No placeholder text: "TBD", "TODO", "to be determined", "pending"
- Specific values where applicable: "within 3 seconds" not "quickly"

### AC minimum requirements

- At least 3 scenarios per PBI: happy path, edge case, error case
- At least 1 authorization scenario (unauthorized access → rejection)
- Each scenario uses full GIVEN/WHEN/THEN structure

### Story point validation

- Valid Fibonacci: 1, 2, 3, 5, 8, 13, 21
- Points >13 require recommendation to split (via `/story` SPIDR splitting)
- Points must align with scope (AI cross-checks)

---

## 3. Failure Modes

Common reasons PBIs fail DoR and how to fix:

| Failure                            | Frequency   | Fix                                                                                              |
| ---------------------------------- | ----------- | ------------------------------------------------------------------------------------------------ |
| Vague AC ("user can manage items") | Very common | Specify EXACTLY what "manage" means: create, read, update, delete with role-specific permissions |
| Missing authorization section      | Common      | Add Authorization & Access Control table (see cross-cutting-quality-concerns-protocol.md §1)     |
| No wireframes for UI feature       | Common      | UX BA creates wireframe; if blocked, mark "Wireframe pending" and do NOT pass DoR                |
| Story points missing               | Occasional  | Run AI estimation via `/refine` Phase 6 or manually assign with team consensus                   |
| Dependencies not mapped            | Occasional  | Review related features, identify must-before (DB migration, API), can-parallel, blockers        |
| "TBD" in acceptance criteria       | Common      | Replace with actual decision or mark as open question for refinement meeting                     |
| Too large (>13 SP)                 | Occasional  | Run `/story` with SPIDR splitting to break into smaller PBIs                                     |

---

## 4. DoR Gate Output Template

```markdown
## DoR Gate Result

**PBI:** {PBI filename}
**Status:** PASS | WARN | FAIL
**Date:** {YYYY-MM-DD}
**Checked by:** {Dev BA PIC name or "AI"}

### Checklist Results

| #   | Criterion                   | Status    | Evidence / Issue                  |
| --- | --------------------------- | --------- | --------------------------------- |
| 1   | User story template         | ✅/❌     | {line reference or issue}         |
| 2   | AC testable and unambiguous | ✅/❌     | {line reference or issue}         |
| 3   | Wireframes/mockups          | ✅/❌/N/A | {link or "backend-only"}          |
| 4   | UI design ready             | ✅/❌/N/A | {link or "backend-only"}          |
| 5   | AI pre-review passed        | ✅/❌     | {/refine-review result reference} |
| 6   | Story points estimated      | ✅/❌     | {value: X SP, complexity: Y}      |
| 7   | Dependencies complete       | ✅/❌     | {count: N dependencies listed}    |

### Blocking Items (if FAIL)

1. {What's missing + specific fix instruction}

### Verdict

**{READY_FOR_GROOMING | FIX_REQUIRED}**

**Next step:** {If PASS: proceed to grooming | If FAIL: list who needs to fix what}
```

---

## Cross-Reference

- **Consumed by:** `/dor-gate`, `/pbi-challenge`, `/refine-review`, `ba-refinement-context.cjs` hook
- **Source:** BA team working process documentation (DoR section)
- **Related:** `ba-team-decision-model-protocol.md` (team decision rules), `cross-cutting-quality-concerns-protocol.md` (authorization, seed data)
