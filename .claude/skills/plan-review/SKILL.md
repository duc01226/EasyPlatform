---
name: plan-review
version: 1.2.0
description: '[Planning] Use when you need to auto-review a plan for validity, correctness, and best practices — recursive: review, validate findings with why-review, fix validated findings, full re-review until no findings.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Block any plan from reaching implementation unless it is hallucination-free (every existing-code claim proven at `file:line`) and implementation-ready (every step concrete, small enough to code from immediately) — by auto-reviewing implementation plans for validity, correctness, and best practices. **Recursive:** when any findings exist, validate findings with `/why-review --validate-findings`, fix only validated findings in plan files, and rerun the full plan review until the round's exit bar is clear — **zero findings in rounds 1-2, zero CRITICAL/HIGH/MEDIUM from round 3 (a LOW-only round ENDS the loop, deferred not fixed)**.

Every phase review treats **Mode, Wave, write set, and SEQ dependency** as one indivisible metadata contract; a mismatch in any field blocks approval.

**Summary:** AI self-review (automatic, NOT a user interview like `/plan-validate`) that gates a plan before implementation.

- **Purpose:** review as a SKEPTIC, not validator — every existing-code claim needs `file:line` proof (Anti-Hallucination Gate); every phase must clear the "Detailed & Small Enough" granularity gate (≤5 files, ≤3h, no planning verbs) — too vague → detail it, too big → break it.
- **Main steps (run in order):** Phase 0 detect plan type → Step 1 read `plan.md` + `goal.md` + all `phase-*.md`, extract requirements/steps/files/risks → Step 2 evaluate the 4 checklist groups: **Validity** (summary, requirements, steps, files) · **Correctness** (Granularity Gate + Anti-Hallucination/Code-Proof Gate + spec/TC coverage + Goal-Contract mapping) · **Best Practices** (YAGNI/KISS/DRY/architecture) · **Completeness** (risks, testing, success criteria, security, graph-dependency) → run the 11 Adversarial techniques + Anti-Bias Gate + 8 Plan Dimensions → graph-trace each modified file (when graph.db exists) → Step 3 score PASS/WARN/FAIL → Step 4 output result → Step 5 recursive validate-fix-re-review loop.
- **Detect plan type FIRST (Phase 0)** so the right focus applies — bugfix MANDATES the Behavioral Delta Matrix; security/performance/refactor/contract/infra/data-schema each add targeted checks.
- **Findings are never fixed blindly:** run the `/why-review --validate-findings` gate BEFORE editing any `plan.md`/`phase-*.md`, fix only validated findings at the smallest responsible location, then restart the FULL review with a fresh, zero-memory sub-agent — loop until a clean pass at the round's bar.
- **Severity floor — from round 3, LOW stops blocking.** Rounds 1-2 require zero findings at any severity. **From round 3 the bar is zero validated CRITICAL/HIGH/MEDIUM — a review round whose validated findings are ALL LOW ENDS the loop.** Do NOT restart the full review for LOW findings alone: record them under `## Deferred LOW Findings (severity floor, round ≥3)` in the report and PASS. NEVER re-tier a real CRITICAL/HIGH/MEDIUM down to LOW to reach the exit, and NEVER apply the floor to a hallucinated-code claim or a missing-evidence finding — those are HIGH by definition, not deferrable LOW. Severity tiers per `SYNC:severity-rubric`.
- **Round cap 3 — a ceiling, NEVER a target;** a clean pass ends the loop immediately at ANY round (round 1 included). Escalate via `AskUserQuestion` when the same blocker survives 2 consecutive full re-reviews with no progress, when round 3 completes with findings still open, or when a finding needs product/owner judgment — cap exhaustion escalates, it NEVER becomes a PASS.

**Workflow:**

1. **Resolve Plan** — Use $ARGUMENTS path or active plan from `## Plan Context`
2. **Read Files** — plan.md + all phase-\*.md files, extract requirements/steps/files/risks
3. **Evaluate Checklist** — Validity (summary, requirements, steps, files), Correctness (specific, paths, no conflicts), Best Practices (YAGNI/KISS/DRY, architecture), Completeness (risks, testing, success, security)
4. **Score & Classify** — PASS (all Required + ≥50% Recommended), WARN (all Required + <50% Recommended), FAIL (any Required fails)
5. **Output Result** — Status, checks passed, issues, recommendations, verdict
6. **If any findings remain** — Run `/why-review --validate-findings` on the plan-review report first; fix only validated actionable issues in plan files, then re-review (loop back to step 2 until the round's bar is clear — zero findings in rounds 1-2, zero CRITICAL/HIGH/MEDIUM from round 3 — unless the repeated-blocker rule or the 3-round cap applies)

**Core Principle — Detailed & Small Enough:**

- **Too vague?** → Detail it: add specific file paths, concrete actions, exact method names
- **Too big to detail?** → Break it: split into smaller phases/sub-plans until each is detailed
- A plan that can't be immediately coded from is NOT ready. Every step must be implementation-ready.

**Key Rules:**

- **No hallucination**: Every plan claim about existing source code must have `file:line` proof — unverified paths, class names, or behaviors = FAIL
- **PASS**: Proceed to implementation
- **WARN**: Proceed with caution, note gaps
- **FAIL (any findings)**: Validate findings with `/why-review --validate-findings`, fix only validated plan issues, then **re-run the FULL review from the start**. Repeat this self-loop — no forced minimum, capped at 3 rounds MAX — until a complete pass finds ZERO findings.
- **Bounded loop — two escalation triggers, neither a completion criterion**: (a) **no-progress safety** — the SAME blocker surviving 2 consecutive full re-reviews with no progress; (b) **round cap** — round 3 completing with findings still open. Whichever trips first → STOP and escalate to user via `AskUserQuestion`, never a silent "good enough" PASS. A clean pass ends the loop immediately, even on round 1 — the cap is a ceiling, not a quota.
- **Constructive**: Focus on implementation-blocking issues, not pedantic details

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## First Principle — Easy to Change

> **The success metric of every coding decision is _future change cost_.**
> DRY, SRP, abstraction, design patterns, naming, layering, tests — every
> technique exists to serve one goal: **making the next change cheaper**.

Evaluating code, refactor, test, abstraction, ask: **does this make the next change cheaper or more expensive?**

- Reject "best practices" raising change cost — premature abstraction, speculative generality, leaky indirection, ceremony without payoff.
- Name the real enemies in findings: **coupling, hidden state, duplicated knowledge, unclear intent, irreversible decisions exposed too early**.
- A simpler design that is easy to change beats a sophisticated one that is not.

Apply this lens **before** any rule, pattern, or checklist below — a downstream rule that raises change cost LOSES to this principle.

---

## Adversarial Review Mindset (NON-NEGOTIABLE)

**Default stance: SKEPTIC, not validator. Your job is to find what cannot work, not confirm what looks right.**

> **Confirmation bias trap:** After reading a well-structured plan, AI naturally finds reasons to agree. This section exists to break that loop before it produces a rubber-stamp approval.

### Adversarial Techniques (apply ALL before concluding)

> Techniques 1-6 stress **whether the plan can be built** (reality, effort, scope, dependencies). Techniques 7-10 stress **whether the chosen design is the right one** — the decision-quality lens shared with `/why-review`'s rationale review. Apply both groups: a buildable plan built on the wrong decision is still a failed plan.

**1. Implementation Reality Check**
Per phase: _"a developer starts implementing this right now — what breaks FIRST?"_ Walk the critical path concretely. A vague phase ("implement the service layer") untraceable to specific files/classes FAILS.

**2. Assumption Stress Test**
List the top 3 implicit assumptions; per assumption: _"what if it is wrong?"_ A valid plan survives 2 of 3 being false. Usual hidden ones: existing code is in a known state · no external API changes · team already has this domain knowledge.

**3. Effort Reality Check**
Per estimated phase: _"has similar work in THIS codebase shipped in that timeframe, and what slowed it last time?"_ Underestimating by 2x or more makes it an optimistic guess, NOT a valid plan.

**4. Pre-Mortem**
Assume the plan shipped exactly as written and the feature has been in production a month. Write ONE concrete, plausible failure scenario. Finding none means you have not looked hard enough.

**5. Scope Creep Detector**
Flag any task NOT directly required to deliver the stated feature. "While we're here, let's also refactor X" is scope creep.

**6. Dependency Blindspot**
List 2-3 external dependencies (services, APIs, data sources) the plan assumes stable; per one: _"what breaks here if it changes or goes away?"_ A dependency failure addressed nowhere is a risk gap.

**7. Steel-Man the Rejected Alternative**
Per design decision choosing X over an alternative, argue FOR the rejected one as strongly as possible. Would a 10-year domain senior pick it? If yes, dismissal needs proof stronger than "we picked X" — why: a decision that never names what it rejected was assumed, not made.

**8. Why NOT?**
Per "chose X because Y", ask what X _sacrifices_. A plan listing only upsides is hiding the trade-off, not avoiding it. Demand the named downside.

**9. Unseen Alternatives**
Name 1-2 viable approaches the plan never mentions. An alternative absent without exclusion reasoning is weak coverage, NOT a settled decision.

**10. Pros/Cons Symmetry**
Count stated pros vs cons on the chosen approach. Pros outnumbering cons by more than 2:1 signals confirmation bias — demand the missing downsides before accepting.

**11. Contrarian Pass**
Before ANY verdict, write ≥2 sentences arguing the OPPOSITE. About to write PASS → argue NEEDS WORK, and vice versa. Then pick the stronger argument on evidence.

### Forbidden Patterns

- **"Structure looks good"** → Structure is NOT quality. Can it be implemented?
- **"Phases are well-defined"** → Presence of phases is NOT correctness. What's in them?
- **"Alternatives were considered"** → Were they real alternatives or strawmen set up to fail?
- **"Risk is managed"** → Mitigation of "monitor closely" is NOT a mitigation. What action, by whom, triggered by what?
- **"Looks achievable"** without tracing the critical path → Not a valid assessment.

### Anti-Bias Gate (MANDATORY before finalizing verdict)

Complete ALL checks before writing the final verdict (MUST ATTENTION):

- run Implementation Reality Check on the highest-risk phase
- identify 3 implicit assumptions and stress-test them
- check effort estimates against codebase complexity
- run pre-mortem (one concrete production failure scenario)
- scan for scope creep (tasks not required for stated feature)
- verify dependency blindspots are addressed
- steel-man at least one rejected design alternative (argue FOR it)
- name at least 1 viable alternative the plan does not mention
- check pros/cons symmetry on the plan's primary design decision

If any check is incomplete → you have NOT completed the adversarial review. Go back.

> **Why-review relationship:** Techniques 7-10 + these gate checks are the _rationale_ lens applied DURING the review pass (does the plan's design hold up?). The separate `/why-review --validate-findings` gate runs AFTER findings exist (are the findings themselves correct before we fix them?). Both stay — they validate different things and must not be collapsed.

## Plan Dimension Thinking Framework

After plan-type detection (Phase 0), evaluate each dimension below using this reasoning pattern:

> **For each dimension:** (1) Understand its role in the plan's domain, (2) Read the plan's claims about it, (3) Derive the actual concerns from first principles — what could go wrong if this dimension is weak? (4) Apply your knowledge of the plan's tech stack to find stack-specific gaps.

### Dimension 1: Scope Integrity

**Think:** Does the plan's scope match the stated goal exactly — not broader, not narrower?

- What's the minimal set of changes needed to deliver the stated goal?
- What does the plan add that's NOT in the goal? → Scope creep.
- What's in the goal that the plan doesn't address? → Scope gap.
- Stress test: "If we skip phase X, does the feature still work?" → If yes, that phase is out of scope.

### Dimension 2: Data Flow Correctness

**Think:** Can I trace how data moves through every phase of this plan?

- Where does data originate? Where does it end up?
- What transforms it in between? Are those transforms described in the plan?
- What happens to data at system boundaries (API, message bus, storage, UI)? Does the plan address each boundary?
- What data states are invalid? Does the plan guard against them?

### Dimension 3: Dependency Chain Completeness

**Think:** Does the plan account for everything its changes affect?

- Every file/module the plan touches: what imports it? what calls it? what depends on its contract?
- If the plan changes an interface/contract, are ALL consumers listed?
- External dependencies (third-party services, shared infra): are they stable? If they break, what's the fallback?
- Run graph trace if graph.db exists — compare plan's file list against downstream impact.

### Dimension 4: Failure Mode Coverage

**Think:** What does the plan say about when things go wrong?

- For each external call, async operation, or state change: what's the error behavior?
- Does the plan include a rollback strategy for irreversible operations?
- What's the partial failure state? (half-migrated, half-deployed, race condition) Is it addressable?
- Is there a monitoring/alerting plan for the new code paths?

### Dimension 5: Test Observability

**Think:** How will a developer know if this plan's implementation is correct?

- Can the stated acceptance criteria be mechanically verified by a test?
- Are there behaviors that are only observable via logs/traces (not unit tests)?
- Which phase introduces the risk? Does a test exist in that phase?
- "Tests pass" is NOT a success criterion — name the specific behaviors being tested.
- **Spec-Loop scheduling (test-quality gate).** The plan MUST schedule the spec-loop, not just "add tests": (1) every `[HARD]` §4 rule / §5 invariant gets a universally-quantified **property test spec** plus a boundary counter-case — not example tests only; (2) changed core logic is gated by a **MUTATION-SCORE** quality bar (a surviving mutant = a missing invariant ⇒ a killing test owed), NOT a line-coverage % target; (3) a **dual-feedback + re-review step** exists so each behavior-changing finding enriches BOTH the spec AND the tests and the package is re-reviewed to zero new gaps. **FAIL** a plan that targets a line-coverage % instead of a mutation-score bar, or that omits property/invariant test specs for its `[HARD]`/§5 rules.

### Dimension 6: Knowledge Prerequisites

**Think:** Does implementing this plan require knowledge the plan doesn't surface?

- Domain knowledge: Are business rules spelled out, or does the implementer need to already know them?
- System knowledge: Are integration points documented, or does the implementer need tribal knowledge?
- Tooling knowledge: Does the plan assume setup steps that aren't listed?
- If any prerequisite is unstated → the plan is not implementation-ready.

### Dimension 7: Estimation Drift

**Think:** Does the frontmatter estimation still match the finalized plan, or did scope-locking change the cost?

- Pre-completion estimates anchor on rough scope guesses; finalized phases reveal true cost. Re-derive `bottom_up_hours = Σ phase_hours` from each phase file's locked tasks/TCs and compare to current frontmatter `man_days_traditional` / `story_points`.
- Recompute `likely_days`, `risk_margin_pct`, `min-max range` per `SYNC:estimation-framework`. Did unknowns resolve (margin should drop) or new risks surface (margin should rise)?
- If `|delta| > 20%` → frontmatter MUST be updated with `reestimate_delta_pct: <signed>` + 1-line `reestimate_reason`. Missing update = FAIL.
- If `|delta| > 50%` → flag `SHOULD-RESCOPE` in review verdict; the plan must surface the rescope decision to the user before implementation begins.
- Watch for hidden inflation: phases added during planning, TCs not counted in original estimate, integration work discovered late.

### Dimension 8: Domain Entity Design (CONDITIONAL — fires when the plan touches an entity, VO, or aggregate)

**Think:** Does the plan actually decide the domain model, or does it defer the hard parts to implementation?

Apply `SYNC:domain-entity-change-gate` (inlined below) — the SAME protocol `/plan` authored under and `/changes-review` will review under, whose A–P checklist `/domain-entities-review` owns. State `No domain-entity surface — Dimension 8 N/A` when it does not fire.

- An **unanswered, hand-waved, or deferred-to-implementation** decision point is a FINDING with `file:line` into the plan. The word "entity" appearing in a task is NEVER an answer.
- MUST ATTENTION verify the plan states **paradigm** and **subdomain fit** before any entity task — a plan proposing a rich domain model for a CRUD subdomain is a FINDING (ceremony with no invariant to protect), and so is a plan proposing setter/encapsulation tasks against an immutable or event-sourced model.
- Check each triggered row names its **owning file**, not just an intent: classification · invariant ownership + failure signalling · aggregate boundary + concurrency · construction vs reconstitution · events · property-TC test obligation.
- Highest-yield misses: an aggregate boundary chosen by UI screen or DB table rather than by true invariant · cross-aggregate references planned as object navigation · no concurrency token on a contended root · a set-based invariant ("unique email") with no enforcing mechanism · invariants planned into a validator/handler instead of the entity · events planned with no dispatch timing.
- Steel-man the plan's boundary choice before flagging it — a deliberately larger aggregate protecting a real always-consistent invariant is CORRECT; demand the invariant, not a smaller boundary.

**Use these dimensions to generate targeted, evidence-backed questions — not generic "add more detail" suggestions.**

---

## Your mission

Self-review the implementation plan — valid, correct, best-practice — and surface everything needing a fix BEFORE implementation proceeds.

**Key distinction:** AI self-review (automatic), NOT a user interview like `/plan-validate`.

## Plan Resolution

1. `$ARGUMENTS` provided → use that path
2. Else `## Plan Context` section → use the active plan path
3. No plan found → error: "No plan to review. Run /plan first."

## Workflow

### Phase 0: Detect Plan Type

Before ANY checklist, read `plan.md` and classify the plan — why: the type decides the sub-agent, the emphasis, and whether the Behavioral Delta Matrix is mandatory:

| Signal in plan                                               | Type                      | Additional review focus                                                                     |
| ------------------------------------------------------------ | ------------------------- | ------------------------------------------------------------------------------------------- |
| "fix", "bug", "regression", "defect" in title/description    | **Bugfix**                | Behavioral Delta Matrix (MANDATORY), preservation inventory, regression tests               |
| "migrate", "schema", "database", "index"                     | **Data/Schema**           | Rollback path, zero-downtime strategy, data preservation, migration idempotency             |
| "auth", "permission", "security", "encrypt", "token", "RBAC" | **Security**              | Threat modeling, attack surface, trust boundary changes, sub-agent: `security-auditor`      |
| "performance", "latency", "cache", "N+1", "throughput"       | **Performance**           | Baseline metrics, regression risk, measurement strategy, sub-agent: `performance-optimizer` |
| "refactor", "extract", "rename", "restructure"               | **Refactor**              | Behavior preservation, blast radius, dangling references                                    |
| "API", "contract", "endpoint", "consumer", "event"           | **Contract/Integration**  | Backward compatibility, consumer impact, versioning strategy                                |
| "infra", "CI", "pipeline", "deploy"                          | **Infrastructure/DevOps** | Rollback plan, environment parity, secrets handling                                         |
| None of the above                                            | **Feature**               | Standard checklist, acceptance criteria mapping, YAGNI                                      |

**If multiple signals match**, list all types and apply ALL their focus areas.

**Plan type drives:**

- Which sub-agent type to use (see "Subagent Type Selection" above)
- Which sections of the Adversarial Review Mindset to emphasize
- Whether Behavioral Delta Matrix is mandatory (bugfix only)

---

### Step 1: Read Plan Files

Read the plan directory:

- `plan.md` - Overview, phases list, frontmatter
- `goal.md` - Goal Contract (when present): Original Request, Purpose, Success Criteria (required vs optional), Constraints
- `phase-*.md` - All phase files
- Extract: requirements, implementation steps, file listings, risks

If `{plan-dir}/goal.md` is missing, resolve `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md`; if no Goal Contract exists at all, record `No active goal — plan reviewed against plan.md requirements only.`

### Step 2: Evaluate Against Checklist

#### Validity (Required - all must pass)

| #   | Check                                                               | Presence                           | Quality Depth                                                                     |
| --- | ------------------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------- |
| 1   | **Has executive summary** — clear 1-2 sentence description          | Does a summary section exist?      | Is it accurate? Does it scope the work or conceal complexity?                     |
| 2   | **Has defined requirements section** — explicit requirements listed | Does a requirements section exist? | Are requirements concrete user needs or vague technical goals?                    |
| 3   | **Has implementation steps** — actionable tasks                     | Are implementation steps present?  | Are steps specific (file names, method names) or vague actions?                   |
| 4   | **Has files to create/modify listing** — file inventory present     | Is a file listing present?         | Are file paths real (verified via glob/grep)? Do they follow project conventions? |

#### Correctness (Required - all must pass)

- [ ] **Granularity Gate — "Detailed & Small Enough"** — FAIL if ANY phase fails ANY criterion below. A plan you can't immediately code from is NOT ready.

**Decision tree — apply to EACH phase:**

```
Phase too vague? (no file paths, planning verbs, unclear actions)
  → YES → DETAIL IT: add specific file paths, exact method names, concrete actions
  → NO ↓
Phase too big? (>5 files OR >3h effort OR single step is a mini-project)
  → YES → BREAK IT: split into smaller sibling phases until each meets limits
  → NO → PASS this phase
```

**5-Point Criteria (all must pass per phase):**

| #   | Criterion                 | PASS example                        | FAIL example                       |
| --- | ------------------------- | ----------------------------------- | ---------------------------------- |
| 1   | Steps name specific files | "Modify `{source-root}/auth/login`" | "Implement authentication"         |
| 2   | No planning verbs         | "Add `validateToken()` method"      | "Determine the best auth approach" |
| 3   | Each step ≤30 min effort  | "Add error handler to endpoint"     | "Build the entire auth module"     |
| 4   | Phase ≤5 files AND ≤3h    | 3 files, 2h                         | 12 files, 8h                       |
| 5   | No unresolved decisions   | All approaches decided              | "TBD: which library to use"        |

**Planning verbs that trigger FAIL:** "research", "determine", "figure out", "decide", "evaluate", "explore", "investigate" — these belong in investigation, not implementation plans.

**Action on failure (after Findings Validation Gate passes):**

Do not apply these refinements until `/why-review --validate-findings` returns CLEAN for the current plan-review report.

- **Too vague** → Refine in-place: expand steps with file paths, method names, concrete actions
- **Too big (≤9 files)** → Split phase into sibling phases (Phase 2A, 2B, 2C)
- **Too big (10+ files)** → Create sub-plan: `{plan-dir}/sub-plans/phase-{XX}-{name}/plan.md`

**Worked example:**
FAILS: `"Phase 2: Data Layer — Set up database models, Create repositories, Implement data access patterns. Effort: 4h, Files: ~8"`
PASSES after split: `"Phase 2A: Data Schema (1h, 3 files) — Create {source-root}/models/user-entity, Create {source-root}/models/session-entity, Create {migration-root}/create-users-sessions"` + `"Phase 2B: Repository Layer (1.5h, 3 files) — Create {source-root}/repositories/user-repository, Create {source-root}/repositories/session-repository, Register in {composition-root}"`

- [ ] File paths follow project patterns
- [ ] No conflicting or duplicate steps
- [ ] Dependencies between steps are clear
- [ ] **Anti-Hallucination & Code-Proof Gate** — FAIL if ANY plan claim about existing source code lacks `file:line` proof.

| Claim type             | Required proof                    |
| ---------------------- | --------------------------------- |
| File path              | File exists (glob/read)           |
| Class/method name      | Symbol grep → `file:line`         |
| Behavior ("X calls Y") | Code evidence `file:line`         |
| Base class / interface | Inheritance verified (grep/graph) |

**FAIL triggers:** unread file paths, ungrepped method names, "should be"/"probably"/"typically" language about existing code, behaviors assumed from similar projects instead of THIS codebase. Greenfield-only plans (no existing code refs) → PASS.

- [ ] **New Tech/Lib Gate:** If plan introduces new packages/libraries/frameworks not in the project, verify alternatives were evaluated (top 3 compared) and user confirmed the choice. FAIL if new tech is added without evaluation.
- [ ] **Test spec coverage** — Every phase has `## Test Specifications` section with TC mappings. "TBD" is valid for TDD-first mode.
- [ ] **TC-requirement mapping** — Every functional requirement maps to ≥1 TC (or explicit "TBD" with rationale)
- [ ] **Behavior preservation** — Behavior-changing phases name expected behavior, unchanged behavior to preserve, and TC/test proof.
- [ ] **Docs/spec/test sync** — Relevant phases include canonical spec/doc/test updates or explicit N/A evidence.
- [ ] **Artifact freshness** — AI-extracted specs/TCs are marked reference-only until accepted; generated mirror sync is included for shared workflow/skill/tooling changes.
- [ ] **Goal Contract mapping** — When an active `goal.md` exists: every saved required success criterion is covered by ≥1 phase, and each phase's success criteria trace to saved criteria (or are marked supporting work with reason). FAIL if a saved required criterion has no covering phase, or the plan delivers work the Goal Contract never asked for without recorded justification. Skip with `No active goal` evidence when no Goal Contract exists.

#### Best Practices (Required - all must pass)

| #   | Check                                                            | Presence                                                        | Quality Depth                                                                                                                           |
| --- | ---------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **YAGNI** — No unnecessary features or over-engineering          | Is every planned component traceable to a stated requirement?   | Flag anything described as "might be useful" or added for future flexibility without a current requirement.                             |
| 2   | **KISS** — Simplest viable solution chosen                       | Is there a stated approach for each major step?                 | Could any planned abstraction be simpler with the same effect? Are there unnecessary layers, indirections, or framework choices?        |
| 3   | **DRY** — No planned duplication of logic                        | Are there similar patterns described more than once?            | Does the plan introduce new patterns when existing ones work? Are there repeated steps that suggest duplication at implementation time? |
| 4   | **Architecture** — Follows project patterns from `.claude/docs/` | Does the plan reference or align with `.claude/docs/` patterns? | Does it follow established patterns or deviate? Any deviations need explicit justification with rationale.                              |

#### Completeness (Recommended - ≥50% should pass)

| #   | Check                                                                          | Presence                                                                                 | Quality Depth                                                                                                                      |
| --- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Risk assessment present with mitigations** — risks identified with responses | Is there a risk section with at least one item?                                          | Are mitigations specific actions (who, when, triggered by what) or vague intentions ("monitor closely")?                           |
| 2   | **Testing strategy defined** — test approach outlined                          | Is there a testing section or test references per phase?                                 | Does it cover unit, integration, and edge case paths, or just "write tests"? Is the approach traceable to acceptance criteria?     |
| 3   | **Success criteria per phase** — measurable outcomes defined                   | Does each phase have stated success criteria?                                            | Are criteria measurable? Would failing them trigger a rollback, or are they aspirational targets?                                  |
| 4   | **Security considerations addressed** — security concerns noted                | Is there a security section or inline security notes?                                    | Are security concerns specific to this feature's attack surface, or generic boilerplate (e.g., "use HTTPS", "validate inputs")?    |
| 5   | **Graph dependency check** — importers of modified files are checked           | If `.code-graph/graph.db` exists: are `importers_of` queries run for each modified file? | Are ALL importers checked, not just direct callers? Is the graph.db prerequisite explicitly stated? Are missed dependents flagged? |

### Step 3: Score and Classify

| Status   | Criteria                            | Action                            |
| -------- | ----------------------------------- | --------------------------------- |
| **PASS** | All Required pass, ≥50% Recommended | Proceed to implementation         |
| **WARN** | All Required pass, <50% Recommended | Proceed with caution, note gaps   |
| **FAIL** | Any Required check fails            | STOP - must fix before proceeding |

### Step 4: Output Result

```markdown
## Plan Review Result

**Status:** PASS | WARN | FAIL
**Reviewed:** {plan-path}
**Date:** {current-date}

### Summary

{1-2 sentence summary of plan quality}

### Checks Passed ({X}/{Y})

#### Required ({X}/{Y})

- ✅ Check 1
- ✅ Check 2
- ❌ Check 3 (if failed)

#### Recommended ({X}/{Y})

- ✅ Check 1
- ⚠️ Check 2 (missing)

### Issues Found

- ❌ FAIL: {critical issue requiring fix}
- ⚠️ WARN: {minor issue, can proceed}

### Recommendations

1. {specific fix 1}
2. {specific fix 2}

### Verdict

{PROCEED | REVISE_FIRST | BLOCKED}
```

### Graph-Trace for Plan Coverage

When graph DB is available, verify the plan covers all affected files:

- For each file in the plan's "files to modify" list, run `python .claude/scripts/code_graph trace <file> --direction downstream --json`
- Flag any downstream file NOT listed in the plan as "potentially missed"
- This catches cross-service impact (MESSAGE_BUS consumers, event handlers) that the plan author may have overlooked

## Recursive Fix-and-Review Protocol (CRITICAL)

> **Protocol:** `SYNC:double-round-trip-review` + `SYNC:fresh-context-review` + `SYNC:review-protocol-injection` (all inlined above in this file).

When the review results in **FAIL, WARN, or any non-zero findings**, plan-review MUST run the Findings Validation Gate before editing any plan file. Only findings validated by `/why-review --validate-findings` may be fixed. After fixing validated actionable findings, rerun the full plan-review protocol from the first review step over the current plan. Do not spawn a fresh sub-agent just to re-review known findings before fixing them. If the restarted full review uses a sub-agent, it uses the canonical Agent template from `SYNC:review-protocol-injection` below and re-reads ALL plan files from scratch with ZERO memory of prior fixes.

## Findings Validation Gate (MANDATORY before fixing plan findings)

Trigger this gate whenever the plan-review output contains **any finding**: FAIL, WARN, recommendation requiring a plan edit, missing evidence, unresolved risk, or implementation-blocking ambiguity. Skip this gate only when the completed review pass has zero findings — or, from round 3, when its only validated findings are LOW (record them as deferred and PASS).

1. Finalize the plan-review report with every finding and enough evidence for another reviewer to validate it.
2. Call `/why-review --validate-findings` against that report in the main review flow before editing plan files.
3. If why-review returns CLEAN, fix only the validated actionable findings at the smallest responsible plan location.
4. If why-review challenges, rejects, or narrows findings, reconcile the plan-review report first, then rerun `/why-review --validate-findings` before any fix.
5. If a finding is valid but needs product/owner judgment, stop and ask the user instead of editing around the uncertainty.

**NEVER edit `plan.md` or `phase-*.md` to fix review findings before this gate passes.** This gate validates findings; the fresh full plan-review happens only after the validated fix cycle.

**When constructing the Agent call prompt for Round N (N≥2):**

1. Copy the Agent call shape from the `SYNC:review-protocol-injection` template verbatim
2. Use `subagent_type: "general-purpose"` (this is a plan review, not a code review)
3. Embed the full verbatim body of these SYNC blocks (inlined above in this skill file): `SYNC:evidence-based-reasoning`, `SYNC:rationalization-prevention`, `SYNC:graph-assisted-investigation`, `SYNC:understand-code-first` (omit code-specific protocols like `SYNC:bug-detection`, `SYNC:test-spec-verification` which are not applicable to plan files)
4. Set the Task as `"Review plan files under {plan-dir}. Validate structural completeness, code-proof anti-hallucination (every file:line claim about existing source code must exist), and adversarial simulation (imagine implementing each phase right now — what fails first?)."`
5. Set Target Files as `"read plan.md and all phase-*.md files under {plan-dir}"`
6. Set report path as `plans/reports/plan-review-round{N}-{date}.md`

After the sub-agent returns:

1. **Read** the sub-agent's report
2. **Integrate** findings as `## Re-Review {N} Findings` in the main report — DO NOT filter or override
3. **If FAIL, WARN, or any findings remain:** run the Findings Validation Gate, fix only validated actionable findings in plan files, then restart the full plan-review protocol from the first review step
4. **Repeated blocker cap:** if the same blocker repeats across 2 full invocations with no progress, escalate via `AskUserQuestion`
5. **Final verdict** must incorporate findings from ALL review passes that actually ran

### Flow

```
┌──────────────────────────────────┐
│  Round 1: Main-session review    │
│  (structural checklist + basic   │
│   code-proof trace)              │
│  Output: PASS / WARN / FAIL      │
└──────────────┬───────────────────┘
               │
        ┌──────▼──────┐
        │ ZERO        │
        │ FINDINGS?   │──YES──→ Proceed to next workflow step
        └──────┬──────┘
               │ NO
        ┌──────▼──────────────────────────────────┐
        │  VALIDATE: Run /why-review              │
        │  --validate-findings on the report.     │
        │  Only validated findings may be fixed.  │
        └──────┬──────────────────────────────────┘
               │
        ┌──────▼──────────────────────────────────┐
        │  FIX: Modify plan files to resolve       │
        │  validated actionable findings           │
        │  (plan.md/phase-*)                       │
        └──────┬──────────────────────────────────┘
               │
        ┌──────▼──────────────────────────────────┐
        │  Round 2+: FULL PLAN RE-REVIEW          │
        │  Re-run the complete plan-review        │
        │  protocol from the first review step.   │
        │  If the protocol uses agents, spawn     │
        │  new agents for that restarted pass.    │
        └──────┬──────────────────────────────────┘
               │
               └──→ Loop until the round's bar is clear (zero findings rounds 1-2; zero CRITICAL/HIGH/MEDIUM round 3+), repeated-blocker rule, or 3-round cap
```

### Iteration Rules

1. **Repeated blocker cap** — continue until a complete full review pass clears the round's bar (zero findings in rounds 1-2; zero CRITICAL/HIGH/MEDIUM from round 3, LOW-only ends it); if the same blocker repeats across 2 full invocations with no progress, STOP and escalate to user via `AskUserQuestion`
2. **Track round count** — log "Plan review Round N (full re-review)" at the start of each cycle
3. **Zero findings = exit** — proceed only when a complete plan-review pass has no findings. WARN remains a finding unless it is explicitly accepted as non-actionable by the user/owner.
4. **Diminishing scope** — each round should find FEWER issues. If Round N finds MORE than Round N-1, STOP and escalate
5. **Fix scope** — fix only why-review-validated actionable findings at the smallest responsible plan location. Do NOT rewrite the plan.
6. **Fix approach:**
    - Vague steps → expand with specific file paths, concrete actions
    - Missing sections → add them (risks, testing strategy, success criteria)
    - Conflicting steps → resolve conflicts, document rationale
    - Over-engineering → simplify, remove unnecessary complexity
    - Missing TC mappings → add TC references or "TBD" with rationale
7. **After each validated fix cycle** — rerun the full plan-review protocol from the first review step; when that restarted protocol uses agents, spawn NEW Agent calls and never reuse prior agents
8. **No silent fallback** — if the same blocker repeats across 2 full invocations with no progress, escalate via `AskUserQuestion`. NEVER fall back to any prior protocol.

## Next Steps

- **If PASS with zero findings** (or, from round 3, PASS with only deferred LOW findings listed): Announce "Plan review complete. Proceeding with next workflow step."
- **If WARN or other findings remain**: Run the Findings Validation Gate; fix only validated actionable findings in plan files, or ask the user to explicitly accept non-actionable risk before proceeding.
- **If FAIL**: Run the Findings Validation Gate, fix only validated actionable findings in plan files, then rerun the full plan-review protocol recursively.
- **If repeated blocker cap is reached**: List remaining issues. STOP. Ask user to fix or regenerate plan via `AskUserQuestion`.

## Important Notes

- Be constructive, not pedantic — focus on issues that would cause implementation problems
- WARN is not an automatic exit condition; fix it when actionable, or document explicit non-actionable acceptance before proceeding.
- FAIL remains for genuinely missing required content; lower-severity findings still remain tracked until resolved or explicitly accepted.
- **NEVER do a quick review** — even "simple" plans had 13 bugs in real testing. Always run the complete declared review protocol; do not stop because of an arbitrary round count.

---

## Skill Interconnection (Standalone: MUST ATTENTION ask user via `AskUserQuestion`. Skip if inside workflow.)

**MANDATORY — NO EXCEPTIONS** after completing this skill, you MUST use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"Proceed with full workflow (Recommended)"** — I'll detect the best workflow to continue from here (plan reviewed). This ensures validation, implementation, testing, and docs steps aren't skipped.
- **"/plan-validate"** — Interview user to confirm plan assumptions
- **"/feature-implement" or "/plan-execute"** — If plan is approved and ready for implementation
- **"Skip, continue manually"** — user decides

> **[BLOCKING]** This is a validation gate. MUST ATTENTION use `AskUserQuestion` to present review findings and get user confirmation. Completing without asking at least one question is a violation.

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI must ask user whether to skip.

> **Critical Purpose:** Ensure quality — no flaws, no bugs, no missing updates, no stale content. Verify both code AND documentation.

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

> **OOP & DRY Enforcement:** MANDATORY — flag duplicated patterns that should be extracted to a base class, generic, or helper. Classes in the same group (same suffix, same lifecycle, same purpose) must share a common base (even if empty now — enables future shared logic and child overrides). Verify project has code linting/analyzer configured for the stack.

<!-- SYNC:behavioral-delta-matrix -->

> **Behavioral Delta Matrix** — MANDATORY for bugfix reviews. Produce this table BEFORE PASS/FAIL verdict. Narrative descriptions don't substitute.
>
> | Input state | Pre-fix behavior   | Post-fix behavior | Delta                                |
> | ----------- | ------------------ | ----------------- | ------------------------------------ |
> | {condition} | {current behavior} | {fixed behavior}  | Preserved ✓ / Fixed ✓ / REGRESSION ✗ |
>
> **Rules:** ≥3 rows · ≥1 row the bug report did NOT mention · REGRESSION delta → FAIL until a preservation test covers it (`spec-tests-template.md#preservation-tests-mandatory-for-bugfix-specs`)
>
> **BLOCKED until:** ≥3 rows · ≥1 row outside bug report · no unmitigated REGRESSION

<!-- /SYNC:behavioral-delta-matrix -->

<!-- SYNC:graph-assisted-investigation -->

> **Graph-Assisted Investigation** — MANDATORY when `.code-graph/graph.db` exists.
>
> **HARD-GATE:** MUST ATTENTION run at least ONE graph command on key files before concluding any investigation.
>
> **Pattern:** Grep finds files → `trace --direction both` reveals full system flow → Grep verifies details
>
> | Task                | Minimum Graph Action                         |
> | ------------------- | -------------------------------------------- |
> | Investigation/Scout | `trace --direction both` on 2-3 entry files  |
> | Fix/Debug           | `callers_of` on buggy function + `tests_for` |
> | Feature/Enhancement | `connections` on files to be modified        |
> | Code Review         | `tests_for` on changed functions             |
> | Blast Radius        | `trace --direction downstream`               |
>
> **CLI:** `python .claude/scripts/code_graph {command} --json`. Use `--node-mode file` first (10-30x less noise), then `--node-mode function` for detail.

<!-- /SYNC:graph-assisted-investigation -->

<!-- SYNC:cross-service-check -->

> **Cross-Service Check** — Microservices/event-driven: MANDATORY before concluding investigation, plan, spec, or feature doc. Missing downstream consumer = silent regression.
>
> | Boundary            | Grep terms                                                                      |
> | ------------------- | ------------------------------------------------------------------------------- |
> | Event producers     | `Publish`, `Dispatch`, `Send`, `emit`, `EventBus`, `outbox`, `IntegrationEvent` |
> | Event consumers     | `Consumer`, `EventHandler`, `Subscribe`, `@EventListener`, `inbox`              |
> | Sagas/orchestration | `Saga`, `ProcessManager`, `Choreography`, `Workflow`, `Orchestrator`            |
> | Sync service calls  | HTTP/gRPC calls to/from other services                                          |
> | Shared contracts    | OpenAPI spec, proto, shared DTO — flag breaking changes                         |
> | Data ownership      | Other service reads/writes same table/collection → Shared-DB anti-pattern       |
>
> **Per touchpoint:** owner service · message name · consumers · risk (NONE / ADDITIVE / BREAKING).
>
> **BLOCKED until:** Producers scanned · Consumers scanned · Sagas checked · Contracts reviewed · Breaking-change risk flagged

<!-- /SYNC:cross-service-check -->

<!-- SYNC:fresh-context-review -->

> **Fresh Context Re-Review** — Eliminate orchestrator confirmation bias after fixes by restarting the full review with isolated sub-agents where applicable.
>
> **Why:** The main agent knows what it (or `/feature-implement`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** ONLY after a validated-finding fix cycle. A review round that finds zero issues ENDS the loop — do NOT spawn a confirmation sub-agent. A review round that finds issues triggers: validate findings → fix → full review restart from the first phase.
>
> **How:**
>
> 1. Start a NEW full review invocation/task breakdown; when that protocol calls for agents, spawn NEW `Agent` tool calls — use `code-reviewer` subagent_type for code reviews, `general-purpose` for plan/doc/artifact reviews
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. Never reference protocols by file path; AI compliance drops behind file-read indirection (see `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `plans/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - SKIP fresh sub-agent when the prior full review found zero issues (no fixes = nothing new to verify)
> - NEVER skip the full review restart after a fix cycle — every fix invalidates the prior verdict
> - NEVER reuse a sub-agent across rounds — every fresh round spawns a NEW `Agent` call
> - Continue until a complete full review pass clears that round's exit bar per `SYNC:double-round-trip-review`: **rounds 1-2** → zero findings at any severity; **round 3+** → zero CRITICAL/HIGH/MEDIUM, so a round whose validated findings are ALL LOW ENDS the loop (list those LOWs as deferred instead of spawning another round). If the same blocker repeats 3 times with no progress, escalate via `AskUserQuestion`
> - Track iteration count and repeated blockers in conversation context (session-scoped, no persistent files)

<!-- /SYNC:fresh-context-review -->

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call `TaskList` first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] $skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** `TaskList` done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:task-tracking-external-report -->

> **Task Tracking & External Report Persistence** — Bootstrap this before execution; then run project-reference doc prefetch before target/source work.
>
> 1. Create a small task breakdown before target file reads, grep, edits, or analysis. On context loss, inspect the current task list first.
> 2. Mark one task `in_progress` before work and `completed` immediately after evidence; never batch transitions.
> 3. For plan/review work, create `plans/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` before first finding.
> 4. Append findings after each file/section/decision and synthesize from the report file at the end.
> 5. Final output cites `Full report: plans/reports/{filename}`.
>
> **Blocked until:** task breakdown exists, report path declared for plan/review work, first finding persisted before the next finding.

<!-- /SYNC:task-tracking-external-report -->

<!-- SYNC:estimation-framework -->

> **Estimation Framework** — Bottom-up first; SP DERIVED; output min-max range when likely ≥3d. Stack-agnostic. Baseline: 3-5yr dev, 6 productive hrs/day. AI estimate assumes Claude Code + project context.
>
> **Method:**
>
> 1. **Blast Radius pass** (below) — drives code AND test cost
> 2. Decompose phases → hours/phase → `bottom_up_hours = Σ phase_hours`
> 3. `likely_days = ceil(bottom_up_hours / 6) × productivity_factor`
> 4. Sum **Risk Margin** (base + add-ons) → `max_days = likely_days × (1 + margin)`
> 5. `min_days = likely_days × 0.9`
> 6. Output as range when `likely_days ≥3`; single point allowed `<3` (still record margin)
> 7. `man_days_ai` = same range × AI speedup
> 8. `story_points` DERIVED from `likely_days` via SP-Days — NEVER driver. Disagreement >50% → trust bottom-up
>
> **Productivity factor:** 0.8 strong scaffolding+codegen+AI hooks · 1.0 mature default · 1.2 weak patterns · 1.5 greenfield
>
> **Cost Driver Heuristic (apply BEFORE work-type row):**
>
> - **UI dominates** in CRUD/business apps — 1.5-3x backend (states, validation, responsive, a11y, polish)
> - **Backend dominates ONLY:** multi-aggregate invariants, cross-service contracts, schema migrations, heavy query/perf, new event flows
>
> **Reuse-vs-Create axis (PRIMARY lever, per layer):**
>
> | UI tier                                      | Cost     |
> | -------------------------------------------- | -------- |
> | Reuse component on existing screen           | 0.1-0.3d |
> | Add control/column to existing screen        | 0.3-0.8d |
> | Compose components into NEW screen           | 1-2d     |
> | NEW screen, custom layout/states/validation  | 2-4d     |
> | NEW shared/common component (themed, tested) | 3-6d+    |
>
> | Backend tier                                         | Cost      |
> | ---------------------------------------------------- | --------- |
> | Reuse query/handler from new place                   | 0.1-0.3d  |
> | Small update existing handler/entity                 | 0.3-0.8d  |
> | NEW query on existing repo/model                     | 0.5-1d    |
> | NEW command/handler on existing aggregate (additive) | 1-2d      |
> | NEW aggregate/entity (repo, validation, events)      | 2-4d      |
> | NEW cross-service contract OR schema migration       | 2-4d each |
> | Multi-aggregate invariant / heavy domain rule        | 3-5d      |
>
> **Rule:** Sum tiers across UI+backend+tests, apply productivity factor. Reuse short-circuits tiers — call out.
>
> **Test-Scope drivers (compute test_count EXPLICITLY — "+tests" hand-wave is #1 failure):**
>
> | Driver                            | Count                                                  |
> | --------------------------------- | ------------------------------------------------------ |
> | Happy-path journeys               | 1 per story / AC main flow                             |
> | State-machine transitions         | reachable transitions × allowed actors                 |
> | Multi-entity state combos         | state(A) × state(B) — REACHABLE only, not Cartesian    |
> | Authorization matrix              | (owner, non-owner, elevated, unauth) × each mutation   |
> | Validation rules                  | 1 per required field / boundary / format / cross-field |
> | UI states (per new screen/dialog) | happy, loading, empty, error, partial — present only   |
> | Negative paths / invariants       | 1 per violatable business rule                         |
>
> | Test tier (Trad, incl. setup+assert+flake) | Cost     |
> | ------------------------------------------ | -------- |
> | 1-5 cases, fixtures reused                 | 0.3-0.5d |
> | 6-12 cases, 1 new fixture                  | 0.5-1d   |
> | 13-25 cases, multi-entity setup            | 1-2d     |
> | 26-50 cases OR new state-machine coverage  | 2-3d     |
> | >50 cases OR full E2E journey              | 3-5d     |
>
> **Test multipliers:** new fixture/seed harness +0.5d · cross-service/bus assertion +0.3d each · UI E2E ×1.5 · each new role +1-2 cases
>
> **Blast Radius (mandatory pre-pass — affects code AND test):**
>
> 1. Files/components directly modified — count
> 2. Of those, "complex" (>500 LOC, multi-handler, central, frequently-modified) — count
> 3. Downstream consumers (callers, event subscribers, cross-service) — list
> 4. Shared/common code touched (multi-app blast) — yes/no
> 5. Regression scope — areas needing re-test
>
> **Rule:** Complex touch → add `risk_factors`. Each downstream consumer → +1-3 regression cases. Blast >5 areas OR >2 complex → re-evaluate SPLIT before estimating.
>
> **Risk Margin (drives max bound):**
>
> | likely_days         | Base margin                     |
> | ------------------- | ------------------------------- |
> | <1d trivial         | +10%                            |
> | 1-2d small additive | +20%                            |
> | 3-4d real feature   | +35%                            |
> | 5-7d large          | +50%                            |
> | 8-10d very large    | +75%                            |
> | >10d                | +100% AND **flag SHOULD SPLIT** |
>
> **Risk-factor add-ons (additive — enumerate in `risk_factors`):**
>
> | Factor                                                                | +margin |
> | --------------------------------------------------------------------- | ------- |
> | `touches-complex-existing-feature` (>500 LOC, multi-handler, central) | +20%    |
> | `cross-service-contract` change                                       | +25%    |
> | `schema-migration-on-populated-data`                                  | +25%    |
> | `new-tech-or-unfamiliar-pattern`                                      | +30%    |
> | `regression-fan-out` (≥3 downstream areas re-test)                    | +20%    |
> | `performance-or-latency-critical`                                     | +20%    |
> | `concurrency-race-event-ordering`                                     | +25%    |
> | `shared-common-code` (multi-consumer/multi-app)                       | +25%    |
> | `unclear-requirements-or-design`                                      | +30%    |
>
> **Collapse rule:** total margin >100% → STOP, split (padding past 2x is dishonesty). Margin <15% on `likely_days ≥5` → under-estimated, widen.
>
> **Work-Type Caps (hard ceilings on `likely_days`):**
> | Work type | Max SP | Max likely |
> | --- | --- | --- |
> | Single field / config flag / style fix | 1 | 0.5d |
> | Add property to existing model + bind to existing UI | 2 | 1d |
> | **Additive endpoint + minor UI control** (button/menu/column), reuses fixtures | **3** | **2-3d** |
> | Additive endpoint + **NEW UI surface** OR additive multi-layer + new domain rule + 2+ test files | 5 | 3-5d |
> | NEW model/aggregate OR migration OR cross-module contract OR heavy test (>1.5d) OR NEW UI + non-trivial backend | 8 | 5-7d |
> | NEW UI surface + (NEW aggregate OR migration OR cross-service contract) | 13 | SHOULD split |
> | Cross-service contract + migration combined | 13 | SHOULD split |
> | Beyond | 21 | MUST split |
>
> **SP→Days (validation only):** 1=0.5d/0.25d · 2=1d/0.35d · 3=2d/0.65d · 5=4d/1.0d · 8=6d/1.5d · 13=10d/2.0d (Trad/AI likely)
> **AI speedup:** SP 1≈2x · 2-3≈3x · 5-8≈4x · 13+≈5x. AI cost = `(code_gen × 1.3) + (test_gen × 1.3)` (30% review overhead).
>
> **MANDATORY frontmatter:**
>
> ```yaml
> story_points: <n>
> complexity: low | medium | high | critical
> man_days_traditional: '<min>-<max>d' # range when likely ≥3d; '<N>d' when <3d
> man_days_ai: '<min>-<max>d'
> risk_margin_pct: <n> # base + add-ons
> risk_factors: [touches-complex-existing-feature, regression-fan-out] # closed-list from add-ons; [] if none
> blast_radius:
>     touched_areas: <n>
>     complex_touched: <n>
>     downstream_consumers: [list or count]
>     shared_common_code: yes | no
> estimate_scope_included: [code, integration-tests, frontend, i18n, docs]
> estimate_scope_excluded: [unit-tests, e2e, perf, deployment, code-review-rounds]
> estimate_reasoning: |
>     5-7 lines covering:
>     (a) UI tier — row applied
>     (b) Backend tier — row applied
>     (c) Test scope — case breakdown by driver, file count, fixtures, tier row
>     (d) Cost driver — dominant tier + why
>     (e) Blast radius — touched, complex, regression scope
>     (f) Risk factors — list driving margin; why not larger/smaller
>     Example: "UI: compose Form/Table/Dialog → NEW screen (~1.5d). Backend: NEW command on existing aggregate,
>     reuses validation+repo (~1d). Tests: 4 transitions × 2 actors + 3 validation + 2 UI states = 13 cases,
>     1 new fixture → tier 13-25 ~1.5d. Driver: UI composition + new states. Blast: 4 areas, 1 complex.
>     Risk: base 35% + touches-complex +20% = 55% → max 3.9d → range 2.5-4d."
> ```
>
> **Sanity self-check:**
>
> - `likely_days ≥3d` and single-point? → reject, must be range
> - Margin <15% on `likely_days ≥5d`? → under-estimated, widen
> - Margin >100%? → STOP, split instead of buffer
> - Complex existing feature touched, no regression budget in `(c)`? → reject
> - Blast `>5` areas OR `>2` complex, no split discussion? → reject
> - Purely additive on existing model AND existing UI? → cap SP 3 unless tests >1.5d
> - NEW UI surface (page/complex form/dashboard)? → SP 5+ even if backend one endpoint
> - Backend cross-service / migration / multi-aggregate? → SP 8+ regardless of UI
> - `bottom_up_hours / 6` vs SP-Days disagreement >50%? → trust bottom-up, downgrade SP
> - Without tests, SP drops ≥1 bucket? → tests dominate; state explicitly
> - Reasoning called out UI vs backend vs blast vs risk factors? → if missing, add

<!-- /SYNC:estimation-framework -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:sequential-thinking-protocol -->

> **Sequential Thinking Protocol** — Structured multi-step reasoning for complex/ambiguous work. Use when planning, reviewing, debugging, or refining ideas where one-shot reasoning is unsafe.
>
> **Trigger when:** complex problem decomposition · adaptive plans needing revision · analysis with course correction · unclear/emerging scope · multi-step solutions · hypothesis-driven debugging · cross-cutting trade-off evaluation.
>
> **Format (explicit mode — visible thought trail):**
>
> 1. `Thought N/M: [aspect]` — one aspect per thought, state assumptions/uncertainty
> 2. `Thought N/M [REVISION of Thought K]: ...` — when prior reasoning invalidated; state Original / Why revised / Impact
> 3. `Thought N/M [BRANCH A from Thought K]: ...` — explore alternative; converge with decision rationale
> 4. `Thought N/M [HYPOTHESIS]: ...` then `[VERIFICATION]: ...` — test before acting
> 5. `Thought N/N [FINAL]` — only when verified, all critical aspects addressed, confidence >80%
>
> **Mandatory closers:** Confidence % stated · Assumptions listed · Open questions surfaced · Next action concrete.
>
> **Stop conditions:** confidence <80% on any critical decision → escalate via AskUserQuestion · ≥3 revisions on same thought → re-frame the problem · branch count >3 → split into sub-task.
>
> **Implicit mode:** apply methodology internally without visible markers when adding markers would clutter the response (routine work where reasoning aids accuracy).
>
> **Deep-dive:** see `/sequential-thinking` skill (`.claude/skills/sequential-thinking/SKILL.md`) for worked examples (API design, debugging, architecture), advanced techniques (spiral refinement, hypothesis testing, convergence), and meta-strategies (uncertainty handling, revision cascades).

<!-- /SYNC:sequential-thinking-protocol -->

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate** — Run after task-tracking bootstrap and before target/source file reads, grep, edits, or analysis. Project docs override generic framework assumptions.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. **Read `docs/project-config.json` first — the project's machine-readable map.** It is the single source of truth for THIS repo (modules/paths, framework + search keywords, test/E2E/integration run-commands, design system, architecture rules, workflow patterns); ground exact paths, run-commands, and conventions on it **before investigating, planning, or coding** — never assume framework defaults (`CLAUDE.md` + reference docs are derived from it). If it — or the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any required reference doc — is missing or stale, auto-run `/project-init` or the narrow route (`/project-config`, `/docs-init`, `/scan-all`, `/scan --target=<key>`, `/claude-md-init`) first; if Codex mirrors or `AGENTS.md` are stale, ask the user to run `/sync-codex` (never auto-run it).
> 3. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`; behavior/public-contract/spec-test-code sync `workflow-spec-test-code-cycle-reference.md`; derived spec index/ERD/reimplementation guides `spec-system-reference.md` + source Feature Specs under `docs/specs/`; architecture/new area `project-structure-reference.md`.
> 4. Read every required doc, then before target work state: `Reference docs read: ... | Not applicable: ...`.
>
> **Ready when:** scope evaluated, `docs/project-config.json` consulted, required docs checked/read or setup route completed, `lessons.md` confirmed, citation emitted.

<!-- /SYNC:project-reference-docs-guide -->

<!-- SYNC:understand-code-first -->

> **Understand Code First** — HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
>
> 1. Search 3+ similar patterns (`grep`/`glob`) — cite `file:line` evidence
> 2. Read existing files in target area — understand structure, base classes, conventions
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists
> 4. Map dependencies via `connections` or `callers_of` — know what depends on your target
> 5. Write investigation to `.ai/workspace/analysis/` for non-trivial tasks (3+ files)
> 6. Re-read analysis file before implementing — never work from memory alone. — why: long context drifts from the file; the file is ground truth
> 7. NEVER invent new patterns when existing ones work — match exactly or document deviation. — why: divergent patterns fragment the codebase and slow every future reader
>
> **BLOCKED until:** `- [ ]` Read target files `- [ ]` Grep 3+ patterns `- [ ]` Graph trace (if graph.db exists) `- [ ]` Assumptions verified with evidence

<!-- /SYNC:understand-code-first -->

<!-- SYNC:double-round-trip-review -->

> **Validated-Finding Fix + Full Re-Review Loop** — Re-review is triggered by a validated finding fix cycle, not by a round number. Review purpose: `review → validate findings → fix validated findings → full re-review` until a complete review pass clears the round's exit bar (see **Severity floor** below). **A clean review ENDS the loop — no further rounds required.**
>
> _aka **Self-Review Convergence Loop**._ The name is historical — there is **NO 2-round cap**; "double-round-trip" only means a validated-finding fix cycle forces at least one fresh re-review. It runs until a clean pass, bounded by the **3-round ceiling** below.
>
> **Round cap — 3 rounds MAX (a ceiling, NEVER a target).** A clean pass ENDS the loop immediately at ANY round — round 1 included; the cap never obliges you to keep spinning. Hitting round 3 with blocking findings still open (severity floor applied) → **STOP and escalate via `AskUserQuestion`** with the still-open findings listed; NEVER emit a silent "good enough" PASS on cap exhaustion, and NEVER let the cap substitute for the clean-review requirement. The 2-repeated-no-progress blocker rule stays an EARLIER exit — escalate at whichever trips first.
>
> **Severity floor — from round 3, LOW stops blocking.** The exit bar tightens by round, so the loop converges on consequence instead of spinning on polish:

> Define one predicate everywhere: `blocking_findings(round, findings)` returns all validated findings in rounds 1–2 and only validated CRITICAL/HIGH/MEDIUM findings in round 3+. A binary gate (test-green, security must-fix, required artifact) is exempt only when its owning invariant explicitly says so.
>
> | Round | Exit bar — loop ENDS when the fresh full review has…                      | Must be fixed to continue      |
> | ----- | ------------------------------------------------------------------------- | ------------------------------ |
> | 1-2   | zero validated findings at ANY severity                                   | CRITICAL · HIGH · MEDIUM · LOW |
> | 3+    | zero validated CRITICAL / HIGH / MEDIUM findings — **LOW-only is a PASS** | CRITICAL · HIGH · MEDIUM only  |
>
> From round 3 onward LOW findings are **NOT required to be fixed**: a round whose validated findings are ALL LOW **ENDS the loop immediately** — do not open another round for them. Severity tiers are `SYNC:severity-rubric` (CRITICAL block-merge · HIGH must-fix · MEDIUM should-fix · LOW nice-to-fix); rounds 1-2 are unchanged, so an easy LOW still gets fixed early when it is cheap.
>
> **Severity-floor rules:**
>
> - **Never silently drop a deferred LOW.** Every unfixed LOW is listed in the final report under `## Deferred LOW Findings (severity floor, round ≥3)` with file, line, and description, so the owner can schedule it. Dropping it from the report is a protocol violation, not a clean pass.
> - **Never re-tier a finding to trigger the exit.** Downgrading a real CRITICAL/HIGH/MEDIUM to LOW so the loop can end is a FALSE PASS. Severity is set by consequence per `SYNC:severity-rubric` before the round bar is applied — never after, and never with the exit in view. — why: a floor that can be reached by relabeling is not a floor.
> - **The floor bounds the loop, not the standard.** It ends _iteration_; it never authorizes shipping a known CRITICAL/HIGH/MEDIUM, and it never lowers the finding-survival bar that admits a finding in the first place.
> - **The floor never applies to a hard gate.** Test-green gates (a suite must actually pass), security must-fix gates, and any gate whose criterion is binary rather than severity-rated are unaffected — a failing test is a failure, not a LOW finding.
>
> **Universal scope (any new output/judgment):** any newly produced output or judgment gets **≥1 self-review**; any **new judgment** gets **≥1 `/why-review --validate-findings` pass**; anything flagged to re-check is re-checked **≥1 time** — before that output is treated as final. This loop is the default convergence contract for ANY work-producing skill, not review skills only.
>
> **Routing invariant (author-facing):** a skill that validates findings MUST route them through `/why-review --validate-findings` (the terminal validator) — NEVER fork an inline finding-validation. Routing through why-review is what makes the finding-survival bar and this loop apply; the `verify-review-validate-coverage` sensor enforces this exact route mechanically.
>
> **Round 1:** Main-session review. Read target files, build understanding, note issues. Output findings + verdict (PASS / FAIL).
>
> **Decision after Round 1:**
>
> - **No issues found (PASS, zero findings)** → review ENDS. Do NOT spawn a fresh sub-agent for confirmation.
> - **`blocking_findings(round, findings)` is non-empty** → run the active review skill's findings-validation gate first; for review skills the default gate is `/why-review --validate-findings <report-path>`. Fix only validated findings, then restart the full review protocol from the beginning with a fresh task breakdown.
>
> **Fresh full re-review after every fix cycle:** Re-run the whole review protocol over the current full target. When sub-agents are part of that protocol, spawn NEW `Agent` calls — never reuse prior agents. Reviewers re-read ALL files from scratch with ZERO memory of prior rounds. See `SYNC:fresh-context-review` for the spawn mechanism and `SYNC:review-protocol-injection` for the canonical Agent prompt template. Each fresh full review must catch:
>
> - Cross-cutting concerns missed in the prior round
> - Interaction bugs between changed files
> - Convention drift (new code vs existing patterns)
> - Missing pieces that should exist but don't
> - Subtle edge cases the prior round rationalized away
> - Regressions introduced by the fixes themselves
>
> **Loop termination:** After each full re-review, repeat the same decision against **that round's exit bar**: bar cleared → END; blocking findings remain → validate findings → fix → restart from the first review phase. Rounds 1-2 clear on zero findings at any severity; **from round 3 the bar is zero CRITICAL/HIGH/MEDIUM, so a LOW-only round ENDS the loop** (deferred LOWs go in the report). Capped at **3 rounds**. Escalate via `AskUserQuestion` at whichever comes first: the same validated finding repeats for 2 full invocations with no progress · a fix requires product/owner input · round 3 completes with CRITICAL/HIGH/MEDIUM still open. NEVER loop past 3 rounds, and NEVER convert cap exhaustion into a PASS.
>
> **Rules:**
>
> - A clean Round 1 ENDS the review — no mandatory Round 2
> - From round 3 on, a round whose validated findings are ALL LOW ENDS the loop — never open round N+1 to fix LOW alone; list those LOWs as deferred instead
> - NEVER re-tier a CRITICAL/HIGH/MEDIUM down to LOW to reach the round-3 exit — severity is assigned by consequence before the bar is applied
> - NEVER fix unvalidated findings; validate first using the caller's validation gate
> - Every surviving finding must additionally clear the **finding-survival bar** defined in why-review's Findings Validation Routine (a deliberately higher bar than the generic act-gate — "keep this finding?" is a stricter question than "act on this evidence?"); a finding below the bar is demoted or dropped, not kept
> - NEVER skip the full re-review after a fix cycle (every fix invalidates the prior verdict)
> - NEVER reuse a sub-agent across rounds — every iteration that uses sub-agents spawns NEW Agent calls
> - Main agent READS sub-agent reports but MUST NOT filter, reinterpret, or override findings
> - The 3-round cap NEVER replaces the clean-review requirement — it bounds runaway looping, it does not authorize shipping an un-clean review; a clean pass ends the loop early at any round, and cap exhaustion escalates rather than passes
> - Enforce the round cap of 3 alongside the 2 repeated-no-progress blocker rule; both are escalation triggers, neither is a completion criterion
> - Track recursive invocation count and repeated blockers in conversation context (session-scoped)
> - Final verdict must incorporate ALL rounds executed
>
> **Report must include `## Round N Findings (Fresh Sub-Agent)` for every round N≥2 that was executed, plus `## Deferred LOW Findings (severity floor, round ≥3)` whenever the loop ended on the round-3+ bar with LOWs still open.**

<!-- /SYNC:double-round-trip-review -->

<!-- SYNC:review-protocol-injection -->

> **Review Protocol Injection** — Every fresh sub-agent review prompt MUST embed 11 protocol blocks VERBATIM. The template below has ALL 11 bodies already expanded inline. Copy the template wholesale into the Agent call's `prompt` field at runtime, replacing only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific values. Do NOT touch the embedded protocol sections.
>
> **Why inline expansion:** Placeholder markers would force file-read indirection at runtime. AI compliance drops significantly behind indirection (see `SYNC:shared-protocol-duplication-policy`). Therefore the template carries all 11 protocol bodies pre-embedded.

### Subagent Type Selection

- `code-reviewer` — for code reviews (reviewing source files, git diffs, implementation)
- `general-purpose` — for plan / doc / artifact reviews (reviewing markdown plans, docs, specs)

### Canonical Agent Call Template (Copy Verbatim)

```
Agent({
  description: "Fresh Round {N} review",
  subagent_type: "code-reviewer",
  prompt: `
## Task
{review-specific task — e.g., "Review all uncommitted changes for code quality" | "Review plan files under {plan-dir}" | "Review integration tests in {path}"}

## Round
Round {N}. You have ZERO memory of prior rounds. Re-read all target files from scratch via your own tool calls. Do NOT trust anything from the main agent beyond this prompt.

## Protocols (follow VERBATIM — these are non-negotiable)

### Spec ↔ Tests ↔ Code Triangulation
DO THIS FIRST — before any per-protocol check below. The review target is the WHOLE PACKAGE, not the diff alone: load the behavior's spec (§3 ACs / §4 BRs / §8 TCs), its tests, and the changed code TOGETHER, and reason about their mutual consistency BEFORE judging any one in isolation.
1. Locate all three faces: the Feature Spec section(s) governing the changed behavior, the tests that guard it, and the production code that implements it. A missing face is itself a finding (SPEC-GAP / TEST-GAP / DEAD-SPEC).
2. Triangulate pairwise — every disagreement is a finding; classify which face is wrong:
   - code vs spec: behavior the code does that no §3/§4/§8 rule describes → CODE-EXTRA or SPEC-STALE; a [HARD] §4 rule or §5 invariant with no enforcing code path → CODE-WRONG.
   - tests vs spec: a §8 TC with no test, or a test asserting behavior no TC/rule names → TEST-GAP or SPEC-SILENT.
   - tests vs code: a changed code path with no covering test → TEST-GAP; a test that still passes against a deliberately broken invariant → WEAK-TEST (apply the mutation thinking in Bug Detection).
3. Hidden-rule capture: any invariant the code enforces but the spec never states (SPEC-SILENT) MUST be surfaced as a finding to add into §3/§4/§8 AND guarded with a test — the enrichment loop, never a silent pass.
4. Only after the three faces agree — or every disagreement is logged as a finding — proceed to the per-protocol checks below; when enrichment adds spec/test content, re-review the package against the enriched spec.
NEVER mark review PASS while any spec/test/code face disagrees without a logged finding. The diff is the entry point; the package is the unit of judgment.

### Evidence-Based Reasoning
Speculation is FORBIDDEN. Every claim needs proof.
1. Cite file:line, grep results, or framework docs for EVERY claim
2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
3. Cross-service validation required for architectural changes
4. "I don't have enough evidence" is valid and expected output
BLOCKED until: Evidence file path (file:line) provided; Grep search performed; 3+ similar patterns found; Confidence level stated.
Forbidden without proof: "obviously", "I think", "should be", "probably", "this is because".
If incomplete → output: "Insufficient evidence. Verified: [...]. Not verified: [...]."

### Bug Detection
MUST check categories 1-4 for EVERY review. Never skip.
1. Null Safety: Can params/returns be null? Are they guarded? Optional chaining gaps? .find() returns checked?
2. Boundary Conditions: Off-by-one (< vs <=)? Empty collections handled? Zero/negative values? Max limits?
3. Error Handling: Try-catch scope correct? Silent swallowed exceptions? Error types specific? Cleanup in finally?
4. Resource Management: Connections/streams closed? Subscriptions unsubscribed on destroy? Timers cleared? Memory bounded?
5. Concurrency (if async): Missing await? Race conditions on shared state? Stale closures? Retry storms?
6. Stack-Specific: Check the configured language/runtime pitfalls and framework-specific failure modes discovered from local code.
Classify: CRITICAL (crash/corrupt) → FAIL | HIGH (incorrect behavior) → FAIL | MEDIUM (edge case) → WARN | LOW (defensive) → INFO.

### Design Patterns Quality
Priority checks for every code change:
1. DRY via OOP: Same-suffix classes (*Entity, *Dto, *Service) MUST share base class. 3+ similar patterns → extract to shared abstraction.
2. Right Responsibility: Logic in LOWEST layer (Entity > Domain Service > Application Service > Controller). Never business logic in controllers.
3. SOLID: Single responsibility (one reason to change). Open-closed (extend, don't modify). Liskov (subtypes substitutable). Interface segregation (small interfaces). Dependency inversion (depend on abstractions).
4. After extraction/move/rename: Grep ENTIRE scope for dangling references. Zero tolerance.
5. YAGNI gate: NEVER recommend patterns unless 3+ occurrences exist. Don't extract for hypothetical future use.
Anti-patterns to flag: God Object, Copy-Paste inheritance, Circular Dependency, Leaky Abstraction.

### Logic & Intention Review
Verify WHAT code does matches WHY it was changed.
1. Change Intention Check: Every changed file MUST serve the stated purpose. Flag unrelated changes as scope creep.
2. Happy Path Trace: Walk through one complete success scenario through changed code.
3. Error Path Trace: Walk through one failure/edge case scenario through changed code.
4. Acceptance Mapping: If plan context available, map every acceptance criterion to a code change.
5. Tests Verify Intent: For test/spec changes, verify tests name the protected business rule or invariant and would fail if that intent breaks.
6. Migration Test Exclusion: Do not write tests for migration code. Schema/data migrations are one-time execution paths, not core application logic.
NEVER mark review PASS without completing both traces (happy + error path).

### Test Spec Verification
Map changed code to test specifications.
1. Identify the project's test/spec format from existing docs, test-case files, BDD feature files, or spec folders.
2. Every changed code path MUST map to a corresponding test case/spec (or flag as "needs test case").
3. New functions/endpoints/handlers → flag for test spec creation.
4. Migration files are excluded from test/spec creation; schema/data migrations are one-time execution paths, not core application logic.
5. If spec evidence fields exist, verify they point to actual code (file:line, not stale references).
6. Verify each meaningful test case names the business intent/invariant; flag behavior-only cases that only mirror implementation details.
7. Auth/data changes → verify corresponding authorization and data-state test cases exist.
8. If no specs exist for a changed path → log the gap and recommend the project's test-spec workflow.
NEVER skip test mapping. Untested code paths are the #1 source of production bugs.

### Behavioral Delta Matrix
MANDATORY for any bugfix review. Produce input-state × pre-fix × post-fix × delta table BEFORE writing verdict.
- Minimum 3 rows; include at least one row OUTSIDE the original bug report.
- Any "REGRESSION" delta → review returns FAIL until a preservation test is added.
- Narrative descriptions do NOT substitute for the matrix.
Example rows (external-record sync fix):
| Input                 | Pre-fix | Post-fix                  | Delta      |
| --------------------- | ------- | ------------------------- | ---------- |
| Record exists (valid) | Reused  | Always recreated → orphan | REGRESSION |
| Record missing (404)  | Error   | Recreated                 | Fixed      |

### Fix-Layer Accountability
NEVER fix at the crash site. Trace the full flow, fix at the owning layer. The crash site is a SYMPTOM, not the cause.
MANDATORY before ANY fix:
1. Trace full data flow — Map the complete path from data origin to crash site across ALL layers (storage → backend → API → frontend → UI). Identify where bad state ENTERS, not where it CRASHES.
2. Identify the invariant owner — Which layer's contract guarantees this value is valid? Fix at the LOWEST layer that owns the invariant, not the highest layer that consumes it.
3. One fix, maximum protection — If fix requires touching 3+ files with defensive checks, you are at the wrong layer — go lower.
4. Verify no bypass paths — Confirm all data flows through the fix point. Check for direct construction skipping factories, clone/spread without re-validation, raw data not wrapped in domain models, mutations outside the model layer.
BLOCKED until: Full data flow traced (origin → crash); Invariant owner identified with file:line evidence; All access sites audited (grep count); Fix layer justified (lowest layer that protects most consumers).
Anti-patterns (REJECT): "Fix it where it crashes" (crash site ≠ cause site, trace upstream); "Add defensive checks at every consumer" (scattered defense = wrong layer); "Both fix is safer" (pick ONE authoritative layer).

### Rationalization Prevention
AI skips steps via these evasions. Recognize and reject:
- "Too simple for a plan" → Simple + wrong assumptions = wasted time. Plan anyway.
- "I'll test after" → RED before GREEN. Write/verify test first.
- "Already searched" → Show grep evidence with file:line. No proof = no search.
- "Just do it" → Still need TaskCreate. Skip depth, never skip tracking.
- "Just a small fix" → Small fix in wrong location cascades. Verify file:line first.
- "Code is self-explanatory" → Future readers need evidence trail. Document anyway.
- "Combine steps to save time" → Combined steps dilute focus. Each step has distinct purpose.

### Graph-Assisted Investigation
MANDATORY when .code-graph/graph.db exists.
HARD-GATE: MUST run at least ONE graph command on key files before concluding any investigation.
Pattern: Grep finds files → trace --direction both reveals full system flow → Grep verifies details.
- Investigation/Scout: trace --direction both on 2-3 entry files
- Fix/Debug: callers_of on buggy function + tests_for
- Feature/Enhancement: connections on files to be modified
- Code Review: tests_for on changed functions
- Blast Radius: trace --direction downstream
CLI: python .claude/scripts/code_graph {command} --json. Use --node-mode file first (10-30x less noise), then --node-mode function for detail.

### Understand Code First
HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
1. Search 3+ similar patterns (grep/glob) — cite file:line evidence.
2. Read existing files in target area — understand structure, base classes, conventions.
3. Run python .claude/scripts/code_graph trace <file> --direction both --json when .code-graph/graph.db exists.
4. Map dependencies via connections or callers_of — know what depends on your target.
5. Write investigation to .ai/workspace/analysis/ for non-trivial tasks (3+ files).
6. Re-read analysis file before implementing — never work from memory alone.
7. NEVER invent new patterns when existing ones work — match exactly or document deviation.
BLOCKED until: Read target files; Grep 3+ patterns; Graph trace (if graph.db exists); Assumptions verified with evidence.

## Reference Docs (READ before reviewing)
- `.claude/docs/development-rules.md` — canonical development rules, code-quality guidelines, and pre-commit checklist
- docs/project-reference/code-review-rules.md
- {skill-specific reference docs — e.g., integration-test-reference.md for integration-test-review; backend-patterns-reference.md for backend reviews; frontend-patterns-reference.md for frontend reviews}

## Target Files
{explicit file list OR "run git diff to see uncommitted changes" OR "read all files under {plan-dir}"}

## Output
Write a structured report to plans/reports/{review-type}-round{N}-{date}.md with sections:
- Status: PASS | FAIL
- Issue Count: {number}
- Critical Issues (with file:line evidence)
- High Priority Issues (with file:line evidence)
- Medium / Low Issues
- Cross-cutting findings

Return the report path and status to the main agent.
Every finding MUST have file:line evidence. Speculation is forbidden.
`
})
```

### Rules

- DO copy the template wholesale — including all 11 embedded protocol sections
- DO replace only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific content
- DO choose `code-reviewer` subagent_type for code reviews and `general-purpose` for plan / doc / artifact reviews
- DO NOT paraphrase, summarize, or skip any protocol section
- DO NOT pass file contents inline — the sub-agent reads via its own tool calls so it has a fresh context
- DO NOT reference protocols by file path or tag name — the bodies are already embedded above
- DO NOT introduce placeholder markers for the protocols — they must stay literally expanded

<!-- /SYNC:review-protocol-injection -->

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

<!-- SYNC:severity-rubric -->

> **Severity Rubric** — Classify every finding by consequence, not by how easy it is to fix. One scale across all reviews so a "High" means the same thing everywhere.
>
> | Severity | Action      | Definition                                                                |
> | -------- | ----------- | ------------------------------------------------------------------------- |
> | CRITICAL | Block merge | Silent runtime failure, data corruption, validation bypass, security hole |
> | HIGH     | Must fix    | Incorrect behavior, invariant gap, architectural violation                |
> | MEDIUM   | Should fix  | Design debt, maintainability, likely future bug                           |
> | LOW      | Nice to fix | Convention, documentation, minor clarity                                  |
>
> **Score-based skills** map their numeric scale onto these tiers — do not invent a parallel vocabulary:
>
> - **0-2 criterion scoring** (e.g. production-readiness-review): `0` = CRITICAL/HIGH (criterion unmet, blocks production readiness), `1` = MEDIUM (partial, should fix), `2` = pass (no finding).
> - **Two-axis scoring** (e.g. performance-review, impact × likelihood): map the resulting cell to the nearest tier — high-impact + high-likelihood → CRITICAL/HIGH; low-impact OR low-likelihood → MEDIUM/LOW.
>
> A finding's tier drives the gate: CRITICAL/HIGH must be resolved or explicitly accepted by the owner before PASS; MEDIUM/LOW may ship with a tracked follow-up.

<!-- /SYNC:severity-rubric -->

<!-- SYNC:goal-contract-satisfaction-loop -->

> **Goal Contract Satisfaction Loop** — Persist the user goal in an external file, execute against it, and loop review/fix until every saved required criterion passes or a blocker escalates. Bounded closed loop — NEVER open-ended autonomous exploration.
>
> 1. **Resolve the active goal** (in order): active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create a new Goal Contract from the current user request (template: `.claude/templates/goal-contract-template.md`).
> 2. **Required sections:** Original Request, Purpose, Success Criteria (checkboxes; mark required vs optional), Constraints, Evidence Required, Iteration Log, Goal Satisfaction matrix.
> 3. **Before work:** read the active goal and map planned work to saved success criteria — execution serves the saved criteria, never chat memory alone.
> 4. **After execution/verification:** append an Iteration Log entry — result, evidence references (`file:line`, command output, report path), remaining gaps.
> 5. **Review gate:** emit a Goal Satisfaction matrix — `| Success Criterion | Evidence | Status |` with PASS/FAIL/BLOCKED. Overall PASS requires every required criterion PASS.
> 6. **Loop rule (retry):** required criterion FAIL → validate the gap is real → fix → re-review only the affected criteria. Stop cleanly when all required criteria PASS.
> 7. **Escalation rule (stop):** two consecutive iterations with no criterion progressing, or a blocker needing user input → mark the criterion BLOCKED with a user-facing reason and escalate. NEVER loop indefinitely.
> 8. **Skip rule:** tiny conversational tasks may skip the goal file ONLY with a recorded one-line reason. User-accepted gate skips are recorded in the goal file with reason and scope.
> 9. **Security:** NEVER store secrets, tokens, credentials, or private customer data in goal files — store evidence references and redact sensitive values.
>
> **Blocked until:** active goal resolved (or skip reason recorded) · saved success criteria read before edits · iteration evidence appended after execution · Goal Satisfaction matrix emitted before any PASS verdict.

<!-- /SYNC:goal-contract-satisfaction-loop -->

<!-- SYNC:trade-off-interrogation-gate -->

> **Trade-Off Interrogation Gate** — ALWAYS ask these THREE questions before ANY verdict, score, finding, or recommendation — about the thing under review AND about every recommendation YOU make. — why: naming a benefit without its price is an endorsement, not a review; the costliest trade-offs are the ones nobody wrote down.
>
> 1. **Is there any trade-off?** Name what it SACRIFICES. "None" / "pure win" is an unfinished analysis, NOT an answer — to claim none, state which dimensions you checked and why each is unaffected: future change cost · complexity · performance/latency · memory/cost · coupling · reversibility · migration burden · operational load · blast radius · security posture · testability · team skill/ramp · delivery time · UX.
> 2. **Is it worth it?** Weigh gain against sacrifice EXPLICITLY — what is gained (with a metric) · what it costs · WHO pays · WHEN it comes due — then emit **WORTH IT / NOT WORTH IT / UNCLEAR**. "Better" with no metric and no cost FAILS this question. NOT WORTH IT → withdraw or replace the recommendation, never keep it as-is.
> 3. **Is the trade-off material enough to CONFIRM WITH THE USER?** A material trade-off is the user's call, never yours. **MATERIAL** when ANY holds: irreversible / one-way door (data migration, public contract, storage format, vendor lock-in) · cost shifted onto someone else (another team, ops/on-call, future maintainer, end user) · one quality attribute traded for another (correctness↔speed, security↔convenience, latency↔cost, simplicity↔flexibility) · a boundary crossed (client↔server tier, service contract, event contract, shared library) · a high-consequence path (auth, money, data integrity, breaking change, High/Medium residual risk) · the worth-it verdict is UNCLEAR.
>
> **MATERIAL → STOP and confirm via `AskUserQuestion` BEFORE the verdict stands** — state the trade-off, both options, what each sacrifices, and your recommendation. **NOT material →** record it inline with a one-line justification and proceed.
>
> **Non-asking execution contexts — ESCALATE BY HANDOFF, never by silence.** `AskUserQuestion` reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. When you are running in such a context, the obligation is **redirected, never waived** — do ALL of: (a) complete questions 1 and 2 normally; (b) decide materiality and record it in the Trade-Off Assessment row with `confirmed? = NO — cannot ask from this context`; (c) **name the unconfirmed MATERIAL trade-off explicitly in your returned summary/verdict so the CALLER (or parent orchestrator) escalates it via `AskUserQuestion` on your behalf** — a material trade-off mentioned only inside a report file on disk is NOT a handoff; (d) do not emit an unqualified PASS — mark the verdict as carrying an unconfirmed material trade-off, so the caller's gate stays closed until the user answers. The caller inherits the escalation duty the moment it reads your return.
>
> This carve-out is about **reachability, not convenience**: it applies ONLY where the tool genuinely cannot reach the user (spawned sub-agent, terminal validate/verdict-only mode, non-interactive/headless run). It is NEVER a licence to skip the question, to self-approve a one-way door, or to downgrade materiality because asking is inconvenient — if you CAN ask, you MUST ask.
>
> **Emit a Trade-Off Assessment row** per reviewed decision and per recommendation: `| decision | sacrifices | gain (metric) | who pays, when | WORTH IT/NOT/UNCLEAR | material? | confirmed? |`.
>
> **BLOCKED until:** trade-off named (or dimensions-checked justification given) · worth-it verdict emitted · materiality decided · every MATERIAL trade-off either confirmed with the user OR — in a non-asking context — handed off in the returned verdict for the caller to confirm. A MATERIAL trade-off that is neither confirmed nor handed off can NEVER be PASS, and NEVER gets buried as a Low-severity note.
>
> **NEVER** answer "no trade-off" without checking · decide a material trade-off silently on the user's behalf · let convergence/delivery pressure authorize walking through a one-way door · bundle several material trade-offs into one vague "proceed?".

<!-- /SYNC:trade-off-interrogation-gate -->

<!-- SYNC:domain-entity-change-gate -->

> **Domain Entity Change Gate** — ONE protocol binding every skill or agent that PLANS, IMPLEMENTS, or REVIEWS a change touching a domain entity, value object, or aggregate, so a planner, an implementer, and a reviewer apply the SAME rules to the SAME change. `/domain-entities-review` is the canonical owner of the full A–P checklist; this gate is the shared trigger plus the decision set that must be answered. NEVER re-derive a weaker local copy — why: when planning and review disagree on entity rules, the plan ships a design that review then rejects, and the rework is paid twice.
>
> **Trigger — fires when ANY holds:** a new entity / value object / aggregate root is introduced · an existing one gains or loses a field, invariant, relationship, or state transition · an aggregate boundary, repository, or cross-aggregate reference changes · a domain event is added, renamed, or re-payloaded · a concurrency or reconstitution concern on a root changes. State `No domain-entity surface — gate N/A` when none holds.
>
> **Step 1 — Detect BEFORE deciding.** Both answers change which rules even apply:
>
> - **Paradigm** (per aggregate, from the code — NEVER assumed): OO-mutable · type-driven/immutable · event-sourced. Setter, mutability, and reconstitution rules are written for OO-mutable; applying them to the other two manufactures false findings and false plan tasks.
> - **Subdomain fit:** core (rich model owed) · supporting (Active Record or light model) · generic (buy, do not model) · CRUD (Transaction Script — a rich entity here is ceremony). NEVER plan or flag a rich model where the subdomain has no invariant beyond required-field.
>
> **Step 2 — Answer all 6 decision points.** Each is a decision the change MUST make explicitly:
>
> | #   | Decision point                                                                                               | Answered when                                                                                                                                                                                                                                                                                |
> | --- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | 1   | **Classification** — entity vs value object vs aggregate root                                                | The swap test is applied ("would an identical copy be interchangeable?"); a VO is immutable with structural equality and has no repository                                                                                                                                                   |
> | 2   | **Invariant ownership** — entity owns "can this state exist?", the boundary owns "is this input acceptable?" | Each rule is placed on one side and named; failure signalling (throw vs `Result`) matches the project convention consistently; a DB constraint is a backstop, NEVER the rule                                                                                                                 |
> | 3   | **Aggregate boundary + concurrency**                                                                         | Only true always-consistent invariants share an aggregate; cross-aggregate references are by ID; one aggregate mutates per transaction; the ROOT carries the concurrency token; set-based invariants (uniqueness across instances) name a real enforcing mechanism, never an in-memory check |
> | 4   | **Construction vs reconstitution**                                                                           | Creation and load are separate paths; the load path raises NO domain events and re-runs NO creation rules; required data sits in the constructor/factory                                                                                                                                     |
> | 5   | **Events**                                                                                                   | Raised inside the aggregate; dispatched AFTER commit (outbox when crossing a process); internal domain events kept distinct from published integration contracts; handlers idempotent                                                                                                        |
> | 6   | **Test obligation**                                                                                          | Every invariant maps to a universally-quantified property TC PLUS a boundary counter-case — the spec NAMES it and a test GUARDS it (Dual-Feedback); a single happy-path example is NOT coverage                                                                                              |
>
> **Step 3 — Apply by context.** Same decisions, different obligation:
>
> | Calling context                                                                                     | Obligation                                                                                                                                                                                                                                                                                                                                                                                                                |
> | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | **Planning** (`/plan`)                                                                              | The plan MUST name the decision and the owning file for every triggered row. An unanswered row is a plan that is not executable — surface it, do NOT let implementation discover it.                                                                                                                                                                                                                                      |
> | **Plan review** (`/plan-review`)                                                                    | An unanswered, hand-waved, or deferred-to-implementation row is a FINDING with `file:line` into the plan. Presence of the word "entity" is NEVER an answer.                                                                                                                                                                                                                                                               |
> | **Implementation** (`/plan-execute`, `/fix`, and any implementing agent — e.g. `backend-developer`) | The decisions are INPUTS, not questions to reopen: implement each triggered row as the plan/spec decided it, at the owning file it named. A row that arrives UNANSWERED is a blocker — surface it and get it decided; NEVER settle it silently at the keyboard, and NEVER pick an aggregate boundary from a DB table or UI screen because the plan left it open. Paradigm and subdomain fit still gate which rules apply. |
> | **Change review** (`/changes-review`)                                                               | Route to the owner — **Mode A (default):** read `/domain-entities-review`'s Phase 2 A–P checklist and apply it as review lenses. **Mode B (escalation):** delegate to `/domain-entities-review` when standalone AND the diff carries 3+ entity files. Findings enter the normal finding set with `file:line` + severity.                                                                                                  |
>
> **Duplication guard — SKIP the gate entirely when ANY row holds.** Record the deferral line, then proceed:
>
> | Suppressing context                                                                                                              | Deferral line                                                   |
> | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
> | The running skill IS `/domain-entities-review`                                                                                   | `Gate is this skill's own body — A–P checklist owns it.`        |
> | Invoked inside `$workflow-review-changes` (its step 5 runs `/domain-entities-review` as a dedicated conditional parallel member) | `Gate deferred to workflow step 5 /domain-entities-review.`     |
> | `/why-review` running in `--validate-findings` terminal mode                                                                     | `Gate N/A — validate-findings is terminal, no sub-skill calls.` |
>
> — why: unguarded, this edge duplicates a review the parent workflow already runs and closes a `changes-review → domain-entities-review → why-review → changes-review` cycle.
>
> **BLOCKED until:** trigger evaluated (or `gate N/A` recorded) · paradigm + subdomain fit stated · all 6 triggered decision points answered or raised as findings · guard row checked before any delegation.

<!-- /SYNC:domain-entity-change-gate -->

<!-- SYNC:domain-entity-change-gate:reminder -->

**MUST ATTENTION** when the change PLANS or REVIEWS a new/updated domain entity, value object, or aggregate, apply the **Domain Entity Change Gate** — `/domain-entities-review` owns the full A–P checklist; detect paradigm + subdomain fit FIRST, then answer all 6 decision points (classification · invariant ownership + failure signalling · aggregate boundary + concurrency · construction vs reconstitution · events · property-TC test obligation). Planning must NAME each decision; plan review treats an unanswered row as a FINDING; change review routes to the owner (Mode A read / Mode B delegate). SKIP under the 3-row duplication guard and record the deferral line. — why: one protocol shared by planner and reviewer is what stops a plan shipping an entity design that review then rejects.

<!-- /SYNC:domain-entity-change-gate:reminder -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.
  <!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:double-round-trip-review:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** execute the review loop (aka **Self-Review Convergence Loop**): review → validate findings → fix validated findings → full re-review. A complete review pass with zero findings ENDS the review. Any newly produced output/judgment gets ≥1 self-review; any new judgment gets ≥1 `/why-review --validate-findings` pass before it is treated as final.
- **MANDATORY** apply the **severity floor**: rounds 1-2 exit on zero findings at any severity; **from round 3 the bar is zero CRITICAL/HIGH/MEDIUM — LOW findings are no longer required to be fixed, so a LOW-only round ENDS the loop.** List every deferred LOW in the report; NEVER re-tier a real CRITICAL/HIGH/MEDIUM down to LOW to reach the exit, and NEVER apply the floor to a binary gate (test-green, security must-fix).
- **MANDATORY** enforce the **round cap of 3 — a ceiling, NEVER a target**: a clean pass ends the loop immediately at any round (round 1 included), and round 3 completing with CRITICAL/HIGH/MEDIUM still open → **STOP & escalate via `AskUserQuestion`**, never a silent PASS. The 2-repeated-no-progress blocker rule is an earlier exit — escalate at whichever trips first. NEVER loop open-ended.

<!-- /SYNC:double-round-trip-review:reminder -->

<!-- SYNC:graph-assisted-investigation:reminder -->

**IMPORTANT MUST ATTENTION** run at least ONE graph command on key files when graph.db exists. Pattern: grep → graph trace → grep verify.

<!-- /SYNC:graph-assisted-investigation:reminder -->

<!-- SYNC:cross-service-check:reminder -->

**IMPORTANT MUST ATTENTION** microservices/event-driven: scan producers, consumers, sagas, contracts in task scope. Per touchpoint: owner · message · consumers · risk (NONE/ADDITIVE/BREAKING). Missing consumer = silent regression.

<!-- /SYNC:cross-service-check:reminder -->

<!-- SYNC:estimation-framework:reminder -->

- **MANDATORY MUST ATTENTION** estimation: bottom-up phase hours drive `man_days_traditional` (`Σh/6 × productivity_factor`); SP DERIVED. UI cost usually dominates — bump SP one bucket if NEW UI surface (page/complex form/dashboard). Frontmatter MUST include `story_points`, `complexity`, `man_days_traditional`, `man_days_ai`, `estimate_scope_included`, `estimate_scope_excluded`, `estimate_reasoning` (UI vs backend cost driver). Cap SP 3 for additive-on-existing-model+existing-UI unless test scope >1.5d. SP 13 SHOULD split, SP 21 MUST split.
  <!-- /SYNC:estimation-framework:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:sequential-thinking-protocol:reminder -->

**MUST ATTENTION** apply sequential-thinking — multi-step Thought N/M, REVISION/BRANCH/HYPOTHESIS markers, confidence % closer; see `/sequential-thinking` skill.

<!-- /SYNC:sequential-thinking-protocol:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `plans/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Before investigating, planning, or coding, read `docs/project-config.json` (the project map: modules/paths, run-commands, conventions, architecture/workflow rules) + the required project-reference docs, and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project config + conventions override generic framework defaults.
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing or stale, auto-run `/project-init` or the narrow lower-level route before ordinary project-specific work.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify findings Critical/High/Medium/Low by consequence; Critical/High block PASS until fixed or owner-accepted.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **is there any trade-off?** name what it SACRIFICES (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis, so state the dimensions checked; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it material enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm via `AskUserQuestion` BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; NEVER bury one as a Low-severity note, NEVER decide it silently, and NEVER let delivery or convergence pressure authorize a one-way door. — why: an un-walked-back one-way door is the user's call to make, not the reviewer's.
- **MANDATORY — non-asking contexts escalate BY HANDOFF, never by silence.** `AskUserQuestion` reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. There the duty is REDIRECTED, not waived — still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, **state the unconfirmed MATERIAL trade-off in your RETURNED verdict/summary so the CALLER escalates it** (a note only in an on-disk report is not a handoff), and never emit an unqualified PASS. Applies ONLY where the user is genuinely unreachable (spawned sub-agent, terminal validate mode, headless run) — if you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->

<!-- SYNC:parallel-subagent-dispatch -->

> **Parallel Sub-Agent Dispatch** — Plan parallelism the moment a task breakdown exists, BEFORE executing it — running provably independent tasks sequentially wastes wall-clock. Applies to every multi-step job: workflow steps, planning, batch updates, investigation, research, scans, reviews, doc sync. **Plan execution is metadata-gated, NEVER default-parallel** — fan-out follows ONLY what the plan declares (`PAR`/`SEQ` tags + per-phase write set); an untagged plan runs sequentially — why: a derived write set cannot see cascade or generated writes.
>
> 1. **Tag every task `PAR` or `SEQ`.** `PAR` = inputs exclude every pending task's output AND write set disjoint from every other `PAR`. Else `SEQ` — MUST ATTENTION name the dependency forcing it.
> 2. **Group `PAR` into waves.** No edge between members. Two writers of one file NEVER share a wave. Read-only work (search, investigation, review, research) parallelizes freely.
> 3. **Declare before dispatch:** `Parallel plan: wave 1 = [...] · wave 2 = [...] · SEQ = [...] (reason)`.
> 4. **Spawn each wave in ONE message** — every `Agent` call in one response, NEVER dripped per turn. Route each task to its specialist (`.claude/skills/shared/sub-agent-selection-guide.md`); NEVER `code-reviewer` as catch-all.
> 5. **Brief each sub-agent self-contained:** goal · scope + owned files · reference docs · return contract (summary + `Full report:` path, per SYNC:subagent-return-contract) · incremental persistence to `plans/reports/` (per SYNC:incremental-persistence).
> 6. **Barrier per wave.** Advance ONLY after EVERY member returns (a skipped conditional counts as returned). Merge, mark each task completed/skipped, THEN dispatch the next wave. Mutating steps wait for the barrier.
> 7. **One level deep.** A dispatched sub-agent executes its own brief; further fan-out stays the orchestrator's job unless that agent's `.claude/agents/*.md` definition authorizes it.
>
> **NEVER parallelize:** tasks sharing a write target · a task consuming a pending task's output · trivial single-file work (dispatch overhead > gain) · an order a skill or workflow explicitly fixes · gates awaiting user approval.
>
> **Blocked until:** MUST ATTENTION every task tagged PAR/SEQ with a named reason per SEQ · waves declared + write-set disjointness checked · each wave spawned in ONE message · barrier honored before the next wave.

<!-- /SYNC:parallel-subagent-dispatch -->

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Block any plan reaching implementation unless hallucination-free (every existing-code claim proven at `file:line`) AND implementation-ready (every step concrete, small enough to code from immediately) — recursive review until a complete pass finds zero findings.

**IMPORTANT MUST ATTENTION Main steps (run in order, one task each):** Phase 0 detect plan type → Step 1 read `plan.md`/`goal.md`/all `phase-*.md` → Step 2 evaluate the 4 checklist groups (Validity · Correctness [Granularity + Anti-Hallucination + spec/TC coverage + Goal-Contract mapping] · Best Practices · Completeness) + 11 Adversarial techniques + Anti-Bias Gate + 8 Plan Dimensions + graph-trace each modified file → Step 3 score PASS/WARN/FAIL → Step 4 output result → Step 5 recursive `/why-review`-validate → fix validated findings → full re-review until zero findings — why: AI keeps forgetting the skill's own step pipeline; this is the read-this-if-nothing-else order.

**IMPORTANT MUST ATTENTION** Protocols in force (concise digest of the SYNC/shared blocks this skill carries) — each line is a signpost to its canonical body above; NEVER treat the digest as a substitute for the full block, and ALWAYS apply every protocol below in full:

- **Behavioral Delta Matrix:** bugfix reviews need input × pre × post × delta table before verdict.
- **Graph-Assisted Investigation:** run one graph command on key files when graph.db exists.
- **Cross-Service Check:** scan producers, consumers, sagas, contracts; missing consumer = silent regression.
- **Fresh Context Review:** spawn zero-memory sub-agent re-reading from scratch after each fix cycle.
- **Nested Task Creation:** expand child phase tasks; link the parent workflow row when nested.
- **Task Tracking & External Report:** bootstrap task breakdown; persist findings to `plans/reports/` incrementally.
- **Critical Thinking:** every claim needs traced `file:line` proof; never present guess as fact.
- **Sequential Thinking:** multi-step Thought N/M with REVISION/BRANCH/HYPOTHESIS markers and confidence closer.
- **Project Reference Docs:** read required project-reference docs before target work; conventions override generic defaults.
- **Understand Code First:** grep 3+ patterns and read code before any modification.
- **Double Round-Trip Review:** review → validate findings → fix → full re-review until clean.
- **Review Protocol Injection:** embed all 11 protocol bodies verbatim into every fresh review prompt.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Severity Rubric:** classify Critical/High/Medium/Low by consequence; Critical/High block PASS.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**IMPORTANT MUST ATTENTION** review as SKEPTIC not validator — your job: find what cannot work, not confirm what looks right; run the full Anti-Bias Gate (reality check, assumption stress-test, pre-mortem, steel-man rejected alternative, contrarian pass) BEFORE any verdict — why: confirmation bias rubber-stamps well-structured plans.
**MANDATORY IMPORTANT MUST ATTENTION** Anti-Hallucination Gate — every plan claim about existing source code needs `file:line` proof (file exists, symbol grepped, behavior code-traced); "should be"/"probably"/"typically" about existing code = FAIL. Greenfield-only plans → PASS.
**MANDATORY IMPORTANT MUST ATTENTION** Granularity Gate "Detailed & Small Enough" — FAIL any phase >5 files OR >3h OR carrying planning verbs (research/determine/decide/evaluate/explore/investigate); too vague → detail it (file paths, exact method names), too big → break it into sibling phases/sub-plans — why: a plan you can't immediately code from is NOT ready.
**MANDATORY IMPORTANT MUST ATTENTION** detect plan type FIRST (Phase 0) — bugfix MANDATES the Behavioral Delta Matrix (≥3 rows, ≥1 outside the bug report, any REGRESSION → FAIL until a preservation test covers it); security/perf/refactor/contract/infra each add their own focus.
**MANDATORY IMPORTANT MUST ATTENTION** spec-loop scheduling — plan must schedule property/invariant test specs for every `[HARD]` §4 rule / §5 invariant + a MUTATION-SCORE quality bar; FAIL a plan targeting a line-coverage % instead of a mutation-score bar.
**MANDATORY IMPORTANT MUST ATTENTION** when ANY finding exists, run `/why-review --validate-findings` BEFORE editing any `plan.md`/`phase-*.md`; fix ONLY validated findings at the smallest responsible location, then restart the FULL review with a fresh zero-memory sub-agent — loop until a clean pass; NEVER edit plan files before this gate passes — why: unvalidated fixes corrupt the plan and waste review rounds.
**MANDATORY IMPORTANT MUST ATTENTION** round cap 3 — a CEILING, never a target: a clean pass ends the loop immediately at any round; escalate via `AskUserQuestion` when the SAME blocker survives 2 consecutive full re-reviews with no progress, when round 3 completes with findings still open, or when a finding needs product/owner judgment. NEVER loop past 3 rounds and NEVER convert cap exhaustion into a PASS.
**MANDATORY IMPORTANT MUST ATTENTION** bootstrap `TaskCreate` task breakdown BEFORE reads/grep/edits (one task per file read); persist findings to `plans/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` incrementally and synthesize from disk; add a final review task — why: long plan files exhaust context, the report file is ground truth.
**MANDATORY IMPORTANT MUST ATTENTION** run a graph trace on each "files to modify" entry when `.code-graph/graph.db` exists; flag any downstream file NOT listed in the plan as "potentially missed" — why: catches cross-service/event-handler impact the author overlooked.
**MANDATORY IMPORTANT MUST ATTENTION** Dimension 7 — Estimation Drift: re-derive `bottom_up_hours = Σ phase_hours` from the FINALIZED phase files per the carried `SYNC:estimation-framework` and compare against frontmatter. `|delta| > 20%` → frontmatter MUST carry `reestimate_delta_pct` + a 1-line `reestimate_reason`, and a missing update is a FAIL; `|delta| > 50%` → flag `SHOULD-RESCOPE` and surface the rescope decision to the user BEFORE implementation — why: pre-completion estimates anchor on a scope guess, and locked phases are the first place the real cost is visible.
**MANDATORY IMPORTANT MUST ATTENTION** Dimension 8 — Domain Entity Design (CONDITIONAL): when the plan touches an entity, value object, or aggregate, apply `SYNC:domain-entity-change-gate` — the SAME protocol `/plan` authored under and `/changes-review` reviews under. An unanswered, hand-waved, or deferred-to-implementation decision point is a FINDING with `file:line` into the plan; the word "entity" in a task is NEVER an answer. Verify paradigm + subdomain fit are stated BEFORE any entity task, and that each triggered row names its OWNING FILE. State `No domain-entity surface — Dimension 8 N/A` when it does not fire — why: an aggregate boundary chosen by DB table or UI screen is the costliest decision to reverse after implementation.
**MANDATORY IMPORTANT MUST ATTENTION** standalone runs end with `AskUserQuestion` presenting findings + next-step options; skip ONLY inside a workflow.
**MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every finding (confidence >80% to act, <60% DO NOT recommend); NEVER mark PASS while any spec/test/code face disagrees without a logged finding.
**MANDATORY IMPORTANT MUST ATTENTION** READ before reviewing: `.claude/docs/development-rules.md`, `docs/project-reference/code-review-rules.md`, `lessons.md`, plus skill-specific pattern refs (backend/frontend/integration-test).

**Anti-Rationalization:**

| Evasion                        | Rebuttal                                                                                                   |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| "Plan looks reasonable"        | Structure ≠ correctness. Prove every existing-code claim with `file:line`; plausible text is not evidence. |
| "Phases are well-defined"      | Presence of phases ≠ implementable. Apply the 5-point Granularity Gate per phase.                          |
| "One review pass enough"       | Re-review only after a validated-finding fix cycle; a clean COMPLETE pass ends the loop.                   |
| "Implementation can fill gaps" | FAIL vague steps now — implementation executes the plan, it does not invent it.                            |
| "Alternatives were considered" | Were they real, or strawmen set up to fail? Steel-man the rejected one.                                    |
| "Risk is managed"              | "Monitor closely" is not a mitigation. Demand action, owner, trigger.                                      |
| "Already traced the code"      | Show `file:line` / grep evidence. No proof = no trace.                                                     |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using `TaskCreate`; add a final review task.

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.

**IMPORTANT MUST ATTENTION Goal:** Block any plan reaching implementation unless hallucination-free (`file:line` proof) AND implementation-ready (concrete, small-enough phases) — loop until a clean pass.
**IMPORTANT MUST ATTENTION** review as SKEPTIC — `file:line` proof for every existing-code claim; FAIL vague/oversized phases; bugfix → Behavioral Delta Matrix.
**IMPORTANT MUST ATTENTION** validate findings via `/why-review --validate-findings` before editing plan files; fix only validated findings; restart full review until zero findings.
