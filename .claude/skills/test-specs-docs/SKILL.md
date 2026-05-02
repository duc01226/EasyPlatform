---
name: test-specs-docs
version: 3.0.0
status: deprecated
deprecated_by: tdd-spec
last_reviewed: 2026-04-21
description: '[DEPRECATED] This skill has been merged into tdd-spec. Use /tdd-spec [direction=sync] for forward sync, /tdd-spec [direction=reverse] for reverse sync, /tdd-spec [direction=full] for bidirectional reconciliation.'
---

> **[IMPORTANT]** MUST ATTENTION keep task tracking synchronized, preserve evidence gates, and NEVER skip mandatory steps.

> **[DEPRECATED]** This skill has been merged into `/tdd-spec`. Use `/tdd-spec [direction=sync]` instead.
>
> - Forward sync (feature docs → dashboard): `/tdd-spec [direction=sync]`
> - Reverse sync (dashboard → feature docs): `/tdd-spec [direction=reverse]`
> - Bidirectional reconciliation: `/tdd-spec [direction=full]`
>
> All sync algorithms, orphan detection, staleness tracking, and quality gates are now in `/tdd-spec` under the `## Mode: Sync to Dashboard` section.

## Quick Summary

**Goal:** [DEPRECATED] This skill has been merged into tdd-spec. Use /tdd-spec [direction=sync] for forward sync, /tdd-spec [direction=reverse] for reverse sync, /tdd-spec [direction=full] for bidirectional reconciliation.

**Workflow:**

1. **Detect** — classify request scope and target artifacts.
2. **Execute** — apply required steps with evidence-backed actions.
3. **Verify** — confirm constraints, output quality, and completion evidence.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- NEVER skip mandatory workflow or skill gates.

---

## Closing Reminders

**IMPORTANT MUST ATTENTION** apply Phase 1 compression before structural enhancement; preserve semantic meaning.
**IMPORTANT MUST ATTENTION** NEVER alter YAML frontmatter, code blocks, tables, or SYNC-tag bodies during optimization.
**IMPORTANT MUST ATTENTION** keep evidence gates and mandatory workflow/skill steps explicit and enforceable.
**IMPORTANT MUST ATTENTION** add a final review task to verify output quality and unresolved risks.
