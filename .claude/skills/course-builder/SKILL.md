---
name: course-builder
version: 1.0.0
description: '[Content] Use when you need to build structured learning/teaching course material with Bloom taxonomy objectives, modules, lessons, exercises, and assessments.'
---

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

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

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

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Build structured course material with learning objectives, modules, lessons, exercises, and assessments.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** MUST ATTENTION critical + sequential thinking, traced proof, confidence >80% to act, never guess as fact.

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
