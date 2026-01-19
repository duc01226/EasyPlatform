# Team Collaboration Guide

> **Complete guide for using Claude Code's team collaboration features across all roles: Product Owner, Business Analyst, QA Engineer, QC Specialist, Designer, and Project Manager.**

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Role-Specific Guides](#role-specific-guides)
4. [Workflow Sequences](#workflow-sequences)
5. [Commands Reference](#commands-reference)
6. [Real-Life Examples](#real-life-examples)
7. [Artifact Naming Convention](#artifact-naming-convention)
8. [Best Practices](#best-practices)

---

## Quick Start

### 5-Minute Setup

```bash
# 1. Verify setup
ls team-artifacts/          # Should show: ideas/, pbis/, test-specs/, design-specs/, qc-reports/

# 2. Try your first command based on role:
/idea "User authentication improvement"     # Product Owner
/refine IDEA-260119-001                     # Business Analyst
/test-spec PBI-260119-001                   # QA Engineer
/design-spec PBI-260119-001                 # UX Designer
/status sprint                              # Project Manager
```

### Role Quick Reference

| Role | Primary Commands | Output Location |
|------|-----------------|-----------------|
| **Product Owner** | `/idea`, `/prioritize` | `team-artifacts/ideas/` |
| **Business Analyst** | `/refine`, `/story` | `team-artifacts/pbis/` |
| **QA Engineer** | `/test-spec`, `/test-cases` | `team-artifacts/test-specs/` |
| **QC Specialist** | `/quality-gate` | `team-artifacts/qc-reports/` |
| **UX Designer** | `/design-spec` | `team-artifacts/design-specs/` |
| **Project Manager** | `/status`, `/dependency`, `/team-sync` | `plans/reports/` |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TEAM COLLABORATION LAYER                          │
├─────────────────────────────────────────────────────────────────────┤
│  ARTIFACTS        │  WORKFLOWS          │  HANDOFFS                  │
│  /team-artifacts/ │  idea-to-pbi        │  PO → BA → Dev → QA        │
│    /ideas/        │  pbi-to-tests       │  Designer → Dev            │
│    /pbis/         │  design-workflow    │  QA → QC → Release         │
│    /test-specs/   │  pm-reporting       │  PM ← All Roles            │
│    /design-specs/ │                     │                            │
├─────────────────────────────────────────────────────────────────────┤
│                        SKILLS LAYER (6)                              │
│  product-owner │ business-analyst │ qa-engineer                      │
│  qc-specialist │ ux-designer      │ project-manager                  │
├─────────────────────────────────────────────────────────────────────┤
│                       COMMANDS LAYER (11)                            │
│  /idea │ /refine │ /prioritize │ /story                              │
│  /test-spec │ /test-cases │ /quality-gate │ /design-spec             │
│  /status │ /dependency │ /team-sync                                  │
├─────────────────────────────────────────────────────────────────────┤
│                         HOOKS LAYER (2)                              │
│  role-context-injector │ artifact-path-resolver                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Handoff Flow

```
Product Owner ──/idea──> Business Analyst ──/refine──> Developer
       │                        │                          │
       │                   /story                     implements
       │                        │                          │
       └────────────────────────┼──────────────────────────┤
                                │                          │
                          QA Engineer <────────────────────┘
                         /test-spec
                               │
                        QC Specialist
                        /quality-gate
                               │
                        ───Release───
```

---

## Role-Specific Guides

> **Detailed Guides Available:** Each role has a comprehensive standalone guide with templates, real-world examples, and quick reference cards.
>
> | Role | Guide |
> |------|-------|
> | Product Owner | [product-owner-guide.md](./team-roles/product-owner-guide.md) |
> | Business Analyst | [business-analyst-guide.md](./team-roles/business-analyst-guide.md) |
> | QA Engineer | [qa-engineer-guide.md](./team-roles/qa-engineer-guide.md) |
> | QC Specialist | [qc-specialist-guide.md](./team-roles/qc-specialist-guide.md) |
> | UX Designer | [ux-designer-guide.md](./team-roles/ux-designer-guide.md) |
> | Project Manager | [project-manager-guide.md](./team-roles/project-manager-guide.md) |

### Product Owner (PO)

**Purpose:** Capture ideas, manage backlog, prioritize features

**Available Commands:**
- `/idea` - Capture new product ideas
- `/prioritize` - Apply prioritization frameworks (MoSCoW, WSJF, RICE)

**Skill Activation:** Automatic when working in `team-artifacts/ideas/`

**Workflow:**
```
1. Capture idea → /idea "feature description"
2. Add context → Problem, value proposition, stakeholders
3. Tag for refinement → status: needs-refinement
4. Hand off to BA → /refine IDEA-XXXXXX-NNN
```

**Output Template:** `team-artifacts/templates/idea-template.md`

---

### Business Analyst (BA)

**Purpose:** Refine requirements, write user stories, define acceptance criteria

**Available Commands:**
- `/refine` - Refine idea into PBI with acceptance criteria
- `/story` - Create detailed user stories from PBI

**Key Standards:**
- **User Story Format:** As a [persona], I want [goal], so that [benefit]
- **Acceptance Criteria:** GIVEN/WHEN/THEN (BDD format)
- **INVEST Criteria:** Independent, Negotiable, Valuable, Estimable, Small, Testable

**Workflow:**
```
1. Receive idea → Read team-artifacts/ideas/IDEA-XXXXXX-NNN.md
2. Refine to PBI → /refine IDEA-XXXXXX-NNN
3. Break into stories → /story PBI-XXXXXX-NNN
4. Define acceptance criteria → GIVEN/WHEN/THEN format
5. Hand off to Dev/QA
```

**Output Templates:**
- `team-artifacts/templates/pbi-template.md`
- `team-artifacts/templates/user-story-template.md`

---

### QA Engineer

**Purpose:** Create test plans, generate test cases, analyze coverage

**Available Commands:**
- `/test-spec` - Generate test specification from PBI/story
- `/test-cases` - Generate detailed test cases with steps

**Key Standards:**
- **Test Case ID Format:** `TC-{MOD}-{NNN}` (e.g., TC-AUTH-001)
- **Evidence Field:** Required with `file:line` format
- **Coverage Types:** Positive, negative, edge cases, boundary

**Workflow:**
```
1. Receive PBI/Story → Read acceptance criteria
2. Create test spec → /test-spec PBI-XXXXXX-NNN
3. Generate test cases → /test-cases TS-XXXXXX-NNN
4. Map to acceptance criteria → Ensure full coverage
5. Execute tests → Record evidence with file:line
6. Hand off to QC → /quality-gate
```

**Output Template:** `team-artifacts/templates/test-spec-template.md`

---

### QC Specialist

**Purpose:** Quality gates, compliance verification, audit trails

**Available Commands:**
- `/quality-gate` - Run quality gate checklist (pre-dev, pre-qa, pre-release)

**Gate Types:**
| Gate | When | Focus |
|------|------|-------|
| `pre-dev` | Before development | Requirements completeness, design approval |
| `pre-qa` | Before QA testing | Code review, unit tests, documentation |
| `pre-release` | Before deployment | Integration tests, security scan, stakeholder sign-off |

**Workflow:**
```
1. Identify gate type → pre-dev | pre-qa | pre-release
2. Run quality gate → /quality-gate pre-release PBI-XXXXXX-NNN
3. Verify checklist items → All criteria must pass
4. Document findings → Record any blockers
5. Sign off or reject → Update gate status
```

---

### UX Designer

**Purpose:** Design specifications, component documentation, accessibility

**Available Commands:**
- `/design-spec` - Generate design specification from PBI

**Key Standards:**
- **Component States:** Default, hover, active, disabled, error, loading
- **Responsive Breakpoints:** Mobile (320px+), Tablet (768px+), Desktop (1024px+)
- **Accessibility:** WCAG 2.1 AA compliance required
- **Design Tokens:** Colors, typography, spacing from design system

**Workflow:**
```
1. Receive PBI → Understand requirements
2. Create design spec → /design-spec PBI-XXXXXX-NNN
3. Document states → All component states
4. Define tokens → Reference design system
5. Add accessibility notes → WCAG requirements
6. Hand off to Dev → Share Figma link + spec
```

**Output Template:** `team-artifacts/templates/design-spec-template.md`

---

### Project Manager (PM)

**Purpose:** Status tracking, dependency management, team coordination

**Available Commands:**
- `/status` - Generate status report (sprint, project, feature)
- `/dependency` - Track and visualize dependencies
- `/team-sync` - Generate meeting agendas (daily, weekly, sprint-review, sprint-planning)

**Report Types:**
| Command | Output | Use Case |
|---------|--------|----------|
| `/status sprint` | Sprint progress, blockers, metrics | Daily standups, sprint reviews |
| `/status project` | Overall project health | Stakeholder updates |
| `/status feature-auth` | Feature-specific status | Feature tracking |
| `/dependency PBI-XXX` | Dependency graph | Risk identification |
| `/team-sync daily` | Daily standup agenda | Team meetings |
| `/team-sync weekly` | Weekly sync agenda | Cross-team coordination |

**Workflow:**
```
1. Gather data → Read team-artifacts/, git activity
2. Generate report → /status sprint
3. Identify blockers → Flag risks and dependencies
4. Facilitate sync → /team-sync daily
5. Track action items → Update status
```

---

## Workflow Sequences

### 1. Idea to PBI Workflow

**Trigger:** New feature request or improvement idea

```bash
# Step 1: Product Owner captures idea
/idea "Add dark mode toggle to settings page"

# Output: team-artifacts/ideas/260119-po-idea-dark-mode-toggle.md

# Step 2: Business Analyst refines to PBI
/refine team-artifacts/ideas/260119-po-idea-dark-mode-toggle.md

# Output: team-artifacts/pbis/260119-ba-pbi-dark-mode-toggle.md

# Step 3: BA creates user stories
/story team-artifacts/pbis/260119-ba-pbi-dark-mode-toggle.md

# Output: team-artifacts/pbis/stories/260119-ba-story-dark-mode-toggle.md

# Step 4: PO prioritizes in backlog
/prioritize team-artifacts/pbis/260119-ba-pbi-dark-mode-toggle.md
```

**Automated Workflow:** Run all steps with `/workflow idea-to-pbi`

---

### 2. PBI to Tests Workflow

**Trigger:** PBI ready for development/testing

```bash
# Step 1: QA creates test specification
/test-spec team-artifacts/pbis/260119-ba-pbi-dark-mode-toggle.md

# Output: team-artifacts/test-specs/260119-qa-testspec-dark-mode-toggle.md

# Step 2: QA generates detailed test cases
/test-cases team-artifacts/test-specs/260119-qa-testspec-dark-mode-toggle.md

# Output: team-artifacts/test-specs/260119-qa-testcases-dark-mode-toggle.md

# Step 3: QC runs quality gate
/quality-gate pre-qa team-artifacts/pbis/260119-ba-pbi-dark-mode-toggle.md

# Output: team-artifacts/qc-reports/260119-qc-gate-dark-mode-toggle.md
```

**Automated Workflow:** Run all steps with `/workflow pbi-to-tests`

---

### 3. Design Workflow

**Trigger:** UI/UX work required for PBI

```bash
# Step 1: Designer creates design spec
/design-spec team-artifacts/pbis/260119-ba-pbi-dark-mode-toggle.md

# Output: team-artifacts/design-specs/260119-ux-designspec-dark-mode-toggle.md

# Step 2: Review design implementation
/review/codebase "Check dark mode implementation against design spec"
```

**Automated Workflow:** Run all steps with `/workflow design-workflow`

---

### 4. PM Reporting Workflow

**Trigger:** Status update needed

```bash
# Step 1: Generate sprint status
/status sprint

# Output: plans/reports/pm-260119-status-sprint.md

# Step 2: Track dependencies
/dependency team-artifacts/pbis/260119-ba-pbi-dark-mode-toggle.md

# Step 3: Prepare team sync
/team-sync daily
```

**Automated Workflow:** Run all steps with `/workflow pm-reporting`

---

## Commands Reference

### Product Owner Commands

#### `/idea`
Capture a new product idea with structured template.

```bash
# Basic usage
/idea "Feature description"

# With context
/idea "Add biometric authentication" --context "Users requesting faster login"

# From existing document
/idea path/to/requirements.md
```

**Output:** `team-artifacts/ideas/{YYMMDD}-po-idea-{slug}.md`

---

#### `/prioritize`
Apply prioritization framework to backlog items.

```bash
# MoSCoW prioritization
/prioritize team-artifacts/pbis/*.md --framework moscow

# WSJF (Weighted Shortest Job First)
/prioritize PBI-260119-001 --framework wsjf

# RICE scoring
/prioritize --framework rice
```

---

### Business Analyst Commands

#### `/refine`
Refine an idea into a Product Backlog Item with acceptance criteria.

```bash
# From idea
/refine team-artifacts/ideas/260119-po-idea-dark-mode.md

# With additional context
/refine IDEA-260119-001 --stakeholders "Mobile team, Design team"
```

**Output:** `team-artifacts/pbis/{YYMMDD}-ba-pbi-{slug}.md`

---

#### `/story`
Create user stories from a PBI.

```bash
# From PBI
/story team-artifacts/pbis/260119-ba-pbi-dark-mode.md

# Generate multiple stories
/story PBI-260119-001 --personas "admin,user,guest"
```

**Output:** `team-artifacts/pbis/stories/{YYMMDD}-ba-story-{slug}.md`

---

### QA Engineer Commands

#### `/test-spec`
Generate test specification from requirements.

```bash
# From PBI
/test-spec team-artifacts/pbis/260119-ba-pbi-dark-mode.md

# From user story
/test-spec team-artifacts/pbis/stories/260119-ba-story-dark-mode.md

# With coverage focus
/test-spec PBI-260119-001 --focus "edge-cases,security"
```

**Output:** `team-artifacts/test-specs/{YYMMDD}-qa-testspec-{slug}.md`

---

#### `/test-cases`
Generate detailed test cases with steps.

```bash
# From test spec
/test-cases team-artifacts/test-specs/260119-qa-testspec-dark-mode.md

# With specific coverage
/test-cases TS-260119-001 --types "positive,negative,boundary"
```

**Output:** `team-artifacts/test-specs/{YYMMDD}-qa-testcases-{slug}.md`

---

### QC Specialist Commands

#### `/quality-gate`
Run quality gate checklist.

```bash
# Pre-development gate
/quality-gate pre-dev PBI-260119-001

# Pre-QA gate
/quality-gate pre-qa PBI-260119-001

# Pre-release gate
/quality-gate pre-release PBI-260119-001
```

**Output:** `team-artifacts/qc-reports/{YYMMDD}-qc-gate-{slug}.md`

---

### UX Designer Commands

#### `/design-spec`
Generate design specification.

```bash
# From PBI
/design-spec team-artifacts/pbis/260119-ba-pbi-dark-mode.md

# With component focus
/design-spec PBI-260119-001 --components "toggle,settings-panel"
```

**Output:** `team-artifacts/design-specs/{YYMMDD}-ux-designspec-{slug}.md`

---

### Project Manager Commands

#### `/status`
Generate status report.

```bash
# Sprint status
/status sprint

# Project-wide status
/status project

# Feature-specific status
/status feature-authentication
```

**Output:** `plans/reports/{YYMMDD}-pm-status-{scope}.md`

---

#### `/dependency`
Track and visualize dependencies.

```bash
# Single PBI dependencies
/dependency PBI-260119-001

# All active PBIs
/dependency --scope active

# Critical path analysis
/dependency --critical-path
```

---

#### `/team-sync`
Generate meeting agendas.

```bash
# Daily standup
/team-sync daily

# Weekly sync
/team-sync weekly

# Sprint review
/team-sync sprint-review

# Sprint planning
/team-sync sprint-planning
```

---

## Real-Life Examples

### Example 1: New Feature - User Authentication Redesign

**Scenario:** Product Owner receives feedback that login is too slow. The team needs to implement biometric authentication.

```bash
# Day 1: PO captures the idea
/idea "Add biometric authentication (Face ID, fingerprint) to mobile app login"

# Claude generates: team-artifacts/ideas/260119-po-idea-biometric-auth.md
# Contains: Problem statement, value proposition, affected users, dependencies
```

**Idea Output:**
```markdown
---
id: IDEA-260119-001
title: "Add biometric authentication to mobile app"
submitted_by: "Product Owner"
status: needs-refinement
priority: 800
---

## Problem Statement
Users report login takes 15+ seconds. Current password-only flow causes friction.

## Value Proposition
- Reduce login time from 15s to <2s
- Increase daily active users by estimated 12%
- Improve security posture

## Stakeholders
- Mobile team (implementation)
- Security team (approval)
- Design team (UX flow)
```

```bash
# Day 2: BA refines into PBI
/refine team-artifacts/ideas/260119-po-idea-biometric-auth.md

# Claude generates: team-artifacts/pbis/260119-ba-pbi-biometric-auth.md
```

**PBI Output:**
```markdown
---
id: PBI-260119-001
title: "Biometric Authentication for Mobile Login"
source_idea: IDEA-260119-001
priority: 800
effort: 13
---

## User Stories
1. As a mobile user, I want to login with Face ID, so that I can access the app quickly
2. As a mobile user, I want to login with fingerprint, so that I have an alternative biometric option
3. As a security admin, I want biometric to be optional, so that users can choose their preference

## Acceptance Criteria

### AC-001: Face ID Login
**GIVEN** user has Face ID enabled on device
**AND** user has enabled biometric login in app settings
**WHEN** user opens the app
**THEN** Face ID prompt appears
**AND** successful scan logs user in within 2 seconds

### AC-002: Fingerprint Login
**GIVEN** user has fingerprint sensor on device
**WHEN** user taps "Login with fingerprint"
**THEN** fingerprint prompt appears
**AND** successful scan logs user in within 2 seconds

### AC-003: Fallback to Password
**GIVEN** biometric authentication fails 3 times
**WHEN** user attempts 4th biometric login
**THEN** app shows password input field
**AND** displays message "Please enter your password"
```

```bash
# Day 3: QA creates test spec
/test-spec team-artifacts/pbis/260119-ba-pbi-biometric-auth.md

# Claude generates: team-artifacts/test-specs/260119-qa-testspec-biometric-auth.md
```

**Test Spec Output:**
```markdown
---
id: TS-260119-001
feature: "Biometric Authentication"
source_pbi: PBI-260119-001
coverage: 95%
---

## Test Cases

### TC-AUTH-001: Face ID Happy Path
**Priority:** Critical
**Type:** Positive

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enable Face ID in device settings | Face ID available |
| 2 | Enable biometric in app settings | Setting saved |
| 3 | Close and reopen app | Face ID prompt appears |
| 4 | Complete Face ID scan | User logged in <2s |

**Evidence:** `src/auth/biometric.service.ts:45`

### TC-AUTH-002: Fingerprint Happy Path
**Priority:** Critical
**Type:** Positive
...

### TC-AUTH-003: Biometric Fallback After 3 Failures
**Priority:** High
**Type:** Negative
...

### TC-AUTH-004: Device Without Biometric Support
**Priority:** Medium
**Type:** Edge Case
...
```

```bash
# Day 4: Designer creates design spec
/design-spec team-artifacts/pbis/260119-ba-pbi-biometric-auth.md

# Claude generates: team-artifacts/design-specs/260119-ux-designspec-biometric-auth.md
```

```bash
# Day 5: QC runs pre-dev quality gate
/quality-gate pre-dev PBI-260119-001

# Output shows checklist:
# ✓ Requirements complete
# ✓ Acceptance criteria in GIVEN/WHEN/THEN
# ✓ Design spec approved
# ✓ Test spec created
# ✓ Dependencies identified
# → GATE PASSED - Ready for development
```

```bash
# Day 10: PM generates status report
/status sprint

# Claude generates: plans/reports/260119-pm-status-sprint.md
```

---

### Example 2: Bug Fix Workflow

**Scenario:** QA finds a bug during testing.

```bash
# Step 1: QA documents the bug
/idea "BUG: Login button unresponsive on slow networks"

# Step 2: BA creates quick PBI
/refine --type bug team-artifacts/ideas/260119-po-idea-login-button-bug.md

# Step 3: QA adds regression test
/test-cases --type regression PBI-260119-002

# Step 4: QC verifies fix
/quality-gate pre-release PBI-260119-002
```

---

### Example 3: Sprint Planning

**Scenario:** PM prepares for sprint planning meeting.

```bash
# Generate sprint planning agenda
/team-sync sprint-planning

# Output includes:
# - Velocity metrics from last sprint
# - Proposed stories with effort estimates
# - Team capacity calculation
# - Dependency warnings
# - Suggested sprint goal
```

---

### Example 4: Cross-Team Handoff

**Scenario:** Feature moving from design to development.

```bash
# Designer completes spec
/design-spec PBI-260119-003

# Designer triggers handoff workflow
/workflow design-workflow

# This automatically:
# 1. Validates design spec completeness
# 2. Checks all states documented
# 3. Verifies accessibility notes
# 4. Creates handoff checklist
# 5. Notifies development team
```

---

## Artifact Naming Convention

### Pattern
```
{YYMMDD}-{role}-{type}-{slug}.md
```

### Components

| Component | Description | Examples |
|-----------|-------------|----------|
| `YYMMDD` | Date (auto-computed) | 260119 |
| `role` | Role code | po, ba, qa, qc, ux, pm |
| `type` | Artifact type | idea, pbi, story, testspec, designspec, gate, status |
| `slug` | Descriptive kebab-case | dark-mode-toggle, user-auth |

### Examples

```
260119-po-idea-biometric-auth.md          # PO idea
260119-ba-pbi-biometric-auth.md           # BA PBI
260119-ba-story-face-id-login.md          # BA user story
260119-qa-testspec-biometric-auth.md      # QA test spec
260119-qa-testcases-biometric-auth.md     # QA test cases
260119-ux-designspec-biometric-auth.md    # UX design spec
260119-qc-gate-biometric-auth.md          # QC quality gate
260119-pm-status-sprint-12.md             # PM status report
```

### Role Codes

| Role | Code |
|------|------|
| Product Owner | `po` |
| Business Analyst | `ba` |
| QA Engineer | `qa` |
| QC Specialist | `qc` |
| UX Designer | `ux` |
| Project Manager | `pm` |

---

## Best Practices

### 1. Always Use Templates

Templates ensure consistency and completeness:

```bash
# Templates auto-loaded when working in artifact folders
# Hook: role-context-injector.cjs

# Manual template reference
cat team-artifacts/templates/pbi-template.md
```

### 2. Follow Handoff Sequence

```
PO → BA → Dev → QA → QC → Release
     ↑           ↑
  Designer ──────┘
```

### 3. Quality Gate Checkpoints

| Gate | Required Before |
|------|-----------------|
| `pre-dev` | Starting development |
| `pre-qa` | Starting QA testing |
| `pre-release` | Deploying to production |

### 4. Link Artifacts

Always reference source artifacts:

```markdown
---
source_idea: IDEA-260119-001
source_pbi: PBI-260119-001
---
```

### 5. Use Evidence Format

QA test cases must include file references:

```markdown
**Evidence:** `src/auth/login.service.ts:142`
```

### 6. Numeric Priorities

Use numeric priorities (1-999) instead of High/Medium/Low:

```markdown
priority: 800  # ✓ Correct
priority: High # ✗ Avoid
```

### 7. INVEST Criteria for Stories

Validate user stories against INVEST:

- **I**ndependent - Can be delivered separately
- **N**egotiable - Details can be discussed
- **V**aluable - Delivers user value
- **E**stimable - Team can estimate effort
- **S**mall - Fits in one sprint
- **T**estable - Has clear acceptance criteria

### 8. BDD Format for Acceptance Criteria

Always use GIVEN/WHEN/THEN:

```markdown
**GIVEN** precondition
**AND** additional precondition
**WHEN** action occurs
**THEN** expected result
**AND** additional result
```

---

## Troubleshooting

### Context Not Injected

**Problem:** Role-specific context not appearing when working with artifacts.

**Solution:** Ensure file path includes `team-artifacts/`:
```bash
# ✓ Correct - context injected
team-artifacts/ideas/my-idea.md

# ✗ Wrong - no context
ideas/my-idea.md
```

### Naming Suggestion Not Appearing

**Problem:** Artifact path resolver not suggesting names.

**Solution:** File must be in `team-artifacts/` and not already follow convention:
```bash
# Will get suggestion
team-artifacts/ideas/my-idea.md

# Already correct - no suggestion
team-artifacts/ideas/260119-po-idea-my-idea.md
```

### Workflow Not Triggering

**Problem:** Automated workflow not starting.

**Solution:** Use explicit workflow command:
```bash
/workflow idea-to-pbi
/workflow pbi-to-tests
/workflow design-workflow
/workflow pm-reporting
```

---

## Related Documentation

- [Claude Kit Setup](./claude-kit-setup.md) - Hooks, skills, agents configuration
- [Architecture Overview](./architecture.md) - System architecture and patterns
- [Development Rules](../.claude/workflows/development-rules.md) - Coding standards

---

*Last updated: 2026-01-19*
