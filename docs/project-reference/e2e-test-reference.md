<!-- Last scanned: 2026-06-12 -->

# E2E Test Reference

**Purpose:** Identify current browser verification entry points and their limits. The separate frontend Playwright workspace was removed in the current changes; its page objects, fixtures and commands are unavailable.

## Current verification surfaces

- Read `src/PlatformExampleApp/PlatformExampleApp.Test/_Readme.md` when working on the existing Selenium test lifecycle. Cases are under `src/PlatformExampleApp/PlatformExampleApp.Test/TestCases/`; configuration is in that project's appsettings files.
- Read `src/PlatformExampleApp/PlatformExampleApp.Test.BDD/Startup.cs` and its step definitions when working on existing BDD automation. Browser nodes and Selenium Hub are declared in `src/platform-example-app.docker-compose.yml` and its override.
- Read `docs/project-reference/integration-test-reference.md` for API/CQRS integration tests. They provide service proof; browser interaction needs separate evidence.

## Removed frontend harness

The previous Playwright-specific BasePage, factory, wait, cleanup and priority-tag instructions described deleted code. They are retained in repository history rather than prescribed as live dependencies. Do not recreate that harness solely to satisfy a stale documentation citation.

`docs/project-config.json` and `azure-pipelines.yml` still name the removed frontend runner. Treat those declarations as stale configuration until their owner is reconciled; they cannot establish an executable browser suite or a passing result.

## Verification evidence

Record the actual runner, browser, application and infrastructure readiness, scope, assertions, artifacts and result for every browser run. Preserve unique run-owned data and observable readiness signals. A build, static source trace, or API-only test does not demonstrate a browser journey.
