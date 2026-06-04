---
name: deep-research
version: 1.0.0
description: '[Research] Use when deeply researching top sources from web-research.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Deep-dive into top sources to produce a cross-validated, source-cited evidence base (`_evidence-{slug}.md`) where every finding carries a confidence score, traces to specific sources, and flags discrepancies — never an unverified single-source claim presented as fact.

**Summary:**

- This skill is the deep-dive stage that consumes the prior web-research source map (`.claude/tmp/_sources-{slug}.md`) and turns prioritized Tier 1-2 sources into structured findings — it is not a fresh search.
- Discipline is everything: cap WebFetch at 8 calls, prioritize authoritative sources covering gaps, and capture date/author/methodology per source so confidence can be defended later.
- Cross-validation drives the confidence score — agreement across 2+ sources is high confidence, disagreement is flagged as a discrepancy with both positions, and a lone source is explicitly marked "single source, unverified".
- The deliverable is the evidence base at `.claude/tmp/_evidence-{slug}.md` with inline citations, an Unresolved Discrepancies section, and a Gaps Remaining section — never collapse conflicts or hide what couldn't be verified.

**Workflow:**

1. **Read source map** — Load output from web-research step
2. **Fetch top sources** — WebFetch top 5-8 Tier 1-2 sources
3. **Extract findings** — Pull key facts, data points, quotes
4. **Cross-validate** — Compare findings across sources
5. **Build evidence base** — Structured findings with confidence scores

**Key Rules:**

- Maximum 8 WebFetch calls per invocation
- Every finding must cite specific source
- Conflicting claims → present both, flag discrepancy

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Deep Research

## Knowledge Work Rules

> **Web Research Protocol** — Every factual claim needs 2+ independent sources. Source tiers: Tier 1 (authoritative .gov/.edu/official docs), Tier 2 (industry reports), Tier 3 (credible blogs — cross-validate), Tier 4 (unverified — NEVER cite as fact). Declare confidence (95/80/60/<60%) for all findings. Working files → `.claude/tmp/`, final output → `docs/knowledge/`. Canonical protocol lives in the `web-research` skill.

## Step 1: Load Source Map

Read the source map from `.claude/tmp/_sources-{slug}.md` (output of web-research step).

Prioritize sources for deep-dive:

1. Tier 1-2 sources first
2. High-relevance sources
3. Sources covering identified gaps

## Step 2: Fetch Top Sources

For each priority source (max 8):

1. Run `WebFetch` with the URL
2. Extract: key claims, data points, quotes, methodology
3. Note: publication date, author credentials, source type

## Step 3: Extract Findings

For each source, extract:

- **Key claims** — factual statements with specific data
- **Data points** — numbers, percentages, dates
- **Quotes** — notable expert statements
- **Methodology** — how data was gathered (for market reports)

## Step 4: Cross-Validate

Compare findings across sources:

- **Agreement** — 2+ sources say the same thing → high confidence
- **Discrepancy** — sources disagree → note both positions
- **Unique** — only 1 source → mark as "single source, unverified"

## Step 5: Build Evidence Base

Write to `.claude/tmp/_evidence-{slug}.md`:

```markdown
# Evidence Base: {Topic}

**Date:** {date}
**Sources analyzed:** {count}

## Findings

### Finding 1: {Title}

**Confidence:** {95%|80%|60%|<60%}
**Sources:** [1], [3]
**Content:** {finding with inline citations}
**Cross-validation:** {agreement/discrepancy notes}

## Unresolved Discrepancies

- {claim X from source A vs claim Y from source B}

## Gaps Remaining

- {what couldn't be verified}
```

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use `AskUserQuestion` to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `workflow-research` workflow** (Recommended) — web-research → deep-research → synthesis → review
> 2. **Execute `/deep-research` directly** — run this skill standalone

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/business-evaluation (Recommended)"** — Evaluate business viability from research
- **"/knowledge-synthesis"** — If synthesizing research report
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

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

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Produce a cross-validated, source-cited evidence base (`_evidence-{slug}.md`) where every finding carries a confidence score, traces to specific sources, and flags discrepancies — never an unverified single-source claim presented as fact.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** traced proof per claim, confidence >80% to act, NEVER guess-as-fact.

**IMPORTANT MUST ATTENTION** every finding cites a specific source by number; conflicting claims → present BOTH positions, flag as discrepancy; lone source → mark "single source, unverified" — why: an uncited or uncross-checked claim presented as fact is the failure this skill exists to prevent.
**IMPORTANT MUST ATTENTION** cross-validation drives confidence — 2+ independent sources agree = high (95/80%), 1 source = "unverified", disagreement = discrepancy with both sides; NEVER collapse a conflict into one tidy answer — why: hidden conflicts ship as false certainty downstream.
**IMPORTANT MUST ATTENTION** declare a confidence percentage (95/80/60/<60%) on EVERY finding; <60% evidence DO NOT present as fact — say "insufficient evidence, verified: … / not verified: …" instead.
**IMPORTANT MUST ATTENTION** cap WebFetch at 8 calls per invocation; spend them on Tier 1-2 authoritative sources covering identified gaps, NEVER Tier 4 unverified content as fact — why: budget discipline forces prioritization over breadth.
**IMPORTANT MUST ATTENTION** this is the deep-DIVE stage — consume the prior `_sources-{slug}.md` map; do NOT start a fresh search — why: the source map already triaged and tiered candidates, re-searching wastes the WebFetch budget.
**IMPORTANT MUST ATTENTION** capture per source: publication date, author credentials, source type, methodology — why: confidence must be defendable later, not asserted from memory.
**IMPORTANT MUST ATTENTION** the deliverable MUST include an `## Unresolved Discrepancies` section and a `## Gaps Remaining` section — NEVER hide what couldn't be verified.
**IMPORTANT MUST ATTENTION** verify AI-generated facts/quotes/numbers against the actual fetched source before recording — NEVER fabricate a citation, stat, or quote — why: a hallucinated source corrupts the whole evidence base silently.
**IMPORTANT MUST ATTENTION** break work into small `TaskCreate` todos BEFORE starting; keep one `in_progress`; add a final review todo verifying every finding is cited and confidence-scored.
**IMPORTANT MUST ATTENTION** write intermediate findings incrementally to `.claude/tmp/_evidence-{slug}.md` (External Memory) — NEVER hold the full evidence base in context only — why: context loss before the final write loses all extracted findings.
**IMPORTANT MUST ATTENTION** validate route decisions with the user via `AskUserQuestion` — never auto-decide whether to run the workflow vs. this skill standalone.

**Anti-Rationalization:**

| Evasion                                      | Rebuttal                                                                                       |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| "One good source is enough"                  | A lone source is "single source, unverified" — never high confidence. Cross-validate.          |
| "The sources roughly agree, call it settled" | Roughly ≠ exactly. Record the discrepancy with both positions; don't smooth it over.           |
| "I remember this stat from the page"         | Re-open the fetched source and verify the number/quote before citing. Memory hallucinates.     |
| "I'll fetch a few more to be thorough"       | 8-call cap is the budget. Prioritize Tier 1-2 gap-coverage, not breadth.                       |
| "I'll write the evidence base at the end"    | Persist findings incrementally to `_evidence-{slug}.md` — a context cutoff loses batched work. |

**IMPORTANT MUST ATTENTION** every finding cites a specific source + carries a confidence % (95/80/60/<60%); conflicts → both positions flagged, lone source → "unverified".
**IMPORTANT MUST ATTENTION** cap WebFetch at 8 Tier 1-2 calls and persist the evidence base incrementally to `.claude/tmp/_evidence-{slug}.md`.
**IMPORTANT MUST ATTENTION** the deliverable must surface `## Unresolved Discrepancies` and `## Gaps Remaining` — never hide what couldn't be verified.

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting; add a final review todo to verify work quality.
