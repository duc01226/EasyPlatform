---
name: web-research
version: 1.0.0
description: '[Research] Broad web search on a topic. Collect sources, validate credibility, build source map. Use when starting any research task.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

## Quick Summary

**Goal:** Execute broad web search on a topic, collect and classify sources, build a structured source map.

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

## Step 1: Define Search Scope

Parse the user's topic and generate 5-10 search queries that cover:

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

Filter out duplicates (same URL or same content from syndication).

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
> 1. **Activate `research` workflow** (Recommended) — web-research → deep-research → synthesis → review
> 2. **Execute `/web-research` directly** — run this skill standalone

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/deep-research (Recommended)"** — Deep-dive into top sources
- **"/business-evaluation"** — If evaluating business viability
- **"Skip, continue manually"** — user decides

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

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

<!-- /SYNC:ai-mistake-prevention -->
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality.

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.
