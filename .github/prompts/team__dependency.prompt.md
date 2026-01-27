---
description: Map and visualize feature dependencies to identify blockers and critical path
argument-hint: [feature-scope or PBI-ID]
---

# Dependency Mapping

Map and visualize dependencies between features, PBIs, and work items.

**Scope**: $ARGUMENTS

## Pre-Workflow

### Activate Skills

- Activate `dependency` skill for dependency analysis and visualization

## Workflow

### 1. Identify Work Items

- Scan `team-artifacts/pbis/` and `team-artifacts/stories/` for items in scope
- Extract explicit dependencies from frontmatter and descriptions

### 2. Analyze Dependencies

- Map upstream dependencies (what must be done first)
- Map downstream dependents (what this unblocks)
- Identify cross-service and cross-team dependencies
- Search codebase for technical dependencies

### 3. Identify Critical Path

- Find longest dependency chain
- Highlight blockers and bottlenecks
- Flag circular dependencies

### 4. Generate Visualization

- Create Mermaid dependency graph
- Mark critical path items
- Annotate blockers with risk level

### 5. Save Output

- Save dependency map to `team-artifacts/analysis/`

## Output

Mermaid dependency graph with critical path analysis and blocker identification.

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break many small todo tasks
- Always add a final review todo task to review the works done at the end to find any fix or enhancement needed
