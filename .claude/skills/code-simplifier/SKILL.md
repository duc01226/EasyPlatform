---
name: code-simplifier
version: 2.3.0
description: '[Code Quality] Use when a workflow step or the user asks for code simplification for clarity and maintainability without changing behavior.'
context-budget: critical
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval. Inside a workflow run, `/start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Lower the cost of the next change — cut coupling, hidden state, duplicated knowledge, unclear intent — by simplifying and refining code for clarity, consistency, and maintainability without altering any observable behavior. — why: every simplification serves future change cost, not aesthetics.

**Summary:** (read-this-if-nothing-else digest — purpose + every main step)

- **Purpose — skeptical-first MUTATOR, not a suggester:** grep all usages + trace consumers (grep/read; an optional graph downstream trace may hint at more) and cite `file:line` BEFORE touching anything; apply a simplification ONLY when certain it preserves behavior, never when unsure. — why: an unverified "safe" rewrite silently breaks a downstream consumer.
- **Main steps, run in order:** (1) **Phase 0 Detect** target + scope from project config/source; (2) **Identify Targets** — recent git changes or named files, HARD-SKIP generated/migration/vendor; (3) **Analyze** via the 5 Simplification Dimensions, marking inapplicable ones N/A with a reason; (4) **Apply** one refactoring type at a time (KISS/DRY/YAGNI, behavior-preserving); (5) **Verify** related tests after EACH change; (6) **Self-Recursive Loop** (analyze→simplify→verify) until the current round's exit bar is clear (round 1: zero open findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred) or a no-progress/unsafe/owner-decision stop hits — do NOT spawn a fresh-context reviewer for your own findings; (7) **Self-Review Gate**.
- **The 5 Simplification Dimensions (step 3):** readability · DRY/abstraction (compare real repetition; apply YAGNI) · responsibility based on the project's documented architecture and evidenced ownership · complexity reduction · persistence/query bounds on applicable changed paths only (otherwise N/A) — every technique answers ONE test: does this make the next change cheaper?
- **Self-Review Gate (step 7) — this skill owns review of its own output:** when it changed any file, self-invoke `/code-quality-review` scoped to ONLY those changed files (recursion-safe leaf — NEVER `/changes-review`); skip + log the reason when nothing changed. Only an explicit `--defer=review` from a caller that runs a FULL review of the settled state afterwards skips it (see `.claude/skills/workflow-review-changes/references/caller-mode.md`); no flag means the gate runs. — why: the simplifier rewrites code after the main review batch, so its output ships unreviewed without this gate.
- **`--report-only`:** read-only mode for a caller that owns every fix (e.g. a review skill's simplification dimension or a workflow review barrier) — steps 1–3 only, each finding with `file:line` + proposed change + behavior-preservation note, no edit of any file, no nested sub-agent, no user question, only the report written; see [Report-Only Mode](#report-only-mode---report-only).
- **Read FIRST:** `code-review-rules.md` (anti-patterns/checklists) then `project-structure-reference.md`, both under the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) — before any modification.

> **MANDATORY IMPORTANT MUST ATTENTION** Plan task to READ:
>
> - `code-review-rules.md` under the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) — anti-patterns, review checklists **(READ FIRST)**
> - `project-structure-reference.md` — project patterns/structure
>
> If not found, search for: project documentation, coding standards, architecture docs.

**Workflow:**

1. **Phase 0: Detect** — Classify target types present in the project (source, UI/client, tests, configuration, or other) and scope
2. **Identify Targets** — Recent git changes or specified files (skip generated/migration/vendor)
3. **Analyze** — Apply simplification dimensions (see below)
4. **Apply** — One refactoring type at a time following KISS/DRY/YAGNI
5. **Verify** — Run related tests, confirm no behavior changes; when a caller runs the tests once, last (`SYNC:verify-last-order`, e.g. a `--tests=defer` review fix loop), verify statically instead — re-read the diff against the covering tests and run none, the caller's single verify proves them
6. **Self-Recursive Check** — Re-run this skill's simplification analysis until the current round's exit bar is clear: Round 1 requires zero validated findings at any severity, with no-edit LOW deferral allowed; every applied fix requires a fresh full review (`SYNC:review-policy`). From Round 2 onward only validated CRITICAL/HIGH/MEDIUM findings reopen the loop, while LOW findings are recorded as deferred and do not justify another cycle. Failed binary gates always block.
7. **Self-Review Gate (MANDATORY when code changed)** — If this skill modified any files, self-invoke `/code-quality-review` scoped to ONLY those changed files; skip + log if nothing changed, or when the caller passed `--defer=review` (record `Self-review deferred to caller post-fix FULL review`)

**Key Rules:**

- **AI surface?** Only if the code holds a model call, prompt, agent, tool/MCP, retrieval or eval (see `node .claude/scripts/ai-signal-scan.cjs`): read `.claude/skills/shared/protocols/ai-engineering-gate.md`; never simplify away a timeout, retry bound, step or cost cap, output validation or approval gate; otherwise skip this line.
- Preserve all existing functionality — no behavior changes
- Apply conventions supported by `docs/project-config.json`, its referenced project docs, and relevant existing code; treat an explicit N/A or absent stack as a signal to verify the target, not as a missing pattern to invent
- Easy to Change is the primary simplification goal for source files; DRY, SOLID, abstraction, and patterns are valid only when they lower future edit sites or cognitive load
- Tests pass after every change
- Apply simplification only when certain it preserves behavior — NEVER apply when unsure

## Contents

- [Quick Summary](#quick-summary)
- [Report-Only Mode (`--report-only`)](#report-only-mode---report-only)
- [Phase 0: Artifact Detection](#phase-0-artifact-detection)
- [First Principle — Easy to Change · Easy to Scale · Easy to Maintain](#first-principle--easy-to-change--easy-to-scale--easy-to-maintain)
- [Simplification Mindset](#simplification-mindset)
- [Simplification Dimensions](#simplification-dimensions)
- [Project Patterns](#project-patterns)
- [Graph Intelligence (optional advice)](#graph-intelligence-optional-advice)
- [Execution](#execution)
- [Constraints](#constraints)
- [Self-Recursive Verification (MANDATORY after simplifications)](#self-recursive-verification-mandatory-after-simplifications)
- [Self-Review Gate (MANDATORY when this skill changed code)](#self-review-gate-mandatory-when-this-skill-changed-code)
- [Next Steps](#next-steps)
- [AI Agent Integrity Gate (NON-NEGOTIABLE)](#ai-agent-integrity-gate-non-negotiable)
- [Self-Recursive Simplification Loop](#self-recursive-simplification-loop)
- [Prompt-Enhance Closing Anchors](#prompt-enhance-closing-anchors)
- [Closing Reminders](#closing-reminders)

## Report-Only Mode (`--report-only`)

> **Use when** a caller needs simplification opportunities as findings without edits — e.g. a review skill running its simplification dimension, a workflow parallel review barrier, or a review batch — and another step owns every fix. `--report-only` in `$ARGUMENTS` selects it; without the flag every step applies unchanged.
>
> **MANDATORY — when `--report-only` is passed, read `.claude/skills/workflow-review-changes/references/caller-mode.md` in full FIRST.** It holds the shared caller rules: a `--report-only` pass returns one report with no source edits, the caller fixes once and requests fresh passes, and a child never mutates source in parallel or runs a nested loop. The rules below are this skill's own.
>
> **Review lens in `workflow-review-changes`.** This mode can serve as the simplification lens inside the review barrier: report the findings, and the review's `fix --target=review` step applies the validated simplifications after findings validation.
>
> 1. **Run steps 1–3 only** (Phase 0 Detect → Identify Targets → Analyze). Apply, Verify, the Self-Recursive loop, and the Self-Review Gate do not run: edit NO file — source, test, config, or doc. The caller runs its own findings-validation gate and owns every fix and re-review. — why: a simplifier that edits inside a review barrier races the diff every sibling reviewer is reading.
> 2. **Every finding carries:** `file:line` · the simplification dimension · the proposed change (concrete before → after, or the exact edit described) · a behavior-preservation note (the usages and consumers traced — grep/read evidence, plus any graph hint — and why observable behavior stays unchanged) · severity per `SYNC:severity-rubric` · confidence. A proposal whose behavior preservation cannot be proven is reported as `behavior-change risk`, never as a safe simplification. — why: the fixer applies it later without this skill's trace, so the evidence must travel with the finding.
> 3. **No nested fan-out.** Skip the `Agent(subagent_type="code-simplifier", ...)` execution path; analyze sequentially in this context.
> 4. **Report file.** Write it to `tmp/reports/code-simplifier-{date}-{slug}.md`, appended per file.
>
> For this mode the declared step order ends at step 3; stopping there is the mode's contract, not a skipped step.

## Phase 0: Artifact Detection

**MUST ATTENTION** classify before simplifying — detection drives focus and optional escalation only:

| Artifact Type       | Detection                                                                 | Key Focus                                                                                                        |
| ------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Source              | Target paths and file types identified from project config or user scope  | Preserve behavior; apply only responsibilities and conventions evidenced for the relevant code                  |
| UI/client (if any)  | Affected UI paths identified from project config or source                 | Use configured UI, state, lifecycle, and styling conventions only when present; otherwise follow local evidence |
| Tests               | Test paths and runner identified by project config or source              | Preserve the assertions, async behavior, isolation, and runner conventions that apply to this project           |
| Generated/migration/vendor | Generated markers, configured paths, or vendor/migration directories       | **SKIP** generated, migration, and vendor code                                                                   |

File extensions and stack-specific names in prompts or examples are search clues, not requirements. Classify the actual target using the project's config, references, and source.

Optional escalation by artifact:

| Artifact             | Escalate only when                                      |
| -------------------- | ------------------------------------------------------- |
| Source code/diffs    | Broad review is requested after simplifier loop is clean |
| Security-sensitive   | Security-specific risk is present                      |
| Performance-critical | Performance behavior is part of the change             |
| Plans, docs, specs   | Artifact review is explicitly requested                |

## First Principle — Easy to Change · Easy to Scale · Easy to Maintain

> The full gate is `SYNC:core-engineering-principles` (protocol guide below; a hook delivers its text); its closing digest ends this file.

**Skill focus:** favor project-owned boundaries around external libraries (for example component/service input-output contracts) when they localize future library changes; reject pass-through wrappers that add ceremony without lowering change cost.

---

## Simplification Mindset

**Skeptical-first:** Verify before simplifying. Every change needs proof preserving behavior.

- NEVER assume code redundant — trace call paths and read implementations first
- Before removing/replacing: grep all usages confirming nothing depends on current form
- Before flagging convention violation: grep 3+ existing examples — codebase convention wins
- Every simplification requires `file:line` evidence of what was verified
- Apply simplification only when certain it preserves behavior; if unsure → DO NOT apply

## Simplification Dimensions

Dimension-based reasoning replaces fixed checklists. Each dimension has a `Think:` prompt forcing first-principles reasoning.

### Dimension 1: Readability

> **Think:** Would a new engineer understand this in 30 seconds? What forces multiple file traces?

- Schema visibility: functions computing data structures need output-shape comment
- Non-obvious pipelines: A→B→C transformations need brief pipeline explanation
- Self-documenting signatures: params explain role; remove unused params
- Magic values: replace unexplained numbers/strings with named constants
- Naming clarity: names reveal intent without reading implementation

### Dimension 2: DRY & Abstraction

> **Think:** Is the same responsibility repeated, and would a shared abstraction reduce future change cost without hiding intentional differences?

- Search by behavior and responsibility; names or type suffixes are clues for discovery, not proof that types share a base or contract
- Extract a shared function, module, or type only when repeated behavior and change reasons align and the abstraction reduces edit sites or cognitive load
- YAGNI gate: NEVER extract for hypothetical future use — 3+ similar occurrences prompt comparison, not automatic extraction

### Dimension 3: Right Responsibility

> **Think:** Which module or layer owns this invariant under the project's documented architecture and current call paths?

- Read the project structure and relevant pattern references, then trace callers to identify the owner supported by evidence
- When those docs are silent, follow a consistent existing code pattern; if no owner is evidenced, keep the change local and report the uncertainty
- Place transformations at the boundary documented or demonstrated by this project; do not create an assumed layer, entity, or DTO convention

### Dimension 4: Complexity Reduction

> **Think:** What is cognitive load? Can nesting/conditionals flatten?

- Inspect nesting and method size for obscured intent; use early returns or extraction when they lower cognitive load while preserving behavior. Line/depth counts are clues, never refactor mandates.
- Simplify complex conditions locally; choose a shared dispatch/pattern only when real variation and ownership justify its indirection.

### Dimension 5: Data Access and Storage (when applicable)

Apply this dimension only when project config/reference docs identify a persistence system or relevant target code proves it is used, and the changed path reads or writes that system. If no database/storage is configured or evidenced in source, or the changed code does not use its query/index model, mark this dimension `N/A — reason`; do not require paging or indexes for unrelated code.

> **Think:** Can this particular access path exceed its intended bound, and what evidence shows the configured or code-evidenced store needs a different access path?

1. **Result bounds:** For a changed list/search/report path over persistent data, check expected result size and the caller contract. When results can grow and the project supports it, use its documented paging/window/cursor convention; otherwise cite the evidence that bounds the result. Names such as `GetAll`, `ToList`, `Find`, or `Skip/Take` are search examples, not defects by themselves.
2. **Index fit:** Only for a database configured or evidenced in source and a changed query path that uses it (or a schema/index change supporting that query), inspect filters, ordering, joins, schema/index definitions, and query plans when available. Recommend an index only when evidence supports it and account for write/storage cost; do not demand indexes on every filter, foreign key, or sort field.
3. **Other storage models:** Follow the configured and code-evidenced access, query, and bound conventions for the storage in use. If persistent data is not in the changed path, record `N/A — reason`.

## Project Patterns

- Resolve affected paths through `docs/project-config.json` and its configured docs index; load only relevant backend/API, UI/client, test or other references, honoring custom paths and documented `N/A`.
- Missing/silent references: inspect at least three fitting local examples. If none exists, keep the change minimal and report the gap; never invent a framework convention.
- Names, extensions and examples do not establish applicability. Require config/reference + changed-code evidence for any layer, class, helper, state tool, styling method or storage API.
- Dimension 5 is `N/A — reason` unless config/source confirms a database and the changed path uses its query/index model. UI checks require an evidenced UI surface.
- Before paging/index recommendations, cite config/schema/source evidence and query/runtime behavior.

## Graph Intelligence (optional advice)

Optional: when grep and reading files alone may not reveal a high-risk blast radius (shared contract, many callers, cross-module/cross-service flow, public API), the code graph (`.code-graph/graph.db`) can add callers, dependents and impacted tests. Treat it as a hint, NOT proof: the graph can be stale or incomplete (it lags uncommitted edits and unindexed paths) — verify anything that matters by reading the files/grep. Skip it for low-risk or local changes.

Before simplifying, trace what depends on the target (grep/read; optionally the graph):

```
python .claude/scripts/code_graph trace <file> --direction downstream --json
```

Verify simplified code preserves the interface for every traced consumer. When the changed contract crosses a module, process, or service boundary, trace all consumers configured or found in source; message-bus consumers are one example only when the project uses that boundary.

Additional queries:

- Optional hint for callers: `python .claude/scripts/code_graph query callers_of <function> --json`
- Check dependents: `python .claude/scripts/code_graph query importers_of <module> --json`
- Batch analysis: `python .claude/scripts/code_graph batch-query file1 file2 --json`

## Execution

```
Agent(subagent_type="code-simplifier", prompt="Review and simplify [target files]")
```

**Example:**

```typescript
// Before
function getData() {
    const result = fetchData();
    if (result !== null && result !== undefined) {
        return result;
    } else {
        return null;
    }
}

// After
function getData() {
    return fetchData() ?? null;
}
```

## Constraints

- **Preserve functionality** — no behavior changes
- **Tests passing** — verify after every change
- **Follow patterns** — use the project's conventions, never invent
- **Doc staleness** — cross-ref changed files against feature docs, test specs, READMEs; flag updates needed
- **Preserve ALL invariants; never weaken a property/mutation test** — a refactor MUST keep every `[HARD]` §4 rule / §5 invariant intact and MUST NOT delete, relax, or trivialize any property test or mutation test that guards them. If a simplification changes observable behavior, that is NOT a silent change — it is a **Dual-Feedback finding** (feed the spec AND the tests, then re-review), report it and stop, never ship it. After simplifying, the package MUST still pass the SAME property/mutation bar it passed before — green tests on a weakened bar are not a pass.

---

## Self-Recursive Verification (MANDATORY after simplifications)

After applying simplifications, follow the [Self-Recursive Simplification Loop](#self-recursive-simplification-loop) below. It owns round closure, deferred LOWs, no-progress/unsafe stops and the subsequent Self-Review Gate. For caller-owned verify-last execution, use the static-verification exception in Workflow Step 5.

## Self-Review Gate (MANDATORY when this skill changed code)

> **This skill is a code MUTATOR. It owns the review of its own output.** Once the self-recursive simplification loop above is clean, gate the result:
>
> 0. **Caller deferral.** `--defer=review` in `$ARGUMENTS` means the caller runs a FULL review of the settled whole target after this skill returns (see `.claude/skills/workflow-review-changes/references/caller-mode.md`). Skip steps 1–3, record `Self-review deferred to caller post-fix FULL review`, and return the exact list of files this skill changed so that review covers them. Without the flag — including a bare invocation by another skill — run the gate.
> 1. **Did this skill modify any files?** Determine the exact set of files this skill changed (its own edits — not the whole working tree).
>    - **No files changed** → SKIP this gate and **log the skip reason** ("code-simplifier made no changes — no self-review needed"). Done.
>    - **Files changed** → continue.
> 2. **Self-invoke `/code-quality-review` scoped to ONLY the changed files.** Pass the explicit changed-file set as the review target — not the full diff, not unrelated files.
> 3. **Integrate the `/code-quality-review` findings.** If it surfaces blocking issues caused by the simplification, fix them (behavior-preserving only) and re-run the self-recursive loop + this gate. If issues are out of simplification scope, report them up — do not silently drop.
>
> **Recursion safety:** `/code-quality-review` is a LEAF review skill — it does NOT invoke `/code-simplifier` back, so there is no cycle. Use `/code-quality-review` here, NEVER `/workflow-review-changes` (its sequence contains a `code-simplifier` step and would recurse) or `/changes-review` (a full-diff review heavier than this file-scoped gate needs).
>
> **Why this gate exists:** `/code-simplifier` rewrites code after the main review batch has already run. Without this gate, the simplifier's output would ship unreviewed. This gate moves that review responsibility into the mutator itself — so the `workflow-review-changes` workflow no longer needs a separate `/code-quality-review` step after `/code-simplifier`.

Used standalone (outside a review workflow), this self-review gate is sufficient for the simplifier's own changes; you may still finish with `/changes-review` or the active workflow's review gate for broader, whole-changeset coverage.

## Next Steps

> **EXEMPT** when invoked by a parent skill or workflow step, when running as a sub-agent, or under `--report-only`: return the result to the caller; skip `ask user question tool`.

**MANDATORY — NO EXCEPTIONS** after completing, use `ask user question tool`:

- **"/workflow-review-changes (Recommended)"** — Review all changes before commit
- **"/code-quality-review"** — Full code review
- **"Skip, continue manually"** — user decides

## AI Agent Integrity Gate (NON-NEGOTIABLE)

> **Completion ≠ Correctness.** Before reporting work done, prove it:
>
> 1. **Grep every removed name.** Extraction/rename/delete → grep confirms 0 dangling refs across ALL file types.
> 2. **Ask WHY before changing.** Existing values intentional until proven otherwise. No "fix" without traced rationale.
> 3. **Verify ALL outputs.** One build passing ≠ all builds passing. Check every affected stack.
> 4. **Evaluate pattern fit.** Copying nearby code? Verify preconditions match — same scope, lifetime, base class, constraints.
> 5. **New artifact = wired artifact.** Created? Prove registered, imported, reachable by all consumers.

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting. Keep task depth proportional to the work.

**Prerequisites:** **MUST ATTENTION READ** before executing:

- `domain-entities-reference.md` under the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) — domain entity catalog, relationships, cross-service sync (read when task involves business entities/models)

> **External Memory:** Complex/lengthy work → write findings to `tmp/reports/`. Prevents context loss, serves as deliverable.

> **Evidence Gate:** MANDATORY — every claim, finding, recommendation requires `file:line` proof or traced evidence (confidence >80% to act, <80% verify first).

> **DRY and abstraction fit:** Compare repeated behavior and responsibility before proposing a shared abstraction. Recommend a function, module, or type only when evidence shows the instances share a reason to change and the abstraction reduces future edits; names or suffixes alone do not justify a base type. Verify any project-specific lint/analyzer rule in its config.

## Self-Recursive Simplification Loop

**Purpose:** Avoid spending tokens on a fresh-context review of this skill's own findings. The simplifier owns its own convergence loop; broader review workflows can still run after the simplifier reports clean.

Loop:

1. Analyze the current target/diff for simplification findings with `file:line` evidence.
2. Apply only behavior-preserving simplifications that satisfy the evidence gate.
3. Run targeted verification after each change set.
4. Re-read the updated diff and re-run this skill's simplification dimensions.
5. Repeat until this skill's current round bar is clear: round 1 has zero validated simplification findings; round 2 have zero validated CRITICAL/HIGH/MEDIUM findings, with LOWs recorded as deferred.

Stop conditions:

- The same simplification finding repeats for 3 passes with no progress.
- A simplification needs product/owner input or has behavior-change risk.
- Verification cannot run or cannot prove behavior preservation.

Rules:

- Do not spawn a fresh-context reviewer just because simplifications were applied.
- Do not re-review known findings in a fresh context before fixing them.
- Do not hand off until the self-recursive pass clears the current round bar; never silently discard deferred LOWs.
- After the self-recursive loop is clean, run the **Self-Review Gate** — if any files were changed, self-invoke `/code-quality-review` scoped to those files (recursion-safe leaf skill); skip + log if nothing changed or the caller passed `--defer=review`.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `complexity-prevention` — Change-cost lens on complexity (Ousterhout); designing or reviewing code → .claude/skills/shared/protocols/complexity-prevention.md
- `core-engineering-principles` — Core quality gate: easy to change, easy to scale, easy to maintain, judged by future change cost; planning, implementing or reviewing any change → .claude/skills/shared/protocols/core-engineering-principles.md
- `design-patterns-quality` — Design quality: one owner per rule, fitted patterns, no speculative abstraction; designing or reviewing code structure → .claude/skills/shared/protocols/design-patterns-quality.md
- `review-decision-autonomy` — Choose supported review decisions and ask before extending the round budget; running any review or audit skill or mode → .claude/skills/shared/protocols/review-decision-autonomy.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `shared-protocol-duplication-policy` — Protocol copies in carriers are intentional: edit the canonical source, then propagate; editing a shared protocol or its carriers → .claude/skills/shared/protocols/shared-protocol-duplication-policy.md
- `source-test-drift-check` — When source behavior changes, reconcile the affected tests from evidence; code, fix, test or review work changes behavior → .claude/skills/shared/protocols/source-test-drift-check.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `ui-system-context` — Resolve the project's UI conventions before a UI change; changing a user-interface surface → .claude/skills/shared/protocols/ui-system-context.md
- `understand-code-first` — Read and trace the target and existing patterns before changing code; planning or editing code → .claude/skills/shared/protocols/understand-code-first.md
- `verify-last-order` — Build all phases and write tests, review statically, then verify once with a mutation check; planning or running any code-changing task → .claude/skills/shared/protocols/verify-last-order.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:complexity-prevention:reminder -->

**IMPORTANT MUST ATTENTION** assess change amplification, cognitive load, coupling, leaked detail and invariant ownership from project evidence. Extract only when a real owner or consumer lowers change cost; no universal layer order or numeric threshold.

<!-- /SYNC:complexity-prevention:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** A finding names a reachable trigger path (caller, input, state or event that reaches the defect) and a consequence; an unreachable concern is an observation, and unsettled reachability is `NOT VERIFIABLE` only when the concern would be MEDIUM or higher (an observation otherwise) — never a speculative LOW.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->


<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval; inside a workflow run, `/start-workflow` → Workflow-step mode bounds this
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->


<!-- SYNC:review-decision-autonomy:reminder -->

**MUST ATTENTION** Decide supported review choices and recommendations, record the rationale, and finish without routine user questions. Keep round-limit extension, indispensable facts and actual action authority; preserve source coverage, validation, tests, read-only boundaries and budgets. Review decisions do not accept open risks or make a failed gate pass.

<!-- /SYNC:review-decision-autonomy:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Lower the cost of the next change — cut coupling, hidden state, duplicated knowledge, unclear intent — by simplifying and refining code for clarity, consistency, and maintainability without altering any observable behavior. — why: every simplification serves future change cost, not aesthetics.

**IMPORTANT MUST ATTENTION Main steps (run in declared order, never skip/merge):** (1) Phase 0 Detect target and scope from project config/source → (2) Identify Targets (skip generated/migration/vendor) → (3) Analyze the 5 Dimensions and mark inapplicable ones N/A with a reason → (4) Apply one refactoring type at a time → (5) Verify tests after EACH change → (6) Self-Recursive Loop until the current round's exit bar is clear (round 1: zero open findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred) → (7) Self-Review Gate (`/code-quality-review` on changed files; skipped only under `--defer=review`). — why: AI keeps forgetting the skill's own steps; surfacing them here is the recency anchor.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Subagent Return Contract:** sub-agents return only the summary shape; full detail to report file.
- **UI System Context:** read frontend-patterns, scss-styling-guide, design-system before touching UI files.
- **Shared Protocol Duplication Policy:** inline SYNC duplication is intentional — NEVER extract behind file reference.
- **Source/Test Drift Check:** when source behavior changes, decide from evidence whether tests follow or source is a bug.
- **Understand Code First:** read target + grep 3+ patterns (graph trace is optional advice) before writing or fixing.
- **Design Patterns Quality:** assess abstraction and responsibility using the project's evidenced architecture; do not impose a fixed object, layer, or framework convention.
- **Complexity Prevention:** look for evidence-backed change amplification and unclear ownership using the project's actual module boundaries.
- **Severity Rubric:** classify findings Critical/High/Medium/Low by consequence using `SYNC:severity-rubric`; round 1 blocks on every open validated finding (LOW deferral), round 2 blocks only CRITICAL/HIGH/MEDIUM, and LOW is recorded/deferred. Failed binary gates always block.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**IMPORTANT MUST ATTENTION** apply a simplification ONLY when certain it preserves behavior — grep all usages + trace consumers (grep/read; an optional graph downstream trace may hint at more) and cite `file:line` BEFORE touching anything; if unsure → DO NOT apply. — why: an unverified "safe" rewrite silently breaks a downstream consumer.
**IMPORTANT MUST ATTENTION** NEVER simplify generated, migration, or vendor files — HARD-SKIP them in Phase 0. — why: regenerated output overwrites edits and migrations are one-time execution paths, not core logic.
**IMPORTANT MUST ATTENTION** run the Self-Recursive Loop (analyze → simplify → verify) until the current round's exit bar is clear (round 1: zero open findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred); do NOT spawn a fresh-context reviewer for this skill's own findings. — why: re-reviewing your own findings in fresh context burns tokens the convergence loop already owns.

- **MANDATORY** Evidence Gate — every finding/recommendation needs `file:line` proof or a traced call chain; confidence >80% to act, 60-80% verify first, <60% DO NOT recommend. NEVER use "obviously"/"I think"/"should be" without proof.
- **MANDATORY** break work into small todo tasks via `TaskCreate` BEFORE starting; keep exactly one `in_progress`; mark `completed` immediately; add a final review task. On context loss, `TaskList` first — resume, never duplicate.
- **MANDATORY** READ `code-review-rules.md` FIRST, then `project-structure-reference.md` — both under the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides); search 3+ existing patterns and read the target code BEFORE modification. The code graph is optional advice for high-risk blast radius.
- **MANDATORY** evaluate pattern FIT before copying nearby code — verify same scope, lifetime, base class, constraints; closest example ≠ matching preconditions. — why: a copied pattern with mismatched preconditions compiles but is wrong.
- **MANDATORY** reason by the 5 Simplification Dimensions — readability, evidenced DRY/abstraction, responsibility according to documented architecture and actual ownership, complexity reduction, and configured persistence/query bounds when relevant (otherwise N/A with a reason); every technique answers ONE test: does this make the next change cheaper?
- **MANDATORY IMPORTANT MUST ATTENTION** compare repeated behavior before abstraction and assign responsibility from project docs and traced code; names/suffixes are clues only. After every extraction/move/rename, grep ENTIRE scope for dangling references — zero tolerance. — why: "primary file done" ≠ secondary files clean.
- **MANDATORY IMPORTANT MUST ATTENTION** preserve ALL invariants — NEVER weaken, delete, or trivialize a property/mutation test guarding a `[HARD]` §4 rule or §5 invariant; a behavior change is a Dual-Feedback finding (feed spec AND tests, re-review) — report and stop, never ship silently. — why: green tests on a weakened bar are not a pass.
- **MANDATORY IMPORTANT MUST ATTENTION** verify ALL affected outputs and tests pass after EACH change (apply one refactoring type at a time) — one build green ≠ all green; when a caller runs the tests once, last (`SYNC:verify-last-order`), compile/type-check each change and leave the test run to that caller's single verify. — why: multi-stack changes regress the stack you didn't check.
- **MANDATORY IMPORTANT MUST ATTENTION** Self-Review Gate — when this skill changed code, self-invoke `/code-quality-review` scoped to ONLY the changed files (recursion-safe leaf skill; NEVER `/workflow-review-changes`, whose `code-simplifier` step would recurse, nor the heavier `/changes-review`); skip + log the reason when nothing changed or when the caller passed `--defer=review`. The simplifier owns review of its own output. — why: the simplifier rewrites code after the main review batch, so its output ships unreviewed without this gate.
- **MANDATORY IMPORTANT MUST ATTENTION** `--report-only` runs steps 1–3 only — edit NO file, no nested sub-agent, no user question; every finding carries `file:line` + proposed change + behavior-preservation note; write only the report and return it. — why: a mutator inside a read-only review barrier races the diff its siblings are reading.

**Anti-Rationalization:**

| Evasion                          | Rebuttal                                                                                                                               |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| "Already searched"               | Show `file:line` evidence. No proof = no search.                                                                                       |
| "Just a small simplification"    | Small change at wrong layer cascades. Trace consumers first.                                                                           |
| "Code is self-explanatory"       | Future readers need an evidence trail. Document non-obvious intent.                                                                    |
| "Simplification is safe"         | NEVER assume safe — grep ALL usages first; <80% confidence = do not apply.                                                            |
| "Best practice says abstract it" | Abstract only when it lowers future change cost; pass-through indirection is complexity, not simplification.                            |
| "This pattern is everywhere"     | Pattern fit ≠ pattern presence. Verify same scope/lifetime/base-class/constraints before copying.                                     |
| "Tests still pass, ship it"      | Did you weaken the bar? A relaxed property/mutation test passing is not a pass. Keep the SAME invariant bar.                            |
| "Skip recursive check after fixing" | Every simplification changes the diff. Re-run this skill's own simplification analysis until the current round bar is clear; after round 1, LOW-only findings are recorded/deferred rather than causing another cycle. |
| "Generated file is messy too"    | NEVER touch generated/migration/vendor — HARD-SKIP. Regeneration overwrites you.                                                       |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break into small todo tasks using TaskCreate.

<!-- SYNC:core-engineering-principles:reminder -->

**MUST ATTENTION** Core Engineering Principles — every plan, implementation and review must be **Easy to change** (reuse first, one owner per rule, interfaces/adapters at volatile boundaries, no speculative abstraction) · **Easy to scale** (extend by addition, bounded growth, explicit boundaries, sized to the project's real profile) · **Easy to maintain** (intent-named tests that fail when the rule breaks across happy/error/edge paths; harness green locally and in CI). Before done: next change → how many edit sites? 10× → what breaks? which test goes red?

<!-- /SYNC:core-engineering-principles:reminder -->
