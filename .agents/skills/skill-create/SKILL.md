---
name: skill-create
description: '[Skill Management] Create new Claude Code skills or scan/fix invalid skill headers. Triggers on: create skill, new skill, skill schema, scan skills, fix skills, invalid skill, validate skills, skill header.'
disable-model-invocation: true
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

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:shared-protocol-duplication-policy -->

> **Shared Protocol Duplication Policy** — Inline protocol content in skills (wrapped in `<!-- SYNC:tag -->`) is INTENTIONAL duplication. Do NOT extract, deduplicate, or replace with file references. AI compliance drops significantly when protocols are behind file-read indirection. To update: edit `.claude/skills/shared/sync-inline-versions.md` first, then grep `SYNC:protocol-name` and update all occurrences.

<!-- /SYNC:shared-protocol-duplication-policy -->

<!-- SYNC:output-quality-principles -->

> **Output Quality** — Token efficiency without sacrificing quality.
>
> 1. No inventories/counts — AI can `grep | wc -l`. Counts go stale instantly
> 2. No directory trees — AI can `glob`/`ls`. Use 1-line path conventions
> 3. No TOCs — AI reads linearly. TOC wastes tokens
> 4. No examples that repeat what rules say — one example only if non-obvious
> 5. Lead with answer, not reasoning. Skip filler words and preamble
> 6. Sacrifice grammar for concision in reports
> 7. Unresolved questions at end, if any

<!-- /SYNC:output-quality-principles -->

## Quick Summary

**Goal:** Create new Claude Code skills with proper structure or scan/fix invalid skill headers across the catalog.

**Workflow:**

1. **Clarify** — Gather purpose, trigger keywords, tools needed via ask the user directly
2. **Check Existing** — Glob for similar skills, avoid duplication
3. **Scaffold** — Create directory + SKILL.md with frontmatter + Quick Summary
4. **Add SYNC blocks** — Include relevant protocol checklists from `sync-inline-versions.md`
5. **Validate** — Run frontmatter + header validation
6. **Enhance** — Call `$prompt-enhance` on the new SKILL.md for attention anchoring quality

**Key Rules:**

- Every SKILL.md MUST ATTENTION include `## Quick Summary` (Goal/Workflow/Key Rules) within first 30 lines
- Single-line `description` with `[Category]` prefix and trigger keywords
- SKILL.md under 500 lines; use `references/` for detail
- Shared protocols MUST ATTENTION be inlined via `<!-- SYNC:tag -->` blocks, NEVER file references
- MUST ATTENTION call `$prompt-enhance` on new/updated skills as final quality pass

## Modes

| Mode           | Trigger                                            | Action                                |
| -------------- | -------------------------------------------------- | ------------------------------------- |
| **Create**     | `$ARGUMENTS` describes a new skill                 | Create skill following workflow below |
| **Scan & Fix** | `$ARGUMENTS` mentions scan, fix, validate, invalid | Run validation across all skills      |

## SKILL.md Schema Reference

### Frontmatter Fields (all optional)

```yaml
---
name: my-skill # Lowercase, hyphens. Max 64 chars. Default: directory name.
description: '[Category] What it does. Triggers on: keyword1, keyword2.' # MUST ATTENTION be single-line
argument-hint: '[issue-number]' # Autocomplete hint for arguments
disable-model-invocation: false # true = user-only (/name), Claude cannot auto-invoke
user-invocable: true # false = hidden from / menu, Claude-only auto-invoke
context: inline # inline (default) or fork (isolated subagent)
agent: general-purpose # Subagent type when context: fork
model: inherit-4-5 # Model override. Default: session model
version: 1.0.0 # Project convention (non-official)
---
```

### Invocation Control Matrix

| Setting                          | User Invokes | Claude Invokes | Description                                 |
| -------------------------------- | ------------ | -------------- | ------------------------------------------- |
| Default                          | Yes          | Yes            | Description in context; loads on invocation |
| `disable-model-invocation: true` | Yes          | No             | User-only. Not in context until invoked     |
| `user-invocable: false`          | No           | Yes            | Hidden from menu. Claude auto-invokes       |

### Variable Substitution

| Variable               | Description                             |
| ---------------------- | --------------------------------------- |
| `$ARGUMENTS`           | All arguments passed to skill           |
| `$ARGUMENTS[N]` / `$N` | Specific argument by 0-based index      |
| `${CLAUDE_SESSION_ID}` | Current session ID                      |
| `` !`command` ``       | Execute shell command before skill runs |

### Key Rules

- Single-line `description` (multi-line YAML breaks catalog parsing)
- Include trigger keywords in description for auto-activation
- Use `[Category]` prefix (e.g., `[Frontend]`, `[Planning]`, `[AI & Tools]`)
- SKILL.md under 500 lines; use `references/` for detail
- Descriptions loaded at 2% of context window (~16,000 chars)
- Include "ultrathink" in skill content to enable extended thinking mode

## Mode 1: Create Skill

### Workflow

1. **Clarify** — If requirements unclear, use a direct user question for: purpose, auto vs user-invoked, trigger keywords, tools needed
2. **Check Existing** — Glob `.claude/skills/*/SKILL.md` for similar skills. Avoid duplication.
3. **Create Directory** — `.claude/skills/{skill-name}/SKILL.md`
4. **Write Frontmatter** — Follow schema from `## SKILL.md Schema Reference` section above
5. **Write Instructions** — Concise, actionable, progressive disclosure
6. **Add SYNC Blocks** — Identify which shared protocols apply to this skill. Read `.claude/skills/shared/sync-inline-versions.md` and copy relevant `<!-- SYNC:tag -->` blocks inline. Common protocols: `understand-code-first`, `evidence-based-reasoning`, `output-quality-principles`
7. **Add Closing Reminders** — Echo top rules at bottom with `:reminder` SYNC blocks for recency anchoring
8. **Add References** — Move detailed docs to `references/` directory if content >200 lines
9. **Add Scripts** — Create `scripts/` for executable helpers if needed
10. **Validate** — Run frontmatter validation (see Mode 2 single-file check)
11. **Enhance** — Call `$prompt-enhance` on the finished SKILL.md for AI attention anchoring quality

### Frontmatter Template

```yaml
---
name: { kebab-case-name }
description: '[Category] What it does. Triggers on: keyword1, keyword2.'
---
```

### Skill Attention Structure (MUST ATTENTION follow)

```
[Frontmatter]
[SYNC protocol blocks — top attention zone]
[## Quick Summary — Goal/Workflow/Key Rules]
[Detailed instructions — middle zone]
[## Closing Reminders — bottom attention zone with :reminder SYNC blocks]
```

**Why:** AI attention is strongest at TOP and BOTTOM (primacy-recency effect). Place critical rules in both zones. See `$prompt-enhance` for research-backed principles.

### SYNC Tag Protocol for New Skills

1. Read `.claude/skills/shared/sync-inline-versions.md` — canonical source for all protocol checklists
2. Identify which protocols the skill needs (e.g., investigation skills need `understand-code-first` + `evidence-based-reasoning`)
3. Copy the checklist content between `<!-- SYNC:tag -->` open/close tags at the TOP of the skill
4. Add 1-line `:reminder` versions at the BOTTOM inside Closing Reminders
5. NEVER use `MUST ATTENTION READ shared/` file references — always inline

### Rules

- SKILL.md is instructions, not documentation. Teach Claude HOW to do the task.
- Single-line `description` (multi-line YAML breaks catalog parsing)
- Description must include trigger keywords for auto-activation
- Use `[Category]` prefix in description (e.g., `[Frontend]`, `[Planning]`, `[AI & Tools]`)
- Keep SKILL.md under 500 lines; use `references/` for detail
- Progressive disclosure: frontmatter → SKILL.md summary → reference files
- Token efficiency: every line must earn its place

## Mode 2: Scan & Fix Invalid Skills

### What It Validates

| Check                      | Rule                                           | Severity |
| -------------------------- | ---------------------------------------------- | -------- |
| Frontmatter exists         | Must have `---` delimiters                     | Error    |
| Description single-line    | No literal newlines in description value       | Error    |
| Description not empty      | Must have description for discoverability      | Warning  |
| Name format                | Lowercase, hyphens, max 64 chars               | Error    |
| No unknown official fields | Flag fields not in official schema             | Info     |
| Description has category   | Should start with `[Category]`                 | Warning  |
| File size                  | SKILL.md should be <500 lines                  | Warning  |
| Quick Summary exists       | Must have `## Quick Summary` in first 30 lines | Warning  |
| SYNC tag balance           | Every open tag must have matching close tag    | Error    |

### Scan Workflow

1. **Discover** — Glob `.claude/skills/*/SKILL.md` for all skills
2. **Parse** — Read first 20 lines of each file, extract frontmatter
3. **Validate** — Check each rule above
4. **Report** — List issues grouped by severity (Error > Warning > Info)
5. **Fix** — If user confirms, fix Error-level issues automatically

### Validate Script

```bash
node .claude/skills/skill-create/scripts/validate-skills.cjs          # Report only
node .claude/skills/skill-create/scripts/validate-skills.cjs --fix    # Report + auto-fix
```

## Requirements

<user-prompt>$ARGUMENTS</user-prompt>

---

<!-- SYNC:shared-protocol-duplication-policy:reminder -->

**IMPORTANT MUST ATTENTION** follow duplication policy: inline protocols are INTENTIONAL, never extract to file references

<!-- /SYNC:shared-protocol-duplication-policy:reminder -->
<!-- SYNC:output-quality-principles:reminder -->

**IMPORTANT MUST ATTENTION** follow output quality principles: token efficiency, lead with answer, no filler

<!-- /SYNC:output-quality-principles:reminder -->
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
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
**IMPORTANT MUST ATTENTION** inline shared protocols via `<!-- SYNC:tag -->` blocks — NEVER use `MUST ATTENTION READ shared/` file references
**IMPORTANT MUST ATTENTION** call `$prompt-enhance` on new/updated skills as final attention-anchoring quality pass
**IMPORTANT MUST ATTENTION** include `## Quick Summary` within first 30 lines of every SKILL.md
**IMPORTANT MUST ATTENTION** add Closing Reminders section with `:reminder` SYNC blocks at bottom of every skill
**IMPORTANT MUST ATTENTION** follow SKILL.md Schema Reference (inlined above) for official frontmatter fields

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
