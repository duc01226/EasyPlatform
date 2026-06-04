---
name: workflow-e2e
version: 1.0.0
description: '[Workflow] Use when activating the E2E testing workflow to generate, update, or maintain Playwright/E2E tests. Pick mode with --source={changes|recording|update-ui}.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** [Workflow] Trigger the E2E testing workflow — one parameterized entry covering all three E2E sources. `--source` selects the protocol; the sequence is identical for every source.

**Workflow:**

1. **Detect** — read `--source={changes|recording|update-ui}`; classify request scope and target artifacts.
2. **Execute** — apply the source-specific protocol below with evidence-backed actions.
3. **Verify** — confirm constraints, output quality, and completion evidence.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- NEVER skip mandatory workflow or skill gates.

**IMPORTANT MANDATORY Steps:** /scout -> /e2e-test -> /test -> /docs-update -> /workflow-end -> /watzup

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

## Source Dispatch (`--source`)

Resolve `--source` from the invocation. If omitted, infer from the request (recording file present → `recording`; UI/SCSS/HTML diff → `update-ui`; otherwise `changes`) and state the chosen source before proceeding.

| `--source`  | Use when                                                                 | When NOT to use                                                        |
| ----------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `changes`   | Test specs or source code changed and E2E tests need to be synced.       | New recordings (`recording`), visual-only changes (`update-ui`).       |
| `recording` | A Chrome DevTools recording JSON exists and a Playwright test is wanted. | Updating existing tests, writing from scratch, running existing tests. |
| `update-ui` | UI changed and E2E screenshot baselines need updating.                   | Generating new tests, fixing test logic, non-visual changes.           |

All three sources run the same sequence: `/scout → /e2e-test → /test → /docs-update → /workflow-end → /watzup`. The downstream `e2e-test` leaf is mode-aware and performs the per-source work; this wrapper only injects the matching protocol and triggers the workflow.

### `--source=changes` — E2E from Changes

```
E2E FROM CHANGES PROTOCOL:
1. Detect change type from git diff:
   - Test spec changes in feature docs -> Generate new test cases
   - Code changes -> Update existing test assertions
   - API changes -> Update test data and API mocks
2. Load affected test specifications (TC-{FEATURE}-{NNN})
3. Update or generate test implementations
4. Ensure traceability: each TC has corresponding test
5. Run tests to verify changes work
6. Report updated test coverage
```

### `--source=recording` — E2E from Recording

```
E2E FROM RECORDING PROTOCOL:
1. Validate recording file exists (JSON format)
2. Identify target app and feature from user context
3. Run convert-recording.ts to generate initial test file
4. Load test specifications from feature docs Section 8
5. Map TC-{FEATURE}-{NNN} test cases to recording steps
6. Enhance generated code with project CSS conventions (from docs/project-config.json → workflowPatterns.cssMethodology)
7. Add screenshot assertions at key states
8. Generate Page Object if complex flow
9. Run test to verify it passes
10. Report generated files and any manual steps needed
```

### `--source=update-ui` — E2E Update UI

```
E2E UPDATE UI PROTOCOL:
1. Identify visual changes from git diff (SCSS, HTML, TS)
2. Map changed files to affected page objects
3. Find E2E specs using those page objects
4. Run affected tests to generate new screenshots
5. Update screenshot baselines with --update-snapshots
6. Visual review: diff old vs new baselines
7. Confirm changes are intentional with user
8. Report updated files and visual changes
```

**UNIVERSAL RULES (all sources):**

- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when creating or reviewing specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.

Activate the `workflow-e2e` workflow. Run `/start-workflow workflow-e2e` with the user's prompt as context and the resolved `--source` protocol above.

**Steps:** /scout → /e2e-test → /test → /docs-update → /workflow-end → /watzup

---

**IMPORTANT MANDATORY Steps:** /scout -> /e2e-test -> /test -> /docs-update -> /workflow-end -> /watzup

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

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:incremental-persistence -->

> **Incremental Result Persistence** — MANDATORY for all sub-agents or heavy inline steps processing >3 files.
>
> 1. **Before starting:** Create report file `plans/reports/{skill}-{date}-{slug}.md`
> 2. **After each file/section reviewed:** Append findings to report immediately — never hold in memory
> 3. **Return to main agent:** Summary only (per SYNC:subagent-return-contract) with `Full report:` path
> 4. **Main agent:** Reads report file only when resolving specific blockers
>
> **Why:** Context cutoff mid-execution loses ALL in-memory findings. Each disk write survives compaction. Partial results are better than no results.
>
> **Report naming:** `plans/reports/{skill-name}-{YYMMDD}-{HHmm}-{slug}.md`

<!-- /SYNC:incremental-persistence -->

<!-- SYNC:subagent-return-contract -->

> **Sub-Agent Return Contract** — When this skill spawns a sub-agent, the sub-agent MUST return ONLY this structure. Main agent reads only this summary — NEVER requests full sub-agent output inline.
>
> ```markdown
> ## Sub-Agent Result: [skill-name]
>
> Status: ✅ PASS | ⚠️ PARTIAL | ❌ FAIL
> Confidence: [0-100]%
>
> ### Findings (Critical/High only — max 10 bullets)
>
> - [severity] [file:line] [finding]
>
> ### Actions Taken
>
> - [file changed] [what changed]
>
> ### Blockers (if any)
>
> - [blocker description]
>
> Full report: plans/reports/[skill-name]-[date]-[slug].md
> ```
>
> Main agent reads `Full report` file ONLY when: (a) resolving a specific blocker, or (b) building a fix plan.
> Sub-agent writes full report incrementally (per SYNC:incremental-persistence) — not held in memory.
>
> **Context budget** — the return payload is a SUMMARY, not a transcript: ≤10 finding bullets, no raw file contents / full diffs / verbatim logs inline, no re-pasted source. Everything beyond the summary lives in the `Full report` on disk. A sub-agent that would exceed the summary shape MUST write the detail to its report and return only the pointer — the orchestrator's context is the scarce resource the whole map-reduce protects.

<!-- /SYNC:subagent-return-contract -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Nested Task Creation:** expand child phases, link parent when nested.
- **Critical Thinking:** traced `file:line` proof, confidence >80% to act.
- **Incremental Persistence:** append findings to report file after each section.
- **Subagent Return Contract:** sub-agent returns summary-only with `Full report:` pointer.

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.
