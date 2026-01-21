---
name: quality-gate
description: Run quality gate checklist for artifact or PR
allowed-tools: Read, Write, Grep, Glob, Bash, TodoWrite
arguments:
  - name: target
    description: Artifact path, PR number, or gate type (pre-dev, pre-qa, pre-release)
    required: true
---

# Run Quality Gate

Verify artifact or code meets quality criteria.

## Pre-Workflow

### Activate Skills

- Activate `qc-specialist` skill for quality checklist validation

## Workflow

1. **Identify Gate Type**
   - From artifact type or explicit argument
   - Gates: `pre-dev`, `pre-qa`, `pre-release`

2. **Load Checklist**

   **Pre-Development Gate:**
   - [ ] Problem statement clear
   - [ ] Acceptance criteria in GIVEN/WHEN/THEN
   - [ ] Out of scope defined
   - [ ] Dependencies identified
   - [ ] Design approved (if UI changes)

   **Pre-QA Gate:**
   - [ ] Code review approved
   - [ ] Unit tests >80% coverage
   - [ ] No P1 linting errors
   - [ ] Documentation updated

   **Pre-Release Gate:**
   - [ ] All test cases executed
   - [ ] No open P1/P2 bugs
   - [ ] Regression suite passed
   - [ ] PO sign-off received

3. **Verify Each Criterion**
   - Check artifact/code
   - Note pass/fail/conditional

4. **Generate Report**
   ```markdown
   ## Quality Gate: {Type}

   **Target:** {artifact/PR}
   **Date:** {date}

   ### Results
   | Criterion | Status | Notes |
   |-----------|--------|-------|
   | {item} | ✅/❌/⚠️ | {note} |

   ### Gate Status: PASS / FAIL / CONDITIONAL

   **Conditions (if any):**
   - {condition}
   ```

5. **Save Report** (optional)
   - Path: `team-artifacts/qc-reports/{YYMMDD}-gate-{type}-{slug}.md`

## Example

```bash
/quality-gate pre-dev team-artifacts/pbis/260119-pbi-dark-mode-toggle.md
/quality-gate pre-release PR#123
```

## Task Planning Notes

- Always plan and break many small todo tasks
- Always add a final review todo task to review the works done at the end to find any fix or enhancement needed
