---
name: ai-context-refresh
description: '[Documentation] Use when generating, smart-merging or refactoring the root AI context (CLAUDE.md, AGENTS.md) and its Claude/Codex projections. Config file only: project-config.'
---

> Codex compatibility note:
> - Invoke `$skill-name`: load the registered `.agents/skills/<name>/SKILL.md` and execute it with Codex tools; no separate `Skill` tool or Claude mode switch is needed. Author `.claude/**`; mirrors are generated.
> - Track steps before execution and keep progress/evidence current. Explicit skill requests execute their protocol. Use the native question tool for required questions.
> - Map foreign tool names to available host capabilities. A name mismatch needs no approval; an actually unavailable required capability stops with its step/evidence and a user question before adaptation.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Preserve protocol order unless the user approves a deviation. Workflows use `$start-workflow`: gates stay fixed; other steps may flex with logged reasons and evidence.
## Quick Summary

**Goal:** Refresh the portable project AI-context lifecycle — generate or update the Claude root context from project-config.json + template, preserve project instructions through smart merge/refactor, and refresh Codex projections.

**Summary:**

- Preflight config and detect `init`, `update`, markerless `smart-merge`, or AI-only `refactor` mode.
- Generate/update root context from config + template while preserving unmanaged project instructions.
- AI-fill and verify markers, placeholders, portability, and project-specific content.
- After final root edits, run the standalone sync runner with `--skip=claude-md`; verify every Codex mirror and report failures.

**Workflow:**

1. **Detect Mode** — init (no root context or `--mode init`), update (`--mode update`), refactor (`--mode refactor`)
2. **Run Generator** — `node .claude/skills/ai-context-refresh/scripts/generate-claude-md.cjs --mode <mode>`
3. **AI Fill** — Review output, fill creative sections (project description, golden rules inference)
5. **Sync Codex Mirrors** — After the final AI edits and verification, run the shared standalone runner with `--skip=claude-md` so `AGENTS.md`, `.agents/`, and `.codex/` are regenerated from the finished `CLAUDE.md`.

**Key Rules:**

- Generic — works in any project by reading `docs/project-config.json`
- Section markers (`<!-- SECTION:key -->`) enable incremental updates without overwriting user content
- Conditional sections — generated ONLY when config has matching data; empty config = section omitted
- The root holds project information only: the framework rules every agent follows reach the session through the universal hook, never through this file
- `$sync-codex` owns Codex mirror generation; this skill owns the root AI-context lifecycle and calls the same runner only after its explicit init/update/refactor work is complete

## Contents

- [Quick Summary](#quick-summary)
- [Bootstrap Gate (when CLAUDE.md is missing)](#bootstrap-gate-when-claudemd-is-missing)
- [Coordination with sync-codex](#coordination-with-sync-codex)
- [Modes](#modes)
- [Prerequisites](#prerequisites)
- [Phase 1: Detect Mode](#phase-1-detect-mode)
- [Phase 2: Run Generator Script](#phase-2-run-generator-script)
- [Phase 3: AI Fill (Post-Script)](#phase-3-ai-fill-post-script)
- [Phase 4: Verify](#phase-4-verify)
- [Phase 5: Sync Codex mirrors (after the final CLAUDE.md edit)](#phase-5-sync-codex-mirrors-after-the-final-claudemd-edit)
- [Refactor Mode (AI-Only)](#refactor-mode-ai-only)
- [Section Marker Protocol](#section-marker-protocol)
- [Section Keys (Quick Reference)](#section-keys-quick-reference)
- [Running Tests](#running-tests)
- [Closing Reminders](#closing-reminders)

## Bootstrap Gate (when CLAUDE.md is missing)

This skill is the **AI-runnable** route the agent-files bootstrap gate offers when a portable
`.claude` install lands in a project without a root `CLAUDE.md`. A single hook detects the gap
and routes here (shared detection lib: `.claude/hooks/lib/agent-files-state.cjs`):

- `init-prompt-gate.cjs` (UserPromptSubmit) — blocks the first prompt once `project-config.json`
  is populated but `CLAUDE.md` / `AGENTS.md` is missing. This UserPromptSubmit gate is the sole
  agent-files bootstrap router.

**Two-state detection** per root file: `missing` → routes to `--mode init` (fresh from template);
present → no block. A root file with no `SECTION:*` markers is project-owned: nothing is generated
into it, and `$ai-context-refresh --mode update` runs an AI smart-merge that adds generated sections around the project's own text.

Run `$ai-context-refresh` (or the generator directly) to produce `CLAUDE.md` from
`docs/project-config.json` + template. The generated file holds **project information only**: the
tl;dr line, Doc Lookup, path-scoped rules, development commands and the skill-activation table. It
carries none of the framework's universal rules (workflow step advancement, task planning, evidence,
code hierarchy, lesson extraction, closing reminders) and no workflow-route pointer:
the universal hook delivers those protocols on the first prompt of a session and again after 150K
tokens of growth or a compaction. A host that runs no hook is unsupported.

**Workflow routing is delivered only by hooks** — `workflow-route-inject` for the gate and `workflow-catalog-inject` for the catalog (Claude, the mirrored Codex hooks, the OpenCode bridge) —
never written into tracked files. The hooks inject the route for each person's mode —
`ask` (default: the workflow question is asked only when the route is to start a catalog workflow; direct and custom-simple routes ask nothing), `auto` (the same question, recommending the full workflow first)
or `off` (only a short state notice; nothing starts without an explicit request). A team sets the default in tracked `docs/project-config.json`:

```jsonc
{ "portability": { "workflowRouteMode": "ask" } }   // or "auto" | "off"; legacy { "workflowAutoDetect": false } reads as "off"
```

A person overrides it without touching shared files: `~/.claude/.ck.json` (every project), `.claude/.ck.local.json` (this checkout; the
portable bundle's `.claude/.gitignore` excludes it) or env `CK_WORKFLOW_ROUTE_MODE`. Precedence, later wins: default `ask` → tracked team
value → `~/.claude/.ck.json` → `.claude/.ck.local.json` → env. Missing, malformed and invalid layers fall through. The hook emits only on
`UserPromptSubmit`, never blocks a prompt, and records delivery per session and content hash (a mode change re-delivers). It re-injects
after compaction, a content change, or about 4.5 MB of transcript growth (the existing framework proxy for roughly 200k tokens); hosts
without a measurable transcript use a bounded age fallback. Explicitly named skills and workflows remain available in every mode.

The optional **custom route protocol** (`portability.workflowRouteProtocol`, team or developer-local)
is RUNTIME-ONLY: `workflow-route-inject.cjs` appends it at `UserPromptSubmit`, and it must NEVER be
stamped into tracked `CLAUDE.md`/`AGENTS.md`. A valid local value replaces the team
value. This skill ignores it entirely when generating tracked files.

**Legacy roots** — a root generated by an earlier version may still carry universal sections, managed
blocks (`CK:CRITICAL-THINKING`, `CK:AI-MISTAKE-PREVENTION`, `CK:WORKFLOW-ROUTE-POINTER`) or the
`CK:UNIVERSAL-GUIDES` sentinel. `--mode update` reports them as `LEGACY_UNIVERSAL_CONTENT`; run
`--mode update --strip-legacy-universal` (a backup is written first) to remove them while keeping
every `SECTION:*` block and all project-owned text. `AGENTS.md` and the other Codex surfaces are generated by the shared runner owned by
`$sync-codex`; this skill invokes that runner directly after its final source edit, rather than recursively invoking
the skill. A full `$sync-codex` invocation performs its own CLAUDE.md preflight before mirror generation.

**Just-in-time path rules** — when inlined `contextGroups[].rules` push the root past its byte budget, set
`portability.inlinePathRules: false` in `docs/project-config.json` (default `true`). `SECTION:golden-rules` then
names each rule-bearing group and points to the file-conventions hook, which injects the full rules when a
matching file is touched, and its `--lookup` CLI — the non-automatic carrier for shell reads
(the spec's BR-PFCI-13 exception). Compact form requires BOTH `conventionInjection.enabled: true` AND an available
conventions lib (`.claude/hooks/lib/file-conventions.cjs`), with every rule-bearing group deliverable (named,
unique) and ranked within the per-path class cap (`conventionInjection.maxClassesPerEdit`), and a worst-case digest (longest accepted path, the largest rule sets the cap admits) within `conventionInjection.maxChars`; otherwise the rules stay inline and the generator prints `[WARN] INLINE_PATH_RULES` naming the missing
precondition. Never hand-compact that section instead — `--mode update` regenerates it.

With `conventionInjection.completeLookup: true`, a library advertising complete lookup support can
replace the legacy rank/size proof. The mandatory pre-action CLI returns every matching read/edit class
in pages (including overflow); read all pages with `--page N` before file or shell access. Named/unique
groups and enabled delivery remain required; older libraries retain inline fallback. Automatic hook
digests stay bounded. This mode also replaces the generated path pre-read table with the lookup pointer.

## Coordination with sync-codex

`ai-context-refresh` and `sync-codex` remain separate user-facing skills with one executable pipeline:

- `ai-context-refresh` owns root-context authoring and the AI smart-merge/refactor decision. After init/update/refactor and the
  final AI fill, it runs `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --skip=claude-md`.
- `sync-codex` owns generated outputs and verification. Its full run starts with a `claude-md` preflight: missing
  `CLAUDE.md` is initialized and marker-managed content is updated.
- A markerless root is project-owned and is never overwritten by preflight. Run
  `$ai-context-refresh --mode update` to smart-merge generated sections around the project instructions, then rerun sync.
- The handoff uses the runner directly, not a nested `$sync-codex` skill call, so there is no recursion or duplicate
  source generation. If the runner fails, report the failing stage and do not claim that Codex mirrors are current.

## Modes

| Mode       | When                                     | Behavior                                                                                                                |
| ---------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `init`     | No CLAUDE.md exists, or first-time setup | Generate fresh CLAUDE.md from template + config. Populates all markers.                                                 |
| `update`   | CLAUDE.md exists with markers            | Replace only content between markers. Preserve everything else.                                                         |
| `refactor` | CLAUDE.md exists, needs optimization     | AI reads entire CLAUDE.md, optimizes for token efficiency, removes redundancy, improves structure. No script — pure AI. |

## Prerequisites

- `docs/project-config.json` — primary data source (run `$project-config` first if missing)
- Node.js available (for generator script)

## Phase 1: Detect Mode

```bash
# Check CLAUDE.md state
node .claude/skills/ai-context-refresh/scripts/generate-claude-md.cjs --detect
```

**Decision logic:**

- No CLAUDE.md → `init`
- CLAUDE.md with markers → `update`
- CLAUDE.md without markers → `smart-merge` (see below)
- User explicit `--mode` flag → override detection

## Phase 2: Run Generator Script

```bash
# Init mode: generate fresh CLAUDE.md
node .claude/skills/ai-context-refresh/scripts/generate-claude-md.cjs --mode init

# Update mode: sync marked sections only
node .claude/skills/ai-context-refresh/scripts/generate-claude-md.cjs --mode update

# Update mode that also removes the universal sections and managed blocks an earlier version wrote
node .claude/skills/ai-context-refresh/scripts/generate-claude-md.cjs --mode update --strip-legacy-universal
```

**Script behavior:**

1. Reads `docs/project-config.json`
2. Reads template (`references/claude-md-template.md`) for init, or existing CLAUDE.md for update
3. Calls section builders to generate content for each marker key
4. Writes output to `CLAUDE.md` (creates backup `.claude-md.backup` first)
5. Outputs report: which sections were generated, which skipped (no data), which preserved

### Smart-Merge (Update on CLAUDE.md Without Markers)

When running update on an existing CLAUDE.md that has NO section markers:

1. Read existing CLAUDE.md
2. Match sections by `##` heading text against known section keys (see `references/section-registry.md`)
3. For each matched section: wrap with markers, replace content with generated content
4. For unmatched user sections: preserve as-is (no markers added)
5. Write output with backup

## Phase 3: AI Fill (Post-Script)

After the script generates the mechanical parts, AI reviews and fills:

1. **Project description** in TL;DR — write a concise 2-3 sentence description based on config + codebase
2. **Golden rules** — preserve each contextGroups group's name, matchers, exclusions, and rule scope; never promote a path-scoped rule to a global reminder.
3. **Decision quick-ref** — use explicit pattern declarations and project references; never infer architecture from database, broker, framework, or resource presence alone.
4. **Naming conventions** — detect from codebase patterns if not in config

## Phase 4: Verify

- [ ] Apply the **Instruction-file audit** in `.claude/skills/shared/protocols/context-engineering-principles.md` before the final root edit is accepted and mirrors are synced; fix generated-section findings at their source.
- [ ] CLAUDE.md is valid markdown
- [ ] All section markers are properly paired (open + close)
- [ ] No template placeholder text remains (e.g., `{project-name}`, `TODO`)
- [ ] No `.claude/skills/ai-context-refresh/` implementation paths leak into generated project context (self-reference)
- [ ] Conditional sections with no data are omitted (not empty stubs)
- [ ] A discovery defect inside a `SECTION:*` block is fixed in its builder, the template or `docs/project-config.json`, then regenerated — never hand-edited; hand-owned prose that changed ran `$prompt-enhance`

## Phase 5: Sync Codex mirrors (after the final CLAUDE.md edit)

Writing/updating CLAUDE.md makes the generated mirror surfaces stale — `AGENTS.md` (Codex), the
`.codex/` mirrors, and other downstream surfaces are derived FROM CLAUDE.md. They must be regenerated
only after the final AI fill/refactor and verification, otherwise the mirrors can capture an intermediate
source state.

**MUST add a final todo task — "Sync Codex mirrors from updated CLAUDE.md" — after
init/update/refactor and verification complete.** When CLAUDE.md content changed, execute the shared
standalone runner directly:

```text
Todo tracking: "Sync Codex mirrors from updated CLAUDE.md → invoke $sync-codex"
node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --skip=claude-md
```

`--skip=claude-md` is intentional: this skill has just completed the root-source lifecycle, so the
runner must start at mirror generation and still execute every configured verification stage. The
direct node call is the authorized completion handoff of an explicit `$ai-context-refresh` request; it is
not an autonomous invocation of the user-facing `$sync-codex` skill. Skip the task only when no
CLAUDE.md content actually changed. If the runner fails, keep this task incomplete and report the
failing stage and exact recovery command.

## Refactor Mode (AI-Only)

When `--mode refactor` or user asks to optimize CLAUDE.md:

1. Read entire CLAUDE.md
2. Identify: redundant sections, verbose explanations, duplicate info available in referenced docs
3. Apply token efficiency: remove duplication, consolidate tables, shorten where possible
4. Preserve all section markers
5. Report: lines before/after, sections changed, estimated token savings

## Section Marker Protocol

```markdown
<!-- SECTION:tldr -->

Auto-generated content here...

<!-- /SECTION:tldr -->
```

**Rules:**

- Only content between markers is replaced on update
- Content outside markers is never touched
- Hand-owned project notes: `$learn` writes short, broad, project-specific rules and context into the `## Project Rules & Context` section, outside every marker fence — it survives `update`, and the Codex projection carries that heading into `AGENTS.md`. Keep that section intact in `refactor` and smart-merge (condense its entries, never delete them); a project note inside a fence is overwritten by the next update
- Missing markers in update mode → section skipped (not inserted)
- Init mode uses template which includes all markers
- Markers use lowercase kebab-case keys matching section-registry.md

## Section Keys (Quick Reference)

See `references/section-registry.md` for full mapping. Summary:

| Key                   | Source                                  | Conditional?              |
| --------------------- | --------------------------------------- | ------------------------- |
| `tldr`                | `project.*`, `modules[]`, `framework.*` | No — always generated     |
| `golden-rules` | `contextGroups[]` project path/document map only | Yes — skip if no project docs |
| `decision-quick-ref`  | `modules[]`, `framework.*`              | Yes — skip if no modules  |
| `key-locations`       | `modules[].pathRegex`                   | Yes — skip if no modules  |
| `dev-commands`        | `testing.commands`, `infrastructure.*`  | Yes — skip if no commands |
| `infra-ports`         | `modules[].meta.port` (infra)           | Yes — skip if no ports    |
| `api-ports`           | `modules[].meta.port` (services)        | Yes — skip if no ports    |
| `integration-testing` | `framework.integrationTestDoc`          | Yes — skip if no doc; doc declared N/A in `referenceDocs` → one-line skip notice |
| `e2e-testing`         | `framework.e2eTestDoc` / `e2eTesting.guideDoc`, `testing.frameworks[]`, `e2eTesting.framework`, or `e2eTesting.execution` | Yes — skip only when no guide doc AND no E2E evidence/profile; guide declared N/A with no evidence → one-line skip notice |
| `doc-index`           | Scan `docs/` directory                  | Yes — skip if no docs/    |
| `doc-lookup`          | `modules[]`, spec rows, `referenceDocs[]` (N/A via `notApplicable: true` or an N/A purpose → named once as a skip), docs index, `lessons.md`, ADRs — project docs that exist; excludes framework navigation | No — always generated; heading `## Doc Lookup — What to Read When`, back-filled onto older roots on `--mode update`, projected first into `AGENTS.md` |

## Running Tests

Generator + bootstrap-gate coverage lives in the hooks test suite:

```bash
node .claude/hooks/tests/run-all-tests.cjs --filter=agent-files
```

---

> **[IMPORTANT]** Use todo tracking to break ALL work into small tasks BEFORE starting. This prevents context loss from long files. Keep task depth proportional to the work.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `context-engineering-principles` — Prompt clarity and semantic retention principles; writing or enhancing prompts, skills or agents → .claude/skills/shared/protocols/context-engineering-principles.md
- `output-quality-principles` — Readable guidance and verified contents for long skill/doc files; writing, updating or auditing a skill or reference document, or another Markdown artifact over 200 lines → .claude/skills/shared/protocols/output-quality-principles.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:output-quality-principles:reminder -->

**IMPORTANT MUST ATTENTION** lead with useful guidance and readable priorities; preserve action-changing conditions/numbers and required structures. When writing, updating or auditing Markdown skill/doc content, verify top, heading-linked contents over 200 lines (stricter owner thresholds remain); refresh after edits and report gaps in read-only audits. Remove report bulk; judge semantic value rather than word counts.

<!-- /SYNC:output-quality-principles:reminder -->


## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Refresh the portable project AI-context lifecycle — generate or update the Claude root context from project-config.json + template, preserve project instructions through smart merge/refactor, and refresh Codex projections.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):** MUST ATTENTION honor every protocol below.

- **Output Quality:** keep useful guidance and navigation; omit derivable inventories or trees unless their owner needs them. Preserve required linked contents for long Markdown files.

**IMPORTANT MUST ATTENTION** break work into small todo tasks using todo tracking BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

| Evasion | Rebuttal |
| --- | --- |
| "It is only a rename" | Trace canonical sources, generated mirrors, catalogs, routes, and tests. |
| "The mirrors are already current" | Run the sync and divergence gates; stale derived output is not completion. |
| "Hand-fix the Codex copy" | Edit `.claude/**` sources, then regenerate `.agents/`, `.codex/`, and `AGENTS.md`. |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using todo tracking.
