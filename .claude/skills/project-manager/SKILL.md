---
name: project-manager
description: Assist Project Managers with status reports, dependency tracking, risk management, and team sync facilitation. Provides templates for sprint status, risk registers, dependency matrices, and meeting agendas. Triggers on keywords like "status report", "sprint status", "dependency", "risk", "team sync", "meeting agenda", "blockers", "project status", "sprint progress".
allowed-tools: Read, Write, Edit, Grep, Glob, TodoWrite, WebSearch
---

# Project Manager Assistant

Help Project Managers with team-wide status tracking, dependency management, risk assessment, and coordination.

---

## Core Capabilities

### 1. Status Report Generation
- Aggregate sprint progress
- Track blockers and risks
- Summarize completions
- Forecast delivery

### 2. Dependency Tracking
- Visualize dependency graphs
- Track upstream/downstream
- Monitor blocking items
- Alert on at-risk dependencies

### 3. Risk Management
- Maintain risk register
- Calculate risk scores
- Track mitigation status
- Escalate critical risks

### 4. Team Sync Facilitation
- Generate meeting agendas
- Track action items
- Cross-role coordination
- Document decisions

---

## Status Report Generation

### Command: `/status`
Generate status report from:
1. PBIs in current sprint
2. Recent commits/PRs
3. Open bugs/issues
4. Blockers

### Status Report Template

```markdown
## Status Report - {Date}

### Sprint: {Name} | Day {N} of {Total}

#### Summary
| Metric | Planned | Actual | Status |
|--------|---------|--------|--------|
| Stories | | | 🟢🟡🔴 |
| Points | | | |
| Bugs Fixed | | | |

#### Completed Since Last Report
| Item | Type | Owner |
|------|------|-------|
| | | |

#### In Progress
| Item | Status | ETA | Blocker |
|------|--------|-----|---------|
| | | | |

#### Blockers
| Blocker | Impact | Action | Owner |
|---------|--------|--------|-------|
| | | | |

#### Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| | H/M/L | H/M/L | |

#### Next Sprint Preview
- {Item 1}
- {Item 2}
```

---

## Dependency Tracking

### Command: `/dependency`
Visualize and track dependencies.

### Dependency Matrix
```
         Feature A  Feature B  Feature C
Feature A    -         →          ↔
Feature B    ←         -          →
Feature C    ↔         ←          -

Legend: → depends on | ← depended by | ↔ mutual
```

### Dependency Log
```markdown
## Dependency Tracker: {Feature}

### Upstream Dependencies (We depend on)
| Dependency | Owner | Status | Impact if Delayed |
|------------|-------|--------|-------------------|
| | | | |

### Downstream Dependencies (Depend on us)
| Dependent | Owner | Their ETA | Our Deadline |
|-----------|-------|-----------|--------------|
| | | | |

### Dependency Status: Healthy / At Risk / Blocked
```

---

## Risk Management

### Risk Register Template
```markdown
## Risk Register: {Sprint/Project}

| ID | Risk | Category | Probability | Impact | Score | Mitigation | Owner | Status |
|----|------|----------|-------------|--------|-------|------------|-------|--------|
| R1 | | Tech/Schedule/Resource | H/M/L | H/M/L | 1-9 | | | Open |

### Scoring
- Probability: H=3, M=2, L=1
- Impact: H=3, M=2, L=1
- Score = P × I

### Thresholds
- 7-9: Critical - Escalate immediately
- 4-6: High - Weekly review
- 1-3: Low - Monitor
```

### Risk Categories
| Category | Examples |
|----------|----------|
| Technical | Architecture issues, integration complexity |
| Schedule | Dependencies delayed, scope changes |
| Resource | Team availability, skill gaps |
| External | Vendor delays, regulatory changes |

---

## Team Sync Facilitation

### Command: `/team-sync`
Generate meeting agenda and action items.

### Team Sync Agenda Template
```markdown
## Team Sync - {Date}

**Attendees:** {List}
**Duration:** {minutes} min

### Agenda

#### 1. Sprint Progress (5 min)
- Burndown status
- Key completions
- Blockers

#### 2. Cross-Role Updates (10 min)
| Role | Update |
|------|--------|
| PO | |
| BA | |
| Dev | |
| QA | |
| Design | |

#### 3. Risks & Dependencies (5 min)
- New risks identified
- Dependency updates

#### 4. Action Items Review (5 min)
| Action | Owner | Due | Status |
|--------|-------|-----|--------|
| | | | |

### Notes

### New Action Items
| Action | Owner | Due |
|--------|-------|-----|
| | | |
```

---

## Sprint Metrics

### Velocity Tracking
```markdown
## Velocity Report

| Sprint | Committed | Delivered | Velocity | Notes |
|--------|-----------|-----------|----------|-------|
| S-3 | | | | |
| S-2 | | | | |
| S-1 | | | | |
| Current | | | | |

**Average Velocity:** {points}
**Trend:** ↑ | ↓ | →
```

### Burndown Template
```
Points │
       │╲
       │ ╲    Ideal
       │  ╲ - - - -
       │   ╲      ╲
       │    ╲ Actual
       │     ╲
       └──────────────
         Day 1 ... Day N
```

---

## Workflow Integration

### Generating Status Report
When user runs `/status`:
1. Read PBIs in `team-artifacts/pbis/` with current sprint
2. Check git commits since last report
3. Identify blockers and risks
4. Generate status report
5. Optionally share with team

### Tracking Dependencies
When user runs `/dependency {feature}`:
1. Read feature PBI
2. Extract dependency information
3. Build dependency matrix
4. Identify at-risk items
5. Generate dependency report

---

## Output Conventions

### File Naming
```
{YYMMDD}-pm-status-sprint-{n}.md
{YYMMDD}-pm-dependency-{feature}.md
{YYMMDD}-pm-risk-register.md
{YYMMDD}-pm-team-sync.md
```

---

## Quality Checklist

Before completing PM artifacts:
- [ ] All blockers identified with owners
- [ ] Risk scores calculated
- [ ] Dependencies mapped
- [ ] Action items have owners and due dates
- [ ] Status uses traffic light indicators
