---
name: prioritize
version: 2.0.0
description: '[Project Management] Use when a workflow step or the user asks for planned-work prioritization using RICE, MoSCoW or Value-Effort ranking.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval. Inside a workflow run, `/start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Produce a defensible ranked ordering of 3+ planned work items using RICE, MoSCoW, or Value-Effort frameworks so the team works highest-value items first — every rank backed by a score and tech-agnostic rationale (value/effort/risk/impact).

**Summary:**

- **1. Track + detect/collect** — track each declared step (`in_progress` → `completed` + evidence); identify file/inline input and require ≥3 items; fewer → direct discussion, NEVER force a framework.
- **2. Select + score** — honor a specified framework; otherwise RICE for quantitative data, MoSCoW for stakeholder alignment, Value-Effort 2x2 for a quick call; default RICE when unsure; apply exact criteria, formula, and scales.
- **3. Rank + report** — rank by framework; emit a prioritized table with scores, tech-agnostic value/effort/risk/business-impact rationale, and Do-first/Plan-next/Defer recommendations.
- **4. Propagate + tie gate** — when task files exist, record the integer `priority` (1–999, lower first) + `priority_label` on EACH task, through `/task-track` when the task is tracked; near-tie/disagreement → `ask user question tool` for `/llm-council` vs accept, otherwise end without prompting.

**Workflow:**

1. **Collect Items** — read files or parse inline list; require ≥3 items
2. **Select Framework** — use RICE for quantitative data, MoSCoW for stakeholder alignment, or Value-Effort for a quick decision
3. **Score Each Item** — apply exact framework criteria and calculate scores
4. **Rank & Report** — emit prioritized table, rationale, and recommendations
5. **Propagate Priority** — if task files exist, MANDATORY record integer `priority` + `priority_label` on EACH task (tracked task: `priority` through `/task-track`)
6. **Tie Gate** — near-tie → `ask user question tool` (`/llm-council` vs accept); otherwise end without prompting

**Key Rules:**

- Require ≥3 items; fewer → discuss directly, NEVER force a framework.
- Honor a user-specified framework; otherwise default to RICE when unsure and ask when ambiguous.

> **AI-SDD Artifact Contract** — M1–M7 are blocking: M1/M2 keep rationale tech-agnostic and source identifiers in evidence carriers; M3 uses logical IDs with abstract anchors; M4–M5 require unambiguous, rebuildable behavior; M6 makes review violations explicit; M7 requires demoable business outcomes.
> MUST ATTENTION READ `.claude/skills/shared/sdd-artifact-contract.md` for full mandate and carrier rules.

- **Tech-agnostic rationale (M1):** justify every ranking by value, effort, risk, and business impact — NOT implementation technology. Rationale prose stays tech-agnostic per `spec-principles.md` §3 in the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path): no framework/product/language/design-pattern names; effort may cite effort points and relative complexity, never a named stack.
- **Task propagation:** when task files exist, record the rank as integer `priority` (1–999, lower comes first) and the label as `priority_label` on EACH task; this is mandatory, not optional.
- **Work record owner:** `priority` is a tracker-owned field ([Records another skill authors](../task-track/references/integration-guide.md#records-another-skill-authors)). On a task with a `tracking` block, set it through `/task-track --mode=maintain` (`update` with `priority`) and edit only `priority_label` in the file; on an untracked task, write both keys directly. Ranking never changes `status`, readiness or assignee.

Apply critical/sequential thinking; every claim needs traced proof and confidence >80% to act.

## Contents

- [Quick Summary](#quick-summary)
- [Planned Work Prioritization](#planned-work-prioritization)
- [When to Use](#when-to-use)
- [When NOT to Use](#when-not-to-use)
- [Phase 0: Detect & Prepare](#phase-0-detect--prepare)
- [Workflow](#workflow)
- [Output Format](#output-format)
- [Examples](#examples)
- [Optional Escalation: /llm-council on Ties](#optional-escalation-llm-council-on-ties)
- [Related Skills](#related-skills)
- [Prompt-Enhance Closing Anchors](#prompt-enhance-closing-anchors)
- [Closing Reminders](#closing-reminders)

# Planned Work Prioritization

Use a data-driven framework → ranked list with scores + rationale.

## When to Use

- Delivery planning needs ordered planned work (≥3 items)
- Stakeholder priority ranking needs justification
- Feature roadmap needs objective ordering
- Competing features or initiatives need comparison

## When NOT to Use

- Fewer than 3 items → discuss directly
- Creating tasks or stories → use `work-item --mode=refine` or `work-item --mode=story`
- Full product strategy → use `initiative` then `work-item --mode=refine`

## Phase 0: Detect & Prepare

- Input: ≥3 planned work items (tasks, features, user stories), from `tasks/` under the team-artifacts root (default `team-artifacts`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path), a user path, or inline descriptions.
- Record any specified framework and available quantitative, stakeholder-alignment, or quick-decision signal.
- Fewer than 3 items → ask for more or discuss directly; NEVER force a framework.

## Workflow

1. **Collect items**
    - If a file path is provided, read items from files.
    - If an inline list is provided, parse items from the user message.
    - If fewer than 3 items, ask for more or suggest direct discussion.

2. **Select framework** using decision tree:

    ```
    IF quantitative data available (reach, metrics)  -> RICE
    IF stakeholder alignment needed (must/should/could) -> MoSCoW
    IF quick decision needed (2 axes only)            -> Value-Effort 2x2
    IF user specifies framework                       -> use that framework
    IF unsure                                         -> ask user, default RICE
    ```

3. **Score each item** using selected framework:

    **RICE:**

    ```
    Score = (Reach x Impact x Confidence) / Effort

    Reach:      Users affected per quarter (number)
    Impact:     0.25 (minimal) | 0.5 (low) | 1 (medium) | 2 (high) | 3 (massive)
    Confidence: 0.5 (low) | 0.8 (medium) | 1.0 (high)
    Effort:     Effort points (1, 2, 3, 5, 8, 13, 21)
    ```

    **MoSCoW:**

    ```
    Must Have:   Critical for release, non-negotiable
    Should Have: Important but not vital, workarounds exist
    Could Have:  Desirable, include if capacity allows
    Won't Have:  Out of scope for this cycle
    ```

    **Value-Effort 2x2:**

    ```
    High Value + Low Effort  = Quick Wins    (do first)
    High Value + High Effort = Strategic     (plan carefully)
    Low Value  + Low Effort  = Fill-ins      (if time permits)
    Low Value  + High Effort = Time Sinks    (avoid)
    ```

4. **Rank items** by score (descending for RICE, category for MoSCoW, quadrant for V-E)

5. **Output** prioritized list with scores and rationale

6. **IF task files exist** -> **MANDATORY priority propagation**: record the resulting priority on EACH task — the rank as integer `priority` (1-999, lower comes first) and the label as `priority_label` (e.g. Must Have / Should Have / Could Have / Won't Have, or the framework's category). An untracked task takes both keys directly in its frontmatter; a task with a `tracking` block takes `priority` through `/task-track --mode=maintain` and only `priority_label` by file edit. When an existing task holds a label in `priority` and a number in `rank`, move the label to `priority_label` and the number to `priority`, and remove `rank`. Never leave this optional when task files exist: a task without its priority is incomplete, and downstream consumers (`work-item --mode=mockup` header badge, `feature-presentation` Scope & planned work slide) read priority FROM the task frontmatter. Update every ranked task, not just the standalone planned-work file.

## Output Format

```markdown
## Prioritized Planned Work

**Framework:** [RICE | MoSCoW | Value-Effort]
**Date:** [YYMMDD]
**Items scored:** [count]

### Rankings

| Rank | Item      | Score | Rationale                                           |
| ---- | --------- | ----- | --------------------------------------------------- |
| 1    | Feature A | 45.0  | High reach (5000), high impact (3), high confidence |
| 2    | Feature B | 12.0  | Medium reach (2000), medium impact, low effort      |
| 3    | Feature C | 2.5   | Low reach, minimal impact, high effort              |

### Recommendations

- **Do first:** [top items]
- **Plan next:** [medium items]
- **Defer:** [low items with reasoning]
```

## Examples

### Example 1: RICE scoring of 5 features

**Input:** "Prioritize: SSO login, dark mode, export to PDF, email notifications, bulk import"

**Output:**

| Rank | Feature             | Reach | Impact | Conf | Effort | RICE |
| ---- | ------------------- | ----- | ------ | ---- | ------ | ---- |
| 1    | Email notifications | 5000  | 2      | 0.8  | 1      | 8000 |
| 2    | SSO login           | 2000  | 3      | 0.8  | 3      | 1600 |
| 3    | Bulk import         | 500   | 2      | 1.0  | 1      | 1000 |
| 4    | Export to PDF       | 1000  | 1      | 0.8  | 2      | 400  |
| 5    | Dark mode           | 3000  | 0.5    | 0.5  | 2      | 375  |

### Example 2: MoSCoW categorization

**Input:** "Categorize for Q1 release: payment gateway, admin dashboard redesign, API rate limiting, user avatars, audit logs"

**Output:**

- **Must Have:** Payment gateway (revenue-critical), API rate limiting (security)
- **Should Have:** Audit logs (compliance, workaround exists with manual exports)
- **Could Have:** Admin dashboard redesign (improves efficiency but current works)
- **Won't Have:** User avatars (nice-to-have, defer to Q2)

## Optional Escalation: /llm-council on Ties

**Gate evaluation:** After producing prioritized planned work (per `## Workflow` step output), inspect ranking output:

- Top-2 RICE scores within 15% of each other → gate fires
- Explicit MoSCoW tie (≥2 items in same Must/Should/Could band with material scope overlap) → gate fires
- Multi-stakeholder disagreement flagged in input → gate fires
- None of the above → gate does NOT fire; skill ends without prompting

**MANDATORY ATTENTION** — when the gate fires, you MUST use `ask user question tool` to present these options (identical preamble pattern to `architecture --mode=design`'s `## Next Steps` MANDATORY ATTENTION block):

- **"Escalate to /llm-council (Recommended)"** — Tie/disagreement detected. Run 11 sub-agent council (5 advisors + 5 reviewers + chairman). Council's Contrarian + Outsider lenses are well-suited to multi-task ranking ties. Cheaper alternatives: `/why-review`, `/plan --mode=validate` (use these instead if the tie is narrow but stakes are routine).
- **"Skip — accept current ranking"** — Acknowledge the tie; proceed with current ranking.

If gate does NOT fire, the prioritization decision stands; do NOT prompt.

## Related Skills

| Skill             | When to use instead                |
| ----------------- | ---------------------------------- |
| `initiative`            | Capturing product intent upfront   |
| `work-item --mode=story`  | Breaking tasks into user stories    |
| `work-item --mode=refine` | Refining initiatives into tasks           |

---

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

- **IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval; inside a workflow run, `/start-workflow` → Workflow-step mode bounds this
- **IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
- **IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
- **IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Produce a defensible ranked ordering of 3+ planned work items using RICE, MoSCoW, or Value-Effort frameworks so the team works highest-value items first — every rank backed by a score and tech-agnostic rationale (value/effort/risk/impact).

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**


- **IMPORTANT MUST ATTENTION** require 3+ items BEFORE ranking; fewer than 3 → discuss directly, NEVER force a framework — why: ranking 1-2 items adds ceremony without signal
- **IMPORTANT MUST ATTENTION** select the framework by the decision tree — RICE for quantitative data, MoSCoW for stakeholder must/should/could alignment, Value-Effort 2x2 for a quick call; default RICE when unsure, ask the user when ambiguous — why: matching framework to the decision type is what makes the ranking defensible
- **IMPORTANT MUST ATTENTION** emit the prioritized table (scores + rationale) AND Do-first/Plan-next/Defer recommendations — NEVER stop at raw scores — why: the consumable output is the ranked table plus an action call, not a number column
- **IMPORTANT MUST ATTENTION** keep every rationale tech-agnostic per M1 — justify by value/effort/risk/business impact, NEVER by named stack/framework/product/language/design-pattern; effort may cite effort points + relative complexity only — why: spec-principles §3 BLOCKING, a tech-named rationale leaks implementation into a priority call
- **IMPORTANT MUST ATTENTION** score with the EXACT framework formula (RICE = Reach×Impact×Confidence ÷ Effort, fixed Impact/Confidence scales, Effort in effort points), then rank descending (RICE) / by band (MoSCoW) / by quadrant (V-E) — NEVER invent ad-hoc scores — why: a defensible rank needs a reproducible number
- **IMPORTANT MUST ATTENTION** on a near-tie (top-2 RICE within 15%, same-band MoSCoW overlap, flagged stakeholder disagreement) the gate FIRES — use `ask user question tool` to offer `/llm-council` escalation vs. accepting the ranking; if the gate does NOT fire, end WITHOUT prompting — why: tie-breaking is a judgment call the user owns, but a clear winner needs no interruption
- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting; mark one `in_progress`, `completed` immediately after evidence
- **IMPORTANT MUST ATTENTION** search codebase/artifacts for 3+ similar patterns before creating new structure; evaluate pattern FIT (same constraints/scope) before copying a nearby example — why: closest example ≠ matching preconditions
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act, <60% DO NOT recommend); NEVER present a guess as fact
- **IMPORTANT MUST ATTENTION** when task files exist, propagating the ranking onto EACH task (integer `priority` 1-999 + `priority_label`; on a tracked task `priority` goes through `/task-track`) is MANDATORY, not optional — do it after ranking; grep downstream consumers before changing any priority field — why: downstream consumers (`work-item --mode=mockup` header, `feature-presentation` Scope & planned work slide) read priority from task frontmatter, and stale/absent priority refs cascade silently
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**Anti-Rationalization:**

| Evasion                              | Rebuttal                                                                       |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| "Only 2 items, just rank them"       | Below the 3-item floor → discuss directly; a framework adds ceremony, not signal |
| "I'll cite the framework in the rationale" | Tech-agnostic per M1 — justify by value/effort/risk only, never by named stack |
| "Scores are close enough, I'll pick" | Near-tie fires the gate → `ask user question tool` for `/llm-council`, never silently break |
| "RICE feels right, skip the formula" | Apply the EXACT formula with fixed scales — a defensible rank needs a number   |
| "The planned-work file has the ranking, tasks don't need it" | When task files exist, priority write-back to each task frontmatter is MANDATORY — mockup + presentation read priority from the task, not the planned work |
| "Already know the patterns"          | Show `file:line` evidence — no proof = no search                              |
**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting. This prevents context loss from long files. Keep task depth proportional to the work.

