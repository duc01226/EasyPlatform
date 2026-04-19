---
name: workflow-product-discovery
version: 1.0.0
description: '[Workflow] Trigger Product Discovery workflow — raw vision or problem → structured brainstorm → prioritized opportunity map → N PBIs with stories, challenge review, DoR gate, and wireframes → cross-PBI ranked backlog ready for sprint planning.'
disable-model-invocation: true
---

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

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

Activate the `product-discovery` workflow. Run `/workflow-start product-discovery` with the user's prompt as context.

**Steps:**
/brainstorm → /web-research → /domain-analysis → /why-review
→ **[TASK DECOMPOSITION GATE]** Create TaskCreate for every opportunity × step BEFORE looping
→ [**loop per opportunity**] /idea → /refine → /refine-review → /story → /story-review → /pbi-challenge → /dor-gate → /pbi-mockup
→ /prioritize → /watzup → /workflow-end

> **Scale awareness:** This workflow can generate 8 opportunities × 8 steps = 64 artifact units plus a ranked backlog. Use the Task Decomposition Gate and incremental-write patterns to prevent context overrun. For 6+ opportunities, use sub-agent parallel processing (one sub-agent per opportunity, main context assembles at /prioritize).

## When to Use

- PO/BA has a raw product vision, big problem statement, or "we need to build X" starting point
- Team needs to go from zero to a grooming-ready backlog for sprint planning
- Strategic product initiative needs to be broken down into implementable PBIs
- Existing product needs a discovery sprint to generate new feature opportunities

## When NOT to Use

- Single well-defined feature → use `feature` or `idea-to-pbi`
- Implementation work (code writing) → use `feature` or `big-feature`
- Bug fixes → use `bugfix`
- Research only, no PBI output needed → use `investigation` or `deep-research`

## Key Mechanics

### 0. Task Decomposition Gate (MANDATORY — Runs After Brainstorm, Before First /idea)

After the opportunity map is produced and the user selects which opportunities to develop, **STOP and call `TaskCreate`** for every upcoming unit of work before processing any opportunity:

**Formula:** N opportunities × 8 steps = N×8 tasks. For 5 opportunities: 40 tasks.

**Per-opportunity task set:**

```
TaskCreate: "Opportunity {#}: Idea capture — {opportunity-slug}"
TaskCreate: "Opportunity {#}: PBI refinement — {opportunity-slug}"
TaskCreate: "Opportunity {#}: PBI review — {opportunity-slug}"
TaskCreate: "Opportunity {#}: User stories — {opportunity-slug}"
TaskCreate: "Opportunity {#}: Story review — {opportunity-slug}"
TaskCreate: "Opportunity {#}: Challenge review — {opportunity-slug}"
TaskCreate: "Opportunity {#}: DoR gate — {opportunity-slug}"
TaskCreate: "Opportunity {#}: Mockup — {opportunity-slug}" [skip if backend-only]
```

**Plus:** `TaskCreate: "Cross-PBI prioritization (final step)"` — one task at the end.

**Context Window Management:**

- Write each artifact immediately after completing its task — never batch
- For 6+ opportunities, use sub-agent parallel processing:
    - Spawn one sub-agent per opportunity with its task list and brainstorm context
    - Each sub-agent runs idea → mockup and writes artifacts to `team-artifacts/pbis/`
    - Main context runs `/prioritize` across all completed PBIs at the end
- After every 3 opportunities completed, update the session summary table

### 1. Brainstorm → Opportunity Map

The `/brainstorm` step is the engine. It uses the Double Diamond process:

- **Problem framing:** POV statement, 5 Whys / Fishbone, JTBD job stories, HMW questions
- **Opportunity framing:** Opportunity Solution Tree (enhancement) OR Lean Canvas (new product)
- **Ideation:** SCAMPER, Crazy 8s, Impact Mapping — target 25–40 raw ideas
- **Convergence:** RICE scoring, Kano classification, 2×2 Effort/Impact, MoSCoW

Output: A scored opportunity map with 3–8 ranked items.
AI presents the map and asks: **"Which opportunities should we develop into PBIs?"** (multi-select).

### 2. Why-Review Gate (After domain-analysis, Before per-opportunity loop)

Before committing to the per-PBI loop, validate the opportunity map rationale with `/why-review`:

**Challenge prompts:**

- Are the top-ranked opportunities truly the right problems to solve? What was deprioritized and why?
- Are RICE scores well-founded or speculative? Challenge Reach and Impact estimates independently.
- Pre-mortem: if these opportunities are built and miss in 6 months, what was the root cause?
- Are there systemic alternatives (platform change, process change) that make these opportunities unnecessary?

| Result                          | Action                                              |
| ------------------------------- | --------------------------------------------------- |
| PASS                            | Proceed to per-opportunity loop                     |
| WARN                            | Document risk, acknowledge with user, proceed       |
| FAIL on high-ranked opportunity | Remove from selection or revisit brainstorm framing |

### 3. Multi-Opportunity Loop

For **each selected opportunity**, the following steps run in sequence:

| Step             | Purpose                                                        | Output                                          |
| ---------------- | -------------------------------------------------------------- | ----------------------------------------------- |
| `/idea`          | Capture as structured artifact                                 | `team-artifacts/ideas/{date}-po-idea-{slug}.md` |
| `/refine`        | PBI with hypothesis, AC (GIVEN/WHEN/THEN), RICE                | `team-artifacts/pbis/{date}-pbi-{slug}.md`      |
| `/refine-review` | BA quality check on PBI                                        | Reviewed PBI                                    |
| `/story`         | User stories per PBI                                           | Stories in PBI artifact                         |
| `/story-review`  | Story quality and completeness check                           | Reviewed stories                                |
| `/pbi-challenge` | Dev BA PIC review — challenge prompts, AC quality, feasibility | Challenge log                                   |
| `/dor-gate`      | INVEST check — PASS/WARN/FAIL                                  | DoR result                                      |
| `/pbi-mockup`    | ASCII wireframe (skip for backend-only)                        | Mockup in PBI                                   |

**Track progress:** After each opportunity loop, AI updates a session summary table in the plan dir.

### 5. Cross-PBI Prioritize

After all loops complete, `/prioritize` aggregates all PBIs:

- Cross-PBI RICE ranking
- Dependency graph (which PBIs must come before others)
- Release scope (Must-Have / Should-Have / Could-Have)
- Output: `team-artifacts/backlog/product-discovery-{date}-backlog.md`

### 6. Handoff

At `/workflow-end`, AI presents:

- Session summary: N PBIs created, X passed DoR, Y need rework
- Ranked backlog with RICE scores
- Recommended next step: `/sprint-planning` (backlog ready) or `/big-feature` (single large PBI needs deep research + implementation)
- Blocked PBIs: list DoR failures with specific blocking items

## Conditional Skip Rules

| Step                    | Skip When                                                                   |
| ----------------------- | --------------------------------------------------------------------------- |
| `/web-research`         | Internal tool, well-understood domain, user says "skip market research"     |
| `/domain-analysis`      | No new domain entities or aggregates involved                               |
| `/why-review`           | User has already validated opportunity rationale; no alternatives available |
| `/pbi-mockup` (per PBI) | PBI is backend-only — no UI changes                                         |

---

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting — one task per opportunity × step
- **MANDATORY IMPORTANT MUST ATTENTION** brainstorm output MUST produce a scored opportunity map before any /idea step
- **MANDATORY IMPORTANT MUST ATTENTION** why-review runs after domain-analysis — FAIL removes opportunity from selection, WARN requires user acknowledgment
- **MANDATORY IMPORTANT MUST ATTENTION** repeat idea→pbi chain for EACH selected opportunity — not just once
- **MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via `AskUserQuestion` — never auto-select opportunities
- **MANDATORY IMPORTANT MUST ATTENTION** /prioritize runs ONCE at the end across ALL PBIs, not per-opportunity
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify all PBIs and backlog artifact

        <!-- SYNC:critical-thinking-mindset:reminder -->

- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
  <!-- /SYNC:critical-thinking-mindset:reminder -->
  <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
  <!-- /SYNC:ai-mistake-prevention:reminder -->
