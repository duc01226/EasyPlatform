# Team Collaboration Guide

> How Product Owners, Business Analysts, QA Engineers, QC Specialists, UX Designers, and Project Managers collaborate through Claude Code's workflow system.

**Version:** 2.1 | **Last Updated:** 2026-06-11

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

| Pillar                        | What It Does                                                          | Count                   |
| ----------------------------- | --------------------------------------------------------------------- | ----------------------- |
| **Hooks** (Enforcement)       | Enforce quality gates, block unsafe actions, manage session lifecycle | 15 top-level hook files |
| **Skills** (Intelligence)     | Prompt-engineered protocols loaded on demand via `/skill-name`        | 156 skills              |
| **Workflows** (Orchestration) | Multi-step sequences of skills with progress tracking                 | 17 workflows            |

### Workflow Detection

When you describe what you want to do, Claude automatically:

1. **Detects** the best-matching workflow from the catalog
2. **Auto-selects** the best path and activates it (no confirmation step)
3. **Creates tasks** for every step and tracks progress
4. **Executes** each step in sequence

You never need to memorize workflow names — just describe your intent.

### Project Knowledge (Static Embedding)

Project knowledge — backend/frontend patterns, design tokens, code-review rules, learned lessons — lives **statically** in `CLAUDE.md`, the agent definitions, and the skills, plus the reference docs under `docs/project-reference/`. Skills and agents read the relevant doc on demand. Because the guidance is embedded rather than injected at runtime, every harness — Claude, Codex — sees identical instructions with no hook dependency.

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

**Workflow trigger:** Say "refine this idea" → activates **idea-to-pbi** workflow

---

### QA Engineer: PBI to Test Cases

**Goal:** Test specification with executable test cases

1. **Generate test spec from PBI**

    ```
    /spec [mode=tests] {pbi-or-feature-doc}
    ```

    Creates test specs with `TC-{FEATURE}-{NNN}` IDs in unified format

2. **Generate integration tests from specs**

    ```
    /integration-test
    ```

3. **Run quality gate**
    ```
    /quality-gate-review pre-qa
    ```

**Workflow trigger:** Say "test cases from PBI" → runs `/spec [mode=tests]` directly (the former pbi-to-tests workflow was merged into the `spec` skill); for full test authoring with generated test code, use the **write-integration-test** workflow

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

**Workflow trigger:** Say "design spec for" → runs **/design-spec** then **/interface-design** (or **/frontend-design**)

---

### QC Specialist: Quality Gates

**Goal:** Verify artifacts meet quality standards before handoffs

1. **Run quality gate**

    ```
    /quality-gate-review pre-dev {artifact-path}
    /quality-gate-review pre-qa {artifact-path}
    /quality-gate-review pre-release
    ```

2. **Review artifact quality**
    ```
    /review-artifact {artifact-path}
    ```

**Workflow trigger:** Say "quality check" → run `/quality-gate-review` directly

---

### Project Manager: Track and Report

**Goal:** Status reports with blockers and dependencies

1. **Generate status report**

    ```
    /project-manager
    ```

    Aggregates sprint progress, blockers, and velocity using the report templates

2. **Check dependencies**
    ```
    /dependency all
    ```

**Workflow trigger:** Say "track dependencies" → run `/dependency` directly

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

| Skill                  | Purpose                                  | Example                            |
| ---------------------- | ---------------------------------------- | ---------------------------------- |
| `/spec [mode=tests]`   | Generate test specs (TC-{FEATURE}-{NNN}) | `/spec [mode=tests] {feature-doc}` |
| `/integration-test`    | Generate integration tests from specs    | `/integration-test`                |
| `/e2e-test`            | Generate E2E tests                       | `/e2e-test`                        |
| `/quality-gate-review` | Run quality checklist                    | `/quality-gate-review pre-dev`     |
| `/test`                | Run and analyze tests                    | `/test`                            |

### Design & Frontend

| Skill                    | Purpose                              | Example                   |
| ------------------------ | ------------------------------------ | ------------------------- |
| `/design-spec`           | Create UI/UX design specification    | `/design-spec {pbi-file}` |
| `/frontend-design`       | Production-grade frontend interfaces | `/frontend-design`        |
| `/ui-ux-pro-max`         | Advanced UI/UX design intelligence   | `/ui-ux-pro-max`          |
| `/web-design-guidelines` | WCAG 2.2, responsive, best practices | `/web-design-guidelines`  |

### Process & Collaboration

| Skill              | Purpose                                    | Example            |
| ------------------ | ------------------------------------------ | ------------------ |
| `/dependency`      | Map feature dependencies                   | `/dependency all`  |
| `/project-manager` | Status reports, dependency & risk tracking | `/project-manager` |

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
**IMPORTANT MANDATORY Steps:** `/idea` → `/refine` → `/story` → `/prioritize`

```
PO:  /idea ──→ [idea captured] ──→ /prioritize ──→ [backlog ordered]
                     │
BA:             /refine ──→ [PBI with AC] ──→ /story ──→ [user stories]
```

---

### Workflow 2: PBI to Tests (`/spec [mode=tests]` + `/quality-gate-review`)

**Trigger:** "test cases from PBI", "qa this"
**Roles:** QA Engineer, QC Specialist
**IMPORTANT MANDATORY Steps:** `/spec [mode=tests]` → `/quality-gate-review` (skill chain — for generated test code, use the **write-integration-test** workflow)

```
QA:  [PBI] ──→ /spec [mode=tests] → [test spec with TC-{FEATURE}-{NNN}]
                                        │
QC:                              /quality-gate-review ──→ [PASS/FAIL report]
```

**Quality gate criteria (pre-QA):**

- All test cases have `TC-{FEATURE}-{NNN}` IDs
- At least 5 categories: positive, negative, edge, authorization, and invariant/property (≥1 universally-quantified property TC + boundary counter-case per [HARD] rule / §5 invariant — see `.claude/skills/shared/tc-format.md`)
- Evidence fields use `[Source: namespace/service/id]` abstract anchors (stack-portable — never `file:line`)

---

### Workflow 3: Design (`/design-spec` → `/interface-design` or `/frontend-design`)

**Trigger:** "ui spec", "component spec", "design the", "landing page", "screenshot"
**Roles:** UX Designer, Developer
**IMPORTANT MANDATORY Steps:** `/design-spec` → `/interface-design` | `/frontend-design` → `/code-review`

```
UX:   [PBI] ──→ /design-spec ──→ [component spec + states + tokens]
                                        │
                              DESIGN IMPLEMENTATION GATE:
                              Product UIs → /interface-design
                              Marketing/Creative → /frontend-design
                                        │
Dev:                             /code-review ──→ Implementation
```

**Design spec checklist:**

- All states: default, hover, active, disabled, error, loading
- Design tokens mapped (no hardcoded values)
- BEM classes defined
- Accessibility requirements (WCAG 2.2)

---

### Workflow 4: Spec-Driven Feature (`feature`)

**Trigger:** "test-first", "TDD", "spec-driven" (the former tdd-feature workflow was merged into `feature`)
**Roles:** Developer, QA
**IMPORTANT MANDATORY Steps (abridged):** `/scout` → `/investigate` → `/plan` → `/spec [mode=tests]` → `/feature-implement` → `/integration-test` → `/test` → `/docs-update`

Test specs are written **before** implementation, then code is written to satisfy them.

---

## Cross-Role Workflows

Claude provides end-to-end workflows that span multiple roles:

| Workflow              | Roles | Trigger          | Steps                                                                        |
| --------------------- | ----- | ---------------- | ---------------------------------------------------------------------------- |
| `idea-to-pbi` (PO→BA) | PO→BA | "hand off to BA" | `/idea` → `/review-artifact` → `/refine` → `/story` (conditional first step) |

Each workflow tracks progress across roles so the next role has full visibility into upstream artifacts.

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
/spec [mode=tests] {pbi-file}
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

Each case includes an Evidence field using `[Source: namespace/service/id]` abstract anchors (stack-portable — never `file:line`).

---

#### Day 5: QC Runs Quality Gate

**Jordan (QC):**

```
/quality-gate-review pre-dev {pbi-file}
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
  /spec [mode=tests] {source}  Generate test specs (TC-{FEATURE}-{NNN})
  /integration-test          Generate integration tests
  /e2e-test                  Generate E2E tests
  /quality-gate-review {type}       Run quality checklist (pre-dev|pre-qa|pre-release)
  /test                      Run and analyze tests

DESIGN
  /design-spec {source}      Create design specification

PROCESS
  /dependency [target]       Map dependencies
  /project-manager           Status reports, dependency & risk tracking

PLANNING
  /plan {description}        Create implementation plan
  /scout {area}              Codebase reconnaissance
  /investigate {feature}     Deep code investigation
```

### Role Quick Reference

| Role | Primary Skills                                     | Workflow               |
| ---- | -------------------------------------------------- | ---------------------- |
| PO   | `/idea`, `/prioritize`                             | idea-to-pbi            |
| BA   | `/refine`, `/story`                                | idea-to-pbi            |
| QA   | `/spec [mode=tests]`, `/integration-test`, `/test` | write-integration-test |
| QC   | `/quality-gate-review`, `/review-artifact`         | —                      |
| UX   | `/design-spec`, `/frontend-design`                 | —                      |
| PM   | `/project-manager`, `/dependency`                  | —                      |

### Workflow Quick Triggers

| Say This                       | Activates                    | Sequence                                                |
| ------------------------------ | ---------------------------- | ------------------------------------------------------- |
| "new idea" / "feature request" | idea-to-pbi                  | /idea → /refine → /story → /prioritize                  |
| "test this PBI" / "test cases" | `/spec [mode=tests]` (skill) | /spec [mode=tests] → /quality-gate-review               |
| "design spec for"              | `/design-spec`               | /design-spec → /interface-design                        |
| "TDD" / "test-first"           | feature                      | /plan → /spec [mode=tests] → /feature-implement → /test |

### Common Patterns

**Feature from scratch:**

```
/idea → /refine → /story → /design-spec → /spec [mode=tests] → /plan → /feature-implement → /test
```

**Sprint prep:**

```
/prioritize rice → /quality-gate-review pre-dev
```

**End of day:**

```
/project-manager → /dependency all
```

**Before demo:**

```
/quality-gate-review pre-release
```

---

## Troubleshooting

### Workflow Not Activating

**Symptom:** Describing your intent doesn't trigger workflow detection.

**Fix:**

1. Use explicit skill command: `/idea "..."` instead of natural language
2. Check `workflows.json`: `cat .claude/workflows.json`
3. Claude should auto-detect and activate the matching workflow — if it doesn't, remind it: "Check workflow catalog"

---

### Quality Gate Fails

**Common causes:**

- Missing GIVEN/WHEN/THEN in acceptance criteria
- Test cases without `TC-{FEATURE}-{NNN}` IDs
- No Evidence field in test cases
- Dependencies not documented

**Fix:** Review the gate report and address each failed criterion.

---

### Agent Doesn't Know Project Patterns

**Symptom:** Claude/Codex doesn't seem to know project patterns.

**Fix:**

1. Verify `docs/project-config.json` exists and points at the reference docs
2. Confirm the relevant `docs/project-reference/*` docs are populated — run the matching `/scan-*` if stale or empty
3. Project guidance is read on demand from those docs + `CLAUDE.md`; there is no runtime injection, so a missing or empty doc means the agent won't see it

---

### Handoff Missing Context

**Symptom:** Receiving role doesn't have enough information.

**Fix:**

1. Ensure the sending role's artifacts (idea, PBI, story, design spec, test spec) are complete and saved before the next role picks up
2. Run `/quality-gate-review` to verify artifact completeness before the transition
3. Use `/review-artifact` to validate quality of the upstream artifact

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
