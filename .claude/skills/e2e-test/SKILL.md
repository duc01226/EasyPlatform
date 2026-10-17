---
name: e2e-test
description: '[Testing] Use when a workflow step or the user asks for E2E test selection, generation or updates. --mode=verify runs tests; --fix-loop repairs failures; --visual-review={true|false}.'
---

> **[BLOCKING] Mode routing — detect FIRST.** Explicit `--mode=verify` selects verification; no mode is default E2E test authoring (everything below, unchanged). `/e2e-test --mode=verify` is the former `/e2e-test-verify`: that slash command no longer exists, and the mode works called directly with no workflow. Read the mode file in full before anything else (see [Mode Dispatch](#mode-dispatch)).

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval. Inside a workflow run, `/start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **E2E Quality Protocol** — the shared gate covers user-flow intent, configured locator/action ownership, isolated fixtures/data, auth/permissions, applicable accessibility/responsive/visual checks, bounded waits, readable failure evidence, cleanup, and test-to-spec traceability.
> **MUST ATTENTION READ** `.claude/skills/shared/e2e-quality-protocol.md` before writing or updating an executable E2E/browser/user-flow case; keep the detailed gate there and record only its result here.
> **UI State Capture Protocol** — when the case touches a user-facing UI and visual review is enabled, also **MUST ATTENTION READ** `.claude/skills/shared/ui-state-capture-protocol.md`: it owns the action-layer auto-capture instrumentation, the capture manifest, and the case-by-case review the captures feed.

## Quick Summary

**Goal:** Produce or select maintainable, spec-traceable E2E tests from the user prompt/current context, recordings, canonical artifacts, or code changes with the project's configured framework (Playwright, Selenium, Cypress, or another), then exercise the declared scope like a human QC tester and protect business behavior so cosmetic UI changes do not break tests and intended behavior breaks do. Resolve case identity from the configured artifact profile; use TC/§8 only when no native `specArtifacts` profile is declared.

**Summary:**
- **Testability contract:** resolve Unit/Integration/System/E2E applicability from runner/config evidence; record owner/root/data, copy-ready full + focused commands, zero-match behavior, CI/simple Windows/macOS/Linux entry, unique run/data identity, and repeat proof; unresolved applicable fields block handoff, while non-applicable tiers require evidence-backed `N/A`.

- **Purpose:** turn recordings/specs/code changes into maintainable, spec-traceable E2E tests that break ONLY when intended business behavior breaks — never on cosmetic UI churn.
- **Main steps (in order):** (1) resolve scope from the prompt/current context/artifact/code and default whole-project intent; (2) read the configured E2E reference, `e2eTesting` block, `specRoots.business.path`, and optional `specArtifacts` profile from `docs/project-config.json` FIRST — never assume a stack or invent an ID/annotation marker; (3) resolve the optional `e2eTesting.execution` profile and linked `experienceVerification` surface; (4) load owner-qualified scenario/case IDs and their configured evidence from the canonical root using the profile's identifiers, carriers, and section roles; when no native profile is declared, use the default TC/§8/Test Specifications model; (5) pass the Real-World Fidelity Gate BEFORE writing test code — can this flow, timing, and data actually occur in production?; (6) select a suitable existing test or generate/update one using the configured test organization (spawn the `e2e-runner` sub-agent); (7) bring up the configured whole system, authenticate/seed only through project-owned paths, and run visible web QC/evidence when applicable; (8) run tests with the project's configured command; (9) update the configured E2E reference with learnings.
- Every test uses the case identity and carrier declared by the artifact profile and maps its owner-qualified case/variant plus configured requirement/acceptance references to the actual executing test, assertion, and result, respecting profile cardinality. The strict default profile uses a `TC-{MODULE}-E2E-{NNN}` case traced to §8; if the owner, ID, evidence, or assertion cannot be resolved, keep coverage unresolved as `UNVERIFIED` rather than inventing a registry or claiming a pass. Follow the configured locator/action organization, extracting helpers or objects only when its convention or demonstrated reuse warrants them; keep final behavior assertions visible in the test.
- For applicable browser/UI E2E, use the configured runner's native waits or an evidenced project helper for observable readiness and expected outcomes. Apply action pacing only when project config specifies it; a delay never replaces a wait or settle signal.
- When visual review is requested or required by the project contract for an applicable visual surface, capture the required state × viewport matrix. Add transition captures only when `uiStateCapture.mode` is explicitly `every-action` and a source-verified shared boundary supports them; `declared-only` records transition gaps and `off` records transition coverage as `N/A`. Send configured evidence to `/experience-review` for case-by-case adjudication. An explicit false value cannot waive a project-required gate. Do not update snapshots, baselines, or assertions automatically.
- **Shared quality gate:** Before authoring, apply `.claude/skills/shared/e2e-quality-protocol.md` to the scenario and preserve its Given/When/Then, invariant, gate-row, evidence, and owner records; this skill owns test selection/generation, not the detailed cross-skill checklist.
- For browser E2E, prefer accessible semantics (role plus accessible name, associated label, or the platform's accessibility identifier); use an explicit stable test hook next. Use visible text or another project-configured stable locator only when needed. Styling classes, including BEM or utility classes, are not semantic locators; avoid generated or positional selectors and XPath unless the project documents a reviewed exception.
- Use the project's fixture/data strategy and isolate mutable test state; choose unique run data when concurrency or shared state requires it. NEVER delete or reset persistent, reference, seeded, additive, or shared data. If the project declares opt-in cleanup, remove only current-run ephemeral resources after evidence capture and never use cleanup as repeat-proof. Workflow routing follows the route gate; this skill starts no workflow itself (the hand-off is suggested in Next Steps). If the requested prompt/context scope has no suitable test, generate a scenario in the project's declared format; if a suitable test exists, reuse it and report why it covers the scope.

**Workflow:**

1. **Resolve** — classify prompt/current-context/spec/code scope, affected observable surfaces, and whole-project vs focused intent.
2. **Read** — **MUST ATTENTION** load the E2E reference, `e2eTesting` config, optional `execution` profile, linked `experienceVerification` surfaces, `specRoots.business.path`, and optional `specArtifacts` profile before writing; resolve case evidence from the configured root and carrier.
3. **Gate** — pass the Real-World Fidelity Gate for flow, pacing, data, and settle signals; resolve startup/auth/seed/evidence capability as `APPLICABLE`, `N/A`, or `ENVIRONMENT-BLOCKED`.
4. **Select or generate** — reuse a suitable project test when one exists; otherwise follow the project's configured test organization and use the `e2e-runner` sub-agent with traceability and Given/When/Then intent. Do not infer a Page Object Model from a path setting alone.
5. **Exercise and verify** — bring up the real system, use the visible configured browser for web QC, capture/read evidence, run configured tests, confirm exact results, and record learnings.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`), confidence >80% to act.
- MUST ATTENTION apply the Real-World Fidelity Gate before writing setup — a flow, pacing, or data shape production can never reach proves nothing; fix the SCENARIO, never the assertion.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION apply the shared E2E quality protocol before writing and carry every applicable gate verdict into the report.
- NEVER skip mandatory workflow or skill gates.

## Contents

- [Quick Summary](#quick-summary)
- [Mode Dispatch](#mode-dispatch)
- [⚠️ MANDATORY: Read Project E2E Reference (FIRST)](#️-mandatory-read-project-e2e-reference-first)
- [Framework Detection (SECOND STEP)](#framework-detection-second-step)
- [E2E Applicability and Contract Preflight (before generation)](#e2e-applicability-and-contract-preflight-before-generation)
- [E2E Execution Profile and Human-QC Preflight](#e2e-execution-profile-and-human-qc-preflight)
- [Visual Screenshot Review (when requested or required)](#visual-screenshot-review-when-requested-or-required)
- [UI State Capture](#ui-state-capture)
- [Workflow Modes](#workflow-modes)
- [Visual Expectation Transition Gate](#visual-expectation-transition-gate)
- [First Principle — Easy to Change · Easy to Scale · Easy to Maintain](#first-principle--easy-to-change--easy-to-scale--easy-to-maintain)
- [Core Principles](#core-principles)
- [Steps](#steps)
- [Output](#output)
- [Sub-Agent Type Override](#sub-agent-type-override)
- [Next Steps](#next-steps)
- [Prompt-Enhance Closing Anchors](#prompt-enhance-closing-anchors)
- [Closing Reminders](#closing-reminders)

## Mode Dispatch

Select the invocation route before execution; load only its mode reference.

| Mode | Purpose | Read in full FIRST |
| --- | --- | --- |
| _(none)_ | Default E2E test authoring — this file | — |
| `--mode=verify [--fix-loop] [--visual-review={true\|false}] [scope]` | Verify an existing configured E2E scope with exact runner evidence: a report-only default pass, or with `--fix-loop` the bounded convergence engine (`workflow-e2e` calls it). | [references/mode-verify.md](references/mode-verify.md) |

- **[BLOCKING]** When `--mode=verify`, read `references/mode-verify.md` in full FIRST; it replaces test authoring for the invocation and owns `--fix-loop` and `--visual-review={true|false}` (no flag is set by default: no `--fix-loop` = one report-only pass that edits nothing). Workflow invocation and standalone both run it; report-only callers never pass `--fix-loop`.
- Authoring never chains into verification. The `verify` row of the Workflow Modes table names this separate invocation over existing tests.

## ⚠️ MANDATORY: Read Project E2E Reference (FIRST)

**BEFORE ANY E2E WORK, you MUST ATTENTION:**

```bash
# 1. Read project-specific E2E patterns (REQUIRED)
head -100 docs/project-reference/e2e-test-reference.md

# 2. Read project config for the framework, owner root, artifact profile, and commands
grep -A 50 '"e2eTesting"' docs/project-config.json
grep -A 20 '"specRoots"' docs/project-config.json
# Read `specArtifacts` too when declared; use its configured IDs, carriers, and evidence sections.

# 3. Only when no native `specArtifacts` profile is declared, find default-profile TC cases
grep -r "TC-.*-E2E-" <resolved-business-spec-root>
```

**Resolve these project facts from `docs/project-config.json`:**

- `e2eTesting`: framework, language, E2E paths, run commands, and annotation mechanism.
- `specRoots.business.path`: canonical business-artifact owner root from project configuration; use the framework config loader's fallback only when unset.
- Optional `specArtifacts`: configured requirement/acceptance/scenario IDs, owner relation, carriers, and intent/contract/evidence section roles. When absent, use the strict default TC/§8/Test Specifications model. A declared but invalid or incomplete profile blocks traceability; never fall back to TC/§8.

**When investigating/fixing E2E failures, update `e2e-test-reference.md` in the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) with learnings.**

- `domain-entities-reference.md` under the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models)

---

## Framework Detection (SECOND STEP)

Detect the project's E2E stack before generating tests:

```bash
# Use project config, project-reference docs, and existing test config files as the source of truth
rg "playwright|cypress|selenium|webdriver|e2e" docs/project-config.json docs/project-reference/ . 2>/dev/null
rg --files | rg "(playwright|cypress|webdriver|selenium|e2e|test).*config|manifest|project"
```

| Framework                 | Config Source               | Test Naming             | Run Command                    |
| ------------------------- | --------------------------- | ----------------------- | ------------------------------ |
| Configured E2E framework  | project config/reference docs | existing local examples | configured test command        |

## E2E Applicability and Contract Preflight (before generation)

Record E2E as `APPLICABLE` only when the project config/reference docs, an actual framework configuration, and a runnable command all provide evidence. Otherwise record `N/A — <file:line evidence>` and stop E2E generation for that project; never infer a browser project from skill-local examples. If the current repository has no runnable E2E stack, record that project-specific evidence-backed N/A in the report; do not fabricate a browser stack, page object, or E2E command.

When E2E is applicable, add the following fields to the test plan/report before generating code:

| Applicability evidence | Owner / test root | Runner/framework | Full command | Focused/partial command | Zero-match behavior | Run identity / data mode | Parallel isolation | Simple Windows/macOS/Linux entry point |
| ---------------------- | ----------------- | ---------------- | ------------ | ------------------------ | ------------------- | ------------------------ | ------------------ | --------------------------- |
| `{file:line}` | `{owner}` / `{path}` | `{configured stack}` | `{copy-ready command}` | `{copy-ready command or N/A + evidence}` | `{documented non-zero behavior}` | `{unique identity; reference/additive mode}` | `{worker/root strategy}` | `{entry point or N/A + evidence}` |

- Use only configured browser/service commands. A focused selection must be copy-ready and invalid or zero-match selections must fail or follow the runner's documented non-green behavior; never report zero matches as a passing scope.
- Generate unique self-sufficient data through supported public paths. Reference data is count-before-create, idempotent, and restart-safe; intentional persistent data is keyed and additive. Preserve realistic actor pacing and arrange barriers, and isolate mutable data across parallel workers.
- Capture exact Passed/Failed/Skipped counts and exit status for each applicable focused/full scope; one fresh green full run converges unless the project configures more (`e2eTesting.execution.convergence.consecutiveGreen`). Two consecutive runs are the integration-test rule, not this one. If no runnable E2E stack exists, report the evidence-backed N/A instead of substituting generic browser tooling.

## E2E Execution Profile and Human-QC Preflight

When `docs/project-config.json` contains `e2eTesting.execution`, resolve it before choosing a runner:

| Profile area | Resolve | Source of truth / fail-closed result |
| --- | --- | --- |
| `surfaceIds[]` | Match each ID to `experienceVerification.surfaces[]` | Matching surface owns `localRun`; an unknown/missing surface is `ENVIRONMENT-BLOCKED` until discovered and configured |
| `auth` | Fixture, storage state, registration, manual, or none | Use only `credentialsRef`/`storageStateRef` references or a verified registration path; never copy secret values; missing capability blocks |
| `data` | Seed command, project-relative working directory, reference/idempotent/additive mode, cleanup policy | Use supported public setup, unique run data, and current-run-only cleanup after evidence; never reset shared state |
| `browser` | Configured runner/engine, headed visibility, optional action-delay policy | Use the configured runner's native wait strategy or an evidenced bounded helper for applicable readiness and outcomes; apply a delay only when the project contract specifies it |
| `evidence` | Project-relative root, screenshot/console/request/trace/video kinds, redaction reference | Attach listeners before interaction, capture and read artifacts, redact sensitive values; unread or unredacted evidence is not verification |
| `convergence` | Max attempts, consecutive-green requirement, settle timeout | Use a bounded loop; cap, non-shrinking/rising failures, or missing capability escalates rather than retrying forever |

If the profile is absent or partial, discover missing facts in this order: linked
`experienceVerification.surfaces[].localRun`, the E2E reference and runner
configuration, package/task/compose/CI scripts, fixture/seed/auth documentation,
then bounded repository search. Cite every discovered command and path. Do not
invent ports, accounts, selectors, browser dependencies, or test commands.

Before generating a test, write a small scenario record:

```text
GIVEN <verified actor, fixture/data, and starting state>
WHEN <real user actions through the configured interface>
THEN <visible/persisted/business outcome and relevant error/recovery state>
OWNER <configured canonical artifact path, or the authoritative source-contract owner>
CASE <owner-qualified configured scenario/case ID and optional variant>
INTENT <configured requirement/acceptance IDs and protected invariant, or authoritative source rule>
EVIDENCE <configured evidence-section heading and test carrier; default §8/Test Specifications only when no native profile is declared>
EXECUTOR(S) <actual test/case carrier(s)> · ASSERTION(S) <actual assertion(s)> · RESULT(S) <exact run result(s), otherwise UNVERIFIED; honor configured cardinality>
WAITING <runner-native or project-configured bounded condition for meaningful readiness/outcomes>
SETTLE <observable readiness/state signal after each meaningful action>
```

For a browser run, keep it visible when `headed` is true or human-QC is
requested, and record the viewport/device/locale/network conditions that apply.
Use the configured runner's native wait strategy or an evidenced project
helper for bounded readiness and positive/negative outcomes. Apply action delay
only when configured; it never replaces a readiness, postcondition, or settle
signal.

When visual review is enabled, record the state × viewport capture plan and use
the project's configured runner and evidence policy. Capture transitions only
when `uiStateCapture.mode` is explicitly `every-action` and the project has a
verified capture boundary; otherwise follow `declared-only` or `off` as
configured. `/experience-review` opens and reads generated images and judges
them against the applicable project UI authority. Keep candidate captures
under the configured evidence root or `tmp/` and preserve accepted expectations.

## Visual Screenshot Review (when requested or required)

The framework has no universal screenshot-review default. Resolve visual review
from the task request and project contract; non-visual work or a visual surface
with no applicable requirement is `N/A` for this gate. When screenshots are
required, capture the project-declared state × viewport matrix
and add UI-state-changing transitions only when the resolved
`uiStateCapture.mode` is `every-action` and an evidenced capture boundary exists.
Preserve candidate artifacts, open/read each image, and send the image evidence through
`/experience-review --rounds=0` before any expectation or baseline decision.
Missing capture, unread images, an unindexed capture, or missing inspection for
an applicable visual surface is `ENVIRONMENT-BLOCKED`, not a pass. An explicit
`--visual-review=false` may skip optional screenshot review only; it cannot
waive a project-required gate or skip E2E execution, runtime evidence, or the
other acceptance gates.

**E2E may carry separate behavior and visual gates.** The configured run proves
the journey's behavior. When visual review applies, its captures provide
separate evidence about the interface against the project's design authority;
a green behavior suite does not substitute for a visual gate the project
requires. Skip that gate when it is out of scope and record why.

## UI State Capture

Full contract: `.claude/skills/shared/ui-state-capture-protocol.md`. The
project-level default is `uiStateCapture.mode: declared-only`: capture the
configured state × viewport matrix and report uncaptured journey transitions as
coverage gaps. `every-action` is opt-in and requires a source-verified existing
capture boundary; use the runner's native readiness/postcondition waits and
project-configured pacing. `off` skips transition capture only and follows the
shared contract for the declared matrix and visual-review gate. Do not create a
page-object model, base class, helper, or per-test screenshot pattern solely to
satisfy this framework protocol. The manifest uses the configured case identity
and evidence root; when no native artifact profile exists, follow the strict
default TC identity.

---

## Workflow Modes

| Mode             | Input                      | Output                       |
| ---------------- | -------------------------- | ---------------------------- |
| `from-recording` | Recording JSON + feature   | Test spec + artifacts required by the project's configured organization |
| `from-prompt` | User prompt describing a journey or bugfix | Reused or generated GWT scenario + test/evidence report |
| `from-context` | Current diff, runtime context, or selected whole-project scope | Selected/generated tests + fixed-scope verification record |
| `update-ui`      | Git diff of UI changes     | Candidate evidence plus an explicit acceptance decision; accepted baseline changes only after approval |
| `from-changes`   | Changed test specs or code | Updated test implementations |
| `from-spec`      | Configured owner-qualified case/variant IDs and intent references | Tests mapped to accepted intent |
| `verify` | Existing configured suite and current context — run it with `--mode=verify` | Exact run result, evidence, adjudication, and blocker/escalation record |

---

## Visual Expectation Transition Gate

For `update-ui`, screenshot or visual output is candidate evidence until it has
been opened, inspected, compared with the intended purpose, and linked to an
explicit `HUMAN-ACCEPTED` record through `/experience-review`. Do not call
`--update-snapshots`, replace visual fixtures, or rewrite another expected
output merely because the new run passes or the generated evidence looks
plausible. Preserve the previous accepted expectation and classify a mismatch
as a potential regression, intended change pending acceptance, invalid test
condition, environment block, unverified, or ambiguous. Full contract:
`SYNC:experience-acceptance-contract`.

---

## First Principle — Easy to Change · Easy to Scale · Easy to Maintain

> The full gate is `SYNC:core-engineering-principles` (protocol guide below; a hook delivers its text); its closing digest ends this file.

---

## Core Principles

### 1. Profile-Resolved Case Traceability (MANDATORY)

**For every behavior-bearing E2E case MUST ATTENTION:**

- Resolve the canonical owner under `specRoots.business.path` and requirement/acceptance/scenario/case IDs from optional `specArtifacts.identifiers`, `ownership`, and `carriers`; include its configured variant when applicable.
- Map that owner-qualified identity to the actual executing test/case declaration(s), assertion(s) protecting its accepted intent, and exact run result(s), respecting configured cardinality. Use `specArtifacts.sections.evidence` and the declared carrier; when no native profile is declared, the strict default is a TC case in §8/Test Specifications.
- Record unknown or missing owner, ID, evidence, executor, or assertion as unresolved `UNVERIFIED`; it cannot receive `PASS`. Never infer identity from a test title alone when the declared profile requires an owner/carrier, and never create a parallel case registry.

The following is an example **only for the strict default profile when no native `specArtifacts` profile is declared**. Otherwise use the identifier and carrier selected by project config; never invent a framework-specific marker.

```typescript
// Default-profile example only
test('TC-RT-E2E-001: Submit return request', async () => { ... });
```

> **Spec-Loop Discipline (E2E tier — tailored).** Trace each configured requirement/acceptance and owner-qualified case/variant through its evidence section to the actual executing assertion(s) and result(s), preserving profile cardinality. Use the profile's intent/contract sections to name the protected behavior; only the strict default profile uses the §8 invariant/behavior and TC case. A case with no actual assertion, or a behavior gap in either direction, remains unresolved and feeds the **Dual-Feedback** loop to the canonical owner and test together — never a test-only fix or duplicate case registry. **Scoped N/A:** property/metamorphic generation and the MUTATION-SCORE assertion gate are scoped to unit/integration core-logic; they do NOT apply at the E2E tier — do not force them here.

### 2. Test organization and locator/action ownership

Before creating or changing test abstractions, read the project's configured E2E reference and `e2eTesting` configuration, then inspect comparable tests, helpers, and objects where present. Follow the explicit local organization and record the choice with its evidence in the test plan or handoff. A configured object path identifies where objects live; it does not, by itself, require a Page Object Model. If no organization is declared, keep one-off locators in the test and extract a small helper/object only when demonstrated reuse gives it a clear owner.

- Keep each locator and interaction in the owner established by the project pattern.
- A scenario-local scoped locator is appropriate for a one-off interaction. Use a shared helper or object when the project convention calls for it or repeated behavior has a clear reusable owner.
- Use page/component objects and layered Common, Domain-Shared, or Page organization when configured or supported by concrete reuse. Do not add a base class, tier, wrapper, or empty object solely to satisfy a framework taxonomy.
- Keep the final business outcome assertion and scenario intent visible in the test. Abstractions may provide reusable actions but must not hide the behavior the test protects.
- Keep data, authentication, evidence, and readiness helpers cohesive and purpose-specific; do not create catch-all utility classes. Keep one canonical owner for each selector/action/wait when the configured pattern has shared owners.

### 2.2 Readiness and Postcondition Synchronization

E2E tests should read like a human: observe → act → observe. Use the configured
runner's native wait strategy or an evidenced project helper for applicable
readiness/actionability and positive or negative postconditions. Bound custom
waits and include useful diagnostics. Do not require a helper API, polling
utility, or object organization that the project does not use.

Before an action, establish the applicable ready/actionable state using the
configured runner. After it, wait for the expected result or error before the
next dependent action and keep the final assertion visible in the test. A
timeout is a test failure with diagnostics, not a reason to weaken an
assertion. Apply configured action pacing only after meaningful waits; it never
replaces readiness, postconditions, or settle signals. Capture a transition at
this boundary only when `uiStateCapture.mode` is `every-action` and the
configured project boundary supports it.

### 3. Selector Strategy (Priority Order)

1. **Accessible semantics** — role plus accessible name, associated label, or the platform's native accessibility identifier
2. **Explicit test hooks** — project-owned stable identifiers such as `[data-testid]` or `[data-cy]`
3. **Project-configured stable locators** — visible text or another documented locator when the semantic or test-hook options do not fit

**AVOID:** Styling classes as semantic locators (including BEM or utility classes), generated classes, positional selectors (`:nth-child`), and XPath unless the project documents a reviewed exception.

### 4. Unique Test Data

Tests MUST generate unique data to be repeatable:

- Append GUIDs/timestamps to test data
- Make each test self-sufficient with own generated data; NEVER depend on specific pre-existing database state
- Preserve seeded, reference, additive, and shared data. If the project declares opt-in cleanup, remove only current-run ephemeral resources after evidence capture — why: teardown across shared runs creates side effects for parallel/repeat tests

### 5. Preconditions Documentation

Document what must exist before test runs:

- System: Infrastructure running, APIs healthy
- Data: Seed data exists (users, companies)
- Feature: Configurations complete

---

## Steps

1. **Resolve scope** from prompt/current context/spec/code; default to the whole configured E2E scope unless the user names a narrower feature/bugfix/journey.
2. **Detect framework** from project files and the configured profile; a skill-local browser helper is never project evidence.
3. **Read project E2E docs** and `e2eTesting.execution`/linked surface data for conventions, setup, auth, data, runner, evidence, and convergence.
4. **Load case intent** — resolve `specRoots.business.path` plus the configured `specArtifacts` identifiers, ownership, carriers, evidence sections, and cardinality. Without a native profile, use the strict TC/§8 default when a canonical artifact exists. If none exists, use prompt/source intent, mark the missing owner/case mapping `UNVERIFIED`, and flag canonical-owner feedback; never invent a case ID.
5. **Write Given/When/Then intent** with the invariant, realistic actor pacing, the configured runner's bounded readiness/postcondition strategy, and an observable settle signal for every meaningful action where one exists.
6. **Check real-world fidelity** — BEFORE any test code is written, answer *"Can this flow, timing, and data actually occur in production?"* Any "no" → fix the SCENARIO, never the assertion. Full contract: `SYNC:real-world-fidelity-testing` below.
7. **Select or generate/update tests** following the configured project organization; spawn `e2e-runner` for generation/maintenance.
8. **Bring up and exercise** the configured whole system, authenticate/seed through supported project paths, use a visible web browser when applicable, capture/read evidence, and classify missing capability honestly.
9. **Run tests** using the project's configured commands and report exact counts/exit status and repeat proof.

---

## Output

Report:

- Files created/modified
- Owner-qualified case/variant IDs and requirement/acceptance references covered; their configured evidence section and carrier, actual executor/assertion/result, and verdict (`UNVERIFIED` when unresolved; TC/§8 only under the strict default profile)
- Run command to execute tests (configured full command)
- E2E applicability and evidence (`APPLICABLE` or `N/A — <file:line evidence>`)
- Full and focused/partial commands, zero-match behavior, and simple Windows/macOS/Linux entry point (or evidence-backed N/A)
- Run identity, reference/additive data mode, parallel-isolation strategy, and exact Passed/Failed/Skipped counts + exit status for each executed scope
- Repeat evidence: one fresh green full run, or the project's configured `consecutiveGreen` count
- Prompt/current-context scope, whole-project vs focused decision, and the Given/When/Then + protected invariant record
- Resolved `e2eTesting.execution` profile and linked `experienceVerification` surface, including startup/readiness/auth/seed/browser/evidence/convergence capability outcomes
- Browser visibility/pacing policy, viewport/device conditions, runtime/visual evidence references, redaction status, and any `ENVIRONMENT-BLOCKED` or `ACCEPTANCE-PENDING` decision
- Any preconditions or setup needed

---

## Sub-Agent Type Override

> **MANDATORY:** E2E test generation and accepted baseline updates spawn `e2e-runner` sub-agent (`subagent_type: "e2e-runner"`), NOT the main agent directly. Baseline updates remain forbidden until the experience-acceptance gate is satisfied.
> **Rationale:** `e2e-runner` auto-detects the project's E2E stack, maintains profile-resolved owner/case-to-test/assertion/result traceability, and handles visual baseline updates across Playwright, Selenium, Cypress, and other frameworks.

Spawn `e2e-runner` sub-agent for:

- Generating new E2E tests from recordings or owner-qualified scenario/case IDs from the configured canonical artifacts (TC codes only under the strict default profile)
- Updating visual screenshot baselines after UI changes, but only after an explicit accepted experience record
- Maintaining configured owner-qualified case-to-executor/assertion traceability (the strict default uses `TC-{MODULE}-E2E-{NNN}`)

## Next Steps

Standalone (no parent workflow): after writing or updating E2E tests, suggest `/e2e-test --mode=verify --fix-loop` to run them with runner evidence and converge failures, or `/start-workflow workflow-e2e` for the full write → verify route. Inside a workflow, the next step is the workflow's own.

---

- The canonical business-artifact root — resolve `specRoots.business.path` from `docs/project-config.json` (default `docs/specs/` only when unset); read requirement/acceptance/scenario IDs, owner links, cardinality, carriers, and evidence-section roles from optional `specArtifacts`. Match each selected owner-qualified case/variant to its actual E2E executor(s), assertion(s), and result(s). The strict default profile uses TC cases and §8/Test Specifications.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

---

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `core-engineering-principles` — Core quality gate: easy to change, easy to scale, easy to maintain, judged by future change cost; planning, implementing or reviewing any change → .claude/skills/shared/protocols/core-engineering-principles.md
- `e2e-visual-design-contract` — Evidence and baseline rules for visual review in E2E and human QC; handling visual-review evidence or visual baseline updates → .claude/skills/shared/protocols/e2e-visual-design-contract.md
- `measured-capacity-engineering` — Model demand, reduce measured work safely and prove capacity before scaling; planning, building, testing or reviewing hot paths, caches or capacity → .claude/skills/shared/protocols/measured-capacity-engineering.md
- `output-quality-principles` — Readable guidance and verified contents for long skill/doc files; writing, updating or auditing a skill or reference document, or another Markdown artifact over 200 lines → .claude/skills/shared/protocols/output-quality-principles.md
- `real-world-fidelity-testing` — Integration, E2E and system tests exercise real boundaries; authoring, reviewing or repairing integration, E2E or system tests → .claude/skills/shared/protocols/real-world-fidelity-testing.md
- `review-decision-autonomy` — Choose supported review decisions and ask before extending the round budget; running any review or audit skill or mode → .claude/skills/shared/protocols/review-decision-autonomy.md
- `source-test-drift-check` — When source behavior changes, reconcile the affected tests from evidence; code, fix, test or review work changes behavior → .claude/skills/shared/protocols/source-test-drift-check.md
- `sub-agent-selection` — Pick the sub-agent type from the routing guide; choosing which sub-agent to spawn → .claude/skills/shared/protocols/sub-agent-selection.md
- `test-architecture-execution-contract` — Testability as an architecture condition: required test types and execution modes; setting up or reviewing a test architecture → .claude/skills/shared/protocols/test-architecture-execution-contract.md
- `test-failure-fault-adjudication` — Decide whether the source or the test is at fault before editing either; a test fails → .claude/skills/shared/protocols/test-failure-fault-adjudication.md

<!-- PROTOCOL-GUIDES:END -->


<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval; inside a workflow run, `/start-workflow` → Workflow-step mode bounds this
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->


<!-- SYNC:test-architecture-execution-contract:reminder -->

**MUST ATTENTION** Each assertion-bearing test names the behavior or technical contract it protects and asserts an outcome it owns. Use the project's configured/native test format — Given/When/Then is one valid format, never a framework-wide requirement. When `specArtifacts` is valid, link configured owner/case/variant identity and `intent/contracts` evidence; when absent, name the guarded business intent or technical contract. A malformed declared profile BLOCKS without fallback. Broad test-format migration → assign an owner and next step, never rewrite cases outside scope.

**MUST ATTENTION** Before implementation record evidence-backed applicability for the test types and modes the task/project contract requires: copy-ready full and focused commands where available, zero-match behavior, a useful platform-appropriate entry point, supported execution modes and environments, state-isolation requirements, exact results, and repeat evidence where persistent state makes it relevant. Exercise claimed modes; report a missing required capability as `ENVIRONMENT-BLOCKED`. Never invent production targets or impose a test format. Browser/UI E2E uses the configured runner's waits or project helper for observable readiness and outcomes; apply action pacing only where the project contract specifies it. Reuse the project's evidenced test organization — require a POM, base class, or component taxonomy only when the project actually selects it.

<!-- /SYNC:test-architecture-execution-contract:reminder -->

<!-- SYNC:e2e-visual-design-contract:reminder -->

**MUST ATTENTION** visual E2E/QC resolves the project design authority first, applies project design-system and frontend decisions plus applicable `UI-*`/`DD-*`/`CL-*` roles, records component ownership using the project's taxonomy or observed boundaries, sends static source findings to `/ui-design --mode=review` and runtime image evidence to `/experience-review`, captures states and transitions required by the configured evidence contract, reloads the convention docs then reads and records each required capture before synthesizing findings with coverage gaps, treats `UIX`/UI/accessibility-floor findings as blocking and `UIX-POLISH`/DD identity as advisory, never invents measurements, and never auto-promotes baselines; non-visual runs state `N/A`.

<!-- /SYNC:e2e-visual-design-contract:reminder -->

<!-- SYNC:measured-capacity-engineering:reminder -->

**MUST ATTENTION** capacity work: model demand/SLO and distinguish sessions from RPS/in-flight work; disclose load model and offered vs achieved demand; reduce measured work at a safe owner; preserve cache authorization/freshness/bounds; prove cold-state, overload recovery and justified headroom before scaling. Static review returns a verification plan, not invented throughput. Retain the hosting skill's scores, gates and authority.

<!-- /SYNC:measured-capacity-engineering:reminder -->

<!-- SYNC:review-decision-autonomy:reminder -->

**MUST ATTENTION** Decide supported review choices and recommendations, record the rationale, and finish without routine user questions. Keep round-limit extension, indispensable facts and actual action authority; preserve source coverage, validation, tests, read-only boundaries and budgets. Review decisions do not accept open risks or make a failed gate pass.

<!-- /SYNC:review-decision-autonomy:reminder -->

<!-- SYNC:output-quality-principles:reminder -->

**IMPORTANT MUST ATTENTION** lead with useful guidance and readable priorities; preserve action-changing conditions/numbers and required structures. When writing, updating or auditing Markdown skill/doc content, verify top, heading-linked contents over 200 lines (stricter owner thresholds remain); refresh after edits and report gaps in read-only audits. Remove report bulk; judge semantic value rather than word counts.

<!-- /SYNC:output-quality-principles:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** Testability contract: resolve evidence-backed Unit/Integration/System/E2E rows, copy-ready full/focused commands, zero-match failures, owner/root/data, CI/simple Windows/macOS/Linux entry, unique run identity, and repeat proof before claiming setup, review, or test completion.
**IMPORTANT MUST ATTENTION Goal:** Produce or select maintainable, spec-traceable E2E tests from the user prompt/current context, recordings, canonical artifacts, or code changes with the project's configured framework (Playwright, Selenium, Cypress, or another). Resolve owner-qualified case identity from the configured profile, map it to the real test assertion and result, and use TC/§8 only when no native `specArtifacts` profile is declared. Then exercise the declared scope like a human QC tester and protect business behavior so cosmetic UI changes do not break tests and intended behavior breaks do.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Sub-Agent Selection:** Route specialized domains to the matching specialist agent, NEVER `code-reviewer`.
- **Source/Test Drift Check:** On source change, decide from evidence whether tests or source is wrong.
- **Real-World Fidelity Gate:** only test flows, pacing, and data production can actually reach; use the configured runner's native waits or project helper for control readiness and postconditions; action delays apply only when configured; wait on a real settle signal in ARRANGE — never a widened assertion.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**IMPORTANT MUST ATTENTION — Main steps (execute in order, track each):** (1) detect E2E framework from project files; (2) read `e2e-test-reference.md` and project config FIRST; (3) resolve `specRoots.business.path` and optional `specArtifacts`, then load owner-qualified case IDs, evidence sections, and carriers from that root; use TC/§8/Test Specifications only when no native profile is declared; (4) pass the Real-World Fidelity Gate BEFORE writing test code; (5) generate/update tests using the configured project organization through the `e2e-runner` sub-agent; (6) run tests with the configured command; (7) update `e2e-test-reference.md` with learnings — why: AI keeps dropping the skill's own step sequence under long context.
**IMPORTANT MUST ATTENTION** apply `.claude/skills/shared/e2e-quality-protocol.md` before authoring; record its GWT + invariant, gate-row verdicts, exact evidence, cleanup, and test-to-spec traceability without duplicating the detailed checklist.
**IMPORTANT MUST ATTENTION** read `docs/project-reference/e2e-test-reference.md` + `docs/project-config.json` FIRST, then detect the framework and resolve `specRoots.business.path` plus optional `specArtifacts` — NEVER assume a stack, case ID, root, carrier, or evidence section — why: the configured framework, paths, identifiers, owner model, and evidence headings are project-specific.
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act, <60% DO NOT recommend) — NEVER speculate without proof.
**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting; mark one `in_progress`, set `completed` immediately after each finishes; add a final review todo.
**MANDATORY IMPORTANT MUST ATTENTION** inspect 3+ comparable E2E tests and helpers, plus page/component objects when present, before creating new code; follow the configured local pattern over generic framework defaults — why: projects carry local locator, fixture, and organization conventions.
**IMPORTANT MUST ATTENTION** evaluate fit before copying a nearby test — verify the new scenario shares the relevant organization, fixtures, and preconditions — why: closest example ≠ matching preconditions.
**MANDATORY IMPORTANT MUST ATTENTION** every E2E case resolves its owner-qualified identity and configured requirement/acceptance refs, evidence section, actual executor(s), assertion(s), and run result(s), preserving profile cardinality — missing/unknown owner or ID remains unresolved and never PASS; only when no native profile is declared use TC IDs traced to §8/Test Specifications — so it fails on intended-behavior breaks, not cosmetic UI churn.
**MANDATORY IMPORTANT MUST ATTENTION** every interactive browser/UI step follows the configured runner's readiness and postcondition strategy; use bounded project helpers where they exist, and apply action delays only when configured — why: human-like observe → act → observe sequencing exposes loading, validation, and runtime-error failures without imposing a runner-specific API.
**MANDATORY IMPORTANT MUST ATTENTION** apply the Real-World Fidelity Gate BEFORE writing setup — ask "can this flow, timing, and data actually occur in production?", model real pacing between distinct user actions instead of firing them in the same millisecond, and wait on an observable settle signal in ARRANGE; NEVER widen an assertion timeout, loosen a comparison, or retry around a failing assertion to compensate — why: a scenario production can never reach proves nothing when it passes and manufactures phantom "product defects" when it fails.
**IMPORTANT MUST ATTENTION** use the repository's configured test-case annotation mechanism — NEVER invent a framework-specific marker.
**MANDATORY IMPORTANT MUST ATTENTION** for browser E2E, prefer accessible role/name, label, or native accessibility identifiers, then explicit stable test hooks, then project-configured stable locators or meaningful text as needed; NEVER treat BEM, utility, or other styling classes as semantic locators, or use generated/positional selectors or XPath without a project-documented exception — why: locators should describe the user-facing control and survive unrelated styling and markup changes.
**MANDATORY IMPORTANT MUST ATTENTION** keep locators/actions in the project-configured owner; use a page object only where that organization is configured or its reuse is established, and keep final behavior assertions in the test — why: coherent ownership simplifies change without imposing unused wrappers.
**MANDATORY IMPORTANT MUST ATTENTION** generate unique self-sufficient data (GUID/timestamp); NEVER delete or reset persistent, reference, seeded, additive, or shared data. If configured, opt-in cleanup may remove only current-run ephemeral resources after evidence capture — never another run's data and never as repeat-proof — why: shared teardown/reset creates side effects.
**IMPORTANT MUST ATTENTION** spawn the `e2e-runner` sub-agent (`subagent_type: "e2e-runner"`) for E2E generation and accepted visual baseline updates — NEVER drive them from the main agent — why: `e2e-runner` carries the stack auto-detection and profile-resolved case-traceability knowledge; `experience-review` must inspect and obtain explicit acceptance before the update.
**IMPORTANT MUST ATTENTION** any uncovered configured owner/case or scenario with no accepted intent feeds BOTH the canonical owner and tests — NEVER a test-only fix or duplicate registry; only the strict default profile uses §8 behavior/TC cases. Property/metamorphic generation and MUTATION-SCORE gates are scoped to unit/integration, N/A at the E2E tier.
**IMPORTANT MUST ATTENTION** update `e2e-test-reference.md` in the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) with learnings when investigating/fixing E2E failures.
**MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality.



---

**IMPORTANT MUST ATTENTION Visual handoff:** When requested or project-required, capture the declared state × viewport matrix and transitions only under explicit `every-action` mode with a verified boundary. Preserve and index candidates; `/experience-review` reads and adjudicates each required image before synthesis. Never auto-promote baselines or waive a required gate with `false`; validated blocking UI findings require an owner-layer fix and same-scope E2E rerun.

<!-- SYNC:core-engineering-principles:reminder -->

**MUST ATTENTION** Core Engineering Principles — every plan, implementation and review must be **Easy to change** (reuse first, one owner per rule, interfaces/adapters at volatile boundaries, no speculative abstraction) · **Easy to scale** (extend by addition, bounded growth, explicit boundaries, sized to the project's real profile) · **Easy to maintain** (intent-named tests that fail when the rule breaks across happy/error/edge paths; harness green locally and in CI). Before done: next change → how many edit sites? 10× → what breaks? which test goes red?

<!-- /SYNC:core-engineering-principles:reminder -->
