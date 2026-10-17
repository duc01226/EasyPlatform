# Scan Target: e2e-tests

> One entry of the scan target registry — index, selection rules, path roots and the custom-doc contract are in `../targets.md` (read it first). The `$scan --target=e2e-tests` host (`../../SKILL.md`) loads this file for that run only.

- **doc:** `<ref>/e2e-test-reference.md`
- **applies when:** browser or end-to-end user-flow tests have evidenced test artifacts, runner/fixture setup, CI invocation, or a valid project capability declaration corroborated by source/configuration.
- **skip when:** no active browser/user-flow test capability is evidenced; record which config and repository surfaces were checked. A browser dependency or configured path alone is not proof of a harness.
- **description:** `[Documentation] Use when scanning E2E test architecture, configured or discovered test organization, shared helpers, step definitions, configuration, and framework patterns.`
- **sub-agents:** up to 3 conditional branches + a fresh-eyes verifier — Agent 1: Test Harness & Execution · Agent 2: Test Organization & Interactions · Agent 3: BDD & Test Patterns (only if BDD evidence exists). Dispatch only branches supported by the observed harness.

### Phase 0 detection — establish actual test capability and its limits before writing

Read the target doc and valid project config. If an optional `e2eTesting` section exists, treat its paths, framework, runner, and execution details as search hints; verify each against actual files/scripts. Omission is normal and must not block the scan. A configured object/page path does not establish that a page-object model is implemented.

Identify cases, browser fixtures, runner config, lifecycle hooks, package/build scripts, and CI invocations from repository evidence. The examples below are search cues, not an allowlist:

| Evidence | Finding | Branch |
| --- | --- | --- |
| Runner config or test script plus browser-driving cases (for example Playwright, Cypress, Selenium, WebdriverIO, Puppeteer, or another tool) | Verified runner and test organization | Run evidenced harness and organization branches. |
| Feature files plus step-binding/configuration evidence | BDD-style test capability, with framework named only when verified | Run Agent 3 as well as evidenced harness/organization branches. |
| Test cases/helpers without an identifiable runner | Runner `UNKNOWN`; artifacts remain evidence | Continue generic organization/assertion analysis; do not invent commands or framework patterns. |

Mode-detect:

| Mode | Condition | Action |
| --- | --- | --- |
| Init | Target doc is missing or a placeholder | Write evidenced applicable sections; state material unknowns. |
| Sync | Target doc has real content | Update only stale or newly evidenced sections; retain valid local conventions. |

When an optional execution profile exists (for example, `e2eTesting.execution`), verify its values and preserve the configured owner for startup, dependency, readiness, teardown, and evidence commands. If it links to a separate local-run or experience-verification section, cross-reference that owner instead of duplicating commands. Missing optional configuration is not an error and must not be scaffolded solely to complete this reference doc.

**Evidence gate:** If runner details cannot be identified, cite the files/config checked and mark only that dimension `UNKNOWN`. Continue generic analysis of evidenced cases/helpers. Do not infer a POM, BDD model, execution mode, command, or test partition from a dependency or empty path setting. Ask only when a material owner decision cannot be resolved from evidence.

### Sub-agent Think scopes (write incrementally per file, cite `file:line`, and keep reports free of volatile counts. Report → `tmp/reports/scan-e2e-tests-{YYMMDD}-{HHMM}-report.md`.)

**Agent 1: Test Harness & Execution** (run when a runner or execution setup is evidenced)
- **Think:** How do tests start, configure, isolate, and stop the browser/system under test? Which setup is shared, and what commands actually run it?
- Scan targets: verified test projects/directories, runner and browser lifecycle config, fixtures/hooks/startup, URL and timeout settings, environment and CI commands. **Secret safety:** never copy credential values; if a real credential or token is hardcoded in source, report a CRITICAL finding without repeating it.

**Agent 2: Test Organization & Interactions** (run when reusable test code or cases are evidenced)
- **Think:** Where does this project actually own shared browser behavior, waiting, data setup, and assertions? Which test-owned outcomes are protected?
- Scan targets: existing fixtures, helper functions, action wrappers, scoped locators, object/page models when present, selectors, navigation, waits/retries, assertion helpers, and test-data setup. Do not prescribe a POM, base class, or hierarchy when the repository does not use one.

**Agent 3: BDD & Test Patterns** (run only when feature files and binding/configuration evidence establish BDD)
- **Think:** How do scenarios, bindings, hooks, and shared state work together? Which conventions affect reuse and test isolation?
- Scan targets: feature/spec files, step or binding definitions, scenario context, lifecycle hooks, data setup, and environment configuration as they actually exist. Do not infer a BDD runner from `.feature` files alone.

### Target Sections

Write only sections supported by evidence; do not require a particular runner, directory partition, lifecycle mode, or organizational pattern.

| Section | Content |
| --- | --- |
| **Harness & Execution** | Verified runner, startup/lifecycle, browsers/devices, CI or local execution commands, and configured ownership where present. |
| **Test Organization & Reuse** | Actual case layout and shared fixtures/helpers/object models; omit absent patterns. |
| **Interactions, Waits & Assertions** | Observed selectors, navigation/waits/retries, and assertions on outcomes owned by the application. |
| **Configuration & Test Data** | Verified environment/profile, account, fixture, and data-safety conventions; never include secret values. |
| **Project Conventions** | Repeated, evidence-backed conventions useful to new tests. |

Conditional sections may cover a page/object model, BDD/scenario conventions, authentication/account fixtures, environment variants, or test-data lifecycle, but only when those capabilities are present and relevant.

### Content Rules / exceptions
- Do not write volatile file/test counts. If an existing valid config stores statistics, preserve its supported expression format rather than a hardcoded count.
- Every code example and command must come from an actual source/script and cite its location. List only modes the repository defines (for example, headed or CI only when configured).
- If real hardcoded test credentials are found, report severity and locations without reproducing values; distinguish secrets from obvious placeholders or synthetic fixture data.

### Special slivers
- Agent 3 and BDD-specific content run only when BDD is evidenced; absence of BDD does not block the E2E harness and organization scan.
- Treat optional `e2eTesting`, execution-profile, and experience-verification sections as optional. Do not create them just to write this reference doc; when an explicitly requested config update is in scope, use the supported schema and only source-backed values.
- Keep lifecycle commands at their verified project owner; cross-reference an existing local-run/experience-verification owner instead of duplicating it. Never invent run commands, partitions, authentication, or browser defaults.
- Verify every command, fixture/helper path, dependency version, and runner claim against its source. A fresh-eyes check revalidates citations and does not require additional rounds when the first pass is clean.
- **Secret safety:** never place credential/token values in the report or document. Flag a verified real credential in source without quoting it.

### Anti-Rationalization rows

| Evasion | Rebuttal |
| --- | --- |
| "The familiar browser framework is obvious from dependencies" | Trace actual runner configuration, cases, scripts, and CI invocation; a dependency alone is not proof. |
| "`.feature` files prove this BDD framework" | Verify bindings/configuration before naming a BDD runner or writing its conventions. |
| "The configured page-object path means a POM is required" | Document a POM only when code uses one; describe the project's observed reuse pattern. |
| "All web tests have headed, CI, and filtered commands" | Record only commands/modes defined by source or valid config. |
| "Create the missing optional E2E config to finish the guide" | Omitted capability config is normal; document verified repository facts without scaffolding optional sections. |
| "A realistic test secret belongs in a code example" | Do not reproduce real credentials; report a redacted security finding. |

### prompt-enhance
`$prompt-enhance <ref>/e2e-test-reference.md`
