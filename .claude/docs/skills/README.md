# Skills Reference

> 258 skills across 15+ domains + 25 shared modules for context-aware AI assistance

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
| [Code Quality](#code-quality)                     | 10     | Graph-based code analysis, blast radius, sync        |
| [Planning/Research](#planningresearch)            | 6      | Plans, research, implementation, investigation       |
| [Infrastructure/DevOps](#infrastructuredevops)    | 5      | Cloudflare, Docker, MCP                              |
| [Context/Memory](#contextmemory)                  | 6      | Optimization, persistence, learning                  |
| [Team Collaboration](#team-collaboration)         | 13     | PO, BA, QA, QC, UX, PM roles, prioritization         |
| [Web/Frameworks](#webframeworks)                  | 2      | Package updates, markdown                            |
| [Document Processing](#document-processing)       | 4      | PDF, DOCX, Markdown conversions                      |
| [Utility](#utility)                               | 2      | Claude Code CLI, skill creation                      |

**Additional:** Shared Modules (25) -- see [Shared Modules](#shared-modules)

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

| Skill                       | Triggers                                                              | Description                                                                                                           |
| --------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `webapp-testing`            | E2E, Playwright, Cypress                                              | End-to-end testing                                                                                                    |
| `tdd-spec`                  | test specification, QA spec, test strategy, TC-IDs, test cases        | Unified test case writer — generates TC-{FEAT}-{NNN} specs from PBIs and feature docs                                 |
| `tdd-spec [direction=sync]` | sync test specs, update dashboard, reverse sync, sync to feature docs | Dashboard sync mode — syncs TCs from feature docs Section 15 to `docs/specs/` (replaces deprecated `test-specs-docs`) |
| `integration-test-review`   | integration test review, assertion quality, test gate review, TC gate | Review integration tests against 5 quality gates (assertion value, data state, repeatability, domain logic, TC)       |
| `integration-test-verify`   | run integration tests, verify tests pass, test runner, dotnet test    | Run integration tests after writing/reviewing them — reads project-config.json for project-specific run guidance      |

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

| Skill           | Triggers                                                           | Description                                                                      |
| --------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `documentation` | document, API docs, comments, README                               | General documentation                                                            |
| `docs-seeker`   | find docs, library docs                                            | Documentation search                                                             |
| `feature-docs`  | business docs, module docs, feature docs                           | Business documentation (includes feature-docs)                                   |
| `feature-docs`  | quick feature docs, feature readme                                 | Single-file feature documentation                                                |
| `changelog`     | changelog, version history, update changelog                       | Changelog generation                                                             |
| `release-notes` | release notes, git history                                         | Release notes from git commits (tag-to-tag)                                      |
| `release-doc`   | release doc, what changed in the last N days, changes last 30 days | AI-analyzed release doc from time range or custom prompt — dumps artifacts first |

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

## Code Quality

| Skill                  | Triggers                                                | Description                                                            |
| ---------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------- |
| `graph-build`          | build graph, code graph, knowledge graph                | Build or update the code review knowledge graph (Tree-sitter + SQLite) |
| `graph-blast-radius`   | blast radius, impact analysis, structural impact        | Analyze structural impact of current changes using knowledge graph     |
| `graph-export`         | export graph, JSON dump                                 | Export full knowledge graph to JSON file                               |
| `graph-export-mermaid` | mermaid, diagram, visualize                             | Export single-file graph as Mermaid diagram                            |
| `graph-query`          | graph query, callers, tests_for                         | Natural language graph relationship queries                            |
| `graph-connect-api`    | connect api, api connections, frontend backend          | Detect frontend-to-backend API connections via knowledge graph         |
| `graph-sync`           | sync graph, refresh graph, update graph after pull      | Sync knowledge graph with current git state after pull/checkout        |
| `graph-update`         | update graph, working tree, uncommitted changes         | Update knowledge graph with uncommitted working tree changes           |
| `linter-setup`         | linter setup, formatter setup, pre-commit, quality gate | Configure stack-appropriate lint/format/type-check quality tooling     |
| `harness-setup`        | harness setup, quality harness, feedback sensors        | Set up feedforward guides and feedback sensors for coding workflows    |

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
| `tdd-spec`         | test plan, test cases, coverage, automation         | Test specification and case generation |
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

## Shared Protocols (SYNC Inline)

All shared protocols are now **inlined** into consuming skills via `<!-- SYNC:tag -->` blocks. Standalone protocol files have been deleted. The canonical source for all SYNC content is `.claude/skills/shared/sync-inline-versions.md`.

**Why inline?** AI compliance drops ~40% when protocols are behind file-read indirection. Inline SYNC blocks are always present in the skill's context window.

**To update a protocol:** Edit `sync-inline-versions.md` first, then `grep SYNC:protocol-name` and update all copies. Use `/sync-protocols` skill to automate.

---

## Skill File Structure

Each skill is located at `.claude/skills/{skill-name}/`:

```
.claude/skills/{skill-name}/
|-- SKILL.md           # Main skill definition
+-- references/        # Supporting documentation (progressive disclosure)
    |-- topic-1.md
    +-- topic-2.md

.claude/skills/shared/          # SYNC canonical source (protocols inlined into skills)
+-- sync-inline-versions.md    # Single source of truth for all SYNC protocol content
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

| Command         | Primary Skills Activated          |
| --------------- | --------------------------------- |
| `/cook`         | `feature`, `planning`, `tdd-spec` |
| `/fix`          | `debug-investigate`               |
| `/plan`         | `planning`, `plan-analysis`       |
| `/review`       | `code-review`                     |
| `/scout`        | `scout`, `feature-investigation`  |
| `/test`         | `tdd-spec`, `webapp-testing`      |
| `/idea`         | `idea`, `product-owner`           |
| `/refine`       | `refine`, `business-analyst`      |
| `/story`        | `story`, `business-analyst`       |
| `/design-spec`  | `design-spec`, `ux-designer`      |
| `/tdd-spec`     | `tdd-spec`                        |
| `/quality-gate` | `qc-specialist`                   |
| `/status`       | `status`, `project-manager`       |
| `/dependency`   | `dependency`, `project-manager`   |
| `/prioritize`   | `prioritize`, `product-owner`     |

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

_Source: `.claude/skills/` | 258 skills across 15+ domains + 25 shared modules_
