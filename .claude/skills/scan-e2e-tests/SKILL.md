---
name: scan-e2e-tests
version: 2.0.0
description: '[Documentation] Scan project and populate/sync docs/project-reference/e2e-test-reference.md with E2E test architecture, page objects, step definitions, configuration, and framework patterns.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks per file read. Prevents context loss from long files. Simple tasks: ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources, admit uncertainty, self-check output, cross-reference independently. Certainty without evidence = root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid:
>
> - **Verify AI-generated content against actual code.** AI hallucinates class names/signatures. Grep to confirm existence before documenting.
> - **Trace full dependency chain after edits.** Always trace full chain.
> - **Surface ambiguity before coding.** NEVER pick silently.
> - **NEVER hardcode file counts in docs.** Use grep-expression stats, not hardcoded numbers.

<!-- /SYNC:ai-mistake-prevention -->

**Prerequisites:** **MUST ATTENTION READ** before executing:

<!-- SYNC:scan-and-update-reference-doc -->

> **Scan & Update Reference Doc** — Surgical updates only, NEVER full rewrite.
>
> 1. **Read existing doc** first — understand structure and manual annotations
> 2. **Detect mode:** Placeholder (headings only) → Init. Has content → Sync.
> 3. **Scan codebase** (grep/glob) for current patterns
> 4. **Diff** findings vs doc — identify stale sections only
> 5. **Update ONLY** diverged sections. Preserve manual annotations.
> 6. **Update metadata** (date, version) in frontmatter/header
> 7. **NEVER** rewrite entire doc. **NEVER** remove sections without evidence obsolete.

<!-- /SYNC:scan-and-update-reference-doc -->

<!-- SYNC:output-quality-principles -->

> **Output Quality** — Token efficiency without sacrificing quality.
>
> 1. No inventories/counts — stale instantly
> 2. No directory trees — use 1-line path conventions
> 3. No TOCs — AI reads linearly
> 4. One example per pattern — only if non-obvious
> 5. Lead with answer, not reasoning
> 6. Sacrifice grammar for concision in reports
> 7. Unresolved questions at end

<!-- /SYNC:output-quality-principles -->

## Quick Summary

**Goal:** Scan E2E test codebase → populate `docs/project-reference/e2e-test-reference.md` with architecture, base classes, page objects, step definitions, configuration, and best practices. (content auto-injected by hook — check for [Injected: ...] header before reading)

**Workflow:**

1. **Classify** — Detect E2E framework, BDD mode, scan mode
2. **Scan** — Parallel sub-agents discover patterns with `file:line` evidence
3. **Report** — Write findings incrementally to report file
4. **Generate** — Build/update reference doc from report
5. **Fresh-Eyes** — Round 2 verification validates all examples

**Key Rules:**

- Generic — works with any E2E framework (Selenium, Playwright, Cypress, WebdriverIO, etc.)
- BDD frameworks (SpecFlow, Cucumber, Behave) are E2E — scan feature files and step definitions
- **MUST ATTENTION** detect framework FIRST — agent routing depends on it
- Every code example from actual project files with `file:line`

---

# Scan E2E Tests

## Phase 0: Detect Artifact Type & Mode

**Before any other step**, run in parallel:

1. Read `docs/project-reference/e2e-test-reference.md`
    - Detect mode: Init (placeholder) or Sync (populated)
    - In Sync mode: extract section list → skip re-scanning well-documented sections

2. Detect E2E framework and artifact type:

| Signal                                          | Framework      | Artifact Type      | Agent Routing                |
| ----------------------------------------------- | -------------- | ------------------ | ---------------------------- |
| `*.feature` files + `[Binding]`/`[Given]` in C# | SpecFlow (BDD) | BDD + Page Objects | Run Agent 1+2+3 (BDD)        |
| `playwright.config.*`                           | Playwright     | Non-BDD            | Run Agent 1+2 (skip Agent 3) |
| `cypress.config.*`                              | Cypress        | Non-BDD            | Run Agent 1+2 (skip Agent 3) |
| `*.feature` files + Python                      | Behave (BDD)   | BDD                | Run Agent 1+2+3 (BDD)        |
| `*.feature` files + Java                        | Cucumber (BDD) | BDD                | Run Agent 1+2+3 (BDD)        |
| `wdio.conf.*`                                   | WebdriverIO    | Non-BDD            | Run Agent 1+2 (skip Agent 3) |

3. Detect scan mode:

| Mode | Condition                                  | Action                                              |
| ---- | ------------------------------------------ | --------------------------------------------------- |
| Init | Target doc doesn't exist or is placeholder | Full scan, create all sections                      |
| Sync | Target doc exists with content             | Diff scan — check for new frameworks, count changes |

4. Read `docs/project-config.json` `e2eTesting` section if it exists — use as hints for paths.

**Evidence gate:** Confidence <60% on framework → report uncertainty, ask user before proceeding.

## Phase 1: Plan

Create `TaskCreate` entries for each sub-agent. **Do not start Phase 2 without tasks created.**

## Phase 2: Execute Scan (Parallel Sub-Agents)

Launch sub-agents matching detected framework. Each MUST:

- Write findings incrementally after each file — NEVER batch at end
- Cite `file:line` for every pattern example
- Evidence requirement: NEVER document a count — use grep-expression statistics instead

All findings → `plans/reports/scan-e2e-tests-{YYMMDD}-{HHMM}-report.md`

### Agent 1: E2E Framework & Architecture

**Think:** What makes this test infrastructure reusable vs brittle? How is the test project structured? What base classes exist and what do they provide? What lifecycle hooks are available?

- Find E2E project structure (test directories, page object directories)
- Find base classes for tests and page objects
- Find DI/startup configuration for test projects
- Find WebDriver/browser management (driver creation, lifecycle, options)
- Find settings/configuration classes (URLs, credentials, timeouts)

Security/performance flag: If test credentials are found hardcoded in source files, flag as CRITICAL security issue in report.

### Agent 2: Page Object Model & Components

**Think:** How do page objects encapsulate UI interaction? What patterns make them maintainable? What wait/retry strategies prevent flakiness?

- Find page object classes and their hierarchy
- Find UI component wrappers (reusable element abstractions)
- Find selector patterns (CSS, data-testid, XPath, BEM) — note which are used most
- Find navigation helpers (page transitions, URL routing)
- Find wait/retry patterns (explicit waits, polling, retry logic)
- Find assertion helpers and validation patterns

### Agent 3: BDD & Test Patterns (run ONLY if BDD detected in Phase 0)

**Think:** How do feature files, step definitions, and context sharing work together? What patterns enable reuse across scenarios? How is test state managed?

- Find feature files (`.feature`) — categorize by area
- Find step definition classes — count patterns
- Find context/state sharing between steps (ScenarioContext, World, IBddStepsContext)
- Find hooks (Before/After scenario, BeforeAll/AfterAll)
- Find test data patterns (fixtures, factories, unique generators)
- Find test account/credential management patterns
- Find environment configuration (per-env settings, CI headless mode)

## Phase 3: Generate Reference Doc

**Round 1 (main agent):** Build sections from report findings.

**Round 2 (fresh sub-agent, zero memory):**

- Does every code example exist at the claimed `file:line`? (Glob + Grep verify)
- Are security-sensitive patterns (hardcoded credentials) flagged?
- Are feature/step counts expressed as grep expressions, not hardcoded numbers?
- Are conditional sections (BDD, test accounts) only present if corresponding code found?

**Round 3 only if Round 2 finds issues.** Max 3 rounds → escalate to user if unresolved.

### Required Sections (all frameworks)

| Section                       | Content                                         |
| ----------------------------- | ----------------------------------------------- |
| **Architecture Overview**     | Layer diagram, project dependencies             |
| **Base Classes**              | Test/page object hierarchies with code examples |
| **Page Object Pattern**       | How to create page objects, component wrappers  |
| **Wait & Assertion Patterns** | Resilient waits, retry, assertion helpers       |
| **Configuration**             | Settings files, environment variants, CI setup  |
| **Running Tests**             | Commands for all, filtered, headed, CI modes    |
| **Best Practices**            | Project-specific conventions                    |

### Conditional Sections (framework-specific)

- **BDD Pattern** (if SpecFlow/Cucumber/Behave) — Feature file conventions, step definitions, context sharing, tags
- **Test Account System** (if credential management found) — Account types, numbered variants
- **Environment Variants** (if multi-env found) — Abstract/concrete page pattern, env-specific configs

## Phase 4: Update project-config.json

If `docs/project-config.json` exists, update/create the `e2eTesting` section:

```json
{
    "e2eTesting": {
        "framework": "<detected>",
        "language": "<detected>",
        "bddFramework": "<detected or null>",
        "guideDoc": "docs/project-reference/e2e-test-reference.md",
        "runCommands": {},
        "entryPoints": [],
        "stats": {
            "featureFilesGrepExpr": "<grep pattern>",
            "stepDefinitionFilesGrepExpr": "<grep pattern>"
        },
        "dependencies": {},
        "architecture": {}
    }
}
```

Note: stats use grep expressions, NOT hardcoded counts.

## Phase 5: Write & Verify

1. Write updated doc with `<!-- Last scanned: YYYY-MM-DD -->` at top
2. Surgical update only — preserve unchanged sections
3. Verify (Glob + Grep): ALL code example file paths exist AND class names match
4. Verify dependency versions against `.csproj` / `package.json` / `requirements.txt`
5. Verify no hardcoded file counts in output doc (use grep expressions or omit)
6. Report: sections created vs updated, framework detected, gaps

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small `TaskCreate` tasks BEFORE starting
- **IMPORTANT MUST ATTENTION** detect framework in Phase 0 — agent routing depends on BDD vs non-BDD
- **IMPORTANT MUST ATTENTION** cite `file:line` for every code example — NEVER fabricate class names
- **IMPORTANT MUST ATTENTION** sub-agents write findings incrementally after each file — NEVER batch at end
- **IMPORTANT MUST ATTENTION** NEVER hardcode file counts — use grep expressions in project-config.json stats
- **IMPORTANT MUST ATTENTION** Round 2 fresh-eyes is non-negotiable — NEVER declare PASS after Round 1
      <!-- SYNC:scan-and-update-reference-doc:reminder -->
- **IMPORTANT MUST ATTENTION** read existing doc first, scan codebase, diff, surgical update only. Never rewrite entire doc.
      <!-- /SYNC:scan-and-update-reference-doc:reminder -->
      <!-- SYNC:output-quality-principles:reminder -->
- **IMPORTANT MUST ATTENTION** output quality: no counts/trees/TOCs, 1 example per pattern, lead with answer.
      <!-- /SYNC:output-quality-principles:reminder -->
      <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** critical thinking — every claim needs traced proof, confidence >80% to act. Never present guess as fact.
      <!-- /SYNC:critical-thinking-mindset:reminder -->
      <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** AI mistake prevention — holistic-first, fix at responsible layer, surface ambiguity before coding, re-read after compaction.
      <!-- /SYNC:ai-mistake-prevention:reminder -->

**Anti-Rationalization:**

| Evasion                                       | Rebuttal                                                                       |
| --------------------------------------------- | ------------------------------------------------------------------------------ |
| "Framework obvious, skip Phase 0 detection"   | Phase 0 is BLOCKING — BDD vs non-BDD detection determines which agents run     |
| "BDD agent not needed (probably non-BDD)"     | Confirm non-BDD from Phase 0 evidence before skipping Agent 3                  |
| "Examples look right, skip Round 2"           | NEVER declare PASS after Round 1. Main agent rationalizes fabricated examples. |
| "File counts in project-config.json are fine" | NEVER hardcode counts — use grep expressions to avoid instant staleness        |
| "Conditional sections not needed"             | Only add conditional sections if corresponding code evidence found in scan     |

**[TASK-PLANNING]** Before acting, analyze task scope and break into small todo tasks and sub-tasks using TaskCreate.
