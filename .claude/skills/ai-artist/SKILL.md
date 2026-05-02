---
name: ai-artist
version: 1.0.0
description: '[AI & Tools] Write and optimize prompts for AI-generated outcomes across text and image models. Use when crafting prompts for LLMs (Claude, GPT, Gemini), image generators (Midjourney, DALL-E, Stable Diffusion, Imagen, Flux), or video generators (Veo, Runway). Covers prompt structure, style keywords, negative prompts, chain-of-thought, few-shot examples, iterative refinement, and domain-specific patterns for marketing, code, and creative writing.'

license: MIT
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

## Quick Summary

**Goal:** Write and optimize prompts for AI text, image, and video generation models (Claude, GPT, Midjourney, DALL-E, Stable Diffusion, Flux, Veo).

**Workflow:**

1. **Identify** — Determine model type (LLM, image, video) and desired outcome
2. **Structure** — Apply model-specific prompt patterns (Role/Context/Task for LLMs, Subject/Style/Composition for images)
3. **Refine** — Iterate with A/B testing, style keywords, negative prompts

**Key Rules:**

- Use clarity, context, structure, and iteration as core principles
- Apply model-specific syntax (Midjourney `--ar`, SD weighted tokens, etc.)
- Load reference files for detailed guidance per domain (marketing, code, writing, data)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# AI Artist - Prompt Engineering

Craft effective prompts for AI text and image generation models.

## Core Principles

1. **Clarity** - Be specific, avoid ambiguity
2. **Context** - Set scene, role, constraints upfront
3. **Structure** - Use consistent formatting (markdown, XML tags, delimiters)
4. **Iteration** - Refine based on outputs, A/B test variations

## Quick Patterns

### LLM Prompts (Claude/GPT/Gemini)

```
[Role] You are a {expert type} specializing in {domain}.
[Context] {Background information and constraints}
[Task] {Specific action to perform}
[Format] {Output structure - JSON, markdown, list, etc.}
[Examples] {1-3 few-shot examples if needed}
```

### Image Generation (Midjourney/DALL-E/Stable Diffusion)

```
[Subject] {main subject with details}
[Style] {artistic style, medium, artist reference}
[Composition] {framing, angle, lighting}
[Quality] {resolution modifiers, rendering quality}
[Negative] {what to avoid - only if supported}
```

**Example**: `Portrait of a cyberpunk hacker, neon lighting, cinematic composition, detailed face, 8k, artstation quality --ar 16:9 --style raw`

## References

Load for detailed guidance:

| Topic        | File                                | Description                                                |
| ------------ | ----------------------------------- | ---------------------------------------------------------- |
| LLM          | `references/llm-prompting.md`       | System prompts, few-shot, CoT, output formatting           |
| Image        | `references/image-prompting.md`     | Style keywords, model syntax, negative prompts             |
| Nano Banana  | `references/nano-banana.md`         | Gemini image prompting, narrative style, multi-image input |
| Advanced     | `references/advanced-techniques.md` | Meta-prompting, chaining, A/B testing                      |
| Domain Index | `references/domain-patterns.md`     | Universal pattern, links to domain files                   |
| Marketing    | `references/domain-marketing.md`    | Headlines, product copy, emails, ads                       |
| Code         | `references/domain-code.md`         | Functions, review, refactoring, debugging                  |
| Writing      | `references/domain-writing.md`      | Stories, characters, dialogue, editing                     |
| Data         | `references/domain-data.md`         | Extraction, analysis, comparison                           |

## Model-Specific Tips

| Model            | Key Syntax                                          |
| ---------------- | --------------------------------------------------- |
| Midjourney       | `--ar`, `--style`, `--chaos`, `--weird`, `--v 6.1`  |
| DALL-E 3         | Natural language, no parameters, HD quality option  |
| Stable Diffusion | Weighted tokens `(word:1.2)`, LoRA, negative prompt |
| Flux             | Natural prompts, style mixing, `--guidance`         |
| Imagen/Veo       | Descriptive text, aspect ratio, style references    |

## Anti-Patterns

- Vague instructions ("make it better")
- Conflicting constraints
- Missing context for domain tasks
- Over-prompting with redundant details
- Ignoring model-specific strengths/limits

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
