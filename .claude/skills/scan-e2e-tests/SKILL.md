---
name: scan-e2e-tests
version: 1.0.0
description: '[Documentation] Scan project and populate/sync docs/project-reference/e2e-test-reference.md with E2E test architecture, page objects, step definitions, configuration, and framework patterns.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

**Prerequisites:** **MUST ATTENTION READ** before executing:

<!-- SYNC:scan-and-update-reference-doc -->

> **Scan & Update Reference Doc** — When updating reference docs: (1) Read existing doc first. (2) Scan codebase for current state (grep/glob). (3) Diff findings vs doc content. (4) Update ONLY sections where code diverged from doc. (5) Preserve manual annotations. (6) Update metadata (date, counts). NEVER rewrite entire doc — surgical updates only.

<!-- /SYNC:scan-and-update-reference-doc -->

<!-- SYNC:output-quality-principles -->

> **Output Quality** — Reference docs are injected into AI context. Apply 10 rules: (1) No inventories/counts — AI can grep. (2) No directory trees — AI can glob. (3) No TOCs. (4) Rules > descriptions — "MUST ATTENTION use X" not "X allows you to...". (5) 1 example per pattern. (6) Tables > prose. (7) BAD/GOOD pairs: 2-3 lines each. (8) Primacy-recency anchoring — critical rules in first AND last 5 lines. (9) No checkbox checklists — bullets force reading. (10) Density target: >=8 MUST ATTENTION/NEVER/ALWAYS per 100 lines.

<!-- /SYNC:output-quality-principles -->

## Quick Summary

**Goal:** Scan E2E test codebase and populate `docs/project-reference/e2e-test-reference.md` with architecture, base classes, page objects, step definitions, configuration, and best practices. (content auto-injected by hook — check for [Injected: ...] header before reading)

**Workflow:**

1. **Read** — Load current target doc, detect init vs sync mode
2. **Detect** — Identify E2E framework(s) and tech stack
3. **Scan** — Discover E2E patterns via parallel sub-agents
4. **Report** — Write findings to external report file
5. **Generate** — Build/update reference doc from report
6. **Verify** — Validate code examples reference real files

**Key Rules:**

- Generic — works with any E2E framework (Selenium, Playwright, Cypress, WebdriverIO, Puppeteer, etc.)
- BDD frameworks (SpecFlow, Cucumber, Behave) are E2E — scan feature files, step definitions, contexts
- Detect framework first, then scan for framework-specific patterns
- Every code example must come from actual project files with file:line references
- Use `docs/project-config.json` `e2eTesting` section if available for project-specific paths

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Scan E2E Tests

## Phase 0: Read & Assess

1. Read `docs/project-reference/e2e-test-reference.md`
2. Detect mode: init (placeholder) or sync (populated)
3. If sync: extract existing sections and note what's already well-documented
4. Read `docs/project-config.json` `e2eTesting` section if it exists — use as hints for paths and framework

## Phase 1: Detect E2E Framework

Detect E2E framework and tech stack from project files:

### .NET / C#

```bash
# Selenium + SpecFlow (BDD)
grep -r "Selenium.WebDriver\|SpecFlow" --include="*.csproj" -l
find . -name "*.feature" -type f | head -10
grep -r "\[Binding\]\|\[Given\|\[When\|\[Then" --include="*.cs" -l | head -10

# Playwright .NET
grep -r "Microsoft.Playwright" --include="*.csproj" -l
```

### TypeScript / JavaScript

```bash
# Playwright
ls playwright.config.* 2>/dev/null
grep -l "playwright" package.json */package.json 2>/dev/null

# Cypress
ls cypress.config.* 2>/dev/null
grep -l "cypress" package.json */package.json 2>/dev/null

# WebdriverIO
ls wdio.conf.* 2>/dev/null

# Puppeteer
grep -l "puppeteer" package.json */package.json 2>/dev/null
```

### Python

```bash
# Selenium + Behave (BDD)
grep -r "selenium\|behave" requirements*.txt setup.py pyproject.toml 2>/dev/null
find . -name "*.feature" -type f | head -10

# Playwright Python
grep -r "playwright" requirements*.txt pyproject.toml 2>/dev/null
```

### Java

```bash
# Selenium + Cucumber (BDD)
grep -r "selenium\|cucumber" --include="pom.xml" --include="build.gradle" -l 2>/dev/null
find . -name "*.feature" -type f | head -10
```

**Output:** Detected framework(s), language, BDD framework (if any), test runner

## Phase 2: Execute Scan (Parallel Sub-Agents)

Launch **3 Explore agents** in parallel:

### Agent 1: E2E Framework & Architecture

- Find E2E project structure (test directories, page object directories)
- Find base classes for tests and page objects
- Find DI/startup configuration for test projects
- Find WebDriver/browser management (driver creation, lifecycle, options)
- Find settings/configuration classes (URLs, credentials, timeouts)
- Count test files, feature files, page objects

### Agent 2: Page Object Model & Components

- Find page object classes and their hierarchy
- Find UI component wrappers (reusable element abstractions)
- Find selector patterns (CSS, data-testid, XPath, BEM)
- Find navigation helpers (page transitions, URL routing)
- Find wait/retry patterns (explicit waits, polling, retry logic)
- Find assertion helpers and validation patterns

### Agent 3: BDD & Test Patterns (if BDD detected)

- Find feature files (.feature) — count, categorize by area
- Find step definition classes — count, list patterns
- Find context/state sharing between steps (ScenarioContext, World, IBddStepsContext)
- Find hooks (Before/After scenario, BeforeAll/AfterAll)
- Find test data patterns (fixtures, factories, unique generators)
- Find test account/credential management patterns
- Find environment configuration (per-env settings, CI headless mode)

Write all findings to: `plans/reports/scan-e2e-tests-{YYMMDD}-{HHMM}-report.md`

## Phase 3: Generate Reference Doc

Build `docs/project-reference/e2e-test-reference.md` with these sections:

### Required Sections (all frameworks)

1. **Architecture Overview** — Layer diagram, project dependencies
2. **Project Structure** — Directory tree with annotations
3. **Key Dependencies** — Package versions table
4. **Base Classes** — Test/page object hierarchies with code examples
5. **Page Object Pattern** — How to create page objects, component wrappers
6. **Wait & Assertion Patterns** — Resilient waits, retry, assertion helpers
7. **Navigation & Page Discovery** — URL routing, page transitions
8. **Configuration** — Settings files, environment variants, CI setup
9. **Running Tests** — Commands for all, filtered, headed, CI modes
10. **Best Practices** — Project-specific conventions

### Conditional Sections (framework-specific)

- **BDD Pattern** (SpecFlow/Cucumber/Behave) — Feature file conventions, step definitions, context sharing, tags
- **Test Account System** (if credential management found) — Account types, numbered variants
- **Common Patterns** (if shared steps/helpers found) — Login flows, error assertions, reusable steps
- **Environment Variants** (if multi-env found) — Abstract/concrete page pattern, env-specific configs

### Section Template

Each section should include:

- Brief description of the pattern
- Code example from actual project files (with file:line reference)
- Key class/method names for searchability

## Phase 4: Update project-config.json

If `docs/project-config.json` exists, update/create the `e2eTesting` section:

```json
{
    "e2eTesting": {
        "framework": "<detected>",
        "language": "<detected>",
        "guideDoc": "docs/project-reference/e2e-test-reference.md",
        "runCommands": { ... },
        "bestPractices": [ ... ],
        "entryPoints": [ ... ],
        "stats": { "featureFiles": N, "stepDefinitionFiles": N, "featureAreas": N },
        "dependencies": { ... },
        "architecture": { ... }
    }
}
```

## Phase 5: Verify

1. Spot-check 3-5 code examples — do file:line references exist?
2. Verify class names match actual code (grep for each)
3. Verify dependency versions against .csproj / package.json / requirements.txt
4. Verify file counts (feature files, step defs, page objects) are accurate
5. Run schema validation if project-config.json was updated

## Output

Report what changed:

- Sections created vs updated
- Framework detected and version
- File counts discovered
- Any patterns not documented (gaps)

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
  <!-- SYNC:scan-and-update-reference-doc:reminder -->
- **IMPORTANT MUST ATTENTION** read existing doc first, scan codebase, diff, surgical update only. Never rewrite entire doc.
  <!-- /SYNC:scan-and-update-reference-doc:reminder -->
  <!-- SYNC:output-quality-principles:reminder -->
- **IMPORTANT MUST ATTENTION** follow output quality rules: no counts/trees/TOCs, rules > descriptions, 1 example per pattern, primacy-recency anchoring.
  <!-- /SYNC:output-quality-principles:reminder -->
