---
name: release-notes
description: '[Git] Generate professional release notes from git commits between two refs with automated categorization. Use when creating release notes from git history.'
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Prefer the `plan-hard` skill for planning guidance in this Codex mirror.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->

## Codex Project-Reference Loading (No Hooks)

Codex does not receive Claude hook-based doc injection.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

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

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

## Quick Summary

**Goal:** Generate professional release notes from git commits with automated categorization, service detection, and validation.

**Workflow:**

1. **Parse Commits** — `parse-commits.cjs <base> <head>` extracts structured data from git
2. **Categorize** — Pipe through `categorize-commits.cjs` for user-facing vs internal sections
3. **Render** — `render-template.cjs --version vX.Y.Z` generates markdown with Summary, What's New, Improvements, Bug Fixes, Breaking Changes, Technical Details

**Key Rules:**

- **Pipeline**: parse → categorize → render → validate → transform
- **Advanced**: Service detection, breaking change analysis, PR metadata, contributor stats, version bumping
- **Human Review**: Generated notes are Draft status, require review/enhance/approve before publish
- **Validation**: `validate-notes.cjs` scores against quality rules (100 points)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Release Notes Generation Skill

Generate professional release notes from git commits between two refs with automated categorization.

## Invocation

```
$release-notes [base] [head] [--version vX.Y.Z] [--output path]
```

**Examples:**

```bash
# Generate release notes for commits since last tag
$release-notes v1.0.0 HEAD --version v1.1.0

# Compare branches
$release-notes main feature/new-auth --version v2.0.0-beta

# Output to specific file
$release-notes v1.0.0 HEAD --version v1.1.0 --output docs/release-notes/250111-v1.1.0.md
```

## Workflow

### Step 1: Parse Commits

Execute the commit parser to extract structured data from git history:

```bash
node .claude/skills/release-notes/lib/parse-commits.cjs <base> <head> [--with-files]
```

**Output:** JSON with commits array containing:

- `hash`, `shortHash` - Commit identifiers
- `type`, `scope`, `description` - Conventional commit parts
- `breaking` - Boolean for breaking changes
- `author`, `date` - Attribution
- `files` - Changed files (with `--with-files` flag)

### Step 2: Categorize Commits

Pipe parsed commits through the categorizer:

```bash
node .claude/skills/release-notes/lib/parse-commits.cjs <base> <head> | \
node .claude/skills/release-notes/lib/categorize-commits.cjs
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
node .claude/skills/release-notes/lib/parse-commits.cjs <base> <head> | \
node .claude/skills/release-notes/lib/categorize-commits.cjs | \
node .claude/skills/release-notes/lib/render-template.cjs --version v1.1.0 --output docs/release-notes/250111-v1.1.0.md
```

## Complete Pipeline

For generating release notes in a single command:

```bash
# Full pipeline with output to file
node .claude/skills/release-notes/lib/parse-commits.cjs v1.0.0 HEAD | \
node .claude/skills/release-notes/lib/categorize-commits.cjs | \
node .claude/skills/release-notes/lib/render-template.cjs --version v1.1.0 --output docs/release-notes/250111-v1.1.0.md

# Pipeline to stdout for review
node .claude/skills/release-notes/lib/parse-commits.cjs v1.0.0 HEAD | \
node .claude/skills/release-notes/lib/categorize-commits.cjs | \
node .claude/skills/release-notes/lib/render-template.cjs --version v1.1.0
```

## Advanced Features

### Service Boundary Detection

Analyze which services are affected by the release:

```bash
# Parse with file changes, then detect services
node .claude/skills/release-notes/lib/parse-commits.cjs v1.0.0 HEAD --with-files | \
node .claude/skills/release-notes/lib/detect-services.cjs
```

**Output:** Service impact analysis with severity levels (critical, high, medium, low)

### Breaking Change Analysis

Enhanced breaking change detection with migration info extraction:

```bash
node .claude/skills/release-notes/lib/parse-commits.cjs v1.0.0 HEAD | \
node .claude/skills/release-notes/lib/categorize-commits.cjs | \
node .claude/skills/release-notes/lib/detect-breaking.cjs
```

**Detects:**

- `BREAKING CHANGE:` in commit body
- `!` suffix on commit type (e.g., `feat!:`)
- Migration instructions

### PR Metadata Extraction

Extract and link pull request information:

```bash
# Extract PR numbers from commit messages
node .claude/skills/release-notes/lib/parse-commits.cjs v1.0.0 HEAD | \
node .claude/skills/release-notes/lib/extract-pr-metadata.cjs

# With GitHub API enrichment (requires gh CLI)
node .claude/skills/release-notes/lib/parse-commits.cjs v1.0.0 HEAD | \
node .claude/skills/release-notes/lib/extract-pr-metadata.cjs --fetch-gh
```

**Extracts:** PR numbers, titles, labels, authors from commits

### Contributor Statistics

Generate detailed contributor stats:

```bash
node .claude/skills/release-notes/lib/parse-commits.cjs v1.0.0 HEAD | \
node .claude/skills/release-notes/lib/contributor-stats.cjs
```

**Output:** Contributor list with commit counts, feature/fix breakdown

### Version Bumping

Automatically determine and bump semantic version based on commit types:

```bash
# Auto-bump based on commits (feat→minor, fix→patch, BREAKING→major)
node .claude/skills/release-notes/lib/parse-commits.cjs v1.0.0 HEAD | \
node .claude/skills/release-notes/lib/bump-version.cjs

# Bump with prerelease tag
node .claude/skills/release-notes/lib/bump-version.cjs --prerelease beta

# Per-service versioning
node .claude/skills/release-notes/lib/bump-version.cjs --service {service-name}

# Dry run (don't write version file)
node .claude/skills/release-notes/lib/bump-version.cjs --dry-run
```

**Version Files:**

- Root: `.version`
- Per-service: `.versions/<service-name>.version`

### Quality Validation

Validate release notes against quality rules:

```bash
# Validate with default threshold (70)
node .claude/skills/release-notes/lib/validate-notes.cjs docs/release-notes/v1.1.0.md

# Custom threshold
node .claude/skills/release-notes/lib/validate-notes.cjs docs/release-notes/v1.1.0.md --threshold 80

# JSON output for CI
node .claude/skills/release-notes/lib/validate-notes.cjs docs/release-notes/v1.1.0.md --json
```

**Validation Rules (100 points total):**
| Rule | Weight | Description |
| --------------------------- | ------ | ---------------------------- |
| summary_exists | 15 | Has Summary section |
| summary_not_empty | 10 | Summary has content |
| has_version | 10 | Version number present |
| features_documented | 10 | Features properly formatted |
| fixes_documented | 10 | Bug fixes properly formatted |
| no_broken_links | 10 | No empty link references |
| contributors_listed | 10 | Contributors section present |
| has_date | 5 | Date present |
| no_todo_markers | 5 | No TODO/FIXME markers |
| proper_heading_hierarchy | 5 | Proper H1→H2 structure |
| no_placeholder_text | 5 | No placeholder text |
| technical_details_collapsed | 5 | Tech details in <details> |

### LLM-Powered Transforms

Transform release notes for different audiences using Claude API:

```bash
# Requires ANTHROPIC_API_KEY environment variable
export ANTHROPIC_API_KEY="your-api-key"

# Create executive summary
node .claude/skills/release-notes/lib/transform-llm.cjs docs/release-notes/v1.1.0.md --transform executive

# Transform for business stakeholders
node .claude/skills/release-notes/lib/transform-llm.cjs docs/release-notes/v1.1.0.md --transform business --output docs/release-notes/v1.1.0-business.md

# Transform for end users
node .claude/skills/release-notes/lib/transform-llm.cjs docs/release-notes/v1.1.0.md --transform enduser
```

**Transform Types:**
| Type | Description |
| ----------- | ------------------------------ |
| `summarize` | Brief 3-5 bullet point summary |
| `business` | ROI-focused, business language |
| `enduser` | User-friendly, non-technical |
| `executive` | Strategic impact summary |
| `technical` | Enhanced technical details |

### Full Enhanced Pipeline

Combine all features for comprehensive release notes:

```bash
# Enhanced pipeline with service detection
node .claude/skills/release-notes/lib/parse-commits.cjs v1.0.0 HEAD --with-files | \
node .claude/skills/release-notes/lib/detect-services.cjs | \
node .claude/skills/release-notes/lib/categorize-commits.cjs | \
node .claude/skills/release-notes/lib/detect-breaking.cjs | \
node .claude/skills/release-notes/lib/contributor-stats.cjs | \
node .claude/skills/release-notes/lib/render-template.cjs --version v1.1.0

# With version bumping and validation
node .claude/skills/release-notes/lib/parse-commits.cjs v1.0.0 HEAD --with-files | \
node .claude/skills/release-notes/lib/bump-version.cjs | \
node .claude/skills/release-notes/lib/categorize-commits.cjs | \
node .claude/skills/release-notes/lib/render-template.cjs --output docs/release-notes/v1.1.0.md && \
node .claude/skills/release-notes/lib/validate-notes.cjs docs/release-notes/v1.1.0.md
```

## Configuration

See `config.yaml` for:

- **categories** - Commit type to section mapping
- **services** - Service boundary detection by file patterns
- **exclude** - Patterns to exclude from user-facing notes
- **output** - Directory and filename format settings

## Output Structure

```markdown
# Release Notes: v1.1.0

**Date:** 2025-01-11
**Version:** v1.1.0
**Status:** Draft

---

## Summary

This release includes 3 new features, 2 improvements, 5 bug fixes.

## What's New

- **Add employee export endpoint** (API)
- **Implement dark mode toggle** (UI)

## Improvements

- **Optimize database queries** (Persistence)

## Bug Fixes

- **Fix date picker timezone issue** (Frontend)
- **Resolve null pointer in auth flow**

## Documentation

- **Update API documentation** (API)

## Breaking Changes

> **Warning**: The following changes may require migration

### Migrate to OAuth 2.1 (Auth)

Legacy JWT tokens no longer accepted.
Migration guide: docs/migrations/oauth-2.1.md

---

## Technical Details

<details>
<summary>For Developers</summary>

### Commits Included

| Hash    | Type | Description                    |
| ------- | ---- | ------------------------------ |
| abc1234 | feat | Add employee export endpoint   |
| def5678 | fix  | Fix date picker timezone issue |

...

</details>

## Contributors

- @john.doe
- @jane.smith

---

_Generated by AI_
```

## Human Review Gate

Generated release notes are **Draft** status by default:

1. **Review** - Check accuracy, add context where needed
2. **Enhance** - Add migration steps, links, screenshots
3. **Approve** - Change status to "Released"
4. **Publish** - Commit and push

## Integration with Other Skills

- **`$commit`** - After generating notes, commit them
- **`/git-manager`** - Create PR for release notes review
- **`$docs-update`** - Update CHANGELOG.md with new release

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

---

<!-- SYNC:ai-mistake-prevention -->

**AI Mistake Prevention** — Failure modes to avoid on every task:
**Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
**Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
**Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
**Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
**When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
**Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
**Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
**Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
**Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
**Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

1. **DETECT:** Match prompt against workflow catalog
2. **ANALYZE:** Find best-match workflow AND evaluate if a custom step combination would fit better
3. **ASK (REQUIRED FORMAT):** Use a direct user question with this structure:
    - Question: "Which workflow do you want to activate?"
    - Option 1: "Activate **[BestMatch Workflow]** (Recommended)"
    - Option 2: "Activate custom workflow: **[step1 → step2 → ...]**" (include one-line rationale)
4. **ACTIVATE (if confirmed):** Call `$workflow-start <workflowId>` for standard; sequence custom steps manually
5. **CREATE TASKS:** task tracking for ALL workflow steps
6. **EXECUTE:** Follow each step in sequence
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.

## Learned Lessons

# Lessons Learned

> **[CRITICAL]** Hard-won project debugging/architecture rules. MUST ATTENTION apply BEFORE forming hypothesis or writing code.

## Quick Summary

**Goal:** Prevent recurrence of known failure patterns — debugging, architecture, naming, AI orchestration, environment.

**Top Rules (apply always):**

- MUST ATTENTION verify ALL preconditions (config, env, DB names, DI regs) BEFORE code-layer hypothesis
- MUST ATTENTION fix responsible layer — NEVER patch symptom sites with caller-specific defensive code
- MUST ATTENTION use `ExecuteInjectScopedAsync` for parallel async + repo/UoW — NEVER `ExecuteUowTask`
- MUST ATTENTION name by PURPOSE not CONTENT — adding member forces rename = abstraction broken
- MUST ATTENTION persist sub-agent findings incrementally after each file — NEVER batch at end
- MUST ATTENTION Windows bash: verify Python alias (`where python`/`where py`) — NEVER assume `python`/`python3` resolves

---

## Debugging & Root Cause Reasoning

- [2026-04-11] **Holistic-first: verify environment before code.** Failure → list ALL preconditions (config, env vars, DB names, endpoints, DI regs, credentials, permissions, data prerequisites) → verify each via evidence (grep/cat/query) BEFORE code-layer hypothesis. Worst rabbit holes: diving nearest layer while bug sits elsewhere — e.g., hours debugging "sync timeout", real cause: test appsettings pointing wrong DB. Cheapest check first.
- [2026-04-01] **Ask "whose responsibility?" before fixing.** Trace: bug in caller (wrong data) or callee (wrong handling)? Fix responsible layer — NEVER patch symptom site masking real issue.
- [2026-04-01] **Trace data lifecycle, not error site.** Follow data: creation → transformation → consumption. Bug usually where data created wrong, not consumed.
- [2026-04-01] **Code is caller-agnostic.** Functions/handlers/consumers don't know who invokes them. Comments/guards/messages describe business intent — NEVER reference specific callers (tests, seeders, scripts).

## Architecture Invariants

- [2026-03-31] **ParallelAsync + repo/UoW MUST use `ExecuteInjectScopedAsync`, NEVER `ExecuteUowTask`.** `ExecuteUowTask` creates new UoW but reuses outer DI scope (same DbContext) — parallel iterations sharing non-thread-safe DbContext silently corrupt data. `ExecuteInjectScopedAsync` creates new UoW + new DI scope (fresh repo per iteration).
- [2026-03-31] **Bus message naming MUST include service name prefix — core services NEVER consume feature events.** Prefix declares schema ownership (`AccountUserEntityEventBusMessage` = Accounts owns). Core services (Accounts, Communication) are leaders. Feature services (Growth, Talents) sending to core MUST use `{CoreServiceName}...RequestBusMessage` — never define own event for core to consume.

## Naming & Abstraction

- [2026-04-12] **Name PURPOSE not CONTENT — "OrXxx" anti-pattern.** `HrManagerOrHrOrPayrollHrOperationsPolicy` names set members, not what it guards. Add role → rename = broken abstraction. **Rule:** names express DOES/GUARDS, not CONTAINS. **Test:** adding/removing member forces rename? YES = content-driven = bad → rename to purpose (e.g., `HrOperationsAccessPolicy`). **Nuance:** "Or" fine in behavioral idioms (`FirstOrDefault`, `SuccessOrThrow`) — expresses HAPPENS, not membership.

## Environment & Tooling

- [2026-04-20] **Windows bash: NEVER assume `python`/`python3` resolves — verify alias first.** Python may not be in bash PATH under those names. Check: `where python` / `where py`. Prefer `py` (Windows Python Launcher) for one-liners, `node` if JS alternative exists.

> Test-specific lessons → `docs/project-reference/integration-test-reference.md` Lessons Learned section. Production-code anti-patterns → `docs/project-reference/backend-patterns-reference.md` Anti-Patterns section. Generic debugging/refactoring reminders → System Lessons in `.claude/hooks/lib/prompt-injections.cjs`.

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** holistic-first: verify ALL preconditions (config, env, DB names, endpoints, DI regs) BEFORE code-layer hypothesis — cheapest check first
- **IMPORTANT MUST ATTENTION** fix responsible layer — NEVER patch symptom site; trace caller (wrong data) vs callee (wrong handling), fix root owner
- **IMPORTANT MUST ATTENTION** parallel async + repo/UoW → ALWAYS `ExecuteInjectScopedAsync`, NEVER `ExecuteUowTask` (shared DbContext = silent data corruption)
- **IMPORTANT MUST ATTENTION** bus message prefix = schema ownership; feature services NEVER define events for core services — use `{CoreServiceName}...RequestBusMessage`
- **IMPORTANT MUST ATTENTION** name by PURPOSE — adding/removing member forces rename = broken abstraction
- **IMPORTANT MUST ATTENTION** sub-agents MUST write findings after each file/section — NEVER batch all findings into one final write
- **IMPORTANT MUST ATTENTION** Windows bash: NEVER assume `python`/`python3` resolves — run `where python`/`where py` first, use `py` launcher or `node`

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`/simplify`/`$security`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
