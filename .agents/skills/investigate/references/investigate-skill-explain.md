Read in full before `--mode=explain`. Entry-point-wide read-only/evidence rules remain in force; this reference replaces only the developer-narrative section.

## Mode: Explain (Developer Narrative)

**Trigger:** `$investigate --mode=explain [target]`. Manual-only; never auto-inserted into workflows. Use `$understand [target]` for the standalone explainer.

**Only change:** audience, shape, and write target. The evidence gate stays **identical and NON-NEGOTIABLE**: code/plans remain READ-ONLY; every concrete claim cites `file:line`; confidence >80% to assert (the graph stays optional advice). Explain mode NEVER relaxes these; mark unsupported narrative points "inferred".
**Goal:** make the **developer** understand **WHAT** the work is, its **PURPOSE**, **HOW** it works, and **WHY this way** (trade-offs + rejected alternatives) through a clear, detailed, **one-way** explanation. Derive scope from the prompt; no fixed agenda.

### Contract (read first)

- **DERIVE SCOPE FROM THE PROMPT.** No target → current context: active tasks (the current task list), working-tree changes (`git diff --name-only` + untracked via `git ls-files --others --exclude-standard`), active plan, and latest `$watzup` summary.
- **NEVER ASK THE USER A QUESTION.** Stay one-way: no teach-back, quiz, `ask user question tool`, ambiguity question, or comprehension gate. Infer the likeliest target, state the assumption once, proceed. The explicit-skill workflow-detection exemption still applies.
- **OPT-IN, NEVER BLOCKS.** Explain and end; never loop or gate commit, implementation, or workflow progress.
- **ALWAYS EXPLAIN IN FULL.** Cover purpose + how + why every time.
- **EXPLAIN THE WHOLE SCOPE, LEAD WITH THE NON-OBVIOUS.** Cover all scope, order by blast radius, future-change cost, and surprise; treat boilerplate/CRUD briefly.
- **WRITES ONLY to a project-root temp folder.** Never edit source/plan files or `tmp/analysis/...`; the only write target is `tmp/understand/{branch}.md` (Step E3).

### Step E0 — Resolve scope

1. **Derive scope from the prompt:**

   | Prompt signal | Scope to explain |
   | ------------- | ---------------- |
   | Bare invocation, no target named | **Default: current working context** — active tasks + working-tree changes + active plan / latest `$watzup`. |
   | Names a change set / PR / "what I just did" | The diff and its rationale. |
   | Names a plan / "the approach" / "before we build" | The active plan: problem, approach, rejected alternatives, risks, phase order. |
   | Names a subsystem / file / feature / "how does X work" | That code path — read files (optionally a graph trace for a high-risk flow), explain the flow. |
   | Names a single decision / "why X over Y" | That decision and its trade-offs. |
   | Names a concept / bug / error | That concept or root cause. |
   | Ambiguous / multiple plausible targets | **Do NOT ask.** Infer most likely (default current context), state the assumption in one line, proceed. |

    State resolved scope in one line (e.g. `Explaining: current working changes (3 files) + active task #42`).

### Step E1 — Gather the material (proportional to scope)

- **Current context:** read the current task list, `git diff --name-only` (+ untracked), active plan, and latest `$watzup`; extract work, changes, rationale, behavior.
- **Plan:** read `plan.md` + `phase-*.md`; extract problem, approach, rejected alternatives, decisions, risks, phase order.
- **Subsystem:** read files (optionally `python .claude/scripts/code_graph trace <file> --direction both --json` as a stale-able hint); extract entry points, data flow, invariants.
- **Single decision:** read relevant code + rationale (comments, git blame, plan alternatives).

Do not read the whole repo for one decision.

### Step E2 — Order topics by leverage

Cover the whole scope; use these only to ORDER: **Blast radius** (grep/read; optionally `$graph-code --mode=blast-radius` as a stale-able hint; highest reach first) · **Future-change cost** (schema, public contract, cross-service message, shared/framework layer first) · **Surprise** (call out what a competent engineer would not guess). Give boilerplate/generated/mechanical renames one line.

### Step E3 — Maintain the understanding ledger

> **[HARD RULE]** Write the ledger ONLY to a project-root temp folder — NEVER inside `.claude/`, the source tree, or any tracked path.
>
> Path: `tmp/understand/{branch}.md` (use `temp/understand/{branch}.md` if the project already uses `temp/`); create the subdir if absent, replace branch `/` with `-`, and ensure it is git-ignored.
>
> **[ANNOUNCE — the chat is the deliverable]** The explanation lives in chat, not only in the file. Whenever writing/appending, state `Understanding ledger updated → tmp/understand/{branch}.md`; NEVER leave the explanation only in the ledger.

Append, never overwrite, a checklist with: **Problem** (purpose, prior limitation, branches) · **Solution** (design, business logic, edge cases, alternatives) · **Impact** (what/who changes, blast radius, follow-ups).

### Step E4 — Explain: Purpose → How → Why (the deliverable)

Deliver in chat, in this order, for **every** level; tune depth/vocabulary only. Cite `file:line` for every concrete claim.

1. **WHAT** — one-line orientation: name the thing and location.
2. **PURPOSE (why-it-exists)** — problem solved, prior limitation, and necessary alternative branch; lead here.
3. **HOW (mechanics)** — trace entry points, data flow, invariants, callers, business logic, and handled edge cases using file evidence (graph output, when used, is only a hint).
4. **WHY-this-way (trade-offs)** — explain why this over alternatives, cost/benefit, reversibility, and non-obvious decisions ("we did X instead of Y because Z").
5. **IMPACT (blast radius & follow-ups)** — what/who changes, upstream/downstream reach, open follow-ups.

Offer a simpler restatement/analogy for dense points when useful. Answer `eli5`/`elii` follow-ups; NEVER pose questions to the developer.

### Step E5 — Recap & close (no quiz, no loop)

Mark ledger items `explained`. Close with a 2–3 line recap: purpose, key mechanic, and highest-leverage trade-off/blast-radius note. End there; do NOT quiz, ask for restatement, loop, or block the next step.

**NOT for:** investigation/docs/design/research where nothing was built or planned to understand; comprehension gates; code-quality review (use `$code-quality-review`, `$changes-review`).
**Anti-Rationalization:** "Senior dev, skip it" → NEVER skip by level. · "I'll quiz them" → one-way only. · "Ambiguous — ask which" → infer + state assumption. · "Dump everything" → derive scope, order by leverage. · "Skip trade-offs" → WHY-this-way is mandatory. · "Drop ledger" → only `tmp/understand/{branch}.md`; announce its path because chat is the deliverable.

---
