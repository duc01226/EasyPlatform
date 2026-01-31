# Quality Checklists & Metrics Reference

Comprehensive checklists, compliance verification, and metrics templates for quality gates.

---

## Quality Gates (4 Stage Gates)

### Gate: Idea -> PBI
- [ ] Problem statement present
- [ ] Business value articulated
- [ ] No technical solution prescribed
- [ ] Target users identified

### Gate: PBI -> Development
- [ ] Acceptance criteria in GIVEN/WHEN/THEN
- [ ] Out of scope defined
- [ ] Dependencies identified
- [ ] Design approved (if applicable)

### Gate: Development -> QA
- [ ] Code review approved
- [ ] Unit tests >80% coverage
- [ ] No P1/P2 linting errors
- [ ] Documentation updated

### Gate: QA -> Release
- [ ] All test cases executed
- [ ] No open P1/P2 bugs
- [ ] Regression suite passed
- [ ] PO sign-off received

---

## Compliance Verification

### Architecture Compliance
- Code follows Clean Architecture layers
- No direct cross-service dependencies
- Uses platform framework components
- Uses message bus for cross-service communication

### Security Compliance
- Proper authorization checks
- Input validation present
- No secrets in code

### Accessibility Compliance
- WCAG 2.1 AA standards met
- Screen reader compatible
- Keyboard navigable

### Performance Compliance
- Response time benchmarks met
- Memory usage within limits
- No N+1 query issues

---

## Pre-Development Checklist

```markdown
## Quality Gate: PBI Ready for Development

**PBI:** {PBI-ID}
**Reviewer:** {Name}
**Date:** {Date}

### Requirements
- [ ] Clear problem statement
- [ ] User value articulated
- [ ] Acceptance criteria in GIVEN/WHEN/THEN format
- [ ] Out of scope explicitly listed

### Design
- [ ] Design spec approved (if UI changes)
- [ ] API contract defined (if backend changes)
- [ ] Database changes documented (if applicable)

### Dependencies
- [ ] Upstream dependencies identified
- [ ] No blocking dependencies
- [ ] Integration points documented

### Gate Status: PASS / FAIL / CONDITIONAL

**Notes:**
{Any concerns or conditions}
```

---

## Pre-Release Checklist

```markdown
## Quality Gate: Ready for Release

**Feature:** {Feature name}
**Release:** {Version}
**Date:** {Date}

### Testing
- [ ] All test cases executed
- [ ] Pass rate: ____%
- [ ] No open P1 bugs
- [ ] No open P2 bugs (or exceptions approved)

### Code Quality
- [ ] Code review approved
- [ ] Coverage > 80%
- [ ] No security vulnerabilities
- [ ] Performance benchmarks met

### Documentation
- [ ] User documentation updated
- [ ] API documentation current
- [ ] Release notes drafted

### Sign-Offs
- [ ] QA Lead: _____________ Date: _______
- [ ] Dev Lead: _____________ Date: _______
- [ ] PO: __________________ Date: _______

### Gate Status: PASS / FAIL

**Release Decision:**
{Go / No-Go with notes}
```

---

## Audit Trail Format

```
{Artifact} | {Action} | {By} | {Date} | {Notes}
```

---

## Quality Metrics

### Code Quality Metrics
| Metric | Target | Description |
|--------|--------|-------------|
| Cyclomatic complexity | <15 | Method complexity |
| Code coverage | >80% | Test coverage percentage |
| Technical debt ratio | <10% | Debt to total effort |
| Duplication | <5% | Code duplication percentage |

### Process Quality Metrics
| Metric | Target | Description |
|--------|--------|-------------|
| Defect escape rate | <5% | Bugs found in production |
| First-time-right | >90% | Pass on first review |
| Cycle time | varies | Dev start to deploy |
| Lead time | varies | Request to delivery |

---

## Metrics Dashboard Template

```markdown
## Quality Metrics - Sprint {N}

### Code Quality
| Metric | Target | Actual | Trend |
|--------|--------|--------|-------|
| Coverage | >80% | | ^v-> |
| Complexity | <15 | | |
| Duplication | <5% | | |
| Debt Ratio | <10% | | |

### Process Quality
| Metric | Target | Actual |
|--------|--------|--------|
| Defect Escape | <5% | |
| First-Time-Right | >90% | |
| Avg Review Cycles | <2 | |

### Defect Trends
| Sprint | Found | Fixed | Escaped |
|--------|-------|-------|---------|
| N-2 | | | |
| N-1 | | | |
| N | | | |
```

---

## Output Naming Conventions

```
{YYMMDD}-qc-gate-{stage}-{slug}.md
{YYMMDD}-qc-audit-{feature}.md
{YYMMDD}-qc-metrics-sprint-{n}.md
```
