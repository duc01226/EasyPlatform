---
name: scan-feature-docs
description: '[Documentation] Scan project and populate/sync docs/project-reference/feature-docs-reference.md with app-to-service mapping, doc structure, templates, and documentation conventions.'
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

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks per file read. Prevents context loss from long files. Simple tasks: ask user whether to skip.

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
> 3. **Scan codebase** (grep/glob) for current state
> 4. **Diff** findings vs doc — identify stale sections only
> 5. **Update ONLY** diverged sections. Preserve manual annotations.
> 6. **Update metadata** (date, version) in frontmatter/header
> 7. **NEVER** rewrite entire doc. **NEVER** remove sections without evidence obsolete.

<!-- /SYNC:scan-and-update-reference-doc -->

> **Output note:** This skill's primary output (`feature-docs-reference.md`) MUST include the actual directory tree — it is the source of truth for doc locations. This is intentionally different from spec output documents which suppress directory trees.

## Quick Summary

**Goal:** Scan existing business feature documentation → populate `docs/project-reference/feature-docs-reference.md` with app-to-service mapping, documentation structure conventions, template usage, and section standards.

**Workflow:**

1. **Classify** — Detect doc mode and documentation structure type
2. **Scan** — Parallel sub-agents discover structure and app-service mappings
3. **Report** — Write findings incrementally
4. **Generate** — Build/update reference doc from report
5. **Fresh-Eyes** — Round 2 verification validates paths and mappings

**Key Rules:**

- Generic — works with any documentation structure
- Discover organization dynamically from file system
- Every reference must point to real files

---

# Scan Feature Docs

## Phase 0: Classify Doc Mode & Structure

**[BLOCKING]** Determine mode before any other step:

```bash
test -f docs/project-reference/feature-docs-reference.md && echo "SYNC mode" || echo "INIT mode"
```

| Mode      | Condition                                  | Behavior                                                   |
| --------- | ------------------------------------------ | ---------------------------------------------------------- |
| **INIT**  | `feature-docs-reference.md` does not exist | Create from scratch; scan entire `docs/business-features/` |
| **SYNC**  | `feature-docs-reference.md` exists         | Read existing file first; update changed sections only     |
| **FORCE** | User explicitly says "rebuild" or "reset"  | Treat as INIT even if file exists                          |

Detect documentation structure type:

| Signal                                      | Type                      | Scan Approach                       |
| ------------------------------------------- | ------------------------- | ----------------------------------- |
| `docs/business-features/{App}/` directories | App-bucketed feature docs | Scan per-app, map to services       |
| `docs/features/{Feature}.md` flat structure | Feature-per-file          | Scan each file, derive categories   |
| `wiki/` or external doc system links        | Wiki-based                | Scan wiki references, note external |
| README.md embedded in service dirs          | Source-embedded           | Scan `src/**/*.md` files            |

**Path:** INIT → Phase 1 → Phase 2 (full scan) → Phase 3 (full write) → Phase 4 (verify)
**Path:** SYNC → Phase 0 read existing → Phase 1 → Phase 2 (diff scan, new/changed only) → Phase 3 (targeted update) → Phase 4 (verify)

## Phase 1: Plan Scan Strategy

Create task tracking entries for each sub-agent and each verification step.

Discover documentation locations:

- `docs/` directory structure (business features, architecture, guides)
- `docs/business-features/` or similar feature doc directories
- `docs/templates/` or similar template directories
- README.md files across service directories

Use `docs/project-config.json` if available for module lists and app mappings.

## Phase 2: Execute Scan (Parallel Sub-Agents)

Launch **2 general-purpose sub-agents** in parallel. Each MUST:

- Write findings incrementally after each section — NEVER batch at end
- Cite `file:line` for every finding
- Confidence: >80% document; 60-80% note as "observed (unverified)"; <60% omit

All findings → `plans/reports/scan-feature-docs-{YYMMDD}-{HHMM}-report.md`

### Agent 1: Documentation Structure

**Think (Coverage dimension):** Which apps/modules have feature documentation? Which are missing? What's the distribution — evenly documented or concentrated?

**Think (Accuracy dimension):** What section headings actually appear across feature docs? What's the frequency? Which sections are standard (≥80% coverage) vs optional (20-80%) vs rare (<20%)?

**Think (Completeness dimension):** Are there documentation naming patterns? Section numbering? Required fields (evidence fields, TC IDs, CHANGELOG)?

- Glob for `docs/**/*.md` to map full documentation tree
- Find documentation templates (template files, skeleton docs)
- Discover documentation section patterns (recurring H2/H3 headings across docs)
- Count docs per app/module to assess coverage distribution
- Identify documentation naming patterns across feature docs

### Agent 2: App-to-Service Mapping

**Think (Relationships dimension):** Which frontend apps map to which backend services? Where is this documented vs inferred? Which apps have no service mapping?

**Think (Conventions dimension):** What naming, numbering, and tagging conventions appear consistently? Are TC IDs present? What format?

- Map frontend apps to backend services (from config, imports, or API calls)
- Find API reference docs and their relationship to services
- Discover troubleshooting docs and their coverage
- Find cross-references between docs (links, mentions)
- Look for doc generation tools or scripts

## Phase 3: Analyze & Generate

Read report. Apply fresh-eyes protocol:

**Round 1 (main agent):** Build section drafts.

**Round 2 (fresh sub-agent, zero memory):**

- Does every template path in the Templates section exist on filesystem?
- Does the app-to-service mapping match actual directory structure?
- Are coverage distribution numbers based on real glob counts?
- Are undocumented apps explicitly listed (not silently omitted)?

### Target Sections

| Section                       | Content                                                      |
| ----------------------------- | ------------------------------------------------------------ |
| **App-to-Service Mapping**    | Table: App name, Backend services, Doc directory, Doc count  |
| **Directory Structure**       | Tree showing docs/ organization with purpose annotations     |
| **Template Paths**            | Table: Template name, Path, Purpose, Used by N docs          |
| **Section Structure**         | Standard sections across feature docs (with frequency table) |
| **Documentation Conventions** | Naming, numbering, required fields, evidence rules           |
| **Coverage Gaps**             | Apps/services without documentation, incomplete docs         |

### Content Rules

- Use tables for all structured data (mappings, templates, conventions)
- Include actual directory tree output (top 3 levels) — **this skill intentionally includes trees**
- Section heading patterns with frequency percentages
- Coverage Gaps section is mandatory — list undocumented areas explicitly

## Phase 4: Write & Verify

1. Write updated doc with `<!-- Last scanned: YYYY-MM-DD -->` at top
2. Surgical update only — preserve unchanged sections
3. **Verify these 3 template paths exist:**
    - `docs/business-features/{Module}/detailed-features/README.{FeatureName}.md` — feature doc template
    - `.claude/skills/feature-docs/SKILL.md` — feature doc generation skill
    - `.claude/skills/shared/tc-format.md` — canonical TC format
4. Verify app-to-service mappings match actual directory structure
5. Verify Coverage Gaps section is present
6. Report: sections updated, coverage statistics, gaps identified

---

<!-- SYNC:scan-and-update-reference-doc:reminder -->

- **[REQUIRED]** read existing doc first, scan codebase, diff, surgical update only. Never rewrite entire doc.
    <!-- /SYNC:scan-and-update-reference-doc:reminder -->
    <!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid:
>
> **Verify AI-generated content against actual code.** AI hallucinates file paths and section headings. Glob to confirm existence before documenting.
> **Trace full dependency chain after edits.** Always trace full chain.
> **Surface ambiguity before coding.** NEVER pick silently.
> **Check downstream references before deleting.** Map referencing files before removal.

<!-- /SYNC:ai-mistake-prevention -->
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

- **[REQUIRED]** break work into small task tracking tasks BEFORE starting
- **[REQUIRED]** cite `file:line` evidence for every claim (confidence >80% to act)
- **[REQUIRED]** detect doc mode (INIT/SYNC) in Phase 0 — it is BLOCKING
- **[REQUIRED]** sub-agents write findings incrementally after each section — NEVER batch at end
- **[REQUIRED]** Coverage Gaps section is mandatory — NEVER silently omit undocumented apps
- **[REQUIRED]** Round 2 fresh-eyes validation before writing final doc

**Anti-Rationalization:**

| Evasion                                     | Rebuttal                                                                     |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| "Mode obvious, skip Phase 0 detection"      | Phase 0 mode detection is BLOCKING — INIT vs SYNC paths differ significantly |
| "Coverage Gaps not needed"                  | Coverage Gaps is a required section — omitting it hides maintenance debt     |
| "Template paths probably exist"             | Verify all 3 template paths exist before writing — "probably" ≠ verified     |
| "App-service mapping looks right"           | Verify mappings match actual directory structure via glob                    |
| "Round 2 not needed for documentation scan" | Main agent rationalizes own section extractions. Fresh-eyes mandatory.       |

**[TASK-PLANNING]** Before acting, analyze task scope and break into small todo tasks and sub-tasks using task tracking.

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
