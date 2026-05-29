---
name: scan-seed-test-data
description: '[Documentation] Use when you need to scan seeder patterns and populate/sync docs/project-reference/seed-test-data-reference markdown from real code evidence.'
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

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec/test-case planning or TC mapping: `feature-docs-reference.md`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

> **[IMPORTANT]** Use task tracking to break work into small tasks before scanning.

## Quick Summary

**Goal:** Populate or sync `docs/project-reference/seed-test-data-reference.md` with project-specific seeder patterns using `file:line` evidence.

**Workflow:**

1. **Read target doc** — detect placeholder vs populated mode
2. **Scan codebase** — collect seeder base classes, env gate, idempotency loop, DI scope pattern, registration pattern
3. **Update doc surgically** — keep structure, refresh stale sections only
4. **Verify** — grep/trace evidence and ensure examples match real files

## Step 1: Detect Mode

Read:

- `docs/project-reference/seed-test-data-reference.md`
- `docs/project-config.json` (`Data Seeders` context group)

Mode rules:

- **Init mode:** placeholder/sparse content -> fill all sections from scan results
- **Sync mode:** existing content -> update only stale/incorrect sections

## Step 2: Collect Seeder Evidence

Run evidence-first scans (adapt to stack, examples below for.NET projects):

```bash
rg -n "DataSeeder|SeedData|CanSeedTestingData|SeedingMinimumDummyItemsCount|ExecuteInjectScopedAsync|ExecuteUowTask" src
rg -n "IPlatformApplicationDataSeeder|AddTransient<IPlatformApplicationDataSeeder" src
rg -n "WaitUntilAsync|SeedAdminUserData|CountAsync\\(" src
```

Graph check (when `.code-graph/graph.db` exists):

```bash
python .claude/scripts/code_graph trace <seeder-file> --direction both --json
```

Minimum evidence to capture:

1. Seeder base class/interface
2. Environment gate method/key
3. Idempotency predicate + count loop pattern
4. DI scope pattern (`ExecuteInjectScopedAsync` vs anti-patterns)
5. Seeder registration pattern in DI
6. Cross-service wait pattern (if used)

## Step 3: Update Reference Doc

Target file:

- `docs/project-reference/seed-test-data-reference.md`

Rules:

1. Keep the existing section structure where possible
2. Replace generic claims with real project evidence
3. Every rule/example requires `file:line` proof
4. Include anti-pattern warnings only when verified in source
5. Prefer short code snippets with clear source path notes

## Step 4: Verify and Report

Verification checklist:

1. Every example path exists
2. Key method/class names are grep-verified
3. Guidance matches current `docs/project-config.json` seeder rules
4. No stale references to removed symbols/files

Write report:

- `plans/reports/scan-seed-test-data-{YYMMDD}-{HHMM}-report.md`

Report sections:

1. Mode detected (init/sync)
2. Evidence summary (`file:line`)
3. Sections updated
4. Open gaps/TODOs

## Closing Reminders

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim
**IMPORTANT MUST ATTENTION** use surgical updates in sync mode (do not rewrite entire doc)
**IMPORTANT MUST ATTENTION** verify DI-scope safety guidance (`ExecuteInjectScopedAsync`) against real source usage
**IMPORTANT MUST ATTENTION** run one graph trace when graph DB is available

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** Match prompt against workflow catalog
2. **ANALYZE:** Find best-match workflow AND evaluate if a custom step combination would fit better
3. **ASK (REQUIRED FORMAT):** Use a direct user question with this structure unless the user explicitly invoked a workflow/skill and the local protocol treats explicit invocation as confirmation:
    - Question: "Which workflow do you want to activate?"
    - Option 1: "Activate **[BestMatch Workflow]** (Recommended)"
    - Option 2: "Activate custom workflow: **[step1 → step2 → ...]**" (include one-line rationale)
4. **ACTIVATE (if confirmed):** Call `$workflow-start <workflowId>` for standard; sequence custom steps manually
5. **CREATE TASKS:** task tracking for ALL workflow steps
6. **EXECUTE:** Follow each step in sequence
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
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
