---
name: sync-to-copilot
description: '[AI & Tools] Use when you need to sync Claude Code knowledge to GitHub Copilot instructions.'
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->

## Codex Project-Reference Loading (No Hooks)

Codex does not receive Claude hook-based doc injection.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
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

- Workflow catalog (from workflows.json) — **SCRIPT-GENERATED**
- Dev rules (from development-rules.md) — **SCRIPT-GENERATED**
- Project-reference summaries (from copilot-registry.json) — **SCRIPT-GENERATED**
- Enriched section headings and key patterns — **AI-GENERATED** (this skill)

**Usage:**

```
$sync-to-copilot
```

**Script:** `.claude/scripts/sync-copilot-workflows.cjs`

---

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## When to Use This Skill

> **Scope vs related skills:** Syncs **Claude→Copilot knowledge** (docs, dev-rules, workflow catalog) into Copilot instructions via script + AI enrichment. For the **`workflows.json` catalog only** (fast, no AI pass) → `$sync-copilot-workflows`. For **bidirectional** sync incl. skills/prompts/agents → `$ai-dev-tools-sync`.

Trigger this skill when:

- **Workflows added/modified** — After editing `.claude/workflows.json`
- **Development rules changed** — After editing `.claude/docs/development-rules.md`
- **Project-reference docs updated** — After modifying files in `docs/project-reference/`
- **Registry entries changed** — After editing `docs/copilot-registry.json`
- **Regular maintenance** — Quarterly sync to ensure Copilot parity
- **Copilot setup** — First-time Copilot instructions creation

---

## Workflow

### Phase 1: Script Generation (Automated)

```bash
node .claude/scripts/sync-copilot-workflows.cjs
```

This generates:

- `.github/copilot-instructions.md` — project-specific with registry summaries
- `.github/instructions/common-protocol.instructions.md` — generic protocols
- `.github/instructions/{group}.instructions.md` — per-group instruction files
- Removes old `.github/common.copilot-instructions.md` if it exists

### Phase 2: AI Enrichment (This Skill)

After the script runs, the AI MUST ATTENTION enrich the generated instruction files:

1. **For each per-group instruction file** in `.github/instructions/`:
    - Read the corresponding `docs/project-reference/*.md` source file
    - Extract the `##` section headings from the source file
    - Add a "Key Sections" list under each doc entry showing the headings
    - Keep it concise — headings only, no content duplication

2. **For `.github/copilot-instructions.md`**:
    - Verify the TL;DR golden rules in `docs/copilot-registry.json` → `projectInstructions.goldenRules` still match CLAUDE.md
    - Check if any new project-reference files exist but are missing from `docs/copilot-registry.json`
    - If missing entries found, add them to the registry and re-run the script

3. **For `docs/copilot-registry.json`**:
    - Verify each `summary` field accurately describes the current file content
    - Update stale summaries based on actual file content
    - Add entries for any new `docs/project-reference/*.md` files

### Phase 3: Verification

Check that:

- [x] `.github/copilot-instructions.md` contains project-specific content
- [x] `.github/instructions/common-protocol.instructions.md` contains protocols + workflow catalog
- [x] Per-group instruction files contain READ prompts
- [x] No old `common.copilot-instructions.md` file remains
- [x] Workflow count matches workflows.json
- [x] All project-reference files are represented in the registry

---

## AI Enrichment Protocol

When enriching per-group instruction files, follow this pattern for each doc entry:

```markdown
## [Doc Title](relative/path)

**Summary:** One-line summary from registry.

**Key Sections:**

- Section 1 Name
- Section 2 Name
- Section 3 Name
- ...

> **READ** `docs/project-reference/filename.md` when: trigger description
```

**Rules:**

- Extract ONLY `##` level headings from the source file (not `###` or deeper)
- List heading names only — do NOT copy content
- Keep the READ prompt from the registry `whenToRead` field
- If a file is very large (>30KB), note the file size: `(~59KB - read relevant sections)`

---

## Output Files

| File                                                     | Type                                    | Content                                        |
| -------------------------------------------------------- | --------------------------------------- | ---------------------------------------------- |
| `.github/copilot-instructions.md`                        | Project-specific                        | TL;DR + project-reference index + READ prompts |
| `.github/instructions/common-protocol.instructions.md`   | Generic (applyTo: `**/*`)               | Prompt protocol + workflow catalog + dev rules |
| `.github/instructions/backend-csharp.instructions.md`    | Backend (applyTo: `**/*.cs`)            | Backend doc summaries + READ prompts           |
| `.github/instructions/frontend-angular.instructions.md`  | Frontend (applyTo: `**/*.ts,**/*.html`) | Frontend doc summaries + READ prompts          |
| `.github/instructions/styling-scss.instructions.md`      | Styling (applyTo: `**/*.scss,**/*.css`) | Styling doc summaries + READ prompts           |
| `.github/instructions/testing.instructions.md`           | Testing (applyTo: `**/*Test*/**,...`)   | Testing doc summaries + READ prompts           |
| `.github/instructions/project-reference.instructions.md` | Cross-cutting (applyTo: `**/*`)         | General project doc summaries + READ prompts   |

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

### Issue: Stale summaries

**Solution:** Run this skill — AI will read files and update summaries

---

## Related Skills

- `$ai-dev-tools-sync` — Broader Claude/Copilot sync (skills, prompts, agents)
- `$sync-copilot-workflows` — Workflow-only sync (subset of this skill)

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

**IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** Match prompt against workflow catalog
2. **ANALYZE:** Find best-match workflow AND evaluate if a custom step combination would fit better
3. **ASK (REQUIRED FORMAT):** Use a direct user question with this structure unless the user explicitly invoked a workflow/skill and the local protocol treats explicit invocation as confirmation:
    - Question: "Which workflow do you want to activate?"
    - Option 1: "Activate **[BestMatch Workflow]** (Recommended)"
    - Option 2: "Activate custom workflow: **[step1 → step2 → ...]**" (include one-line rationale)
4. **ACTIVATE (if confirmed):** Call `$workflow-start <workflowId>` for standard; sequence custom steps manually
5. **CREATE TASKS:** task tracking for ALL workflow steps
6. **EXECUTE:** Follow each step in sequence
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
   **Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
   **Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
