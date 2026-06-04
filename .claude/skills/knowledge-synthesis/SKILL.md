---
name: knowledge-synthesis
version: 1.0.0
description: '[Research] Use when you need to synthesize research findings into structured report using template.'
---

## Quick Summary

**Goal:** Produce a fully-cited, template-compliant research report by synthesizing the evidence base using the enforced template — whose confidence scores and gaps are honest enough to trust for decisions.

**Summary:**

- Synthesizes a report FROM an existing evidence base (`.claude/tmp/_evidence-{slug}.md` + `_sources-{slug}.md` from deep-research) — this skill does not gather sources, it consolidates them into `docs/knowledge/research/{slug}.md`.
- The enforced template (`.claude/templates/research-report-template.md`) is non-negotiable: every section MUST appear, and the Knowledge Gaps section can never be omitted — a missing gaps section manufactures false confidence.
- Citation discipline is the core gate: every factual claim carries an inline `[N]`, every Sources-table entry is referenced at least once, and there are zero orphan citations or orphan sources.
- Close with an honest confidence rollup (weighted average of finding scores) that prominently flags any <60% finding, then clean up `.claude/tmp/` working files.

**Workflow:**

1. **Load evidence** — Read evidence base from deep-research
2. **Load template** — Read enforced template from .claude/templates/
3. **Synthesize** — Write report following template structure
4. **Citation check** — Verify every claim has citation
5. **Confidence summary** — Aggregate scores, flag gaps

**Key Rules:**

- MUST ATTENTION use enforced template structure — all sections required
- Every factual claim inline-cited: `[N]` referencing source table
- Knowledge gaps section mandatory

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Knowledge Synthesis

## Knowledge Work Rules

> **Web Research Protocol** — Every factual claim needs 2+ independent sources. Source tiers: Tier 1 (authoritative .gov/.edu/official docs), Tier 2 (industry reports), Tier 3 (credible blogs — cross-validate), Tier 4 (unverified — NEVER cite as fact). Declare confidence (95/80/60/<60%) for all findings. Use the enforced template structure — all sections required. Working files → `.claude/tmp/`, final output → `docs/knowledge/`. Canonical protocol lives in the `web-research` skill.

## Step 1: Load Evidence

Read `.claude/tmp/_evidence-{slug}.md` and `.claude/tmp/_sources-{slug}.md`.

Inventory:

- Total findings with confidence scores
- Unresolved discrepancies
- Remaining gaps

## Step 2: Load Template

Read enforced template: `.claude/templates/research-report-template.md`

Every template section MUST ATTENTION appear in final report.

## Step 3: Synthesize Report

Write to `docs/knowledge/research/{slug}.md`. For each template section:

1. Map relevant findings from evidence base
2. Write content with inline citations `[N]`
3. Declare confidence per finding
4. Note cross-cutting patterns and contradictions in Analysis section

## Step 4: Citation Audit

Verify:

- Every factual claim has 1+ `[N]` citation
- Every source in Sources table referenced 1+ time
- No orphan citations (referencing non-existent source)

## Step 5: Confidence Summary

Calculate overall report confidence:

- Average of all finding confidence scores
- Weight by finding importance
- Flag any <60% findings prominently

## Output

Final report: `docs/knowledge/research/{descriptive-slug}.md`

Clean up working files from `.claude/tmp/` after successful synthesis.

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

**IMPORTANT MUST ATTENTION Goal:** Produce a fully-cited, template-compliant research report by synthesizing the existing evidence base through the enforced template — whose confidence scores and Knowledge Gaps are honest enough to trust for decisions.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):** MUST ATTENTION honor every block below — each is a signpost to its canonical body above.

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** traced proof per claim, confidence >80% to act, never guess as fact.

**IMPORTANT MUST ATTENTION** use enforced template structure (`.claude/templates/research-report-template.md`) — every section required, NEVER omit Knowledge Gaps — why: a missing gaps section manufactures false confidence in incomplete research
**IMPORTANT MUST ATTENTION** inline-cite every factual claim with `[N]`; verify zero orphan citations (claim cites missing source) AND zero orphan sources (Sources-table row referenced 0 times) — why: uncited claims are assertions, not findings
**IMPORTANT MUST ATTENTION** synthesize FROM the evidence base only (`.claude/tmp/_evidence-{slug}.md` + `_sources-{slug}.md`) — NEVER fabricate, add, or upgrade findings beyond gathered evidence; this skill consolidates, it does not research — why: invented findings poison the report's trust
**IMPORTANT MUST ATTENTION** respect source tiers — Tier 4 (unverified) NEVER cited as fact; every factual claim backed by 2+ independent sources — why: single-source or unverified claims read as confident but unproven
**IMPORTANT MUST ATTENTION** close with an honest confidence rollup (importance-weighted average of finding scores) that prominently flags every <60% finding — why: an unflagged weak finding inflates apparent report confidence
**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting; mark one `in_progress` at a time and complete it on evidence
**IMPORTANT MUST ATTENTION** cite `file:line` evidence (or `[N]` source) for every claim — confidence >80% to act, <60% DO NOT assert; NEVER present a guess as fact
**IMPORTANT MUST ATTENTION** grep/read 3+ similar existing reports under `docs/knowledge/research/` before writing — match the template's section shape, do NOT invent a new layout — why: divergent report structure breaks the knowledge-review gate
**IMPORTANT MUST ATTENTION** output final report to `docs/knowledge/research/{slug}.md`, then clean up `.claude/tmp/` working files after successful synthesis — why: stale working files leak across runs
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality (template complete · citations balanced · gaps present · rollup flagged)

**Anti-Rationalization:**

| Evasion                                      | Rebuttal                                                                           |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| "Evidence is thin, fill the gap with my own" | NEVER fabricate. Record it in Knowledge Gaps with confidence <60% instead.         |
| "This claim is obvious, skip the citation"   | No `[N]` = not a finding. Cite the source or move it to assumptions.               |
| "Gaps section is empty, drop it"             | Empty ≠ omit. State "no unresolved gaps" explicitly — omission fakes completeness. |
| "All findings strong, skip the rollup flag"  | Compute the weighted average; flag any <60%. One weak finding hides in the mean.   |
| "Template section is N/A, delete it"         | Keep it, write "Not applicable — why". Missing sections fail the knowledge-review. |

**IMPORTANT MUST ATTENTION Goal echo:** fully-cited, template-compliant report; NEVER omit Knowledge Gaps; zero orphan citations/sources — synthesize FROM evidence, never fabricate.
