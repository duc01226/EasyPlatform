---
name: business-evaluation
version: 1.0.0
description: '[Content] Use when you need to evaluate business idea viability: Business Model Canvas, financial projections, risk matrix, go-to-market, execution plan.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Evaluate business idea viability to deliver an evidence-backed viability verdict — score + confidence + Pursue/Pivot/Pause/Pass recommendation — grounded in a complete 9-block BMC, 3-year financials with stated assumptions, 5+ risks with mitigation, and a phased execution + GTM plan, so the go/no-go decision rests on traced evidence, never optimism.

**Summary:**

- Runs after market-analysis: pull its market data in as evidence rather than re-deriving market sizing here — this skill judges viability, it does not research the market.
- Every artifact is evidence-gated — all 9 BMC blocks cite proof, every financial number carries an assumption + source, and each of the 5+ risks needs mitigation AND a residual-risk entry; an unbacked number or block fails the gate.
- The verdict is the load-bearing output: a 1-10 viability score, an explicit confidence tier (95/80/60/<60%) with its evidence basis, a Pursue/Pivot/Pause/Pass call, and the single key condition that must hold to succeed — bias toward skepticism, never optimism.
- Write the result to `docs/knowledge/strategy/business/{slug}.md` via the enforced `.claude/templates/business-evaluation-template.md`, then use `AskUserQuestion` to route next (domain-analysis recommended) — never auto-decide.

**Workflow:**

1. **Capture idea** — Problem, solution, target customer
2. **Load market analysis** — Market data from market-analysis
3. **Business Model Canvas** — All 9 blocks with evidence
4. **Financial projections** — 3-year revenue, costs, break-even
5. **Risk assessment** — 5+ risks with mitigation
6. **Execution plan** — 3 phases with milestones
7. **Verdict** — Viability score, confidence, recommendation

**Key Rules:**

- All 9 BMC blocks required, each with evidence
- Financial projections: explicit assumptions table
- Minimum 5 risks with mitigation AND residual risk
- Verdict must be evidence-backed with confidence declaration

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Business Evaluation

## Step 1: Capture the Idea

From user input, extract:

- **One-liner** — Elevator pitch in 1 sentence
- **Problem** — What pain point does it solve?
- **Solution** — How does it solve it?
- **Target customer** — Who specifically benefits?

## Step 2: Business Model Canvas

All 9 blocks required:

| Block                      | Key Question                      | Evidence Required    |
| -------------------------- | --------------------------------- | -------------------- |
| **Customer Segments**      | Who are we serving?               | Market research      |
| **Value Propositions**     | What value do we deliver?         | Customer pain points |
| **Channels**               | How do we reach customers?        | Channel analysis     |
| **Customer Relationships** | How do we maintain relationships? | Retention strategy   |
| **Revenue Streams**        | How do we make money?             | Pricing research     |
| **Key Resources**          | What do we need?                  | Resource assessment  |
| **Key Activities**         | What must we do?                  | Operational analysis |
| **Key Partnerships**       | Who helps us?                     | Partner landscape    |
| **Cost Structure**         | What does it cost?                | Cost analysis        |

## Step 3: Financial Projections (3 Years)

### Revenue Model

| Year | Users/Customers | ARPU | Revenue | Growth |
| ---- | --------------- | ---- | ------- | ------ |

### Cost Structure

| Category | Y1  | Y2  | Y3  |
| -------- | --- | --- | --- |

### Break-Even

- **Monthly burn:** ${X}
- **Break-even point:** Month/Year
- **Funding needed:** ${X}

### Assumptions Table

Every number must list its assumption and source.

## Step 4: Risk Assessment

Minimum 5 risks:

| Risk | Likelihood | Impact | Mitigation | Residual Risk |
| ---- | ---------- | ------ | ---------- | ------------- |

Categories to consider: market, execution, financial, competitive, regulatory, technical.

## Step 5: Execution Plan

| Phase          | Timeline    | Focus                     | Key Milestones             |
| -------------- | ----------- | ------------------------- | -------------------------- |
| **Validation** | 0-3 months  | Customer discovery, MVP   | N interviews, prototype    |
| **Build**      | 3-6 months  | Core product, early users | Beta launch, first revenue |
| **Growth**     | 6-12 months | Scale, optimize           | Revenue target, team size  |

## Step 6: Go-to-Market

- **Launch strategy** — How to enter the market
- **Initial channels** — Top 3 acquisition channels
- **Pricing strategy** — Model + rationale + competitive comparison

## Step 7: Verdict

- **Viability score:** 1-10 with rationale
- **Confidence:** 95%/80%/60%/<60% with evidence basis
- **Recommendation:** Pursue | Pivot | Pause | Pass
- **Key condition:** What must be true for this to succeed?

## Output

Write to `docs/knowledge/strategy/business/{descriptive-slug}.md` using enforced template from `.claude/templates/business-evaluation-template.md`.

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/domain-analysis (Recommended)"** — Analyze domain model from business evaluation
- **"/plan"** — If ready to plan implementation
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

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

**IMPORTANT MUST ATTENTION Goal:** Deliver an evidence-backed viability verdict — score + confidence + Pursue/Pivot/Pause/Pass recommendation — grounded in a complete 9-block BMC, 3-year financials with stated assumptions, 5+ risks with mitigation, and a phased execution + GTM plan, so the go/no-go decision rests on traced evidence, never optimism.

**MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** traced `file:line` proof, confidence >80% to act, NEVER guess as fact.

**IMPORTANT MUST ATTENTION** every claim, financial number, BMC block, and verdict carries evidence + confidence % (95/80/60/<60) — NEVER present a guess as fact — why: an unbacked number turns the go/no-go into optimism dressed as analysis.
**IMPORTANT MUST ATTENTION** bias toward skepticism on the verdict — NEVER round optimism up; surface the single key condition that must hold and the residual risk if it fails — why: a falsely-rosy Pursue burns capital that an honest Pause would save.
**IMPORTANT MUST ATTENTION** validate the next route with user via `AskUserQuestion` — NEVER auto-decide domain-analysis/plan — why: this skill judges viability, the human owns the go/no-go.

**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting; keep one `in_progress`, mark `completed` with evidence; add a final review todo — why: untracked multi-step work loses state on compaction.
**MANDATORY IMPORTANT MUST ATTENTION** consume market data FROM market-analysis as evidence — NEVER re-derive market sizing here — why: this skill judges viability, it does not research the market; duplicated sizing diverges from the source.
**MANDATORY IMPORTANT MUST ATTENTION** all 9 BMC blocks present, each citing proof; every financial number lists its assumption + source in the assumptions table — why: a missing block or bare number is a silent gap the verdict then rests on.
**MANDATORY IMPORTANT MUST ATTENTION** minimum 5 risks, each with mitigation AND a residual-risk entry across market/execution/financial/competitive/regulatory/technical — why: a risk without residual pretends mitigation is total.
**MANDATORY IMPORTANT MUST ATTENTION** before writing any figure or claim, search market-analysis output + prior evaluations for 3+ comparable patterns and cite them — why: a number with no comparable anchor is a fabrication.
**MANDATORY IMPORTANT MUST ATTENTION** write the result to `docs/knowledge/strategy/business/{slug}.md` via the enforced `.claude/templates/business-evaluation-template.md` — NEVER hand-roll the structure — why: the template is the contract downstream skills (domain-analysis/plan) read.
**MANDATORY IMPORTANT MUST ATTENTION** persist intermediate findings to `plans/reports/` for lengthy evaluations — why: external memory survives context loss and serves as the deliverable.

**Anti-Rationalization:**

| Evasion                                 | Rebuttal                                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------- |
| "Idea is obviously viable, skip rigor"  | Optimism is not evidence. Run all 9 blocks + financials + risks anyway.               |
| "Skip a BMC block — not relevant"       | Every block cites proof or states why N/A explicitly; silent omission fails the gate. |
| "Estimate the number, source it later"  | No assumption + source = no number. Fill the assumptions table before the verdict.    |
| "5 risks is a lot, 2 covers it"         | Minimum 5, each with residual risk. Thin risk lists hide the real downside.           |
| "Recommendation is clear, skip the ask" | Still `AskUserQuestion` for the next route — the human owns go/no-go.                 |

**IMPORTANT MUST ATTENTION** evidence + confidence % on every number — NEVER present a guess as fact. **IMPORTANT MUST ATTENTION** bias toward skepticism — NEVER round optimism up. **IMPORTANT MUST ATTENTION** `AskUserQuestion` for the next route — NEVER auto-decide.
