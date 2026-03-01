# Team Collaboration Guide

> How Product Owners, Business Analysts, QA Engineers, QC Specialists, UX Designers, and Project Managers collaborate through Claude Code's workflow system.

**Version:** 2.0 | **Last Updated:** 2026-03-07

---

## Quick Navigation

| Section                                       | Audience  | Purpose                        |
| --------------------------------------------- | --------- | ------------------------------ |
| [How It Works](#how-it-works)                 | All Roles | Understand the workflow system |
| [Quick Start](#quick-start-by-role)           | All Roles | First success in 2 minutes     |
| [Skills Reference](#skills-reference-by-role) | All Roles | Key skills with examples       |
| [Workflows](#workflow-tutorials)              | All Roles | End-to-end process flows       |
| [Role Handoffs](#role-handoff-workflows)      | All Roles | Cross-role collaboration       |
| [Real-World Example](#real-world-example)     | All Roles | Employee Photo Upload feature  |
| [Cheat Sheet](#cheat-sheet)                   | All Roles | Printable quick reference      |
| [Troubleshooting](#troubleshooting)           | All Roles | Common issues and fixes        |

---

## How It Works

Claude Code uses a **three-pillar architecture** to assist every role:

| Pillar                        | What It Does                                                     | Count        |
| ----------------------------- | ---------------------------------------------------------------- | ------------ |
| **Hooks** (Enforcement)       | Auto-inject context, enforce quality gates, block unsafe actions | 34 hooks     |
| **Skills** (Intelligence)     | Prompt-engineered protocols loaded on demand via `/skill-name`   | 176+ skills  |
| **Workflows** (Orchestration) | Multi-step sequences of skills with progress tracking            | 46 workflows |

### Workflow Detection

When you describe what you want to do, Claude automatically:

1. **Detects** the best-matching workflow from the catalog
2. **Asks you** to confirm activation or execute directly
3. **Creates tasks** for every step and tracks progress
4. **Executes** each step in sequence

You never need to memorize workflow names — just describe your intent.

### Context Injection

Hooks automatically inject relevant project knowledge (backend patterns, frontend patterns, design tokens, code review rules, learned lessons) whenever Claude reads or edits files. No manual loading needed.

---

## Before You Start

1. **Claude Code installed** — Verify with `claude --version`
2. **Project configured** — `docs/project-config.json` exists
3. **Know where outputs go:**
    - Plans and reports: `plans/` and `plans/reports/`
    - Documentation: `docs/`
    - Design specs, test specs: within `docs/` or `plans/`

---

## Quick Start by Role

### Product Owner: Capture to Prioritize

**Goal:** Feature idea captured and prioritized in backlog

1. **Capture an idea**

    ```
    /idea "Allow employees to upload profile photos"
    ```

2. **Refine to PBI**

    ```
    /refine {idea-file-path}
    ```

    Creates PBI with GIVEN/WHEN/THEN acceptance criteria

3. **Prioritize backlog**
    ```
    /prioritize rice
    ```
    Scores and orders PBIs using RICE, MoSCoW, or Value-Effort framework

**Workflow trigger:** Say "new feature idea" or "backlog item" → activates **idea-to-pbi** workflow

---

### Business Analyst: Refine to Stories

**Goal:** PBI broken into testable user stories

1. **Refine idea into PBI**

    ```
    /refine {idea-file-path}
    ```

2. **Create user stories**

    ```
    /story {pbi-file-path}
    ```

    Slices PBI into vertical stories meeting INVEST criteria

3. **Hand off to development**
    ```
    /handoff
    ```
    Creates structured handoff record with context for developers

**Workflow trigger:** Say "refine this idea" → activates **idea-to-pbi** or **po-ba-handoff** workflow

---

### QA Engineer: PBI to Test Cases

**Goal:** Test specification with executable test cases

1. **Generate test spec from PBI**

    ```
    /tdd-spec {pbi-or-feature-doc}
    ```

    Creates test specs with `TC-{FEATURE}-{NNN}` IDs in unified format

2. **Generate integration tests from specs**

    ```
    /integration-test
    ```

3. **Run quality gate**
    ```
    /quality-gate pre-qa
    ```

**Workflow trigger:** Say "test cases from PBI" → activates **pbi-to-tests** workflow

---

### UX Designer: Requirements to Design Spec

**Goal:** Component specification ready for handoff

1. **Create design spec**

    ```
    /design-spec {pbi-or-requirements}
    ```

    Generates component inventory, states, token mappings, accessibility checklist

2. **Review against design system**
   Spec auto-maps to tokens in `docs/project-reference/design-system/`

3. **Hand off to development**
    ```
    /handoff
    ```

**Workflow trigger:** Say "design spec for" → activates **design-workflow**

---

### QC Specialist: Quality Gates

**Goal:** Verify artifacts meet quality standards before handoffs

1. **Run quality gate**

    ```
    /quality-gate pre-dev {artifact-path}
    /quality-gate pre-qa {artifact-path}
    /quality-gate pre-release
    ```

2. **Review artifact quality**
    ```
    /review-artifact {artifact-path}
    ```

**Workflow trigger:** Say "quality check" → activates **qa-po-acceptance** or **pre-development** workflow

---

### Project Manager: Track and Report

**Goal:** Status reports with blockers and dependencies

1. **Generate status report**

    ```
    /status sprint
    ```

2. **Check dependencies**

    ```
    /dependency all
    ```

3. **Prepare team sync**

    ```
    /team-sync daily
    ```

4. **Run sprint retrospective**
    ```
    /retro
    ```

**Workflow trigger:** Say "status report" → activates **pm-reporting** workflow

---

## Skills Reference by Role

### Capture & Requirements

| Skill               | Purpose                                  | Example                    |
| ------------------- | ---------------------------------------- | -------------------------- |
| `/idea`             | Capture raw idea                         | `/idea "Dark mode toggle"` |
| `/refine`           | Transform idea into PBI with AC          | `/refine {idea-file}`      |
| `/story`            | Break PBI into user stories (INVEST)     | `/story {pbi-file}`        |
| `/prioritize`       | Order backlog (RICE/MoSCoW/Value-Effort) | `/prioritize rice`         |
| `/product-owner`    | PO decision support                      | `/product-owner`           |
| `/business-analyst` | BA analysis support                      | `/business-analyst`        |

### Testing & Quality

| Skill               | Purpose                                  | Example                   |
| ------------------- | ---------------------------------------- | ------------------------- |
| `/tdd-spec`         | Generate test specs (TC-{FEATURE}-{NNN}) | `/tdd-spec {feature-doc}` |
| `/test-spec`        | Generate test cases from PBI             | `/test-spec {pbi-file}`   |
| `/integration-test` | Generate integration tests from specs    | `/integration-test`       |
| `/e2e-test`         | Generate E2E tests                       | `/e2e-test`               |
| `/quality-gate`     | Run quality checklist                    | `/quality-gate pre-dev`   |
| `/test`             | Run and analyze tests                    | `/test`                   |

### Design & Frontend

| Skill                    | Purpose                              | Example                   |
| ------------------------ | ------------------------------------ | ------------------------- |
| `/design-spec`           | Create UI/UX design specification    | `/design-spec {pbi-file}` |
| `/frontend-design`       | Production-grade frontend interfaces | `/frontend-design`        |
| `/ui-ux-pro-max`         | Advanced UI/UX design intelligence   | `/ui-ux-pro-max`          |
| `/web-design-guidelines` | WCAG 2.2, responsive, best practices | `/web-design-guidelines`  |

### Process & Collaboration

| Skill         | Purpose                           | Example            |
| ------------- | --------------------------------- | ------------------ |
| `/handoff`    | Structured handoff between roles  | `/handoff`         |
| `/acceptance` | PO acceptance decision flow       | `/acceptance`      |
| `/retro`      | Sprint retrospective facilitation | `/retro`           |
| `/status`     | Generate status report            | `/status sprint`   |
| `/dependency` | Map feature dependencies          | `/dependency all`  |
| `/team-sync`  | Meeting agenda generation         | `/team-sync daily` |

### Planning & Investigation

| Skill          | Purpose                    | Example                  |
| -------------- | -------------------------- | ------------------------ |
| `/plan`        | Create implementation plan | `/plan {description}`    |
| `/scout`       | Codebase reconnaissance    | `/scout {area}`          |
| `/investigate` | Deep code investigation    | `/investigate {feature}` |
| `/code-review` | Review code quality        | `/code-review`           |

---

## Workflow Tutorials

### Workflow 1: Idea to PBI (`idea-to-pbi`)

**Trigger:** "new idea", "feature request", "backlog item"
**Roles:** Product Owner, Business Analyst
**Steps:** `/idea` → `/refine` → `/story` → `/prioritize`

```
PO:  /idea ──→ [idea captured] ──→ /prioritize ──→ [backlog ordered]
                     │
BA:             /refine ──→ [PBI with AC] ──→ /story ──→ [user stories]
```

---

### Workflow 2: PBI to Tests (`pbi-to-tests`)

**Trigger:** "test cases from PBI", "qa this"
**Roles:** QA Engineer, QC Specialist
**Steps:** `/tdd-spec` → `/quality-gate`

```
QA:  [PBI] ──→ /tdd-spec ──→ [test spec with TC-{FEAT}-{NNN}]
                                        │
QC:                              /quality-gate ──→ [PASS/FAIL report]
```

**Quality gate criteria (pre-QA):**

- All test cases have `TC-{FEATURE}-{NNN}` IDs
- At least 3 categories: positive, negative, edge
- Evidence fields link to code (`file:line`)

---

### Workflow 3: Design Workflow (`design-workflow`)

**Trigger:** "ui spec", "component spec", "design the"
**Roles:** UX Designer, Developer
**Steps:** `/design-spec` → `/code-review`

```
UX:   [PBI] ──→ /design-spec ──→ [component spec + states + tokens]
                                        │
Dev:                             /code-review ──→ Implementation
```

**Design spec checklist:**

- All states: default, hover, active, disabled, error, loading
- Design tokens mapped (no hardcoded values)
- BEM classes defined
- Accessibility requirements (WCAG 2.2)

---

### Workflow 4: PM Reporting (`pm-reporting`)

**Trigger:** "status report", "sprint update"
**Roles:** Project Manager
**Steps:** `/status` → `/dependency`

```
PM:  /status sprint ──→ [status report]
     /dependency all ──→ [dependency map]
     /team-sync daily ──→ [meeting agenda]
```

| Report Type   | Command                    |
| ------------- | -------------------------- |
| Daily         | `/status sprint`           |
| Weekly        | `/status project`          |
| Feature       | `/status feature-{name}`   |
| Sprint Review | `/team-sync sprint-review` |
| Retrospective | `/retro`                   |

---

### Workflow 5: TDD Feature (`tdd-feature`)

**Trigger:** "test-first", "TDD", "spec-driven"
**Roles:** Developer, QA
**Steps:** `/scout` → `/investigate` → `/tdd-spec` → `/plan` → `/cook` → `/integration-test` → `/test` → `/docs-update`

Test specs are written **before** implementation, then code is written to satisfy them.

---

## Role Handoff Workflows

Claude provides structured handoff workflows to ensure clean transitions between roles:

| Workflow                 | From → To | Trigger                 | Steps                                                                                         |
| ------------------------ | --------- | ----------------------- | --------------------------------------------------------------------------------------------- |
| `po-ba-handoff`          | PO → BA   | "hand off to BA"        | `/idea` → `/review-artifact` → `/handoff` → `/refine` → `/story`                              |
| `ba-dev-handoff`         | BA → Dev  | "ready for development" | `/review-artifact` → `/quality-gate` → `/handoff` → `/plan` → `/plan-review`                  |
| `design-dev-handoff`     | UX → Dev  | "design ready for dev"  | `/design-spec` → `/review-artifact` → `/handoff` → `/plan`                                    |
| `dev-qa-handoff`         | Dev → QA  | "ready for testing"     | `/handoff` → `/test-spec`                                                                     |
| `qa-po-acceptance`       | QA → PO   | "testing complete"      | `/quality-gate` → `/handoff` → `/acceptance`                                                  |
| `full-feature-lifecycle` | All       | "full lifecycle"        | `/idea` → `/refine` → `/story` → `/design-spec` → `/plan` → `/cook` → `/test` → `/acceptance` |

Each handoff creates a **structured record** with context, status, and next actions so the receiving role has full visibility.

---

## Real-World Example

### Employee Photo Upload Feature

**Scenario:** HR wants employees to upload profile photos visible in org charts, directories, and emails.

**Constraints:** Max 5MB, JPG/PNG/WEBP, 200x200px avatar, Azure Blob Storage.

---

#### Day 1: PO Captures the Idea

**Maria (PO):**

```
/idea "Employee profile photo upload for org charts and directories"
```

Claude creates a structured idea document with problem statement, target users, and business value. Maria reviews and marks it ready for BA refinement.

---

#### Day 2: BA Refines and Creates Stories

**Tom (BA):**

```
/refine {idea-file}
```

Claude generates PBI with GIVEN/WHEN/THEN acceptance criteria:

```gherkin
Scenario: Successful photo upload
  Given employee is on profile settings page
  When employee selects a JPG file under 5MB and clicks "Upload"
  Then photo is displayed as 200x200 avatar
  And success message appears

Scenario: Oversized file rejected
  Given employee is on profile settings page
  When employee selects a file over 5MB
  Then error message "File exceeds 5MB limit" appears

Scenario: Invalid format rejected
  When employee selects a GIF file
  Then error message "Only JPG, PNG, WEBP allowed" appears
```

Then Tom creates stories:

```
/story {pbi-file}
```

| Story                              | Points | Slice                       |
| ---------------------------------- | ------ | --------------------------- |
| US-001: Upload photo from settings | 3      | Backend API + Frontend form |
| US-002: Display photo in profile   | 2      | Frontend avatar component   |
| US-003: Show photo in org chart    | 2      | Org chart integration       |
| US-004: Handle upload errors       | 2      | Validation + error UI       |

---

#### Day 3: UX Creates Design Spec

**Sarah (UX):**

```
/design-spec {pbi-file}
```

Claude generates component spec with all states (default, hover, dragging, uploading, success, error), design token mappings, BEM classes, and accessibility requirements (focus ring, aria-labels, aria-live for progress).

---

#### Day 4: QA Creates Test Spec

**Alex (QA):**

```
/tdd-spec {pbi-file}
```

Test cases with unified IDs:

| TC ID      | Title                    | Type     |
| ---------- | ------------------------ | -------- |
| TC-TAL-001 | Successful JPG upload    | Positive |
| TC-TAL-002 | Successful PNG upload    | Positive |
| TC-TAL-003 | Reject file > 5MB        | Negative |
| TC-TAL-004 | Reject GIF format        | Negative |
| TC-TAL-005 | Upload with slow network | Edge     |
| TC-TAL-006 | Cancel mid-upload        | Edge     |
| TC-TAL-007 | Replace existing photo   | Positive |

Each case includes `Evidence: {file}:{line}` linking to implementation code.

---

#### Day 5: QC Runs Quality Gate

**Jordan (QC):**

```
/quality-gate pre-dev {pbi-file}
```

| Criterion                              | Status |
| -------------------------------------- | ------ |
| Acceptance criteria in GIVEN/WHEN/THEN | PASS   |
| Out of scope defined                   | PASS   |
| Design spec approved                   | PASS   |
| Dependencies identified                | PASS   |
| Test cases have TC IDs                 | PASS   |

**Gate Status: PASS** — Assign to sprint for implementation.

---

## Cheat Sheet

### Skill Tree by Category

```
CAPTURE & REQUIREMENTS
  /idea [title]              Capture new idea
  /refine {source}           Idea -> PBI with AC
  /story {pbi}               PBI -> User stories
  /prioritize [framework]    Order backlog (rice|moscow|value-effort)

TESTING & QUALITY
  /tdd-spec {source}         Generate test specs (TC-{FEAT}-{NNN})
  /test-spec {pbi}           Generate test cases
  /integration-test          Generate integration tests
  /e2e-test                  Generate E2E tests
  /quality-gate {type}       Run quality checklist (pre-dev|pre-qa|pre-release)
  /test                      Run and analyze tests

DESIGN
  /design-spec {source}      Create design specification

PROCESS
  /handoff                   Structured role handoff
  /acceptance                PO acceptance decision
  /retro                     Sprint retrospective
  /status [scope]            Status report (sprint|project|feature-*)
  /dependency [target]       Map dependencies
  /team-sync [type]          Meeting agenda (daily|weekly|sprint-review)

PLANNING
  /plan {description}        Create implementation plan
  /scout {area}              Codebase reconnaissance
  /investigate {feature}     Deep code investigation
```

### Role Quick Reference

| Role | Primary Skills                                   | Workflow         |
| ---- | ------------------------------------------------ | ---------------- |
| PO   | `/idea`, `/prioritize`, `/acceptance`            | idea-to-pbi      |
| BA   | `/refine`, `/story`, `/handoff`                  | po-ba-handoff    |
| QA   | `/tdd-spec`, `/integration-test`, `/test`        | pbi-to-tests     |
| QC   | `/quality-gate`, `/review-artifact`              | qa-po-acceptance |
| UX   | `/design-spec`, `/frontend-design`               | design-workflow  |
| PM   | `/status`, `/dependency`, `/team-sync`, `/retro` | pm-reporting     |

### Workflow Quick Triggers

| Say This                          | Activates              | Sequence                                            |
| --------------------------------- | ---------------------- | --------------------------------------------------- |
| "new idea" / "feature request"    | idea-to-pbi            | /idea → /refine → /story → /prioritize              |
| "test this PBI" / "test cases"    | pbi-to-tests           | /tdd-spec → /quality-gate                           |
| "design spec for"                 | design-workflow        | /design-spec → /code-review                         |
| "status report" / "sprint update" | pm-reporting           | /status → /dependency                               |
| "ready for dev"                   | ba-dev-handoff         | /review-artifact → /quality-gate → /handoff → /plan |
| "ready for testing"               | dev-qa-handoff         | /handoff → /test-spec                               |
| "testing complete"                | qa-po-acceptance       | /quality-gate → /handoff → /acceptance              |
| "TDD" / "test-first"              | tdd-feature            | /tdd-spec → /plan → /cook → /test                   |
| "full lifecycle"                  | full-feature-lifecycle | /idea → ... → /acceptance                           |

### Common Patterns

**Feature from scratch:**

```
/idea → /refine → /story → /design-spec → /tdd-spec → /plan → /cook → /test
```

**Sprint prep:**

```
/prioritize rice → /quality-gate pre-dev → /team-sync sprint-planning
```

**End of day:**

```
/status sprint → /dependency all
```

**Before demo:**

```
/quality-gate pre-release → /team-sync sprint-review
```

**Sprint close:**

```
/retro → /status project
```

---

## Troubleshooting

### Workflow Not Activating

**Symptom:** Describing your intent doesn't trigger workflow detection.

**Fix:**

1. Use explicit skill command: `/idea "..."` instead of natural language
2. Check `workflows.json`: `cat .claude/workflows.json`
3. Claude should always detect and ask — if it doesn't, remind it: "Check workflow catalog"

---

### Quality Gate Fails

**Common causes:**

- Missing GIVEN/WHEN/THEN in acceptance criteria
- Test cases without `TC-{FEATURE}-{NNN}` IDs
- No Evidence field in test cases
- Dependencies not documented

**Fix:** Review the gate report and address each failed criterion.

---

### Context Not Injected

**Symptom:** Claude doesn't seem to know project patterns.

**Fix:**

1. Verify `docs/project-config.json` exists and has correct paths
2. Check hooks are registered: review `.claude/settings.json`
3. Context is auto-injected — no manual action needed if hooks are configured

---

### Handoff Missing Context

**Symptom:** Receiving role doesn't have enough information.

**Fix:**

1. Use `/handoff` skill explicitly — it creates structured records
2. Ensure the sending role's artifacts are complete before handoff
3. Run `/quality-gate` before handoff to verify completeness

---

## Source Files

| Component       | Location                                            |
| --------------- | --------------------------------------------------- |
| Skills          | `.claude/skills/{skill-name}/SKILL.md`              |
| Workflows       | `.claude/workflows.json`                            |
| Hooks           | `.claude/hooks/`                                    |
| Agents          | `.claude/agents/`                                   |
| Configuration   | `.claude/settings.json`, `docs/project-config.json` |
| Framework Guide | `.claude/docs/claude-ai-agent-framework-guide.md`   |

---

**Need help?** Run `/help` or check [Claude Code documentation](https://claude.com/claude-code).
