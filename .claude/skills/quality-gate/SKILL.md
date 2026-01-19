---
name: quality-gate
description: Run quality gate checklists for development stages. Use when running pre-dev, pre-qa, or pre-release checks. Triggers on keywords like "quality gate", "qa gate", "pre-release", "checklist", "gate check".
allowed-tools: Read, Write, Grep, Glob, Bash, TodoWrite
---

# Quality Gate

Verify artifacts meet quality criteria at development stages.

## When to Use
- Before starting development (pre-dev)
- Before QA handoff (pre-qa)
- Before release (pre-release)

## Quick Reference

### Gate Types

#### Pre-Development
- [ ] Problem statement clear
- [ ] Acceptance criteria in GIVEN/WHEN/THEN
- [ ] Out of scope defined
- [ ] Dependencies identified
- [ ] Design approved (if UI)

#### Pre-QA
- [ ] Code review approved
- [ ] Unit tests >80% coverage
- [ ] No P1 linting errors
- [ ] Documentation updated

#### Pre-Release
- [ ] All test cases executed
- [ ] No open P1/P2 bugs
- [ ] Regression suite passed
- [ ] PO sign-off received

### Workflow
1. Identify gate type (from target arg)
2. Load appropriate checklist
3. Verify each criterion
4. Generate report
5. Save to `team-artifacts/qc-reports/`

### Output
- **Path:** `team-artifacts/qc-reports/{YYMMDD}-gate-{type}-{slug}.md`
- **Status:** PASS | FAIL | CONDITIONAL

### Related
- **Role Skill:** `qc-specialist`
- **Command:** `/quality-gate`
