---
name: learn
description: '[Utilities] Use when you need to teach Claude lessons that persist across sessions.'
disable-model-invocation: false
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

Codex uses static project-reference loading instead of runtime-injected project docs.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

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

- **GENERALIZE FIRST (the #1 protocol):** Extract the GENERIC lesson that applies to many cases — NEVER save the specific case as-is. The user's words describe one incident; your job is to climb from that incident to the reusable rule. Strip every project/file/tool/domain name. If the saved text only helps on this exact ticket, you failed — abstract it up a level. (Enforced by the Lesson Quality Gate below.)
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

Each `docs/project-reference/` file is auto-initialized by `session-init-docs.cjs` hook and populated by `/scan-*` skills. Understanding their roles is **critical** for correct routing: routing is static — read the doc whose **Read Trigger** matches your task.

| File                             | Role & Content                                                                                   | Read Trigger (static)              | Scan Skill                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------- | ---------------------------------- |
| `project-structure-reference.md` | Architecture, directory tree, tech stack, module registry, service map                           | New area / architecture work       | `$scan --target=project-structure` |
| `backend-patterns-reference.md`  | Backend/hook patterns: CJS modules, CQRS, repositories, validation, message bus, background jobs | Editing backend / CQRS / API files | `$scan --target=backend-patterns`  |
| `seed-test-data-reference.md`    | Seed/dev-data patterns: environment gate, idempotency loop, DI scope safety, command-dispatch    | Seeder / DataSeeder file edits     | `$scan --target=seed-test-data`    |
| `frontend-patterns-reference.md` | Frontend patterns: components, state mgmt, API services, styling conventions, directives         | Editing frontend / UI files        | `$scan --target=frontend-patterns` |
| `integration-test-reference.md`  | Test architecture: base classes, fixtures, helpers, service-specific setup, test runners         | Integration test file edits        | `$scan --target=integration-tests` |
| `feature-spec-reference.md`      | Feature doc templates, app-to-service mapping, doc structure conventions                         | Authoring / reading feature specs  | `$scan --target=feature-spec`      |
| `code-review-rules.md`           | Review rules, conventions, anti-patterns, decision trees, checklists                             | Any review skill activation        | `$scan --target=code-review-rules` |
| `lessons.md`                     | General lessons — fallback catch-all. Read on EVERY task (per project-reference-docs gate)       | Every task                         | Managed by `$learn`                |
| `scss-styling-guide.md`          | SCSS/CSS: BEM methodology, mixins, variables, theming, responsive patterns                       | Styling / SCSS file edits          | `$scan --target=scss-styling`      |
| `design-system/README.md`        | Design system: tokens overview, component inventory, app-to-doc mapping                          | Design / UI file edits             | `$scan --target=design-system`     |
| `e2e-test-reference.md`          | E2E test patterns: framework, page objects, config, best practices                               | E2E file edits                     | `$scan --target=e2e-tests`         |
| `domain-entities-reference.md`   | Domain entities, data models, DTOs, aggregate boundaries, ER diagrams, cross-service sync        | Backend / frontend domain work     | `$scan --target=domain-entities`   |
| `docs-index-reference.md`        | Documentation tree, file counts, doc relationships, keyword-to-doc lookup                        | Doc lookup / navigation            | `$scan --target=docs-index`        |

**Key insight:** `lessons.md` and `code-review-rules.md` are the highest-recurrence routing targets — read them on every relevant task. Place high-recurrence lessons where the matching **Read Trigger** guarantees a future session opens them.

---

## Smart File Routing (CRITICAL)

### Lesson Triage Gate (MANDATORY — run FIRST, before routing or saving)

| Gate           | Question                                                                                             | Pass           | Fail → Action                                        |
| -------------- | ---------------------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------------- |
| **Recurrence** | "Would this mistake recur in a future session WITHOUT this reminder?"                                | Yes → continue | No → skip `$learn`; mistake is situational           |
| **Auto-fix**   | "Could `$code-review`, `$code-simplifier`, `$security-review`, or `$lint` catch this automatically?" | No → continue  | Yes → skip `$learn`; update the review skill instead |

**Both gates must pass.** A lesson review skills already catch adds noise without value. A one-off situational mistake won't be prevented by a persisted rule.

---

### Routing Table

Route to the **most relevant file** based on lesson content:

| If lesson is about...                                                                                                                      | Route to                                                | Section hint                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | --------------------------------------------------------------- |
| Code review rules, anti-patterns, review checklists, YAGNI/KISS/DRY, naming conventions, review process                                    | `docs/project-reference/code-review-rules.md`           | Add to most relevant section (anti-patterns, rules, checklists) |
| Backend/hook patterns: modules, CQRS, repositories, entities, validation, message bus, background jobs, migrations, configured persistence | `docs/project-reference/backend-patterns-reference.md`  | Add to relevant section or Anti-Patterns section                |
| Frontend patterns: components, state stores, forms, API services, styling conventions, directives, pipes                                   | `docs/project-reference/frontend-patterns-reference.md` | Add to relevant section or Anti-Patterns section                |
| Integration/unit tests: test base classes, fixtures, test helpers, test patterns, assertions, test runners                                 | `docs/project-reference/integration-test-reference.md`  | Add to relevant section                                         |
| E2E tests: Playwright, Cypress, Selenium, page objects, E2E config, browser automation, visual regression                                  | `docs/project-reference/e2e-test-reference.md`          | Add to relevant section                                         |
| Domain entities, data models, DTOs, aggregates, entity relationships, cross-service data sync, ER diagrams                                 | `docs/project-reference/domain-entities-reference.md`   | Add to Entity Catalog or Relationships section                  |
| Project structure, directory organization, module boundaries, tech stack choices, service architecture                                     | `docs/project-reference/project-structure-reference.md` | Add to relevant architecture section                            |
| SCSS/CSS styling, BEM methodology, mixins, variables, theming, responsive design, CSS conventions                                          | `docs/project-reference/scss-styling-guide.md`          | Add to relevant styling section                                 |
| Design system, design tokens, component library, UI kit conventions, Figma-to-code patterns                                                | `docs/project-reference/design-system/README.md`        | Add to relevant design section                                  |
| Feature documentation, doc templates, doc structure conventions, app-to-service doc mapping                                                | `docs/project-reference/feature-spec-reference.md`      | Add to relevant conventions section                             |
| Documentation indexing, doc organization, doc-to-code relationships, doc lookup patterns                                                   | `docs/project-reference/docs-index-reference.md`        | Add to relevant section                                         |
| General lessons, workflow tips, tooling, AI behavior, project conventions, anything not matching above                                     | `docs/project-reference/lessons.md`                     | Append as dated list entry                                      |

---

### Prevention Depth Assessment (MANDATORY before saving)

Before saving any lesson, critically evaluate whether a doc update alone is sufficient or a deeper prevention mechanism is needed:

| Prevention Layer                                       | When to use                                                        | Example                                                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| **Doc update only**                                    | One-off awareness, rare edge case, team convention                 | "Always use fluent validation API" → `docs/project-reference/backend-patterns-reference.md` |
| **Prompt rule** (`development-rules.md`)               | Rule that ALL agents must follow on every task                     | "Grep after bulk edits" → `.claude/docs/development-rules.md`                               |
| **Static protocol lesson** (`sync-inline-versions.md`) | Universal AI mistake, high recurrence, silent failure, any project | "Re-read files after context compaction" → `.claude/skills/shared/sync-inline-versions.md`  |
| **Hook** (`.claude/hooks/`)                            | Automated enforcement, must never be forgotten                     | "Dedup markers must match" → `lib/dedup-constants.cjs` + consistency test                   |
| **Test** (`.claude/hooks/tests/`)                      | Regression prevention, verifiable invariant                        | "All hooks import from shared module" → test in `test-all-hooks.cjs`                        |
| **Skill update** (`.claude/skills/`)                   | Workflow step that should always include this check                | "Review changes must check doc staleness" → skill SKILL.md update                           |

**Decision flow:**

1. **Capture** the lesson
2. **Ask:** "Could this mistake recur if the AI forgets this lesson?" If yes → needs more than a doc update
3. **Ask:** "Can this be caught automatically by a test or hook?" If yes → recommend hook/test
4. **Evaluate Static Protocol Lesson promotion** (see below)
5. **Present options to user** with a direct user question:
    - "Doc update only" — save to the best-fit reference file (default for most lessons)
    - "Doc + prompt rule" — also add to `development-rules.md` so all agents see it
    - "Doc + Static Protocol Lesson" — also add to shared protocol lessons (see criteria below)
    - "Full prevention" — plan a hook, test, or shared module to enforce it automatically
6. **Execute** the chosen option. For "Full prevention", create a plan via `$plan` instead of just saving.

### Static Protocol Lesson Promotion (MANDATORY evaluation)

After generalizing a lesson, evaluate whether it qualifies as a **Static Protocol Lesson** in `.claude/skills/shared/sync-inline-versions.md`. Static protocol lessons are baked into `CLAUDE.md`, mirrored into `AGENTS.md`, and synced to Codex carriers through project-init/sync tooling.

**Qualification criteria (ALL must be true):**

1. **Universal** — Applies to ANY AI coding project, not just this codebase
2. **High recurrence** — AI agents make this mistake repeatedly across sessions without the reminder
3. **Silent failure** — The mistake produces no error/warning; it silently degrades output quality
4. **Not already covered** — No existing Static Protocol Lesson addresses the same root cause

> **Static Protocol Lessons** — Universal AI mistake prevention rules baked into static carriers. Stored in `.claude/skills/shared/sync-inline-versions.md` under the `ai-mistake-prevention` and `ai-mistake-prevention:full` SYNC blocks. Each must be universal, high-recurrence, and silent-failure.
> READ `.claude/skills/shared/sync-inline-versions.md` to check for duplicates before adding.

**If qualified:** Recommend "Doc + Static Protocol Lesson" option. On user approval, append the lesson as a new bullet to the relevant shared SYNC blocks, then run the project-init / sync pipeline so `CLAUDE.md`, `AGENTS.md`, and Codex carriers regenerate from the shared source.

**If NOT qualified:** Explain why (e.g., "Too project-specific", "Already covered by existing Static Protocol Lesson about X", "Low recurrence — only happens in rare edge cases"). Proceed with doc-only or prompt-rule option.

### Lesson Quality Gate (BLOCKING — generalize before you save)

> **CORE PROTOCOL — do not skip:** A `$learn` request always arrives as a SPECIFIC case ("don't migrate via the bus and spam Elasticsearch"). Saving it verbatim is the default failure mode. You MUST transform specific → generic BEFORE writing: name the underlying class of mistake, drop the incident's nouns, and write a rule that fires across many future cases ("migrations write the DB directly, never via message bus — applies to all migrations"). If you cannot state the lesson without naming this ticket's files/services/tools, it is NOT generic yet — climb one more abstraction level. When in doubt, save the MORE generic version; a too-specific lesson is dead weight injected on every prompt.

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
    - Why auto-checks (`$code-review`, `$code-simplifier`, `$security-review`, `$lint`, hook/test) are insufficient.
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

`docs/project-reference/lessons.md` is a static project-reference carrier read during project work. Token budget must be controlled.

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

## How Lessons Reach the AI

Lessons and pattern references are read statically, per the project-reference-docs gate in `CLAUDE.md`:

- `docs/project-reference/lessons.md` — read on **every** task (the gate always includes it).
- Pattern/rule references (`backend-patterns-reference.md`, `code-review-rules.md`, etc.) — read by their matching trigger (see the Reference Doc Catalog table above).

Because the routing is static prose, hookless harnesses (Codex) load the same lessons and patterns as Claude Code.

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

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.
>
> **Mandatory end tasks are ALWAYS (in order):**
>
> 1. "Run **Learn Review** (lesson value + generality + recurrence gate)."
> 2. "Run `$why-review` to challenge whether the lesson is worth persistent memory."
> 3. "Run `$prompt-enhance <modified-file>` to optimize lesson content for AI attention anchoring."
>
> Do NOT mark the skill complete until all 3 tasks run.

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing.** Before changing a constant, limit, flag, wording, or pattern, read nearby context and history.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** GENERALIZE FIRST — extract the generic, many-cases rule; NEVER persist the specific incident as written. Strip all ticket/file/service/tool names before saving.

**MUST ATTENTION Protocols in force (concise digest of the SYNC/shared blocks this skill carries — full bodies above are canonical):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** critical + sequential thinking, traced proof, confidence >80%, NEVER guess as fact.

**IMPORTANT MUST ATTENTION** run Triage Gate FIRST — if recurrence is low OR review skills can catch it, skip `$learn` entirely
**IMPORTANT MUST ATTENTION** check Reference Doc Catalog to find the best target file — NOT always `lessons.md`
**IMPORTANT MUST ATTENTION** mandatory end tasks are ALWAYS: `Learn Review` → `$why-review` → `$prompt-enhance <modified-file>` (in order)
**IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
**IMPORTANT MUST ATTENTION** prefer auto-injected files for high-recurrence lessons (higher visibility)

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)

## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Trace every requirement or invariant through decision, task, TC/test, source evidence, and docs/spec update.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.
  **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
   **Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
   **Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

## Common AI Mistake Prevention (System Lessons)

- **Re-read files after context compaction.** Edit requires prior Read in same context; compaction wipes read state. Re-read before editing.
- **Grep for old terms after bulk replacements.** AI over-trusts find/replace completeness. Grep full repo after bulk edits for missed refs in docs/configs/catalogs.
- **Check downstream references before deleting.** Deletions cascade doc/code staleness. Map referencing files before removal.
- **After memory loss, check existing state before creating new.** Compaction wipes prior-work memory. Query current state to resume — never blindly duplicate.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace full dependency chain after edits.** Changing a definition misses downstream consumers. Trace the full chain.
- **When renaming, grep ALL consumer file types.** Some file types silently ignore missing refs (no compile error). Search code, templates, configs, generated files.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Update docs that embed canonical data when source changes.** Docs inlining derived data (workflows, schemas, configs) go stale silently. Update all embedding docs alongside source.
- **Verify sub-agent results after context recovery.** Background agents may finish while parent compacted — grep-verify output, don't trust assumed completion.
- **Cross-check full target list against sub-agent assignments.** Parallel sub-agents by category miss boundary items. Reconcile union of assignments against target list before proceeding.
- **Sub-agents inherit knowledge only from their agent .md definition — use custom agent types, not built-in Explore.** Tool adoption = permission + knowledge + enforcement (numbered workflow step).
- **Persist sub-agent findings incrementally, not as a final batch.** Long sub-agents hit cutoffs before final write — findings lost. Instruct append-per-section to report file.
- **When debugging, ask "whose responsibility?" before fixing.** Trace caller (wrong data) vs callee (wrong handling). Fix at responsible layer — never patch symptom site.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing.** Pattern-matching as "wrong" skips context. Before changing any constant/limit/flag: read comments, git blame, surrounding code.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic-first debugging — resist nearest-attention trap.** Don't dive into first plausible cause. List EVERY precondition (config, env vars, paths, DB, endpoints, creds, versions, DI, data). Verify each against evidence (grep/query — not reasoning). Ask "what would falsify this?" — if nothing, it's not a hypothesis. Most expensive failure: going deeper in "obvious" layer while bug sits in layer never questioned.
- **Surgical changes — apply the diff test (context-aware).** Two modes: (1) Bug fix → every line traces to the bug; no restyling; orphan cleanup only for imports YOUR changes made unused. (2) Review/enhancement → implement improvements AND announce as "Enhancement beyond main request: [what]". Never silently scope-creep. Diff test: "Would this line exist if I wasn't asked to do X?" — if no, delete or announce.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **[MANDATORY FIRST ACTION] ALWAYS activate a suitable skill or workflow BEFORE responding.** Match task against workflow catalog + skill list; invoke via skill invocation or `$start-workflow <workflowId>`. NEVER answer or write code before checking. Skip = protocol violation.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
