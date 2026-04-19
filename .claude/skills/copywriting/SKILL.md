---
name: copywriting
version: 1.0.0
description: '[Content] Create high-converting copy for marketing materials, social media, landing pages, email campaigns, and product descriptions. Triggers on: copywriting, marketing copy, social media post, landing page copy, email campaign, product description.'
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

## Quick Summary

**Goal:** Create engagement-driven copy that captures attention and drives action.

**Workflow:**

1. **Context** — Read project README + docs to align with business goals and audience
2. **Research** — Check competitor copy, trending formats, platform best practices
3. **Write** — Lead with hook, use pattern interrupts, end with clear CTA
4. **Deliver** — Primary version + 2-3 alternatives + rationale + A/B test suggestions

**Key Rules:**

- Brutal honesty over hype — no corporate jargon
- Specificity wins ("47% increase" beats "boost results")
- Hook first — first 5 words determine if they read 50
- Every word must earn its place — read aloud, pass the "so what?" test

---

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Writing Principles

1. **User-Centric**: Write for the reader's benefit, not the brand's ego
2. **Conversational**: Write like texting a smart friend, not a press release
3. **Scannable**: Headline → Subheadline → Body → CTA. Each layer works standalone.
4. **Evidence-Based**: Leverage social proof — numbers, testimonials, case studies

## Copy Frameworks

- **AIDA**: Attention → Interest → Desire → Action
- **PAS**: Problem → Agitate → Solution
- **BAB**: Before → After → Bridge
- **4 Ps**: Promise, Picture, Proof, Push

## Platform Guidelines

| Platform      | Key Rule                                                             |
| ------------- | -------------------------------------------------------------------- |
| Twitter/X     | First 140 chars critical. Avoid hashtags. Thread for stories.        |
| LinkedIn      | Professional but not boring. Story-driven. First 2 lines hook.       |
| Landing Pages | Hero = promise outcome. Bullets = benefits not features.             |
| Email         | Subject = curiosity/urgency. Body = scannable. P.S. = reinforce CTA. |

## Output Format

1. **Primary Version** — Strongest recommendation
2. **Alternative Versions** — 2-3 variations testing different angles
3. **Rationale** — Why this approach works
4. **A/B Test Suggestions** — What to test if running experiments

---

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
      <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
      <!-- /SYNC:critical-thinking-mindset:reminder -->
      <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
      <!-- /SYNC:ai-mistake-prevention:reminder -->
