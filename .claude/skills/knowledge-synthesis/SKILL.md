---
name: knowledge-synthesis
version: 1.0.0
description: '[Research] Use when a workflow step or the user asks for synthesis of existing evidence into a cited research report.'
---

> **Web Research Protocol** — Factual claims need 2+ independent sources; rank Tier 1 authoritative > Tier 2 industry reports > Tier 3 credible blogs; Tier 4 unverified, NEVER cite as fact; declare confidence (95/80/60/<60%). Working files → `tmp/research/`; final output → `docs/knowledge/`.
>
> **MUST ATTENTION READ** only the **Knowledge Work Rules (canonical for the research chain)** section of `.claude/skills/web-research/SKILL.md` for canonical research rules; source-discovery procedures belong to a separate discovery request.

## Quick Summary

**Goal:** Synthesize the existing evidence base into a fully cited, template-compliant research report with honest confidence and explicit gaps, trustworthy for decisions.

**Summary:**

- **Purpose/input/output:** Synthesize `tmp/research/_evidence-{slug}.md` + `_sources-{slug}.md` from `source-deep-dive` into `docs/knowledge/research/{slug}.md`; do not gather sources — upstream gathering already happened; no alternate mode or flag.
- **Main path:** (1) create small tasks; (2) load evidence and inventory findings/confidence/discrepancies/gaps; (3) load template; (4) synthesize every section with `[N]` citations, per-finding confidence, and Analysis patterns/contradictions; (5) audit citations; (6) roll up confidence, flag `<60%`, run final review, then retain working evidence for acceptance and repair.
- **Evidence gate:** Every factual claim MUST have inline `[N]` and 2+ independent sources; every Sources-table row needs a reference; Tier 4 is NEVER cited as fact; preserve gaps and discrepancies.
- **Template/terminal gate:** Every enforced-template section, including Knowledge Gaps, MUST appear; final output is `docs/knowledge/research/{slug}.md`, with this run’s `tmp/research/` evidence retained through review acceptance.

**Workflow:**

1. **Bootstrap** — Create small `TaskCreate` tasks; keep one `in_progress`; add a final review task.
2. **Load evidence** — Read both evidence files; inventory total findings/confidence, discrepancies, and gaps.
3. **Load template** — Read `.claude/templates/research-report-template.md`; retain every section.
4. **Synthesize** — Write `docs/knowledge/research/{slug}.md`; map evidence into each section, cite `[N]`, declare confidence, and record patterns/contradictions in Analysis.
5. **Citation audit** — Verify claim citations, Sources-table coverage, and no orphan citations.
6. **Confidence and close** — Average scores, weight by importance, flag `<60%`; retain this run's source map and evidence base through downstream review and repair; synthesis completion does not authorize cleanup.

**Key Rules:**

- **MUST ATTENTION** use enforced template structure; every section, including Knowledge Gaps, appears.
- **MUST ATTENTION** cite every factual claim inline `[N]`; use 2+ independent sources; reference every Sources-table row; Tier 4 is NEVER fact.
- **MUST ATTENTION** synthesize existing evidence only; NEVER gather sources, fabricate, add, or upgrade findings.
- **MUST ATTENTION** declare confidence, preserve gaps/discrepancies, and flag every `<60%` finding.

**Be skeptical; apply critical/sequential thinking; trace every claim; state confidence (>80% to act).**

## Contents

- [Quick Summary](#quick-summary)
- [Knowledge Synthesis](#knowledge-synthesis)
- [Knowledge Work Rules](#knowledge-work-rules)
- [Step 1: Load Evidence](#step-1-load-evidence)
- [Step 2: Load Template](#step-2-load-template)
- [Step 3: Synthesize Report](#step-3-synthesize-report)
- [Step 4: Citation Audit](#step-4-citation-audit)
- [Step 5: Confidence Summary](#step-5-confidence-summary)
- [Output](#output)
- [Closing Reminders](#closing-reminders)

# Knowledge Synthesis

## Knowledge Work Rules

Apply the Knowledge Work Rules in `.claude/skills/web-research/SKILL.md` (read that section first): source tiers, cross-validation, confidence declarations, enforced template, working files under `tmp/research/`, final output under `docs/knowledge/`.

## Step 1: Load Evidence

Read `tmp/research/_evidence-{slug}.md` and `tmp/research/_sources-{slug}.md`.

Inventory total findings with confidence scores, unresolved discrepancies, and remaining gaps.

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

- Every factual claim has inline `[N]` citations and 2+ independent sources
- Every source in Sources table referenced 1+ time
- No orphan citations (referencing non-existent source)

## Step 5: Confidence Summary

Calculate overall report confidence:

- Average of all finding confidence scores
- Weight by finding importance
- Flag any <60% findings prominently

## Output

Final report: `docs/knowledge/research/{descriptive-slug}.md`

Retain this run's `tmp/research/_sources-{slug}.md` and `_evidence-{slug}.md` through review and repair. In a workflow, only the orchestrator may clean these exact files after `/knowledge-review` APPROVED the final artifact and `/workflow-end` successfully accepted closure; record the acceptance and cleanup in the workflow report. On REVISE, BLOCKED, interruption, or closure failure, keep both files so their owning skills can rerun. Standalone synthesis retains both files until an explicit acceptance or retention policy authorizes cleanup; never delete other files under `tmp/research/`.

---

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Synthesize the existing evidence base into a fully cited, template-compliant research report with honest confidence and explicit gaps, trustworthy for decisions.

**IMPORTANT MUST ATTENTION Main path:** (1) create small `TaskCreate` tasks; keep one `in_progress`; add a final review task; (2) load both evidence files and inventory findings/confidence/discrepancies/gaps; (3) load the enforced template and retain every section; (4) synthesize to `docs/knowledge/research/{slug}.md` with `[N]` citations, per-finding confidence, and Analysis patterns/contradictions; (5) audit claim citations, Sources-table coverage, and orphan citations; (6) average scores, weight by importance, flag `<60%`, run final review, then retain source/evidence inputs until accepted workflow closure or explicit standalone acceptance.

**IMPORTANT MUST ATTENTION Mode/boundary:** No alternate mode or flag; consume existing `source-deep-dive` evidence; NEVER gather sources, fabricate, or upgrade findings; retain `tmp/research/` source/evidence inputs through review and repair.

**IMPORTANT MUST ATTENTION** use enforced template structure (`.claude/templates/research-report-template.md`) — every section required, NEVER omit Knowledge Gaps — why: a missing gaps section manufactures false confidence in incomplete research
**IMPORTANT MUST ATTENTION** inline-cite every factual claim with `[N]`; verify zero orphan citations (claim cites missing source) AND zero orphan sources (Sources-table row referenced 0 times) — why: uncited claims are assertions, not findings
**IMPORTANT MUST ATTENTION** synthesize FROM the evidence base only (`tmp/research/_evidence-{slug}.md` + `_sources-{slug}.md`) — NEVER fabricate, add, or upgrade findings beyond gathered evidence; this skill consolidates, it does not research — why: invented findings poison the report's trust
**IMPORTANT MUST ATTENTION** respect source tiers — Tier 4 (unverified) NEVER cited as fact; every factual claim backed by 2+ independent sources — why: single-source or unverified claims read as confident but unproven
**IMPORTANT MUST ATTENTION** close with an honest confidence rollup (importance-weighted average of finding scores) that prominently flags every <60% finding — why: an unflagged weak finding inflates apparent report confidence
**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting; mark one `in_progress` at a time and complete it on evidence
**IMPORTANT MUST ATTENTION** cite `file:line` evidence (or `[N]` source) for every claim — confidence >80% to act, <60% DO NOT assert; NEVER present a guess as fact
**IMPORTANT MUST ATTENTION** grep/read 3+ similar existing reports under `docs/knowledge/research/` before writing — match the template's section shape, do NOT invent a new layout — why: divergent report structure breaks the knowledge-review gate
**IMPORTANT MUST ATTENTION** output final report to `docs/knowledge/research/{slug}.md`, retain this run’s working evidence until acceptance authorizes cleanup — why: rejected artifacts need reproducible repair inputs
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality (template complete · citations balanced · gaps present · rollup flagged)

**Anti-Rationalization:**

| Evasion                                       | Rebuttal                                                                          |
| --------------------------------------------- | --------------------------------------------------------------------------------- |
| "Evidence is thin, fill the gap with my own" | NEVER fabricate. Record it in Knowledge Gaps with confidence <60% instead.        |
| "This claim is obvious, skip the citation"   | No `[N]` = not a finding. Cite the source or move it to assumptions.              |
| "Gaps section is empty, drop it"             | Empty ≠ omit. State "no unresolved gaps" explicitly — omission fakes completeness. |
| "All findings strong, skip the rollup flag"  | Compute the weighted average; flag any <60%. One weak finding hides in the mean.   |
| "Template section is N/A, delete it"         | Keep it, write "Not applicable — why". Missing sections fail the knowledge-review. |
