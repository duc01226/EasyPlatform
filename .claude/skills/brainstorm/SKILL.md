---
name: brainstorm
version: 2.0.0
description: '[Content] Use when a workflow step or the user asks for product/feature ideation with ranked opportunities and validation tests. --mode={roadmap|scope}.'
disable-model-invocation: false
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval. Inside a workflow run, `/start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Facilitate evidence-backed PO/BA Double-Diamond ideation that separates problem discovery from solution evaluation and delivers either a validated, ranked 3–5-candidate shortlist with problem/value hypotheses, each riskiest assumption, and cheapest validation test plus one recommendation—or, in **Multi-Opportunity Discovery mode**, a ranked 3–8-item RICE map for user selection—so the team commits to the right problem and solution, never a flat idea list.

**Summary:**

- **Ordered core:** P0 Setup (scenario/role/known + context) → P1 Problem Framing/diverge (POV, 5 Whys/Fishbone, JTBD, HMW) → P2 Opportunity Framing/converge (OST, Lean Canvas, ERRC, Value Proposition) → P3 Ideation/diverge (SCAMPER, Crazy 8s, Brainwriting, Impact Mapping, Analogy; 25–40 ideas) → P4 Evaluation/converge (Dot Vote, RICE, Kano, 2×2, MoSCoW; shortlist 3–5) → P5 Validation (problem/value cards, RAT, cheapest test, Build-Measure-Learn) → P6 Decision (one recommendation) → P7 Documentation/Handoff.
- **Purpose and gates:** Run `ask user question tool` in P0 first; separate diverge from converge; test every top-3 candidate before build; Multi-Opportunity Discovery ranks 3–8 opportunities and uses multi-select.
- **Routing:** Resolve `--mode=roadmap|scope` before P0. Roadmap hands outcome/milestone framing to `/product-roadmap`; scope amends one approved `plans/{plan-id}/scope-brief.md` and stops before scenario/plan work (plans root default `plans/`; `docsRoots.plans.path` in `docs/project-config.json` overrides it).
- **Handoff boundary:** Apply `isLargeIdea`; when true, carry one complete `large_idea_decomposition` block in the owning handoff. Default mode offers user-selected handoff (`/initiative`, `/work-item --mode=refine`, `/plan`, etc.); Multi-Opportunity Discovery hands selected items to the per-opportunity task loop.

**Workflow:**

1. **Session Setup** — `ask user question tool` detects scenario, role, known context; load domain or market context.
2. **Problem Framing/diverge** — POV, root cause when applicable, JTBD, HMW.
3. **Opportunity Framing/converge** — scenario-specific OST, Lean Canvas, ERRC, Value Proposition.
4. **Ideation/diverge** — SCAMPER, Crazy 8s, Brainwriting, Impact Mapping, Analogy; no judgment.
5. **Evaluation/converge** — Dot Vote, RICE, Kano, 2×2, MoSCoW; rank 3–5 candidates or a 3–8 opportunity map.
6. **Hypothesis Validation** — problem/value cards, RAT, cheapest test, Build-Measure-Learn for top 3.
7. **Decision, Documentation & Handoff** — recommend one option by default; document and route user-approved next steps.

**Key Rules:**

- **Golden Rule:** NEVER evaluate ideas while generating them; diverge and converge stay separate.
- **Evidence:** Every claim and recommendation needs `file:line`, source, or traced evidence; confidence >80% required.
- **Output:** Scored, ranked shortlist with hypothesis validation—never a flat idea list.
- **User decisions:** Use `ask user question tool` for scenario selection, prioritization, and handoff.
- **Technique selection:** The selected scenario and routing references govern which techniques and outputs apply. Preserve the ordered Double Diamond spine, grounding, ranking, hypothesis/RAT and decision/handoff; optional methods run only for an evidenced need. Mark unselected template fields N/A with the reason instead of creating unrelated artifacts.
- **Risk profile:** Content skill; fresh-eyes review, specialist delegation, embedded sub-agent protocols, and recursive fix loops are N/A. Preserve the existing terminal state.

**Four Scenarios:**

| Scenario                       | Entry Trigger                                                                  | Primary Methods                                                                |
| ------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Problem-Solving**            | "Something is broken / users complain / metric is bad"                        | 5 Whys → Fishbone → HMW → SCAMPER → Hypothesis RAT                             |
| **New Product**                | "Greenfield idea / new market / no codebase yet"                              | JTBD → Lean Canvas → Crazy 8s → Opportunity Scoring → Lean Hypothesis          |
| **Feature Enhancement**        | "Existing product / add capability / improve flow"                           | Opportunity Solution Tree → SCAMPER → Impact Mapping → RICE → Value Hypothesis |
| **Multi-Opportunity Discovery** | "Raw product vision / problem statement spanning multiple distinct opportunities" | JTBD / OST → SCAMPER → RICE opportunity map (3–8 items) → user multi-select    |

**Double Diamond (master meta-framework):**

```
DIAMOND 1: Right Problem          DIAMOND 2: Right Solution
────────────────────────────      ──────────────────────────
Discover ──► Define               Develop ──► Deliver
(diverge)    (converge)           (diverge)   (converge)
```

**Golden Rule:** NEVER evaluate ideas while generating them. Diverge and converge are separate modes. Mixing them kills creative output.

**Be skeptical. Apply critical thinking. Every idea needs a testable hypothesis. Confidence >80% required before recommending.**

---

## Contents

- [Quick Summary](#quick-summary)
- [Roadmap and Scope Modes](#roadmap-and-scope-modes)
- [Answer this question:](#answer-this-question)
- [Phase 0: Session Setup (MANDATORY)](#phase-0-session-setup-mandatory)
- [Phase 1: Problem Framing — Diamond 1 Diverge](#phase-1-problem-framing--diamond-1-diverge)
- [Phase 2: Opportunity Framing — Diamond 1 Converge](#phase-2-opportunity-framing--diamond-1-converge)
- [Phase 3: Ideation — Diamond 2 Diverge](#phase-3-ideation--diamond-2-diverge)
- [Phase 4: Evaluation & Convergence — Diamond 2 Converge](#phase-4-evaluation--convergence--diamond-2-converge)
- [Phase 5: Hypothesis Validation](#phase-5-hypothesis-validation)
- [Phase 6: Decision & Recommendations](#phase-6-decision--recommendations)
- [Multi-Opportunity Discovery Mode](#multi-opportunity-discovery-mode)
- [Phase 7: Documentation & Handoff](#phase-7-documentation--handoff)
- [Technique Quick Reference](#technique-quick-reference)
- [Role-Specific Guidance](#role-specific-guidance)
- [Collaboration Tools](#collaboration-tools)
- [Scenario Cheat Sheets](#scenario-cheat-sheets)
- [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
- [Critical Constraints](#critical-constraints)
- [Workflow Integration](#workflow-integration)
- [Prompt-Enhance Closing Anchors](#prompt-enhance-closing-anchors)
- [Closing Reminders](#closing-reminders)

## Roadmap and Scope Modes

Resolve the flag before Phase 0:

| Mode | Purpose | Output / stop condition |
| --- | --- | --- |
| `--mode=roadmap` | Product-level framing for a broad vision or new product | Outcome hypothesis, actors, risks, 3–8 milestone candidates, non-goals, decisions, and evidence proposals; hand off to `/product-roadmap` to write/approve the roadmap artifact (default `docs/product-roadmap.md`; `docsRoots.productRoadmap.path` in `docs/project-config.json` overrides); no code, framework, schema, or timeline |
| `--mode=scope` | Clarify one selected roadmap milestone | Amend the exact selected `plans/{plan-id}/scope-brief.md` (plans root default `plans/`; `docsRoots.plans.path` in `docs/project-config.json` overrides) with in-scope behavior, non-goals, terms, source of truth, risks, decisions, and evidence; stop before `/scenario`/`/plan` |
| default | Standard Double Diamond ideation | Existing idea shortlist or multi-opportunity map flow below |

`--mode=roadmap` still requires owner approval. Use `ask user question tool` for milestone boundaries and lifecycle terms. `/product-roadmap` owns the canonical artifact and selection gate; this mode supplies framing only.

`--mode=scope` MUST resolve an existing scope-brief path from the `/product-roadmap` handoff, `$ARGUMENTS`, or active plan, then amend that file in place. If no stable `plans/{plan-id}/scope-brief.md` exists — plans root default `plans/`, overridable via `docsRoots.plans.path` in `docs/project-config.json` — stop and route to `/product-roadmap`; NEVER create a competing brief or write one under `tmp/reports/`.

Default mode does not route to `--mode=roadmap` merely because the idea is broad. Evaluate:

```text
isLargeIdea = multipleIndependentOutcomes
            || ambiguousOrResearchHeavy
            || releaseScopeDecomposition
            || oversizedTaskThatMustSplit
```

When true, the brainstorm handoff owns this portable block; downstream skills consume it read-only. When all four signals are false, omit the block and roadmap/milestone placeholders. An existing roadmap is context unless the user explicitly chose `--mode=roadmap`.

## Answer this question:

<question>$ARGUMENTS</question>

---

## Phase 0: Session Setup (MANDATORY)

**MUST ATTENTION** Use `ask user question tool` to detect scenario, role, and constraints before any technique.

### 0.1 — Scenario Detection

Ask:

1. **"What scenario are we in?"**
    - Problem-solving — something is broken, users struggle, a metric is bad
    - New product — greenfield, no existing product in this space
    - Feature enhancement — existing product, add/improve/remove capability
    - Multi-opportunity discovery — a raw product vision / problem statement spanning MULTIPLE distinct opportunities that should each become a separate task (do NOT converge to one — produce a ranked RICE opportunity map for multi-select; see [Multi-Opportunity Discovery Mode](#multi-opportunity-discovery-mode))
    - Mixed — multiple of the above

> **Mode routing:** A broad vision/problem spanning distinct opportunities (typically from `workflow-planned-work`'s MULTI-OPPORTUNITY DISCOVERY MODE) selects **Multi-opportunity discovery**. It changes Phase 6 from "pick ONE" to "rank a 3–8-item RICE map for multi-select." All other scenarios keep the single-recommendation default.

2. **"What is the primary role in this session?"**
    - Product Owner — outcome-focused, business value, user outcomes
    - Business Analyst — requirements-focused, process analysis, stakeholder mapping
    - Both PO + BA — full discovery and requirements
    - Developer / Architect — technical feasibility brainstorm

3. **"How much is already known?"**
    - Raw seed — just an intuition or observation
    - Problem confirmed — we know the problem, need solutions
    - Solution direction known — need to evaluate and score options
    - Idea exists — need hypothesis validation only

### 0.2 — Context Loading

- Existing codebase: read the business spec root (default `docs/specs/`; `specRoots.business.path` in `docs/project-config.json` overrides) for domain context.
- Greenfield: skip codebase reading; use user input and web research.
- Read `domain-entities-reference.md` under the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) only when entity context is needed.
- Use `WebSearch` for market/competitor context in New Product or Enhancement scenarios.

---

## Phase 1: Problem Framing — Diamond 1 Diverge

**Goal:** Understand the problem space before solutions; the primary brainstorming failure is solving the wrong problem.

**Time-box:** 20–45 minutes.

### 1.1 — Problem Statement (POV Format)

Formulate a crisp problem statement BEFORE any ideation:

```
[User/Persona] needs [need/job-to-be-done]
because [insight/root cause/context],
but [current barrier/friction/failure].
```

**Example:**

```
Operators need to quickly identify high-priority orders for action
because peak-season backlogs delay fulfillment,
but the current system shows raw order data with no ranking or comparison.
```

Use `ask user question tool` to validate the framing:

- "Is this the core problem, or a symptom of a deeper problem?"
- "Who specifically experiences this? How often? What's the cost?"
- "What evidence do we have this problem actually exists?"

### 1.2 — Root Cause Analysis (for Problem-Solving scenario)

Apply one of:

**5 Whys:**

```
Problem: [stated problem]
Why 1: [first cause]
Why 2: [cause of cause 1]
Why 3: [cause of cause 2]
Why 4: [cause of cause 3]
Why 5: [root cause] ← Fix HERE, not at Why 1
```

**Fishbone (Ishikawa) — for systemic problems:**
Spine = problem statement. Bones = 6 cause categories:

- People, Process, Technology, Data, Environment, Policy
- For each bone: ask "What in this category could cause the problem?"

### 1.3 — JTBD (Jobs-To-Be-Done) — for New Product & Enhancement

Replace user stories with job stories to expose real motivation:

**User Story (what):** As an operator, I want to see order totals, so that I can make decisions.

**Job Story (why + context):** When I'm clearing a peak-season backlog with limited time, I want to instantly see which orders need action without opening every record, so I can make fast, defensible decisions before the cutoff.

**Job Story Formula:**

```
When [triggering situation + context],
I want to [motivation / job to be done],
so I can [outcome / expected result].
```

Generate 3–5 job stories covering main user segments. Each story = one opportunity.

### 1.4 — HMW (How Might We) Reframing

Transform problem statements into ideation-ready questions:

**Formula:** "How might we [verb] [object] so that [desired outcome]?"

From the POV statement:

- "How might we **help HR managers rank employees** so that promotion decisions take minutes not days?"
- "How might we **surface hidden top performers** so that managers discover talent they'd otherwise miss?"
- "How might we **reduce bias in performance scoring** so that promotion feels fair to all employees?"

**Rules:**

- Each HMW covers ONE idea direction.
- Generate 5–10 HMW questions per problem.
- Too broad = "How might we improve HR?" (useless); too narrow = "How might we add a sort button?" (skip ideation, just build it).
- Sweet spot: one-concept questions inviting multiple solutions.

**Phase 1 output (selected-route techniques only):** Problem statement (POV); root cause (5 Whys or Fishbone, Problem-Solving only); 3–5 Job Stories; 5–10 HMW questions.

---

## Phase 2: Opportunity Framing — Diamond 1 Converge

**Goal:** Narrow the problem space to highest-opportunity focus areas before solution ideation.

### 2.1 — Opportunity Solution Tree (OST) — for Enhancement

Teresa Torres' framework: desired outcome → opportunities → solutions → experiments.

```
Desired Outcome (business metric)
├── Opportunity 1 (unmet user need / pain / want)
│   ├── Solution A
│   └── Solution B
├── Opportunity 2
│   ├── Solution C
│   └── Solution D
└── Opportunity 3 (deprioritized)
```

**Step 1:** State ONE desired outcome (lagging metric the team owns — e.g., "Increase manager satisfaction with review process from 3.2 to 4.0 CSAT").
**Step 2:** Map ALL known opportunities (pains, needs, wants) from research/interviews.
**Step 3:** For each top opportunity, generate solution directions, not detailed solutions.
**Step 4:** Pick 1–2 opportunities to develop in Phase 3.

### 2.2 — Lean Canvas — for New Product

One-page business model for greenfield ideas (Ash Maurya):

| Block             | Question                              |
| ----------------- | ------------------------------------- |
| Problem           | Top 3 problems being solved           |
| Customer Segments | Who has this problem? Early adopters? |
| Unique Value Prop | Single compelling message             |
| Solution          | Top 3 features (not full spec)        |
| Channels          | How to reach customers                |
| Revenue Streams   | How to make money                     |
| Cost Structure    | Fixed + variable costs                |
| Key Metrics       | One number that measures success      |
| Unfair Advantage  | What can't easily be copied?          |

Fill one canvas per major target segment. Time-box to 20 min; speed is the point.

### 2.3 — Blue Ocean ERRC Grid — for Enhancement or New Product

Eliminate-Reduce-Raise-Create grid (Chan Kim & Mauborgne):

| Eliminate                   | Reduce                            |
| --------------------------- | --------------------------------- |
| Features users never use    | Features that are over-engineered |
| **Raise**                   | **Create**                        |
| Features users want more of | Features no competitor offers     |

**Rule:** Every innovation needs at least ONE Create item and one Eliminate item. Raise-only products are incremental, not differentiated.

### 2.4 — Value Proposition Canvas

Connect customer profile to product value:

**Customer Profile:**

- Jobs (functional, social, emotional)
- Pains (frustrations, obstacles, risks)
- Gains (benefits, desires, measures of success)

**Value Map:**

- Products & Services (what you offer)
- Pain Relievers (how you reduce pains)
- Gain Creators (how you produce gains)

**Fit = Pain Relievers match Pains and Gain Creators match Gains.**

**Phase 2 output (selected-route techniques only):** OST with 2 selected opportunities (Enhancement); Lean Canvas (New Product); ERRC grid (New Product or Enhancement); Value Proposition fit assessment.

---

## Phase 3: Ideation — Diamond 2 Diverge

**Goal:** Generate maximum solution quantity without judgment; quality comes in Phase 4.

**Critical rule:** NO evaluation in this phase. Every idea is valid: "Yes, and...", not "Yes, but...".

### 3.1 — SCAMPER

Apply each lens to the problem/existing product; generate solution directions:

| Letter               | Prompt                     | Example for order-prioritization feature                  |
| -------------------- | -------------------------- | --------------------------------------------------------- |
| **S**ubstitute       | What can be replaced?      | Replace manual sorting with AI-assisted ranking           |
| **C**ombine          | What can be merged?        | Combine status + history + SLA risk in one view           |
| **A**dapt            | What can be borrowed?      | Adapt Netflix recommendation to surface priority orders   |
| **M**odify           | What can be scaled/shrunk? | Shrink the review queue to a daily priority check         |
| **P**ut to other use | Different context?         | Use order history for restocking recommendations          |
| **E**liminate        | What can be removed?       | Eliminate the nightly batch — replace with continuous signals |
| **R**everse          | Flip the process?          | Let downstream stages pull orders instead of pushing      |

Generate at least 2 ideas per SCAMPER letter: minimum 14 ideas.

### 3.2 — Crazy 8s (Rapid Visual Ideation)

**Time-box: 8 minutes; 8 ideas; no refinement.**

Process:

1. Fold paper into 8 sections (or create 8 boxes mentally).
2. Sketch one rough idea per box.
3. Let the timer force quantity over perfection.
4. Share and build on sketches.

For AI-facilitated sessions:

- AI generates 8 distinct solution directions in 2 minutes.
- User picks the top 3 to explore.
- Each direction = 1 sentence + 1 key differentiator.

### 3.3 — Brainwriting 6-3-5

For multi-stakeholder, async-friendly sessions:

- 6 participants, 3 ideas each, 5 rounds.
- Each round: read previous ideas → add 3 ideas OR build on an existing idea.
- Result: up to 108 ideas in 30 minutes; works asynchronously in a shared doc.

For AI-facilitated sessions:

- AI plays all 6 roles across 3 rounds.
- Generate from PO, BA, End User, Dev, Ops, and Business perspectives.

### 3.4 — Impact Mapping

Gojko Adzic's technique: Goal → Actors → Impacts → Deliverables:

```
GOAL: [business outcome with measurable target]
├── ACTOR: Who can help/hinder?
│   ├── IMPACT: How should behavior change?
│   │   └── DELIVERABLE: What feature produces this impact?
│   └── IMPACT: What negative behavior to prevent?
│       └── DELIVERABLE: What reduces this risk?
└── ACTOR: ...
```

**Key insight:** Work backward from GOAL. If a deliverable does not trace to an actor behavior change, do not build it.

### 3.5 — Analogical Thinking

Ask: "How does [industry X] solve [similar problem Y]?"

| Analogy Source                | Application to HR                      |
| ----------------------------- | -------------------------------------- |
| Spotify Discover Weekly       | Personalized learning recommendations  |
| Uber surge pricing            | Dynamic bonus pool allocation          |
| GitHub PR reviews             | Peer skill endorsement with evidence   |
| Amazon recommendation engine  | Next goal suggestion                   |
| Netflix "because you watched" | "Colleagues like you also achieved..." |

**Phase 3 output (selected-route techniques only):** SCAMPER grid with 14+ ideas; Crazy 8s with 8 directions; Impact Map for top 2 goals; 3–5 analogy-inspired ideas; 25–40 total raw ideas.

---

## Phase 4: Evaluation & Convergence — Diamond 2 Converge

**Goal:** Reduce 25–40 raw ideas to a ranked 3–5-candidate shortlist for hypothesis testing.

### 4.1 — Dot Voting (First Pass)

Before scoring, run a quick gut-check elimination:

- Each idea gets ✅ (keep), ❌ (drop), or 🔄 (merge).
- Merge near-identical ideas.
- Drop ideas violating hard constraints (budget, tech, legal).
- Target: 10–15 candidates.

### 4.2 — RICE Scoring

Rank remaining candidates:

```
RICE Score = (Reach × Impact × Confidence) / Effort

Reach:      Users affected per quarter (100 / 500 / 1000 / 5000+)
Impact:     0.25 minimal | 0.5 low | 1 medium | 2 high | 3 massive
Confidence: 0.5 low (gut feel) | 0.8 medium (some data) | 1.0 high (validated)
Effort:     Effort points — 1 trivial | 3 small | 5 medium | 8 large | 13 very large
```

Score all 10–15 candidates. Sort descending. Top 5 = shortlist.

### 4.3 — Kano Model Classification

For each shortlisted idea, classify:

| Category        | Description           | If absent          | If present      | Example          |
| --------------- | --------------------- | ------------------ | --------------- | ---------------- |
| **Must-Be**     | Baseline expectation  | Users angry        | Users neutral   | Login works      |
| **Performance** | More = better         | Users dissatisfied | Users satisfied | Faster load      |
| **Delighter**   | Unexpected value      | Users neutral      | Users delighted | Smart suggestion |
| **Indifferent** | Doesn't matter        | Users neutral      | Users neutral   | Icon colors      |
| **Reverse**     | Some want, some don't | Segment upset      | Segment happy   | Auto-fill        |

**Strategy:** Must-Be → Performance → Delighter. Never skip Must-Be items for Delighters.

### 4.4 — Effort × Impact 2×2

Use for quick visual triage:

```
HIGH IMPACT
    │  Quick Wins ★    │  Major Projects ⚙️
    │  (do first)      │  (schedule carefully)
────┼──────────────────┼────────────────────
    │  Fill-Ins 📋     │  Money Pits ⚠️
    │  (if time)       │  (avoid or cut)
LOW IMPACT
         LOW EFFORT         HIGH EFFORT
```

Plot each shortlisted idea. Quick Wins = default first picks unless Major Project has strategic necessity.

### 4.5 — MoSCoW for Release Scope

Assign release priority to each shortlisted idea:

| Priority        | Meaning                            | Threshold                              |
| --------------- | ---------------------------------- | -------------------------------------- |
| **Must Have**   | MVP is broken without it           | Include if >80% of value depends on it |
| **Should Have** | Important but MVP works without it | Include if RICE > median               |
| **Could Have**  | Nice to have, low risk to cut      | Include if effort ≤ 3 EP               |
| **Won't Have**  | Explicitly out of scope this cycle | Document for future                    |

**Phase 4 output (selected-route techniques only):** Dot-voted shortlist (10–15 ideas); top-5 RICE table; Kano classification; 2×2 placement; MoSCoW assignment per idea.

---

## Phase 5: Hypothesis Validation

**Goal:** Test riskiest assumptions before build commitment. 42% of startups fail from no market need; validate first.

### 5.1 — Problem Hypothesis

```markdown
**We believe** [target users/persona]
**Experience** [specific problem]
**Because** [root cause]
**We'll know this is true when** [validation metric/observable evidence]
```

**Example:**

```
We believe Operators
Experience frustration identifying high-priority orders during peak backlogs
Because order data is fragmented across 3 systems with no unified ranking
We'll know this is true when 3+ operators confirm they spend >2hrs per shift on manual data aggregation
```

### 5.2 — Value Hypothesis

```markdown
**We believe** [feature/solution]
**Will deliver** [specific value/outcome]
**To** [target users]
**We'll know we're right when** [measurable success metric]
```

### 5.3 — Riskiest Assumption Test (RAT)

Identify the ONE assumption whose failure kills the idea:

1. List all assumptions: user behavior, technical feasibility, market demand, business model
2. Score each: `Probability of being wrong (0–1) × Impact if wrong (0–1)`
3. Highest score = Riskiest Assumption
4. Design the cheapest possible test to validate/invalidate it **before** full build:
    - User interview (2–3 days)
    - Landing page / fake door test (1 week)
    - Prototype click-through (3–5 days)
    - Concierge MVP (1–2 weeks)
    - Smoke test / pre-sell (2–4 weeks)

### 5.4 — Build-Measure-Learn Loop

Define the loop for each top idea:

```
BUILD: Minimum experiment to test the assumption (not a full product)
MEASURE: One metric that proves/disproves the hypothesis
LEARN: What decision do we make if metric is met / not met?
PIVOT: If hypothesis invalidated — which alternative from Phase 3 do we try next?
```

**Phase 5 output (all required):** Problem and Value hypothesis cards per top-3 idea; Riskiest Assumption per idea; cheapest test; Build-Measure-Learn loop.

---

## Phase 6: Decision & Recommendations

**Goal:** Present one clear, opinionated recommendation with trade-offs—not a menu—so the team knows what to do and why.

### 6.1 — Top 3 Options Table

Present final shortlist as a decision table:

| Option   | RICE | Kano        | Effort | Risk   | RAT Test        | Recommendation |
| -------- | ---- | ----------- | ------ | ------ | --------------- | -------------- |
| Option A | 320  | Delighter   | 5 EP   | Medium | 3-day interview | ⭐ Recommended |
| Option B | 180  | Performance | 8 EP   | Low    | Prototype       | Viable         |
| Option C | 90   | Must-Be     | 13 EP  | High   | Pre-sell        | Defer          |

### 6.2 — Recommendation Statement

```
RECOMMENDED: [Option Name]

Why: [1–2 sentences on RICE + Kano + strategic fit]
Risk: [Primary risk + mitigation]
First step: [Cheapest test to validate before full commitment]
Time to validation: [Days/weeks]
```

### 6.3 — Dependency & Sequencing Check

- Does Option A depend on an unbuilt feature, data source, or service?
- Can experiments run in parallel?
- What is the critical path to first validated learning?

---

## Multi-Opportunity Discovery Mode

> **Select in Phase 0.1 when the input is a raw product vision/problem spanning MULTIPLE distinct opportunities.** This is an additional mode; every other scenario keeps Phase 6's single-recommendation default.

**When to use:** a broad vision, problem statement, or "explore this whole area" brief expects several distinct, independently shippable opportunities, each becoming its own downstream task. This is the mode driven by `workflow-planned-work`'s **MULTI-OPPORTUNITY DISCOVERY MODE**.

**How convergence differs:** the default flow produces ONE opinionated recommendation (Phase 6); this mode does NOT. Use the SAME Phase 4 techniques (RICE / Kano / 2×2) to **RANK and present 3–8 distinct opportunities**, not a single winner. The user then multi-selects opportunities to develop; choosing one would discard downstream tasks.

**Technique flow:** run Phases 1–4 normally (problem framing → opportunity framing → ideation → convergence). In Phase 2, use JTBD / Opportunity Solution Tree to surface the FULL landscape, not one focus; in Phase 4, use RICE / Kano / 2×2 to SCORE and RANK every distinct opportunity instead of collapsing to one recommendation.

**Output contract (must match what `workflow-planned-work` consumes):**

- An **opportunity map of 3–8 distinct, RICE-scored opportunities**, ranked descending by RICE.
- Documented in **`plans/{plan-dir}/brainstorm-opportunity-map.md`** (plans root default `plans/`; `docsRoots.plans.path` in `docs/project-config.json` overrides).
- Each opportunity carries: a one-line problem/value framing, RICE components (Reach × Impact × Confidence / Effort) + RICE score, and (where known) a Kano class — so each can seed a downstream task.

```markdown
# Opportunity Map: [Vision/Problem]

| Rank | Opportunity | Problem/Value (1 line) | Reach | Impact | Confidence | Effort | RICE | Kano |
| ---- | ----------- | ---------------------- | ----- | ------ | ---------- | ------ | ---- | ---- |
| 1    | ...         | ...                    | 1000  | 2      | 0.8        | 5      | 320  | Delighter |
| 2    | ...         | ...                    | ...   | ...    | ...        | ...    | ...  | ...  |
```

**Multi-select handoff:** present the ranked map with `ask user question tool` and `multiSelect: true`: "Which opportunities should we develop into tasks?". Selected opportunities feed `workflow-planned-work`'s **per-opportunity task loop** (initiative → work-item --mode=refine → task review → challenge → work-item --mode=story → DoR, then cross-task prioritization and the UI block in the main session). Do NOT author tasks, specs, or plans here; the deliverable is only the scored, multi-selected map.

---

## Phase 7: Documentation & Handoff

### Report Output

Use the naming pattern from the injected `## Naming` section.

Read `references/brainstorm-skill-report.md` before writing the session report; retain all context, framing, scoring, hypothesis, decision and next-step fields. Multi-opportunity mode also preserves its scored-map contract above.

---

## Technique Quick Reference

Read `references/brainstorm-skill-technique-routing.md` after Phase 0 scenario selection and before choosing techniques; its selection/time-box table supplements the execution phases.

## Role-Specific Guidance

### PO Mode (Outcome Focus)

- Lead with desired business outcome → opportunities → experiments.
- Use OST, Impact Mapping, RICE, and Build-Measure-Learn.
- Ask: "What behavior change do we need to see in users?"
- Resist jumping to features before validating the outcome.

### BA Mode (Requirements Focus)

- Lead with stakeholder needs → process gaps → requirements.
- Use BABOK elicitation (interviews, workshops, document analysis), Fishbone, and JTBD.
- Ask: "What does the system need to do to enable that behavior?"
- Resist over-specifying before the PO validates the opportunity.

### Mixed PO + BA Mode

- PO owns problem statement, opportunity framing, prioritization, and hypothesis.
- BA owns requirements elicitation, acceptance criteria, edge cases, and process mapping.
- Handoff: after Phase 4's scored shortlist; BA writes acceptance criteria per idea.

---

## Collaboration Tools

- `planner` agent — research domain best practices.
- `docs-manager` agent — understand existing feature constraints and domain context.
- `WebSearch` — market/competitor context for New Product scenarios.
- `visual analysis tooling` skill — analyze mockups, screenshots, competitor UIs.
- `/web-research` — deep greenfield or competitive market research, and latest external plugin/API documentation (Context7 MCP optional where configured).

---

## Scenario Cheat Sheets

Read `references/brainstorm-skill-scenarios.md` after Phase 0 scenario selection for the matching route; retain the multi-opportunity ranking/multi-select exception.

## Anti-Patterns to Avoid

| Anti-Pattern                                 | Why It Fails                                     | Better Approach                              |
| -------------------------------------------- | ------------------------------------------------ | -------------------------------------------- |
| Jumping to solutions before defining problem | Builds the wrong thing                           | Always complete Phase 1 first                |
| Evaluating ideas while generating them       | Kills creative output, premature closure         | Strict diverge/converge separation           |
| One stakeholder perspective only             | Misses jobs, pains, context                      | Brainwriting from 6 different roles          |
| No hypothesis before building                | 42% of features fail — no market need            | Always write hypothesis + RAT                |
| RICE without confidence score                | Overestimates low-evidence ideas                 | Always include Confidence as a multiplier    |
| Kano ignored — building only Delighters      | Users can't use a delighter with broken Must-Bes | Prioritize Must-Be → Performance → Delighter |
| "Best idea wins" without validation test     | HiPPO bias (Highest Paid Person's Opinion)       | Every top idea needs a RAT test design       |
| Scope creep in ideation                      | Ideas balloon beyond what team can validate      | Timebox each phase strictly                  |
| Treating RICE score as final truth           | RICE is directional, not precise                 | Use RICE + Kano + strategic context together |

---

## Critical Constraints

- **DO NOT implement solutions** — brainstorm and advise only.
- **DO validate hypotheses** before endorsing an approach.
- **DO prioritize long-term maintainability** over short-term convenience.
- **DO consider technical excellence and business pragmatism.**
- **DO produce a scored, ranked shortlist**—never a flat idea list.
- **DO design the cheapest validation test**—RAT before full spec.

---

## Workflow Integration

> **Inside a workflow:** when this skill runs as a step of an active workflow, skip the prompts in this section and return the result — the workflow's next step decides what runs (`/start-workflow` → Step Execution Protocol, Workflow-step mode).

After the session, use `ask user question tool` to present next steps:

| Next Step              | When                                                        | Skill/Workflow          |
| ---------------------- | ----------------------------------------------------------- | ----------------------- |
| `/initiative`                | Capture top idea as an initiative                        | `initiative` skill            |
| `/work-item --mode=refine`  | Turn the top idea into an actionable task with AC                         | `work-item` skill             |
| `/web-research`        | Need deeper market/competitor research first                | `web-research` skill    |
| `/plan`                | Problem is clear, solution is validated, ready to implement | `plan` skill            |
| `/design-spec`         | UI-heavy idea, need wireframes before spec                  | `design-spec` skill     |
| `/domain-analysis`     | Idea touches domain entities, need model first              | `domain-analysis` skill |
| Continue brainstorming | More scenarios to explore                                   | Stay in this session    |

**Multi-Opportunity Discovery handoff:** in discovery mode, do NOT pick one next step. Present the ranked 3–8-item RICE map (write to `plans/{plan-dir}/brainstorm-opportunity-map.md`; plans root default `plans/`, overridable via `docsRoots.plans.path` in `docs/project-config.json`) via `ask user question tool` with `multiSelect: true`, then hand selected opportunities to `workflow-planned-work`'s per-opportunity task loop. `workflow-planned-work` consumes this map directly.

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting. This prevents context loss from long sessions.

---

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `sequential-thinking-protocol` — Structured multi-step reasoning with revision, branch and hypothesis markers; planning, debugging or reviewing complex or ambiguous work → .claude/skills/shared/protocols/sequential-thinking-protocol.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:sequential-thinking-protocol:reminder -->

**MUST ATTENTION** use structured reasoning for complex or ambiguous work, implicitly when visible markers would clutter. Verify hypotheses, revise assumptions, and close with confidence, assumptions, open questions and a concrete next action.

<!-- /SYNC:sequential-thinking-protocol:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval; inside a workflow run, `/start-workflow` → Workflow-step mode bounds this
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Facilitate evidence-backed PO/BA Double-Diamond ideation that separates problem discovery from solution evaluation and delivers either a validated, ranked 3–5-candidate shortlist with problem/value hypotheses, each riskiest assumption, and cheapest validation test plus one recommendation—or, in **Multi-Opportunity Discovery mode**, a ranked 3–8-item RICE map for user selection—so the team commits to the right problem and solution, never a flat idea list.
- **IMPORTANT MUST ATTENTION Roadmap mode:** `--mode=roadmap` is explicit-only; it frames outcome-based milestones, risks, non-goals, human decisions, and evidence, then hands off to `/product-roadmap`; it does not choose technology or implementation.
- **IMPORTANT MUST ATTENTION Embedded decomposition:** when any shared `isLargeIdea` signal is true, write the complete five-field `large_idea_decomposition` block in the owning handoff and carry its stable slice IDs into tasks, stories, mock-ups, and the all-task presentation; do not create a default roadmap file.
- **IMPORTANT MUST ATTENTION Scope mode:** `--mode=scope` resolves and amends exactly one approved `plans/{plan-id}/scope-brief.md` in place (plans root default `plans/`; `docsRoots.plans.path` in `docs/project-config.json` overrides), then stops before `/scenario` or `/plan`; it never creates a competing brief.
- **IMPORTANT MUST ATTENTION Main steps (run in order, track each):** P0 select scenario/context → P1 ground problem/users and HMW → P2 frame applicable opportunities → P3 generate with selected techniques, without evaluation → P4 rank using the selected route → P5 hypothesis/RAT and cheapest validation → P6 recommend or preserve the multi-opportunity scored map/user selection → P7 document/handoff. Keep required phase outcomes; do not run every catalog technique to fill output lists.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Sequential Thinking:** multi-step Thought N/M with REVISION/BRANCH/HYPOTHESIS markers, confidence closer.

- **MANDATORY IMPORTANT MUST ATTENTION** detect scenario + role + how-much-known via `ask user question tool` Phase 0 FIRST — each scenario routes a different technique sequence — why: misclassifying scenario derails every downstream phase.
- **MANDATORY IMPORTANT MUST ATTENTION** separate diverge (Phases 1 & 3, generate, "Yes, and…", zero judgment) from converge (Phases 2 & 4, narrow + score) — NEVER evaluate ideas while generating them — why: mixing the two modes is the Golden Rule violation that kills creative output.
- **MANDATORY IMPORTANT MUST ATTENTION** NEVER stop at a raw or flat idea list — every top-3 candidate carries a problem + value hypothesis card, an identified riskiest assumption (RAT), and the single cheapest validation test designed before any build commitment — why: 42% of features fail from no market need; validate before building.
- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting; mark each `completed` immediately, add a final review todo — why: long brainstorm sessions lose context without external task tracking.
- **MANDATORY IMPORTANT MUST ATTENTION** search 3+ existing patterns first — read the business spec root (default `docs/specs/`; `specRoots.business.path` in `docs/project-config.json` overrides) for domain (codebase) or `WebSearch` for market/competitor context (greenfield) before ideating — why: ideas ungrounded in domain or market evidence score on gut feel, not fit.
- **MANDATORY IMPORTANT MUST ATTENTION** cite evidence for every claim, confidence >80% to recommend; RICE Confidence is a multiplier, not optional — why: low-evidence ideas without a Confidence score get over-ranked.
- **MANDATORY IMPORTANT MUST ATTENTION** close with ONE opinionated recommendation + trade-offs (Phase 6). **Multi-Opportunity Discovery exception:** follow [its complete map/path/selection contract](#multi-opportunity-discovery-mode) instead: rank 3–8 opportunities, persist the map and use `ask user question tool` `multiSelect: true` for the per-opportunity task handoff; never collapse that planned work to one.
- **MANDATORY IMPORTANT MUST ATTENTION** use `ask user question tool` for all user decisions and handoff routing (`/initiative`, `/work-item --mode=refine`, `/plan`) — never auto-decide — why: the user owns scenario, prioritization, and next-step choices.

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------------------------- |
| "Scenario is obvious, skip Phase 0 detection"    | Misclassified scenario routes the wrong technique sequence. Run `ask user question tool` first. |
| "Just list the ideas, evaluation can wait"             | A flat idea list is the deliverable failure. Score, rank, and hypothesis-test the top 3. |
| "Skip the RAT — the idea is clearly good"        | "Clearly good" is HiPPO bias. Design the cheapest test before any build commitment.   |
| "Diverge and converge together to save time"     | Mixing modes kills creative output — the Golden Rule violation. Keep phases separate. |
| "RICE without Confidence is close enough"        | No Confidence multiplier over-ranks low-evidence ideas. Always score Confidence.      |
| "Already know the domain, skip context loading"  | Show a read of the business spec root (default `docs/specs/`; `specRoots.business.path` in `docs/project-config.json` overrides) or `WebSearch` evidence. No proof = ungrounded ideation. |

**MUST ATTENTION** Phase 0 scenario detection FIRST · diverge/converge strictly separated · every top-3 idea carries a hypothesis + RAT + cheapest test — these three survive long sessions; re-anchor to them before recommending.
