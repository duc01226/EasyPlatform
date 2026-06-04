---
name: e2e-test
description: '[Testing] Use when generating, updating, or maintaining E2E tests from recordings, specs, or code changes.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Produce maintainable, spec-traceable E2E tests (TC-{MODULE}-E2E-{NNN}) from recordings, specs, or code changes that protect business behavior using the project's configured framework (Playwright, Selenium, Cypress, others) — so future UI changes break tests only when intended behavior breaks.

**Summary:**

- Read `docs/project-reference/e2e-test-reference.md` + the `e2eTesting` block of `docs/project-config.json` FIRST, then detect the framework from project files — never assume a stack or invent a TC-annotation marker.
- Every test carries its `TC-{MODULE}-E2E-{NNN}` code traced to a spec, structured with the Page Object Model (locators/actions in the page class, assertions in the test).
- Selector priority is semantic/BEM > data-testid > ARIA/role > visible text; AVOID generated classes, `:nth-child`, and XPath.
- Generate unique self-sufficient data (GUID/timestamp), never depend on pre-existing DB state, never tear down seeded data; spawn the `e2e-runner` sub-agent for generation and baseline updates.

**Workflow:**

1. **Detect** — classify request scope, target artifacts, framework.
2. **Execute** — apply required steps, evidence-backed actions.
3. **Verify** — confirm constraints, output quality, completion evidence.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`), confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- NEVER skip mandatory workflow or skill gates.

## ⚠️ MANDATORY: Read Project E2E Reference (FIRST)

**BEFORE ANY E2E WORK, you MUST ATTENTION:**

```bash
# 1. Read project-specific E2E patterns (REQUIRED)
head -100 docs/project-reference/e2e-test-reference.md

# 2. Read project config for framework, paths, commands
grep -A 50 '"e2eTesting"' docs/project-config.json

# 3. Find TC codes you need to implement
grep -r "TC-.*-E2E-" docs/specs/ docs/specs/
```

**The `e2eTesting` section in `docs/project-config.json` contains:**

- Framework, language, paths, run commands, TC code format
- Project-specific best practices and entry points

**When investigating/fixing E2E failures, update `docs/project-reference/e2e-test-reference.md` with learnings.**

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models)

---

## Framework Detection (SECOND STEP)

Detect the project's E2E stack before generating tests:

```bash
# Use project config, project-reference docs, and existing test config files as the source of truth
rg "playwright|cypress|selenium|webdriver|e2e" docs/project-config.json docs/project-reference/ . 2>/dev/null
rg --files | rg "(playwright|cypress|webdriver|selenium|e2e|test).*config|manifest|project"
```

| Framework                | Config Source                 | Test Naming             | Run Command             |
| ------------------------ | ----------------------------- | ----------------------- | ----------------------- |
| Configured E2E framework | project config/reference docs | existing local examples | configured test command |

---

## Workflow Modes

| Mode             | Input                      | Output                       |
| ---------------- | -------------------------- | ---------------------------- |
| `from-recording` | Recording JSON + feature   | Test spec + page object      |
| `update-ui`      | Git diff of UI changes     | Updated screenshot baselines |
| `from-changes`   | Changed test specs or code | Updated test implementations |
| `from-spec`      | TC codes from test specs   | New tests matching specs     |

---

## First Principle — Easy to Change

> **The success metric of every coding decision is _future change cost_.**
> DRY, SRP, abstraction, design patterns, naming, layering, tests — every
> technique exists to serve one goal: **making the next change cheaper**.

Evaluating code, refactor, test, abstraction, ask:
**does this make next change cheaper or more expensive?**

- Reject "best practices" raising change cost (premature abstraction, speculative generality, leaky indirection, ceremony without payoff).
- Name real enemies in findings: **coupling, hidden state, duplicated knowledge, unclear intent, irreversible decisions exposed too early**.
- Simpler design easy to change beats sophisticated design that isn't.

Apply this lens **before** invoking any specific rule, pattern, checklist below — if downstream rule would raise change cost, this principle wins.

---

## Core Principles

### 1. TC Code Traceability (MANDATORY)

**Every E2E test MUST ATTENTION have:**

- TC code in test name: `TC-{MODULE}-E2E-{NNN}`
- Tag/annotation linking to spec
- Comment linking to feature doc

```typescript
// TypeScript
test('TC-RT-E2E-001: Submit return request', async () => { ... });
```

Use repository's configured test-case annotation mechanism for non-TypeScript E2E tests; NEVER invent a framework-specific marker.

> **Spec-Loop Discipline (E2E tier — tailored).** Trace each E2E scenario to the **§8 invariant/behavior it guards** — name the protected business rule, not just the click path — so the scenario fails only when that intended behavior breaks (not on cosmetic UI churn). Any coverage gap you find (an §8 behavior with no E2E scenario, or an E2E flow guarding no documented behavior) feeds the **Dual-Feedback** half into BOTH the spec (the missing/changed behavior) AND the tests — never a test-only fix. **Scoped N/A:** property/metamorphic generation and the MUTATION-SCORE assertion gate are scoped to unit/integration core-logic; they do NOT apply at the E2E tier — do not force them here.

### 2. Page Object Model

All frameworks use Page Object pattern:

- Encapsulate page locators in page class
- Methods represent user actions
- Assertions in test file, not page object

### 3. Selector Strategy (Priority Order)

1. **Semantic classes** — BEM (`.block__element`), component classes
2. **Data attributes** — `[data-testid]`, `[data-cy]`, `[data-test]`
3. **ARIA/Role** — `role=button`, `aria-label`
4. **Text content** — Visible user text (last resort)

**AVOID:** Generated classes (`.ng-star-inserted`, `.MuiButton-root`), positional selectors (`:nth-child`), XPath

### 4. Unique Test Data

Tests MUST generate unique data to be repeatable:

- Append GUIDs/timestamps to test data
- Make each test self-sufficient with own generated data; NEVER depend on specific pre-existing database state
- Leave seeded data in place after run, NEVER clean up — why: teardown across shared runs creates side effects for parallel/repeat tests

### 5. Preconditions Documentation

Document what must exist before test runs:

- System: Infrastructure running, APIs healthy
- Data: Seed data exists (users, companies)
- Feature: Configurations complete

---

## Steps

1. **Detect framework** from project files
2. **Read project E2E docs** for conventions and patterns
3. **Load test specs** with TC codes from feature docs
4. **Generate/update tests** following Page Object pattern
5. **Run tests** using project's configured commands
6. **Update e2e-test-reference.md** with any learnings

---

## Output

Report:

- Files created/modified
- TC codes covered
- Run command to execute tests
- Any preconditions or setup needed

---

## Sub-Agent Type Override

> **MANDATORY:** E2E test generation and baseline updates spawn `e2e-runner` sub-agent (`subagent_type: "e2e-runner"`), NOT the main agent directly.
> **Rationale:** `e2e-runner` auto-detects the project's E2E stack, maintains test-to-spec TC traceability, and handles visual baseline updates across Playwright, Selenium, Cypress, and other frameworks.

Spawn `e2e-runner` sub-agent for:

- Generating new E2E tests from recordings or TC codes from specs
- Updating visual screenshot baselines after UI changes
- Maintaining TC code traceability (`TC-{MODULE}-E2E-{NNN}`) in test implementations

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use `AskUserQuestion` to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `e2e --source=changes` workflow** (Recommended) — scout → e2e-test → test → watzup
> 2. **Execute `/e2e-test` directly** — run this skill standalone

---

# Skill: e2e-test

**Category:** [Testing]
**Trigger:** e2e test, e2e from recording, generate e2e, playwright test, cypress test, selenium test, webdriver, puppeteer

Generate and maintain E2E tests using project's configured testing framework.

- `docs/specs/` — Test specifications by module (read existing TCs for E2E scenario coverage; match TC codes to E2E test implementations)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

---

<!-- SYNC:sub-agent-selection -->

> **Sub-Agent Selection** — Full routing contract: `.claude/skills/shared/sub-agent-selection-guide.md`
> **Rule:** Route specialized domains (architecture, security, performance, DB, E2E, integration-test, git) to the matching specialist agent (see guide above) — NEVER use `code-reviewer` for these. — why: `code-reviewer` lacks each domain's checklist, so specialized issues slip through.

<!-- /SYNC:sub-agent-selection -->

<!-- SYNC:source-test-drift-check -->

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix. Do not write tests for migration code; schema/data migrations are one-time execution paths, not core application logic.

<!-- /SYNC:source-test-drift-check -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing.** Before changing a constant, limit, flag, wording, or pattern, read nearby context and history.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Produce maintainable, spec-traceable E2E tests (TC-{MODULE}-E2E-{NNN}) that protect business behavior using the project's configured framework — so future UI changes break tests only when intended behavior breaks.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Sub-Agent Selection:** Route specialized domains to the matching specialist agent, NEVER `code-reviewer`.
- **Source/Test Drift Check:** On source change, decide from evidence whether tests or source is wrong.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** Traced `file:line` proof per claim, confidence >80% to act, NEVER guess as fact.

**IMPORTANT MUST ATTENTION** read `docs/project-reference/e2e-test-reference.md` + the `e2eTesting` block of `docs/project-config.json` FIRST, then detect the framework from project files — NEVER assume a stack — why: the configured framework, paths, run commands, and TC format are project-specific, not framework defaults.
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act, <60% DO NOT recommend) — NEVER speculate without proof.
**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting; mark one `in_progress`, set `completed` immediately after each finishes; add a final review todo.
**MANDATORY IMPORTANT MUST ATTENTION** search the codebase for 3+ similar existing E2E tests/page objects before creating new code; follow the local pattern over generic framework docs — why: projects carry local selector/data conventions that differ from defaults.
**IMPORTANT MUST ATTENTION** evaluate fit before copying a nearby test — verify the new scenario shares the same base page class, fixtures, and preconditions — why: closest example ≠ matching preconditions.
**MANDATORY IMPORTANT MUST ATTENTION** every E2E test carries its `TC-{MODULE}-E2E-{NNN}` code traced to the §8 invariant/behavior it guards — name the protected business rule, not just the click path — so it fails on intended-behavior breaks, not cosmetic UI churn.
**IMPORTANT MUST ATTENTION** use the repository's configured test-case annotation mechanism — NEVER invent a framework-specific marker.
**MANDATORY IMPORTANT MUST ATTENTION** selector priority semantic/BEM > data-testid > ARIA/role > visible text; NEVER use generated classes (`.ng-star-inserted`, `.MuiButton-root`), positional selectors (`:nth-child`), or XPath — why: generated/positional selectors break on unrelated markup churn.
**MANDATORY IMPORTANT MUST ATTENTION** keep locators/actions in the Page Object class, assertions in the test file — why: encapsulation keeps the next UI change a one-place edit.
**MANDATORY IMPORTANT MUST ATTENTION** generate unique self-sufficient data (GUID/timestamp); NEVER depend on specific pre-existing DB state and NEVER tear down seeded data — why: teardown across shared/parallel runs creates side effects.
**IMPORTANT MUST ATTENTION** spawn the `e2e-runner` sub-agent (`subagent_type: "e2e-runner"`) for E2E generation and visual baseline updates — NEVER drive them from the main agent — why: `e2e-runner` carries the stack auto-detection and TC-traceability knowledge.
**IMPORTANT MUST ATTENTION** any coverage gap (a §8 behavior with no scenario, or a flow guarding no documented behavior) feeds BOTH the spec AND the tests — NEVER a test-only fix; property/metamorphic generation and MUTATION-SCORE gates are scoped to unit/integration, N/A at the E2E tier.
**IMPORTANT MUST ATTENTION** update `docs/project-reference/e2e-test-reference.md` with learnings when investigating/fixing E2E failures.
**MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality.

**Anti-Rationalization:**

| Evasion                                     | Rebuttal                                                                                       |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| "I know the framework, skip the reference"  | Read `e2eTesting` config + reference FIRST — stack/paths/TC format are project-specific.       |
| "data-testid is everywhere, just use it"    | Honor the priority — semantic/BEM > data-testid > ARIA > text; show the selector you rejected. |
| "This selector is faster via `:nth-child`"  | Positional/generated selectors break on unrelated churn. Use a semantic/data anchor.           |
| "I'll clean up the data after the run"      | NEVER tear down seeded data — teardown breaks parallel/repeat runs. Leave it in place.         |
| "Test passes, traceability is bookkeeping"  | No TC code traced to a §8 behavior = no bug protection. Name the rule the scenario guards.     |
| "Just generate the test inline, it's quick" | Spawn `e2e-runner` — it owns stack detection, TC traceability, and baseline updates.           |

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.

---

**IMPORTANT MUST ATTENTION** read `e2eTesting` config + `e2e-test-reference.md` FIRST and detect the framework — NEVER assume a stack.
**IMPORTANT MUST ATTENTION** every test carries its `TC-{MODULE}-E2E-{NNN}` code traced to the §8 behavior it guards; selector priority semantic > data-attr > ARIA > text — NEVER generated/positional/XPath.
**IMPORTANT MUST ATTENTION** generate unique self-sufficient data, NEVER tear down seeded data; spawn `e2e-runner` for generation and baseline updates.
