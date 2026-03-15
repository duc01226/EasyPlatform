# Skills Reference

> 231 skills across 15+ domains + 3 shared modules for context-aware AI assistance

## Overview

Skills are **automatically activated** based on context keywords in your conversation. Unlike commands (which require `/` prefix), skills enhance Claude's responses without explicit invocation.

```
User: "I need to fix a bug in the employee validation"
       ↓
Skill Detection: "fix", "employee", "validation"
       ↓
Skills Activated: fix, feature-investigation
```

## How Skills Work

1. **Detection**: Claude analyzes your message for trigger keywords
2. **Activation**: Matching skills are loaded into context
3. **Enhancement**: Skill knowledge guides the response

## Skill Domains

| Domain                                            | Skills | Description                                          |
| ------------------------------------------------- | ------ | ---------------------------------------------------- |
| [Development - Backend](#development---backend)   | 1      | API design patterns                                  |
| [Development - Frontend](#development---frontend) | 3      | Components, forms, state, styling, design            |
| [Architecture](#architecture)                     | 5      | Cross-service, performance, security                 |
| [Debugging/Testing](#debuggingtesting)            | 3      | Test generation, test specs                          |
| [AI/ML Tools](#aiml-tools)                        | 4      | Prompts, multimodal, agents                          |
| [Documentation](#documentation)                   | 6      | Docs, feature docs, changelogs, release notes        |
| [Git/Workflow](#gitworkflow)                      | 6      | Commits, branches, code review, scout, quality gates |
| [Planning/Research](#planningresearch)            | 6      | Plans, research, implementation, investigation       |
| [Infrastructure/DevOps](#infrastructuredevops)    | 5      | Cloudflare, Docker, MCP                              |
| [Context/Memory](#contextmemory)                  | 6      | Optimization, persistence, learning                  |
| [Team Collaboration](#team-collaboration)         | 13     | PO, BA, QA, QC, UX, PM roles, prioritization         |
| [Web/Frameworks](#webframeworks)                  | 2      | Package updates, markdown                            |
| [Document Processing](#document-processing)       | 4      | PDF, DOCX, Markdown conversions                      |
| [Utility](#utility)                               | 2      | Claude Code CLI, skill creation                      |

**Additional:** Shared Modules (3) -- see [Shared Modules](#shared-modules)

---

## Development - Backend

| Skill        | Triggers                                | Description                  |
| ------------ | --------------------------------------- | ---------------------------- |
| `api-design` | REST, controller, route, HTTP, endpoint | API endpoint design patterns |

See `docs/project-reference/backend-patterns-reference.md` for project-specific backend patterns.

---

## Development - Frontend

| Skill                   | Triggers                           | Description          |
| ----------------------- | ---------------------------------- | -------------------- |
| `frontend-design`       | UI, design, screenshot             | UI implementation    |
| `ui-ux-pro-max`         | UX, design system                  | Advanced UX          |
| `web-design-guidelines` | accessibility, WCAG, visual review | UI compliance review |

See `docs/project-reference/frontend-patterns-reference.md` for project-specific frontend patterns.

---

## Architecture

| Skill                            | Triggers                                | Description                |
| -------------------------------- | --------------------------------------- | -------------------------- |
| `arch-cross-service-integration` | cross-service, data sync                | Service communication      |
| `arch-performance-optimization`  | performance, optimization               | Performance tuning         |
| `arch-security-review`           | security, vulnerabilities               | Security analysis          |
| `refactoring`                    | refactor, restructure, clean            | Code restructuring         |
| `dependency`                     | dependency map, blockers, critical path | Feature dependency mapping |

---

## Debugging/Testing

| Skill             | Triggers                                                       | Description                                                    |
| ----------------- | -------------------------------------------------------------- | -------------------------------------------------------------- |
| `webapp-testing`  | E2E, Playwright, Cypress                                       | End-to-end testing                                             |
| `test-spec`       | test specification, QA spec, test strategy, TC-IDs, test cases | Test specification and detailed test case generation from PBIs |
| `test-specs-docs` | test specs docs, Given-When-Then, QA docs                      | YourProject test spec documentation                            |

---

## AI/ML Tools

| Skill                 | Triggers                     | Description          |
| --------------------- | ---------------------------- | -------------------- |
| `ai-artist`           | prompts, Midjourney, DALL-E  | AI image generation  |
| `ai-multimodal`       | Gemini, audio, video, images | Multimodal AI        |
| `ai-dev-tools-sync`   | Claude Code, Copilot sync    | Tool synchronization |
| `sequential-thinking` | complex problems, multi-step | Structured reasoning |

---

## Documentation

| Skill           | Triggers                                     | Description                                    |
| --------------- | -------------------------------------------- | ---------------------------------------------- |
| `documentation` | document, API docs, comments, README         | General documentation                          |
| `docs-seeker`   | find docs, library docs                      | Documentation search                           |
| `feature-docs`  | business docs, module docs, feature docs     | Business documentation (includes feature-docs) |
| `feature-docs`  | quick feature docs, feature readme           | Single-file feature documentation              |
| `changelog`     | changelog, version history, update changelog | Changelog generation                           |
| `release-notes` | release notes, git history                   | Release notes from git commits                 |

---

## Git/Workflow

| Skill               | Triggers                                                | Description                                          |
| ------------------- | ------------------------------------------------------- | ---------------------------------------------------- |
| `commit`            | commit, stage, save changes                             | Git commits                                          |
| `branch-comparison` | compare branches, git diff                              | Branch analysis                                      |
| `code-review`       | review, feedback, PR review                             | Code review                                          |
| `scout`             | find files, locate, search codebase                     | Fast codebase file discovery                         |
| `why-review`        | why, design rationale, plan validation, alternatives    | Validate design rationale in plan files              |
| `sre-review`        | sre, production, observability, reliability, ops review | Production readiness scoring for service/API changes |

---

## Planning/Research

| Skill                   | Triggers                           | Description                                 |
| ----------------------- | ---------------------------------- | ------------------------------------------- |
| `planning`              | plan, strategy, approach, research | Implementation planning (includes research) |
| `plan-analysis`         | analyze plan, review plan          | Plan review                                 |
| `feature`               | implement, add, create, build      | Feature development                         |
| `feature-investigation` | how does, explain, trace           | Code exploration                            |
| `problem-solving`       | complex problem, solution          | Problem analysis                            |
| `planning`              | research, explore, analyze         | Technical research (merged into planning)   |

---

## Infrastructure/DevOps

| Skill              | Triggers                        | Description         |
| ------------------ | ------------------------------- | ------------------- |
| `devops`           | Cloudflare, Docker, GCP, deploy | Cloud deployment    |
| `chrome-devtools`  | Puppeteer, browser automation   | Browser automation  |
| `mcp-builder`      | MCP server, tools               | MCP server creation |
| `mcp-management`   | MCP tools, discover             | MCP tool management |
| `media-processing` | FFmpeg, ImageMagick, video      | Media handling      |

---

## Context/Memory

| Skill                  | Triggers                                         | Description                  |
| ---------------------- | ------------------------------------------------ | ---------------------------- |
| `context-optimization` | context, tokens, compress                        | Token management             |
| `memory-management`    | remember, save, persist                          | Pattern persistence          |
| `code-simplifier`      | simplify, refine, clarity                        | Code cleanup                 |
| `repomix`              | codebase export, context                         | Context export               |
| `plans-kanban`         | kanban, task tracking                            | Task management              |
| `learn`                | remember this, always do, patterns, list learned | Pattern learning and viewing |

---

## Team Collaboration

| Skill              | Triggers                                            | Description                            |
| ------------------ | --------------------------------------------------- | -------------------------------------- |
| `business-analyst` | requirements, user story, acceptance criteria, BDD  | Requirements analysis, story writing   |
| `product-owner`    | backlog, prioritize, PBI, feature idea, stakeholder | Backlog management, prioritization     |
| `project-manager`  | timeline, dependencies, status, milestone, resource | Project tracking, reporting            |
| `test-spec`        | test plan, test cases, coverage, automation         | Test specification and case generation |
| `qc-specialist`    | quality gate, audit, compliance, standards          | Quality checkpoints, audits            |
| `ux-designer`      | wireframe, mockup, user flow, design spec           | UX design, specifications              |
| `design-spec`      | UI specification, component spec, layout spec       | Design specification documents         |
| `idea`             | capture idea, new idea, add to backlog              | Idea capture and structuring           |
| `refine`           | refine idea, convert to PBI, acceptance criteria    | Idea-to-PBI transformation             |
| `story`            | user story, vertical slice, split story             | PBI-to-story breakdown                 |
| `prioritize`       | RICE score, MoSCoW, value-effort matrix             | Backlog prioritization frameworks      |
| `status`           | status report, sprint status, progress              | Status report generation               |
| `team-sync`        | standup, meeting agenda, sprint review              | Meeting facilitation                   |

---

## Web/Frameworks

| Skill                   | Triggers              | Description      |
| ----------------------- | --------------------- | ---------------- |
| `package-upgrade`       | upgrade, dependencies | Package updates  |
| `markdown-novel-viewer` | markdown, novel       | Markdown viewing |

---

## Document Processing

| Skill              | Triggers                          | Description      |
| ------------------ | --------------------------------- | ---------------- |
| `docx-to-markdown` | DOCX to markdown, Word conversion | Word to Markdown |
| `markdown-to-docx` | markdown to DOCX, Word export     | Markdown to Word |
| `markdown-to-pdf`  | markdown to PDF, PDF export       | Markdown to PDF  |
| `pdf-to-markdown`  | PDF to markdown, PDF extraction   | PDF to Markdown  |

---

## Utility

| Skill           | Triggers                                           | Description              |
| --------------- | -------------------------------------------------- | ------------------------ |
| `claude-code`   | Claude Code setup, hook not firing, MCP connection | Claude Code CLI guidance |
| `skill-creator` | create skill, new skill                            | Create new skills        |

---

## Shared Modules

Reusable content blocks in `.claude/skills/shared/` extracted from multiple skills to eliminate duplication (DRY). Each module is referenced by 3+ skills.

| Module                                      | Purpose                                                                                             | Consumers                                                              |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `evidence-based-reasoning-protocol.md`      | Consolidated evidence-based reasoning: core rules, confidence levels, validation chain, risk matrix | 50 skills (all code-modifying and analysis skills)                     |
| `understand-code-first-protocol.md`         | Read-before-write protocol, assumption validation, external memory                                  | 34+ skills (all code-modifying skills)                                 |
| `design-system-check.md`                    | Mandatory design system doc locations for frontend work                                             | frontend-design, web-design-guidelines                                 |
| `module-detection-keywords.md`              | YourProject module keyword lists for context loading                                                | 4 skills (idea, product-owner, refine, story)                          |
| `scaffold-production-readiness-protocol.md` | Production readiness requirements: code quality, error handling, loading state, Docker              | 5 skills (scaffold, refine, refine-review, story, architecture-design) |
| `ba-team-decision-model-protocol.md`        | BA team 2/3 vote model, technical veto, disagree-and-commit, role scope boundaries                  | 3 skills (pbi-challenge, dor-gate) + business-analyst agent            |
| `refinement-dor-checklist-protocol.md`      | Definition of Ready checklist (7 items), validation rules, failure modes, gate output template      | 3 skills (pbi-challenge, dor-gate, refine-review) + ba-refinement hook |

See [shared/README.md](../../skills/shared/README.md) for full consumer lists and contribution guidelines.

---

## Skill File Structure

Each skill is located at `.claude/skills/{skill-name}/`:

```
.claude/skills/{skill-name}/
|-- SKILL.md           # Main skill definition
+-- references/        # Supporting documentation (progressive disclosure)
    |-- topic-1.md
    +-- topic-2.md

.claude/skills/shared/          # Shared modules (cross-skill DRY content)
|-- README.md                   # Index and guidelines
|-- evidence-based-reasoning-protocol.md
|-- understand-code-first-protocol.md
|-- design-system-check.md
|-- module-detection-keywords.md
|-- scaffold-production-readiness-protocol.md
|-- ba-team-decision-model-protocol.md
+-- refinement-dor-checklist-protocol.md
```

### SKILL.md Structure

```markdown
---
name: skill-name
version: 2.0.0
description: Brief description
triggers: [keyword1, keyword2, keyword3]
---

## Overview

[Skill purpose]

## Patterns

[Implementation patterns]

## Examples

[Usage examples]

## Anti-Patterns

[What to avoid]
```

---

## Command-Skill Relationships

Skills are often activated alongside commands:

| Command         | Primary Skills Activated           |
| --------------- | ---------------------------------- |
| `/cook`         | `feature`, `planning`, `test-spec` |
| `/fix`          | `debug`                            |
| `/plan`         | `planning`, `plan-analysis`        |
| `/review`       | `code-review`                      |
| `/scout`        | `scout`, `feature-investigation`   |
| `/test`         | `test-spec`, `webapp-testing`      |
| `/idea`         | `idea`, `product-owner`            |
| `/refine`       | `refine`, `business-analyst`       |
| `/story`        | `story`, `business-analyst`        |
| `/design-spec`  | `design-spec`, `ux-designer`       |
| `/test-spec`    | `test-spec`                        |
| `/quality-gate` | `qc-specialist`                    |
| `/status`       | `status`, `project-manager`        |
| `/dependency`   | `dependency`, `project-manager`    |
| `/prioritize`   | `prioritize`, `product-owner`      |

---

## Creating Custom Skills

Use `/skill/create` to create a new skill:

```bash
/skill/create "my-custom-skill" "Description of what it does"
```

---

## Related Documentation

- `docs/project-reference/backend-patterns-reference.md` - Backend patterns
- `docs/project-reference/frontend-patterns-reference.md` - Frontend patterns
- [../skill-naming-conventions.md](../skill-naming-conventions.md) - Naming conventions & shared module patterns

- [../hooks/README.md](../hooks/README.md) - Hooks overview and lessons system

---

_Source: `.claude/skills/` | 231 skills across 15+ domains + 3 shared modules_
