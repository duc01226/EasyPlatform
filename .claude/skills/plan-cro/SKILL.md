---
name: plan-cro
version: 1.0.0
description: '[Planning] Create a CRO plan for the given content'
disable-model-invocation: false
---

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

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:understand-code-first -->

> **Understand Code First** — HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
>
> 1. Search 3+ similar patterns (`grep`/`glob`) — cite `file:line` evidence
> 2. Read existing files in target area — understand structure, base classes, conventions
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists
> 4. Map dependencies via `connections` or `callers_of` — know what depends on your target
> 5. Write investigation to `.ai/workspace/analysis/` for non-trivial tasks (3+ files)
> 6. Re-read analysis file before implementing — never work from memory alone
> 7. NEVER invent new patterns when existing ones work — match exactly or document deviation
>
> **BLOCKED until:** `- [ ]` Read target files `- [ ]` Grep 3+ patterns `- [ ]` Graph trace (if graph.db exists) `- [ ]` Assumptions verified with evidence

<!-- /SYNC:understand-code-first -->

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

<!-- SYNC:estimation-framework -->

> **Estimation Framework** — Story Points (Modified Fibonacci) + Man-Days for 3-5yr dev (6 productive hrs/day, .NET + Angular stack). AI estimate assumes Claude Code with good project context (code graph, patterns, hooks active).
>
> | SP  | Complexity | Description                                    | Traditional (code + test) | AI-Assisted (code+rev + test+rev) |
> | --- | ---------- | ---------------------------------------------- | ------------------------- | --------------------------------- |
> | 1   | Low        | Trivial: single field, config flag, CSS fix    | 0.5d (0.3d+0.2d)          | 0.25d (0.15d+0.1d)                |
> | 2   | Low        | Small: simple CRUD endpoint OR basic component | 1d (0.6d+0.4d)            | 0.35d (0.2d+0.15d)                |
> | 3   | Medium     | Medium: form + API + validation                | 2d (1.3d+0.7d)            | 0.65d (0.4d+0.25d)                |
> | 5   | Medium     | Large: multi-layer feature (BE + FE)           | 4d (2.5d+1.5d)            | 1.0d (0.6d+0.4d)                  |
> | 8   | High       | Very large: complex feature + migration        | 6d (4d+2d)                | 1.5d (1.0d+0.5d)                  |
> | 13  | Critical   | Epic: cross-service — SHOULD split             | 10d (6.5d+3.5d)           | 2.0d (1.3d+0.7d)                  |
> | 21  | Critical   | MUST split — not sprint-ready                  | >15d                      | ~3d                               |
>
> **AI speedup grows with task size:** SP 1 ≈ 2x · SP 2-3 ≈ 3x · SP 5-8 ≈ 4x · SP 13+ ≈ 5x. Pattern-heavy CQRS/Angular boilerplate eliminated in hours at any scale. Fixed overhead: human review.
> **AI column breakdown:** `(code_gen × 1.3) + (test_gen × 1.3)` — each artifact adds 30% human review overhead. Test writing with AI = few hours generation + 30% review, same model as coding.
> Output `story_points`, `complexity`, `man_days_traditional`, `man_days_ai` in plan/PBI frontmatter.

<!-- /SYNC:estimation-framework -->

- `docs/specs/` — Test specifications by module (read existing TCs to include test strategy in plan)

<!-- SYNC:plan-quality -->

> **Plan Quality** — Every plan phase MUST ATTENTION include test specifications.
>
> 1. Add `## Test Specifications` section with TC-{FEAT}-{NNN} IDs to every phase file
> 2. Map every functional requirement to ≥1 TC (or explicit `TBD` with rationale)
> 3. TC IDs follow `TC-{FEATURE}-{NNN}` format — reference by ID, never embed full content
> 4. Before any new workflow step: call `TaskList` and re-read the phase file
> 5. On context compaction: call `TaskList` FIRST — never create duplicate tasks
> 6. Verify TC satisfaction per phase before marking complete (evidence must be `file:line`, not TBD)
>
> **Mode:** TDD-first → reference existing TCs with `Evidence: TBD`. Implement-first → use TBD → `/tdd-spec` fills after.

<!-- /SYNC:plan-quality -->

<!-- SYNC:iterative-phase-quality -->

> **Iterative Phase Quality** — Score complexity BEFORE planning.
>
> **Complexity signals:** >5 files +2, cross-service +3, new pattern +2, DB migration +2
> **Score >=6 →** MUST ATTENTION decompose into phases. Each phase:
>
> - ≤5 files modified
> - ≤3h effort
> - Follows cycle: plan → implement → review → fix → verify
> - Do NOT start Phase N+1 until Phase N passes VERIFY
>
> **Phase success = all TCs pass + code-reviewer agent approves + no CRITICAL findings.**

<!-- /SYNC:iterative-phase-quality -->

> **Skill Variant:** Variant of `/plan` — specialized for CRO (Conversion Rate Optimization) planning.

## Quick Summary

**Goal:** Create a CRO (Conversion Rate Optimization) plan for the given content or feature.

**Workflow:**

1. **Analyze** — Review current content/feature for conversion bottlenecks
2. **Research** — Identify CRO best practices and A/B test opportunities
3. **Plan** — Create actionable CRO improvement plan with measurable goals

**Key Rules:**

- PLANNING-ONLY: do not implement, only create CRO plan
- Focus on user behavior, conversion funnels, and measurable outcomes
- Always offer `/plan-review` after plan creation

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## PLANNING-ONLY — Collaboration Required

> **DO NOT** use the `EnterPlanMode` tool — you are ALREADY in a planning workflow.
> **DO NOT** implement or execute any code changes.
> **COLLABORATE** with the user: ask decision questions, present options with recommendations.
> After plan creation, ALWAYS run `/plan-review` to validate the plan.
> ASK user to confirm the plan before any next step.

You are an expert in conversion optimization. Analyze the content based on the given issues:
<issues>$ARGUMENTS</issues>

Activate `planning` skill.

**IMPORTANT:** Analyze the skills catalog and activate the skills that are needed for the task during the process.
**IMPORTANT:** Sacrifice grammar for the sake of concision when writing outputs.

## Conversion Optimization Framework

1. Headline 4-U Formula: **Useful, Unique, Urgent, Ultra-specific** (80% won't read past this)
2. Above-Fold Value Proposition: Customer problem focus, no company story, zero scroll required
3. CTA First-Person Psychology: "Get MY Guide" vs "Get YOUR Guide" (90% more clicks)
4. 5-Field Form Maximum: Every field kills conversions, progressive profiling for the rest
5. Message Match Precision: Ad copy, landing page headline, broken promises = bounce
6. Social Proof Near CTAs: Testimonials with faces/names, results, placed at decision points
7. Cognitive Bias Stack: Loss aversion (fear), social proof (FOMO), anchoring (pricing)
8. PAS Copy Framework: Problem > Agitate > Solve, emotion before logic
9. Genuine Urgency Only: Real deadlines, actual limits, fake timers destroy trust forever
10. Price Anchoring Display: Show expensive option first, make real price feel like relief
11. Trust Signal Clustering: Security badges, guarantees, policies all visible together
12. Visual Hierarchy F-Pattern: Eyes scan F-shape, put conversions in the path
13. Lead Magnet Hierarchy: Templates > Checklists > Guides (instant > delayed gratification)
14. Objection Preemption: Address top 3 concerns before they think them, FAQ near CTA
15. Mobile Thumb Zone: CTAs where thumbs naturally rest, not stretching required
16. One-Variable Testing: Change one thing, measure impact, compound wins over time
17. Post-Conversion Momentum: Thank you page sells next step while excitement peaks
18. Cart Recovery Sequence: Email in 1 hour, retarget in 4 hours, incentive at 24 hours
19. Reading Level Grade 6: Smart people prefer simple, 11-word sentences, short paragraphs
20. TOFU/MOFU/BOFU Logic: Awareness content ≠ decision content, match intent precisely
21. White Space = Focus: Empty space makes CTAs impossible to miss, crowded = confused
22. Benefit-First Language: Features tell, benefits sell, transformations compel
23. Micro-Commitment Ladder: Small yes leads to big yes, start with email only
24. Performance Tracking Stack: Heatmaps show problems, recordings show why, events show what
25. Weekly Optimization Ritual: Review metrics Monday, test Tuesday, iterate or scale

## Workflow

- If the user provides a screenshots or videos, use `ai-multimodal` skill to describe as detailed as possible the issue, make sure the CRO analyst can fully understand the issue easily based on the description.
- If the user provides a URL, use `web_fetch` tool to fetch the content of the URL and analyze the current issues.
- You can use screenshot capture tools along with `ai-multimodal` skill to capture screenshots of the exact parent container and analyze the current issues with the appropriate Gemini analysis skills (`ai-multimodal`, `gemini-video-understanding`, or `gemini-document-processing`).
- Use `/scout-ext` (preferred) or `/scout` (fallback) slash command to search the codebase for files needed to complete the task
- Use `planner` agent to create a comprehensive CRO plan following the progressive disclosure structure:
    - Create a directory using naming pattern from `## Naming` section.
    - Every `plan.md` MUST ATTENTION start with YAML frontmatter:

        ```yaml
        ---
        title: '{Brief title}'
        description: '{One sentence for card preview}'
        status: pending
        priority: P2
        effort: { sum of phases, e.g., 4h }
        branch: { current git branch }
        tags: [cro, conversion]
        created: { YYYY-MM-DD }
        ---
        ```

    - Save the overview access point at `plan.md`, keep it generic, under 80 lines, and list each phase with status/progress and links.
    - For each phase, add `phase-XX-phase-name.md` files containing sections (Context links, Overview with date/priority/statuses, Key Insights, Requirements, Architecture, Related code files, Implementation Steps, Todo list, Success Criteria, Risk Assessment, Security Considerations, Next steps).
    - Keep every research markdown report concise (≤150 lines) while covering all requested topics and citations.
      **IMPORTANT:** Sacrifice grammar for the sake of concision when writing reports.
      **IMPORTANT:** In reports, list any unresolved questions at the end, if any.

## **IMPORTANT Task Planning Notes (MUST ATTENTION FOLLOW)**

- Always plan and break work into many small todo tasks using `TaskCreate`
- Always add a final review todo task to verify work quality and identify fixes/enhancements
- **MANDATORY FINAL TASKS:** After creating all planning todo tasks, ALWAYS add these three final tasks:
    1. **Task: "Write test specifications for each phase"** — Add `## Test Specifications` with TC-{FEAT}-{NNN} IDs to every phase file. Use `/tdd-spec` if feature docs exist. Use `Evidence: TBD` for TDD-first mode.
    2. **Task: "Run /plan-validate"** — Trigger `/plan-validate` skill to interview the user with critical questions and validate plan assumptions
    3. **Task: "Run /plan-review"** — Trigger `/plan-review` skill to auto-review plan for validity, correctness, and best practices

## REMINDER — Planning-Only Command

> **DO NOT** use `EnterPlanMode` tool.
> **DO NOT** start implementing.
> **ALWAYS** validate with `/plan-review` after plan creation.
> **ASK** user to confirm the plan before any implementation begins.
> **ASK** user decision questions with your recommendations when multiple approaches exist.

---

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
- **MANDATORY IMPORTANT MUST ATTENTION** include Test Specifications section and story_points in plan frontmatter
  <!-- SYNC:plan-quality:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** include `## Test Specifications` with TC IDs per phase. Call `TaskList` before creating new tasks.
    <!-- /SYNC:plan-quality:reminder -->
    <!-- SYNC:evidence-based-reasoning:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.
    <!-- /SYNC:evidence-based-reasoning:reminder -->
    <!-- SYNC:estimation-framework:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** include `story_points`, `complexity`, `man_days_traditional`, `man_days_ai` in plan/PBI frontmatter. Use SP table: SP 1=0.5d/0.25d, SP 2=1d/0.35d, SP 3=2d/0.65d, SP 5=4d/1.0d, SP 8=6d/1.5d · SP 13=10d/2.0d. SP 13 SHOULD split, SP 21 MUST split.
  <!-- /SYNC:estimation-framework:reminder -->
  <!-- SYNC:iterative-phase-quality:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** score complexity first. Score >=6 → decompose. Each phase: plan → implement → review → fix → verify. No skipping.
  <!-- /SYNC:iterative-phase-quality:reminder -->
  <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
    <!-- /SYNC:critical-thinking-mindset:reminder -->
    <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
    <!-- /SYNC:ai-mistake-prevention:reminder -->

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
