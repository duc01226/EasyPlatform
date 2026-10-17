# Codex Project Instructions

<!-- CLAUDE-MIRROR:START -->
<!-- CK:CODEX-ROOT-PROJECTION -->
## Project Instructions

Project guidance from `CLAUDE.md`. Edit that source when these instructions need to change.

# Easy.Platform - Code Instructions

<!-- SECTION:tldr -->

> **Project:** Easy.Platform — A .NET 9 framework for building microservices with CQRS, event-driven architecture, and multi-database support. Includes PlatformExampleApp (TextSnippet) as reference implementation.
>
> **Tech Stack:** csharp, typescript + Easy.Platform
>
> **Apps/Services:** Easy.Platform, Easy.Platform.AspNetCore, Easy.Platform.MongoDB, Easy.Platform.EfCore, Easy.Platform.RabbitMQ, Easy.Platform.RedisCache, Easy.Platform.AutomationTest, Easy.Platform.AzureFileStorage, Easy.Platform.FirebasePushNotification, Easy.Platform.HangfireBackgroundJob, TextSnippet.Api, TextSnippet.Application, TextSnippet.Domain, TextSnippet.Infrastructure, TextSnippet.Persistence, TextSnippet.Persistence.Mongo, TextSnippet.Persistence.PostgreSql, PlatformExampleApp.Shared, TextSnippet.Persistence.MultiDbDemo.Mongo, PlatformExampleApp.Ids, PlatformExampleApp.IntegrationTests, PlatformExampleApp.Test.Shared, PlatformExampleApp.Test, PlatformExampleApp.Test.BDD, PlatformExampleApp.Benchmark, Easy.Platform.Benchmark, Easy.Platform.CustomAnalyzers, Easy.Platform.Tests.Unit, playground-text-snippet, platform-core, text-snippet-domain, apps-domains-components, apps-shared-components, platform-components

<!-- /SECTION:tldr -->

## Doc Lookup — What to Read When

<!-- SECTION:doc-lookup -->

Match the question or task to a row and read that doc before answering, planning, or editing; every row names a file or folder that exists in this repo.

| If user prompt mentions... | Read first |
|---|---|
| Any project question or task — start here: paths, commands, modules, conventions | `docs/project-config.json` |
| Where a topic is documented — keyword-to-doc routing | `docs/project-reference/docs-index-reference.md` |
| Any non-trivial task — learned project guardrails | `docs/project-reference/lessons.md` |
| Feature specs, capability behavior, business rules, test cases | `docs/project-reference/feature-spec-reference.md` |
| Spec paths, TC format, canonical vs derived spec artifacts | `docs/project-reference/spec-system-reference.md` |
| Spec quality, AI-implementability, tech-agnostic prose | `docs/project-reference/spec-principles.md` |
| Behavior or public contract changes, spec-test-code sync | `docs/project-reference/workflow-spec-test-code-cycle-reference.md` |
| Backend patterns, CQRS, validation | `docs/project-reference/backend-patterns-reference.md` |
| Frontend patterns, components, stores | `docs/project-reference/frontend-patterns-reference.md` |
| Where code lives, modules, stack, setup — before planning or investigating. Holds: Project directory structure, tech stack overview | `docs/project-reference/project-structure-reference.md` |
| Seeding or reviewing development/test data. Holds: Seed test data patterns: idempotent seeder architecture, DI scope safety, command dispatch, and config-driven counts | `docs/project-reference/seed-test-data-reference.md` |
| Writing, fixing, or reviewing integration tests. Holds: Integration testing patterns and base classes | `docs/project-reference/integration-test-reference.md` |
| Before editing or reviewing code — rules, anti-patterns, checklists. Holds: Code review standards and checklists | `docs/project-reference/code-review-rules.md` |
| Style files — styling conventions, theming, responsive rules. Holds: SCSS styling conventions, BEM naming, theming | `docs/project-reference/scss-styling-guide.md` |
| UI design — tokens, components, app-to-doc map. Holds: Design system index: app-to-doc mapping, design tokens overview, component inventory | `docs/project-reference/design-system/README.md` |
| Writing, running, or reviewing E2E / user-flow tests. Holds: E2E testing with Playwright — page objects, fixtures, config | `docs/project-reference/e2e-test-reference.md` |
| Domain concepts, entities, relationships, data ownership — before planning or design. Holds: Domain entity catalog and relationships | `docs/project-reference/domain-entities-reference.md` |

<!-- /SECTION:doc-lookup -->

## TL;DR — What You Must Know Before Writing Any Code

<!-- SECTION:golden-rules -->

Read the relevant project convention before changing these files.

| Files | Project reference |
|---|---|
| src[\\/]Backend[\\/], src[\\/]Platform[\\/]; extensions: .cs, .csproj | `docs/project-reference/backend-patterns-reference.md` |
| src[\\/]Frontend[\\/]; extensions: .ts, .html, .scss | `docs/project-reference/frontend-patterns-reference.md` |

<!-- /SECTION:golden-rules -->

**Architecture Hierarchy** — Place logic in LOWEST layer: `Entity/Model > Service > Component/Handler`

**First Principles (Code Quality in AI Era):**

1. **Understanding > Output** — Never ship code you can't explain. AI generates candidates; humans validate intent.
2. **Design Before Mechanics** — Document WHY before WHAT. A 3-sentence rationale prevents 3-day debugging sessions.
3. **Own Your Abstractions** — Every dependency, framework, and runtime/provider decision is YOUR responsibility.
4. **Operational Awareness** — Code that works but can't be debugged, monitored, or rolled back is technical debt in disguise.
5. **Depth Over Breadth** — One well-understood solution beats ten AI-generated variants.

<!-- SECTION:decision-quick-ref -->

**Decision Quick-Ref:**

| Task | Pattern |
|---|---|
| Backend conventions | Read `docs/project-reference/backend-patterns-reference.md` |
| Frontend conventions | Read `docs/project-reference/frontend-patterns-reference.md` |
| Message consumer convention | PlatformApplicationMessageBusConsumer<TMessage> |

<!-- /SECTION:decision-quick-ref -->

## Naming Conventions

| Type        | Convention       | Example                                |
| ----------- | ---------------- | -------------------------------------- |
| Constants   | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`                      |
| Booleans    | Prefix with verb | `isActive`, `hasPermission`, `canEdit` |
| Collections | Plural           | `users`, `items`, `orders`             |

---

## Development Commands

<!-- SECTION:dev-commands -->

```bash
dotnet test src/Backend/PlatformExampleApp.Test/ # backend-unit
dotnet test src/Backend/PlatformExampleApp.IntegrationTests/ # backend-integration
dotnet test src/Backend/PlatformExampleApp.Test.BDD/ # backend-bdd
cd src/Frontend && npm test                   # frontend-unit
cd src/Frontend/e2e && npx playwright test    # e2e
```

<!-- /SECTION:dev-commands -->
<!-- /CK:CODEX-ROOT-PROJECTION -->
<!-- CLAUDE-MIRROR:END -->
