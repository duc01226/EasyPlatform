---
name: docs-manager
version: 1.0.0
description: '[Documentation] Use when a workflow step or the user asks for documentation sync after code/spec/test changes (--mode=update), or explicit reference-doc initialization and reconciliation (--mode=init).'
---

> **[BLOCKING] Mode routing — detect FIRST.** Explicit `--mode=update` or `--mode=init` selects that mode. `/docs-manager --mode=update` and `/docs-manager --mode=init` are the former `/docs-update` and `/docs-init`: those slash commands no longer exist, and each mode works called directly with no workflow. No mode flag and no natural-language request matching the `update` Intent column: show the [Mode Dispatch](#mode-dispatch) table and stop — ask nothing and run nothing (`init` is heavy and runs only on an explicit `--mode=init`). Read the mode file in full before anything else.

## Quick Summary

**Goal:** Keep documentation true to code: update impacted context, config, specs/tests and derived/demo outputs; explicitly initialize or reconcile selected reference docs.

**Summary:** Update impacted docs or explicitly initialize reference docs: detect mode → read its contract → resolve scope/owners → run gates → review and report evidence.

**Workflow:** Detect mode → read its full reference → execute its contract → verify and report.

**Key Rules:**

- One mode per invocation; load only the selected mode's body.
- A natural-language request that matches the `update` Intent column selects `update`; `init` is selected only by an explicit `--mode=init`. No mode flag and no such request: show the [Mode Dispatch](#mode-dispatch) table and stop.
- `--mode=` (two dashes) selects the skill mode. The `update` caller flag `mode=update` (no dashes, see that mode's Scope and inputs) only overrides `/spec` mode detection and never selects a skill mode.
- The `docs-manager` sub-agent (`subagent_type="docs-manager"`) is an agent, not this skill; it drives `/docs-manager --mode=update`.
- MUST ATTENTION keep claims evidence-based (`file:line`, confidence >80% to act) and task tracking live as each step starts and completes.
- Verify the shared output-quality contents check for each scoped document, including returned scan results; retain read-only audit boundaries.

## Mode Dispatch

| Mode | Purpose | Intent (natural-language triggers) | Read in full FIRST |
| --- | --- | --- | --- |
| `--mode=update [modules=… changed_files=… phases=… skip_phases=… tc_mode=… freshness={impact\|full\|off} base=…]` | Impact-scoped context/config checks → spec/test owners → derived/demo outputs → report. Formerly `/docs-update` | "update docs", "docs impacted by my changes", "sync docs after code change", "doc sync", "documentation update" | `references/mode-update.md` |
| `--mode=init` | Initialize or reconcile selected, applicable reference docs through `scan`. Formerly `/docs-init` | _(explicit `--mode=init` only)_ | `references/mode-init.md` |

- **[BLOCKING]** When `--mode=update`, read `references/mode-update.md` in full FIRST; it owns scope, owners, freshness, intent/coverage, caller flags and the report (`tmp/reports/docs-update-{YYMMDD}-{HHMM}.md`). Workflow invocation and standalone both run the full contract.
- **[BLOCKING]** When `--mode=init`, read `references/mode-init.md` in full FIRST; it owns optional config, document selection and applicability-gated scans.
- One-doc rebuilds stay in `scan` (`/scan --target=<key>`); refreshing every selected reference doc at once stays in `scan-all`. `--mode=update` escalates to them and `--mode=init` delegates to `scan`; neither is a mode of this skill.



<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `output-quality-principles` — Readable guidance and verified contents for long skill/doc files; writing, updating or auditing a skill or reference document, or another Markdown artifact over 200 lines → .claude/skills/shared/protocols/output-quality-principles.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:output-quality-principles:reminder -->

**IMPORTANT MUST ATTENTION** lead with useful guidance and readable priorities; preserve action-changing conditions/numbers and required structures. When writing, updating or auditing Markdown skill/doc content, verify top, heading-linked contents over 200 lines (stricter owner thresholds remain); refresh after edits and report gaps in read-only audits. Remove report bulk; judge semantic value rather than word counts.

<!-- /SYNC:output-quality-principles:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Keep project documentation true to the code through the selected update or init contract.

**IMPORTANT MUST ATTENTION Main steps:** detect mode → read its full reference → resolve scope and ownership → run quality gates → review and report evidence.

- **MANDATORY IMPORTANT MUST ATTENTION** `--mode=<x>` reads `references/mode-<x>.md` in full FIRST; no mode flag and no `update`-intent request shows the mode table and stops — never guess a mode, never start `init` without an explicit `--mode=init`
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)

**[TASK-PLANNING]** Track the selected contract before acting, with a final consistency review.

| Evasion | Required action |
| --- | --- |
| "Direct call, skip the reference" | Standalone calls retain the full selected contract. |
