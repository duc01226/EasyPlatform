---
name: llm-council
description: '[Decision Support] Use when pressure-testing irreversible, high-stakes decisions with adversarial AI advisors.'
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

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec/test-case planning or TC mapping: `feature-docs-reference.md`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

> **[IMPORTANT]** MUST ATTENTION use council only for multi-option, hard-to-reverse, high-stakes decisions. NEVER council trivial, factual, reversible, or single-option questions.
> **[IMPORTANT]** MUST ATTENTION spawn 5 advisors in parallel, then 5 fresh peer reviewers in parallel, then chairman synthesis.
> **[IMPORTANT]** MUST ATTENTION require evidence for code/architecture claims: `file:line`, graph trace, or explicit "insufficient evidence."

# LLM Council

## Quick Summary

**Goal:** Adversarial decision support for costly wrong choices. Five advisors analyze independently, five fresh reviewers critique anonymously, chairman produces final verdict + report artifacts.

**Workflow:** Gate → Frame → 5 parallel advisors → anonymized 5-reviewer peer review → chairman synthesis → paired HTML/MD reports.

**Key Rules:**

- MUST ATTENTION use cheaper ladder first: `$why-review` → `$plan-validate` → `$llm-council`.
- MUST ATTENTION graph-trace code/architecture questions when `.code-graph/graph.db` exists.
- NEVER let earlier advisor responses bleed into later advisors; parallel spawn required.
- ALWAYS mark verdict degraded if fewer than 5 usable advisor responses return.
- ALWAYS sync edits to `.agents/skills/llm-council/SKILL.md`.

---

## Phase 0: Council Gate

Run before advisors.

| Gate              | Required                                                                 | Route if false                          |
| ----------------- | ------------------------------------------------------------------------ | --------------------------------------- |
| Multi-option      | >=2 viable paths                                                         | Single-option rationale → `$why-review` |
| Hard to reverse   | Architecture, stack, pricing, hiring, irreversible refactor              | Reversible choice → answer directly     |
| Real stakes       | Wrong call costs >=1 week, money, trust, or strategic position           | Low stakes → answer directly            |
| Multi-angle value | Contrarian/first-principles/upside/outside/execution views change answer | Factual/single-domain → answer directly |

If any gate fails, state failed gate + lighter route. NEVER council "should I use markdown."

Good prompts: pricing model, positioning angle, pivot, hiring vs automation, architecture bet, high-risk launch, irreversible refactor.
Bad prompts: factual lookup, simple yes/no, content generation, summarization, bugfix, package upgrade, routine refactor, anything decidable with one grep.

---

## Advisor Dimensions

Each advisor = thinking dimension, not persona costume. One strong angle each.

| Advisor                  | Think                                                           |
| ------------------------ | --------------------------------------------------------------- |
| Contrarian               | What fails? What assumption kills plan?                         |
| First Principles Thinker | What problem are we solving? Which assumptions need rebuild?    |
| Expansionist             | What upside, adjacent opportunity, undervalued path is missing? |
| Outsider                 | What confuses someone with no context? What jargon hides value? |
| Executor                 | What can happen Monday morning? Fastest validated path?         |

Tensions: Contrarian vs Expansionist, First Principles vs Executor, Outsider grounds both.

---

## Step 1: Frame Question

When user says "council this", enrich then frame.

**Context discovery budget:** <=30 seconds; read 2-3 high-signal files.

**Search order:** `CLAUDE.md` / `AGENTS.md`; `docs/project-config.json`; `docs/project-reference/project-structure-reference.md`; matching `docs/project-reference/*{domain-entities,backend-patterns,frontend-patterns,code-review-rules}*`; `docs/specs/`; `memory/`; user-referenced files; `plans/reports/council-*`; domain data (pricing -> revenue, architecture -> service map, tech stack -> dependencies).

**Code/architecture gate:** If question references existing code, services, files, or blast radius, run before framing:

```bash
python .claude/scripts/code_graph trace <key-file> --direction both --json
```

Skip graph only when `.code-graph/graph.db` missing or question is non-code.

**Framed question includes:** core decision, user context, workspace evidence, stakes, constraints, known unknowns. Keep the framing neutral and opinion-free. Ask exactly one clarifying question only if prompt is too vague.

---

## Step 2: Advisor Round

Spawn all 5 advisors simultaneously. Each gets identity, framed question, evidence rules, output constraints.

```text
You are [Advisor Name] on an LLM Council.
Thinking style: [advisor dimension from table]

Question:
---
[framed question]
---

EVIDENCE RULES:
- Code/architecture claims require `file:line`, graph trace, or "I don't have enough evidence yet."
- If existing code context is needed, run:
  python .claude/scripts/code_graph trace <file> --direction both --json
  python .claude/scripts/code_graph connections <file> --json
- Cite trace output for blast radius, callers, downstream impact.
- Confidence: 95-100% full trace | 80-94% main paths | 60-79% partial | <60% do not recommend.
- Do NOT speculate. Name missing evidence instead.

Respond from assigned angle. Direct, specific, unbalanced by design. Other advisors cover other angles.
Length: 150-300 words plus one-line confidence declaration. No preamble.
```

---

## Step 3: Peer Review Round

Collect responses. Randomize/anonymize as Response A-E. Spawn 5 fresh reviewers in parallel.

```text
You are reviewing an LLM Council.

Question:
---
[framed question]
---

Anonymized responses:
**Response A:** [response]
**Response B:** [response]
**Response C:** [response]
**Response D:** [response]
**Response E:** [response]

Answer:
1. Strongest response? Why?
2. Biggest blind spot? What is missing?
3. What did all five miss?

Reference responses by letter. Be specific. Under 200 words.
```

---

## Step 4: Chairman Synthesis

Chairman receives original question, framed question, de-anonymized advisor responses, peer reviews, anonymization map.

```text
You are Chairman of an LLM Council. Synthesize 5 advisors + peer reviews into final verdict.

Question:
---
[framed question]
---

ADVISOR RESPONSES:
**Contrarian:** [response]
**First Principles Thinker:** [response]
**Expansionist:** [response]
**Outsider:** [response]
**Executor:** [response]

PEER REVIEWS:
[all peer reviews]

Produce exact structure:
## Where the Council Agrees
[Independent convergences; high-confidence signals.]
## Where the Council Clashes
[Genuine disagreements. Present both sides; explain why reasonable advisors disagree.]
## Blind Spots the Council Caught
[Only emerged through peer review.]
## The Recommendation
[Clear direct recommendation. Not "it depends."]
## The One Thing to Do First
[Single concrete next step.]

Be direct. Do not hedge. Give clarity unavailable from one perspective.
```

**Quality loop:** If chairman misses required sections, ignores degraded-quality state, or makes unsupported code claims, repair with fresh chairman prompt. Max 3 repair rounds; then escalate with missing evidence.

---

## Step 5: Report Artifacts

Write both files; create `plans/reports/` if missing.

```text
plans/reports/council-{YYMMDD-HHMM}-{kebab-slug}.html
plans/reports/council-{YYMMDD-HHMM}-{kebab-slug}.md
```

`{YYMMDD-HHMM}` = session datetime. `{kebab-slug}` = 3-6 word question descriptor. Both share prefix. NEVER write artifacts to workspace root or `docs/`.

**HTML:** self-contained inline CSS, question top, prominent chairman verdict, agreement/disagreement visual, collapsed advisor responses, collapsed peer review highlights, footer timestamp/topic, professional briefing style, open after generation.

**Markdown transcript:** original question, framed question, all advisor responses, all peer reviews, anonymization mapping, chairman synthesis.

---

## Output Format

```text
Council complete.

Report: plans/reports/council-{YYMMDD-HHMM}-{kebab-slug}.html
Transcript: plans/reports/council-{YYMMDD-HHMM}-{kebab-slug}.md

Verdict: [1-2 sentence chairman recommendation]
First action: [single next step]
```

---

## Workflow Integration

Opt-in escalation hook from host skills. NEVER wire into `bugfix`, `refactor`, `migration`, `package-upgrade`, `performance`, `verification`, or `test-*` workflows. Blacklist is enforced at the `why-review` gate (Step A — workflow context check) before the 8-OR frontmatter gate evaluates.

| Host skill                       | Mode                                       | Default                  | Gate                                                             |
| -------------------------------- | ------------------------------------------ | ------------------------ | ---------------------------------------------------------------- |
| `architecture-design`            | Always-offer after `## Next Steps`         | Skip                     | User chooses                                                     |
| `tech-stack-research`            | Always-offer after `## Next Steps`         | Skip                     | User chooses                                                     |
| `domain-analysis`                | Always-offer after `## Next Steps`         | Skip                     | User chooses                                                     |
| `arch-cross-service-integration` | Always-offer after `## Next Steps`         | Skip                     | User chooses                                                     |
| `why-review`                     | Conditional on active plan/PBI frontmatter | Escalate when gate fires | Step A workflow blacklist suppression THEN 8-OR frontmatter gate |
| `prioritize`                     | Conditional on ranking output              | Escalate when gate fires | RICE top-2 within 15%, MoSCoW tie, or stakeholder disagreement   |

### `why-review` Gate Schema

Gate fires when ANY field true. Absent fields default no-fire; gate opt-in via frontmatter, never opt-out.

| Field                  | Convention                             | Fires when                                  |
| ---------------------- | -------------------------------------- | ------------------------------------------- |
| `cross_service_impact` | `NONE` / `PARTIAL` / `FULL`            | value != `NONE`                             |
| `breaking_changes`     | bool                                   | true                                        |
| `complexity`           | `low` / `medium` / `high` / `critical` | `high`, `critical`, or `story_points >= 13` |
| `new_framework`        | bool                                   | true                                        |
| `irreversible`         | bool                                   | true                                        |
| `security_critical`    | bool                                   | true                                        |
| `performance_critical` | bool                                   | true                                        |
| `cost_high`            | bool                                   | true                                        |

Host prompt copy MUST cite cheaper rungs: `$why-review`, `$plan-validate`, `$llm-council`.

---

## Closing Reminders

**IMPORTANT MUST ATTENTION** use council only for multi-option, hard-to-reverse, high-stakes decisions.
**IMPORTANT MUST ATTENTION** spawn 5 advisors in parallel, then 5 fresh peer reviewers in parallel, then chairman synthesis.
**IMPORTANT MUST ATTENTION** require evidence for code/architecture claims: `file:line`, graph trace, or explicit "insufficient evidence."
**IMPORTANT MUST ATTENTION** mark verdict degraded if fewer than 5 usable advisor responses return.
**IMPORTANT MUST ATTENTION** write paired HTML + Markdown artifacts under `plans/reports/` and open HTML.
**IMPORTANT MUST ATTENTION** sync every canonical edit to `.agents/skills/llm-council/SKILL.md`.

**Anti-Rationalization:**

| Evasion                         | Rebuttal                                                                                                 |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| "This decision feels important" | Gate it: multi-option, hard-to-reverse, real stakes, multi-angle value.                                  |
| "One advisor can handle it"     | Council value comes from independent angles + anonymous peer review.                                     |
| "Sequential spawn is simpler"   | Sequential spawn contaminates independence. Parallel spawn required.                                     |
| "Four advisors is close enough" | Missing angle changes verdict quality. Mark degraded.                                                    |
| "Evidence would slow us down"   | Unsupported code/architecture claims are speculation. Use graph/file proof or say insufficient evidence. |

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** Match prompt against workflow catalog
2. **ANALYZE:** Find best-match workflow AND evaluate if a custom step combination would fit better
3. **ASK (REQUIRED FORMAT):** Use a direct user question with this structure unless the user explicitly invoked a workflow/skill and the local protocol treats explicit invocation as confirmation:
    - Question: "Which workflow do you want to activate?"
    - Option 1: "Activate **[BestMatch Workflow]** (Recommended)"
    - Option 2: "Activate custom workflow: **[step1 → step2 → ...]**" (include one-line rationale)
4. **ACTIVATE (if confirmed):** Call `$workflow-start <workflowId>` for standard; sequence custom steps manually
5. **CREATE TASKS:** task tracking for ALL workflow steps
6. **EXECUTE:** Follow each step in sequence
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
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
