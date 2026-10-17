# Custom Prompt Registry — file contract, index format, scoring rubric

Loaded by `SKILL.md` before any write, and before scoring in MATCH mode. Everything here is the single source of truth for the on-disk shape of a custom prompt.

---

<!-- SKILL-NAV:START -->
## Contents

- [1. Prompt body file](#1-prompt-body-file)
- [2. Index row format](#2-index-row-format)
- [3. Scoring rubric (MATCH mode)](#3-scoring-rubric-match-mode)
- [4. Authoring quality bar (what "the best version" means)](#4-authoring-quality-bar-what-the-best-version-means)
- [5. Promotion to a real skill](#5-promotion-to-a-real-skill)

<!-- SKILL-NAV:END -->

## 1. Prompt body file

Path: `<prompts-dir>/<slug>.md` (default `docs/project-prompts/<slug>.md`).

### Frontmatter fields

| Field | Required | Purpose |
| --- | --- | --- |
| `name` | **yes** | Human name, matches the index row and the slug |
| `description` | **yes** | ONE line. This is the primary matching surface — write it as *"Use when …"* so it states the trigger condition, not the mechanics |
| `triggers` | **yes** | Array of the words/phrases a user would actually type. The escape hatch when the description is too formal to match casual phrasing |
| `version` | yes | SemVer. Patch = wording, minor = changed steps, major = changed purpose |
| `updated` | yes | ISO date of the last write |
| `route` | no | A workflow id (`workflow-bugfix`) or skill name (`plan`) this prompt activates instead of executing its own steps |
| `inputs` | no | Named values the body needs. Every declared input is asked for (batched) before execution if not supplied |
| `tags` | no | Free-form grouping for LIST output |

### Body template

```markdown
---
name: <human name>
description: Use when <trigger condition> — <what it produces>.
triggers: [<phrase>, <phrase>, <phrase>]
version: 1.0.0
updated: YYYY-MM-DD
route: <workflow-id | skill-name>      # optional
inputs: [<input-name>]                 # optional
tags: [<tag>]                          # optional
---

## Goal

<One sentence — what a successful run produces.>

## Inputs

- `<input-name>` — <what it is, where the user gets it, what a valid value looks like>

## Steps

1. <Imperative step.>
2. <Imperative step.>

## Success criteria

- <Observable check that proves the run worked — not "it ran", but what is true afterward.>

## Guardrails

- <What this prompt must NOT do. Runs under the session's normal gates; it cannot waive them.>
```

### Authoring rules

1. **Steps are imperative and observable.** "Run the integration suite and report failures" — not "handle testing".
2. **Parameterize instead of hardcoding.** Any ticket id, branch, date, or path that changes per run becomes an `inputs:` entry. — why: a hardcoded value silently produces a wrong-target run the next time the prompt fires.
3. **Success criteria are mandatory and falsifiable.** A criterion nothing could fail is not a criterion.
4. **Guardrails are constraints, not permissions.** A body can narrow what happens; it can never widen what the session is allowed to do.
5. **No secrets.** Credentials, tokens, and connection strings never go in a prompt body — reference the env var or secret store by name.

---

## 2. Index row format

Index: `custom-prompts-reference.md` under the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path). The header carries a `**Prompts directory:**` line so the index is self-describing about where bodies live.

One row per prompt, in a single table:

```markdown
| Name | Description | Triggers | Updated | Body |
| --- | --- | --- | --- | --- |
| release-hotfix | Use when a production defect needs an out-of-cycle patch — drives investigate → fix → verify → release notes. | hotfix, emergency release, patch prod | 2026-08-16 | [release-hotfix.md](../project-prompts/release-hotfix.md) |
```

Index rules:

- **Descriptions are copied verbatim** from the body frontmatter. Never re-word them in the index — the two must be byte-identical or matching scores against text the body does not contain.
- **Keep the index lean.** Name, description, triggers, date, link. No step summaries, no bodies. The index is read on every invocation; anything extra is a recurring cost.
- **Soft cap ~30 rows.** Past that, matching quality degrades and the read cost stops being negligible — tell the user and propose promoting the stable entries to real skills via `/skill-creator`.
- **Index and bodies are written in the same turn, always.** A row without a body is a broken match; a body without a row is unreachable.

---

## 3. Scoring rubric (MATCH mode)

Score each index entry against the user's request. Index text only — bodies are unread by design.

| Signal | Weight | Scores when |
| --- | --- | --- |
| Exact name match | 1.0 | The request names the prompt outright |
| Trigger phrase hit | 0.6 each | A `triggers` entry appears in the request (substring, case-insensitive) |
| Description intent overlap | 0.0–0.5 | The request and the description describe the same *outcome* — judged semantically, not by shared words |
| Tag hit | 0.15 each | A `tags` entry appears in the request |
| Shared generic verb only | 0.0 | "update", "run", "check" alone — never let a bare verb carry a match |

Thresholds:

- **≥ 1.0** — strong candidate, present first as `(Recommended)`
- **0.5 – 1.0** — plausible, present as an alternative
- **< 0.5** — below floor, do not present
- **Nothing above floor** — offer *save as new* / *handle normally*

Scoring rules:

1. **Score the outcome, not the vocabulary.** Two entries sharing the word "test" are not both matches if only one produces what the user asked for. — why: keyword overlap is the single largest source of confidently-wrong matches.
2. **Never break a near-tie yourself.** Two entries within ~0.2 → present both and let the user pick. A near-tie is precisely where your inference is weakest.
3. **State the reason per candidate** in one clause ("matched trigger `patch prod`"). The user is confirming a judgement, and cannot confirm one they cannot see.
4. **The score never replaces the gate.** 1.0 still goes to `ask user question tool`.

---

## 4. Authoring quality bar (what "the best version" means)

Applied when SAVE drafts a prompt from the user's raw wording. Each row is a defect to fix in the draft, not a nicety.

| Raw material | Draft it as | Because |
| --- | --- | --- |
| A topic or fragment ("the deploy thing") | A named outcome (`deploy-staging-release`) + a Goal sentence | A prompt with no stated outcome cannot have success criteria, so no run of it can ever be judged |
| One run-on instruction bundling several actions | Separate ordered steps, one action each | Bundled steps hide which part failed, and the AI silently drops the tail of a long sentence |
| Vague verbs ("handle", "deal with", "make sure") | Observable actions ("run X", "assert Y", "write Z to …") | An unobservable step cannot be verified, so the prompt reports success on a no-op |
| Implied but unstated steps | Written out explicitly, flagged as ADDED at the proposal gate | The implication lives in the user's head today and is gone in three months |
| A hardcoded id/branch/path/date | An `inputs:` entry referenced by the steps | Otherwise the second run targets the first run's data |
| "and then check it works" | A falsifiable Success criteria bullet | "It works" is not checkable; "the endpoint returns 200 and the row exists" is |
| No stated limits | A Guardrails bullet naming what must NOT happen | Absent limits, the prompt inherits the widest possible interpretation on every future run |
| Casual phrasing the user typed | Kept verbatim in `triggers` | Matching must hit the words the user will actually type, not the formal ones you rewrote them into |

Drafting rules:

1. **Improve the expression, never the intent.** Sharpening wording is the job; changing what the prompt sets out to do is not — if the draft would do something the raw text didn't ask for, that is an ADDITION and must be called out at the gate, not folded in silently.
2. **Say what changed, per change, with the reason.** A list of edits the user can scan beats a polished artifact they must reverse-engineer.
3. **Surface assumptions rather than resolving them.** An assumption stated at the gate gets corrected in seconds; one baked into the body silently misfires for months.
4. **Do not pad.** Steps the user did not want, defensive caveats, and ceremony sections make the prompt worse. If a section has nothing real to say, omit it.
5. **The gate always offers verbatim.** The user's own wording is a legitimate final answer, and refusing your draft must cost one click.

---

## 5. Promotion to a real skill

A custom prompt earns promotion to `.claude/skills/` when it is (a) used repeatedly, (b) stable in wording, and (c) **project-independent** — it would work on another codebase.

Promotion is always a user decision, never automatic. When an entry qualifies, say so and offer `/skill-creator`; on promotion, delete the registry entry so the two carriers never both define it. — why: a procedure defined in both planes drifts, and the harness has no rule for which copy wins.
