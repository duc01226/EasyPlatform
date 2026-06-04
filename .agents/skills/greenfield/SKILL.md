---
name: greenfield
description: '[Planning] Use when you need to start a new project from scratch with full waterfall inception — idea, research, domain modeling, tech stack, and implementation plan.'
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

Codex does not receive Claude hook-based doc injection.
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

## Quick Summary

**Goal:** Guide greenfield project inception from raw idea to an approved, implementable project plan using a full waterfall process.

**Workflow (16 steps):**

1. **Discovery** (`$idea`) — Interview user about problem, vision, constraints, team skills, scale. **DO NOT ask about tech stack** — keep business-focused.
2. **Market Research** (`$web-research`) — WebSearch for competitors, market landscape, existing solutions
3. **Deep Research** (`$deep-research`) — WebFetch top sources, extract key findings
4. **Business Evaluation** (`$business-evaluation`) — Viability assessment, risk matrix, value proposition
5. **Domain Analysis & ERD** (`$domain-analysis`) — Bounded contexts, aggregates, entities, ERD diagram, domain events. Validate every context boundary with user.
6. **Tech Stack Research** (`$tech-stack-research`) — Derive technical requirements from business + domain analysis. Research top 3 options per stack layer (backend, frontend, database, messaging, infra). Detailed pros/cons matrix, team-fit scoring, market analysis. Present comparison report for user to decide.
7. **Architecture Design** (`$architecture-design`) — Research and compare top 3 architecture styles (Clean, Hexagonal, Vertical Slice, etc.). Evaluate design patterns (CQRS, Repository, Mediator). Audit against SOLID, DRY, KISS, YAGNI. Validate scalability, maintainability, IoC, technical agnosticism. Present comparison with recommendation. **Harness output required:** produce a "Scaffold Handoff — Harness Plan" table in the architecture report: (a) feedforward guides to create (AGENTS.md sections, skill activation rules, pattern catalog), (b) computational feedback sensors to install (linter, formatter, pre-commit, CI), (c) inferential feedback sensors to configure (review skills, AI gates). This table feeds `$scaffold` → `$linter-setup` → `$harness-setup`.
8. **Implementation Plan** (`$plan`) — Create phased plan using confirmed tech stack + architecture + domain model
9. **Security Audit** (`$security-review`) — Review plan for OWASP Top 10, auth patterns, data protection concerns
10. **Performance Audit** (`$performance-review`) — Review plan for performance bottlenecks, scalability, query optimization
11. **Plan Review** (`$plan-review`) — Full plan review, risk assessment, approval
12. **Refine to PBI** (`$refine`) — Transform idea + reviewed plan into actionable PBI with acceptance criteria
13. **User Stories** (`$story`) — Break PBI into implementable user stories
14. **Plan Validation** (`$plan-validate`) — Interview user with critical questions to validate plan + stories
15. **Test Strategy** (`$spec [mode=tests]`) — Test pyramid, frameworks, spec outline
16. **Workflow End** (`$workflow-end`) — Clean up, announce completion

**Key Rules:**

- PLANNING ONLY: never implement code
- Every stage saves artifacts to plan directory
- **MANDATORY IMPORTANT MUST ATTENTION** every stage requires a direct user question validation before proceeding
- Delegate architecture decisions to `solution-architect` agent
- Present 2-4 options for every major decision with confidence %
- **Business-First Protocol:** Tech stack is NEVER asked upfront. Business analysis (steps 1-5) + domain modeling (step 6) must complete first. Tech stack is derived from requirements through research and presented as a comparison report with options.
- **MANDATORY IMPORTANT MUST ATTENTION** architecture design MUST produce a "Scaffold Handoff — Harness Plan" table covering: feedforward guides, computational sensors (`$linter-setup` handles install), and inferential sensors (`$harness-setup` configures). The scaffold + linter-setup + harness-setup triad are NON-SKIPPABLE infrastructure — code without a harness accumulates technical debt from day one.

## Entry Point

This skill is the explicit entry point for the `workflow-greenfield-init` workflow.

**When invoked:**

1. Activate the `workflow-greenfield-init` workflow via `$start-workflow workflow-greenfield-init`
2. The workflow handles step sequencing, task creation, and progress tracking
3. Each step delegates to the appropriate skill (idea, web-research, domain-analysis, tech-stack-research, etc.)
4. The `solution-architect` agent provides architecture guidance throughout

## When to Use

- Starting a brand-new project from scratch
- No existing codebase (empty project directory)
- Planning a new application before writing any code
- Want structured waterfall inception with user collaboration at every step

## When NOT to Use

- Existing codebase with code (use `$plan` or `$start-workflow workflow-feature` instead)
- Bug fixes, refactoring, or feature implementation
- Quick prototyping (use `$cook` instead)

## Output

All artifacts saved to plan directory:

```
plans/{id}/
  research/
    discovery-interview.md
    market-research.md
    deep-research.md
    business-evaluation.md
    domain-analysis.md
    tech-stack-comparison.md
    architecture-design.md
  phase-01-domain-model.md
  phase-02-tech-stack.md
  phase-02b-architecture.md
  phase-03-project-structure.md
  phase-04-test-strategy.md
  phase-05-backlog.md
  plan.md (master plan with YAML frontmatter)
```

After completion, recommend next step: `$cook` to scaffold the project structure.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

---

**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks — one per workflow step.
**MANDATORY IMPORTANT MUST ATTENTION** validate with user at EVERY step — never auto-decide.
**MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality and identify fixes/enhancements.

---

**MANDATORY IMPORTANT MUST ATTENTION** use task tracking to break ALL work into small tasks BEFORE starting.
**MANDATORY IMPORTANT MUST ATTENTION** use a direct user question at EVERY stage — validate decisions before proceeding.
**MANDATORY IMPORTANT MUST ATTENTION** NEVER ask tech stack upfront — business analysis and domain modeling first.

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

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
   **Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
   **Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

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
   **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
