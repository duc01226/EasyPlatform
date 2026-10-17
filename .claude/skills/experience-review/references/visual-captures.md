# Visual Capture Review

Read when reviewing a visual surface or an E2E capture set. For non-visual work record `N/A — no user-facing visual surface`.

## Authority and inventory

Before the first image, reload the governing brief/accepted design decisions and applicable project design-system, token/component, frontend/styling and ADR sources. Read `.claude/docs/design-knowledge.md` and `.claude/docs/design-review-checklist.md` when applicable. Brief/accepted contract → project decisions → shared UI/DD/CL rules; surface genuine conflicts. Never infer source architecture or tokens from an image.

Read `.claude/skills/shared/ui-state-capture-protocol.md` and resolve `uiStateCapture.mode` and the runner. Capture the required state × viewport matrix; capture transitions only when `every-action` is explicitly selected and an evidenced boundary supports them. `declared-only` records uncaptured state-changing actions; `off` retains the matrix and records transition coverage as `N/A — uiStateCapture off: <reason>`. Record sampled, deduplicated or capped evidence as gaps, never passes. Include full-page captures for scrolling surfaces where needed by the evidence contract.

Create a persisted ordered inventory before inspection: image path, case/action, state/phase, viewport and total, plus manifest/evidence-index path when configured. For `/experience-review --rounds=0` invoked by an E2E visual gate, inspect EVERY required manifest capture, including both matrix states and configured per-action transitions. The parent owns repairs and the same-scope E2E rerun; this review changes no product or expectation.

## Inspect one capture at a time

Open exactly one image, inspect it, and append its record BEFORE opening the next. On resume, read the ledger and continue from the first unprocessed artifact.

```text
CASE       <sequence/case/action/surface/state/viewport>
IMAGE      <path> · READ: yes
EXPECTED   <intent or manifest expected_delta>
OBSERVED   <visible facts with locations>
CONSOLE    <attributed errors/warnings or none>
FINDINGS   <UIX code · BLOCKING|ADVISORY · location · evidence> | none
VERDICT    PASS | FAIL | PARTIAL | NOT-VERIFIABLE
GAPS       <missing evidence or none>
```

Use the taxonomy that fits the observation:

- `UIX-BROKEN`: blank/error boundary/failed render.
- `UIX-UNSTYLED`: missing styles, raw controls or persisted FOUC.
- `UIX-OVERFLOW` / `UIX-OVERLAP` / `UIX-LAYOUT`: clipping, unintended scrolling, occlusion or broken reflow.
- `UIX-STATE` / `UIX-FLOW`: missing expected feedback, stale data, dead ends or lost context.
- `UIX-A11Y`: measurable accessibility floor.
- `UIX-CONVENTION`: cited project authority violation, not inferred token/source structure.
- `UIX-POLISH`: identity or taste.

Usability/accessibility-floor failures (`UI-*`, P0–P2 `CL-*`) are BLOCKING. Identity/polish (`DD-*`) is ADVISORY unless objectively required by the governing contract. Cite image and location; do not invent contrast, size, timing or other measurements. Mark unsupported claims `NOT-VERIFIABLE` and name the evidence needed.

## Reconcile and synthesize

Reconcile inventory/manifest against records and report `reviewed/total`. Missing or unread records are `UNVERIFIED`. Cluster repeated defects by the actual owner established from project architecture, rather than assuming a component taxonomy. Route static styling, tokens, accessibility implementation and component ownership findings to `/ui-design --mode=review`.

Add sequence-level findings: missing action feedback, layout shifts, inconsistent shared components, accumulating convention drift and unreachable required states. Report capture/transition gaps, design-authority resolution, applicable UI/DD/CL/UIX coverage and remaining human acceptance. Evidence generation, passing E2E and agent judgment never promote a baseline.
