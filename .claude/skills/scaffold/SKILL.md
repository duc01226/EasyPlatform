---
name: scaffold
version: 1.0.0
description: '[Architecture] Scaffold project architecture with OOP/SOLID base classes, infrastructure abstractions, and reusable foundation code before feature implementation.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

> **Understand Code First** — Search codebase for 3+ similar implementations BEFORE writing any code. Read existing files, validate assumptions with grep evidence, map dependencies via graph trace. Never invent new patterns when existing ones work.
> MUST READ `.claude/skills/shared/understand-code-first-protocol.md` for full protocol and checklists.
> **Prerequisites:** > **Scaffold Production Readiness** — Production scaffold checklist: health endpoints, structured logging, graceful shutdown, config validation, CI pipeline, Dockerfile, env separation. Verify each item exists before marking scaffold complete.
> MUST READ `.claude/skills/shared/scaffold-production-readiness-protocol.md` for full protocol and checklists.
> before executing — defines production readiness requirements for all 4 concern areas.

> **Evidence Gate:** MANDATORY IMPORTANT MUST — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

## Quick Summary

**Goal:** Generate and validate the project's architecture scaffolding — all base classes, interfaces, infrastructure abstractions, and reusable foundation code — BEFORE any feature story implementation begins.

**Purpose:** The scaffolded project should be copy-ready as a starter template for similar projects. All base code, utilities, interfaces, and infrastructure services are created. All setup follows best practices with generic functions any feature story could reuse.

**Key distinction:** This is architecture infrastructure creation, NOT feature implementation. Creates the foundation layer that all stories build upon.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Activation Guards (MANDATORY — Check Before Executing)

**ALL conditions must be true to proceed:**

1. **Workflow check:** Active workflow is `greenfield-init` OR `big-feature`. If not → SKIP this skill entirely, mark step as completed.
2. **Existing scaffolding check:** AI MUST self-investigate for existing base/foundational abstractions:
    - Abstract/base classes: grep `abstract class.*Base|Base[A-Z]\w+|Abstract[A-Z]\w+`
    - Generic interfaces: grep `interface I\w+<|IGeneric|IBase`
    - Infrastructure abstractions: grep `IRepository|IUnitOfWork|IService|IHandler`
    - Utility/extension layers: grep `Extensions|Helpers|Utils|Common` (directories or classes)
    - Frontend foundations: grep `base.*component|base.*service|base.*store|abstract.*component` (case-insensitive)
    - DI/IoC registration: grep `AddScoped|AddSingleton|providers:|NgModule|@Injectable`
3. **If existing scaffolding found → SKIP.** Log: "Existing scaffolding detected at {file:line}. Skipping /scaffold step." Mark step as completed.
4. **If NO foundational abstractions found → PROCEED** with full scaffolding workflow below.

## When to Use

- After the second `/plan` + `/plan-review` in greenfield-init or big-feature workflows
- Before `/cook` begins implementing feature stories
- When a new service/module needs its own base architecture within an existing project
- **NOT** when the project already has established base classes and infrastructure

## Workflow

1. **Read Plan** — Parse the implementation plan for architecture decisions, tech stack, and domain model
2. **Generate Scaffolding Checklist** — Produce a checklist of all required base classes and infrastructure from the Backend + Frontend checklists below
3. **Validate Against Plan** — Ensure every architecture decision in the plan has corresponding scaffolding items
4. **Present to User** — Use `AskUserQuestion` to confirm checklist before generating code
5. **Scaffold** — Create all base classes, interfaces, abstractions, and infrastructure code
6. **Verify** — Compile/build to ensure no syntax errors; validate OOP/SOLID compliance

## Backend Scaffolding Categories

AI must self-investigate the chosen tech stack and produce a checklist covering these categories. Names below are illustrative — adapt to match the project's language, framework conventions, and actual needs.

### Domain Layer

- [ ] Base entity interface + abstract class (Id, timestamps, audit fields)
- [ ] Value object base (equality by value)
- [ ] Domain event interface

### Application Layer

- [ ] Command/query handler abstractions (CQRS if applicable)
- [ ] Validation result pattern
- [ ] Base DTO with mapping protocol
- [ ] Pagination wrapper
- [ ] Operation result pattern (success/failure)

### Infrastructure Layer

- [ ] Generic repository interface + one concrete implementation
- [ ] Unit of work interface (if applicable)
- [ ] Messaging/event bus abstraction
- [ ] External service abstractions (cache, storage, email — only if plan requires them)
- [ ] Database context / connection setup
- [ ] DI/IoC registration module

### Cross-Cutting

- [ ] Current user context abstraction
- [ ] Testable date/time provider
- [ ] Exception hierarchy (domain, validation, not-found)
- [ ] Error handling middleware
- [ ] Strongly-typed configuration models

## Frontend Scaffolding Categories

### Core Architecture

- [ ] Base component with lifecycle/destroy cleanup
- [ ] Base form component with validation, dirty tracking
- [ ] Base list component with pagination, sorting, filtering

### State & API

- [ ] Base state store with loading/error/data pattern
- [ ] Base API service with interceptors, error handling
- [ ] Auth interceptor + environment config

### Shared Utilities

- [ ] Base model with serialization helpers
- [ ] Common utility functions (date, validation, formatting)

### UI Foundation

> **Skip if:** Backend-only project, no frontend component. **Apply if:** Project has ANY frontend.

#### Design Token Files

- [ ] Create design token file(s) per chosen format (CSS custom properties / SCSS variables / JSON)
- [ ] Define minimum token set: colors (primary, secondary, surface, bg, text, error, success, warning), spacing (xs-xl), typography (heading/body/caption families + sizes), breakpoints, shadows, z-index
- [ ] Create theme file(s) if theming required (light/dark CSS classes or theme provider)

#### Base Layout & Responsive

- [ ] Base layout component (app shell: header, sidebar/nav, main content, footer)
- [ ] Responsive container/grid utility
- [ ] Responsive mixin/utility for breakpoints
- [ ] Mobile-first media query definitions

#### Base UI Components

- [ ] Loading indicator component (spinner or skeleton)
- [ ] Error display component (inline + page-level)
- [ ] Empty state component (message + action)
- [ ] Notification/toast component
- [ ] Base button component with variants (primary, secondary, ghost, danger)
- [ ] Base input component with validation display

#### Design System Documentation

- [ ] Create `docs/project-reference/design-system/README.md` skeleton with: token naming conventions, component tier classification (Common/Domain-Shared/Page), usage examples (content auto-injected by hook — check for [Injected: ...] header before reading)

## Code Quality Gate Tooling (MANDATORY MUST — Setup Before Any Feature Code)

**MANDATORY IMPORTANT MUST** scaffold ALL code quality enforcement tools as part of project infrastructure — code that passes without quality gates is technical debt from day one.

### Static Analysis & Linting

- [ ] **MANDATORY MUST** configure language-appropriate linter with strict ruleset (zero warnings policy on new code)
- [ ] **MANDATORY MUST** configure static code analyzer with quality gate thresholds (complexity, duplication, coverage)
- [ ] **MANDATORY MUST** enable compiler/transpiler strict mode and treat warnings as errors on build
- [ ] **MANDATORY MUST** add code style formatter with shared config (enforce consistent formatting across team)

### Build-Time Quality Enforcement

- [ ] **MANDATORY MUST** configure pre-commit hooks to run linter + formatter automatically
- [ ] **MANDATORY MUST** configure CI pipeline to fail on any linter violation, analyzer warning, or test failure
- [ ] **MANDATORY MUST** set minimum test coverage threshold in CI (fail build if below)
- [ ] **MANDATORY MUST** enable security vulnerability scanning in dependency management

### Code Rules & Standards

- [ ] **MANDATORY MUST** create shared linter config file at project root (team-wide consistency)
- [ ] **MANDATORY MUST** create shared formatter config file at project root
- [ ] **MANDATORY MUST** create `.editorconfig` for cross-IDE consistency (indentation, encoding, line endings)
- [ ] **MANDATORY MUST** document code quality standards in project README or contributing guide

### Adaptation Protocol

- Research the chosen tech stack's ecosystem for best-in-class quality tools
- Present top 2-3 options per category with pros/cons to user via `AskUserQuestion`
- Configure the strictest reasonable defaults — loosen only with explicit user approval
- Ensure all quality tools run both locally (fast feedback) AND in CI (enforcement gate)

## Production Readiness Scaffolding (MANDATORY)

> **Scaffold Production Readiness** — Production scaffold checklist: health endpoints, structured logging, graceful shutdown, config validation, CI pipeline, Dockerfile, env separation. Verify each item exists before marking scaffold complete.
> MUST READ `.claude/skills/shared/scaffold-production-readiness-protocol.md` for full protocol and checklists.

Every scaffolded project MUST include these 4 foundations. AI must detect the tech stack from the plan/architecture report and present 2-3 options per concern via `AskUserQuestion`.

### 1. Code Quality Tooling

- Detect tech stack → select from protocol's option matrices
- Generate: linter config, formatter config, `.editorconfig`, pre-commit hooks
- Present options to user → generate chosen tool's config files
- Run protocol's verification checklist before proceeding

### 2. Error Handling Foundation

- Detect frontend framework → select from protocol's framework patterns
- Generate: error types, HTTP interceptor, notification service, global error handler
- Minimum 4 files for frontend, 3 for backend-only
- Run protocol's verification checklist

### 3. Loading State Management

- Detect frontend framework → select from protocol's framework patterns
- Generate: loading service, HTTP loading interceptor, loading indicator component
- Counter-based tracking, 300ms display delay, skip token mechanism
- Run protocol's verification checklist

### 4. Docker Development Environment

- Always scaffold (unless user explicitly opts out)
- Generate: docker-compose.yml (with profiles), Dockerfile (multi-stage), .dockerignore, .env.example
- Use 127.0.0.1 binding, health checks on all services, non-root user in prod
- Run protocol's verification checklist

### Scaffold Handoff from Architecture-Design

If an architecture report exists (from `/architecture-design`), read the "Scaffold Handoff — Tool Choices" table and use those selections instead of re-asking the user.

## OOP/SOLID Compliance Rules (ENFORCE)

1. **Single Responsibility** — Each base class handles ONE concern
2. **Open/Closed** — Base classes are extensible via inheritance, closed for modification
3. **Liskov Substitution** — Concrete implementations are substitutable for their base
4. **Interface Segregation** — Small, focused interfaces (not one giant IService)
5. **Dependency Inversion** — All infrastructure behind interfaces, injected via DI

**Anti-patterns to prevent:**

- God classes combining multiple concerns
- Concrete dependencies (always depend on abstractions)
- Base classes with unused methods that subclasses must override
- Missing generic type parameters where applicable

## Adaptation Protocol

The checklists above are **templates**. Before scaffolding:

1. **Read the plan** — What tech stack was chosen? (e.g., .NET vs Node.js, Angular vs React)
2. **Adapt naming** — Match target framework conventions (e.g., C# PascalCase, TypeScript camelCase)
3. **Skip irrelevant items** — Not every project needs every item (e.g., skip IFileStorageService if no file uploads)
4. **Add project-specific items** — The plan may require additional base classes not in the template
5. **Use `AskUserQuestion`** — Confirm final checklist with user before generating code

## Output

After scaffolding is complete:

1. **Scaffolding Report** — List of all created files with brief descriptions
2. **Build Verification** — Compilation/type-check passes
3. **Architecture Diagram** — Optional: generate diagram showing the base class hierarchy
4. **Production Readiness Verification** — All 4 concern areas verified via protocol checklists
5. **Config Files Generated** — Linter, formatter, pre-commit, Docker configs all created

## Verification Gate (MANDATORY before proceeding to /cook)

Run ALL verification checklists from the production readiness protocol:

- [ ] Code quality tooling verified (Section 1)
- [ ] Error handling foundation verified (Section 2)
- [ ] Loading state management verified (Section 3)
- [ ] Docker development environment verified (Section 4)

**BLOCK proceeding to `/cook` if ANY verification item fails.** Fix issues first, then re-verify.

## Next Steps

**MANDATORY IMPORTANT MUST** after completing this skill, use `AskUserQuestion` to recommend:

- **"/cook (Recommended)"** — Begin implementing feature stories on top of the scaffolding
- **"/review-changes"** — Review scaffolding code before proceeding
- **"Skip, continue manually"** — user decides

## Closing Reminders

**MANDATORY IMPORTANT MUST** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MANDATORY IMPORTANT MUST** add a final review todo task to verify work quality.
**MANDATORY IMPORTANT MUST** READ the following files before starting:

- **MUST** READ `.claude/skills/shared/understand-code-first-protocol.md` before starting
- **MUST** READ `.claude/skills/shared/scaffold-production-readiness-protocol.md` before starting
