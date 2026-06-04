---
name: knowledge-review
description: '[Research] Use when you need to review knowledge artifacts for completeness, citation quality, confidence accuracy, and template compliance.'
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->

## Codex Project-Reference Loading (No Hooks)

Codex uses static project-reference loading instead of runtime-injected project docs.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

## Quick Summary

**Goal:** Ensure knowledge artifacts are evidence-backed, complete, protocol-compliant, and safe to use for decisions — reviewing for quality, completeness, citation accuracy, and template compliance.

**Summary:**

- READ-ONLY audit across 7 checklists (template compliance, citation audit, confidence accuracy, source quality, knowledge gaps, cross-validation, actionability) — verify presence AND quality depth, never just that a section exists.
- Default to SKEPTIC: run the Anti-Bias Gate before any verdict — find a contradicting source per major claim, stress-test every score ≥80%, state the strongest alternative conclusion, check supporting-vs-contradicting source ratio, run a pre-mortem, and argue the opposite verdict in 2+ sentences.
- Calibrate confidence to evidence: a single source ≠ 80%, scores >80% need 2+ independent sources with contradicting evidence addressed, single-source claims marked unverified must be <60%, and findings <60% must be flagged prominently.
- Emit PASS/WARN/FAIL with per-check status and a verdict (APPROVED/REVISE/BLOCKED); a clean Round 1 ENDS the review, while any finding triggers validate → fix → full re-review until zero issues.

**Workflow:**

1. **Read artifact** — Load the knowledge report/course/strategy
2. **Template compliance** — Verify all enforced sections present
3. **Citation audit** — Check inline citations and source table
4. **Confidence check** — Verify scores match evidence
5. **Output review** — Summary with pass/warn/fail per check

**Key Rules:**

- Every section from template must be present and non-empty
- Every factual claim must have inline citation
- Confidence scores must match evidence basis
- READ-ONLY — do not modify the artifact

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## First Principle — Easy to Change

> **Success metric of every coding decision: _future change cost_.**
> DRY, SRP, abstraction, design patterns, naming, layering, tests — every technique serves one goal: **making next change cheaper**.

When evaluating code, refactor, test, or abstraction, ask: **does this make next change cheaper or more expensive?**

- Reject "best practices" raising change cost (premature abstraction, speculative generality, leaky indirection, ceremony without payoff).
- Name real enemies in findings: **coupling, hidden state, duplicated knowledge, unclear intent, irreversible decisions exposed too early**.
- Simpler design that is easy to change beats sophisticated design that isn't.

Apply this lens **before** invoking any specific rule, pattern, or checklist below — if downstream rule would raise change cost, this principle wins.

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

- **"Sources are cited"** → Presence of citations ≠ quality. Do they actually support the claim?
- **"Confidence scores look reasonable"** → What would LOWER the confidence score? Name it.
- **"Comprehensive coverage"** → What perspective is MISSING from this research?
- **"Recommendations are actionable"** → On what evidence? What's the confidence of the evidence chain?
- **Approving a knowledge artifact without challenging the evidence quality** → Forbidden.

### Anti-Bias Gate (MANDATORY before finalizing verdict) (MUST ATTENTION)

- found 1+ contradicting source per major claim (or flagged its absence)
- challenged 1+ confidence score ≥ 80% with a stress test
- stated strongest alternative conclusion from same evidence
- checked source balance (supporting vs. contradicting ratio)
- ran pre-mortem on main recommendation
- generated 2+ sentences arguing opposite verdict

Any item unmet → adversarial review incomplete. Go back. — why: skipping the gate ships confirmation-biased verdicts as fact.

# Knowledge Review

## Review Checklist

### 1. Template Compliance

| #   | Check                                                                                                     | Presence                                                                                 | Quality Depth                                                                                                                                                       |
| --- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **All enforced sections present** — every required section from the template exists in the artifact       | Are ALL required sections present (not just most)? Is any section empty vs. placeholder? | Does each section contain substantive content, or is it a heading with nothing beneath it? A partially-filled section is as dangerous as a missing one.             |
| 2   | **No sections are empty placeholders** — section bodies contain real content, not "TBD" or "to be filled" | Are section bodies substantive or just "TBD / to be filled"?                             | Is the content specific to this artifact, or generic filler? A section that says "risks will be identified later" has negative value — it creates false confidence. |
| 3   | **Section order matches template** — sections appear in prescribed sequence                               | Do sections appear in the prescribed order?                                              | Does reordering break any cross-references between sections? If section 3 references section 2, out-of-order placement creates reading confusion.                   |

### 2. Citation Audit

| #   | Check                                                                                                                            | Presence                                                                                                                  | Quality Depth                                                                                                                                                       |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Every factual claim has inline citation `[N]`** — all assertions are backed by a numbered source reference                     | Are ALL claims cited, or only the obvious ones? Uncited claims are assertions, not findings.                              | Do the cited sources actually say what the text claims? A source cited for a paraphrase is different from a source cited for a direct claim.                        |
| 2   | **Every source in Sources table is referenced in text** — no source appears in the table without a corresponding `[N]` reference | Are all table sources referenced in the text body? Orphan sources = sources added for credibility, not used for evidence. | Are sources cited at the most specific claim they support, or cited vaguely at section level? Section-level citation hides which sub-claims are actually supported. |
| 3   | **No orphan citations** — every `[N]` reference in the text matches a Sources table row                                          | Are there `[N]` references that don't match any Sources table row?                                                        | Are citation numbers consistent throughout (no gaps, no duplicates)? Broken citation numbering signals the artifact was edited without maintaining integrity.       |
| 4   | **Sources table has: Title, URL, Author, Date, Tier** — all five fields present for every source                                 | Are ALL 5 fields filled? Is Tier assigned (not just blank)?                                                               | Are the Tier assignments accurate? A blog post assigned Tier 1 inflates perceived source quality. Is the Date current enough for the topic?                         |

### 3. Confidence Accuracy

| #   | Check                                                                                                                     | Presence                                                                                         | Quality Depth                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Per-finding confidence scores declared** — each finding has its own explicit confidence percentage                      | Does EACH finding have its own score, or is one artifact-level score applied everywhere?         | Are scores at the finding level, not the section level? A single score per section hides that some findings within it may be poorly supported.                                             |
| 2   | **Overall confidence declared** — an aggregate confidence score for the artifact is stated                                | Is the overall score present and explicitly stated?                                              | Is the overall score a reasoned aggregate, or just the highest per-finding score? An average of 85%, 60%, and 40% is NOT 85%.                                                              |
| 3   | **Scores match evidence basis (not inflated)** — confidence percentages are calibrated to actual source count and quality | Is each score justified by the number and quality of independent sources? A single source ≠ 80%. | What would LOWER this confidence score? If no answer exists, the score is likely inflated. Are scores above 80% supported by 2+ independent sources with contradicting evidence addressed? |
| 4   | **Findings <60% flagged prominently** — low-confidence findings are visually distinct from high-confidence ones           | Are low-confidence findings visually distinct (e.g., ⚠️ prefix), not buried in body text?        | Are low-confidence findings positioned to prevent downstream misuse? A low-confidence finding mentioned once in passing will be treated as fact by readers who skim.                       |

### 4. Source Quality

| #   | Check                                                                                                    | Presence                                                               | Quality Depth                                                                                                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Tier distribution appropriate (not all Tier 4)** — source tiers are spread across quality levels       | Is the Tier distribution recorded? Are Tier 4 sources a minority?      | Does Tier distribution match the claim importance? A Tier 4 source for a core claim is a risk regardless of how many Tier 1 sources exist elsewhere.                            |
| 2   | **At least 50% Tier 1-2 sources for key claims** — high-stakes conclusions rest on authoritative sources | Do key claims cite Tier 1-2 sources? Is the 50% threshold met overall? | Are the Tier 1-2 sources actually authoritative for THIS specific claim domain, or just prestigious in a different domain? Domain mismatch inflates perceived authority.        |
| 3   | **Recency appropriate for topic type** — sources are current relative to how fast the topic evolves      | Are sources dated? Is recency assessed for each source?                | Is "recency" calibrated to the topic's rate of change? A 2019 source on cloud pricing is stale; a 2019 source on database theory may be fine. Are any outdated sources flagged? |

### 5. Knowledge Gaps

| #   | Check                                                                                                     | Presence                                                                                   | Quality Depth                                                                                                                                                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Gaps section is present and honest** — a dedicated section describes what the research did NOT find     | Is a Gaps section present? Does it list specific gaps, not just "more research needed"?    | Are the gaps specific enough to guide follow-up research? "Unknown pricing" is actionable; "some uncertainty exists" is not. Are gaps ranked by impact on the artifact's conclusions?                                                |
| 2   | **Known limitations declared** — methodological or coverage limitations are explicitly stated             | Are limitations listed (not inferred)? Does the section distinguish limitations from gaps? | Are limitations acknowledged BEFORE they are used to discount findings, or only in a footnote after conclusions are stated? A limitation that invalidates a key finding must appear near that finding, not only in the Gaps section. |
| 3   | **Suggestions for further research included** — the artifact proposes next steps to close identified gaps | Are 1+ follow-up research suggestions present? Are they tied to specific gaps?             | Are suggestions actionable (specific query + source type) or vague ("investigate further")? Do suggestions address the gaps that most affect decision-making?                                                                        |

### 6. Cross-Validation

| #   | Check                                                                                                           | Presence                                                                       | Quality Depth                                                                                                                                                               |
| --- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Key claims verified by 2+ sources** — core conclusions are supported by multiple independent sources          | Are 2+ sources cited for each key claim?                                       | Are the sources truly independent, or do they cite each other (amplification, not validation)? Two sources from the same original study do not constitute cross-validation. |
| 2   | **Discrepancies noted where sources conflict** — when sources contradict each other, the conflict is documented | Are source conflicts recorded in the artifact?                                 | Are conflicts resolved or just noted? If sources conflict, the artifact should explain which source was weighted more and why — not just acknowledge the conflict exists.   |
| 3   | **Single-source claims marked as unverified** — any finding backed by only one source is explicitly labeled     | Are single-source claims identified with an "unverified" marker or equivalent? | Are single-source claims given confidence scores below 60% as required? A single source labeled "unverified" but assigned 75% confidence is self-contradictory.             |

### 7. Actionability

| #   | Check                                                                                                                   | Presence                                                                     | Quality Depth                                                                                                                                                                               |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Recommendations are concrete (not vague)** — each recommendation specifies who should do what                         | Are recommendations present? Do they name an action (not just "consider X")? | Are recommendations actionable enough to assign to a specific role without further clarification? "Improve monitoring" is not actionable; "add P99 latency alert at 500ms threshold" is.    |
| 2   | **Next steps are evidence-based** — proposed actions are traceable to findings in the artifact                          | Are next steps present and linked to specific findings?                      | Is each next step traceable to a specific finding and confidence score? A next step driven by a 40%-confidence finding should be labeled speculative, not presented as a directive.         |
| 3   | **Executive summary captures key findings** — the summary conveys findings accurately without omitting critical caveats | Is an executive summary present? Does it list key findings?                  | Does the summary preserve confidence caveats and limitations, or does it strip them out for readability? A summary that presents 60%-confidence findings as facts is worse than no summary. |

## Output Format

```markdown
## Knowledge Review Result

**Status:** PASS | WARN | FAIL
**Artifact:** {path}

### Checks (N/7 passed)

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

Convergence follows the single contract in `SYNC:double-round-trip-review` below: **a clean Round 1 ENDS the review — there is no unconditional mandatory Round 2.** Re-review is triggered by a validated-finding fix cycle (`review → validate findings → fix → full re-review`), not by a round number.

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

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting.

**Prerequisites:** **MUST ATTENTION READ** before executing:

> **OOP & DRY Enforcement:** MANDATORY — flag duplicated patterns that should be extracted to a base class, generic, or helper. Classes in the same group or suffix (ex *Entity, *Dto, \*Service, etc...) must inherit a common base (even if empty now — enables future shared logic and child overrides). Verify project has code linting/analyzer configured for the stack.

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

<!-- SYNC:double-round-trip-review -->

> **Validated-Finding Fix + Full Re-Review Loop** — Re-review is triggered by a validated finding fix cycle, not by a round number. Review purpose: `review → validate findings → fix validated findings → full re-review` until a complete review pass finds no issues. **A clean review ENDS the loop — no further rounds required.**
>
> **Round 1:** Main-session review. Read target files, build understanding, note issues. Output findings + verdict (PASS / FAIL).
>
> **Decision after Round 1:**
>
> - **No issues found (PASS, zero findings)** → review ENDS. Do NOT spawn a fresh sub-agent for confirmation.
> - **Issues found (FAIL, or any non-zero findings)** → run the active review skill's findings-validation gate first; for review skills the default gate is `$why-review --validate-findings <report-path>`. Fix only validated findings, then restart the full review protocol from the beginning with a fresh task breakdown.
>
> **Fresh full re-review after every fix cycle:** Re-run the whole review protocol over the current full target. When sub-agents are part of that protocol, spawn NEW `spawn_agent` calls — never reuse prior agents. Reviewers re-read ALL files from scratch with ZERO memory of prior rounds. See `SYNC:fresh-context-review` for the spawn mechanism and `SYNC:review-protocol-injection` for the canonical Agent prompt template. Each fresh full review must catch:
>
> - Cross-cutting concerns missed in the prior round
> - Interaction bugs between changed files
> - Convention drift (new code vs existing patterns)
> - Missing pieces that should exist but don't
> - Subtle edge cases the prior round rationalized away
> - Regressions introduced by the fixes themselves
>
> **Loop termination:** After each full re-review, repeat the same decision: clean → END; issues → validate findings → fix → restart from the first review phase. Continue until a complete review pass finds zero issues. If the same validated finding repeats for 3 full invocations with no progress, or a fix requires product/owner input, escalate via a direct user question.
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

<!-- SYNC:fresh-context-review -->

> **Fresh Context Re-Review** — Eliminate orchestrator confirmation bias after fixes by restarting the full review with isolated sub-agents where applicable.
>
> **Why:** The main agent knows what it (or `$feature-implement`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** ONLY after a validated-finding fix cycle. A review round that finds zero issues ENDS the loop — do NOT spawn a confirmation sub-agent. A review round that finds issues triggers: validate findings → fix → full review restart from the first phase.
>
> **How:**
>
> 1. Start a NEW full review invocation/task breakdown; when that protocol calls for agents, spawn NEW `spawn_agent` tool calls — use `code-reviewer` agent_type for code reviews, `general-purpose` for plan/doc/artifact reviews
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. Never reference protocols by file path; AI compliance drops behind file-read indirection (see `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `plans/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - SKIP fresh sub-agent when the prior full review found zero issues (no fixes = nothing new to verify)
> - NEVER skip the full review restart after a fix cycle — every fix invalidates the prior verdict
> - NEVER reuse a sub-agent across rounds — every fresh round spawns a NEW `spawn_agent` call
> - Continue until a complete full review pass has zero findings; if the same blocker repeats 3 times with no progress, escalate via a direct user question
> - Track iteration count and repeated blockers in conversation context (session-scoped, no persistent files)

<!-- /SYNC:fresh-context-review -->

<!-- SYNC:review-protocol-injection -->

> **Review Protocol Injection** — Every fresh sub-agent review prompt MUST embed 11 protocol blocks VERBATIM. The template below has ALL 11 bodies already expanded inline. Copy the template wholesale into the Agent call's `prompt` field at runtime, replacing only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific values. Do NOT touch the embedded protocol sections.
>
> **Why inline expansion:** Placeholder markers would force file-read indirection at runtime. AI compliance drops significantly behind indirection (see `SYNC:shared-protocol-duplication-policy`). Therefore the template carries all 11 protocol bodies pre-embedded.

### Subagent Type Selection

- `code-reviewer` — for code reviews (reviewing source files, git diffs, implementation)
- `general-purpose` — for plan / doc / artifact reviews (reviewing markdown plans, docs, specs)

### Canonical Agent Call Template (Copy Verbatim)

```
spawn_agent({
  description: "Fresh Round {N} review",
  agent_type: "code-reviewer",
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
- "Just do it" → Still need task tracking. Skip depth, never skip tracking.
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
- DO choose `code-reviewer` agent_type for code reviews and `general-purpose` for plan / doc / artifact reviews
- DO NOT paraphrase, summarize, or skip any protocol section
- DO NOT pass file contents inline — the sub-agent reads via its own tool calls so it has a fresh context
- DO NOT reference protocols by file path or tag name — the bodies are already embedded above
- DO NOT introduce placeholder markers for the protocols — they must stay literally expanded

<!-- /SYNC:review-protocol-injection -->

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call the current task list first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] $skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** the current task list done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate** — Run after task-tracking bootstrap and before target/source file reads, grep, edits, or analysis. Project docs override generic framework assumptions.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`; behavior/public-contract/spec-test-code sync `workflow-spec-test-code-cycle-reference.md`; derived spec index/ERD/reimplementation guides `spec-system-reference.md` + source Feature Specs under `docs/specs/`; architecture/new area `project-structure-reference.md`.
> 3. Read every required doc. If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.
> 4. Before target work, state: `Reference docs read: ... | Not applicable: ...`.
>
> **Ready when:** scope evaluated, required docs checked/read or setup route completed, `lessons.md` confirmed, citation emitted.

<!-- /SYNC:project-reference-docs-guide -->

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

<!-- SYNC:web-research -->

> **Web Research** — Structured web search for evidence gathering.
>
> 1. Form 3-5 specific search queries (not generic questions)
> 2. Use WebSearch for each query, collect top 3-5 sources
> 3. Validate source credibility (official docs > blogs > forums)
> 4. Cross-validate claims across 2+ sources before citing
> 5. Write findings to research report with source URLs
>
> **NEVER cite a single source as authoritative. Always cross-validate.**

<!-- /SYNC:web-research -->

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

<!-- SYNC:double-round-trip-review:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** execute the review loop: review → validate findings → fix validated findings → full re-review. A complete review pass with zero findings ENDS the review.
  <!-- /SYNC:double-round-trip-review:reminder -->

<!-- SYNC:web-research:reminder -->

**IMPORTANT MUST ATTENTION** cite 2+ independent sources per claim. NEVER fabricate — "No evidence found" is valid output.

<!-- /SYNC:web-research:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `plans/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** After task-tracking bootstrap and before target/source work, read required project-reference docs and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project conventions override generic defaults.
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify findings Critical/High/Medium/Low by consequence; Critical/High block PASS until fixed or owner-accepted.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Ensure knowledge artifacts are evidence-backed, complete, protocol-compliant, and safe to use for decisions — review for quality, completeness, citation accuracy, and template compliance.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Double Round-Trip Review:** review → validate → fix → full re-review; clean pass ends the loop.
- **Fresh Context Review:** after a fix, re-review with zero-memory fresh sub-agents.
- **Review Protocol Injection:** MUST ATTENTION embed all 11 protocol bodies VERBATIM into each fresh sub-agent prompt.
- **Nested Task Creation:** expand child phase tasks and link the parent when nested.
- **Project Reference Docs Guide:** ALWAYS read required project docs (`lessons.md`) before target review.
- **Task Tracking & External Report:** bootstrap tasks; persist plan/review findings to `plans/reports/` incrementally.
- **Critical Thinking:** apply critical + sequential thinking; every claim needs traced proof, >80% to act.
- **Web Research:** cite 2+ independent sources per claim; NEVER fabricate.
- **Severity Rubric:** classify findings Critical/High/Medium/Low by consequence; Critical/High block PASS.

**IMPORTANT MUST ATTENTION** default SKEPTIC, not VALIDATOR — run the full Anti-Bias Gate before ANY verdict: 1+ contradicting source per major claim, stress-test every score ≥80%, state the strongest alternative conclusion, check supporting-vs-contradicting source ratio, run a pre-mortem, argue the opposite verdict in 2+ sentences — why: AI gravitates to confirming sources, so an ungated review ships confirmation-biased verdicts as fact.
**IMPORTANT MUST ATTENTION** calibrate confidence to evidence — a single source ≠ 80%; scores >80% need 2+ independent sources with contradicting evidence addressed; single-source claims marked unverified MUST be <60%; findings <60% flagged prominently — why: an inflated confidence score is read downstream as a fact and drives bad decisions.
**IMPORTANT MUST ATTENTION** verify presence AND quality depth across all 7 checklists (template compliance, citation audit, confidence accuracy, source quality, knowledge gaps, cross-validation, actionability) — a section that exists but is filler/placeholder has negative value — why: "section present" ≠ "section sound"; false confidence is worse than an honest gap.
**IMPORTANT MUST ATTENTION** READ-ONLY — review and report, NEVER modify the audited artifact; emit fixes as findings for the author — why: a reviewer that edits the artifact destroys the independent second opinion the review exists to provide.

- break work into small todo tasks using task tracking BEFORE starting; add a final review todo to verify work quality
- cite evidence for every claim — for a knowledge artifact that is the supporting source citation `[N]` / source-table row (use `file:line` only for the rare code-linked claim); confidence >80% to act, <60% DO NOT recommend
- read required project-reference docs (always `lessons.md`) before the target review; classify findings Critical/High/Medium/Low by consequence (severity rubric) — Critical/High block PASS until fixed or owner-accepted
- verify every factual claim has an inline citation, every source in the table is referenced, no orphan citations, all 5 source fields present with accurate Tier — why: citation presence ≠ citation correctness; the cited source must actually support the specific claim
- execute the review loop: review → validate findings → fix validated findings → full re-review; a complete review pass with zero findings ENDS the review — NEVER fix unvalidated findings, NEVER skip the full re-review after a fix cycle — why: every fix invalidates the prior verdict

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.

**Anti-Rationalization:**

| Evasion                                 | Rebuttal                                                                                                         |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| "Sources are cited"                     | Presence ≠ quality — verify each source actually supports the SPECIFIC claim, not just sits in the table.        |
| "Confidence scores look reasonable"     | Name what would LOWER each score ≥80%. No answer = inflated. A single source is not 80%.                         |
| "Comprehensive coverage"                | State the strongest alternative conclusion and the perspective MISSING — absence of counterevidence ≠ consensus. |
| "Recommendations are actionable"        | On what evidence, at what confidence? A directive from a 40%-confidence finding must be labeled speculative.     |
| "Clean enough, skip the Anti-Bias Gate" | The gate is MANDATORY before any verdict — skipping it ships confirmation-biased approval as fact.               |
| "I'll just fix the artifact while here" | READ-ONLY — emit findings; editing the artifact collapses the independent review into the authoring it audits.   |

**IMPORTANT MUST ATTENTION Goal (recency anchor):** ship only evidence-backed, complete, protocol-compliant knowledge artifacts — verdict via the Anti-Bias Gate (SKEPTIC default), confidence calibrated to source count/quality, READ-ONLY, severity-tiered findings, re-review until zero issues.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)

## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Trace every requirement or invariant through decision, task, TC/test, source evidence, and docs/spec update.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.
  **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
   **Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
   **Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

## Common AI Mistake Prevention (System Lessons)

- **Re-read files after context compaction.** Edit requires prior Read in same context; compaction wipes read state. Re-read before editing.
- **Grep for old terms after bulk replacements.** AI over-trusts find/replace completeness. Grep full repo after bulk edits for missed refs in docs/configs/catalogs.
- **Check downstream references before deleting.** Deletions cascade doc/code staleness. Map referencing files before removal.
- **After memory loss, check existing state before creating new.** Compaction wipes prior-work memory. Query current state to resume — never blindly duplicate.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace full dependency chain after edits.** Changing a definition misses downstream consumers. Trace the full chain.
- **When renaming, grep ALL consumer file types.** Some file types silently ignore missing refs (no compile error). Search code, templates, configs, generated files.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Update docs that embed canonical data when source changes.** Docs inlining derived data (workflows, schemas, configs) go stale silently. Update all embedding docs alongside source.
- **Verify sub-agent results after context recovery.** Background agents may finish while parent compacted — grep-verify output, don't trust assumed completion.
- **Cross-check full target list against sub-agent assignments.** Parallel sub-agents by category miss boundary items. Reconcile union of assignments against target list before proceeding.
- **Sub-agents inherit knowledge only from their agent .md definition — use custom agent types, not built-in Explore.** Tool adoption = permission + knowledge + enforcement (numbered workflow step).
- **Persist sub-agent findings incrementally, not as a final batch.** Long sub-agents hit cutoffs before final write — findings lost. Instruct append-per-section to report file.
- **When debugging, ask "whose responsibility?" before fixing.** Trace caller (wrong data) vs callee (wrong handling). Fix at responsible layer — never patch symptom site.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing.** Pattern-matching as "wrong" skips context. Before changing any constant/limit/flag: read comments, git blame, surrounding code.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic-first debugging — resist nearest-attention trap.** Don't dive into first plausible cause. List EVERY precondition (config, env vars, paths, DB, endpoints, creds, versions, DI, data). Verify each against evidence (grep/query — not reasoning). Ask "what would falsify this?" — if nothing, it's not a hypothesis. Most expensive failure: going deeper in "obvious" layer while bug sits in layer never questioned.
- **Surgical changes — apply the diff test (context-aware).** Two modes: (1) Bug fix → every line traces to the bug; no restyling; orphan cleanup only for imports YOUR changes made unused. (2) Review/enhancement → implement improvements AND announce as "Enhancement beyond main request: [what]". Never silently scope-creep. Diff test: "Would this line exist if I wasn't asked to do X?" — if no, delete or announce.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **[MANDATORY FIRST ACTION] ALWAYS activate a suitable skill or workflow BEFORE responding.** Match task against workflow catalog + skill list; invoke via skill invocation or `$start-workflow <workflowId>`. NEVER answer or write code before checking. Skip = protocol violation.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
