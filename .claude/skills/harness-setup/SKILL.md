---
name: harness-setup
version: 1.2.1
description: '[Quality] Use when setting up an agent quality harness with feedforward guides and feedback sensors.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Wire every feedforward guide and feedback sensor into the greenfield project so all later AI coding agents operate with maximum guidance and self-correct against quality gates BEFORE human review — raising first-attempt quality and catching defects at the earliest, cheapest stage.

**Summary:**

- BLOCK on the `/linter-setup` prerequisite first — computational sensors (linters, hooks, CI gates) MUST exist before any phase runs; this skill never installs them itself.
- Walk phases A→F as a hard barrier sequence: detect stack → author feedforward guides (CLAUDE.md conventions, anti-patterns, pattern catalog) → confirm computational sensors → wire inferential review skills to lifecycle gates → define behaviour/test strategy → emit inventory.
- Treat every feedforward-guide and sensor choice as `AskUserQuestion`-gated — never auto-decide content — why: harness conventions bind every future agent and silent choices propagate.
- Write `.ai/workspace/harness/harness-inventory.md` incrementally (append per phase, never held in memory) — keep it a LIVING document updated as new sensors are added.

**Main steps (run in order — each BLOCKS the next):**

1. **Guards** — BLOCK until `/linter-setup` verified (linter config + pre-commit hook + CI gate present); detect existing inventory (enhance, never skip).
2. **Phase A — Stack Detection** — read plan / architecture-design / tech-stack reports; write `stack-profile.md`; `AskUserQuestion` on any undetectable field.
3. **Phase B — Feedforward Guides** — author/enhance CLAUDE.md/AGENTS.md (architecture patterns, anti-patterns, naming, module boundaries) + skill-activation rules + `docs/architecture/*` notes + pattern catalog; confirm via `AskUserQuestion`.
4. **Phase C — Computational Sensors** — confirm `/linter-setup` outputs; list config paths (invoke `/linter-setup` if any missing).
5. **Phase D — Inferential Sensors** — wire review skills to lifecycle gates (`/why-review` pre-impl · `/code-review` pre-commit · `/domain-entities-review` post-impl · `/production-readiness-review` + `/security-review` pre-release · `/scan-codebase-health` recurring · `/integration-test-review` feature-area TC audit BOTH pre-release AND recurring — closes the diff-scoped blind spot); record under "## Review Gates".
6. **Phase E — Behaviour Harness** — pick spec format, define test pyramid + approved fixtures, gate on mutation score (NEVER line %), add property/behavior coverage; write `test-strategy.md`.
7. **Phase F — Inventory Report** — append `harness-inventory.md` (feedforward + computational/inferential sensors + open gaps); present via `AskUserQuestion`.
8. **Next Steps** — `AskUserQuestion`: `/feature-implement` (recommended) · `/why-review` · skip.

**Produces:**

- Feedforward guides: CLAUDE.md/AGENTS.md conventions, architecture docs, pattern catalogs, skill activation rules
- Computational feedback sensors: configured via `/linter-setup` (linters, formatters, pre-commit hooks, CI gates)
- Inferential feedback sensors: AI review skills wired to lifecycle stages
- Harness inventory: `.ai/workspace/harness/harness-inventory.md`

**When invoked:** After `/scaffold` + `/linter-setup` in greenfield workflow. Assumes scaffolding complete.

**Does NOT do:** Install linters or configure formatters — that is `/linter-setup`'s responsibility.

---

## Activation Guards

**Check 1 — Linter-setup prerequisite (BLOCK if missing):**
Before running any phases, verify `/linter-setup` completed by checking for:

- Linter config file at project root (e.g., `.eslintrc`, `pyproject.toml`, `.editorconfig`)
- Pre-commit hook config (e.g., `.husky/`, `.pre-commit-config.yaml`)
- CI quality gate definition

If any missing → `AskUserQuestion`: "/linter-setup appears incomplete. Computational feedback sensors must be in place before harness setup. Run /linter-setup first, then return here?"
**BLOCK** Phase A/B/C/D/E until linter-setup verification passes.

**Check 2 — Existing harness inventory:**
Check for `.ai/workspace/harness/harness-inventory.md`

- If found → `AskUserQuestion`: "Harness inventory already exists — re-run to enhance existing harness, or skip?"
- Proceed even when `CLAUDE.md`/`AGENTS.md` present — those are feedforward guides this skill may enhance, NEVER signals to skip

---

## Phase A — Stack Detection

Read from: `plan.md` frontmatter → architecture-design report → tech-stack-comparison report.

Extract:

- Primary language(s) and framework(s)
- Test framework and test runner
- CI provider/tooling
- Package manager and monorepo structure (if any)
- Module system and build tooling

Write detection result to `.ai/workspace/harness/stack-profile.md`.

If any field undetectable → `AskUserQuestion` to confirm before proceeding.

---

## Phase B — Feedforward Guide Setup (Inferential)

For each guide type, check if it exists; if not, create or enhance:

**1. CLAUDE.md / AGENTS.md — Architecture conventions**

- Add section: "Architecture Patterns" — document the patterns chosen in `/architecture-design` (e.g., Clean Architecture, CQRS, Repository)
- Add section: "Anti-Patterns" — explicit list of patterns to avoid for this stack
- Add section: "Naming Conventions" — language-idiomatic conventions for this repository
- Add section: "Module Boundaries" — which layers may import which; dependency direction rules

**2. Skill activation rules**

- Document in CLAUDE.md which skills auto-activate for common task types in this stack
- Example: "When modifying domain entities → activate `/domain-entities-review`"
- Example: "Before any commit → run `/code-review`"

**3. Architecture notes**

- Create `docs/architecture/` with:
    - `bounded-contexts.md` — domain boundaries and ownership
    - `dependency-rules.md` — allowed import directions between layers
    - `naming-conventions.md` — project-specific naming for files, classes, functions

**4. Pattern catalog**

- Create `docs/architecture/pattern-catalog.md`
- Document each pattern chosen in `/architecture-design` with DO/DON'T examples
- Anchor to actual project files once scaffolding produces them

Present list of guides created/updated via `AskUserQuestion`: "Feedforward guides above will be created/enhanced. Confirm or adjust?"

---

## Phase C — Computational Feedback Sensors

Confirm `/linter-setup` has completed:

- Check for linter config file at project root (e.g., `.eslintrc`, `pyproject.toml`, `.editorconfig`)
- Check for pre-commit hook config (e.g., `.husky/`, `.pre-commit-config.yaml`)
- Check for CI quality gate definition

If any missing → invoke `/linter-setup` before continuing.

Output: confirmation that computational sensors are in place, with file paths listed.

---

## Phase D — Inferential Feedback Sensors

Configure which AI review skills fire at each lifecycle stage. Present to user via `AskUserQuestion`:
"Which inferential sensors should be mandatory vs optional for this repository?"

**Pre-implementation (planning gate):**

- `/why-review` — validate design rationale before committing to implementation approach

**Pre-commit (lightweight review):**

- Document in CLAUDE.md: run `/code-review` before committing significant changes

**Post-implementation (domain model changes):**

- `/domain-entities-review` — when domain entity files are in the changeset

**Pre-release (mandatory gates):**

- `/production-readiness-review` — reliability and operational readiness
- `/security-review` — security review before production release

**Recurring drift detection:**

- `/scan-codebase-health` — schedule quarterly (or on CI schedule) to detect drift
- `/integration-test-review` — Missing Integration Test / Spec-Coverage Gate: feature-area-wide TC audit (Phase 3 addendum in that skill) catches orphaned Section-8 TCs and uncovered changed behavior. Wire BOTH pre-release (mandatory gate, alongside `/production-readiness-review` and `/security-review`) AND same recurring cadence as `/scan-codebase-health` — a diff-scoped run alone cannot see a TC whose covering test regressed outside the current change set; only a periodic feature-area sweep does.

Add the agreed sensor configuration to CLAUDE.md under "## Review Gates".

---

## Phase E — Behaviour Harness (Spec + Test Strategy)

Define the project's behaviour harness plan:

**Functional spec format:**

- `AskUserQuestion`: "Feature documentation format?" Options: feature-spec (8-section tech-free), TDD specs only, lightweight ADRs
- Establish `docs/specs/` or equivalent spec home

**Test strategy pyramid:**

- Unit: pure functions, domain entities, business logic (no I/O)
- Integration: subcutaneous CQRS tests, repository tests with real DB
- E2E: critical user journeys only (not full coverage — too slow)

**Approved fixtures pattern:**

- Pre-seed reference/lookup data as approved snapshots
- Integration tests are additive (never delete/reset data)

**Test-strength sensors (NOT a line-coverage gate):**

- **Line coverage is a diagnostic only — NEVER gate a build on it.** Low coverage is a useful NEGATIVE signal (an area is untested → investigate); high coverage is NOT evidence of quality (lines can execute with no meaningful assertion). Report it as a diagnostic; do not fail CI on a coverage %.
- **Mutation score is the real test-strength metric — gate on this.** `AskUserQuestion`: "Configure a mutation-testing tool (e.g. Stryker / PITest / mutmut, per stack) as the CI test-quality gate?" A surviving mutant = a fault your tests did not catch = a missing/weak assertion. Add a minimum mutation-score threshold to CI as the computational test-strength sensor.
- **Property coverage (optional second sensor):** each named business invariant guarded by ≥1 property/metamorphic test. Track which invariants have a property test; an unguarded invariant is a gap to fill.
- **Keep behavior/change-coverage (meaningful, not a %):** every behavior-changing file must have a test that asserts the changed outcome — see `/integration-test-review` Gate 7. This is the right notion of "coverage"; the line-% is not.

Document agreed test strategy to `docs/architecture/test-strategy.md`.

---

## Phase F — Harness Inventory Report

Write `.ai/workspace/harness/harness-inventory.md`:

```markdown
# Harness Inventory

Generated: {date}
Stack: {detected stack from Phase A}

## Feedforward Guides

| Type          | File/Skill                           | Purpose                         |
| ------------- | ------------------------------------ | ------------------------------- |
| Inferential   | CLAUDE.md §Architecture Patterns     | Shapes AI architectural choices |
| Inferential   | CLAUDE.md §Anti-Patterns             | Prevents known bad patterns     |
| Inferential   | docs/architecture/pattern-catalog.md | DO/DON'T examples per pattern   |
| Computational | .editorconfig                        | Cross-IDE consistency           |

## Feedback Sensors — Computational

| Stage      | Tool/Hook         | What it catches                                |
| ---------- | ----------------- | ---------------------------------------------- |
| Pre-commit | {linter}          | Style violations, common errors                |
| Pre-commit | {formatter}       | Code formatting drift                          |
| CI         | {type-checker}    | Type errors                                    |
| CI         | {static-analyzer} | Security, complexity, dead code                |
| CI         | {mutation-tool}   | Weak/missing assertions (test-strength GATE)   |
| CI         | {coverage-tool}   | Untested areas (DIAGNOSTIC only — never gated) |

## Feedback Sensors — Inferential

| Stage                   | Skill/Agent                                      | What it catches                                    |
| ----------------------- | ------------------------------------------------ | -------------------------------------------------- |
| Pre-implementation      | /why-review                                      | Design rationale gaps                              |
| Pre-commit              | /code-review                                     | Convention drift, logic errors                     |
| Post-implementation     | /domain-entities-review                          | Domain model quality                               |
| Pre-release             | /production-readiness-review                     | Operational readiness                              |
| Pre-release             | /security-review                                 | Security vulnerabilities                           |
| Pre-release + Recurring | /integration-test-review (feature-area TC audit) | Orphaned Section-8 TCs, uncovered changed behavior |

## Open Gaps

| Area                     | Reason   | Risk           |
| ------------------------ | -------- | -------------- |
| {area not yet harnessed} | {reason} | {LOW/MED/HIGH} |
```

Present inventory to user for review via `AskUserQuestion`.

---

## Next Steps

`AskUserQuestion`:

- **"/feature-implement (Recommended)"** — Begin implementing the project plan with full harness in place
- **"/why-review"** — Review harness design rationale before proceeding
- **"Skip"** — Proceed manually without workflow guidance

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never the delivery/retry bookkeeping held in shared infrastructure that any co-running process can write. Such a check passes when run alone and flakes the moment anything else shares that infrastructure.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:harness-setup -->

> **Harness Engineering** — An outer agent harness has two jobs: raise first-attempt quality + provide self-correction feedback loops before human review.
>
> **Controls split:**
>
> | Axis        | Type          | Examples                                                                                           | Frequency        |
> | ----------- | ------------- | -------------------------------------------------------------------------------------------------- | ---------------- |
> | Feedforward | Computational | `.editorconfig`, strict compiler flags, enforced module boundaries                                 | Always-on        |
> | Feedforward | Inferential   | `CLAUDE.md` conventions, skill prompts, architecture notes, pattern catalogs                       | Always-on        |
> | Feedback    | Computational | Linters, type checks, pre-commit hooks, ArchUnit/arch-fitness tests, mutation-score gate, CI gates | Pre-commit → CI  |
> | Feedback    | Inferential   | `/code-review` skill, `/production-readiness-review`, `/security-review`, LLM-as-judge passes      | Post-commit → CI |
>
> **Test-strength sensor — gate on mutation score, NOT line coverage.** Line coverage is a DIAGNOSTIC only: low coverage is a useful NEGATIVE signal (something is untested); high coverage is NOT evidence of quality (tests can execute lines without asserting intent) — NEVER fail a build on a line-coverage %. The real test-strength metric is **mutation score** (inject faults into changed code; surviving mutant = a missing/weak assertion = write the killing test); gate the build on it where a mutation tool exists. Add **property coverage** as a second sensor — each [HARD] §4 rule / §5 invariant guarded by ≥1 property/metamorphic test. The property tests themselves are REQUIRED for invariant-owning behaviors (`spec [mode=tests]` + `integration-test` force them, not opt-in); what is optional is only wiring property coverage as an _automated CI sensor_ on top. Keep **behavior/change-coverage** (does each behavior-changing file have a test that asserts the changed outcome) — that notion is meaningful and stays.
>
> **Three harness types:**
>
> 1. **Maintainability** — Complexity, duplication, line-coverage (diagnostic only — never a gate), style. Easiest: rich deterministic tooling.
> 2. **Architecture fitness** — Module boundaries, dependency direction, performance budgets, observability conventions.
> 3. **Behaviour** — Functional correctness. Hardest: gate on mutation score + property coverage; line coverage stays a diagnostic.
>
> **Keep quality left:** pre-commit sensors fire first (cheap), CI sensors fire second, post-review last (expensive).
>
> **Research-driven:** Never hardcode tool choices. Detect tech stack → research ecosystem → present top 2-3 options → user decides. Enforce strictest defaults; loosen only with explicit approval.
>
> **Harnessability signals:** Strong typing, explicit module boundaries, opinionated frameworks = easier to harness. Treat these as greenfield architectural choices, not just style preferences.

<!-- /SYNC:harness-setup -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Wire every feedforward guide and feedback sensor into the project so all later AI agents self-correct against quality gates BEFORE human review — raising first-attempt quality and catching defects at the earliest, cheapest stage.

**IMPORTANT MUST ATTENTION Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** critical + sequential thinking; every claim traced, confidence >80% to act.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Harness Engineering:** feedforward + feedback loops; gate on mutation score, never line-coverage %, keep quality left.

**IMPORTANT MUST ATTENTION Main steps (in order — each BLOCKS the next):** Guards (verify `/linter-setup`) → A Stack Detection (`stack-profile.md`) → B Feedforward Guides (CLAUDE.md patterns/anti-patterns/naming/boundaries + skill-activation rules + pattern catalog) → C Computational Sensors (confirm linter/hook/CI) → D Inferential Sensors (wire `/why-review`, `/code-review`, `/domain-entities-review`, `/production-readiness-review`, `/security-review`, `/scan-codebase-health`, `/integration-test-review` missing-test/spec-coverage gate to gates) → E Behaviour Harness (spec format + test pyramid + mutation-score gate + `test-strategy.md`) → F Inventory Report (`harness-inventory.md`) → Next Steps. NEVER skip or reorder — why: each phase consumes the prior phase's verified output.

**IMPORTANT MUST ATTENTION** BLOCK on the `/linter-setup` prerequisite first — ALWAYS verify computational sensors (linter config, pre-commit hook, CI gate) exist before any phase runs — why: keep quality left; cheapest gates must precede inferential ones, and this skill never installs them itself
**IMPORTANT MUST ATTENTION** NEVER auto-decide feedforward-guide or sensor content — present the draft and confirm via `AskUserQuestion` — why: harness conventions bind every future agent; silent choices propagate to all later sessions
**IMPORTANT MUST ATTENTION** write `.ai/workspace/harness/harness-inventory.md` incrementally (append after each phase) — NEVER hold findings in memory — why: long context drifts and silently drops findings
**IMPORTANT MUST ATTENTION** walk phases A→F as a hard barrier sequence — NEVER skip or reorder; each phase BLOCKS the next until its guard passes — why: a later phase consumes the prior phase's verified output
**IMPORTANT MUST ATTENTION** gate the behaviour harness on mutation score + property coverage — NEVER fail a build on a line-coverage % — why: lines execute without asserting intent, so coverage % is a diagnostic only, never a quality gate
**IMPORTANT MUST ATTENTION** wire `/integration-test-review`'s feature-area-wide TC audit as a Phase D sensor BOTH pre-release AND on the SAME recurring cadence as `/scan-codebase-health` — never pre-release only — why: a diff-scoped-only run cannot see a §8 TC whose covering test regressed outside the current change set; only a periodic feature-area sweep catches it
**IMPORTANT MUST ATTENTION** research tool choices per detected stack — NEVER hardcode a linter/formatter/mutation tool — present top 2-3 options, enforce strictest defaults, loosen only with explicit approval — why: harnessability depends on the actual stack, not a default
**IMPORTANT MUST ATTENTION** harness inventory is a LIVING document — update it when new sensors are added later — why: a stale inventory misrepresents the active feedback loop
**IMPORTANT MUST ATTENTION** grep 3+ existing guides/sensors before authoring a new one; verify fit (same stack, gate stage, lifecycle) before copying a nearby pattern — why: closest example ≠ matching preconditions
**IMPORTANT MUST ATTENTION** cite `file:line` / config-path evidence for every detected sensor and stack fact (confidence >80% to act, <60% DO NOT recommend) — NEVER speculate a tool exists; grep the config to confirm — why: a hallucinated sensor leaves a real gap unguarded
**IMPORTANT MUST ATTENTION** bootstrap task tracking before phases — `TaskCreate` one todo per phase, mark `in_progress`/`completed` as you go; on context loss `TaskList` first — why: resume work, never duplicate phases

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                                      |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| "Linter probably set up — skip the prereq check" | Grep for the config files. No `file:line` proof = BLOCK Phase A/B/C/D/E until verified.       |
| "I'll pick the obvious linter myself"            | NEVER auto-decide — present top 2-3 via `AskUserQuestion`; the user owns binding conventions. |
| "High line coverage means tests are strong"      | Coverage is a diagnostic, not a gate. Gate on mutation score; lines run without asserting.    |
| "Inventory's small, I'll hold it in memory"      | Append per phase to the inventory file — context loss silently drops findings.                |
| "CLAUDE.md exists, harness already done"         | CLAUDE.md is a feedforward guide to ENHANCE, never a signal to skip phases.                   |

**IMPORTANT MUST ATTENTION** BLOCK on `/linter-setup` before any phase · NEVER auto-decide harness content (`AskUserQuestion`-gate) · gate behaviour on mutation score, NEVER on line-coverage %.
