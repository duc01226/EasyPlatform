---
name: linter-setup
description: '[Quality] Use when you need to research and configure code quality tooling for any tech stack — linters, formatters, static analysis, pre-commit hooks, and CI gates.'
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

**Goal:** Ensure every code change is caught by an automated quality sensor — both locally (fast feedback) AND in CI (enforcement gate) — before it reaches main, with zero divergence between the two, by installing the full computational feedback sensor layer for the tech stack (linters, formatters, type checkers, static analyzers, pre-commit hooks, and CI quality gates).

**Summary:**

- Detect the stack first (from `plan.md` / architecture report), then research each tool category (linter, formatter, type checker, static analyzer, dependency scanner, architecture fitness) via QUERY TEMPLATES — NEVER hardcode tool names; present top 2-3 options per category through a direct user question and let the user pick.
- Configure with the STRICTEST reasonable defaults (loosen ONLY with explicit user approval), always emit a stack-agnostic `.editorconfig`, and add tool cache dirs to `.gitignore`.
- Wire BOTH a pre-commit hook (formatter→linter→type-check, staged-files-only, <30s) AND a matching CI quality gate — the local and CI checks MUST NOT diverge.
- Prove it works: fire the pre-commit hook with an intentional violation and confirm it blocks the commit before declaring complete.

**Output:** Config files at project root + pre-commit hook config + CI quality gate step + `.editorconfig`.

**When invoked:** After `$scaffold` in the greenfield workflow, before `$harness-setup`.

**Design principles:**

- **Generic** — No hardcoded tool names in the research protocol. AI researches the stack's ecosystem.
- **Research-driven** — Per-stack research → present top 2-3 options → user picks → configure.
- **Strict-by-default** — Propose strictest reasonable settings; loosen only with explicit user approval.
- **Purpose-first** — Every category has a WHY; understanding purpose prevents cargo-culting.
- **Integration-ready** — Every tool must work both locally (fast feedback) AND in CI (enforcement gate).

---

## Stack Detection Protocol

Read from (in priority order):

1. `plan.md` YAML frontmatter — look for `tech_stack`, `language`, `framework` fields
2. Architecture-design report — look for tech stack comparison table
3. Tech-stack-comparison report — look for chosen stack

Extract: primary language(s), framework(s), CI provider/tooling, test framework, package manager.

Write detected profile to `.ai/workspace/linter-setup/stack-profile.md`:

```markdown
# Stack Profile

Language: {language}
Framework: {framework}
Package Manager: {npm/pip/dotnet/go/cargo/etc}
CI Provider/Tooling: {github-actions/gitlab-ci/azure-pipelines/etc}
Test Framework: {framework}
```

If any critical field undetectable → a direct user question to confirm before research.

---

## Tool Research Protocol

**MANDATORY IMPORTANT MUST ATTENTION** — This section uses QUERY TEMPLATES, not tool names. DO NOT hardcode specific tool recommendations. Research current ecosystem for the detected stack and present options.

For each tech stack layer detected, research these TOOL CATEGORIES using the query templates below:

| Category                 | Purpose (WHY)                                                      | Research Query Template                                      |
| ------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------ |
| **Linter**               | Catch bugs, enforce style, prevent common errors at author time    | `"{language} best linter {year} community standard"`         |
| **Formatter**            | Eliminate style debates, enforce consistent code shape             | `"{language} opinionated code formatter {year}"`             |
| **Type Checker**         | Catch type errors without runtime — strongest computational sensor | `"{language} static type checker {year}"`                    |
| **Static Analyzer**      | Deep bug patterns, complexity, dead code, security CWEs            | `"{language} static analysis SAST tool {year}"`              |
| **Dependency Scanner**   | Known CVEs in dependencies — supply chain security                 | `"{language} dependency vulnerability scanner {year}"`       |
| **Architecture Fitness** | Enforce module boundaries, dependency direction                    | `"{language} architecture linting module boundaries {year}"` |

**Research process per category:**

1. Search with query template (WebSearch if available, otherwise apply knowledge with explicit confidence %)
2. Score top 3 candidates: community adoption, last release date, CI integration ease, config complexity
3. Present via a direct user question: "For {category} in {language}, which tool?" — top 2-3 as options + brief pros/cons

**IMPORTANT:** Confidence in current ecosystem <80% (fast-moving ecosystem, unfamiliar stack) → use WebSearch to verify before presenting options. — why: tool ecosystems churn fast; stale recommendations cargo-cult dead tools.

---

## Installation & Configuration Protocol

After user selects tools per category:

1. Generate install command for detected package manager
2. Generate config file with STRICTEST reasonable defaults
    - Rationale: starting strict is easier to loosen than starting loose is to tighten
    - Loosen ONLY with explicit user approval via a direct user question
3. Document what each enabled rule catches and why (one line per rule group)
4. Generate sample config file: `.{tool}rc`, `{tool}.config.{ext}`, `pyproject.toml` section, etc.
5. Add tool cache directories to `.gitignore`

**`.editorconfig` (ALWAYS generate — stack-agnostic):**

```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

Adjust `indent_size` and `end_of_line` for the detected stack's conventions.

---

## Pre-Commit Hook Setup

> **Note on framework names:** Pre-commit hook frameworks are ecosystem infrastructure standards, not research choices. Naming them here is correct — they are the glue layer, not the quality tools invoked through them. The quality tools (linter, formatter) invoked inside hooks are the research-driven selections from the Tool Research Protocol above.

Detect pre-commit framework for the stack:

- Node.js / JavaScript / TypeScript → Husky + lint-staged OR lefthook (research current community preference)
- Python → pre-commit framework (`pre-commit` package)
- Configured backend/runtime stack → restore/install analyzer tools + custom `.git/hooks/pre-commit` shell script
- Go → pre-commit framework or custom Makefile target
- Rust → cargo-husky OR pre-commit framework
- Java / Kotlin → pre-commit framework or Maven/Gradle Git hooks plugin
- Ruby → overcommit OR pre-commit framework

Configure hooks to run in this order (fastest first to fail fast):

1. Formatter (check only — do not auto-fix in hook)
2. Linter (fail on any error)
3. Type-check (fail on any error)

**Performance constraint:** Hooks MUST run in <30 seconds total for good DX. If slower:

- Configure to run only on staged files (not full codebase)
- Defer slow checks (static analysis, full type-check) to CI only

Generate:

- Hook config file (`.husky/pre-commit`, `.lefthook.yml`, `.pre-commit-config.yaml`, etc.)
- `README.md` section: "## Code Quality — Pre-commit Hooks" with setup instructions for new team members

---

## CI Quality Gate Configuration

Detect CI provider/tooling from repository files:

- `.github/workflows/` → GitHub Actions
- `.gitlab-ci.yml` → GitLab CI
- `azure-pipelines.yml` → Azure Pipelines
- `Jenkinsfile` → Jenkins
- `bitbucket-pipelines.yml` → Bitbucket Pipelines

If not detected → a direct user question: "Which CI provider/tooling does this repository use?"

Generate CI job/step that:

1. Restores tool cache (install only on cache miss)
2. Runs formatter check (fail on diff — `--check` mode, no auto-fix)
3. Runs linter (fail on any error)
4. Runs type checker (fail on any error)
5. Runs static analyzer (fail on threshold: configurable complexity and duplication)
6. Runs dependency vulnerability scanner (fail on HIGH/CRITICAL CVEs)
7. Reports line-coverage as a DIAGNOSTIC only — NEVER fail the build on a coverage %. Low coverage is a useful untested-area signal; high coverage is not evidence of quality. If a test-strength gate is wanted, a direct user question: "Configure a mutation-testing tool (e.g. Stryker / PITest / mutmut, per stack) as the CI test-quality gate?" — gate on mutation score (surviving mutant = missing/weak assertion), with line-coverage reported but ungated. Keep behavior/change-coverage (each behavior-changing file has a test asserting the changed outcome) as the meaningful coverage notion.

**MANDATORY:** CI gate must match pre-commit hooks. If a check runs locally, it runs in CI. No divergence.

---

## Verification Checklist

After all config files generated, verify MUST ATTENTION each item:

- Config files exist at project root (linter, formatter, type-checker configs)
- `.editorconfig` created at project root
- Pre-commit hook fires on `git commit` — test with an intentional violation (e.g., add a lint error, attempt commit, verify hook blocks)
- CI step defined and references the correct config files
- Team setup documented in `README.md` — new devs know to run `{hook install command}` after clone
- `.gitignore` updated with tool cache directories

---

## Next Steps

a direct user question:

- **"$harness-setup continues (Recommended)"** — Set up feedforward guides + inferential sensors to complete the outer harness
- **"$feature-implement"** — Skip harness inventory and begin implementation
- **"Skip"** — Continue manually

---

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

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
> **Assume existing values are intentional — ask WHY before changing.** Before changing a constant, limit, flag, wording, or pattern, read nearby context and history.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Every code change is caught by an automated quality sensor — both locally (fast feedback) AND in CI (enforcement gate) — before it reaches main, with ZERO divergence between the two, by installing the full sensor layer (linter, formatter, type checker, static analyzer, dependency scanner, architecture fitness, pre-commit hook, CI gate) for the detected stack.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** MUST ATTENTION apply critical/sequential thinking; cite proof, NEVER present guess as fact.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**IMPORTANT MUST ATTENTION** use QUERY TEMPLATES in Tool Research — NEVER hardcode tool names in the research phase; research the detected stack's current ecosystem and present options — why: tool ecosystems churn fast, hardcoded names cargo-cult dead tools.
**IMPORTANT MUST ATTENTION** present top 2-3 options per category via a direct user question — let the user pick; NEVER auto-select — why: tool choice is a team-owned decision, not the skill's.
**IMPORTANT MUST ATTENTION** verify the pre-commit hook fires with an INTENTIONAL violation (add a lint error, attempt commit, confirm it blocks) before marking complete — why: an unproven gate is no gate.
**IMPORTANT MUST ATTENTION** CI gate MUST match pre-commit hooks — if a check runs locally it runs in CI, no divergence — why: divergent local/CI checks let violations slip through one path.

**MUST ATTENTION** detect the stack FIRST (`plan.md` → architecture report → tech-stack report); if a critical field is undetectable, a direct user question before research — why: every downstream tool choice depends on the stack profile.
**MUST ATTENTION** configure with the STRICTEST reasonable defaults; loosen ONLY with explicit user approval via a direct user question — why: starting strict is easier to loosen than starting loose is to tighten.
**MUST ATTENTION** ALWAYS emit a stack-agnostic `.editorconfig` and add tool cache dirs to `.gitignore` — why: editorconfig is the one truly portable cross-tool baseline; cached artifacts must never be committed.
**MUST ATTENTION** order hooks formatter→linter→type-check, staged-files-only, <30s; defer slow checks (static analysis, full type-check) to CI — why: a slow hook gets bypassed, killing local feedback.
**MUST ATTENTION** report line-coverage as a DIAGNOSTIC only — NEVER fail the build on a coverage %; gate on mutation score if a test-strength gate is wanted — why: high coverage is not evidence of assertion quality.
**MUST ATTENTION** pre-commit hook framework names ARE allowed (ecosystem glue, not research choices) — the quality tools invoked inside them are the research-driven selections — why: keep the generic/research boundary clear.

**MUST ATTENTION** when confidence in the current ecosystem is <80% (fast-moving or unfamiliar stack), use WebSearch to verify before presenting options — cite confidence % for every recommendation; <60% DO NOT recommend — why: stale tool advice fails silently.
**MUST ATTENTION** grep/glob the repo for 3+ existing config/CI patterns before generating new ones — match the project's existing layout, don't impose a foreign convention — why: a config that fights local convention gets reverted.
**MUST ATTENTION** evaluate fit before copying a nearby config — verify the new stack shares the same package manager, CI provider, and conventions as the source — why: closest example ≠ matching preconditions.
**MUST ATTENTION** bootstrap a task tracking breakdown (one task per category/config file + a final verification task) BEFORE acting; keep exactly one task `in_progress` — why: long research/config work loses context without external tracking.

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                                                 |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| "I know the best linter for this stack"          | Ecosystems churn — research current options, present 2-3 via a direct user question. Hardcoding = stale. |
| "Strict defaults are too aggressive, loosen now" | Start strict; loosen ONLY with explicit user approval. Easier to loosen than to tighten later.           |
| "Hook works, no need to test it"                 | Fire an INTENTIONAL violation and confirm it blocks. Unproven gate = no gate.                            |
| "Local checks are enough, skip CI"               | CI gate MUST mirror pre-commit. No divergence — a local-only check is bypassable.                        |
| "Coverage % is high, gate on it"                 | Coverage is diagnostic only. Gate on mutation score; high coverage ≠ strong assertions.                  |
| "Simple stack, skip task tracking"               | Still bootstrap task tracking. Skip depth, never skip tracking.                                          |

**IMPORTANT MUST ATTENTION** use QUERY TEMPLATES — NEVER hardcode tool names; present top 2-3 via a direct user question.
**IMPORTANT MUST ATTENTION** prove the pre-commit hook blocks an intentional violation before declaring complete.
**IMPORTANT MUST ATTENTION** CI gate must match pre-commit hooks — zero divergence between local and CI checks.

**[TASK-PLANNING]** Before acting, analyze task scope and break it into small todo tasks using task tracking.

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
