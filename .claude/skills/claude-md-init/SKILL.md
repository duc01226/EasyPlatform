---
name: claude-md-init
version: 1.0.0
description: '[Documentation] Use when you need initialize, update, or refactor CLAUDE markdown from project-config JSON and codebase scan results.'
---

## Quick Summary

**Goal:** Automate CLAUDE.md lifecycle — generate from project-config.json + template, incrementally update marked sections, or refactor for token efficiency.

**Workflow:**

1. **Detect Mode** — init (no CLAUDE.md or `--mode init`), update (`--mode update`), refactor (`--mode refactor`)
2. **Run Generator** — `node .claude/skills/claude-md-init/scripts/generate-claude-md.cjs --mode <mode>`
3. **AI Fill** — Review output, fill creative sections (project description, golden rules inference)
4. **Verify** — Confirm output is valid, no project-specific leaks from template

**Key Rules:**

- Generic — works in any project by reading `docs/project-config.json`
- Section markers (`<!-- SECTION:key -->`) enable incremental updates without overwriting user content
- Conditional sections — generated ONLY when config has matching data; empty config = section omitted
- Static framework sections (8 total) are portable across all projects

## Bootstrap Gate (when CLAUDE.md is missing or incomplete)

This skill is the **AI-runnable** route the agent-files bootstrap gate offers when a portable
`.claude` install lands in a project without a root `CLAUDE.md` — or with one that carries only
project-specific knowledge and is missing the universal portable guides. Two hooks detect the gap
and route here (shared detection lib: `.claude/hooks/lib/agent-files-state.cjs`):

- `init-prompt-gate.cjs` (UserPromptSubmit) — blocks the first prompt once `project-config.json`
  is populated but `CLAUDE.md` / `AGENTS.md` is missing **or incomplete**.
- `agent-files-skill-gate.cjs` (PreToolUse: Skill) — blocks non-meta skills under the same condition.

**Three-state detection** per root file: `missing` → routes to `--mode init` (fresh from template);
`incomplete` → routes to `--mode update` (smart-merge — preserves your project content, injects the
guides); `ok` → no block. Completeness is decided by `hasUniversalGuides()`: a current-or-newer
sentinel (`<!-- CK:UNIVERSAL-GUIDES v1 -->`) → complete; an older sentinel → flag for update; no
sentinel → fall back to scanning required anchors (First Action Decision, Workflow Step Advancement,
Task Planning Rules, Code Responsibility Hierarchy, Evidence-Based Reasoning) so legacy/hand-written
complete files still pass.

Run `/claude-md-init` (or the generator directly) to produce `CLAUDE.md` from
`docs/project-config.json` + template. The generated file ships the universal session-start guides
(workflow ask-confirm gate, workflow step-advancement + parallel-phase barrier, task-planning rules,
code hierarchy, naming, evidence/confidence rules) and stamps the sentinel at the top so the gate
recognizes it as complete. It also stamps the hook-independent **Workflow-First Gate** (from
`.claude/skills/shared/workflow-first-gate.md`, via `stampHeader()`) immediately after the sentinel —
the primacy-anchor routing rule (bug→`workflow-bugfix` workflow, feature/enhancement→`workflow-feature` workflow) that
mirrors into `AGENTS.md` and survives with no hooks.

**Opt-out** — to keep a project-only `CLAUDE.md`/`AGENTS.md` (your custom knowledge, none of the
universal guides), set `portability.requireUniversalGuides: false` in `docs/project-config.json`
(persistent; default `true`). The gate then checks only existence, never completeness. The transient
`skip init` escape still dismisses both hooks for 24h. The gate is dormant in empty/greenfield folders
and before config is populated. `AGENTS.md` is generated separately by `/sync-codex` (user-invoke-only).

## Modes

| Mode       | When                                     | Behavior                                                                                                                |
| ---------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `init`     | No CLAUDE.md exists, or first-time setup | Generate fresh CLAUDE.md from template + config. Populates all markers.                                                 |
| `update`   | CLAUDE.md exists with markers            | Replace only content between markers. Preserve everything else.                                                         |
| `refactor` | CLAUDE.md exists, needs optimization     | AI reads entire CLAUDE.md, optimizes for token efficiency, removes redundancy, improves structure. No script — pure AI. |

## Prerequisites

- `docs/project-config.json` — primary data source (run `/project-config` first if missing)
- Node.js available (for generator script)

## Phase 1: Detect Mode

```bash
# Check CLAUDE.md state
node .claude/skills/claude-md-init/scripts/generate-claude-md.cjs --detect
```

**Decision logic:**

- No CLAUDE.md → `init`
- CLAUDE.md with markers → `update`
- CLAUDE.md without markers → `smart-merge` (see below)
- User explicit `--mode` flag → override detection

## Phase 2: Run Generator Script

```bash
# Init mode: generate fresh CLAUDE.md
node .claude/skills/claude-md-init/scripts/generate-claude-md.cjs --mode init

# Update mode: sync marked sections only
node .claude/skills/claude-md-init/scripts/generate-claude-md.cjs --mode update
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
2. **Golden rules** — infer from `contextGroups[].rules` in config, but rewrite as human-readable rules
3. **Decision quick-ref** — build from `modules[]` + `framework` config, add project-specific patterns
4. **Naming conventions** — detect from codebase patterns if not in config

## Phase 4: Verify

- [ ] CLAUDE.md is valid markdown
- [ ] All section markers are properly paired (open + close)
- [ ] No template placeholder text remains (e.g., `{project-name}`, `TODO`)
- [ ] No `.claude/skills/claude-md-init/` references leak into output (self-reference)
- [ ] Conditional sections with no data are omitted (not empty stubs)

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
- Missing markers in update mode → section skipped (not inserted)
- Init mode uses template which includes all markers
- Markers use lowercase kebab-case keys matching section-registry.md

## Section Keys (Quick Reference)

See `references/section-registry.md` for full mapping. Summary:

| Key                   | Source                                  | Conditional?              |
| --------------------- | --------------------------------------- | ------------------------- |
| `tldr`                | `project.*`, `modules[]`, `framework.*` | No — always generated     |
| `golden-rules`        | `contextGroups[].rules`                 | Yes — skip if no rules    |
| `decision-quick-ref`  | `modules[]`, `framework.*`              | Yes — skip if no modules  |
| `key-locations`       | `modules[].pathRegex`                   | Yes — skip if no modules  |
| `dev-commands`        | `testing.commands`, `infrastructure.*`  | Yes — skip if no commands |
| `infra-ports`         | `modules[].meta.port` (infra)           | Yes — skip if no ports    |
| `api-ports`           | `modules[].meta.port` (services)        | Yes — skip if no ports    |
| `integration-testing` | `framework.integrationTestDoc`          | Yes — skip if no doc      |
| `e2e-testing`         | `framework.e2eTestDoc` or scan          | Yes — skip if no tests    |
| `doc-index`           | Scan `docs/` directory                  | Yes — skip if no docs/    |
| `doc-lookup`          | `modules[]` + business features         | Yes — skip if no modules  |

## Running Tests

Generator + bootstrap-gate coverage lives in the hooks test suite:

```bash
node .claude/hooks/tests/run-all-tests.cjs --filter=agent-files
```

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

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

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.
> **Keep domain concepts out of generic/shared/infrastructure layers.** A reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. The leak compiles and runs, so it passes review silently while coupling the "reusable" layer to one consumer. Push domain fields/logic down into the consumer via subclass or composition.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:output-quality-principles:reminder -->

**IMPORTANT MUST ATTENTION** maintain >=8 rules per 100 lines. Critical rules in first+last 5 lines. Tables over prose.

<!-- /SYNC:output-quality-principles:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
