# Project Manager - Report Templates

## Status Report Template

```markdown
## Status Report - {Date}

### Sprint: {Name} | Day {N} of {Total}

#### Executive Summary
{2-3 sentences on overall health}

#### Sprint Metrics
| Metric | Planned | Actual | Status |
|--------|---------|--------|--------|
| Stories | | | green/yellow/red |
| Story Points | | | |
| Bugs Found | | | |
| Bugs Fixed | | | |

#### Burndown
```
Points | X
       | X X
       | X X X
       | X X X X
       +----------
         D1 D2 D3 D4
```

#### Completed Since Last Report
| Item | Type | Owner | Value Delivered |
|------|------|-------|-----------------|
| | Story/Bug/Task | | |

#### In Progress
| Item | Status | % Done | ETA | Blocker? |
|------|--------|--------|-----|----------|
| | On Track/At Risk | | | |

#### Blockers
| Blocker | Blocked Item | Impact | Action | Owner | ETA |
|---------|--------------|--------|--------|-------|-----|
| | | H/M/L | | | |

#### Risks
| Risk | Probability | Impact | Score | Mitigation | Owner |
|------|-------------|--------|-------|------------|-------|
| | H/M/L | H/M/L | 1-9 | | |

#### Decisions Needed
| Decision | Options | By When | Decision Maker |
|----------|---------|---------|----------------|
| | | | |

#### Next Week Focus
- {Priority 1}
- {Priority 2}
- {Priority 3}
```

---

## Dependency Tracker Template

### Dependency Matrix

```
             Feature A  Feature B  Feature C  External
Feature A       -          ->         <->         ->
Feature B       <-          -          ->          -
Feature C      <->         <-          -          ->

Legend:
-> depends on (we wait for them)
<- depended by (they wait for us)
<-> mutual dependency
```

### Full Template

```markdown
## Dependency Tracker: {Feature/Sprint}

### Critical Path
```
[Start] -> [Feature A] -> [Feature B] -> [Integration] -> [Release]
                |              ^
          [Feature C] ---------+
```

### Upstream Dependencies (We depend on)
| Dependency | Type | Owner | Status | Our Deadline | Impact if Delayed |
|------------|------|-------|--------|--------------|-------------------|
| | Feature/API/Data | | green/yellow/red | | |

### Downstream Dependencies (Depend on us)
| Dependent | Type | Owner | Their Deadline | Our Commitment |
|-----------|------|-------|----------------|----------------|
| | | | | |

### External Dependencies
| System/Service | Contact | Status | Contingency |
|----------------|---------|--------|-------------|
| | | | |

### Dependency Health: green Healthy / yellow At Risk / red Blocked

**Notes:**
{Any concerns or actions needed}
```

---

## Risk Register Template

```markdown
## Risk Register: {Sprint/Project}

### Active Risks
| ID | Risk | Category | P | I | Score | Mitigation | Owner | Status |
|----|------|----------|---|---|-------|------------|-------|--------|
| R001 | | Tech/Schedule/Resource/Scope | H/M/L | H/M/L | 1-9 | | | Open/Mitigating/Closed |

### Risk Scoring Matrix
```
Impact
  H | 3   6   9
  M | 2   4   6
  L | 1   2   3
    +----------
      L   M   H  Probability
```

### Thresholds
- **7-9 (Critical):** Escalate to stakeholders, daily review
- **4-6 (High):** Active mitigation, weekly review
- **1-3 (Low):** Monitor, bi-weekly review

### Risk Categories
- **Technical:** Architecture, performance, security, integration
- **Schedule:** Dependencies, resource availability, scope
- **Resource:** Skill gaps, capacity, turnover
- **Scope:** Requirements change, feature creep, unclear specs

### Recently Closed Risks
| ID | Risk | Resolution | Closed Date |
|----|------|------------|-------------|
| | | | |
```

---

## Team Sync Agenda Template

```markdown
## Team Sync - {Date}

**Attendees:** {List or roles}
**Duration:** {30/45/60} min
**Sprint Day:** {N} of {Total}

---

### 1. Sprint Health Check (5 min)
- Burndown status: green/yellow/red
- Blockers count: {N}
- Key highlight: {one thing}

### 2. Role Updates (10 min)
| Role | Update | Needs |
|------|--------|-------|
| PO | | |
| BA | | |
| Dev | | |
| QA | | |
| UX | | |
| QC | | |

### 3. Blockers & Dependencies (5 min)
| Blocker | Owner | Help Needed |
|---------|-------|-------------|
| | | |

### 4. Risks & Escalations (5 min)
| Item | Action | Owner |
|------|--------|-------|
| | | |

### 5. Action Items Review (5 min)
#### Previous Action Items
| Action | Owner | Due | Status |
|--------|-------|-----|--------|
| | | | done/in-progress/blocked |

---

### Meeting Notes
{Capture key discussions}

### Decisions Made
| Decision | Rationale | Owner |
|----------|-----------|-------|
| | | |

### New Action Items
| Action | Owner | Due |
|--------|-------|-----|
| | | |

---

**Next Sync:** {Date/Time}
```

---

## Sprint Ceremonies Support

### Sprint Planning Checklist
- [ ] Sprint goal defined
- [ ] Capacity calculated
- [ ] PBIs prioritized
- [ ] Dependencies identified
- [ ] Stories estimated
- [ ] Commitment agreed

### Sprint Review Checklist
- [ ] Demo prepared
- [ ] Stakeholders invited
- [ ] Metrics gathered
- [ ] Feedback captured
- [ ] Action items documented

### Sprint Retro Template

```markdown
## Sprint {N} Retrospective

### What Went Well
- {item}

### What Didn't Go Well
- {item}

### Action Items
| Action | Owner | Due |
|--------|-------|-----|
| | | |
```
