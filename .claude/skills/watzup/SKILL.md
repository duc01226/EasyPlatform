---
name: watzup
version: 1.1.0
description: '[Utilities] Review recent changes and wrap up the work'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> - **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> - **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> - **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> - **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> - **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> - **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> - **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> - **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> - **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> - **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->

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

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

## Quick Summary

**Goal:** Review current branch changes, summarize impact/quality, and check for documentation staleness.

**Workflow:**

1. **Review** — Analyze recent commits: what was modified, added, removed
2. **Summarize** — Provide detailed change summary with quality assessment
3. **Doc Check** — Cross-reference changed files against docs/ for staleness
4. **Lesson Learned** — Analyze AI mistakes/issues during the task and capture lessons

**Key Rules:**

- READ-ONLY: do not implement or fix anything, only flag
- Doc staleness check is REQUIRED (see mapping table below)
- Lesson-learned analysis is REQUIRED (see section below)
- Final review task MUST ATTENTION include doc-staleness check AND lesson-learned analysis

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

Review my current branch and the most recent commits.
Provide a detailed summary of all changes, including what was modified, added, or removed.
Analyze the overall impact and quality of the changes.

**IMPORTANT**: **Do not** start implementing.

---

## Doc Staleness Check (REQUIRED)

After the change summary, run `git diff --name-only` (against base branch or recent commits) and cross-reference changed files against relevant documentation:

| Changed file pattern    | Docs to check for staleness                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| `.claude/hooks/**`      | `.claude/docs/hooks/README.md`, hook count tables in `.claude/docs/hooks/*.md`                |
| `.claude/skills/**`     | `.claude/docs/skills/README.md`, skill count/catalog tables                                   |
| `.claude/workflows/**`  | `CLAUDE.md` workflow catalog table, `.claude/docs/` workflow references                       |
| `src/{services-dir}/**` | `docs/business-features/` doc for the affected service (path from `docs/project-config.json`) |
| `src/{frontend-dir}/**` | `docs/project-reference/frontend-patterns-reference.md`, relevant business-feature docs       |
| `CLAUDE.md`             | `.claude/docs/README.md` (navigation hub must stay in sync)                                   |

**Output one of:**

- A bulleted list of docs that may need updating, with a brief note on what is likely stale (e.g., "hook count changed from 31 to 32").
- `No doc updates needed` — if no changed file pattern maps to a doc.

**Do not edit docs during watzup.** Only flag. The user decides whether to fix.

---

## Spec-Driven Development Health Check (REQUIRED when business code changed)

Run this check when `git diff --name-only` includes ANY `src/Services/**` or frontend app/domain files.

### Step 1 — Engineering Spec Bundle Check

```bash
ls docs/specs/ 2>/dev/null
```

> **Note:** Results are **app-bucket** names (e.g., `bravoTALENTS`, `bravoGROWTH`, `bravoSURVEYS`), not service names. Exception: `accounts/` is flat. To find a specific service spec, probe `ls docs/specs/{app-bucket}/`.

| Result                     | Action                                                                                                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Directory missing or empty | ⚠️ Flag: `"No engineering spec bundle found. Consider running /workflow-spec-driven-dev (mode: init-full) to bootstrap spec-driven documentation for this codebase."` |
| Bundle exists              | Proceed to Step 2                                                                                                                                                     |

### Step 2 — Spec Staleness Check (only if bundle exists)

For each spec file in `docs/specs/`:

```bash
git log --since="30 days ago" --name-only -- docs/specs/ | head -10
```

| Result                                                               | Action                                                                                                                                                    |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No commits in last 30 days AND business code changed in this session | ⚠️ Flag: `"Engineering spec bundle may be stale (no updates in >30 days). Consider running /workflow-spec-driven-dev (mode: audit) to verify freshness."` |
| Recent commits found                                                 | ✅ Spec bundle is being maintained                                                                                                                        |

### Step 3 — Feature Docs Freshness Check

```bash
git log --since="30 days ago" --name-only -- docs/business-features/ | head -10
```

| Result                                               | Action                                                                                  |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| No commits in last 30 days AND business code changed | ⚠️ Flag: `"Business feature docs may be stale. Consider running /docs-update to sync."` |
| Recent commits found                                 | ✅ Feature docs are being maintained                                                    |

**Output only flags that apply. Skip this section entirely if no business code changed.**

---

## AI Mistake & Lesson Learned Analysis (REQUIRED)

After the doc staleness check, review the entire session for AI mistakes and lessons learned.

### Step 1 — Surface all mistakes

List every error made during this session. For each, note:

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

If the failure mode only applies in one specific file or case → go up one abstraction level until it generalizes. A good lesson applies to ≥3 different contexts.

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

**Be honest and self-critical.** Surface-level symptom fixes ("always check file X") that only apply to this codebase are NOT lessons — they are noise. The purpose is root-cause prevention that compounds across sessions.

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/workflow-end (Recommended)"** — Complete and close the active workflow
- **"/commit"** — Commit changes if not using workflow
- **"Skip, continue manually"** — user decides

## Closing Reminders

**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality.
**MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:

  <!-- SYNC:evidence-based-reasoning:reminder -->

- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act). NEVER speculate without proof.
  <!-- /SYNC:evidence-based-reasoning:reminder -->
- **IMPORTANT MUST ATTENTION** READ `CLAUDE.md` before starting
      <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
      <!-- /SYNC:critical-thinking-mindset:reminder -->
      <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
      <!-- /SYNC:ai-mistake-prevention:reminder -->

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

- **IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
- **IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
- **IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
- **IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->
