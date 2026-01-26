# Module Detection Keywords

Auto-detect which EasyPlatform module a task belongs to based on keywords.

---

## EasyPlatform Project Modules

| Module | Keywords | Path |
| ------ | -------- | ---- |
| **Platform Core** | platform, framework, base class, CQRS, repository, validation, message bus, background job | `src/Platform/Easy.Platform/` |
| **Platform AspNetCore** | controller, middleware, API, authentication, authorization, ASP.NET | `src/Platform/Easy.Platform.AspNetCore/` |
| **Platform MongoDB** | mongo, document, collection, BSON | `src/Platform/Easy.Platform.MongoDB/` |
| **Platform EFCore** | EF, entity framework, SQL, migration, DbContext | `src/Platform/Easy.Platform.EfCore/` |
| **Platform RabbitMQ** | rabbit, message bus, consumer, producer, queue, exchange | `src/Platform/Easy.Platform.RabbitMQ/` |
| **Platform Redis** | redis, cache, distributed cache | `src/Platform/Easy.Platform.Redis/` |
| **TextSnippet API** | text snippet, snippet, example app, playground | `src/Backend/PlatformExampleApp.TextSnippet.Api/` |
| **TextSnippet Application** | command, query, handler, event handler, CQRS handler | `src/Backend/PlatformExampleApp.TextSnippet.Application/` |
| **TextSnippet Domain** | entity, domain model, domain event, value object | `src/Backend/PlatformExampleApp.TextSnippet.Domain/` |
| **TextSnippet Persistence** | persistence, repository impl, database context | `src/Backend/PlatformExampleApp.TextSnippet.Persistence*/` |
| **Frontend App** | angular, component, UI, page, route, playground | `src/Frontend/apps/playground-text-snippet/` |
| **Frontend Core Lib** | platform-core, base component, store, API service, utility | `src/Frontend/libs/platform-core/` |
| **Frontend Domain Lib** | apps-domains, domain service, shared component | `src/Frontend/libs/apps-domains/` |
| **Frontend Styles** | SCSS, theme, variables, share-styles | `src/Frontend/libs/share-styles/` |

---

## Detection Algorithm

1. Extract keywords from user input (task title, description, PBI content)
2. Match against Keywords column (case-insensitive, partial match)
3. Return module(s) with highest match count
4. If 2+ modules detected, load context for ALL detected modules
5. Fallback: prompt user to select from available modules

---

## Layer Detection

| Layer | Keywords | Typical Path Pattern |
| ----- | -------- | -------------------- |
| Domain | entity, model, domain event, expression, value object | `*.Domain/` |
| Application | command, query, handler, event handler, DTO, job | `*.Application/` |
| Persistence | repository, migration, DbContext, database | `*.Persistence*/` |
| API/Service | controller, endpoint, middleware, filter | `*.Api/` or `*.Service/` |
| Frontend | component, store, form, template, SCSS | `src/Frontend/` |
