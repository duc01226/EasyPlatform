---
name: plan-review
version: 1.1.0
description: '[Planning] Use when you need to auto-review a plan for validity, correctness, and best practices — recursive: review, validate findings with why-review, fix validated findings, full re-review until no findings.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Block any plan from reaching implementation unless it is hallucination-free (every existing-code claim proven at `file:line`) and implementation-ready (every step concrete, small enough to code from immediately) — by auto-reviewing implementation plans for validity, correctness, and best practices. **Recursive:** when any findings exist, validate findings with `/why-review --validate-findings`, fix only validated findings in plan files, and rerun the full plan review until no findings remain.

**Workflow:**

1. **Resolve Plan** — Use $ARGUMENTS path or active plan from `## Plan Context`
2. **Read Files** — plan.md + all phase-\*.md files, extract requirements/steps/files/risks
3. **Evaluate Checklist** — Validity (summary, requirements, steps, files), Correctness (specific, paths, no conflicts), Best Practices (YAGNI/KISS/DRY, architecture), Completeness (risks, testing, success, security)
4. **Score & Classify** — PASS (all Required + ≥50% Recommended), WARN (all Required + <50% Recommended), FAIL (any Required fails)
5. **Output Result** — Status, checks passed, issues, recommendations, verdict
6. **If any findings remain** — Run `/why-review --validate-findings` on the plan-review report first; fix only validated actionable issues in plan files, then re-review (loop back to step 2 until zero findings, unless the repeated-blocker cap applies)

**Core Principle — Detailed & Small Enough:**

- **Too vague?** → Detail it: add specific file paths, concrete actions, exact method names
- **Too big to detail?** → Break it: split into smaller phases/sub-plans until each is detailed
- A plan that can't be immediately coded from is NOT ready. Every step must be implementation-ready.

**Key Rules:**

- **No hallucination**: Every plan claim about existing source code must have `file:line` proof — unverified paths, class names, or behaviors = FAIL
- **PASS**: Proceed to implementation
- **WARN**: Proceed with caution, note gaps
- **FAIL (any findings)**: Validate findings with `/why-review --validate-findings`, fix only validated plan issues, then **re-run the FULL review from the start**. Repeat this self-loop — no maximum round count, no forced minimum — until a complete pass finds ZERO findings.
- **No-progress safety (not a round cap)**: only if the SAME blocker survives 3 consecutive full re-reviews with no progress, STOP and escalate to user via `AskUserQuestion`. A clean pass ends the loop immediately, even on round 1.
- **Constructive**: Focus on implementation-blocking issues, not pedantic details

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## First Principle — Easy to Change

> **The success metric of every coding decision is _future change cost_.**
> DRY, SRP, abstraction, design patterns, naming, layering, tests — every
> technique exists to serve one goal: **making the next change cheaper**.

Evaluating code, refactor, test, abstraction, ask:
**does this make next change cheaper or more expensive?**

- Reject "best practices" raising change cost (premature abstraction,
  speculative generality, leaky indirection, ceremony without payoff).
- Name real enemies in findings: **coupling, hidden state, duplicated
  knowledge, unclear intent, irreversible decisions exposed too early**.
- Simpler design easy to change beats sophisticated design that isn't.

Apply this lens **before** invoking any specific rule, pattern, or checklist
below — if a downstream rule raises change cost, this principle wins.

---

## Adversarial Review Mindset (NON-NEGOTIABLE)

**Default stance: SKEPTIC, not validator. Your job is to find what cannot work, not confirm what looks right.**

> **Confirmation bias trap:** After reading a well-structured plan, AI naturally finds reasons to agree. This section exists to break that loop before it produces a rubber-stamp approval.

### Adversarial Techniques (apply ALL before concluding)

> Techniques 1-6 stress **whether the plan can be built** (reality, effort, scope, dependencies). Techniques 7-10 stress **whether the chosen design is the right one** — the decision-quality lens shared with `/why-review`'s rationale review. Apply both groups: a buildable plan built on the wrong decision is still a failed plan.

**1. Implementation Reality Check**
For every phase, ask: "If a developer started implementing this right now, what is the first thing that would break?" Walk through the critical path concretely. Vague phases ("implement the service layer") that can't be traced to specific files/classes fail this check.

**2. Assumption Stress Test**
List the top 3 implicit assumptions embedded in the plan. For each: "What if this assumption is wrong?" A valid plan survives at least 2 of its 3 assumptions being false. Common hidden assumptions: "existing code is in a known state," "no external API changes," "team has this domain knowledge."

**3. Effort Reality Check**
For each phase marked with effort estimates: "Has similar work in this codebase been done in this timeframe? What slowed it down last time?" Plans that underestimate by 2x or more are not valid plans — they are optimistic guesses.

**4. Pre-Mortem**
Assume the plan is implemented exactly as written and the feature is in production after 1 month. Write one concrete failure scenario that is plausible given the current plan. If you can't find one, you haven't looked hard enough.

**5. Scope Creep Detector**
Identify any task in the plan that is NOT directly required to deliver the stated feature. "While we're here, let's also refactor X" is scope creep. Flag it.

**6. Dependency Blindspot**
List 2-3 external dependencies (other services, APIs, data sources) the plan assumes are stable. For each: "What breaks in this plan if this dependency changes or is unavailable?" If a dependency failure is not addressed anywhere in the plan, it is a risk gap.

**7. Steel-Man the Rejected Alternative**
For each design decision where the plan chose approach X over an alternative, argue FOR the rejected alternative as strongly as you can. Would a 10-year domain senior have chosen it? If yes, the plan's dismissal needs stronger proof than "we picked X." A decision that never names what it rejected has not been made — it has been assumed.

**8. Why NOT?**
For every "chose X because Y" in the plan, ask what X _sacrifices_. Every choice has a cost; a plan that lists only the upsides of its chosen approach is hiding the trade-off, not avoiding it. Demand the named downside.

**9. Unseen Alternatives**
Identify 1-2 viable approaches the plan does NOT mention at all. An alternative absent without exclusion reasoning is weak design coverage, not a settled decision. Name them and ask why they were not considered.

**10. Pros/Cons Symmetry**
Count the chosen approach's stated pros vs cons. Pros outnumbering cons by more than 2:1 signals confirmation bias, not a clean design — demand the missing downsides before accepting the decision.

**11. Contrarian Pass**
Before writing any verdict, generate at least 2 sentences arguing the OPPOSITE conclusion. If you're about to write PASS — argue for NEEDS WORK. If about to write NEEDS WORK — argue for PASS. Then decide which argument is stronger based on evidence.

### Forbidden Patterns

- **"Structure looks good"** → Structure is NOT quality. Can it be implemented?
- **"Phases are well-defined"** → Presence of phases is NOT correctness. What's in them?
- **"Alternatives were considered"** → Were they real alternatives or strawmen set up to fail?
- **"Risk is managed"** → Mitigation of "monitor closely" is NOT a mitigation. What action, by whom, triggered by what?
- **"Looks achievable"** without tracing the critical path → Not a valid assessment.

### Anti-Bias Gate (MANDATORY before finalizing verdict)

Complete ALL checks before writing the final verdict:

- MUST ATTENTION run Implementation Reality Check on the highest-risk phase
- MUST ATTENTION identify 3 implicit assumptions and stress-test them
- MUST ATTENTION check effort estimates against codebase complexity
- MUST ATTENTION run pre-mortem (one concrete production failure scenario)
- MUST ATTENTION scan for scope creep (tasks not required for stated feature)
- MUST ATTENTION verify dependency blindspots are addressed
- MUST ATTENTION steel-man at least one rejected design alternative (argue FOR it)
- MUST ATTENTION name at least 1 viable alternative the plan does not mention
- MUST ATTENTION check pros/cons symmetry on the plan's primary design decision

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

**Use these dimensions to generate targeted, evidence-backed questions — not generic "add more detail" suggestions.**

---

## Your mission

Perform automatic self-review of implementation plan — ensure valid, correct, follows best practices; identify anything needing fixes before proceeding.

**Key distinction**: AI self-review (automatic), NOT user interview like `/plan-validate`.

## Plan Resolution

1. If `$ARGUMENTS` provided -> Use that path
2. Else check `## Plan Context` section -> Use active plan path
3. If no plan found -> Error: "No plan to review. Run /plan first."

## Workflow

### Phase 0: Detect Plan Type

Before applying any checklist, read `plan.md` and classify the plan:

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

Trigger this gate whenever the plan-review output contains **any finding**: FAIL, WARN, recommendation requiring a plan edit, missing evidence, unresolved risk, or implementation-blocking ambiguity. Skip this gate only when the completed review pass has zero findings.

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
4. **Repeated blocker cap:** if the same blocker repeats across 3 full invocations with no progress, escalate via `AskUserQuestion`
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
               └──→ Loop until zero findings or repeated-blocker cap
```

### Iteration Rules

1. **Repeated blocker cap** — continue until a complete full review pass has zero findings; if the same blocker repeats across 3 full invocations with no progress, STOP and escalate to user via `AskUserQuestion`
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
8. **No silent fallback** — if the same blocker repeats across 3 full invocations with no progress, escalate via `AskUserQuestion`. NEVER fall back to any prior protocol.

## Next Steps

- **If PASS with zero findings**: Announce "Plan review complete. Proceeding with next workflow step."
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

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"Proceed with full workflow (Recommended)"** — I'll detect the best workflow to continue from here (plan reviewed). This ensures validation, implementation, testing, and docs steps aren't skipped.
- **"/plan-validate"** — Interview user to confirm plan assumptions
- **"/cook" or "/code"** — If plan is approved and ready for implementation
- **"Skip, continue manually"** — user decides

> **[BLOCKING]** This is a validation gate. MUST ATTENTION use `AskUserQuestion` to present review findings and get user confirmation. Completing without asking at least one question is a violation.

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

> **Critical Purpose:** Ensure quality — no flaws, no bugs, no missing updates, no stale content. Verify both code AND documentation.

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

> **OOP & DRY Enforcement:** MANDATORY IMPORTANT MUST ATTENTION — flag duplicated patterns that should be extracted to a base class, generic, or helper. Classes in the same group (same suffix, same lifecycle, same purpose) MUST ATTENTION share a common base (even if empty now — enables future shared logic and child overrides). Verify project has code linting/analyzer configured for the stack.

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
> **Why:** The main agent knows what it (or `/cook`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
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
> - Continue until a complete full review pass has zero findings; if the same blocker repeats 3 times with no progress, escalate via `AskUserQuestion`
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
> 2. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`; behavior/public-contract/spec-test-code sync `workflow-spec-test-code-cycle-reference.md`; derived spec index/ERD/reimplementation guides `spec-system-reference.md` + source Feature Specs under `docs/specs/`; architecture/new area `project-structure-reference.md`.
> 3. Read every required doc. If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `/project-init` or the narrow lower-level route (`/project-config`, `/docs-init`, `/scan-all`, `/scan --target=<key>`, `/claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `/sync-codex`; do not auto-run it.
> 4. Before target work, state: `Reference docs read: ... | Not applicable: ...`.
>
> **Ready when:** scope evaluated, required docs checked/read or setup route completed, `lessons.md` confirmed, citation emitted.

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

> **Validated-Finding Fix + Full Re-Review Loop** — Re-review is triggered by a validated finding fix cycle, not by a round number. Review purpose: `review → validate findings → fix validated findings → full re-review` until a complete review pass finds no issues. **A clean review ENDS the loop — no further rounds required.**
>
> **Round 1:** Main-session review. Read target files, build understanding, note issues. Output findings + verdict (PASS / FAIL).
>
> **Decision after Round 1:**
>
> - **No issues found (PASS, zero findings)** → review ENDS. Do NOT spawn a fresh sub-agent for confirmation.
> - **Issues found (FAIL, or any non-zero findings)** → run the active review skill's findings-validation gate first; for review skills the default gate is `/why-review --validate-findings <report-path>`, fix only validated findings, then restart the full review protocol from the beginning with a fresh task breakdown.
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
> **Loop termination:** After each full re-review, repeat the same decision: clean → END; issues → validate findings → fix → restart from the first review phase. Continue until a complete review pass finds zero issues. If the same validated finding repeats for 3 full invocations with no progress, or a fix requires product/owner input, escalate via `AskUserQuestion`.
>
> **Rules:**
>
> - A clean Round 1 ENDS the review — no mandatory Round 2
> - NEVER fix unvalidated findings; validate first using the caller's validation gate
> - NEVER skip the full re-review after a fix cycle (every fix invalidates the prior verdict)
> - NEVER reuse a sub-agent across rounds — every iteration that uses sub-agents spawns NEW Agent calls
> - Main agent READS sub-agent reports but MUST NOT filter, reinterpret, or override findings
> - No arbitrary sub-agent-round cap replaces the clean-review requirement; use the 3 repeated-no-progress blocker rule only to avoid infinite spinning
> - Track recursive invocation count and repeated blockers in conversation context (session-scoped)
> - Final verdict must incorporate ALL rounds executed
>
> **Report must include `## Round N Findings (Fresh Sub-Agent)` for every round N≥2 that was executed.**

<!-- /SYNC:double-round-trip-review -->

<!-- SYNC:review-protocol-injection -->

> **Review Protocol Injection** — Every fresh sub-agent review prompt MUST embed 10 protocol blocks VERBATIM. The template below has ALL 10 bodies already expanded inline. Copy the template wholesale into the Agent call's `prompt` field at runtime, replacing only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific values. Do NOT touch the embedded protocol sections.
>
> **Why inline expansion:** Placeholder markers would force file-read indirection at runtime. AI compliance drops significantly behind indirection (see `SYNC:shared-protocol-duplication-policy`). Therefore the template carries all 10 protocol bodies pre-embedded.

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

- DO copy the template wholesale — including all 10 embedded protocol sections
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
> **Keep domain concepts out of generic/shared/infrastructure layers.** A reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. The leak compiles and runs, so it passes review silently while coupling the "reusable" layer to one consumer. Push domain fields/logic down into the consumer via subclass or composition.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:double-round-trip-review:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** execute the review loop: review → validate findings → fix validated findings → full re-review. A complete review pass with zero findings ENDS the review.
  <!-- /SYNC:double-round-trip-review:reminder -->

<!-- SYNC:graph-assisted-investigation:reminder -->

**IMPORTANT MUST ATTENTION** run at least ONE graph command on key files when graph.db exists. Pattern: grep → graph trace → grep verify.

<!-- /SYNC:graph-assisted-investigation:reminder -->

<!-- SYNC:cross-service-check:reminder -->

**IMPORTANT MUST ATTENTION** microservices/event-driven: scan producers, consumers, sagas, contracts in task scope. Per touchpoint: owner · message · consumers · risk (NONE/ADDITIVE/BREAKING). Missing consumer = silent regression.

<!-- /SYNC:cross-service-check:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:sequential-thinking-protocol:reminder -->

**MUST ATTENTION** apply sequential-thinking — multi-step Thought N/M, REVISION/BRANCH/HYPOTHESIS markers, confidence % closer; see `/sequential-thinking` skill.

<!-- /SYNC:sequential-thinking-protocol:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `plans/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** After task-tracking bootstrap and before target/source work, read required project-reference docs and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project conventions override generic defaults.
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing, stop and run or ask the user to run `/project-init`.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Block any plan from reaching implementation unless it is hallucination-free (every existing-code claim proven at `file:line`) and implementation-ready (every step concrete, small enough to code from immediately).
**MANDATORY IMPORTANT MUST ATTENTION** plans must not hallucinate — every claim about existing source code needs `file:line` proof. Unverified paths, class names, or behaviors = FAIL.
**MANDATORY IMPORTANT MUST ATTENTION** plans must be detailed and small enough — too vague? detail it. Too big? break it. Every step must be implementation-ready.
**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality.
**MANDATORY IMPORTANT MUST ATTENTION** when plan-review finds any issue, run `/why-review --validate-findings` before editing plan files; after validated fixes, rerun plan-review until zero findings.
**MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

**Anti-Rationalization:**

| Evasion                        | Rebuttal                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------- |
| "Plan looks reasonable"        | Prove every existing-code claim with `file:line`; plausible text is not evidence. |
| "One review pass enough"       | Continue recursive review only after fixes; clean complete pass ends loop.        |
| "Implementation can fill gaps" | FAIL vague steps now — implementation should execute plan, not invent it.         |

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.
