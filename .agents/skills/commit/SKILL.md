---
name: commit
description: '[Git] Use when asked to "commit", "stage and commit", "save changes", or after completing implementation tasks. Flag: --push (a.k.a. "commit and push") stages + commits + pushes to remote in one shot.'
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

Codex uses static project-reference loading instead of runtime-injected project docs.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

## Quick Summary

**Goal:** Stage changes and create well-structured git commits following Conventional Commits format.

**Workflow:**

1. **Analyze Changes** — Run git status/diff to understand staged and unstaged changes
2. **Stage Changes** — Add relevant files (specific or all)
3. **Generate Message** — Detect type (feat/fix/refactor/etc.), extract scope from paths, write subject, and add a detailed body structured as **purpose/kind → what changed → how it works**
4. **Commit** — Create commit with HEREDOC (title + detailed summary + attribution footer)
5. **Verify** — Confirm with git status and git log

**Key Rules:**

- Write a detailed body — **purpose/kind → what changed → how it works** — so the next human reading `git log`/`git blame` understands the change without opening the diff. As detailed as the change needs (wrap ~72 chars); no title-only commits for non-trivial changes
- Stop after the commit; push only when the user explicitly requests it (or passes `--push` / says "commit and push" → stage + commit + push via `git-manager`)
- Never commit secrets, credentials, or .env files
- Never use `--amend` or `--no-verify` unless explicitly requested
- Include `Generated with [Claude Code]` attribution footer

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Git Commit Skill

Stage changes and create well-structured git commits following Conventional Commits format.

## IMPORTANT: Bypass git-commit-block Hook

Before running any `git add` or `git commit` commands, create the marker file to bypass the `git-commit-block` hook:

```bash
PROJ=$(git rev-parse --show-toplevel) && mkdir -p "$PROJ/tmp/claude-temp" && touch "$PROJ/tmp/claude-temp/.commit-skill-active"
```

After committing (success or failure), **always** clean up the marker:

```bash
rm -f "$(git rev-parse --show-toplevel)/tmp/claude-temp/.commit-skill-active"
```

## Workflow

### Step 1: Analyze Changes

```bash
# Check current status (never use -uall flag)
git status

# See staged changes
git diff --cached

# See unstaged changes
git diff

# Check recent commit style
git log --oneline -5
```

### Step 2: Stage Changes

```bash
# Stage all changes
git add .

# Or stage specific files
git add <file-path>
```

### Step 2.5: Docs-Update Triage

Before committing, check if staged files impact documentation:

1. Run `git diff --name-only --cached` to list staged files
2. Check if any staged file matches doc-impact patterns (resolve the concrete backend/frontend source paths from the project's structure reference / `docs/project-config.json`):
    - changes under the backend service source paths (per project config) → may impact `docs/specs/`
    - `.claude/skills/**` → may impact `.claude/docs/skills/`
    - `.claude/hooks/**` → may impact `.claude/docs/hooks/`
    - `.claude/workflows.json` → may impact `CLAUDE.md` workflow table
    - changes under the frontend app source paths (per project config) → may impact frontend pattern docs
3. If matches found: invoke `$docs-update` skill, then re-stage any doc changes with `git add`
4. If no matches: skip (log "No doc-impacting files staged")

### Step 3: Generate Commit Message

Analyze staged changes and generate message following **Conventional Commits**:

```
<type>(<scope>): <subject>

<detailed summary of changes>
```

#### Type Detection

| Change Pattern          | Type       |
| ----------------------- | ---------- |
| New file/feature        | `feat`     |
| Bug fix, error handling | `fix`      |
| Code restructure        | `refactor` |
| Documentation only      | `docs`     |
| Tests only              | `test`     |
| Dependencies, config    | `chore`    |
| Performance improvement | `perf`     |
| Formatting only         | `style`    |

#### Scope Rules

Extract from file paths:

- `{configured-source-root}/auth/` → `auth`
- `.claude/skills/` → `claude-skills`
- `libs/{shared-lib}/` → `{shared-lib}`
- Multiple unrelated areas → omit scope

#### Subject Rules

- Imperative mood ("add" not "added")
- Lowercase start
- No period at end
- Max 50 characters

#### Body Rules (MANDATORY) — write so a human understands fastest

> Body is the deliverable. Optimize for the next person running `git log` / `git blame` — they understand the change **without opening the diff**. As detailed as the change needs; no artificial brevity limit — wrap ~72 chars, stop once nothing new said. Title-only commit FORBIDDEN for any non-trivial change. — why: the diff shows WHAT; the body must carry WHY + HOW, which the diff cannot.

Structure body in three parts (omit a part only when genuinely empty):

1. **Purpose / kind** — Name **what kind of change and why it exists**: feature, bug fix (state symptom removed), enhancement, refactor (state behaviour-preserving), perf, security, chore. 1–2 sentences answering _"what problem does this solve?"_.
2. **What changed** — Concrete edits grouped by **behaviour** (not by file). Each bullet specific to behaviour/files touched — NEVER vague lines ("update code", "fix stuff", "minor fixes").
3. **How it works / why this way** — The part reviewers need. Explain **mechanism, key logic, invariants relied on, edge cases preserved**, and any non-obvious decision ("did X instead of obvious Y because Z"). Focus **non-obvious** — never narrate boilerplate. Ordering/timing/security-review invariant or subtle failure mode → call out explicitly.

> **Teach-the-reader mindset (from the `understand` skill):** cover BOTH high-level motivation (why it matters) AND low-level logic (business rules, edge cases). Surface what a reader would NOT guess from the diff — write the explanation you would want to receive.

**Detail dial — scale body to the change:**

| Change size                         | Body depth                                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Trivial (typo, rename, formatting)  | Purpose line + 1 bullet; skip "how it works"                                                                        |
| Normal (feature/fix, single area)   | Purpose + 2–5 "what" bullets + a short "how it works"                                                               |
| Complex (cross-cutting, subtle bug) | Purpose + grouped "what" + a full "how it works" that spells out the key invariant / edge case / why-this-over-that |

### Step 4: Commit

Use HEREDOC for proper formatting:

```bash
git commit -m "$(cat <<'EOF'
type(scope): subject

- summarize key change 1 with intent
- summarize key change 2 with impact

Generated by AI
EOF
)"
```

### Step 5: Verify

```bash
git status
git log -1
```

## Examples

```
feat(order): add warehouse filter to list

- add warehouse query parameter in order list endpoint
- wire frontend filter control to request payload
- update tests for filtered and unfiltered list behavior

fix(validation): handle empty date range

- guard null/empty date inputs before parsing
- return validation message instead of throwing format exception
```

## Critical Rules

- **ALWAYS stage all unstaged changes** before committing — run `git add .` (or specific files) so nothing is left behind
- **Stop after the commit; push** to remote only when the user explicitly requests it
- **Review staged changes** before committing
- **Never commit** secrets, credentials, or .env files
- **Never use** `git commit --amend` unless explicitly requested AND the commit was created in this session AND not yet pushed
- **Never skip** hooks with `--no-verify` unless explicitly requested
- Commit message MUST include a Conventional Commit title AND a detailed body — **purpose/kind → what changed → how it works**. As detailed as the change needs (wrap ~72 chars); title-only commit FORBIDDEN for non-trivial changes
- Optimize body for the next human reading `git log` / `git blame` — surface the non-obvious (key logic, invariants, edge cases, why-this-over-that), not just a list of touched files
- Include attribution footer: `Generated by AI`

## Push & PR Operations

**Arg `--push` (a.k.a. "commit and push"):** stage all changes + create the commit + push to remote in one shot — spawn `git-manager` immediately after committing to push. This is the former standalone stage-commit-push entry point folded into `commit`; it adds no logic beyond the push delegation already described below.

This skill handles **commit** by default. Push-to-remote and pull request creation are delegated to `git-manager` sub-agent (`agent_type: "git-manager"`).

`git-manager` handles:

- Conventional commit message validation enforcement
- `--no-verify` bypass prevention
- PR creation with structured summaries

Spawn `git-manager` after committing when user says "push", "create PR", or "open PR".

## Sub-Agent Type Override

> **MANDATORY:** Push and PR operations spawn `git-manager` sub-agent (`agent_type: "git-manager"`), NOT the main agent.
> **Rationale:** `git-manager` enforces conventional commits, prevents hook bypasses, and handles PR creation with structured summaries.

## Related

- `changelog`
- `branch-comparison`

---

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:sub-agent-selection -->

> **Sub-Agent Selection** — Full routing contract: `.claude/skills/shared/sub-agent-selection-guide.md`
> **Rule:** Route specialized domains (architecture, security, performance, DB, E2E, integration-test, git) to the matching specialist agent (see guide above) — NEVER use `code-reviewer` for these. — why: `code-reviewer` lacks each domain's checklist, so specialized issues slip through.

<!-- /SYNC:sub-agent-selection -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing.** Before changing a constant, limit, flag, wording, or pattern, read nearby context and history.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Sub-Agent Selection:** route specialized domains to the matching specialist; NEVER `code-reviewer`.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** traced `file:line` proof per claim; confidence >80% to act, never guess.

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)

## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Trace every requirement or invariant through decision, task, TC/test, source evidence, and docs/spec update.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.
  **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
   **Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
   **Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

## Common AI Mistake Prevention (System Lessons)

- **Re-read files after context compaction.** Edit requires prior Read in same context; compaction wipes read state. Re-read before editing.
- **Grep for old terms after bulk replacements.** AI over-trusts find/replace completeness. Grep full repo after bulk edits for missed refs in docs/configs/catalogs.
- **Check downstream references before deleting.** Deletions cascade doc/code staleness. Map referencing files before removal.
- **After memory loss, check existing state before creating new.** Compaction wipes prior-work memory. Query current state to resume — never blindly duplicate.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace full dependency chain after edits.** Changing a definition misses downstream consumers. Trace the full chain.
- **When renaming, grep ALL consumer file types.** Some file types silently ignore missing refs (no compile error). Search code, templates, configs, generated files.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Update docs that embed canonical data when source changes.** Docs inlining derived data (workflows, schemas, configs) go stale silently. Update all embedding docs alongside source.
- **Verify sub-agent results after context recovery.** Background agents may finish while parent compacted — grep-verify output, don't trust assumed completion.
- **Cross-check full target list against sub-agent assignments.** Parallel sub-agents by category miss boundary items. Reconcile union of assignments against target list before proceeding.
- **Sub-agents inherit knowledge only from their agent .md definition — use custom agent types, not built-in Explore.** Tool adoption = permission + knowledge + enforcement (numbered workflow step).
- **Persist sub-agent findings incrementally, not as a final batch.** Long sub-agents hit cutoffs before final write — findings lost. Instruct append-per-section to report file.
- **When debugging, ask "whose responsibility?" before fixing.** Trace caller (wrong data) vs callee (wrong handling). Fix at responsible layer — never patch symptom site.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing.** Pattern-matching as "wrong" skips context. Before changing any constant/limit/flag: read comments, git blame, surrounding code.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic-first debugging — resist nearest-attention trap.** Don't dive into first plausible cause. List EVERY precondition (config, env vars, paths, DB, endpoints, creds, versions, DI, data). Verify each against evidence (grep/query — not reasoning). Ask "what would falsify this?" — if nothing, it's not a hypothesis. Most expensive failure: going deeper in "obvious" layer while bug sits in layer never questioned.
- **Surgical changes — apply the diff test (context-aware).** Two modes: (1) Bug fix → every line traces to the bug; no restyling; orphan cleanup only for imports YOUR changes made unused. (2) Review/enhancement → implement improvements AND announce as "Enhancement beyond main request: [what]". Never silently scope-creep. Diff test: "Would this line exist if I wasn't asked to do X?" — if no, delete or announce.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **[MANDATORY FIRST ACTION] ALWAYS activate a suitable skill or workflow BEFORE responding.** Match task against workflow catalog + skill list; invoke via skill invocation or `$start-workflow <workflowId>`. NEVER answer or write code before checking. Skip = protocol violation.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
