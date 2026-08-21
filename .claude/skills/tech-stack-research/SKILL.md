---
name: tech-stack-research
version: 1.0.0
description: '[Architecture] Use when you need to research, analyze, and compare tech stack options as a solution architect.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Deliver user-confirmed, per-layer tech stack — each choice backed by 3+ researched options, weighted scoring, cited evidence, confidence % — by acting as solution architect: derive technical requirements from business analysis, research current market, produce detailed comparison report, so team commits to stack fit for scale, budget, skills, timeline, NOT familiarity.

**Summary:**

- **Purpose:** act as solution architect — derive technical requirements from business analysis, research current market, produce per-layer comparison report so team commits to stack fit for scale/budget/skills/timeline, NOT familiarity.
- **All 7 main steps (run in order):** (1) Load Business Context → (2) Derive Technical Requirements + user-confirm → (3) Research Per Layer (WebSearch 3+ options each) → (4) Deep Comparison Matrix → (5) Weighted Score & Ranking → (6) Generate Report → (7) User Validation Interview.
- Requirements BEFORE research: load prior business/domain/PBI artifacts (Step 1), map business signals → technical requirements (Step 2), gate on user confirmation (`AskUserQuestion`) before any WebSearch (Step 3).
- Evaluate every stack layer (backend, frontend, database, messaging, infra, auth) independently — minimum 3 WebSearched options per layer, each with cited evidence (URL, benchmark, case study), NEVER familiarity (Steps 3-4).
- Score with weighted 8-criteria matrix (High=3x / Medium=2x / Low=1x), rank each layer with confidence %; capped <=200-line report → `{plan-dir}/research/tech-stack-comparison.md` (Steps 5-6).
- End-of-skill user validation interview (5-8 questions) mandatory, NEVER skipped — only confirmed decisions written to `phase-02-tech-stack.md` as `status: confirmed` (Step 7).

**Workflow:**

1. **Load Business Context** — Read business evaluation, domain model, refined PBI artifacts
2. **Derive Technical Requirements** — Map business needs to technical constraints
3. **Research Per Layer** — WebSearch top 3 options for each stack responsibility
4. **Deep Compare** — Pros/cons matrix, benchmarks, community health, team fit
5. **Score & Rank** — Weighted scoring across 8 criteria
6. **Generate Report** — Structured comparison report with recommendation
7. **User Validation** — Present findings, ask 5-8 questions, confirm choices

**Key Rules:**

- **MANDATORY IMPORTANT MUST ATTENTION** research minimum 3 options per stack layer
- **MANDATORY IMPORTANT MUST ATTENTION** include confidence % with evidence for every recommendation
- **MANDATORY IMPORTANT MUST ATTENTION** run user validation interview at end (NEVER skip)
- All claims must cite sources (URL, benchmark, case study)
- Recommend on benchmarked evidence (URL, benchmark, case study); NEVER on familiarity alone

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Step 1: Load Business Context

Read artifacts from prior workflow steps (search `plans/`, `team-artifacts/`):

- Business evaluation report (viability, scale, constraints)
- Domain model / ERD (complexity, entity count, relationships)
- Refined PBI (acceptance criteria, scope)
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
| Real-time needs        | Yes/No       | refined PBI         |
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

**MANDATORY IMPORTANT MUST ATTENTION** validate derived requirements with user via `AskUserQuestion` before proceeding to research.

## Step 3: Research Per Stack Layer

For EACH layer, research top 3 options via WebSearch (minimum 5 queries total):

### Stack Layers to Evaluate

| Layer                  | Example Options                       | Research Focus                        |
| ---------------------- | ------------------------------------- | ------------------------------------- |
| **Backend Framework**  | Candidate backend runtimes/frameworks | Performance, type safety, ecosystem   |
| **Frontend Framework** | Candidate frontend frameworks         | DX, ecosystem, hiring, enterprise fit |
| **Database**           | Candidate database engines/stores     | Scale, query complexity, cost         |
| **Messaging/Events**   | Candidate messaging/event systems     | Throughput, reliability, complexity   |
| **Infrastructure**     | Docker+K8s, Serverless, PaaS          | Cost, ops overhead, scaling           |
| **Auth**               | Keycloak, Auth0, custom               | Cost, compliance, flexibility         |

### WebSearch Queries (minimum 5 per layer)

```
"{option_A} vs {option_B} {current_year} comparison"
"{option} enterprise production case studies"
"{option} community size github stars"
"{option} performance benchmarks {use_case}"
"{option} security track record vulnerabilities"
```

## Step 4: Deep Comparison Matrix

For EACH stack layer, produce comparison table:

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

Calculate weighted total per option per layer. Present ranking:

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

1. Executive summary (recommended full stack in 5 lines)
2. Technical requirements table (from Step 2)
3. Per-layer comparison matrices (from Step 4)
4. Per-layer rankings with recommendations (from Step 5)
5. Combined recommended stack diagram
6. Risk assessment for recommended stack
7. Alternative stack (second-best combo) for comparison
8. Unresolved questions

Report must be **<=200 lines**. Use tables over prose.

## Step 7: User Validation Interview

**MANDATORY IMPORTANT MUST ATTENTION** present findings and ask 5-8 questions via `AskUserQuestion`:

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

**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST ATTENTION** validate EVERY recommendation with user via `AskUserQuestion` — NEVER auto-decide.
**MANDATORY IMPORTANT MUST ATTENTION** include confidence % and evidence citations for all claims.
**MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality.

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because task seems "simple"/"obvious" — the user decides:

- **"/architecture-design (Recommended)"** — Design solution architecture with chosen tech stack
- **"/plan"** — If architecture already decided
- **"Skip, continue manually"** — user decides

### Council escalation (always-offer, second prompt)

After the existing `## Next Steps` prompt above resolves, present a **second**, independent `AskUserQuestion` call:

- **"Skip council — proceed with chosen stack (Recommended)"** — Continue with the selected tech stack as-is.
- **"Escalate to /llm-council"** — Run 11 sub-agent council. Best applied when 2+ stacks score within 15% on the comparison matrix or you have unfamiliar/strategic dependencies. Cheaper alternatives: `/why-review`, `/plan-validate`.

<!-- SYNC:scenario-stress-eval -->

> **Scenario Stress & Resilience Evaluation** — CONDITIONAL, evidence-gated, business-criticality-aware. The top-down companion to `SYNC:scale-technique-gate`: instead of _"is technique X present?"_, put the system UNDER concrete failure/load scenarios and judge whether it SURVIVES, SELF-HEALS, and whether its BUSINESS needs it to. **ADVICE-ONLY: emit the Scenario Stress Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.**
>
> 1. **Reuse the scale tier** derived by `SYNC:scale-technique-gate` (or derive it identically from evidence); **also derive business-criticality `B0`–`B3`** from specs/SLA/product docs + the domain, cite `file:line` + confidence. `B0` best-effort · `B1` important · `B2` business-critical · `B3` mission-critical/regulated. Unknown → state the assumption, do **NOT** default to `B3`/`T3`. **Criticality-signal floor (both-directions safety):** regulated / PII / financial / health data, money movement, auth/identity, or legal-compliance scope raises `B` to **at least `B2` even absent SLA/SLO docs**; anti-over-engineering lowers hardening ONLY when NO such signal is present. `B` (blast if it fails) and `T` (scale of load/data) are independent — a low-traffic payroll run is low-`T`, high-`B`.
> 2. **Select in-scope scenarios** — only those the system's `B`/`T` combination warrants (a `B0` internal PoC skips region-loss/DR entirely; a `B3`/`T0` regulated service still needs backups + DR by BUSINESS, not scale).
> 3. **Walk each in-scope scenario:** simulate the stimulus → trace the break path → name the failure signature → answer the self-heal/recovery question (auto-recover? MTTR? manual runbook?) → name the trade-off it forces. Families: traffic spike · sustained growth · data-volume growth · write/ingest burst · dependency down/slow · instance/node loss · zone/region loss · **data loss/corruption** · poison-message/retry-storm · cascading failure/backpressure · cold-start/deploy-blip · clock-skew/duplicate-delivery.
> 4. **Assign one verdict per scenario:** `WITHSTANDS` · `DEGRADES-GRACEFULLY` · `FAILS-HARD` (→ **advise only**) · `N/A-by-business` (not warranted → skip, not a gap) · `OVER-HARDENED` (resilience beyond business need → **advise AGAINST**, cite carrying cost).
> 5. **Anti-over-engineering guard (first-class):** a lean system whose business does not need HA/DR is a PASS; `OVER-HARDENED` flags resilience the business does not warrant. This guard is symmetric with the criticality-signal floor above — never under-harden a `B2`+ system just because its traffic is low.
> 6. **Output — Scenario Stress Matrix:** `scenario | in-scope (B/T)? | verdict | self-heal | trade-off | evidence (file:line/config/infra)`. Full catalog + Business×Scale in-scope baseline + verdict/tier tables → `.claude/docs/scenario-stress-catalog.md`. **ADVISORY-ONLY: NEVER mutate any `/20`, `/24`, verdict band, or gate pass/fail. Drift-guard: scenarios/verdicts/business-tiers are AUTHORITATIVE in the catalog — update it FIRST, then re-run `.claude/scripts/inject_scenario_stress_gate.py`. Scale tier stays single-sourced in `scale-technique-catalog.md`.**
>
> **BLOCKED until:** `- [ ]` scale tier + business-criticality (with criticality-signal floor) derived from evidence `- [ ]` in-scope scenarios selected `- [ ]` matrix emitted `- [ ]` over-hardening guard applied `- [ ]` advisory-only (no score/verdict mutation) confirmed

<!-- /SYNC:scenario-stress-eval -->

<!-- SYNC:scale-technique-gate:reminder -->

**IMPORTANT MUST ATTENTION** scale-technique gate: derive the scale tier from evidence FIRST (T0 internal · T1 <10k · T2 10k–1M · T3 millions+), then judge each warranted technique `PRESENT`/`MISSING-WARRANTED`/`N/A-by-scale`/`OVER-ENGINEERED`. Advise on warranted-but-missing gaps AND advise AGAINST unwarranted heavyweight techniques (anti-over-engineering). **ADVICE-ONLY — emit the Technique Applicability Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.** Full catalog → `.claude/docs/scale-technique-catalog.md` (authoritative for tier thresholds & per-technique warranting tiers — on any change update the catalog FIRST, then re-run `inject_scale_technique_gate.py`).

<!-- /SYNC:scale-technique-gate:reminder -->

<!-- SYNC:scenario-stress-eval:reminder -->

**IMPORTANT MUST ATTENTION** scenario-stress gate: reuse the scale tier `T0`–`T3` AND derive business-criticality `B0`–`B3` from evidence first — apply the **criticality-signal floor** (regulated/PII/financial/health data · money movement · auth/identity · legal-compliance → at least `B2` even absent SLA docs; do NOT default to `B3`). Select only the scenarios the `B`/`T` combination warrants, then walk each (simulate → trace → failure signature → self-heal/MTTR → trade-off) and assign `WITHSTANDS`/`DEGRADES-GRACEFULLY`/`FAILS-HARD`/`N/A-by-business`/`OVER-HARDENED`. Anti-over-engineering is first-class (a lean system that needs no HA/DR is a PASS) AND symmetric (never under-harden a `B2`+ system for low traffic). **ADVICE-ONLY — emit the Scenario Stress Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.** Full catalog → `.claude/docs/scenario-stress-catalog.md` (authoritative for scenarios/verdicts/business-tiers — on any change update the catalog FIRST, then re-run `inject_scenario_stress_gate.py`; scale tier stays single-sourced in `scale-technique-catalog.md`).

<!-- /SYNC:scenario-stress-eval:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

- **IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
- **IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
- **IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
- **IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** deliver user-confirmed, per-layer tech stack — each choice backed by 3+ researched options, weighted 8-criteria scoring, cited evidence, confidence % — so team commits to a stack fit for scale, budget, skills, timeline, NOT familiarity.

**IMPORTANT MUST ATTENTION — run ALL 7 steps in declared order, none skipped:** (1) Load Business Context → (2) Derive Technical Requirements (+ `AskUserQuestion` confirm) → (3) Research Per Layer (WebSearch 3+ options each) → (4) Deep Comparison Matrix → (5) Weighted Score & Ranking (confidence %) → (6) Generate Report (<=200 lines) → (7) User Validation Interview (5-8 questions, write `status: confirmed`) — why: AI keeps collapsing this into "just pick a stack" and dropping requirements-derivation, scoring, and the confirmation gate that make the choice defensible.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** MUST ATTENTION apply critical + sequential thinking; traced proof, confidence >80% to act, NEVER guess as fact.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**IMPORTANT MUST ATTENTION** research minimum 3 WebSearched options per stack layer (backend, frontend, database, messaging, infra, auth); every recommendation carries confidence % + cited evidence (URL, benchmark, case study) — NEVER recommend on familiarity alone — why: familiarity bias commits the team to the wrong stack that surfaces only at scale.
**IMPORTANT MUST ATTENTION** gate on user via `AskUserQuestion` at EVERY decision point — confirm derived requirements before research (Step 2), confirm each layer recommendation in the end interview (Step 7) — NEVER auto-decide — why: the team owns the stack, not the AI.
**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting; mark one `in_progress`, `completed` immediately after evidence; add a final review todo.

<!-- SYNC:scale-technique-gate -->

> **Scalability & Production-Readiness Technique Gate** — CONDITIONAL, evidence-gated, scale-tiered. Judge which system-design techniques a system _warrants_ at its scale — flag warranted-but-missing gaps AND advise AGAINST unwarranted heavyweight ones. **ADVICE-ONLY: emit the matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.**
>
> 1. **Derive the scale tier FIRST — from evidence, never assumed.** Read users/RPS, SLO/latency targets, data volume, tenancy, topology from config/infra/specs; cite `file:line` + confidence. Tiers: `T0` internal/single-instance · `T1` small SaaS (<10k users) · `T2` high-scale (10k–1M) · `T3` massive/multi-region (millions+). Unknown tier → state assumption, do NOT default to T3.
> 2. **Judge each concern group only at/above its warranting tier** (member techniques → owning review skill for depth):
>     - Traffic & Edge — Rate Limiting, Load Balancing, Reverse Proxy, API Gateway, CDN, Edge Caching, WAF, DDoS (T1+; CDN/WAF T2+) → security-review owns WAF/DDoS
>     - Caching & Data Access — Caching, Cache Invalidation, DB Indexing, Query Optimization, N+1, Connection Pooling (T1+) → performance-review owns depth
>     - Data Scaling & Consistency — Read Replicas, Sharding, Partitioning, Replication, CAP, Eventual Consistency, Locks, Leader Election (T2+; sharding/multi-region T3) → performance-review
>     - Async & Messaging — Message Queues, Pub/Sub, Event-Driven, Saga, DLQ, Distributed Transactions, Backpressure, Webhooks, WebSockets/SSE (T2+)
>     - Resilience — Circuit Breakers, Timeouts, Retries, Backoff, Idempotency, Health Checks, Liveness/Readiness, Failover, Graceful Degradation (T1+) → production-readiness-review
>     - Scaling & Compute — Autoscaling, Horizontal/Vertical Scaling, Serverless Limits, Cold Starts, Cron Jobs, Thread Safety, GC/Memory Leaks (T1+; autoscaling T2+)
>     - Deployment & Release — CI/CD, Docker, Kubernetes, Blue-Green/Canary/Rolling, Rollbacks, Feature Flags, IaC/Terraform/Helm, Build Caching (CI/CD T0+; K8s/canary T2+)
>     - Observability — Monitoring, Logging, Distributed Tracing, Metrics, Alerting, SLOs/SLIs, Error Budgets (T1+; tracing/error-budgets T2+) → production-readiness-review
>     - Security & Compliance — Secrets Management, IAM, OAuth, JWT Rotation, TLS, Encryption at Rest/Transit, CORS, CSRF, SQLi, XSS, SSRF (T0+) → security-review owns
>     - DR & Infra — Backups, Disaster Recovery, Multi-Region, Chaos Engineering, Schema Versioning, DB Migrations, Cost Optimization (backups T1+; DR/multi-region/chaos T3) → production-readiness-review
> 3. **Assign one of 4 verdicts per warranted technique:** `PRESENT` · `MISSING-WARRANTED` (→ **advise only** — guidance, NOT a score/gate lever) · `N/A-by-scale` (below warranting tier) · `OVER-ENGINEERED` (present but unwarranted at this tier → advise AGAINST).
> 4. **Anti-over-engineering guard (first-class):** do NOT recommend K8s, sharding, multi-region, service mesh, event sourcing, or distributed transactions below their warranting tier. A correctly-lean small system is a PASS, never a gap.
> 5. **Output — Technique Applicability Matrix:** `technique | tier-warranted? | present? | verdict | advice | evidence (file:line/config/infra)`. Full grouped catalog + per-tier baseline → `.claude/docs/scale-technique-catalog.md`. Hosting reviews surface this matrix WITHOUT changing any `/20`, `/24`, verdict band, or PASS/FAIL (per user decision 2026-07-06). **Drift-guard: tier thresholds & per-technique warranting tiers are AUTHORITATIVE in `.claude/docs/scale-technique-catalog.md` — the inline tier summary above is a condensed pointer; on any tier/technique change, update the catalog FIRST, then re-run `.claude/scripts/inject_scale_technique_gate.py` to re-propagate this block.**
>
> **BLOCKED until:** `- [ ]` tier derived from evidence (not assumed) `- [ ]` matrix emitted `- [ ]` over-engineering guard applied `- [ ]` advisory-only (no score/verdict mutation) confirmed

<!-- /SYNC:scale-technique-gate -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never the delivery/retry bookkeeping held in shared infrastructure that any co-running process can write. Such a check passes when run alone and flakes the moment anything else shares that infrastructure.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

**IMPORTANT MUST ATTENTION** requirements come BEFORE research — load prior business/domain/PBI artifacts (Step 1), map business signals to technical requirements (Step 2), user-confirm them, THEN WebSearch (Step 3) — NEVER research before requirements are derived and confirmed — why: researching first picks tech then back-fits the problem, the reverse of architecture.
**IMPORTANT MUST ATTENTION** score every layer with the weighted 8-criteria matrix (High=3x / Medium=2x / Low=1x), rank with confidence %, cap the `{plan-dir}/research/tech-stack-comparison.md` report at <=200 lines using tables over prose — why: an unscored or unbounded report hides the trade-off the decision turns on.
**IMPORTANT MUST ATTENTION** only user-confirmed decisions get written to `phase-02-tech-stack.md` as `status: confirmed` — the end interview (5-8 `AskUserQuestion` questions) is mandatory and NEVER skipped even when the choice seems "obvious" — why: an unconfirmed stack is a guess the team will pay for.
**IMPORTANT MUST ATTENTION** every claim, finding, and recommendation requires `file:line`/URL proof or traced evidence + confidence % (>80% act, 60-80% verify first, <60% DO NOT recommend) — NEVER present a guess as fact — why: a stack chosen on speculation fails silently until production.
**IMPORTANT MUST ATTENTION** evaluate fit before copying a reference stack from another project — verify the new context shares the same scale, budget, team skills, compliance, and timeline constraints — why: the closest example rarely matches preconditions, and a mismatched copy compiles but fails the real requirements.

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| "Stack is obvious — skip the research"           | 3+ WebSearched options per layer with cited evidence anyway — familiarity is not evidence. |
| "I already know this is the best framework"      | Show the weighted 8-criteria score + confidence %. No matrix = no recommendation.          |
| "Skip the user interview, the choice is clear"   | The end interview is MANDATORY — only `status: confirmed` decisions get written.           |
| "Just research the stack, requirements are fine" | Derive + user-confirm technical requirements FIRST (Steps 1-2), then research.             |
| "One source is enough for this layer"            | Cite URL + benchmark + case study; a single anecdote is not benchmarked evidence.          |

> **External Memory:** For research/analysis work, write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, recommendation requires `file:line`/URL proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).
