---
name: integration-test
description: '[Testing] Use when a workflow step or the user asks for integration test generation, diagnosis or traceability checks. --mode=review checks test quality; --mode=verify runs tests, with optional --fix-loop.'
---

> Codex compatibility note:
> - Invoke `$skill-name`: load the registered `.agents/skills/<name>/SKILL.md` and execute it with Codex tools; no separate `Skill` tool or Claude mode switch is needed. Author `.claude/**`; mirrors are generated.
> - Track steps before execution and keep progress/evidence current. Explicit skill requests execute their protocol. Use the native question tool for required questions.
> - Map foreign tool names to available host capabilities. A name mismatch needs no approval; an actually unavailable required capability stops with its step/evidence and a user question before adaptation.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Preserve protocol order unless the user approves a deviation. Workflows use `$start-workflow`: gates stay fixed; other steps may flex with logged reasons and evidence.
## Quick Summary

> **Review modes:** For review/audit work, standalone defaults to `--review-only` (`--report-only` alias); `--fix-loop` enables review → validate → authorized fix → fresh re-review, default cap 3. `--fix-loop --loop-owner=caller` returns a read-only pass to the caller that owns fixes/re-review. Create triage, review, validation and re-review todo tasks first; apply the carried `review-policy` contract for LOW deferral and user-approved bounded extensions. Non-review modes and terminal findings validation keep their own dispatch.

**Goal:** Generate, review, diagnose and verify integration tests that protect the selected case contract through real boundaries and system-owned outcomes.

**Summary:**

- Select the invocation route before applying its procedure: no flag uses from-changes, from-prompt, positional review, diagnose or verify-traceability; `--mode=review` supports review-only or the shared fix-loop; `--mode=verify [--fix-loop]` owns runtime proof.
- Resolve the case profile and package before judging coverage. Generate: owner cases → tests → full-scope traceability. Review: scope/profile → package → eight gates → validate/deduplicate → verdict/report → stop. Verify follows its reference's repeat/isolation and failure rules.
- Preserve meaningful assertions, production fidelity, native carriers/cardinality and operation authority; blocked or unknown evidence never proves coverage.

**Workflow:** Detect → find targets → gather context → execute the selected mode → report.

**Key Rules:** Read the selected mode reference in full; preserve task order and evidence; defer test execution to its final proof owner. See [Mode Dispatch](#mode-dispatch) for flags, references and execution location.

> **[BLOCKING] Mode routing — detect FIRST.** Explicit `--mode=review` or `--mode=verify` selects its standalone procedure; no flag selects generation. Each flagged mode works directly without a workflow. Read its reference in full before executing (see [Mode Dispatch](#mode-dispatch)). `/integration-test-review` and `/integration-test-verify` do not resolve.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval. Inside a workflow run, `$start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **Sub-Agent Selection:** Integration work routes to `integration-tester`; specialized work uses matching agents; parallel waves require disjoint writes and all-return barriers.
> **MUST ATTENTION READ** `.claude/skills/shared/sub-agent-selection-guide.md` before delegating.
>
> **Overlay Registry:** Exact > glob > all; derive bodies from `Name` inside the protocols directory; overlays add constraints and never waive framework gates.
> **MUST ATTENTION READ** `.claude/skills/project-skill-protocol/references/registry.md` when resolving overlays.

## Contents

- [Quick Summary](#quick-summary)
- [Case Contract Profile Gate (BLOCKING)](#case-contract-profile-gate-blocking)
- [Mode Dispatch](#mode-dispatch)
- [First Principle — Easy to Change · Easy to Scale · Easy to Maintain](#first-principle--easy-to-change--easy-to-scale--easy-to-maintain)
- [Project Pattern Discovery](#project-pattern-discovery)
- [Native-Profile Task Ordering](#native-profile-task-ordering)
- [Mandatory Task Ordering (Strict TC Default Only)](#mandatory-task-ordering-strict-tc-default-only)
- [Module Abbreviation Registry](#module-abbreviation-registry)
- [TC Code Numbering Rules (Strict TC Default Only)](#tc-code-numbering-rules-strict-tc-default-only)
- [Integration Test Generation](#integration-test-generation)
- [Mode Detection](#mode-detection)
- [Step 1: Find Targets](#step-1-find-targets)
- [Step 2: Gather Context](#step-2-gather-context)
- [Step 2b: Look Up TC Codes (Strict TC Default Only)](#step-2b-look-up-tc-codes-strict-tc-default-only)
- [Step 2c: Real-World Fidelity Check (BEFORE any test code is written)](#step-2c-real-world-fidelity-check-before-any-test-code-is-written)
- [Test Architecture Contract Preflight (before Step 3)](#test-architecture-contract-preflight-before-step-3)
- [Step 3: Generate Test File](#step-3-generate-test-file)
- [Step 4: Verify](#step-4-verify)
- [Example Files to Study](#example-files-to-study)
- [REVIEW Mode — Test Quality Audit](#review-mode--test-quality-audit)
- [DIAGNOSE Mode — Test Failure Root Cause Analysis](#diagnose-mode--test-failure-root-cause-analysis)
- [VERIFY-TRACEABILITY Mode — Test ↔ Spec ↔ Feature Doc Verification](#verify-traceability-mode--test--spec--feature-doc-verification)
- [Test Data Setup Guidelines](#test-data-setup-guidelines)
- [Test Execution & Failure Diagnosis (MANDATORY)](#test-execution--failure-diagnosis-mandatory)
- [Next Steps](#next-steps)
- [Related Skills](#related-skills)
- [Standalone Chain](#standalone-chain)
- [Prompt-Enhance Closing Anchors](#prompt-enhance-closing-anchors)
- [Closing Reminders](#closing-reminders)

## Case Contract Profile Gate (BLOCKING)

Before mode detection, test generation, or any spec/test mutation, read `docs/project-config.json`, `docs/project-reference/docs-index-reference.md`, `docs/project-reference/lessons.md`, the required local spec/integration-test references, and this skill's matching references. Resolve one profile:

- **Strict TC default:** neither config nor required project references explicitly declares a different canonical case owner, identity, carrier, section role, or case-to-test relation. Use the default Section 8 / `TC-{FEATURE}-{NNN}` procedure below.
- **Native profile:** config or a required project reference explicitly declares a different case contract. A missing optional profile field in config does not erase an explicit contract in a required reference. Use the native owner and the declarations below; do not create Section 8 or a duplicate TC registry.
- **Unresolved:** config is invalid/incomplete, required references conflict, or owner/identity/carrier/cardinality cannot be resolved. Report `BLOCKED`/`UNKNOWN`; do not infer a profile, fall back to TCs, generate tests from guessed intent, or claim coverage.

A changed root, template, filename, or test directory alone does not select a native case profile. Under a native profile, apply this crosswalk:

| Concern | Native-profile rule |
| --- | --- |
| Canonical owner and scope | Resolve the business root and canonical owner from config plus required references; read the owner's declared scenario/requirement contract. |
| Identity | MUST ATTENTION preserve the full owner-qualified case identity, including each declared variant. NEVER mint TC IDs or convert native IDs. |
| Test carrier | Use the configured/project-declared test carrier and every matched additive overlay requirement; do not require default `.NET` annotations unless the selected profile declares them. |
| Cardinality | Follow the profile's declared relation. A native profile may explicitly declare many-to-many: one aggregate executor can cover several listed scenarios, and one scenario may have several variant rows or tests. Do not force 1:1 or infer an undeclared relation. |
| Coverage proof | For each mapped identity, MUST ATTENTION inspect the actual executor and assertion, and record its observed result when run. An aggregate proves only the listed cases its inspected path/assertions cover; never invent per-variant reporter outcomes. A link, ID, comment, or generated matrix is not execution proof. |
| Reports and matrices | MUST ATTENTION substitute the native owner, case, variant, carrier, and result fields in every output table. `TC`, Section 8, and default annotation labels below are strict-default examples. |
| Missing or changed intent | Update only the canonical owner through its declared authoring procedure. Do not auto-create a TC/Section 8 shadow; unresolved intent or unavailable owner procedure is `SPEC-GAP`/`BLOCKED`. |
| Test result | MUST ATTENTION separate mapped, executed, and passed states. Only the configured runner's observed result proves execution; `UNKNOWN` is never `PASS`. |

The semantic floor is identical in every profile: MUST ATTENTION retain authored expected outcomes, assertions that fail when protected intent breaks, property plus boundary coverage for universal invariants, relevant authorization and preservation cases, real production paths, repeatability, operation authority, and spec/test/code drift adjudication. The strict-default procedures and report examples later in this file are conditional on selecting that profile; adapt their evidence and output fields to a native profile without dropping these gates. Matched project overlays add constraints and cannot waive a shared skill gate.

**Key Rules:**

- **AI surface?** Only if the code under test creates or changes a model call, prompt, agent, tool/MCP, retrieval or eval (see `node .claude/scripts/ai-signal-scan.cjs`): read `.claude/skills/shared/protocols/ai-engineering-gate.md`, apply `AE-6` (model mocked at one seam, property asserts, no live paid calls in default CI); otherwise skip this line.
- NEVER write smoke-only tests — trace the affected production boundary and assert the externally observable contract or relevant persisted state
- For async/eventually consistent outcomes, use the configured synchronization/polling helper; for synchronous persistence, assert with the project's normal deterministic read path
- Use the production entry path when that is the behavior under test; use project builders/factories/fixtures or other valid setup for unrelated preconditions, without skipping the tested contract
- MUST ATTENTION apply the Real-World Fidelity Gate BEFORE writing setup — a sequence, pacing, or data shape production can never reach proves nothing when green; fix the SCENARIO, never the assertion
- MUST ATTENTION search existing patterns FIRST before generating any test
- MUST ATTENTION READ `references/integration-test-patterns.md` before writing
- Organize tests using the project's established domain/module convention; do not impose CQRS folders or feature folders when the project has no such organization
- Every test method MUST carry the traceability form required by the selected profile. The strict default uses `TestSpec` for business §8 coverage and `TechnicalSpec` for technical-only regression coverage; only that profile auto-creates a Section 8 case for genuinely uncovered business behavior.
- Derive case count from distinct behaviors, invariants, risk, and meaningful boundaries; do not enforce an arbitrary minimum per command or endpoint
- Follow `integrationTestVerify.guidance`; when absent, require two fresh no-reset runs for suites with persistent/shared state before declaring that scope repeatable

## Mode Dispatch

Select from invocation arguments; load only the selected mode's references in full before work. The Case Contract Profile Gate still applies before interpreting cases or mutating specs/tests.

| Mode | Purpose | Read in full FIRST |
| --- | --- | --- |
| _(none)_ | Default test generation/authoring with positional review, diagnose and traceability branches | This file; positional references below when selected |
| `--mode=review [--review-only|--fix-loop] [--prove-tests] <target>` | Review through eight quality gates; report-only default or shared fix-loop with fresh re-review | `references/mode-review.md` |
| `--mode=verify [--fix-loop] <target>` | Runtime proof under the configured repeat/isolation policy; optional failure convergence | `references/mode-verify.md`; also `references/fix-loop.md` before any `--fix-loop` work |

- **[BLOCKING]** When `--mode=verify`, read `references/mode-verify.md` in full FIRST; it replaces test generation for the invocation and owns `--fix-loop` (read `references/fix-loop.md` in full before any loop work). Without `--fix-loop` the default verify pass runs exactly as documented there.
- Flagged modes replace generation for the invocation and govern their own caps, flags and terminal states. Without `--fix-loop`, use the default verify pass. Review workflow calls return the verdict/report path without next-step prompts.
- Positional `review` / `diagnose` / `verify` are generation branches. Workflow gates always use `--mode`; generation never chains into flagged review/verify on its own.
- `execution-mode: subagent` applies to generation. Verify runs INLINE in the main session, including `--fix-loop`; review runs where its caller dispatches it, including a read-only specialist under `workflow-review-changes`.

---

**Prerequisites — MUST ATTENTION READ before executing:**

> **`references/integration-test-patterns.md`** — canonical templates: collection attributes, base classes, default traceability annotations, async polling, unique names, DB assertions. Read before writing ANY test and apply project-declared carriers when a native profile is selected.
>
> **The canonical business owner root** (default `docs/specs/`; `specRoots.business.path` in `docs/project-config.json` overrides the path) — read its existing cases and identity rules before generation. The strict default uses TC IDs.

- MUST ATTENTION READ `references/integration-test-patterns.md`, `domain-entities-reference.md` from the configured reference-docs root, and the canonical business owner root before generation; use the pattern doc for code conventions and the selected owner for case traceability. The strict default checks Section 8 TCs.

> **CRITICAL: Search existing patterns FIRST.** Grep same-service integration tests before generating; read ≥1 to match namespace/imports, collection, base class, and helpers. NEVER contradict established patterns.

> **CRITICAL: NO Smoke/Fake/Useless Tests.** Each test MUST cross the actual integration boundary it claims to cover and assert a meaningful system-owned outcome. Before assertions, trace the production entry point, contract owner, and observable effects; inspect handlers, entities, events, messages, or persisted records when those concepts exist in the selected architecture.

> **CRITICAL: Synchronize with asynchronous outcomes.** When the selected behavior completes through background work or eventual consistency, wait on an observable completion signal with the configured helper and bounded diagnostics. For synchronous behavior, use the project's normal deterministic assertion path. Never retry a failing final assertion to hide a product defect.

> **For test specifications and test case generation from tasks, use `$spec [mode=tests]` skill instead.**

> **Invariant coverage.** For rules that must hold across a broad input domain, prefer property/metamorphic checks plus relevant boundary counter-cases when the project's test tools support them; retain example-based cases for concrete user scenarios. Trace each check through the selected canonical carrier, and use Section 8's Invariant/Property TC only under the strict default profile. Use mutation results as evidence of assertion strength, not as a universal required tool.

> **External Memory:** Complex/lengthy work → write findings to `tmp/reports/` to survive context loss.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim needs `file:line` or traced evidence; confidence >80% acts, <80% verifies first.

## First Principle — Easy to Change · Easy to Scale · Easy to Maintain

> The full gate is `SYNC:core-engineering-principles` (protocol guide below; a hook delivers its text); its closing digest ends this file.

---

## Project Pattern Discovery

**Applicability first:** Resolve the project's actual runner, boundary and fixture model. Collection/category attributes, DI containers, user-context factories and database helpers below apply only when that runner and tested contract use them; otherwise record N/A and keep the native harness/fixtures/assertions. Test names and traceability use the project's format. Never invent a service, database, auth actor or framework to satisfy an example.

Before implementation, search codebase for patterns:

- Search: `IntegrationTest`, `TestFixture`, `TestUserContext`, `IntegrationTestBase`
- Look for: existing test projects, collection definitions, service-specific base classes

> **MANDATORY IMPORTANT MUST ATTENTION** plan task to READ `integration-test-reference.md` for project-specific patterns and code examples. If not found, continue with search-based discovery.

**Workflow:**

1. **Detect mode** — See Mode Detection below
2. **Find targets** — Identify test/command/query files
3. **Gather context** — Read relevant files for detected mode
4. **Execute** — Generate, review, diagnose, or verify
5. **Report** — Build check (generate), quality report (review), root cause (diagnose)

**Key Rules:**

- MUST ATTENTION search existing test patterns in same service BEFORE generating
- MUST ATTENTION READ `references/integration-test-patterns.md` before writing any test
- **Organization follows the project-native convention.** Where it groups by domain, colocate related command/query cases; do not impose or prohibit CQRS folders against documented organization.
- Use project uniqueness helpers for data in shared mutable namespaces; deterministic values are valid in isolated fixtures.
- Use project assertion helpers for persisted outcomes; synchronization follows the tested boundary
- **CRITICAL MUST ATTENTION:** Exercise the production entry path when it is the boundary under test. For unrelated preconditions, use the project's valid fixtures/builders/seeders without bypassing the protected contract.
- **Synchronization:** use observable condition-based barriers for asynchronous/eventually consistent outcomes, with a bounded timeout; deterministic synchronous persistence uses the normal read/assert path. Never mask a synchronous defect with retries.
- **CRITICAL MUST ATTENTION:** Before assertions, READ handler/entity/event source; identify changed fields, created/updated/deleted entities, and fired handlers. **Smoke-only is FORBIDDEN** unless side effect is truly unobservable.
- **CRITICAL MUST ATTENTION:** Follow the configured repeat policy. Without one, persistent/shared-state or async suites need two fresh green runs; isolated deterministic suites use the runner's normal fresh run. Clean up only owned fixture state.
- Derive test cases from distinct protected behaviors, relevant failures and boundaries; a database check is required only when persistence belongs to the tested contract
- **Authorization tests:** When access control belongs to the tested contract, verify allowed and refused actors through the project's actual identity mechanism.
- **Strict default only:** every business test method has `// TC-{FEATURE}-{NNN}: Description` + `TestSpec`; technical-only tests use `TechnicalSpec`; one TC may map to many methods.
- **Strict default only:** when a genuinely uncovered business behavior has no TC in the feature doc, add it to Section 8 before generation; never mirror a method already covered by an existing TC. Native profiles update only their declared owner/carrier through the native-profile sequence above.
- For comprehensive spec generation before coding → `$spec [mode=tests]` first

## Native-Profile Task Ordering

When the profile is native, perform the same quality sequence without executing the default-only Section 8/TC instructions below:

1. **FIRST: resolve canonical owner cases.** Read the affected owner and every applicable requirement/scenario, including declared variants. Record the owner-qualified identities and the configured case-to-test carrier. If the owner or required evidence field is missing, conflicting, or cannot be read, stop `BLOCKED`/`UNKNOWN`.
2. **MIDDLE: implement tests.** Exercise real production paths, use the profile's test carrier plus additive overlay requirements, and author expected outcomes that can fail when the protected intent breaks. For universal invariants, add the required property and boundary cases.
3. **FINAL: reconcile both directions.** Map each changed behavior to every applicable owner case and each affected owner case/variant to its actual executor and inspected assertion across integration and unit tests. Follow configured cardinality, including many-to-many mappings; an aggregate executor proves only the cases its actual path/assertions cover. Do not invent per-variant runner outcomes.
4. **Coverage task:** emit one owner/case/variant-to-executor/assertion matrix for the full affected owner scope, with `COVERED`, `GAP`, or `UNKNOWN`; zero `GAP`/`UNKNOWN` results are required for a pass. A mapped case is not an executed or passed case.
5. **Missing or stale contract:** do not create TC IDs, Section 8, or another registry. Route an actual owner change through its declared authoring procedure; preserve user confirmation and operation authority. If that procedure or intent is unavailable, leave the finding blocked.

## Mandatory Task Ordering (Strict TC Default Only)

ALWAYS create and execute tasks in this exact order:

1. **FIRST: Verify/upsert test specs in feature docs**
    - Read feature doc Section 8 (`{App}/README.{Feature}.md` under the business spec root — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) for the target domain.
    - Verify matching `TC-{FEATURE}-{NNN}` for each test case.
    - Missing → create Section 8 entry with Priority, Status, GIVEN/WHEN/THEN, Evidence.
    - Incorrect → update to current behavior.
    - Output TC → test-method mapping. **One TC may map to many methods** across components/services; `TestSpec` is the join key.

2. **MIDDLE: Implement integration tests**
    - Generate files from task 1's TC mapping.
    - Put the configured test-framework TC annotation before each method, outside its body.
    - Follow existing test base-class patterns.

3. **FINAL: Verify traceability (1 TC : N tests) — WHOLE feature area, not only this run's TCs**
    - Grep test-spec annotations across **all** integration **and** unit suites; integration-only searches falsely orphan unit-covered TCs.
    - Grep **every** `TC-{FEATURE}-{NNN}` in Section 8 of all implicated feature docs, including untouched/pre-existing TCs.
    - Verify: each business method → **exactly one** doc TC (`TestSpec`); each technical-only method → `TechnicalSpec`; each doc TC → **≥1** test. **Many methods may cover one TC**; NEVER require 1:1 or split/technicalize a business TC (M1/M5; see `tc-format.md` → TC ↔ Test Code Cardinality).
    - Flag orphans: `TestSpec` TC absent from §8; technical-only method with business `TestSpec`; doc TC with **zero** tests. Many tests sharing one TC is NOT an orphan/duplicate.
    - Update each TC's `CoveredBy` with `{File}::{MethodName}` comma-separated **on one line**, or a large-set filter (field representative; code annotation authoritative). Unit tests MAY be included. Legacy `IntegrationTest:` is migration input only.

    > **MANDATORY task — "Validate: no missing integration tests" (non-skippable inside a workflow, with staged/unstaged git changes, or by direct request — essentially every run; only exception: narrow read-only single-TC lookup with no generation).** Create as its OWN named todo tracking item, not folded into step 3. Run the same bidirectional logic as VERIFY-TRACEABILITY, scoped to the feature area:
    >
    > 1. Every changed command/query/handler/entity/event-handler file has **≥1** covering test (grep + read; name match alone NOT coverage).
    > 2. Every `TC-{FEATURE}-{NNN}` in the FULL Section 8 set of implicated feature docs has **≥1** covering test.
    > 3. Emit a table; require **zero GAP rows** before done:
    >
    > | TC / Changed File | Covering Test(s) | Status |
    > | ------------------ | ----------------- | ------------------------ |
    > | TC-{FEATURE}-{NNN} or {file:line} | {file}::{method}[, …] / NONE | COVERED / GAP |
    >
    > Any `GAP` row → generate the missing test (return to Step 3) before marking the task `completed`. Do NOT report done with an open GAP.

## Module Abbreviation Registry

Discover existing feature/module codes from the selected canonical business owner and its index; discover test folders from the project’s test organization. Do not copy generic module abbreviations into a project registry. The strict-default feature doc remains the numbering owner below; native profiles retain their declared identity and cardinality.

## TC Code Numbering Rules (Strict TC Default Only)

Creating new `TC-{FEATURE}-{NNN}` codes:

1. Check feature doc first — `{App}/README.{Feature}.md` under the business spec root (default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) has existing codes. New codes must not collide.
2. Decade-based grouping — e.g., OM: 001-004 (CRUD), 011-013 (validation), 021-023 (permissions), 031-033 (events). Find next free decade.
3. Unavoidable collision → preserve the owner-qualified scenario identity where possible. If renumbering is required, migrate the canonical ID and every configured carrier/reference atomically, preserving variants and declared many-to-many mappings. Inspect the executing assertions and verify that every migrated case still joins to its intended executor. If either owner/carrier is ambiguous or outside authorized ownership, stop and coordinate before claiming traceability; a prose note is not an alias.
4. Feature doc = canonical registry. Test-spec annotation = traceability only, not numbering source.

# Integration Test Generation

## Mode Detection

```
Args = command/query name (e.g., "$integration-test CreateOrderCommand")
  → FROM-PROMPT mode: generate tests for the specified command/query

No args (e.g., "$integration-test")
  → FROM-CHANGES mode: detect changed command/query files from git

Args = "review" (e.g., "$integration-test review Orders")
  → REVIEW mode: audit existing test quality, find flaky patterns, check best practices

Args = "diagnose" (e.g., "$integration-test diagnose OrderCommandIntegrationTests")
  → DIAGNOSE mode: analyze why tests fail — determine test bug vs code bug

Args = "verify" (e.g., "$integration-test verify {Service}")
  → VERIFY-TRACEABILITY mode: check test code matches specs and feature docs
```

> **Modes vs. flagged modes (name-collision note).** The positional `review` and `verify` are lightweight positional branches, not the standalone `--mode=review` (deep quality) or `--mode=verify` (full verification) gates. In `$integration-test → $integration-test --mode=review → $integration-test --mode=verify`, invoke the flagged modes; use the positional branches for quick mid-generation passes.

## Step 1: Find Targets

### From-Changes Mode (default)

Run via Bash tool:

```bash
git diff --name-only; git diff --cached --name-only
```

Filter command/query files by project naming conventions (e.g., `*Command.*`, `*Query.*`). Use `docs/project-config.json` → `modules` or `backendServices` path patterns to derive service:

| Path pattern                                        | Service   | Test project                                         |
| --------------------------------------------------- | --------- | ---------------------------------------------------- |
| Per `docs/project-config.json` service path pattern | {Service} | `{Service}.IntegrationTests` (or project equivalent) |

Search for existing `*.IntegrationTests.*` projects to confirm mapping.

If no test project exists: inform user "No integration test project for {service}. See CLAUDE.md Integration Testing section to create one."

If test file already exists: ask user overwrite or skip.

### From-Prompt Mode

User specifies command/query name. Use Grep (NOT bash grep):

```
Grep pattern="{CommandName}" path="{configured-source-root}" glob="{configured-source-glob}"
```

## Step 2: Gather Context

For each target, read in parallel:

Use the project's actual equivalents below. An absent command/query layer, DI base or user-context factory is N/A; a native harness with fixtures remains a valid integration-test setup.

1. **Command/query file** — extract: class name, result type, DTO properties, entity type
2. **Existing test files in same service** — Glob `{Service}.IntegrationTests/**/*IntegrationTests.*`, read ≥1 for conventions (collection/suite name, test annotations, namespace/imports, base class)
3. **Service integration test base class** — grep: `class.*ServiceIntegrationTestBase`
4. **`references/integration-test-patterns.md`** — canonical templates (adapt {Service} placeholders)

## Step 2b: Look Up TC Codes (Strict TC Default Only)

For each target domain, read:

- `{App}/README.{Feature}.md` Section 8 under the business spec root (default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) — primary source

Build mapping: test-case description → TC code (e.g., "create valid order" → TC-OM-001).

- Uncovered business behavior with no TC → create it in Section 8 before generation. A technical-only contract regression uses the native `TechnicalSpec` carrier without manufacturing a business TC.
- Outdated/incorrect TC → **UPDATE IT** first.
- Missing Section 8 → run `$spec [mode=tests]` first.

## Step 2c: Real-World Fidelity Check (BEFORE any test code is written)

MUST ATTENTION answer BEFORE the Arrange block exists — never after failure:

> **"Can this sequence, timing, and data actually occur in production?"**

For each test, state:

- **Sequence** — can a real actor reach these steps in this order through the tested paths?
- **Pacing** — when actor timing belongs to the tested contract, preserve it; synchronous independent fixture cases need no artificial action delay.
- **Data shape** — can a real use-case path reach every seeded value (see direct-repository-write ban)?
- **Barrier** — for asynchronous steps, name and wait on the observable completion signal in ARRANGE. Synchronous outcomes use normal deterministic assertions.

Any "no" → fix the SCENARIO before writing; NEVER widen an assertion timeout afterward. Full contract: `SYNC:real-world-fidelity-testing`; barrier shape: `references/integration-test-patterns.md` → Pattern 10.

## Test Architecture Contract Preflight (before Step 3)

Before writing code, complete and preserve this additive matrix; it does not replace real-DI, TC-traceability, async-polling, or Real-World Fidelity gates.

| Tier | Applicability + evidence | Owner | Runner/framework | Test root | Fixture/data strategy | Full command | Focused/partial command | Zero-match behavior | CI gate | Simple Windows/macOS/Linux entry point |
| ---- | ------------------------- | ----- | ---------------- | --------- | --------------------- | ------------ | ------------------------ | ------------------- | -------- | --------------------------- |
| Unit | `APPLICABLE` + `{file:line}` or `N/A — {evidence}` | `{owner}` | `{configured runner/framework}` | `{path}` | `{strategy}` | `{copy-ready command}` | `{copy-ready command or N/A + evidence}` | `{non-zero / configured behavior}` | `{gate}` | `{configured entry point or N/A + evidence}` |
| Integration/System | `APPLICABLE` + `{file:line}` or `N/A — {evidence}` | `{owner}` | `{configured runner/framework}` | `{path}` | `{strategy}` | `{copy-ready command}` | `{copy-ready command or N/A + evidence}` | `{non-zero / configured behavior}` | `{gate}` | `{configured entry point or N/A + evidence}` |
| E2E | `APPLICABLE` + `{file:line}` or `N/A — {evidence}` | `{owner}` | `{configured runner/framework}` | `{path}` | `{strategy}` | `{copy-ready command}` | `{copy-ready command or N/A + evidence}` | `{non-zero / configured behavior}` | `{gate}` | `{configured entry point or N/A + evidence}` |

- Record unique run-identity source/format and business-data suffix before generation; carry both into the report. Mark `APPLICABLE` only with runner/framework/config evidence; otherwise record `N/A — <file:line evidence>` and do not fabricate tests.
- Verify every command from project config, reference docs, or runner script. If focused scope is supported, provide its command; otherwise record `N/A` with evidence. Invalid/zero-match selections must fail or use documented non-green behavior; zero matches never pass.
- Record supported public-path setup, realistic valid data, `count-before-create` idempotent reference setup, keyed/additive persistent data, and per-test/worker isolation. Shared mutable state is not run identity.
- Matrix + run identity are required output evidence even for generate/review modes; execution results belong to `$integration-test --mode=verify`.

## Step 3: Generate Test File

**File path:** `{project-test-dir}/{Service}.IntegrationTests/{Domain}/{CommandName}IntegrationTests{ext}` (adapt path/extension per `docs/project-config.json` → `integrationTestVerify.testProjectPattern`)

> **Illustrative folder:** `{Domain}` is a domain grouping when that is the project’s convention. Preserve the actual native organization, including supported type-based layouts.

**Structure:** adapt layout, imports, fixtures, assertions, and markers from existing tests in the configured project.

```csharp
namespace {Service}.IntegrationTests.{Domain};

[Collection({Service}IntegrationTestCollection.Name)]
[Trait("Category", "Command")]  // or "Query"
public class {CommandName}IntegrationTests : {Service}ServiceIntegrationTestBase
{
    // Select distinct behavior, failure and persistence cases from the protected contract
}
```

**Test method naming:** `{CommandName}_When{Condition}_Should{Expectation}`

**Required patterns per command type:**

| Command type | Required tests                                     |
| ------------ | -------------------------------------------------- |
| Save/Create  | Happy path + validation failure + DB state         |
| Update       | Create-then-update + verify updated fields in DB   |
| Delete       | Create-then-delete + `AssertEntityDeletedAsync`    |
| Query        | Filter returns results + pagination + empty result |
| **Owns a universal hard rule or invariant in the selected profile** (orthogonal to the rows above — applies to the same command/query) | **+ Pattern 9 property/metamorphic test** plus boundary counter-case, tied to the profile's canonical invariant case. The strict default uses a §8 Invariant/Property TC; a native profile uses its declared identity/carrier. FORCED, not optional — a mutation of the invariant must fail an assertion. |

> **[FORCED BRANCH — property apparatus]** Pattern 9 is not a "nice-to-have reference". For ANY command/query that enforces a universal hard rule or invariant in the selected profile, example-based rows are NOT sufficient — generate the Pattern 9 property test and boundary counter-case. The strict default maps these to `[HARD]` §4 / §5 and its §8 property TC; a native profile uses its declared rule, case identity, and carrier. Skipping the property or boundary assertion leaves the invariant over-fitted to examples.

> **Review-bar alignment:** `references/mode-review.md` Gate 1 owns acceptance. Name the protected rule and a concrete behavioral break that makes its assertion fail. A per-line Mutation Probe Ledger or mutation tool is not universally required; choose useful strength evidence supported by the project. Preserve required broad-input invariant and boundary coverage under the selected profile.

## Step 4: Verify

Build test project via project's build tool (see `$integration-test --mode=verify` for config-driven build).

Verify the applicable items below against the native runner and tested contract; state N/A for an absent capability rather than inventing it:

- Test collection/group attribute present with correct collection name
- Test category annotation present
- Shared mutable data has unique identities; isolated fixture values may be stable
- User context created via project's user context factory
- Persisted assertions use project helpers and polling only for asynchronous/eventually consistent contracts
- Use real production wiring at the integration boundary under test; test doubles are allowed only outside that boundary and must not replace the protected behavior
- Every test method has the traceability form required by the selected profile. The strict default uses `// TC-{FEATURE}-{NNN}: Description` plus its test-spec annotation.

## Example Files to Study

Search codebase for existing integration test files:

```bash
find . -name "*IntegrationTests.*" -type f
find . -name "*IntegrationTestBase.*" -type f
find . -name "*IntegrationTestFixture.*" -type f
```

| Pattern                                                            | Shows                        |
| ------------------------------------------------------------------ | ---------------------------- |
| `{Service}.IntegrationTests/{Domain}/*CommandIntegrationTests.*`   | Create + update + validation |
| `{Service}.IntegrationTests/{Domain}/*QueryIntegrationTests.*`     | Query with create-then-query |
| `{Service}.IntegrationTests/{Domain}/Delete*IntegrationTests.*`    | Delete + cascade             |
| `{Service}.IntegrationTests/{Service}ServiceIntegrationTestBase.*` | Service base class pattern   |

### How to Use for Each Case

**Case: Generate tests from existing test specs (feature docs Section 8)**

```
$integration-test CreateOrderCommand
```

→ Reads Section 8 TCs, generates test file with TC annotations

**Case: Generate tests from git changes (default)**

```
$integration-test
```

→ Detects changed command/query files, checks Section 8 for matching TCs, generates tests

**Case: Generate tests after $spec [mode=tests] created new TCs**

```
$spec [mode=tests] → $integration-test
```

→ spec [mode=tests] writes TCs to Section 8, then integration-test generates tests from those TCs

**Case: Review existing tests for quality**

```
$integration-test review Orders
```

→ Audits test quality, finds flaky patterns, checks best practices

**Case: Diagnose test failures**

```
$integration-test diagnose OrderCommandIntegrationTests
```

→ Analyzes failures, determines test bug vs code bug

**Case: Verify test-spec traceability**

```
$integration-test verify {Service}
```

→ Checks test code matches specs and feature docs bidirectionally

---

# REVIEW Mode — Test Quality Audit

**[BLOCKING]** When positional `review`, read `references/integration-test-skill-positional-review.md` in full FIRST and follow that branch. The flagged `--mode=review` and `--mode=verify` retain their separate dispatch contracts.

---

# DIAGNOSE Mode — Test Failure Root Cause Analysis

**[BLOCKING]** When positional `diagnose`, read `references/integration-test-skill-positional-diagnose.md` in full FIRST and follow that branch. The flagged `--mode=review` and `--mode=verify` retain their separate dispatch contracts.

---

# VERIFY-TRACEABILITY Mode — Test ↔ Spec ↔ Feature Doc Verification

**[BLOCKING]** When positional `verify`, read `references/integration-test-skill-positional-traceability.md` in full FIRST and follow that branch. The flagged `--mode=review` and `--mode=verify` retain their separate dispatch contracts.

---

## Test Data Setup Guidelines

| Pattern             | When to Use                        | Example                                                      |
| ------------------- | ---------------------------------- | ------------------------------------------------------------ |
| **Per-test inline** | Simple tests, unique data          | `var order = new CreateOrderCommand { Name = UniqueName() }` |
| **Factory methods** | Repeated entity creation           | `TestDataFactory.CreateValidOrder()`                         |
| **Builder pattern** | Complex entities with many fields  | `new OrderBuilder().WithStatus(Active).WithItems(3).Build()` |
| **Shared fixture**  | Reference data needed by all tests | `CollectionFixture.SeedReferenceData()`                      |

**Rules:**

- Every test creates own data — no shared mutable state between tests
- Unique identifiers for shared mutable data (reuse project helpers); stable values are valid in isolated fixtures
- Factory methods return valid entities by default — tests override only what they test
- Cross-entity dependencies: create parent first, then child (e.g., User → Order)
- Feature requires reference/lookup data → set up in collection fixture or per-test preconditions

---

## Test Execution & Failure Diagnosis (MANDATORY)

> **Verify-last exception (`SYNC:verify-last-order`):** when the caller's sequence has a LATER verify step — a parent workflow or plan that runs `$integration-test --mode=verify` or `$test` after its static review — this skill WRITES the tests and does NOT run them: that single verify, after the review, proves them (a fix step that amends a test does not run it either). One exception: characterization tests written BEFORE a refactor moves code are proven green on the unrefactored tree before it moves — inside `workflow-refactor` by its one baseline run (this skill does not run them again), elsewhere by ONE targeted run. The rules below apply in full to a standalone call (no later verify step) and to the verify step itself.
>
> **IMPORTANT MUST ATTENTION:** After generating/modifying integration tests, when no later verify step exists, MUST:
>
> 1. **Run tests:** `$integration-test --mode=verify` (reads `quickRunCommand` from `docs/project-config.json`)
> 2. **If tests fail:** Diagnose root cause — (a) wrong test setup/assertions → fix test, or (b) service bug → report as finding
> 3. **NEVER mark done until tests pass.** Unrun tests have zero value.
> 4. **Iterate:** Fix → rerun → verify until all pass or failures confirmed as service bugs

## Next Steps

**Inside a workflow** (THIS run is a step of a `[Workflow]` row: its own phase tasks are linked to that parent row, `nested=true` — a `[Workflow]` row that merely exists in the current task list, such as an abandoned one, does not count): skip the prompt below — the workflow's own next step is the next action. **Otherwise (standalone, or only an unrelated `[Workflow]` row exists):**

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing, use `ask user question tool` to present:

- **"$integration-test --mode=verify (Recommended)"** — Run integration tests to verify they pass
- **"$workflow-review-changes"** — Review all changes before committing
- **"Skip, continue manually"** — user decides

## Related Skills

| Skill                        | Relationship                                                                         | When to Call                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `$spec [mode=tests]`                  | **Producer** — TCs in feature doc Section 8 are the source for test generation       | Must run spec [mode=tests] before integration-test (CREATE or UPDATE mode). TCs must exist before generating tests. |
| `$work-item --mode=review --type=spec-tests`           | **Upstream reviewer** — validates TC quality before test generation                  | Run before integration-test to ensure TCs have real assertion value                                        |
| `$spec [mode=sync]` | **Sync** — reconciles §8 TCs ↔ executing test code after tests are linked          | Run after integration-test to update the §8 `CoveredBy:` fields with the covering test links         |
| `$spec`              | **TC host** — Section 8 of feature doc is where TCs live                             | If feature doc is missing or Section 8 is empty → run $spec first                                  |
| `$spec [mode=index]`                | **Derived index** — regenerable navigation catalog over the Feature Specs (never a source of truth) | After §8 changes, to refresh the bucket `INDEX.md` TC counts                          |
| `$integration-test --mode=review` | **Reviewer** — one-pass 8-gate audit, including change coverage and real-world fidelity | Call once after generating integration tests                                                              |
| `$integration-test --mode=verify` | **Runner** — executes tests and reports pass/fail                                    | Always call after the --mode=review pass clears                                                           |
| `$docs-manager --mode=update`               | **Orchestrator** — routes to spec [mode=sync] for test traceability              | Run for full doc sync after integration test files updated                                                 |

## Standalone Chain

> **When called outside a workflow**, follow this chain to complete the integration test authoring cycle.

```
integration-test (you are here)
  │
  ├─ PREREQUISITE: TCs must exist in feature doc Section 8
  │    [REQUIRED] Verify: {Bucket}/README.{Feature}.md in the business spec root
  │                 (default docs/specs; specRoots.business.path in docs/project-config.json overrides it)
  │                 Section 8 has TC-{FEATURE}-{NNN} entries
  │    If empty → run $spec [mode=tests] [CREATE mode] first
  │
  ├─ [REQUIRED] → $integration-test --mode=review
  │     One-pass 8-gate audit: assertion value, data state, repeatability, domain logic, traceability, three-way sync, change coverage, real-world fidelity.
  │     Never skip — Gate 6 (three-way sync) is the only place where spec/code/test conflicts surface,
  │     and Gate 7 (change coverage) is the only place where untested changed behavior surfaces.
  │
  ├─ [REQUIRED] → $integration-test --mode=verify
  │     Runs tests and reports pass/fail counts. Never mark complete without real runner output.
  │
  ├─ [REQUIRED] → $spec [mode=sync]
  │     Updates the §8 TCs' CoveredBy: file::method traceability links.
  │
  ├─ [RECOMMENDED] → $docs-manager --mode=update
  │     Updates feature doc evidence fields and version history if test coverage changed materially.
  │
  └─ [RECOMMENDED] → $work-item --mode=review --type=spec-tests
        Re-run if the --mode=review pass (Gate 6) flagged TC issues requiring TC edits.

### Mode-Specific Chains

| Mode | Pre-step | Post-step |
|------|---------|-----------|
| from-changes | verify TCs updated (run $spec [mode=tests] UPDATE first) | $integration-test --mode=review → --mode=verify → /sync |
| from-prompt | confirm TC exists for target feature | $integration-test --mode=review → --mode=verify → /sync |
| review | N/A (read-only) | report findings → $spec [mode=tests] UPDATE if TCs need fixes |
| diagnose | run $test to see failures first | fix identified issue → re-run $integration-test --mode=verify |
| verify-traceability | N/A (read-only) | if orphaned TCs: $spec [mode=tests] UPDATE → $integration-test [from-prompt] |
```

> **[IMPORTANT]** todo tracking — break ALL work into small tasks BEFORE starting. NEVER skip task creation.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `core-engineering-principles` — Core quality gate: easy to change, easy to scale, easy to maintain, judged by future change cost; planning, implementing or reviewing any change → .claude/skills/shared/protocols/core-engineering-principles.md
- `graph-impact-analysis` — Optional blast-radius query that suggests files a high-risk change may affect, a hint that can be stale and never proof; assessing the impact of a high-risk change while the code graph exists → .claude/skills/shared/protocols/graph-impact-analysis.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `integration-test-execution-discipline` — How integration tests are written, reviewed, run, diagnosed and cleared; working in the integration-test skill family → .claude/skills/shared/protocols/integration-test-execution-discipline.md
- `measured-capacity-engineering` — Model demand, reduce measured work safely and prove capacity before scaling; planning, building, testing or reviewing hot paths, caches or capacity → .claude/skills/shared/protocols/measured-capacity-engineering.md
- `rationalization-prevention` — Recognize and reject the evasions used to skip required steps; tempted to skip a step, a test or a review → .claude/skills/shared/protocols/rationalization-prevention.md
- `real-world-fidelity-testing` — Integration, E2E and system tests exercise real boundaries; authoring, reviewing or repairing integration, E2E or system tests → .claude/skills/shared/protocols/real-world-fidelity-testing.md
- `red-flag-stop-conditions` — Conditions that require stopping and escalating to the user; debugging or testing stalls or the risk rises → .claude/skills/shared/protocols/red-flag-stop-conditions.md
- `repeatable-test-principle` — Same contract result across fresh runs and supported concurrency; writing or reviewing tests → .claude/skills/shared/protocols/repeatable-test-principle.md
- `review-decision-autonomy` — Choose supported review decisions and ask before extending the round budget; running any review or audit skill or mode → .claude/skills/shared/protocols/review-decision-autonomy.md
- `review-policy` — Review-only or a three-round fix loop with explicit extension and fresh post-fix evidence; deciding round eligibility, blocking findings or review state → .claude/skills/shared/protocols/review-policy.md
- `source-test-drift-check` — When source behavior changes, reconcile the affected tests from evidence; code, fix, test or review work changes behavior → .claude/skills/shared/protocols/source-test-drift-check.md
- `spec-drift-adjudication` — Decide code-wrong versus spec-stale from evidence, never silently; behavior diverges from its spec → .claude/skills/shared/protocols/spec-drift-adjudication.md
- `spec-tests-code-triangulation` — Review spec, tests and code together for mutual consistency first; reviewing behavior that has a spec → .claude/skills/shared/protocols/spec-tests-code-triangulation.md
- `sub-agent-selection` — Pick the sub-agent type from the routing guide; choosing which sub-agent to spawn → .claude/skills/shared/protocols/sub-agent-selection.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `task-tracking-external-report` — Task breakdown before the work and report files written incrementally; starting any multi-step skill, plan or review → .claude/skills/shared/protocols/task-tracking-external-report.md
- `test-architecture-execution-contract` — Testability as an architecture condition: required test types and execution modes; setting up or reviewing a test architecture → .claude/skills/shared/protocols/test-architecture-execution-contract.md
- `test-data-isolation` — Tests stay independent across the supported concurrency modes; writing stateful tests → .claude/skills/shared/protocols/test-data-isolation.md
- `test-failure-fault-adjudication` — Decide whether the source or the test is at fault before editing either; a test fails → .claude/skills/shared/protocols/test-failure-fault-adjudication.md
- `understand-code-first` — Read and trace the target and existing patterns before changing code; planning or editing code → .claude/skills/shared/protocols/understand-code-first.md
- `verify-last-order` — Build all phases and write tests, review statically, then verify once with a mutation check; planning or running any code-changing task → .claude/skills/shared/protocols/verify-last-order.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** for code work, read the target and relevant conventions before planning or editing; seek 3+ fitting examples when available and record fewer/none. Do not impose code discovery on work with no code surface. The code graph is optional, stale-able advice for high-risk impact, never a requirement.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:graph-impact-analysis:reminder -->

- **Optional advice:** `blast-radius` (when graph.db exists) can suggest impacted files outside the changeset; it is a hint that may be stale, so verify by reading. Never required.

<!-- /SYNC:graph-impact-analysis:reminder -->

<!-- SYNC:red-flag-stop-conditions:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** STOP after 3 failed fix attempts. Report all attempts, ask user before continuing.

<!-- /SYNC:red-flag-stop-conditions:reminder -->

<!-- SYNC:rationalization-prevention:reminder -->

**MUST ATTENTION** follow ALL steps regardless of perceived simplicity; "too simple to plan" is an evasion, not a reason. Plan anyway, test first, show grep evidence with `file:line`.

<!-- /SYNC:rationalization-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->


<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval; inside a workflow run, `$start-workflow` → Workflow-step mode bounds this
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->


<!-- SYNC:test-architecture-execution-contract:reminder -->

**MUST ATTENTION** Each assertion-bearing test names the behavior or technical contract it protects and asserts an outcome it owns. Use the project's configured/native test format — Given/When/Then is one valid format, never a framework-wide requirement. When `specArtifacts` is valid, link configured owner/case/variant identity and `intent/contracts` evidence; when absent, name the guarded business intent or technical contract. A malformed declared profile BLOCKS without fallback. Broad test-format migration → assign an owner and next step, never rewrite cases outside scope.

**MUST ATTENTION** Before implementation record evidence-backed applicability for the test types and modes the task/project contract requires: copy-ready full and focused commands where available, zero-match behavior, a useful platform-appropriate entry point, supported execution modes and environments, state-isolation requirements, exact results, and repeat evidence where persistent state makes it relevant. Exercise claimed modes; report a missing required capability as `ENVIRONMENT-BLOCKED`. Never invent production targets or impose a test format. Browser/UI E2E uses the configured runner's waits or project helper for observable readiness and outcomes; apply action pacing only where the project contract specifies it. Reuse the project's evidenced test organization — require a POM, base class, or component taxonomy only when the project actually selects it.

<!-- /SYNC:test-architecture-execution-contract:reminder -->

<!-- SYNC:measured-capacity-engineering:reminder -->

**MUST ATTENTION** capacity work: model demand/SLO and distinguish sessions from RPS/in-flight work; disclose load model and offered vs achieved demand; reduce measured work at a safe owner; preserve cache authorization/freshness/bounds; prove cold-state, overload recovery and justified headroom before scaling. Static review returns a verification plan, not invented throughput. Retain the hosting skill's scores, gates and authority.

<!-- /SYNC:measured-capacity-engineering:reminder -->

<!-- SYNC:review-decision-autonomy:reminder -->

**MUST ATTENTION** Decide supported review choices and recommendations, record the rationale, and finish without routine user questions. Keep round-limit extension, indispensable facts and actual action authority; preserve source coverage, validation, tests, read-only boundaries and budgets. Review decisions do not accept open risks or make a failed gate pass.

<!-- /SYNC:review-decision-autonomy:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** Testability contract: resolve Unit/Integration/System/E2E applicability, copy-ready full/focused commands, zero-match failures, owner/root/data, CI/simple Windows/macOS/Linux entry, unique run identity, and repeat proof before completion.
**IMPORTANT MUST ATTENTION Goal:** Generate, review, diagnose and verify integration tests that protect the selected case contract through real boundaries and system-owned outcomes.

**IMPORTANT MUST ATTENTION** Main order: (1) FIRST read the selected canonical owner and resolve required case coverage; only the strict default upserts Section 8 TCs; (2) MIDDLE implement real-path tests with the selected traceability carrier; (3) FINAL reconcile changed behavior and the full affected owner/case scope across integration + unit. Per mode: Detect → Find targets → Gather context → Execute → Report.
**IMPORTANT MUST ATTENTION Review route:** `--mode=review [--review-only|--fix-loop] [--prove-tests]` → scope/profile → package → eight gates → validate/deduplicate → report; standalone fix-loop repairs and freshly re-reviews under the shared cap. Runtime proof belongs to `--mode=verify [--fix-loop]`; read its references before execution.
**IMPORTANT MUST ATTENTION** Modes: `from-changes`/`from-prompt` generate; `review` audits; `diagnose` classifies failures; `verify-traceability` audits test↔spec↔feature-doc links. The flagged `--mode=review` and `--mode=verify` remain the heavier gates.
**IMPORTANT MUST ATTENTION** Gates: real wiring at the tested boundary; owned persisted fields when applicable; synchronization matching the boundary; valid setup and fidelity; property/mutation coverage; full affected-owner traceability; configured repeat/isolation policy; review → verify → owner sync.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries) — MUST ATTENTION each canonical body below is in force; this digest is the signpost, NEVER the substitute:**

- **Source/Test Drift Check:** on source change, adjudicate whether tests or source is wrong.
- **Spec↔Tests↔Code Triangulation:** the unit of judgment is the WHOLE PACKAGE (spec §3/§4/§8 + tests + code) — load all three, reason mutual-consistency first; a disagreeing or missing face is a logged finding, NEVER a silent pass.
- **Spec Drift Adjudication:** on behavior divergence from a canonical spec, classify CODE-WRONG / SPEC-STALE / AMBIGUOUS / SPEC-SILENT and harvest unwritten invariants into §4/§8 + a guarding test — NEVER normalize drift to whichever side is green.
- **Understand Code First:** read existing code and grep 3+ patterns before writing.
- **Graph Impact Analysis (optional):** `blast-radius` can suggest impacted files as a stale-able hint; never required.
- **Repeatable Test Principle:** follow the configured isolation and repeat policy; use unique data where runs share mutable state; never reset data owned by another run.
- **Test Data Isolation:** isolate mutable data at the boundary required by the project's supported concurrency; inspect cross-cutting consumers when state unexpectedly changes.
- **Real-World Fidelity Gate:** only test sequences, pacing, and data production can actually reach; barriers wait on a real settle signal in ARRANGE — never a widened assertion.
- **Red Flag Stop Conditions:** escalate on low confidence or breaking change.
- **Rationalization Prevention:** reject step-skipping evasions; show grep evidence, plan anyway.
- **Incremental Persistence:** persist findings to `tmp/reports/` after each file, never in memory.
- **Sub-Agent Return Contract:** sub-agents return only the summary shape, detail on disk.
- **Sub-Agent Selection:** route specialized domains to matching specialists, never `code-reviewer`.
- **Nested Task Creation:** child skills expand visible phase tasks and link the parent.
- **Task Tracking & External Report:** bootstrap task breakdown, transition one task at a time.

- **MANDATORY IMPORTANT MUST ATTENTION** NEVER write smoke-only tests — instead read handler/entity/event source, assert specific changed field values — why: DI-resolution / exception-null-only tests pass while the behavior is broken
- **MANDATORY IMPORTANT MUST ATTENTION** use bounded condition-based polling for asynchronous/eventually consistent outcomes; synchronous persistence uses deterministic reads — why: synchronization must match the actual contract
- **MANDATORY IMPORTANT MUST ATTENTION** preserve valid setup and the actual tested boundary; use project fixtures/builders for unrelated preconditions, never a shortcut that bypasses the protected behavior
- **MANDATORY IMPORTANT MUST ATTENTION** search 3+ existing tests in the SAME service and READ `references/integration-test-patterns.md` BEFORE writing — match collection, base class, helpers, unique-name generators — why: local conventions override generic templates
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence (confidence >80% to act, <60% do NOT recommend) for every claim about field changes, entities, or handler behavior — why: AI hallucinates APIs/signatures; grep to confirm before asserting
- **MANDATORY IMPORTANT MUST ATTENTION** todo tracking — break ALL work into small tasks BEFORE starting; transition one task at a time, add a final review task — why: tracking survives context loss/compaction
- **MANDATORY IMPORTANT MUST ATTENTION** execute the main task ordering IN ORDER — (1) FIRST verify/upsert TCs in feature-doc §8 for business-visible behavior, or record `TECHNICAL-ONLY` for non-business behavior, (2) MIDDLE implement tests with the correct annotation, (3) FINAL verify traceability, feature-area-WIDE, across integration + unit suites — and run the per-mode loop Detect mode → Find targets → Gather context → Execute → Report — why: implementing before traceability exists produces orphans and skipping FINAL leaves drift undetected
- **MANDATORY IMPORTANT MUST ATTENTION** run the named "Validate: no missing integration tests" todo tracking item — non-skippable inside a workflow, with current git changes present, or by user request (essentially every run) — every changed file covered AND every §8 TC in the WHOLE feature area covered, zero GAP rows before marking done — why: a diff-scoped-only check misses pre-existing orphaned TCs outside this run
- **MANDATORY IMPORTANT MUST ATTENTION** every test method carries a traceability annotation: `TestSpec=TC-{FEATURE}-{NNN}` for business §8 coverage, or `TechnicalSpec=...` for technical-only regression coverage. Auto-create in Section 8 ONLY for genuinely uncovered business behavior — why: the annotation is the join key for traceability
- **MANDATORY IMPORTANT MUST ATTENTION** one business TC maps to MANY tests (1:N, integration + unit) — NEVER split or technicalize a TC to force 1:1 — why: 1:1 splitting breaks the spec's business/user-story orientation (M1/M5)
- **MANDATORY IMPORTANT MUST ATTENTION** for a broad-input invariant, use property/metamorphic checks supported by the project plus relevant boundary counter-cases tied to the selected profile’s identity/carrier (strict default: §8 Invariant/Property TC) — why: example tests guard fixed points; the rule must fail across its whole input domain (mutation-kill, not line-coverage)
- **MANDATORY IMPORTANT MUST ATTENTION** preserve documented project-native test organization; group by domain only where that convention applies
- **MANDATORY IMPORTANT MUST ATTENTION** follow configured repeat/isolation policy; absent one, two fresh green runs prove persistent/shared-state or async suites, while isolated deterministic cases use normal runner proof. Never reset another run's data.
- **MANDATORY IMPORTANT MUST ATTENTION** make every test parallel-safe — own fresh per-test data down to the root it asserts on, NEVER a shared mutable entity; account for cross-cutting consumers (bulk re-sync/recompute/rebuild/cascade) that wipe a shared parent; on a contradiction between a provably-innocent path and wrong state, suspect cross-test interference FIRST and prove isolation by grepping other tests + consumers — why: shared mutable state lets another test silently corrupt your data and the innocent path takes the blame
- **MANDATORY IMPORTANT MUST ATTENTION** apply the Real-World Fidelity Gate BEFORE writing any setup — ask "can this sequence, timing, and data actually occur in production?", model real pacing between distinct actor actions instead of firing them in the same millisecond, and wait on an observable settle signal in ARRANGE; NEVER widen an assertion timeout, loosen a comparison, or wrap a failing assertion in a retry to compensate — why: a scenario production can never reach proves nothing when it passes and manufactures phantom "product defects" when it fails
- **MANDATORY IMPORTANT MUST ATTENTION** positional `review`/`verify` are lightweight positional branches — invoke `--mode=review` and `--mode=verify` for the heavier workflow gates — why: name-collision; the positional branches are not the standalone gates
- **MANDATORY IMPORTANT MUST ATTENTION** passing code/tests NEVER outrank canonical product/spec intent — instead reach adjudication-required with evidence before changing spec/test/code on a behavior mismatch — why: a green test can encode a regression
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**Anti-Rationalization:**

| Evasion                            | Rebuttal                                                                                             |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| "Test is simple, skip TC lookup"   | TC traceability = test value. Skip = untraceable test.                                               |
| "Async polling not needed here"    | Poll only for an asynchronous/eventually consistent contract; synchronous persistence should use deterministic reads. |
| "Already searched patterns"        | Show `file:line` evidence. No proof = no search.                                                     |
| "Smoke test is fine for now"       | Smoke-only FORBIDDEN. Assert specific field values.                                                  |
| "Repo setup is faster"             | Use the production path for the behavior under test; use valid project fixtures for unrelated preconditions. |
| "One green run is enough"          | Follow the configured repeat policy; absent guidance, repeat fresh runs for suites with shared or persistent state. |
| "It shares an existing entity, that's fine" | Shared mutable state is the single point another test corrupts. Own fresh per-test data; only immutable lookup data may be shared. |
| "My path doesn't mutate that parent" | A cross-cutting consumer can wipe the shared parent without you touching it. Sharing it is unsafe even without direct mutation. |
| "The path under test is correct, so the test is right" | Provably-innocent path + wrong state = suspect cross-test interference FIRST. Grep other tests + cross-cutting consumers before blaming the code. |
| "A second review will settle uncertainty" | One pass only. Return `NOT VERIFIABLE` with the missing evidence; a later pass requires a new explicit invocation. |
| "Skip task creation, it's obvious" | todo tracking is non-negotiable. Tracking prevents context loss.                                        |
| "Split this TC so tests map 1:1"   | Preserve the selected profile's declared case-to-test cardinality; strict default allows one business TC to cover multiple tests. |
| "Example tests cover the rule"     | Use property/metamorphic tests when a rule must hold across a broad input domain; retain focused examples for concrete scenarios. |
| "Run `review` mode, it's the gate" | positional `review`/`verify` are inline passes; the workflow gates are `$integration-test --mode=review` + `$integration-test --mode=verify`. |

**IMPORTANT MUST ATTENTION** Apply the Easy-to-Change lens: every test/design choice must make the next change cheaper; reject coupling, hidden state, duplicated knowledge, and unclear intent.
**IMPORTANT MUST ATTENTION** Final guard: use production-like wiring at the tested integration boundary; assert system-owned outcomes; follow the selected case carrier and configured repeat/isolation policy; retain zero-GAP/UNKNOWN coverage for the declared scope.

<!-- SYNC:core-engineering-principles:reminder -->

**MUST ATTENTION** Core Engineering Principles — every plan, implementation and review must be **Easy to change** (reuse first, one owner per rule, interfaces/adapters at volatile boundaries, no speculative abstraction) · **Easy to scale** (extend by addition, bounded growth, explicit boundaries, sized to the project's real profile) · **Easy to maintain** (intent-named tests that fail when the rule breaks across happy/error/edge paths; harness green locally and in CI). Before done: next change → how many edit sites? 10× → what breaks? which test goes red?

<!-- /SYNC:core-engineering-principles:reminder -->


<!-- SYNC:review-policy:reminder -->

**MUST ATTENTION** Triage all targets, plan and create review/validation/fix/fresh re-review tasks first. Review-only reports without edits; fix-loop freshly reviews every repair under one fixing owner. Default cap three rounds: disclose deferred LOWs, ask and wait before a bounded extension for MEDIUM+ or failed required checks. Preserve scope, coverage and actual operation authority.

<!-- /SYNC:review-policy:reminder -->
