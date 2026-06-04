---
name: review-artifact
description: '[Code Quality] Use when you need to review artifact quality (PBI, user story, test spec, design spec) before handoff. Supports --type={pbi|story|spec-tests|design}.'
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->

## Codex Project-Reference Loading (No Hooks)

Codex uses static project-reference loading instead of runtime-injected project docs.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Review an artifact (PBI, design spec, story, test spec) for completeness and quality so reviewed artifacts are complete, evidence-backed, and ready for handoff without missing assumptions or acceptance gaps.

**Summary:**

- Dispatch on `--type={pbi|story|spec-tests|design}` (infer if omitted) — each type has its own Required/Recommended checklist and output template; verdict = PASS (all Required + ≥50% Recommended), WARN (all Required, <50% Recommended), FAIL (any Required fails).
- Be a SKEPTIC, not a presence-checker: sections that exist but hold weak/untestable content are worse than missing ones. Run the full Adversarial Mindset (steel-man alternatives, stress-test 3 assumptions, AC-testability, pre-mortem, contrarian pass) and clear the Anti-Bias Gate before any verdict.
- Enforce the BLOCKING M1-M6 compliance gate on ALL types — any M1-M5 violation forces NEEDS WORK citing the mandate ID + exact section/line; exempt source identifiers inside evidence carriers (`[Source:]`, `**Evidence**`, `IntegrationTest`, frontmatter, mermaid).
- Before fixing, run the findings-validation gate: invoke `$why-review --validate-findings <report-path>` on the review report FIRST (recursive validate-before-fix discipline, at parity with `$plan-review`) — NEVER edit the artifact to resolve findings before this gate returns CLEAN. Then fix only validated findings, do not confirm-in-place, restart the FULL review (fresh `general-purpose` sub-agent for artifacts), and loop until a clean pass — clean review ENDS the loop.

**Workflow:**

1. **Identify** — What artifact type is being reviewed
2. **Checklist** — Apply type-specific quality criteria
3. **Verdict** — READY or NEEDS WORK with specific items

**Key Rules:**

- Use type-specific checklists
- Every NEEDS WORK item must be actionable
- Focus on completeness — never block on stylistic preferences

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## First Principle — Easy to Change

> **The success metric of every coding decision is _future change cost_.**
> DRY, SRP, abstraction, design patterns, naming, layering, tests — every
> technique exists to serve one goal: **making the next change cheaper**.

When evaluating code, refactor, test, or abstraction, ask:
**does this make next change cheaper or more expensive?**

- Reject "best practices" raising change cost (premature abstraction,
  speculative generality, leaky indirection, ceremony without payoff).
- Name real enemies in findings: **coupling, hidden state, duplicated
  knowledge, unclear intent, irreversible decisions exposed too early**.
- Simpler design easy to change beats sophisticated design that isn't.

Apply this lens **before** invoking any specific rule, pattern, or checklist
below — if downstream rule would raise change cost, this principle wins.

---

## Adversarial Review Mindset (NON-NEGOTIABLE)

**Default stance: SKEPTIC challenging artifact quality and completeness, not confirming presence of sections.**

> **Presence-quality confusion trap:** Artifact with all required sections LOOKS complete. But sections that exist yet contain weak, ambiguous, or untestable content are worse than missing sections — they create false confidence. This section forces quality challenge beyond existence checks.

### Adversarial Techniques (apply ALL before concluding)

**1. Steel-Man the Alternatives**
Before accepting chosen approach in any design artifact: argue FOR strongest rejected alternative as vigorously as possible. Would a senior domain expert seriously consider it? If yes — artifact's dismissal needs stronger justification.

**2. Assumption Stress Test**
List the 3 biggest assumptions embedded in artifact. For each: "What if this is wrong?" An artifact that breaks when 2 of its 3 core assumptions fail is fragile. Flag unaddressed failure modes.

**3. Acceptance Criteria Testability**
For each acceptance criterion: "Can a QA engineer write a specific automated test for this — without asking clarifying questions?" If not — AC is ambiguous. Flag it. Vague ACs ("feature works correctly") are NOT acceptance criteria.

**4. Pre-Mortem**
Assume artifact is implemented exactly as written and feature fails in production within 3 months. Write the most plausible failure scenario. If you can't find one, look harder — every implementation has a failure mode.

**5. Unseen Alternatives**
Identify 1-2 approaches NOT mentioned in artifact. Genuinely not considered, or considered and excluded without documented reasoning? Missing alternatives without exclusion reasoning = incomplete analysis.

**6. Contrarian Pass**
Before writing any verdict, generate at least 2 sentences arguing the OPPOSITE conclusion. Then decide which argument is stronger based on evidence.

### Forbidden Patterns

- **"Required sections present"** → Presence ≠ quality. What's IN them?
- **"Acceptance criteria are defined"** → Are they TESTABLE? Name the automated test for each.
- **"Scope is well-defined"** → What is explicitly OUT of scope? If nothing is out of scope, the scope is undefined.
- **"Alternatives were considered"** → Were they real alternatives, or strawmen set up to lose?
- **"Looks complete"** → What specific failure mode is NOT addressed?

### Anti-Bias Gate (MANDATORY before finalizing verdict)

- [ ] Steel-manned at least one rejected alternative
- [ ] Identified 3 hidden assumptions and stress-tested them
- [ ] Verified each AC is unambiguously testable (can write automated test without clarification)
- [ ] Ran pre-mortem (one concrete production failure scenario)
- [ ] Identified at least 1 unexamined alternative (not in artifact)
- [ ] Generated at least 2 sentences arguing the opposite verdict

If any box is unchecked → adversarial review incomplete. Go back.

## Type-Specific Checklists (`--type` dispatch)

Select the checklist + output template by artifact type. Pass `--type={pbi|story|spec-tests|design}` to force a type; if omitted, infer from the artifact (Phase 1 "Identify"). Each type scores **Required (all must pass)** + **Recommended (≥50% should pass)** → verdict **PASS** (all Required + ≥50% Recommended) | **WARN** (all Required, <50% Recommended) | **FAIL** (any Required fails).

| `--type`     | Artifact             | Output template                             |
| ------------ | -------------------- | ------------------------------------------- |
| `pbi`        | Product Backlog Item | PBI Review Result                           |
| `story`      | User story set       | Story Review Result (+ AC Coverage Matrix)  |
| `spec-tests` | Test specification   | Test Spec Review Result (+ Coverage Matrix) |
| `design`     | Design spec          | Artifact Review                             |

### PBI Review (`--type=pbi`)

| #   | Check                                                                                                      | Presence                                                  | Quality Depth                                                                                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Problem statement is clear** — the problem being solved is described in concrete terms                   | Is a problem statement present? Is it 2+ sentences?       | Is the problem scoped correctly? Could it be framed differently to lead to a different (simpler) solution? Are symptoms confused with root cause?                                              |
| 2   | **Acceptance criteria are testable and measurable** — each AC can be verified by a test                    | Are ACs present? Do they use measurable language?         | Can a QA engineer write an automated test for EACH AC without clarification? Are they specific enough to catch regressions? Vague ACs ("feature works correctly") are not acceptance criteria. |
| 3   | **Scope is well-defined (what's in and out)** — both in-scope and out-of-scope items are explicitly listed | Is an in/out scope list present? Does it have both sides? | Are out-of-scope items specific enough to prevent scope creep? Is anything ambiguously in/out? A scope that says nothing is out of scope is an undefined scope.                                |
| 4   | **Dependencies are identified** — all external dependencies the PBI relies on are listed                   | Is a dependencies section present? Does it list items?    | Are ALL dependencies listed (technical, data, service, team)? Are "can-parallel" items truly safe to parallelize, or do they share a shared resource?                                          |
| 5   | **Business value is articulated** — the why behind the PBI is stated in terms of user or business outcome  | Is business value described?                              | Is the value quantified or just stated? Does it connect to a user outcome, not just a feature delivery? "Users can now do X" is better than "we implemented feature Y".                        |
| 6   | **Priority is assigned** — the PBI has an explicit priority level                                          | Is a priority level assigned?                             | Is priority justified with data (RICE/MoSCoW), or arbitrary? Is it consistent with other PBIs in the same sprint? A PBI that is "high priority" without justification is unranked.             |

### User Story Review (`--type=story`)

| #   | Check                                                                                                                    | Presence                                                       | Quality Depth                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Follows GIVEN/WHEN/THEN format** — the story uses the structured BDD format                                            | Are all three parts (GIVEN, WHEN, THEN) present?               | Are all 3 parts present AND meaningful? Or is GIVEN trivial ("Given a user exists")? A GIVEN that describes no precondition adds no value.                    |
| 2   | **Is independent (not dependent on other stories)** — the story can be implemented without requiring another story first | Is independence stated or inferable?                           | Would descoping other stories prevent this story from being implemented? Implicit dependencies are as blocking as explicit ones.                              |
| 3   | **Is estimable (team can size it)** — the team has enough information to assign story points                             | Is the story sized or estimable based on content?              | Does the team have enough info to estimate? Is "can't estimate" a sign of missing AC? If it can't be sized, it's not ready for sprint.                        |
| 4   | **Is small enough for one sprint** — the story fits within a single sprint's capacity                                    | Is the story sized at ≤8 story points or scoped to one sprint? | Could this be split further? Stories >8SP should always be split. A story that "could fit" in a sprint but requires multiple sub-systems is likely too large. |
| 5   | **Has acceptance criteria** — the story defines measurable conditions for completion                                     | Are acceptance criteria present?                               | Are criteria testable? Would they catch a bug if the feature works in 9/10 cases? ACs that only describe the happy path are incomplete.                       |

### Design Spec Review (`--type=design`)

| #   | Check                                                                                                                                         | Presence                                            | Quality Depth                                                                                                                                                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **All component states covered (default, hover, active, disabled, error, loading)** — spec defines visual behavior for all interaction states | Are all 6 states defined?                           | Are edge-case states (error, loading) as fully designed as the default state, or sketched? An undesigned error state will be improvised in implementation.                                      |
| 2   | **Design tokens specified (colors, spacing, typography)** — specific token values are called out, not ad-hoc values                           | Are token references present instead of raw values? | Are tokens from the project's token system, or are new values introduced? New values outside the token system break design consistency silently.                                                |
| 3   | **Responsive behavior defined** — how the component adapts across breakpoints is documented                                                   | Are breakpoint behaviors defined?                   | Are ALL breakpoints covered, or only desktop and mobile? Tablet-specific layouts are the most frequently omitted. Are content truncation / overflow behaviors specified?                        |
| 4   | **Accessibility requirements noted** — WCAG-relevant requirements (color contrast, keyboard nav, ARIA) are documented                         | Are accessibility notes present?                    | Are requirements specific (WCAG level, contrast ratio) or vague ("should be accessible")? Vague accessibility notes produce non-compliant implementations. Is keyboard navigation flow defined? |
| 5   | **Interaction patterns documented** — animations, transitions, and user interaction flows are specified                                       | Are interaction behaviors described?                | Are timing and easing values specified? Is behavior defined for both forward and reverse interactions (e.g., open AND close)? Unspecified interactions are implemented inconsistently.          |

### Test Spec Review (`--type=spec-tests`)

> **[BLOCKING] Read** `docs/project-reference/spec-principles.md` — use Section 5 (Test Case Registry — TC ID format, priorities, minimum coverage) and Section 6 (Evidence Format) as review criteria in addition to the checklist below.
> **[BLOCKING] Tech-agnostic check:** flag framework/product/language/design-pattern names in a TC's behavioral prose as findings (per `spec-principles.md` §3). Source paths, class names, and test identifiers (e.g. `{File}::{Method}`) are CORRECT in evidence fields (`**Evidence**`, `IntegrationTest`, `[Source:]`), frontmatter, and Mermaid — never flag those.
> **[BLOCKING] Business-oriented TCs / one-to-many cardinality:** Each TC must read as a **business / user-story acceptance scenario**, not a per-class/per-method technical unit. **Flag** any TC that appears split or narrowed just to mirror code structure (e.g. one TC per handler/component when the user-observable behavior is the same) — that breaks M1/M5 and the business orientation. One business TC is expected to be covered by **many** annotation-tagged tests across components/services; that one-to-many shape is correct and is NEVER a finding. Canonical contract: `.claude/skills/shared/tc-format.md` → TC ↔ Test Code Cardinality.

#### Required (all must pass)

| #   | Check                                                                                                                                                                                                       | Presence                                                                                 | Quality Depth                                                                                                                                                                                                                    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **TC ID format** — All TCs follow `TC-{FEATURE}-{NNN}` format                                                                                                                                               | Do all TCs use the `TC-{FEATURE}-{NNN}` pattern?                                         | Are IDs unique per TC? Does the FEATURE code match the actual feature?                                                                                                                                                           |
| 2   | **Story coverage** — Every user story has at least one corresponding TC                                                                                                                                     | Does every story ID appear in at least one TC?                                           | Does each TC actually test the story behavior, or does it just reference the story ID in a comment?                                                                                                                              |
| 3   | **AC coverage** — Every acceptance criterion has a test case                                                                                                                                                | Is every AC traceable to at least one TC?                                                | Does each AC have a TC that would FAIL if the AC is violated? Single-test-per-AC misses edge cases.                                                                                                                              |
| 4   | **Happy path** — Each story has at least one happy path TC                                                                                                                                                  | Is a happy path TC present per story?                                                    | Does the happy path TC verify the full end-to-end scenario, or just a happy-path stub?                                                                                                                                           |
| 5   | **Error path** — Each story has at least one error/failure TC                                                                                                                                               | Is an error/failure TC present per story?                                                | Does the error TC verify the exact error response (code + message), not just that an error occurred?                                                                                                                             |
| 6   | **No duplicate TCs** — No two TC IDs describe the same business scenario                                                                                                                                    | Are all TC IDs unique with distinct **business** scenarios?                              | Flag near-duplicate TCs (same scenario, trivially different input). NOTE: this is about duplicate _TCs_ — multiple _test methods_ sharing one TC is the expected one-to-many shape, NEVER a duplicate.                           |
| 7   | **Testable assertions** — Each TC has clear expected result (not vague "should work")                                                                                                                       | Does each TC have a specific expected result?                                            | Is each assertion specific enough to catch regressions? Would it pass if the return value is wrong?                                                                                                                              |
| 8   | **Business intent / invariant guarded** — Each TC names the rule it protects                                                                                                                                | Does every meaningful TC include `Business Intent / Invariant Guarded`?                  | Would the TC fail if that business rule/invariant breaks, or does it only mirror implementation details?                                                                                                                         |
| 9   | **Authorization TCs** — At least 1 TC per story verifying unauthorized access is rejected                                                                                                                   | Is an authorization TC present per story?                                                | Does the authorization TC test a realistic access scenario, not just "wrong role → 403 without body check"?                                                                                                                      |
| 10  | **TC format completeness** — Every TC has Related Behaviors anchor table and IntegrationTest field                                                                                                          | Does every TC include a Related Behaviors anchor table and `IntegrationTest:` field?     | For Tested-status TCs, is `IntegrationTest` populated with **≥1** covering test link `{TestFile}::{MethodName}` (or a test-filter expression) — not `Untested`? A TC may list several covering tests; never require exactly one. |
| 11  | **Preservation Tests (bugfix context)** — When fixing a bug, at least 1 TC verifies the pre-fix behavior is no longer reproducible                                                                          | If this is a bugfix: is there a TC that would have CAUGHT the bug before the fix?        | Does the preservation TC assert the exact broken behavior (not just "no exception")?                                                                                                                                             |
| 12  | **Invariant / Property TCs (Spec-Loop rule 1)** — an Invariant/Property TC category exists, and EACH `[HARD]` §4 rule / §5 invariant has ≥1 universally-quantified property TC plus a boundary counter-case | Is there a property/invariant TC category, and does every `[HARD]`/§5 rule appear in it? | Are properties universally quantified ("for ALL inputs in range X, Y holds") with a boundary counter-case that would FAIL if the invariant breaks — not a single happy example?                                                  |

> **[BLOCKING] Spec-Loop property coverage (`--type=spec-tests`):** The reviewer MUST verify the Invariant/Property TC category exists and that every `[HARD]` §4 rule / §5 invariant maps to ≥1 universally-quantified property TC plus a boundary counter-case (example-only coverage is a finding). A missing property category — or any `[HARD]`/§5 rule with only example TCs and no property TC — is a **blocking artifact finding** (Required check #12 FAIL → NEEDS WORK).

#### Recommended (≥50% should pass)

| #   | Check                                                                                                                                    | Presence                                                                 | Quality Depth                                                                                                                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Edge cases** — Boundary values, empty inputs, max limits tested                                                                        | Are edge case TCs listed?                                                | Are these the RIGHT edge cases? Do they cover the 3 most likely production failure modes for this feature?                                                       |
| 2   | **Integration points** — Cross-service scenarios covered                                                                                 | Are cross-service TCs present where applicable?                          | Do integration TCs verify actual data flow across services, or just that a downstream call was made?                                                             |
| 3   | **Performance TCs** — Response time or throughput expectations where relevant; production-like data volume TCs if >1000 records expected | Are performance TCs present where data volume or SLA expectations exist? | Do performance TCs use production-like data volumes, not toy datasets that trivially pass?                                                                       |
| 4   | **Security TCs** — Auth, authorization, input validation tested                                                                          | Are security TCs present for auth, authz, and input validation?          | Do security TCs attempt realistic attack vectors (SQLi, over-posting, privilege escalation) not just "invalid token → 401"?                                      |
| 5   | **Seed data TCs** — If feature needs reference data, TCs verify data exists and seeder runs correctly                                    | If reference data is needed, does a seed data TC exist (or N/A)?         | If present, does the TC assert the exact seeded data shape, not just that the seeder ran without error?                                                          |
| 6   | **Data migration TCs** — If schema changes exist, TCs verify data transforms correctly, rollback works, no data loss                     | If schema changes exist, does a migration TC exist (or N/A)?             | If present, does the TC verify rollback behavior and zero data loss, not just forward migration success?                                                         |
| 7   | **Test data requirements specified** — the data setup needed to run each test is documented                                              | Are test data requirements stated per test?                              | Is test data specific enough to create fixtures without guessing? Vague data requirements ("a valid user") will cause test setup divergence across environments. |
| 8   | **GIVEN/WHEN/THEN format used** — tests follow the structured BDD format                                                                 | Are all tests written in GIVEN/WHEN/THEN?                                | Are the THEN clauses assertions on observable outcomes, or on internal state? Tests asserting on internal state are brittle and break on refactoring.            |

## M1-M6 Compliance Gate (BLOCKING — applies to ALL artifact types)

> **Contract:** See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M6)". This review enforces M6: any artifact (PBI, story, design spec, test spec) that violates M1-M5 MUST receive a NEEDS WORK verdict that names the violated mandate ID and cites the exact section + line. Passing an M1-M5 violation makes this review itself defective.
>
> Carriers are EXEMPT from M1/M2 — source identifiers are CORRECT inside `[Source: ...]`, `**Evidence**`, `**IntegrationTest**` fields, YAML frontmatter, and ` ```mermaid ``` ` blocks. Only flag leakage in narrative prose (descriptions, AC/scenario text, rule statements). Banned prose token list: `docs/project-reference/spec-principles.md` §3.2.

- [ ] **M1 — Tech-agnostic prose.** FAIL if narrative prose, headings, summaries, or AC/scenario text name a framework/product, a language-native type, or a product/design-pattern class name (banned-token list in `spec-principles.md` §3.2). Cite the section + leaked token.
- [ ] **M2 — No source code in prose.** FAIL if prose expresses behavior as a class/method/file-path/namespace used as a noun (e.g. "call the create-async method") instead of the business operation (e.g. "create the record"). Source identifiers belong only in evidence carriers. Cite the section + line.
- [ ] **M3 — Abstract-IDs-first traceability.** FAIL if a requirement/rule/AC/test-case lacks a logical ID (`FR-/BR-/OP-/TC-`), OR has a logical ID but no `[Source: namespace/service/id]` abstract-anchor evidence, OR the `[Source:]` evidence uses physical code coordinates or repository-root paths instead of a stack-portable abstract anchor, OR the anchor is treated as the primary citation. `[Source: namespace/service/id]` abstract-anchor evidence is REQUIRED and KEPT — SECONDARY to the logical ID, never the spine and never removed; physical coordinates live only in the provenance sidecar.
- [ ] **M4 — Unambiguous, observable criteria.** FAIL if AC/expected-result prose uses vague language ("handle appropriately", "process normally", "as needed"), OR two engineers could implement it differently while both claiming conformance, OR no observable completion state / named error condition exists. (Reinforces the AC-testability technique above.)
- [ ] **M5 — Rebuild-from-artifact.** FAIL if a competent team with ZERO codebase knowledge could not re-implement the described behavior on a different stack from the artifact alone (it relies on reading source to be understood). Cite the section + the missing detail.

If ANY box fails → verdict is NEEDS WORK; list each violated mandate ID with its concrete section/line citation in the Action Items.

## Readability Checklist (MUST ATTENTION evaluate)

Before approving, verify code is **easy to read, easy to maintain, easy to understand**:

- **Schema visibility** — If function computes a data structure (object, map, config), a comment should show output shape so readers don't trace the code
- **Non-obvious data flows** — If data transforms through multiple steps (A → B → C), a brief comment should explain the pipeline
- **Self-documenting signatures** — Function params should explain their role; flag unused params
- **Magic values** — Unexplained numbers/strings should be named constants or have inline rationale
- **Naming clarity** — Variables/functions should reveal intent without reading the implementation

## Output Format (per `--type`)

Pick the template matching `--type`. All templates lead with a **Status/Verdict** and `### Required`/`### Recommended` tallies; the `pbi`/`story`/`spec-tests` shapes add their own evidence sections (preserved verbatim from the former `refine-review`, `story-review`, `tdd-spec-review` skills).

### `--type=design` (default shape)

```
## Artifact Review

**Artifact Type:** [PBI | Story | Design | Test Spec]
**Artifact:** [Reference/title]
**Date:** {date}
**Verdict:** READY | NEEDS WORK

### Checklist Results
- [pass] [Item] — [evidence]
- [fail] [Item] — [what's missing/wrong]

### Action Items (if NEEDS WORK)
1. [Specific actionable item]
```

### `--type=pbi`

```markdown
## PBI Review Result

**Status:** PASS | WARN | FAIL
**Artifact:** {pbi-path}

### Required ({X}/{Y})

- ✅/❌ Check description

### Recommended ({X}/{Y})

- ✅/⚠️ Check description

### Issues Found

- ❌ FAIL: {issue}
- ⚠️ WARN: {issue}

### Verdict

{PROCEED | REVISE_FIRST}
```

### `--type=story`

```markdown
## Story Review Result

**Status:** PASS | WARN | FAIL
**Stories reviewed:** {count}
**Source PBI:** {pbi-path}

### AC Coverage Matrix

| Acceptance Criterion | Covered By Story | Status |
| -------------------- | ---------------- | ------ |

### Required ({X}/{Y})

- ✅/❌ Check description

### Recommended ({X}/{Y})

- ✅/⚠️ Check description

### Missing Stories

- {Any PBI AC not covered}

### Dependency Issues

- {Circular deps, missing ordering}

### Verdict

{PROCEED | REVISE_FIRST}
```

### `--type=spec-tests`

```markdown
## Test Spec Review Result

**Status:** PASS | WARN | FAIL
**TCs reviewed:** {count}
**Coverage:** {X}% of stories, {Y}% of acceptance criteria

### Coverage Matrix

| Story/AC | TC IDs | Happy | Error | Edge |
| -------- | ------ | ----- | ----- | ---- |

### Required ({X}/{Y})

- ✅/❌ Check description

### Recommended ({X}/{Y})

- ✅/⚠️ Check description

### Missing Coverage

- {Stories/AC without TCs}

### Verdict

{PROCEED | REVISE_FIRST}
```

## Validated Fix + Full Re-Review (MANDATORY when fixes are applied)

> **Protocol:** `SYNC:double-round-trip-review` + `SYNC:fresh-context-review` + `SYNC:review-protocol-injection` (all inlined above in this file).

Do not spawn a fresh sub-agent just to re-review the same finding set before fixing it. If the artifact needs work, fix actionable findings first, then restart the full artifact review over the current artifact. When that restarted review uses a fresh `general-purpose` sub-agent, use the canonical Agent template from `SYNC:review-protocol-injection` above. Artifact reviews (PBI, story, design spec, test spec) are NOT code — use `agent_type: "general-purpose"`, not `"code-reviewer"`. When constructing the Agent call prompt:

1. Copy the Agent call shape from the `SYNC:review-protocol-injection` template verbatim
2. Set `agent_type: "general-purpose"`
3. Embed the full verbatim body of these SYNC blocks (inlined above in this skill file): `SYNC:evidence-based-reasoning`, `SYNC:rationalization-prevention`, `SYNC:understand-code-first` (omit code-specific protocols like `SYNC:bug-detection`, `SYNC:design-patterns-quality`, `SYNC:fix-layer-accountability` which are not applicable to artifact files)
4. Set the Task as `"Run a full fresh artifact review over the current {artifact-type} after fixes were applied. Focus on: implicit assumptions, missing coverage of edge cases / error scenarios, unverified cross-references, completeness gaps only visible on second reading, whether acceptance criteria are truly testable and measurable, and regressions introduced by fixes."`
5. Set Target Files as the explicit artifact file path(s)
6. Set report path as `plans/reports/review-artifact-rerun{N}-{date}.md`

After sub-agent returns:

1. **Read** the sub-agent's report
2. **Integrate** findings as `## Re-Review {N} Findings` in the main report — DO NOT filter or override
3. **If NEEDS WORK:** fix actionable artifact findings, then restart the full artifact review from the beginning
4. **Repeated blocker cap:** if the same blocker repeats across 3 full invocations with no progress, escalate via a direct user question
5. **Final verdict** must incorporate findings from ALL review passes that actually ran

## IMPORTANT Task Planning Notes (MUST ATTENTION FOLLOW)

- Always plan and break work into many small todo tasks using task tracking
- Always add a final review todo task to verify work quality and identify fixes/enhancements

---

## Bulk Multi-Artifact Sweeps

> For bulk multi-artifact review (10+ artifacts at once), use `$review-changes` — its Systematic Review Protocol categorizes the set and fires parallel sub-agents.

---

## AI Agent Integrity Gate (NON-NEGOTIABLE)

> **Completion ≠ Correctness.** Before reporting ANY work done, prove it:
>
> 1. **Grep every removed name.** Extraction/rename/delete touched N files? Grep confirms 0 dangling refs across ALL file types.
> 2. **Ask WHY before changing.** Existing values are intentional until proven otherwise. No "fix" without traced rationale.
> 3. **Verify ALL outputs.** One build passing ≠ all builds passing. Check every affected stack.
> 4. **Evaluate pattern fit.** Copying nearby code? Verify preconditions match — same scope, lifetime, base class, constraints.
> 5. **New artifact = wired artifact.** Created something? Prove it's registered, imported, and reachable by all consumers.

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

**Prerequisites:** **MUST ATTENTION READ** before executing:

> **OOP & DRY Enforcement:** MANDATORY IMPORTANT MUST ATTENTION — flag duplicated patterns that should be extracted to a base class, generic, or helper. Classes in the same group or suffix (ex *Entity, *Dto, \*Service, etc...) MUST ATTENTION inherit a common base (even if empty now — enables future shared logic and child overrides). Verify project has code linting/analyzer configured for the stack.

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call the current task list first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] $skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** the current task list done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate** — Run after task-tracking bootstrap and before target/source file reads, grep, edits, or analysis. Project docs override generic framework assumptions.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`; behavior/public-contract/spec-test-code sync `workflow-spec-test-code-cycle-reference.md`; derived spec index/ERD/reimplementation guides `spec-system-reference.md` + source Feature Specs under `docs/specs/`; architecture/new area `project-structure-reference.md`.
> 3. Read every required doc. If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.
> 4. Before target work, state: `Reference docs read: ... | Not applicable: ...`.
>
> **Ready when:** scope evaluated, required docs checked/read or setup route completed, `lessons.md` confirmed, citation emitted.

<!-- /SYNC:project-reference-docs-guide -->

<!-- SYNC:task-tracking-external-report -->

> **Task Tracking & External Report Persistence** — Bootstrap this before execution; then run project-reference doc prefetch before target/source work.
>
> 1. Create a small task breakdown before target file reads, grep, edits, or analysis. On context loss, inspect the current task list first.
> 2. Mark one task `in_progress` before work and `completed` immediately after evidence; never batch transitions.
> 3. For plan/review work, create `plans/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` before first finding.
> 4. Append findings after each file/section/decision and synthesize from the report file at the end.
> 5. Final output cites `Full report: plans/reports/{filename}`.
>
> **Blocked until:** task breakdown exists, report path declared for plan/review work, first finding persisted before the next finding.

<!-- /SYNC:task-tracking-external-report -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs proof.
>
> 1. Cite `file:line`, grep results, or framework docs for EVERY claim
> 2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
> 3. Cross-service validation required for architectural changes
> 4. "I don't have enough evidence" is valid and expected output
>
> **BLOCKED until:** `- [ ]` Evidence file path (`file:line`) `- [ ]` Grep search performed `- [ ]` 3+ similar patterns found `- [ ]` Confidence level stated
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->

<!-- SYNC:understand-code-first -->

> **Understand Code First** — HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
>
> 1. Search 3+ similar patterns (`grep`/`glob`) — cite `file:line` evidence
> 2. Read existing files in target area — understand structure, base classes, conventions
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists
> 4. Map dependencies via `connections` or `callers_of` — know what depends on your target
> 5. Write investigation to `.ai/workspace/analysis/` for non-trivial tasks (3+ files)
> 6. Re-read analysis file before implementing — never work from memory alone. — why: long context drifts from the file; the file is ground truth
> 7. NEVER invent new patterns when existing ones work — match exactly or document deviation. — why: divergent patterns fragment the codebase and slow every future reader
>
> **BLOCKED until:** `- [ ]` Read target files `- [ ]` Grep 3+ patterns `- [ ]` Graph trace (if graph.db exists) `- [ ]` Assumptions verified with evidence

<!-- /SYNC:understand-code-first -->

<!-- SYNC:double-round-trip-review -->

> **Validated-Finding Fix + Full Re-Review Loop** — Re-review is triggered by a validated finding fix cycle, not by a round number. Review purpose: `review → validate findings → fix validated findings → full re-review` until a complete review pass finds no issues. **A clean review ENDS the loop — no further rounds required.**
>
> **Round 1:** Main-session review. Read target files, build understanding, note issues. Output findings + verdict (PASS / FAIL).
>
> **Decision after Round 1:**
>
> - **No issues found (PASS, zero findings)** → review ENDS. Do NOT spawn a fresh sub-agent for confirmation.
> - **Issues found (FAIL, or any non-zero findings)** → run the active review skill's findings-validation gate first; for review skills the default gate is `$why-review --validate-findings <report-path>`. Fix only validated findings, then restart the full review protocol from the beginning with a fresh task breakdown.
>
> **Fresh full re-review after every fix cycle:** Re-run the whole review protocol over the current full target. When sub-agents are part of that protocol, spawn NEW `spawn_agent` calls — never reuse prior agents. Reviewers re-read ALL files from scratch with ZERO memory of prior rounds. See `SYNC:fresh-context-review` for the spawn mechanism and `SYNC:review-protocol-injection` for the canonical Agent prompt template. Each fresh full review must catch:
>
> - Cross-cutting concerns missed in the prior round
> - Interaction bugs between changed files
> - Convention drift (new code vs existing patterns)
> - Missing pieces that should exist but don't
> - Subtle edge cases the prior round rationalized away
> - Regressions introduced by the fixes themselves
>
> **Loop termination:** After each full re-review, repeat the same decision: clean → END; issues → validate findings → fix → restart from the first review phase. Continue until a complete review pass finds zero issues. If the same validated finding repeats for 3 full invocations with no progress, or a fix requires product/owner input, escalate via a direct user question.
>
> **Rules:**
>
> - A clean Round 1 ENDS the review — no mandatory Round 2
> - NEVER fix unvalidated findings; validate first using the caller's validation gate
> - NEVER skip the full re-review after a fix cycle (every fix invalidates the prior verdict)
> - NEVER reuse a sub-agent across rounds — every iteration that uses sub-agents spawns NEW Agent calls
> - Main agent READS sub-agent reports but MUST NOT filter, reinterpret, or override findings
> - No arbitrary sub-agent-round cap replaces the clean-review requirement; use the 3 repeated-no-progress blocker rule only to avoid infinite spinning
> - Track recursive invocation count and repeated blockers in conversation context (session-scoped)
> - Final verdict must incorporate ALL rounds executed
>
> **Report must include `## Round N Findings (Fresh Sub-Agent)` for every round N≥2 that was executed.**

<!-- /SYNC:double-round-trip-review -->

<!-- SYNC:fresh-context-review -->

> **Fresh Context Re-Review** — Eliminate orchestrator confirmation bias after fixes by restarting the full review with isolated sub-agents where applicable.
>
> **Why:** The main agent knows what it (or `$feature-implement`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** ONLY after a validated-finding fix cycle. A review round that finds zero issues ENDS the loop — do NOT spawn a confirmation sub-agent. A review round that finds issues triggers: validate findings → fix → full review restart from the first phase.
>
> **How:**
>
> 1. Start a NEW full review invocation/task breakdown; when that protocol calls for agents, spawn NEW `spawn_agent` tool calls — use `code-reviewer` agent_type for code reviews, `general-purpose` for plan/doc/artifact reviews
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. Never reference protocols by file path; AI compliance drops behind file-read indirection (see `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `plans/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - SKIP fresh sub-agent when the prior full review found zero issues (no fixes = nothing new to verify)
> - NEVER skip the full review restart after a fix cycle — every fix invalidates the prior verdict
> - NEVER reuse a sub-agent across rounds — every fresh round spawns a NEW `spawn_agent` call
> - Continue until a complete full review pass has zero findings; if the same blocker repeats 3 times with no progress, escalate via a direct user question
> - Track iteration count and repeated blockers in conversation context (session-scoped, no persistent files)

<!-- /SYNC:fresh-context-review -->

<!-- SYNC:review-protocol-injection -->

> **Review Protocol Injection** — Every fresh sub-agent review prompt MUST embed 11 protocol blocks VERBATIM. The template below has ALL 11 bodies already expanded inline. Copy the template wholesale into the Agent call's `prompt` field at runtime, replacing only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific values. Do NOT touch the embedded protocol sections.
>
> **Why inline expansion:** Placeholder markers would force file-read indirection at runtime. AI compliance drops significantly behind indirection (see `SYNC:shared-protocol-duplication-policy`). Therefore the template carries all 11 protocol bodies pre-embedded.

### Subagent Type Selection

- `code-reviewer` — for code reviews (reviewing source files, git diffs, implementation)
- `general-purpose` — for plan / doc / artifact reviews (reviewing markdown plans, docs, specs)

### Canonical Agent Call Template (Copy Verbatim)

```
spawn_agent({
  description: "Fresh Round {N} review",
  agent_type: "code-reviewer",
  prompt: `
## Task
{review-specific task — e.g., "Review all uncommitted changes for code quality" | "Review plan files under {plan-dir}" | "Review integration tests in {path}"}

## Round
Round {N}. You have ZERO memory of prior rounds. Re-read all target files from scratch via your own tool calls. Do NOT trust anything from the main agent beyond this prompt.

## Protocols (follow VERBATIM — these are non-negotiable)

### Spec ↔ Tests ↔ Code Triangulation
DO THIS FIRST — before any per-protocol check below. The review target is the WHOLE PACKAGE, not the diff alone: load the behavior's spec (§3 ACs / §4 BRs / §8 TCs), its tests, and the changed code TOGETHER, and reason about their mutual consistency BEFORE judging any one in isolation.
1. Locate all three faces: the Feature Spec section(s) governing the changed behavior, the tests that guard it, and the production code that implements it. A missing face is itself a finding (SPEC-GAP / TEST-GAP / DEAD-SPEC).
2. Triangulate pairwise — every disagreement is a finding; classify which face is wrong:
   - code vs spec: behavior the code does that no §3/§4/§8 rule describes → CODE-EXTRA or SPEC-STALE; a [HARD] §4 rule or §5 invariant with no enforcing code path → CODE-WRONG.
   - tests vs spec: a §8 TC with no test, or a test asserting behavior no TC/rule names → TEST-GAP or SPEC-SILENT.
   - tests vs code: a changed code path with no covering test → TEST-GAP; a test that still passes against a deliberately broken invariant → WEAK-TEST (apply the mutation thinking in Bug Detection).
3. Hidden-rule capture: any invariant the code enforces but the spec never states (SPEC-SILENT) MUST be surfaced as a finding to add into §3/§4/§8 AND guarded with a test — the enrichment loop, never a silent pass.
4. Only after the three faces agree — or every disagreement is logged as a finding — proceed to the per-protocol checks below; when enrichment adds spec/test content, re-review the package against the enriched spec.
NEVER mark review PASS while any spec/test/code face disagrees without a logged finding. The diff is the entry point; the package is the unit of judgment.

### Evidence-Based Reasoning
Speculation is FORBIDDEN. Every claim needs proof.
1. Cite file:line, grep results, or framework docs for EVERY claim
2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
3. Cross-service validation required for architectural changes
4. "I don't have enough evidence" is valid and expected output
BLOCKED until: Evidence file path (file:line) provided; Grep search performed; 3+ similar patterns found; Confidence level stated.
Forbidden without proof: "obviously", "I think", "should be", "probably", "this is because".
If incomplete → output: "Insufficient evidence. Verified: [...]. Not verified: [...]."

### Bug Detection
MUST check categories 1-4 for EVERY review. Never skip.
1. Null Safety: Can params/returns be null? Are they guarded? Optional chaining gaps? .find() returns checked?
2. Boundary Conditions: Off-by-one (< vs <=)? Empty collections handled? Zero/negative values? Max limits?
3. Error Handling: Try-catch scope correct? Silent swallowed exceptions? Error types specific? Cleanup in finally?
4. Resource Management: Connections/streams closed? Subscriptions unsubscribed on destroy? Timers cleared? Memory bounded?
5. Concurrency (if async): Missing await? Race conditions on shared state? Stale closures? Retry storms?
6. Stack-Specific: Check the configured language/runtime pitfalls and framework-specific failure modes discovered from local code.
Classify: CRITICAL (crash/corrupt) → FAIL | HIGH (incorrect behavior) → FAIL | MEDIUM (edge case) → WARN | LOW (defensive) → INFO.

### Design Patterns Quality
Priority checks for every code change:
1. DRY via OOP: Same-suffix classes (*Entity, *Dto, *Service) MUST share base class. 3+ similar patterns → extract to shared abstraction.
2. Right Responsibility: Logic in LOWEST layer (Entity > Domain Service > Application Service > Controller). Never business logic in controllers.
3. SOLID: Single responsibility (one reason to change). Open-closed (extend, don't modify). Liskov (subtypes substitutable). Interface segregation (small interfaces). Dependency inversion (depend on abstractions).
4. After extraction/move/rename: Grep ENTIRE scope for dangling references. Zero tolerance.
5. YAGNI gate: NEVER recommend patterns unless 3+ occurrences exist. Don't extract for hypothetical future use.
Anti-patterns to flag: God Object, Copy-Paste inheritance, Circular Dependency, Leaky Abstraction.

### Logic & Intention Review
Verify WHAT code does matches WHY it was changed.
1. Change Intention Check: Every changed file MUST serve the stated purpose. Flag unrelated changes as scope creep.
2. Happy Path Trace: Walk through one complete success scenario through changed code.
3. Error Path Trace: Walk through one failure/edge case scenario through changed code.
4. Acceptance Mapping: If plan context available, map every acceptance criterion to a code change.
5. Tests Verify Intent: For test/spec changes, verify tests name the protected business rule or invariant and would fail if that intent breaks.
6. Migration Test Exclusion: Do not write tests for migration code. Schema/data migrations are one-time execution paths, not core application logic.
NEVER mark review PASS without completing both traces (happy + error path).

### Test Spec Verification
Map changed code to test specifications.
1. Identify the project's test/spec format from existing docs, test-case files, BDD feature files, or spec folders.
2. Every changed code path MUST map to a corresponding test case/spec (or flag as "needs test case").
3. New functions/endpoints/handlers → flag for test spec creation.
4. Migration files are excluded from test/spec creation; schema/data migrations are one-time execution paths, not core application logic.
5. If spec evidence fields exist, verify they point to actual code (file:line, not stale references).
6. Verify each meaningful test case names the business intent/invariant; flag behavior-only cases that only mirror implementation details.
7. Auth/data changes → verify corresponding authorization and data-state test cases exist.
8. If no specs exist for a changed path → log the gap and recommend the project's test-spec workflow.
NEVER skip test mapping. Untested code paths are the #1 source of production bugs.

### Behavioral Delta Matrix
MANDATORY for any bugfix review. Produce input-state × pre-fix × post-fix × delta table BEFORE writing verdict.
- Minimum 3 rows; include at least one row OUTSIDE the original bug report.
- Any "REGRESSION" delta → review returns FAIL until a preservation test is added.
- Narrative descriptions do NOT substitute for the matrix.
Example rows (external-record sync fix):
| Input                 | Pre-fix | Post-fix                  | Delta      |
| --------------------- | ------- | ------------------------- | ---------- |
| Record exists (valid) | Reused  | Always recreated → orphan | REGRESSION |
| Record missing (404)  | Error   | Recreated                 | Fixed      |

### Fix-Layer Accountability
NEVER fix at the crash site. Trace the full flow, fix at the owning layer. The crash site is a SYMPTOM, not the cause.
MANDATORY before ANY fix:
1. Trace full data flow — Map the complete path from data origin to crash site across ALL layers (storage → backend → API → frontend → UI). Identify where bad state ENTERS, not where it CRASHES.
2. Identify the invariant owner — Which layer's contract guarantees this value is valid? Fix at the LOWEST layer that owns the invariant, not the highest layer that consumes it.
3. One fix, maximum protection — If fix requires touching 3+ files with defensive checks, you are at the wrong layer — go lower.
4. Verify no bypass paths — Confirm all data flows through the fix point. Check for direct construction skipping factories, clone/spread without re-validation, raw data not wrapped in domain models, mutations outside the model layer.
BLOCKED until: Full data flow traced (origin → crash); Invariant owner identified with file:line evidence; All access sites audited (grep count); Fix layer justified (lowest layer that protects most consumers).
Anti-patterns (REJECT): "Fix it where it crashes" (crash site ≠ cause site, trace upstream); "Add defensive checks at every consumer" (scattered defense = wrong layer); "Both fix is safer" (pick ONE authoritative layer).

### Rationalization Prevention
AI skips steps via these evasions. Recognize and reject:
- "Too simple for a plan" → Simple + wrong assumptions = wasted time. Plan anyway.
- "I'll test after" → RED before GREEN. Write/verify test first.
- "Already searched" → Show grep evidence with file:line. No proof = no search.
- "Just do it" → Still need task tracking. Skip depth, never skip tracking.
- "Just a small fix" → Small fix in wrong location cascades. Verify file:line first.
- "Code is self-explanatory" → Future readers need evidence trail. Document anyway.
- "Combine steps to save time" → Combined steps dilute focus. Each step has distinct purpose.

### Graph-Assisted Investigation
MANDATORY when .code-graph/graph.db exists.
HARD-GATE: MUST run at least ONE graph command on key files before concluding any investigation.
Pattern: Grep finds files → trace --direction both reveals full system flow → Grep verifies details.
- Investigation/Scout: trace --direction both on 2-3 entry files
- Fix/Debug: callers_of on buggy function + tests_for
- Feature/Enhancement: connections on files to be modified
- Code Review: tests_for on changed functions
- Blast Radius: trace --direction downstream
CLI: python .claude/scripts/code_graph {command} --json. Use --node-mode file first (10-30x less noise), then --node-mode function for detail.

### Understand Code First
HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
1. Search 3+ similar patterns (grep/glob) — cite file:line evidence.
2. Read existing files in target area — understand structure, base classes, conventions.
3. Run python .claude/scripts/code_graph trace <file> --direction both --json when .code-graph/graph.db exists.
4. Map dependencies via connections or callers_of — know what depends on your target.
5. Write investigation to .ai/workspace/analysis/ for non-trivial tasks (3+ files).
6. Re-read analysis file before implementing — never work from memory alone.
7. NEVER invent new patterns when existing ones work — match exactly or document deviation.
BLOCKED until: Read target files; Grep 3+ patterns; Graph trace (if graph.db exists); Assumptions verified with evidence.

## Reference Docs (READ before reviewing)
- `.claude/docs/development-rules.md` — canonical development rules, code-quality guidelines, and pre-commit checklist
- docs/project-reference/code-review-rules.md
- {skill-specific reference docs — e.g., integration-test-reference.md for integration-test-review; backend-patterns-reference.md for backend reviews; frontend-patterns-reference.md for frontend reviews}

## Target Files
{explicit file list OR "run git diff to see uncommitted changes" OR "read all files under {plan-dir}"}

## Output
Write a structured report to plans/reports/{review-type}-round{N}-{date}.md with sections:
- Status: PASS | FAIL
- Issue Count: {number}
- Critical Issues (with file:line evidence)
- High Priority Issues (with file:line evidence)
- Medium / Low Issues
- Cross-cutting findings

Return the report path and status to the main agent.
Every finding MUST have file:line evidence. Speculation is forbidden.
`
})
```

### Rules

- DO copy the template wholesale — including all 11 embedded protocol sections
- DO replace only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific content
- DO choose `code-reviewer` agent_type for code reviews and `general-purpose` for plan / doc / artifact reviews
- DO NOT paraphrase, summarize, or skip any protocol section
- DO NOT pass file contents inline — the sub-agent reads via its own tool calls so it has a fresh context
- DO NOT reference protocols by file path or tag name — the bodies are already embedded above
- DO NOT introduce placeholder markers for the protocols — they must stay literally expanded

<!-- /SYNC:review-protocol-injection -->

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

<!-- SYNC:severity-rubric -->

> **Severity Rubric** — Classify every finding by consequence, not by how easy it is to fix. One scale across all reviews so a "High" means the same thing everywhere.
>
> | Severity | Action      | Definition                                                                |
> | -------- | ----------- | ------------------------------------------------------------------------- |
> | CRITICAL | Block merge | Silent runtime failure, data corruption, validation bypass, security hole |
> | HIGH     | Must fix    | Incorrect behavior, invariant gap, architectural violation                |
> | MEDIUM   | Should fix  | Design debt, maintainability, likely future bug                           |
> | LOW      | Nice to fix | Convention, documentation, minor clarity                                  |
>
> **Score-based skills** map their numeric scale onto these tiers — do not invent a parallel vocabulary:
>
> - **0-2 criterion scoring** (e.g. production-readiness-review): `0` = CRITICAL/HIGH (criterion unmet, blocks production readiness), `1` = MEDIUM (partial, should fix), `2` = pass (no finding).
> - **Two-axis scoring** (e.g. performance-review, impact × likelihood): map the resulting cell to the nearest tier — high-impact + high-likelihood → CRITICAL/HIGH; low-impact OR low-likelihood → MEDIUM/LOW.
>
> A finding's tier drives the gate: CRITICAL/HIGH must be resolved or explicitly accepted by the owner before PASS; MEDIUM/LOW may ship with a tracked follow-up.

<!-- /SYNC:severity-rubric -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `plans/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** After task-tracking bootstrap and before target/source work, read required project-reference docs and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project conventions override generic defaults.
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify findings Critical/High/Medium/Low by consequence; Critical/High block PASS until fixed or owner-accepted.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Review an artifact (PBI, design spec, story, test spec) for completeness and quality so reviewed artifacts are complete, evidence-backed, and ready for handoff without missing assumptions or acceptance gaps.

**Protocols in force — MUST ATTENTION honor every block below (concise digest of the SYNC/shared blocks this skill carries):**

- **Nested Task Creation:** Parent workflow rows never replace child phase tracking.
- **Project Reference Docs Guide:** Read required project docs before target work.
- **Task Tracking External Report:** Bootstrap tasks; persist review findings to `plans/reports/`.
- **Critical Thinking Mindset:** Traced `file:line` proof; confidence >80% to act.
- **Evidence Based Reasoning:** No claim without cited evidence; state confidence.
- **Understand Code First:** Read code, grep 3+ patterns before any change.
- **Double Round Trip Review:** Validate findings, fix, restart full review until clean.
- **Fresh Context Review:** Spawn fresh zero-memory sub-agent after each fix cycle.
- **Review Protocol Injection:** Embed all 11 protocol bodies verbatim in sub-agent prompts.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Severity Rubric:** Classify findings Critical/High/Medium/Low by consequence.

**IMPORTANT MUST ATTENTION** be a SKEPTIC, not a presence-checker — run ALL 6 adversarial techniques (steel-man rejected alternatives, stress-test 3 assumptions, AC-testability, pre-mortem, unseen alternatives, contrarian pass) and clear the Anti-Bias Gate BEFORE any verdict — why: sections that exist but hold weak/untestable content create false confidence worse than missing ones.
**IMPORTANT MUST ATTENTION** enforce the BLOCKING M1-M6 gate on ALL types — any M1-M5 violation forces NEEDS WORK citing the mandate ID + exact section/line; NEVER pass an M1-M5 violation — why: passing it makes this review itself defective.
**IMPORTANT MUST ATTENTION** exempt source identifiers inside evidence carriers (`[Source:]`, `**Evidence**`, `IntegrationTest`, frontmatter, mermaid) — flag tech leakage only in narrative/AC/scenario prose — why: carriers are CORRECT places for class/path/test names; flagging them is a false finding.
**IMPORTANT MUST ATTENTION** dispatch on `--type={pbi|story|spec-tests|design}` (infer if omitted) — apply that type's Required/Recommended checklist; verdict = PASS (all Required + ≥50% Recommended) | WARN (all Required, <50% Recommended) | FAIL (any Required fails).
**IMPORTANT MUST ATTENTION** for `--type=spec-tests`: every `[HARD]` §4 rule / §5 invariant maps to ≥1 universally-quantified property TC + boundary counter-case — a missing property category is a blocking finding; one business TC covered by MANY tests is the correct one-to-many shape, NEVER a duplicate.
**IMPORTANT MUST ATTENTION** run the findings-validation gate BEFORE fixing — invoke `$why-review --validate-findings <report-path>` first; NEVER edit the artifact to resolve findings before this gate returns CLEAN — why: validate-before-fix at parity with `$plan-review` prevents fixing phantom findings.
**IMPORTANT MUST ATTENTION** fix only validated findings, then restart the FULL review with a fresh `general-purpose` sub-agent (artifacts are NOT code) and loop until a clean pass — a clean review with zero findings ENDS the loop; NEVER spawn a confirmation sub-agent after a clean round — why: every fix invalidates the prior verdict, but a clean pass needs no re-confirmation.
**IMPORTANT MUST ATTENTION** cite `file:line`/section+line evidence for every finding (confidence >80% to act, <60% DO NOT recommend); every NEEDS WORK item must be actionable — why: speculation produces non-fixable findings.
**IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting; add a final review todo task to verify work quality.

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.

**Anti-Rationalization:**

| Evasion                                      | Rebuttal                                                                                               |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| "Required sections present, looks complete"  | Presence ≠ quality. Name what's IN them and the specific failure mode NOT addressed.                   |
| "ACs are defined"                            | Are they TESTABLE? Name the automated test a QA engineer writes for each — without clarification.      |
| "Alternatives were considered"               | Real alternatives or strawmen set up to lose? Steel-man the strongest rejected one.                    |
| "Verdict is clear, skip the contrarian pass" | Generate 2 sentences arguing the OPPOSITE conclusion first, then decide on evidence.                   |
| "M1-M5 violation is minor, let it pass"      | Passing an M1-M5 violation makes THIS review defective. NEEDS WORK + cite mandate ID + section/line.   |
| "Source name in prose, flag it"              | Check the carrier first — `[Source:]`/`**Evidence**`/`IntegrationTest`/frontmatter/mermaid are EXEMPT. |
| "Fix the finding, then I'm done"             | Validate findings (`$why-review`) BEFORE fixing, then restart the FULL review until a clean pass.      |
| "Skip evidence for review judgments"         | Cite section+line for every finding; confidence >80% to act, <60% DO NOT recommend.                    |

**IMPORTANT MUST ATTENTION** SKEPTIC stance — clear the Anti-Bias Gate (adversarial techniques) before any verdict.
**IMPORTANT MUST ATTENTION** M6 enforcement — NEEDS WORK on any M1-M5 violation, cite mandate ID + section/line; carriers exempt.
**IMPORTANT MUST ATTENTION** validate findings before fixing, then restart the FULL fresh review until a clean pass ENDS the loop.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)

## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Trace every requirement or invariant through decision, task, TC/test, source evidence, and docs/spec update.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.
  **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
   **Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
   **Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

## Common AI Mistake Prevention (System Lessons)

- **Re-read files after context compaction.** Edit requires prior Read in same context; compaction wipes read state. Re-read before editing.
- **Grep for old terms after bulk replacements.** AI over-trusts find/replace completeness. Grep full repo after bulk edits for missed refs in docs/configs/catalogs.
- **Check downstream references before deleting.** Deletions cascade doc/code staleness. Map referencing files before removal.
- **After memory loss, check existing state before creating new.** Compaction wipes prior-work memory. Query current state to resume — never blindly duplicate.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace full dependency chain after edits.** Changing a definition misses downstream consumers. Trace the full chain.
- **When renaming, grep ALL consumer file types.** Some file types silently ignore missing refs (no compile error). Search code, templates, configs, generated files.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Update docs that embed canonical data when source changes.** Docs inlining derived data (workflows, schemas, configs) go stale silently. Update all embedding docs alongside source.
- **Verify sub-agent results after context recovery.** Background agents may finish while parent compacted — grep-verify output, don't trust assumed completion.
- **Cross-check full target list against sub-agent assignments.** Parallel sub-agents by category miss boundary items. Reconcile union of assignments against target list before proceeding.
- **Sub-agents inherit knowledge only from their agent .md definition — use custom agent types, not built-in Explore.** Tool adoption = permission + knowledge + enforcement (numbered workflow step).
- **Persist sub-agent findings incrementally, not as a final batch.** Long sub-agents hit cutoffs before final write — findings lost. Instruct append-per-section to report file.
- **When debugging, ask "whose responsibility?" before fixing.** Trace caller (wrong data) vs callee (wrong handling). Fix at responsible layer — never patch symptom site.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing.** Pattern-matching as "wrong" skips context. Before changing any constant/limit/flag: read comments, git blame, surrounding code.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic-first debugging — resist nearest-attention trap.** Don't dive into first plausible cause. List EVERY precondition (config, env vars, paths, DB, endpoints, creds, versions, DI, data). Verify each against evidence (grep/query — not reasoning). Ask "what would falsify this?" — if nothing, it's not a hypothesis. Most expensive failure: going deeper in "obvious" layer while bug sits in layer never questioned.
- **Surgical changes — apply the diff test (context-aware).** Two modes: (1) Bug fix → every line traces to the bug; no restyling; orphan cleanup only for imports YOUR changes made unused. (2) Review/enhancement → implement improvements AND announce as "Enhancement beyond main request: [what]". Never silently scope-creep. Diff test: "Would this line exist if I wasn't asked to do X?" — if no, delete or announce.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **[MANDATORY FIRST ACTION] ALWAYS activate a suitable skill or workflow BEFORE responding.** Match task against workflow catalog + skill list; invoke via skill invocation or `$start-workflow <workflowId>`. NEVER answer or write code before checking. Skip = protocol violation.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
