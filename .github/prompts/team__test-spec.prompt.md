---
description: Generate test specifications from PBI acceptance criteria and requirements
argument-hint: [pbi-file or story-file]
---

# Test Specification

Generate comprehensive test specifications from PBI or story requirements.

**Input**: $ARGUMENTS

## Pre-Workflow

### Activate Skills

- Activate `test-spec` skill for test strategy and coverage planning
- Activate `qa-engineer` skill for QA methodology

## Workflow

### 1. Load Requirements

- Read PBI or story file for acceptance criteria
- Extract functional and non-functional requirements
- Identify related features and regression areas

### 2. Define Test Strategy

- Scope: what is in/out of testing
- Test levels: unit, integration, e2e, manual
- Risk-based prioritization of test areas
- Environment and data requirements

### 3. Create Test Scenarios

- Map each acceptance criterion to test scenarios
- Include GIVEN/WHEN/THEN format
- Group by feature area or user flow
- Assign priority (P1-critical, P2-high, P3-medium)

### 4. Identify Coverage Gaps

- Cross-reference with existing test specs in `docs/test-specs/`
- Note areas needing new or updated tests
- Flag regression risks

### 5. Save Specification

- Save to `team-artifacts/test-specs/` with date prefix
- Link to source PBI/story

### 6. Suggest Next Steps

- "/team__test-cases {test-spec-file}" - Generate detailed test cases

## Output

Test specification with strategy, prioritized scenarios, coverage matrix, and gap analysis.

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break many small todo tasks
- Always add a final review todo task to review the works done at the end to find any fix or enhancement needed
