---
description: Break a PBI into user stories with vertical slicing and GIVEN/WHEN/THEN acceptance criteria
argument-hint: [pbi-file or PBI-ID]
---

# Break PBI into User Stories

Create implementable user stories from a Product Backlog Item using vertical slicing and SPIDR patterns.

**PBI**: $ARGUMENTS

## Pre-Workflow

### Activate Skills

- Activate `story` skill for vertical slicing, SPIDR splitting, and INVEST criteria

## Workflow

### 1. Load PBI

- Read PBI file from path or find by ID in `team-artifacts/pbis/`
- Extract acceptance criteria, scope, and dependencies

### 2. Identify Vertical Slices

- Break feature into end-to-end slices (UI + API + DB per story)
- Apply SPIDR splitting patterns (Spike, Paths, Interfaces, Data, Rules)
- Ensure each story delivers user-visible value

### 3. Write Stories

- Format: "As a [role], I want [action], so that [benefit]"
- Add GIVEN/WHEN/THEN acceptance criteria per story
- Include happy path, edge cases, and error scenarios
- Verify each story passes INVEST criteria

### 4. Save Artifacts

- Save stories to `team-artifacts/stories/`
- Link back to source PBI
- Update PBI status

### 5. Suggest Next Steps

- "/team__test-spec {story-file}" - Create test specification
- "/team__design-spec {story-file}" - Create design specification

## Output

Story files in `team-artifacts/stories/` with GIVEN/WHEN/THEN acceptance criteria and INVEST validation.

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break many small todo tasks
- Always add a final review todo task to review the works done at the end to find any fix or enhancement needed
