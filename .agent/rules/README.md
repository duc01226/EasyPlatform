# EasyPlatform Agent Rules

This folder contains workspace-specific rules for AI agents to understand the EasyPlatform framework codebase and enforce consistent development patterns.

## Rule Files Overview

| File | Purpose |
|------|---------|
| **tech-stack.md** | Technology versions, frameworks, databases, and development tools |
| **architecture.md** | Clean Architecture layers, microservices boundaries, service ownership |
| **backend-patterns.md** | Entity development, controllers, helpers vs utils, fluent extensions |
| **frontend-patterns.md** | Angular components, stores, forms, API services, decorators |
| **cqrs-patterns.md** | Commands, queries, handlers, entity events, DTO mapping |
| **repository-patterns.md** | Repository priority, API reference, extensions, full-text search |
| **validation-patterns.md** | Sync/async validation, ensure patterns, naming conventions |
| **authorization.md** | Backend and frontend auth patterns, request context, roles |
| **conventions.md** | Naming rules, file organization, code style, SOLID principles |
| **anti-patterns.md** | Common mistakes to avoid in backend and frontend |
| **debugging-protocol.md** | AI debugging workflow, verification checklist, confidence levels |
| **testing.md** | Test locations, commands, patterns, best practices |
| **migration-patterns.md** | EF Core, MongoDB, platform data migrations |
| **background-jobs.md** | Paged, batch scrolling, and scrolling job patterns |

## How Rules Work in Antigravity

- Rules are markdown files that guide agent behavior during code generation
- The agent automatically indexes all `.md` files in this folder
- Rules apply only to this project (workspace-scoped)
- More specific rules override general patterns

## Key Principles

1. **Platform-First**: Always use Easy.Platform framework patterns
2. **Service Boundaries**: Never cross microservice boundaries directly
3. **Event-Driven**: Use message bus for cross-service communication
4. **Clean Architecture**: Follow layer dependencies strictly
5. **Evidence-Based**: Search and verify before implementing

## Quick Reference

### Backend Development
- Start with: `tech-stack.md`, `architecture.md`, `backend-patterns.md`
- For CQRS: `cqrs-patterns.md`, `validation-patterns.md`
- For data: `repository-patterns.md`, `migration-patterns.md`

### Frontend Development
- Start with: `tech-stack.md`, `frontend-patterns.md`
- For forms: `validation-patterns.md` (frontend section)
- For state: `frontend-patterns.md` (store patterns)

### All Development
- Always: `conventions.md`, `anti-patterns.md`
- When debugging: `debugging-protocol.md`
- When unsure: Search existing code for patterns

## Relationship to CLAUDE.md

These rules are extracted and organized from the main `CLAUDE.md` file for modular use in Antigravity IDE. For comprehensive documentation, refer to `CLAUDE.md` in the project root.
