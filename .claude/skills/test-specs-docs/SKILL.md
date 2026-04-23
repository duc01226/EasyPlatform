---
name: test-specs-docs
version: 3.0.0
status: deprecated
deprecated_by: tdd-spec
last_reviewed: 2026-04-21
description: '[DEPRECATED] This skill has been merged into tdd-spec. Use /tdd-spec [direction=sync] for forward sync, /tdd-spec [direction=reverse] for reverse sync, /tdd-spec [direction=full] for bidirectional reconciliation.'
---

> **[DEPRECATED]** This skill has been merged into `/tdd-spec`. Use `/tdd-spec [direction=sync]` instead.
>
> - Forward sync (feature docs → dashboard): `/tdd-spec [direction=sync]`
> - Reverse sync (dashboard → feature docs): `/tdd-spec [direction=reverse]`
> - Bidirectional reconciliation: `/tdd-spec [direction=full]`
>
> All sync algorithms, orphan detection, staleness tracking, and quality gates are now in `/tdd-spec` under the `## Mode: Sync to Dashboard` section.
