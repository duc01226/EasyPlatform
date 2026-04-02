---
name: learn
version: 4.0.0
description: "[Utilities] Teach Claude lessons that persist across sessions. Triggers on 'remember this', 'always do', 'never do', 'learn this', 'from now on'. Smart routing to all 12 project-reference docs with /prompt-enhance finalization."
disable-model-invocation: false
allowed-tools: Read, Write, Edit, Glob, Bash
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

## Quick Summary

**Goal:** Teach Claude lessons that persist across sessions by saving to the most relevant reference doc.

**Workflow:**

1. **Capture** -- Identify the lesson from user instruction or experience
2. **Route** -- Analyze lesson content against Reference Doc Catalog, select best target file
3. **Save** -- Append lesson to the selected file
4. **Confirm** -- Acknowledge what was saved and where
5. **Enhance** -- Run `/prompt-enhance` on modified file(s) to optimize AI attention anchoring

**Key Rules:**

- Triggers on "remember this", "always do X", "never do Y"
- Smart-route to the most relevant file, NOT always `docs/project-reference/lessons.md`
- Check for existing entries before creating duplicates
- Confirm target file with user before writing

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Usage

### Add a lesson

```
/learn always use the validation framework fluent API instead of throwing ValidationException
/learn never call external APIs in command handlers - use Entity Event Handlers
/learn prefer async/await over .then() chains
```

### List lessons

```
/learn list
```

### Remove a lesson

```
/learn remove 3
```

### Clear all lessons

```
/learn clear
```

## Reference Doc Catalog (READ before routing)

Each `docs/project-reference/` file is auto-initialized by `session-init-docs.cjs` hook and populated by `/scan-*` skills. Understanding their roles is **critical** for correct routing.

| File                             | Role & Content                                                                                   | Injected By                                          | Injection Trigger                   | Scan Skill                |
| -------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------- | ----------------------------------- | ------------------------- |
| `project-structure-reference.md` | Architecture, directory tree, tech stack, module registry, service map                           | `subagent-init.cjs`                                  | Agent spawn                         | `/scan-project-structure` |
| `backend-patterns-reference.md`  | Backend/hook patterns: CJS modules, CQRS, repositories, validation, message bus, background jobs | `code-patterns-injector.cjs`, `backend-context.cjs`  | Edit/Write backend files            | `/scan-backend-patterns`  |
| `frontend-patterns-reference.md` | Frontend patterns: components, state mgmt, API services, styling conventions, directives         | `code-patterns-injector.cjs`, `frontend-context.cjs` | Edit/Write frontend files           | `/scan-frontend-patterns` |
| `integration-test-reference.md`  | Test architecture: base classes, fixtures, helpers, service-specific setup, test runners         | Referenced in config                                 | Test file edits                     | `/scan-integration-tests` |
| `feature-docs-reference.md`      | Feature doc templates, app-to-service mapping, doc structure conventions                         | On-demand (skill reads)                              | Skill activation                    | `/scan-feature-docs`      |
| `code-review-rules.md`           | Review rules, conventions, anti-patterns, decision trees, checklists                             | `code-review-rules-injector.cjs`                     | Review skill activation             | `/scan-code-review-rules` |
| `lessons.md`                     | General lessons — fallback catch-all. **Injected on EVERY prompt** (budget-controlled)           | `prompt-injections.cjs`                              | Every UserPromptSubmit + Edit/Write | Managed by `/learn`       |
| `scss-styling-guide.md`          | SCSS/CSS: BEM methodology, mixins, variables, theming, responsive patterns                       | `design-system-context.cjs`                          | Styling file edits                  | `/scan-scss-styling`      |
| `design-system/README.md`        | Design system: tokens overview, component inventory, app-to-doc mapping                          | `design-system-context.cjs`                          | Design file edits                   | `/scan-design-system`     |
| `e2e-test-reference.md`          | E2E test patterns: framework, page objects, config, best practices                               | `code-patterns-injector.cjs`                         | E2E file edits                      | `/scan-e2e-tests`         |
| `domain-entities-reference.md`   | Domain entities, data models, DTOs, aggregate boundaries, ER diagrams, cross-service sync        | `backend-context.cjs`, `frontend-context.cjs`        | Backend/frontend file edits         | `/scan-domain-entities`   |
| `docs-index-reference.md`        | Documentation tree, file counts, doc relationships, keyword-to-doc lookup                        | On-demand (manual)                                   | Manual reference                    | `/scan-docs-index`        |

**Key insight:** Files injected automatically by hooks have higher visibility — lessons placed there are enforced during edits. Files injected on-demand are only seen when skills explicitly read them. Prefer auto-injected files for high-recurrence lessons.

---

## Smart File Routing (CRITICAL)

When saving a lesson, analyze its content and route to the **most relevant file**:

| If lesson is about...                                                                                                                    | Route to                                                | Section hint                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------- |
| Code review rules, anti-patterns, review checklists, YAGNI/KISS/DRY, naming conventions, review process                                  | `docs/project-reference/code-review-rules.md`           | Add to most relevant section (anti-patterns, rules, checklists) |
| Backend/hook patterns: CJS modules, CQRS, repositories, entities, validation, message bus, background jobs, migrations, EF Core, MongoDB | `docs/project-reference/backend-patterns-reference.md`  | Add to relevant section or Anti-Patterns section                |
| Frontend Angular/TS patterns: components, stores, forms, API services, BEM, RxJS, directives, pipes                                      | `docs/project-reference/frontend-patterns-reference.md` | Add to relevant section or Anti-Patterns section                |
| Integration/unit tests: test base classes, fixtures, test helpers, test patterns, assertions, test runners                               | `docs/project-reference/integration-test-reference.md`  | Add to relevant section                                         |
| E2E tests: Playwright, Cypress, Selenium, page objects, E2E config, browser automation, visual regression                                | `docs/project-reference/e2e-test-reference.md`          | Add to relevant section                                         |
| Domain entities, data models, DTOs, aggregates, entity relationships, cross-service data sync, ER diagrams                               | `docs/project-reference/domain-entities-reference.md`   | Add to Entity Catalog or Relationships section                  |
| Project structure, directory organization, module boundaries, tech stack choices, service architecture                                   | `docs/project-reference/project-structure-reference.md` | Add to relevant architecture section                            |
| SCSS/CSS styling, BEM methodology, mixins, variables, theming, responsive design, CSS conventions                                        | `docs/project-reference/scss-styling-guide.md`          | Add to relevant styling section                                 |
| Design system, design tokens, component library, UI kit conventions, Figma-to-code patterns                                              | `docs/project-reference/design-system/README.md`        | Add to relevant design section                                  |
| Feature documentation, doc templates, doc structure conventions, app-to-service doc mapping                                              | `docs/project-reference/feature-docs-reference.md`      | Add to relevant conventions section                             |
| Documentation indexing, doc organization, doc-to-code relationships, doc lookup patterns                                                 | `docs/project-reference/docs-index-reference.md`        | Add to relevant section                                         |
| General lessons, workflow tips, tooling, AI behavior, project conventions, anything not matching above                                   | `docs/project-reference/lessons.md`                     | Append as dated list entry                                      |

### Prevention Depth Assessment (MANDATORY before saving)

Before saving any lesson, critically evaluate whether a doc update alone is sufficient or a deeper prevention mechanism is needed:

| Prevention Layer                            | When to use                                                                   | Example                                                                                     |
| ------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Doc update only**                         | One-off awareness, rare edge case, team convention                            | "Always use fluent validation API" → `docs/project-reference/backend-patterns-reference.md` |
| **Prompt rule** (`development-rules.md`)    | Rule that ALL agents must follow on every task (injected on UserPromptSubmit) | "Grep after bulk edits" → `.claude/docs/development-rules.md`                               |
| **System Lesson** (`prompt-injections.cjs`) | Universal AI mistake, high recurrence, silent failure, any project            | "Re-read files after context compaction" → `.claude/hooks/lib/prompt-injections.cjs`        |
| **Hook** (`.claude/hooks/`)                 | Automated enforcement, must never be forgotten                                | "Dedup markers must match" → `lib/dedup-constants.cjs` + consistency test                   |
| **Test** (`.claude/hooks/tests/`)           | Regression prevention, verifiable invariant                                   | "All hooks import from shared module" → test in `test-all-hooks.cjs`                        |
| **Skill update** (`.claude/skills/`)        | Workflow step that should always include this check                           | "Review changes must check doc staleness" → skill SKILL.md update                           |

**Decision flow:**

1. **Capture** the lesson
2. **Ask:** "Could this mistake recur if the AI forgets this lesson?" If yes → needs more than a doc update
3. **Ask:** "Can this be caught automatically by a test or hook?" If yes → recommend hook/test
4. **Evaluate System Lesson promotion** (see below)
5. **Present options to user** with `AskUserQuestion`:
    - "Doc update only" — save to the best-fit reference file (default for most lessons)
    - "Doc + prompt rule" — also add to `development-rules.md` so all agents see it
    - "Doc + System Lesson" — also add to `prompt-injections.cjs` System Lessons (see criteria below)
    - "Full prevention" — plan a hook, test, or shared module to enforce it automatically
6. **Execute** the chosen option. For "Full prevention", create a plan via `/plan` instead of just saving.

### System Lesson Promotion (MANDATORY evaluation)

After generalizing a lesson, evaluate whether it qualifies as a **System Lesson** in `.claude/hooks/lib/prompt-injections.cjs`. System Lessons are injected into EVERY prompt — they are the highest-visibility prevention layer.

**Qualification criteria (ALL must be true):**

1. **Universal** — Applies to ANY AI coding project, not just this codebase
2. **High recurrence** — AI agents make this mistake repeatedly across sessions without the reminder
3. **Silent failure** — The mistake produces no error/warning; it silently degrades output quality
4. **Not already covered** — No existing System Lesson addresses the same root cause

> **System Lessons** — Universal AI mistake prevention rules injected into EVERY prompt. Stored in `injectLessonReminder()` → "Common AI Mistake Prevention" array. Each must be universal, high-recurrence, and silent-failure.
> READ `.claude/hooks/lib/prompt-injections.cjs` to check for duplicates before adding.

**If qualified:** Recommend "Doc + System Lesson" option. On user approval, append the lesson as a new bullet to the System Lessons array in `prompt-injections.cjs` following the existing format: `` `- **Bold title.** Explanation sentence.` ``

**If NOT qualified:** Explain why (e.g., "Too project-specific", "Already covered by existing System Lesson about X", "Low recurrence — only happens in rare edge cases"). Proceed with doc-only or prompt-rule option.

### Lesson Quality Gate (MANDATORY before saving)

Every lesson MUST be **generic and reusable across any project**. Before saving:

1. **Analyze root cause** — Why did this mistake happen? What is the underlying pattern?
2. **Generalize** — Strip project-specific names, file paths, and tool names. Express the lesson as a universal principle.
3. **Verify universality** — Would this lesson help an AI working on a completely different codebase? If no → rewrite until yes.

**Anti-pattern examples:**

- BAD: "Always check `lib/dedup-constants.cjs` for marker strings" → project-specific path
- GOOD: "When consolidating modules, ensure shared constants are imported from a single source of truth — never define inline duplicates."
- BAD: "Update `.claude/docs/hooks/README.md` after deleting hooks" → project-specific file
- GOOD: "Deleting components causes documentation staleness cascades — map all referencing docs before removal."

### Routing Decision Process

1. **Read the lesson text** — identify keywords and domain
2. **Apply Lesson Quality Gate** — analyze root cause, generalize, verify universality
3. **Run Prevention Depth Assessment** — determine if doc-only or deeper prevention needed
4. **Match against routing table** — pick the best-fit file
5. **Tell the user:** "This lesson fits best in `docs/{file}`. Confirm? [Y/n]"
6. **On confirm** — read target file, find the right section, append the lesson
7. **On reject** — ask user which file to use instead

### Format by Target File

**For `docs/project-reference/lessons.md`** (general lessons):

```markdown
- [YYYY-MM-DD] <lesson text>
```

**For pattern/rules files** (code-review-rules, backend-patterns, frontend-patterns, integration-test):

- Find the most relevant existing section in the file
- Append the lesson as a rule, anti-pattern entry, or code example
- Use the file's existing format (tables, code blocks, bullet lists)
- If no section fits, append to the Anti-Patterns or general rules section

## Budget Enforcement (MANDATORY for `docs/project-reference/lessons.md`)

`docs/project-reference/lessons.md` is injected into EVERY prompt and EVERY file edit. Token budget must be controlled.

**Hard limit:** 3000 characters (~1000 tokens). Check BEFORE saving any new lesson.

**Workflow when adding to `docs/project-reference/lessons.md`:**

1. Read file, count characters (`wc -c docs/project-reference/lessons.md`)
2. If current + new lesson > 3000 chars → trigger **Budget Trim** before saving
3. If under budget → save normally

**Budget Trim process:**

1. Display all current lessons with char count each
2. Evaluate each lesson on two axes:
    - **Universality** — How often does this apply? (every session vs rare edge case)
    - **Recurrence risk** — How likely is the AI to repeat this mistake without the reminder?
3. Score each: **HIGH** (keep as-is), **MEDIUM** (candidate to condense), **LOW** (candidate to remove)
4. Present to user with `AskUserQuestion`: "Budget exceeded. Recommend removing/condensing these LOW/MEDIUM items: [list]. Approve?"
5. On approval: condense MEDIUM items (shorten wording), remove LOW items, then save new lesson
6. On rejection: ask user which to remove/condense

**Condensing rules:**

- Remove examples, keep the rule: `"Patterns like X break Y syntax"` → just state the rule
- Merge related lessons into one if they share the same root cause
- Target: each lesson ≤ 250 chars (one concise sentence + bold title)

**Does NOT apply to:** Other routing targets (`backend-patterns-reference.md`, `code-review-rules.md`, etc.) — those files have their own size and are injected contextually, not on every prompt.

## Behavior

1. **`/learn <text>`** — Route and append lesson to the best-fit file (check budget if target is `lessons.md`)
2. **`/learn list`** — Read and display lessons from ALL 12 target files (show file grouping + char count for `lessons.md`)
3. **`/learn remove <N>`** — Remove lesson from `docs/project-reference/lessons.md` by line number
4. **`/learn clear`** — Clear all lessons from `docs/project-reference/lessons.md` only (confirm first)
5. **`/learn trim`** — Manually trigger Budget Trim on `docs/project-reference/lessons.md`
6. **File creation** — If target file doesn't exist, create with header only

## Auto-Inferred Activation

When Claude detects correction phrases in conversation (e.g., "always use X", "remember this", "never do Y", "from now on"), this skill auto-activates. When auto-inferred (not explicit `/learn`), **confirm with the user before saving**: "Save this as a lesson? [Y/n]"

## Storage

Lessons are distributed across all `docs/project-reference/` files (12 targets):

| File                                                    | Content type                             | Auto-injected?               |
| ------------------------------------------------------- | ---------------------------------------- | ---------------------------- |
| `docs/project-reference/code-review-rules.md`           | Review rules, anti-patterns, conventions | Yes (review skills)          |
| `docs/project-reference/backend-patterns-reference.md`  | Backend/hook patterns and rules          | Yes (backend edits)          |
| `docs/project-reference/frontend-patterns-reference.md` | Frontend patterns and rules              | Yes (frontend edits)         |
| `docs/project-reference/integration-test-reference.md`  | Integration test patterns and rules      | Config-driven                |
| `docs/project-reference/e2e-test-reference.md`          | E2E test patterns and rules              | Yes (E2E edits)              |
| `docs/project-reference/domain-entities-reference.md`   | Entity models, DTOs, relationships       | Yes (backend/frontend edits) |
| `docs/project-reference/project-structure-reference.md` | Architecture, modules, tech stack        | Yes (agent spawn)            |
| `docs/project-reference/scss-styling-guide.md`          | SCSS/CSS styling rules                   | Yes (styling edits)          |
| `docs/project-reference/design-system/README.md`        | Design tokens, UI kit conventions        | Yes (design edits)           |
| `docs/project-reference/feature-docs-reference.md`      | Feature doc templates, conventions       | On-demand                    |
| `docs/project-reference/docs-index-reference.md`        | Doc organization, lookup patterns        | On-demand                    |
| `docs/project-reference/lessons.md`                     | General lessons (fallback catch-all)     | Yes (EVERY prompt)           |

## Injection

Lessons are injected by `lessons-injector.cjs` hook on:

- **UserPromptSubmit** — `docs/project-reference/lessons.md` content (with dedup)
- **PreToolUse(Edit|Write|MultiEdit)** — `docs/project-reference/lessons.md` content (always)
- Pattern reference files are injected by their respective hooks (`code-patterns-injector.cjs`, `code-review-rules-injector.cjs`, etc.)

## Prompt Enhancement (MANDATORY final step)

After saving a lesson to any target file, run `/prompt-enhance` on the modified file(s) to optimize AI attention anchoring and token quality.

**When to run:**

- After EVERY successful lesson save (regardless of target file)
- Pass the specific file path(s) that were modified

**What it does:**

- Ensures the new lesson integrates with existing top/bottom summary anchoring
- Optimizes token usage — tightens prose, merges redundant content
- Verifies no content loss from the save operation

**How to invoke:**

```
/prompt-enhance docs/project-reference/<modified-file>.md
```

**Skip conditions (do NOT run prompt-enhance if):**

- The save was to `lessons.md` AND the file is under 1500 chars (too small to benefit)
- The user explicitly requests "save only, no enhance"

---

## Closing Reminders

- **MUST** check Reference Doc Catalog to find the best target file — NOT always `lessons.md`
- **MUST** run `/prompt-enhance` on modified file(s) after saving (unless skip conditions met)
- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** prefer auto-injected files for high-recurrence lessons (higher visibility)
