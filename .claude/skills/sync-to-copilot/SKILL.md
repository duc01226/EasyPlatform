---
name: sync-to-copilot
version: 2.3.0
description: '[AI & Tools] Use when you need to sync Claude Code knowledge to GitHub Copilot instructions. Auto-inits docs/copilot-registry.json when missing. Flag: --fast (script-only workflow-catalog sync, no registry-curation pass).'
tags:
    - ai-tools
    - sync
    - copilot
    - github-copilot
    - workflow
    - configuration
---

## Quick Summary

**Purpose:** Keep Copilot instructions in sync with Claude Code workflows, dev rules, and project-reference docs.

**Architecture (Two-Tier):**

1. `.github/copilot-instructions.md` — **Project-specific** (always loaded by Copilot)
    - TL;DR golden rules, decision table
    - Project-reference docs index with READ prompts
    - Key file locations, dev commands

2. `.github/instructions/common-protocol.instructions.md` — **Generic protocols** (applyTo: `**/*`)
    - Prompt protocol, before-editing rules
    - Workflow catalog (from workflows.json)
    - Workflow execution protocol
    - Development rules (from development-rules.md)

3. `.github/instructions/{group}.instructions.md` — **Per-group** (applyTo: file patterns)
    - Enhanced summaries per doc with READ prompts
    - Groups: backend, frontend, styling, testing, project

**What gets synced:**

- Workflow-First Gate (from `.claude/skills/shared/workflow-first-gate.md`) — **SCRIPT-GENERATED**, stamped at the top of `copilot-instructions.md` so Copilot (no hooks) gets the same bug→`workflow-bugfix` / feature→`workflow-feature` routing rule
- Workflow catalog (from workflows.json) — **SCRIPT-GENERATED**
- Dev rules (from development-rules.md) — **SCRIPT-GENERATED**
- Missing `docs/copilot-registry.json` bootstrap — **AI-CREATED before generation**, from current `CLAUDE.md` + `docs/project-reference/**/*.md`
- Project-reference summaries (from copilot-registry.json) — **SCRIPT-GENERATED**
- Registry summary accuracy + golden-rule parity + missing-doc entries — **AI-CURATED** in `docs/copilot-registry.json`, then re-generated (this skill)

**Usage:**

```
/sync-to-copilot          # full sync: registry bootstrap + generation + registry curation + verification
/sync-to-copilot --fast   # fast path: registry bootstrap if missing + script generation only (former /sync-copilot-workflows)
```

**Script:** `.claude/scripts/sync-copilot-workflows.cjs`

> **Name note:** the script name is historical — despite its name, it generates the **entire** Copilot instruction set (project-specific + common-protocol + all per-group files). This skill runs that script and then adds a registry-curation pass (verify golden rules, fix stale summaries, add missing doc entries — then re-run the script) on top. The generated files are NEVER hand-edited. The former `/sync-copilot-workflows` skill (workflow-catalog-only wrapper around the same script) was absorbed into this skill as the `--fast` mode.

---

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## When to Use This Skill

> **Scope vs related skills:** Syncs **Claude→Copilot knowledge** (docs, dev-rules, workflow catalog) into Copilot instructions via script + a registry-curation pass. For the **`workflows.json` catalog only** (fast, no curation pass) → use `--fast` mode below. For the full pipeline — **bidirectional** source sync (skills/prompts/agents) **+** ordered both-mirror regen → `/sync-ai-dev-tools` (user-invoke-only).

Trigger this skill when:

- **Workflows added/modified** — After editing `.claude/workflows.json` (`--fast` is enough)
- **Workflow catalog stale/drifted** — When the Copilot catalog no longer matches `workflows.json` (`--fast` is enough)
- **Development rules changed** — After editing `.claude/docs/development-rules.md`
- **Project-reference docs updated** — After modifying files in `docs/project-reference/`
- **Registry entries changed** — After editing `docs/copilot-registry.json`
- **Regular maintenance** — Quarterly sync to ensure Copilot parity
- **Copilot setup** — First-time Copilot instructions creation

**NOT for**: Claude Code workflow issues (Claude gets the catalog auto-injected on every prompt via the `workflow-router.cjs` hook).

---

## Workflow

### Phase 0: Registry Bootstrap (Auto-init Required)

Before running the generator in **any mode**:

1. Check whether `docs/copilot-registry.json` exists.
2. If it is missing, create it automatically before script generation. Do **not** ask the user and do **not** run the generator first, because the script produces `0 docs` without this source.
3. Build the initial registry from current files:
    - `projectInstructions.goldenRules`: copy the Golden Rules from `CLAUDE.md` exactly, without punctuation normalization.
    - `projectInstructions.decisionQuickRef`, `keyFileLocations`, and `devCommands`: derive concise project-specific entries from `CLAUDE.md`, `docs/project-config.json`, and existing package scripts.
    - `instructionFileConfig`: include the standard groups `backend-csharp`, `frontend`, `styling-scss`, `testing`, and `project-reference` with their `.github/instructions/{group}.instructions.md` filenames and `applyTo` globs.
    - `registry`: include one entry for every `docs/project-reference/**/*.md` file. Use the first H1 as `title` when available; write `summary` and `whenToRead` from the actual file headings/content; choose `group` by topic:
        - `backend-csharp`: backend, hook architecture, CQRS/API/domain implementation references
        - `frontend`: frontend patterns and design-system references
        - `styling-scss`: SCSS/CSS/styling references
        - `testing`: integration and E2E test references
        - `project-reference`: cross-cutting docs, specs, lessons, project structure, code review, docs index
4. Validate the JSON parses, then verify the registry file list exactly covers `docs/project-reference/**/*.md` before Phase 1.

In `--fast` mode, Phase 0 still runs when the registry is missing; `--fast` only skips the post-generation curation pass when the registry already exists.

### Phase 1: Script Generation (Automated)

```bash
node .claude/scripts/sync-copilot-workflows.cjs            # generate
node .claude/scripts/sync-copilot-workflows.cjs --dry-run  # preview changes without writing
```

In `--fast` mode, Phase 0 + this phase are the whole sync: run the script (optionally `--dry-run` first), confirm the workflow count matches `workflows.json`, and stop — no registry-curation pass.

This generates:

- `.github/copilot-instructions.md` — project-specific with registry summaries
- `.github/instructions/common-protocol.instructions.md` — generic protocols
- `.github/instructions/{group}.instructions.md` — per-group instruction files
- Removes old `.github/common.copilot-instructions.md` if it exists

### Phase 2: Registry Curation (This Skill)

After the script runs, the AI MUST ATTENTION curate the **sources** the script reads — NEVER hand-edit the generated files:

> **Do NOT hand-edit `.github/instructions/*.instructions.md` or `.github/copilot-instructions.md`.** They are fully regenerated by the script and gated by `copilot:verify:divergence`, which does **full-file equality** against fresh generator output (`.claude/scripts/verify-copilot-divergence.cjs:62-69,109`). Any manual edit fails that oracle and is clobbered on the next run. ALL enrichment flows through the curated sources below → re-run the script.

1. **For `docs/copilot-registry.json`** (the per-group summaries source):
    - If Phase 0 created the file, treat it as a first draft and refine it immediately
    - Verify each `summary` field accurately describes the current file content; update stale summaries based on the actual file
    - Check for new `docs/project-reference/**/*.md` files missing from the registry; add entries (`file`, `title`, `summary`, `whenToRead`, `group`)
2. **For golden rules**: verify `projectInstructions.goldenRules` in `docs/copilot-registry.json` still match CLAUDE.md
3. **Re-run the script** so the curated sources reach the generated files: `node .claude/scripts/sync-copilot-workflows.cjs`

### Phase 3: Verification

Check that:

- [x] `.github/copilot-instructions.md` contains project-specific content
- [x] `.github/instructions/common-protocol.instructions.md` contains protocols + workflow catalog
- [x] Per-group instruction files contain READ prompts
- [x] No old `common.copilot-instructions.md` file remains
- [x] Workflow count matches workflows.json
- [x] `docs/copilot-registry.json` exists and parses
- [x] All project-reference files are represented in the registry

---

## Output Files

| File                                                     | Type                                          | Content                                        |
| -------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------- |
| `.github/copilot-instructions.md`                        | Project-specific                              | TL;DR + project-reference index + READ prompts |
| `.github/instructions/common-protocol.instructions.md`   | Generic (applyTo: `**/*`)                     | Prompt protocol + workflow catalog + dev rules |
| `.github/instructions/backend-csharp.instructions.md`    | Backend (applyTo: `**/*.cs`)                  | Backend doc summaries + READ prompts           |
| `.github/instructions/frontend.instructions.md`          | Frontend (applyTo: configured frontend globs) | Frontend doc summaries + READ prompts          |
| `.github/instructions/styling-scss.instructions.md`      | Styling (applyTo: `**/*.scss,**/*.css`)       | Styling doc summaries + READ prompts           |
| `.github/instructions/testing.instructions.md`           | Testing (applyTo: `**/*Test*/**,...`)         | Testing doc summaries + READ prompts           |
| `.github/instructions/project-reference.instructions.md` | Cross-cutting (applyTo: `**/*`)               | General project doc summaries + READ prompts   |

---

## Copilot Limitations

**Copilot can't enforce protocols like Claude Code hooks:**

- No blocking operations (edit-enforcement)
- Relies on LLM instruction-following (not guaranteed)
- Protocols are advisory, not enforced
- No runtime context injection — all context must be in instruction files

**Benefits:**

- Consistent guidance across AI tools
- Same workflow detection for Claude and Copilot users
- READ prompts enable on-demand context loading
- Automated sync reduces configuration drift

---

## Troubleshooting

### Issue: "workflows.json not found"

**Solution:** Ensure you're running from project root

### Issue: Missing project-reference files in registry

**Solution:** Add entries to `docs/copilot-registry.json`, then re-run script

### Issue: `docs/copilot-registry.json` not found

**Solution:** Re-run this skill, not the raw script. The skill MUST auto-create `docs/copilot-registry.json` in Phase 0, then run the generator. If manually running only `node .claude/scripts/sync-copilot-workflows.cjs`, create or restore the registry first.

### Issue: Stale summaries

**Solution:** Run this skill — AI will read files and update summaries

---

## Related Skills

- `/sync-ai-dev-tools` — Full-pipeline Claude/Copilot sync (skills, prompts, agents) + ordered both-mirror regen (user-invoke-only)

---

## References

- **Script:** `.claude/scripts/sync-copilot-workflows.cjs`
- **Registry:** `docs/copilot-registry.json`
- **Sources:** `.claude/workflows.json`, `.claude/docs/development-rules.md`
- **Main output:** `.github/copilot-instructions.md`
- **Instruction files:** `.github/instructions/*.instructions.md`

---

# Skill: sync-to-copilot

Sync Claude Code knowledge to GitHub Copilot instructions. Two-tier output: project-specific + common protocol.

---

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

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** auto-create `docs/copilot-registry.json` before generation when it is missing
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
