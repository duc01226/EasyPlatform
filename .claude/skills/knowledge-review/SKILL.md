---
name: knowledge-review
version: 1.1.0
description: '[Research] Review knowledge artifacts for completeness, citation quality, confidence accuracy, and template compliance.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

**Prerequisites:** **MUST ATTENTION READ** before executing:

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

> **OOP & DRY Enforcement:** MANDATORY IMPORTANT MUST ATTENTION — flag duplicated patterns that should be extracted to a base class, generic, or helper. Classes in the same group or suffix (ex *Entity, *Dto, \*Service, etc...) MUST ATTENTION inherit a common base (even if empty now — enables future shared logic and child overrides). Verify project has code linting/analyzer configured for the stack.

## Quick Summary

**Goal:** Review knowledge artifacts for quality, completeness, and protocol compliance.

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

## Adversarial Review Mindset (NON-NEGOTIABLE)

**Default stance: SKEPTIC challenging research quality, not confirming research completeness.**

> **Source confirmation bias trap:** AI naturally gravitates toward sources that confirm its working hypothesis. The knowledge artifact was built iteratively — by the time it's complete, the framing is locked in. This section forces challenge of both the sources AND the framing.

### Adversarial Techniques (apply ALL before concluding)

**1. Source Bias Detection**
For the top 3 claims in the artifact: "What sources CONTRADICT this claim?" If no contradicting source is cited — either the reviewer didn't look, or the evidence is truly one-sided. Ask: "What would a skeptic of this conclusion cite?" If no counterevidence is addressed, the confidence score is inflated.

**2. Confidence Calibration Challenge**
For each confidence score ≥ 80%: "What would need to be true for this confidence to be wrong?" High confidence is only warranted when: (a) multiple independent sources agree, (b) contradicting evidence is addressed, (c) the methodology is sound. Challenge any score that rests on a single source or on undisclosed assumptions.

**3. Alternative Conclusion Check**
Given the same evidence, what DIFFERENT conclusion could a reasonable expert reach? If the artifact does not address at least one credible alternative interpretation, the analysis is incomplete. State the strongest alternative conclusion.

**4. Cherry-Picking Detection**
Count the sources that support the main conclusion vs. sources that challenge it. If the ratio is > 3:1 in favor of supporting sources without explicit explanation of why contradicting sources were discounted — flag cherry-picking.

**5. Pre-Mortem**
Assume the recommendation in this artifact is implemented and fails. Write the most plausible failure scenario given the research limitations. If the artifact doesn't acknowledge this failure mode — it's missing a risk section.

**6. Contrarian Pass**
Before writing any verdict, generate at least 2 sentences arguing the OPPOSITE conclusion about the artifact's quality. Then decide which argument is stronger.

### Forbidden Patterns

- **"Sources are cited"** → Presence of citations ≠ quality. Do they actually support the claim?
- **"Confidence scores look reasonable"** → What would LOWER the confidence score? Name it.
- **"Comprehensive coverage"** → What perspective is MISSING from this research?
- **"Recommendations are actionable"** → On what evidence? What's the confidence of the evidence chain?
- **Approving a knowledge artifact without challenging the evidence quality** → Forbidden.

### Anti-Bias Gate (MANDATORY before finalizing verdict)

- [ ] Found at least 1 contradicting source per major claim (or flagged its absence)
- [ ] Challenged at least 1 confidence score ≥ 80% with a stress test
- [ ] Stated the strongest alternative conclusion from the same evidence
- [ ] Checked source balance (supporting vs. contradicting ratio)
- [ ] Ran pre-mortem on the main recommendation
- [ ] Generated at least 2 sentences arguing the opposite verdict

If any box is unchecked → adversarial review incomplete. Go back.

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

## Round 2: Focused Re-Review (MANDATORY)

<!-- SYNC:double-round-trip-review -->

> **Deep Multi-Round Review** — Escalating rounds. Round 1 in main session. Round 2+ and EVERY recursive re-review iteration MUST use a fresh sub-agent.
>
> **Round 1:** Main-session review. Read target files, build understanding, note issues. Output baseline findings.
>
> **Round 2:** MANDATORY fresh sub-agent review — see `SYNC:fresh-context-review` for the spawn mechanism and `SYNC:review-protocol-injection` for the canonical Agent prompt template. The sub-agent re-reads ALL files from scratch with ZERO Round 1 memory. It must catch:
>
> - Cross-cutting concerns missed in Round 1
> - Interaction bugs between changed files
> - Convention drift (new code vs existing patterns)
> - Missing pieces that should exist but don't
> - Subtle edge cases the main session rationalized away
>
> **Round 3+ (recursive after fixes):** After ANY fix cycle, MANDATORY fresh sub-agent re-review. Spawn a **NEW** Agent tool call each iteration — never reuse Round 2's agent. Each new agent re-reads ALL files from scratch with full protocol injection. Continue until PASS or **3 fresh-subagent rounds max**, then escalate to user via `AskUserQuestion`.
>
> **Rules:**
>
> - NEVER declare PASS after Round 1 alone
> - NEVER reuse a sub-agent across rounds — every iteration spawns a NEW Agent call
> - Main agent READS sub-agent reports but MUST NOT filter, reinterpret, or override findings
> - Max 3 fresh-subagent rounds per review — if still FAIL, escalate via `AskUserQuestion` (do NOT silently loop)
> - Track round count in conversation context (session-scoped)
> - Final verdict must incorporate ALL rounds
>
> **Report must include `## Round N Findings (Fresh Sub-Agent)` for every round N≥2.**

<!-- /SYNC:double-round-trip-review -->

<!-- SYNC:fresh-context-review -->

> **Fresh Sub-Agent Review** — Eliminate orchestrator confirmation bias via isolated sub-agents.
>
> **Why:** The main agent knows what it (or `/cook`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** Round 2 of ANY review AND every recursive re-review iteration after fixes. NOT needed when Round 1 already PASSes with zero issues.
>
> **How:**
>
> 1. Spawn a NEW `Agent` tool call — use `code-reviewer` subagent_type for code reviews, `general-purpose` for plan/doc/artifact reviews
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. Never reference protocols by file path; AI compliance drops behind file-read indirection (see `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `plans/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - NEVER reuse a sub-agent across rounds — every iteration spawns a NEW `Agent` call
> - NEVER skip fresh-subagent review because "last round was clean" — every fix triggers a fresh round
> - Max 3 fresh-subagent rounds per review — escalate via `AskUserQuestion` if still failing; do NOT silently loop or fall back to any prior protocol
> - Track iteration count in conversation context (session-scoped, no persistent files)

<!-- /SYNC:fresh-context-review -->

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
6. Stack-Specific: JS: === vs ==, typeof null. C#: async void, missing using, LINQ deferred execution.
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
NEVER mark review PASS without completing both traces (happy + error path).

### Test Spec Verification
Map changed code to test specifications.
1. From changed files → find TC-{FEAT}-{NNN} in docs/business-features/{Service}/detailed-features/{Feature}.md Section 15.
2. Every changed code path MUST map to a corresponding TC (or flag as "needs TC").
3. New functions/endpoints/handlers → flag for test spec creation.
4. Verify TC evidence fields point to actual code (file:line, not stale references).
5. Auth changes → TC-{FEAT}-02x exist? Data changes → TC-{FEAT}-01x exist?
6. If no specs exist → log gap and recommend /tdd-spec.
NEVER skip test mapping. Untested code paths are the #1 source of production bugs.

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

After completing Round 1 evaluation, execute a **second full review round**:

1. **Re-read** the Round 1 verdict and checklist results
2. **Re-evaluate** ALL checklist items — do NOT rely on Round 1 memory
3. **Challenge** Round 1 PASS items: "Is this really PASS? Did I verify citations and confidence?"
4. **Focus on** what Round 1 typically misses:
    - Citation accuracy (do sources actually say what's claimed?)
    - Confidence calibration (are percentages realistic?)
    - Knowledge gaps that weren't flagged
    - Template compliance shortcuts
5. **Update verdict** if Round 2 found new issues
6. **Final verdict** must incorporate findings from BOTH rounds

---

<!-- SYNC:web-research:reminder -->

**IMPORTANT MUST ATTENTION** cite 2+ independent sources per claim. NEVER fabricate — "No evidence found" is valid output.

<!-- /SYNC:web-research:reminder -->
<!-- SYNC:double-round-trip-review:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** execute TWO review rounds. Round 2 delegates to fresh code-reviewer sub-agent (zero prior context) — never skip or combine with Round 1.
      <!-- /SYNC:double-round-trip-review:reminder -->
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

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
**IMPORTANT MUST ATTENTION** execute two review rounds (Round 1: understand, Round 2: catch missed issues)
**MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
