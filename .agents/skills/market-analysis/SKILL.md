---
name: market-analysis
description: '[Research] Use when a workflow step or the user asks for market analysis: competitors, TAM/SAM/SOM, trends, SWOT and customer segments.'
---

> Codex compatibility note:
> - Invoke `$skill-name`: load the registered `.agents/skills/<name>/SKILL.md` and execute it with Codex tools; no separate `Skill` tool or Claude mode switch is needed. Author `.claude/**`; mirrors are generated.
> - Track steps before execution and keep progress/evidence current. Explicit skill requests execute their protocol. Use the native question tool for required questions.
> - Map foreign tool names to available host capabilities. A name mismatch needs no approval; an actually unavailable required capability stops with its step/evidence and a user question before adaptation.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Preserve protocol order unless the user approves a deviation. Workflows use `$start-workflow`: gates stay fixed; other steps may flex with logged reasons and evidence.
## Quick Summary

**Goal:** Analyze a market landscape and deliver an evidence-backed market-analysis artifact—competitors, TAM/SAM/SOM, trends, SWOT, and customer segments—that downstream skills can consume as evidence.

**Summary:**

- **Purpose:** Produce evidence-backed market landscape analysis for `business-evaluation` and `strategy-builder`, not unsupported opinion.
- **Evidence base first:** When the run has a research evidence base from `web-research --chain=deep-dive` (`_evidence-{slug}.md` + `_sources-{slug}.md`), read it before any search and cite it; search only its named gaps, at most 5 searches. Every market figure (TAM/SAM/SOM, growth, share) rests on 2+ independent sources.
- **Ordered path:** Classify and clarify scope; then (1) research 5-10 competitors, (2) size TAM/SAM/SOM, (3) analyze growth, disruption, regulation, and behavior trends, (4) evidence-link SWOT, and (5) segment customers by demographics, psychographics, behavior, and jobs-to-be-done.
- **Evidence gate:** Prefer Tier 1-2 sizing sources; every factual claim, number, table row, and inference ends `[N]` mapped to Sources or `N/A — {reason}`; every size claim cites source/year/methodology; never invent source metadata; SWOT requires evidence.
- **Handoff:** Use the enforced template; `workflow-research` `business-eval`/`marketing` uses parent `ARTIFACT_SLUG` + `MARKET_ANALYSIS_PATH` exactly; otherwise use the fallback path; return the exact written path and copy the plan-dir path when required.

**Workflow:**

1. **Define scope** — Industry, geography, segment, timeframe
2. **Research competitors** — Players, positioning, strengths/weaknesses from the evidence base; WebSearch only its named gaps
3. **Size market** — TAM/SAM/SOM from industry reports
4. **Identify trends** — Growth drivers, disruptions, regulatory changes
5. **SWOT analysis** — Synthesize Strengths/Weaknesses/Opportunities/Threats
6. **Segment customers** — Demographics, psychographics, jobs-to-be-done

**Key Rules:**

- Prefer Tier 1-2 sources for market sizing
- Read the research evidence base first when one exists and cite it; never re-derive what it establishes. Search only its named gaps: at most 5 `WebSearch` calls and 5 `WebFetch` calls. With no evidence base, stay within the `web-research` budget (at most 10 searches, then at most 8 fetches)
- Every market figure (TAM/SAM/SOM, growth rate, market share) rests on 2+ independent sources; mark a single-source figure `single source, unverified` and hold it below 60% confidence
- Every factual claim, number, table row, and inference must end with an inline `[N]` citation that maps to one Sources row; use `N/A — {reason}` when evidence is unavailable
- Cite source + methodology for every market-size claim
- Sources table must provide Title, URL, Author/Publisher, Date, and Tier for every source; never invent missing metadata
- Link SWOT items to evidence; no speculation
- **Risk profile:** analysis. Fresh-eyes review, specialist routing, inline sub-agent protocols, and recursive quality loops: N/A — this skill does not delegate or own fix convergence.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Contents

- [Quick Summary](#quick-summary)
- [Market Analysis](#market-analysis)
- [Precondition: Classify Inputs](#precondition-classify-inputs)
- [Step 1: Define Market Scope](#step-1-define-market-scope)
- [Step 2: Competitive Research](#step-2-competitive-research)
- [Step 3: Market Sizing](#step-3-market-sizing)
- [Step 4: Trend Analysis](#step-4-trend-analysis)
- [Step 5: SWOT Analysis](#step-5-swot-analysis)
- [Step 6: Customer Segmentation](#step-6-customer-segmentation)
- [Output](#output)
- [Closing Reminders](#closing-reminders)

# Market Analysis

## Precondition: Classify Inputs

Before research, classify scope and available evidence as present, missing, or ambiguous; clarify missing or ambiguous industry, geography, timeframe, and focus with user.

**Load the research evidence base first.** When `web-research --chain=deep-dive` (or `web-research` followed by `source-deep-dive`) ran for this topic, read its evidence base `tmp/research/_evidence-{slug}.md` and source map `tmp/research/_sources-{slug}.md` before any search. Use the exact paths that research step returned, or a path the user supplies; never guess a slug. Build Steps 2-6 from it and carry its sources into the Sources table with their Title, URL, Author/Publisher, Date and Tier; do not re-search what it already establishes. List what Steps 2-6 still need that it lacks (its `## Gaps Remaining`, a missing competitor, a sizing report) and search only those named gaps: at most 5 `WebSearch` calls and 5 `WebFetch` calls. With no evidence base, research under the `web-research` budget: at most 10 searches, then at most 8 fetches.

**Cross-validate every market figure.** Each TAM/SAM/SOM value, growth rate and market share rests on 2+ independent sources, the same rule the research step applies; sources that copy one original study count once. A single-source figure is marked `single source, unverified` and held below 60% confidence; conflicting figures are shown side by side with the one you weight and why.

**Analysis lens:** For each step, run one focused `Think:` pass: what evidence supports, limits, or falsifies each finding?

## Step 1: Define Market Scope

Confirm scope with user:

- **Industry/vertical** — Market segment?
- **Geography** — Global, regional, or local?
- **Timeframe** — Current state or 3-year projection?
- **Focus** — B2B, B2C, or both?

## Step 2: Competitive Research

For each competitor (identify 5-10):

| Field                       | Source                       |
| --------------------------- | ---------------------------- |
| Company name                | Evidence base, then WebSearch for gaps |
| Positioning/tagline         | Company website              |
| Key products                | Product pages                |
| Pricing model               | Pricing page or reports      |
| Strengths                   | Reviews, analyst reports     |
| Weaknesses                  | Reviews, customer complaints |
| Market share (if available) | Industry reports             |

## Step 3: Market Sizing

Use Tier 1-2 sources (Gartner, Statista, IBISWorld, government data):

- **TAM** (Total Addressable Market) — Maximum possible revenue at 100% market share
- **SAM** (Serviceable Addressable Market) — Accessible portion given constraints
- **SOM** (Serviceable Obtainable Market) — Realistic 3-year capture

Every number must cite source, year, methodology.

Cross-validate each figure against a second independent source (see the precondition); a figure with one source stays `single source, unverified`, below 60% confidence.

## Step 4: Trend Analysis

Research and categorize:

- **Growth drivers** — Forces fueling market growth
- **Disruptions** — Technology shifts, new entrants, business-model innovations
- **Regulatory** — New laws, compliance requirements, policy changes
- **Consumer behavior** — Preference changes, demographic shifts

## Step 5: SWOT Analysis

Each item must link to evidence:

| Category        | Item   | Evidence   |
| --------------- | ------ | ---------- |
| **Strength**    | {item} | Source [N] |
| **Weakness**    | {item} | Source [N] |
| **Opportunity** | {item} | Source [N] |
| **Threat**      | {item} | Source [N] |

## Step 6: Customer Segmentation

For each segment:

- **Demographics** — Age, role, income, company size
- **Psychographics** — Values, pain points, aspirations
- **Behavior** — Buying patterns, media consumption
- **Jobs-to-be-Done** — Desired accomplishment

## Output

**MANDATORY IMPORTANT MUST ATTENTION** Write the result via enforced `.claude/templates/market-analysis-template.md` to parent-provided `MARKET_ANALYSIS_PATH` when present; otherwise use `docs/knowledge/strategy/market-analysis/{descriptive-slug}.md` — why: downstream skills consume this as EVIDENCE; an informal or inline handoff without deterministic location and known shape fails silently, leaving consumers nothing to cite.

When invoked by `workflow-research` in `business-eval` or `marketing` mode, use parent-provided
`ARTIFACT_SLUG` and `MARKET_ANALYSIS_PATH` exactly; do not derive a new slug. Return the exact written
path in the completion handoff so the next skill can verify it before reading.

Consumed by:

- `business-evaluation` skill (business viability) — reads Sizing, Competitors, Trends, SWOT, Segments
- `strategy-builder` skill (marketing strategy)

When invoked inside a workflow that also writes to a plan directory, copy the file to `{plan-dir}/research/market-analysis.md` so the plan artifact set stays self-contained.

---

> **[IMPORTANT]** Use todo tracking to break ALL work into small tasks BEFORE starting.

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Analyze a market landscape and deliver an evidence-backed market-analysis artifact—competitors, TAM/SAM/SOM, trends, SWOT, and customer segments—that downstream skills can consume as evidence.

**IMPORTANT MUST ATTENTION Main path:** Classify and clarify scope/evidence; then run in order: (1) research 5-10 competitors, (2) size TAM/SAM/SOM, (3) analyze growth, disruption, regulation, and behavior trends, (4) evidence-link SWOT, and (5) segment customers by demographics, psychographics, behavior, and jobs-to-be-done. Write via the enforced template and complete the exact handoff path. NEVER skip, reorder, or merge steps.
**IMPORTANT MUST ATTENTION Modes/gates:** In `workflow-research` `business-eval`/`marketing`, use parent `ARTIFACT_SLUG` + `MARKET_ANALYSIS_PATH` exactly; otherwise use the fallback path; return the exact written path; copy the plan-dir artifact when required. Prefer Tier 1-2 sizing sources; every factual claim, number, table row, and inference ends `[N]` mapped to Sources or `N/A — {reason}`; cite size source/year/methodology; never invent metadata; link every SWOT item to evidence.
**IMPORTANT MUST ATTENTION Evidence base:** read this run's `_evidence-{slug}.md` + `_sources-{slug}.md` first when they exist and cite them; search only named gaps (at most 5 searches, 5 fetches; no evidence base → at most 10 searches, 8 fetches); every TAM/SAM/SOM, growth and share figure needs 2+ independent sources, else `single source, unverified` below 60%.
**IMPORTANT MUST ATTENTION** Apply critical/sequential thinking; run one focused `Think:` pass per step; cite source evidence and confidence; preserve uncertainty; never present unsupported findings as fact.
**IMPORTANT MUST ATTENTION** Create todo tracking todos before starting; keep one `in_progress`, mark each completed with evidence, and add a final review todo. If task tools are unavailable, maintain equivalent synchronized statuses.

**Anti-Rationalization:**

| Evasion | Rebuttal |
| --- | --- |
| "Market size is obvious; source later." | Cite source, year, and methodology now; use `N/A — {reason}` when unavailable. |
| "One competitor or source is enough." | Research 5-10 competitors; prefer Tier 1-2 sources and preserve metadata. |
| "A fresh search is faster than reading the evidence base." | Read the evidence base first and cite it; search only its named gaps, within the cap. |
| "One report gives the market size." | Cross-validate with a second independent source, or mark the figure `single source, unverified` below 60%. |
| "SWOT is just judgment." | Link every item to evidence; label unavailable support `N/A — {reason}`. |
| "Output path is optional." | Use the enforced template/path contract, return the exact written path, and copy the plan-dir artifact when required. |

**IMPORTANT MUST ATTENTION** verify all claims, numbers, source metadata, and handoff paths before completion; NEVER guess, skip evidence, or weaken the output contract.
