---
name: knowledge-review
version: 1.1.0
description: '[Research] Use when a workflow step or the user asks for knowledge artifact review: completeness, citation accuracy, confidence and template compliance.'
---

## Quick Summary

> **Review modes:** For review/audit work, standalone defaults to `--review-only` (`--report-only` alias); `--fix-loop` enables review → validate → authorized fix → fresh re-review, default cap 3. `--fix-loop --loop-owner=caller` returns a read-only pass to the caller that owns fixes/re-review. Create triage, review, validation and re-review todo tasks first; apply the carried `review-policy` contract for LOW deferral and user-approved bounded extensions. Non-review modes and terminal findings validation keep their own dispatch.

**Goal:** Ensure knowledge artifacts are evidence-backed, complete, protocol-compliant, and safe to use for decisions — reviewing for quality, completeness, citation accuracy, and template compliance.

**Summary:**

- PURPOSE: audit a knowledge artifact (research report / market analysis / business evaluation / marketing strategy / course) for completeness, citation accuracy, confidence calibration, source quality and template compliance. Review-only returns a verdict; standalone fix-loop validates, repairs and freshly audits the artifact.
- MAIN STEPS in order: (1) read the artifact and set its profile (type → template, applicable rows) and depth (scope triage → core or full) → (2) run the checklist rows they select from the 7-checklist audit — template compliance · citation audit · confidence accuracy · source quality · knowledge gaps · cross-validation · actionability, verifying presence AND quality depth (never just that a section exists) → (3) run the adversarial Anti-Bias Gate at that depth → (4) emit PASS/WARN/FAIL per-check + verdict (APPROVED/REVISE/BLOCKED) → (5) conditional Round 2 focused re-review.
- Default to SKEPTIC: run the Anti-Bias Gate before any verdict — find a contradicting source per major claim, stress-test every score ≥80%, state the strongest alternative conclusion, check supporting-vs-contradicting source ratio, run a pre-mortem, and argue the opposite verdict in 2+ sentences. Core depth runs the compressed gate (Artifact Profile and Depth).
- Calibrate confidence to evidence: a single source ≠ 80%, scores >80% need 2+ independent sources with contradicting evidence addressed, single-source claims marked unverified must be <60%, and findings <60% must be flagged prominently.
- Convergence: a clean Round 1 ENDS the review once the persisted `minRounds` is met; otherwise validate and fix only current-round blocking findings, then full re-review until the severity bar is clear (Round 2 LOW-only findings are deferred and end the loop).

**Workflow:**

1. **Read artifact** — Load the knowledge report/market analysis/business evaluation/strategy/course; set its profile and depth (Artifact Profile and Depth)
2. **Template compliance** — Verify all enforced sections of the profile's template present
3. **Citation audit** — Check inline citations and source table
4. **Confidence check** — Verify scores match evidence
5. **Output review** — Validate findings with `/why-review --validate-findings <report-path>`, then emit the summary with pass/warn/fail per check

**Key Rules:**

- Every section from template must be present and non-empty
- Every factual claim must have inline citation
- Confidence scores must match evidence basis
- Each review pass is read-only. Standalone fix-loop repairs validated findings between passes; review-only and caller-owned leaves never modify the artifact.

**Apply skeptical, sequential thinking; trace every claim and state confidence (>80% to act).**

## Contents

- [Quick Summary](#quick-summary)
- [First Principle — Easy to Change · Easy to Scale · Easy to Maintain](#first-principle--easy-to-change--easy-to-scale--easy-to-maintain)
- [Adversarial Review Mindset (NON-NEGOTIABLE)](#adversarial-review-mindset-non-negotiable)
- [Knowledge Review](#knowledge-review)
- [Artifact Profile and Depth](#artifact-profile-and-depth)
- [Review Checklist](#review-checklist)
- [Output Format](#output-format)
- [Round 2: Focused Re-Review (conditional — triggered by findings)](#round-2-focused-re-review-conditional--triggered-by-findings)
- [Closing Reminders](#closing-reminders)

## First Principle — Easy to Change · Easy to Scale · Easy to Maintain

> The full gate is `SYNC:core-engineering-principles` (protocol guide below; a hook delivers its text); its closing digest ends this file.

---

## Adversarial Review Mindset (NON-NEGOTIABLE)

**Default stance: SKEPTIC challenging research quality, NOT confirming research completeness.**

> **Source confirmation bias trap:** AI gravitates toward sources confirming its working hypothesis. Knowledge artifact built iteratively — by completion, framing is locked in. This section forces challenge of both sources AND framing.

### Adversarial Techniques (apply ALL before concluding)

**1. Source Bias Detection**
Top 3 claims: "What sources CONTRADICT this claim?" No contradicting source cited → either reviewer didn't look, or evidence truly one-sided. Ask: "What would skeptic of this conclusion cite?" No counterevidence addressed → confidence score inflated.

**2. Confidence Calibration Challenge**
Each confidence score ≥ 80%: "What would need to be true for this confidence to be wrong?" High confidence warranted ONLY when: (a) multiple independent sources agree, (b) contradicting evidence addressed, (c) methodology sound. Challenge any score resting on single source or undisclosed assumptions.

**3. Alternative Conclusion Check**
Given same evidence, what DIFFERENT conclusion could reasonable expert reach? Artifact not addressing 1+ credible alternative interpretation → analysis incomplete. State strongest alternative conclusion.

**4. Cherry-Picking Detection**
Count sources supporting main conclusion vs. sources challenging it. Ratio > 3:1 favoring supporting sources without explicit explanation of why contradicting sources discounted → flag cherry-picking.

**5. Pre-Mortem**
Assume artifact's recommendation implemented and fails. Write most plausible failure scenario given research limitations. Artifact not acknowledging this failure mode → missing a risk section.

**6. Contrarian Pass**
Before writing any verdict, generate 2+ sentences arguing OPPOSITE conclusion about artifact's quality. Then decide which argument is stronger.

### Forbidden Patterns

Citation presence, plausible scores, broad coverage, and actionable wording are insufficient without source support, confidence stress tests, missing-perspective checks, and an evidence chain. Never approve without challenging evidence quality; the closing Anti-Rationalization table gives the corresponding checks.

### Anti-Bias Gate (MANDATORY before finalizing verdict) (MUST ATTENTION)

- found 1+ contradicting source per major claim (or flagged its absence)
- challenged 1+ confidence score ≥ 80% with a stress test
- stated strongest alternative conclusion from same evidence
- checked source balance (supporting vs. contradicting ratio)
- ran pre-mortem on main recommendation
- generated 2+ sentences arguing opposite verdict

Any item unmet → adversarial review incomplete. Go back. — why: skipping the gate ships confirmation-biased verdicts as fact.

At core depth (Artifact Profile and Depth) the gate is the compressed three-item form stated there; full depth runs all six items.

# Knowledge Review

## Artifact Profile and Depth

Set both before the checklist and record them in the review output.

**Profile — the artifact type selects the template and the rows.** Every type runs all 7 checklists against its own template, with the exceptions below. A row that checks a section its template does not define (Recommendations, a Gaps section) is recorded N/A with that reason, never failed; its duty still applies, so open gaps, limitations and low-confidence claims stay flagged beside the claims they affect.

| Artifact type | Written to | Template | Row exceptions |
| --- | --- | --- | --- |
| Research report | `docs/knowledge/research/` | `.claude/templates/research-report-template.md` | None |
| Market analysis | `docs/knowledge/strategy/market-analysis/` | `.claude/templates/market-analysis-template.md` | None |
| Business evaluation | `docs/knowledge/strategy/business/` | `.claude/templates/business-evaluation-template.md` | None |
| Marketing strategy | `docs/knowledge/strategy/marketing/` | `.claude/templates/marketing-strategy-template.md` | None |
| Course outline | `docs/knowledge/courses/` | `.claude/templates/course-outline-template.md` | No per-finding confidence row; its Sources table is Resources & References; add the pedagogy check |

**Pedagogy check (course outlines):** objectives are measurable (an observable verb at a stated Bloom level); objectives and assessments align, so every objective is tested by at least one knowledge-check or final-assessment item and every assessment item traces to an objective; prerequisites are stated for the course, and each module builds on the earlier ones.

An artifact type outside the table uses the template its producer skill names; with none, review it against the research-report rows and record that assumption.

**Depth — the scope triage selects how much runs.** Read the triage the workflow recorded (`workflow-research` records Narrow, Standard or Broad in its workflow report); standalone, classify with the Question-Scope Triage table in `.claude/skills/workflow-research/SKILL.md`.

| Depth | When | Runs |
| --- | --- | --- |
| Core | Narrow scope, and no decision rides on the artifact | Checklists 1 Template, 2 Citation, 3 Confidence and 6 Cross-Validation (with the profile's exceptions), plus the compressed Anti-Bias Gate: 1+ contradicting source for the main claim (or its absence flagged), a stress test of the highest score ≥80%, and 2+ sentences arguing the opposite verdict |
| Full | Standard or Broad scope, a decision-critical artifact (business evaluation, marketing strategy, any go/no-go input), or triage unknown | Every applicable row and the full Anti-Bias Gate |

## Review Checklist

Check both presence and substantive quality for every row; headings, placeholders, or generic filler do not pass.

### 1. Template Compliance

| Check | Verify presence and depth |
| --- | --- |
| All enforced sections present | Every template section has substantive content; missing or partially filled sections fail. |
| No empty placeholders | Reject “TBD”, “to be filled”, and generic filler such as “risks will be identified later”. |
| Section order matches template | Preserve prescribed order and verify cross-references still make sense. |

### 2. Citation Audit

| Check | Verify presence and depth |
| --- | --- |
| Every factual claim has inline `[N]` | Read the source: it must support the specific claim or paraphrase. |
| Every Sources row is cited | Cite at the most specific supported claim; reject unused credibility-padding sources and vague section-level citations. |
| No orphan citations | Every `[N]` resolves to a Sources row; numbering stays consistent, without gaps or duplicates. |
| Sources table has: Title, URL, Author, Date, Tier | Verify all five fields, accurate Tier and topic-appropriate Date. A blog labeled Tier 1 inflates authority. |

### 3. Confidence Accuracy

| Check | Verify presence and depth |
| --- | --- |
| Per-finding scores | Each finding has its own explicit percentage; section/artifact scores cannot substitute. |
| Overall confidence | Require a reasoned aggregate, not the highest finding score; 85%, 60%, and 40% do not aggregate to 85%. |
| Scores match evidence | Justify source count, independence and quality; name what would lower each score. A single source ≠ 80%; scores >80% require 2+ independent sources and addressed counterevidence. |
| Findings <60% flagged prominently | Visually distinguish and position low-confidence findings so skimming readers cannot mistake them for facts. |

### 4. Source Quality

| Check | Verify presence and depth |
| --- | --- |
| Appropriate Tier distribution | Record distribution; Tier 4 must be a minority, never the entire set. Assess authority per claim: unrelated Tier 1 sources do not rescue a core Tier 4 claim. |
| At least 50% Tier 1-2 for key claims | Verify the overall threshold and authoritative support for key/high-stakes claims; prestige outside the claim's domain is insufficient. |
| Topic-appropriate recency | Date and assess each source against the topic's rate of change; flag stale sources. Cloud pricing ages faster than database theory. |

### 5. Knowledge Gaps

| Check | Verify presence and depth |
| --- | --- |
| Honest Gaps section | State specific unanswered questions, ranked by impact on conclusions, to guide follow-up; “some uncertainty exists” is insufficient. |
| Explicit limitations | Distinguish methodological/coverage limitations from gaps. State a limitation near any finding it invalidates, before using it to discount the finding; a late footnote is insufficient. |
| Further research | Include 1+ suggestions tied to gaps, with specific query + source type; prioritize gaps affecting decisions. |

### 6. Cross-Validation

| Check | Verify presence and depth |
| --- | --- |
| Key claims have 2+ sources | Verify genuine independence; sources citing each other or the same original study are amplification, not validation. |
| Conflicts documented and resolved | Explain which source was weighted more and why; merely noting disagreement is insufficient. |
| Single-source claims unverified | Explicitly label them “unverified” or equivalent, with confidence <60%; an unverified claim at 75% contradicts itself. |

### 7. Actionability

| Check | Verify presence and depth |
| --- | --- |
| Concrete recommendations | State who does what, assignable to a role without clarification. “Improve monitoring” is vague; “add P99 latency alert at 500ms” is actionable. |
| Evidence-based next steps | Trace each action to a finding and confidence score; label actions based on low-confidence evidence (e.g. 40%) speculative, not directives. |
| Accurate executive summary | Capture key findings with confidence caveats and limitations; never turn a 60%-confidence finding into fact for readability. |

## Output Format

```markdown
## Knowledge Review Result

**Status:** PASS | WARN | FAIL
**Artifact:** {path}
**Profile:** {artifact type} · **Depth:** {core | full} — {triage evidence}

### Checks (N/7 passed; N/A rows named with reason)

- [x] Template compliance
- [x] Citation audit
- [ ] Confidence accuracy — {issue}
- [ ] Source quality — {issue}
      ...

### Issues

- {specific issues found}

### Verdict

{APPROVED | REVISE | BLOCKED}
```

## Round 2: Focused Re-Review (conditional — triggered by findings)

Convergence follows the single contract in `SYNC:review-policy` below: **a clean Round 1 ENDS the review once the persisted `minRounds` is met (default 1); an explicitly required independent pass is still mandatory.** Re-review is triggered by a validated-finding fix cycle (`review → validate findings → fix → full re-review`) or an explicitly declared independent-pass minimum, not by a round number alone.

When Round 1 surfaces findings, run this focused re-review as part of that full re-review (do NOT rely on Round 1 memory):

1. **Re-read** the Round 1 verdict and checklist results
2. **Re-evaluate** ALL checklist items from scratch
3. **Challenge** Round 1 PASS items: "Is this really PASS? Did I verify citations and confidence?"
4. **Focus on** what Round 1 typically misses:
    - Citation accuracy (do sources actually say what's claimed?)
    - Confidence calibration (are percentages realistic?)
    - Knowledge gaps that weren't flagged
    - Template compliance shortcuts
5. **Update verdict** to incorporate the new findings; then re-enter the loop until a complete review pass finds zero issues.

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

**Prerequisites:** **MUST ATTENTION READ** before executing:

> **Review scope:** Review the knowledge artifact’s completeness, citations, confidence, and stated claims. Research-only artifacts have no application-inheritance or linter prerequisite. When an artifact makes code-linked claims, inspect only the referenced code and applicable project rules to verify those claims; route a requested code-design review to its code-review owner. Do not prescribe empty base classes or unrelated tooling.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `core-engineering-principles` — Core quality gate: easy to change, easy to scale, easy to maintain, judged by future change cost; planning, implementing or reviewing any change → .claude/skills/shared/protocols/core-engineering-principles.md
- `goal-contract-satisfaction-loop` — Save the goal in a file and loop until every saved criterion passes; executing work against a user goal → .claude/skills/shared/protocols/goal-contract-satisfaction-loop.md
- `review-decision-autonomy` — Choose supported review decisions and ask before extending the round budget; running any review or audit skill or mode → .claude/skills/shared/protocols/review-decision-autonomy.md
- `review-policy` — Review-only or a three-round fix loop with explicit extension and fresh post-fix evidence; deciding round eligibility, blocking findings or review state → .claude/skills/shared/protocols/review-policy.md
- `review-principle-awareness` — Classify the change context first, then apply the current principles that fit it; starting any review → .claude/skills/shared/protocols/review-principle-awareness.md
- `review-protocol-injection` — Verbatim template and protocol blocks for every fresh sub-agent review prompt; spawning a fresh sub-agent to review → .claude/skills/shared/protocols/review-protocol-injection.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `task-tracking-external-report` — Task breakdown before the work and report files written incrementally; starting any multi-step skill, plan or review → .claude/skills/shared/protocols/task-tracking-external-report.md
- `trade-off-interrogation-gate` — Three trade-off questions before any verdict, score or recommendation; rendering a verdict or recommending an option → .claude/skills/shared/protocols/trade-off-interrogation-gate.md
- `web-research` — Structured web search for evidence gathering; gathering external evidence from the web → .claude/skills/shared/protocols/web-research.md

<!-- PROTOCOL-GUIDES:END -->


<!-- SYNC:web-research:reminder -->

**IMPORTANT MUST ATTENTION** cite 2+ independent sources per claim. NEVER fabricate — "No evidence found" is valid output.

<!-- /SYNC:web-research:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->


<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** A finding names a reachable trigger path (caller, input, state or event that reaches the defect) and a consequence; an unreachable concern is an observation, and unsettled reachability is `NOT VERIFIABLE` only when the concern would be MEDIUM or higher (an observation otherwise) — never a speculative LOW.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->


<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

**Review/audit invocations:** follow `SYNC:review-decision-autonomy` for every decision prompt; choose supported recommendations without asking, preserve round-extension approval and actual authority.

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **what does it SACRIFICE?** name the dimensions checked (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it MATERIAL enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm via `ask user question tool` BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; never bury one as a Low-severity note, never decide it silently, and never let delivery or convergence pressure authorize a one-way door — an un-walked-back one-way door is the user's call, not the reviewer's.
- **MANDATORY — a context that cannot ask escalates BY HANDOFF, never by silence.** `ask user question tool` reaches only the main interactive agent, so a sub-agent or a terminal/verdict-only mode cannot ask. There the duty is REDIRECTED, not waived: still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, and **state the unconfirmed MATERIAL trade-off in your RETURNED verdict so the CALLER escalates it** (a note only in an on-disk report is not a handoff); never emit an unqualified PASS. If you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->



<!-- SYNC:review-principle-awareness:reminder -->

**IMPORTANT MUST ATTENTION** Every review first checks the change context and routes only applicable principles to their detailed protocols: scale-ready foundation, test intent in the project's native format (GWT is one option), AI-agent-as-user access, and UI/component design when relevant. Record evidence-backed apply/adapt/defer/N/A/block/unverified status with owner and next step; do not invent unrelated findings or expand scope.

<!-- /SYNC:review-principle-awareness:reminder -->

<!-- SYNC:review-decision-autonomy:reminder -->

**MUST ATTENTION** Decide supported review choices and recommendations, record the rationale, and finish without routine user questions. Keep round-limit extension, indispensable facts and actual action authority; preserve source coverage, validation, tests, read-only boundaries and budgets. Review decisions do not accept open risks or make a failed gate pass.

<!-- /SYNC:review-decision-autonomy:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Ensure knowledge artifacts are evidence-backed, complete, protocol-compliant, and safe to use for decisions — reviewing for quality, completeness, citation accuracy, and template compliance.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Double Round-Trip Review:** review → validate → fix only current-round blocking findings → full re-review; Round 1 requires zero open findings (LOW deferral), while Round 2 requires zero CRITICAL/HIGH/MEDIUM with LOW deferred.
- **Fresh Context Review:** after a fix, re-review with zero-memory fresh sub-agents.
- **Review Protocol Injection:** MUST ATTENTION embed all 11 protocol bodies VERBATIM into each fresh sub-agent prompt.
- **Nested Task Creation:** expand child phase tasks and link the parent when nested.
- **Task Tracking & External Report:** bootstrap tasks; persist plan/review findings to `tmp/reports/` incrementally.
- **Web Research:** cite 2+ independent sources per claim; NEVER fabricate.
- **Severity Rubric:** classify findings Critical/High/Medium/Low by consequence using `SYNC:severity-rubric`; round 1 blocks on every open validated finding (LOW deferral), round 2 blocks only CRITICAL/HIGH/MEDIUM, and LOW is recorded/deferred. Failed binary gates always block.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**IMPORTANT MUST ATTENTION** default SKEPTIC, not VALIDATOR — run the full Anti-Bias Gate before ANY verdict (core depth: the compressed three-item gate): 1+ contradicting source per major claim, stress-test every score ≥80%, state the strongest alternative conclusion, check supporting-vs-contradicting source ratio, run a pre-mortem, argue the opposite verdict in 2+ sentences
**IMPORTANT MUST ATTENTION** calibrate confidence to evidence — a single source ≠ 80%; scores >80% need 2+ independent sources with contradicting evidence addressed; single-source claims marked unverified MUST be <60%; findings <60% flagged prominently
**IMPORTANT MUST ATTENTION** main steps in order — read artifact + set profile and depth → 7-checklist audit (presence AND quality depth) → adversarial Anti-Bias Gate → emit PASS/WARN/FAIL per-check + verdict (APPROVED/REVISE/BLOCKED) → conditional Round 2 re-review
**IMPORTANT MUST ATTENTION** verify presence AND quality depth on every row the profile and depth select from the 7 checklists (template compliance, citation audit, confidence accuracy, source quality, knowledge gaps, cross-validation, actionability); course outlines add the pedagogy check
**IMPORTANT MUST ATTENTION** validate findings with `/why-review --validate-findings` whenever the report has findings, before any repair
**IMPORTANT MUST ATTENTION** Review-only/caller-owned passes report without artifact edits; standalone fix-loop repairs validated findings between passes, then freshly audits citations and the full artifact.
- break work into small todo tasks using `TaskCreate` BEFORE starting; add a final review todo to verify work quality
- cite evidence for every claim — for a knowledge artifact that is the supporting source citation `[N]` / source-table row (use `file:line` only for the rare code-linked claim); confidence >80% to act, <60% DO NOT recommend
- read required project-reference docs (always `lessons.md`) before the target review; classify findings Critical/High/Medium/Low by consequence (severity rubric) — round 1 blocks on every open validated finding (LOW deferral); round 2 blocks only CRITICAL/HIGH/MEDIUM, while LOW is recorded/deferred and failed binary gates always block
- verify every factual claim has an inline citation, every source in the table is referenced, no orphan citations, all 5 source fields present with accurate Tier
- execute the review loop: review → validate findings → fix validated findings that block the current round → full re-review; round 1 requires zero open findings, while from round 2 onward zero CRITICAL/HIGH/MEDIUM ends the loop and LOW-only findings are recorded/deferred — NEVER fix unvalidated findings, NEVER skip the full re-review after a blocking fix cycle

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

**Anti-Rationalization:**

| Evasion                              | Rebuttal                                                                                                            |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| "Sources are cited"                  | Presence ≠ quality — verify each source actually supports the SPECIFIC claim, not just sits in the table.          |
| "Confidence scores look reasonable"  | Name what would LOWER each score ≥80%. No answer = inflated. A single source is not 80%.                           |
| "Comprehensive coverage"             | State the strongest alternative conclusion and the perspective MISSING — absence of counterevidence ≠ consensus.   |
| "Recommendations are actionable"     | On what evidence, at what confidence? A directive from a 40%-confidence finding must be labeled speculative.       |
| "Clean enough, skip the Anti-Bias Gate" | The gate is MANDATORY before any verdict — skipping it ships confirmation-biased approval as fact.              |
| "I'll fix while judging citations" | Keep each review pass read-only; only the standalone fix-loop owner repairs after validation, then runs a fresh independent audit. |

**IMPORTANT MUST ATTENTION Goal (recency anchor):** ship only evidence-backed, complete, protocol-compliant knowledge artifacts — Anti-Bias Gate, confidence calibrated to source count/quality and validated severity-tiered findings. Review-only reports; standalone fix-loop repairs between read-only passes and freshly reviews until the shared round bar is clear, default cap three.

<!-- SYNC:core-engineering-principles:reminder -->

**MUST ATTENTION** Core Engineering Principles — every plan, implementation and review must be **Easy to change** (reuse first, one owner per rule, interfaces/adapters at volatile boundaries, no speculative abstraction) · **Easy to scale** (extend by addition, bounded growth, explicit boundaries, sized to the project's real profile) · **Easy to maintain** (intent-named tests that fail when the rule breaks across happy/error/edge paths; harness green locally and in CI). Before done: next change → how many edit sites? 10× → what breaks? which test goes red?

<!-- /SYNC:core-engineering-principles:reminder -->


<!-- SYNC:review-policy:reminder -->

**MUST ATTENTION** Triage all targets, plan and create review/validation/fix/fresh re-review tasks first. Review-only reports without edits; fix-loop freshly reviews every repair under one fixing owner. Default cap three rounds: disclose deferred LOWs, ask and wait before a bounded extension for MEDIUM+ or failed required checks. Preserve scope, coverage and actual operation authority.

<!-- /SYNC:review-policy:reminder -->
