# Project Manager Guide

> **Complete guide for Project Managers using Claude Code to track status, manage dependencies, and coordinate team activities.**

---

## Quick Start

```bash
# Get sprint status
/status sprint

# Check project dependencies
/dependency team-artifacts/pbis/260119-ba-pbi-biometric-auth.md

# Prepare team sync agenda
/team-sync daily
```

**Output Location:** `team-artifacts/reports/`
**Naming Pattern:** `{YYMMDD}-pm-{type}-{slug}.md`

---

## Your Role in the Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    PM COORDINATION                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│         ┌─────────────────────────────────┐                  │
│         │           [YOU]                 │                  │
│         │  /status  /dependency  /team-sync│                  │
│         └─────────────────────────────────┘                  │
│                       │                                      │
│    ┌──────────────────┼──────────────────┐                   │
│    ▼                  ▼                  ▼                   │
│   PO                 Dev               QA/QC                 │
│  Ideas              Sprint            Testing                │
│  Backlog            Delivery          Quality                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Your Responsibilities

| Task | Command | Output |
|------|---------|--------|
| Sprint status | `/status sprint` | Sprint progress report |
| Project status | `/status project` | Overall project report |
| Dependency tracking | `/dependency` | Dependency graph/blockers |
| Daily standups | `/team-sync daily` | Meeting agenda |
| Sprint planning | `/team-sync sprint-planning` | Planning agenda |
| Retrospectives | `/team-sync retro` | Retro facilitation guide |

---

## Commands

### `/status` - Generate Status Reports

**Purpose:** Create comprehensive status reports for sprints, features, or projects.

#### Basic Usage

```bash
# Sprint status
/status sprint

# Current sprint with metrics
/status sprint --metrics

# Project overview
/status project

# Feature-specific status
/status feature-biometric-auth

# Release status
/status release-v2.1.0
```

#### Status Report Types

| Type | Scope | Audience |
|------|-------|----------|
| `sprint` | Current sprint | Team, Stakeholders |
| `project` | Full project | Leadership |
| `feature-{name}` | Single feature | Product team |
| `release-{version}` | Release readiness | All |

#### What Claude Generates

```markdown
---
type: sprint-status
sprint: Sprint 23
period: 2026-01-13 to 2026-01-26
generated: 2026-01-19
---

## Sprint 23 Status Report

### Executive Summary
Sprint is on track with 75% completion at mid-sprint. Biometric auth feature is ahead of schedule, dark mode on track, search improvements at risk due to dependency.

### Sprint Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Velocity | 45 pts | 34 pts | 🟢 On track |
| Burndown | 50% | 48% | 🟢 On track |
| Scope changes | 0 | 1 | 🟡 Minor |
| Blockers | 0 | 1 | 🟡 Active |

### PBI Status

| PBI | Feature | Points | Status | Progress |
|-----|---------|--------|--------|----------|
| PBI-260119-001 | Biometric Auth | 13 | In Progress | 80% |
| PBI-260115-003 | Dark Mode | 8 | In Progress | 60% |
| PBI-260110-007 | Search | 13 | At Risk | 30% |
| PBI-260112-002 | Bug Fixes | 5 | Done | 100% |
| PBI-260114-001 | Performance | 8 | Not Started | 0% |

### Blockers

| ID | Description | Owner | Impact | ETA |
|----|-------------|-------|--------|-----|
| BLK-001 | Search API dependency on v3 | Backend | High | 2026-01-20 |

### Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Search delay | Medium | Medium | Parallel development path |
| Resource conflict | Low | High | Cross-training initiated |

### Next Steps
1. Resolve BLK-001 by 2026-01-20
2. Complete biometric auth code review
3. Begin dark mode QA testing
```

---

### `/dependency` - Track Dependencies

**Purpose:** Identify and visualize dependencies between features, teams, and external systems.

#### Basic Usage

```bash
# Check dependencies for a PBI
/dependency team-artifacts/pbis/260119-ba-pbi-biometric-auth.md

# Check blocked items
/dependency --blocked

# Full dependency graph
/dependency --graph

# Cross-team dependencies
/dependency --cross-team
```

#### What Claude Generates

```markdown
## Dependency Analysis

### PBI-260119-001: Biometric Authentication

#### Upstream Dependencies (What we need)

| Dependency | Type | Owner | Status | Risk |
|------------|------|-------|--------|------|
| iOS SDK v15+ | External | Apple | ✅ Available | Low |
| Auth API v2 | Internal | Backend | ✅ Ready | Low |
| Keychain Service | Internal | Security | ✅ Ready | Low |

#### Downstream Dependencies (What needs us)

| Dependent | Type | Impact | Status |
|-----------|------|--------|--------|
| SSO Integration | Feature | Blocked | 🔴 Waiting |
| Mobile App v3.0 | Release | Required | 🟡 On track |

#### Dependency Graph

```
External Dependencies
├── iOS LocalAuthentication SDK ──✅
├── Android BiometricPrompt ──✅
└── Backend Auth API v2 ──✅

Internal Dependencies
├── User Settings Service ──✅
├── Keychain Wrapper ──✅
└── Analytics Service ──✅

Downstream Impact
├── SSO Integration ── 🔴 BLOCKED (needs biometric)
├── Enterprise Login ── 🟡 WAITING (wants biometric)
└── Mobile v3.0 Release ── 🟡 TRACKING
```

### Blocked Items

| Item | Blocked By | Duration | Action |
|------|------------|----------|--------|
| SSO Integration | PBI-260119-001 | 3 days | In progress |
| Search v3 | External API | 5 days | Escalated |

### Recommendations
1. **Prioritize** biometric auth completion to unblock SSO
2. **Escalate** Search API dependency to vendor
3. **Consider** parallel development path for search
```

---

### `/team-sync` - Coordinate Team Activities

**Purpose:** Generate meeting agendas and facilitate team coordination activities.

#### Basic Usage

```bash
# Daily standup agenda
/team-sync daily

# Sprint planning
/team-sync sprint-planning

# Sprint retrospective
/team-sync retro

# Backlog grooming
/team-sync grooming

# Custom sync
/team-sync stakeholder-update
```

#### Meeting Types

| Type | Duration | Frequency | Purpose |
|------|----------|-----------|---------|
| `daily` | 15 min | Daily | Standup sync |
| `sprint-planning` | 2-4 hrs | Bi-weekly | Sprint setup |
| `retro` | 1-2 hrs | Bi-weekly | Sprint review |
| `grooming` | 1 hr | Weekly | Backlog refinement |

#### Daily Standup Agenda

```markdown
## Daily Standup - 2026-01-19

**Time:** 09:30 (15 min)
**Attendees:** Dev Team, QA, PM

### Agenda

1. **Quick Wins** (2 min)
   - Celebrate completions from yesterday

2. **Team Updates** (10 min)
   - Each member: Yesterday / Today / Blockers
   - Keep to 90 seconds per person

3. **Blockers** (3 min)
   - Identify and assign owners
   - Schedule follow-up if needed

### Pre-populated Updates

From git commits and artifact changes:

| Team Member | Yesterday | Today |
|-------------|-----------|-------|
| @alice | PR #1234 merged (biometric) | Code review, start tests |
| @bob | Fixed auth timeout bug | Continue search feature |
| @carol | QA: 5 test cases passed | QA: Edge case testing |

### Known Blockers

| Blocker | Owner | Status |
|---------|-------|--------|
| Search API v3 | @vendor | Waiting (ETA: Tomorrow) |

### Parking Lot
- Performance testing approach (discuss after standup)
```

#### Sprint Planning Agenda

```markdown
## Sprint 24 Planning - 2026-01-27

**Time:** 10:00-12:00 (2 hrs)
**Attendees:** PO, Dev Team, QA, PM

### Pre-Planning Preparation

**PO:** Review and prioritize backlog
**Dev:** Technical feasibility review
**QA:** Test estimation

### Agenda

1. **Sprint 23 Review** (15 min)
   - Velocity achieved: 42/45 points
   - Carryover items: 1 (Search improvements)
   - Lessons learned

2. **Sprint 24 Goal** (10 min)
   - PO presents sprint theme
   - Team alignment check

3. **Capacity Planning** (10 min)
   | Team Member | Availability | Notes |
   |-------------|--------------|-------|
   | @alice | 100% | - |
   | @bob | 80% | Training Wed |
   | @carol | 100% | - |
   | @dave | 60% | PTO Fri |

   **Total Capacity:** 38 points (vs 45 normal)

4. **Backlog Review** (45 min)
   - Walk through prioritized items
   - Estimate and commit

5. **Sprint Backlog** (30 min)
   - Final selection
   - Task breakdown
   - Commitment

6. **Risks & Dependencies** (10 min)
   - Identify blockers
   - Mitigation plans

### Candidate Items

| Priority | PBI | Points | Risk |
|----------|-----|--------|------|
| 1 | Search Improvements (carryover) | 8 | Medium |
| 2 | User Preferences | 5 | Low |
| 3 | Notification System | 13 | High |
| 4 | Performance Optimization | 8 | Medium |

### Definition of Done Reminder
- [ ] Code reviewed
- [ ] Unit tests >80%
- [ ] QA approved
- [ ] Documentation updated
```

#### Sprint Retrospective

```markdown
## Sprint 23 Retrospective - 2026-01-26

**Time:** 14:00-15:30 (90 min)
**Facilitator:** PM
**Format:** Start/Stop/Continue + Action Items

### Agenda

1. **Check-in** (5 min)
   - How are you feeling about the sprint? (1-5)

2. **Data Review** (10 min)
   - Sprint metrics
   - Goal achievement
   - Quality metrics

3. **What Went Well** (15 min)
   - Individual reflection (3 min)
   - Share and group (12 min)

4. **What Didn't Go Well** (15 min)
   - Individual reflection (3 min)
   - Share and group (12 min)

5. **Root Cause Analysis** (15 min)
   - Select top 3 issues
   - 5 Whys analysis

6. **Action Items** (20 min)
   - Brainstorm solutions
   - Vote on priorities
   - Assign owners and deadlines

7. **Appreciation** (5 min)
   - Shout-outs and kudos

8. **Check-out** (5 min)
   - One word to describe the sprint

### Sprint 23 Metrics

| Metric | Target | Actual | Trend |
|--------|--------|--------|-------|
| Velocity | 45 | 42 | ↓ |
| Bugs escaped | 0 | 1 | ↔ |
| Code coverage | 80% | 84% | ↑ |
| Customer issues | 0 | 0 | ✅ |

### Previous Action Items

| Action | Owner | Status |
|--------|-------|--------|
| Improve estimation process | @PM | ✅ Done |
| Add pre-commit hooks | @Dev | 🔄 In progress |
| Document API changes | @Tech | ❌ Not started |

### Template: Action Items

| Action | Owner | Deadline | Success Criteria |
|--------|-------|----------|------------------|
| TBD | | | |
```

---

## Reporting Templates

### Weekly Status Report

```markdown
## Weekly Status Report - Week {N}

**Period:** {start} to {end}
**Prepared by:** PM
**Distribution:** Leadership, Stakeholders

### Executive Summary
{2-3 sentences on overall status, key achievements, critical issues}

### Key Metrics

| Metric | This Week | Last Week | Trend |
|--------|-----------|-----------|-------|
| Sprint Progress | 75% | 50% | ↑ |
| Blockers | 1 | 2 | ↓ |
| Quality Score | 92% | 89% | ↑ |
| Team Morale | 4.2/5 | 4.0/5 | ↑ |

### Accomplishments
- ✅ Biometric authentication feature complete
- ✅ Dark mode QA passed
- ✅ Performance improvements deployed

### In Progress
- 🔄 Search improvements (60%)
- 🔄 User preferences (40%)
- 🔄 Mobile optimization (20%)

### Upcoming
- 📋 Sprint 24 planning (Mon)
- 📋 Release v2.1.0 preparation
- 📋 Stakeholder demo (Fri)

### Risks & Issues

| Type | Description | Severity | Mitigation |
|------|-------------|----------|------------|
| Risk | Search API delay | Medium | Parallel path |
| Issue | Resource conflict | Low | Cross-training |

### Decisions Needed
1. Approve release date for v2.1.0
2. Prioritize notification vs analytics feature

### Next Week Focus
1. Complete search improvements
2. Begin v2.1.0 release testing
3. Sprint 24 kickoff
```

### Release Status Report

```markdown
## Release Status: v2.1.0

**Target Date:** 2026-01-30
**Status:** 🟢 On Track

### Release Contents

| Feature | PBI | Status | QA | Sign-off |
|---------|-----|--------|----|---------|
| Biometric Auth | PBI-260119-001 | ✅ Done | ✅ | ✅ |
| Dark Mode | PBI-260115-003 | ✅ Done | ✅ | ⏳ |
| Search v2 | PBI-260110-007 | 🔄 90% | ⏳ | - |

### Quality Gates

| Gate | Status | Date | Notes |
|------|--------|------|-------|
| Code Complete | ✅ | 2026-01-25 | All PRs merged |
| QA Complete | ⏳ | 2026-01-27 | In progress |
| Security Review | ✅ | 2026-01-24 | No issues |
| Performance Test | ⏳ | 2026-01-28 | Scheduled |
| Release Approval | - | 2026-01-29 | Pending |

### Release Checklist

- [x] Feature code complete
- [x] Unit tests passing
- [x] Integration tests passing
- [ ] E2E tests passing
- [ ] Performance tests passing
- [x] Security scan complete
- [ ] Documentation updated
- [ ] Release notes prepared
- [ ] Rollback plan documented
- [ ] Stakeholder sign-off

### Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Search delay | Low | Medium | Extra QA resources |
| Hotfix needed | Low | Low | On-call scheduled |

### Communication Plan

| Audience | Channel | Timing |
|----------|---------|--------|
| Internal team | Slack | Release day |
| Stakeholders | Email | Release day |
| Customers | In-app | Day after |
| Public | Blog | Week after |
```

---

## Risk Management

### Risk Matrix

```markdown
## Risk Register

### Risk Assessment Matrix

|              | Low Impact | Medium Impact | High Impact |
|--------------|------------|---------------|-------------|
| **High Prob**| Monitor    | Mitigate      | Avoid       |
| **Med Prob** | Accept     | Monitor       | Mitigate    |
| **Low Prob** | Accept     | Accept        | Monitor     |

### Active Risks

| ID | Risk | Prob | Impact | Score | Status | Owner |
|----|------|------|--------|-------|--------|-------|
| R-001 | Search API delay | M | M | 6 | Monitoring | PM |
| R-002 | Key person leave | L | H | 6 | Mitigating | PM |
| R-003 | Scope creep | M | M | 6 | Mitigating | PO |
| R-004 | Tech debt | M | L | 3 | Accepted | Tech |

### Risk Details

#### R-001: Search API Delay

**Description:** External API v3 release may be delayed
**Probability:** Medium (40%)
**Impact:** Medium (2-week delay)
**Score:** 6

**Triggers:**
- No communication from vendor for 5+ days
- Demo environment unavailable

**Mitigation:**
1. Parallel development with mock API
2. Weekly vendor check-ins
3. Fallback to v2 with reduced features

**Contingency:**
- If triggered: Implement v2 fallback plan
- Owner: Backend Lead
- Timeline: 3 days to implement
```

---

## Team Coordination

### RACI Matrix

```markdown
## RACI Matrix - Biometric Auth Feature

| Activity | PO | BA | Dev | QA | QC | UX | PM |
|----------|----|----|-----|----|----|----|----|
| Define requirements | A | R | C | I | I | C | I |
| Create design spec | C | I | C | I | I | R | I |
| Develop feature | I | I | R | I | I | C | I |
| Write tests | I | I | C | R | I | I | I |
| Quality gate | I | I | I | C | R | I | A |
| Release approval | R | I | I | I | C | I | A |

**Legend:** R=Responsible, A=Accountable, C=Consulted, I=Informed
```

### Escalation Path

```markdown
## Escalation Matrix

### Escalation Levels

| Level | Scope | Timeline | Escalate To |
|-------|-------|----------|-------------|
| L1 | Team issue | Same day | Team Lead |
| L2 | Cross-team | 1 day | PM |
| L3 | Department | 2 days | Director |
| L4 | Organization | 3 days | VP/C-level |

### When to Escalate

| Situation | Level | Action |
|-----------|-------|--------|
| Blocker >1 day | L1 | Team lead involvement |
| Cross-team conflict | L2 | PM mediation |
| Resource constraint | L2 | PM + Director |
| Schedule at risk | L2 | PM escalation |
| Budget impact | L3 | Director approval |
| Customer impact | L3 | Immediate escalation |
```

---

## Real-World Examples

### Example 1: Sprint at Risk

```markdown
## Sprint 23 - Risk Alert

**Date:** 2026-01-22
**Status:** 🟡 At Risk

### Issue Summary
Search improvements feature is at risk due to external API delay.

### Impact Assessment
- Sprint commitment: 45 points
- At risk: 13 points (Search)
- Remaining: 32 points
- New projection: 82% completion vs 100% target

### Options Analysis

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| A: Wait for API | Complete feature | Sprint miss | Not recommended |
| B: Partial delivery | Some value | Technical debt | Consider |
| C: Swap feature | Maintain velocity | Stakeholder impact | Recommended |
| D: Extend sprint | Complete work | Schedule impact | Not recommended |

### Recommended Action
**Option C: Swap Search with Performance PBI**

- Remove: PBI-260110-007 (Search, 13 pts)
- Add: PBI-260114-001 (Performance, 8 pts)
- New commitment: 40 points
- Buffer: 5 points

### Stakeholder Communication
- PO notification sent
- Stakeholder update scheduled for tomorrow
- Search moved to Sprint 24 backlog (priority 1)

### Decision Needed
Please confirm option selection by EOD.
```

### Example 2: Cross-Team Dependency Resolution

```markdown
## Dependency Resolution - Auth Integration

**Date:** 2026-01-19
**Teams:** Mobile, Backend, Security

### Dependency Map

```
Mobile Team (Consumer)
    │
    └── Needs: Auth API v2 endpoints
        │
        ├── Backend Team (Provider)
        │   └── Status: Development complete
        │   └── Blocker: Security review pending
        │
        └── Security Team (Reviewer)
            └── Status: In queue
            └── ETA: 2 days
```

### Timeline Impact

| Team | Original Plan | With Dependency | Delay |
|------|---------------|-----------------|-------|
| Backend | Jan 18 | Jan 18 | 0 days |
| Security | Jan 19 | Jan 21 | 2 days |
| Mobile | Jan 20 | Jan 22 | 2 days |

### Resolution Plan

1. **Expedite Security Review**
   - Scheduled priority review session
   - Security team allocated 4 hours tomorrow
   - New ETA: Jan 20

2. **Parallel Development**
   - Mobile team uses mock API
   - Integration testing after review complete

3. **Communication**
   - Daily sync at 10:00
   - Slack channel: #auth-integration

### Outcome
Dependency resolved with 1-day delay (vs 2 days without intervention).
```

---

## Working with Other Roles

### ↔ All Roles

**Status Collection:**
```bash
# Aggregate status from all artifacts
/status sprint --from-artifacts

# This scans:
# - team-artifacts/ideas/ (new ideas count)
# - team-artifacts/pbis/ (PBI statuses)
# - team-artifacts/test-specs/ (test completion)
# - team-artifacts/quality-reports/ (gate results)
# - team-artifacts/design-specs/ (design status)
```

### ← From Product Owner

**Backlog Management:**
- Review prioritized backlog for sprint planning
- Verify scope changes are documented
- Track feature requests and their status

### ← From QC Specialist

**Quality Metrics:**
- Collect gate pass/fail rates
- Track defect escape rate
- Monitor test coverage trends

### → To Stakeholders

**Reporting Cadence:**

| Report | Frequency | Audience | Content |
|--------|-----------|----------|---------|
| Daily | Daily | Team | Standup summary |
| Weekly | Weekly | Stakeholders | Progress, risks |
| Sprint | Bi-weekly | All | Sprint metrics |
| Monthly | Monthly | Leadership | Trends, forecasts |

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                PROJECT MANAGER QUICK REFERENCE               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  STATUS REPORTS                                              │
│  /status sprint              Current sprint progress         │
│  /status project             Overall project status          │
│  /status feature-{name}      Feature-specific status         │
│  /status release-{version}   Release readiness               │
│                                                              │
│  DEPENDENCY TRACKING                                         │
│  /dependency PBI-XXX         Check PBI dependencies          │
│  /dependency --blocked       List blocked items              │
│  /dependency --graph         Full dependency graph           │
│                                                              │
│  TEAM SYNC                                                   │
│  /team-sync daily            Standup agenda                  │
│  /team-sync sprint-planning  Planning session                │
│  /team-sync retro            Retrospective facilitation      │
│  /team-sync grooming         Backlog refinement              │
│                                                              │
│  METRICS TO TRACK                                            │
│  Velocity | Burndown | Blockers | Quality Score              │
│                                                              │
│  OUTPUT LOCATIONS                                            │
│  Reports: team-artifacts/reports/                            │
│                                                              │
│  NAMING: {YYMMDD}-pm-{type}-{slug}.md                        │
│                                                              │
│  ESCALATION: L1(Team) → L2(PM) → L3(Dir) → L4(VP)            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Related Documentation

- [Team Collaboration Guide](../team-collaboration-guide.md) - Full system overview
- [Product Owner Guide](./product-owner-guide.md) - Backlog management
- [QC Specialist Guide](./qc-specialist-guide.md) - Quality metrics

---

*Last updated: 2026-01-19*
