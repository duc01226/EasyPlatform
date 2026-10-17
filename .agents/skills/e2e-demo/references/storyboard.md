# Screenshot storyboard handoff

Read when composing an E2E demo. Preserve canonical case identities and capture references; this is a derived presentation ledger, not a new case registry.

## Case ledger

Write `demo-manifest.json` before composing the HTML and update it as chapters are rendered. Use the existing E2E result/capture records as evidence; reference their fields instead of changing their schema.

| Record | Required information |
| --- | --- |
| Source | Request/scope, resolved revision or base/head pair, dirty-content fingerprint when applicable, inclusion reasons and execution target/build identity |
| Evidence | Original run ID, result report and capture-manifest paths; original freshness/reuse status |
| Case | Canonical owner path, case/scenario ID and optional variant; actual test path/name and runner project/device when applicable |
| Result | Run and attempt/retry identity, original pass/fail/skip/blocked status, actual assertion/result reference |
| Captures | Ordered manifest references, verified image paths and hashes, relevant step/viewport, dedupe resolution, required-capture gaps |
| Presentation | Chapter output and scene start/end in milliseconds, caption and capture reference for each scene; result cards explicitly marked nonvisual |
| Summary | Selected/executed/shown/missing counts, uncovered identity list, independent test/visual/coverage/export/inspection verdicts |

Use owner + case + variant as the canonical key; distinguish required runner/device instances without minting new case IDs. Determine counts by identity sets, not image count. A case may have multiple scenes or share a capture with another case only when each case's assertion/result and scene attribution remain explicit. Missing UI captures remain missing even if a text card accounts for the case.

## Recordable HTML

Read [the animation recording contract](../../html-export/references/animation-recording.md) before writing the HTML. It owns `window.__ready`, `window.__seek(ms)`, `window.__duration` and the controlled-clock semantics.

- Build trusted local HTML from verified image files and escaped captions. Treat filenames and case labels as data; do not interpolate them into executable JavaScript or raw markup without appropriate escaping.
- Fit screenshots without stretching or clipping the demonstrated outcome. For tall full-page captures, use explicit crop/pan scenes that retain required states; caption the actual source viewport. Choose timing for legibility, not to simulate runtime latency.
- Define scene intervals from the ledger. Set `window.__duration` in milliseconds to the complete timeline, including the final outcome/coverage scene.
- Drive scene selection and any transitions solely from `window.__seek(ms)`. Do not wait for timers or animation frames inside `__seek`; the recorder pauses them during that call.
- Load/decode images before their scene is captured. Publish `window.__ready = false` during initial loading and `true` only after required initial assets are decoded; reject missing/undecodable images as page errors. For large scopes, use chapter-local asset sets rather than loading the entire suite into one page.
- Keep setup UI, play controls and download buttons outside the recording or mark them `data-export-hide`. Make the final chapter scene persist through the recorder's last sampled frame.
- Keep script data separate from prose and use safe JSON serialization/escaping when embedding it. Preserve the existing export trust policy; offline mode does not sandbox local file access.

## Reconciliation

Before export, check that every selected case has result evidence and scene attribution, required image paths resolve, intervals are ordered/nonoverlapping with no unintended blank gaps, and duration covers the complete timeline.

After export, confirm each chapter's exit status and manifest output path. Cross-check ledger timestamps with rendered chapter boundaries and each case's outcome; encoding success alone does not prove that an image loaded. Report missing inspection capability explicitly. Return the complete case index alongside split videos, with any missing required captures and original failing/skipped/blocked results visible.
