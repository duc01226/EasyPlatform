---
name: watzup
version: 1.2.0
description: '[Utilities] Use when you need to review recent changes and wrap up the work.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Hand the developer a complete, evidence-backed wrap-up — by reviewing current branch changes and summarizing impact/quality — with a change summary, doc/spec staleness flags, root-cause lessons, and a `/understand` explanation, WITHOUT mutating any file, so they decide the next step from full context.

**Summary:**

- This is a strictly READ-ONLY wrap-up — review/summarize current branch commits and flag findings; NEVER edit, fix, or implement, including never editing the docs/specs you flag.
- Three required gates after the change summary: doc-staleness check (path→doc mapping table), spec-driven health check (only when business code changed), and root-cause lesson extraction (name the failure mode, not the symptom; universal rule, not project-specific).
- Lessons go to `/learn` only after user confirmation; surface-level "always check file X" notes are noise, not lessons.
- `/understand` is the mandatory final handoff and MUST run before the `AskUserQuestion` Next Steps prompt — if `/understand` is unavailable, stop and report the blocker rather than skipping.

**Workflow:**

1. **Review** — Analyze recent commits: what was modified, added, removed
2. **Summarize** — Provide detailed change summary with quality assessment
3. **Doc Check** — Cross-reference changed files against docs/ for staleness
4. **Lesson Learned** — Analyze AI mistakes/issues during the task and capture lessons
5. **Understand Handoff** — Invoke `/understand` as the final mandatory task so the developer gets a Purpose → How → Why explanation of the completed work

**Key Rules:**

- READ-ONLY: only flag findings, never implement or fix anything
- Doc staleness check is REQUIRED (see mapping table below)
- Lesson-learned analysis is REQUIRED (see section below)
- Final review task MUST ATTENTION include doc-staleness check, lesson-learned analysis, AND the final `/understand` handoff
- MUST ATTENTION call `/understand` after the watzup summary/doc/mistake analysis and before the final Next Steps prompt

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

Review my current branch and the most recent commits.
Provide a detailed summary of all changes, including what was modified, added, or removed.
Analyze the overall impact and quality of the changes.

**IMPORTANT**: Review and summarize only, never start implementing.

---

## Doc Staleness Check (REQUIRED)

After change summary, run `git diff --name-only` (against base branch or recent commits), cross-reference changed files against relevant docs:

| Changed file pattern                   | Docs to check for staleness                                                             |
| -------------------------------------- | --------------------------------------------------------------------------------------- |
| `.claude/hooks/**`                     | `.claude/docs/hooks/README.md`, hook count tables in `.claude/docs/hooks/*.md`          |
| `.claude/skills/**`                    | `.claude/docs/skills/README.md`, skill count/catalog tables                             |
| `.claude/workflows/**`                 | `CLAUDE.md` workflow catalog table, `.claude/docs/` workflow references                 |
| `{configured-service-source-root}/**`  | `docs/specs/` doc for the affected service (path from `docs/project-config.json`)       |
| `{configured-frontend-source-root}/**` | `docs/project-reference/frontend-patterns-reference.md`, relevant business-feature docs |
| `CLAUDE.md`                            | `.claude/docs/README.md` (navigation hub must stay in sync)                             |

**Output one of:**

- A bulleted list of docs that may need updating, with a brief note on what is likely stale (e.g., "hook count changed from 31 to 32").
- `No doc updates needed` — if no changed file pattern maps to a doc.

**Do not edit docs during watzup.** Only flag. The user decides whether to fix.

---

## Spec-Driven Development Health Check (REQUIRED when business code changed)

Run this check when `git diff --name-only` includes ANY changes under the backend service source paths or frontend app/domain source paths (resolve the concrete paths from the project's structure reference / `docs/project-config.json`).

### Step 1 — Feature Spec Root Check

```bash
ls docs/specs/ 2>/dev/null
```

> **Note:** Results are **app-bucket** names. To find a specific Feature Spec, probe `ls docs/specs/{app-bucket}/` for canonical `README.{Feature}.md` files and derived bucket indexes/ERDs.

| Result                     | Action                                                                                                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Directory missing or empty | ⚠️ Flag: `"No Feature Specs found under docs/specs/. Consider running /workflow-code-to-spec (mode: init-full) to bootstrap spec-driven documentation for this codebase."` |
| Feature Specs exist        | Proceed to Step 2                                                                                                                                                          |

### Step 2 — Spec Staleness Check (only if bundle exists)

For each spec file in `docs/specs/`:

```bash
git log --since="30 days ago" --name-only -- docs/specs/ | head -10
```

| Result                                                               | Action                                                                                                                                                 |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| No commits in last 30 days AND business code changed in this session | ⚠️ Flag: `"Engineering spec bundle may be stale (no updates in >30 days). Consider running /workflow-code-to-spec (mode: audit) to verify freshness."` |
| Recent commits found                                                 | ✅ Spec bundle is being maintained                                                                                                                     |

### Step 3 — Feature Docs Freshness Check

```bash
git log --since="30 days ago" --name-only -- docs/specs/ | head -10
```

| Result                                               | Action                                                                                  |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| No commits in last 30 days AND business code changed | ⚠️ Flag: `"Business feature docs may be stale. Consider running /docs-update to sync."` |
| Recent commits found                                 | ✅ Feature docs are being maintained                                                    |

**Output only flags that apply. Skip this section entirely if no business code changed.**

---

## AI Mistake & Lesson Learned Analysis (REQUIRED)

After doc staleness check, review entire session for AI mistakes and lessons learned.

### Step 1 — Surface all mistakes

List every error made during session. For each, note:

- What happened (observable symptom — build fail, test fail, wrong output)
- Where it happened (file:line if applicable)

Common mistake categories:

- Assumed an API/type/enum value existed without reading the source
- Assumed infrastructure availability without checking requirements
- Conflated "code exists" with "code executes" — missed path tracing
- Used a pattern without verifying the new context has the same preconditions
- Reported "done" without verifying ALL affected outputs across all stacks
- Hallucinated method names, class names, or file paths

### Step 2 — Extract root-cause lessons (NOT symptom fixes)

For each mistake, apply this 3-step extraction:

**2a. Name the failure mode** — NOT the symptom, the reasoning failure:

| Symptom (BAD lesson)                       | Failure mode (GOOD lesson)                                                             |
| ------------------------------------------ | -------------------------------------------------------------------------------------- |
| "Used wrong enum value"                    | "Generated code using an assumed API without verifying it exists in the source"        |
| "Wrong namespace in using"                 | "Assumed project setup without reading project-specific configuration files first"     |
| "Happy-path assertion failed in CI"        | "Wrote assertions without tracing what infrastructure the handler requires at runtime" |
| "Set properties that don't exist on query" | "Assumed all types in a hierarchy share the same interface without reading base class" |

**2b. Find the class** — Where else could this SAME failure mode strike?

If failure mode applies in only one specific file or case → go up one abstraction level until it generalizes. Good lesson applies to ≥3 different contexts.

**2c. Write as a universal rule** — Strip ALL project-specific names:

- No file paths, class names specific to this codebase, or tool names
- Must read as useful advice on a completely different codebase in a different language
- If multiple mistakes share the same failure mode → consolidate into ONE lesson
- Test: "Would this prevent the same class of mistake in a Java, Go, or Python project?" If yes → good. If no → rewrite.

### Step 3 — Ask user to persist

> "Found [N] root-cause lesson(s). Should I use `/learn` to save them for future sessions?"

Wait for user confirmation before invoking `/learn`.

**Output one of:**

- A numbered list: failure mode → universal lesson → proposed `/learn` text
- `No AI mistakes identified in this session` — if genuinely none found

**Be honest and self-critical.** Surface-level symptom fixes ("always check file X") applying only to this codebase are NOT lessons — they are noise. Purpose: root-cause prevention compounding across sessions.

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** before presenting these options, invoke `/understand` as the final mandatory todo task using the watzup summary and current change set as scope. If `/understand` is unavailable, stop and report that blocker instead of silently skipping the handoff.

After `/understand` completes, MUST ATTENTION use `AskUserQuestion` to present these options. NEVER skip because task seems "simple" or "obvious" — the user decides:

- **"/workflow-end (Recommended)"** — Complete and close the active workflow
- **"/commit"** — Commit changes if not using workflow
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

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
> **BLOCKED until:** `- [ ]` Evidence file path (`file:line`) `- [ ]` Grep search performed `- [ ]` 3+ similar patterns found `- [ ]` Confidence level stated
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->

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

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act). NEVER speculate without proof.

<!-- /SYNC:evidence-based-reasoning:reminder -->

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
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing or stale, auto-run `/project-init` or the narrow lower-level route before ordinary project-specific work.

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

**IMPORTANT MUST ATTENTION Goal:** Hand the developer a complete, evidence-backed wrap-up — change summary, doc/spec staleness flags, root-cause lessons, and a `/understand` explanation — WITHOUT mutating any file, so they decide the next step from full context.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Nested Task Creation:** Expand child phases, link parent, one task in_progress.
- **Project Reference Docs Guide:** Read required project-reference docs (always lessons.md) before work.
- **Task Tracking External Report:** Bootstrap task tracking; persist findings to plans/reports/ incrementally.
- **Critical Thinking:** Critical + sequential thinking; traced proof, no guess-as-fact.
- **Evidence:** Cite file:line for every claim; never speculate.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**IMPORTANT MUST ATTENTION** stay READ-ONLY — only FLAG findings; NEVER edit, fix, implement, or update the docs/specs you flag — why: watzup is a review/handoff, not an edit pass; flagging-then-fixing silently breaks the read-only contract.
**IMPORTANT MUST ATTENTION** run ALL three required gates after the change summary — doc-staleness (path→doc table), spec-driven health check (only when business code changed), root-cause lesson extraction — NEVER skip a gate because the change "looks small" — why: stale docs and missed lessons compound silently across sessions.
**IMPORTANT MUST ATTENTION** invoke `/understand` as the FINAL mandatory handoff BEFORE the `AskUserQuestion` Next Steps prompt; if `/understand` is unavailable, STOP and report the blocker — NEVER silently skip the handoff — why: the developer's exit context is the explanation, not the raw diff.

**IMPORTANT MUST ATTENTION** extract lessons by ROOT CAUSE (the reasoning/assumption failure), NOT the symptom; write each as a universal rule that holds on ≥3 codebases; surface-level "always check file X" notes are noise — why: only root-cause prevention compounds across sessions.
**IMPORTANT MUST ATTENTION** send lessons to `/learn` ONLY after explicit user confirmation — NEVER auto-persist or self-edit instruction files — why: lesson capture is a durable instruction change the user must own.
**IMPORTANT MUST ATTENTION** use `AskUserQuestion` for the Next Steps decision — NEVER auto-decide the route even when it "seems obvious" — why: the user owns the workflow-end / commit / continue choice.
**IMPORTANT MUST ATTENTION** break work into small todo tasks with `TaskCreate` BEFORE starting (one task per file read), keep exactly one `in_progress`, and add a final review todo to verify work quality — why: long files exhaust context; granular tasks survive compaction.
**IMPORTANT MUST ATTENTION** cite `file:line` proof or traced evidence with a confidence % for every claim/finding (>80% to act, <80% verify first) — NEVER present a guess as fact — why: an unverified staleness/lesson flag misleads the developer's next decision.
**IMPORTANT MUST ATTENTION** grep/glob to verify any referenced doc, path, or API actually exists before flagging it — NEVER hallucinate a doc mapping or count — why: AI invents file paths and method names; the change summary must match the real diff.
**IMPORTANT MUST ATTENTION** read `CLAUDE.md` and the project-reference docs gate (`lessons.md` always) before the wrap-up — why: project conventions override generic staleness assumptions.

**Anti-Rationalization:**

| Evasion                                            | Rebuttal                                                                                     |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| "Doc looks fine, skip the staleness gate"          | Run the path→doc table anyway — staleness is silent; flag or output `No doc updates needed`. |
| "No real mistakes this session, skip lessons"      | Still run the gate — output `No AI mistakes identified` only after honest self-review.       |
| "It's obvious next they want a commit, just do it" | NEVER auto-decide — present the `AskUserQuestion` options; the user owns the route.          |
| "I can just fix this stale doc while I'm here"     | READ-ONLY — flag only. Fixing here breaks the contract; the user decides.                    |
| "Small change, skip `/understand`"                 | `/understand` is the mandatory handoff — run it or report the blocker; never skip.           |

**IMPORTANT MUST ATTENTION Goal echo:** evidence-backed READ-ONLY wrap-up — change summary + doc/spec staleness flags + root-cause lessons + mandatory `/understand` handoff, mutating NOTHING, so the user decides the next step.
