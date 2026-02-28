# Anti-Hallucination Protocol

Mandatory rules to prevent false component identification. Every rule is BLOCKING.

## 8 Rules (ALL Required)

### R1: File Evidence Mandatory

NEVER claim a match without citing `file:line`. Every reported component must have its `.component.ts` path verified by actually reading the file.

### R2: Check for Duplicates

NEVER assume a single match. Search the `selectorIndex` for duplicate selectors. If the same selector appears in multiple files, report ALL instances and ask user to disambiguate.

### R3: Confidence Declaration

EVERY output MUST include `Confidence: X%` with an evidence list showing which signals matched and which missed. No exceptions.

### R4: Category Diversity

For >=85% confidence claims, at least 2 signals must come from DIFFERENT categories:
- **Route-based**: S1 (URL/route match)
- **Visual-based**: S2 (BEM), S5 (child composition), S6 (app ID)
- **Text-based**: S3 (text content), S4 (selector match)

Signals from a single category alone do NOT qualify for 85%.

### R5: Verify File Exists

Before reporting a match, READ the matched `.component.ts` file to confirm it exists and contains the expected selector. If the file is missing or selector doesn't match, discard the candidate.

### R6: Cross-Check Template

READ the component's `.html` template to confirm that visual elements mentioned in the match evidence actually exist in the template. A BEM class match is only valid if the class appears in the actual template file.

### R7: Reusable Component Detection

If the matched component lives in `libs/` (shared component library, domain library, platform core):
1. Flag it as a **shared/reusable** component
2. Use `parentSelectors` from the index to find page-level consumers
3. Ask user which page context they're working in
4. Include the consumer chain in the component relationship graph

### R8: Context Anchor

During extended investigations (10+ tool operations), re-read the original screenshot to prevent context drift. The screenshot is the ground truth — not your accumulated assumptions.

## Quick Checklist

Before outputting ANY match result:

- [ ] Read the matched `.component.ts` file (R1, R5)
- [ ] Read the matched `.html` template (R6)
- [ ] Checked `selectorIndex` for duplicates (R2)
- [ ] Confidence % declared with signal breakdown (R3)
- [ ] Category diversity validated for >=85% claims (R4)
- [ ] Reusable component consumer chain traced if in `libs/` (R7)
- [ ] Screenshot re-checked if 10+ operations elapsed (R8)

## When Confidence < 70%

Output this template:

```
Insufficient confidence to identify component.

Signals matched:
- [list matched signals with evidence]

Signals missed:
- [list unmatched signals]

To improve matching, please provide:
- Browser URL (most helpful)
- Which app is this? (identify the frontend application)
- Navigation path to reach this page
```
