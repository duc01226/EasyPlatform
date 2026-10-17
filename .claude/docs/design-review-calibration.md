# UI/UX Review Calibration — worked examples with expected findings

> **Role:** calibration set for `design-review-checklist.md` (check IDs), `SYNC:ui-ux-design-principles` (`UI-*`) and the `ui-design --mode=review` mode. Each case states the situation, the evidence a reviewer must gather, the findings a correct review produces (ID + default severity), and — just as important — what is NOT a finding. Use it to calibrate severity before a review and as the fixture set for evaluating review output.
>
> **Portability.** Every case is generic; no project, product, or stack is implied. Numbers inside a case are the case's own facts, never thresholds. A project's design-system docs, accepted decisions, and configured budgets outrank any expectation here.
>
> **Consumed by:** `ui-design --mode=review` (Phase 2C and the report), `design-review-checklist.md` (Quick Summary). Add a case when a real review mis-ranked a defect class; never add a case that encodes one project's convention.

---

## C1 — The overloaded creation dialog

**Situation.** A "new record" action opens a dialog. The dialog offers three entry modes as tabs (pick an existing record, enter a new one, upload documents). Above the form sit an upload drop zone and a paste box whose caption says the parsing "is not connected yet". Below them, a two-column form with ~30 inputs in four headed groups (identity, profile, education, …); social handles, marital status, gender, and both "birth year" and "date of birth" appear. The dialog body scrolls; its save action sits at the bottom of the scroll. Placeholders hold realistic example values.

**Evidence to gather.** Surface root and the component tree of the dialog (§0.5) · the creation operation's truly required data (what makes a valid record) · who consumes each input and when (Field Necessity Matrix, §R) · the project's complexity budget, if configured · render at supported viewports (is the save action visible without scrolling?) · dismiss behavior with filled inputs.

**Expected findings.**

| ID | Severity | Why |
| --- | --- | --- |
| `B12` + `R1`/`R2` | P1 | Creation asks for far more than a valid, useful record needs; most inputs have no consumer at this step. One finding carrying both IDs. |
| `E9` | P1 | A long, multi-section entry task lives in a dialog; it belongs in a full view or a stepped flow. |
| `B14` | P2 | Three entry modes plus upload plus paste compete in one view. |
| `K10` | P1 | A visible control that does not work, with development-status copy shown to users. |
| `E10` | P2 | Primary action reachable only after scrolling the dialog body. |
| `E11` / `R7` | P1 | (If dismiss discards input) 30 inputs lost on an accidental close. |
| `R6` | P2 | Birth year and date of birth both asked; one is derivable. |
| `R9` | P2 | Two-column pairs are unrelated, so reading/tab order zigzags (also `F7` on web). |
| `R10` | P2 | Realistic example values read as entered data. |

**Systemic clustering.** If other creation dialogs share the pattern, report ONE finding naming every location or the shared form owner.

**NOT a finding.** The number of fields by itself — a detailed profile editor opened deliberately from the record may legitimately hold 30 inputs. The defect is the fields' placement at creation time and in a dialog, not their existence.

**Fix shape.** Minimal creation (the handful of inputs that make a valid record) in the dialog, or a full-view stepped flow; enrichment in the record's own edit view; entry modes as a first, explicit choice; unfinished controls hidden behind a feature switch.

---

## C2 — The dropdown that renders under its neighbour

**Situation.** A menu inside a card opens behind the next card even though the menu's stacking value is high.

**Evidence to gather.** Walk the ancestors of the menu (§0.5 step 2): an ancestor has a transform, opacity below 1, a filter, or another stacking-context-creating property, so the menu's stacking value only competes inside that ancestor. Check whether the project provides an overlay/portal mechanism and a layer scale.

**Expected findings.** `ui-design --mode=review` Category 4 (stacking context, not the value) — BLOCKED when the menu is unusable. Fix at the owner: render the overlay through the project's overlay mechanism, or remove the unnecessary stacking context — never escalate the stacking value.

**NOT a finding.** The high stacking value itself when it comes from the project's layer scale.

---

## C3 — Ellipsis that never appears

**Situation.** A long name in a row pushes action buttons off the edge; the name's own style declares truncation.

**Evidence to gather.** The name's parent is a flex/grid track whose minimum size defaults to its content, so the truncation never triggers. The defect lives in the ancestor's layout context, not in the name's style.

**Expected findings.** `ui-design --mode=review` Category 1 (HIGH when a flex child truncates without a shrinkable minimum) + `C2`/`F1` if controls become unreachable. Fix on the track that owns the constraint.

---

## C4 — The table that forgets

**Situation.** An admin list is filtered and sorted; opening a row and returning resets the list to page 1, unfiltered. When a filter matches nothing, the table says "No data".

**Expected findings.** `H13` P2 (state lost across navigation) · `H15` P2 (filtered-empty indistinguishable from empty). §H applies because the usage is repeat/expert, even though the platform is web.

**NOT a finding.** High row density on this surface (`H3` — expert density is correct here).

---

## C5 — A house style is not a template tell

**Situation.** Every screen of an established product uses uppercase section labels and a monospace face for numeric data, as documented in its design-system reference.

**Expected findings.** None under `DD-4`. A documented, repo-wide convention is an intentional identity (precedence: brief → project design system → catalog).

**What would change the verdict.** A NEW surface that departs from the documented style without a stated reason is an `M5` consistency finding — the opposite direction.

---

## C6 — The dialog that lets focus escape

**Situation.** A confirmation dialog opens; keyboard focus stays on the page behind; Escape does nothing; closing leaves focus at the top of the document.

**Expected findings.** `I15` P1 (P0 when the dialog blocks task completion for keyboard or screen-reader users). Render-dependent parts (actual focus order) are `NOT VERIFIABLE` from source alone — state it and verify on the running surface.

---

## How to use this file in a review

1. Before the sweep, skim the cases whose situation resembles the surface under review.
2. After drafting findings, compare each against the closest case: same ID? same severity? did you record the "NOT a finding" boundary?
3. A deliberate deviation from a case's expected severity must name the project evidence that justifies it.
