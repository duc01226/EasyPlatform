# Team Collaboration Guide

> Claude Code setup for Product Owners, Business Analysts, QA Engineers, QC Specialists, UX Designers, and Project Managers.

**Version:** 1.0 | **Last Updated:** 2026-01-19

---

## Quick Navigation

| Section | Audience | Purpose |
|---------|----------|---------|
| [Quick Start](#quick-start-by-role) | All Roles | First success in 2 minutes |
| [Command Reference](#command-reference) | All Roles | All 11 commands with examples |
| [Workflow Tutorials](#workflow-tutorials) | All Roles | End-to-end process flows |
| [Real-World Example](#real-world-example) | All Roles | Employee Photo Upload feature |
| [Cheat Sheet](#cheat-sheet) | All Roles | Printable quick reference |
| [Troubleshooting](#troubleshooting) | All Roles | Common issues and fixes |

---

## Before You Start

Ensure your environment is ready:

1. **Claude Code installed** - Verify with `claude --version`
2. **Team skills accessible** - Check with `ls .claude/skills/team-*/`
3. **Understand artifact naming** - Format: `{YYMMDD}-{role}-{type}-{slug}.md`
4. **Know where artifacts live** - All artifacts in `team-artifacts/`

---

## Quick Start by Role

Each role has a 3-step path to first success.

### Product Owner: Capture to Prioritize

**What You'll Achieve:** Feature idea captured and prioritized in backlog

1. **Capture an idea**
   ```bash
   /idea "Allow employees to upload profile photos"
   ```
   Creates: `team-artifacts/ideas/260119-po-idea-employee-photo-upload.md`

2. **Refine to PBI** (when ready)
   ```bash
   /refine team-artifacts/ideas/260119-po-idea-employee-photo-upload.md
   ```
   Creates PBI with acceptance criteria in GIVEN/WHEN/THEN format

3. **Prioritize backlog**
   ```bash
   /prioritize rice
   ```
   Scores and orders all PBIs using RICE framework

**Next:** See [Prioritization Frameworks](#prioritize) for RICE vs MoSCoW vs Value-Effort

---

### Business Analyst: Refine to Stories

**What You'll Achieve:** PBI broken into testable user stories

1. **Review idea or request**
   Read the idea file or receive verbal request from PO

2. **Refine into PBI**
   ```bash
   /refine team-artifacts/ideas/260119-po-idea-employee-photo-upload.md
   ```
   Generates acceptance criteria with GIVEN/WHEN/THEN scenarios

3. **Create user stories**
   ```bash
   /story team-artifacts/pbis/260119-pbi-employee-photo-upload.md
   ```
   Slices PBI into vertical stories meeting INVEST criteria

**Next:** See [/story command](#story) for INVEST criteria details

---

### QA Engineer: PBI to Test Cases

**What You'll Achieve:** Test specification with executable test cases

1. **Generate test spec from PBI**
   ```bash
   /test-spec team-artifacts/pbis/260119-pbi-employee-photo-upload.md
   ```
   Creates test strategy with scenarios (positive, negative, edge)

2. **Run quality gate**
   ```bash
   /quality-gate pre-qa team-artifacts/test-specs/260119-testspec-employee-photo-upload.md
   ```
   Verifies test coverage and completeness

**Next:** See [/test-spec](#test-spec) for TC-ID conventions

---

### UX Designer: Requirements to Design Spec

**What You'll Achieve:** Component specification ready for handoff

1. **Create design spec from PBI**
   ```bash
   /design-spec team-artifacts/pbis/260119-pbi-employee-photo-upload.md
   ```
   Generates component inventory and state documentation

2. **Review design tokens**
   Spec maps to existing tokens in `docs/design-system/design-tokens.md`

3. **Hand off to development**
   Share `team-artifacts/design-specs/260119-designspec-employee-photo-upload.md` with developers

**Next:** See [/design-spec command](#design-spec) for accessibility checklist

---

### Project Manager: Track and Report

**What You'll Achieve:** Status report with blockers and dependencies

1. **Generate status report**
   ```bash
   /status sprint
   ```
   Aggregates PBIs, commits, blockers into formatted report

2. **Check dependencies**
   ```bash
   /dependency all
   ```
   Visualizes upstream/downstream dependencies with risk indicators

3. **Prepare team sync agenda**
   ```bash
   /team-sync daily
   ```
   Generates meeting agenda with yesterday/today/blockers format

**Next:** See [PM Reporting Workflow](#workflow-4-pm-reporting) for ceremony types

---

## Command Reference

All 11 team commands with examples-first documentation.

### Capture Commands

#### /idea

**Example:**
```bash
/idea "Dark mode toggle for settings page"
```

**What it does:** Captures a raw idea as a structured artifact for backlog consideration.

**Creates:** `team-artifacts/ideas/{YYMMDD}-{role}-idea-{slug}.md`

**Options:**
- `title`: Brief title (optional, will prompt if not provided)

**Tip:** Keep titles under 10 words. Problem-focused, not solution-focused.

---

### Transform Commands

#### /refine

**Example:**
```bash
/refine team-artifacts/ideas/260119-po-idea-dark-mode-toggle.md
```

**What it does:** Transforms idea into PBI with GIVEN/WHEN/THEN acceptance criteria.

**Creates:** `team-artifacts/pbis/{YYMMDD}-pbi-{slug}.md`

**Options:**
- `idea-file`: Path to idea file or IDEA-ID (required)

**Tip:** Refining generates at least 3 scenarios: happy path, edge case, error case.

---

#### /story

**Example:**
```bash
/story team-artifacts/pbis/260119-pbi-dark-mode-toggle.md
```

**What it does:** Breaks PBI into vertical user stories meeting INVEST criteria.

**Creates:** `team-artifacts/pbis/stories/{YYMMDD}-us-{slug}-*.md`

**Options:**
- `pbi-file`: Path to PBI file or PBI-ID (required)

**Tip:** Stories >8 points should be split further.

---

#### /prioritize

**Example:**
```bash
/prioritize rice
/prioritize moscow scope:sprint
```

**What it does:** Orders backlog items using specified prioritization framework.

**Creates:** Updates `priority` field in PBI frontmatter

**Options:**
- `framework`: `rice` | `moscow` | `value-effort` (default: rice)
- `scope`: `all` | `sprint` | `feature-{name}` (default: all)

**Tip:** RICE for data-driven teams, MoSCoW for release planning.

---

### Test Commands

#### /test-spec

**Example:**
```bash
/test-spec team-artifacts/pbis/260119-pbi-dark-mode-toggle.md
```

**What it does:** Generates test specification from PBI acceptance criteria.

**Creates:** `team-artifacts/test-specs/{YYMMDD}-testspec-{feature}.md`

**Options:**
- `pbi-file`: Path to PBI file or PBI-ID (required)

**Tip:** Test specs identify test strategy: unit, integration, E2E coverage. Includes detailed TC-{MOD}-{NNN} cases with `Evidence: {file}:{line}` linking to code.

---

#### /quality-gate

**Example:**
```bash
/quality-gate pre-dev team-artifacts/pbis/260119-pbi-dark-mode-toggle.md
/quality-gate pre-release PR#123
```

**What it does:** Runs quality checklist for artifact or PR at specified stage.

**Creates:** `team-artifacts/qc-reports/{YYMMDD}-gate-{type}-{slug}.md`

**Options:**
- `target`: Artifact path, PR number, or gate type (required)
- Gate types: `pre-dev`, `pre-qa`, `pre-release`

**Tip:** Run pre-dev gate before assigning PBI to developers.

---

### Design Commands

#### /design-spec

**Example:**
```bash
/design-spec team-artifacts/pbis/260119-pbi-dark-mode-toggle.md
```

**What it does:** Creates design specification with component inventory and states.

**Creates:** `team-artifacts/design-specs/{YYMMDD}-designspec-{feature}.md`

**Options:**
- `source`: Path to PBI, requirements doc, or Figma URL (required)

**Tip:** Spec includes all states: default, hover, active, disabled, error, loading.

---

### PM Commands

#### /status

**Example:**
```bash
/status sprint
/status feature-dark-mode
```

**What it does:** Generates status report from current artifacts and git activity.

**Creates:** `plans/reports/{YYMMDD}-status-{scope}.md`

**Options:**
- `scope`: `sprint` | `project` | `feature-{name}` (default: sprint)

**Tip:** Run at end of day to capture daily progress.

---

#### /dependency

**Example:**
```bash
/dependency all
/dependency team-artifacts/pbis/260119-pbi-dark-mode-toggle.md
```

**What it does:** Maps and visualizes dependencies between features.

**Creates:** Console output or saved to file

**Options:**
- `target`: PBI file, feature name, or `all` (default: all)

**Tip:** Look for red indicators (blocking 3+ items) and external dependencies.

---

#### /team-sync

**Example:**
```bash
/team-sync daily
/team-sync sprint-review
```

**What it does:** Generates meeting agenda with relevant status items.

**Creates:** Console output or saved to file

**Options:**
- `type`: `daily` | `weekly` | `sprint-review` | `sprint-planning` (default: daily)

**Tip:** Run 10 minutes before standup to have fresh data.

---

## Workflow Tutorials

Four end-to-end workflows with swimlane diagrams showing role handoffs.

### Workflow 1: Idea to PBI

**Trigger:** New feature idea or enhancement request
**Roles:** Product Owner, Business Analyst
**Output:** Prioritized PBI with user stories

#### Swimlane

```
+------------------------------------------------------------------+
| IDEA TO PBI WORKFLOW                                              |
+----------+-------------------------------------------------------+
|          |                                                       |
|   PO     |  /idea --> [idea.md] --> Review --> /prioritize       |
|          |               |                          |            |
+----------+---------------|--------------------------+------------+
|          |               v                          |            |
|   BA     |          /refine --> [pbi.md] --> /story |            |
|          |                          |               |            |
|          |                          v               v            |
|          |                     [stories/]    [backlog ordered]   |
+----------+-------------------------------------------------------+
```

#### Steps

| # | Role | Command | Output |
|---|------|---------|--------|
| 1 | PO | `/idea "feature description"` | `ideas/260119-po-idea-*.md` |
| 2 | BA | `/refine {idea-file}` | `pbis/260119-pbi-*.md` |
| 3 | BA | `/story {pbi-file}` | `pbis/stories/260119-us-*.md` |
| 4 | PO | `/prioritize rice` | Updated priority in PBIs |

#### Handoffs

| From | To | Artifact | Signal |
|------|-----|----------|--------|
| PO | BA | idea.md | Idea status: `under_review` |
| BA | PO | pbi.md | PBI status: `approved` |
| PO | Dev | stories | Priority assigned, sprint planned |

---

### Workflow 2: PBI to Tests

**Trigger:** PBI approved and assigned to sprint
**Roles:** QA Engineer, QC Specialist
**Output:** Test cases with quality gate report

#### Swimlane

```
+------------------------------------------------------------------+
| PBI TO TESTS WORKFLOW                                             |
+----------+-------------------------------------------------------+
|          |                                                       |
|   QA     |  [pbi.md] --> /test-spec                              |
|          |                   |                                   |
|          |                   v                                   |
|          |            [testspec.md + TC-*-* cases]               |
|          |                   |                                   |
+----------+-------------------+-----------------------------------+
|          |                   v                                   |
|   QC     |                           /quality-gate               |
|          |                                  |                    |
|          |                                  v                    |
|          |                           [gate-report.md]            |
|          |                              PASS/FAIL                |
+----------+-------------------------------------------------------+
```

#### Steps

| # | Role | Command | Output |
|---|------|---------|--------|
| 1 | QA | `/test-spec {pbi-file}` | `test-specs/260119-testspec-*.md` with TC-{MOD}-{NNN} cases |
| 2 | QC | `/quality-gate pre-qa {testspec}` | `qc-reports/260119-gate-*.md` |

#### Handoffs

| From | To | Artifact | Signal |
|------|-----|----------|--------|
| Dev | QA | pbi.md | PBI status: `in_progress` |
| QA | QC | testspec.md | Test cases generated |
| QC | Dev | gate-report | Gate status: PASS -> proceed |

#### Quality Gate Criteria (Pre-QA)

- [ ] All test cases have TC-{MOD}-{NNN} ID
- [ ] Every test case has Evidence field
- [ ] At least 3 categories: positive, negative, edge
- [ ] Test summary counts match actual cases

---

### Workflow 3: Design Workflow

**Trigger:** PBI requires UI changes
**Roles:** UX Designer, (Developer for handoff)
**Output:** Design specification ready for implementation

#### Swimlane

```
+------------------------------------------------------------------+
| DESIGN WORKFLOW                                                   |
+----------+-------------------------------------------------------+
|          |                                                       |
|   UX     |  [pbi.md] --> /design-spec --> Review                 |
|          |                   |              |                    |
|          |                   v              v                    |
|          |            [designspec.md] --> Iterate                |
|          |                   |                                   |
+----------+-------------------+-----------------------------------+
|          |                   v                                   |
|   Dev    |            /code-review (design review)               |
|          |                   |                                   |
|          |                   v                                   |
|          |              Implementation                           |
+----------+-------------------------------------------------------+
```

#### Steps

| # | Role | Command | Output |
|---|------|---------|--------|
| 1 | UX | `/design-spec {pbi-file}` | `design-specs/260119-designspec-*.md` |
| 2 | UX | Review design tokens | Maps to existing tokens |
| 3 | Dev | `/code-review` (on spec) | Feedback for iteration |

#### Handoffs

| From | To | Artifact | Signal |
|------|-----|----------|--------|
| BA | UX | pbi.md | UI requirements identified |
| UX | Dev | designspec.md | All states documented |

#### Design Spec Checklist

- [ ] All component states (default, hover, active, disabled, error, loading)
- [ ] Design tokens mapped (no hardcoded values)
- [ ] BEM classes defined
- [ ] Accessibility requirements included

---

### Workflow 4: PM Reporting

**Trigger:** End of day, sprint ceremony, or stakeholder request
**Roles:** Project Manager
**Output:** Status report with dependency analysis

#### Swimlane

```
+------------------------------------------------------------------+
| PM REPORTING WORKFLOW                                             |
+----------+-------------------------------------------------------+
|          |                                                       |
|   PM     |  Gather Data --> /status --> /dependency              |
|          |       |             |              |                  |
|          |       |             v              v                  |
|          |  [pbis, git] --> [status.md] --> [dep-map]            |
|          |                     |              |                  |
|          |                     +------+-------+                  |
|          |                            v                          |
|          |                     /team-sync agenda                 |
|          |                            |                          |
|          |                            v                          |
|          |                     Share with team                   |
+----------+-------------------------------------------------------+
```

#### Steps

| # | Role | Command | Output |
|---|------|---------|--------|
| 1 | PM | `/status sprint` | `plans/reports/260119-status-sprint.md` |
| 2 | PM | `/dependency all` | Dependency visualization |
| 3 | PM | `/team-sync daily` | Meeting agenda |

#### Report Types

| Type | Trigger | Command |
|------|---------|---------|
| Daily | End of day | `/status sprint` |
| Weekly | Friday PM | `/status project` |
| Feature | Milestone | `/status feature-{name}` |
| Review | Sprint end | `/team-sync sprint-review` |

---

## Real-World Example

### Employee Photo Upload Feature

Let's walk through adding profile photo upload to BravoSUITE's Employee Management module.

**Scenario:** HR wants employees to upload profile photos visible in org charts, directories, and emails.

**Constraints:**
- Max file size: 5MB
- Formats: JPG, PNG, WEBP
- Display: 200x200px avatar (cropped circle)
- Storage: Azure Blob Storage

**Roles Involved:** PO, BA, UX, QA, QC

---

#### Day 1: PO Captures the Idea

**Maria (Product Owner) runs:**
```bash
/idea "Employee profile photo upload for org charts and directories"
```

**Claude creates:** `team-artifacts/ideas/260119-po-idea-employee-photo-upload.md`

```yaml
---
id: IDEA-260119-001
title: Employee Profile Photo Upload
status: draft
created_by: po
created_date: 2026-01-19
---

## Problem Statement
Employees have no visual identity in org charts and directories.

## Proposed Solution
Allow employees to upload profile photos from their profile settings page.

## Target Users
- Employees (uploaders)
- Managers (viewers in org charts)
- HR (directory management)

## Business Value
- Improved colleague recognition
- Professional company directories
- Enhanced org chart usability
```

**Maria says:** "Ready for BA refinement"
**Action:** Sets status to `under_review`

---

#### Day 2: BA Refines to PBI

**Tom (Business Analyst) runs:**
```bash
/refine team-artifacts/ideas/260119-po-idea-employee-photo-upload.md
```

**Claude creates:** `team-artifacts/pbis/260119-pbi-employee-photo-upload.md`

**Key acceptance criteria generated:**

```gherkin
Scenario: Successful photo upload
  Given employee is on profile settings page
  And employee has no current photo
  When employee selects a JPG file under 5MB
  And clicks "Upload"
  Then photo is displayed as 200x200 avatar
  And success message "Photo uploaded successfully" appears

Scenario: Oversized file rejected
  Given employee is on profile settings page
  When employee selects a file over 5MB
  Then error message "File exceeds 5MB limit" appears
  And upload button remains enabled

Scenario: Invalid format rejected
  Given employee is on profile settings page
  When employee selects a GIF file
  Then error message "Only JPG, PNG, WEBP allowed" appears
```

**Dependencies identified:**
- Upstream: Azure Blob Storage configuration
- Downstream: Org chart component, email service

---

#### Day 2 (continued): BA Creates User Stories

**Tom runs:**
```bash
/story team-artifacts/pbis/260119-pbi-employee-photo-upload.md
```

**Stories created:**

| Story | Points | Slice |
|-------|--------|-------|
| US-001: Upload photo from settings | 3 | Backend API + Frontend form |
| US-002: Display photo in profile | 2 | Frontend avatar component |
| US-003: Show photo in org chart | 2 | Org chart integration |
| US-004: Handle upload errors | 2 | Validation + error UI |

**Tom updates PBI status:** `approved`

---

#### Day 3: UX Creates Design Spec

**Sarah (UX Designer) runs:**
```bash
/design-spec team-artifacts/pbis/260119-pbi-employee-photo-upload.md
```

**Key components specified:**

```
Component: photo-upload
States: default, hover, dragging, uploading, success, error
Tokens: --spacing-md (16px), --color-border-default

+------------------------+
|   +----------------+   |
|   |   [Avatar]     |   |  default state
|   |   200x200      |   |
|   +----------------+   |
|   [Choose File]        |
|   JPG, PNG, WEBP - 5MB |
+------------------------+

Accessibility:
- Focus ring on upload button
- aria-label="Upload profile photo"
- Progress: aria-live="polite" for upload status
```

---

#### Day 4: QA Creates Test Spec

**Alex (QA Engineer) runs:**
```bash
/test-spec team-artifacts/pbis/260119-pbi-employee-photo-upload.md
```

**Test cases generated:**

| TC ID | Title | Type |
|-------|-------|------|
| TC-TAL-001 | Successful JPG upload | Positive |
| TC-TAL-002 | Successful PNG upload | Positive |
| TC-TAL-003 | Reject file > 5MB | Negative |
| TC-TAL-004 | Reject GIF format | Negative |
| TC-TAL-005 | Upload with slow network | Edge |
| TC-TAL-006 | Cancel mid-upload | Edge |
| TC-TAL-007 | Replace existing photo | Positive |

**Evidence example:**
```markdown
#### TC-TAL-003: Reject file > 5MB
- **Evidence:** `EmployeePhotoUploadCommand.cs:45`
```

```csharp
// Line 45
.And(_ => File.Size <= 5 * 1024 * 1024, "File exceeds 5MB limit")
```

---

#### Day 5: QC Runs Quality Gate

**Jordan (QC Specialist) runs:**
```bash
/quality-gate pre-dev team-artifacts/pbis/260119-pbi-employee-photo-upload.md
```

**Gate Report:**

| Criterion | Status | Notes |
|-----------|--------|-------|
| Acceptance criteria in GIVEN/WHEN/THEN | PASS | 3 scenarios |
| Out of scope defined | PASS | "Video uploads, GIF support" |
| Design spec approved | PASS | All states documented |
| Dependencies identified | PASS | Azure, org chart, email |

**Gate Status: PASS**

**Next:** Assign to Sprint 15 for implementation

---

## Cheat Sheet

Printable quick reference for daily use.

### Command Tree

```
team/
+-- CAPTURE
|   +-- /idea [title]              Capture new idea
|
+-- TRANSFORM
|   +-- /refine {idea}             Idea -> PBI
|   +-- /story {pbi}               PBI -> Stories
|   +-- /prioritize [framework]    Order backlog
|
+-- TEST
|   +-- /test-spec {pbi}           Generate test spec (includes test cases)
|   +-- /quality-gate {target}     Run QC checklist
|
+-- DESIGN
|   +-- /design-spec {source}      Create design spec
|
+-- REPORT
    +-- /status [scope]            Generate status report
    +-- /dependency [target]       Map dependencies
    +-- /team-sync [type]          Meeting agenda
```

### Role Quick Reference

| Role | Start With | Then | Output |
|------|------------|------|--------|
| PO | `/idea` | `/prioritize` | Ordered backlog |
| BA | `/refine` | `/story` | User stories w/ AC |
| QA | `/test-spec` | `/quality-gate` | TC-*-* test cases |
| QC | `/quality-gate` | - | PASS/FAIL report |
| UX | `/design-spec` | - | Component specs |
| PM | `/status` | `/dependency` | Sprint report |

### First Command by Role

```
PO -> /idea "..."          # Capture feature request
BA -> /refine {idea}       # Transform to PBI
QA -> /test-spec {pbi}     # Generate test spec
QC -> /quality-gate pre-*  # Run quality gate
UX -> /design-spec {pbi}   # Create design spec
PM -> /status sprint       # Generate status
```

### Workflow Triggers

| Say This | Activates | Sequence |
|----------|-----------|----------|
| "new idea" | idea-to-pbi | /idea -> /refine -> /story -> /prioritize |
| "test this pbi" | pbi-to-tests | /test-spec -> /quality-gate |
| "design spec for" | design-workflow | /design-spec -> /code-review |
| "status report" | pm-reporting | /status -> /dependency |

### Auto-Detection Keywords

```
idea-to-pbi:    "feature request", "backlog item", "capture idea"
pbi-to-tests:   "test cases from", "qa this", "test spec for"
design-workflow: "ui spec", "component spec", "design the"
pm-reporting:   "sprint status", "project update", "progress report"
```

### Artifact Paths

```
team-artifacts/
+-- ideas/           # Raw ideas (PO, Anyone)
+-- pbis/            # Product Backlog Items (BA, PO)
|   +-- stories/     # User stories (BA)
+-- test-specs/      # Test specifications (QA)
+-- design-specs/    # Design documentation (UX)
+-- qc-reports/      # Quality gate reports (QC)
+-- templates/       # Templates (read-only)
```

### Naming Pattern

```
{YYMMDD}-{role}-{type}-{slug}.md

Examples:
260119-po-idea-dark-mode.md
260119-ba-story-user-settings.md
260119-qa-testspec-login.md
```

### Common Patterns

**Feature from Scratch:**
```
/idea "..." -> /refine {idea} -> /story {pbi} -> /design-spec {pbi} -> /test-spec {pbi}
```

**Sprint Prep:**
```
/prioritize rice -> /quality-gate pre-dev {pbi} -> /team-sync sprint-planning
```

**End of Day:**
```
/status sprint -> /dependency all
```

**Before Demo:**
```
/quality-gate pre-release -> /team-sync sprint-review
```

### Framework Quick Ref

| Framework | Use When | Formula/Categories |
|-----------|----------|-------------------|
| RICE | Data-driven | (Reach x Impact x Confidence) / Effort |
| MoSCoW | Release planning | Must/Should/Could/Won't |
| Value-Effort | Quick triage | High-High, High-Low, Low-High, Low-Low |

---

## Troubleshooting

### Command Not Found

**Error:** `Command '/idea' not found`

**Fix:**
1. Verify skills exist: `ls .claude/skills/team-*/`
2. Check skill file has YAML frontmatter
3. Restart Claude Code: `claude --restart`

---

### Artifact Path Error

**Error:** `Cannot find artifact: team-artifacts/ideas/...`

**Fix:**
1. Check file exists: `ls team-artifacts/ideas/`
2. Verify naming format: `{YYMMDD}-{role}-{type}-{slug}.md`
3. Use tab completion for paths

---

### Workflow Not Triggering

**Error:** Saying "new idea" doesn't start idea-to-pbi workflow

**Fix:**
1. Check workflows.json exists: `cat .claude/workflows.json`
2. Verify `triggerPatterns` array includes your phrase
3. Use explicit command: `/idea "..."` instead of natural language

---

### Quality Gate Fails

**Error:** Gate status: FAIL

**Common Causes:**
- Missing GIVEN/WHEN/THEN in acceptance criteria
- Test cases without TC-{MOD}-{NNN} IDs
- No Evidence field in test cases
- Dependencies not documented

**Fix:** Review gate report and address each failed criterion

---

### Test Case ID Conflict

**Error:** Duplicate TC-TAL-001 found

**Fix:**
1. Use unique module codes: TAL (Talents), GRO (Growth), SUR (Surveys)
2. Increment sequence within module
3. Check existing specs: `grep -r "TC-TAL" team-artifacts/test-specs/`

---

### Skill Not Loading

**Error:** PO skill not activating

**Fix:**
1. Check SKILL.md exists: `ls .claude/skills/product-owner/`
2. Verify `infer: true` in frontmatter
3. Check `description` matches your context
4. Manually invoke: `/product-owner`

---

### Artifact Template Missing

**Error:** Template not found for idea

**Fix:**
1. Check templates: `ls team-artifacts/templates/`
2. Expected files: `idea-template.md`, `pbi-template.md`, `test-spec-template.md`
3. Regenerate: Copy from `.claude/skills/*/templates/`

---

### Hook Not Executing

**Error:** Role context not injected

**Fix:**
1. Check hooks exist: `ls .claude/hooks/`
2. Verify hook is executable (has shebang line)
3. Check hook output: Run manually in terminal
4. Review `.claude/settings.local.json` for hook config

---

## Source Files

| Component | Location |
|-----------|----------|
| Skills | `.claude/skills/{role}/SKILL.md` |
| Skills | `.claude/skills/team-*/SKILL.md` |
| Workflows | `.claude/workflows.json` |
| Templates | `team-artifacts/templates/` |
| Hooks | `.claude/hooks/` |

---

**Need help?** Run `/help` or check [Claude Code documentation](https://claude.com/claude-code).
