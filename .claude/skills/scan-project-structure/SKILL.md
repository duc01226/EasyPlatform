---
name: scan-project-structure
version: 1.0.0
description: '[Documentation] Scan project and populate/sync docs/project-reference/project-structure-reference.md with service architecture, ports, directory tree, tech stack, and module registry.'
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

> **Scan & Update Reference Doc** — Surgical updates only, never full rewrite.
>
> 1. **Read existing doc** first — understand current structure and manual annotations
> 2. **Detect mode:** Placeholder (only headings, no content) → Init mode. Has content → Sync mode.
> 3. **Scan codebase** for current state (grep/glob for patterns, counts, file paths)
> 4. **Diff** findings vs doc content — identify stale sections only
> 5. **Update ONLY** sections where code diverged from doc. Preserve manual annotations.
> 6. **Update metadata** (date, counts, version) in frontmatter or header
> 7. **NEVER** rewrite entire doc. NEVER remove sections without evidence they're obsolete.

<!-- /SYNC:scan-and-update-reference-doc -->

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

**Goal:** Scan the project codebase and populate `docs/project-reference/project-structure-reference.md` with accurate service architecture, API ports, directory tree, tech stack, and module codes.

**Workflow:**

1. **Read** — Load current target doc, detect init vs sync mode
2. **Scan** — Discover services, apps, ports, tech stack via parallel sub-agents
3. **Report** — Write findings to external report file
4. **Generate** — Build/update the reference doc from report
5. **Verify** — Spot-check paths and ports

**Key Rules:**

- Generic — discover everything dynamically, never hardcode project-specific values
- Use `docs/project-config.json` for hints if available, fall back to filesystem scanning
- All examples must reference real files found in this project

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Scan Project Structure

## Phase 0: Read & Assess

1. Read `docs/project-reference/project-structure-reference.md`
2. Detect mode: **init** (placeholder only) or **sync** (has real content)
3. If sync: note which sections exist and their line counts

## Phase 1: Plan Scan Strategy

Check if `docs/project-config.json` exists for module lists and service maps. Plan these scan areas:

- **Backend services** — Find `.csproj`, `Dockerfile`, `Program.cs`, `launchSettings.json` for ports
- **Frontend apps** — Find `angular.json`, `nx.json`, `package.json`, `vite.config`, `next.config`
- **Infrastructure** — Find `docker-compose.yml`, `Dockerfile`, K8s manifests, CI/CD config
- **Tech stack** — Parse `package.json` dependencies, `.csproj` PackageReferences, build tool configs

## Phase 2: Execute Scan (Parallel Sub-Agents)

Launch **3 Explore agents** in parallel:

### Agent 1: Backend Services

- Glob for `**/*.csproj` and `**/Dockerfile` to find services
- Grep `launchSettings.json` or `appsettings*.json` for port numbers
- Grep for `[ApiController]` or `MapControllers` to find API services
- List service directories with their ports

### Agent 2: Frontend Apps

- Glob for `**/angular.json`, `**/nx.json`, `**/package.json` (not in node_modules)
- Find app entry points (`main.ts`, `index.tsx`, `App.vue`)
- Extract dev server ports from configs (`serve` commands, proxy configs)
- Identify framework versions from package.json

### Agent 3: Infrastructure & Tech Stack

- Find `docker-compose*.yml` — extract service definitions and port mappings
- Find CI/CD configs (`.github/workflows/*.yml`, `azure-pipelines.yml`, `Jenkinsfile`)
- Parse primary package managers (`package.json`, `*.csproj`) for key dependencies
- Identify databases, message brokers, caching from connection strings or Docker services

Write all findings to: `plans/reports/scan-project-structure-{YYMMDD}-{HHMM}-report.md`

## Phase 3: Analyze & Generate

Read the report file. Build these sections:

### Target Sections

| Section                    | Content                                                                |
| -------------------------- | ---------------------------------------------------------------------- |
| **Service Architecture**   | Table: Service Name, Type (API/Worker/App), Port, Dockerfile path      |
| **Infrastructure Ports**   | Table: Service (DB/MQ/Cache), Port, Credentials (if in docker-compose) |
| **API Service Ports**      | Table: API service name, Port, Dockerfile path                         |
| **Project Directory Tree** | Top 2-3 levels of `src/` directory structure                           |
| **Tech Stack**             | Table: Category (Backend/Frontend/Infra), Technology, Version          |
| **Module Codes**           | Table: Module code abbreviation, Full name, Service path               |

### Content Rules

- Use tables for structured data (not prose)
- Include actual port numbers found in configs
- Directory tree: show only meaningful structure (skip node_modules, bin, obj)
- Tech stack: include version numbers from package.json/csproj

## Phase 4: Write & Verify

1. Write updated doc with `<!-- Last scanned: YYYY-MM-DD -->` at top
2. Verify: spot-check 3 service paths exist on filesystem
3. Verify: port numbers match actual config files
4. Report: sections updated vs unchanged

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
  <!-- SYNC:output-quality-principles:reminder -->
- **IMPORTANT MUST ATTENTION** follow output quality rules: no counts/trees/TOCs, rules > descriptions, 1 example per pattern, primacy-recency anchoring.
      <!-- /SYNC:output-quality-principles:reminder -->
      <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
      <!-- /SYNC:critical-thinking-mindset:reminder -->
      <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
      <!-- /SYNC:ai-mistake-prevention:reminder -->
