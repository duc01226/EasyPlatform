---
name: source-deep-dive
version: 1.0.0
description: '[Research] Use when a workflow step or the user asks for deep analysis of a prior source map: fetch, extract and cross-validate findings into a cited evidence base.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING MUST ATTENTION]** Execute declared steps in order; NEVER skip, reorder, or merge without explicit user approval.
> **[BLOCKING MUST ATTENTION]** Update task tracking before/after each step or sub-skill: `in_progress` at start, `completed` at end.
> **[BLOCKING MUST ATTENTION]** Completed steps need brief evidence; skipped steps need explicit reason; if Task tools are unavailable, maintain an equivalent synchronized step tracker.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Deep-dive the prior source map into a cross-validated, source-cited evidence base (`tmp/research/_evidence-{slug}.md`) where every finding has source trace and confidence, discrepancies stay explicit, and no unverified single-source claim becomes fact.

**Summary:**

- **Purpose/input:** Consume prior `tmp/research/_sources-{slug}.md`; prioritize Tier 1-2, high-relevance, gap-covering sources; NEVER start a fresh search.
- **Ordered path:** (1) load/prioritize source map → (2) fetch 5-8 sources with `WebFetch` (hard cap 8) → (3) extract claims, data, quotes, methodology, publication date, author credentials, source type → (4) cross-validate → (5) write evidence base.
- **Confidence gate:** 2+ independent sources agree = high confidence; disagreement = both positions + discrepancy; one source = `single source, unverified`; declare 95/80/60/<60% for every finding.
- **Handoff/routes:** Write `tmp/research/_evidence-{slug}.md` with inline citations, `## Unresolved Discrepancies`, and `## Gaps Remaining`; a direct run uses `ask user question tool` for the post-completion choice only (no routing question: a direct call is an explicit skill request).

**Workflow:**

1. **Read source map** — Load `tmp/research/_sources-{slug}.md`; prioritize Tier 1-2, high relevance, and gap coverage.
2. **Fetch top sources** — Run `WebFetch` for prioritized URLs; maximum 8 calls.
3. **Extract findings** — Capture claims, data points, quotes, methodology, publication date, author credentials, and source type.
4. **Cross-validate** — Compare findings; distinguish agreement, discrepancy, and unique-source claims; assign confidence.
5. **Build evidence base** — Write structured findings, citations, confidence, discrepancies, and gaps to the output path.

**Key Rules:**

- **MUST ATTENTION** Maximum 8 `WebFetch` calls per invocation; prioritize Tier 1-2 sources covering gaps.
- **MUST ATTENTION** Every finding cites a specific source and confidence percentage; factual claims need 2+ independent sources.
- **MUST ATTENTION** Conflicting claims → present both + flag discrepancy; one source → `single source, unverified`.
- **MUST ATTENTION** Output the intermediate evidence base, not final synthesis; preserve discrepancy and gap sections.

**Critical thinking:** Be skeptical; apply critical/sequential thinking; trace every claim and state confidence (>80% to act).

## Contents

- [Quick Summary](#quick-summary)
- [Deep Research](#deep-research)
- [Knowledge Work Rules](#knowledge-work-rules)
- [Step 1: Load Source Map](#step-1-load-source-map)
- [Step 2: Fetch Top Sources](#step-2-fetch-top-sources)
- [Step 3: Extract Findings](#step-3-extract-findings)
- [Step 4: Cross-Validate](#step-4-cross-validate)
- [Step 5: Build Evidence Base](#step-5-build-evidence-base)
- [Next Steps](#next-steps)
- [Prompt-Enhance Closing Anchors](#prompt-enhance-closing-anchors)
- [Closing Reminders](#closing-reminders)

# Deep Research

## Knowledge Work Rules

> **Web Research Protocol** — Factual claims require 2+ independent sources. Rank sources Tier 1 (authoritative `.gov`/`.edu`/official docs) > Tier 2 (industry reports) > Tier 3 (credible blogs, cross-validated); Tier 4 is unverified and NEVER cite it as fact. Declare 95/80/60/<60% confidence; working files → `tmp/research/`, final output → `docs/knowledge/`.
>
> **MUST ATTENTION READ** `.claude/skills/web-research/SKILL.md` for canonical research rules.

**Chained run:** `web-research --chain=deep-dive` executes Steps 1-5 below inline from this file (glue: `.claude/skills/web-research/references/research-chain.md`); that contract skips this file's Next Steps and keeps every gate inside Steps 1-5. A direct `/source-deep-dive` call runs exactly as written.

## Step 1: Load Source Map

Read `tmp/research/_sources-{slug}.md` (web-research output). If missing or invalid, report missing input; NEVER start a fresh search.

Prioritize: (1) Tier 1-2; (2) high relevance; (3) identified gap coverage.

## Step 2: Fetch Top Sources

For each prioritized source (5-8 when available; maximum 8 total):

1. Run `WebFetch` with its URL
2. Extract key claims, data points, quotes, and methodology
3. Record publication date, author credentials, and source type

## Step 3: Extract Findings

For each fetched source, extract:

- **Key claims** — factual statements with specific data
- **Data points** — numbers, percentages, dates
- **Quotes** — notable expert statements
- **Methodology** — how data was gathered (for market reports)

## Step 4: Cross-Validate

Compare findings across sources:

- **Agreement** — 2+ independent sources agree → high confidence
- **Discrepancy** — sources disagree → record both positions + flag discrepancy
- **Unique** — one source only → mark `single source, unverified`; do not present as fact

## Step 5: Build Evidence Base

Write findings incrementally to `tmp/research/_evidence-{slug}.md`:

```markdown
# Evidence Base: {Topic}

**Date:** {date}
**Sources analyzed:** {count}

## Findings

### Finding 1: {Title}

**Confidence:** {95%|80%|60%|<60%}
**Sources:** [1], [3]
**Content:** {finding with inline citations}
**Cross-validation:** {agreement/discrepancy notes}

## Unresolved Discrepancies

- {claim X from source A vs claim Y from source B}

## Gaps Remaining

- {what couldn't be verified}
```

---

## Next Steps

> **Inside a workflow:** when this skill runs as a step of an active workflow, skip the prompts in this section and return the result — the workflow's next step decides what runs (`/start-workflow` → Step Execution Protocol, Workflow-step mode).

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** After completion, use `ask user question tool` to offer:

- **"/market-analysis (Recommended)"** — Size the market (TAM/SAM/SOM), competitors, trends, SWOT, segments — the producer `/business-evaluation` consumes
- **"/business-evaluation"** — Evaluate business viability. **Run `/market-analysis` first** — this skill consumes its sized-market output as evidence and MUST NOT re-derive market sizing. Without it, every market figure must be marked N/A.
- **"/knowledge-synthesis"** — If synthesizing research report
- **"Skip, continue manually"** — user decides

> **External Memory:** For complex/lengthy research, analysis, scans, or reviews, write intermediate findings + final results to `tmp/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence plus confidence percentage (>80% to act, <80% verify first).

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval; inside a workflow run, `/start-workflow` → Workflow-step mode bounds this
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Deep-dive the prior source map into a cross-validated, source-cited evidence base (`tmp/research/_evidence-{slug}.md`) where every finding has source trace and confidence, discrepancies stay explicit, and no unverified single-source claim becomes fact.

**IMPORTANT MUST ATTENTION Main path:** Run all 5 steps in order: (1) load/prioritize source map → (2) fetch 5-8 prioritized sources, maximum 8 `WebFetch` calls → (3) extract claims, data, quotes, methodology, publication date, author credentials, source type → (4) cross-validate → (5) write the evidence base incrementally.
**IMPORTANT MUST ATTENTION Route gates:** A direct `/source-deep-dive` call is an explicit skill request and runs with no routing question; after completion, use `ask user question tool` to offer `/market-analysis`, `/business-evaluation` (after `/market-analysis`), `/knowledge-synthesis`, or manual continuation.
**IMPORTANT MUST ATTENTION Evidence gate:** Every finding cites a source number and confidence; 2+ independent sources support factual claims; disagreements show both positions; one source is `single source, unverified`.

**IMPORTANT MUST ATTENTION** Cross-validation drives confidence: 2+ independent sources agree → high (95/80%); disagreement → both positions + discrepancy; one source → `single source, unverified`; `<60%` → say `insufficient evidence, verified: … / not verified: …` — NEVER collapse conflicts.
**IMPORTANT MUST ATTENTION** Cap `WebFetch` at 8 calls; spend them on Tier 1-2 authoritative sources covering gaps; NEVER cite Tier 4 as fact.
**IMPORTANT MUST ATTENTION** This deep-dive consumes the prior `tmp/research/_sources-{slug}.md` map; NEVER start a fresh search.
**IMPORTANT MUST ATTENTION** Capture publication date, author credentials, source type, and methodology per source; verify facts, quotes, and numbers against fetched sources before recording — NEVER fabricate citations.
**IMPORTANT MUST ATTENTION** Deliverable MUST include `## Unresolved Discrepancies` and `## Gaps Remaining`; NEVER hide unverifiable content.
**IMPORTANT MUST ATTENTION** Break work into `TaskCreate` todos BEFORE starting; keep one `in_progress`; add a final review todo checking citation and confidence coverage.
**IMPORTANT MUST ATTENTION** Write findings incrementally to `tmp/research/_evidence-{slug}.md`; NEVER hold the full evidence base only in context.
**IMPORTANT MUST ATTENTION** Run as called and NEVER start a workflow from inside this skill; only the post-completion next-step question uses `ask user question tool`.

**Anti-Rationalization:**

| Evasion                                      | Rebuttal                                                                                  |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| "One good source is enough"                  | A lone source is "single source, unverified" — never high confidence. Cross-validate.      |
| "The sources roughly agree, call it settled" | Roughly ≠ exactly. Record the discrepancy with both positions; don't smooth it over.       |
| "I remember this stat from the page"         | Re-open the fetched source and verify the number/quote before citing. Memory hallucinates. |
| "I'll fetch a few more to be thorough"       | 8-call cap is the budget. Prioritize Tier 1-2 gap-coverage, not breadth.                    |
| "I'll write the evidence base at the end"    | Persist findings incrementally to `_evidence-{slug}.md` — a context cutoff loses batched work. |

**IMPORTANT MUST ATTENTION** Every finding cites a source + confidence (95/80/60/<60%); conflicts show both positions, lone source is `unverified`.
**IMPORTANT MUST ATTENTION** Cap `WebFetch` at 8 Tier 1-2 calls and persist the evidence base incrementally to `tmp/research/_evidence-{slug}.md`.
**IMPORTANT MUST ATTENTION** Surface `## Unresolved Discrepancies` and `## Gaps Remaining`; never hide unverifiable content.

**IMPORTANT MUST ATTENTION** Follow ordered path: load/prioritize → fetch ≤8 → extract metadata → cross-validate → write required evidence sections; honor the post-completion user choice.
**IMPORTANT MUST ATTENTION** Cite every finding and confidence-score it; preserve disagreements and gaps; NEVER fabricate or present a lone source as fact.
**IMPORTANT MUST ATTENTION** Use the prior source map, cap `WebFetch` at 8, and persist output incrementally.
