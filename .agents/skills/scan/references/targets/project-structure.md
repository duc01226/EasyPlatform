# Scan Target: project-structure

> One entry of the scan target registry — index, selection rules, path roots and the custom-doc contract are in `../targets.md` (read it first). The `$scan --target=project-structure` host (`../../SKILL.md`) loads this file for that run only.

- **doc:** `<ref>/project-structure-reference.md`
- **applies when:** project-owned source, build/runtime configuration, operational manifests, or maintained architecture docs provide evidence about the system's structure or operation.
- **skip when:** the repository contains only required project identity/config and no source, operational manifests, or project-owned architecture evidence.
- **description:** `[Documentation] Use when mapping evidenced project structure, stack, modules, operations, and deployment.`
- **sub-agents:** up to 3 conditional branches — Agent 1: Source, modules & entry points · Agent 2: Application surfaces & integrations · Agent 3: Runtime, delivery & operations. Dispatch only branches supported by repository evidence.

### Phase 0 detection — complete before writing; unsupported classifications remain `UNKNOWN`

Step 1 — Read the target doc, configured project map, and repository-owned manifests. Detect Init (missing/placeholder) or Sync (populated); in Sync mode update only stale or newly evidenced sections.

Step 2 — Build an evidence inventory. Configured paths and module names are search hints; verify them against files, entry points, imports, build/run scripts, or authoritative project docs before documenting them.

| Evidence | Possible finding | Rule |
| --- | --- | --- |
| Language/build manifests, workspace files, source entry points | Languages, buildable/runnable units, modules, and their verified dependencies | Use the manifest and code structure that actually exist; unfamiliar stacks are not a reason to stop. |
| Application entry points, package boundaries, imports, API/CLI/job handlers | Application surfaces and module boundaries | Name an architecture style only when independent deploy/ownership evidence supports it; directory names alone are insufficient. |
| Database/schema/migration, message, or external-adapter definitions and their callers | Data stores and integrations | Document only verified connections and ownership; a declared dependency alone does not prove runtime use. |
| Container, local orchestration, service-manager, or deployment manifests | Runtime/deployment units, startup, and configured ports | Do not infer direct-run behavior, service boundaries, or default ports from missing files. |
| CI/workflow/pipeline and infrastructure-as-code files | Build, verification, deployment, and environment flow | Inspect the actual jobs and referenced scripts; supported providers and file layouts are open-ended. |
| Environment/configuration files or secret-manager references | Setting keys and secret-reference mechanisms | Record names and locations only; never include values. |

Step 3 — Describe architecture and execution boundaries only to the confidence supported by that inventory. `Monorepo`, `monolith`, `modular monolith`, and `microservices` are possible descriptions, not required categories. Use `UNKNOWN` when repository evidence cannot settle the boundary; continue with confirmed facts.

Step 4 — Detect runtime orchestration from actual manifests and commands, when present. Examples include container compose files, cluster manifests, process supervisors, serverless deployment configs, and local service scripts; this list is not exhaustive. No orchestration file is not evidence that the application runs directly.

Step 5 — Detect delivery and deployment configuration from repository evidence. Common CI and infrastructure filenames are search examples, not an allowlist; inspect discovered files and their referenced definitions. If no pipeline or IaC is found, report that limited observation without inventing a provider or delivery process.

Step 6 — Read optional project-config sections only when valid and present (for example, module roots or runtime/deployment hints). Corroborate each material hint with repository evidence; omitted sections are normal and do not block a scan.

**Evidence gate:** An architecture, runtime, or delivery label must be backed by source/configuration or authoritative project documentation. Record uncertainty and continue with verified sections; do not let an unknown label suppress unrelated evidence.

### Sub-agent Think scopes

**Agent 1: Source, modules & entry points** (run when source/build structure exists)
- **Think:** Which source roots, packages, executables, libraries, jobs, and entry points are real? How do imports, build definitions, and callers establish ownership or dependencies?
- Scan targets: configured source/module roots after verifying them; workspace/build manifests; entry points and their callers; actual package boundaries and shared dependencies. Use examples only as search cues, adapt to the languages and build tools found, and cite `file:line` or manifest location.

**Agent 2: Application surfaces & integrations** (run when application or integration surfaces exist)
- **Think:** Which user/application surfaces and external boundaries are supported by source evidence? Which behavior is hosted in a web, mobile, desktop, API, command-line, worker, or other surface, if any?
- Scan targets: evidenced app entry points, routes/handlers, clients, adapters, event/message contracts, and integration call sites. Do not infer a frontend/backend split, microservice, or runtime integration from a dependency alone.

**Agent 3: Runtime, delivery & operations** (run when runtime/deployment/configuration evidence exists)
- **Think:** What starts the system, what dependencies must be available, and how are builds or deployments promoted? Which commands, ports, environment keys, and secret references are actually defined?
- Scan targets: repository-owned runtime/deploy manifests, local scripts, CI workflows and referenced scripts, IaC, application settings, and project-defined readiness/rollback behavior. Record only source-backed facts, including secret-reference names and mechanisms, never secret values.

### Target Sections

Include only sections supported by evidence; omit inapplicable sections rather than leaving framework-shaped placeholders.

| Section | Include when evidence supports it |
| --- | --- |
| **Repository scope & architecture** | Verified repository/workspace boundary, runnable or buildable units, and module ownership. State an architecture label only when its meaning is supported. |
| **Applications & entry points** | Actual user-facing surfaces, APIs, CLIs, jobs, libraries, or other executable entry points. |
| **Runtime & integrations** | Configured runtime units, data stores, external systems, ports, and their verified relationships. Omit ports that are not explicitly configured. |
| **Build, delivery & operations** | Commands, CI stages, IaC, environments, promotion, or rollback only when repository/project docs define them. |
| **Environment & secret configuration** | Setting keys, source locations, and secret-reference mechanisms only; never values. |
| **Languages & toolchain** | Technologies and versions from actual manifests; preserve ranges as ranges and never infer a pinned version. |
| **Source organization** | Short purpose notes for relevant verified roots when useful; no full directory tree or unsupported layer taxonomy. |

### Content Rules / exceptions
Follow shared `output-quality-principles` (no full trees/counts/TOCs). Cite every command, boundary, runtime setting, version, and architecture claim to the source that establishes it. Do not claim missing, deprecated, active, or production status from path names alone. If source evidence is incomplete, state the verified scope and what remains unknown.

### Special slivers
- Only scan/dispatch branches whose evidence gate passes; `UNKNOWN` is a valid result for unresolved architecture, runtime, or delivery details and does not block other verified findings.
- If documenting ports, read them from the owning configuration and verify every cited value; never use framework defaults from memory.
- Resolve configured roots and module lists only through the valid project config. Corroborate hints with source; omitted optional sections do not imply absence of a capability.
- **Secret safety is mandatory:** record secret-reference names, file locations, and mechanisms only. Never copy secret values, tokens, credential-bearing connection strings, or private keys into reports or docs. Before write, inspect the generated text for accidental secret-shaped values, including assignment and JSON/YAML forms, common token prefixes, PEM headers, and long encoded blobs. Redact any finding; do not repeat the value.
- Verify every cited path, command, version, runtime boundary, and setting against the evidence before writing. Actual versions come from manifests; if only a range is declared, document the range.

### Anti-Rationalization rows

| Evasion | Rebuttal |
| --- | --- |
| "Directory names prove the architecture" | Trace manifests, entry points, imports, and ownership; label uncertainty when they do not settle it. |
| "A standard port or command is implied by the framework" | Read the owning config or script and cite the exact source; omit unsupported defaults. |
| "This project must have a frontend, backend, or service table" | Include only evidenced application surfaces and runtime units; the target is stack-neutral. |
| "No familiar CI filename means no delivery workflow" | Search repository-owned pipeline/build definitions and their references; do not treat examples as an allowlist. |
| "The project config is optional because the repository looks clear" | Absent config is supported; present config requires valid identity and consumed sections. Derive missing facts from repository evidence. |
| "Copy environment values for completeness" | Record setting keys and secret-reference names/mechanisms only; never publish values. |

### prompt-enhance
`$prompt-enhance <ref>/project-structure-reference.md`
