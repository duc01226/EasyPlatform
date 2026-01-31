# Skills Reference

> 84+ skills organized by category for Claude Code.

## What are Skills?

Skills are specialized prompts that provide domain-specific capabilities. Invoke with `/skill-name` or let Claude auto-activate based on context.

## Skills by Category

### Development

| Skill | Description |
|-------|-------------|
| `backend-development` | Backend systems (Node.js, Python, Go, Rust), APIs, databases |
| `frontend-angular` | Angular 19 components, forms, stores, API services |
| `easyplatform-backend` | EasyPlatform .NET backend (CQRS, entities, migrations) |
| `api-design` | REST API endpoints, controllers, DTOs |
| `migration` | Create or run database migrations (EF Core, MongoDB, data) |

### Architecture

| Skill | Description |
|-------|-------------|
| `performance` | Database, API, frontend performance |
| `plan` | Implementation planning and strategy |
| `refactoring` | Code restructuring and improvement |

### AI & Automation

| Skill | Description |
|-------|-------------|
| `ai-multimodal` | Google Gemini for audio/video/image processing |
| `ai-artist` | Prompt engineering for AI image/text generation |
| `ai-dev-tools-sync` | Sync Claude Code and Copilot configurations |
| `test-ui` | Puppeteer browser automation |
| `mcp-builder` | Create MCP servers for external integrations |
| `mcp-management` | Manage MCP server tools and resources |

### Testing & Quality

| Skill | Description |
|-------|-------------|
| `debug` | Systematic debugging framework (includes EasyPlatform-specific patterns) |
| `code-review` | Comprehensive code review |
| `code-simplifier` | Simplify code for clarity |
| `test-generation` | Generate unit and integration tests |
| `webapp-testing` | Web application testing strategies |

### DevOps & Infrastructure

| Skill | Description |
|-------|-------------|
| `devops` | Cloudflare, Docker, GCP deployment |
| `media-processing` | FFmpeg, ImageMagick, RMBG |
| `database-optimization` | Query optimization, N+1, indexes |
| `package-upgrade` | Dependency updates |

### Documentation

| Skill | Description |
|-------|-------------|
| `documentation` | Technical documentation enhancement |
| `docs-seeker` | Search technical docs (context7, llms.txt) |
| `feature-docs` | Feature documentation with test verification |
| `business-feature-docs` | EasyPlatform business feature docs |
| `readme-improvement` | README enhancement |
| `release-notes` | Generate release notes |

### Investigation & Research

| Skill | Description |
|-------|-------------|
| `investigate` | Understand existing feature logic |
| `research` | Technical research synthesis |
| `branch-comparison` | Compare git branches, analyze diffs |
| `sequential-thinking` | Structured problem-solving |

### UI/UX & Design

| Skill | Description |
|-------|-------------|
| `frontend-design` | Production-grade frontend interfaces |
| `shadcn-tailwind` | React shadcn/ui + Tailwind components (not for Angular) |
| `ui-ux-pro-max` | Design intelligence (styles, palettes, fonts - tech-agnostic) |
| `design` (command) | Design system context |

### Authentication & Security

| Skill | Description |
|-------|-------------|
| `better-auth` | Better Auth TypeScript framework |
| `payment-integration` | Payment gateway integration |

### Workflow & Learning

| Skill | Description |
|-------|-------------|
| `learn` | Teach Claude patterns/preferences |
| `learned-patterns` | Manage learned pattern library |
| `memory-management` | Save/retrieve patterns across sessions |
| `context-optimization` | Optimize token usage |

### Framework-Specific

| Skill | Description |
|-------|-------------|
| `web-frameworks` | Modern web frameworks |
| `mobile-development` | Mobile app development |
| `shopify` | Shopify development |
| `threejs` | Three.js 3D graphics |

### Specialty

| Skill | Description |
|-------|-------------|
| `domain-name-brainstormer` | Generate domain name ideas |
| `developer-growth-analysis` | Analyze coding patterns for growth |
| `markdown-novel-viewer` | Novel viewing in markdown |
| `repomix` | Repository mixing tools |

### Team Collaboration

| Skill | Description |
|-------|-------------|
| `product-owner` | Product backlog management, prioritization, stakeholder communication |
| `business-analyst` | Requirements refinement, user stories, BDD acceptance criteria |
| `qa-engineer` | Test specification, test case design, coverage analysis |
| `qc-specialist` | Quality gate assessment, release readiness, compliance |
| `ux-designer` | Design specifications, Figma integration, accessibility |
| `project-manager` | Sprint planning, status reporting, dependency tracking |

## Skill Structure

Each skill in `.claude/skills/skill-name/`:

```
skill-name/
├── SKILL.md           # Main skill definition (required)
├── references/        # Supporting documentation
├── scripts/           # Automation scripts
└── resources/         # Additional resources
```

### SKILL.md Format

```yaml
---
name: skill-name
description: Brief description
triggers:
  - keyword1
  - keyword2
---

# Skill Name

## Overview
[Description]

## Usage
[How to use]

## Examples
[Examples]
```

## Auto-Activation

Skills auto-activate based on:
1. **Keyword triggers** in user prompts
2. **File patterns** being edited
3. **Explicit invocation** with `/skill-name`

## Creating Custom Skills

1. Create directory: `.claude/skills/my-skill/`
2. Add `SKILL.md` with frontmatter
3. Add references as needed
4. Test with `/my-skill`

See: `/skill-plan` for guided skill creation.

---

*Total skills: 78+ | Last updated: 2026-01-13*
