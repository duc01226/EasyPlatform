---
name: scan-project-structure
description: '[Documentation] Scan project and populate/sync docs/project-reference/project-structure-reference.md with service architecture, ports, directory tree, tech stack, and module registry.'
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

**Goal:** Scan project codebase → populate `docs/project-reference/project-structure-reference.md` with accurate service architecture, API ports, directory structure, tech stack, and module codes.

**Workflow:**

1. **Classify** — Detect architecture type and scan mode
2. **Scan** — Parallel sub-agents discover services, ports, tech stack
3. **Report** — Write findings incrementally to report file
4. **Generate** — Build/update reference doc from report
5. **Fresh-Eyes** — Round 2 verification validates all paths and ports

**Key Rules:**

- Generic — discover everything dynamically, never hardcode project-specific values
  **MUST ATTENTION** detect architecture type FIRST — scan depth and sub-agent focus depend on it
- ALL port numbers must be read from actual config files — never infer from memory

---

# Scan Project Structure

## Phase 0: Detect Architecture Type & Mode

**[BLOCKING]** Before any other step, run in parallel:

1. Read `docs/project-reference/project-structure-reference.md`
    - Detect mode: Init (placeholder) or Sync (populated)
    - In Sync mode: note which sections have content; check for stale ports/paths

2. Detect architecture type:

| Signal                                                           | Architecture                 | Sub-Agent Focus                                       |
| ---------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------- |
| Multiple `src/Services/` directories, each with own `Dockerfile` | Microservices                | Enumerate ALL services; map each to port + Dockerfile |
| Single `src/` with one `Program.cs` / `Startup.cs`               | Monolith                     | Single service deep-scan; module/feature breakdown    |
| Single git repo, multiple deployable apps                        | Monorepo (non-microservices) | App boundaries; shared library mapping                |
| Nx workspace / multiple `project.json`                           | Nx monorepo                  | Library graph; app/lib/buildable distinction          |
| Multiple repos detected (git submodules)                         | Polyrepo                     | Per-repo breakdown; cross-repo contracts              |

3. Detect orchestration approach:

| Signal                  | Orchestration     | What to Document                                   |
| ----------------------- | ----------------- | -------------------------------------------------- |
| `src/Aspire/` directory | .NET Aspire       | Aspire project name, dashboard URL, resource names |
| `docker-compose*.yml`   | Docker Compose    | Service definitions, port mappings, volume mounts  |
| `k8s/` or `charts/`     | Kubernetes / Helm | Deployment targets, ingress config                 |
| No orchestration files  | Direct run        | Launch commands per service                        |

4. Load module list from `docs/project-config.json` `modules[]` if available — use as expected service catalog.

**Evidence gate:** Confidence <60% on architecture type → report uncertainty, DO NOT proceed with architecture-specific scan assumptions.

## Phase 1: Plan

Create task tracking entries for each sub-agent and each verification step. **Do not start Phase 2 without tasks created.**

## Phase 2: Execute Scan (Parallel Sub-Agents)

Launch **3 general-purpose sub-agents** in parallel. Each MUST:

- Write findings incrementally after each service/file — NEVER batch at end
- Cite `file:line` for every port number and Dockerfile path
- Confidence: >80% document; 60-80% note as "observed (unverified)"; <60% omit

All findings → `plans/reports/scan-project-structure-{YYMMDD}-{HHMM}-report.md`

### Agent 1: Backend Services

**Think (Completeness dimension):** How many services exist? Is there a service in the codebase with no Dockerfile (worker? library? shared?)? Which services expose HTTP APIs vs are background workers?

**Think (Port accuracy dimension):** Where are ports defined — `launchSettings.json`, `appsettings*.json`, `docker-compose.yml`, `Program.cs`? Some services may have port in multiple places that must agree.

**Think (Pattern dimension):** Is there a consistent folder structure per service (e.g., `Service/`, `Domain/`, `Application/`, `Infrastructure/`)? What deviates from the pattern?

- Glob for `**/*.csproj` and `**/Dockerfile` to find all services — reconcile against `project-config.json` modules
- Read `launchSettings.json` and `appsettings*.json` for each service to extract ports
- Grep for `[ApiController]`, `MapControllers`, `app.MapGet` to classify API vs worker vs library
- Find service entry points (`Program.cs`, `Startup.cs`) and identify service type
- Note services that appear in config but have no Dockerfile (or vice versa) — flag as gap

### Agent 2: Frontend Apps

**Think (App inventory dimension):** How many frontend apps exist? Which are active (have dev-start commands) vs legacy vs deprecated?

**Think (Port/config dimension):** Where is the dev server port defined — `angular.json` serve config, `vite.config.ts`, `next.config.js`, proxy config? Read the actual config — do not infer.

**Think (Dependency dimension):** Which apps consume which shared libraries? Is there a design system library? A domain library? What's the dependency graph direction?

- Glob for `**/angular.json`, `**/nx.json`, `**/vite.config.*`, `**/next.config.*` (exclude node_modules)
- Read app `serve` configurations for dev server ports
- Find app entry points (`main.ts`, `index.tsx`, `App.vue`)
- Identify framework versions from `package.json` (exact versions, not ranges)
- Map app-to-library dependencies from Nx project graph or import analysis

### Agent 3: Infrastructure & Tech Stack

**Think (Infrastructure dimension):** What external services must be running for the app to function? Which are optional? What are the default credentials (from docker-compose or defaults)?

**Think (CI/CD dimension):** What pipeline system is used? What are the build/test/deploy stages? What environments exist?

**Think (Version accuracy dimension):** Framework/library versions must come from actual config files — not assumed from project type.

- Read `docker-compose*.yml` — extract infrastructure service definitions, port mappings, credentials
- Find CI/CD configs (`.github/workflows/*.yml`, `azure-pipelines.yml`, `Jenkinsfile`) — extract stages
- Parse primary package managers for key dependencies with versions (`package.json`, `*.csproj`)
- Identify databases per service (MongoDB, SQL Server, PostgreSQL, Redis) from connection strings
- Find message broker config (RabbitMQ, Kafka, Azure Service Bus) from appsettings

## Phase 3: Analyze & Generate

Read full report. Apply fresh-eyes protocol:

**Round 1 (main agent):** Build section drafts from report findings.

**Round 2 (fresh sub-agent, zero memory):**

- Do ALL Dockerfile paths in the service table exist on filesystem? (Glob verify — ALL, not 3)
- Do port numbers match the actual `launchSettings.json` or `docker-compose.yml` entries? (Grep verify)
- Are there any services found by Agent 1 that are missing from the service table?
- Are framework versions from actual config files (not inferred)?

### Target Sections

| Section                   | Content                                                               |
| ------------------------- | --------------------------------------------------------------------- |
| **Architecture Overview** | Architecture type, orchestration approach, deployment model           |
| **Service Architecture**  | Table: Service Name, Type (API/Worker/App), Port, Dockerfile path     |
| **Infrastructure Ports**  | Table: Service (DB/MQ/Cache), Port, Credentials (from docker-compose) |
| **Frontend Apps**         | Table: App name, Framework, Dev port, Build command                   |
| **Tech Stack**            | Table: Category (Backend/Frontend/Infra), Technology, Version         |
| **Module Codes**          | Table: Module code abbreviation, Full name, Service path              |
| **Key Directories**       | Top 2-3 levels of `src/` with one-line purpose per top-level dir      |

## Phase 4: Write & Verify

1. Write updated doc with `<!-- Last scanned: YYYY-MM-DD -->` at top
2. Surgical update only — preserve unchanged sections
3. Verify (Glob): ALL Dockerfile paths in service table exist — not just 3
4. Verify (Grep): Port numbers match actual config files
5. Report: sections updated vs unchanged, services catalogued, gaps found

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
> **Verify AI-generated content against actual code.** AI hallucinates service names, ports, and file paths. Grep/Glob to confirm before documenting.
> **Trace full dependency chain after edits.** Always trace full chain.
> **Surface ambiguity before coding.** NEVER pick silently.
> **NEVER hardcode port numbers without config file evidence.** Read `launchSettings.json` or `docker-compose.yml` — never infer from memory.

<!-- /SYNC:ai-mistake-prevention -->
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** break work into small task tracking tasks BEFORE starting
**IMPORTANT MUST ATTENTION** detect architecture type in Phase 0 — sub-agent focus depends on it
**IMPORTANT MUST ATTENTION** cite `file:line` for every port number and path — NEVER infer from memory
**IMPORTANT MUST ATTENTION** sub-agents write findings incrementally after each service — NEVER batch at end
**IMPORTANT MUST ATTENTION** verify ALL Dockerfile paths — spot-check of 3 is insufficient
**IMPORTANT MUST ATTENTION** Round 2 fresh-eyes is non-negotiable — validates ports and paths

**Anti-Rationalization:**

| Evasion                                               | Rebuttal                                                                            |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------- |
| "Architecture type obvious from directory names"      | Verify from actual project files — names are not evidence                           |
| "Port numbers are standard (5000, 8080, etc.)"        | Read config files — NEVER infer ports from framework conventions                    |
| "Checked 3 Dockerfile paths, that's enough"           | Glob-verify ALL paths — partial verification hides missing services                 |
| "Framework versions obvious from project type"        | Read `package.json`/`.csproj` for exact versions — never assume                     |
| "Round 2 verification not needed for structural scan" | Port numbers and paths are the most hallucination-prone data. Fresh-eyes mandatory. |
| "project-config.json not needed if repo looks clear"  | Config file provides expected service catalog — use it to detect missing services   |

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
