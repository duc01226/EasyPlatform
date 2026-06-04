---
name: linter-setup
version: 1.0.1
description: '[Quality] Use when you need to research and configure code quality tooling for any tech stack — linters, formatters, static analysis, pre-commit hooks, and CI gates.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Ensure every code change is caught by an automated quality sensor — both locally (fast feedback) AND in CI (enforcement gate) — before it reaches main, with zero divergence between the two, by installing the full computational feedback sensor layer for the tech stack (linters, formatters, type checkers, static analyzers, pre-commit hooks, and CI quality gates).

**Summary:**

- Detect the stack first (from `plan.md` / architecture report), then research each tool category (linter, formatter, type checker, static analyzer, dependency scanner, architecture fitness) via QUERY TEMPLATES — NEVER hardcode tool names; present top 2-3 options per category through `AskUserQuestion` and let the user pick.
- Configure with the STRICTEST reasonable defaults (loosen ONLY with explicit user approval), always emit a stack-agnostic `.editorconfig`, and add tool cache dirs to `.gitignore`.
- Wire BOTH a pre-commit hook (formatter→linter→type-check, staged-files-only, <30s) AND a matching CI quality gate — the local and CI checks MUST NOT diverge.
- Prove it works: fire the pre-commit hook with an intentional violation and confirm it blocks the commit before declaring complete.

**Output:** Config files at project root + pre-commit hook config + CI quality gate step + `.editorconfig`.

**When invoked:** After `/scaffold` in the greenfield workflow, before `/harness-setup`.

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

If any critical field undetectable → `AskUserQuestion` to confirm before research.

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
3. Present via `AskUserQuestion`: "For {category} in {language}, which tool?" — top 2-3 as options + brief pros/cons

**IMPORTANT:** Confidence in current ecosystem <80% (fast-moving ecosystem, unfamiliar stack) → use WebSearch to verify before presenting options. — why: tool ecosystems churn fast; stale recommendations cargo-cult dead tools.

---

## Installation & Configuration Protocol

After user selects tools per category:

1. Generate install command for detected package manager
2. Generate config file with STRICTEST reasonable defaults
    - Rationale: starting strict is easier to loosen than starting loose is to tighten
    - Loosen ONLY with explicit user approval via `AskUserQuestion`
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

If not detected → `AskUserQuestion`: "Which CI provider/tooling does this repository use?"

Generate CI job/step that:

1. Restores tool cache (install only on cache miss)
2. Runs formatter check (fail on diff — `--check` mode, no auto-fix)
3. Runs linter (fail on any error)
4. Runs type checker (fail on any error)
5. Runs static analyzer (fail on threshold: configurable complexity and duplication)
6. Runs dependency vulnerability scanner (fail on HIGH/CRITICAL CVEs)
7. Reports line-coverage as a DIAGNOSTIC only — NEVER fail the build on a coverage %. Low coverage is a useful untested-area signal; high coverage is not evidence of quality. If a test-strength gate is wanted, `AskUserQuestion`: "Configure a mutation-testing tool (e.g. Stryker / PITest / mutmut, per stack) as the CI test-quality gate?" — gate on mutation score (surviving mutant = missing/weak assertion), with line-coverage reported but ungated. Keep behavior/change-coverage (each behavior-changing file has a test asserting the changed outcome) as the meaningful coverage notion.

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

`AskUserQuestion`:

- **"/harness-setup continues (Recommended)"** — Set up feedforward guides + inferential sensors to complete the outer harness
- **"/feature-implement"** — Skip harness inventory and begin implementation
- **"Skip"** — Continue manually

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
**IMPORTANT MUST ATTENTION** present top 2-3 options per category via `AskUserQuestion` — let the user pick; NEVER auto-select — why: tool choice is a team-owned decision, not the skill's.
**IMPORTANT MUST ATTENTION** verify the pre-commit hook fires with an INTENTIONAL violation (add a lint error, attempt commit, confirm it blocks) before marking complete — why: an unproven gate is no gate.
**IMPORTANT MUST ATTENTION** CI gate MUST match pre-commit hooks — if a check runs locally it runs in CI, no divergence — why: divergent local/CI checks let violations slip through one path.

**MUST ATTENTION** detect the stack FIRST (`plan.md` → architecture report → tech-stack report); if a critical field is undetectable, `AskUserQuestion` before research — why: every downstream tool choice depends on the stack profile.
**MUST ATTENTION** configure with the STRICTEST reasonable defaults; loosen ONLY with explicit user approval via `AskUserQuestion` — why: starting strict is easier to loosen than starting loose is to tighten.
**MUST ATTENTION** ALWAYS emit a stack-agnostic `.editorconfig` and add tool cache dirs to `.gitignore` — why: editorconfig is the one truly portable cross-tool baseline; cached artifacts must never be committed.
**MUST ATTENTION** order hooks formatter→linter→type-check, staged-files-only, <30s; defer slow checks (static analysis, full type-check) to CI — why: a slow hook gets bypassed, killing local feedback.
**MUST ATTENTION** report line-coverage as a DIAGNOSTIC only — NEVER fail the build on a coverage %; gate on mutation score if a test-strength gate is wanted — why: high coverage is not evidence of assertion quality.
**MUST ATTENTION** pre-commit hook framework names ARE allowed (ecosystem glue, not research choices) — the quality tools invoked inside them are the research-driven selections — why: keep the generic/research boundary clear.

**MUST ATTENTION** when confidence in the current ecosystem is <80% (fast-moving or unfamiliar stack), use WebSearch to verify before presenting options — cite confidence % for every recommendation; <60% DO NOT recommend — why: stale tool advice fails silently.
**MUST ATTENTION** grep/glob the repo for 3+ existing config/CI patterns before generating new ones — match the project's existing layout, don't impose a foreign convention — why: a config that fights local convention gets reverted.
**MUST ATTENTION** evaluate fit before copying a nearby config — verify the new stack shares the same package manager, CI provider, and conventions as the source — why: closest example ≠ matching preconditions.
**MUST ATTENTION** bootstrap a `TaskCreate` breakdown (one task per category/config file + a final verification task) BEFORE acting; keep exactly one task `in_progress` — why: long research/config work loses context without external tracking.

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                                            |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| "I know the best linter for this stack"          | Ecosystems churn — research current options, present 2-3 via `AskUserQuestion`. Hardcoding = stale. |
| "Strict defaults are too aggressive, loosen now" | Start strict; loosen ONLY with explicit user approval. Easier to loosen than to tighten later.      |
| "Hook works, no need to test it"                 | Fire an INTENTIONAL violation and confirm it blocks. Unproven gate = no gate.                       |
| "Local checks are enough, skip CI"               | CI gate MUST mirror pre-commit. No divergence — a local-only check is bypassable.                   |
| "Coverage % is high, gate on it"                 | Coverage is diagnostic only. Gate on mutation score; high coverage ≠ strong assertions.             |
| "Simple stack, skip task tracking"               | Still bootstrap `TaskCreate`. Skip depth, never skip tracking.                                      |

**IMPORTANT MUST ATTENTION** use QUERY TEMPLATES — NEVER hardcode tool names; present top 2-3 via `AskUserQuestion`.
**IMPORTANT MUST ATTENTION** prove the pre-commit hook blocks an intentional violation before declaring complete.
**IMPORTANT MUST ATTENTION** CI gate must match pre-commit hooks — zero divergence between local and CI checks.

**[TASK-PLANNING]** Before acting, analyze task scope and break it into small todo tasks using `TaskCreate`.
