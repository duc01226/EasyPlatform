# Product Owner Guide

> **Complete guide for Product Owners using Claude Code to capture ideas, manage backlog, and prioritize features.**

---

## Quick Start

```bash
# Capture a new idea
/idea "Add dark mode toggle to settings"

# Prioritize backlog items
/prioritize team-artifacts/pbis/*.md --framework rice
```

**Output Location:** `team-artifacts/ideas/`
**Naming Pattern:** `{YYMMDD}-po-idea-{slug}.md`

---

## Your Role in the Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCT WORKFLOW                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   [YOU] ──/idea──> BA ──/refine──> Dev ──> QA ──> Release   │
│     │                                                        │
│     └──/prioritize──> Backlog Management                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Your Responsibilities

| Task | Command | Output |
|------|---------|--------|
| Capture ideas | `/idea` | `team-artifacts/ideas/*.md` |
| Prioritize backlog | `/prioritize` | Updated priority scores |
| Review PBIs | Read | `team-artifacts/pbis/*.md` |
| Approve for sprint | Update status | PBI status → "approved" |

---

## Commands

### `/idea` - Capture Product Ideas

**Purpose:** Document new feature requests, improvements, or bug reports with structured template.

#### Basic Usage

```bash
# Simple idea capture
/idea "Add user profile avatars"

# With context
/idea "Add biometric login" --context "Users complaining about slow login"

# From stakeholder feedback
/idea "Implement SSO for enterprise clients" --source "Customer feedback Q4"
```

#### What Claude Generates

```markdown
---
id: IDEA-260119-001
title: "Add biometric login"
submitted_by: "Product Owner"
role: "PO"
status: needs-refinement
priority: 0
created: 2026-01-19
---

## Problem Statement
[Auto-generated from your input]

## Value Proposition
- [Business value points]
- [User benefits]
- [Metrics to track]

## Affected Users
- [User personas impacted]

## Stakeholders
- [Teams involved]

## Dependencies
- [Technical dependencies]
- [External dependencies]

## Initial Sizing
- Complexity: [Low/Medium/High]
- Effort estimate: [T-shirt size]

## Tags
- [Relevant tags for filtering]
```

#### Real-World Examples

**Example 1: Feature Request from Customer Feedback**
```bash
/idea "Add bulk export feature for reports" --context "Enterprise clients (Acme Corp, TechStart) requesting ability to export all monthly reports as single PDF. Currently must export one-by-one. Affects 45% of enterprise tier."
```

**Example 2: Internal Improvement**
```bash
/idea "Improve dashboard loading performance" --context "Analytics show 3.2s average load time. Target: <1s. Users abandoning before dashboard loads."
```

**Example 3: Bug as Idea**
```bash
/idea "BUG: Password reset email not sending for Gmail users" --context "Support tickets #1234, #1238, #1241. Affecting ~200 users/day. Started after email provider migration."
```

#### Business Context Loading

When capturing ideas, the `/idea` command now automatically enriches your ideas with business context:

1. **Detects Target Module** - Matches keywords from your idea to `docs/business-features/` modules
   - Keywords like "snippet", "text", "search" → TextSnippet module
   - Keywords like "task", "item", "todo" → TextSnippet (TaskItem) module

2. **Loads Context** - Reads INDEX.md and README.md for relevant module context
   - Shows existing features related to your idea
   - Displays feature table from INDEX.md for overlap detection

3. **Inspects Entities** - Searches domain entities from source code
   - Extracts entity names, key properties, relationships
   - Helps identify existing domain concepts

4. **Adds References** - Populates artifact with documentation links
   - `related_module`: Target module name
   - `related_entities`: Domain entities found
   - `related_features`: Existing FR-XX IDs from documentation

**Example Output:**
```markdown
## Related
- **Module Docs**: [docs/business-features/TextSnippet/](docs/business-features/TextSnippet/)
- **Related Features**: FR-TS-001, FR-TS-003
- **Related Entities**: TextSnippet, SnippetCategory
```

---

### `/prioritize` - Backlog Prioritization

**Purpose:** Apply structured prioritization frameworks to rank backlog items.

#### Frameworks Available

| Framework | Best For | Formula |
|-----------|----------|---------|
| **RICE** | Feature prioritization | (Reach × Impact × Confidence) / Effort |
| **WSJF** | Agile/SAFe teams | Cost of Delay / Job Size |
| **MoSCoW** | Release planning | Must/Should/Could/Won't |
| **Value vs Effort** | Quick decisions | 2×2 matrix |

#### Usage

```bash
# RICE scoring (recommended for features)
/prioritize team-artifacts/pbis/260119-ba-pbi-biometric-auth.md --framework rice

# WSJF for SAFe teams
/prioritize team-artifacts/pbis/*.md --framework wsjf

# MoSCoW for release planning
/prioritize --framework moscow --release "v2.1"

# Batch prioritization
/prioritize team-artifacts/pbis/*.md --framework rice --output backlog-priority.md
```

#### RICE Scoring Example

```markdown
## RICE Score: 260119-ba-pbi-biometric-auth

| Factor | Score | Rationale |
|--------|-------|-----------|
| **Reach** | 5000 users/quarter | 50% of mobile users |
| **Impact** | 3 (High) | Reduces login time by 90% |
| **Confidence** | 80% | Technical POC completed |
| **Effort** | 3 person-weeks | Mobile + backend work |

**RICE Score:** (5000 × 3 × 0.8) / 3 = **4,000**

### Recommendation
Priority: **P1** - High impact, moderate effort, high confidence
Sprint: Include in next sprint
```

---

## Daily Workflows

### Morning Backlog Review

```bash
# 1. Check new ideas needing review
ls team-artifacts/ideas/ | grep "needs-refinement"

# 2. Review overnight submissions
cat team-artifacts/ideas/260119-po-idea-*.md

# 3. Prioritize ready PBIs
/prioritize team-artifacts/pbis/*.md --status ready --framework rice
```

### Stakeholder Meeting Prep

```bash
# Generate status for stakeholder update
/status project

# Review feature progress
/status feature-authentication

# Check dependencies
/dependency --scope active
```

### Sprint Planning Prep

```bash
# Prioritize backlog for sprint
/prioritize team-artifacts/pbis/*.md --framework rice --sprint-ready

# Review capacity vs prioritized items
/team-sync sprint-planning

# Check blocked items
/dependency --blocked
```

---

## Idea Templates

### Feature Idea Template

```markdown
## Problem Statement
What problem are we solving? Who experiences this problem?

## Value Proposition
- Business value: [Revenue, cost savings, efficiency]
- User value: [Time saved, satisfaction, capability]
- Metrics: [How will we measure success?]

## User Impact
- Primary users: [Who benefits most?]
- Secondary users: [Who else is affected?]
- User count estimate: [How many users?]

## Business Context
- Strategic alignment: [Which OKR/goal?]
- Competitive landscape: [Do competitors have this?]
- Market timing: [Why now?]

## Initial Scope
- Must have: [Core functionality]
- Nice to have: [Enhancements]
- Out of scope: [What we're NOT doing]

## Dependencies
- Technical: [APIs, infrastructure]
- Team: [Which teams involved?]
- External: [Third-party, legal, compliance]
```

### Bug Report Template

```markdown
## Bug Summary
One-line description of the issue.

## Impact
- Severity: [Critical/High/Medium/Low]
- Users affected: [Number or percentage]
- Business impact: [Revenue, reputation, SLA]

## Reproduction
- Environment: [Production/Staging/Dev]
- Steps: [1, 2, 3...]
- Frequency: [Always/Sometimes/Rare]

## Evidence
- Support tickets: [#IDs]
- Error logs: [Link or snippet]
- Screenshots: [If applicable]

## Workaround
Is there a current workaround? What is it?
```

---

## Working with Business Analysts

### Handoff Process

1. **Create idea** with complete problem statement
2. **Tag for refinement** → `status: needs-refinement`
3. **Notify BA** → BA picks up via `/refine`
4. **Review PBI** → Validate acceptance criteria
5. **Approve** → Update PBI status to "approved"

### Quality Checklist Before Handoff

- [ ] Problem statement is user-focused (not solution-focused)
- [ ] Value proposition is quantified where possible
- [ ] Stakeholders are identified
- [ ] Initial sizing is provided
- [ ] Dependencies are listed
- [ ] Priority score is assigned (numeric, not High/Med/Low)

### Common Handoff Issues

| Issue | Solution |
|-------|----------|
| Vague problem statement | Add specific user quotes or data |
| Missing success metrics | Define measurable outcomes |
| Solution-focused | Rewrite focusing on user need |
| Missing stakeholders | Identify all affected teams |

---

## Prioritization Best Practices

### DO

- Use numeric priorities (1-999) not labels (High/Medium/Low)
- Include confidence level in estimates
- Re-prioritize when new information emerges
- Consider dependencies in priority decisions
- Document rationale for priority changes

### DON'T

- Prioritize based on who asked loudest
- Skip confidence assessment
- Ignore technical dependencies
- Set everything as "High" priority
- Change priorities without documentation

### Priority Ranges

| Range | Meaning | Action |
|-------|---------|--------|
| 900-999 | Critical | Immediate sprint |
| 700-899 | High | Next 1-2 sprints |
| 400-699 | Medium | Roadmap (quarter) |
| 100-399 | Low | Backlog |
| 1-99 | Nice-to-have | Future consideration |

---

## Metrics & Reporting

### Key Metrics to Track

| Metric | Description | Target |
|--------|-------------|--------|
| Idea-to-PBI time | Days from idea to refined PBI | <5 days |
| Backlog health | % of PBIs with complete AC | >90% |
| Sprint predictability | Committed vs delivered | >80% |
| Stakeholder satisfaction | Feedback scores | >4/5 |

### Generating Reports

```bash
# Weekly backlog health
/status project --metrics backlog

# Feature completion tracking
/status feature-{name}

# Sprint velocity
/status sprint --metrics velocity
```

---

## Integration with Other Roles

### → Business Analyst

```bash
# Tag idea for BA refinement
# In idea file, set: status: needs-refinement

# BA picks up with
/refine team-artifacts/ideas/260119-po-idea-biometric-auth.md
```

### → Project Manager

```bash
# PM can pull status
/status sprint

# You can request dependency check
/dependency team-artifacts/pbis/260119-ba-pbi-auth.md
```

### → Development Team

```bash
# Review technical feasibility
# Dev team comments on PBI

# Check implementation status
/status feature-biometric-auth
```

---

## Troubleshooting

### Idea Not Saving

**Problem:** `/idea` command doesn't create file.

**Solution:**
1. Check `team-artifacts/ideas/` directory exists
2. Verify write permissions
3. Check for special characters in title

### Priority Not Calculating

**Problem:** RICE/WSJF score showing as 0.

**Solution:**
1. Ensure all required fields are filled
2. Check numeric values are valid
3. Verify confidence is percentage (0-100)

### BA Not Picking Up Ideas

**Problem:** Ideas sitting in "needs-refinement" too long.

**Solution:**
1. Check BA workload with PM
2. Add urgency notes to idea
3. Escalate via `/team-sync daily`

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                 PRODUCT OWNER QUICK REFERENCE                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  CAPTURE IDEAS                                               │
│  /idea "description"                                         │
│  /idea "desc" --context "background"                         │
│                                                              │
│  PRIORITIZE                                                  │
│  /prioritize PBI --framework rice                            │
│  /prioritize *.md --framework wsjf                           │
│  /prioritize --framework moscow --release v2.1               │
│                                                              │
│  CHECK STATUS                                                │
│  /status sprint                                              │
│  /status feature-{name}                                      │
│  /dependency PBI-XXX                                         │
│                                                              │
│  OUTPUT LOCATIONS                                            │
│  Ideas: team-artifacts/ideas/                                │
│  PBIs:  team-artifacts/pbis/                                 │
│                                                              │
│  NAMING: {YYMMDD}-po-idea-{slug}.md                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Related Documentation

- [Team Collaboration Guide](../team-collaboration-guide.md) - Full system overview
- [Business Analyst Guide](./business-analyst-guide.md) - BA handoff details
- [Project Manager Guide](./project-manager-guide.md) - Status and reporting

---

*Last updated: 2026-01-19*
