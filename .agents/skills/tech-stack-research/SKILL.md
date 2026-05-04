---
name: tech-stack-research
description: '[Architecture] Research, analyze, and compare tech stack options as a solution architect. Evaluate top 3 choices per stack layer with detailed pros/cons, team-fit scoring, and market analysis. Generate comparison report.'
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Prefer the `plan-hard` skill for planning guidance in this Codex mirror.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->

## Codex Project-Reference Loading (No Hooks)

Codex does not receive Claude hook-based doc injection.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec/test-case planning or TC mapping: `feature-docs-reference.md`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

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

**MANDATORY IMPORTANT MUST ATTENTION** use task tracking to break ALL work into small tasks BEFORE starting.
**MANDATORY IMPORTANT MUST ATTENTION** use a direct user question at EVERY decision point — never assume user preferences.
**MANDATORY IMPORTANT MUST ATTENTION** research top 3 options per stack layer, compare with evidence, present report with recommendation + confidence %.

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

## Quick Summary

**Goal:** Research, analyze, and compare tech stack options for each layer of the system. Act as a solution architect — derive technical requirements from business analysis, research current market, produce detailed comparison report, and present options to user for decision.

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
- **MANDATORY IMPORTANT MUST ATTENTION** run user validation interview at end (never skip)
- All claims must cite sources (URL, benchmark, case study)
- Never recommend based on familiarity alone — evidence required

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Step 1: Load Business Context

Read artifacts from prior workflow steps (search in `plans/` and `team-artifacts/`):

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

**MANDATORY IMPORTANT MUST ATTENTION** validate derived requirements with user via a direct user question before proceeding to research.

## Step 3: Research Per Stack Layer

For EACH layer, research top 3 options using WebSearch (minimum 5 queries total):

### Stack Layers to Evaluate

| Layer                  | Example Options                 | Research Focus                        |
| ---------------------- | ------------------------------- | ------------------------------------- |
| **Backend Framework**  | .NET, Node.js, Python, Go, Java | Performance, type safety, ecosystem   |
| **Frontend Framework** | Angular, React, Vue, Svelte     | DX, ecosystem, hiring, enterprise fit |
| **Database**           | PostgreSQL, MongoDB, SQL Server | Scale, query complexity, cost         |
| **Messaging/Events**   | RabbitMQ, Kafka, Redis Streams  | Throughput, reliability, complexity   |
| **Infrastructure**     | Docker+K8s, Serverless, PaaS    | Cost, ops overhead, scaling           |
| **Auth**               | Keycloak, Auth0, custom         | Cost, compliance, flexibility         |

### WebSearch Queries (minimum 5 per layer)

```
"{option_A} vs {option_B} {current_year} comparison"
"{option} enterprise production case studies"
"{option} community size github stars"
"{option} performance benchmarks {use_case}"
"{option} security track record vulnerabilities"
```

## Step 4: Deep Comparison Matrix

For EACH stack layer, produce a comparison table:

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

Write report to `{plan-dir}$research/tech-stack-comparison.md` with:

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

**MANDATORY IMPORTANT MUST ATTENTION** present findings and ask 5-8 questions via a direct user question:

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

After user confirms, update report with final decisions and mark as `status: confirmed`.

## Output

```
{plan-dir}$research/tech-stack-comparison.md    # Full comparison report
{plan-dir}/phase-02-tech-stack.md               # Final confirmed tech stack decisions
```

---

**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting.
**MANDATORY IMPORTANT MUST ATTENTION** validate EVERY recommendation with user via a direct user question — never auto-decide.
**MANDATORY IMPORTANT MUST ATTENTION** include confidence % and evidence citations for all claims.
**MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality.

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use a direct user question to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"$architecture-design (Recommended)"** — Design solution architecture with chosen tech stack
- **"$plan-hard"** — If architecture already decided
- **"Skip, continue manually"** — user decides

### Council escalation (always-offer, second prompt)

After the existing `## Next Steps` prompt above resolves, present a **second**, independent a direct user question call:

- **"Skip council — proceed with chosen stack (Recommended)"** — Continue with the selected tech stack as-is.
- **"Escalate to $llm-council"** — Run 11 sub-agent council. Best applied when 2+ stacks score within 15% on the comparison matrix or you have unfamiliar/strategic dependencies. Cheaper alternatives: `$why-review`, `$plan-validate`.

## Closing Reminders

**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting.
**MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via a direct user question — never auto-decide.
**MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality.

  <!-- SYNC:critical-thinking-mindset:reminder -->

- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
    <!-- /SYNC:critical-thinking-mindset:reminder -->
    <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
    <!-- /SYNC:ai-mistake-prevention:reminder -->

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

- **IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
- **IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
- **IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
- **IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

1. **DETECT:** Match prompt against workflow catalog
2. **ANALYZE:** Find best-match workflow AND evaluate if a custom step combination would fit better
3. **ASK (REQUIRED FORMAT):** Use a direct user question with this structure:
    - Question: "Which workflow do you want to activate?"
    - Option 1: "Activate **[BestMatch Workflow]** (Recommended)"
    - Option 2: "Activate custom workflow: **[step1 → step2 → ...]**" (include one-line rationale)
4. **ACTIVATE (if confirmed):** Call `$workflow-start <workflowId>` for standard; sequence custom steps manually
5. **CREATE TASKS:** task tracking for ALL workflow steps
6. **EXECUTE:** Follow each step in sequence
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.

## Learned Lessons

# Lessons Learned

> **[CRITICAL]** Hard-won project debugging/architecture rules. MUST ATTENTION apply BEFORE forming hypothesis or writing code.

## Quick Summary

**Goal:** Prevent recurrence of known failure patterns — debugging, architecture, naming, AI orchestration, environment.

**Top Rules (apply always):**

- MUST ATTENTION verify ALL preconditions (config, env, DB names, DI regs) BEFORE code-layer hypothesis
- MUST ATTENTION fix responsible layer — NEVER patch symptom sites with caller-specific defensive code
- MUST ATTENTION use `ExecuteInjectScopedAsync` for parallel async + repo/UoW — NEVER `ExecuteUowTask`
- MUST ATTENTION name by PURPOSE not CONTENT — adding member forces rename = abstraction broken
- MUST ATTENTION persist sub-agent findings incrementally after each file — NEVER batch at end
- MUST ATTENTION Windows bash: verify Python alias (`where python`/`where py`) — NEVER assume `python`/`python3` resolves

---

## Debugging & Root Cause Reasoning

- [2026-04-11] **Holistic-first: verify environment before code.** Failure → list ALL preconditions (config, env vars, DB names, endpoints, DI regs, credentials, permissions, data prerequisites) → verify each via evidence (grep/cat/query) BEFORE code-layer hypothesis. Worst rabbit holes: diving nearest layer while bug sits elsewhere — e.g., hours debugging "sync timeout", real cause: test appsettings pointing wrong DB. Cheapest check first.
- [2026-04-01] **Ask "whose responsibility?" before fixing.** Trace: bug in caller (wrong data) or callee (wrong handling)? Fix responsible layer — NEVER patch symptom site masking real issue.
- [2026-04-01] **Trace data lifecycle, not error site.** Follow data: creation → transformation → consumption. Bug usually where data created wrong, not consumed.
- [2026-04-01] **Code is caller-agnostic.** Functions/handlers/consumers don't know who invokes them. Comments/guards/messages describe business intent — NEVER reference specific callers (tests, seeders, scripts).

## Architecture Invariants

- [2026-03-31] **ParallelAsync + repo/UoW MUST use `ExecuteInjectScopedAsync`, NEVER `ExecuteUowTask`.** `ExecuteUowTask` creates new UoW but reuses outer DI scope (same DbContext) — parallel iterations sharing non-thread-safe DbContext silently corrupt data. `ExecuteInjectScopedAsync` creates new UoW + new DI scope (fresh repo per iteration).
- [2026-03-31] **Bus message naming MUST include service name prefix — core services NEVER consume feature events.** Prefix declares schema ownership (`AccountUserEntityEventBusMessage` = Accounts owns). Core services (Accounts, Communication) are leaders. Feature services (Growth, Talents) sending to core MUST use `{CoreServiceName}...RequestBusMessage` — never define own event for core to consume.

## Naming & Abstraction

- [2026-04-12] **Name PURPOSE not CONTENT — "OrXxx" anti-pattern.** `HrManagerOrHrOrPayrollHrOperationsPolicy` names set members, not what it guards. Add role → rename = broken abstraction. **Rule:** names express DOES/GUARDS, not CONTAINS. **Test:** adding/removing member forces rename? YES = content-driven = bad → rename to purpose (e.g., `HrOperationsAccessPolicy`). **Nuance:** "Or" fine in behavioral idioms (`FirstOrDefault`, `SuccessOrThrow`) — expresses HAPPENS, not membership.

## Environment & Tooling

- [2026-04-20] **Windows bash: NEVER assume `python`/`python3` resolves — verify alias first.** Python may not be in bash PATH under those names. Check: `where python` / `where py`. Prefer `py` (Windows Python Launcher) for one-liners, `node` if JS alternative exists.

> Test-specific lessons → `docs/project-reference/integration-test-reference.md` Lessons Learned section. Production-code anti-patterns → `docs/project-reference/backend-patterns-reference.md` Anti-Patterns section. Generic debugging/refactoring reminders → System Lessons in `.claude/hooks/lib/prompt-injections.cjs`.

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** holistic-first: verify ALL preconditions (config, env, DB names, endpoints, DI regs) BEFORE code-layer hypothesis — cheapest check first
- **IMPORTANT MUST ATTENTION** fix responsible layer — NEVER patch symptom site; trace caller (wrong data) vs callee (wrong handling), fix root owner
- **IMPORTANT MUST ATTENTION** parallel async + repo/UoW → ALWAYS `ExecuteInjectScopedAsync`, NEVER `ExecuteUowTask` (shared DbContext = silent data corruption)
- **IMPORTANT MUST ATTENTION** bus message prefix = schema ownership; feature services NEVER define events for core services — use `{CoreServiceName}...RequestBusMessage`
- **IMPORTANT MUST ATTENTION** name by PURPOSE — adding/removing member forces rename = broken abstraction
- **IMPORTANT MUST ATTENTION** sub-agents MUST write findings after each file/section — NEVER batch all findings into one final write
- **IMPORTANT MUST ATTENTION** Windows bash: NEVER assume `python`/`python3` resolves — run `where python`/`where py` first, use `py` launcher or `node`

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`/simplify`/`$security`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
