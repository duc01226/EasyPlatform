# Scan Target: integration-tests

> One entry of the scan target registry — index, selection rules, path roots and the custom-doc contract are in `../targets.md` (read it first). The `$scan --target=integration-tests` host (`../../SKILL.md`) loads this file for that run only.

- **doc:** `<ref>/integration-test-reference.md`
- **applies when:** test code/config demonstrates tests that exercise a real interaction boundary, such as persistence, a module/process contract, a network/API adapter, a queue, or an external system.
- **skip when:** no boundary-level test capability is evidenced; a unit-test project, dependency, or test directory alone is insufficient.
- **description:** `[Documentation] Use when recording evidenced boundary-test setup, isolation, helpers, and assertions.`
- **sub-agents:** up to 2 conditional branches — Agent 1: Test Harness & Boundary Setup · Agent 2: Test Behavior, Isolation & Assertions. Dispatch only branches supported by the observed test capability.

### Phase 0 detection — identify the test runner, exercised boundary, and setup from evidence

Read the target doc and valid project config. An optional `integrationTestVerify` or equivalent capability section is a source of search hints, not a requirement. Verify declared commands, paths, and policies against scripts, tests, and CI. Omission is normal; a declared malformed section is handled by project-config validation.

Detect the runner from actual manifests, commands, test files, and configuration. The examples below are search cues only; use repository-specific syntax for any other stack.

| Evidence | Inspect |
| --- | --- |
| Test manifest, runner config, command, or workflow | Actual setup/teardown markers and supported commands; if unknown, record runner `UNKNOWN` and continue with syntax visible in test sources. |
| Tests calling across a real persistence, process/module, API/network, message, or external-adapter boundary | Invoked boundary, owner, setup/teardown, and the outcome the test observes. A browser flow belongs here only when it tests such an integration contract; otherwise use the E2E target. |
| Containers, local service scripts, in-memory substitutes, database fixtures, migration setup, or other infrastructure configuration | Which dependencies are started or substituted, lifecycle and isolation behavior, and limits of the substitute. |
| Test data setup, fixture loaders, cleanup, and unique data patterns | Which owner creates data, what behavior is exercised, and how repeatability/collisions are handled. Direct storage setup is not automatically a defect; explain when it prepares state versus when it replaces the boundary under test. |
| Optional config for test verification | Only fields present in the valid project schema, verified against repository-owned commands and test behavior. Do not require fields that the project omits. |

Classify Init (missing/placeholder doc) or Sync (existing content). In Sync mode update only stale or newly evidenced material; do not count framework/base-class changes.

**Evidence gate:** If the runner, boundary, or infrastructure cannot be identified, mark only that dimension `UNKNOWN`, cite what was checked, and continue with verified facts. Do not invent a framework, run command, base class, database, or integration lane. Ask only when a material ownership choice cannot be resolved from repository evidence.

### Sub-agent Think scopes

**Agent 1: Test Harness & Boundary Setup** (run when shared setup or infrastructure evidence exists)
- **Think:** How is the boundary made available, configured, isolated, and cleaned up? What does the harness replace, and what does it exercise for real?
- Scan targets: actual runner/test bootstrap, fixtures/factories, infrastructure startup, migration/seed setup, environment configuration, test doubles/overrides, and lifecycle/parallelism constraints. Search base classes only if source uses them. **Secret safety:** never copy credential values; report a real hardcoded credential as CRITICAL without reproducing it.

**Agent 2: Test Behavior, Isolation & Assertions** (run when boundary-level cases are evidenced)
- **Think:** Which contract crosses the boundary, what outcome does the system own, and how do the tests prove it repeatably without relying on shared delivery bookkeeping?
- Scan targets: test input/state setup, boundary invocation, business/system-owned outcome assertions, polling/wait helpers, data uniqueness/cleanup, categories, and concurrency controls. Direct storage setup is appropriate when it prepares state; distinguish that from a test that bypasses the boundary it claims to cover.

### Target Sections

Include only sections that explain the tested boundary and are supported by evidence; do not require base classes, containers, databases, service modules, or a CI lane.

| Section | Content |
| --- | --- |
| **Boundary & Test Intent** | What components interact, which real boundary is exercised, and what contract/behavior is asserted. |
| **Harness & Infrastructure** | Actual runner, setup/teardown, fixtures, services, substitutions, and configuration. |
| **Isolation & Test Data** | Data owner, setup/cleanup, repeatability, parallel-safety, and lifecycle as verified in this project. |
| **Assertions & Helpers** | Helpers, waits, and assertions that establish a meaningful outcome owned by the system under test. |
| **Commands & Local Guidance** | Only commands and prerequisites found in scripts, config, or CI; mark missing dimensions unknown instead of inventing them. |

### Content Rules / exceptions
Follow shared `output-quality-principles`; sync surgically. Verify every example, class name, command, and path against source. Avoid volatile file/test counts. Report what was scanned and the evidence-backed limits; do not claim coverage gaps from a directory count.

### Special slivers
- Identify the runner and exercised boundary before writing; unknown dimensions do not block confirmed findings or require questions when evidence can resolve them.
- Optional `integrationTestVerify` or equivalent configuration may be absent. When present, read only supported declared fields and corroborate commands/policies against source; do not create or require this section to complete the reference doc.
- Describe repeatability, cleanup, transaction/reset behavior, and concurrency from actual test setup. Recommend reliable isolation and stable outcomes, but do not mandate a fixed number of runs or a reset policy that the repository does not use.
- Direct repository/database setup is not automatically a defect. Explain whether it creates fixture state or bypasses the interaction boundary the test claims to verify.
- Distinguish smoke/readiness tests from deeper integration assertions; describe each by its intent without presenting a health check as proof of untested behavior.
- **Secret safety:** never copy real credentials or tokens into the report/doc. Flag a verified hardcoded real credential as CRITICAL without repeating the value; distinguish it from placeholders and synthetic test data.
- Fresh-eyes verification checks cited setup, test behavior, boundary ownership, and final system-owned outcomes; no fixed coverage counts are required.

### Anti-Rationalization rows

| Evasion | Rebuttal |
| --- | --- |
| "This framework implies a particular integration runner" | Trace the repository's test files and commands; framework examples are search cues only. |
| "A database write in setup means the test is invalid" | Determine whether setup prepares data or replaces the boundary under test; report the actual behavior. |
| "A base class must exist" | Document a base class only if source defines and uses one. |
| "All integration tests need two runs without reset" | Describe the project's actual isolation and repeatability policy; do not add an arbitrary fixed-run requirement. |
| "A smoke test proves the full integration contract" | State exactly which readiness or behavior it verifies and which boundary behavior remains untested. |
| "Credential values make the example clearer" | Never reproduce real secrets; redact the value and report the security finding. |
| "Skip Round 2 even when Round 1 found issues" | Clean Round 1 ends the scan. When issues exist, fresh-eyes mandatory after fixing — main agent rationalizes own fabricated examples. |
| "Credential security flag not needed" | A verified real credential in source is a CRITICAL finding; report it without reproducing the value. |

### prompt-enhance
`$prompt-enhance <ref>/integration-test-reference.md`
