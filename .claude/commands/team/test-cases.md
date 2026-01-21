---
name: test-cases
description: Generate detailed test cases from test specification
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, TodoWrite
arguments:
  - name: testspec-file
    description: Path to test spec file or TS-ID
    required: true
---

# Generate Detailed Test Cases

Expand test specification into executable test cases.

## Pre-Workflow

### Activate Skills

- Activate `qa-engineer` skill for test case design and coverage analysis

## Workflow

1. **Load Test Spec**
   - Read test specification
   - Extract test scenarios

2. **Generate Test Cases**
   For each scenario:
   ```markdown
   #### TC-{MOD}-{NNN}: {Title}
   - **Priority:** P1 | P2 | P3
   - **Type:** Positive | Negative | Boundary
   - **Preconditions:** {Setup}
   - **Test Data:** {Requirements}

   **Steps:**
   1. {Action}
   2. {Action}
   3. {Verify}

   **Expected Result:**
   - {Outcome}

   **Evidence:** `{file}:{line}`
   ```

3. **Verify Evidence**
   - Read each evidence file
   - Confirm line numbers correct
   - Update if needed

4. **Update Test Spec**
   - Add generated test cases
   - Update test summary counts

5. **Suggest Next Step**
   - "/quality-gate {testspec}" - Run QC review

## Example

```bash
/test-cases team-artifacts/test-specs/260119-testspec-dark-mode-toggle.md
```

Updates test spec with detailed cases.

## Task Planning Notes

- Always plan and break many small todo tasks
- Always add a final review todo task to review the works done at the end to find any fix or enhancement needed
