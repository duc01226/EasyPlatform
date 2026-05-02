---
name: brainstorm
version: 2.0.0
description: '[Content] Brainstorm as a PO/BA — structured ideation for problem-solving, new product creation, or feature enhancement. Uses Double Diamond, JTBD, HMW, SCAMPER, Impact Mapping, RICE, and hypothesis validation.'
disable-model-invocation: false
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting. This prevents context loss from long sessions.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

---

## Quick Summary

**Goal:** Facilitate a structured PO/BA brainstorming session using the Double Diamond process — diverge to discover problems and opportunities, then converge to validate and prioritize ideas before committing to implementation.

**Three Scenarios:**

| Scenario                | Entry Trigger                                          | Primary Methods                                                                |
| ----------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------ |
| **Problem-Solving**     | "Something is broken / users complain / metric is bad" | 5 Whys → Fishbone → HMW → SCAMPER → Hypothesis RAT                             |
| **New Product**         | "Greenfield idea / new market / no codebase yet"       | JTBD → Lean Canvas → Crazy 8s → Opportunity Scoring → Lean Hypothesis          |
| **Feature Enhancement** | "Existing product / add capability / improve flow"     | Opportunity Solution Tree → SCAMPER → Impact Mapping → RICE → Value Hypothesis |

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

## Answer this question:

<question>$ARGUMENTS</question>

---

## Phase 0: Session Setup (MANDATORY)

Use `AskUserQuestion` to detect scenario, role, and constraints before any technique.

### 0.1 — Scenario Detection

Ask:

1. **"What scenario are we in?"**
    - Problem-solving — something is broken, users struggle, a metric is bad
    - New product — greenfield, no existing product in this space
    - Feature enhancement — existing product, add/improve/remove capability
    - Mixed — multiple of the above

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

- If project codebase exists: read `docs/business-features/` to understand domain
- If greenfield: skip codebase reading; rely on user input and web research
- Load `docs/project-reference/domain-entities-reference.md` if entity context needed
- Use `WebSearch` for market/competitor context when scenario = New Product or Enhancement

---

## Phase 1: Problem Framing — Diamond 1 Diverge

**Goal:** Fully understand the problem space before jumping to solutions. The #1 failure in brainstorming: solving the wrong problem.

**Time-box:** 20–45 minutes of session time.

### 1.1 — Problem Statement (POV Format)

Formulate a crisp problem statement BEFORE any ideation:

```
[User/Persona] needs [need/job-to-be-done]
because [insight/root cause/context],
but [current barrier/friction/failure].
```

**Example:**

```
HR Managers need to quickly identify top performers for promotion
because quarterly reviews create promotion backlogs,
but the current system shows raw scores with no ranking or comparison.
```

Use `AskUserQuestion` to validate:

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

**User Story (what):** As a manager, I want to see employee scores, so that I can make decisions.

**Job Story (why + context):** When I'm preparing for quarterly reviews with limited time, I want to instantly see who deserves promotion without reading every profile, so I can make fair, defensible decisions before the deadline.

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

- Each HMW covers ONE idea direction
- Generate 5–10 HMW questions per problem
- Too broad = "How might we improve HR?" (useless) → too narrow = "How might we add a sort button?" (skip ideation, just build it)
- Sweet spot: one-concept questions that invite multiple solutions

**Output of Phase 1:**

- [ ] Problem statement (POV format)
- [ ] Root cause (5 Whys or Fishbone) — Problem-Solving only
- [ ] 3–5 Job Stories
- [ ] 5–10 HMW questions

---

## Phase 2: Opportunity Framing — Diamond 1 Converge

**Goal:** Narrow problem space to the highest-opportunity focus areas before ideating solutions.

### 2.1 — Opportunity Solution Tree (OST) — for Enhancement

Teresa Torres' framework. Maps desired outcome → opportunities → solutions → experiments.

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

**Step 1:** State ONE desired outcome (lagging metric the team owns — e.g., "Increase manager satisfaction with review process from 3.2 to 4.0 CSAT")
**Step 2:** Map ALL known opportunities (pains, needs, wants) from research/interviews
**Step 3:** For each top opportunity, generate solution directions (not detailed solutions yet)
**Step 4:** Pick 1–2 opportunities to develop further in Phase 3

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

Fill one canvas per major target segment. Keep it to 20 min — speed is the point.

### 2.3 — Blue Ocean ERRC Grid — for Enhancement or New Product

Eliminate-Reduce-Raise-Create grid (Chan Kim & Mauborgne):

| Eliminate                   | Reduce                            |
| --------------------------- | --------------------------------- |
| Features users never use    | Features that are over-engineered |
| **Raise**                   | **Create**                        |
| Features users want more of | Features no competitor offers     |

**Rule:** Every innovation should have at least ONE item in Create AND one in Eliminate. A product with only Raise entries is incremental — not differentiated.

### 2.4 — Value Proposition Canvas

Connects customer profile to product value:

**Customer Profile:**

- Jobs (functional, social, emotional)
- Pains (frustrations, obstacles, risks)
- Gains (benefits, desires, measures of success)

**Value Map:**

- Products & Services (what you offer)
- Pain Relievers (how you reduce pains)
- Gain Creators (how you produce gains)

**Fit = where Pain Relievers match Pains + Gain Creators match Gains.**

**Output of Phase 2:**

- [ ] OST with 2 selected opportunities (Enhancement)
- [ ] Lean Canvas (New Product)
- [ ] ERRC grid (New Product or Enhancement)
- [ ] Value Proposition fit assessment

---

## Phase 3: Ideation — Diamond 2 Diverge

**Goal:** Generate maximum quantity of solution ideas without judgment. Quality comes in Phase 4.

**Critical rule:** NO evaluation in this phase. Every idea is valid. "Yes, and..." not "Yes, but..."

### 3.1 — SCAMPER

Apply each lens to the problem/existing product to generate solution directions:

| Letter               | Prompt                     | Example for HR review feature                             |
| -------------------- | -------------------------- | --------------------------------------------------------- |
| **S**ubstitute       | What can be replaced?      | Replace manual scoring with AI-assisted ranking           |
| **C**ombine          | What can be merged?        | Combine performance + feedback + OKR in one view          |
| **A**dapt            | What can be borrowed?      | Adapt Netflix recommendation to suggest top performers    |
| **M**odify           | What can be scaled/shrunk? | Minimize review to a weekly pulse check                   |
| **P**ut to other use | Different context?         | Use review data for learning path recommendations         |
| **E**liminate        | What can be removed?       | Eliminate annual review — replace with continuous signals |
| **R**everse          | Flip the process?          | Let employees score managers instead                      |

Generate at least 2 ideas per SCAMPER letter = minimum 14 ideas.

### 3.2 — Crazy 8s (Rapid Visual Ideation)

**Time-box: 8 minutes. 8 ideas. No refinement.**

Process:

1. Fold paper into 8 sections (or create 8 boxes mentally)
2. Sketch one idea concept per box — rough is fine
3. Timer forces quantity over perfection
4. Share and build on sketches

For AI-facilitated sessions:

- AI generates 8 distinct solution directions in 2 minutes
- User picks top 3 to explore deeper
- Each direction = 1 sentence + 1 key differentiator

### 3.3 — Brainwriting 6-3-5

For multi-stakeholder sessions (async-friendly):

- 6 participants, 3 ideas each, 5 rounds
- Each round: read previous ideas → add 3 new ideas OR build on existing
- Result: up to 108 ideas in 30 minutes (works async via shared doc)

For AI-facilitated sessions:

- AI plays all 6 roles across 3 rounds
- Generates ideas from: PO perspective, BA perspective, End User perspective, Dev perspective, Ops perspective, Business perspective

### 3.4 — Impact Mapping

Gojko Adzic's technique. Maps Goal → Actors → Impacts → Deliverables:

```
GOAL: [business outcome with measurable target]
├── ACTOR: Who can help/hinder?
│   ├── IMPACT: How should behavior change?
│   │   └── DELIVERABLE: What feature produces this impact?
│   └── IMPACT: What negative behavior to prevent?
│       └── DELIVERABLE: What reduces this risk?
└── ACTOR: ...
```

**Key insight:** Work backward from GOAL. If a deliverable doesn't trace to an actor behavior change, don't build it.

### 3.5 — Analogical Thinking

"How does [industry X] solve [similar problem Y]?"

| Analogy Source                | Application to HR                      |
| ----------------------------- | -------------------------------------- |
| Spotify Discover Weekly       | Personalized learning recommendations  |
| Uber surge pricing            | Dynamic bonus pool allocation          |
| GitHub PR reviews             | Peer skill endorsement with evidence   |
| Amazon recommendation engine  | Next goal suggestion                   |
| Netflix "because you watched" | "Colleagues like you also achieved..." |

**Output of Phase 3:**

- [ ] SCAMPER grid with 14+ ideas
- [ ] Crazy 8s — 8 solution directions
- [ ] Impact Map (top 2 goals)
- [ ] Analogy-inspired ideas (3–5)
- [ ] Total raw idea count: target 25–40 ideas

---

## Phase 4: Evaluation & Convergence — Diamond 2 Converge

**Goal:** Reduce 25–40 raw ideas to a ranked shortlist of 3–5 candidates for hypothesis testing.

### 4.1 — Dot Voting (First Pass)

Before scoring, do a quick gut-check elimination:

- Each idea gets a ✅ (keep) / ❌ (drop) / 🔄 (merge with another)
- Merge near-identical ideas
- Drop ideas that violate hard constraints (budget, tech, legal)
- Target: reduce to 10–15 candidates

### 4.2 — RICE Scoring

Rank remaining candidates:

```
RICE Score = (Reach × Impact × Confidence) / Effort

Reach:      Users affected per quarter (100 / 500 / 1000 / 5000+)
Impact:     0.25 minimal | 0.5 low | 1 medium | 2 high | 3 massive
Confidence: 0.5 low (gut feel) | 0.8 medium (some data) | 1.0 high (validated)
Effort:     Story Points — 1 trivial | 3 small | 5 medium | 8 large | 13 very large
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

Quick visual triage:

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

For each idea in the shortlist, assign release priority:

| Priority        | Meaning                            | Threshold                              |
| --------------- | ---------------------------------- | -------------------------------------- |
| **Must Have**   | MVP is broken without it           | Include if >80% of value depends on it |
| **Should Have** | Important but MVP works without it | Include if RICE > median               |
| **Could Have**  | Nice to have, low risk to cut      | Include if effort ≤ 3 SP               |
| **Won't Have**  | Explicitly out of scope this cycle | Document for future                    |

**Output of Phase 4:**

- [ ] Dot-voted shortlist (10–15 ideas)
- [ ] RICE-scored table (top 5 ranked)
- [ ] Kano classification for each shortlisted idea
- [ ] 2×2 matrix placement
- [ ] MoSCoW assignment per idea

---

## Phase 5: Hypothesis Validation

**Goal:** Before committing to build, test your riskiest assumptions. 42% of startups fail because no market need — validate before building.

### 5.1 — Problem Hypothesis

```markdown
**We believe** [target users/persona]
**Experience** [specific problem]
**Because** [root cause]
**We'll know this is true when** [validation metric/observable evidence]
```

**Example:**

```
We believe HR Managers
Experience frustration identifying top performers during review cycles
Because scoring data is fragmented across 3 systems with no unified ranking
We'll know this is true when 3+ managers confirm they spend >2hrs per cycle on manual data aggregation
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
4. Design cheapest possible test to validate/invalidate it **before** full build:
    - User interview (2–3 days)
    - Landing page / fake door test (1 week)
    - Prototype click-through (3–5 days)
    - Concierge MVP (1–2 weeks)
    - Smoke test / pre-sell (2–4 weeks)

### 5.4 — Build-Measure-Learn Loop

For each top idea, define the loop:

```
BUILD: Minimum experiment to test the assumption (not a full product)
MEASURE: One metric that proves/disproves the hypothesis
LEARN: What decision do we make if metric is met / not met?
PIVOT: If hypothesis invalidated — which alternative from Phase 3 do we try next?
```

**Output of Phase 5:**

- [ ] Problem hypothesis card per top-3 idea
- [ ] Value hypothesis card per top-3 idea
- [ ] Riskiest Assumption identified per idea
- [ ] Cheapest test designed
- [ ] Build-Measure-Learn loop defined

---

## Phase 6: Decision & Recommendations

**Goal:** Present a clear, opinionated recommendation with trade-offs. Not "here are all the options" — "here's what we recommend and why."

### 6.1 — Top 3 Options Table

Present final shortlist as a decision table:

| Option   | RICE | Kano        | Effort | Risk   | RAT Test        | Recommendation |
| -------- | ---- | ----------- | ------ | ------ | --------------- | -------------- |
| Option A | 320  | Delighter   | 5 SP   | Medium | 3-day interview | ⭐ Recommended |
| Option B | 180  | Performance | 8 SP   | Low    | Prototype       | Viable         |
| Option C | 90   | Must-Be     | 13 SP  | High   | Pre-sell        | Defer          |

### 6.2 — Recommendation Statement

```
RECOMMENDED: [Option Name]

Why: [1–2 sentences on RICE + Kano + strategic fit]
Risk: [Primary risk + mitigation]
First step: [Cheapest test to validate before full commitment]
Time to validation: [Days/weeks]
```

### 6.3 — Dependency & Sequencing Check

- Does Option A depend on any existing feature/data/service not yet built?
- Can experiments run in parallel?
- What's the critical path to first validated learning?

---

## Phase 7: Documentation & Handoff

### Report Output

Use naming pattern from `## Naming` section in injected context.

Create markdown summary report:

```markdown
# Brainstorm Session Report: [Topic]

## Session Context

- Scenario: [Problem-Solving / New Product / Enhancement]
- Role: [PO / BA / Mixed]
- Date: [YYYY-MM-DD]
- Input: [Original question/problem]

## Problem Statement

[POV format]

## Root Cause Analysis

[5 Whys or Fishbone — if Problem-Solving]

## Job Stories

1. [Job Story 1]
2. [Job Story 2]
3. [Job Story 3]

## HMW Questions

1. How might we...
2. How might we...

## Opportunity Map

[OST or Lean Canvas — per scenario]

## Raw Ideas Generated

[Total count: XX ideas across SCAMPER / Crazy 8s / Impact Mapping]

## Scored Shortlist (RICE)

| Rank | Idea | RICE | Kano | Effort | Priority    |
| ---- | ---- | ---- | ---- | ------ | ----------- |
| 1    | ...  | ...  | ...  | ...    | Must Have   |
| 2    | ...  | ...  | ...  | ...    | Should Have |

## Hypothesis Cards

### Top Recommendation: [Option Name]

- Problem Hypothesis: ...
- Value Hypothesis: ...
- Riskiest Assumption: ...
- Cheapest Test: ...
- Success Metric: ...

## Decision

[Recommendation + rationale]

## Next Steps

- [ ] [First concrete action]
- [ ] [Validation test]
- [ ] [Stakeholder alignment needed]
```

---

## Technique Quick Reference

| Technique                 | Phase | When to Use                        | Time-box |
| ------------------------- | ----- | ---------------------------------- | -------- |
| POV Statement             | P1    | Always                             | 10 min   |
| 5 Whys                    | P1    | Problem-solving scenario           | 15 min   |
| Fishbone                  | P1    | Systemic/complex problems          | 20 min   |
| JTBD / Job Stories        | P1    | New product or enhancement         | 20 min   |
| HMW Questions             | P1    | Always — bridge problem → ideation | 15 min   |
| Opportunity Solution Tree | P2    | Enhancement scenario               | 30 min   |
| Lean Canvas               | P2    | New product scenario               | 20 min   |
| Blue Ocean ERRC           | P2    | Differentiation needed             | 20 min   |
| Value Proposition Canvas  | P2    | Product-market fit unclear         | 25 min   |
| SCAMPER                   | P3    | Always — structured ideation       | 30 min   |
| Crazy 8s                  | P3    | Need quantity fast                 | 8 min    |
| Brainwriting 6-3-5        | P3    | Multi-stakeholder, async           | 30 min   |
| Impact Mapping            | P3    | Outcome-first thinking             | 30 min   |
| Analogical Thinking       | P3    | Novel/creative directions needed   | 15 min   |
| Dot Voting                | P4    | First-pass elimination             | 10 min   |
| RICE Scoring              | P4    | Always for prioritization          | 20 min   |
| Kano Model                | P4    | Feature classification             | 15 min   |
| 2×2 Effort/Impact         | P4    | Visual triage                      | 10 min   |
| MoSCoW                    | P4    | Release scoping                    | 15 min   |
| Problem Hypothesis        | P5    | Always before committing           | 15 min   |
| Value Hypothesis          | P5    | Always before committing           | 15 min   |
| Riskiest Assumption Test  | P5    | Before full build                  | 20 min   |
| Build-Measure-Learn       | P5    | Lean validation                    | 20 min   |

---

## Role-Specific Guidance

### PO Mode (Outcome Focus)

- Lead with: desired business outcome → opportunities → experiments
- Use: OST, Impact Mapping, RICE, Build-Measure-Learn
- Ask: "What behavior change do we need to see in users?"
- Resist: jumping to features before validating the outcome

### BA Mode (Requirements Focus)

- Lead with: stakeholder needs → process gaps → requirements
- Use: BABOK elicitation (interviews, workshops, document analysis), Fishbone, JTBD
- Ask: "What does the system need to do to enable that behavior?"
- Resist: over-specifying before the PO validates the opportunity

### Mixed PO + BA Mode

- PO owns: problem statement, opportunity framing, prioritization, hypothesis
- BA owns: requirements elicitation, acceptance criteria, edge cases, process mapping
- Handoff point: after Phase 4 (scored shortlist) → BA writes acceptance criteria per idea

---

## Collaboration Tools

- `planner` agent — research industry best practices for specific domain
- `docs-manager` agent — understand existing feature constraints and domain context
- `WebSearch` — market/competitor context for new product scenarios
- `docs-seeker` skill — latest documentation for external plugins/APIs
- `ai-multimodal` skill — analyze visual mockups, screenshots, competitor UIs
- `sequential-thinking` skill — complex problem decomposition requiring structured causal chains
- `web-research` skill — deep market research for greenfield or competitive analysis

---

## Scenario Cheat Sheets

### Scenario A: Problem-Solving

```
1. POV Statement → 2. 5 Whys / Fishbone → 3. HMW Questions
→ 4. SCAMPER on current solution → 5. RICE scoring
→ 6. Problem Hypothesis + RAT → 7. Recommend + cheapest test
```

### Scenario B: New Product

```
1. Job Stories (JTBD) → 2. Lean Canvas → 3. Blue Ocean ERRC
→ 4. HMW Questions → 5. Crazy 8s / Brainwriting
→ 6. Kano Classification → 7. Value Hypothesis + RAT → 8. MVP scope
```

### Scenario C: Feature Enhancement

```
1. Job Stories (JTBD) → 2. Opportunity Solution Tree
→ 3. HMW Questions → 4. SCAMPER on existing feature
→ 5. Impact Mapping → 6. RICE scoring → 7. 2×2 matrix
→ 8. Value Hypothesis + RAT → 9. Recommend + next experiment
```

---

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

- **DO NOT implement solutions** — brainstorm and advise only
- **DO validate hypotheses** before endorsing any approach
- **DO prioritize long-term maintainability** over short-term convenience
- **DO consider both technical excellence and business pragmatism**
- **DO produce a scored, ranked shortlist** — never just a flat idea list
- **DO always design the cheapest validation test** — RAT before full spec

---

## Workflow Integration

After brainstorm session concludes, use `AskUserQuestion` to present next steps:

| Next Step              | When                                                        | Skill/Workflow          |
| ---------------------- | ----------------------------------------------------------- | ----------------------- |
| `/idea`                | Capture top idea as backlog artifact                        | `idea` skill            |
| `/refine`              | Turn top idea into actionable PBI with AC                   | `refine` skill          |
| `/web-research`        | Need deeper market/competitor research first                | `web-research` skill    |
| `/plan`                | Problem is clear, solution is validated, ready to implement | `plan` skill            |
| `/design-spec`         | UI-heavy idea, need wireframes before spec                  | `design-spec` skill     |
| `/domain-analysis`     | Idea touches domain entities, need model first              | `domain-analysis` skill |
| Continue brainstorming | More scenarios to explore                                   | Stay in this session    |

---

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

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** detect scenario type FIRST — different scenarios use different technique sequences
- **MANDATORY IMPORTANT MUST ATTENTION** separate diverge (generate) and converge (evaluate) — NEVER mix them
- **MANDATORY IMPORTANT MUST ATTENTION** write a hypothesis card for every top-3 recommendation
- **MANDATORY IMPORTANT MUST ATTENTION** design cheapest validation test before recommending full implementation
- **MANDATORY IMPORTANT MUST ATTENTION** cite evidence for every claim — confidence >80% to recommend
- **MANDATORY IMPORTANT MUST ATTENTION** use `AskUserQuestion` for all user decisions — never auto-decide
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.
