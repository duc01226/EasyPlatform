---
name: project-init
description: '[Utilities] Use when initializing or re-evaluating portable project context: project-config, project-reference docs, CLAUDE.md, AGENTS.md, universal agent rules, hookless setup. Triggers on: project init, init project, missing project-config, missing project docs, missing CLAUDE.md, missing AGENTS.md.'
disable-model-invocation: false
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

> **[IMPORTANT]** Create complete task plan before shell checks, scans, generators, edits, or skill calls.
> **[IMPORTANT]** After config exists, run `$scan-all` + `$workflow-code-to-spec` as post-config barrier; do not proceed until both return outcome/blocker/deferral.
> **[IMPORTANT]** After setup/review/verification is otherwise done, spawn background `$graph-build` sub-agent and record outcome.

## Quick Summary

**Goal:** Initialize or re-evaluate all portable project context files through one idempotent route, so any agent — with or without hooks — can discover missing context and reach a verified state with project config, reference docs, root instruction files, and Codex mirrors aligned.

**Workflow:**

1. **Plan Tasks** - Before any setup action, create task-tracking entries for every project-init phase and every required final skill call.
2. **Assess** - Classify folder state and current context-file health.
3. **Bootstrap** - Create missing config/doc stubs when useful, then route scans/generators.
4. **Populate** - After project config is initialized/refreshed, start the post-config parallel group: call `$scan-all` and `$workflow-code-to-spec`.
5. **Spec Finalization** - Resolve the mandatory docs/specs gate from `$workflow-code-to-spec`; only empty/no-content or no-accepted-capability projects may defer with evidence.
6. **Review** - Run `$review-changes`, then `$why-review` as final quality gates after scan/spec completion.
7. **Verify** - Validate config, root files, docs, mirrors, spec workflow status, and staleness.
8. **Background Graph Refresh** - After setup/review/verification is otherwise done, spawn a background sub-agent to run `$graph-build`.
9. **Report** - List completed actions, skipped actions, and remaining manual steps.

**Key Rules:**

- MUST ATTENTION run this before ordinary work when required config/docs/root instruction files are missing.
- MUST ATTENTION preserve user-authored `CLAUDE.md` and `AGENTS.md`; use smart-merge/update paths, never blind overwrite.
- MUST ATTENTION keep reusable skill text project-neutral; local rules belong in project config/reference docs.
- MUST ATTENTION use configured portability paths from `.claude/.ck.json` when present.
- MUST ATTENTION before any shell check, scan, generator, or file edit, create a complete task plan covering assessment, setup routes, final skill calls, verification, report, and lessons.
- MUST ATTENTION immediately after `$project-config` initializes or refreshes config, create and execute a post-config parallel task group with `Call $scan-all` and `Call $workflow-code-to-spec`.
- MUST ATTENTION call `$scan-all` after config initialization for every content-bearing project; skip only empty/no-content projects with recorded evidence.
- MUST ATTENTION invoke `$workflow-code-to-spec` for every content-bearing project; it may run in parallel with `$scan-all` after config exists, but do not treat "handoff suggested" as completion.
- MUST ATTENTION end every setup run with final task-plan rows, in order: `Call $review-changes`, `Call $why-review`, `Spawn background $graph-build sub-agent`, after the scan/spec parallel group is resolved.
- MUST ATTENTION run `$graph-build` as a required final background sub-agent task after setup/review/verification work is otherwise done; do not run this final graph refresh inline in the main context.
- MUST ATTENTION ask the user to run `$sync-codex` or its standalone node runner when Codex mirrors/root files are missing or stale; do not auto-run this user-invoked-only sync route.

## Scope

`$project-init` is the canonical coordinator for portable setup. It does not replace lower-level skills; it decides which one to run and when:

| Concern                                        | Primary route                                                                                                              |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Project config                                 | `$project-config`, then post-config parallel group: `$scan-all` + `$workflow-code-to-spec`                                 |
| Project reference docs                         | `$scan-all` after config initialization; `$docs-init` or `$scan --target=<key>` only for stubs/focused repairs             |
| Root Claude instructions                       | `$claude-md-init`                                                                                                          |
| Codex mirror, `AGENTS.md`, `.agents`, `.codex` | Ask the user to run `$sync-codex` or its standalone node runner                                                            |
| `docs/specs` Feature Specs + Section 8 TCs     | Mandatory `$workflow-code-to-spec` gate in the post-config parallel group; outcome must resolve before final review/report |
| Knowledge graph                                | Final background sub-agent running `$graph-build` after setup/review/verification is otherwise done                        |

> **Project-init test matrix** — Defines setup states, routing expectations, and regression cases for post-config scan/spec and final graph behavior.
> MUST ATTENTION read `references/use-cases-and-test-cases.md` when creating plans, tests, or reviewing changes to this setup.

## Phase -1: Required Task Plan

Before Phase 0 shell checks, create a full task-tracking plan. The plan MUST include many small, observable tasks and MUST NOT start execution until these rows exist.

Minimum required task rows:

1. Read `project-init` instructions and setup reference files.
2. Assess folder classification, config, docs, root files, mirrors, graph, and spec inventory.
3. Run required config setup route (`$project-config`) or mark skipped with evidence.
4. Create a post-config parallel group with both `Call $scan-all` and `Call $workflow-code-to-spec` as sibling tasks.
5. Call `$scan-all` after config initialization or mark skipped only for empty/no-content evidence.
6. Call `$workflow-code-to-spec` after config initialization and complete its Step 0 mode/scope route, or record the exact blocking user confirmation needed.
7. Wait at a barrier until both post-config parallel tasks are completed, blocked, or evidence-deferred.
8. Run required root-instruction route (`$claude-md-init`) or mark skipped with evidence.
9. Resolve Codex mirror route by asking for `$sync-codex` when required.
10. Call `$review-changes` after the scan/spec barrier.
11. Call `$why-review` after `$review-changes`.
12. Run verification commands.
13. Spawn a background sub-agent task named `Spawn background $graph-build sub-agent` after setup/review/verification is otherwise done.
14. Record the background `$graph-build` sub-agent outcome or explicit blocker.
15. Report files changed, routes invoked, scan/spec outcomes, review outcomes, background graph outcome, verification output, and remaining manual actions.
16. Analyze AI mistakes and reusable lessons.

Keep exactly one row `in_progress`. Mark each row `completed` immediately after its evidence is recorded.

## Phase 0: Assess State

Use shell checks, not memory. Record evidence for every state claim:

```bash
node -e "const h=require('./.claude/hooks/lib/session-init-helpers.cjs'); console.log(JSON.stringify({hasProjectContent:h.hasProjectContent(), isGreenfield:h.isGreenfieldProject()}, null, 2))"
node -e "const s=require('./.claude/hooks/lib/session-init-helpers.cjs'); console.log(JSON.stringify(s.checkProjectConfig(), null, 2))"
node -e "const a=require('./.claude/hooks/lib/agent-files-state.cjs'); console.log(JSON.stringify(a.getAgentFileIssues(), null, 2))"
```

Also check:

- Config path: `node -e "console.log(require('./.claude/hooks/lib/project-config-loader.cjs').getConfiguredProjectConfigPath())"`
- Docs index path: `node -e "console.log(require('./.claude/hooks/lib/project-config-loader.cjs').getConfiguredDocsIndexPath())"`
- Feature docs path: `node -e "console.log('docs/specs/')"`
- Placeholder docs: use `isPlaceholderFile()` from `.claude/hooks/lib/session-init-helpers.cjs`.
- Stale docs: use `getStaleReferenceDocs()` from `.claude/hooks/lib/session-init-helpers.cjs`.
- Reference-doc canonical-floor drift: `node -e "const h=require('./.claude/hooks/lib/session-init-helpers.cjs');const{loadProjectConfig}=require('./.claude/hooks/lib/project-config-loader.cjs');const r=h.normalizeReferenceDocs((loadProjectConfig()||{}).referenceDocs);console.log(JSON.stringify({changed:r.changed,renames:r.renames,added:r.added,removedLegacy:r.removedLegacy},null,2))"`. `changed:true` (non-empty `renames`/`added`/`removedLegacy`) means the config drifted below the canonical reference-doc floor (legacy filenames, missing canonical entries, or wrong order) and MUST be repaired in Phase 2 step 1a before the scan/spec barrier.
- Spec inventory: probe the fixed feature docs path: `node -e "const p='docs/specs/'; const fs=require('fs'); console.log(JSON.stringify({path:p, exists:fs.existsSync(p)}, null, 2))"`

## Phase 1: Decide Route

| State                                                                                                                                    | Action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Empty folder, no real project content                                                                                                    | Do not deep-scan. Create minimal portable context stubs only when the user explicitly requested project initialization; otherwise report that there is no project content yet and continue with generic guidance. Create the post-config parallel tasks but mark `$scan-all` skipped and `$workflow-code-to-spec` deferred only with evidence: `No project content or accepted capability scope`; next trigger is `$workflow-idea-to-spec` or `$greenfield`, then `$workflow-code-to-spec init-full`. Still create final rows for `$review-changes` and `$why-review`; mark them skipped only with this evidence-backed deferral. |
| Greenfield project with manifests/code scaffold                                                                                          | Run `$project-config`, then start the post-config parallel group. `$scan-all` may be limited to relevant detected stack/docs. `$workflow-code-to-spec` runs when product/capability scope or real code exists; otherwise defer with exact missing scope. Still keep `$review-changes` and `$why-review` as final task rows.                                                                                                                                                                                                                                                                                                       |
| Existing project, config missing or skeleton                                                                                             | Run `$project-config` first. Then immediately start the post-config parallel group (`$scan-all` + `$workflow-code-to-spec`) before nonessential setup work.                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Config populated, reference docs missing/placeholders                                                                                    | Run `$scan-all` after config initialization. Use `$docs-init` or targeted `$scan --target=<key>` only as follow-up repair if `$scan-all` identifies missing/stub files.                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Config present but `referenceDocs` drifted (legacy filenames, missing canonical entries, or wrong order per the Phase 0 normalize probe) | Run **Reference-doc normalization** (Phase 2 step 1a) BEFORE the scan/spec barrier: rewrite `config.referenceDocs` to `normalizeReferenceDocs(...).normalized`, `git mv` each `renames[]` legacy file to its canonical name (or `git rm` a stale duplicate), migrate downstream textual refs, then let the SessionStart hook / `$scan --target=<key>` create the `added[]` docs. Re-run the probe until `changed:false`.                                                                                                                                                                                                          |
| Config/docs populated, `CLAUDE.md` missing                                                                                               | Run `$claude-md-init --mode init` after the scan/spec barrier is resolved or explicitly blocked/deferred.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `CLAUDE.md` exists but lacks universal guides                                                                                            | Run `$claude-md-init --mode update` if marker-managed. If markerless/project-only, manually merge the universal-guide blocks from `claude-md-init/references/claude-md-template.md` while preserving project content, then rerun update.                                                                                                                                                                                                                                                                                                                                                                                          |
| `AGENTS.md` missing or incomplete                                                                                                        | Ask the user to run `$sync-codex` or `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs`, then verify mirrors.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Config/docs/root ready but `docs/specs/` is missing or empty                                                                             | The post-config `$workflow-code-to-spec` task suggests `init-full` and completes Step 0 mode/bucket/capability confirmation before `$project-init` can report complete.                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Config/docs/root ready and Feature Specs exist                                                                                           | The post-config `$workflow-code-to-spec` task suggests `audit`, unless an active diff/new requirement implies `update`. Then run `$review-changes` and `$why-review`.                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Docs stale or graph missing                                                                                                              | Run `$scan-all` in the post-config parallel group; queue the required final background `$graph-build` sub-agent task after setup/review/verification is otherwise done. Still resolve the mandatory spec workflow task before final verification.                                                                                                                                                                                                                                                                                                                                                                                 |
| Everything present                                                                                                                       | Run verification plus mandatory `$workflow-code-to-spec` audit/update decision; report idempotent status only after the spec workflow task is completed or explicitly deferred with evidence.                                                                                                                                                                                                                                                                                                                                                                                                                                     |

## Phase 2: Execute Order

Run phases sequentially except the explicit post-config parallel group. After each phase, re-run Phase 0 checks.

1. **Config** - `$project-config` when config is missing, skeleton, invalid, or stale relative to the workspace.
   1a. **Reference-doc normalization — canonical floor (MANDATORY when Phase 0 probe reports `changed:true`)** - repair reference-doc drift BEFORE the scan/spec barrier so every project converges to the framework floor regardless of starting state (no docs / partial / legacy names / wrong standard):
    - Rewrite `config.referenceDocs` to `normalizeReferenceDocs(config.referenceDocs).normalized` (canonical order, legacy names resolved via the alias map, canonical `templatePath`s preserved, genuine project-specific extras kept). Never delete or rename a canonical entry.
    - For each `renames[]` `{from,to}`: `git mv docs/project-reference/<from> docs/project-reference/<to>` when `<to>` is absent; if `<to>` already exists, `<from>` is a stale duplicate → confirm `<to>` holds the canonical content, then `git rm docs/project-reference/<from>`. Migrate every downstream textual reference (`docs-index-reference.md`, `project-structure-reference.md`) `<from>` → `<to>`, then ask the user to re-run `$sync-codex` so the regenerated mirrors match.
    - `added[]` canonical docs missing on disk are created idempotently by the SessionStart `session-init-docs.cjs` hook (or `$scan --target=<key>`) from `DEFAULT_REFERENCE_DOCS` + `templatePath`; do not hand-fabricate their content.
    - Re-run the Phase 0 normalize probe and proceed only when it reports `changed:false` with empty `renames`/`added`/`removedLegacy`.
2. **Post-config parallel context build (MANDATORY)** - after config exists, create sibling tasks `Call $scan-all` and `Call $workflow-code-to-spec`; run them in parallel when the environment/tooling supports parallel skill work, otherwise execute both before crossing the barrier.
    - `$scan-all`: required for content-bearing projects after config initialization. Skip only empty/no-content projects with evidence. Use `$docs-init` or targeted `$scan --target=<key>` only as follow-up repair when scan output proves it is needed.
    - `$workflow-code-to-spec`: required for content-bearing projects after config initialization. It may complete Step 0/mode selection in parallel with `$scan-all`; if it needs scan results for capability enumeration, pause inside that workflow until `$scan-all` evidence is available.
    - **Barrier:** do not proceed to root instruction updates, mirrors, final review, verification, or report until both sibling tasks have an outcome: completed, explicit blocker, or evidence-backed deferral.
3. **Root instructions** - `$claude-md-init --mode init|update`.
4. **Codex mirror** - ask the user to run `$sync-codex` or `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs`.
5. **Spec workflow outcome (MANDATORY)** - confirm the existing `Call $workflow-code-to-spec` task has one of these outcomes before review:
    - Empty/no-content folder: do not deep-scan or fabricate capabilities; mark this task `Deferred: no project content or accepted capability scope`, and report the next trigger (`$workflow-idea-to-spec` or `$greenfield`, then `$workflow-code-to-spec init-full`).
    - Greenfield with accepted product/capability scope or real code scaffold: invoke `$workflow-code-to-spec`, suggest `init-full`, and let its Step 0 confirm mode/bucket/capability.
    - Existing/grown project with `docs/specs/` missing or empty: invoke `$workflow-code-to-spec`, suggest `init-full`, and require divide-and-conquer grouping when capability count is large.
    - Existing/grown project with Feature Specs already present: invoke `$workflow-code-to-spec`, suggest `audit`; suggest `update` when `git diff` or a new requirement/PBI is the trigger.
6. **Review changes (MANDATORY)** - create a final task named `Call $review-changes`, invoke `$review-changes`, and record pass/fail or explicit blocker.
7. **Why review (MANDATORY)** - create a final task named `Call $why-review`, invoke `$why-review` after `$review-changes`, and record pass/fail or explicit blocker.
8. **Enhance** - `$prompt-enhance` on newly created or heavily updated skill/docs files.
9. **Queue background graph refresh (MANDATORY FINAL)** - create a final task named `Spawn background $graph-build sub-agent`; do not execute it until Phase 4 verification and setup/review work are otherwise done.

## Phase 2.5: Mandatory Spec Workflow Finalization

This phase starts as the `Call $workflow-code-to-spec` sibling task in the post-config parallel group. It is ALWAYS represented in task tracking and MUST be resolved before `$review-changes`, `$why-review`, final verification, and report.

| Scenario                                                     | Required final task outcome                                                                                                                                                                                                 |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Empty folder, no product/capability scope                    | Do not invoke heavy discovery. Mark final task deferred with evidence: `No project content/capability source`. Report exact next route: `$workflow-idea-to-spec` or `$greenfield`, then `$workflow-code-to-spec init-full`. |
| Greenfield with manifests but no accepted product scope      | Ask for/route to product discovery or greenfield planning first; defer spec authoring until capability scope exists. Do not generate fake Feature Specs from package names alone.                                           |
| Greenfield with accepted scope or code scaffold              | Invoke `$workflow-code-to-spec`; recommend `init-full` for the selected bucket/capabilities; complete Step 0 or report the user confirmation blocker.                                                                       |
| Existing/grown project, no Feature Specs under `docs/specs/` | Invoke `$workflow-code-to-spec`; recommend `init-full`, require capability grouping (`>10` split; `4-10` sub-agents) per that workflow; complete Step 0 or report the user confirmation blocker.                            |
| Existing/grown project with Feature Specs                    | Invoke `$workflow-code-to-spec`; recommend `audit` for freshness, or `update` when active code/requirement changes exist; complete Step 0 or report the user confirmation blocker.                                          |

**Do not mark `$project-init` complete while this phase is unresolved.** A valid resolution is either: (1) `$workflow-code-to-spec` invoked and its Step 0/mode route completed, (2) `$workflow-code-to-spec` invoked and blocked on explicit user confirmation of mode/bucket/capability, or (3) explicit deferral with evidence that the project has no content/capability source yet. A plain recommendation or handoff without invoking `$workflow-code-to-spec` is NOT a valid resolution.

`$scan-all` and `$workflow-code-to-spec` are allowed to run in parallel only after project config exists. The project-init report must include both outcomes and must state whether `$workflow-code-to-spec` consumed scan evidence directly or paused pending scan output.

## Phase 2.6: Mandatory Final Review Skills

After Phase 2.5, always create and execute these final tasks in order:

1. `Call $review-changes` - run after `$workflow-code-to-spec` so the setup/spec changes are reviewed from the current diff.
2. `Call $why-review` - run after `$review-changes` to validate rationale and avoid closing on unchallenged setup decisions.

If either skill cannot run because the environment lacks the required tool, stop and report the missing tool. Do not silently replace them with a summary.

## Phase 3: Hookless Agent Rule

For Codex or any environment without Claude hooks:

- If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or a task-required reference doc is missing or stale, invoke `$project-init` before ordinary task work.
- If `$project-init` cannot run because required tools are absent, report the missing tool and the exact lower-level route that remains.
- Do not proceed with project-specific coding from guessed context.

## Phase 4: Verification

Minimum verification before declaring setup complete:

```bash
node -e "const{validateConfig,formatResult}=require('./.claude/hooks/lib/project-config-schema.cjs');const{getConfiguredProjectConfigPath}=require('./.claude/hooks/lib/project-config-loader.cjs');const c=JSON.parse(require('fs').readFileSync(getConfiguredProjectConfigPath(),'utf-8'));console.log(formatResult(validateConfig(c)))"
node -e "const a=require('./.claude/hooks/lib/agent-files-state.cjs'); console.log(JSON.stringify(a.getAgentFileIssues(), null, 2))"
node .claude/hooks/tests/test-all-hooks.cjs
node .claude/skills/skill-creator/scripts/validate-skills.cjs --path .claude/skills/project-init
```

Spec workflow verification before declaring setup complete:

- Confirm the task list contains a post-config parallel group with `Call $scan-all` and `Call $workflow-code-to-spec`.
- Confirm `Call $scan-all` ran after `$project-config`, or was skipped only with empty/no-content evidence.
- Confirm the task list contains `Call $review-changes` and `Call $why-review` as the final review skill-call rows after the scan/spec barrier.
- Confirm the `$workflow-code-to-spec` outcome is one of: `init-full`, `audit`, `update`, `blocked on user-confirmed mode/bucket/capability`, or an evidence-backed deferral for empty/no-capability projects.
- Confirm `$review-changes` ran after `$workflow-code-to-spec`, or stopped with an explicit missing-tool blocker.
- Confirm `$why-review` ran after `$review-changes`, or stopped with an explicit missing-tool blocker.
- Confirm `Spawn background $graph-build sub-agent` ran after setup/review/verification was otherwise done, or stopped with an explicit missing-tool/dependency blocker.
- Confirm the Feature Spec root is the fixed path `docs/specs/`.
- Confirm the hook-independent Workflow-First Gate (`<!-- CK:WORKFLOW-GATE -->` block) is present at the TOP of `CLAUDE.md` and `AGENTS.md` so routing survives without hooks. If missing, re-run `$claude-md-init` (CLAUDE.md), then ask the user to run `$sync-codex` (AGENTS.md mirror).
- For grown projects, confirm large scope is split per `$workflow-code-to-spec` (`>10` capabilities grouped; `4-10` capabilities sub-agented).

If Codex mirrors were changed, run:

```bash
node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --only=tests,wf-cycle,sk-proto,residue,sdd
```

## Phase 5: Mandatory Final Background Graph Build

After Phase 4 verification and setup/review work are otherwise done, always execute this final task:

1. `Spawn background $graph-build sub-agent` - spawn a background sub-agent whose only job is to invoke `$graph-build` with default auto-detect scope, read its result, and return a concise outcome.

Rules:

- Run this final graph refresh in a sub-agent/background task, not inline in the main context.
- The task is required even if an earlier graph check found `.code-graph/graph.db`; existing graph presence changes `$graph-build` from full build to auto-detected update, not a skip.
- Keep the task open until the background sub-agent returns, or record an explicit blocker such as missing Python/dependencies.
- The project-init report must include the background graph task outcome.

## Output

Report:

- Folder classification: empty, greenfield, existing, or already initialized.
- Files created/updated/skipped: project config, reference docs, `CLAUDE.md`, `AGENTS.md`, mirrors.
- Lower-level skills/scripts invoked.
- Post-config parallel skill calls: `$scan-all` and `$workflow-code-to-spec`, each with outcome and evidence.
- Final review skill calls: `$review-changes`, `$why-review`, each with outcome and evidence.
- Final background graph call: `$graph-build` sub-agent outcome, scope/build type, and blocker if any.
- Spec workflow finalization: invoked mode (`init-full`, `audit`, `update`), user-confirmation blocker, or exact deferral reason and next trigger.
- Verification commands and results.
- Remaining manual action, especially any user-confirmed `$sync-codex` step.

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** any agent, with or without hooks, reaches a verified project-context state before project-specific work.

**MUST ATTENTION Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** ALWAYS apply critical + sequential thinking; traced proof, confidence >80% to act.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**IMPORTANT MUST ATTENTION** use `$project-init` as the unified missing-context route; lower-level skills remain implementation steps.
**IMPORTANT MUST ATTENTION** before doing anything, create many small task-plan rows covering every setup phase, the post-config parallel group, and the final review skill calls.
**IMPORTANT MUST ATTENTION** after config exists, call `$scan-all` and `$workflow-code-to-spec` as a parallel group when possible, then wait for both outcomes.
**IMPORTANT MUST ATTENTION** never finish `$project-init` without `Call $scan-all` and `Call $workflow-code-to-spec` after config initialization, followed by final rows `Call $review-changes`, `Call $why-review`, `Spawn background $graph-build sub-agent`.
**IMPORTANT MUST ATTENTION** final `$graph-build` runs in a background sub-agent after setup/review/verification is otherwise done; track it to returned outcome or explicit blocker.
**IMPORTANT MUST ATTENTION** for content-bearing projects, invoke `$workflow-code-to-spec`; do not close on a recommendation/handoff alone.
**IMPORTANT MUST ATTENTION** record explicit blocker for any unavailable required skill/tool; silent skip is not completion.
**IMPORTANT MUST ATTENTION** preserve user-authored root instruction files; do not overwrite project-only content.
**IMPORTANT MUST ATTENTION** rerun Phase 0 after every setup phase because the next route depends on current evidence.
**IMPORTANT MUST ATTENTION** keep reusable setup logic project-neutral; project-specific facts belong in config/reference docs.

**Anti-Rationalization:**

| Evasion                                             | Rebuttal                                                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| "Config exists, skip planning"                      | Create full task plan first; missing-context setup drifts without visible rows.                  |
| "Scan-all and spec workflow can be suggested later" | Call both after config and wait at the barrier; handoff is not completion.                       |
| "Graph already exists"                              | Final `$graph-build` still runs in background; existing graph changes scope to update, not skip. |
| "Review is enough"                                  | Run `$review-changes`, `$why-review`, verification, then final background graph task.            |

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

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

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

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
