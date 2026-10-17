# Demo Guide — Output Template & Best Practices

The structure the `demo-guide` skill writes. Fill from real project evidence; keep prose tight. Every
`{placeholder}` is derived, never guessed. Delete sections that genuinely don't apply (state why).

## Contents

- [Best-practice principles (apply while writing)](#best-practice-principles-apply-while-writing)
- [The proof ladder (one rung per case — there is no fifth rung)](#the-proof-ladder-one-rung-per-case--there-is-no-fifth-rung)
- [Document structure](#document-structure)
- [Filling the task block (the copy-paste contract)](#filling-the-task-block-the-copy-paste-contract)
- [Filling the "domain storage / solution" block (the distinctive value)](#filling-the-domain-storage--solution-block-the-distinctive-value)
- [Scope-resolution candidates (Step 0.1 helper)](#scope-resolution-candidates-step-01-helper)
- [Translation notes (`--lang`)](#translation-notes---lang)
- [HTML runbook (`--html`)](#html-runbook---html)

## Best-practice principles (apply while writing)

- **Understand before you script.** Nothing here is written until the skill's Step 1 comprehension bar is
  cleared with `file:line` per answer. A step derived from a screen name instead of the code is a step that
  fails live — in front of the room the guide was written for.
- **Open with the task, not the demo.** The document's first block is a copy-paste-ready task
  (purpose · overall requirements · ALL user stories · ALL acceptance criteria · authorization requirements ·
  estimation · dependencies · DoD), fenced by `<!-- task:START -->` / `<!-- task:END -->` so a developer selects
  it in one go and pastes it into the tracker. Its content is COPIED from the governing spec/task where one
  exists, else derived from the traced demo cases and LABELLED as derived — never invented. The estimate is
  produced with the shared `SYNC:estimation-framework` protocol (bottom-up hours → man-days → derived story
  points), the same one `/plan`, `/work-item --mode=refine`, `/work-item --mode=story`, and `/work-item --mode=dor` use, so the two artifacts cannot drift.
  It sizes ONLY the estimate target — the current changes by default, the target the user names for
  estimation, or (no change set in scope) the labelled demo scope — never silently the entire feature.
- **Show, then explain the data.** A demo is credible when the presenter shows the behaviour AND can point
  to the stored/changed data that makes it true. Every case pairs an observable step with a domain explanation.
- **Steps are live-runnable.** Write action-level steps a presenter follows in the running app: who acts,
  which screen, what input, what to click. No vague "verify it works". Endpoints, commands, and queries appear
  only inside 🔧 technical appendix cases.
- **Lead with the discriminator.** The expected result should be the value that would be WRONG under the old
  behaviour (the thing worth demoing), not a generic "it succeeds".
- **Drive real paths.** Preconditions are staged through real user actions / valid seeders — never by faking
  state that a user could not reach.
- **Demo it in the UI — the reader is a normal user / QC driving the app.** Every main case is staged and
  observed in the product's front-end (screens, forms, clicks, visible output). A case needing an API client,
  CLI, script, manual job/queue trigger, DB query, log tail, or config edit is a 🔧 **technical case**: same
  four-part rigour, but written into the closing `Appendix — Technical demo (non-UI)` — never among the main
  cases to test. A UI demo whose data can also be checked in the DB/logs stays a UI case; that check goes on
  its own **Deeper confirmation (optional, non-UI)** line — never into a numbered step, and never onto the
  proof chain, which carries only `file:line` links. **No front-end in this project?** State the rung in the
  header and read "front-end" above as the project's primary demo surface (API / CLI / library / background job).
- **Group by user story, order by demo flow.** Within a story, order cases so the demo tells a story
  (happy path first, then variants, edge cases, and legacy/back-compat last).
- **Honesty about proof.** Every case sits on exactly one rung of the proof ladder below, and carries the
  `file:line` proof chain a challenger can walk. Never imply a green run that didn't happen.
- **Preserve canonical identity.** Follow the case profile resolved by the `demo-guide` skill. Keep each
  owner/scenario/variant ID exactly as its canonical source defines it; test names, executor references, and
  guide-local labels are separate fields. Map every claimed result to its actual carrier and inspected
  assertion or approved manual-QC outcome under the declared cardinality. Use strict `TC-*`/Section 8 and
  one-TC-to-many-tests only when neither config nor required project references defines a native model.
  Never invent IDs or add a second case registry.
- **No secret values, anywhere.** This guide is shared. Name the setting, the file, and the account **role**;
  render credentials, tokens, keys, connection strings, and customer identifiers as `<redacted:…>`.

## The proof ladder (one rung per case — there is no fifth rung)

| Rung                | Means                                                                | Licence                                                            |
| ------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `✅ ran`            | The configured test/executor or explicitly approved manual-QC carrier was **executed this session** | The ONLY rung that may claim pass. Record the command/procedure and inspected result. |
| `⚠️ trace-verified` | Code read end-to-end, `file:line` chain complete, not executed       | Demo it live; say it was not run.                                   |
| `📄 spec-only`      | Asserted by a canonical spec case under the configured profile; code path was not traced | Weakest rung — say so explicitly.                                   |
| `❌ no coverage`    | Verified that no permitted test/executor or explicitly approved manual-QC carrier is mapped to this case | A reported gap. NEVER filled with a plausible ID.                   |

**Proof chain per case:** where the value is **written** → where it is **read** → where the presenter **sees**
it, `file:line` each. A chain with a missing link caps the case at `📄 spec-only`. A case that fits no rung is
a **stated blocker**, never a quiet promotion.

## Document structure

````markdown
# Demo Guide — {Feature name}

<!-- task:START -->

## Task — copy this block into the tracker

**Title:** {item title}
**Type:** {Feature | Enhancement | Bug | Tech}
**Source of this block:** {`{x}.md` §{n} under the business spec root — default `docs/specs/`, overridable via `specRoots.business.path` in `docs/project-config.json` | task {id} | `derived from code + demo cases this session — not yet reviewed by the PO`}

### Purpose / business value

{Why the item exists, for whom, and the outcome it buys — 2–4 sentences, outcome language, no implementation detail.}

### Overall requirements

1. {requirement — what the item must deliver}
2. {…}

**In scope:** {bullets}
**Out of scope:** {bullets — or `nothing explicitly excluded`}

### User stories

- **{A}** — *As a {role}, I want {capability} so that {value}.*
- **{B}** — *…*

### Acceptance criteria

Preserve each source AC's canonical ID, wording, and structure. Add a guide-local display number only when
the source has no stable AC ID. For derived criteria, use Given/When/Then only where every clause is
supported by evidence.

| Source AC ID / display # | Criterion (source wording and structure) | Canonical scenario · carrier reference(s) |
| ------------------------ | ---------------------------------------- | ---------------------------------------- |
| {source AC ID} | {copied wording; or evidence-backed derived criterion} | {owner}/{scenario}[/{variant}] · {actual carrier ref(s)} |
| {source AC ID} | … | {canonical identity} · {carrier ref(s)} — or `❌ no coverage` |

### Authorization requirements

- **Roles / permissions:** {role → what it may do} `{file:line}`
- **Data scoping:** {tenancy / ownership / visibility rule} `{file:line}`
- **Audit:** {what is recorded, where} `{file:line}`

_{or}_ `None — no authorization behaviour in this item`

### Estimation

**Estimate target:** _{current changes — {n} files on {diff source}}_ **|** _{user-named — {story / task / slice / whole feature}}_ **|** _{named scope (no change set) — {scope} ({scope source})}_
_{When the target is narrower than the item above: `EP/man-days cover the estimate target only, not the full item above.`}_
_{Retrospective sizing for the task record — the work is already implemented}_ **|** _{Forecast — work not yet done}_
_{When a team-agreed task estimate covers exactly this target: reuse it verbatim and note the delta here. When it covers a wider item, cite it as context only.}_

```yaml
effort_points: <n>                      # DERIVED from likely_days — never the driver
complexity: low | medium | high | critical
man_days_traditional: '<min>-<max>d'   # range when likely_days >= 3d; '<N>d' when < 3d
man_days_ai: '<min>-<max>d'
risk_margin_pct: <n>                   # base + add-ons
risk_factors: [<closed-list add-ons>]  # [] if none
blast_radius:
    touched_areas: <n>
    complex_touched: <n>
    downstream_consumers: [<list or count>]
    shared_common_code: yes | no
estimate_scope_included: [code, integration-tests, frontend, i18n, docs]
estimate_scope_excluded: [unit-tests, e2e, perf, deployment, code-review-rounds]
estimate_reasoning: |
    (a) UI tier — row applied
    (b) Backend tier — row applied
    (c) Test scope — case breakdown by driver, fixtures, tier row
    (d) Cost driver — dominant tier + why
    (e) Blast radius — touched, complex, regression scope
    (f) Risk factors — what drives the margin; why not larger/smaller
```

### Dependencies / prerequisites

{blocking items, migrations, configuration, external systems — or `None`}

### Definition of Done

- {… including any coverage gap this guide reports as still open}

<!-- task:END -->

---

**Scope:** {feature} — resolved from {prompt | current working context | user-confirmed}
**Tier / story groups:** {S0–S4} · {n} groups
**Sources:** {spec path(s), test file(s), changed dirs, migration(s)} — {degradation rung landed on, if any}
**Governing spec / rules:** {spec file + rule IDs, if any}
**Investigation:** comprehension bar cleared per group — brief at `{path}` · Delegated: {`/investigate` — Story B mechanics | none}
**Cases:** {n} 🖥️ {main-channel label — `UI`, or the rung's primary surface} · {n} 🔧 technical (appendix) — {`no UI demo path` stories named, if any}
**Demo surface:** {front-end — or `No front-end in this project — primary demo surface is {API / CLI / library / background job}`}
**Deferred / not covered:** {named explicitly, or `none`}
**Audience:** {team / PO / QC / stakeholders}

## Story-group ledger

| Group | Story | Cases (main / technical) | Status |
| ----- | ----- | ----------------------- | ------ |
| G1    | {A}   | {n} / {n}              | written / pending |

---

## Story {A} — {user-facing capability}

> *As a {role}, I want {capability} so that {value}.*

**One-time demo setup:** {roles, configuration, seed data, which app/screen — staged via real paths}
_{`no UI demo path — technical only` — only when a front-end is present but this story has no
front-end demonstration; under the no-front-end rung, use the project's primary surface as the main
channel and do not write this note}_

### {guide-local label} — {short case title} · canonical: `{owner}/{scenario}[/{variant}]` · carriers: `{actual test/executor/manual-QC ref(s)}` · 🖥️ {main-channel label}
- **Setup / preconditions:** {exact state to stage first, via real user paths; accounts by role, secrets `<redacted:…>`}
- **Demo steps:**
    1. {actor} {action} on {screen/endpoint} with {input}
    2. {next action}
    3. {observe/where to look}
- **Expected result:** {observable outcome, phrased as the discriminator vs old behaviour}
- **How the domain stores/changes data & solves it:** {what field/column/table/value is
  persisted or changed and by which entity/migration/handler `file:line`; then the rule/method/invariant
  that consumes it to produce the outcome, and why this storage makes the case correct — edge cases,
  legacy fallback, cross-tier parity}. _(If display-only: state "no storage change" and describe the
  computed representation that solves it.)_
- **Proof chain:** written `{file:line}` → read `{file:line}` → seen `{screen + file:line}`
- **Deeper confirmation (optional, non-UI):** {the DB/log/API check that also confirms this case — a runtime
  action, never a numbered demo step and never on the proof chain above. Omit the line when there is none.}
- **Proof:** {✅ ran — `{actual carrier ref}` · `{command/procedure}` · `{inspected result}` | ⚠️ trace-verified | 📄 spec-only | ❌ no coverage}

### {A2} — ...

---

## Story {B} — ...

[repeat]

---

## How the domain is stored / changed — summary

{One short paragraph per story: the persisted fields/migrations that make the story work, additive/nullable/
backfill status, and — for display-only stories — the canonical representation. This is the "data behind the
demo" the team should walk away understanding.}

## Main case quick reference

Main-channel cases only (🖥️) — technical cases are listed inside the appendix, never here.

| Story | Canonical identity | Actual carrier reference(s) | What it proves | Proof rung |
| ----- | ------------------ | --------------------------- | -------------- | ---------- |
| {A}   | {owner}/{scenario}[/{variant}] | {test/executor/manual-QC ref(s)} | {one line} | ✅ ran / ⚠️ trace-verified / 📄 spec-only / ❌ no coverage |

## Appendix — Technical demo (non-UI)

_Supporting evidence, not the demo. Every case here needs a surface a normal user/QC does not have (API client,
CLI, script, manual job trigger, DB query, logs, config). Same four parts and same proof rung as a UI case —
demoted in order and prominence only. Omit the whole section when every case is UI-demoable._

### {guide-local label} — {short case title} · canonical: `{owner}/{scenario}[/{variant}]` · carriers: `{actual test/executor/manual-QC ref(s)}` · 🔧 technical
- **Why non-UI:** {the surface it requires, and the story it supports}
- **Setup / preconditions:** {…, accounts by role, secrets `<redacted:…>`}
- **Demo steps:** {numbered — the tool/surface, the command shape (no secret values), what to observe}
- **Expected result:** {the discriminator}
- **How the domain stores/changes data & solves it:** {`file:line` anchored, same bar as a UI case}
- **Proof chain / Proof:** {written → read → seen} · {rung}
  _(No `Deeper confirmation` line here, deliberately: a technical case is already demoed on the non-UI surface,
  so the confirmation IS the demo. That line exists only to keep a non-UI check out of a UI case's numbered steps.)_

## Test-execution transparency

- **Proven this session:** {tests/executors or approved manual-QC procedures actually executed + command/procedure + inspected results}.
- **Not executed:** {cases at ⚠️/📄 + why (runner blocker, environment)} — demo these live instead of via a green run.
- **No coverage:** {cases at ❌} — reported gaps, not staged as proven.
- **Blockers:** {cases that fit no rung, or preconditions that could not be staged} — stated, never omitted.

---

_Generated: {DATE} · Scope source: {source} · Evidence: {spec/test/migration paths}_
````

## Filling the task block (the copy-paste contract)

- **Every field is sourced.** A governing spec/task/story exists → copy its wording and cite the path; none
  exists → derive from the traced cases and code and LABEL the block `derived from code + demo cases this
  session — not yet reviewed by the PO`. A field with no evidence gets the explicit negative
  (`None — no authorization behaviour in this item`), never a plausible filler — an invented acceptance
  criterion enters the tracker as a commitment nobody agreed to.
- **ALL of them, not a sample.** Every in-scope user story and every acceptance criterion appears; a story
  the guide demos but the task omits is a drift the tracker will never catch.
- **Trace each AC without changing its identity.** Preserve its source AC ID and wording, then link it to
  the guide-local case label, canonical owner/scenario/variant identity, and actual carrier reference(s):
  `AC-{source ID} ↔ {demo label} · {owner}/{scenario}[/{variant}] → {carrier ref}`. Under the strict
  default, the canonical identity is the real `TC-*` ID and its carrier is the actual covering test(s).
  Verified that no permitted carrier is mapped → `❌ no coverage`; an unknown mapping is a blocker, not a
  coverage verdict. NEVER invent an ID or treat a test name as the canonical case.
- **Authorization is read from code, not assumed.** Cite the guard, policy, attribute, or scoping filter at
  `file:line`, or state there is none. A guessed permission ships as a requirement.
- **Estimation follows `SYNC:estimation-framework` and nothing else** — the same protocol `/plan`, `/work-item --mode=refine`,
  `/work-item --mode=story`, and `/work-item --mode=dor` apply: bottom-up hours → `likely_days` → risk margin → min–max range when
  `likely_days ≥ 3`; **effort points are DERIVED from days**, never chosen first; the full frontmatter goes in
  a fenced `yaml` block so it survives the paste. Size the TARGET WORK, never the writing of this guide.
- **Estimate the change, not the feature.** The estimate target is exactly what `--estimate` or an explicit
  estimation instruction names (a demo scope alone never counts); else the current changes — the union of
  branch commits vs the default branch and the staged + unstaged diff, narrowed to the demo scope; else, with
  no change set in scope, the demo scope under the `named scope (no change set)` label. Unchanged feature code
  is demo context — name it in `estimate_reasoning` (e), never inside the number. State whether the number is
  a retrospective sizing or a forecast; reuse a team-agreed estimate verbatim (noting the delta) only when it
  covers exactly this target.

## Filling the "domain storage / solution" block (the distinctive value)

For each case, read the code — do not infer — and capture:

| Question | Where to look |
| -------- | ------------- |
| What field/column is persisted or changed? | entity / value object, DTO mapping, `*EntityConfiguration`, schema/migration file |
| Is the change additive / nullable / backfilled? | the migration `Up`/`Down`, default values, null-handling in readers |
| What value is actually written (anchored/computed)? | the command/handler that sets it; the domain method that computes it |
| Which rule consumes the stored data to solve the case? | the reader/derivation/gate/resolver method + its callers |
| Why is this storage correct (edge cases, legacy, parity)? | fallback branches, cross-tier/mirror logic, invariants pinned by tests |

State it in plain team language, but keep the `file:line` anchors so anyone can verify.

## Scope-resolution candidates (Step 0.1 helper)

When the prompt is empty and you must derive scope, gather candidates from — in order — the active
task/workflow goal, `git status`/`git diff`, branch-vs-main commits, and in-progress plans, specs, and release
notes. If still ambiguous, present the top 2-4 as `ask user question tool` options plus free-text; never auto-pick.

## Translation notes (`--lang`)

Translate prose only. Keep verbatim: code identifiers, file paths, `file:line`, configured canonical IDs and
test/executor/manual-QC references (including `TC-*` under the strict default), numeric values (hours,
offsets, dates), and command snippets. Put the translated copy alongside the English one
(e.g. `{name}.{lang}.md`) so the team can cross-reference.

## HTML runbook (`--html`)

Only after the markdown is approved, follow the host's Artifact flow to render a self-contained runbook
(inline CSS/JS, theme-aware, favicon). Keep it a faithful render of the markdown — same stories, steps,
expected results, and storage explanations.
