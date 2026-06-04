---
name: workflow-research
version: 1.0.0
description: '[Workflow] Use when activating the Research & Synthesis workflow — research a topic via web sources, then synthesize per --output={synthesis|business-eval|marketing|course} (knowledge report, business evaluation, marketing strategy, or course material).'
disable-model-invocation: false
---

## Quick Summary

**Goal:** [Workflow] Trigger Research & Synthesis workflow — gather web sources, then synthesize into the target artifact selected by `--output` (knowledge report, business evaluation, marketing strategy, or course material).

**Workflow:**

1. **Detect** — classify request scope and target artifacts.
2. **Execute** — apply required steps with evidence-backed actions.
3. **Verify** — confirm constraints, output quality, and completion evidence.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- NEVER skip mandatory workflow or skill gates.

**IMPORTANT MANDATORY Steps:** /web-research -> /deep-research -> /knowledge-synthesis -> /knowledge-review -> /workflow-end

> These steps are the default `--output=synthesis` sequence (identical to the catalog `workflow-research` workflow sequence). For `--output={business-eval|marketing|course}` the terminal synthesis skill(s) swap per the **Output Dispatch** table below — the research scaffold and `/knowledge-review -> /workflow-end` closure are invariant.

---

## Output Dispatch (--output)

All modes share the research scaffold `/web-research → /deep-research → … → /knowledge-review → /workflow-end`; only the terminal synthesis skill(s) swap per `--output`:

| `--output`              | Terminal synthesis skill(s)                 | Full sequence                                                                                                  |
| ----------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **synthesis** (default) | `/knowledge-synthesis`                      | `/web-research → /deep-research → /knowledge-synthesis → /knowledge-review → /workflow-end`                    |
| **business-eval**       | `/market-analysis` + `/business-evaluation` | `/web-research → /deep-research → /market-analysis → /business-evaluation → /knowledge-review → /workflow-end` |
| **marketing**           | `/market-analysis` + `/strategy-builder`    | `/web-research → /deep-research → /market-analysis → /strategy-builder → /knowledge-review → /workflow-end`    |
| **course**              | `/course-builder`                           | `/web-research → /deep-research → /course-builder → /knowledge-review → /workflow-end`                         |

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

This skill IS the canonical Research & Synthesis entry point — invoke it directly with `--output=<mode>` (default `synthesis`) and execute the selected sequence from the dispatch table above: invoke each step skill in order via the `Skill` tool with the user's prompt as context. The workflow catalog also exposes a `workflow-research` id purely so the auto-router can detect research/business-eval/marketing/course intents; `/start-workflow workflow-research` is equally valid and injects the same OUTPUT DISPATCH table — either path executes the sequence for the selected `--output`.

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

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

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Protocols in force (concise digest of the SYNC/shared blocks this skill carries) — NEVER treat a digest line as the full rule; it signposts the canonical SYNC body above:**

- **Nested Task Creation:** Expand child phases under the parent workflow row; link when nested.
- **Critical Thinking:** Apply critical + sequential thinking; cite proof, confidence >80% to act.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Incremental Persistence:** Persist findings to `plans/reports/` per file; survive context cutoff.
- **Subagent Return Contract:** Sub-agents return summary plus report pointer only, never inline transcript.

**IMPORTANT MUST ATTENTION** apply Phase 1 compression before structural enhancement; preserve semantic meaning.
**IMPORTANT MUST ATTENTION** NEVER alter YAML frontmatter, code blocks, tables, or SYNC-tag bodies during optimization.
**IMPORTANT MUST ATTENTION** keep evidence gates and mandatory workflow/skill steps explicit and enforceable.
**IMPORTANT MUST ATTENTION** add a final review task to verify output quality and unresolved risks.
