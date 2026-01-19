# QC Specialist Guide

> **Complete guide for QC Specialists using Claude Code to enforce quality gates, verify compliance, and ensure release readiness.**

---

## Quick Start

```bash
# Run quality gate before development
/quality-gate pre-dev team-artifacts/pbis/260119-ba-pbi-biometric-auth.md

# Run quality gate before QA testing
/quality-gate pre-qa PBI-260119-001

# Run quality gate before release
/quality-gate pre-release v2.1.0
```

**Output Location:** `team-artifacts/quality-reports/`
**Naming Pattern:** `{YYMMDD}-qc-{gate-type}-{slug}.md`

---

## Your Role in the Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    QUALITY WORKFLOW                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   BA ──> PBI ──> [YOU] ──pre-dev──> Dev ──> QA              │
│                    │                          │              │
│                    └────────pre-qa────────────┘              │
│                              │                               │
│                         pre-release ──> Release              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Your Responsibilities

| Task | Command | Output |
|------|---------|--------|
| Pre-dev quality gate | `/quality-gate pre-dev` | Requirements readiness report |
| Pre-QA quality gate | `/quality-gate pre-qa` | Test readiness report |
| Pre-release quality gate | `/quality-gate pre-release` | Release readiness report |
| Compliance verification | Manual | Audit trail documentation |
| Metrics collection | Manual | Quality metrics dashboard |

---

## Commands

### `/quality-gate` - Execute Quality Gates

**Purpose:** Verify that work items meet quality criteria at each workflow checkpoint.

#### Gate Types

| Gate | When | What It Checks |
|------|------|----------------|
| `pre-dev` | Before development starts | Requirements completeness, AC clarity |
| `pre-qa` | Before QA testing | Code quality, unit tests, documentation |
| `pre-release` | Before production release | All tests pass, security review, sign-offs |

#### Basic Usage

```bash
# Pre-development gate (requirements review)
/quality-gate pre-dev team-artifacts/pbis/260119-ba-pbi-biometric-auth.md

# Pre-QA gate (code review)
/quality-gate pre-qa PBI-260119-001

# Pre-release gate (release readiness)
/quality-gate pre-release v2.1.0 --scope "biometric-auth,dark-mode"

# With specific checklist
/quality-gate pre-qa PBI-260119-001 --checklist security
```

---

## Gate Specifications

### Pre-Development Gate

**Purpose:** Ensure requirements are complete and clear before development begins.

#### Checklist

```markdown
## Pre-Development Quality Gate

**PBI:** {PBI-ID}
**Date:** {YYYY-MM-DD}
**Reviewer:** QC Specialist

### Requirements Completeness
- [ ] Problem statement is clear and user-focused
- [ ] All user stories follow INVEST criteria
- [ ] Acceptance criteria are in GIVEN/WHEN/THEN format
- [ ] Each AC has measurable outcomes
- [ ] Edge cases are documented
- [ ] Error scenarios are covered

### Technical Readiness
- [ ] Technical notes are provided
- [ ] Dependencies are identified
- [ ] API contracts are defined (if applicable)
- [ ] Data model changes are documented
- [ ] Security considerations are noted

### Design Readiness
- [ ] UI mockups are available (if UI feature)
- [ ] Design tokens are specified
- [ ] Accessibility requirements are documented
- [ ] Responsive breakpoints are defined

### Estimation Readiness
- [ ] Effort estimate is provided
- [ ] Priority is assigned (numeric)
- [ ] Sprint assignment is suggested

### Gate Decision
- [ ] **PASS** - Ready for development
- [ ] **PASS WITH CONDITIONS** - Minor issues to address
- [ ] **FAIL** - Major issues, return to BA

### Notes
{Any additional comments or conditions}
```

#### Example Output

```markdown
## Pre-Development Quality Gate Report

**PBI:** PBI-260119-001 (Biometric Authentication)
**Date:** 2026-01-19
**Reviewer:** QC Specialist
**Status:** ✅ PASS WITH CONDITIONS

### Summary
| Category | Score | Status |
|----------|-------|--------|
| Requirements | 9/10 | ✅ |
| Technical | 8/10 | ✅ |
| Design | 7/10 | ⚠️ |
| Estimation | 10/10 | ✅ |
| **Overall** | **34/40** | **PASS** |

### Findings

#### ✅ Passed
- AC-001 through AC-005 are well-defined with GIVEN/WHEN/THEN
- Technical notes include API contracts
- Dependencies are clearly listed
- Effort estimate (13 points) is reasonable

#### ⚠️ Conditions
1. **AC-003** - Add timeout scenario for Face ID
   - Current: "WHEN Face ID fails THEN show password prompt"
   - Suggested: Add "WHEN Face ID times out after 30 seconds THEN..."

2. **Design** - Missing accessibility notes
   - Add: VoiceOver support for Face ID prompt
   - Add: Haptic feedback on success/failure

#### ❌ Blockers
None

### Gate Decision: PASS WITH CONDITIONS

**Conditions to address before sprint start:**
1. Add timeout scenario to AC-003
2. Add accessibility section to design notes

**Estimated remediation time:** 1 hour
```

---

### Pre-QA Gate

**Purpose:** Ensure code is ready for testing with sufficient quality and documentation.

#### Checklist

```markdown
## Pre-QA Quality Gate

**PBI:** {PBI-ID}
**PR:** #{PR-number}
**Date:** {YYYY-MM-DD}
**Reviewer:** QC Specialist

### Code Quality
- [ ] Code review approved
- [ ] No critical/high SonarQube issues
- [ ] Cyclomatic complexity within limits (<10)
- [ ] Code coverage meets threshold (>80%)
- [ ] No TODO/FIXME in committed code

### Testing
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Test evidence documented (file:line format)
- [ ] Edge cases tested

### Documentation
- [ ] API documentation updated (if applicable)
- [ ] README updated (if applicable)
- [ ] CHANGELOG entry added
- [ ] Code comments for complex logic

### Security
- [ ] No secrets in code
- [ ] Input validation implemented
- [ ] Authorization checks in place
- [ ] OWASP top 10 considered

### Performance
- [ ] No N+1 queries
- [ ] Appropriate indexing
- [ ] Response time within SLA

### Gate Decision
- [ ] **PASS** - Ready for QA testing
- [ ] **PASS WITH CONDITIONS** - Minor issues
- [ ] **FAIL** - Return to development
```

#### Example Output

```markdown
## Pre-QA Quality Gate Report

**PBI:** PBI-260119-001 (Biometric Authentication)
**PR:** #1234
**Date:** 2026-01-19
**Reviewer:** QC Specialist
**Status:** ✅ PASS

### Metrics Summary

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Code Coverage | 87% | >80% | ✅ |
| Cyclomatic Complexity | 6 | <10 | ✅ |
| SonarQube Issues | 2 minor | 0 critical/high | ✅ |
| Unit Tests | 45 pass | All pass | ✅ |
| Integration Tests | 12 pass | All pass | ✅ |

### Code Evidence

| Component | File | Coverage |
|-----------|------|----------|
| BiometricService | `src/auth/biometric.service.ts:1-156` | 92% |
| BiometricController | `src/auth/biometric.controller.ts:1-78` | 85% |
| BiometricRepository | `src/auth/biometric.repository.ts:1-45` | 88% |

### Test Evidence

| Test Type | File | Tests | Pass |
|-----------|------|-------|------|
| Unit | `spec/biometric.service.spec.ts` | 28 | 28 |
| Unit | `spec/biometric.controller.spec.ts` | 17 | 17 |
| Integration | `e2e/biometric.e2e.spec.ts` | 12 | 12 |

### Security Review

| Check | Status | Notes |
|-------|--------|-------|
| Secrets scan | ✅ | No secrets detected |
| Input validation | ✅ | All inputs validated |
| Authorization | ✅ | Role checks implemented |
| SQL injection | ✅ | Parameterized queries |
| XSS | ✅ | Output encoding |

### Gate Decision: PASS

Ready for QA testing. No conditions or blockers.
```

---

### Pre-Release Gate

**Purpose:** Final verification before production deployment.

#### Checklist

```markdown
## Pre-Release Quality Gate

**Release:** v{X.Y.Z}
**Features:** {list of PBIs}
**Date:** {YYYY-MM-DD}
**Reviewer:** QC Specialist

### Testing Completion
- [ ] All test specs executed
- [ ] All test cases passed (or known issues documented)
- [ ] Regression tests passed
- [ ] Performance tests passed
- [ ] Security scan completed

### Sign-offs
- [ ] QA Engineer sign-off
- [ ] Tech Lead sign-off
- [ ] Product Owner sign-off
- [ ] Security team sign-off (if security feature)

### Documentation
- [ ] Release notes prepared
- [ ] CHANGELOG updated
- [ ] API documentation current
- [ ] User documentation updated

### Deployment Readiness
- [ ] Database migrations tested
- [ ] Rollback plan documented
- [ ] Feature flags configured
- [ ] Monitoring alerts configured

### Compliance
- [ ] Audit trail complete
- [ ] Data handling compliant
- [ ] Accessibility verified (WCAG 2.1 AA)

### Gate Decision
- [ ] **GO** - Approved for release
- [ ] **GO WITH MONITORING** - Release with enhanced monitoring
- [ ] **NO-GO** - Release blocked
```

#### Example Output

```markdown
## Pre-Release Quality Gate Report

**Release:** v2.1.0
**Date:** 2026-01-19
**Features:** Biometric Auth, Dark Mode, Search Improvements
**Status:** ✅ GO

### Release Contents

| PBI | Feature | Status |
|-----|---------|--------|
| PBI-260119-001 | Biometric Authentication | ✅ Ready |
| PBI-260115-003 | Dark Mode Toggle | ✅ Ready |
| PBI-260110-007 | Search Improvements | ✅ Ready |

### Testing Summary

| Test Type | Total | Pass | Fail | Skip |
|-----------|-------|------|------|------|
| Unit | 234 | 234 | 0 | 0 |
| Integration | 67 | 67 | 0 | 0 |
| E2E | 45 | 44 | 0 | 1* |
| Performance | 12 | 12 | 0 | 0 |
| Security | 8 | 8 | 0 | 0 |

*Skipped: TC-SEARCH-045 (test environment limitation, manually verified)

### Sign-off Matrix

| Role | Name | Date | Status |
|------|------|------|--------|
| QA Engineer | Jane Doe | 2026-01-18 | ✅ Approved |
| Tech Lead | John Smith | 2026-01-18 | ✅ Approved |
| Product Owner | Alice Johnson | 2026-01-19 | ✅ Approved |
| Security | Bob Williams | 2026-01-19 | ✅ Approved |

### Deployment Checklist

| Item | Status | Notes |
|------|--------|-------|
| DB Migrations | ✅ | 3 migrations tested in staging |
| Rollback Plan | ✅ | Documented in deployment guide |
| Feature Flags | ✅ | biometric_auth=OFF by default |
| Monitoring | ✅ | Alerts configured in Datadog |

### Known Issues

| Issue | Severity | Mitigation |
|-------|----------|------------|
| None | - | - |

### Gate Decision: GO

**Recommendation:** Proceed with release to production.

**Deployment Window:** 2026-01-20 02:00 UTC (low traffic)

**Rollback Trigger:** Error rate >1% in first 30 minutes
```

---

## Quality Metrics

### Metrics to Track

| Metric | Description | Target | Formula |
|--------|-------------|--------|---------|
| Defect Escape Rate | Bugs found in production / Total bugs | <5% | (Prod bugs / Total bugs) × 100 |
| Test Coverage | Code covered by tests | >80% | (Lines tested / Total lines) × 100 |
| First Pass Rate | PBIs passing gate on first try | >70% | (First pass / Total reviews) × 100 |
| Gate Cycle Time | Time from submission to decision | <4h | End time - Start time |
| Rework Rate | Items requiring rework | <20% | (Rework items / Total items) × 100 |

### Metrics Collection Template

```markdown
## Quality Metrics - Sprint {N}

**Period:** {start-date} to {end-date}
**Collector:** QC Specialist

### Gate Metrics

| Gate Type | Reviews | Pass | Conditional | Fail | First Pass Rate |
|-----------|---------|------|-------------|------|-----------------|
| Pre-Dev | 12 | 8 | 3 | 1 | 67% |
| Pre-QA | 10 | 9 | 1 | 0 | 90% |
| Pre-Release | 1 | 1 | 0 | 0 | 100% |

### Quality Trends

| Metric | Last Sprint | This Sprint | Trend |
|--------|-------------|-------------|-------|
| Defect Escape Rate | 8% | 5% | ↓ Better |
| Test Coverage | 78% | 82% | ↑ Better |
| First Pass Rate | 65% | 73% | ↑ Better |
| Gate Cycle Time | 6h | 4h | ↓ Better |

### Common Issues

| Issue | Count | Remediation |
|-------|-------|-------------|
| Missing AC | 4 | BA training on GIVEN/WHEN/THEN |
| Low coverage | 3 | Code review checklist update |
| Missing evidence | 2 | QA template enforcement |

### Recommendations
1. Schedule BA training on acceptance criteria
2. Add coverage check to PR template
3. Automate evidence collection in test reports
```

---

## Compliance Verification

### Audit Trail Requirements

Every quality gate must maintain an audit trail:

```markdown
## Audit Trail - {Gate-ID}

**Gate Type:** pre-release
**Subject:** v2.1.0
**Timestamp:** 2026-01-19T14:30:00Z

### Review History

| Timestamp | Action | Actor | Details |
|-----------|--------|-------|---------|
| 2026-01-19T10:00:00Z | Gate initiated | System | Auto-triggered on PR merge |
| 2026-01-19T10:15:00Z | Review started | QC Specialist | Checklist opened |
| 2026-01-19T12:30:00Z | Issue found | QC Specialist | Missing test evidence |
| 2026-01-19T13:00:00Z | Issue resolved | QA Engineer | Evidence added |
| 2026-01-19T14:30:00Z | Gate passed | QC Specialist | All criteria met |

### Evidence Links
- Test Report: `team-artifacts/test-specs/260119-qa-testcases-biometric-auth.md`
- Code Review: PR #1234
- Security Scan: SonarQube Report #567
- Sign-offs: `team-artifacts/quality-reports/260119-qc-signoffs-v2.1.0.md`
```

### Compliance Standards

| Standard | Applicability | Verification Method |
|----------|---------------|---------------------|
| WCAG 2.1 AA | All UI features | Automated + Manual audit |
| OWASP Top 10 | All features | Security scan + Code review |
| GDPR | Data features | Privacy impact assessment |
| SOC 2 | All releases | Audit trail verification |

---

## Working with Other Roles

### ← From QA Engineer

**Receiving Test Reports:**
1. Check `team-artifacts/test-specs/` for completed test cases
2. Verify all test cases have results (Pass/Fail/Skip)
3. Check evidence is in correct format (`file:line`)
4. Validate coverage meets thresholds

**Quality Check:**
- [ ] All acceptance criteria have test cases
- [ ] Test evidence links are valid
- [ ] Edge cases are covered
- [ ] Actual results documented

### → To Development Team

**Pre-Dev Gate Feedback:**
```bash
# When gate fails, provide actionable feedback
# In report, include:
# - Specific issues found
# - Line-level references where applicable
# - Suggested fixes
# - Estimated remediation time
```

### → To Product Owner

**Release Readiness Report:**
```bash
# Provide release summary for PO approval
/quality-gate pre-release v2.1.0 --summary

# Include:
# - Feature completion status
# - Risk assessment
# - Known issues
# - Recommendation (GO/NO-GO)
```

---

## Real-World Examples

### Example 1: Failed Pre-Dev Gate

**Scenario:** PBI missing edge cases

```markdown
## Pre-Development Quality Gate Report

**PBI:** PBI-260119-002 (User Profile Avatar Upload)
**Status:** ❌ FAIL

### Findings

#### ❌ Blockers

1. **Missing Edge Cases**
   - No AC for maximum file size
   - No AC for unsupported file types
   - No AC for upload failure/retry

2. **Incomplete Error Scenarios**
   - AC-002 says "THEN show error" but doesn't specify:
     - Error message content
     - User recovery action
     - Whether partial progress is saved

3. **Missing Non-Functional Requirements**
   - No performance criteria (upload time limit)
   - No accessibility requirements (alt text, screen reader)

### Required Actions

| Action | Owner | Deadline |
|--------|-------|----------|
| Add file size AC (max 5MB) | BA | 2026-01-20 |
| Add file type AC (.jpg, .png, .gif) | BA | 2026-01-20 |
| Add error message specifications | BA | 2026-01-20 |
| Add performance criteria | BA | 2026-01-20 |

### Gate Decision: FAIL

**Reason:** Insufficient acceptance criteria coverage. Return to BA for refinement.

**Re-review scheduled:** 2026-01-21
```

### Example 2: Conditional Pre-QA Gate

**Scenario:** Code passes with minor documentation issues

```markdown
## Pre-QA Quality Gate Report

**PBI:** PBI-260115-003 (Dark Mode Toggle)
**PR:** #1198
**Status:** ⚠️ PASS WITH CONDITIONS

### Metrics Summary

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Code Coverage | 85% | >80% | ✅ |
| Unit Tests | 32/32 pass | All pass | ✅ |
| Documentation | Incomplete | Complete | ⚠️ |

### Conditions

1. **CHANGELOG Entry Missing**
   - Add entry under [Unreleased] section
   - Format: `### Added\n- Dark mode toggle in Settings`

2. **API Documentation Outdated**
   - Update `/api/user/preferences` endpoint docs
   - Add `theme` field to response schema

### Deadline for Conditions
Conditions must be resolved before QA testing begins.

**Estimated time:** 30 minutes

### Gate Decision: PASS WITH CONDITIONS

QA testing may begin once documentation updates are merged.
```

### Example 3: Successful Pre-Release Gate

**Scenario:** Release approved with enhanced monitoring

```markdown
## Pre-Release Quality Gate Report

**Release:** v2.1.0
**Status:** ✅ GO WITH MONITORING

### Release Summary
- 3 features (Biometric Auth, Dark Mode, Search)
- 45 story points delivered
- 0 known critical bugs
- All sign-offs obtained

### Enhanced Monitoring Recommendation

Due to the security-sensitive nature of Biometric Authentication:

| Metric | Alert Threshold | Action |
|--------|-----------------|--------|
| Auth failure rate | >5% in 5min | Page on-call |
| Biometric timeout | >10% in 10min | Page on-call |
| New error types | Any | Slack notification |

### Rollback Triggers

| Condition | Action |
|-----------|--------|
| Error rate >1% for 30min | Automatic rollback |
| Auth bypass detected | Immediate rollback + incident |
| Data corruption | Immediate rollback + incident |

### Gate Decision: GO WITH MONITORING

**Approved for production with enhanced monitoring for 48 hours post-release.**
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                QC SPECIALIST QUICK REFERENCE                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  QUALITY GATES                                               │
│  /quality-gate pre-dev PBI-XXX     Requirements review       │
│  /quality-gate pre-qa PBI-XXX      Code/test readiness       │
│  /quality-gate pre-release vX.Y.Z  Release readiness         │
│                                                              │
│  GATE DECISIONS                                              │
│  PASS             - Ready to proceed                         │
│  PASS WITH CONDITIONS - Minor issues, can proceed            │
│  FAIL             - Major issues, return to owner            │
│                                                              │
│  KEY METRICS                                                 │
│  Defect Escape Rate: <5%                                     │
│  Test Coverage: >80%                                         │
│  First Pass Rate: >70%                                       │
│  Gate Cycle Time: <4h                                        │
│                                                              │
│  OUTPUT LOCATIONS                                            │
│  Quality Reports: team-artifacts/quality-reports/            │
│                                                              │
│  NAMING: {YYMMDD}-qc-{gate}-{slug}.md                        │
│                                                              │
│  COMPLIANCE                                                  │
│  WCAG 2.1 AA | OWASP Top 10 | GDPR | SOC 2                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Related Documentation

- [Team Collaboration Guide](../team-collaboration-guide.md) - Full system overview
- [QA Engineer Guide](./qa-engineer-guide.md) - Test specification details
- [Business Analyst Guide](./business-analyst-guide.md) - Requirements handoff

---

*Last updated: 2026-01-19*
