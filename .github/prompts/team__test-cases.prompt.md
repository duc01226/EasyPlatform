---
description: Generate detailed executable test cases from specifications
argument-hint: [test-spec-file or feature-scope]
---

# Test Case Generation

Create detailed, executable test cases from test specifications or feature requirements.

**Input**: $ARGUMENTS

## Pre-Workflow

### Activate Skills

- Activate `test-cases` skill for test case design and coverage analysis
- Activate `qa-engineer` skill for test methodology best practices

## Workflow

### 1. Load Specification

- Read test spec file or PBI/story with acceptance criteria
- Extract test scenarios and coverage requirements
- Identify test data needs

### 2. Generate Test Cases

- Create TC-{ID} for each scenario
- Include: preconditions, steps, expected results, test data
- Cover: happy path, boundary values, negative cases, edge cases
- Map each test case to acceptance criteria

### 3. Define Test Data

- Specify required test data sets
- Include valid, invalid, and boundary values
- Note environment or configuration requirements

### 4. Review Coverage

- Verify all acceptance criteria have test cases
- Check for gaps in negative and edge case coverage
- Cross-reference with existing test specs

### 5. Save Test Cases

- Save to `team-artifacts/test-cases/` with date prefix
- Link back to source specification

## Output

Executable test cases with TC-IDs, detailed steps, expected results, and coverage matrix.

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break many small todo tasks
- Always add a final review todo task to review the works done at the end to find any fix or enhancement needed
