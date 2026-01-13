# Skills Reference

> 78+ skills organized by category for Claude Code.

## What are Skills?

Skills are specialized prompts that provide domain-specific capabilities. Invoke with `/skill-name` or let Claude auto-activate based on context.

## Skills by Category

### Development

| Skill | Description |
|-------|-------------|
| `backend-development` | Backend systems (Node.js, Python, Go, Rust), APIs, databases |
| `frontend-development` | React/TypeScript, Angular, component patterns |
| `frontend-angular-component` | Angular 19 component creation with platform patterns |
| `frontend-angular-form` | Angular reactive forms with validation |
| `frontend-angular-store` | PlatformVmStore state management |
| `frontend-angular-api-service` | API service patterns with caching |
| `easyplatform-backend` | EasyPlatform .NET backend (CQRS, entities, migrations) |
| `api-design` | REST API endpoints, controllers, DTOs |
| `databases` | MongoDB, PostgreSQL queries and optimization |

### Architecture

| Skill | Description |
|-------|-------------|
| `arch-cross-service-integration` | Cross-service communication patterns |
| `arch-performance-optimization` | Database, API, frontend performance |
| `arch-security-review` | Security vulnerabilities, authorization |
| `planning` | Implementation planning and strategy |
| `refactoring` | Code restructuring and improvement |

### AI & Automation

| Skill | Description |
|-------|-------------|
| `ai-multimodal` | Google Gemini for audio/video/image processing |
| `ai-artist` | Prompt engineering for AI image/text generation |
| `ai-dev-tools-sync` | Sync Claude Code and Copilot configurations |
| `chrome-devtools` | Puppeteer browser automation |
| `mcp-builder` | Create MCP servers for external integrations |
| `mcp-management` | Manage MCP server tools and resources |

### Testing & Quality

| Skill | Description |
|-------|-------------|
| `debugging` | Systematic debugging framework |
| `bug-diagnosis` | Root cause analysis for bugs |
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
| `feature-investigation` | Understand existing feature logic |
| `research` | Technical research synthesis |
| `branch-comparison` | Compare git branches, analyze diffs |
| `sequential-thinking` | Structured problem-solving |

### UI/UX & Design

| Skill | Description |
|-------|-------------|
| `frontend-design` | Production-grade frontend interfaces |
| `ui-styling` | CSS/SCSS styling patterns |
| `ui-ux-pro-max` | Advanced UI/UX design |
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

See: `/skill-creator` for guided skill creation.

---

*Total skills: 78+ | Last updated: 2026-01-13*
