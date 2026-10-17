# UI State Capture Protocol

Portable shared contract for turning an E2E/browser run into **AI-reviewable visual evidence of every UI state the journey passes through**, then reviewing that evidence case by case and synthesizing it into defect findings.

This protocol supplements `e2e-quality-protocol.md` (which owns E2E correctness) and `SYNC:e2e-visual-design-contract` (which owns design authority and review ownership). It owns one thing those do not: **what gets captured, when, under what name, and how each capture is adjudicated and rolled up.**

## Quick Summary

**Goal:** Make a visual E2E/QC run provide reviewable evidence for the UI states required by the project contract. Capture the declared state × viewport matrix and add transition captures only when the project selects `uiStateCapture.mode: every-action` and has a verified capture boundary. Index and review each capture against the project's own design authority.

**Workflow:** resolve capture mode, runner capability, and authority → use an existing shared action boundary only for opted-in transition capture → run the journey and emit required captures + manifest → reload the design/UI convention docs → review ONE capture at a time and append its record → reconcile the manifest against the records → synthesize findings and coverage gaps → route findings to their actual owner.

**Key Rules:**

- When transition capture is enabled, instrument it at an evidenced shared action boundary if one exists, so covered actions inherit it. Do not create an object model or helper solely to host capture.
- Capture after the configured runner observes the expected postcondition or settled state. Do not add a fixed delay as a substitute for a readiness or settle signal.
- Every capture has a **manifest row**. A capture with no row is unreviewable; a row with no per-case record is **incomplete review**, never a clean result.
- The reviewer **reloads the project design/UI convention docs before judging the first image**. A sub-agent inherits nothing from the calling conversation.
- Report **case by case first, synthesis second**. Synthesis without per-case records is a summary of memory, not of evidence.
- Only report what is **in the image**. Never invent a measurement; unmeasurable is `NOT VERIFIABLE`.
- This protocol is **evidence production and adjudication**. It never promotes a baseline, never rewrites an expectation, and never edits a test to make an image look better.

## Applicability and ownership

Binds when an executable visual UI surface exists **and** visual review is requested or required by the project contract. For a non-visual API/CLI/library/background scope, record `N/A — no user-facing visual surface` and do not invent a capture plan. A relevant UI surface with no configured capture capability is `ENVIRONMENT-BLOCKED`, never a pass.

| Consumer | Owns |
| --- | --- |
| `e2e-test` / `e2e-runner` | Uses the configured/discovered shared action, helper, fixture, or object boundary when one owns the exercised actions; declares the trigger set and bounds, emits the manifest. A POM is not required. |
| `e2e-test --mode=verify` | Report-only: verifies the manifest exists, is complete against the journey, and that captures were read; never repairs |
| `e2e-test --mode=verify --fix-loop` | Runs the round, reconciles manifest vs records, feeds validated `BLOCKING` visual defects into the round's failure set, fixes the owning layer, reruns the same scope |
| `experience-review` | Opens and judges each capture, owns the per-case records, the taxonomy verdicts, and the synthesis |
| `ui-design --mode=review` | Receives the static source findings the images point at (tokens, BEM/SCSS, z-index, component ownership, reuse) |
| `workflow-e2e` | Sequences the above and forwards the resolved `--visual-review` mode |

## Configuration

Project settings live at `docs/project-config.json` → `e2eTesting.execution.evidence.uiStateCapture`. Every field is optional; the default mode is `declared-only`. Set `manifestPath` for a visual-review run. Set `helper` only to a source-verified shared action boundary when transition capture is explicitly selected; never invent a path or a page-object model. `declared-only` needs no transition helper, while `every-action` without a shared boundary leaves transition capture `ENVIRONMENT-BLOCKED` (see **Validation**).

| Field | Default | Meaning |
| --- | --- | --- |
| `mode` | `declared-only` | Which captures this protocol produces — see the mode table below. Choose `every-action` only when the project opts in and an evidenced boundary supports it. |
| `helper` | none — discovered from the repository | Project-relative path/symbol of an existing capture hook or shared action/helper/fixture/object boundary used for opted-in transition capture. Never invented; a configured path is verified against source. |
| `manifestPath` | `{evidenceRoot}/ui-captures/{runId}/capture-manifest.json`, where `{evidenceRoot}` is `evidence.root` or `tmp/` | Where the Part 2 manifest is written. |
| `maxPerTest` | `60` | Integer 1–1000. The §1.3 per-test cap. |
| `maxPerRun` | `400` | Integer 1–20000 and never below `maxPerTest`. The §1.3 per-run cap. |
| `fullPageWhenScrollable` | `true` | Capture full-page in addition to viewport wherever the surface scrolls (§1.3 item 5). `false` is an explicit opt-out: every scrollable surface captured viewport-only is listed as a coverage gap. |
| `maskSelectors` | `[]` | Volatile regions (clocks, timestamps, GUIDs, avatars) masked per §1.3 item 4. |

**Modes** — each accepted value has exactly one meaning:

| `mode` | Captures produced | Recorded outcome |
| --- | --- | --- |
| `every-action` | §1.2 transition captures **and** the §1.4 state × viewport matrix | The full protocol. |
| `declared-only` | The §1.4 matrix only (`source: matrix`); no transition captures | Part 4 pass 4 lists **every** state-changing action in the journey as an uncaptured transition, and the synthesis states `mode: declared-only`. Transition coverage is a recorded blind spot, never an implicit pass. |
| `off` | The §1.4 matrix only (`source: matrix`), still indexed in the manifest; no transition captures and no §1.1 action-layer helper | The synthesis records transition coverage once as `N/A — uiStateCapture off: {reason}` instead of listing every action as a blind spot. `off` removes transition capture only: the matrix is still required and read case by case, a missing matrix capture stays `ENVIRONMENT-BLOCKED`/`UNVERIFIED` exactly as in the other modes, and the visual review gate owned by `SYNC:e2e-visual-design-contract` is never waived or weakened — that opt-out is `--visual-review=false`. |

**Validation** (`project-config-schema.cjs`): an unsupported `mode`, a cap outside its range or not an integer, and `maxPerTest > maxPerRun` are errors; a missing `manifestPath` in any configured capture mode and a missing `helper` while `mode` is `every-action` are warnings. `declared-only` does not require transition instrumentation; `every-action` requires an evidenced shared action boundary or must report transition capture as `ENVIRONMENT-BLOCKED`.

---

## Part 1 — Capture instrumentation

### 1.1 Instrument the configured action boundary, not each test

For `every-action`, put one project-owned hook — conceptually `captureUiState(actionDescriptor)` — at the verified shared action boundary through which the covered actions actually pass. That boundary may be a fixture, shared helper/wrapper, action primitive, page object, or another structure the project already uses. Record its owner and trigger coverage from source evidence; a configured path alone does not prove it is active.

If no shared boundary covers the required actions, report the missing capability as `ENVIRONMENT-BLOCKED`; do not claim automatic transition coverage, create a Page Object Model to host capture, or silently require per-test screenshot calls. `declared-only` still records the transition blind spots and emits the state × viewport matrix.

**Why a verified shared boundary:** per-test screenshot calls depend on each test remembering to capture and can silently leave new cases uncovered. A hook at an existing boundary is centralized only when the actions really flow through it; otherwise the missing coverage must stay visible.

For an opted-in transition-capture hook, record the sequence used by the project's runner. Synchronize with runner-native readiness and postcondition signals; do not introduce a fixed sleep:

```text
<wait using the runner's native or configured readiness mechanism>
<perform the action>
<wait for the expected observable postcondition using the project runner>
captureUiState({...descriptor})                     # capture the observed state
```

A capture taken before the expected postcondition records an intermediate transition, not the resulting state. The project's runner or configured evidence policy determines how readiness and settling are observed.

### 1.2 Trigger inventory — what counts as a UI-state-changing action

Under `uiStateCapture.mode: every-action`, capture after **any** action that can change what a user sees. Enumerate the journey's actions against this list and record the resulting trigger set in the test plan — `declared-only` still records that set to list its blind spots, and `off` skips it:

| Class | Examples |
| --- | --- |
| Navigation | route change, page load, back/forward, deep link, redirect, tab-to-new-view |
| Activation | button/link click, form submit, row or card activation, context-menu action |
| Selection | dropdown/select open **and** option chosen, autocomplete pick, multi-select add/remove, date pick |
| Binary state | toggle, switch, checkbox, radio, star/favorite, enable/disable |
| Sectioning | tab switch, wizard/stepper advance or retreat, accordion or tree expand/collapse, "show more" |
| Overlay | modal, drawer, popover, dropdown menu, tooltip, confirm dialog — on **open and on close** |
| Data shaping | filter apply/clear, search submit, sort change, pagination, page-size change, grouping |
| Direct manipulation | drag-and-drop or reorder (pre **and** post), resize, inline edit enter and commit/cancel |
| Mode | theme, locale, density, read/edit mode, role or permission switch, responsive viewport change |
| Async boundary | loading → loaded, loading → empty, loading → error, optimistic → confirmed/rolled back |
| Feedback | toast, banner, inline validation, field error appearing or clearing |
| Session | login, logout, session expiry, re-auth prompt |

**Not triggers** (capturing these buys noise, not coverage): assertions and pure reads; hovers with no visual change; per-keystroke typing (capture once, on field commit or blur); polling ticks and animation frames; a re-render with an identical fingerprint.

**Pre-action capture** is required only when the finding needs a before/after pair: drag/reorder, destructive confirmations, inline-edit commit, and any transition whose defect is "nothing changed". Elsewhere the previous capture *is* the before.

### 1.3 Determinism, bounding, and cost control

Capturing every action is worthless if the output is unreadable or unbounded. Apply all five:

1. **Dedupe by fingerprint.** Skip a capture whose post-action visual/DOM fingerprint equals the immediately preceding one, and record it in the manifest as `deduped_from: <seq>`. A skipped capture is still a manifest row — silence is not coverage.
2. **Bound per test and per run.** Default caps: 60 captures per test, 400 per run, configurable per project. Reaching a cap is an **escalation record naming the untaken captures**, never a silent truncation.
3. **Sample repetition.** For a loop over N similar items (rows, cards, pages), capture the first, one middle, and the last, and record the sampling rule applied. Do not capture 200 near-identical rows.
4. **Mask volatile regions.** Clocks, timestamps, GUIDs, avatars, and random seeded names are masked per project config so an unchanged UI produces an unchanged image. Unmasked volatility turns every rerun into a false diff.
5. **Capture full-page as well as viewport** wherever the surface scrolls — a viewport-only capture hides exactly the overflow defects this protocol exists to find.

**Failure captures are exempt from dedupe and from the caps.** When an action's postcondition times out or an assertion fails, capture immediately and unconditionally, and mark the row `phase: failure`. That image is the most valuable one in the run.

### 1.4 Capture is additive to the state × viewport matrix

Transition captures do **not** replace the declared state × viewport matrix (loading, empty, error, permission, post-submit, full-page). The matrix guarantees the *required* states are seen even if the journey never reaches them naturally; transition capture guarantees every state the journey *does* reach is seen. Both are required when `mode` is `every-action` (the Configuration mode table defines `declared-only` and `off`); the manifest holds both, distinguished by `source: matrix | transition`.

---

## Part 2 — The capture manifest

The manifest is what makes case-by-case review reconcilable — without it a reviewer cannot tell a clean run from an unfinished one.
It is a run-scoped derived projection of configured owner/case/test carriers and observed actions, never a second canonical case registry.

**Paths** (under the configured evidence root, or `tmp/` when none is configured):

```text
{evidenceRoot}/ui-captures/{runId}/capture-manifest.json
{evidenceRoot}/ui-captures/{runId}/{caseKey}/{NNN}-{action}-{surface}-{viewport}.png
```

`caseKey` is a filesystem-safe, collision-checked derivation of the configured owner path + case/scenario ID + optional variant. With no native `specArtifacts` profile, the strict-default TC ID supplies the case identity. Never create a parallel registry or mint a second identity to name captures.

**One row per capture — including deduped and capped-out ones:**

| Field | Meaning |
| --- | --- |
| `seq` | Monotonic order within the run — the review order |
| `owner_path` / `case_id` / `variant` | Configured canonical owner path, native case/scenario ID, and optional variant; without a native profile, `case_id` is the strict-default TC ID |
| `test` | Actual executing test path and name resolved from the configured carrier |
| `case_step` | The relevant `Given`/`When`/`Then` step or the case's named action/step |
| `source` | `matrix` or `transition` |
| `phase` | `pre`, `post`, or `failure` |
| `action_type` / `action_label` | Trigger class from §1.2 and a human label ("click Save", "select Status = Closed") |
| `target` | The stable locator acted on |
| `route` / `surface` | URL/route and the surface or screen name |
| `viewport` | Named viewport/device, with `full_page: true|false` |
| `expected_delta` | What the UI was supposed to change to — the reviewer's oracle for `UIX-STATE` |
| `path` | Project-relative image path |
| `masked` | Regions masked |
| `deduped_from` | Present when skipped as identical |
| `console_since_last` | Errors/warnings emitted between the previous capture and this one |
| `read` | Set true only once a reviewer has actually opened it |

`console_since_last` is what lets a reviewer attribute a runtime error to the exact transition that caused it, instead of to the run as a whole.

---

## Part 3 — Per-case review

### 3.1 Blocking precondition — reload the authority first

**Before opening the first image**, read and cite the project's own UI authority; a sub-agent inherits nothing from the calling conversation, and judging a design from memory is how a house convention gets reported as a bug:

- `docs/project-config.json` → `designSystem.canonicalDoc`, `tokenFiles`, `appMappings[]`
- the resolved design-system doc, `frontend-patterns-reference.md`, `configured styling reference`
- `.claude/docs/design-knowledge.md` (`DD-1`–`DD-8`) and `.claude/docs/design-review-checklist.md` (`CL-1`–`CL-6`, `P0`–`P4`)
- the governing brief, spec, or accepted `/ui-design` decision for the surface

Record which authority files resolved and which were absent. **Precedence:** brief/accepted design contract → project design-system, SCSS, frontend docs and ADRs → shared `UI-*`/`DD-*`/`CL-*`. A repo-wide convention is an intentional identity, never a distinctiveness finding. A genuine conflict goes to the user with both sides — never resolved silently.

### 3.2 One capture at a time

Follow `SYNC:incremental-persistence`: open exactly ONE capture, inspect it, append its record to the report file, and only then open the next. Never batch images and never hold findings in memory — a long review is cut off before the final write, and a batched review loses everything.

Per-case record:

```text
CASE {seq} — owner={owner_path} · case={case_id} · variant={variant-or-none} · {action_label} · {surface} @ {viewport} · {phase}
TEST       {actual test path and name}
IMAGE      {path}   READ: yes
EXPECTED   {expected_delta}
OBSERVED   <what is actually in the image — facts, with locations>
ASSERTION  <actual test assertion file:line that guards the stated outcome, or NOT VERIFIABLE>
CONSOLE    <errors/warnings attributed to this transition, or none>
FINDINGS   <taxonomy code · severity · location · what IN the image shows it>  |  none
VERDICT    PASS | FAIL | PARTIAL | NOT-VERIFIABLE
```

An explicit `none` is required when a capture is clean. A missing record is an unreviewed capture.

### 3.3 UI defect taxonomy

One code per finding, so per-case records cluster in synthesis:

| Code | Catches | Default severity |
| --- | --- | --- |
| `UIX-BROKEN` | Blank page, error boundary, raw stack/error text, failed render, missing region | BLOCKING |
| `UIX-UNSTYLED` | Stylesheet not applied, raw/unthemed default controls, persisted FOUC, missing component styling | BLOCKING |
| `UIX-OVERFLOW` | Clipped or truncated content without affordance, text escaping its container, unintended horizontal scroll, cut-off controls | BLOCKING |
| `UIX-OVERLAP` | Overlapping or occluded content, z-index defects, sticky/fixed element covering content, modal behind backdrop | BLOCKING |
| `UIX-LAYOUT` | Collapsed or misaligned grid, broken responsive reflow at a matrix viewport, spacing off the system scale, inconsistent alignment | BLOCKING when it impairs use; else ADVISORY |
| `UIX-STATE` | The transition produced no visible change where `expected_delta` required one; missing loading/empty/error/disabled/selected feedback; stale data after a mutating action | BLOCKING |
| `UIX-A11Y` | Measurable floor only: contrast below the floor, missing/invisible focus ring, touch target under the floor, visibly unlabeled control | BLOCKING |
| `UIX-CONVENTION` | Deviates from the project's own tokens, components, or documented pattern — **requires a citation of the authority clause it breaks** | BLOCKING when the authority states it as a rule; else ADVISORY |
| `UIX-FLOW` | UX friction visible across the sequence: dead end, unexplained context loss, redundant step, destructive action without confirmation, no feedback between action and result | BLOCKING when it blocks the journey; else ADVISORY |
| `UIX-POLISH` | Identity and taste (`DD-1`–`DD-8`): distinctiveness, palette/type character, a nicer alternative | ADVISORY |

Map to the existing gate: `BLOCKING` findings enter the E2E round's failure set and must be fixed at the owning layer before a rerun. `ADVISORY` findings are recorded with location and rationale and **never** open a round — taste has no fixed point, and a loop that runs on it edits a surface that was already correct.

### 3.4 Evidence discipline

Cite the image and the location, and say what **in the image** shows the defect. Never infer source architecture, tokens, or component structure from a picture — those go to `/ui-design --mode=review` as static findings. Never invent a measurement: if the claim needs a number the capture cannot give, record `NOT VERIFIABLE` and name what would settle it. `NOT-VERIFIABLE` is missing capability, not a defect, and is never `BLOCKING`.

---

## Part 4 — Cross-capture synthesis

Per-case records answer "is this screen right". Synthesis answers "is this UI right", and it is where most of the value is. Run all four passes:

1. **Reconcile.** Every manifest row has a record — including deduped and capped rows. Missing records mean the review is `UNVERIFIED`, never clean. Report `reviewed / total`.
2. **Cluster by owner.** The same defect on N captures is **ONE finding with N locations**, attributed to the component or layer that owns it under the configured/discovered project architecture. A POM hierarchy is one possible owner model, never a required one. A shared defect remains one owning-layer fix, not one duplicate finding per screen.
3. **Read the sequence.** Some defects exist only between captures: no feedback between an action and its result; layout shifting between consecutive steps; the same component rendered inconsistently across surfaces; a state the journey never reached; convention drift accumulating across a flow; a destructive action with no confirming state.
4. **Report coverage gaps.** List the state-changing actions in the journey that produced **no** capture, plus capped/sampled-out captures — under `uiStateCapture.mode: off`, record transition coverage once as `N/A — uiStateCapture off: {reason}` instead of listing each action, and still list capped/sampled-out matrix captures. A gap is a known blind spot, recorded — not an implicit pass.

**Synthesis output:**

```text
COVERAGE   {reviewed}/{total} captures reviewed · {gaps} uncaptured transitions, or N/A when uiStateCapture.mode is off · caps hit: {y/n}
AUTHORITY  <design/convention docs resolved, and any absent>
BLOCKING   <clustered finding · code · owning component/layer · locations · proposed owning-layer fix>
ADVISORY   <clustered finding · code · locations · rationale>
JOURNEY    <sequence-level findings>
ROUTED     /fix --target=ui <...> · /ui-design --mode=review <static source findings> · <spec/owner escalations>
VERDICT    PASS | BLOCKING-OPEN | ENVIRONMENT-BLOCKED | UNVERIFIED
```

---

## Verdict and handoff

- `PASS` requires: manifest complete, every row reviewed and read, zero open `BLOCKING` findings, and coverage gaps recorded. A green E2E command alone is **never** a visual pass.
- `ENVIRONMENT-BLOCKED` names the missing capture, masking, viewport, or inspection capability. `UNVERIFIED` names the unreviewed captures.
- Route: owning-layer UI defects → `/fix --target=ui` then a fresh same-scope E2E rerun · static source/token/BEM/ownership findings → `/ui-design --mode=review` · runtime/log findings → `/experience-review` · spec or intent gaps → the spec owner.
- Never call `--update-snapshots`, replace a visual fixture, or promote a baseline from this protocol's output. Candidate evidence becomes an expectation only through an explicit `HUMAN-ACCEPTED` record.

## Required record

Persist: capture capability and authority resolution · trigger set and bounds applied · manifest path and row count · one per-case record per row with verdict and taxonomy findings · reconciliation count · clustered blocking/advisory findings with owners · journey-level findings · coverage gaps and caps · routing decisions · final verdict and next step.

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** For applicable visual E2E/QC, capture and review the project-required UI states; capture every UI-state-changing transition only when `uiStateCapture.mode: every-action` is explicitly selected and supported by an evidenced boundary.

**IMPORTANT MUST ATTENTION** while `uiStateCapture.mode` is `every-action`, instrument transition capture at a verified configured/discovered shared action boundary after the runner observes the expected postcondition; if no boundary covers the actions, report transition capture as `ENVIRONMENT-BLOCKED` and never invent a page-object model. In every mode, emit a derived manifest row for each required capture including deduped and capped ones; failure captures are never deduped or capped. Preserve configured owner + case/scenario + optional variant identity; use the configured test/case identity convention.

**IMPORTANT MUST ATTENTION** reload the project design/UI convention docs before judging the first image, review ONE capture at a time appending each record before the next, report case by case and only then synthesize, cluster repeated defects to their owning component, never invent a measurement, and never auto-promote a baseline.
