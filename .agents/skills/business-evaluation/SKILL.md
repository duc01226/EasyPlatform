---
name: business-evaluation
description: '[Content] Use when a workflow step or the user asks for business viability: Business Model Canvas, financials, risks and go-to-market recommendation.'
---

> Codex compatibility note:
> - Invoke `$skill-name`: load the registered `.agents/skills/<name>/SKILL.md` and execute it with Codex tools; no separate `Skill` tool or Claude mode switch is needed. Author `.claude/**`; mirrors are generated.
> - Track steps before execution and keep progress/evidence current. Explicit skill requests execute their protocol. Use the native question tool for required questions.
> - Map foreign tool names to available host capabilities. A name mismatch needs no approval; an actually unavailable required capability stops with its step/evidence and a user question before adaptation.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Preserve protocol order unless the user approves a deviation. Workflows use `$start-workflow`: gates stay fixed; other steps may flex with logged reasons and evidence.
<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute declared steps in order. NEVER skip, reorder, or merge without explicit user approval.
> **[BLOCKING]** Before each step/sub-skill call, update todo tracking: set `in_progress` at start, `completed` at end.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools unavailable, maintain equivalent step tracker with same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Evaluate business idea viability; deliver evidence-backed viability verdict—score, confidence, Pursue/Pivot/Pause/Pass recommendation—grounded in complete 9-block BMC, 3-year financials + assumptions, 5+ risks with mitigation + residual risk, phased execution + GTM plan, so go/no-go rests on traced evidence, never optimism.

**Summary:**

- **Order:** Seven evaluation steps, preceded by a market-evidence precondition: load market evidence first, then run ALL 7 evaluation steps in order — detect idea/scope/evidence completeness; (1) capture idea (problem/solution/target), (2) 9-block BMC, (3) 3-year financials + assumptions, (4) 5+ risks + mitigation/residual risk, (5) phased execution, (6) GTM, (7) verdict. NEVER skip, reorder, or merge — why: partial evaluation invalidates the decision.
- **Market gate:** In workflow parent, read exact `MARKET_ANALYSIS_PATH` (`{plan-dir}/research/market-analysis.md` only copy fallback); standalone, use supplied path. If absent, state `$market-analysis` did not run, mark TAM/SAM/SOM, share, and segment size N/A, cap verdict confidence at 60%; NEVER re-derive sizing.
- **Evidence gate:** all 9 BMC blocks cite proof; every financial number has assumption + source; each 5+ risk has mitigation + residual risk; unbacked artifact fails.
- **Decision/output:** verdict = 1-10 score + confidence tier (95/80/60/<60%) + basis + Pursue/Pivot/Pause/Pass + key success condition; write to `docs/knowledge/strategy/business/{descriptive-slug}.md` via enforced `.claude/templates/business-evaluation-template.md`, then `ask user question tool` for next route (domain-analysis recommended); NEVER auto-decide, favor skepticism.

**Workflow:**

**Before evaluation — detect + reason:** classify supplied idea, scope, and market evidence as present, missing, or ambiguous; for each step run focused `Think: evidence / economics / execution / decision` passes. Derive concerns from idea + evidence; required blocks/categories guide coverage, not checklist recitation.

**Precondition — load market analysis:** In `workflow-research` business-eval mode, read exact parent-provided `MARKET_ANALYSIS_PATH` (`{plan-dir}/research/market-analysis.md` only copy fallback); in another workflow, read the exact path `market-analysis` returned in this run (or its `{plan-dir}/research/market-analysis.md` copy); standalone, use explicitly supplied path.
**Absent → do NOT re-derive:** state `$market-analysis` did not run; mark every market-sizing figure (TAM/SAM/SOM, share, segment size) N/A with that reason; cap verdict confidence at 60%.

1. **Capture idea** — Problem, solution, target customer
2. **Business Model Canvas** — All 9 blocks with evidence
3. **Financial projections** — 3-year revenue, costs, break-even
4. **Risk assessment** — 5+ risks with mitigation
5. **Execution plan** — 3 phases with milestones
6. **Go-to-market** — Launch, channels, pricing rationale
7. **Verdict** — Viability score, confidence, recommendation

**Key Rules:**

- Require all 9 BMC blocks; each cites evidence
- Financial projections require explicit assumptions table
- Require ≥5 risks, each with mitigation AND residual risk
- Verdict requires evidence + confidence declaration
- Inside a delivery or product workflow (not `workflow-research`, whose `knowledge-review` gate covers this), when the verdict feeds a go/no-go, run knowledge-review's core rows (citation, calibration, cross-validation) on the business case before presenting the decision; see Output
- **Risk profile:** analysis. Fresh-eyes review, specialist routing, inline sub-agent protocols, and recursive quality loops: N/A — not required by this target contract; this skill does not delegate or own fix convergence.

**Be skeptical; apply critical/sequential thinking. Every claim needs traced proof + confidence percentage (Idea should be more than 80%).**

## Contents

- [Quick Summary](#quick-summary)
- [Business Evaluation](#business-evaluation)
- [Step 1: Capture the Idea](#step-1-capture-the-idea)
- [Step 2: Business Model Canvas](#step-2-business-model-canvas)
- [Step 3: Financial Projections (3 Years)](#step-3-financial-projections-3-years)
- [Step 4: Risk Assessment](#step-4-risk-assessment)
- [Step 5: Execution Plan](#step-5-execution-plan)
- [Step 6: Go-to-Market](#step-6-go-to-market)
- [Step 7: Verdict](#step-7-verdict)
- [Output](#output)
- [Next Steps](#next-steps)
- [Prompt-Enhance Closing Anchors](#prompt-enhance-closing-anchors)
- [Closing Reminders](#closing-reminders)

# Business Evaluation

## Step 1: Capture the Idea

Extract from user input:

- **One-liner** — Elevator pitch in 1 sentence
- **Problem** — What pain point does it solve?
- **Solution** — How does it solve it?
- **Target customer** — Who specifically benefits?

## Step 2: Business Model Canvas

Require all 9 blocks:

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

Every number lists its assumption + source.

## Step 4: Risk Assessment

Require ≥5 risks:

| Risk | Likelihood | Impact | Mitigation | Residual Risk |
| ---- | ---------- | ------ | ---------- | ------------- |

Consider market, execution, financial, competitive, regulatory, technical.

## Step 5: Execution Plan

| Phase          | Timeline    | Focus                     | Key Milestones             |
| -------------- | ----------- | ------------------------- | -------------------------- |
| **Validation** | 0-3 months  | Customer discovery, MVP   | N interviews, prototype    |
| **Build**      | 3-6 months  | Core product, early users | Beta launch, first revenue |
| **Growth**     | 6-12 months | Scale, optimize           | Revenue target, team size  |

## Step 6: Go-to-Market

- **Launch strategy** — How to enter market
- **Initial channels** — Top 3 acquisition channels
- **Pricing strategy** — Model + rationale + competitive comparison

## Step 7: Verdict

- **Viability score:** 1-10 with rationale
- **Confidence:** 95%/80%/60%/<60% with evidence basis
- **Recommendation:** Pursue | Pivot | Pause | Pass
- **Key condition:** What must be true for this to succeed?

## Output

Write to `docs/knowledge/strategy/business/{descriptive-slug}.md` using enforced template from `.claude/templates/business-evaluation-template.md`.

**Business-case check before a go/no-go:** when this skill runs inside a delivery or product workflow (for example `workflow-big-feature` or `workflow-greenfield-init`) and the verdict feeds that workflow's go/no-go, run the core rows of `.claude/skills/knowledge-review/SKILL.md` on the written business case before presenting the decision: checklist 2 Citation Audit, 3 Confidence Accuracy and 6 Cross-Validation. Run one read-only pass, fix each failed row in the artifact (or lower the confidence it overstates), then present the verdict with the check result. Inside `workflow-research` its `knowledge-review` gate reviews the artifact instead; standalone runs skip this check.

---

## Next Steps

> **Inside a workflow:** when this skill runs as a step of an active workflow, skip the prompts in this section and return the result — the workflow's next step decides what runs (`$start-workflow` → Step Execution Protocol, Workflow-step mode).

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** After completion, use `ask user question tool` to present these options. Do NOT skip because the task seems "simple" or "obvious"—the user decides:

- **"$domain-analysis (Recommended)"** — Analyze domain model from business evaluation
- **"$plan"** — If ready to plan implementation
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use todo tracking to split ALL work into small tasks BEFORE starting.

> **External Memory:** For complex/lengthy research, analysis, scans, or reviews, write intermediate findings + final results to `tmp/reports/`—preserves context and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION—every claim, finding, and recommendation requires `file:line` proof or traced evidence + confidence percentage (>80% act; <80% verify first).

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval; inside a workflow run, `$start-workflow` → Workflow-step mode bounds this
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Evaluate business idea viability; deliver evidence-backed viability verdict—score, confidence, Pursue/Pivot/Pause/Pass recommendation—grounded in complete 9-block BMC, 3-year financials + assumptions, 5+ risks with mitigation + residual risk, phased execution + GTM plan, so go/no-go rests on traced evidence, never optimism.

**IMPORTANT MUST ATTENTION** every claim, financial number, BMC block, and verdict carries evidence + confidence % (95/80/60/<60) — NEVER present a guess as fact — why: an unbacked number turns the go/no-go into optimism dressed as analysis.
**IMPORTANT MUST ATTENTION** bias toward skepticism on the verdict — NEVER round optimism up; surface the single key condition that must hold and the residual risk if it fails — why: a falsely-rosy Pursue burns capital that an honest Pause would save.
**IMPORTANT MUST ATTENTION** validate the next route with user via `ask user question tool` — NEVER auto-decide domain-analysis/plan — why: this skill judges viability, the human owns the go/no-go.

**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using todo tracking BEFORE starting; keep one `in_progress`, mark `completed` with evidence; add a final review todo — why: untracked multi-step work loses state on compaction.
**MANDATORY IMPORTANT MUST ATTENTION** consume market data FROM market-analysis as evidence — NEVER re-derive market sizing here; if that producer did not run, mark the market figures N/A with the reason and cap verdict confidence at 60% rather than inventing them — why: this skill judges viability, it does not research the market; duplicated sizing diverges from the source.
**MANDATORY IMPORTANT MUST ATTENTION** all 9 BMC blocks present, each citing proof; every financial number lists its assumption + source in the assumptions table — why: a missing block or bare number is a silent gap the verdict then rests on.
**MANDATORY IMPORTANT MUST ATTENTION** minimum 5 risks, each with mitigation AND a residual-risk entry across market/execution/financial/competitive/regulatory/technical — why: a risk without residual pretends mitigation is total.
**MANDATORY IMPORTANT MUST ATTENTION** detect idea/scope/evidence completeness; load exact market-analysis evidence first (parent `MARKET_ANALYSIS_PATH`; `{plan-dir}/research/market-analysis.md` copy fallback; supplied standalone path; absent → market figures N/A + confidence cap 60%); then run ALL 7 steps in order: idea → 9-block BMC → 3-year financials → 5+ risks → 3-phase execution → GTM → verdict; output via template; `ask user question tool` for next route. NEVER re-derive sizing, skip/reorder/merge steps, drop financials/execution/GTM, or auto-decide — why: verdict quality follows the weakest step/evidence.
**MANDATORY IMPORTANT MUST ATTENTION** before writing any figure or claim, search market-analysis output + prior evaluations for 3+ comparable patterns and cite them — why: a number with no comparable anchor is a fabrication.
**MANDATORY IMPORTANT MUST ATTENTION** inside a delivery or product workflow whose go/no-go rests on this verdict, run knowledge-review checklists 2, 3 and 6 (citation, calibration, cross-validation) on the written business case and fix failed rows before presenting the decision — why: those workflows run no `knowledge-review` gate on the artifact the build decision rests on.
**MANDATORY IMPORTANT MUST ATTENTION** write the result to `docs/knowledge/strategy/business/{descriptive-slug}.md` via the enforced `.claude/templates/business-evaluation-template.md` — NEVER hand-roll the structure — why: the template is the contract downstream skills (domain-analysis/plan) read.
**MANDATORY IMPORTANT MUST ATTENTION** persist intermediate findings to `tmp/reports/` for lengthy evaluations — why: external memory survives context loss and serves as the deliverable.

**Anti-Rationalization:**

| Evasion                                  | Rebuttal                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------- |
| "Idea is obviously viable, skip rigor"   | Optimism is not evidence. Run all 9 blocks + financials + risks anyway.               |
| "Skip a BMC block — not relevant"        | Every block cites proof or states why N/A explicitly; silent omission fails the gate. |
| "Estimate the number, source it later"   | No assumption + source = no number. Fill the assumptions table before the verdict.    |
| "5 risks is a lot, 2 covers it"          | Minimum 5, each with residual risk. Thin risk lists hide the real downside.           |
| "Recommendation is clear, skip the ask"  | Still `ask user question tool` for the next route — the human owns go/no-go.                  |

**IMPORTANT MUST ATTENTION** evidence + confidence % on every number — NEVER present a guess as fact. **IMPORTANT MUST ATTENTION** bias toward skepticism — NEVER round optimism up. **IMPORTANT MUST ATTENTION** `ask user question tool` for the next route — NEVER auto-decide.
