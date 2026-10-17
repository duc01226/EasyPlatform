---
name: strategy-builder
version: 1.0.0
description: '[Content] Use when a workflow step or the user asks for marketing strategy: positioning, channels, messaging, campaigns, budget and KPIs.'
---

## Quick Summary

**Goal:** Build comprehensive marketing strategy with positioning, channels, messaging, campaigns, budget, and KPIs.

**Summary:**

- **Main path:** load the market-analysis artifact → define positioning and differentiation → plan channels with budget and ROI → craft messaging → build the campaign roadmap with KPIs → assess risks and mitigations.
- **Evidence gate:** base positioning on competitive analysis, label market evidence, cite every factual claim inline `[N]` mapped to a Sources row, and make KPIs specific, measurable, and time-bound.

**Workflow:**

1. **Load market analysis** — Read market-analysis output
2. **Define positioning** — Value proposition, differentiation
3. **Plan channels** — Strategy with budget allocation + ROI
4. **Craft messaging** — Tagline, key messages, proof points
5. **Build campaign roadmap** — Phases with timeline and KPIs
6. **Risk assessment** — Marketing risks with mitigation

**Key Rules:**

- Positioning MUST ATTENTION reference competitive analysis
- Every channel: purpose, budget %, expected ROI, priority
- KPIs must be specific, measurable, time-bound
- Market evidence must be labelled as the exact market-analysis artifact or as unverified inline context; never silently treat the latter as reviewed research
- Every factual claim and number ends with an inline `[N]` citation mapped to a Sources row (Title, URL, Author/Org, Date, Tier); reuse the market-analysis Sources rows for market facts. Factual claims rest on 2+ independent sources; a single-source claim is marked unverified and held below 60% confidence. Planning choices you set (budget split, KPI targets) state their basis as labelled assumptions

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Contents

- [Quick Summary](#quick-summary)
- [Strategy Builder](#strategy-builder)
- [Step 1: Load Market Analysis](#step-1-load-market-analysis)
- [Step 2: Positioning](#step-2-positioning)
- [Step 3: Channel Strategy](#step-3-channel-strategy)
- [Step 4: Messaging Framework](#step-4-messaging-framework)
- [Step 5: Campaign Roadmap](#step-5-campaign-roadmap)
- [Step 6: Risk Assessment](#step-6-risk-assessment)
- [Output](#output)
- [Closing Reminders](#closing-reminders)

# Strategy Builder

## Step 1: Load Market Analysis

When invoked by `workflow-research` marketing mode, read the exact parent-provided
`MARKET_ANALYSIS_PATH`; never derive a second slug. If that workflow artifact is missing, mark market
facts N/A and cap market-evidence confidence at 60% — do not silently substitute inline context.
Standalone inline context is allowed only when labelled **Unverified inline market context**. In that
mode, do not claim it is the market-analysis artifact, do not introduce uncited market-size figures,
mark unsupported market facts N/A, and cap market-evidence confidence at 60%. Extract only what the
evidence provenance supports: competitor landscape, target segments, SWOT, and market size.

## Step 2: Positioning

Based on competitive analysis:

- **Value proposition** — What unique value do we offer?
- **Differentiation** — How are we different from competitor X, Y, Z?
- **Brand voice** — Tone, personality, communication style

## Step 3: Channel Strategy

For each channel:

| Channel   | Purpose                           | Budget % | Expected ROI | Priority |
| --------- | --------------------------------- | -------- | ------------ | -------- |
| {channel} | {awareness/acquisition/retention} | {%}      | {X:1}        | P0/P1/P2 |

Total budget % must equal 100%.

## Step 4: Messaging Framework

- **Tagline** — One memorable line
- **Key messages** (3-5 pillars) — Core themes
- **Proof points** — Evidence supporting each message
- **Elevator pitch** — 30-second version

## Step 5: Campaign Roadmap

| Phase  | Timeline | Objective   | Tactics | KPIs      | Budget |
| ------ | -------- | ----------- | ------- | --------- | ------ |
| Launch | M1-M3    | Awareness   | {list}  | {metrics} | {$}    |
| Growth | M4-M6    | Acquisition | {list}  | {metrics} | {$}    |
| Scale  | M7-M12   | Retention   | {list}  | {metrics} | {$}    |

## Step 6: Risk Assessment

| Risk   | Likelihood | Impact | Mitigation |
| ------ | ---------- | ------ | ---------- |
| {risk} | H/M/L      | H/M/L  | {strategy} |

## Output

Write to `docs/knowledge/strategy/marketing/{descriptive-slug}.md` using enforced template from `.claude/templates/marketing-strategy-template.md`. List every cited source in its Sources table with Title, URL, Author/Org, Date and Tier; every `[N]` resolves to a row and every row is cited.

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Build comprehensive marketing strategy with positioning, channels, messaging, campaigns, budget, and KPIs.

**IMPORTANT MUST ATTENTION Main steps:** load market analysis → define positioning → plan channels, budget, and ROI → craft messaging → build campaign roadmap and KPIs → assess risks and mitigations.

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting

**IMPORTANT MUST ATTENTION** cite every factual claim and number inline `[N]` mapped to a Sources row (Title, URL, Author/Org, Date, Tier); reuse the market-analysis Sources rows for market facts
**IMPORTANT MUST ATTENTION** back factual claims with 2+ independent sources; mark a single-source claim unverified and hold it below 60% confidence
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
