---
name: workflow-write-integration-test
version: 1.0.0
description: '[Workflow] Trigger Write Integration Tests workflow — spec-first test authoring: investigate domain logic → write/update specs → generate test code → 6-gate review → run and verify.'
---

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

> **[CRITICAL] Understand Domain First Gate:** The `/investigate` step is MANDATORY before `/tdd-spec` and `/integration-test`. You MUST read the handler/entity/event source to understand WHAT fields change, WHAT entities are created/updated/deleted, WHAT event handlers fire. Assertions written without reading the handler source are guaranteed to be wrong or smoke-only.

Activate the `write-integration-test` workflow. Run `/workflow-start write-integration-test` with the user's prompt as context.

**Steps:** /scout → /investigate → /tdd-spec → /tdd-spec-review → /integration-test → /integration-test-review → /integration-test-verify → /test-specs-docs → /docs-update → /watzup → /workflow-end

> **[STEP PURPOSES]** Every step has a distinct purpose — NEVER deduplicate or batch:
>
> - **`/scout`** — Find target command/handler files; locate existing integration tests in the same service for pattern matching. Output: list of target files + existing test examples.
> - **`/investigate`** — Read handler/entity/event source. Map: fields written, entities created/updated/deleted, event handlers fired, validation rules. Output: domain logic summary to use as assertion blueprint.
> - **`/tdd-spec`** — Write/update `TC-{FEATURE}-{NNN}` specs in feature doc Section 15. CREATE mode for new tests, UPDATE mode for changed behavior. Output: TC mapping list (TC code → test method name).
> - **`/tdd-spec-review`** — Validate spec quality: GIVEN/WHEN/THEN completeness, happy path + validation failure + auth paths covered, no collisions with existing TC codes.
> - **`/integration-test`** — Generate test files from TC specs using FROM-PROMPT or FROM-CHANGES mode. Non-negotiable: async polling/retry for all DB assertions, unique data generators for all test data, test-spec annotation on every test method (adapt annotation syntax to your framework).
> - **`/integration-test-review`** — 6-gate quality check (assertion value, data state, repeatability, domain logic, traceability, three-way sync). Mandatory fix loop + fresh sub-agent re-check. NEVER proceed with CRITICAL/HIGH issues outstanding.
> - **`/integration-test-verify`** — Run tests via `quickRunCommand` from `docs/project-config.json`. Report exact pass/fail counts with test runner output. NEVER mark complete without real output.
> - **`/test-specs-docs`** — Sync the cross-module spec dashboard (`docs/test-specs/`). Update `IntegrationTest` fields with `{File}::{MethodName}` traceability links.
> - **`/docs-update`** — Update feature doc evidence fields, version history, and changelog if test coverage changed materially.
> - **`/watzup`** + **`/workflow-end`** — Summary report and close.

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** read handler source BEFORE writing ANY assertion — domain logic first, test code second
- **IMPORTANT MUST ATTENTION** NEVER write smoke-only tests — every test MUST assert specific field values in the database
- **IMPORTANT MUST ATTENTION** ALWAYS wrap DB assertions in the project's async polling helper — no exceptions
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
