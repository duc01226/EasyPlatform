# Skills Reference

> 152 skills across 15+ domains + 3 shared modules for context-aware AI assistance

## Overview

Skills are **automatically activated** based on context keywords in your conversation. Unlike commands (which require `/` prefix), skills enhance Claude's responses without explicit invocation.

```
User: "I need to fix a bug in the authentication flow"
       ↓
Skill Detection: "bug", "fix", "authentication"
       ↓
Skills Activated: debug, better-auth
```

## How Skills Work

1. **Detection**: Claude analyzes your message for trigger keywords
2. **Activation**: Matching skills are loaded into context
3. **Enhancement**: Skill knowledge guides the response

## Skill Domains

| Domain | Skills | Description |
|--------|--------|-------------|
| [Development - Backend](#development---backend) | 7 | API, databases, authentication, payments |
| [Development - Frontend](#development---frontend) | 8 | Components, forms, state, styling, design |
| [Architecture](#architecture) | 5 | Cross-service, performance, security |
| [Debugging/Testing](#debuggingtesting) | 8 | Bug diagnosis, test generation, test specs |
| [AI/ML Tools](#aiml-tools) | 5 | Prompts, multimodal, agents |
| [Documentation](#documentation) | 7 | Docs, feature docs, changelogs, release notes |
| [Git/Workflow](#gitworkflow) | 7 | Commits, branches, code review, scout, quality gates |
| [Planning/Research](#planningresearch) | 8 | Plans, research, implementation, investigation |
| [Infrastructure/DevOps](#infrastructuredevops) | 6 | Cloudflare, Docker, MCP, mobile |
| [Context/Memory](#contextmemory) | 7 | Optimization, persistence, learning |
| [Team Collaboration](#team-collaboration) | 15 | PO, BA, QA, QC, UX, PM roles, prioritization |
| [Web/Frameworks](#webframeworks) | 5 | Next.js, Nuxt, Tailwind, 3D |
| [Document Processing](#document-processing) | 4 | PDF, DOCX, Markdown conversions |
| [Utility](#utility) | 3 | Claude Code CLI, domain names, skill creation |

**Additional:** Shared Modules (3) -- see [Shared Modules](#shared-modules)

---

## Development - Backend

| Skill | Triggers | Description |
|-------|----------|-------------|
| `api-design` | REST, controller, route, HTTP, endpoint | API endpoint design patterns |
| `easyplatform-backend` | CQRS, commands, entities, migrations | BravoSUITE-specific backend |
| `databases` | MongoDB, PostgreSQL, SQL, queries | Database operations |
| `database-optimization` | slow query, N+1, index, performance | Query optimization |
| `better-auth` | authentication, OAuth, JWT, 2FA | Authentication patterns |
| `payment-integration` | payments, Stripe, checkout | Payment systems |
| `shopify` | Shopify, e-commerce | Shopify development |

See [development-skills.md](./development-skills.md) for detailed documentation.

---

## Development - Frontend

| Skill | Triggers | Description |
|-------|----------|-------------|
| `frontend-angular` | Angular, WebV2, component, form, store, API service | Angular 19 components, forms, state, API services |
| `frontend-design` | UI, design, screenshot | UI implementation |
| `shadcn-tailwind` | shadcn, Radix UI, Tailwind components | React component library (not Angular) |
| `ui-ux-pro-max` | UX, design system | Advanced UX |
| `web-design-guidelines` | accessibility, WCAG, visual review | UI compliance review |

See [development-skills.md](./development-skills.md) for detailed documentation.

---

## Architecture

| Skill | Triggers | Description |
|-------|----------|-------------|
| `arch-cross-service-integration` | cross-service, data sync | Service communication |
| `arch-performance-optimization` | performance, optimization | Performance tuning |
| `arch-security-review` | security, vulnerabilities | Security analysis |
| `refactoring` | refactor, restructure, clean | Code restructuring |
| `dependency` | dependency map, blockers, critical path | Feature dependency mapping |

---

## Debugging/Testing

| Skill | Triggers | Description |
|-------|----------|-------------|
| `debug` | bug, error, fix, crash, debug, troubleshoot, investigate, root cause | Comprehensive debugging (quick triage + systematic investigation) |
| `tasks-test-generation` | task-based test generation | Autonomous test generation |
| `webapp-testing` | E2E, Playwright, Cypress | End-to-end testing |
| `test-spec` | test specification, QA spec, test strategy, TC-IDs, test cases | Test specification and detailed test case generation from PBIs |
| `test-specs-docs` | test specs docs, Given-When-Then, QA docs | BravoSUITE test spec documentation |

---

## AI/ML Tools

| Skill | Triggers | Description |
|-------|----------|-------------|
| `ai-artist` | prompts, Midjourney, DALL-E | AI image generation |
| `ai-multimodal` | Gemini, audio, video, images | Multimodal AI |
| `ai-dev-tools-sync` | Claude Code, Copilot sync | Tool synchronization |
| `google-adk-python` | Google ADK, agents | Google Agent SDK |
| `sequential-thinking` | complex problems, multi-step | Structured reasoning |

See [integration-skills.md](./integration-skills.md) for detailed documentation.

---

## Documentation

| Skill | Triggers | Description |
|-------|----------|-------------|
| `documentation` | document, API docs, comments, README | General documentation |
| `docs-seeker` | find docs, library docs | Documentation search |
| `feature-docs` | business docs, module docs, feature docs | Business documentation (includes feature-docs) |
| `feature-docs` | quick feature docs, feature readme | Single-file feature documentation |
| `tasks-documentation` | task-based documentation | Autonomous docs generation |
| `changelog` | changelog, version history, update changelog | Changelog generation |
| `release-notes` | release notes, git history | Release notes from git commits |

---

## Git/Workflow

| Skill | Triggers | Description |
|-------|----------|-------------|
| `commit` | commit, stage, save changes | Git commits |
| `branch-comparison` | compare branches, git diff | Branch analysis |
| `code-review` | review, feedback, PR review | Code review |
| `tasks-code-review` | task-based code review | Autonomous code review |
| `scout` | find files, locate, search codebase | Fast codebase file discovery |
| `why-review` | why, design rationale, plan validation, alternatives | Validate design rationale in plan files |
| `sre-review` | sre, production, observability, reliability, ops review | Production readiness scoring for service/API changes |

---

## Planning/Research

| Skill | Triggers | Description |
|-------|----------|-------------|
| `planning` | plan, strategy, approach, research | Implementation planning (includes research) |
| `plan-analysis` | analyze plan, review plan | Plan review |
| `feature` | implement, add, create, build | Feature development |
| `tasks-feature-implementation` | task-based implementation | Autonomous feature dev |
| `feature-investigation` | how does, explain, trace | Code exploration |
| `problem-solving` | complex problem, solution | Problem analysis |
| `planning` | research, explore, analyze | Technical research (merged into planning) |
| `tasks-spec-update` | update specs, compare branches | Specification updates |

---

## Infrastructure/DevOps

| Skill | Triggers | Description |
|-------|----------|-------------|
| `devops` | Cloudflare, Docker, GCP, deploy | Cloud deployment |
| `chrome-devtools` | Puppeteer, browser automation | Browser automation |
| `mcp-builder` | MCP server, tools | MCP server creation |
| `mcp-management` | MCP tools, discover | MCP tool management |
| `media-processing` | FFmpeg, ImageMagick, video | Media handling |
| `mobile-development` | mobile, React Native, Flutter | Mobile apps |

See [integration-skills.md](./integration-skills.md) for detailed documentation.

---

## Context/Memory

| Skill | Triggers | Description |
|-------|----------|-------------|
| `context-optimization` | context, tokens, compress | Token management |
| `memory-management` | remember, save, persist | Pattern persistence |
| `code-simplifier` | simplify, refine, clarity | Code cleanup |
| `repomix` | codebase export, context | Context export |
| `plans-kanban` | kanban, task tracking | Task management |
| `learn` | remember this, always do, patterns, list learned | Pattern learning and viewing |

---

## Team Collaboration

| Skill | Triggers | Description |
|-------|----------|-------------|
| `business-analyst` | requirements, user story, acceptance criteria, BDD | Requirements analysis, story writing |
| `product-owner` | backlog, prioritize, PBI, feature idea, stakeholder | Backlog management, prioritization |
| `project-manager` | timeline, dependencies, status, milestone, resource | Project tracking, reporting |
| `test-spec` | test plan, test cases, coverage, automation | Test specification and case generation |
| `qc-specialist` | quality gate, audit, compliance, standards | Quality checkpoints, audits |
| `ux-designer` | wireframe, mockup, user flow, design spec | UX design, specifications |
| `design-spec` | UI specification, component spec, layout spec | Design specification documents |
| `figma-design` | Figma, design tokens, extract design | Figma MCP integration |
| `idea` | capture idea, new idea, add to backlog | Idea capture and structuring |
| `refine` | refine idea, convert to PBI, acceptance criteria | Idea-to-PBI transformation |
| `story` | user story, vertical slice, split story | PBI-to-story breakdown |
| `prioritize` | RICE score, MoSCoW, value-effort matrix | Backlog prioritization frameworks |
| `status` | status report, sprint status, progress | Status report generation |
| `team-sync` | standup, meeting agenda, sprint review | Meeting facilitation |

---

## Web/Frameworks

| Skill | Triggers | Description |
|-------|----------|-------------|
| `web-frameworks` | Next.js, Nuxt, SvelteKit | Web frameworks |
| `threejs` | Three.js, 3D, WebGL | 3D graphics |
| `package-upgrade` | upgrade, dependencies | Package updates |
| `markdown-novel-viewer` | markdown, novel | Markdown viewing |
| `developer-growth-analysis` | growth analysis, coding patterns | Developer growth reports |

---

## Document Processing

| Skill | Triggers | Description |
|-------|----------|-------------|
| `docx-to-markdown` | DOCX to markdown, Word conversion | Word to Markdown |
| `markdown-to-docx` | markdown to DOCX, Word export | Markdown to Word |
| `markdown-to-pdf` | markdown to PDF, PDF export | Markdown to PDF |
| `pdf-to-markdown` | PDF to markdown, PDF extraction | PDF to Markdown |

---

## Utility

| Skill | Triggers | Description |
|-------|----------|-------------|
| `claude-code` | Claude Code setup, hook not firing, MCP connection | Claude Code CLI guidance |
| `domain-name-brainstormer` | domain name, TLD, naming | Domain name generation |
| `skill-creator` | create skill, new skill | Create new skills |

---

## Shared Modules

Reusable content blocks in `.claude/skills/shared/` extracted from multiple skills to eliminate duplication (DRY). Each module is referenced by 3+ skills.

| Module | Purpose | Consumers |
|--------|---------|-----------|
| `evidence-based-reasoning-protocol.md` | Consolidated evidence-based reasoning: core rules, confidence levels, validation chain, risk matrix | 50 skills (all code-modifying and analysis skills) |
| `understand-code-first-protocol.md` | Read-before-write protocol, assumption validation, external memory | 34+ skills (all code-modifying skills) |
| `design-system-check.md` | Mandatory design system doc locations for frontend work | 1 skill (frontend-angular) |
| `module-detection-keywords.md` | BravoSUITE module keyword lists for context loading | 4 skills (idea, product-owner, refine, story) |

See [shared/README.md](../../.claude/skills/shared/README.md) for full consumer lists and contribution guidelines.

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
+-- module-detection-keywords.md
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

| Command | Primary Skills Activated |
|---------|--------------------------|
| `/cook` | `feature`, `planning`, `test-spec` |
| `/fix` | `debug` |
| `/plan` | `planning`, `plan-analysis` |
| `/review` | `code-review` |
| `/scout` | `scout`, `feature-investigation` |
| `/test` | `test-spec`, `webapp-testing` |
| `/idea` | `idea`, `product-owner` |
| `/refine` | `refine`, `business-analyst` |
| `/story` | `story`, `business-analyst` |
| `/design-spec` | `design-spec`, `ux-designer`, `figma-design` |
| `/test-spec` | `test-spec` |
| `/quality-gate` | `qc-specialist` |
| `/status` | `status`, `project-manager` |
| `/dependency` | `dependency`, `project-manager` |
| `/prioritize` | `prioritize`, `product-owner` |

---

## Creating Custom Skills

Use `/skill/create` to create a new skill:

```bash
/skill/create "my-custom-skill" "Description of what it does"
```

See [integration-skills.md](./integration-skills.md#creating-skills) for detailed instructions.

---

## Related Documentation

- [development-skills.md](./development-skills.md) - Backend & frontend skills
- [integration-skills.md](./integration-skills.md) - Infrastructure & AI skills
- [../skill-naming-conventions.md](../skill-naming-conventions.md) - Naming conventions & shared module patterns
- [../../.claude/docs/commands.md](../../.claude/docs/commands.md) - Commands reference (deprecated)
- [../hooks/pattern-learning.md](../hooks/pattern-learning.md) - How patterns become skills

---

*Source: `.claude/skills/` | 95 skills across 12 domains + 3 shared modules*
