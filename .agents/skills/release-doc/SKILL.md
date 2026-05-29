---
name: release-doc
description: '[Documentation] Use when you need to generate a detailed, AI-analyzed release document from git history over a time range or custom prompt.'
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->

## Codex Project-Reference Loading (No Hooks)

Codex does not receive Claude hook-based doc injection.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec/test-case planning or TC mapping: `feature-docs-reference.md`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

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
$release-doc [--days N] [--since DATE] [--range base..head] [--focus "custom prompt"] [--output path]
```

**Examples:**

```bash
# Last 30 days
$release-doc --days 30

# Since a specific date
$release-doc --since 2026-03-15

# Between two tags or commits
$release-doc --range v1.0.0..HEAD

# With custom focus area
$release-doc --days 30 --focus "what changed in hooks and workflow enforcement"

# Specify output file
$release-doc --days 30 --output docs/release/release-2026-Q1.md
```

## Differences from `$release-notes` and `$changelog`

| Feature                  | `$release-doc`               | `$release-notes`          | `$changelog`        |
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

- **`$release-notes`** — Use after `$release-doc` to generate a consumer-facing version (tag-to-tag, conventional commits)
- **`$changelog`** — Use for individual feature changelog entries; `$release-doc` is for multi-week summaries
- **`$graph-blast-radius`** — Run before release to assess impact of the most changed files
- **`$docs-update`** — Update project reference docs after analyzing what changed
- **`$commit`** — Commit the generated release doc

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

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, use a direct user question to ask the user:
>
> 1. **Execute `$release-doc` directly (Recommended)** — Standalone analysis and doc generation
> 2. **Activate `workflow-release-prep`** — Full pre-release quality gate + release doc

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, use a direct user question to present:

- **"$release-notes (Recommended)"** — Generate consumer-facing release notes from the same range
- **"$commit"** — Commit the generated release doc to version control
- **"$docs-update"** — Sync project reference docs with any changes discovered during analysis
- **"Skip, done"** — User decides

---

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting. This prevents context loss during large diff analysis. Always dump git artifacts to external files before reading.

> **External Memory:** Write ALL intermediate findings and git artifacts to `docs/release/` — this is MANDATORY. Large diffs will overflow context. Never try to hold a 30-day diff in memory.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** dump ALL git artifacts to `docs/release/` BEFORE reading any diff content
**IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
**IMPORTANT MUST ATTENTION** cite commit hash + file path for every claim in the generated doc
**IMPORTANT MUST ATTENTION** add a final review task to validate completeness against artifact files

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** Match prompt against workflow catalog
2. **ANALYZE:** Find best-match workflow AND evaluate if a custom step combination would fit better
3. **ASK (REQUIRED FORMAT):** Use a direct user question with this structure unless the user explicitly invoked a workflow/skill and the local protocol treats explicit invocation as confirmation:
    - Question: "Which workflow do you want to activate?"
    - Option 1: "Activate **[BestMatch Workflow]** (Recommended)"
    - Option 2: "Activate custom workflow: **[step1 → step2 → ...]**" (include one-line rationale)
4. **ACTIVATE (if confirmed):** Call `$workflow-start <workflowId>` for standard; sequence custom steps manually
5. **CREATE TASKS:** task tracking for ALL workflow steps
6. **EXECUTE:** Follow each step in sequence
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
   **Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
   **Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
