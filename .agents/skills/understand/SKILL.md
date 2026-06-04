---
name: understand
description: '[Process] Use when the developer wants something explained — by default the current working tasks + changes in context, or whatever the prompt names (a plan, a subsystem, a decision, a concept, a bug). AI derives WHAT to explain from the prompt and ALWAYS delivers a detailed, one-way explanation of purpose (why it exists), how (the mechanics), and why-this-way (trade-offs/alternatives) — regardless of coding level. Never asks the user questions, never quizzes, never blocks.'
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

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Leave the **developer** carrying genuine, traced understanding of whatever matters right now — so AI accelerates the human without eroding their grasp of the codebase — by always delivering a clear, detailed, one-way explanation of **WHAT** it is, its **PURPOSE** (why it exists), **HOW** it works (the mechanics), and **WHY this way** (the trade-offs and rejected alternatives). **AI derives WHAT to explain from the user's prompt.** There are no fixed modes — the scope flexes to whatever the developer needs explained, and the explanation is given in full **regardless of the developer's coding level** — never skipped, never gated.

**Scope is prompt-driven — flexible for all cases:**

- **Default (bare `$understand`, no target named):** explain the **current working context** — the active tasks (the current task list) and the working-tree changes (`git diff`), plus any active plan or `$watzup` summary. "Here's what we're working on, what changed, and why."
- **Targeted (prompt names something):** explain exactly that — a plan, a change set/PR, a subsystem, a single design decision, a concept, a bug, "why X over Y". Read the prompt, derive the target, gather only that material.
- **Ambiguous:** **do NOT ask** — infer the most likely target (default to the current working context), state the assumption in one line, and proceed.

**Key Rules (the contract — read these first):**

- **DERIVE SCOPE FROM THE PROMPT.** What to explain is whatever the developer asked about; if they asked nothing specific, default to the current tasks + changes in context. Never force a fixed agenda.
- **ALWAYS EXPLAIN IN FULL — REGARDLESS OF CODING LEVEL.** Always cover purpose, how, and why in detail. Coding level only tunes vocabulary and analogy density (ELI5 ↔ terse-for-experts) — it NEVER decides _whether_ to explain and NEVER trims purpose/how/why. There is no "skip by level".
- **NEVER ASK THE USER A QUESTION.** This skill is strictly one-way: no teach-back prompts, no quizzes, no a direct user question, no ambiguity questions, no comprehension gating. Make the best inference, state it, and explain. The developer reads; they are never put on the spot. (Scope: this governs the explanation flow itself. The global workflow-detection gate is a separate pre-skill concern and is already exempted when the developer explicitly invokes `$understand` — so it does not contradict this rule.)
- **STANDALONE, NEVER BLOCKS.** This skill can be invoked directly or as a wrap-up handoff from `$watzup`. It explains and ends; it never traps the developer in a loop or prevents commit/workflow progress.
- **EXPLAIN THE WHOLE SCOPE, LEAD WITH THE NON-OBVIOUS.** Cover everything in the resolved scope, but order the explanation by leverage — open with the highest-blast-radius, highest-future-change-cost, most-surprising parts; treat boilerplate/CRUD/mechanical edits briefly. Detail is the goal; ordering is the optimization.
- **READ-ONLY on code & plans, and writes ONLY to a project-root temp folder.** This skill never edits source or plan files. Its only write target is the understanding ledger at `tmp/understand/{branch}.md` (see Step 3) — never in `.claude/`, the source tree, or any tracked path.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

---

# Understand — Prompt-Driven Detailed Explainer

You are a wise, effective teacher. Goal: make the human deeply understand whatever they need to understand right now — by explaining it clearly and in full. Cover high level (motivation, why it matters) and low level (business logic, edge cases, trade-offs). This is a **one-way explanation**: you do the explaining, the developer reads. You never quiz them, never ask them to restate, never gate on their answers.

## Step 0 — Resolve Scope & Read the Style Dial (do this first, cheaply)

1. **Derive the scope from the prompt.** Read what the developer actually asked and pick the target:

    | Prompt signal                                                 | Scope to explain                                                                                                                                                                             |
    | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | Bare `$understand`, no target named                           | **Default: current working context** — active tasks (the current task list) + working-tree changes (`git diff --name-only` + untracked) + active plan / latest `$watzup` summary if present. |
    | Names a change set / PR / "what I just did" / "these changes" | The diff and its rationale.                                                                                                                                                                  |
    | Names a plan / "the approach" / "before we build"             | The active plan: problem, approach, rejected alternatives, risks, phase order.                                                                                                               |
    | Names a subsystem / file / feature / "how does X work"        | That code path — read the files, run a graph trace, explain the flow.                                                                                                                        |
    | Names a single decision / "why X over Y"                      | That decision and its trade-offs.                                                                                                                                                            |
    | Names a concept / bug / error                                 | That concept or root cause.                                                                                                                                                                  |
    | Ambiguous / multiple plausible targets                        | **Do NOT ask.** Infer the most likely target (default to current working context), state the assumption in one line, and proceed.                                                            |

    State the resolved scope in one line before continuing (e.g. `Explaining: current working changes (3 files) + active task #42`).

2. **Read the style dial (NOT a skip gate).** Resolve coding level (first found wins): env `CK_CODING_LEVEL` → `.claude/.ck.json` `codingLevel` → default `3`. The level ONLY tunes how the explanation reads — vocabulary, analogy density, and assumed background. **It never decides whether to explain, and it never drops purpose/how/why.** Every level gets the full purpose + how + why.

    | Level  | Name      | Explanation style (always covers purpose / how / why)                                                                                            |
    | ------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
    | 5 / -1 | God Mode  | Terse and dense. Lead with the non-obvious trade-off and blast radius; assume all mechanics. Still state purpose, how, and why — just compactly. |
    | 4      | Tech Lead | Concise. Emphasize design trade-offs, blast radius, and future-change-cost; light on mechanics.                                                  |
    | 3      | Senior    | Balanced. Mechanics summarized, trade-offs and edge cases explained in full.                                                                     |
    | 2      | Mid       | Fuller mechanics walkthrough plus the "why this design" and key edge cases.                                                                      |
    | 1      | Junior    | Explain WHY before HOW; spell out mechanics step by step; define non-obvious terms.                                                              |
    | 0      | ELI5      | Incremental, one concept at a time, analogies, no jargon. Still reaches purpose + how + why by the end.                                          |

    Note the level you read in one line (e.g. `Style: level 3 (Senior) — balanced depth`), then explain. Do **not** offer a skip and do **not** ask the developer anything.

## Step 1 — Gather the Material

Gather **only** what the resolved scope needs:

- **Current working context (default):** the current task list for active tasks; `git diff --name-only` (+ untracked via `git ls-files --others --exclude-standard`) for the change set; the active plan and latest `$watzup` summary if they exist. Extract: what's being worked on, what changed, why, new behavior.
- **A plan:** read the plan files (`plan.md` + `phase-*.md` from the Plan Context / configured plans dir). Extract: problem, chosen approach, rejected alternatives, design decisions, risks, phase order.
- **A subsystem / feature / "how does X work":** read the relevant files; run `python .claude/scripts/code_graph trace <file> --direction both --json` to map the call/flow chain. Extract: entry points, data flow, key invariants.
- **A single decision / "why X over Y":** the relevant code + its rationale (comments, git blame, the plan's alternatives section).

Keep gathering proportional to scope — don't read the whole repo to explain one decision.

## Step 2 — Order the Topics by Leverage (cover all, lead with the non-obvious)

You will explain the **whole** resolved scope. Use this only to **order** the explanation — open with what matters most, compress the rest:

- **Blast radius:** run `$graph-blast-radius` (or `python .claude/scripts/code_graph trace <file> --direction both --json`) on the key files in scope. High upstream/downstream reach → explain first and in most depth.
- **Future-change-cost:** decisions expensive to reverse later (schema, public contract, cross-service message, shared/framework layer) → high priority.
- **Surprise:** anything a competent engineer would NOT guess from the task description — a non-obvious trade-off, a preserved edge case, a "we did X instead of the obvious Y because Z" → call these out explicitly.

Boilerplate, generated code, and mechanical renames get a one-line mention, not a deep dive. Nothing in scope is silently omitted — but depth follows leverage.

## Step 3 — Maintain the Understanding Ledger

Append (never overwrite) a running checklist with the Anthropic three groups to a ledger file. Makes the explanation **resumable** and doubles as a learning changelog.

> **[HARD RULE] Write the ledger ONLY to a project-root temp folder — NEVER inside `.claude/`, source tree, or any tracked path.** This skill must not generate any artifact anywhere else in the repo.
>
> Ledger path (relative to the project root, i.e. the folder that contains `.claude/`): `tmp/understand/{branch}.md` — use `temp/understand/{branch}.md` instead if the project already uses a `temp/` folder. Create the `understand/` subdir if absent. `{branch}` = current git branch with `/` replaced by `-`. Ensure the chosen `tmp/` (or `temp/`) folder is git-ignored.
>
> Example: `tmp/understand/{branch}.md`.
>
> **[ANNOUNCE — the chat is the deliverable]** The understanding lives in the **in-chat explanation**, not the file — the ledger is only a resumable log. Whenever you write or append it, state its path inline in chat (e.g. `Understanding ledger updated → tmp/understand/{branch}.md`) so the user is never unaware of a git-ignored artifact. NEVER let the explanation exist only inside the temp file.

```markdown
## {YYYY-MM-DD HH:mm} — {resolved scope} — {short task name}

### Problem (why this exists, prior limitation, the branches)

- [x] {item} — explained

### Solution (design, business logic, edge cases, why this over alternatives)

- [x] {item}

### Impact (what/who this changes, blast radius, follow-ups)

- [x] {item}
```

## Step 4 — Explain: Purpose → How → Why (the deliverable)

Deliver the explanation in-chat, in this order, **for every level** (depth/vocabulary tuned per Step 0, but all three sections always present). Cite `file:line` for every concrete claim.

1. **WHAT — one-line orientation.** Name the thing in scope and where it lives.
2. **PURPOSE (the WHY-it-exists).** What problem does this solve? What was the prior limitation or the alternative branch that made this necessary? Lead here — understanding the problem well is imperative.
3. **HOW (the mechanics).** Walk the flow: entry points, data flow, key invariants, what calls what. Use the graph trace from Step 1/2. Show the code paths and the business logic, including the edge cases that are handled.
4. **WHY-this-way (the trade-offs).** Why this approach over the obvious alternative(s)? What did it cost, what did it buy, what is now expensive to reverse? Surface the non-obvious decisions explicitly — "we did X instead of Y because Z". Drill into the why behind the why.
5. **IMPACT (blast radius & follow-ups).** What/who this changes, the upstream/downstream reach, and any open follow-ups.

Offer a simpler restatement or analogy for any point that is dense — proactively, without being asked. If the developer replies asking for `eli5` / `eli14` / `elii` (explain like I'm an intern), re-explain that point at that level. (Responding to a developer's follow-up request is fine — what's forbidden is _you_ posing questions to them.)

## Step 5 — Recap & Close (no quiz, no loop)

- Update the ledger: mark each item `explained`.
- Close with a 2–3 line recap: the purpose in one sentence, the key mechanic in one, and the single highest-leverage trade-off or blast-radius note in one.
- End there. **Do not** quiz, do **not** ask the developer to restate, do **not** loop. **Never block the next workflow step.**

---

## When This Runs

- **Standalone, any time:** `$understand` (current context) or `$understand <whatever you want explained>` — a plan, a subsystem, a decision, a concept, a bug. Pairs well with voice mode for a natural narrated walkthrough.
- **Wrap-up handoff:** `$watzup` may invoke `$understand` as its final mandatory explanation task after summarizing current changes, so the developer gets a deep Purpose → How → Why handoff without losing `$understand` as a standalone command.

**NOT for:** investigation/docs/design/research workflows where nothing was built or planned to understand; forcing comprehension as a hard gate; reviewing code quality (use `$code-review`, `$review-changes`).

## See Also

- **Skill:** `$coding-level` — sets the style dial (0–5) this skill reads (it tunes depth/vocabulary only; it never skips the explanation).
- **Skill:** `$graph-blast-radius` — leverage-ordering signal for Step 2.
- **Skill:** `$plan-validate` — elicits plan _decisions_ (the complement: this _explains_ the plan).
- **Skill:** `$watzup` — produces the change summary used as the current-context primer.

---

**IMPORTANT MANDATORY Steps:** resolve-scope-and-style -> gather-material -> order-topics-by-leverage -> maintain-ledger -> explain-purpose-how-why -> recap-and-close

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs proof.
>
> 1. Cite `file:line`, grep results, or framework docs for EVERY claim
> 2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
> 3. Cross-service validation required for architectural changes
> 4. "I don't have enough evidence" is valid and expected output
>
> **BLOCKED until:** `- [ ]` Evidence file path (`file:line`) `- [ ]` Grep search performed `- [ ]` 3+ similar patterns found `- [ ]` Confidence level stated
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->

<!-- SYNC:understand-code-first -->

> **Understand Code First** — HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
>
> 1. Search 3+ similar patterns (`grep`/`glob`) — cite `file:line` evidence
> 2. Read existing files in target area — understand structure, base classes, conventions
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists
> 4. Map dependencies via `connections` or `callers_of` — know what depends on your target
> 5. Write investigation to `.ai/workspace/analysis/` for non-trivial tasks (3+ files)
> 6. Re-read analysis file before implementing — never work from memory alone. — why: long context drifts from the file; the file is ground truth
> 7. NEVER invent new patterns when existing ones work — match exactly or document deviation. — why: divergent patterns fragment the codebase and slow every future reader
>
> **BLOCKED until:** `- [ ]` Read target files `- [ ]` Grep 3+ patterns `- [ ]` Graph trace (if graph.db exists) `- [ ]` Assumptions verified with evidence

<!-- /SYNC:understand-code-first -->

<!-- SYNC:graph-assisted-investigation -->

> **Graph-Assisted Investigation** — MANDATORY when `.code-graph/graph.db` exists.
>
> **HARD-GATE:** MUST ATTENTION run at least ONE graph command on key files before concluding any investigation.
>
> **Pattern:** Grep finds files → `trace --direction both` reveals full system flow → Grep verifies details
>
> | Task                | Minimum Graph Action                         |
> | ------------------- | -------------------------------------------- |
> | Investigation/Scout | `trace --direction both` on 2-3 entry files  |
> | Fix/Debug           | `callers_of` on buggy function + `tests_for` |
> | Feature/Enhancement | `connections` on files to be modified        |
> | Code Review         | `tests_for` on changed functions             |
> | Blast Radius        | `trace --direction downstream`               |
>
> **CLI:** `python .claude/scripts/code_graph {command} --json`. Use `--node-mode file` first (10-30x less noise), then `--node-mode function` for detail.

<!-- /SYNC:graph-assisted-investigation -->

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

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act). NEVER speculate without proof.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:understand-code-first:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any explanation. Run graph trace when graph.db exists.
  <!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:graph-assisted-investigation:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** run at least ONE graph command on key files when graph.db exists. Pattern: grep → graph trace → grep verify.
  <!-- /SYNC:graph-assisted-investigation:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** developer carries genuine, traced understanding of whatever matters right now — AI accelerates the human without eroding their grasp of the codebase. The explanation is always given in full, regardless of coding level.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries) — MUST ATTENTION each:**

- **Critical Thinking:** ALWAYS apply critical + sequential thinking; traced proof, confidence >80%.
- **Evidence:** cite `file:line` for every claim; NEVER speculate without proof.
- **Understand Code First:** read code + grep 3+ patterns before explaining.
- **Graph-Assisted Investigation:** run a graph command on key files when graph.db exists.
- **Output Quality:** dense, token-efficient prose; lead with the answer.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

- **MUST ATTENTION** derive WHAT to explain from the prompt; with no target named, default to the current working tasks + changes in context. Never impose a fixed agenda.
- **MUST ATTENTION** ALWAYS explain purpose + how + why in full — regardless of coding level. Level tunes vocabulary/analogy density only; it NEVER skips and NEVER trims the three sections.
- **MUST ATTENTION** NEVER ask the user a question — no teach-back, no quiz, no a direct user question, no ambiguity question. Infer, state the assumption, and explain one-way.
- **MUST ATTENTION** explain the WHOLE scope but lead with the non-obvious, high-blast-radius parts — order by leverage via `$graph-blast-radius`; compress boilerplate, omit nothing.
- **MUST ATTENTION** deliver in Purpose → How → Why order; cite `file:line` for every concrete claim.
- **MUST ATTENTION** this skill is standalone and NEVER blocks — explain, recap, end. No comprehension loop, never gate commit/implementation.
- **MUST ATTENTION** persist the problem/solution/impact checklist to the project-root temp folder (`tmp/understand/{branch}.md`) so it is resumable — NEVER write any artifact inside `.claude/`, the source tree, or any tracked path.
- **MUST ATTENTION** the in-chat explanation is the deliverable — ALWAYS announce the ledger path inline when you write it (`Understanding ledger updated → tmp/understand/{branch}.md`). NEVER let the explanation live only in a git-ignored file the user cannot see.

**Anti-Rationalization:**

| Evasion                                       | Rebuttal                                                                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| "Senior dev, skip the explanation"            | NEVER skip by level. Level tunes depth/vocabulary only — every level gets the full purpose + how + why.                               |
| "I'll quiz them to check understanding"       | This skill NEVER asks the user a question. It is one-way: explain, don't interrogate.                                                 |
| "Ambiguous target — I'll ask which one"       | Do NOT ask. Infer the most likely target (default current context), state the assumption, proceed.                                    |
| "Just dump everything I see"                  | Derive scope from the prompt first, then order by leverage. Cover all of scope, but lead with the non-obvious — not a repo-wide dump. |
| "Skip the trade-offs, just describe the code" | WHY-this-way is mandatory — purpose and trade-offs are the point, not just the mechanics.                                             |
| "Drop the ledger next to the skill"           | NEVER write inside `.claude/`, source, or tracked paths — only `tmp/understand/{branch}.md`.                                          |
| "Write the doc and continue silently"         | The chat is the deliverable. Explain inline and announce the ledger path — never log-and-move-on into a hidden git-ignored file.      |

> **[IMPORTANT]** This skill exists to make the human understand — by explaining clearly and fully, never by testing them. Keep it one-way, detailed, standalone-invocable, and non-blocking; it never gates progress.

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
