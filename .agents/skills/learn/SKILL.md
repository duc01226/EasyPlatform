---
name: learn
description: "[Utilities] Teach Claude lessons that persist across sessions. Triggers on 'remember this', 'always do', 'never do', 'learn this', 'from now on'. Smart routing to all 12 project-reference docs with /prompt-enhance finalization."
disable-model-invocation: false
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
>
> **Mandatory end tasks are ALWAYS (in order):**
>
> 1. "Run **Learn Review** (lesson value + generality + recurrence gate)."
> 2. "Run `$why-review` to challenge whether the lesson is worth persistent memory."
> 3. "Run `$prompt-enhance <modified-file>` to optimize lesson content for AI attention anchoring."
>
> Do NOT mark the skill complete until all 3 tasks run.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

## Quick Summary

**Goal:** Teach Claude lessons that persist across sessions by saving to the most relevant reference doc.

**Workflow:**

1. **Capture** -- Identify the lesson from user instruction or experience
2. **Route** -- Analyze lesson content against Reference Doc Catalog, select best target file
3. **Save** -- Append lesson to the selected file
4. **Confirm** -- Acknowledge what was saved and where
5. **Learn Review** -- Run the mandatory 2-step end gate (`Learn Review` + `$why-review`)
6. **Enhance** -- Run `$prompt-enhance` on modified file(s) to optimize AI attention anchoring

**Key Rules:**

- Triggers on "remember this", "always do X", "never do Y"
- **Triage first:** pass Recurrence gate + Auto-fix gate BEFORE routing or saving
- Smart-route to the most relevant file, NOT always `docs/project-reference/lessons.md`
- Check for existing entries before creating duplicates
- Confirm target file with user before writing

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Usage

### Add a lesson

```
$learn always use the validation framework fluent API instead of throwing ValidationException
$learn never call external APIs in command handlers - use Entity Event Handlers
$learn prefer async/await over .then() chains
```

### List lessons

```
$learn list
```

### Remove a lesson

```
$learn remove 3
```

### Clear all lessons

```
$learn clear
```

## Reference Doc Catalog (READ before routing)

Each `docs/project-reference/` file is auto-initialized by `session-init-docs.cjs` hook and populated by `/scan-*` skills. Understanding their roles is **critical** for correct routing.

| File                             | Role & Content                                                                                   | Injected By                                          | Injection Trigger                   | Scan Skill                |
| -------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------- | ----------------------------------- | ------------------------- |
| `project-structure-reference.md` | Architecture, directory tree, tech stack, module registry, service map                           | `subagent-init-*.cjs` (18 hooks)                     | Agent spawn                         | `$scan-project-structure` |
| `backend-patterns-reference.md`  | Backend/hook patterns: CJS modules, CQRS, repositories, validation, message bus, background jobs | `code-patterns-injector.cjs`, `backend-context.cjs`  | Edit/Write backend files            | `$scan-backend-patterns`  |
| `seed-test-data-reference.md`    | Seed/dev-data patterns: environment gate, idempotency loop, DI scope safety, command-dispatch    | Referenced in config + seed workflows                | Seeder/DataSeeder file edits        | `$scan-seed-test-data`    |
| `frontend-patterns-reference.md` | Frontend patterns: components, state mgmt, API services, styling conventions, directives         | `code-patterns-injector.cjs`, `frontend-context.cjs` | Edit/Write frontend files           | `$scan-frontend-patterns` |
| `integration-test-reference.md`  | Test architecture: base classes, fixtures, helpers, service-specific setup, test runners         | Referenced in config                                 | Test file edits                     | `$scan-integration-tests` |
| `feature-docs-reference.md`      | Feature doc templates, app-to-service mapping, doc structure conventions                         | On-demand (skill reads)                              | Skill activation                    | `$scan-feature-docs`      |
| `code-review-rules.md`           | Review rules, conventions, anti-patterns, decision trees, checklists                             | `code-review-rules-injector.cjs`                     | Review skill activation             | `$scan-code-review-rules` |
| `lessons.md`                     | General lessons — fallback catch-all. **Injected on EVERY prompt** (budget-controlled)           | `prompt-injections.cjs`                              | Every UserPromptSubmit + Edit/Write | Managed by `$learn`       |
| `scss-styling-guide.md`          | SCSS/CSS: BEM methodology, mixins, variables, theming, responsive patterns                       | `design-system-context.cjs`                          | Styling file edits                  | `$scan-scss-styling`      |
| `design-system/README.md`        | Design system: tokens overview, component inventory, app-to-doc mapping                          | `design-system-context.cjs`                          | Design file edits                   | `$scan-design-system`     |
| `e2e-test-reference.md`          | E2E test patterns: framework, page objects, config, best practices                               | `code-patterns-injector.cjs`                         | E2E file edits                      | `$scan-e2e-tests`         |
| `domain-entities-reference.md`   | Domain entities, data models, DTOs, aggregate boundaries, ER diagrams, cross-service sync        | `backend-context.cjs`, `frontend-context.cjs`        | Backend/frontend file edits         | `$scan-domain-entities`   |
| `docs-index-reference.md`        | Documentation tree, file counts, doc relationships, keyword-to-doc lookup                        | On-demand (manual)                                   | Manual reference                    | `$scan-docs-index`        |

**Key insight:** Files injected automatically by hooks have higher visibility — lessons placed enforced during edits. Files injected on-demand are only seen when skills explicitly read them. Prefer auto-injected files for high-recurrence lessons.

---

## Smart File Routing (CRITICAL)

### Lesson Triage Gate (MANDATORY — run FIRST, before routing or saving)

| Gate           | Question                                                                               | Pass           | Fail → Action                                        |
| -------------- | -------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------------- |
| **Recurrence** | "Would this mistake recur in a future session WITHOUT this reminder?"                  | Yes → continue | No → skip `$learn`; mistake is situational           |
| **Auto-fix**   | "Could `$code-review`, `/simplify`, `$security`, or `$lint` catch this automatically?" | No → continue  | Yes → skip `$learn`; update the review skill instead |

**Both gates must pass.** A lesson review skills already catch adds noise without value. A one-off situational mistake won't be prevented by a persisted rule.

---

### Routing Table

Route to the **most relevant file** based on lesson content:

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

---

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
5. **Present options to user** with a direct user question:
    - "Doc update only" — save to the best-fit reference file (default for most lessons)
    - "Doc + prompt rule" — also add to `development-rules.md` so all agents see it
    - "Doc + System Lesson" — also add to `prompt-injections.cjs` System Lessons (see criteria below)
    - "Full prevention" — plan a hook, test, or shared module to enforce it automatically
6. **Execute** the chosen option. For "Full prevention", create a plan via `$plan-hard` instead of just saving.

### System Lesson Promotion (MANDATORY evaluation)

After generalizing a lesson, evaluate whether it qualifies as a **System Lesson** in `.claude/hooks/lib/prompt-injections.cjs`. System Lessons are injected into EVERY prompt — they are the highest-visibility prevention layer.

**Qualification criteria (ALL must be true):**

1. **Universal** — Applies to ANY AI coding project, not just this codebase
2. **High recurrence** — AI agents make this mistake repeatedly across sessions without the reminder
3. **Silent failure** — The mistake produces no error/warning; it silently degrades output quality
4. **Not already covered** — No existing System Lesson addresses the same root cause

> **System Lessons** — Universal AI mistake prevention rules injected into EVERY prompt. Stored in `injectAiMistakePrevention()` → "Common AI Mistake Prevention" array. Each must be universal, high-recurrence, and silent-failure.
> READ `.claude/hooks/lib/prompt-injections.cjs` to check for duplicates before adding.

**If qualified:** Recommend "Doc + System Lesson" option. On user approval, append the lesson as a new bullet to the System Lessons array in `prompt-injections.cjs` following the existing format: `` `- **Bold title.** Explanation sentence.` ``

**If NOT qualified:** Explain why (e.g., "Too project-specific", "Already covered by existing System Lesson about X", "Low recurrence — only happens in rare edge cases"). Proceed with doc-only or prompt-rule option.

### Lesson Quality Gate (MANDATORY before saving)

Every lesson MUST be **root-cause level and generic across any codebase**. Apply this 3-step extraction before saving:

**Step 1 — Name the FAILURE MODE, not the symptom:**

The failure mode is the reasoning or assumption that broke — not what the output looked like.

| Symptom (BAD — reject this)       | Failure mode (GOOD — save this)                                                                                  |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| "Used wrong enum value"           | "Generated code using an assumed API without verifying it exists in source"                                      |
| "Wrong namespace/import"          | "Assumed project setup from convention without reading project-specific config files first"                      |
| "Happy-path test failed in CI"    | "Wrote assertions without tracing what runtime infrastructure the code path requires"                            |
| "Set properties that don't exist" | "Assumed all types in a hierarchy share the same interface without reading the base class"                       |
| "Always read file X before Y"     | "Assumed execution context without reading the owning layer's contract — fixed at symptom site instead of cause" |

**Step 2 — Verify generality:**

Does this failure mode apply to ≥3 different contexts or codebases? If only one file or one specific case → go up one abstraction level. A good lesson prevents an entire _class_ of mistakes.

**Step 3 — Write as a universal rule:**

- Strip ALL project-specific names, file paths, class names, and tool names
- Must be useful on any codebase, any language, any task type
- If multiple mistakes share the same failure mode → consolidate to ONE lesson, not many
- Test: "Would an AI working in Java, Go, or Python on a different project benefit from this?" If yes → good. If no → rewrite.

**Anti-pattern examples:**

- BAD: "Always check `lib/dedup-constants.cjs` for marker strings" → project-specific path
- GOOD: "When consolidating modules, ensure shared constants are imported from a single source of truth — never define inline duplicates."
- BAD: "Update `.claude/docs/hooks/README.md` after deleting hooks" → project-specific file
- GOOD: "Deleting components causes documentation staleness cascades — map all referencing docs before removal."
- BAD: "Read GlobalUsings.cs before adding usings in \*.IntegrationTests" → project-specific file
- GOOD: "Before generating code that uses project conventions (imports, namespaces, annotations), read the project's bootstrap/configuration files for that layer — convention files override framework defaults silently."

### End-Phase Learn Review Gate (MANDATORY before marking complete)

Run these 2 tasks at the end of every `$learn` operation:

**Task 1 — Learn Review (value + generality + recurrence):**

- Keep only lessons with clear prevention value.
- Lesson must be either:
    - Universal across many projects/codebases, OR
    - A stable project-wide principle (architecture invariant, naming invariant, workflow invariant).
- Reject lessons that are:
    - Specific to the current ticket/change/file,
    - Rare edge cases with low recurrence,
    - Already covered by existing lessons or review skills.
- If target is `docs/project-reference/lessons.md` (injected on every prompt), apply stricter bar: high impact + high recurrence only.

**Task 2 — Run `$why-review` (adversarial challenge):**

- Use `$why-review` to challenge whether this lesson deserves persistent memory.
- Verify:
    - Why this lesson prevents repeated mistakes,
    - Why this should be a lesson instead of a one-time note,
    - Why auto-checks (`$code-review`, `/simplify`, `$security`, `$lint`, hook/test) are insufficient.
- If rationale is weak, rewrite at higher abstraction or skip `$learn`.

### Routing Decision Process

1. **Run Triage Gate** — recurrence + auto-fix filters; stop here if either fails
2. **Read the lesson text** — identify keywords and domain
3. **Apply Lesson Quality Gate** — analyze root cause, generalize, verify universality
4. **Run Prevention Depth Assessment** — determine if doc-only or deeper prevention needed
5. **Match against Routing Table** — pick the best-fit file
6. **Tell the user:** "This lesson fits best in `docs/{file}`. Confirm? [Y/n]"
7. **On confirm** — read target file, find the right section, append the lesson
8. **On reject** — ask user which file to use instead

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

**Hard limit:** 10000 characters (~3333 tokens). Check BEFORE saving any new lesson.

**Workflow when adding to `docs/project-reference/lessons.md`:**

1. Read file, count characters (`wc -c docs/project-reference/lessons.md`)
2. If current + new lesson > 10000 chars → trigger **Budget Trim** before saving
3. If under budget → save normally

**Budget Trim process:**

1. Display all current lessons with char count each
2. Evaluate each lesson on two axes:
    - **Universality** — How often does this apply? (every session vs rare edge case)
    - **Recurrence risk** — How likely is the AI to repeat this mistake without the reminder?
3. Score each: **HIGH** (keep as-is), **MEDIUM** (candidate to condense), **LOW** (candidate to remove)
4. Present to user with a direct user question: "Budget exceeded. Recommend removing/condensing these LOW/MEDIUM items: [list]. Approve?"
5. On approval: condense MEDIUM items (shorten wording), remove LOW items, then save new lesson
6. On rejection: ask user which to remove/condense

**Condensing rules:**

- Remove examples, keep the rule: `"Patterns like X break Y syntax"` → just state the rule
- Merge related lessons into one if they share the same root cause
- Target: each lesson ≤ 250 chars (one concise sentence + bold title)

**Does NOT apply to:** Other routing targets (`backend-patterns-reference.md`, `code-review-rules.md`, etc.) — those files have their own size and are injected contextually, not on every prompt.

## Behavior

1. **`$learn <text>`** — Route and append lesson to the best-fit file (check budget if target is `lessons.md`)
2. **`$learn list`** — Read and display lessons from ALL 12 target files (show file grouping + char count for `lessons.md`)
3. **`$learn remove <N>`** — Remove lesson from `docs/project-reference/lessons.md` by line number
4. **`$learn clear`** — Clear all lessons from `docs/project-reference/lessons.md` only (confirm first)
5. **`$learn trim`** — Manually trigger Budget Trim on `docs/project-reference/lessons.md`
6. **File creation** — If target file doesn't exist, create with header only

## Auto-Inferred Activation

When Claude detects correction phrases in conversation (e.g., "always use X", "remember this", "never do Y", "from now on"), this skill auto-activates. When auto-inferred (not explicit `$learn`), **confirm with the user before saving**: "Save this as a lesson? [Y/n]"

## Injection

Lessons are injected by `lessons-injector.cjs` hook on:

- **UserPromptSubmit** — `docs/project-reference/lessons.md` content (with dedup)
- **PreToolUse(Edit|Write|MultiEdit)** — `docs/project-reference/lessons.md` content (always)
- Pattern reference files are injected by their respective hooks (`code-patterns-injector.cjs`, `code-review-rules-injector.cjs`, etc.)

## Prompt Enhancement (MANDATORY final step)

After saving a lesson to any target file, run `$prompt-enhance` on the modified file(s) to optimize AI attention anchoring and token quality.

**When to run:**

- After EVERY successful lesson save (regardless of target file)
- Pass the specific file path(s) that were modified

**What it does:**

- Ensures the new lesson integrates with existing top/bottom summary anchoring
- Optimizes token usage — tightens prose, merges redundant content
- Verifies no content loss from the save operation

**How to invoke:**

```
$prompt-enhance docs/project-reference/<modified-file>.md
```

**Skip conditions (do NOT run prompt-enhance if):**

- The save was to `lessons.md` AND the file is under 1500 chars (too small to benefit)
- The user explicitly requests "save only, no enhance"

---

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

**IMPORTANT MUST ATTENTION** run Triage Gate FIRST — if recurrence is low OR review skills can catch it, skip `$learn` entirely
**IMPORTANT MUST ATTENTION** check Reference Doc Catalog to find the best target file — NOT always `lessons.md`
**IMPORTANT MUST ATTENTION** mandatory end tasks are ALWAYS: `Learn Review` → `$why-review` → `$prompt-enhance <modified-file>` (in order)
**IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
**IMPORTANT MUST ATTENTION** prefer auto-injected files for high-recurrence lessons (higher visibility)

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
