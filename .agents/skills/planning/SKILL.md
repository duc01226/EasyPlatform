---
name: planning
description: '[Planning] Use when you need to research, analyze, investigate, plan, design, or architect technical solutions. Includes comprehensive research phase with Gemini CLI, WebSearch, and 5-research limit. Triggers on keywords like "research", "analyze", "investigate options", "explore solutions", "compare approaches", "evaluate alternatives", "plan", "design", "architect".'
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Prefer the `plan-hard` skill for planning guidance in this Codex mirror.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->

## Codex Project-Reference Loading (No Hooks)

Codex does not receive Claude hook-based doc injection.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec/test-case planning or TC mapping: `feature-docs-reference.md`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

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

> **Estimation Framework** — Bottom-up first; SP DERIVED; output min-max range when likely ≥3d. Stack-agnostic. Baseline: 3-5yr dev, 6 productive hrs/day. AI estimate assumes Claude Code + project context.
>
> **Method:**
>
> 1. **Blast Radius pass** (below) — drives code AND test cost
> 2. Decompose phases → hours/phase → `bottom_up_hours = Σ phase_hours`
> 3. `likely_days = ceil(bottom_up_hours / 6) × productivity_factor`
> 4. Sum **Risk Margin** (base + add-ons) → `max_days = likely_days × (1 + margin)`
> 5. `min_days = likely_days × 0.9`
> 6. Output as range when `likely_days ≥3`; single point allowed `<3` (still record margin)
> 7. `man_days_ai` = same range × AI speedup
> 8. `story_points` DERIVED from `likely_days` via SP-Days — NEVER driver. Disagreement >50% → trust bottom-up
>
> **Productivity factor:** 0.8 strong scaffolding+codegen+AI hooks · 1.0 mature default · 1.2 weak patterns · 1.5 greenfield
>
> **Cost Driver Heuristic (apply BEFORE work-type row):**
>
> - **UI dominates** in CRUD/business apps — 1.5-3x backend (states, validation, responsive, a11y, polish)
> - **Backend dominates ONLY:** multi-aggregate invariants, cross-service contracts, schema migrations, heavy query/perf, new event flows
>
> **Reuse-vs-Create axis (PRIMARY lever, per layer):**
>
> | UI tier                                      | Cost     |
> | -------------------------------------------- | -------- |
> | Reuse component on existing screen           | 0.1-0.3d |
> | Add control/column to existing screen        | 0.3-0.8d |
> | Compose components into NEW screen           | 1-2d     |
> | NEW screen, custom layout/states/validation  | 2-4d     |
> | NEW shared/common component (themed, tested) | 3-6d+    |
>
> | Backend tier                                         | Cost      |
> | ---------------------------------------------------- | --------- |
> | Reuse query/handler from new place                   | 0.1-0.3d  |
> | Small update existing handler/entity                 | 0.3-0.8d  |
> | NEW query on existing repo/model                     | 0.5-1d    |
> | NEW command/handler on existing aggregate (additive) | 1-2d      |
> | NEW aggregate/entity (repo, validation, events)      | 2-4d      |
> | NEW cross-service contract OR schema migration       | 2-4d each |
> | Multi-aggregate invariant / heavy domain rule        | 3-5d      |
>
> **Rule:** Sum tiers across UI+backend+tests, apply productivity factor. Reuse short-circuits tiers — call out.
>
> **Test-Scope drivers (compute test_count EXPLICITLY — "+tests" hand-wave is #1 failure):**
>
> | Driver                            | Count                                                  |
> | --------------------------------- | ------------------------------------------------------ |
> | Happy-path journeys               | 1 per story / AC main flow                             |
> | State-machine transitions         | reachable transitions × allowed actors                 |
> | Multi-entity state combos         | state(A) × state(B) — REACHABLE only, not Cartesian    |
> | Authorization matrix              | (owner, non-owner, elevated, unauth) × each mutation   |
> | Validation rules                  | 1 per required field / boundary / format / cross-field |
> | UI states (per new screen/dialog) | happy, loading, empty, error, partial — present only   |
> | Negative paths / invariants       | 1 per violatable business rule                         |
>
> | Test tier (Trad, incl. setup+assert+flake) | Cost     |
> | ------------------------------------------ | -------- |
> | 1-5 cases, fixtures reused                 | 0.3-0.5d |
> | 6-12 cases, 1 new fixture                  | 0.5-1d   |
> | 13-25 cases, multi-entity setup            | 1-2d     |
> | 26-50 cases OR new state-machine coverage  | 2-3d     |
> | >50 cases OR full E2E journey              | 3-5d     |
>
> **Test multipliers:** new fixture/seed harness +0.5d · cross-service/bus assertion +0.3d each · UI E2E ×1.5 · each new role +1-2 cases
>
> **Blast Radius (mandatory pre-pass — affects code AND test):**
>
> 1. Files/components directly modified — count
> 2. Of those, "complex" (>500 LOC, multi-handler, central, frequently-modified) — count
> 3. Downstream consumers (callers, event subscribers, cross-service) — list
> 4. Shared/common code touched (multi-app blast) — yes/no
> 5. Regression scope — areas needing re-test
>
> **Rule:** Complex touch → add `risk_factors`. Each downstream consumer → +1-3 regression cases. Blast >5 areas OR >2 complex → re-evaluate SPLIT before estimating.
>
> **Risk Margin (drives max bound):**
>
> | likely_days         | Base margin                     |
> | ------------------- | ------------------------------- |
> | <1d trivial         | +10%                            |
> | 1-2d small additive | +20%                            |
> | 3-4d real feature   | +35%                            |
> | 5-7d large          | +50%                            |
> | 8-10d very large    | +75%                            |
> | >10d                | +100% AND **flag SHOULD SPLIT** |
>
> **Risk-factor add-ons (additive — enumerate in `risk_factors`):**
>
> | Factor                                                                | +margin |
> | --------------------------------------------------------------------- | ------- |
> | `touches-complex-existing-feature` (>500 LOC, multi-handler, central) | +20%    |
> | `cross-service-contract` change                                       | +25%    |
> | `schema-migration-on-populated-data`                                  | +25%    |
> | `new-tech-or-unfamiliar-pattern`                                      | +30%    |
> | `regression-fan-out` (≥3 downstream areas re-test)                    | +20%    |
> | `performance-or-latency-critical`                                     | +20%    |
> | `concurrency-race-event-ordering`                                     | +25%    |
> | `shared-common-code` (multi-consumer/multi-app)                       | +25%    |
> | `unclear-requirements-or-design`                                      | +30%    |
>
> **Collapse rule:** total margin >100% → STOP, split (padding past 2x is dishonesty). Margin <15% on `likely_days ≥5` → under-estimated, widen.
>
> **Work-Type Caps (hard ceilings on `likely_days`):**
> | Work type | Max SP | Max likely |
> | --- | --- | --- |
> | Single field / config flag / style fix | 1 | 0.5d |
> | Add property to existing model + bind to existing UI | 2 | 1d |
> | **Additive endpoint + minor UI control** (button/menu/column), reuses fixtures | **3** | **2-3d** |
> | Additive endpoint + **NEW UI surface** OR additive multi-layer + new domain rule + 2+ test files | 5 | 3-5d |
> | NEW model/aggregate OR migration OR cross-module contract OR heavy test (>1.5d) OR NEW UI + non-trivial backend | 8 | 5-7d |
> | NEW UI surface + (NEW aggregate OR migration OR cross-service contract) | 13 | SHOULD split |
> | Cross-service contract + migration combined | 13 | SHOULD split |
> | Beyond | 21 | MUST split |
>
> **SP→Days (validation only):** 1=0.5d/0.25d · 2=1d/0.35d · 3=2d/0.65d · 5=4d/1.0d · 8=6d/1.5d · 13=10d/2.0d (Trad/AI likely)
> **AI speedup:** SP 1≈2x · 2-3≈3x · 5-8≈4x · 13+≈5x. AI cost = `(code_gen × 1.3) + (test_gen × 1.3)` (30% review overhead).
>
> **MANDATORY frontmatter:**
>
> ```yaml
> story_points: <n>
> complexity: low | medium | high | critical
> man_days_traditional: '<min>-<max>d' # range when likely ≥3d; '<N>d' when <3d
> man_days_ai: '<min>-<max>d'
> risk_margin_pct: <n> # base + add-ons
> risk_factors: [touches-complex-existing-feature, regression-fan-out] # closed-list from add-ons; [] if none
> blast_radius:
>     touched_areas: <n>
>     complex_touched: <n>
>     downstream_consumers: [list or count]
>     shared_common_code: yes | no
> estimate_scope_included: [code, integration-tests, frontend, i18n, docs]
> estimate_scope_excluded: [unit-tests, e2e, perf, deployment, code-review-rounds]
> estimate_reasoning: |
>     5-7 lines covering:
>     (a) UI tier — row applied
>     (b) Backend tier — row applied
>     (c) Test scope — case breakdown by driver, file count, fixtures, tier row
>     (d) Cost driver — dominant tier + why
>     (e) Blast radius — touched, complex, regression scope
>     (f) Risk factors — list driving margin; why not larger/smaller
>     Example: "UI: compose Form/Table/Dialog → NEW screen (~1.5d). Backend: NEW command on existing aggregate,
>     reuses validation+repo (~1d). Tests: 4 transitions × 2 actors + 3 validation + 2 UI states = 13 cases,
>     1 new fixture → tier 13-25 ~1.5d. Driver: UI composition + new states. Blast: 4 areas, 1 complex.
>     Risk: base 35% + touches-complex +20% = 55% → max 3.9d → range 2.5-4d."
> ```
>
> **Sanity self-check:**
>
> - `likely_days ≥3d` and single-point? → reject, must be range
> - Margin <15% on `likely_days ≥5d`? → under-estimated, widen
> - Margin >100%? → STOP, split instead of buffer
> - Complex existing feature touched, no regression budget in `(c)`? → reject
> - Blast `>5` areas OR `>2` complex, no split discussion? → reject
> - Purely additive on existing model AND existing UI? → cap SP 3 unless tests >1.5d
> - NEW UI surface (page/complex form/dashboard)? → SP 5+ even if backend one endpoint
> - Backend cross-service / migration / multi-aggregate? → SP 8+ regardless of UI
> - `bottom_up_hours / 6` vs SP-Days disagreement >50%? → trust bottom-up, downgrade SP
> - Without tests, SP drops ≥1 bucket? → tests dominate; state explicitly
> - Reasoning called out UI vs backend vs blast vs risk factors? → if missing, add

<!-- /SYNC:estimation-framework -->

- `docs/specs/` — Test specifications by module (read existing TCs to include test strategy in plan)

<!-- SYNC:plan-quality -->

> **Plan Quality** — Every plan phase MUST ATTENTION include test specifications.
>
> 1. Add `## Test Specifications` section with TC-{FEAT}-{NNN} IDs to every phase file
> 2. Map every functional requirement to ≥1 TC (or explicit `TBD` with rationale)
> 3. TC IDs follow `TC-{FEATURE}-{NNN}` format — reference by ID, never embed full content
> 4. Before any new workflow step: call the current task list and re-read the phase file
> 5. On context compaction: call the current task list FIRST — never create duplicate tasks
> 6. Verify TC satisfaction per phase before marking complete (evidence must be `file:line`, not TBD)
>
> **Mode:** TDD-first → reference existing TCs with `Evidence: TBD`. Implement-first → use TBD → `$tdd-spec` fills after.

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

## Quick Summary

**Goal:** Create detailed technical implementation plans through research, codebase analysis, solution design, and comprehensive documentation (includes research phase merged from `research` skill).

**Workflow:**

1. **Research** — Parallel researcher agents, sequential-thinking, docs-seeker, GitHub analysis (max 5 researches)
2. **Design Context** — Extract Figma specs if URLs present in source artifacts
3. **Codebase Understanding** — Parallel scout agents, read essential docs (development-rules.md, backend-patterns-reference.md, frontend-patterns-reference.md, project-structure-reference.md)
4. **Solution Design** — Trade-off analysis, security, performance, edge cases, architecture
5. **Plan Creation** — YAML frontmatter plan.md + detailed phase-XX-\*.md files
6. **Review** — Run `$plan-review` to validate, ask user to confirm

**Key Rules:**

- **DO NOT** implement code - only create plans
- **DO NOT** use manual plan-mode switching tool - already in planning workflow
- **ALWAYS** run `$plan-review` after plan creation
- **COLLABORATE**: Ask decision questions, present options with recommendations

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Planning

Create detailed technical implementation plans through research, codebase analysis, solution design, and comprehensive documentation.

> **Note:** This skill includes the research phase (merged from `research` skill). Use for comprehensive planning that requires investigation before implementation.

## PLANNING-ONLY — Collaboration Required

> **DO NOT** use the manual plan-mode switching tool — you are ALREADY in a planning workflow.
> **DO NOT** implement or execute any code changes.
> **COLLABORATE** with the user: ask decision questions, present options with recommendations.
> After plan creation, ALWAYS run `$plan-review` to validate the plan.
> ASK user to confirm the plan before any next step.

## When to Use

Use this skill when:

- Researching or investigating solutions
- Analyzing approaches and alternatives
- Planning new feature implementations
- Architecting system designs
- Evaluating technical approaches
- Creating implementation roadmaps
- Breaking down complex requirements
- Assessing technical trade-offs

## Disambiguation

- For quick bug triage and systematic debugging, use `debug-investigate` instead
- This skill focuses on upfront planning and research before implementation

## Core Responsibilities & Rules

Always honoring **YAGNI**, **KISS**, and **DRY** principles.
**Be honest, be brutal, straight to the point, and be concise.**

### 1. Research & Analysis (**Skip if:** Provided with researcher reports)

> _Content sourced from `references/research-phase.md`_

#### Core Activities

##### Parallel Researcher Agents

- Spawn multiple `researcher` agents in parallel to investigate different approaches
- Wait for all researcher agents to report back before proceeding
- Each researcher investigates a specific aspect or approach

##### Sequential Thinking

- Use `sequential-thinking` skill for dynamic and reflective problem-solving
- Structured thinking process for complex analysis
- Enables multi-step reasoning with revision capability

##### Documentation Research

- Use `docs-seeker` skill to read and understand documentation
- Research plugins, packages, and frameworks
- Find latest technical documentation using llms.txt standard

##### GitHub Analysis

- Use `gh` command to read and analyze:
    - GitHub Actions logs
    - Pull requests
    - Issues and discussions
- Extract relevant technical context from GitHub resources

##### Remote Repository Analysis

When given GitHub repository URL, generate fresh codebase summary:

```bash
# usage:
repomix --remote <github-repo-url>
# example:
repomix --remote https://github.com/mrgoonie/human-mcp
```

##### Debugger Delegation

- Delegate to `debugger` agent for root cause analysis
- Use when investigating complex issues or bugs
- Debugger agent specializes in diagnostic tasks

#### Search Strategy

##### Primary: Gemini CLI

Check if `gemini` bash command is available:

```bash
gemini -m gemini-2.5-flash -p "...your search prompt..."
# Timeout: 10 minutes
```

Save output using `Report:` path from `## Naming` section (include all citations).

##### Fallback: WebSearch Tool

If gemini unavailable, use `WebSearch` tool. Run multiple searches in parallel.

##### Query Crafting

- Craft precise search queries with relevant keywords
- Include terms like "best practices", "2024", "latest", "security", "performance"
- Search for official documentation, GitHub repositories, and authoritative blogs
- Prioritize results from recognized authorities (official docs, major tech companies, respected developers)

##### IMPORTANT: 5-Research Limit

You are allowed to perform at most **5 researches (max 5 tool calls)**. User might request less. Think carefully based on the task before performing each research.

#### Deep Content Analysis

- When you find a potential GitHub repository URL, use `docs-seeker` skill to read it
- Focus on official documentation, API references, and technical specifications
- Analyze README files from popular GitHub repositories
- Review changelog and release notes for version-specific information

##### Video Content Research

- Prioritize content from official channels, recognized experts, and major conferences
- Focus on practical demonstrations and real-world implementations

##### Cross-Reference Validation

- Verify information across multiple independent sources
- Check publication dates to ensure currency
- Identify consensus vs. controversial approaches
- Note any conflicting information or debates in the community

#### Research Report Template

```markdown
# Research Report: [Topic]

## Executive Summary

[2-3 paragraph overview of key findings and recommendations]

## Research Methodology

- Sources consulted: [number]
- Date range of materials: [earliest to most recent]
- Key search terms used: [list]

## Key Findings

### 1. Technology Overview

[Comprehensive description of the technology/topic]

### 2. Current State & Trends

[Latest developments, version information, adoption trends]

### 3. Best Practices

[Detailed list of recommended practices with explanations]

### 4. Security Considerations

[Security implications, vulnerabilities, and mitigation strategies]

### 5. Performance Insights

[Performance characteristics, optimization techniques, benchmarks]

## Comparative Analysis

[If applicable, comparison of different solutions/approaches]

## Implementation Recommendations

### Quick Start Guide

[Step-by-step getting started instructions]

### Code Examples

[Relevant code snippets with explanations]

### Common Pitfalls

[Mistakes to avoid and their solutions]

## Resources & References

### Official Documentation

- [Linked list of official docs]

### Recommended Tutorials

- [Curated list with descriptions]

### Community Resources

- [Forums, Discord servers, Stack Overflow tags]

## Appendices

### A. Glossary

### B. Version Compatibility Matrix

### C. Raw Research Notes (optional)
```

#### Research Quality Standards

Ensure all research meets these criteria:

- **Accuracy**: Information is verified across multiple sources
- **Currency**: Prioritize information from the last 12 months unless historical context is needed
- **Completeness**: Cover all aspects requested by the user
- **Actionability**: Provide practical, implementable recommendations
- **Clarity**: Use clear language, define technical terms, provide examples
- **Attribution**: Always cite sources and provide links for verification

#### Special Considerations

- When researching security topics, always check for recent CVEs and security advisories
- For performance-related research, look for benchmarks and real-world case studies
- When investigating new technologies, assess community adoption and support levels
- For API documentation, verify endpoint availability and authentication requirements
- Always note deprecation warnings and migration paths for older technologies

#### Research Best Practices

- Research breadth before depth
- Document findings for synthesis phase
- Identify multiple approaches for comparison
- Consider edge cases during research
- Note security implications early
- Sacrifice grammar for concision in reports
- List unresolved questions at the end

### 2. Design Context Extraction

> _Content sourced from `references/figma-integration.md`_

**Skip if:** No Figma URLs in source artifacts OR backend-only changes

When planning UI features:

1. Check source PBI/design-spec for Figma URLs
2. Extract design context via Figma MCP (if available)
3. Include design specifications in plan phases
4. Map design tokens to implementation

#### When to Apply

**Apply when:**

- Source artifact contains Figma URLs
- Task involves UI/frontend implementation
- Design specifications are referenced

**Skip when:**

- Backend-only changes
- No Figma URLs in artifacts
- Figma MCP not available (graceful degradation)

#### Detection Phase

##### 1. Scan Source Artifacts

Check these locations for Figma URLs:

- PBI `## Design Reference` section
- Design spec `figma_file:` and `figma_nodes:` frontmatter
- Feature doc (if design reference exists in any section)

##### 2. Parse URLs

Extract from each URL:

- `file_key`: Figma file identifier
- `node_id`: Specific frame/component (URL format: `1-3`)
- Convert to API format: `1-3` → `1:3`

**URL Pattern:**

```
https://figma.com/design/{file_key}/{name}?node-id={node_id}
```

#### Extraction Phase

##### 1. Check MCP Availability

```
If Figma MCP available:
  → Proceed with extraction
Else:
  → Log: "Figma MCP not configured, skipping design extraction"
  → Continue with URL references only
```

##### 2. Call MCP for Each Node

Prefer specific nodes over full files:

```
For each {file_key, node_id} pair:
  If node_id exists:
    Call: mcp__figma__get_file_nodes(file_key, [node_id])
  Else:
    Skip file-level extraction (too expensive)
```

##### 3. Extract Key Information

From response, extract:

| Property       | Source Field                            |
| -------------- | --------------------------------------- |
| **Structure**  | `children[].name`, `children[].type`    |
| **Layout**     | `layoutMode`, `itemSpacing`, `padding*` |
| **Dimensions** | `absoluteBoundingBox.width/height`      |
| **Colors**     | `fills[].color` (r,g,b,a → rgba)        |
| **Typography** | `style.fontFamily/fontSize/fontWeight`  |

##### 4. Token Budget Enforcement

| Response Size | Action                                |
| ------------- | ------------------------------------- |
| <2K tokens    | Use full response                     |
| 2K-5K tokens  | Summarize to key properties           |
| >5K tokens    | Extract only critical info, warn user |

#### Integration Phase

##### 1. Add to Plan Context

Include in plan.md overview:

```markdown
## Design Context

Design specifications extracted from Figma:

| Component | Figma Node         | Key Specs              |
| --------- | ------------------ | ---------------------- |
| {name}    | [{node_id}]({url}) | {dimensions}, {layout} |

### Extracted Specifications

{Formatted design context from extraction}
```

##### 2. Reference in Implementation Phases

For frontend phases, include:

```markdown
## Design Specifications

From Figma node `{node_id}`:

### Layout

- Direction: {Horizontal/Vertical}
- Gap: {spacing}px
- Padding: {T/R/B/L}px

### Visual

- Background: {color} → map to `--color-bg-*`
- Border: {width}px {color} → map to `--border-*`

### Typography (if text)

- Font: {family} → map to `--font-family-*`
- Size: {size}px → map to `--font-size-*`
- Weight: {weight} → map to `--font-weight-*`
```

##### 3. Design Token Mapping

Map extracted values to existing tokens:

| Figma Value    | Design Token         | Notes            |
| -------------- | -------------------- | ---------------- |
| #FFFFFF        | `--color-bg-primary` | Exact match      |
| 16px           | `--spacing-md`       | Standard spacing |
| Inter 400 14px | `--font-body`        | Body text        |

Reference: `docs/project-reference/design-system/design-tokens.scss` for available tokens.

#### Fallback Behavior

When extraction fails:

1. **MCP Not Available:**
    - Log warning
    - Note in plan: "Design context not extracted (MCP unavailable)"
    - Continue with URL references only

2. **Node Not Found:**
    - Try parent node
    - Note which nodes failed
    - Continue with available data

3. **Rate Limited:**
    - Extract first 3 nodes only
    - Note in plan which nodes were skipped

4. **Token Budget Exceeded:**
    - Summarize aggressively
    - Include only dimensions, colors, layout
    - Link to full Figma for details

#### Figma Output Template

```markdown
## Figma Design Context

> Extracted via Figma MCP on {date}

### Source Designs

| Design | Node          | Status    |
| ------ | ------------- | --------- |
| {name} | [{id}]({url}) | Extracted |

### {Component Name}

**Node:** `{node_id}`
**Type:** {Frame/Component/Group}
**Dimensions:** {width} x {height}px

#### Layout

- Direction: {layoutMode}
- Gap: {itemSpacing}px
- Padding: {paddingTop}/{paddingRight}/{paddingBottom}/{paddingLeft}px

#### Visual

| Property      | Value            | Token Mapping       |
| ------------- | ---------------- | ------------------- |
| Background    | {fill color}     | `--color-*`         |
| Border        | {stroke}         | `--border-*`        |
| Corner Radius | {cornerRadius}px | `--border-radius-*` |

#### Children

- {child1}: {type}
- {child2}: {type}
```

#### No Design Context Template

When no Figma URLs present:

```markdown
## Design Context

No Figma designs referenced. If UI changes are needed:

1. Add Figma links to source PBI `## Design Reference` section
2. Re-run planning to extract design context
```

### 3. Codebase Understanding (**Skip if:** Provided with scout reports)

> _Content sourced from `references/codebase-understanding.md`_

#### Core Activities

##### Parallel Scout Agents

- Use `$scout-ext` (preferred) or `$scout` (fallback) slash command to search the codebase for files needed to complete the task
- Each scout locates files needed for specific task aspects
- Wait for all scout agents to report back before analysis
- Efficient for finding relevant code across large codebases

##### Essential Documentation Review

ALWAYS read these files first:

1. **`./.claude/docs/development-rules.md`** (IMPORTANT)
    - File Name Conventions
    - File Size Management
    - Development rules and best practices
    - Code quality standards
    - Security guidelines

2. **`./docs/project-reference/backend-patterns-reference.md`** + **`./docs/project-reference/frontend-patterns-reference.md`**
    - Backend: CQRS, repositories, entities, validation, message bus
    - Frontend: component base classes, state management, API services
    - Naming conventions and coding standards

3. **`./docs/project-reference/project-structure-reference.md`**
    - Service architecture, ports, directory tree
    - Tech stack and module codes

4. **`./docs/design-guidelines.md`** (if exists)
    - Design system guidelines
    - Branding and UI/UX conventions
    - Component library usage

##### Environment Analysis

- Review development environment setup
- Analyze dotenv files and configuration
- Identify required dependencies
- Understand build and deployment processes

##### Pattern Recognition

- Study existing patterns in codebase
- Identify conventions and architectural decisions
- Note consistency in implementation approaches
- Understand error handling patterns

##### Integration Planning

- Identify how new features integrate with existing architecture
- Map dependencies between components
- Understand data flow and state management
- Consider backward compatibility

#### Codebase Understanding Best Practices

- Start with documentation before diving into code
- Use scouts for targeted file discovery
- Document patterns found for consistency
- Note any inconsistencies or technical debt
- Consider impact on existing features

### 4. Solution Design

> _Content sourced from `references/solution-design.md`_

#### Core Principles

- **YAGNI** (You Aren't Gonna Need It) - Don't add functionality until necessary
- **KISS** (Keep It Simple, Stupid) - Prefer simple solutions over complex ones
- **DRY** (Don't Repeat Yourself) - Avoid code duplication

#### Design Activities

##### Technical Trade-off Analysis

- Evaluate multiple approaches for each requirement
- Compare pros and cons of different solutions
- Consider short-term vs long-term implications
- Balance complexity with maintainability
- Assess development effort vs benefit
- Recommend optimal solution based on current best practices

##### Security Assessment

- Identify potential vulnerabilities during design phase
- Consider authentication and authorization requirements
- Assess data protection needs
- Evaluate input validation requirements
- Plan for secure configuration management
- Address OWASP Top 10 concerns
- Consider API security (rate limiting, CORS, etc.)

##### Performance and Scalability

- Identify potential bottlenecks early
- Consider database query optimization needs
- Plan for caching strategies
- Assess resource usage (memory, CPU, network)
- Design for horizontal/vertical scaling
- Plan for load distribution
- Consider asynchronous processing where appropriate

##### Edge Cases and Failure Modes

- Think through error scenarios
- Plan for network failures
- Consider partial failure handling
- Design retry and fallback mechanisms
- Plan for data consistency
- Consider race conditions
- Design for graceful degradation

##### Architecture Design

- Create scalable system architectures
- Design for maintainability
- Plan component interactions
- Design data flow
- Consider microservices vs monolith trade-offs
- Plan API contracts
- Design state management

#### Frontend Solution Design

When designing frontend solutions with Figma context:

##### Design Context Integration

1. **Check for Figma Context**
    - Review extracted design specifications
    - Verify dimensions and spacing match design system
    - Note any custom values needing tokens

2. **Component Structure**
    - Match Figma hierarchy to Angular component tree
    - Identify reusable components
    - Map to existing shared library components

3. **Token Mapping**
    - Map Figma colors to design tokens
    - Verify spacing uses standard tokens
    - Flag any values needing new tokens

4. **Responsive Considerations**
    - Check if Figma shows breakpoint variants
    - Plan responsive behavior for unlisted breakpoints
    - Note any mobile-specific layouts

#### Solution Design Best Practices

- Document design decisions and rationale
- Consider both technical and business requirements
- Think through the entire user journey
- Plan for monitoring and observability
- Design with testing in mind
- Consider deployment and rollback strategies

### 5. Plan Creation and Organization

> _Content sourced from `references/plan-organization.md`_

#### Directory Structure

##### Plan Location

Use `Plan dir:` from `## Naming` section injected by hooks. This is the full computed path.

**Example:** `plans/251101-1505-authentication/` or `ai_docs/feature/MRR-1453/`

##### File Organization

```
{plan-dir}/                                    # From `Plan dir:` in ## Naming
├── research/
│   ├── researcher-XX-report.md
│   └── ...
├── reports/
│   ├── scout-report.md
│   ├── researcher-report.md
│   └── ...
├── plan.md                                    # Overview access point
├── phase-01-setup-environment.md              # Setup environment
├── phase-02-implement-database.md             # Database models
├── phase-03-implement-api-endpoints.md        # API endpoints
├── phase-04-implement-ui-components.md        # UI components
├── phase-05-implement-authentication.md       # Auth & authorization
├── phase-06-implement-profile.md              # Profile page
└── phase-07-write-tests.md                    # Tests
```

##### Active Plan State Tracking

Check the `## Plan Context` section injected by hooks:

- **"Plan: {path}"** = Active plan - use for reports
- **"Suggested: {path}"** = Branch-matched, hint only - do NOT auto-use
- **"Plan: none"** = No active plan

**Pre-Creation Check:**

1. If "Plan:" shows a path → ask "Continue with existing plan? [Y/n]"
2. If "Suggested:" shows a path → inform user (hint only, do NOT auto-use)
3. If "Plan: none" → create new plan using naming from `## Naming` section

**After Creating Plan:**

```bash
# Update session state so subagents get the new plan context:
node .claude/scripts/set-active-plan.cjs {plan-dir}
```

**Report Output Rules:**

1. Use `Report:` and `Plan dir:` from `## Naming` section
2. Active plans use plan-specific reports path
3. Suggested plans use default reports path to prevent old plan pollution

#### Plan File Structure

##### Overview Plan (plan.md)

**IMPORTANT:** All plan.md files MUST ATTENTION include YAML frontmatter. See output standards below for schema.

**Example plan.md structure:**

```markdown
---
title: 'Feature Implementation Plan'
description: 'Add user authentication with OAuth2 support'
status: pending
priority: P1
effort: 8h
story_points: 8
complexity: High
man_days_traditional: '6d (4d code + 2d test)'
man_days_ai: '3d (2d code + 1d test)'
issue: 123
branch: kai/feat/oauth-auth
tags: [auth, backend, security]
created: 2025-12-16
---

# Feature Implementation Plan

## Overview

Brief description of what this plan accomplishes.

## Phases

| #   | Phase          | Status  | Effort | SP  | Link                            |
| --- | -------------- | ------- | ------ | --- | ------------------------------- |
| 1   | Setup          | Pending | 2h     | 3   | [phase-01](./phase-01-setup.md) |
| 2   | Implementation | Pending | 4h     | 5   | [phase-02](./phase-02-impl.md)  |
| 3   | Testing        | Pending | 2h     | 3   | [phase-03](./phase-03-test.md)  |

## Dependencies

- List key dependencies here
```

**Guidelines:**

- Keep generic and under 80 lines
- List each phase with status/progress
- Link to detailed phase files
- Key dependencies

##### Phase Files (phase-XX-name.md)

Fully respect the `./.claude/docs/development-rules.md` file.
Each phase file should contain:

###### Context Links

- Links to related reports, files, documentation

###### Phase Overview

- Priority
- Current status
- Brief description

###### Key Insights

- Important findings from research
- Critical considerations

###### Requirements

- Functional requirements
- Non-functional requirements

###### Architecture

- System design
- Component interactions
- Data flow

###### Related Code Files

- List of files to modify
- List of files to create
- List of files to delete

###### Implementation Steps

- Detailed, numbered steps
- Specific instructions

###### Todo List

- Checkbox list for tracking

###### Success Criteria

- Definition of done
- Validation methods

###### Risk Assessment

- Potential issues
- Mitigation strategies

###### Security Considerations

- Auth/authorization
- Data protection

###### Test Specifications

| TC ID           | Requirement                   | Priority | Evidence           |
| --------------- | ----------------------------- | -------- | ------------------ |
| TC-{FEAT}-{NNN} | {requirement from this phase} | P0-P3    | {file:line} or TBD |

Coverage: {X}/{Y} requirements mapped to TCs

###### Next Steps

- Dependencies
- Follow-up tasks

### 6. Task Breakdown and Output Standards

> _Content sourced from `references/output-standards.md`_

#### Plan File Format

##### YAML Frontmatter (Required for plan.md)

All `plan.md` files MUST ATTENTION include YAML frontmatter at the top:

```yaml
---
title: '{Brief plan title}'
description: '{One-sentence summary for card preview}'
status: pending # pending | in-progress | completed | cancelled
priority: P2 # P1 (High) | P2 (Medium) | P3 (Low)
effort: 4h # Estimated total effort
issue: 74 # GitHub issue number (if applicable)
branch: kai/feat/feature-name
tags: [frontend, api] # Category tags
created: 2025-12-16
---
```

##### Auto-Population Rules

When creating plans, auto-populate these fields:

- **title**: Extract from task description
- **description**: First sentence of Overview section
- **status**: Always `pending` for new plans
- **priority**: From user request or default `P2`
- **effort**: Sum of phase estimates
- **issue**: Parse from branch name or context
- **branch**: Current git branch (`git branch --show-current`)
- **tags**: Infer from task keywords (e.g., frontend, backend, api, auth)
- **created**: Today's date in YYYY-MM-DD format

##### Tag Vocabulary (Recommended)

Use these predefined tags for consistency:

- **Type**: `feature`, `bugfix`, `refactor`, `docs`, `infra`
- **Domain**: `frontend`, `backend`, `database`, `api`, `auth`
- **Scope**: `critical`, `tech-debt`, `experimental`

#### Task Breakdown Rules

- Transform complex requirements into manageable, actionable tasks
- Each task independently executable with clear dependencies
- Prioritize by dependencies, risk, business value
- Eliminate ambiguity in instructions
- Include specific file paths for all modifications
- Provide clear acceptance criteria per task

##### File Management

List affected files with:

- Full paths (not relative)
- Action type (modify/create/delete)
- Brief change description
- Dependencies on other changes
- Fully respect the `./.claude/docs/development-rules.md` file.

#### Output Workflow Process

1. **Initial Analysis** → Read docs, understand context
2. **Research Phase** → Spawn researchers in parallel, investigate approaches
3. **Synthesis** → Analyze reports, identify optimal solution
4. **Design Phase** → Create architecture, implementation design
5. **Plan Documentation** → Write comprehensive plan in Markdown
6. **Review & Refine** → Ensure completeness, clarity, actionability

#### Output Requirements

##### What Planners Do

- Create plans ONLY (no implementation)
- Provide plan file path and summary
- Self-contained plans with necessary context
- Code snippets/pseudocode when clarifying
- Multiple options with trade-offs when appropriate
- Fully respect the `./.claude/docs/development-rules.md` file.

##### Writing Style

**IMPORTANT:** Sacrifice grammar for concision

- Focus clarity over eloquence
- Use bullets and lists
- Short sentences
- Remove unnecessary words
- Prioritize actionable info

##### Unresolved Questions

**IMPORTANT:** List unresolved questions at end

- Questions needing clarification
- Technical decisions requiring input
- Unknowns impacting implementation
- Trade-offs requiring business decisions

#### Design Context for UI Phases

If Figma designs were extracted, include in phase files:

```markdown
## Design Specifications

> From Figma: [{component_name}]({figma_url})

### Layout

{Extracted layout specifications}

### Visual Styling

| Property | Figma Value | Token          |
| -------- | ----------- | -------------- |
| {prop}   | {value}     | `--token-name` |

### Implementation Notes

- {Note about design-to-code mapping}
- {Any deviations from design system}
```

When no Figma context:

- Omit section or note "No design specifications provided"

#### Output Quality Standards

##### Thoroughness

- Thorough and specific in research/planning
- Consider edge cases, failure modes
- Think through entire user journey
- Document all assumptions

##### Maintainability

- Consider long-term maintainability
- Design for future modifications
- Document decision rationale
- Avoid over-engineering
- Fully respect the `./.claude/docs/development-rules.md` file.

##### Research Depth

- When uncertain, research more
- Multiple options with clear trade-offs
- Validate against best practices
- Consider industry standards

##### Security and Performance

- Address all security concerns
- Identify performance implications
- Plan for scalability
- Consider resource constraints

##### Implementability

- Detailed enough for junior developers
- Validate against existing patterns
- Ensure codebase standards consistency
- Provide clear examples

**Remember:** Plan quality determines implementation success. Be comprehensive, consider all solution aspects.

## Workflow Process

1. **Initial Analysis** → Read codebase docs, understand context
2. **Design Context** → Extract Figma design specs (if URLs present)
3. **Research Phase** → Spawn researchers, investigate approaches
4. **Synthesis** → Analyze reports, identify optimal solution
5. **Design Phase** → Create architecture, implementation design
6. **Plan Documentation** → Write comprehensive plan (include design context)
7. **Review & Refine** → Ensure completeness, clarity, actionability

## Top-Level Output Requirements

- DO NOT implement code - only create plans
- Respond with plan file path and summary
- Ensure self-contained plans with necessary context
- Include code snippets/pseudocode when clarifying
- Provide multiple options with trade-offs when appropriate
- Fully respect the `./.claude/docs/development-rules.md` file.

**Plan Directory Structure**

```
plans/
└── {date}-plan-name/
    ├── research/
    │   ├── researcher-XX-report.md
    │   └── ...
    ├── reports/
    │   ├── XX-report.md
    │   └── ...
    ├── scout/
    │   ├── scout-XX-report.md
    │   └── ...
    ├── plan.md
    ├── phase-XX-phase-name-here.md
    └── ...
```

## Active Plan State

Prevents version proliferation by tracking current working plan via session state.

### Active vs Suggested Plans

Check the `## Plan Context` section injected by hooks:

- **"Plan: {path}"** = Active plan, explicitly set via `set-active-plan.cjs` - use for reports
- **"Suggested: {path}"** = Branch-matched, hint only - do NOT auto-use
- **"Plan: none"** = No active plan

### Rules

1. **If "Plan:" shows a path**: Ask "Continue with existing plan? [Y/n]"
2. **If "Suggested:" shows a path**: Inform user, ask if they want to activate or create new
3. **If "Plan: none"**: Create new plan using naming from `## Naming` section
4. **Update on create**: Run `node .claude/scripts/set-active-plan.cjs {plan-dir}`

### Report Output Location

All agents writing reports MUST ATTENTION:

1. Check `## Naming` section injected by hooks for the computed naming pattern
2. Active plans use plan-specific reports path
3. Suggested plans use default reports path (not plan folder)

**Important:** Suggested plans do NOT get plan-specific reports - this prevents pollution of old plan folders.

## Quality Standards

- Be thorough and specific
- Consider long-term maintainability
- Research thoroughly when uncertain
- Address security and performance concerns
- Make plans detailed enough for junior developers
- Validate against existing codebase patterns

**Remember:** Plan quality determines implementation success. Be comprehensive and consider all solution aspects.

## Related

- `feature-implementation`
- `problem-solving`
- `plan-analysis`

---

## **IMPORTANT Task Planning Notes (MUST ATTENTION FOLLOW)**

- Always plan and break work into many small todo tasks using task tracking
- Always add a final review todo task to verify work quality and identify fixes/enhancements
- **MANDATORY FINAL TASKS:** After creating all planning todo tasks, ALWAYS add these three final tasks:
    1. **Task: "Write test specifications for each phase"** — Add `## Test Specifications` with TC-{FEAT}-{NNN} IDs to every phase file. Use `$tdd-spec` if feature docs exist. Use `Evidence: TBD` for TDD-first mode.
    2. **Task: "Run $plan-validate"** — Trigger `$plan-validate` skill to interview the user with critical questions and validate plan assumptions
    3. **Task: "Run $plan-review"** — Trigger `$plan-review` skill to auto-review plan for validity, correctness, and best practices

## Important Notes

**IMPORTANT:** Analyze the skills catalog and activate the skills that are needed for the task during the process.
**IMPORTANT:** Ensure token efficiency while maintaining high quality.
**IMPORTANT:** Sacrifice grammar for the sake of concision when writing reports.
**IMPORTANT:** In reports, list any unresolved questions at the end, if any.

## REMINDER — Planning-Only Skill

> **DO NOT** use manual plan-mode switching tool.
> **DO NOT** start implementing.
> **ALWAYS** validate with `$plan-review` after plan creation.
> **ASK** user to confirm the plan before any implementation begins.
> **ASK** user decision questions with your recommendations when multiple approaches exist.

---

## Post-Plan Granularity Self-Check (MANDATORY)

<!-- SYNC:plan-granularity -->

> **Plan Granularity** — Every phase must pass 5-point check before implementation:
>
> 1. Lists exact file paths to modify (not generic "implement X")
> 2. No planning verbs (research, investigate, analyze, determine, figure out)
> 3. Steps ≤30min each, phase total ≤3h
> 4. ≤5 files per phase
> 5. No open decisions or TBDs in approach
>
> **Failing phases →** create sub-plan. Repeat until ALL leaf phases pass (max depth: 3).
> **Self-question:** "Can I start coding RIGHT NOW? If any step needs 'figuring out' → sub-plan it."

<!-- /SYNC:plan-granularity -->

After creating all phase files, run the **recursive decomposition loop**:

1. Score each phase against the 5-point criteria (file paths, no planning verbs, ≤30min steps, ≤5 files, no open decisions)
2. For each FAILING phase → create task to decompose it into a sub-plan (with its own $plan-hard → $plan-review → $plan-validate → fix cycle)
3. Re-score new phases. Repeat until ALL leaf phases pass (max depth: 3)
4. **Self-question:** "For each phase, can I start coding RIGHT NOW? If any needs 'figuring out' → sub-plan it."

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.

<!-- /SYNC:evidence-based-reasoning:reminder -->
<!-- SYNC:estimation-framework:reminder -->

- **MANDATORY MUST ATTENTION** estimation: bottom-up phase hours drive `man_days_traditional` (`Σh/6 × productivity_factor`); SP DERIVED. UI cost usually dominates — bump SP one bucket if NEW UI surface (page/complex form/dashboard). Frontmatter MUST include `story_points`, `complexity`, `man_days_traditional`, `man_days_ai`, `estimate_scope_included`, `estimate_scope_excluded`, `estimate_reasoning` (UI vs backend cost driver). Cap SP 3 for additive-on-existing-model+existing-UI unless test scope >1.5d. SP 13 SHOULD split, SP 21 MUST split.
      <!-- /SYNC:estimation-framework:reminder -->
      <!-- SYNC:plan-quality:reminder -->

**IMPORTANT MUST ATTENTION** include `## Test Specifications` with TC IDs per phase. Call the current task list before creating new tasks.

<!-- /SYNC:plan-quality:reminder -->
<!-- SYNC:iterative-phase-quality:reminder -->

**IMPORTANT MUST ATTENTION** score complexity first. Score >=6 → decompose. Each phase: plan → implement → review → fix → verify. No skipping.

<!-- /SYNC:iterative-phase-quality:reminder -->
<!-- SYNC:plan-granularity:reminder -->

**IMPORTANT MUST ATTENTION** pass 5-point granularity check: specific files, no planning verbs, <=30min steps, <=5 files, zero TBDs.

<!-- /SYNC:plan-granularity:reminder -->
<!-- SYNC:ai-mistake-prevention -->

**AI Mistake Prevention** — Failure modes to avoid on every task:
**Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
**Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
**Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
**Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
**When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
**Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
**Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
**Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
**Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
**Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
**IMPORTANT MUST ATTENTION** include Test Specifications section and story_points in plan frontmatter
**IMPORTANT MUST ATTENTION** verify all phases pass granularity check
**MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

1. **DETECT:** Match prompt against workflow catalog
2. **ANALYZE:** Find best-match workflow AND evaluate if a custom step combination would fit better
3. **ASK (REQUIRED FORMAT):** Use a direct user question with this structure:
    - Question: "Which workflow do you want to activate?"
    - Option 1: "Activate **[BestMatch Workflow]** (Recommended)"
    - Option 2: "Activate custom workflow: **[step1 → step2 → ...]**" (include one-line rationale)
4. **ACTIVATE (if confirmed):** Call `$workflow-start <workflowId>` for standard; sequence custom steps manually
5. **CREATE TASKS:** task tracking for ALL workflow steps
6. **EXECUTE:** Follow each step in sequence
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.

## Learned Lessons

# Lessons Learned

> **[CRITICAL]** Hard-won project debugging/architecture rules. MUST ATTENTION apply BEFORE forming hypothesis or writing code.

## Quick Summary

**Goal:** Prevent recurrence of known failure patterns — debugging, architecture, naming, AI orchestration, environment.

**Top Rules (apply always):**

- MUST ATTENTION verify ALL preconditions (config, env, DB names, DI regs) BEFORE code-layer hypothesis
- MUST ATTENTION fix responsible layer — NEVER patch symptom sites with caller-specific defensive code
- MUST ATTENTION use `ExecuteInjectScopedAsync` for parallel async + repo/UoW — NEVER `ExecuteUowTask`
- MUST ATTENTION name by PURPOSE not CONTENT — adding member forces rename = abstraction broken
- MUST ATTENTION persist sub-agent findings incrementally after each file — NEVER batch at end
- MUST ATTENTION Windows bash: verify Python alias (`where python`/`where py`) — NEVER assume `python`/`python3` resolves

---

## Debugging & Root Cause Reasoning

- [2026-04-11] **Holistic-first: verify environment before code.** Failure → list ALL preconditions (config, env vars, DB names, endpoints, DI regs, credentials, permissions, data prerequisites) → verify each via evidence (grep/cat/query) BEFORE code-layer hypothesis. Worst rabbit holes: diving nearest layer while bug sits elsewhere — e.g., hours debugging "sync timeout", real cause: test appsettings pointing wrong DB. Cheapest check first.
- [2026-04-01] **Ask "whose responsibility?" before fixing.** Trace: bug in caller (wrong data) or callee (wrong handling)? Fix responsible layer — NEVER patch symptom site masking real issue.
- [2026-04-01] **Trace data lifecycle, not error site.** Follow data: creation → transformation → consumption. Bug usually where data created wrong, not consumed.
- [2026-04-01] **Code is caller-agnostic.** Functions/handlers/consumers don't know who invokes them. Comments/guards/messages describe business intent — NEVER reference specific callers (tests, seeders, scripts).

## Architecture Invariants

- [2026-03-31] **ParallelAsync + repo/UoW MUST use `ExecuteInjectScopedAsync`, NEVER `ExecuteUowTask`.** `ExecuteUowTask` creates new UoW but reuses outer DI scope (same DbContext) — parallel iterations sharing non-thread-safe DbContext silently corrupt data. `ExecuteInjectScopedAsync` creates new UoW + new DI scope (fresh repo per iteration).
- [2026-03-31] **Bus message naming MUST include service name prefix — core services NEVER consume feature events.** Prefix declares schema ownership (`AccountUserEntityEventBusMessage` = Accounts owns). Core services (Accounts, Communication) are leaders. Feature services (Growth, Talents) sending to core MUST use `{CoreServiceName}...RequestBusMessage` — never define own event for core to consume.

## Naming & Abstraction

- [2026-04-12] **Name PURPOSE not CONTENT — "OrXxx" anti-pattern.** `HrManagerOrHrOrPayrollHrOperationsPolicy` names set members, not what it guards. Add role → rename = broken abstraction. **Rule:** names express DOES/GUARDS, not CONTAINS. **Test:** adding/removing member forces rename? YES = content-driven = bad → rename to purpose (e.g., `HrOperationsAccessPolicy`). **Nuance:** "Or" fine in behavioral idioms (`FirstOrDefault`, `SuccessOrThrow`) — expresses HAPPENS, not membership.

## Environment & Tooling

- [2026-04-20] **Windows bash: NEVER assume `python`/`python3` resolves — verify alias first.** Python may not be in bash PATH under those names. Check: `where python` / `where py`. Prefer `py` (Windows Python Launcher) for one-liners, `node` if JS alternative exists.

> Test-specific lessons → `docs/project-reference/integration-test-reference.md` Lessons Learned section. Production-code anti-patterns → `docs/project-reference/backend-patterns-reference.md` Anti-Patterns section. Generic debugging/refactoring reminders → System Lessons in `.claude/hooks/lib/prompt-injections.cjs`.

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** holistic-first: verify ALL preconditions (config, env, DB names, endpoints, DI regs) BEFORE code-layer hypothesis — cheapest check first
- **IMPORTANT MUST ATTENTION** fix responsible layer — NEVER patch symptom site; trace caller (wrong data) vs callee (wrong handling), fix root owner
- **IMPORTANT MUST ATTENTION** parallel async + repo/UoW → ALWAYS `ExecuteInjectScopedAsync`, NEVER `ExecuteUowTask` (shared DbContext = silent data corruption)
- **IMPORTANT MUST ATTENTION** bus message prefix = schema ownership; feature services NEVER define events for core services — use `{CoreServiceName}...RequestBusMessage`
- **IMPORTANT MUST ATTENTION** name by PURPOSE — adding/removing member forces rename = broken abstraction
- **IMPORTANT MUST ATTENTION** sub-agents MUST write findings after each file/section — NEVER batch all findings into one final write
- **IMPORTANT MUST ATTENTION** Windows bash: NEVER assume `python`/`python3` resolves — run `where python`/`where py` first, use `py` launcher or `node`

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`/simplify`/`$security`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
