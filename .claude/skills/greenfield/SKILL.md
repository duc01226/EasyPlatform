---
name: greenfield
version: 1.1.0
description: '[Planning] Use when you need to start a new project from scratch with full waterfall inception — idea, research, domain modeling, tech stack, and implementation plan.'
---

## Quick Summary

**Goal:** Guide greenfield project inception from raw idea to an approved, implementable project plan using a full waterfall process.

**Workflow (16 steps):**

1. **Discovery** (`/idea`) — Interview user about problem, vision, constraints, team skills, scale. **DO NOT ask about tech stack** — keep business-focused.
2. **Market Research** (`/web-research`) — WebSearch for competitors, market landscape, existing solutions
3. **Deep Research** (`/deep-research`) — WebFetch top sources, extract key findings
4. **Business Evaluation** (`/business-evaluation`) — Viability assessment, risk matrix, value proposition
5. **Domain Analysis & ERD** (`/domain-analysis`) — Bounded contexts, aggregates, entities, ERD diagram, domain events. Validate every context boundary with user.
6. **Tech Stack Research** (`/tech-stack-research`) — Derive technical requirements from business + domain analysis. Research top 3 options per stack layer (backend, frontend, database, messaging, infra). Detailed pros/cons matrix, team-fit scoring, market analysis. Present comparison report for user to decide.
7. **Architecture Design** (`/architecture-design`) — Research and compare top 3 architecture styles (Clean, Hexagonal, Vertical Slice, etc.). Evaluate design patterns (CQRS, Repository, Mediator). Audit against SOLID, DRY, KISS, YAGNI. Validate scalability, maintainability, IoC, technical agnosticism. Present comparison with recommendation. **Harness output required:** produce a "Scaffold Handoff — Harness Plan" table in the architecture report: (a) feedforward guides to create (AGENTS.md sections, skill activation rules, pattern catalog), (b) computational feedback sensors to install (linter, formatter, pre-commit, CI), (c) inferential feedback sensors to configure (review skills, AI gates). This table feeds `/scaffold` → `/linter-setup` → `/harness-setup`.
8. **Implementation Plan** (`/plan`) — Create phased plan using confirmed tech stack + architecture + domain model
9. **Security Audit** (`/security-review`) — Review plan for OWASP Top 10, auth patterns, data protection concerns
10. **Performance Audit** (`/performance-review`) — Review plan for performance bottlenecks, scalability, query optimization
11. **Plan Review** (`/plan-review`) — Full plan review, risk assessment, approval
12. **Refine to PBI** (`/refine`) — Transform idea + reviewed plan into actionable PBI with acceptance criteria
13. **User Stories** (`/story`) — Break PBI into implementable user stories
14. **Plan Validation** (`/plan-validate`) — Interview user with critical questions to validate plan + stories
15. **Test Strategy** (`/spec [mode=tests]`) — Test pyramid, frameworks, spec outline
16. **Workflow End** (`/workflow-end`) — Clean up, announce completion

**Key Rules:**

- PLANNING ONLY: never implement code
- Every stage saves artifacts to plan directory
- **MANDATORY IMPORTANT MUST ATTENTION** every stage requires `AskUserQuestion` validation before proceeding
- Delegate architecture decisions to `solution-architect` agent
- Present 2-4 options for every major decision with confidence %
- **Business-First Protocol:** Tech stack is NEVER asked upfront. Business analysis (steps 1-5) + domain modeling (step 6) must complete first. Tech stack is derived from requirements through research and presented as a comparison report with options.
- **MANDATORY IMPORTANT MUST ATTENTION** architecture design MUST produce a "Scaffold Handoff — Harness Plan" table covering: feedforward guides, computational sensors (`/linter-setup` handles install), and inferential sensors (`/harness-setup` configures). The scaffold + linter-setup + harness-setup triad are NON-SKIPPABLE infrastructure — code without a harness accumulates technical debt from day one.

## Entry Point

This skill is the explicit entry point for the `workflow-greenfield-init` workflow.

**When invoked:**

1. Activate the `workflow-greenfield-init` workflow via `/start-workflow workflow-greenfield-init`
2. The workflow handles step sequencing, task creation, and progress tracking
3. Each step delegates to the appropriate skill (idea, web-research, domain-analysis, tech-stack-research, etc.)
4. The `solution-architect` agent provides architecture guidance throughout

## When to Use

- Starting a brand-new project from scratch
- No existing codebase (empty project directory)
- Planning a new application before writing any code
- Want structured waterfall inception with user collaboration at every step

## When NOT to Use

- Existing codebase with code (use `/plan` or `/start-workflow workflow-feature` instead)
- Bug fixes, refactoring, or feature implementation
- Quick prototyping (use `/feature-implement` instead)

## Output

All artifacts saved to plan directory:

```
plans/{id}/
  research/
    discovery-interview.md
    market-research.md
    deep-research.md
    business-evaluation.md
    domain-analysis.md
    tech-stack-comparison.md
    architecture-design.md
  phase-01-domain-model.md
  phase-02-tech-stack.md
  phase-02b-architecture.md
  phase-03-project-structure.md
  phase-04-test-strategy.md
  phase-05-backlog.md
  plan.md (master plan with YAML frontmatter)
```

After completion, recommend next step: `/feature-implement` to scaffold the project structure.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

---

**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks — one per workflow step.
**MANDATORY IMPORTANT MUST ATTENTION** validate with user at EVERY step — never auto-decide.
**MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality and identify fixes/enhancements.

---

**MANDATORY IMPORTANT MUST ATTENTION** use `TaskCreate` to break ALL work into small tasks BEFORE starting.
**MANDATORY IMPORTANT MUST ATTENTION** use `AskUserQuestion` at EVERY stage — validate decisions before proceeding.
**MANDATORY IMPORTANT MUST ATTENTION** NEVER ask tech stack upfront — business analysis and domain modeling first.

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

**IMPORTANT MUST ATTENTION** Protocols in force (concise digest of the SYNC/shared blocks this skill carries):

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** traced `file:line` proof per claim, confidence >80% to act, NEVER guess.

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
