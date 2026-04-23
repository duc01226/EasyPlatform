---
name: code-review
version: 2.3.0
description: '[Code Quality] Use when receiving code review feedback (especially if unclear or technically questionable), when completing tasks requiring review before proceeding, or before making completion claims. Covers receiving feedback with technical rigor, requesting reviews via code-reviewer subagent, and verification gates requiring evidence before status claims.'
execution-mode: subagent
context-budget: critical
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

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
> - **Business terminology in Application/Domain layers.** Comments and naming in Application/Domain must stay business-oriented and technical-agnostic; avoid implementation terms (say `background job`, not `Hangfire background job`).

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs proof.
>
> 1. Cite `file:line`, grep results, or framework docs for EVERY claim
> 2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
> 3. Cross-service validation required for architectural changes
> 4. "I don't have enough evidence" is valid and expected output
>
> **BLOCKED until:** `- [ ]` Evidence file path (`file:line`) `- [ ]` Grep search performed `- [ ]` 3+ similar patterns found `- [ ]` Confidence level stated
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->

<!-- SYNC:design-patterns-quality -->

> **Design Patterns Quality** — Priority checks for every code change:
>
> 1. **DRY via OOP:** Identify classes/modules with the same purpose, naming pattern, or lifecycle. Apply your knowledge of the project's language/framework to determine the idiomatic abstraction (base class, mixin, trait, protocol, decorator). 3+ similar patterns → extract to shared abstraction.
> 2. **Right Responsibility:** Logic in LOWEST layer (Entity > Domain Service > Application Service > Controller). Never business logic in controllers.
> 3. **SOLID:** Single responsibility (one reason to change). Open-closed (extend, don't modify). Liskov (subtypes substitutable). Interface segregation (small interfaces). Dependency inversion (depend on abstractions).
> 4. **After extraction/move/rename:** Grep ENTIRE scope for dangling references. Zero tolerance.
> 5. **YAGNI gate:** NEVER recommend patterns unless 3+ occurrences exist. Don't extract for hypothetical future use.
>
> **Anti-patterns to flag:** God Object, Copy-Paste inheritance, Circular Dependency, Leaky Abstraction.
>
> **Serial Attention for Design Quality** — DO NOT scan all quality concerns simultaneously. Split attention misses violations that focused passes catch.
>
> 1. **Identify applicable dimensions** — Based on the code's language, domain, and patterns, determine which quality dimensions apply: DRY, SOLID principles (SRP/OCP/LSP/ISP/DIP), OOP idioms, cohesion/coupling, GRASP, Law of Demeter, CQRS invariants, etc. Your list is NOT fixed — derive from what the code actually does.
> 2. **One focused pass per dimension** — Dedicate single-focus attention to EACH dimension in sequence. Do NOT mix concerns across passes.
> 3. **Threshold: 3+ similar patterns = MANDATORY extraction** — Not optional suggestion. Flag as mandatory structural fix requiring action.
> 4. **2+ violations of same kind = structural finding** — Report as "pattern problem" needing architectural resolution, not a list of individual instances.

<!-- /SYNC:design-patterns-quality -->
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

Choose sub-agent type based on the category of changes being reviewed:

| Category                                             | Sub-agent type          | Rationale                                    |
| ---------------------------------------------------- | ----------------------- | -------------------------------------------- |
| Source code (logic, handlers, services)              | `code-reviewer`         | Purpose-built for code quality analysis      |
| Security-sensitive files (auth, crypto, permissions) | `security-auditor`      | Threat modeling, attack surface analysis     |
| Performance-critical files (queries, caching, batch) | `performance-optimizer` | Bottleneck identification, baseline analysis |
| Plans, docs, specs, markdown                         | `general-purpose`       | Plan/artifact review                         |

For large changesets with mixed concerns, spawn multiple sub-agents (one per concern type) in parallel.

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
6. Language-Idiomatic Traps: Apply your knowledge of idiomatic pitfalls for the languages/runtimes present in the changed files. Do NOT enumerate a fixed list — derive from the actual tech stack.
Classify: CRITICAL (crash/corrupt) → FAIL | HIGH (incorrect behavior) → FAIL | MEDIUM (edge case) → WARN | LOW (defensive) → INFO.

### Design Patterns Quality
Priority checks for every code change:
1. DRY via OOP: Identify same-purpose classes (same naming pattern, same lifecycle, same data shape). 3+ similar patterns → extract to shared abstraction. Apply your knowledge of the project's language/framework to determine the idiomatic base class / mixin / trait / protocol pattern.
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

### Test Coverage Verification
Map changed code to test coverage.
1. Identify the project's test spec format and location — search for test files, spec docs, or test catalogs near the changed files.
2. Every changed code path MUST map to a corresponding test (or flag as "needs test").
3. New functions/endpoints/handlers → flag for test creation.
4. Verify test references point to actual code (file:line, not stale).
5. If no tests exist → log gap and recommend creating tests.
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
Search the repository for:
- Project coding standards or review rules docs (search: "code-review-rules", "coding-standards", "style-guide", "contributing")
- Architecture documentation relevant to the changed files (search: "patterns-reference", "architecture", "adr")
- If none found, rely on your knowledge of the project's tech stack inferred from file extensions and directory structure.

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

> **Critical Purpose:** Ensure quality — no flaws, bugs, missing updates, stale content. Verify code AND documentation.

> **External Memory:** Complex work → write findings incrementally to `plans/reports/` — prevents context loss, serves as deliverable.

> **Evidence Gate:** MANDATORY MUST ATTENTION — every claim, finding, recommendation requires `file:line` proof + confidence % (>80% act, <80% verify first).

<!-- SYNC:rationalization-prevention -->

> **Rationalization Prevention** — AI skips steps via these evasions. Recognize and reject:
>
> | Evasion                      | Rebuttal                                                      |
> | ---------------------------- | ------------------------------------------------------------- |
> | "Too simple for a plan"      | Simple + wrong assumptions = wasted time. Plan anyway.        |
> | "I'll test after"            | RED before GREEN. Write/verify test first.                    |
> | "Already searched"           | Show grep evidence with `file:line`. No proof = no search.    |
> | "Just do it"                 | Still need TaskCreate. Skip depth, never skip tracking.       |
> | "Just a small fix"           | Small fix in wrong location cascades. Verify file:line first. |
> | "Code is self-explanatory"   | Future readers need evidence trail. Document anyway.          |
> | "Combine steps to save time" | Combined steps dilute focus. Each step has distinct purpose.  |

<!-- /SYNC:rationalization-prevention -->
<!-- SYNC:logic-and-intention-review -->

> **Logic & Intention Review** — Verify WHAT code does matches WHY it was changed.
>
> 1. **Change Intention Check:** Every changed file MUST ATTENTION serve the stated purpose. Flag unrelated changes as scope creep.
> 2. **Happy Path Trace:** Walk through one complete success scenario through changed code
> 3. **Error Path Trace:** Walk through one failure/edge case scenario through changed code
> 4. **Acceptance Mapping:** If plan context available, map every acceptance criterion to a code change
>
> **NEVER mark review PASS without completing both traces (happy + error path).**

<!-- /SYNC:logic-and-intention-review -->
<!-- SYNC:bug-detection -->

> **Bug Detection** — MUST ATTENTION check categories 1-4 for EVERY review. Never skip.
>
> 1. **Null Safety:** Can params/returns be null? Are they guarded? Optional chaining gaps? `.find()` returns checked?
> 2. **Boundary Conditions:** Off-by-one (`<` vs `<=`)? Empty collections handled? Zero/negative values? Max limits?
> 3. **Error Handling:** Try-catch scope correct? Silent swallowed exceptions? Error types specific? Cleanup in finally?
> 4. **Resource Management:** Connections/streams closed? Subscriptions unsubscribed on destroy? Timers cleared? Memory bounded?
> 5. **Concurrency (if async):** Missing `await`? Race conditions on shared state? Stale closures? Retry storms?
> 6. **Language-Idiomatic Traps:** Apply your knowledge of idiomatic pitfalls for the languages/runtimes present in the changed files. Do NOT enumerate a fixed list — derive from the actual tech stack.
>
> **Classify:** CRITICAL (crash/corrupt) → FAIL | HIGH (incorrect behavior) → FAIL | MEDIUM (edge case) → WARN | LOW (defensive) → INFO

<!-- /SYNC:bug-detection -->
<!-- SYNC:test-spec-verification -->

> **Test Coverage Verification** — Map changed code to test coverage.
>
> 1. **Find the project's test format** — search for test files, spec docs, or test catalogs near the changed files. Note the naming convention and location pattern.
> 2. **Map changed behavior to tests** — every changed code path MUST ATTENTION map to a test (or flag as "needs test").
> 3. **New functions/endpoints/handlers** → flag for test creation.
> 4. **Verify test references point to actual code** (`file:line`, not stale).
> 5. **Coverage by concern type:** Security-sensitive changes → auth/permission tests exist? Data-mutating changes → state assertion tests exist?
> 6. **If no tests exist** → log gap and recommend creating tests.
>
> **NEVER skip test mapping.** Untested code paths are the #1 source of production bugs.

<!-- /SYNC:test-spec-verification -->

<!-- SYNC:fix-layer-accountability -->

> **Fix-Layer Accountability** — NEVER fix at the crash site. Trace the full flow, fix at the owning layer.
>
> AI default behavior: see error at Place A → fix Place A. This is WRONG. The crash site is a SYMPTOM, not the cause.
>
> **MANDATORY before ANY fix:**
>
> 1. **Trace full data flow** — Map the complete path from data origin to crash site across ALL layers (storage → backend → API → frontend → UI). Identify where the bad state ENTERS, not where it CRASHES.
> 2. **Identify the invariant owner** — Which layer's contract guarantees this value is valid? That layer is responsible. Fix at the LOWEST layer that owns the invariant — not the highest layer that consumes it.
> 3. **One fix, maximum protection** — Ask: "If I fix here, does it protect ALL downstream consumers with ONE change?" If fix requires touching 3+ files with defensive checks, you are at the wrong layer — go lower.
> 4. **Verify no bypass paths** — Confirm all data flows through the fix point. Check for: direct construction skipping factories, clone/spread without re-validation, raw data not wrapped in domain models, mutations outside the model layer.
>
> **BLOCKED until:** `- [ ]` Full data flow traced (origin → crash) `- [ ]` Invariant owner identified with `file:line` evidence `- [ ]` All access sites audited (grep count) `- [ ]` Fix layer justified (lowest layer that protects most consumers)
>
> **Anti-patterns (REJECT these):**
>
> - "Fix it where it crashes" — Crash site ≠ cause site. Trace upstream.
> - "Add defensive checks at every consumer" — Scattered defense = wrong layer. One authoritative fix > many scattered guards.
> - "Both fix is safer" — Pick ONE authoritative layer. Redundant checks across layers send mixed signals about who owns the invariant.

<!-- /SYNC:fix-layer-accountability -->

> **OOP & DRY:** MANDATORY MUST ATTENTION — flag patterns extractable to base class/generic/helper. Same-suffix/lifecycle/responsibility classes MUST ATTENTION share common base. Apply idiomatic abstraction (base class, mixin, trait, protocol) for project's language. Verify linting/analyzer configured.

## Quick Summary

**Goal:** Ensure technical correctness: receiving feedback with verification (not performative agreement), requesting systematic reviews via code-reviewer subagent, enforcing verification gates before completion claims.

> **MANDATORY MUST ATTENTION** Before reviewing, search for project-specific reference docs:
>
> - **Coding standards** — search: `code-review-rules`, `coding-standards`, `style-guide`, `contributing`
> - **Architecture** — search: `patterns-reference`, `architecture`, `adr`
> - **Test conventions** — search: `integration-test-reference`, `test-guide`, `test-conventions`
> - **Design system** — search: `design-system`, `design-tokens`, `component-library`
>
> Read found docs before reviewing. None found → rely on tech stack knowledge from file extensions/directory structure.

**Workflow:**

1. **Create Review Report** — Init `plans/reports/code-review-{date}-{slug}.md`
2. **Phase 0: Detect** — Classify files by language + directory semantics + change nature → route sub-agents
3. **Phase 1: File-by-File** — Review each file, update report (naming, typing, magic numbers, responsibility)
4. **Phase 2: Holistic** — Re-read accumulated report, assess overall approach, architecture, duplication
5. **Phase 3: Final Result** — Update report with overall assessment, critical issues, recommendations
6. **Round 2: Fresh Sub-Agent** — Mandatory fresh code-reviewer for cross-cutting concerns, convention drift, edge cases

**Key Rules:**

- **Report-Driven**: Build report incrementally; re-read for big picture
- **Detect First**: Classify changeset type before any review — route auth/perf files to specialized sub-agents
- **No Performative Agreement**: Technical evaluation only ("You're right!" banned)
- **Verification Gates**: Evidence required before completion claims
- **NEVER declare PASS after Round 1 alone** — always spawn fresh sub-agent for Round 2

# Code Review

Three practices: receiving feedback with technical rigor, requesting systematic reviews via code-reviewer subagent, enforcing verification gates before completion claims.

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

<!-- SYNC:category-review-thinking -->

> **Category Review Thinking** — For each category of changed files, think from first principles. Do NOT use a fixed checklist — derive concerns based on the category's domain.
>
> **Step 1: Understand the category's role**
> What is this category responsible for? What are its invariants? Who are its consumers (callers, dependents, downstream systems)?
>
> **Step 2: Read project conventions for this category**
> Grep 3+ existing similar files in this category. What patterns do they follow? What base classes/interfaces/abstractions do they use?
>
> **Step 3: Derive concerns from first principles**
> Given the category's role and invariants, what could go wrong? Start from universal concerns, then expand with category-specific knowledge:
>
> - Correctness: Does the change do what it claims? Are contracts maintained?
> - Contracts: Does the change preserve consumer-facing behavior?
> - Security: What trust assumptions does this category make? Are they still valid?
> - Performance: Does the change introduce O(n²), unbounded queries, or unnecessary I/O?
> - Maintainability: Does the change follow existing patterns? Does it introduce hidden coupling?
> - Tests: Is the changed behavior observable and testable?
> - Documentation: Does the change invalidate any existing docs or specs?
>
> These are starting points — your domain knowledge of the tech stack should expand this list. Do NOT limit yourself to what's listed above.
>
> **Step 4: Create sub-tasks and execute with file:line evidence**
> Convert derived concerns into concrete review tasks. Each task must produce `file:line` evidence. No findings without proof.
>
> **Examples of categories** (illustrative — NOT exhaustive):
>
> - Logic/domain files (business rules, handlers, services)
> - Data/schema files (migrations, models, ORM definitions)
> - API/contract files (controllers, routes, serializers, proto definitions)
> - Configuration/environment files (env vars, feature flags, secrets)
> - Infrastructure files (Dockerfiles, CI pipelines, manifests)
> - UI/style files (components, templates, stylesheets)
> - Test files (unit, integration, e2e)
> - Documentation files (markdown, specs, ADRs)
> - Security artifacts (auth middleware, permission definitions, crypto)
> - Tooling/build files (build configs, linting rules, dependency manifests)

<!-- /SYNC:category-review-thinking -->

<!-- SYNC:subagent-return-contract -->

> **Sub-Agent Return Contract** — When this skill spawns a sub-agent, the sub-agent MUST return ONLY this structure. Main agent reads only this summary — NEVER requests full sub-agent output inline.
>
> ```markdown
> ## Sub-Agent Result: [skill-name]
>
> Status: ✅ PASS | ⚠️ PARTIAL | ❌ FAIL
> Confidence: [0-100]%
>
> ### Findings (Critical/High only — max 10 bullets)
>
> - [severity] [file:line] [finding]
>
> ### Actions Taken
>
> - [file changed] [what changed]
>
> ### Blockers (if any)
>
> - [blocker description]
>
> Full report: plans/reports/[skill-name]-[date]-[slug].md
> ```
>
> Main agent reads `Full report` file ONLY when: (a) resolving a specific blocker, or (b) building a fix plan.
> Sub-agent writes full report incrementally (per SYNC:incremental-persistence) — not held in memory.

<!-- /SYNC:subagent-return-contract -->

> Run `python .claude/scripts/code_graph query tests_for <function> --json` on changed functions to flag coverage gaps.

## Review Mindset (NON-NEGOTIABLE)

**Skeptical. Every claim needs traced proof `file:line`. Confidence >80% to act.**

- NEVER accept code correctness at face value — trace call paths
- NEVER include finding without `file:line` evidence (grep results, read confirmations)
- ALWAYS question: "Does this actually work?" → trace it. "Is this all?" → grep cross-service
- ALWAYS verify side effects: check consumers + dependents before approving

## Core Principles (ENFORCE ALL)

| Principle          | Rule                                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| **YAGNI**          | Flag code solving hypothetical problems (unused params, speculative interfaces)                             |
| **KISS**           | Flag unnecessary complexity. "Is there a simpler way?"                                                      |
| **DRY**            | Grep for similar/duplicate code. 3+ similar patterns → flag for extraction                                  |
| **Clean Code**     | Readable > clever. Names reveal intent. Functions do ONE thing. Nesting <=3. Methods <30 lines              |
| **Convention**     | MUST ATTENTION grep 3+ existing examples before flagging violations. Codebase convention wins over textbook |
| **No Bugs**        | Trace logic paths. Verify edge cases (null, empty, boundary). Check error handling                          |
| **Proof Required** | Every claim backed by `file:line` evidence. Speculation is forbidden                                        |
| **Doc Staleness**  | Cross-ref changed files against related docs. Flag stale/missing updates                                    |

**Technical correctness over social comfort.** Verify before implementing. Evidence before claims.

## Graph-Enhanced Review (RECOMMENDED if graph.db exists)

1. `python .claude/scripts/code_graph graph-blast-radius --json` — prioritize files by impact (most dependents first)
2. `python .claude/scripts/code_graph query tests_for <function_name> --json` — flag untested changed functions
3. `python .claude/scripts/code_graph trace <file> --direction downstream --json` — downstream impact (events, bus, cross-service)
4. `python .claude/scripts/code_graph trace <file> --direction both --json` — full flow context for controllers/commands/handlers
5. Wide blast radius (>20 impacted nodes) = high-risk. Flag in report.

## Review Approach (Report-Driven Two-Phase — CRITICAL)

**MANDATORY FIRST: Create Todo Tasks**

| Task                                                    | Status      |
| ------------------------------------------------------- | ----------- |
| `[Review] Create report file`                           | in_progress |
| `[Review Phase 0] Detect categories + route sub-agents` | pending     |
| `[Review Phase 1] File-by-file review + update report`  | pending     |
| `[Review Phase 2] Holistic assessment`                  | pending     |
| `[Review Phase 3] Final findings`                       | pending     |
| `[Review Round 2] Fresh sub-agent re-review`            | pending     |
| `[Review Final] Consolidate all rounds`                 | pending     |

**Step 0: Create Report File**

Create `plans/reports/code-review-{date}-{slug}.md` with Scope, Files to Review sections.

**Phase 0: Detect Change Type**

Before any review — classify the changeset and route sub-agents:

| Signal in changed files                  | Route to                                                |
| ---------------------------------------- | ------------------------------------------------------- |
| Auth/permission/token/encryption files   | `security-auditor`                                      |
| Query files, caching, batch processing   | `performance-optimizer`                                 |
| Source code (logic, handlers, services)  | `code-reviewer`                                         |
| Docs, plans, specs, markdown             | `general-purpose`                                       |
| Mixed changeset with security/perf files | Spawn specialized sub-agent first, then `code-reviewer` |

**Phase 0.7: Derive Review Categories**

Group changed files by: file language (extension), directory semantics (path), change nature (new entity, schema, config, UI, test).

For each category: name it, create sub-task, derive concerns using `SYNC:category-review-thinking` (first principles — NOT a fixed checklist).

> Category list = Phase 1 work breakdown. Each category → own section in report.

**Phase 1: File-by-File Review (Build Report)**

For EACH file, immediately update report:

- File path, Change Summary, Purpose, Issues Found
- **Convention check:** Grep 3+ similar patterns — does new code follow existing convention?
- **Correctness check:** Trace logic — null, empty, boundary, error cases handled?
- **DRY check:** Grep for similar/duplicate code — does this logic exist elsewhere?

**Phase 2: Holistic Review (Re-read Report)**

After all files reviewed, re-read accumulated report:

- **Technical Solution**: Overall approach coherent as unified plan?
- **Responsibility**: Logic in LOWEST layer? Business logic not in controllers?
- **Data ownership**: Constants/config in model/entity, not controller/component?
- **Duplication**: Grep to verify — duplicated logic across changes?
- **Architecture**: Clean Architecture? Service boundaries respected?
- **Plan Compliance**: If active plan → check `## Plan Context`: impl matches requirements, TCs have code evidence (not "TBD"), no requirement unaddressed
- **Design Patterns**: Pattern opportunities (switch→Strategy)? Anti-patterns (God Object, Copy-Paste, Circular Dep)? DRY via base classes?

**MUST ATTENTION CHECK — Clean Code:** YAGNI (unused params, speculative interfaces)? KISS (simpler exists)? Methods >30 lines or nesting >3?

**MUST ATTENTION CHECK — Correctness:** Null/empty/boundary handled? Error paths caught? Async race conditions? Trace happy + error paths.

**Documentation Staleness Check:**

For each changed file — grep file name/module across `docs/` and AI tooling dirs. Changed behavior → flag stale doc (specific section + what changed). **Do NOT auto-fix — flag only.**

Common staleness patterns: count/limit changed → docs embedding that number | API/contract changed → API usage docs | hook/skill added/removed → catalogs/README | schema changed → entity reference docs.

**Phase 3: Final Review Result**

Update report: Overall Assessment, Critical Issues, High Priority, Architecture Recommendations, Documentation Staleness, Positive Observations.

## Round 2+: Fresh Sub-Agent Re-Review (MANDATORY)

After Phase 3 (Round 1), spawn fresh `code-reviewer` sub-agent for Round 2 using canonical template from `SYNC:review-protocol-injection`:

1. Copy Agent call shape from `SYNC:review-protocol-injection` verbatim
2. Embed full verbatim body of all 9 SYNC blocks: `SYNC:evidence-based-reasoning`, `SYNC:bug-detection`, `SYNC:design-patterns-quality`, `SYNC:logic-and-intention-review`, `SYNC:test-spec-verification`, `SYNC:fix-layer-accountability`, `SYNC:rationalization-prevention`, `SYNC:graph-assisted-investigation`, `SYNC:understand-code-first`
3. Task: `"Review ALL uncommitted changes. Focus: cross-cutting concerns, interaction bugs, convention drift, missing pieces, subtle edge cases, logic errors, test spec gaps."`
4. Target Files: `"run git diff to see all uncommitted changes"`
5. Report: `plans/reports/code-review-round{N}-{date}.md`

After sub-agent returns:

1. **Read** report from `plans/reports/code-review-round{N}-{date}.md`
2. **Integrate** findings as `## Round {N} Findings (Fresh Sub-Agent)` — DO NOT filter or override
3. **If FAIL:** fix issues → spawn NEW Round N+1 fresh sub-agent (never reuse)
4. **Max 3 fresh rounds** — escalate via `AskUserQuestion` if still failing after 3 rounds

## Clean Code Rules (MUST ATTENTION CHECK)

| #   | Rule                      | Details                                                                                                                                 |
| --- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **No Magic Values**       | All literals → named constants                                                                                                          |
| 2   | **Type Annotations**      | Explicit parameter and return types on all functions                                                                                    |
| 3   | **Single Responsibility** | One concern per method/class. Event handlers/consumers: one handler = one concern. NEVER bundle — platform swallows exceptions silently |
| 4   | **DRY**                   | No duplication; extract shared logic                                                                                                    |
| 5   | **Naming**                | Specific (`employeeRecords` not `data`), Verb+Noun methods, is/has/can/should booleans, no abbreviations                                |
| 6   | **Performance**           | No O(n²) (use dictionary). Project in query (not load-all). ALWAYS paginate. Batch-by-IDs (not N+1)                                     |
| 7   | **Entity Indexes**        | Collections: index management methods. EF Core: composite indexes. Expression fields match index order. Text search → text indexes      |

## Data Lifecycle Rules (MUST ATTENTION CHECK)

**Decision test:** _"Delete the DB and start fresh — does this data still need to exist?"_ Yes → **Seeder/fixture**. No → **Migration**.

| Type                 | Contains                                                                                | NEVER contains                                   |
| -------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **Seeder / Fixture** | Default records, system config, reference data (idempotent — safe to run every startup) | Schema changes                                   |
| **Migration**        | Schema changes, column adds/removes, data transforms, index changes                     | Default records, permission seeds, system config |

Apply project's language/framework conventions. Principle universal — implementation project-specific.

## Legacy Pattern Compliance

When reviewing files with legacy and modern patterns:

1. **Detect legacy signals** — search `project-config.json`, `package.json`, or equivalent for `"legacy"`, version flags, feature annotations
2. **Read what "legacy" means** — grep 3+ legacy files to understand pattern constraints vs. modern files
3. **Derive compliance rules** — what lifecycle/memory management differences exist between legacy/modern for this tech stack?
4. **Apply tech stack knowledge** to flag anti-patterns

NEVER assume any specific framework's lifecycle. Derive from codebase evidence.

## When to Use This Skill

| Practice               | Triggers                                                                                   | MUST ATTENTION READ                            |
| ---------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| **Receiving Feedback** | Review comments received, feedback unclear/questionable, conflicts with existing decisions | `references/code-review-reception.md`          |
| **Requesting Review**  | After each subagent task, major feature done, before merge, after complex bug fix          | `references/requesting-code-review.md`         |
| **Verification Gates** | Before any completion claim, commit, push, or PR. ANY success/satisfaction statement       | `references/verification-before-completion.md` |

## Quick Decision Tree

```
SITUATION?
│
├─ Received feedback
│  ├─ Unclear items? → STOP, ask for clarification first
│  ├─ From human partner? → Understand, then implement
│  └─ From external reviewer? → Verify technically before implementing
│
├─ Completed work
│  ├─ Major feature/task? → Request code-reviewer subagent review
│  └─ Before merge? → Request code-reviewer subagent review
│
└─ About to claim status
   ├─ Have fresh verification? → State claim WITH evidence
   └─ No fresh verification? → RUN verification command first
```

## Receiving Feedback Protocol

**Pattern:** READ → UNDERSTAND → VERIFY → EVALUATE → RESPOND → IMPLEMENT

- NEVER use performative agreement ("You're right!", "Great point!", "Thanks for...")
- NEVER implement before verification
- MUST ATTENTION restate requirement, ask questions, or push back with technical reasoning
- MUST ATTENTION ask for clarification on ALL unclear items BEFORE starting
- MUST ATTENTION grep for usage before implementing suggested "proper" features (YAGNI check)

**Source handling:** Human partner → implement after understanding. External reviewer → verify technically, push back if wrong.

**Full protocol:** `references/code-review-reception.md`

## Requesting Review Protocol

1. Get git SHAs: `BASE_SHA=$(git rev-parse HEAD~1)` and `HEAD_SHA=$(git rev-parse HEAD)`
2. Dispatch code-reviewer subagent with: WHAT_WAS_IMPLEMENTED, PLAN_OR_REQUIREMENTS, BASE_SHA, HEAD_SHA, DESCRIPTION
3. Act on feedback: Critical → fix immediately. Important → fix before proceeding. Minor → note for later.

**Full protocol:** `references/requesting-code-review.md`

## Verification Gates Protocol

**Iron Law: NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE**

**Gate:** IDENTIFY command → RUN it → READ output → VERIFY it confirms claim → THEN claim. Skip any step = lying.

| Claim            | Required Evidence               |
| ---------------- | ------------------------------- |
| Tests pass       | Test output shows 0 failures    |
| Build succeeds   | Build command exit 0            |
| Bug fixed        | Original symptom test passes    |
| Requirements met | Line-by-line checklist verified |

**Red Flags — STOP:** "should"/"probably"/"seems to", satisfaction before verification, committing without verification, trusting agent reports.

**Full protocol:** `references/verification-before-completion.md`

## Related

- `code-simplifier`
- `debug-investigate`
- `refactoring`

---

## Systematic Review Protocol (10+ changed files)

For large changesets: categorize files by concern → fire parallel `code-reviewer` sub-agents per category → synchronize findings → holistic assessment. See `review-changes/SKILL.md` § "Systematic Review Protocol" for full 4-step protocol.

---

## Workflow Recommendation

> **MANDATORY MUST ATTENTION — NO EXCEPTIONS:** If NOT already in a workflow, use `AskUserQuestion` to ask user:
>
> 1. **Activate `quality-audit` workflow** (Recommended) — code-review → plan → code → review-changes → test
> 2. **Execute `/code-review` directly** — run standalone

---

## Architecture Boundary Check

For each changed file, verify no forbidden layer imports:

1. **Read rules** from `docs/project-config.json` → `architectureRules.layerBoundaries`
2. **Determine layer** — match file path against each rule's `paths` glob patterns
3. **Scan imports** — grep for `using` (C#) or `import` (TS) statements
4. **Check violations** — import path contains forbidden layer name → violation
5. **Exclude framework** — skip files matching `architectureRules.excludePatterns`
6. **BLOCK on violation** — `"BLOCKED: {layer} layer file {filePath} imports from {forbiddenLayer} ({importStatement})"`

If `architectureRules` absent in project-config.json → skip silently.

---

## Next Steps

**MANDATORY MUST ATTENTION — NO EXCEPTIONS** after completing, use `AskUserQuestion`:

- **"/fix (Recommended)"** — review found issues needing fixes
- **"/watzup"** — review clean, wrap up session
- **"Skip, continue manually"** — user decides

## AI Agent Integrity Gate (NON-NEGOTIABLE)

**Completion ≠ Correctness.** Before reporting ANY work done:

1. **Grep every removed name.** Extraction/rename/delete → grep confirms 0 dangling refs across ALL file types.
2. **Ask WHY before changing.** Existing values intentional until proven otherwise.
3. **Verify ALL outputs.** One build passing ≠ all builds passing.
4. **Evaluate pattern fit.** Copying nearby code? Verify preconditions match — scope, lifetime, base class, constraints.
5. **New artifact = wired artifact.** Created something? Prove it's registered, imported, reachable by all consumers.

---

## Closing Reminders

- **MANDATORY MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY MUST ATTENTION** validate decisions with user via `AskUserQuestion` — never auto-decide
- **MANDATORY MUST ATTENTION** add final review task to verify work quality
- **MANDATORY MUST ATTENTION** search for project-specific reference docs BEFORE reviewing (coding standards, architecture, test conventions)
- **MANDATORY MUST ATTENTION** Phase 0: detect change type FIRST — route auth/perf files to specialized sub-agents before general review
- **MANDATORY MUST ATTENTION** run `/why-review` after completing this review to validate design rationale, alternatives considered, and risk assessment
      <!-- SYNC:evidence-based-reasoning:reminder -->
- **MANDATORY MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.
      <!-- /SYNC:evidence-based-reasoning:reminder -->
      <!-- SYNC:design-patterns-quality:reminder -->
- **MANDATORY MUST ATTENTION** check DRY via OOP (same-suffix → base class), right responsibility (lowest layer), SOLID. Grep for dangling refs after changes.
      <!-- /SYNC:design-patterns-quality:reminder -->
      <!-- SYNC:double-round-trip-review:reminder -->
- **MANDATORY MUST ATTENTION** execute TWO review rounds. Round 2 delegates to fresh code-reviewer sub-agent (zero prior context) — never skip or combine with Round 1.
      <!-- /SYNC:double-round-trip-review:reminder -->
      <!-- SYNC:rationalization-prevention:reminder -->
- **MANDATORY MUST ATTENTION** follow ALL steps regardless of perceived simplicity. "Too simple to plan" is evasion, not reason.
      <!-- /SYNC:rationalization-prevention:reminder -->
      <!-- SYNC:graph-assisted-investigation:reminder -->
- **MANDATORY MUST ATTENTION** run at least ONE graph command on key files when graph.db exists. Pattern: grep → graph trace → grep verify.
      <!-- /SYNC:graph-assisted-investigation:reminder -->
      <!-- SYNC:logic-and-intention-review:reminder -->
- **MANDATORY MUST ATTENTION** verify every changed file serves stated purpose. Trace happy + error paths. Flag scope creep.
      <!-- /SYNC:logic-and-intention-review:reminder -->
      <!-- SYNC:bug-detection:reminder -->
- **MANDATORY MUST ATTENTION** check null safety, boundary conditions, error handling, resource management for every review.
      <!-- /SYNC:bug-detection:reminder -->
      <!-- SYNC:test-spec-verification:reminder -->
- **MANDATORY MUST ATTENTION** map every changed function/endpoint to a test. Search for project's test spec format near changed files. Flag coverage gaps, recommend test creation.
    <!-- /SYNC:test-spec-verification:reminder -->
    <!-- SYNC:translation-sync-check:reminder -->
- **MANDATORY MUST ATTENTION** for multilingual frontend/UI text changes, verify translation updates are present (or explicitly accepted by user as risk) before PASS.
    <!-- /SYNC:translation-sync-check:reminder -->
    <!-- SYNC:fix-layer-accountability:reminder -->
- **IMPORTANT MUST ATTENTION** trace full data flow and fix at owning layer, not crash site. Audit all access sites before adding `?.`.
      <!-- /SYNC:fix-layer-accountability:reminder -->
      <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
    <!-- /SYNC:critical-thinking-mindset:reminder -->
    <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
    <!-- /SYNC:ai-mistake-prevention:reminder -->
    <!-- SYNC:category-review-thinking:reminder -->
- **MUST ATTENTION** Phase 0.7: derive review categories from file language + directory semantics + change nature. Create sub-tasks per category. Derive concerns from first principles — do not use a fixed checklist.
    <!-- /SYNC:category-review-thinking:reminder -->

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

- **IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
- **IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
- **IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
- **IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->
