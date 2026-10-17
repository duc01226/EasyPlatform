---
name: release-doc
version: 3.0.1
description: '[Git] Use when creating release notes or a release document from git history at any scope (tag, branch, time range), as markdown plus a standalone HTML presentation.'
disable-model-invocation: true
triggers:
    - release notes
    - release doc
    - release document
    - release analysis
    - release presentation
    - release html
    - what changed in the last
    - changes in the last
    - generate release
    - changes last 30 days
    - last N days
---

## Quick Summary

**Goal:** Generate a professional release document from git history at **any scope** — tag-to-tag, branch-to-branch, or a time range ("last 30 days") — with automated categorization, thematic AI analysis, service detection, and validation, **plus a rich standalone HTML release presentation written FOR REAL USERS** — user-visible features and enhancements only, with faithful mock-ups of the project's REAL screens for any UI change — which auto-opens in the browser. Both outputs are produced by default; the markdown carries the engineering detail, the HTML carries the user story.

**Summary:**

- Resolve refs or freeze the exact time inventory, then save Git evidence before parsing and categorizing changes.
- Analyze significant diffs and any requested focus; render and validate Draft markdown with honest empty-scope results.
- Unless `--no-html`, map the release, trace highlights, correlate specs and real UI, write the analysis report, assemble/save HTML, run its four gates, open best-effort and report. Keep review and approval before publication; honor `--no-open` and configured defaults.

> **This is the single release skill.** Use `/release-doc` for every release-summary need.

**Workflow:**

0. **Resolve Scope** — refs (`base head`), a range (`--range`), or a time window (`--days N` / `--since DATE`); `--focus` deepens one area
0b. **[BLOCKING] Dump Git Artifacts** — write log, file-status, diff-stat, and full diff to disk BEFORE analyzing anything
1. **Parse Commits** — ref scopes use `parse-commits.cjs <base> <head>`; time scopes build the same JSON from the exact selected commit hashes
2. **Categorize** — `categorize-commits.cjs` for user-facing vs internal sections; add the thematic area map for time-range scopes
3. **Analyze Key Diffs** — read the most significant changes per category via `git show` / `git diff`
4. **Render** — `render-template.cjs --version vX.Y.Z` generates markdown with Summary, What's New, Improvements, Bug Fixes, Breaking Changes, Technical Details
5. **Validate** — `validate-notes.cjs` scores against quality rules (100 points)
6. **[BLOCKING] HTML Presentation (R1–R9, default-on)** — run the canonical procedure in `references/html-release-report.md`: comprehend the whole change set → investigate each highlight end-to-end → correlate spec changes → inventory the real existing UI → **write the temp analysis report** → assemble ONE standalone HTML doc **written for real users**, with real-UI mock-ups and one explanatory visual per highlight, **beautiful and easy to read** → save → accuracy + fidelity + audience + visual-clarity gates → **auto-open**

**Key Rules:**

- **Pipeline**: resolve scope → dump → parse → categorize → analyze → render → validate → present
- **Scope is inferred, never asked twice** — refs given → tag/branch comparison; `--days`/`--since` → time range; neither → default to the last tag..HEAD
- **Dump first, read second** — NEVER analyze a diff you haven't saved to a file first; large ranges overflow context
- **Advanced**: Service detection, breaking change analysis, PR metadata, contributor stats, version bumping
- **Human Review**: Generated notes are Draft status, require review/enhance/approve before publish
- **Validation**: `validate-notes.cjs` scores against quality rules (100 points)
- **The HTML presentation is DEFAULT-ON** — Step 6 always runs; `--no-html` is the explicit opt-out. Never ask the user to request it and never treat it as optional polish.
- **The HTML stage is model work, not a script** — the scripted pipeline (steps 1–5) produces the markdown; the HTML presentation requires reading the actual diffs, tracing each feature end-to-end, and reproducing real UI, so it is executed by following `references/html-release-report.md`, NOT by piping another `lib/*.cjs`
- **Breadth before depth** — map the WHOLE change set before opening any single feature (R1); diving into the first interesting commit under-reports the rest
- **[BLOCKING] Temp report before HTML** — the HTML is assembled FROM the temp analysis report, never straight from a diff or from memory (R5)
- **[BLOCKING] The HTML is written for REAL USERS, not engineers (R6.0)** — its reader USES the product and never reads its code. Only `USER-VISIBLE` outcomes go in At a glance / What's New / What Changed / Fixes; refactors, tests, CI, tooling, dependency bumps, type/lint and doc-only changes are `INTERNAL` and live one line each in the collapsed "Under the Hood". Prose carries no class, component, file, endpoint, or framework names and no commit subjects — evidence chips carry traceability, sentences carry meaning. The engineering view is not lost: it is the markdown notes plus the collapsed §7–§9.
- **[BLOCKING] Quality goal: the HTML is beautiful, easy to read and easy to understand (R6.5)** — the first screen shows user-facing counts and, when anything requires action, an "Action required" defaults board (was → now → how to keep the old behaviour); each user-visible What's New / What Changed highlight is carried by one explanatory visual (mock-up, before → after pair, flow diagram, comparison bars of measured numbers, option matrix, or a terminal/chat frame of real text) plus 2–4 plain sentences and a "How to use / turn off" line; highlights are grouped by the reader's goal; the page is verified from wide and narrow rendered screenshots, not from the source — with no renderer, a source-only check recorded as such (R8.4)
- **Never manufacture user value** — an internal change reworded to sound user-facing is a fabrication (R8.1). An honest "no user-facing changes this release" page beats a padded one.
- **UI-bearing highlights lead with their mock-up** — the picture first, the prose explaining it second (R6.2 §4/§5)
- **Mock-ups follow the `work-item --mode=mockup` protocol, not a second invented one (R6.3)** — `work-item --mode=mockup` Steps 3 (design system), 3b (inventory the real existing UI), 3c (real domain entities) and 7 (fidelity gate) govern HOW a screen is reproduced; this skill governs WHAT gets rendered. Real design tokens, real component structure and class names, real route and page shell, real domain field names; never Lorem ipsum, never a generic card layout. Borrow the fidelity contract, not the clickable-prototype machinery.
- **Backend-only ≠ `NO-UI`** — if the change's effect shows on an existing screen it is `BEHIND-UI` and gets a mock-up of that screen (R4.1)
- **`NO-UI` release still gets the full HTML** — state `UI surface: none` and omit only the mock-up sections
- **Auto-open is best-effort** — a failed browser launch is a warning with the printed path, NEVER a failed run; `--no-open` opts out

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Contents

- [Quick Summary](#quick-summary)
- [Release Notes & Release Document Skill](#release-notes--release-document-skill)
- [Invocation](#invocation)
- [Choosing a Scope (Step 0)](#choosing-a-scope-step-0)
- [Step 0b: \[BLOCKING\] Dump Git Artifacts BEFORE Analyzing](#step-0b-blocking-dump-git-artifacts-before-analyzing)
- [Workflow](#workflow)
- [Complete Pipeline](#complete-pipeline)
- [Advanced Features](#advanced-features)
- [Configuration](#configuration)
- [Output Structure](#output-structure)
- [Human Review Gate](#human-review-gate)
- [Integration with Other Skills](#integration-with-other-skills)
- [Troubleshooting](#troubleshooting)
- [Closing Reminders](#closing-reminders)

# Release Notes & Release Document Skill

Generate a professional release document from git history at any scope — tag-to-tag, branch-to-branch, or a time range — with automated categorization plus a rich standalone HTML presentation.

## Invocation

```
/release-doc [base] [head] [--version vX.Y.Z] [--days N] [--since DATE] [--range base..head]
               [--focus "custom prompt"] [--output path] [--no-html] [--no-open]
```

**Examples:**

```bash
# Tag-to-tag — markdown notes + rich standalone HTML presentation, auto-opened
/release-doc v1.0.0 HEAD --version v1.1.0

# Compare branches
/release-doc main feature/new-auth --version v2.0.0-beta

# Time range — "what changed in the last 30 days"
/release-doc --days 30

# Since a specific date
/release-doc --since 2026-03-15

# Explicit range form
/release-doc --range v1.0.0..HEAD

# With a custom focus area, analyzed more deeply and given its own section
/release-doc --days 30 --focus "what changed in hooks and workflow enforcement"

# Output to specific file (the HTML sibling takes the same stem with .html)
/release-doc v1.0.0 HEAD --version v1.1.0 --output docs/release-notes/250111-v1.1.0.md

# HTML but no browser launch (CI, headless, remote shell)
/release-doc v1.0.0 HEAD --version v1.1.0 --no-open

# Markdown only — skip the HTML presentation stage
/release-doc v1.0.0 HEAD --version v1.1.0 --no-html
```

**Flags:**

| Flag        | Default | Effect                                                                                                       |
| ----------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| `--days N`  | —       | Time-range scope: the last N days. Mutually exclusive with positional refs.                                   |
| `--since D` | —       | Time-range scope: everything since ISO date `D`.                                                              |
| `--range`   | —       | Explicit `base..head` form, equivalent to the positional refs.                                                |
| `--focus`   | —       | Analyze the named area more deeply and give it a dedicated top-level section.                                 |
| `--version` | —       | Version label for the notes header; drives `bump-version.cjs` when used.                                      |
| `--no-html` | off     | Skip Step 6. **The HTML presentation is on by default** — never ask the user to opt in.                        |
| `--no-open` | off     | Generate the HTML but do not launch a browser. Auto-implied in CI / headless / sub-agent contexts.             |

## Choosing a Scope (Step 0)

One skill, three scope shapes. Infer the shape from what the user gave; never ask twice.

| User said                                  | Scope shape        | How to resolve                                                        |
| ------------------------------------------ | ------------------ | ----------------------------------------------------------------------- |
| Two refs / `--range` / "since v1.2"        | Tag or branch      | `base..head` directly                                                  |
| "last 30 days" / `--days` / `--since`      | Time range         | Freeze `HEAD` and `SINCE_DATE`; retain the exact hashes from `git log <frozen-head> --since=<ISO timestamp> --format=%H` |
| Nothing                                    | Default            | Last tag → `HEAD`; if the repo has no tags, fall back to the last 30 days |

For time scopes, compute the UTC cutoff once (`--days N` means N × 24 hours before the recorded run time); validate `--since` and record its resolved timestamp/time zone. Resolve `HEAD` once with `git rev-parse HEAD`, then save the complete selected hash list from `git log <frozen-head> --since=<resolved-cutoff> --format=%H`. Invoke Git with literal argument vectors through the host process API (or Node `child_process`); use host file APIs for outputs on Windows, macOS and Linux.

The selected list owns time membership. Never use an included commit as the exclusive `base`, or substitute its parent-to-HEAD interval: roots have no parent, and merged/nonlinear histories can include commits outside the window. A successful empty list is a valid “no changes in this window” result; a Git error blocks scope resolution.

`{PERIOD}` — the artifact/output naming token — is the version (`v1.1.0`) for ref scopes, or a readable window (`30d`, `2026-03-15-to-2026-04-14`) for time scopes.

## Step 0b: [BLOCKING] Dump Git Artifacts BEFORE Analyzing

> **[BLOCKING] Run ALL dumps before reading ANY diff content.** A multi-week range will not fit in context; the files are external memory for Steps 3 and 6.

```bash
mkdir -p docs/release-notes/tmp

# 1. Full log with bodies
git log {SCOPE} --format="%H %ad %s%n%b" --date=short > docs/release-notes/tmp/git-log-{PERIOD}.txt
# 2. File-level status (A/M/D) — the R1 change-map input
git diff {BASE}..{HEAD} --name-status  > docs/release-notes/tmp/diff-file-status-{PERIOD}.txt
# 3. Stat summary — the source of truth for reported statistics
git diff {BASE}..{HEAD} --stat         > docs/release-notes/tmp/diff-stat-{PERIOD}.txt
# 4. Full consolidated diff (may be large — never read it whole)
git diff {BASE}..{HEAD}                > docs/release-notes/tmp/git-diff-{PERIOD}-full.txt
```

The commands above apply to ref scopes. For time scopes, dump metadata, file-status, stats and patches for each selected hash with `git show`, retaining the hash beside each record. Include root changes against the empty tree (`--root`); for merge commits, record the parent hashes and explicit parent comparisons so an omitted combined diff cannot hide changed files. Use these per-commit artifacts for the change map and claims. A consolidated snapshot diff may supplement them, but cannot define date membership or add out-of-window changes.

Verify command success and artifact completeness against the selected hashes before analysis. Empty diffs (including empty commits) are valid when recorded; an empty successful scope produces an honest no-change deliverable. Missing artifacts or command failures block rather than becoming “no changes”.

## Workflow

### Step 1: Parse Commits

For ref scopes, execute the commit parser to extract structured data from git history:

```bash
node .claude/skills/release-doc/lib/parse-commits.cjs <base> <head> [--with-files]
```

**Output:** JSON with commits array containing:

- `hash`, `shortHash` - Commit identifiers
- `type`, `scope`, `description` - Conventional commit parts
- `breaking` - Boolean for breaking changes
- `author`, `date` - Attribution
- `files` - Changed files (with `--with-files` flag)

For time scopes, build the same `{commits, stats}` JSON from the saved selected hashes and each commit's `git show` metadata. Reuse the exported `parseCommitMessage(subject)` for conventional fields; retain hash, shortHash, author, email, date, subject, body and body-based breaking-change detection. Derive files from the saved root/parent-aware evidence, and recompute totals, authors, types and date range from this exact list. Validate hash equality with the scope inventory before categorizing. The existing two-ref parser has no time-window or commit-list flag; do not invent one.

Save this JSON once and supply it to the categorizer/render pipeline and HTML stage in place of every `<base> <head>` parser invocation below. For an empty time inventory, retain `commits: []`, zero totals and empty categories; replace the categorizer's generic internal-improvements fallback with “No commits matched the requested time window” before rendering. Verify the markdown and HTML contain no invented features, fixes or maintenance claims; retain Draft status and the normal validation, HTML/opt-out and review gates. Time-scope analysis reads its per-commit dumps instead of `{BASE}..{HEAD}` diffs. Preserve the remaining categorization, focus, validation, audience and review gates.

### Step 2: Categorize Commits

Pipe parsed commits through the categorizer:

```bash
node .claude/skills/release-doc/lib/parse-commits.cjs <base> <head> | \
node .claude/skills/release-doc/lib/categorize-commits.cjs
```

**Categorization Rules:**
| Type | Category | User-Facing |
| --------------------------------------- | ------------ | --------------------- |
| `feat` | features | Yes |
| `fix` | fixes | Yes |
| `perf` | improvements | Yes |
| `docs` | docs | Yes (unless internal) |
| `refactor` | improvements | Technical only |
| `test`, `ci`, `build`, `chore`, `style` | internal | No |

**Excluded Patterns:**

- `chore(deps):` - Dependency updates
- `chore(config):` - Configuration changes
- `[skip changelog]` - Explicit skip
- `[ci skip]` - CI markers

### Step 3: Render Markdown

Generate the final release notes document:

```bash
node .claude/skills/release-doc/lib/parse-commits.cjs <base> <head> | \
node .claude/skills/release-doc/lib/categorize-commits.cjs | \
node .claude/skills/release-doc/lib/render-template.cjs --version v1.1.0 --output docs/release-notes/250111-v1.1.0.md
```

### Step 3b: Thematic Analysis (time-range scopes, and any scope with `--focus`)

Conventional-commit categories answer "what TYPE of change"; a release document also needs "what AREA of the system". For a time range — or any scope where commit messages are non-conventional — group the changed files by area as well.

Read `docs/release-notes/tmp/diff-file-status-{PERIOD}.txt` and map each path to an area. Derive the map from `docs/project-config.json` modules or the discovered source roots. For the portable `.claude` harness itself:

| File path pattern                    | Area                    |
| ------------------------------------ | ----------------------- |
| `.claude/hooks/**`                   | Hook Enhancements       |
| `.claude/hooks/lib/**`               | Hook Library            |
| `.claude/skills/**`                  | Skills                  |
| `.claude/agents/**`                  | Agent Definitions       |
| `.claude/workflows/**`               | Workflow Orchestration  |
| `.claude/docs/**`                    | Framework Documentation |
| `.claude/scripts/**`                 | Tooling & Scripts       |
| the project-reference docs root (default `docs/project-reference/**`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) | Project Reference Docs |
| `CLAUDE.md`                          | Principles & Core Rules |
| `.claude/.ck.json` / `settings.json` | Configuration           |

Then, per area with significant change (>5 files or >200 lines), read representative diffs (`git show {hash} --stat`, `git diff {BASE}..{HEAD} -- {path}`) and answer: what the behavior was BEFORE vs AFTER, and who is affected. **Record `{commit_hash}:{file_path}` as the source of every claim.**

**With `--focus "..."`:** grep the changed files for the focus keywords, read their FULL diffs (not just stat), give the focus area a dedicated top-level section in the output, and cross-reference related changes elsewhere (e.g. a new skill + its hook + its workflow entry).

Category-map and output overrides live in `docs/project-config.json`:

```json
{
    "releaseNotes": {
        "categoryMap": {
            "{api-source-root}/**": "API Layer",
            "{ui-source-root}/**": "Frontend",
            "migrations/**": "Database Schema"
        },
        "outputDir": "docs/release-notes",
        "htmlReport": { "enabled": true, "autoOpen": true, "tempDir": "docs/release-notes/tmp" }
    }
}
```

`htmlReport.enabled: false` makes `--no-html` the default; `htmlReport.autoOpen: false` makes `--no-open` the default. An explicit flag on the invocation always wins over config.

### Step 6: [BLOCKING] Rich HTML Release Presentation (default-on)

> **[BLOCKING] Runs on every invocation unless the user passed `--no-html`.** Do not ask whether to generate it, and do not treat it as optional polish — the markdown notes alone are an incomplete deliverable.

The markdown from Steps 3–5 is a categorized change summary **for the team**. This step adds the **user-facing release presentation**: one standalone, offline, professional HTML file that tells a person who USES the product what's new and what changed, and renders faithful mock-ups of the project's **real** screens for any UI change.

**The two outputs have different audiences and that is the point.** The markdown keeps every commit, every technical detail, every internal change. The HTML keeps only what a user can observe — new features, enhancements they can see and use, fixes whose symptom they felt — with internal work collapsed into "Under the Hood". Do not let the HTML degrade into a prettier copy of the markdown.

**Execute the canonical procedure in `references/html-release-report.md` (R1–R9), in order.** That file is the single source of truth — read it and follow it; do not improvise the sequence, and do not restate it here.

Complete all R1–R9 stages in that owner, including the R8 accuracy, fidelity, audience and visual-clarity result labels and R9 best-effort open. Record `Release visual: PASS|PASS (source-only)|FAIL`.

**R0 is already satisfied** — Step 0b dumped the git artifacts and Steps 2–3b categorized the changes. Optionally add the structured commit JSON as extra R1 input:

```bash
node .claude/skills/release-doc/lib/parse-commits.cjs <base> <head> --with-files \
  > docs/release-notes/tmp/commits-{PERIOD}.json
```

Run R1–R9 with the temp report at `docs/release-notes/tmp/{PERIOD}-release-analysis.md`.

**Five rules specific to invoking it from here:**

1. **This stage is model work, not another pipe.** The `lib/*.cjs` scripts categorize commits; they cannot trace a feature end-to-end or reproduce a real screen. Do not attempt to satisfy Step 6 by adding a renderer to the pipeline.
2. **`categorize-commits.cjs` output is an input to R1, not a substitute for it.** Its type-based buckets are a starting point; R1.4 still re-ranks into *user outcomes* (merging N commits that ship one outcome, splitting one commit that ships two) and R1.5 still cross-checks that every added/deleted file and every breaking change is accounted for.
3. **Step 3b's area map feeds R1.3.** When a thematic map was built, reuse it as the change map's `Area` column rather than deriving a second, divergent grouping.
4. **The categorizer's `User-Facing` column is NOT the audience verdict.** It answers "what type of commit is this"; R1.4b answers "would a user notice this". A `docs` commit is marked user-facing by the table above yet is almost always `INTERNAL` for the HTML; a `refactor` that changes a visible label is `USER-VISIBLE`. Decide from the traced behavior (R2), never from the commit type.
5. **Mock-ups defer to `/work-item --mode=mockup`.** R6.3 binds screen reproduction to that skill's fidelity contract (Steps 3/3b/3c/7). Read it rather than inventing a rendering procedure here.

## Complete Pipeline

For generating release notes in a single command:

```bash
# Full pipeline with output to file
node .claude/skills/release-doc/lib/parse-commits.cjs v1.0.0 HEAD | \
node .claude/skills/release-doc/lib/categorize-commits.cjs | \
node .claude/skills/release-doc/lib/render-template.cjs --version v1.1.0 --output docs/release-notes/250111-v1.1.0.md

# Pipeline to stdout for review
node .claude/skills/release-doc/lib/parse-commits.cjs v1.0.0 HEAD | \
node .claude/skills/release-doc/lib/categorize-commits.cjs | \
node .claude/skills/release-doc/lib/render-template.cjs --version v1.1.0
```

## Advanced Features

Read `references/release-doc-skill-advanced.md` when adding service/breaking-change analysis, PR metadata, contributors, version bumping, custom quality validation, API/CI integration or LLM transformations. It contains the unchanged optional pipelines and their flags; use only the requested capabilities.

## Configuration

See `config.yaml` for:

- **categories** - Commit type to section mapping
- **services** - Service boundary detection by file patterns
- **exclude** - Patterns to exclude from user-facing notes
- **output** - Directory and filename format settings

## Output Structure

Read `references/release-doc-skill-output.md` before rendering or inspecting the markdown notes; preserve its Draft status, section fields and technical-detail layout.

## Human Review Gate

Generated release notes are **Draft** status by default:

1. **Review** - Check accuracy, add context where needed
2. **Enhance** - Add migration steps, links, screenshots
3. **Approve** - Change status to "Released"
4. **Publish** - Commit and push

## Integration with Other Skills

- **`/commit`** - After generating notes, commit them
- **`/git-manager`** - Create PR for release notes review
- **`/work-item --mode=mockup`** - **Owns the mock-up protocol this skill's R6.3 defers to** — its Steps 3 (design system), 3b (inventory the real existing UI), 3c (real domain entities) and 7 (fidelity gate) govern HOW a screen is reproduced; R6.3 governs WHAT gets rendered. Borrow the fidelity contract, not the clickable-prototype machinery. And when a shipped feature already has a `tasks/*-mockup.html` under the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides), R6.3 REUSES it via `<iframe srcdoc>` instead of rebuilding the screen.

## Troubleshooting

### No commits found

Verify the refs exist and have commits between them:

```bash
git log --oneline <base>..<head>
```

### Non-conventional commits

Commits not following `type(scope): description` format go to "other" category. Consider running commitlint enforcement.

### Missing scope context

Add scope mappings to `config.yaml` → `services` section for better context labels.

### HTML mock-ups look generic, not like the project

The R4.3 UI inventory was skipped or done shallowly. The mock-up must be built from the **actual component/template files the diff touched** plus 2–3 real siblings — copying their markup structure and class names — and from **real design tokens**. Re-run R4.3–R4.4, then R6.3, then the R8.2 fidelity gate.

### The HTML doc is full of commit subjects

R1.4 was skipped: `categorize-commits.cjs` buckets were used verbatim as highlights. A highlight is a *user outcome*, not a commit — merge the commits that ship one outcome and re-rank breaking → new → changed → fixes → perf → internal.

### The HTML reads like an engineering report, not a release announcement

R1.4b and R6.0 were skipped. Symptoms: refactors, test/CI/tooling work or dependency bumps sitting in "What's New"; class, component or file names inside sentences; fixes described by their cause instead of the symptom the user hit. Re-run R1.4b to give every highlight a `USER-VISIBLE` / `INTERNAL` verdict, move every `INTERNAL` one into the collapsed "Under the Hood", rewrite §2–§6 per R6.0, then re-run the R8.3 audience gate.

### The HTML is accurate but hard to read

R6.5 was skipped. Symptoms: long paragraphs with no visual per highlight; "Action required" below the features; highlights ordered by commit type; charts that decorate rather than explain; a layout checked only in the source. Rebuild per R6.5 — defaults board on the first screen, one explanatory visual per user-visible highlight, the R6.5.3 card anatomy, themes by reader goal — then view wide and verified-narrow screenshots and re-run the R8.4 visual gate.

### The release "has no UI", so the HTML has no screens

Usually a mis-verdict. R4.1 classifies a backend change whose effect shows on an existing screen as `BEHIND-UI` — it gets a mock-up of that existing screen with the new field, status, or validation visible. `NO-UI` is only for work with no observable surface at all. Re-classify, then run R4.3–R4.4 and R6.3 for the highlights that flipped.

### Browser did not open

Auto-open is best-effort by design (R9). A sandbox, headless runner, hook refusal, or non-zero exit is reported as `Auto-open: skipped ({reason})` with the absolute path printed — the run still succeeds. On Windows prefer `pwsh -NoProfile -Command "Start-Process '<path>'"`.

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including one per Step 4 R-stage and one per release highlight found in R1.4. This prevents context loss from long files. Keep task depth proportional to the work.

## Closing Reminders

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** Step 6 (HTML presentation) is DEFAULT-ON: follow `references/html-release-report.md` R1–R9 verbatim — never restate or improvise that procedure
**IMPORTANT MUST ATTENTION** preserve the user-audience, real-UI/mock-up notice and BEHIND-UI gates in Key Rules; write R5 analysis before HTML, verify R8 including source-only limitations, then R9 best-effort open. `--no-html`/`--no-open` and config precedence stay explicit.
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
