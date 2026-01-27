---
description: Run quality gate checklists for development stage transitions
argument-hint: [gate: idea-to-pbi|pbi-to-dev|dev-to-qa|qa-to-release]
---

# Quality Gate

Verify artifacts meet quality criteria at development stage transitions.

**Gate**: $ARGUMENTS

## Pre-Workflow

### Activate Skills

- Activate `quality-gate` skill for stage gate checklists and compliance verification

## Workflow

### 1. Identify Gate

- **idea-to-pbi** - Idea ready for refinement
- **pbi-to-dev** - PBI ready for development
- **dev-to-qa** - Code ready for QA handoff
- **qa-to-release** - Feature ready for release

### 2. Run Checklist

- Load gate-specific criteria (architecture, security, accessibility, performance)
- Verify each criterion against artifacts and codebase
- Mark pass/fail/not-applicable for each item

### 3. Compliance Verification

- Check architecture alignment with platform patterns
- Verify security requirements met
- Validate accessibility compliance (WCAG 2.1 AA)
- Review performance considerations

### 4. Generate Report

- Summary: pass/fail counts
- Blocking items that must be resolved
- Advisory items for improvement
- Audit trail with timestamps

## Output

Quality gate report with pass/fail checklist, blocking items, and compliance status.

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break many small todo tasks
- Always add a final review todo task to review the works done at the end to find any fix or enhancement needed
