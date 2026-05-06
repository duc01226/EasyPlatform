---
name: __golden__
version: 0.0.0
description: '[Test Fixture] canonical post-migration layout'
disable-model-invocation: true
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Fixture for golden-test round-trip.

## Section A

Some main content above SYNC blocks.

## Section B

More main content.

<!-- SYNC:foo -->

> **Foo Block** — shared protocol body.

<!-- /SYNC:foo -->

<!-- SYNC:bar:reminder -->

- **Bar reminder** — short reminder line.

<!-- /SYNC:bar:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

> Closing anchor body.

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

## Closing Reminders

- **MUST** end the file with closing reminders.
