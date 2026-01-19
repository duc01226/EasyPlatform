---
name: test-cases
description: Generate detailed executable test cases from specifications. Use when creating detailed test cases, expanding test specs, or generating TC-IDs. Triggers on keywords like "test cases", "generate tests", "detailed tests", "TC-", "executable tests".
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Test Case Generation

Create detailed, executable test cases from specifications.

## When to Use
- Test spec ready for expansion
- Need detailed test steps
- Generating test case IDs

## Quick Reference

### Workflow
1. Read test specification
2. Generate detailed test cases per scenario
3. Assign TC IDs (TC-{MOD}-{NNN})
4. Find code evidence for each case
5. Update test spec with cases
6. Suggest next: `/quality-gate`

### Test Case Format
```markdown
#### TC-{MOD}-{NNN}: {Title}
- **Priority:** P1 | P2 | P3
- **Type:** Positive | Negative | Boundary

**Preconditions:** {Setup}
**Test Data:** {Requirements}

**Steps:**
1. {Action}
2. {Verification}

**Expected:** {Outcome}
**Evidence:** `{file}:{line}`
```

### Module Codes
| Module | Code |
|--------|------|
| bravoTALENTS | TAL |
| bravoGROWTH | GRO |
| bravoSURVEYS | SUR |
| Common | COM |

### Evidence Requirements
**MANDATORY:** Every TC must have evidence.
- Format: `{FilePath}:{LineNumber}`
- Sources: ErrorMessages, validators, handlers

### Related
- **Role Skill:** `qa-engineer`
- **Command:** `/test-cases`
- **Input:** `/test-spec` output
- **Next Step:** `/quality-gate`
