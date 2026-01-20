---
name: test-spec
description: Generate test specification from PBI acceptance criteria
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, TodoWrite
arguments:
  - name: pbi-file
    description: Path to PBI file or PBI-ID
    required: true
---

# Generate Test Specification

Create comprehensive test specification from PBI.

## Pre-Workflow

### Activate Skills

- Activate `qa-engineer` skill for test specification best practices

## Workflow

1. **Load PBI**
   - Read PBI file
   - Extract acceptance criteria
   - Identify test scope

2. **Define Test Strategy**
   - Unit tests: What components?
   - Integration tests: What flows?
   - E2E tests: What scenarios?

3. **Identify Test Scenarios**
   From each AC, derive:
   - Positive tests (happy path)
   - Negative tests (invalid inputs)
   - Boundary tests (limits)
   - Edge cases (unusual states)

4. **Find Code Evidence**
   - Search for validation logic
   - Find error messages
   - Locate entity constraints
   - Map to `{file}:{line}`

5. **Generate Test Spec**
   - Use template from `team-artifacts/templates/test-spec-template.md`
   - Assign TC IDs: `TC-{MOD}-{NNN}` (module-based, not date-based like other artifacts)
     - Rationale: Test cases are tied to modules/services, enabling easier filtering and traceability
   - Include evidence for each case

6. **Save Artifact**
   - Path: `team-artifacts/test-specs/{YYMMDD}-testspec-{feature}.md`

7. **Suggest Next Step**
   - "/test-cases {testspec}" - Generate detailed test cases

## Module Code Mapping

| Service | Code |
|---------|------|
| TextSnippet | TXT |
| ExampleApp | EXP |
| Accounts | ACC |
| Common | COM |

## Example

```bash
/test-spec team-artifacts/pbis/260119-pbi-dark-mode-toggle.md
```

Creates: `team-artifacts/test-specs/260119-testspec-dark-mode-toggle.md`
