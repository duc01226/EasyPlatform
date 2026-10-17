<!-- Canonical routing text. The runtime hook `.claude/hooks/workflow-route-inject.cjs` delivers the CK:WORKFLOW-GATE block for the route mode the person chose (ask | auto | off; ask and auto both ask the workflow question before a self-selected workflow starts; owner: `.claude/scripts/lib/workflow-routing-config.cjs`), after a `Route mode: <mode> (<source>)` line. The root instruction file carries no routing text. Lines between `CK:GATE-MODE <modes>` fences are delivered only in those modes. -->

<!-- CK:WORKFLOW-GATE -->

> **[WORKFLOW-GATE] — routing is your FIRST action; only a quick read-only look may precede it.**
>
> Honor an explicit skill/workflow request first. Otherwise assess and route: a direct, single-skill or custom-simple route (a Catalog-fit downgrade included) proceeds without asking; ask the workflow question (below) only when YOUR route is to start a catalog workflow — it NEVER starts before the answer; the declared route is the user's override point.
>
> **Mid-session: never auto-activate a workflow or ask to start one.** The workflow question applies only to the first task of a session (its first user prompt; compaction or resume does not reset it).
> Once work is under way (follow-up, correction, next step, or a new ask), do it directly or with the best-fit skill or a lean chain of at most 3 skills; required gates (root-cause investigation for a bug, test, review, spec/doc sync, and any other required quality gate) still run and do not count toward that cap, and continuing a workflow already running is not activating one. An explicit workflow request always runs, mid-session included — a `/workflow-*` or `/start-workflow <id>` call, or the user asking in words to use a workflow; follow it. A workflow a skill step, a named skill or a running workflow requires is part of that run, not your own selection: no question, `off` never skips it.
>
> **Assess (brief, from the prompt plus that quick look):** scope · change type (answer, tweak, behavior, public contract) · risk (irreversible, data, security, cross-module) · ambiguity · artifacts actually needed. Escalate on risk and ambiguity, not file count alone. Mixed research and modification intent is a modification: investigation is a substep of `/plan`.
>
> | Signals | Route |
> | --- | --- |
> | Loose idea, plan or design with unresolved material choices that fit one conversation, no owning artifact | `grill`: interview, save the Decision Record, then stop |
> | Loose idea or existing decision map with an unclear route and dependent unresolved decisions spanning sessions | `wayfinder`: chart or resume a decision map, then stop; size alone is insufficient |
> | Saved implementation plan or authored spec/test cases needing decisions validated | existing owner: `plan --mode=validate` or `spec [mode=clarify]` |
> | Question, lookup, or trivial low-risk edit; one skill covers it | direct: plain answer or that one skill |
> | Focused change (one module/policy, clear intent, no public-contract change) | custom-simple: only the canonical steps it needs, in dependency order |
> | Non-trivial bug/regression/stale output, cause unknown or wide reach | `workflow-bugfix` |
> | Non-trivial feature/enhancement changing behavior or a contract across modules | `workflow-feature` (`workflow-big-feature` if large/ambiguous/research-heavy) |
> | Product vision, greenfield or release-scoped idea | owning idea/feature workflow; apply shared `isLargeIdea` and embed decomposition in its artifacts |
> | Explicit roadmap/update/milestone-selection request | `product-roadmap`; the only writer of the product-roadmap artifact (default `docs/product-roadmap.md`; `docsRoots.productRoadmap.path` in `docs/project-config.json` overrides) |
> | Milestone/large-idea scope needing adversarial failure/replay/state/ownership/recovery/evidence analysis | conditional `scenario` before planning; no roadmap artifact |
> | Other matching skill/workflow Use clause | that skill/workflow, verified from its canonical definition |
>
> **Decision discovery:** select by unresolved decisions, not size. Clear work keeps its ordinary route. When a selected workflow already owns an interview, use that step instead of adding `grill`. Honor explicit requests and configured automatic-selection restrictions. Carry linked Decision Records and resolved tickets forward: reuse confirmed choices only while scope and premises still hold; cite them, and put open, changed, conflicting or unconfirmed choices to the human. All hosting gates remain binding. Discovery stops at its handoff and grants no build authority.
>
> **Catalog fit:** the table route is the default. Keep a catalog workflow when >80% of its unconditional steps would do real work; otherwise downgrade to custom-simple, trimming only steps that would do no real work. A behavior change keeps its test and review steps; a downgraded route also keeps root-cause investigation for bugs and spec/doc sync when behavior or a public contract changes. Re-declare if evidence changes the complexity.
>
> **Workflow question** (every tier): only when your route is to start a catalog workflow (never for direct or custom-simple), ask ONE question — use ask user question tool to ask user, else plain text, then stop until the user answers — with three options, the recommended one first with a one-line reason: (a) the full workflow `<id>` (N steps); (b) a slimmer custom route listing its steps, keeping every required gate; (c) execute directly, no workflow or skill. Follow the answer; never re-ask.
<!-- CK:GATE-MODE ask -->
> The tier (workflow `activation`) only orders the recommendation: `auto` by catalog fit; `confirm` recommends (a) only when nothing leaner would do; `manual` never recommends (a). An explicit request (`$workflow-*` on Codex too) runs any tier with no question.
<!-- /CK:GATE-MODE -->
<!-- CK:GATE-MODE auto -->
> **Route mode `auto`:** recommend (a) first, except for a `manual` tier. An explicit request (`$workflow-*` on Codex too) runs any tier with no question.
<!-- /CK:GATE-MODE -->
>
> Declare `Route: {workflow-id | skill | custom-simple [step → step] | direct} — because {key signals}` (e.g. `Route: custom-simple [investigate → fix → changes-review → test] — because known cause, one module`), then ACTIVATE (a workflow only after the answer, or on an explicit request) before edits, agents or commands. Workflow: invoke `start-workflow` with its id; create its phase tasks, one row per step. Skill: read and execute its SKILL.md. Custom/direct: one task per step plus a final review. Missing tools/details: stop and report; never fabricate invocation.
>
> Routing preserves operation authority, user data and all required quality gates.

<!-- /CK:WORKFLOW-GATE -->
