---
name: web-research
version: 1.0.0
description: '[Research] Use when starting a web research task — discover, gather, and triage candidate sources on a topic to feed deeper investigation.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Execute broad web search on a topic, collect and classify sources, and produce a tiered, deduplicated source map plus a gap list — the triaged candidate-source feedstock that `deep-research` dives into next — NOT a final research report.

**Summary:**

- Hard-cap fan-out at 10 `WebSearch` calls per invocation — generate 5-10 angle-varied queries (overview, current-state, comparison, data, expert, criticism) and stop searching at the cap; this is breadth-then-triage, not deep-dive.
- Classify every result into Tier 1-4 (.gov/.edu/official > industry reports > established blogs/Wikipedia > forums/social) and dedupe by URL/syndicated content before it counts as a source.
- The deliverable is the intermediate source map at `.claude/tmp/_sources-{slug}.md` (sources table + Gaps Identified), NOT a synthesized report — hand it off to `deep-research`.
- Mine the source set for gaps (missing perspectives, missing quantitative data, stale recency) so the next step knows what to dig deeper on.

**Workflow:**

1. **Define scope** — Parse topic, generate 5-10 search queries from varied angles
2. **Execute searches** — Run WebSearch for each query, collect results
3. **Source triage** — Classify each source by Tier (1-4), filter duplicates
4. **Build source map** — Write structured source list to working file
5. **Identify gaps** — Note underexplored angles for deep-research

**Key Rules:**

- Maximum 10 WebSearch calls per invocation
- Follow source hierarchy: Official docs (Tier 1) > Peer-reviewed (Tier 2) > Industry blogs (Tier 3) > Forums (Tier 4)
- Output intermediate source map, not final report

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Web Research

## Knowledge Work Rules (canonical)

> **Web Research Protocol** — Every factual claim needs 2+ independent sources. Source tiers: Tier 1 (authoritative .gov/.edu/official docs), Tier 2 (industry reports), Tier 3 (credible blogs — cross-validate), Tier 4 (unverified — NEVER cite as fact). Declare confidence for all findings.

1. Follow source hierarchy (official docs > peer-reviewed > industry blogs > forums) for all factual claims
2. Include source citations with Tier classification (inline `[N]`)
3. Cross-validate claims with 2+ independent sources
4. Declare confidence level (95/80/60/<60%) for all findings
5. Use enforced template structure — all sections required
6. Working files → `.claude/tmp/`, final output → `docs/knowledge/`

This protocol is the canonical home for the knowledge-work rules that apply to knowledge/research workspaces; `deep-research` and `knowledge-synthesis` reference it.

## Step 1: Define Search Scope

Parse user's topic, generate 5-10 search queries covering:

- **Definition/overview** — "what is {topic}"
- **Current state** — "{topic} 2026" or "{topic} latest"
- **Comparison** — "{topic} vs alternatives"
- **Data/statistics** — "{topic} market size" or "{topic} statistics"
- **Expert opinion** — "{topic} expert analysis" or "{topic} review"
- **Criticism/risks** — "{topic} challenges" or "{topic} risks"

## Step 2: Execute Searches

For each query:

1. Run `WebSearch` with the query
2. Record: title, URL, snippet, apparent source type
3. Stop at 10 WebSearch calls maximum

## Step 3: Source Triage

For each result, classify by Tier:

- **Tier 1:** .gov, .edu, official docs, peer-reviewed
- **Tier 2:** Industry reports, major publications
- **Tier 3:** Established blogs, verified experts, Wikipedia
- **Tier 4:** Forums, personal blogs, social media

Filter out duplicates (same URL or syndicated content).

## Step 4: Build Source Map

Write to `.claude/tmp/_sources-{slug}.md`:

```markdown
# Source Map: {Topic}

**Date:** {date}
**Queries executed:** {count}
**Sources found:** {count} (Tier 1: N, Tier 2: N, Tier 3: N, Tier 4: N)

## Sources

| #   | Title | URL | Tier | Relevance | Notes         |
| --- | ----- | --- | ---- | --------- | ------------- |
| 1   | ...   | ... | 1    | High      | Official docs |

## Gaps Identified

- {angle not covered}
- {topic needing deeper research}
```

## Step 5: Identify Gaps

Review source map for:

- Missing perspectives (only positive sources? need criticism)
- Missing data types (no quantitative data? need statistics)
- Recency issues (all sources old? need current data)

Note gaps for the `deep-research` step.

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use `AskUserQuestion` to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `workflow-research` workflow** (Recommended) — web-research → deep-research → synthesis → review
> 2. **Execute `/web-research` directly** — run this skill standalone

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/deep-research (Recommended)"** — Deep-dive into top sources
- **"/business-evaluation"** — If evaluating business viability
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

<!-- SYNC:web-research -->

> **Web Research** — Structured web search for evidence gathering.
>
> 1. Form 3-5 specific search queries (not generic questions)
> 2. Use WebSearch for each query, collect top 3-5 sources
> 3. Validate source credibility (official docs > blogs > forums)
> 4. Cross-validate claims across 2+ sources before citing
> 5. Write findings to research report with source URLs
>
> **NEVER cite a single source as authoritative. Always cross-validate.**

<!-- /SYNC:web-research -->

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

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Produce a tiered, deduplicated source map plus a gap list — the triaged candidate-source feedstock that `deep-research` dives into next — NOT a final research report.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Web Research:** Cross-validate every claim across 2+ credible sources; NEVER cite one source as authoritative.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** Traced proof per claim, confidence >80% to act; NEVER present guess as fact.

**IMPORTANT MUST ATTENTION** cap WebSearch at 10 calls per invocation; generate 5-10 angle-varied queries (overview, current-state, comparison, data, expert, criticism) then stop at the cap — why: bounded fan-out keeps this breadth-then-triage, not a deep-dive into one angle.
**IMPORTANT MUST ATTENTION** rank every source by tier (Tier 1 .gov/.edu/official > Tier 2 industry reports > Tier 3 established blogs/Wikipedia > Tier 4 forums/social) and dedupe by URL/syndicated content before it counts — why: tier ranking + dedupe keep the feedstock high-signal for deep-research.
**MANDATORY IMPORTANT MUST ATTENTION** NEVER cite a Tier 4 / single source as authoritative — cross-validate every factual claim against 2+ independent sources and declare confidence (95/80/60/<60%) — why: one unverified source = a hallucination-amplifier downstream.
**MANDATORY IMPORTANT MUST ATTENTION** the deliverable is the intermediate source map at `.claude/tmp/_sources-{slug}.md` (sources table + Gaps Identified), NOT a synthesized report — hand it off to `deep-research`; mine the set for gaps (missing perspectives, missing quantitative data, stale recency) so the next step knows where to dig.
**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting; add a final review todo task to verify work quality; transition one task at a time.
**IMPORTANT MUST ATTENTION** persist intermediate findings/results to a report file in `plans/reports/` for complex or lengthy work — why: external memory prevents context loss and is itself the deliverable.
**MANDATORY IMPORTANT MUST ATTENTION** if NOT already in a workflow, validate the route with the user via `AskUserQuestion` — NEVER auto-decide "simple enough to skip"; the user decides workflow vs. standalone `/web-research`.
**IMPORTANT MUST ATTENTION** every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% verify first) — NEVER speculate without proof.

**Anti-Rationalization:**

| Evasion                                | Rebuttal                                                                             |
| -------------------------------------- | ------------------------------------------------------------------------------------ |
| "One strong source is enough"          | NEVER — cross-validate against 2+ independent sources; Tier 4 is never authoritative |
| "I'll just write the report now"       | Out of scope — output the source map + gaps; `deep-research` synthesizes, not this   |
| "Keep searching, more results help"    | Hard-cap is 10 WebSearch calls — breadth then triage, never an unbounded crawl       |
| "Topic is simple, skip tiering/dedupe" | Tier + dedupe every source — untiered feedstock degrades every downstream step       |
| "Just do it, skip task tracking"       | Skip depth, never skip tracking — `TaskCreate` first, one task in progress           |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

**IMPORTANT MUST ATTENTION Goal:** triaged, tiered, deduplicated source map + gap list as feedstock for `deep-research` — NOT a final report.
**IMPORTANT MUST ATTENTION** cap WebSearch at 10; cross-validate every claim with 2+ sources; NEVER cite Tier 4 as fact.
**IMPORTANT MUST ATTENTION** `TaskCreate` to break ALL work into small tasks BEFORE starting — this is very important.
