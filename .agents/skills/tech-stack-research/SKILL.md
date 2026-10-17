---
name: tech-stack-research
description: '[Architecture] Use when a workflow step or the user asks for tech-stack research: alternatives, trade-offs and user-validated recommendations.'
---

> Codex compatibility note:
> - Invoke `$skill-name`: load the registered `.agents/skills/<name>/SKILL.md` and execute it with Codex tools; no separate `Skill` tool or Claude mode switch is needed. Author `.claude/**`; mirrors are generated.
> - Track steps before execution and keep progress/evidence current. Explicit skill requests execute their protocol. Use the native question tool for required questions.
> - Map foreign tool names to available host capabilities. A name mismatch needs no approval; an actually unavailable required capability stops with its step/evidence and a user question before adaptation.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Preserve protocol order unless the user approves a deviation. Workflows use `$start-workflow`: gates stay fixed; other steps may flex with logged reasons and evidence.
<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval. Inside a workflow run, `$start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Deliver a user-confirmed tech stack for every required layer, backed by researched alternatives, weighted evidence, and confidence, so the team chooses fit for scale, budget, skills, and timeline—not familiarity.

**Summary:**

- **Purpose:** act as solution architect—load business/domain/task context, derive constraints, research current options, compare fit, and record only user-confirmed decisions.
- **Ordered path:** (1) load context → (2) derive requirements + `ask user question tool` confirmation → (3) classify layer applicability and WebSearch unresolved required layers (2–3 viable alternatives; bounded searches) → (4) compare → (5) score/rank each layer with confidence % → (6) write `{plan-dir}/research/tech-stack-comparison.md` (<=200 lines) → (7) end interview (5-8 questions) and write `status: confirmed` to `{plan-dir}/phase-02-tech-stack.md`.
- **Evidence gates:** cite a URL, benchmark, or case study for every claim/recommendation; score 8 criteria with High=3x/Medium=2x/Low=1x; NEVER choose by familiarity.
- **Follow-up modes:** after Step 7, separate `ask user question tool` offers `$architecture --mode=design` (Recommended), `$plan` if architecture is decided, or skip; a second council prompt offers skip (Recommended) or `$llm-council` (11 sub-agents) for close scores or unfamiliar/strategic dependencies.

**Workflow:**

1. **Load Business Context** — Read the prior business evaluation from `docs/knowledge/strategy/business/`, where `business-evaluation` writes it (a supplied path wins), and the domain/ERD, refined task, and discovery notes from the plans and team-artifacts roots (defaults `plans/` and `team-artifacts/`; `docsRoots.plans.path` / `docsRoots.teamArtifacts.path` in `docs/project-config.json` override them).
2. **Derive Technical Requirements** — Map signals to constraints; confirm via `ask user question tool`.
3. **Research Per Layer** — Research only unresolved required layers; compare 2–3 viable alternatives within the agreed query budget.
4. **Deep Compare** — Build pros/cons matrices with benchmarks, community health, and team fit.
5. **Score & Rank** — Apply weighted scoring across 8 criteria to open required layers; rank with confidence %.
6. **Generate Report** — Write the structured, <=200-line comparison report with recommendation.
7. **User Validation** — Present findings, ask 5-8 questions, record confirmed choices; then run the separate Next Steps and council prompts.

**Key Rules:**

- **AI surface?** Only if the stack adds a model provider, agent framework, vector store or eval tool (see `node .claude/scripts/ai-signal-scan.cjs`): read `.claude/skills/shared/protocols/ai-feature-framing-gate.md`; verify model and provider facts against current provider docs, never memory; otherwise skip this line.
- **MANDATORY IMPORTANT MUST ATTENTION** research 2–3 viable options per unresolved required layer; fixed or absent layers carry evidence-backed N/A
- **MANDATORY IMPORTANT MUST ATTENTION** include confidence % with evidence for every recommendation
- **MANDATORY IMPORTANT MUST ATTENTION** run user validation interview at end (NEVER skip)
- All claims must cite sources (URL, benchmark, case study)
- Tier every source; a decision-critical claim needs 2+ independent sources, else `single source, unverified` below 60%; at most 10 searches and 8 fetches per pass
- Recommend on benchmarked evidence (URL, benchmark, case study); NEVER on familiarity alone

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Contents

- [Quick Summary](#quick-summary)
- [Step 1: Load Business Context](#step-1-load-business-context)
- [Step 2: Derive Technical Requirements](#step-2-derive-technical-requirements)
- [Step 3: Research Per Stack Layer](#step-3-research-per-stack-layer)
- [Step 4: Deep Comparison Matrix](#step-4-deep-comparison-matrix)
- [Step 5: Weighted Score & Ranking](#step-5-weighted-score--ranking)
- [Step 6: Generate Report](#step-6-generate-report)
- [Step 7: User Validation Interview](#step-7-user-validation-interview)
- [Output](#output)
- [Next Steps](#next-steps)
- [Prompt-Enhance Closing Anchors](#prompt-enhance-closing-anchors)
- [Closing Reminders](#closing-reminders)

## Step 1: Load Business Context

Read artifacts from prior workflow steps. The business evaluation is at `docs/knowledge/strategy/business/{descriptive-slug}.md`, where `business-evaluation` writes it: use the path the workflow or user supplies, else the evaluation for this product or initiative in that folder; when none exists, record `business evaluation: not run` and confirm its signals in Step 2. Search the plans and team-artifacts roots (defaults `plans/` and `team-artifacts/`; `docsRoots.plans.path` / `docsRoots.teamArtifacts.path` in `docs/project-config.json` override them) for the others:

- Business evaluation report (viability, scale, constraints)
- Domain model / ERD (complexity, entity count, relationships)
- Refined task (acceptance criteria, scope)
- Discovery interview notes (team skills, budget, timeline)

Extract and summarize:

| Signal                 | Value        | Source              |
| ---------------------- | ------------ | ------------------- |
| Expected users         | ...          | discovery interview |
| Domain complexity      | Low/Med/High | domain model        |
| Team skills            | ...          | discovery interview |
| Budget constraint      | ...          | business evaluation |
| Timeline               | ...          | business evaluation |
| Compliance needs       | ...          | business evaluation |
| Real-time needs        | Yes/No       | refined task         |
| Integration complexity | Low/Med/High | domain model        |

## Step 2: Derive Technical Requirements

Map business signals to technical requirements:

| Business Signal    | Technical Requirement                           | Priority |
| ------------------ | ----------------------------------------------- | -------- |
| High user scale    | Horizontal scaling, connection pooling          | Must     |
| Complex domain     | Strong type system, ORM with migrations         | Must     |
| Real-time features | WebSocket/SSE support, event-driven arch        | Must     |
| Small team         | Low learning curve, good DX, batteries-included | Should   |
| Tight budget       | Open-source, low hosting cost                   | Should   |
| Compliance         | Audit trail, encryption, auth framework         | Must     |

**MANDATORY IMPORTANT MUST ATTENTION** validate derived requirements with user via `ask user question tool` before proceeding to research.

## Step 3: Research Per Stack Layer

Before searching, record an applicability table for the candidate layers below: `OPEN-REQUIRED`, `FIXED`, or `N/A`, with the requirement/decision evidence and owner. These are candidates, not mandatory product components. A CLI or library may need no frontend, database, broker, hosted infrastructure, or authentication; do not invent those requirements. Respect confirmed existing stack constraints; reopen a FIXED choice only when new evidence invalidates its premise and the owner agrees.

For each OPEN-REQUIRED layer, compare 2–3 viable alternatives (include the current/simple option). If constraints leave fewer, record the eliminated candidates and evidence rather than manufacture options. FIXED and N/A layers remain in the report with rationale but need no alternatives or search quota.

Set a total search cap before searching: default at most 10 queries for this pass across all open layers, prioritizing consequential uncertainty; there is no per-layer minimum. Reuse relevant verified evidence. Stop when decision-critical claims have sufficient current authoritative support; do not pad searches. If the cap leaves a consequential uncertainty, record the gap and ask the user to authorize a bounded additional pass specifying its question and cap. Never silently multiply the cap by layer or subtopic.

**Source rules (the `web-research` evidence bar):** classify every source Tier 1 (official docs, peer-reviewed) > Tier 2 (industry reports, major publications) > Tier 3 (established blogs, verified experts; cross-validate) > Tier 4 (forums, personal blogs, social media; never cite as fact). A decision-critical claim (performance, scale limit, cost, licence, security record) needs 2+ independent sources; a claim with one source is marked `single source, unverified` and held below 60% confidence. Read benchmarks and case studies with at most 8 `WebFetch` calls in this pass; the bounded additional pass above covers fetches too.

### Stack Layers to Evaluate

| Layer                  | Example Options                 | Research Focus                        |
| ---------------------- | ------------------------------- | ------------------------------------- |
| **Backend Framework**  | Candidate backend runtimes/frameworks | Performance, type safety, ecosystem   |
| **Frontend Framework** | Candidate frontend frameworks         | DX, ecosystem, hiring, enterprise fit |
| **Database**           | Candidate database engines/stores      | Scale, query complexity, cost         |
| **Messaging/Events**   | Candidate messaging/event systems      | Throughput, reliability, complexity   |
| **Infrastructure**     | Docker+K8s, Serverless, PaaS    | Cost, ops overhead, scaling           |
| **Auth**               | Keycloak, Auth0, custom         | Cost, compliance, flexibility         |

### Candidate WebSearch Queries (select only those resolving uncertainty)

```
"{option_A} vs {option_B} {current_year} comparison"
"{option} enterprise production case studies"
"{option} community size github stars"
"{option} performance benchmarks {use_case}"
"{option} security track record vulnerabilities"
```

## Step 4: Deep Comparison Matrix

For each OPEN-REQUIRED layer, produce a comparison table; record FIXED and N/A layers by rationale only:

| Criteria             | Option A          | Option B | Option C | Weight |
| -------------------- | ----------------- | -------- | -------- | ------ |
| **Team Fit**         | score + rationale | ...      | ...      | High   |
| **Scalability**      | score + rationale | ...      | ...      | High   |
| **Time-to-Market**   | score + rationale | ...      | ...      | High   |
| **Ecosystem/Libs**   | score + rationale | ...      | ...      | Medium |
| **Hiring Market**    | score + rationale | ...      | ...      | Medium |
| **Cost (hosting)**   | score + rationale | ...      | ...      | Medium |
| **Learning Curve**   | score + rationale | ...      | ...      | Medium |
| **Community Health** | score + rationale | ...      | ...      | Low    |

Scoring: 1-5 scale. Weight: High=3x, Medium=2x, Low=1x.

### Per-Option Detail Block

For each option, document:

```markdown
### {Layer}: {Option Name}

**Pros:**

- {Pro 1} — {evidence/source}
- {Pro 2} — {evidence/source}
- {Pro 3} — {evidence/source}

**Cons:**

- {Con 1} — {evidence/source}
- {Con 2} — {evidence/source}

**Best suited when:** {conditions}
**Not suitable when:** {conditions}
**Production examples:** {2-3 real companies using this}
```

## Step 5: Weighted Score & Ranking

Calculate weighted total per option per OPEN-REQUIRED layer. Present ranking:

```markdown
### {Layer} Ranking

1. **{Option A}** — Score: {X}/100 — Confidence: {Y}%
2. **{Option B}** — Score: {X}/100 — Confidence: {Y}%
3. **{Option C}** — Score: {X}/100 — Confidence: {Y}%

**Recommendation:** {Option A}
**Why:** {2-3 sentence rationale linking to team skills, scale, and constraints}
```

## Step 6: Generate Report

Write report to `{plan-dir}/research/tech-stack-comparison.md` with:

1. Executive summary (recommended applicable stack in 5 lines)
2. Technical requirements and layer applicability table (from Steps 2–3), including the query and fetch caps, queries and fetches used, single-source claims and unresolved evidence gaps
3. Per-layer comparison matrices (from Step 4)
4. Per-layer rankings with recommendations (from Step 5)
5. Combined recommended stack diagram
6. Risk assessment for recommended stack
7. Alternative stack (second-best combo) for comparison
8. Unresolved questions

Report must be **<=200 lines**. Use tables over prose.

## Step 7: User Validation Interview

> **Decision log:** inside a workflow, read the run's `## Decisions` first (`$start-workflow` → Step Execution Protocol, Decision log): ask only what it leaves open or new evidence reopened, cite reused answers instead of asking again, and append every new answer.

**MANDATORY IMPORTANT MUST ATTENTION** present findings and ask 5-8 questions via `ask user question tool`. With fewer genuine open decisions, ask those and say so; never pad, and never re-ask an answer the run's decision log holds.

### Required Questions

1. **Per-layer recommendation confirmation** — "For {layer}, I recommend {option}. Agree?"
    - Options: Agree (Recommended) | Prefer {option B} | Need more research
2. **Risk tolerance** — "The recommended stack has {risk}. Acceptable?"
3. **Team readiness** — "Team needs to learn {X}. Training plan needed?"
4. **Budget alignment** — "Estimated infra cost: ${X}/month. Within budget?"
5. **Timeline fit** — "This stack enables MVP in {X} months. Acceptable?"

### Optional Deep-Dive Questions (pick 2-3 based on context)

- "Should we consider {emerging tech} for {layer}?"
- "Any compliance requirements I haven't captured?"
- "Preference for managed services vs self-hosted?"
- "Monorepo or polyrepo for this team size?"

After user confirms, update report with final decisions, mark `status: confirmed`.

## Output

```
{plan-dir}/research/tech-stack-comparison.md    # Full comparison report
{plan-dir}/phase-02-tech-stack.md               # Final confirmed tech stack decisions
```

---

**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using todo tracking BEFORE starting.
**MANDATORY IMPORTANT MUST ATTENTION** validate EVERY recommendation with user via `ask user question tool` — NEVER auto-decide.
**MANDATORY IMPORTANT MUST ATTENTION** include confidence % and evidence citations for all claims.
**MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality.

---

## Next Steps

> **Inside a workflow:** when this skill runs as a step of an active workflow, skip the prompts in this section and return the result — the workflow's next step decides what runs (`$start-workflow` → Step Execution Protocol, Workflow-step mode).

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `ask user question tool` to present these options. Do NOT skip because task seems "simple"/"obvious" — the user decides:

- **"$architecture --mode=design (Recommended)"** — Design solution architecture with chosen tech stack
- **"$plan"** — If architecture already decided
- **"Skip, continue manually"** — user decides

### Council escalation (always-offer, second prompt)

After the existing `## Next Steps` prompt above resolves, present a **second**, independent `ask user question tool` call:

- **"Skip council — proceed with chosen stack (Recommended)"** — Continue with the selected tech stack as-is.
- **"Escalate to $llm-council"** — Run 11 sub-agent council. Best applied when 2+ stacks score within 15% on the comparison matrix or you have unfamiliar/strategic dependencies. Cheaper alternatives: `$why-review`, `$plan --mode=validate`.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `engineering-foundation-gate` — Seven engineering-foundation dimensions judged by project profile; creating or reviewing how a project is built, run, tested or checked → .claude/skills/shared/protocols/engineering-foundation-gate.md
- `measured-capacity-engineering` — Model demand, reduce measured work safely and prove capacity before scaling; planning, building, testing or reviewing hot paths, caches or capacity → .claude/skills/shared/protocols/measured-capacity-engineering.md
- `scale-technique-gate` — Which scale techniques a system warrants, and which it does not; reviewing architecture or production readiness → .claude/skills/shared/protocols/scale-technique-gate.md
- `scenario-stress-eval` — Judge the system under concrete failure and load scenarios; evaluating resilience or production readiness → .claude/skills/shared/protocols/scenario-stress-eval.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:scale-technique-gate:reminder -->

**IMPORTANT MUST ATTENTION** scale-technique gate: derive the scale tier from evidence FIRST (T0 internal · T1 <10k · T2 10k–1M · T3 millions+), then judge each warranted technique `PRESENT`/`MISSING-WARRANTED`/`N/A-by-scale`/`OVER-ENGINEERED`. Advise on warranted-but-missing gaps AND advise AGAINST unwarranted heavyweight techniques (anti-over-engineering). **ADVICE-ONLY — emit the Technique Applicability Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.** Full catalog → `.claude/docs/scale-technique-catalog.md` (authoritative for tier thresholds & per-technique warranting tiers — on any change update the catalog FIRST, then re-run `inject_scale_technique_gate.py`).

<!-- /SYNC:scale-technique-gate:reminder -->

<!-- SYNC:scenario-stress-eval:reminder -->

**IMPORTANT MUST ATTENTION** scenario-stress gate: reuse the scale tier `T0`–`T3` AND derive business-criticality `B0`–`B3` from evidence first — apply the **criticality-signal floor** (regulated/PII/financial/health data · money movement · auth/identity · legal-compliance → at least `B2` even absent SLA docs; do NOT default to `B3`). Select only the scenarios the `B`/`T` combination warrants, then walk each (simulate → trace → failure signature → self-heal/MTTR → trade-off) and assign `WITHSTANDS`/`DEGRADES-GRACEFULLY`/`FAILS-HARD`/`N/A-by-business`/`OVER-HARDENED`. Anti-over-engineering is first-class (a lean system that needs no HA/DR is a PASS) AND symmetric (never under-harden a `B2`+ system for low traffic). **ADVICE-ONLY — emit the Scenario Stress Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.** Full catalog → `.claude/docs/scenario-stress-catalog.md` (authoritative for scenarios/verdicts/business-tiers — on any change update the catalog FIRST, then re-run `inject_scenario_stress_gate.py`; scale tier stays single-sourced in `scale-technique-catalog.md`).

<!-- /SYNC:scenario-stress-eval:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

- **IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval; inside a workflow run, `$start-workflow` → Workflow-step mode bounds this
- **IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
- **IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
- **IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:engineering-foundation-gate:reminder -->

**IMPORTANT MUST ATTENTION** evidence-backed lifecycle/scale/criticality/repo/runtime profile; unknowns take lower tiers. Judge all 7 outcomes: **F1** reproducible build/run/test · **F2** exercise supported/required modes; dual modes only when warranted · **F3** applicable local/CI/production-shaped test portability · **F4** test-strength proof; no universal mutation tool · **F5** measured performance at warranted scale/risk · **F6** build/change scalability at meaningful module boundaries · **F7** stack/profile-fit mechanical checks. Evidence-backed `N/A-by-profile` is valid; prevent over-engineering. Creation blocks warranted omissions; brownfield advises without score changes, with smallest next steps. Catalog: `.claude/docs/engineering-foundation-catalog.md`; update first, re-run `inject_engineering_foundation_gate.py`.

<!-- /SYNC:engineering-foundation-gate:reminder -->

<!-- SYNC:measured-capacity-engineering:reminder -->

**MUST ATTENTION** capacity work: model demand/SLO and distinguish sessions from RPS/in-flight work; disclose load model and offered vs achieved demand; reduce measured work at a safe owner; preserve cache authorization/freshness/bounds; prove cold-state, overload recovery and justified headroom before scaling. Static review returns a verification plan, not invented throughput. Retain the hosting skill's scores, gates and authority.

<!-- /SYNC:measured-capacity-engineering:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Deliver a user-confirmed tech stack for every required layer, backed by researched alternatives, weighted evidence, and confidence, so the team chooses fit for scale, budget, skills, and timeline—not familiarity.

**IMPORTANT MUST ATTENTION** preserve user confirmation, cited evidence, weighted scoring, and fit against scale, budget, skills, and timeline; never replace those gates with familiarity or an unverified default.

**IMPORTANT MUST ATTENTION — run ALL 7 steps in declared order, none skipped:** (1) Load Business Context → (2) Derive Technical Requirements (+ `ask user question tool` confirm) → (3) Research Per Layer (classify applicability; compare open choices within total cap) → (4) Deep Comparison Matrix → (5) Weighted Score & Ranking (confidence %) → (6) Generate Report (<=200 lines) → (7) User Validation Interview (5-8 questions, write `status: confirmed`) — why: AI keeps collapsing this into "just pick a stack" and dropping requirements-derivation, scoring, and the confirmation gate that make the choice defensible.

**IMPORTANT MUST ATTENTION** research 2–3 viable options per OPEN-REQUIRED layer only; record FIXED/N/A layers and honor the total query cap; every recommendation carries confidence % + cited evidence (URL, benchmark, case study) — NEVER recommend on familiarity alone — why: familiarity bias commits the team to the wrong stack that surfaces only at scale.
**IMPORTANT MUST ATTENTION** gate on user via `ask user question tool` at EVERY decision point — confirm derived requirements before research (Step 2), confirm each open layer recommendation in the end interview (Step 7) — NEVER auto-decide — why: the team owns the stack, not the AI.
**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using todo tracking BEFORE starting; mark one `in_progress`, `completed` immediately after evidence; add a final review todo.

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using todo tracking.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

**IMPORTANT MUST ATTENTION** requirements come BEFORE research — load prior business/domain/task artifacts (Step 1), map business signals to technical requirements (Step 2), user-confirm them, THEN WebSearch (Step 3) — NEVER research before requirements are derived and confirmed — why: researching first picks tech then back-fits the problem, the reverse of architecture.
**IMPORTANT MUST ATTENTION** score every OPEN-REQUIRED layer with the weighted 8-criteria matrix (High=3x / Medium=2x / Low=1x), rank with confidence %, cap the `{plan-dir}/research/tech-stack-comparison.md` report at <=200 lines using tables over prose — why: an unscored or unbounded report hides the trade-off the decision turns on.
**IMPORTANT MUST ATTENTION** only user-confirmed decisions get written to `phase-02-tech-stack.md` as `status: confirmed` — the end interview (5-8 `ask user question tool` questions) is mandatory and NEVER skipped even when the choice seems "obvious" — why: an unconfirmed stack is a guess the team will pay for.
**IMPORTANT MUST ATTENTION** every claim, finding, and recommendation requires `file:line`/URL proof or traced evidence + confidence % (>80% act, 60-80% verify first, <60% DO NOT recommend) — NEVER present a guess as fact — why: a stack chosen on speculation fails silently until production.
**IMPORTANT MUST ATTENTION** evaluate fit before copying a reference stack from another project — verify the new context shares the same scale, budget, team skills, compliance, and timeline constraints — why: the closest example rarely matches preconditions, and a mismatched copy compiles but fails the real requirements.

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                                  |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| "Stack is obvious — skip the research"           | Classify OPEN-REQUIRED/FIXED/N/A; research open consequential uncertainty with cited evidence within the total cap. |
| "I already know this is the best framework"      | Show the weighted 8-criteria score + confidence %. No matrix = no recommendation.          |
| "Skip the user interview, the choice is clear"   | The end interview is MANDATORY — only `status: confirmed` decisions get written.            |
| "Just research the stack, requirements are fine" | Derive + user-confirm technical requirements FIRST (Steps 1-2), then research.              |
| "One source is enough for this layer"            | Cite URL + benchmark + case study; a single anecdote is not benchmarked evidence. A decision-critical claim needs 2+ independent sources, else `single source, unverified` below 60%. |

> **External Memory:** For research/analysis work, write intermediate findings and final results to a report file in `tmp/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, recommendation requires `file:line`/URL proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).
