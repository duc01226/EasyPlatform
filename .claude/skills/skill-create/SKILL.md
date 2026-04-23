---
name: skill-create
version: 3.0.0
description: '[Skill Management] Create new Claude Code skills or scan/fix invalid skill headers. Triggers on: create skill, new skill, skill schema, scan skills, fix skills, invalid skill, validate skills, skill header.'
disable-model-invocation: true
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

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

1. **Clarify** — Gather purpose, trigger keywords, tools needed via AskUserQuestion
2. **Check Existing** — Glob for similar skills, avoid duplication
3. **Scaffold** — Create directory + SKILL.md with frontmatter + Quick Summary
4. **Add SYNC blocks** — Include relevant protocol checklists from `sync-inline-versions.md`
5. **Validate** — Run frontmatter + header validation
6. **Enhance** — Call `/prompt-enhance` on the new SKILL.md for attention anchoring quality

**Key Rules:**

- Every SKILL.md MUST ATTENTION include `## Quick Summary` (Goal/Workflow/Key Rules) within first 30 lines
- Single-line `description` with `[Category]` prefix and trigger keywords
- SKILL.md under 500 lines; use `references/` for detail
- Shared protocols MUST ATTENTION be inlined via `<!-- SYNC:tag -->` blocks, NEVER file references
- MUST ATTENTION call `/prompt-enhance` on new/updated skills as final quality pass

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

1. **Clarify** — If requirements unclear, use `AskUserQuestion` for: purpose, auto vs user-invoked, trigger keywords, tools needed
2. **Check Existing** — Glob `.claude/skills/*/SKILL.md` for similar skills. Avoid duplication.
3. **Create Directory** — `.claude/skills/{skill-name}/SKILL.md`
4. **Write Frontmatter** — Follow schema from `## SKILL.md Schema Reference` section above
5. **Write Instructions** — Concise, actionable, progressive disclosure
6. **Add SYNC Blocks** — Identify which shared protocols apply to this skill. Read `.claude/skills/shared/sync-inline-versions.md` and copy relevant `<!-- SYNC:tag -->` blocks inline. Common protocols: `understand-code-first`, `evidence-based-reasoning`, `output-quality-principles`
7. **Add Closing Reminders** — Echo top rules at bottom with `:reminder` SYNC blocks for recency anchoring
8. **Add References** — Move detailed docs to `references/` directory if content >200 lines
9. **Add Scripts** — Create `scripts/` for executable helpers if needed
10. **Validate** — Run frontmatter validation (see Mode 2 single-file check)
11. **Enhance** — Call `/prompt-enhance` on the finished SKILL.md for AI attention anchoring quality

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

**Why:** AI attention is strongest at TOP and BOTTOM (primacy-recency effect). Place critical rules in both zones. See `/prompt-enhance` for research-backed principles.

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

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** inline shared protocols via `<!-- SYNC:tag -->` blocks — NEVER use `MUST ATTENTION READ shared/` file references
- **IMPORTANT MUST ATTENTION** call `/prompt-enhance` on new/updated skills as final attention-anchoring quality pass
- **IMPORTANT MUST ATTENTION** include `## Quick Summary` within first 30 lines of every SKILL.md
- **IMPORTANT MUST ATTENTION** add Closing Reminders section with `:reminder` SYNC blocks at bottom of every skill
- **IMPORTANT MUST ATTENTION** follow SKILL.md Schema Reference (inlined above) for official frontmatter fields
  <!-- SYNC:shared-protocol-duplication-policy:reminder -->
- **IMPORTANT MUST ATTENTION** follow duplication policy: inline protocols are INTENTIONAL, never extract to file references
  <!-- /SYNC:shared-protocol-duplication-policy:reminder -->
  <!-- SYNC:output-quality-principles:reminder -->
- **IMPORTANT MUST ATTENTION** follow output quality principles: token efficiency, lead with answer, no filler
  <!-- /SYNC:output-quality-principles:reminder -->
  <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
      <!-- /SYNC:critical-thinking-mindset:reminder -->
      <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
      <!-- /SYNC:ai-mistake-prevention:reminder -->

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
