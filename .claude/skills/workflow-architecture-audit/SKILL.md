---
name: workflow-architecture-audit
version: 1.0.0
description: "[Workflow] Use when activating the Architecture Audit workflow to review the whole project's architecture, run an architecture health check, or check production readiness/scalability in one pass — read-only, produces one consolidated Architecture Health Report."
disable-model-invocation: false
---

## Quick Summary

**Goal:** [Workflow] Audit the WHOLE project's architecture, scalability, and production readiness in ONE read-only pass and synthesize a single consolidated Architecture Health Report — three sub-scores and one combined verdict. Findings only; every validated fix routes to a FOLLOW-UP `/plan` or feature workflow.

**Summary:**

- READ-ONLY audit — produces findings + ONE consolidated Architecture Health Report (3 sub-scores + 1 combined verdict); NEVER applies fixes: every validated fix routes to a FOLLOW-UP `/plan` or feature workflow.
- Core engine `architecture-review-full` runs INLINE (it owns the parallel fan-out + all-return barrier); this workflow declares NO workflow-level parallel groups.
- FINAL `/why-review` gate (step 3) = the machine-visible guarantee no audit finding ships unvalidated — every PRIOR step routes its output into it; `docs-update` runs AFTER the gate and self-validates its own doc diff.
- Main steps in order: **1** Scout scope → **2** Architecture-Review-Full (fan out 3 non-overlapping reviewers → progressive dedup synthesis → per-face `/why-review` fix → Finalize verdict) → **3** Why-Review FINAL gate → **4** Docs-Update → **5** Workflow-End → **6** Watzup.

**Workflow:**

1. **Scout** — locate the modules, boundaries, and hotspots that scope the audit (whole project / current diff / specific path). **→ On completion, hand its scope map forward to the final `/why-review` (step 3) so the audit scope itself is validated (nothing in-scope missed, nothing out-of-scope pulled in).**
2. **Architecture-Review-Full** — the core step: runs INLINE (it spawns sub-agents), fans out three non-overlapping reviewers behind an all-return barrier, then PROGRESSIVELY synthesizes each face into ONE report file (status `IN PROGRESS` → `VALIDATING` → `FINISHED`): dedup, a fix-report-per-review `/why-review` gate that walks each of the three faces, and a Finalize step that locks the combined verdict. **→ On completion, hand the FINISHED consolidated report forward to the final `/why-review` (step 3) for report-level validation.**
3. **Why-Review (FINAL VALIDATION GATE over the audit findings)** — MANDATORY. Validates the findings AND reviews the results of every PRIOR step it can reach: the scout scope map, the FINISHED consolidated report (verdict-rollup correctness, dedup completeness, cross-review severity consistency), and each of the three review faces' contributions. Every prior step routes its output here; no audit finding ships unvalidated. `docs-update` runs AFTER this gate and is NOT validated by it — it self-validates its own doc diff (see step 4).
4. **Docs-Update** — refresh any documentation the validated audit shows as stale. **→ Self-validates its own output: re-invoke `/why-review` on the doc diff when docs-update makes non-trivial edits, so the doc changes are reviewed before workflow-end.**
5. **Workflow-End** — clear workflow state.
6. **Watzup** — wrap up and summarize.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION treat this as READ-ONLY: produce findings + a verdict; NEVER apply fixes in this workflow — route them to a follow-up plan/feature workflow.
- MUST ATTENTION run `architecture-review-full` INLINE (it owns the parallel fan-out + all-return barrier); this workflow declares NO workflow-level parallel groups.
- MUST ATTENTION every PRIOR step routes its output to the FINAL `/why-review` gate (step 3): each producing step hands its findings + results forward, and the final `/why-review` validates the findings AND reviews the results of every prior step before docs-update — it is the final gate over the AUDIT FINDINGS. `docs-update` runs AFTER the gate and owns validation of its own output via an inline `/why-review` on non-trivial doc edits.
- NEVER skip mandatory workflow or skill gates.

**IMPORTANT MANDATORY Steps:** /scout -> /architecture-review-full -> /why-review -> /docs-update -> /workflow-end -> /watzup

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

## Audit Protocol (READ-ONLY, ONE PASS)

Audits the WHOLE project architecture + scalability + production readiness in one pass, synthesizing ONE consolidated Architecture Health Report.

Core step `architecture-review-full` runs INLINE in the main session (it SPAWNS sub-agents). It:

1. **Resolves scope** — whole project / current diff / specific path.
2. **Fans out three deliberately-non-overlapping reviewers** as PARALLEL read-only sub-agents in one message behind an all-return barrier:
    - `architecture-scalability-review` (architect, scorecard /20)
    - `architecture-review` (architect, 13-category PASS/WARN/BLOCKED)
    - `production-readiness-review` (code-reviewer, SRE /24 + 8-item gate)
3. **Progressive synthesis (`IN PROGRESS`)** — opens ONE consolidated report file at status `🚧 IN PROGRESS` when fan-out starts, merges + **dedups** each face into it AS that face returns (never held in memory to the end). Siblings route to each other by design, so one underlying issue surfaces from multiple angles; collapse duplicates to one root finding citing every source.
4. **Fix-report-per-review `/why-review` gate (`VALIDATING`)** — ONE merged `/why-review` pass that WALKS EACH of the three review faces + the dedup and fixes the report in place (revise severities, drop false positives, restore any distinct issue the dedup collapsed).
5. **Finalize (`FINISHED`)** — locks the combined verdict (worst-case rollup: any BLOCKED / NOT READY / HIGH RISK dominates) and flips the report status to `✅ FINISHED`.

Parallelism lives INSIDE `architecture-review-full` (it owns the fan-out + all-return barrier), so this workflow declares NO workflow-level parallel groups.

After `architecture-review-full` returns the FINISHED report, the workflow-level **`why-review`** step runs the FINAL VALIDATION GATE over the AUDIT FINDINGS — a distinct altitude from the engine's per-face fix, and the machine-visible guarantee no audit finding ships without a why-review pass. Every PRIOR step routes its output into this gate; the gate BOTH validates findings AND reviews results across the steps it reaches:

- **Scout scope map** → validate audit scope (nothing in-scope missed, nothing out-of-scope pulled in).
- **`architecture-review-full` FINISHED report** → validate verdict-rollup correctness, dedup completeness, cross-review severity consistency; confirm each of the three review faces' contributions survived the per-face fix intact.
- **`docs-update` output** → NOT validated by this gate (docs-update runs AFTER it); `docs-update` self-validates its own doc diff by re-invoking `/why-review` inline on non-trivial edits (see step 4) before workflow-end.

Each PRIOR step, on completion, hands its findings + results forward to this gate — the AI MUST call the final `/why-review` to validate/review every prior step's output; a prior step is not "done" until routed to the gate. `docs-update`, running after the gate, owns validation of its own output.

READ-ONLY audit: produces findings + a verdict only. Every validated finding routes to a FOLLOW-UP `/plan` or feature workflow owning the fix — no fixes applied in this workflow. After the final `why-review` gate confirms the report, `docs-update` refreshes impacted documentation, then `workflow-end` clears state and `watzup` wraps up.

**UNIVERSAL RULES:**

- Goal-Driven Execution: define success criteria before execution; loop until observable checks pass.
- Tests Verify Intent: when a finding touches specs/tests, name the protected business intent or invariant and ensure the test would fail if that intent breaks.

Activate the `workflow-architecture-audit` workflow. Run `/start-workflow workflow-architecture-audit` with the user's prompt as context and the audit protocol above.

**Steps:** /scout → /architecture-review-full → /why-review → /docs-update → /workflow-end → /watzup

---

**IMPORTANT MANDATORY Steps:** /scout -> /architecture-review-full -> /why-review -> /docs-update -> /workflow-end -> /watzup

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

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** READ-ONLY audit of the WHOLE project's architecture + scalability + production readiness in ONE pass → ONE consolidated Architecture Health Report (3 sub-scores + 1 combined verdict); findings only — every validated fix routes to a FOLLOW-UP `/plan` or feature workflow.

**IMPORTANT MUST ATTENTION Main steps in order:** **1** /scout (scope) → **2** /architecture-review-full (INLINE: fan out 3 non-overlapping reviewers → progressive dedup synthesis → per-face `/why-review` fix → Finalize combined verdict) → **3** /why-review (FINAL validation gate over the audit findings — every prior step routes its output here) → **4** /docs-update (self-validates its own doc diff) → **5** /workflow-end → **6** /watzup. NEVER skip a gate; NEVER apply fixes inline.

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
