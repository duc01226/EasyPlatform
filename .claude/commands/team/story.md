---
name: story
description: Create user stories from a PBI with GIVEN/WHEN/THEN acceptance criteria
allowed-tools: Read, Write, Edit, Grep, Glob, TodoWrite
arguments:
  - name: pbi-file
    description: Path to PBI file or PBI-ID
    required: true
---

# Create User Stories

Break down a PBI into vertical user stories with acceptance criteria.

## Pre-Workflow

### Activate Skills

- Activate `business-analyst` skill for user story slicing and INVEST criteria

## Workflow

1. **Load PBI**
   - Read PBI file
   - Extract scope, acceptance criteria, dependencies

2. **Identify User Personas**
   - Who interacts with this feature?
   - What are their goals?

3. **Slice Vertically**
   - Each story delivers end-to-end value
   - Stories are independent when possible
   - Apply INVEST criteria

4. **Write Stories**
   For each slice:
   ```
   As a {persona}
   I want {goal}
   So that {benefit}
   ```

5. **Generate Acceptance Criteria**
   For each story, create scenarios:
   ```gherkin
   Scenario: {Title}
     Given {precondition}
     When {action}
     Then {outcome}
   ```

6. **Estimate Effort**
   - Use Fibonacci: 1, 2, 3, 5, 8, 13
   - Stories >8 should be split

7. **Save Stories**
   - Create separate file per story OR
   - Append to PBI with story sections
   - Path: `team-artifacts/pbis/stories/`

8. **Suggest Next Steps**
   - "/test-spec {pbi}" for QA
   - "/design-spec {pbi}" for Designer

## Example

```bash
/story team-artifacts/pbis/260119-pbi-dark-mode-toggle.md
```

Creates: `team-artifacts/pbis/stories/260119-us-dark-mode-*.md`
