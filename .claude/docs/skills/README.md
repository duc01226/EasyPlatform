# Skills Reference

> 156 skills across 15+ domains + 5 shared reference/protocol files for context-aware AI assistance

## Overview

Skills are **automatically activated** based on context keywords in your conversation. Unlike commands (which require `/` prefix), skills enhance Claude's responses without explicit invocation.

```
User: "I need to fix a bug in the employee validation"
       ↓
Skill Detection: "fix", "employee", "validation"
       ↓
Skills Activated: fix, investigate
```

## How Skills Work

1. **Detection**: Claude analyzes your message for trigger keywords
2. **Activation**: Matching skills are loaded into context
3. **Enhancement**: Skill knowledge guides the response

## Skill Domains

> Curated highlights — the full catalog has 156 skills; the tables below list selected skills per domain, not the complete set.

| Domain                                            | Skills | Description                                          |
| ------------------------------------------------- | ------ | ---------------------------------------------------- |
| [Development - Backend](#development---backend)   | 0      | Project-specific backend patterns                    |
| [Development - Frontend](#development---frontend) | 3      | Components, forms, state, styling, design            |
| [Architecture](#architecture)                     | 3      | Architecture, performance, security                  |
| [Debugging/Testing](#debuggingtesting)            | 3      | Test generation, test specs                          |
| [AI/ML Tools](#aiml-tools)                        | 1      | Structured reasoning                                 |
| [Documentation](#documentation)                   | 6      | Docs, feature docs, changelogs, release notes        |
| [Git/Workflow](#gitworkflow)                      | 6      | Commits, branches, code review, scout, quality gates |
| [Code Quality](#code-quality)                     | 10     | Graph-based code analysis, blast radius, sync        |
| [Planning/Research](#planningresearch)            | 6      | Plans, research, implementation, investigation       |
| [Infrastructure/DevOps](#infrastructuredevops)    | 1      | Cloudflare, Docker, GCP                              |
| [Context/Memory](#contextmemory)                  | 4      | Optimization, persistence, learning                  |
| [Team Collaboration](#team-collaboration)         | 13     | PO, BA, QA, QC, UX, PM roles, prioritization         |
| [Web/Frameworks](#webframeworks)                  | 2      | Package updates, markdown                            |
| [Document Processing](#document-processing)       | 4      | PDF, DOCX, Markdown conversions                      |
| [Utility](#utility)                               | 2      | Claude Code CLI, skill creation                      |

**Additional:** Shared reference/protocol files (5) -- see [Shared Protocols](#shared-protocols-sync-inline)

---

## Development - Backend

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

| Skill                | Triggers                                | Description                                       |
| -------------------- | --------------------------------------- | ------------------------------------------------- |
| `performance-review` | performance, optimization, bottleneck   | Performance tuning + architecture-altitude review |
| `security-review`    | security, vulnerabilities               | Security analysis                                 |
| `refactoring`        | refactor, restructure, clean            | Code restructuring                                |
| `dependency`         | dependency map, blockers, critical path | Feature dependency mapping                        |

---

## Debugging/Testing

| Skill                     | Triggers                                                              | Description                                                                                                                             |
| ------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `webapp-testing`          | E2E, Playwright, Cypress                                              | End-to-end testing                                                                                                                      |
| `spec [mode=tests]`       | test specification, QA spec, test strategy, TC-IDs, test cases        | Unified test case writer — generates TC-{FEATURE}-{NNN} specs from PBIs and feature docs                                                |
| `spec [mode=sync]`        | sync test specs, update dashboard, reverse sync, sync to feature docs | Dashboard sync mode — syncs TCs from feature docs Section 8 to `docs/specs/` (sync mode retires when dashboards are removed in Phase 7) |
| `integration-test-review` | integration test review, assertion quality, test gate review, TC gate | Review integration tests against 5 quality gates (assertion value, data state, repeatability, domain logic, TC)                         |
| `integration-test-verify` | run integration tests, verify tests pass, test runner, dotnet test    | Run integration tests after writing/reviewing them — reads project-config.json for project-specific run guidance                        |

---

## AI/ML Tools

| Skill                 | Triggers                     | Description          |
| --------------------- | ---------------------------- | -------------------- |
| `sequential-thinking` | complex problems, multi-step | Structured reasoning |

---

## Documentation

| Skill           | Triggers                                                 | Description                                                                |
| --------------- | -------------------------------------------------------- | -------------------------------------------------------------------------- |
| `documentation` | document, API docs, comments, README                     | General documentation                                                      |
| `docs-seeker`   | find docs, library docs                                  | Documentation search                                                       |
| `spec`          | business docs, module docs, feature docs, feature readme | Business/feature documentation (single canonical Feature Spec per feature) |
| `changelog`     | changelog, version history, update changelog             | Changelog generation                                                       |
| `release-notes` | release notes, git history                               | Release notes from git commits (tag-to-tag)                                |

---

## Git/Workflow

| Skill                         | Triggers                                                | Description                                          |
| ----------------------------- | ------------------------------------------------------- | ---------------------------------------------------- |
| `commit`                      | commit, stage, save changes                             | Git commits                                          |
| `branch-comparison`           | compare branches, git diff                              | Branch analysis                                      |
| `code-review`                 | review, feedback, PR review                             | Code review                                          |
| `scout`                       | find files, locate, search codebase                     | Fast codebase file discovery                         |
| `why-review`                  | why, design rationale, plan validation, alternatives    | Validate design rationale in plan files              |
| `production-readiness-review` | sre, production, observability, reliability, ops review | Production readiness scoring for service/API changes |

---

## Code Quality

| Skill                | Triggers                                                                                                                        | Description                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `graph-build`        | build graph, code graph, knowledge graph, sync graph, update graph, working tree, uncommitted changes, refresh graph after pull | Build, update, or sync the code review knowledge graph via `--scope={full\|update\|sync}` (Tree-sitter + SQLite) |
| `graph-blast-radius` | blast radius, impact analysis, structural impact                                                                                | Analyze structural impact of current changes using knowledge graph                                               |
| `graph-export`       | export graph, JSON dump, mermaid, diagram, visualize                                                                            | Export full graph to JSON (`--format=json`) or single-file Mermaid diagram (`--format=mermaid`)                  |
| `graph-query`        | graph query, callers, tests_for                                                                                                 | Natural language graph relationship queries                                                                      |
| `graph-connect-api`  | connect api, api connections, frontend backend                                                                                  | Detect frontend-to-backend API connections via knowledge graph                                                   |
| `linter-setup`       | linter setup, formatter setup, pre-commit, quality gate                                                                         | Configure stack-appropriate lint/format/type-check quality tooling                                               |
| `harness-setup`      | harness setup, quality harness, feedback sensors                                                                                | Set up feedforward guides and feedback sensors for coding workflows                                              |

---

## Planning/Research

| Skill             | Triggers                           | Description                                                           |
| ----------------- | ---------------------------------- | --------------------------------------------------------------------- |
| `plan`            | plan, strategy, approach, research | Implementation planning (includes research phase + engine references) |
| `plan-analysis`   | analyze plan, review plan          | Plan review                                                           |
| `feature`         | implement, add, create, build      | Feature development                                                   |
| `investigate`     | how does, explain, trace           | Code exploration                                                      |
| `problem-solving` | complex problem, solution          | Problem analysis                                                      |
| `research`        | research, explore, analyze         | Technical research & solution analysis (standalone)                   |

---

## Infrastructure/DevOps

| Skill    | Triggers                        | Description      |
| -------- | ------------------------------- | ---------------- |
| `devops` | Cloudflare, Docker, GCP, deploy | Cloud deployment |

---

## Context/Memory

| Skill                  | Triggers                                         | Description                  |
| ---------------------- | ------------------------------------------------ | ---------------------------- |
| `context-optimization` | context, tokens, compress                        | Token management             |
| `memory-management`    | remember, save, persist                          | Pattern persistence          |
| `code-simplifier`      | simplify, refine, clarity                        | Code cleanup                 |
| `learn`                | remember this, always do, patterns, list learned | Pattern learning and viewing |

---

## Team Collaboration

| Skill               | Triggers                                                                                         | Description                               |
| ------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| `business-analyst`  | requirements, user story, acceptance criteria, BDD                                               | Requirements analysis, story writing      |
| `product-owner`     | backlog, prioritize, PBI, feature idea, stakeholder                                              | Backlog management, prioritization        |
| `project-manager`   | timeline, dependencies, status, milestone, resource                                              | Project tracking, reporting               |
| `spec [mode=tests]` | test plan, test cases, coverage, automation                                                      | Test specification and case generation    |
| `design-spec`       | UI specification, component spec, layout spec, wireframe, mockup, user flow, accessibility audit | Design specification documents, UX design |
| `idea`              | capture idea, new idea, add to backlog                                                           | Idea capture and structuring              |
| `refine`            | refine idea, convert to PBI, acceptance criteria                                                 | Idea-to-PBI transformation                |
| `story`             | user story, vertical slice, split story                                                          | PBI-to-story breakdown                    |
| `prioritize`        | RICE score, MoSCoW, value-effort matrix                                                          | Backlog prioritization frameworks         |

---

## Web/Frameworks

| Skill             | Triggers              | Description     |
| ----------------- | --------------------- | --------------- |
| `package-upgrade` | upgrade, dependencies | Package updates |

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

**To update a protocol:** Edit `sync-inline-versions.md` first, then `grep SYNC:protocol-name` and update all copies. Use `/sync-skills-shared-protocols` skill to automate.

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
|-- affirmative-rewrite-rubric.md
|-- sdd-artifact-contract.md
|-- sub-agent-selection-guide.md
|-- sync-inline-versions.md    # Single source of truth for all SYNC protocol content
+-- tc-format.md
```

### SKILL.md Structure

```markdown
---
name: skill-name
version: 1.0.0
description: '[Domain] Use when... (semantic trigger keywords belong in this description)'
disable-model-invocation: false
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

| Command                | Primary Skills Activated               |
| ---------------------- | -------------------------------------- |
| `/feature-implement`   | `feature`, `plan`, `spec [mode=tests]` |
| `/fix`                 | `debug-investigate`                    |
| `/plan`                | `plan`, `plan-analysis`                |
| `/review`              | `code-review`                          |
| `/scout`               | `scout`, `investigate`                 |
| `/test`                | `spec [mode=tests]`, `webapp-testing`  |
| `/idea`                | `idea`, `product-owner`                |
| `/refine`              | `refine`, `business-analyst`           |
| `/story`               | `story`, `business-analyst`            |
| `/design-spec`         | `design-spec`                          |
| `/spec [mode=tests]`   | `spec [mode=tests]`                    |
| `/quality-gate-review` | `quality-gate-review`                  |
| `/dependency`          | `dependency`, `project-manager`        |
| `/prioritize`          | `prioritize`, `product-owner`          |

---

## Authoring Rule — No Meta-Log

> A `SKILL.md` is read as live instruction. Write only the CURRENT actionable truth. Do NOT add change-history, migration rationale, or provenance — "formerly auto-injected", "removed in the … refactor", "now embedded here", "used to be hook-injected". It carries zero instruction value and dilutes the directive the agent acts on. Change history belongs in git / `CHANGELOG.md` / `docs/adr/**` / `plans/reports/**`. Keep the actionable scope (the path/trigger a block applies to, SYNC-mirror notes); drop the historical clause. State what IS, not what changed.

## Creating Custom Skills

Use `/skill-creator` to create a new skill:

```bash
/skill-creator "my-custom-skill" "Description of what it does"
```

---

## Related Documentation

- `docs/project-reference/backend-patterns-reference.md` - Backend patterns
- `docs/project-reference/frontend-patterns-reference.md` - Frontend patterns
- [../skill-naming-conventions.md](../skill-naming-conventions.md) - Naming conventions & shared module patterns

- [../hooks/README.md](../hooks/README.md) - Hooks overview and lessons system

---

_Source: `.claude/skills/` | 156 skills across 15+ domains + 5 shared reference/protocol files_
