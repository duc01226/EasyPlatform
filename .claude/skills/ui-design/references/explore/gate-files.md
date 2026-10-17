# Explore Gate Files

> **Purpose:** templates for the files `/ui-design --mode=explore` writes at its checkpoints. A checkpoint that exists only in chat is invisible to the next step, a resumed session or another model; a gate file makes it auditable.
>
> **Rules:**
>
> 1. Write gate files under `tmp/design/<run>/` only — they are disposable run output, never project docs.
> 2. Record the user's words VERBATIM where a field says so — a paraphrase is not evidence of a choice.
> 3. "Continue", "looks good", "go ahead" and silence are NOT a pick and NOT an exemption.

## Contents

- [`run-notes.md`](#run-notesmd)
- [`brand-spec.md`](#brand-specmd)
- [`direction-approved.md`](#direction-approvedmd)

## `run-notes.md`

Written at steps 3–5 of `references/explore/workflow.md`; step 10 adds the journey fixes. Every draft brief carries its path.

```markdown
# Run notes — <subject>

- Run: tmp/design/<run>/
- Deliverable: <web page · app screen · slide · social post · poster · animation key frame>
- Canvas: <--viewport value, e.g. 1440x900,390x844> — source: <brief · project doc · default>

## User references
- User's reply (verbatim): "<exact words | no reply>"
| Reference (URL or path) | Liked / disliked | Used as |
|---|---|---|
| <url or path> | <liked · disliked> | <seed (b) · ADOPTED <axis> · avoid in every draft> |

## Brand
- <N/A | tmp/design/<run>/brand-spec.md (scope: CONFIRMED | NOT CONFIRMED — drafts brand-neutral)>

## Content imagery (one shared set, stored under tmp/design/<run>/imagery/)
- Imagery: <needed — reason | none needed>
| File | Shows | Source (URL or user file) | Licence | Credit | Retrieved |
|---|---|---|---|---|---|
| imagery/<file> | <what it shows> | <url or path> | <licence or "user-supplied"> | <author or "none required"> | <date> |

| Placeholder label | Real image that belongs there |
|---|---|
| "<label shown in the drafts>" | <description> |

## Journey fixes (UX-8)
Written at step 10 after the walkthrough of the chosen draft. The next step (`--mode=good` or the deck builder) marks each row.
| Fix | Journey step | Applied / N/A (by the next step, with a reason for N/A) |
|---|---|---|
| <unserved step or orphan element, and the change that serves it> | <journey name · step #> | <applied — where | N/A — reason | pending> |
```

## `brand-spec.md`

Written by `references/explore/brand-asset-protocol.md` when the brief names a real brand. Every draft reads it.

```markdown
# Brand spec — <brand>

- Run: tmp/design/<run>/
- Scope: <CONFIRMED — own brand | CONFIRMED — permitted work for the brand; who confirmed, verbatim: "<…>" | NOT CONFIRMED — <no reply | declined>; brand marks not used, drafts are brand-neutral>
- Date: <YYYY-MM-DD>

## Sources
| # | Source (official URL or user-supplied file) | What it provided | Retrieved |
|---|---|---|---|
| 1 | <url or path> | <logo / product image / UI capture / guideline doc> | <date> |

## Assets (verified images only, stored under tmp/design/<run>/brand/)
| File | Kind | Source # | Verified (type by file signature · pixel size or vector · SVG: no active content) | Usage limits stated by the source |
|---|---|---|---|---|
| brand/<file> | <logo light · logo dark · product image · UI capture> | <#> | <PNG 1200x800 · SVG vector, active content: none> | <limits or "none stated"> |

## Colours (sampled from the verified assets above, never guessed)
| Name | Hex | Sampled from | Role |
|---|---|---|---|
| <name> | #RRGGBB | brand/<file> | <primary · accent · neutral> |

## Type
- Families: <name(s) from guidelines or identified from assets> — source: <#> | UNVERIFIED

## Unverified or missing
- <each gap stated plainly — including every asset that failed verification (file, reason) and the missing marks when scope is NOT CONFIRMED; drafts must not fill a gap with a guess>
```

## `direction-approved.md`

Written at step 10 of `references/explore/workflow.md`, or at step 1 when explore is exempted. Exactly one of `## Pick` and `## Exemption` is filled; `## Design Plan tokens` is always filled.

```markdown
# Direction approved — <subject>

- Run: tmp/design/<run>/
- Date: <YYYY-MM-DD HH:mm>

## Axes
| Axis | Status | Source |
|---|---|---|
| Colour | <ADOPTED | FREE> | <brief · doc path · user reference · "explored"> |
| Type | <ADOPTED | FREE> | <…> |
| Layout | <ADOPTED | FREE> | <…> |

## Pick (fill when drafts were shown)
- Drafts shown: <N (Step 0 count): direction-a.html[, direction-b.html[, direction-c.html]]>
- Canvas: <deliverable and --viewport value from run-notes.md>
- Rendered (per draft): <PNG paths under renders/direction-x/ | NOT VERIFIABLE — html-export exit <3 | 1 | 2 | other code, e.g. 130 after an interrupt>: <stderr line or setup pointer> | stale — predates the DD-8 edit>
- Selection: <USER | USER — 1 option | AUTO-SELECTED — <reason: no question tool (1 draft) | browser unavailable and no PNG shown | question tool errored>>
- User's reply (verbatim): "<exact words>" (USER — 1 option or AUTO-SELECTED: N/A)
- Recommendation + evidence: <draft · UX-4/UX-9/UX-10 and design-system-fit reasons · trade-offs of the other drafts (N/A for 1 draft)>
- Chosen: <a | b | c | mix>  ("none fit" is recorded here, then explore repeats from new seeds)
- Mix detail: <which parts come from which draft | N/A>
- Seed of the chosen draft: <style row · reference URL · persona traits>

## Exemption (fill when explore was skipped)
- Reason: <brief states a direction | design system pins all three axes | user opted out>
- Evidence (verbatim quote or doc path + section): "<…>"

## Design Plan tokens
Copied at step 10 from the chosen draft's Design Plan (a mix: from the draft each part was taken from; an exemption: from the adopted direction). A deck builder reads its tokens from here.
| Colour name | Hex | Role |
|---|---|---|
| <name> | #RRGGBB | <background · text · primary · accent · neutral> |

| Type family | Role | Scale (sizes, weights) |
|---|---|---|
| <family> | <display · body · data · caption> | <e.g. 56/32/20/16 px · 700/400> |

- Layout concept: <one sentence — composition, alignment, focal point, reading order>
- Web fonts: <none — system stacks only | <family> loaded from <URL>: travels only when the deck builder packages the font file inside the deck; otherwise the deck uses the project's type token, then the closest system stack, and records the substitution as a departure>

## Next
- Continue with `--mode=good` from: <tmp/design/<run>/direction-x.html | the adopted direction>
- Slide deliverable instead: hand this file (with its `## Design Plan tokens`) and `run-notes.md` (with its `## Journey fixes (UX-8)`) to <`/presentation-builder` (user runs it) | `feature-presentation`>
```
