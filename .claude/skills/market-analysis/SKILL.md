---
name: market-analysis
version: 1.0.0
description: '[Research] Analyze market landscape: competitors, sizing (TAM/SAM/SOM), trends, SWOT, customer segments. Use for marketing or business evaluation.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

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

## Quick Summary

**Goal:** Analyze market landscape with competitive analysis, sizing, trends, SWOT, and customer segmentation.

**Workflow:**

1. **Define scope** — Industry, geography, segment, timeframe
2. **Research competitors** — WebSearch for players, positioning, strengths/weaknesses
3. **Size the market** — TAM/SAM/SOM from industry reports
4. **Identify trends** — Growth drivers, disruptions, regulatory changes
5. **SWOT analysis** — Synthesize Strengths/Weaknesses/Opportunities/Threats
6. **Segment customers** — Demographics, psychographics, jobs-to-be-done

**Key Rules:**

- Prefer Tier 1-2 sources for market sizing
- Every market size claim must cite source + methodology
- SWOT items linked to evidence, not speculation

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Market Analysis

## Step 1: Define Market Scope

Clarify with user:

- **Industry/vertical** — What market segment?
- **Geography** — Global, regional, or local?
- **Timeframe** — Current state? 3-year projection?
- **Focus** — B2B, B2C, or both?

## Step 2: Competitive Research

For each competitor (identify 5-10):

| Field                       | Source                       |
| --------------------------- | ---------------------------- |
| Company name                | WebSearch                    |
| Positioning/tagline         | Company website              |
| Key products                | Product pages                |
| Pricing model               | Pricing page or reports      |
| Strengths                   | Reviews, analyst reports     |
| Weaknesses                  | Reviews, customer complaints |
| Market share (if available) | Industry reports             |

## Step 3: Market Sizing

Use Tier 1-2 sources (Gartner, Statista, IBISWorld, government data):

- **TAM** (Total Addressable Market) — Maximum possible revenue if 100% market share
- **SAM** (Serviceable Addressable Market) — Portion accessible given constraints
- **SOM** (Serviceable Obtainable Market) — Realistic capture in 3 years

Every number must cite: source, year, methodology.

## Step 4: Trend Analysis

Research and categorize:

- **Growth drivers** — What's fueling market growth?
- **Disruptions** — Technology shifts, new entrants, business model innovations
- **Regulatory** — New laws, compliance requirements, policy changes
- **Consumer behavior** — Changing preferences, demographics shifts

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
- **Jobs-to-be-Done** — What are they trying to accomplish?

## Output

Market analysis is typically consumed by:

- `strategy-builder` skill (marketing strategy)
- `business-evaluation` skill (business viability)

Write findings to working file or inline with consuming skill's output.

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
      <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
      <!-- /SYNC:critical-thinking-mindset:reminder -->
      <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
      <!-- /SYNC:ai-mistake-prevention:reminder -->
