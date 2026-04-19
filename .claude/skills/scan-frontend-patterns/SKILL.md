---
name: scan-frontend-patterns
version: 1.0.0
description: '[Documentation] Scan project and populate/sync docs/project-reference/frontend-patterns-reference.md with component base classes, state management, forms, API services, routing, and styling conventions.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

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

**Prerequisites:** **MUST ATTENTION READ** before executing:

<!-- SYNC:scan-and-update-reference-doc -->

> **Scan & Update Reference Doc** — When updating reference docs: (1) Read existing doc first. (2) Scan codebase for current state (grep/glob). (3) Diff findings vs doc content. (4) Update ONLY sections where code diverged from doc. (5) Preserve manual annotations. (6) Update metadata (date, counts). NEVER rewrite entire doc — surgical updates only.

<!-- /SYNC:scan-and-update-reference-doc -->

<!-- SYNC:output-quality-principles -->

> **Output Quality** — 10 rules for reference docs: (1) No inventories/counts, (2) No directory trees, (3) No TOCs, (4) Rules over descriptions, (5) 1 example per pattern, (6) Tables over prose, (7) Primacy-recency anchoring (critical rules in first+last 5 lines), (8) No checkbox checklists — use "MUST ATTENTION verify X", (9) Min density: 8 MUST ATTENTION/NEVER/ALWAYS per 100 lines, (10) Verify base class names and code examples preserved.

<!-- /SYNC:output-quality-principles -->

## Quick Summary

**Goal:** Scan frontend codebase and populate `docs/project-reference/frontend-patterns-reference.md` with component base classes, state management patterns, form handling, API service patterns, routing conventions, and directory structure. (content auto-injected by hook — check for [Injected: ...] header before reading)

**Workflow:**

1. **Read** — Load current target doc, detect init vs sync mode
2. **Scan** — Discover frontend patterns via parallel sub-agents
3. **Report** — Write findings to external report file
4. **Generate** — Build/update reference doc from report
5. **Verify** — Validate code examples reference real files

**Key Rules:**

- Generic — works with any frontend framework (Angular, React, Vue, Svelte, etc.)
- Detect framework first, then scan for framework-specific patterns
- Every code example must come from actual project files with file:line references

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Scan Frontend Patterns

## Phase 0: Read & Assess

1. Read `docs/project-reference/frontend-patterns-reference.md`
2. Detect mode: init (placeholder) or sync (populated)
3. If sync: extract existing sections and note what's already well-documented

## Phase 1: Plan Scan Strategy

Detect frontend framework:

- `angular.json` / `nx.json` → Angular (check for standalone components, signals, NgRx)
- `package.json` with `react` / `next` → React (check for hooks, context, state libs)
- `package.json` with `vue` / `nuxt` → Vue (check for Composition API, Pinia)
- `package.json` with `svelte` / `sveltekit` → Svelte
- Multiple frameworks → document each separately

Use `docs/project-config.json` contextGroups/modules if available for app paths.

## Phase 2: Execute Scan (Parallel Sub-Agents)

Launch **3 Explore agents** in parallel:

### Agent 1: Component & Form Patterns

- Grep for component base classes (`extends.*Component`, `@Component`, `React.Component`)
- Find form handling patterns (reactive forms, form builders, validation patterns)
- Discover component lifecycle conventions (init, destroy, cleanup patterns)
- Find template/JSX conventions (structural patterns, conditional rendering)
- Look for component communication patterns (inputs/outputs, props/events, signals)

### Agent 2: State Management & API Services

- Grep for state management patterns (stores, reducers, signals, observables)
- Find API service base classes (`extends.*Service`, `HttpClient`, `fetch` wrappers)
- Discover data fetching patterns (interceptors, error handling, caching)
- Find subscription/cleanup patterns (unsubscribe, dispose, cleanup callbacks)
- Look for shared/common service patterns

### Agent 3: Routing, Directives & Directory Structure

- Grep for routing configuration (route definitions, guards, resolvers, lazy loading)
- Find custom directives/pipes/hooks (reusable behavior patterns)
- Discover module/library organization (shared modules, feature modules)
- Map the directory structure conventions (where components, services, models live)
- Find build configuration patterns (environment configs, proxy configs)

Write all findings to: `plans/reports/scan-frontend-patterns-{YYMMDD}-{HHMM}-report.md`

## Phase 3: Analyze & Generate

Read the report. Build these sections:

### Target Sections

| Section                    | Content                                                                |
| -------------------------- | ---------------------------------------------------------------------- |
| **Component Base Classes** | Base class hierarchy, what each base provides, when to use which       |
| **State Management**       | Store pattern, reactivity approach, data flow conventions              |
| **Forms**                  | Form creation pattern, validation approach, error display conventions  |
| **API Services**           | Service base class, HTTP call pattern, error handling, caching         |
| **Routing**                | Route definition pattern, guards, lazy loading, navigation conventions |
| **Directives & Pipes**     | Custom reusable behaviors, naming conventions, registration            |
| **Directory Structure**    | Where things live: components, services, models, shared code           |
| **Subscription Cleanup**   | How subscriptions/listeners are managed and cleaned up                 |
| **Styling Conventions**    | Component styling approach (scoped, modules, BEM, utility classes)     |

### Content Rules

- Show actual code snippets (5-15 lines) from the project with `file:line` references
- Include "DO" and "DON'T" examples where anti-patterns are clear
- Use tables for convention summaries (base classes, file locations, naming)
- Group patterns by developer task (not by framework concept)

## Phase 4: Write & Verify

1. Write updated doc with `<!-- Last scanned: YYYY-MM-DD -->` at top
2. Verify: 5 code example file paths exist (Glob check)
3. Verify: class/function names in examples match actual definitions
4. Report: sections updated, patterns discovered, coverage gaps

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
  **MANDATORY IMPORTANT MUST ATTENTION** READ the following before starting:
      <!-- SYNC:scan-and-update-reference-doc:reminder -->
- **IMPORTANT MUST ATTENTION** read existing doc first, scan codebase, diff, surgical update only. Never rewrite entire doc.
  <!-- /SYNC:scan-and-update-reference-doc:reminder -->
  <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
      <!-- /SYNC:critical-thinking-mindset:reminder -->
      <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
      <!-- /SYNC:ai-mistake-prevention:reminder -->
