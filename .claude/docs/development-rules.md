# Development Rules

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

## Quick Summary

**Goal:** Enforce code quality, responsibility hierarchy, and evidence-based development across all implementation tasks.

**Workflow:** Understand code → Plan → Implement (follow Code Step Rule) → Review → Test → Doc check

**Key Rules:**

- **Understand code first** — READ existing code, search 3+ patterns, run graph trace before ANY modification
- **Code Step Rule** — Code is a tree of steps: no blank line = same step (parallel), blank line = new step (must consume all previous outputs). Fix violations via extract function or chaining.
- **Class responsibility** — Logic in LOWEST layer: Entity/Model > Service > Component/Handler
- **YAGNI / KISS / DRY** — No speculative abstractions, no over-engineering
- **Evidence-based** — Every claim needs `file:line` proof, confidence >80% to act
- **Zero broken builds** — Code must compile with no syntax errors
- **Names express PURPOSE** — "OrXxx/AndYyy" joining roles/types/statuses = content-driven red flag. Test: "if I add/remove one item, must I rename?" → YES = rename
- **Surgical changes (context-aware)** — Bug fix: every changed line traces to the bug (diff test). Review/enhancement: implement improvements AND announce them explicitly. Never silently scope-creep.
- **Surface ambiguity before coding** — List assumptions (scope, format, volume), present interpretations with effort estimates, push back when simpler approach exists. Never pick silently and run.
- **Goal-driven execution** — Each TaskCreate step needs explicit verify criterion: `step → verify: [observable check]`, not "make it work"

---

## General

- **File Naming**: kebab-case with meaningful names — LLMs must understand purpose from filename alone without reading content
- **File Size**: Keep code files under 200 lines — split into focused components, extract utilities, use composition over inheritance
- Skills: `docs-seeker` (docs via Context7), `ai-multimodal` (images/video), `sequential-thinking`/`debug-investigate` (analysis), `gh` (GitHub)
- **[IMPORTANT]** Follow codebase structure and code standards in `./docs` during implementation
- **[IMPORTANT]** Always implement real code — never simulate or mock implementations
- **[CRITICAL] Class Responsibility Rule:**
    - Logic belongs in LOWEST layer: Entity/Model > Service > Component/Handler
    - Backend: Entity mapping → Command.UpdateEntity() or DTO.MapToEntity(), NOT in Handler
    - Frontend: Constants, column arrays, role lists → static properties in Model class, NOT in Component
    - Frontend: Display logic (CSS class, status text) → instance getter in Model, NOT switch in Component

## Understand Code First (MANDATORY)

> **Understand-Code-First** — Do NOT write code, create plans, or attempt fixes until you READ existing code.
> Search 3+ similar implementations first. Run graph on key files (MANDATORY when graph.db exists).

- **MUST ATTENTION USE graph trace** on key files when `.code-graph/graph.db` exists — after grep finds entry points, **STOP AND DECIDE:** run `python .claude/scripts/code_graph trace <file> --direction both --json` NOW. Use `--node-mode file` for overview (10-30x less noise), `--node-mode function` for detail. Graph reveals callers, importers, bus messages, event chains that grep cannot find. See CLAUDE.md "Graph Intelligence" section.

## Code Quality Guidelines

### Naming — Purpose vs Content

- **Name the PURPOSE, not the member list.** `OrXxx/AndYyy` joining roles/types/statuses → red flag. Test: "If I add/remove one item, must I rename?" → YES = content-driven = rename.
- **"Or" is fine in behavioral idioms** (`FirstOrDefault`, `SuccessOrThrow`) — it expresses WHAT HAPPENS, not WHO IS IN A SET.
- Full examples: `docs/project-reference/code-review-rules.md` → `### Naming Abstraction — Purpose vs Content`.

### Standards

- **Zero tolerance for broken builds** — code must compile with no syntax errors
- Follow codebase structure and code standards in `./docs`
- Prioritize functionality and readability over strict style enforcement
- Handle edge cases and error scenarios; use try-catch & security standards
- Use `code-reviewer` agent to review code after every implementation
- **DO NOT** create new enhanced files — update existing files directly

<!-- SYNC:shared-protocol-duplication-policy -->

> **Shared Protocol Duplication Policy** — Inline protocol content in skills (wrapped in `<!-- SYNC:tag -->`) is INTENTIONAL duplication. Do NOT extract, deduplicate, or replace with file references. AI compliance drops significantly when protocols are behind file-read indirection. To update: edit `.claude/skills/shared/sync-inline-versions.md` first (canonical source), then grep `SYNC:protocol-name` and update all occurrences.

<!-- /SYNC:shared-protocol-duplication-policy -->

## Code Step Rule (Universal — All Languages)

**[CRITICAL]** Code is a tree of steps. Formatting MUST ATTENTION reveal the tree structure.

### Three Rules

| Rule                                      | Meaning                                                                                                  | C# Analyzer                                                         |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **No blank line** between statements      | Same step — independent/parallel work                                                                    | `STEP002` warns if blank line exists between independent statements |
| **Blank line** between statements         | New step — MUST ATTENTION consume all outputs from previous step                                         | `STEP001` warns if missing; `STEP003` warns if outputs not consumed |
| **No flat mixing** of unrelated sub-tasks | If tasks A1 and A2 are independent but each has sub-steps, don't flatten all sub-steps into one sequence | Detected by STEP001/STEP002 combination                             |

### Anti-Pattern: Flat Mixing

```
// BAD — a2_a is unrelated to a1, but appears after a1's sub-steps with misleading blank lines
var a1_a = GetInput1();

var a1_b = Process(a1_a);  // depends on a1_a — blank line correct

// VIOLATION: a2 is independent of a1, yet a2's sub-steps are flattened alongside a1's
var a2_a = GetInput2();

var a2_b = Process(a2_a);

var result = Combine(a1_b, a2_b);
```

### Fix Option 1: Extract Functions

When sub-tasks have 2+ internal steps, extract each into a function. Call them on adjacent lines (same step = no blank line):

```
var a1 = GetA1();  // encapsulates a1_a → a1_b internally
var a2 = GetA2();  // encapsulates a2_a → a2_b internally

var result = Combine(a1, a2);  // new step — consumes all outputs from previous step
```

### Fix Option 2: Chaining

When sub-steps exist but you want to keep it flat, use chaining — indentation reveals tree structure:

```csharp
var a1 = GetInput1().Pipe(x => Process(x));  // C# / LINQ
var a2 = GetInput2().Pipe(x => Process(x));

var result = Combine(a1, a2);
```

_(Same pattern: TypeScript/RxJS → `.pipe(map(...))`, Python → single-expression calls)_

### Decision: Extract vs Chain

| Condition                                         | Prefer           |
| ------------------------------------------------- | ---------------- |
| Sub-steps are 2+ lines each                       | Extract function |
| Sub-steps are 1 line each                         | Chaining         |
| Sub-steps reused elsewhere                        | Extract function |
| Language has good chaining (C# LINQ, JS pipe, Rx) | Chain            |
| Language lacks chaining (Python, Go)              | Extract function |
| Readability suffers from deep chaining            | Extract function |

### When to Extract Functions (Natural Signal)

The step rule naturally tells you when extraction is needed:

- Can't write a step without violating the rule → **extract a function**
- A "step" has internal blank lines → its sub-steps should be a function
- Two adjacent lines are independent but each needs multiple operations → extract each into a function, call both on the same step (no blank line between them)

---

## Surgical Changes (MANDATORY — applies to every edit)

> **Touch only what you must. Clean up only your own mess.**

**The diff test** — Before submitting any change, ask: "Would this line appear in the diff if I hadn't been asked to do X?" If the answer is no, delete it.

### Rules

- **Don't improve adjacent code** — Don't refactor things that aren't broken. Don't add type hints, docstrings, or comments that weren't requested.
- **Match existing style** — Match existing quote style, spacing, naming conventions even if you'd do it differently. Style drift in a diff is noise that obscures the real change.
- **Orphan cleanup** — When your changes create unused imports/variables/functions, remove them. But do NOT remove pre-existing dead code unless asked. The distinction: YOU made it unused → remove it. It was already dead → mention it, don't touch it.
- **Scope discipline** — Two modes, same transparency rule:
    - **Bug fix context:** "Fix the bug" ≠ "improve the function." If you see a related improvement, announce it — don't silently implement it.
    - **Review / enhancement context:** If you see improvement opportunities, **implement them AND explicitly announce** what was enhanced beyond the main request. Never leave visible quality improvements unfixed when the task gives you license to improve. The rule either way: **never silently scope-creep**. Always declare what you did beyond the stated request.

### Anti-Pattern: Drive-By Refactoring

```diff
# BAD — fixing empty email bug but also adding username validation nobody asked for
-  if not user_data.get('email'):
+  email = user_data.get('email', '').strip()
+  if not email:
      raise ValueError("Email required")
+  if not user_data.get('username'):    # ← not part of the bug fix
+      raise ValueError("Username required")  # ← not asked for

# GOOD — surgical: only the lines that fix the empty email crash
-  if not user_data.get('email'):
+  email = user_data.get('email', '')
+  if not email or not email.strip():
      raise ValueError("Email required")
```

---

## Task Decomposition & Iterative Quality

> **Iterative Phase Quality** — Score complexity before planning. Score >=6 → MUST ATTENTION decompose into phases.
> Each phase: <=5 files, <=3h effort, plan → implement → review → fix → verify. No skipping.

- **Principle:** Break large tasks into small phases. Each phase: plan → implement → review → fix → verify
- **Rule:** No phase >5 files or >3h effort. No monolithic plans for complex tasks.

---

## Surface Ambiguity Before Coding (MANDATORY)

> **Never pick an interpretation silently and run. Surface it first.**

Before implementing any non-trivial request, surface ambiguity using this protocol:

**1. List assumptions explicitly:**

| Dimension       | Question to ask                                                        |
| --------------- | ---------------------------------------------------------------------- |
| **Scope**       | All records or filtered? Privacy implications?                         |
| **Format**      | File download? API response? Background job?                           |
| **Volume**      | How many records? (affects approach: in-memory vs streaming)           |
| **Constraints** | Performance targets? Security boundaries? Existing patterns to follow? |

**2. If multiple interpretations exist, present them with effort estimates:**

```
"[Request]" could mean:
1. [Interpretation A] — [approach] — ~[Nh] effort
2. [Interpretation B] — [approach] — ~[Nh] effort
3. [Interpretation C] — [approach] — ~[Nh] effort

Simplest approach: [X]. Need more context for [Y]. Which matters most?
```

**3. Push back when simpler exists:** State the simpler approach explicitly before implementing. NEVER silently pick the complex path because it was implied.

### Anti-Pattern: Silent Assumption

```
❌ User: "Export user data"
   AI: [immediately builds CSV/JSON exporter with file-writing, all users, all fields]

✅ User: "Export user data"
   AI: Before implementing, I need to clarify:
       1. Scope: Export all users or filtered? (privacy implications if all)
       2. Format: File download in browser, API endpoint, or background job with email?
       3. Fields: Which fields? Some may be sensitive.
       Simplest approach: API endpoint returning paginated JSON.
       Need more info for file-based or email-delivery exports. Which direction?
```

---

## Goal-Driven Execution (MANDATORY)

> **LLMs loop well when given success criteria. Vague tasks produce vague results.**

Transform imperative tasks into verifiable goals **before writing any code**. This is the difference between "I'll look into it" and a self-contained loop that runs to completion.

| Instead of...    | Transform to...                                                                   |
| ---------------- | --------------------------------------------------------------------------------- |
| "Fix the bug"    | "Write a failing test that reproduces it → make it pass"                          |
| "Add validation" | "Write tests for invalid inputs → make them pass"                                 |
| "Refactor X"     | "Ensure tests pass before AND after"                                              |
| "Make it faster" | Define: latency target? throughput? perceived? Then measure baseline → hit target |
| "Review this"    | List specific acceptance criteria — what does PASS look like?                     |

For multi-step tasks, each step in `TaskCreate` must carry an explicit verify criterion:

```
1. [Step] → verify: [specific observable check]
2. [Step] → verify: [specific observable check]
3. [Step] → verify: [specific observable check]
```

**Weak criteria** ("make it work", "improve it") require constant clarification — the loop stalls.
**Strong criteria** let you loop independently to completion — the loop self-terminates when done.

**Test-first application:** For bugs, write the failing test BEFORE fixing. The test is the success criterion made executable.

---

## Pre-commit/Push Rules

- Run linting before commit
- Run tests before push (DO NOT ignore failed tests just to pass the build)
- Keep commits focused on actual code changes
- **DO NOT** commit confidential information (dotenv files, API keys, credentials) to git
- Clean, professional commit messages — conventional commit format

## Bulk Edit Safety (MANDATORY for multi-file replacements)

When performing bulk find/replace across 3+ files:

1. **Preserve syntax integrity** — Never insert comments that break language syntax (e.g., `ClassName // comment<T>` breaks C# generics). Comments go AFTER complete type expressions.
2. **Grep verification** — After ALL replacements, grep entire repo for old term to catch missed references in docs, configs, catalog tables, tests.
3. **Doc cascade check** — When deleting/renaming components (agents, skills, hooks), map to affected docs:
    - `.claude/agents/**` → `.claude/docs/agents/README.md`, `.claude/docs/agents/agent-patterns.md`
    - `.claude/skills/**` → `.claude/docs/skills/README.md`
    - `.claude/hooks/**` → `.claude/docs/hooks/README.md`

## Doc Review (MANDATORY at session wrap-up)

After completing code changes, check for stale documentation:

1. Run `git diff --name-only` to list changed files
2. Map changed files to relevant docs:
    - Hook/skill/workflow files → `.claude/docs/` reference docs
    - Backend service code → `docs/business-features/` for affected module
    - Frontend app code → `docs/project-reference/frontend-patterns-reference.md` + business-feature docs
    - `CLAUDE.md` structural changes → `.claude/docs/README.md`
3. Flag stale docs in final review task or update immediately
4. Output `No doc updates needed` if no mapping applies

**Use `/watzup` skill** for automatic end-of-session doc check.

---

## Closing Reminders

**MANDATORY IMPORTANT MUST ATTENTION** understand existing code FIRST — read, grep 3+ patterns, run graph trace before ANY modification
**MANDATORY IMPORTANT MUST ATTENTION** follow Code Step Rule — no blank line = same step (parallel), blank line = new step (consume all previous outputs). Fix via extract function or chaining.
**MANDATORY IMPORTANT MUST ATTENTION** place logic in LOWEST layer: Entity/Model > Service > Component/Handler
**MANDATORY IMPORTANT MUST ATTENTION** ensure zero broken builds — code must compile with no syntax errors
**MANDATORY IMPORTANT MUST ATTENTION** follow YAGNI/KISS/DRY — no speculative abstractions
**MANDATORY IMPORTANT MUST ATTENTION** apply surgical changes (context-aware) — bug fix: diff test (every line traces to the bug). Review/enhancement: implement improvements you see AND announce them explicitly. Never silently scope-creep either way.
**MANDATORY IMPORTANT MUST ATTENTION** surface ambiguity before coding — list assumptions (scope/format/volume/constraints), present interpretations with effort estimates, push back when simpler exists. Never pick silently.
**MANDATORY IMPORTANT MUST ATTENTION** define verifiable success criteria per task — step → verify: [observable check], not "make it work"
**MANDATORY IMPORTANT MUST ATTENTION** run doc review at session wrap-up (map changed files → affected docs)
**MANDATORY IMPORTANT MUST ATTENTION** activate relevant skills from catalog during the process
**MANDATORY IMPORTANT MUST ATTENTION** names express PURPOSE not CONTENT — "OrXxx/AndYyy" joining roles/types/statuses = content-driven = rename. "Or" in behavioral idioms (`FirstOrDefault`, `SuccessOrThrow`) is fine.
