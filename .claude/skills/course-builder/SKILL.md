---
name: course-builder
version: 1.0.0
description: '[Content] Build structured learning/teaching course material with Bloom taxonomy objectives, modules, lessons, exercises, and assessments.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

## Quick Summary

**Goal:** Build structured course material with learning objectives, modules, lessons, exercises, and assessments.

**Workflow:**

1. **Define scope** — Target audience, prerequisites, duration, objectives
2. **Map objectives** — Align to Bloom's taxonomy
3. **Structure curriculum** — Modules → Lessons → Exercises → Assessments
4. **Develop content** — Per lesson: concept, explanation, examples, exercises
5. **Create assessments** — Knowledge checks + final assessment
6. **Review pedagogy** — Progressive difficulty, prerequisite chains

**Key Rules:**

- Every objective mapped to Bloom's taxonomy level
- Progressive complexity (each module builds on previous)
- Use enforced template from `.claude/templates/course-outline-template.md`

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Course Builder

## Bloom's Taxonomy Reference

| Level          | Verb Examples                             | Assessment Type                     |
| -------------- | ----------------------------------------- | ----------------------------------- |
| **Remember**   | Define, list, recall, identify            | Multiple choice, fill-in-blank      |
| **Understand** | Explain, describe, summarize, interpret   | Short answer, paraphrase            |
| **Apply**      | Use, implement, solve, demonstrate        | Problem sets, exercises             |
| **Analyze**    | Compare, contrast, examine, differentiate | Case studies, analysis papers       |
| **Evaluate**   | Judge, critique, assess, justify          | Debates, reviews, peer assessment   |
| **Create**     | Design, construct, produce, develop       | Projects, portfolios, presentations |

## Step 1: Define Learning Scope

Gather from user or research:

- **Target audience** — Who? What's their background?
- **Prerequisites** — What must they know already?
- **Duration** — Total hours/weeks available
- **Desired outcomes** — What can they DO after the course?

## Step 2: Map Objectives to Bloom's

For each desired outcome, assign a Bloom's level:

- Start with lower levels (Remember, Understand)
- Progress to higher levels (Apply, Analyze, Evaluate, Create)
- Ensure at least one objective at Apply level or above

## Step 3: Structure Curriculum

Organize into modules (3-8 per course):

- Each module has 2-5 lessons
- Each module has its own learning objectives
- Modules build on each other (prerequisite chain)

## Step 4: Develop Lesson Content

For each lesson, provide:

1. **Duration** — Estimated time
2. **Concept** — Core idea in 1-2 sentences
3. **Explanation** — Theory, context, why it matters
4. **Examples** — 2-3 real-world illustrations
5. **Exercise** — Hands-on practice activity
6. **Assessment** — How to verify learning

## Step 5: Create Assessments

Per module:

- **Knowledge check** — 3-5 questions covering key concepts
- Questions aligned to module's Bloom's level

Final:

- **Comprehensive assessment** — Covers all modules
- **Mix of Bloom's levels** — At least 1 question per level taught

## Output

Write to `docs/knowledge/courses/{descriptive-slug}.md` using enforced template from `.claude/templates/course-outline-template.md`.

---

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

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
