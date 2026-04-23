---
name: scan-project-structure
version: 2.0.0
last_reviewed: 2026-04-22
description: '[Documentation] Scan project and populate/sync docs/project-reference/project-structure-reference.md with service architecture, ports, directory tree, tech stack, and module registry.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks per file read. Prevents context loss from long files. Simple tasks: ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources, admit uncertainty, self-check output, cross-reference independently. Certainty without evidence = root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid:
>
> - **Verify AI-generated content against actual code.** AI hallucinates service names, ports, and file paths. Grep/Glob to confirm before documenting.
> - **Trace full dependency chain after edits.** Always trace full chain.
> - **Surface ambiguity before coding.** NEVER pick silently.
> - **NEVER hardcode port numbers without config file evidence.** Read `launchSettings.json` or `docker-compose.yml` — never infer from memory.

<!-- /SYNC:ai-mistake-prevention -->

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
- **MUST ATTENTION** detect architecture type FIRST — scan depth and sub-agent focus depend on it
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

Create `TaskCreate` entries for each sub-agent and each verification step. **Do not start Phase 2 without tasks created.**

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

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small `TaskCreate` tasks BEFORE starting
- **IMPORTANT MUST ATTENTION** detect architecture type in Phase 0 — sub-agent focus depends on it
- **IMPORTANT MUST ATTENTION** cite `file:line` for every port number and path — NEVER infer from memory
- **IMPORTANT MUST ATTENTION** sub-agents write findings incrementally after each service — NEVER batch at end
- **IMPORTANT MUST ATTENTION** verify ALL Dockerfile paths — spot-check of 3 is insufficient
- **IMPORTANT MUST ATTENTION** Round 2 fresh-eyes is non-negotiable — validates ports and paths
      <!-- SYNC:scan-and-update-reference-doc:reminder -->
- **IMPORTANT MUST ATTENTION** read existing doc first, scan codebase, diff, surgical update only. Never rewrite entire doc.
      <!-- /SYNC:scan-and-update-reference-doc:reminder -->
      <!-- SYNC:output-quality-principles:reminder -->
- **IMPORTANT MUST ATTENTION** output quality: no counts/trees/TOCs, 1 example per pattern, lead with answer.
      <!-- /SYNC:output-quality-principles:reminder -->
      <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** critical thinking — every claim needs traced proof, confidence >80% to act. Never present guess as fact.
      <!-- /SYNC:critical-thinking-mindset:reminder -->
      <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** AI mistake prevention — holistic-first, fix at responsible layer, surface ambiguity before coding, re-read after compaction.
      <!-- /SYNC:ai-mistake-prevention:reminder -->

**Anti-Rationalization:**

| Evasion                                               | Rebuttal                                                                            |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------- |
| "Architecture type obvious from directory names"      | Verify from actual project files — names are not evidence                           |
| "Port numbers are standard (5000, 8080, etc.)"        | Read config files — NEVER infer ports from framework conventions                    |
| "Checked 3 Dockerfile paths, that's enough"           | Glob-verify ALL paths — partial verification hides missing services                 |
| "Framework versions obvious from project type"        | Read `package.json`/`.csproj` for exact versions — never assume                     |
| "Round 2 verification not needed for structural scan" | Port numbers and paths are the most hallucination-prone data. Fresh-eyes mandatory. |
| "project-config.json not needed if repo looks clear"  | Config file provides expected service catalog — use it to detect missing services   |

**[TASK-PLANNING]** Before acting, analyze task scope and break into small todo tasks and sub-tasks using TaskCreate.
