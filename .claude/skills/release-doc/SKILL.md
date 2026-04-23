---
name: release-doc
version: 1.0.0
description: '[Documentation] Generate a detailed, AI-analyzed release document from git history over a time range or custom prompt. Dumps git artifacts to external files first to prevent context loss, then analyzes themes across hooks, skills, agents, workflows, and principles.'
triggers:
    - release doc
    - release document
    - release analysis
    - what changed in the last
    - changes in the last
    - generate release
    - release notes last
    - changes last 30 days
    - last N days
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting. This prevents context loss during large diff analysis. Always dump git artifacts to external files before reading.

> **External Memory:** Write ALL intermediate findings and git artifacts to `docs/release/` — this is MANDATORY. Large diffs will overflow context. Never try to hold a 30-day diff in memory.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> - **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> - **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> - **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> - **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> - **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> - **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> - **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> - **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> - **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> - **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Quick Summary

**Goal:** Generate a detailed, AI-analyzed release document from git history — by time range (e.g., last 30 days) or custom comparison (e.g., `v1.0.0..HEAD`) or a user-described focus area.

**Workflow:**

1. **Resolve Range** — Determine the git range from user input
2. **Dump Artifacts** — Save log, file-status, and full diff to `docs/release/` BEFORE analyzing
3. **Categorize Changes** — Group changed files by framework area (hooks, skills, agents, workflows, principles, config, docs)
4. **Read Key Diffs** — For each category, read the most significant changes via `git show` or `git diff`
5. **Generate Doc** — Write structured markdown release doc to `docs/release/`
6. **Validate** — Verify completeness and accuracy against the artifact files

**Key Rules:**

- **Dump first, read second** — NEVER analyze a diff you haven't saved to a file first
- **Group by theme** — Do not list commits chronologically; group by what area they impact
- **Cite evidence** — Every section claim must reference a specific commit hash or file path
- **Custom focus honored** — If user provides a focus prompt, weight that area more deeply
- **Draft status** — All generated docs are Draft; add "Status: Draft" to the header

---

# Release Doc Skill

Generate a detailed, narrative release document by analyzing git history over a time range or between two refs.

## Invocation

```
/release-doc [--days N] [--since DATE] [--range base..head] [--focus "custom prompt"] [--output path]
```

**Examples:**

```bash
# Last 30 days
/release-doc --days 30

# Since a specific date
/release-doc --since 2026-03-15

# Between two tags or commits
/release-doc --range v1.0.0..HEAD

# With custom focus area
/release-doc --days 30 --focus "what changed in hooks and workflow enforcement"

# Specify output file
/release-doc --days 30 --output docs/release/release-2026-Q1.md
```

## Differences from `/release-notes` and `/changelog`

| Feature                  | `/release-doc`               | `/release-notes`          | `/changelog`        |
| ------------------------ | ---------------------------- | ------------------------- | ------------------- |
| Time-based ranges        | ✅ `--days N` / `--since`    | ❌ ref-to-ref only        | ❌ PR/commit only   |
| AI thematic analysis     | ✅ Groups by framework area  | ❌ Commit-type categories | ❌ File-by-file     |
| Dumps artifacts to files | ✅ Mandatory before analysis | ❌ Pipes in memory        | ❌ In memory        |
| Custom focus prompt      | ✅ `--focus "..."`           | ❌                        | ❌                  |
| Narrative sections       | ✅ Context + rationale       | ❌ Bullet list only       | ❌ Bullet list only |
| Framework-level docs     | ✅ hooks/skills/agents       | ❌ App features           | ❌ App features     |

## Step 1: Resolve Range

Determine the git range from the user's input:

```bash
# Time-based (--days N or --since DATE)
SINCE_DATE=$(date -d "-30 days" +%Y-%m-%d)    # Linux
SINCE_DATE=$(date -v-30d +%Y-%m-%d)            # macOS
git log --since="$SINCE_DATE" --oneline --format="%H %ad %s" --date=short

# Ref-based (--range base..head)
git log v1.0.0..HEAD --oneline --format="%H %ad %s" --date=short

# Count commits in range
git log --since="$SINCE_DATE" --oneline | wc -l
```

**Identify the boundary commits:**

```bash
# Oldest commit in range (for diff base)
OLDEST=$(git log --since="$SINCE_DATE" --format="%H" | tail -1)
# Newest
NEWEST=HEAD
```

## Step 2: Dump Git Artifacts (MANDATORY BEFORE ANALYSIS)

**CRITICAL:** Run ALL dumps before reading ANY content. Use background runs for large diffs.

```bash
# Create output directory
mkdir -p docs/release

# 1. Full git log with bodies
git log --since="$SINCE_DATE" --format="%H %ad %s%n%b" --date=short \
  > docs/release/git-log-{PERIOD}.txt

# 2. File-level change status (A/M/D)
git diff ${OLDEST}^..HEAD --name-status \
  > docs/release/diff-file-status-{PERIOD}.txt

# 3. Diff stat summary (line counts)
git diff ${OLDEST}^..HEAD --stat \
  > docs/release/diff-stat-{PERIOD}.txt

# 4. Full consolidated diff (background — may be large)
git diff ${OLDEST}^..HEAD \
  > docs/release/git-diff-{PERIOD}-full.txt &

echo "Artifacts saved. Commit count: $(cat docs/release/git-log-{PERIOD}.txt | grep -c '^[a-f0-9]\{40\}')"
```

Replace `{PERIOD}` with a human-readable period string, e.g., `30d`, `2026-03-15-to-2026-04-14`.

**Verify all artifact files exist and are non-empty before proceeding.**

## Step 3: Categorize Changes by Framework Area

Read `docs/release/diff-file-status-{PERIOD}.txt` and group files into categories:

```bash
# Count by area
grep -c "^[AMD]\s*.claude/hooks/" docs/release/diff-file-status-{PERIOD}.txt
grep -c "^[AMD]\s*.claude/skills/" docs/release/diff-file-status-{PERIOD}.txt
grep -c "^[AMD]\s*.claude/agents/" docs/release/diff-file-status-{PERIOD}.txt
grep -c "^[AMD]\s*.claude/workflows" docs/release/diff-file-status-{PERIOD}.txt
grep -c "^[AMD]\s*.claude/docs/" docs/release/diff-file-status-{PERIOD}.txt
grep -c "^[AMD]\s*docs/" docs/release/diff-file-status-{PERIOD}.txt
grep -c "^[AMD]\s*CLAUDE.md" docs/release/diff-file-status-{PERIOD}.txt
```

**Standard category map for easy-claude projects:**

| File Path Pattern                    | Category                |
| ------------------------------------ | ----------------------- |
| `.claude/hooks/**`                   | Hook Enhancements       |
| `.claude/hooks/lib/**`               | Hook Library            |
| `.claude/skills/**`                  | Skills                  |
| `.claude/agents/**`                  | Agent Definitions       |
| `.claude/workflows/**`               | Workflow Orchestration  |
| `.claude/workflows.json`             | Workflow Registry       |
| `.claude/docs/**`                    | Framework Documentation |
| `.claude/scripts/**`                 | Tooling & Scripts       |
| `docs/project-reference/**`          | Project Reference Docs  |
| `CLAUDE.md`                          | Principles & Core Rules |
| `.claude/.ck.json` / `settings.json` | Configuration           |

**For non-easy-claude projects**, derive categories from the file path patterns actually present.

## Step 4: Analyze Key Changes Per Category

For each category with significant changes (>5 files or >200 lines), read representative diffs:

```bash
# Most impactful commits (by files changed)
git log --since="$SINCE_DATE" --format="%H %s" --name-only | \
  grep -A100 "^[a-f0-9]\{40\}" | head -200

# Show specific commit detail
git show {COMMIT_HASH} --stat --format="%s%n%b"

# Diff for a specific file across the range
git diff ${OLDEST}^..HEAD -- .claude/hooks/init-prompt-gate.cjs
```

**Analysis questions for each category:**

- **Hooks:** What new gates or enforcement were added? What context injection changed? What was the trigger behavior before vs after?
- **Skills:** What new skills were created? What protocols were updated in existing skills? What was removed or merged?
- **Agents:** What agent definitions changed? Did tool lists or dispatch rules change?
- **Workflows:** What workflow steps were added/removed? Did sequence order change? Were any workflows merged or deleted?
- **Principles:** What rules in CLAUDE.md changed? Were confidence thresholds tightened? New hard gates added?
- **Config:** What new schema fields? What validation was added?
- **Scripts/Tooling:** What new utilities? What improved or automated?

**Evidence requirement:** For every claim in the doc, record `{commit_hash}:{file_path}` as your source.

## Step 5: Handle Custom Focus Prompt

If user provided `--focus "..."`, apply additional depth to that area:

1. Grep all changed files matching the focus keywords
2. Read the full diff for matching files (not just stat)
3. Include a dedicated top-level section for the focus area in the output doc
4. Cross-reference related changes in other areas (e.g., a new skill + its hook + its workflow entry)

## Step 6: Generate the Release Doc

Write to `docs/release/release-notes-{PERIOD}.md` (or `--output` path).

**Required structure:**

```markdown
# Release Notes — {Project Name}

**Period:** {START} → {END}
**Commits:** {N} commits | **Files changed:** {N} | **Insertions:** +{N} | **Deletions:** −{N}
**Status:** Draft

---

## Executive Summary

3-4 sentences. The most transformative changes, their business/developer impact, and the overall trajectory.

---

## {Category 1}: {Theme Name}

### What Changed

{Narrative description — not bullet-list of commits}

### Why It Matters

{Impact on how developers/AI uses the system}

### Key Additions / Modifications

| Item | Type | Effect |
| ---- | ---- | ------ |

---

## {Category 2}: ...

[repeat for each significant category]

---

## New Skills Added

| Skill | Command | Purpose |
| ----- | ------- | ------- |

## Skills Removed or Merged

| Skill | Reason |
| ----- | ------ |

## Principles & Rules Updated

| Rule | Before | After | Reason |
| ---- | ------ | ----- | ------ |

---

## Summary Statistics

| Category       | Count |
| -------------- | ----- |
| Commits        | {N}   |
| Files changed  | {N}   |
| New skills     | {N}   |
| Skills removed | {N}   |
| New hooks      | {N}   |
| Hooks modified | {N}   |
| Agents updated | {N}   |
| Net lines      | +{N}  |

---

_Generated: {DATE} | Branch: {BRANCH} | Range: {OLDEST_HASH}..{HEAD_HASH}_
_Artifacts: `docs/release/git-log-{PERIOD}.txt`, `docs/release/diff-file-status-{PERIOD}.txt`_
```

## Step 7: Validate

After writing, verify:

- [ ] Every category section references at least one commit hash
- [ ] "New Skills" table is complete (cross-check against `grep "^A.*skills" diff-file-status-*.txt`)
- [ ] "Skills Removed" is complete (cross-check against `grep "^D.*skills" diff-file-status-*.txt`)
- [ ] Summary Statistics match the actual diff stat
- [ ] No section says "TODO" or contains unfilled template placeholders
- [ ] Artifact files are listed in the doc footer

## Configuration: Category Map Override

For projects with custom directory structures, override the category map via `project-config.json`:

```json
{
    "releaseDoc": {
        "categoryMap": {
            "src/api/**": "API Layer",
            "src/ui/**": "Frontend",
            "migrations/**": "Database Schema"
        },
        "outputDir": "docs/release",
        "focusAreas": ["hooks", "skills", "agents"]
    }
}
```

## Integration with Other Skills

- **`/release-notes`** — Use after `/release-doc` to generate a consumer-facing version (tag-to-tag, conventional commits)
- **`/changelog`** — Use for individual feature changelog entries; `/release-doc` is for multi-week summaries
- **`/graph-blast-radius`** — Run before release to assess impact of the most changed files
- **`/docs-update`** — Update project reference docs after analyzing what changed
- **`/commit`** — Commit the generated release doc

## Troubleshooting

### Diff too large for context

**Solution:** The skill requires artifact files be written first — never read the full diff into context. Use `git show {hash}` for individual commits and `grep -l` to narrow file scope.

### Time range yields 0 commits

```bash
# Verify date format (ISO 8601)
git log --since="2026-03-15" --oneline | head -5
# If empty, check git's date interpretation:
git log --format="%ad" --date=short | head -5
```

### Non-easy-claude project structure

The skill auto-derives categories from file paths. For projects without `.claude/`, group by `src/`, `tests/`, `docs/`, `scripts/`, `config/` instead.

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, use `AskUserQuestion` to ask the user:
>
> 1. **Execute `/release-doc` directly (Recommended)** — Standalone analysis and doc generation
> 2. **Activate `workflow-release-prep`** — Full pre-release quality gate + release doc

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, use `AskUserQuestion` to present:

- **"/release-notes (Recommended)"** — Generate consumer-facing release notes from the same range
- **"/commit"** — Commit the generated release doc to version control
- **"/docs-update"** — Sync project reference docs with any changes discovered during analysis
- **"Skip, done"** — User decides

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** dump ALL git artifacts to `docs/release/` BEFORE reading any diff content
- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** cite commit hash + file path for every claim in the generated doc
- **IMPORTANT MUST ATTENTION** add a final review task to validate completeness against artifact files
    <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
    <!-- /SYNC:critical-thinking-mindset:reminder -->
    <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
    <!-- /SYNC:ai-mistake-prevention:reminder -->

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
