---
name: prioritize
version: 2.0.0
description: '[Project Management] Use when you need to prioritize backlog items using RICE, MoSCoW, or Value-Effort frameworks.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Produce a defensible ranked ordering of 3+ backlog items using RICE, MoSCoW, or Value-Effort frameworks so the team works highest-value items first — every rank backed by a score and tech-agnostic rationale (value/effort/risk/impact).

**Summary:** PURPOSE — rank 3+ backlog items so the team works highest-value first; every rank = a score + tech-agnostic rationale. The main steps/tasks, in order:

- **Step 1-2 Collect & Select** — require 3+ items FIRST (fewer → discuss directly, NEVER force a framework); pick framework by decision tree — RICE = quantitative data exists, MoSCoW = stakeholder must/should/could alignment, Value-Effort 2x2 = quick call; default RICE when unsure.
- **Step 3 Score** — apply the EXACT framework formula (RICE = Reach×Impact×Confidence ÷ Effort, fixed Impact/Confidence scales, story-point Effort); NEVER invent ad-hoc scores.
- **Step 4-5 Rank & Output** — rank descending (RICE) / by band (MoSCoW) / by quadrant (V-E); emit prioritized table with scores + Do-first/Plan-next/Defer recommendations.
- **Step 6 Propagate (MANDATORY when PBI files exist)** — write rank (1-999, ascending) + priority label back into EACH PBI's frontmatter; `pbi-mockup`/`feature-presentation` read priority from there.
- **Cross-cutting — tech-agnostic (M1):** justify every rank by value/effort/risk/business impact, NEVER by named stack/framework/pattern. **Tie gate:** near-tie (top-2 RICE within 15%, same-band MoSCoW overlap, flagged stakeholder disagreement) → `AskUserQuestion` offering `/llm-council`; else end without prompting.

**Workflow:**

1. **Collect Items** — read from files or parse inline list (minimum 3 items)
2. **Select Framework** — RICE (quantitative), MoSCoW (stakeholder alignment), Value-Effort (quick decision)
3. **Score Each Item** — apply framework criteria and calculate scores
4. **Rank & Report** — output prioritized table with rationale and recommendations
5. **Propagate Priority** — IF PBI files exist → MANDATORY: write `rank` + `priority` label back into EACH PBI frontmatter
6. **Tie Gate** — near-tie → `AskUserQuestion` (`/llm-council` vs accept); else end without prompting

**Key Rules:**

- Minimum 3 items required; fewer than 3 should be discussed directly
- Default to RICE if unsure; ask user if ambiguous
- Optionally update PBI file priority fields after ranking
- **Tech-agnostic rationale (M1):** See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M7)" for BLOCKING criteria. Justify every ranking by value, effort, risk, and business impact — NOT by implementation technology. Rationale prose stays tech-agnostic per `docs/project-reference/spec-principles.md` §3: no framework/product/language/design-pattern names; effort may cite story points and relative complexity, never a named stack.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Backlog Prioritization

Order backlog items using data-driven frameworks → ranked list with scores and rationale.

## When to Use

- Sprint planning needs ordered backlog (3+ items to rank)
- Stakeholders need priority ranking with justification
- Feature roadmap ordering with objective criteria
- Comparing competing features or initiatives

## When NOT to Use

- Fewer than 3 items (discuss directly)
- Creating PBIs or writing stories -- use `product-owner` or `story`
- Full product strategy -- use `product-owner`
- Project status tracking -- use `project-manager`

## Prerequisites

- List of 3+ backlog items (PBIs, features, user stories)
- IF items exist as files: read from `team-artifacts/pbis/` or user-provided path
- IF items provided inline: use provided descriptions

## Workflow

1. **Collect items** to prioritize
    - IF file path provided -> read items from files
    - IF inline list -> parse items from user message
    - IF fewer than 3 items -> ask user for more or suggest direct discussion

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
    Effort:     Story points (1, 2, 3, 5, 8, 13, 21)
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

6. **IF PBI files exist** -> **MANDATORY priority propagation**: write the resulting priority back into EACH PBI's frontmatter — both the numeric `rank` (1-999, ascending) and the `priority` label (e.g. Must Have / Should Have / Could Have / Won't Have, or the framework's category). Never leave this optional when PBI files exist: a PBI without its priority is incomplete, and downstream consumers (`pbi-mockup` header badge, `feature-presentation` Scope & backlog slide) read priority FROM the PBI frontmatter. Update every ranked PBI, not just the standalone backlog file.

## Output Format

```markdown
## Prioritized Backlog

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

**Gate evaluation:** After producing prioritized backlog (per `## Workflow` step output), inspect ranking output:

- Top-2 RICE scores within 15% of each other → gate fires
- Explicit MoSCoW tie (≥2 items in same Must/Should/Could band with material scope overlap) → gate fires
- Multi-stakeholder disagreement flagged in input → gate fires
- None of the above → gate does NOT fire; skill ends without prompting

**MANDATORY ATTENTION** — when the gate fires, you MUST use `AskUserQuestion` to present these options (identical preamble pattern to architecture-design's `## Next Steps` MANDATORY ATTENTION block):

- **"Escalate to /llm-council (Recommended)"** — Tie/disagreement detected. Run 11 sub-agent council (5 advisors + 5 reviewers + chairman). Council's Contrarian + Outsider lenses are well-suited to multi-PBI ranking ties. Cheaper alternatives: `/why-review`, `/plan-validate` (use these instead if the tie is narrow but stakes are routine).
- **"Skip — accept current ranking"** — Acknowledge the tie; proceed with current ranking.

If gate does NOT fire, the prioritization decision stands; do NOT prompt.

## Related Skills

| Skill             | When to use instead                |
| ----------------- | ---------------------------------- |
| `product-owner`   | Full product management workflow   |
| `story`           | Breaking PBIs into user stories    |
| `refine`          | Refining ideas into PBIs           |
| `project-manager` | Sprint/project status and tracking |

---

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

- **IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
- **IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
- **IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
- **IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

- **IMPORTANT MUST ATTENTION Goal:** produce a defensible ranked ordering of 3+ backlog items via RICE/MoSCoW/Value-Effort so the team works highest-value items first — every rank backed by a score and tech-agnostic rationale (value/effort/risk/impact)

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** ALWAYS trace `file:line` proof for every claim, confidence >80% to act, NEVER present guess as fact.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

- **IMPORTANT MUST ATTENTION** require 3+ items BEFORE ranking; fewer than 3 → discuss directly, NEVER force a framework — why: ranking 1-2 items adds ceremony without signal
- **IMPORTANT MUST ATTENTION** select the framework by the decision tree — RICE for quantitative data, MoSCoW for stakeholder must/should/could alignment, Value-Effort 2x2 for a quick call; default RICE when unsure, ask the user when ambiguous — why: matching framework to the decision type is what makes the ranking defensible
- **IMPORTANT MUST ATTENTION** emit the prioritized table (scores + rationale) AND Do-first/Plan-next/Defer recommendations — NEVER stop at raw scores — why: the consumable output is the ranked table plus an action call, not a number column
- **IMPORTANT MUST ATTENTION** keep every rationale tech-agnostic per M1 — justify by value/effort/risk/business impact, NEVER by named stack/framework/product/language/design-pattern; effort may cite story points + relative complexity only — why: spec-principles §3 BLOCKING, a tech-named rationale leaks implementation into a priority call
- **IMPORTANT MUST ATTENTION** score with the EXACT framework formula (RICE = Reach×Impact×Confidence ÷ Effort, fixed Impact/Confidence scales, story-point Effort), then rank descending (RICE) / by band (MoSCoW) / by quadrant (V-E) — NEVER invent ad-hoc scores — why: a defensible rank needs a reproducible number
- **IMPORTANT MUST ATTENTION** on a near-tie (top-2 RICE within 15%, same-band MoSCoW overlap, flagged stakeholder disagreement) the gate FIRES — use `AskUserQuestion` to offer `/llm-council` escalation vs. accepting the ranking; if the gate does NOT fire, end WITHOUT prompting — why: tie-breaking is a judgment call the user owns, but a clear winner needs no interruption
- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting; mark one `in_progress`, `completed` immediately after evidence
- **IMPORTANT MUST ATTENTION** search codebase/artifacts for 3+ similar patterns before creating new structure; evaluate pattern FIT (same constraints/scope) before copying a nearby example — why: closest example ≠ matching preconditions
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act, <60% DO NOT recommend); NEVER present a guess as fact
- **IMPORTANT MUST ATTENTION** when PBI files exist, propagating the ranking into EACH PBI's frontmatter (numeric `rank` 1-999 + `priority` label) is MANDATORY, not optional — do it after ranking; grep downstream consumers before changing any priority field — why: downstream consumers (`pbi-mockup` header, `feature-presentation` Scope & backlog slide) read priority from PBI frontmatter, and stale/absent priority refs cascade silently
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**Anti-Rationalization:**

| Evasion                                                | Rebuttal                                                                                                                                           |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Only 2 items, just rank them"                         | Below the 3-item floor → discuss directly; a framework adds ceremony, not signal                                                                   |
| "I'll cite the framework in the rationale"             | Tech-agnostic per M1 — justify by value/effort/risk only, never by named stack                                                                     |
| "Scores are close enough, I'll pick"                   | Near-tie fires the gate → `AskUserQuestion` for `/llm-council`, never silently break                                                               |
| "RICE feels right, skip the formula"                   | Apply the EXACT formula with fixed scales — a defensible rank needs a number                                                                       |
| "The backlog file has the ranking, PBIs don't need it" | When PBI files exist, priority write-back to each PBI frontmatter is MANDATORY — mockup + presentation read priority from the PBI, not the backlog |
| "Already know the patterns"                            | Show `file:line` evidence — no proof = no search                                                                                                   |

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

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
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never the delivery/retry bookkeeping held in shared infrastructure that any co-running process can write. Such a check passes when run alone and flakes the moment anything else shares that infrastructure.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->
