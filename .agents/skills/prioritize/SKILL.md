---
name: prioritize
description: '[Project Management] Use when you need to prioritize backlog items using RICE, MoSCoW, or Value-Effort frameworks.'
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

Codex does not receive Claude hook-based doc injection.
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

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Produce a defensible ranked ordering of 3+ backlog items using RICE, MoSCoW, or Value-Effort frameworks so the team works highest-value items first — every rank backed by a score and tech-agnostic rationale (value/effort/risk/impact).

**Workflow:**

1. **Collect Items** — Read from files or parse inline list (minimum 3 items)
2. **Select Framework** — RICE (quantitative), MoSCoW (stakeholder alignment), Value-Effort (quick decision)
3. **Score Each Item** — Apply framework criteria and calculate scores
4. **Rank and Report** — Output prioritized table with rationale and recommendations

**Key Rules:**

- Minimum 3 items required; fewer than 3 should be discussed directly
- Default to RICE if unsure; ask user if ambiguous
- Optionally update PBI file priority fields after ranking
- **Tech-agnostic rationale (M1):** See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M6)" for BLOCKING criteria. Justify every ranking by value, effort, risk, and business impact — NOT by implementation technology. Rationale prose stays tech-agnostic per `docs/project-reference/spec-principles.md` §3: no framework/product/language/design-pattern names; effort may cite story points and relative complexity, never a named stack.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Backlog Prioritization

Order backlog items using data-driven frameworks → ranked list with scores and rationale.

## When to Use

- Sprint planning needs ordered backlog (3+ items to rank)
- Stakeholders need priority ranking with justification
- Feature roadmap ordering with objective criteria
- Comparing competing features or initiatives

## When NOT to Use

- Fewer than 3 items (discuss directly)
- Creating PBIs or writing stories -- use `product-owner` or `story`
- Full product strategy -- use `product-owner`
- Project status tracking -- use `project-manager`

## Prerequisites

- List of 3+ backlog items (PBIs, features, user stories)
- IF items exist as files: read from `team-artifacts/pbis/` or user-provided path
- IF items provided inline: use provided descriptions

## Workflow

1. **Collect items** to prioritize
    - IF file path provided -> read items from files
    - IF inline list -> parse items from user message
    - IF fewer than 3 items -> ask user for more or suggest direct discussion

2. **Select framework** using decision tree:

    ```
    IF quantitative data available (reach, metrics)  -> RICE
    IF stakeholder alignment needed (must/should/could) -> MoSCoW
    IF quick decision needed (2 axes only)            -> Value-Effort 2x2
    IF user specifies framework                       -> use that framework
    IF unsure                                         -> ask user, default RICE
    ```

3. **Score each item** using selected framework:

    **RICE:**

    ```
    Score = (Reach x Impact x Confidence) / Effort

    Reach:      Users affected per quarter (number)
    Impact:     0.25 (minimal) | 0.5 (low) | 1 (medium) | 2 (high) | 3 (massive)
    Confidence: 0.5 (low) | 0.8 (medium) | 1.0 (high)
    Effort:     Story points (1, 2, 3, 5, 8, 13, 21)
    ```

    **MoSCoW:**

    ```
    Must Have:   Critical for release, non-negotiable
    Should Have: Important but not vital, workarounds exist
    Could Have:  Desirable, include if capacity allows
    Won't Have:  Out of scope for this cycle
    ```

    **Value-Effort 2x2:**

    ```
    High Value + Low Effort  = Quick Wins    (do first)
    High Value + High Effort = Strategic     (plan carefully)
    Low Value  + Low Effort  = Fill-ins      (if time permits)
    Low Value  + High Effort = Time Sinks    (avoid)
    ```

4. **Rank items** by score (descending for RICE, category for MoSCoW, quadrant for V-E)

5. **Output** prioritized list with scores and rationale

6. **IF PBI files exist** -> optionally update priority field in frontmatter (numeric 1-999)

## Output Format

```markdown
## Prioritized Backlog

**Framework:** [RICE | MoSCoW | Value-Effort]
**Date:** [YYMMDD]
**Items scored:** [count]

### Rankings

| Rank | Item      | Score | Rationale                                           |
| ---- | --------- | ----- | --------------------------------------------------- |
| 1    | Feature A | 45.0  | High reach (5000), high impact (3), high confidence |
| 2    | Feature B | 12.0  | Medium reach (2000), medium impact, low effort      |
| 3    | Feature C | 2.5   | Low reach, minimal impact, high effort              |

### Recommendations

- **Do first:** [top items]
- **Plan next:** [medium items]
- **Defer:** [low items with reasoning]
```

## Examples

### Example 1: RICE scoring of 5 features

**Input:** "Prioritize: SSO login, dark mode, export to PDF, email notifications, bulk import"

**Output:**

| Rank | Feature             | Reach | Impact | Conf | Effort | RICE |
| ---- | ------------------- | ----- | ------ | ---- | ------ | ---- |
| 1    | Email notifications | 5000  | 2      | 0.8  | 1      | 8000 |
| 2    | SSO login           | 2000  | 3      | 0.8  | 3      | 1600 |
| 3    | Bulk import         | 500   | 2      | 1.0  | 1      | 1000 |
| 4    | Export to PDF       | 1000  | 1      | 0.8  | 2      | 400  |
| 5    | Dark mode           | 3000  | 0.5    | 0.5  | 2      | 375  |

### Example 2: MoSCoW categorization

**Input:** "Categorize for Q1 release: payment gateway, admin dashboard redesign, API rate limiting, user avatars, audit logs"

**Output:**

- **Must Have:** Payment gateway (revenue-critical), API rate limiting (security)
- **Should Have:** Audit logs (compliance, workaround exists with manual exports)
- **Could Have:** Admin dashboard redesign (improves efficiency but current works)
- **Won't Have:** User avatars (nice-to-have, defer to Q2)

## Optional Escalation: $llm-council on Ties

**Gate evaluation:** After producing prioritized backlog (per `## Workflow` step output), inspect ranking output:

- Top-2 RICE scores within 15% of each other → gate fires
- Explicit MoSCoW tie (≥2 items in same Must/Should/Could band with material scope overlap) → gate fires
- Multi-stakeholder disagreement flagged in input → gate fires
- None of the above → gate does NOT fire; skill ends without prompting

**MANDATORY ATTENTION** — when the gate fires, you MUST use a direct user question to present these options (identical preamble pattern to architecture-design's `## Next Steps` MANDATORY ATTENTION block):

- **"Escalate to $llm-council (Recommended)"** — Tie/disagreement detected. Run 11 sub-agent council (5 advisors + 5 reviewers + chairman). Council's Contrarian + Outsider lenses are well-suited to multi-PBI ranking ties. Cheaper alternatives: `$why-review`, `$plan-validate` (use these instead if the tie is narrow but stakes are routine).
- **"Skip — accept current ranking"** — Acknowledge the tie; proceed with current ranking.

If gate does NOT fire, the prioritization decision stands; do NOT prompt.

## Related Skills

| Skill             | When to use instead                |
| ----------------- | ---------------------------------- |
| `product-owner`   | Full product management workflow   |
| `story`           | Breaking PBIs into user stories    |
| `refine`          | Refining ideas into PBIs           |
| `project-manager` | Sprint/project status and tracking |

---

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

- **IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
- **IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
- **IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
- **IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

## Closing Reminders

- **IMPORTANT MUST ATTENTION Goal:** produce a defensible ranked ordering so the team works highest-value items first — every rank backed by a score and tech-agnostic rationale (value/effort/risk/impact)
- **IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
  <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
    <!-- /SYNC:critical-thinking-mindset:reminder -->
    <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
  <!-- /SYNC:ai-mistake-prevention:reminder -->

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

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

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
   **Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
   **Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

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
   **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
