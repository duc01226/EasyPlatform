---
name: scan-code-review-rules
version: 2.0.0
description: '[Documentation] Scan project and populate/sync docs/project-reference/code-review-rules.md with code conventions, anti-patterns, architecture rules, and review checklists.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks per file read. Prevents context loss from long files. Simple tasks: ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources, admit uncertainty, self-check output, cross-reference independently. Certainty without evidence = root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

**Prerequisites:** **MUST ATTENTION READ** before executing:

<!-- SYNC:scan-and-update-reference-doc -->

> **Scan & Update Reference Doc** — Surgical updates only, NEVER full rewrite.
>
> 1. **Read existing doc** first — understand structure and manual annotations
> 2. **Detect mode:** Placeholder (headings only) → Init. Has content → Sync.
> 3. **Scan codebase** (grep/glob) for current patterns
> 4. **Diff** findings vs doc — identify stale sections only
> 5. **Update ONLY** diverged sections. Preserve manual annotations.
> 6. **Update metadata** (date, version) in frontmatter/header
> 7. **NEVER** rewrite entire doc. **NEVER** remove sections without evidence obsolete.

<!-- /SYNC:scan-and-update-reference-doc -->

<!-- SYNC:output-quality-principles -->

> **Output Quality** — Token efficiency without sacrificing quality.
>
> 1. No inventories/counts — stale instantly
> 2. No directory trees — use 1-line path conventions
> 3. No TOCs — AI reads linearly
> 4. One example per pattern — only if non-obvious
> 5. Lead with answer, not reasoning
> 6. Sacrifice grammar for concision in reports
> 7. Unresolved questions at end

<!-- /SYNC:output-quality-principles -->

## Quick Summary

**Goal:** Scan project codebase for established conventions, lint rules, common patterns, and anti-patterns → populate `docs/project-reference/code-review-rules.md` with actionable review rules and checklists. (content auto-injected by hook — check for [Injected:...] header before reading)

**Workflow:**

1. **Classify** — Detect project scope, scan mode
2. **Scan** — Discover conventions and patterns via parallel sub-agents
3. **Report** — Write findings to external report file (incremental)
4. **Generate** — Build/update reference doc from report
5. **Verify** — Fresh-eyes round validates rules against actual code

**Key Rules:**

- Derive rules from ACTUAL codebase patterns, not generic best practices
- Every rule has a "DO" example from the project with `file:line`
- Focus on project-specific conventions that differ from framework defaults
  **MUST ATTENTION** detect project scope FIRST — agent routing depends on it

---

# Scan Code Review Rules

## Phase 0: Classify Scan Scope

**Before any other step**, run in parallel:

1. Read `docs/project-reference/code-review-rules.md`
    - Detect mode: Init (placeholder) or Sync (populated)
    - In Sync mode: extract section list → skip re-scanning well-documented sections

2. Detect project scope:

| Signal                                                     | Scope                      | Agent Routing              |
| ---------------------------------------------------------- | -------------------------- | -------------------------- |
| `.csproj` files present                                    | Full-stack or Backend-only | Run Agent 1 (Backend)      |
| `angular.json` / `nx.json` / `package.json` with framework | Frontend present           | Run Agent 2 (Frontend)     |
| Both above                                                 | Full-stack                 | Run Agents 1+2+3           |
| `docker-compose.yml` / K8s manifests                       | Infrastructure present     | Run Agent 3 (Architecture) |
| Linter configs (`.eslintrc`, `stylecop.json`)              | Code quality infra found   | Prioritize Agent 1/2       |

3. Discover code quality infrastructure:
    - Linter configs (`.eslintrc`, `.editorconfig`, `stylecop.json`, `.prettierrc`, `ruff.toml`)
    - CI quality gates, code analysis configs (SonarQube, CodeClimate)
    - Existing standards docs (CONTRIBUTING.md, CODING_STANDARDS.md)
    - Git hooks (pre-commit, husky)

**Evidence gate:** Confidence <60% on scope → report uncertainty, ask user before proceeding.

## Phase 1: Plan

Create `TaskCreate` entries for each sub-agent and each review dimension. **Do not start Phase 2 without tasks created.**

## Phase 2: Execute Scan (Parallel Sub-Agents)

Launch sub-agents matching detected scope. Each MUST:

- Write findings incrementally after each section — NEVER batch at end
- Cite `file:line` for every rule example
- Confidence: HIGH (3+ consistent examples), MEDIUM (1-2), LOW (<1) — document HIGH and MEDIUM only

All findings → `plans/reports/scan-code-review-rules-{YYMMDD}-{HHMM}-report.md`

### Agent 1: Backend Rules

**Think:** What does a GOOD backend file look like in this project? What naming, error handling, and DI choices separate "good code" from "code that got merged but shouldn't have"? Where are the active anti-patterns?

Scan targets:

- Naming conventions — class suffixes, method prefixes, interface naming with examples
- Base classes — when used vs when not used (detect violations)
- Error handling — try-catch, Result types, error middleware patterns
- Dependency injection — registration conventions, lifetime choices
- Anti-patterns — direct DB access from controllers, business logic in wrong layer
- Logging — structured logging, log levels, correlation IDs

### Agent 2: Frontend Rules

**Think:** What makes Angular/React/Vue code reviewable vs unmaintainable here? Where is state management discipline enforced? What cleanup patterns are used?

Scan targets:

- Component conventions — naming, file organization, template patterns with examples
- State management — what goes in store vs component vs service (with rule evidence)
- Styling — BEM, CSS modules, utility classes, naming (derive from detected approach)
- Subscription/memory management — cleanup, unsubscribe, dispose patterns
- Accessibility — ARIA, semantic HTML, keyboard navigation (if patterns found)
- Performance — lazy loading, change detection, memoization patterns

### Agent 3: Architecture Rules

**Think:** What dependency directions are enforced here? Where do services communicate directly vs via messages? What's shared vs duplicated, and is that intentional?

Scan targets:

- Layer boundaries — what imports what, dependency direction rules
- Cross-service communication — direct calls vs messages (find violations)
- Shared code — what's shared vs duplicated, rationale
- Testing conventions — naming, organization, mock patterns
- Security — auth checks, input validation, output encoding (derive from existing patterns)
- Configuration — env vars, config files, secrets management patterns

## Phase 3: Analyze & Generate

Read report. Apply evidence confidence to classify each rule:

| Confidence                     | Documentation                           |
| ------------------------------ | --------------------------------------- |
| HIGH (3+ examples, consistent) | Document as rule with DO/DON'T pair     |
| MEDIUM (1-2 examples)          | Document as "observed pattern (verify)" |
| LOW (<1 consistent example)    | Omit — insufficient evidence            |

**Round 1 (main agent):** Build section drafts from report.

**Round 2 (fresh sub-agent, zero memory):** Re-reads report + draft independently.

- Does every decision tree node have real code examples?
- Are anti-patterns documented with real `file:line` violations (not hypothetical)?
- Is every rule specific to this project (not generic)?

### Target Sections

| Section                | Content                                                        |
| ---------------------- | -------------------------------------------------------------- |
| **Critical Rules**     | Top 5-10 rules that cause most bugs if violated                |
| **Backend Rules**      | Naming, patterns, error handling, DI with DO/DON'T examples    |
| **Frontend Rules**     | Component, state, styling, cleanup with DO/DON'T examples      |
| **Architecture Rules** | Layer boundaries, cross-service rules, shared code conventions |
| **Anti-Patterns**      | Common mistakes found in codebase with real `file:line`, fixes |
| **Decision Trees**     | For common decisions: which base class, where to put logic     |
| **Checklists**         | PR review checklists for backend, frontend, cross-cutting      |

### Content Rules

- Every rule has a "DO" code example from the actual project
- Every rule has a "DON'T" counterexample (real `file:line` or clearly marked realistic)
- Use `file:line` references for all code examples
- Prioritize rules by impact (bugs prevented, not style preferences)

## Phase 4: Write & Verify

1. Write updated doc with `<!-- Last scanned: YYYY-MM-DD -->` at top
2. Surgical update only — preserve sections unchanged, update only diverged
3. Verify (Glob check): ALL code example file paths exist
4. Verify (Grep check): Anti-pattern examples use real class/method names
5. Verify: Decision trees have concrete outcomes (not "it depends")
6. Report: sections updated, rules count, anti-patterns discovered

---

<!-- SYNC:scan-and-update-reference-doc:reminder -->

**IMPORTANT MUST ATTENTION** read existing doc first, scan codebase, diff, surgical update only. Never rewrite entire doc.

<!-- /SYNC:scan-and-update-reference-doc:reminder -->
<!-- SYNC:output-quality-principles:reminder -->

**IMPORTANT MUST ATTENTION** output quality: no counts/trees/TOCs, 1 example per pattern, lead with answer.

<!-- /SYNC:output-quality-principles:reminder -->
<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid:
>
> **Verify AI-generated content against actual code.** AI hallucinates class names/signatures. Grep to confirm existence before documenting.
> **Trace full dependency chain after edits.** Changing a definition misses downstream consumers. Always trace full chain.
> **Holistic-first — resist nearest-attention trap.** List EVERY precondition before forming hypothesis.
> **Surgical changes — apply diff test.** Every changed line traces directly to the task.
> **Surface ambiguity before coding.** Multiple interpretations → present each with effort estimate. NEVER pick silently.

<!-- /SYNC:ai-mistake-prevention -->
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** break work into small `TaskCreate` tasks BEFORE starting
**IMPORTANT MUST ATTENTION** detect project scope FIRST in Phase 0 — agent routing depends on it
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** derive rules from ACTUAL patterns — generic best practices are forbidden
**IMPORTANT MUST ATTENTION** sub-agents write findings incrementally — NEVER batch at end
**IMPORTANT MUST ATTENTION** two review rounds — Round 2 fresh sub-agent catches what main agent missed

**Anti-Rationalization:**

| Evasion                                   | Rebuttal                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| "Scope obvious, skip Phase 0 detection"   | Phase 0 is BLOCKING — agent routing depends on detected scope             |
| "Rules are standard, don't need examples" | Every rule MUST have `file:line` evidence from this project               |
| "Anti-patterns are hypothetical"          | Anti-Patterns section requires REAL `file:line` violations only           |
| "Round 2 review not needed"               | Main agent rationalizes own decisions. Fresh sub-agent is non-negotiable. |
| "Doc has content, skip re-read"           | Show section list extracted from doc as proof of re-read                  |

**[TASK-PLANNING]** Before acting, analyze task scope and break into small todo tasks and sub-tasks using TaskCreate.
