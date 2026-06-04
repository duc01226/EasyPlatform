<!-- CANONICAL SOURCE of the Workflow-First Gate. Hook-independent primacy anchor stamped at the
     top of every generated context file so Claude, Codex, and Copilot get the same routing rule
     with ZERO hooks. Consumers (keep in lockstep — they read this file, with an inline fallback):
       - .claude/skills/claude-md-init/scripts/generate-claude-md.cjs  → CLAUDE.md (mirrored into AGENTS.md / .codex/CODEX_CONTEXT.md)
       - .claude/scripts/sync-copilot-workflows.cjs                     → .github/copilot-instructions.md
     The block between the CK:WORKFLOW-GATE markers below is what gets stamped verbatim. -->

<!-- CK:WORKFLOW-GATE -->

> **[WORKFLOW-GATE] — routing is your FIRST action, before any tool call.**
> This rule is hook-independent: it binds Claude, Codex, and Copilot equally. Do not wait for any injected reminder to apply it.
>
> Classify complexity and risk first, then route it:
>
> | Request is about…                                                  | Default route                                                                                                                                       |
> | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
> | A simple, straightforward task with a clear target and low risk    | **direct execution** — do it without a workflow                                                                                                     |
> | A simple task that needs a few coordinated steps or skills         | **custom simple workflow** — sequence only the necessary skills/steps                                                                               |
> | A non-trivial bug, error, crash, regression, or wrong/stale output | **`workflow-bugfix` workflow** — `$start-workflow workflow-bugfix`                                                                                  |
> | A non-trivial new feature, capability, or enhancement              | **`workflow-feature` workflow** — `$start-workflow workflow-feature` (use `workflow-big-feature` when scope is large, ambiguous, or research-heavy) |
> | Anything matching a skill's or workflow's "Use" clause             | that skill / workflow                                                                                                                               |
> | A one-off question, or a truly trivial edit                        | direct execution                                                                                                                                    |
>
> 1. **An explicit `/skill` or `/workflow` in the prompt is the user's choice — execute it directly.** Otherwise auto-select the route yourself; never ask the user which path to take.
> 2. **Analyze whether the task is simple and straightforward before defaulting to a standard workflow.** If the target is clear, the change is low-risk, and a short direct execution can satisfy it, choose direct execution.
> 3. **For simple but multi-step work, build a custom simple workflow with only the few relevant skills/steps.** Do not expand to a full standard workflow when a small custom sequence is enough.
> 4. **Use standard workflows for non-trivial bugs and feature/enhancement work** — they force the investigation, tests, and review that risky or broad changes need.
> 5. **Declare the route, then ACTIVATE it — declaring is not activating.** State `Route: {workflow-id | skill | custom-simple | direct} — because {reason}`, then:
>     - **Workflow route →** invoke `$start-workflow <id>` as a tool call. That skill loads the workflow's canonical step `sequence` and creates the task list **1:1** from it. You MUST NOT hand-author your own task list for a workflow route — the canonical `sequence` is the only source of truth. Writing `Route: …` in prose and then improvising a few tasks is the failure this gate exists to prevent.
>     - **Skill route →** invoke that skill via the skill invocation.
>     - **Custom simple workflow →** create a small task list from the selected skills/steps, then execute them in order.
>     - **Direct route →** build the task list yourself, then proceed.
>       In every case the route must be activated BEFORE the first edit, sub-agent, or command.
> 6. **Direct execution is a legitimate route** for trivial, one-off, or simple straightforward work — but the declare-route and activate steps still apply.

<!-- /CK:WORKFLOW-GATE -->
