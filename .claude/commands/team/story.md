---
name: story
description: Create user stories from a PBI with SPIDR splitting and GIVEN/WHEN/THEN acceptance criteria
allowed-tools: Read, Write, Edit, Grep, Glob, TodoWrite
arguments:
  - name: pbi-file
    description: Path to PBI file or PBI-ID
    required: true
---

# Create User Stories

Break down a PBI into vertical user stories with acceptance criteria using SPIDR splitting patterns.

---

## Workflow

### 1. Load PBI

- Read PBI file
- Extract scope, acceptance criteria, dependencies
- Check `module` field for domain context

### 2. Activate Skills

- Activate `story` skill
- Activate `business-analyst` skill (for domain context)

### 3. Load Domain Context (if BravoSUITE)

If module detected:
1. Load `docs/business-features/{module}/README.md`
2. Extract related feature documentation
3. Note existing business rules (BR-{MOD}-XXX)
4. Use correct domain vocabulary

### 4. Identify User Personas

- Who interacts with this feature?
- What are their goals?
- Be specific (not "user" → "hiring manager")

### 5. Slice Vertically

- Each story delivers end-to-end value
- Stories are independent when possible
- Apply INVEST criteria

### 6. Apply SPIDR Splitting

**If story effort >8, MUST split. If >5, SHOULD split.**

| Pattern | Check | Action |
|---------|-------|--------|
| **S**pike | Unknown complexity? | Create research spike first |
| **P**aths | Multiple workflow branches? | One story per path |
| **I**nterfaces | Multiple UIs/APIs? | One story per interface |
| **D**ata | Multiple data formats? | One story per format |
| **R**ules | Multiple business rules? | One story per rule |

**Repeat until all stories ≤8 effort (prefer ≤5).**

### 7. Write Stories

For each slice:
```
As a {persona}
I want {goal}
So that {benefit}
```

### 8. Generate Acceptance Criteria

**Minimum 3 scenarios per story:**

**A. Happy Path (Positive):**
```gherkin
Scenario: Successfully {action}
  Given {valid user state/permissions}
  And {required data exists}
  When {valid user action}
  Then {expected outcome}
```

**B. Edge Case (Boundary):**
```gherkin
Scenario: Handle {boundary condition}
  Given {edge state: empty/max/zero}
  When {action at boundary}
  Then {appropriate handling}
```

**C. Error Case (Negative):**
```gherkin
Scenario: Reject {invalid action}
  Given {precondition}
  When {invalid input/unauthorized action}
  Then error "{specific message}"
  And {system state unchanged}
```

### 9. Estimate Effort

- Use Fibonacci: 1, 2, 3, 5, 8
- Stories >8 MUST be split (return to step 6)
- Stories >5 should consider splitting

### 10. Save Stories

**Single file with all stories:**
- Path: `team-artifacts/pbis/stories/{YYMMDD}-us-{pbi-slug}.md`
- Use `## Story N:` headers for each story
- Include all sections: Out of Scope, Dependencies, Domain Context

### 11. Suggest Next Steps

- `/test-spec {stories-file}` - Generate test specification
- `/design-spec {stories-file}` - Create UI/UX specification
- `/prioritize` - Order backlog items

### 12. Validation Interview (MANDATORY)

**Always perform this step after creating stories.**

Use `AskUserQuestion` with 2-4 questions:

| Category | Example Question |
|----------|------------------|
| **Slicing** | "Are the story slices independent enough?" |
| **Scenarios** | "Any acceptance criteria missing for edge cases?" |
| **Size** | "Should any story >8 be split further?" |
| **Dependencies** | "Are there hidden dependencies between stories?" |

Document validation in story file:
```markdown
## Validation Summary
**Validated:** {date}
### Confirmed
- {decision}: {user choice}
### Action Items
- [ ] {follow-up if any}
```

**This step is NOT optional.**

---

## Quick Validation Checklist

Before finishing, verify:

- [ ] Each story independent (can develop in any order)
- [ ] Each story valuable (delivers user benefit)
- [ ] Each story testable (clear pass/fail criteria)
- [ ] Each story small (effort ≤8, prefer ≤5)
- [ ] Minimum 3 scenarios per story (happy, edge, error)
- [ ] All scenarios use GIVEN/WHEN/THEN
- [ ] Parent PBI linked in frontmatter
- [ ] Out of scope listed
- [ ] Dependencies identified
- [ ] Domain vocabulary correct (if BravoSUITE)

---

## Example

```bash
/story team-artifacts/pbis/260119-pbi-dark-mode-toggle.md
```

Creates: `team-artifacts/pbis/stories/260119-us-dark-mode-toggle.md`

---

## Related Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/refine` | PBI from idea | Before `/story` |
| `/test-spec` | Test specification | After `/story` |
| `/design-spec` | UI/UX specification | After `/story` |
| `/prioritize` | Order backlog | After stories created |
| `/dependency` | Map blockers | If dependencies found |
| `/quality-gate` | QC review | Before sprint planning |

---

## Anti-Patterns to Avoid

| Anti-Pattern | Instead |
|--------------|---------|
| Horizontal slicing ("backend story") | Vertical slice with end-to-end value |
| Single scenario only | Minimum 3: happy, edge, error |
| Effort >8 without splitting | Apply SPIDR, split until ≤8 |
| Vague "fast" or "easy" | Quantify: "< 200ms", "≤ 3 clicks" |
| Generic "As a user" | Specific persona: "As a hiring manager" |

---

> **Task Management Protocol:**
> - Always plan and break work into many small todo tasks
> - Always add a final review todo task to verify work quality and identify fixes/enhancements
