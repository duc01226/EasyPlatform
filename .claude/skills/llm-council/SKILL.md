---
name: llm-council
description: '[Decision Support] Use when pressure-testing irreversible, high-stakes decisions with adversarial AI advisors.'
---

> **[IMPORTANT]** MUST ATTENTION use council only for multi-option, hard-to-reverse, high-stakes decisions. NEVER council trivial, factual, reversible, or single-option questions.
> **[IMPORTANT]** MUST ATTENTION spawn 5 advisors in parallel, then 5 fresh peer reviewers in parallel, then chairman synthesis.
> **[IMPORTANT]** MUST ATTENTION require evidence for code/architecture claims: `file:line`, graph trace, or explicit "insufficient evidence."

# LLM Council

## Quick Summary

**Goal:** Adversarial decision support for costly wrong choices. Five advisors analyze independently, five fresh reviewers critique anonymously, chairman produces final verdict + report artifacts.

**Workflow:** Gate → Frame → 5 parallel advisors → anonymized 5-reviewer peer review → chairman synthesis → paired HTML/MD reports.

**Key Rules:**

- MUST ATTENTION use cheaper ladder first: `/why-review` → `/plan-validate` → `/llm-council`.
- MUST ATTENTION graph-trace code/architecture questions when `.code-graph/graph.db` exists.
- NEVER let earlier advisor responses bleed into later advisors; parallel spawn required.
- ALWAYS mark verdict degraded if fewer than 5 usable advisor responses return.
- ALWAYS regenerate mirrors with `/sync-codex` after editing this skill — NEVER hand-edit `.agents/` or `.codex/` (they are generated artifacts).

---

## Phase 0: Council Gate

Run before advisors.

| Gate              | Required                                                                 | Route if false                          |
| ----------------- | ------------------------------------------------------------------------ | --------------------------------------- |
| Multi-option      | >=2 viable paths                                                         | Single-option rationale → `/why-review` |
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

Opt-in escalation hook from host skills. NEVER wire into `workflow-bugfix`, `workflow-refactor`, or `test-*` workflows. Blacklist is enforced at the `why-review` gate (Step A — workflow context check) before the 8-OR frontmatter gate evaluates.

| Host skill            | Mode                                       | Default                  | Gate                                                             |
| --------------------- | ------------------------------------------ | ------------------------ | ---------------------------------------------------------------- |
| `architecture-design` | Always-offer after `## Next Steps`         | Skip                     | User chooses                                                     |
| `tech-stack-research` | Always-offer after `## Next Steps`         | Skip                     | User chooses                                                     |
| `domain-analysis`     | Always-offer after `## Next Steps`         | Skip                     | User chooses                                                     |
| `why-review`          | Conditional on active plan/PBI frontmatter | Escalate when gate fires | Step A workflow blacklist suppression THEN 8-OR frontmatter gate |
| `prioritize`          | Conditional on ranking output              | Escalate when gate fires | RICE top-2 within 15%, MoSCoW tie, or stakeholder disagreement   |

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

Host prompt copy MUST cite cheaper rungs: `/why-review`, `/plan-validate`, `/llm-council`.

---

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

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

## Closing Reminders

**IMPORTANT MUST ATTENTION** use council only for multi-option, hard-to-reverse, high-stakes decisions.

**Protocols in force — MUST ATTENTION (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** apply critical + sequential thinking; traced `file:line` proof, confidence >80% to act.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**IMPORTANT MUST ATTENTION** spawn 5 advisors in parallel, then 5 fresh peer reviewers in parallel, then chairman synthesis.
**IMPORTANT MUST ATTENTION** require evidence for code/architecture claims: `file:line`, graph trace, or explicit "insufficient evidence."
**IMPORTANT MUST ATTENTION** mark verdict degraded if fewer than 5 usable advisor responses return.
**IMPORTANT MUST ATTENTION** write paired HTML + Markdown artifacts under `plans/reports/` and open HTML.
**IMPORTANT MUST ATTENTION** after editing this skill, run `/sync-codex` to regenerate mirrors — NEVER hand-edit `.agents/` or `.codex/` (generated).

**Anti-Rationalization:**

| Evasion                         | Rebuttal                                                                                                 |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| "This decision feels important" | Gate it: multi-option, hard-to-reverse, real stakes, multi-angle value.                                  |
| "One advisor can handle it"     | Council value comes from independent angles + anonymous peer review.                                     |
| "Sequential spawn is simpler"   | Sequential spawn contaminates independence. Parallel spawn required.                                     |
| "Four advisors is close enough" | Missing angle changes verdict quality. Mark degraded.                                                    |
| "Evidence would slow us down"   | Unsupported code/architecture claims are speculation. Use graph/file proof or say insufficient evidence. |

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->
