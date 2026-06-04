---
name: review-artifact
version: 2.0.0
description: '[Code Quality] Use when you need to review artifact quality (PBI, user story, test spec, design spec) before handoff. Supports --type={pbi|story|spec-tests|design}.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Review an artifact (PBI, design spec, story, test spec) for completeness and quality so reviewed artifacts are complete, evidence-backed, and ready for handoff without missing assumptions or acceptance gaps.

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

| #   | Check                                                                                                                              | Presence                                                                             | Quality Depth                                                                                                                                                                                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **TC ID format** — All TCs follow `TC-{FEATURE}-{NNN}` format                                                                      | Do all TCs use the `TC-{FEATURE}-{NNN}` pattern?                                     | Are IDs unique per TC? Does the FEATURE code match the actual feature?                                                                                                                                                           |
| 2   | **Story coverage** — Every user story has at least one corresponding TC                                                            | Does every story ID appear in at least one TC?                                       | Does each TC actually test the story behavior, or does it just reference the story ID in a comment?                                                                                                                              |
| 3   | **AC coverage** — Every acceptance criterion has a test case                                                                       | Is every AC traceable to at least one TC?                                            | Does each AC have a TC that would FAIL if the AC is violated? Single-test-per-AC misses edge cases.                                                                                                                              |
| 4   | **Happy path** — Each story has at least one happy path TC                                                                         | Is a happy path TC present per story?                                                | Does the happy path TC verify the full end-to-end scenario, or just a happy-path stub?                                                                                                                                           |
| 5   | **Error path** — Each story has at least one error/failure TC                                                                      | Is an error/failure TC present per story?                                            | Does the error TC verify the exact error response (code + message), not just that an error occurred?                                                                                                                             |
| 6   | **No duplicate TCs** — No two TC IDs describe the same business scenario                                                           | Are all TC IDs unique with distinct **business** scenarios?                          | Flag near-duplicate TCs (same scenario, trivially different input). NOTE: this is about duplicate _TCs_ — multiple _test methods_ sharing one TC is the expected one-to-many shape, NEVER a duplicate.                           |
| 7   | **Testable assertions** — Each TC has clear expected result (not vague "should work")                                              | Does each TC have a specific expected result?                                        | Is each assertion specific enough to catch regressions? Would it pass if the return value is wrong?                                                                                                                              |
| 8   | **Business intent / invariant guarded** — Each TC names the rule it protects                                                       | Does every meaningful TC include `Business Intent / Invariant Guarded`?              | Would the TC fail if that business rule/invariant breaks, or does it only mirror implementation details?                                                                                                                         |
| 9   | **Authorization TCs** — At least 1 TC per story verifying unauthorized access is rejected                                          | Is an authorization TC present per story?                                            | Does the authorization TC test a realistic access scenario, not just "wrong role → 403 without body check"?                                                                                                                      |
| 10  | **TC format completeness** — Every TC has Related Behaviors anchor table and IntegrationTest field                                 | Does every TC include a Related Behaviors anchor table and `IntegrationTest:` field? | For Tested-status TCs, is `IntegrationTest` populated with **≥1** covering test link `{TestFile}::{MethodName}` (or a test-filter expression) — not `Untested`? A TC may list several covering tests; never require exactly one. |
| 11  | **Preservation Tests (bugfix context)** — When fixing a bug, at least 1 TC verifies the pre-fix behavior is no longer reproducible | If this is a bugfix: is there a TC that would have CAUGHT the bug before the fix?    | Does the preservation TC assert the exact broken behavior (not just "no exception")?                                                                                                                                             |

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

Do not spawn a fresh sub-agent just to re-review the same finding set before fixing it. If the artifact needs work, fix actionable findings first, then restart the full artifact review over the current artifact. When that restarted review uses a fresh `general-purpose` sub-agent, use the canonical Agent template from `SYNC:review-protocol-injection` above. Artifact reviews (PBI, story, design spec, test spec) are NOT code — use `subagent_type: "general-purpose"`, not `"code-reviewer"`. When constructing the Agent call prompt:

1. Copy the Agent call shape from the `SYNC:review-protocol-injection` template verbatim
2. Set `subagent_type: "general-purpose"`
3. Embed the full verbatim body of these SYNC blocks (inlined above in this skill file): `SYNC:evidence-based-reasoning`, `SYNC:rationalization-prevention`, `SYNC:understand-code-first` (omit code-specific protocols like `SYNC:bug-detection`, `SYNC:design-patterns-quality`, `SYNC:fix-layer-accountability` which are not applicable to artifact files)
4. Set the Task as `"Run a full fresh artifact review over the current {artifact-type} after fixes were applied. Focus on: implicit assumptions, missing coverage of edge cases / error scenarios, unverified cross-references, completeness gaps only visible on second reading, whether acceptance criteria are truly testable and measurable, and regressions introduced by fixes."`
5. Set Target Files as the explicit artifact file path(s)
6. Set report path as `plans/reports/review-artifact-rerun{N}-{date}.md`

After sub-agent returns:

1. **Read** the sub-agent's report
2. **Integrate** findings as `## Re-Review {N} Findings` in the main report — DO NOT filter or override
3. **If NEEDS WORK:** fix actionable artifact findings, then restart the full artifact review from the beginning
4. **Repeated blocker cap:** if the same blocker repeats across 3 full invocations with no progress, escalate via `AskUserQuestion`
5. **Final verdict** must incorporate findings from ALL review passes that actually ran

## IMPORTANT Task Planning Notes (MUST ATTENTION FOLLOW)

- Always plan and break work into many small todo tasks using `TaskCreate`
- Always add a final review todo task to verify work quality and identify fixes/enhancements

---

## Systematic Review Protocol (for 10+ artifacts)

> **When reviewing many artifacts at once, categorize by type, fire parallel `code-reviewer` sub-agents per category, then synchronize findings.** See `review-changes/SKILL.md` § "Systematic Review Protocol" for the full 4-step protocol (Categorize → Parallel Sub-Agents → Synchronize → Holistic Assessment).

---

## AI Agent Integrity Gate (NON-NEGOTIABLE)

> **Completion ≠ Correctness.** Before reporting ANY work done, prove it:
>
> 1. **Grep every removed name.** Extraction/rename/delete touched N files? Grep confirms 0 dangling refs across ALL file types.
> 2. **Ask WHY before changing.** Existing values are intentional until proven otherwise. No "fix" without traced rationale.
> 3. **Verify ALL outputs.** One build passing ≠ all builds passing. Check every affected stack.
> 4. **Evaluate pattern fit.** Copying nearby code? Verify preconditions match — same scope, lifetime, base class, constraints.
> 5. **New artifact = wired artifact.** Created something? Prove it's registered, imported, and reachable by all consumers.

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

**Prerequisites:** **MUST ATTENTION READ** before executing:

> **OOP & DRY Enforcement:** MANDATORY IMPORTANT MUST ATTENTION — flag duplicated patterns that should be extracted to a base class, generic, or helper. Classes in the same group or suffix (ex *Entity, *Dto, \*Service, etc...) MUST ATTENTION inherit a common base (even if empty now — enables future shared logic and child overrides). Verify project has code linting/analyzer configured for the stack.

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call `TaskList` first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] $skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** `TaskList` done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate** — Run after task-tracking bootstrap and before target/source file reads, grep, edits, or analysis. Project docs override generic framework assumptions.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`; behavior/public-contract/spec-test-code sync `workflow-spec-test-code-cycle-reference.md`; derived spec index/ERD/reimplementation guides `spec-system-reference.md` + source Feature Specs under `docs/specs/`; architecture/new area `project-structure-reference.md`.
> 3. Read every required doc. If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `/project-init` or the narrow lower-level route (`/project-config`, `/docs-init`, `/scan-all`, `/scan --target=<key>`, `/claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `/sync-codex`; do not auto-run it.
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
> **BLOCKED until:** Evidence file path (`file:line`) provided; Grep search performed; 3+ similar patterns found; Confidence level stated.
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because".
>
> **If incomplete → output:** "Insufficient evidence. Verified: [...]. Not verified: [...]."

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

<!-- SYNC:graph-impact-analysis -->

> **Graph Impact Analysis** — When `.code-graph/graph.db` exists, run `blast-radius --json` to detect ALL files affected by changes (7 edge types: CALLS, MESSAGE_BUS, API_ENDPOINT, TRIGGERS_EVENT, PRODUCES_EVENT, TRIGGERS_COMMAND_EVENT, INHERITS). Compute gap: impacted_files - changed_files = potentially stale files. Risk: <5 Low, 5-20 Medium, >20 High. Use `trace --direction downstream` for deep chains on high-impact files.

<!-- /SYNC:graph-impact-analysis -->

<!-- SYNC:double-round-trip-review -->

> **Validated-Finding Fix + Full Re-Review Loop** — Re-review is triggered by a validated finding fix cycle, not by a round number. Review purpose: `review → validate findings → fix validated findings → full re-review` until a complete review pass finds no issues. **A clean review ENDS the loop — no further rounds required.**
>
> **Round 1:** Main-session review. Read target files, build understanding, note issues. Output findings + verdict (PASS / FAIL).
>
> **Decision after Round 1:**
>
> - **No issues found (PASS, zero findings)** → review ENDS. Do NOT spawn a fresh sub-agent for confirmation.
> - **Issues found (FAIL, or any non-zero findings)** → run the active review skill's findings-validation gate first; for review skills the default gate is `/why-review --validate-findings <report-path>`, fix only validated findings, then restart the full review protocol from the beginning with a fresh task breakdown.
>
> **Fresh full re-review after every fix cycle:** Re-run the whole review protocol over the current full target. When sub-agents are part of that protocol, spawn NEW `Agent` calls — never reuse prior agents. Reviewers re-read ALL files from scratch with ZERO memory of prior rounds. See `SYNC:fresh-context-review` for the spawn mechanism and `SYNC:review-protocol-injection` for the canonical Agent prompt template. Each fresh full review must catch:
>
> - Cross-cutting concerns missed in the prior round
> - Interaction bugs between changed files
> - Convention drift (new code vs existing patterns)
> - Missing pieces that should exist but don't
> - Subtle edge cases the prior round rationalized away
> - Regressions introduced by the fixes themselves
>
> **Loop termination:** After each full re-review, repeat the same decision: clean → END; issues → validate findings → fix → restart from the first review phase. Continue until a complete review pass finds zero issues. If the same validated finding repeats for 3 full invocations with no progress, or a fix requires product/owner input, escalate via `AskUserQuestion`.
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
> **Why:** The main agent knows what it (or `/cook`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** ONLY after a validated-finding fix cycle. A review round that finds zero issues ENDS the loop — do NOT spawn a confirmation sub-agent. A review round that finds issues triggers: validate findings → fix → full review restart from the first phase.
>
> **How:**
>
> 1. Start a NEW full review invocation/task breakdown; when that protocol calls for agents, spawn NEW `Agent` tool calls — use `code-reviewer` subagent_type for code reviews, `general-purpose` for plan/doc/artifact reviews
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. Never reference protocols by file path; AI compliance drops behind file-read indirection (see `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `plans/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - SKIP fresh sub-agent when the prior full review found zero issues (no fixes = nothing new to verify)
> - NEVER skip the full review restart after a fix cycle — every fix invalidates the prior verdict
> - NEVER reuse a sub-agent across rounds — every fresh round spawns a NEW `Agent` call
> - Continue until a complete full review pass has zero findings; if the same blocker repeats 3 times with no progress, escalate via `AskUserQuestion`
> - Track iteration count and repeated blockers in conversation context (session-scoped, no persistent files)

<!-- /SYNC:fresh-context-review -->

<!-- SYNC:review-protocol-injection -->

> **Review Protocol Injection** — Every fresh sub-agent review prompt MUST embed 10 protocol blocks VERBATIM. The template below has ALL 10 bodies already expanded inline. Copy the template wholesale into the Agent call's `prompt` field at runtime, replacing only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific values. Do NOT touch the embedded protocol sections.
>
> **Why inline expansion:** Placeholder markers would force file-read indirection at runtime. AI compliance drops significantly behind indirection (see `SYNC:shared-protocol-duplication-policy`). Therefore the template carries all 10 protocol bodies pre-embedded.

### Subagent Type Selection

- `code-reviewer` — for code reviews (reviewing source files, git diffs, implementation)
- `general-purpose` — for plan / doc / artifact reviews (reviewing markdown plans, docs, specs)

### Canonical Agent Call Template (Copy Verbatim)

```
Agent({
  description: "Fresh Round {N} review",
  subagent_type: "code-reviewer",
  prompt: `
## Task
{review-specific task — e.g., "Review all uncommitted changes for code quality" | "Review plan files under {plan-dir}" | "Review integration tests in {path}"}

## Round
Round {N}. You have ZERO memory of prior rounds. Re-read all target files from scratch via your own tool calls. Do NOT trust anything from the main agent beyond this prompt.

## Protocols (follow VERBATIM — these are non-negotiable)

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
- "Just do it" → Still need TaskCreate. Skip depth, never skip tracking.
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

- DO copy the template wholesale — including all 10 embedded protocol sections
- DO replace only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific content
- DO choose `code-reviewer` subagent_type for code reviews and `general-purpose` for plan / doc / artifact reviews
- DO NOT paraphrase, summarize, or skip any protocol section
- DO NOT pass file contents inline — the sub-agent reads via its own tool calls so it has a fresh context
- DO NOT reference protocols by file path or tag name — the bodies are already embedded above
- DO NOT introduce placeholder markers for the protocols — they must stay literally expanded

<!-- /SYNC:review-protocol-injection -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.
> **Keep domain concepts out of generic/shared/infrastructure layers.** A reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. The leak compiles and runs, so it passes review silently while coupling the "reusable" layer to one consumer. Push domain fields/logic down into the consumer via subclass or composition.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:graph-impact-analysis:reminder -->

**IMPORTANT MUST ATTENTION** run `blast-radius` when graph.db exists. Flag impacted files NOT in changeset as potentially stale.

<!-- /SYNC:graph-impact-analysis:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `plans/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** After task-tracking bootstrap and before target/source work, read required project-reference docs and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project conventions override generic defaults.
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing, stop and run or ask the user to run `/project-init`.

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

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Ensure reviewed artifacts are complete, evidence-backed, and ready for handoff without missing assumptions or acceptance gaps.
**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
**IMPORTANT MUST ATTENTION** execute the review loop: review → validate findings → fix validated findings → full re-review. A complete review pass with zero findings ENDS the review.

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.

**Anti-Rationalization:**

| Evasion                          | Rebuttal                                                                      |
| -------------------------------- | ----------------------------------------------------------------------------- |
| "Purpose obvious"                | Anchor it anyway — primacy/recency keeps outcome active through long prompts. |
| "Existing reminders enough"      | Echo Goal in Closing Reminders — bottom anchor prevents drift.                |
| "Skip evidence for prompt edits" | Cite changed file evidence and verify no stale protocol text remains.         |
