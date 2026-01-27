---
description: Generate sprint or project status report with metrics and progress tracking
argument-hint: [sprint-name or project-scope]
---

# Status Report

Generate a project or sprint status report with progress metrics.

**Scope**: $ARGUMENTS

## Pre-Workflow

### Activate Skills

- Activate `status` skill for status reporting and metrics analysis
- Activate `project-manager` skill for progress tracking

## Workflow

### 1. Gather Data

- Scan `team-artifacts/` for PBIs, stories, and their statuses
- Check git log for recent commits and activity
- Review open issues and blockers

### 2. Calculate Metrics

- Items completed vs planned
- Velocity and burndown indicators
- Blocker count and aging

### 3. Generate Report

- Executive summary (1-2 sentences)
- Progress by category (features, bugs, tech debt)
- Blockers and risks with mitigation
- Next sprint priorities

### 4. Save Report

- Save to `team-artifacts/reports/` with date prefix

## Output

Status report with metrics summary, progress breakdown, and risk assessment.

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break many small todo tasks
- Always add a final review todo task to review the works done at the end to find any fix or enhancement needed
