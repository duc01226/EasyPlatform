<!-- CK:UNIVERSAL-GUIDES v3 -->

<!-- The hook-independent Workflow-First Gate (CK:WORKFLOW-GATE block) is stamped here automatically
     by generate-claude-md.cjs `stampHeader()`, sourced from .claude/skills/shared/workflow-first-gate.md,
     on every init/update — it is intentionally NOT inlined in this template to avoid drift. -->

# {project-name} - Code Instructions

<!-- SECTION:tldr -->

> **Project:** {project-name} — {project-description}
>
> **Tech Stack:** {tech-stack-summary}
>
> **Apps/Services:** {app-list}

<!-- /SECTION:tldr -->

**Sections:** [TL;DR](#tldr--what-you-must-know-before-writing-any-code) | [Search First](#search-existing-code-first) | [Workflow Advancement](#workflow-step-advancement--parallel-phases) | [Task Planning](#task-planning-rules) | [Code Hierarchy](#code-responsibility-hierarchy) | [Naming](#naming-conventions) | [Key Locations](#key-file-locations) | [Dev Commands](#development-commands) | [Evidence](#evidence-based-reasoning--investigation) | [Graph Intelligence](#graph-intelligence-when-code-graphgraphdb-exists) | [Skill Activation](#automatic-skill-activation)

---

## TL;DR — What You Must Know Before Writing Any Code

<!-- SECTION:golden-rules -->

**Golden Rules (memorize these):**

1. {rule-1}
2. {rule-2}
3. {rule-3}

<!-- /SECTION:golden-rules -->

**Architecture Hierarchy** — Place logic in LOWEST layer: `Entity/Model > Service > Component/Handler`

**First Principles (Code Quality in AI Era):**

1. **Understanding > Output** — Never ship code you can't explain. AI generates candidates; humans validate intent.
2. **Design Before Mechanics** — Document WHY before WHAT. A 3-sentence rationale prevents 3-day debugging sessions.
3. **Own Your Abstractions** — Every dependency, framework, and runtime/provider decision is YOUR responsibility.
4. **Operational Awareness** — Code that works but can't be debugged, monitored, or rolled back is technical debt in disguise.
5. **Depth Over Breadth** — One well-understood solution beats ten AI-generated variants.

> **Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

<!-- SECTION:decision-quick-ref -->

**Decision Quick-Ref:**

| Task     | Pattern     |
| -------- | ----------- |
| {task-1} | {pattern-1} |

<!-- /SECTION:decision-quick-ref -->

## Search Existing Code First

Before writing code, you MUST grep/glob for 3+ similar examples and follow the local pattern over generic framework docs. Cite `file:line` evidence in the plan.

1. Grep/Glob for similar patterns (find 3+ examples).
2. Follow the codebase pattern; don't default to framework docs.
3. Provide `file:line` evidence in the plan.

**Why:** projects have local conventions that differ from framework defaults.
**Enforced by:** Feature/Bugfix/Refactor workflows (scout → investigate steps).

---

## First Action Decision (before any tool call)

1. Explicit slash command — the message starts with `/command-name` as the first token (e.g. `$plan do X`). Execute that skill/workflow directly. Skill names referenced as nouns (e.g. "update /skill-a") are NOT slash commands; workflow detection still required.
2. For ordinary prompts, evaluate the best path: execute directly, invoke a skill, activate a standard workflow, or compose a custom workflow. Auto-select the best option yourself; do not ask the user to choose the execution path.
3. If the selected path is a workflow, call `$start-workflow <workflowId>`; if it is a skill, invoke that skill; if it is custom, sequence the steps manually; if direct is best, answer or implement directly.
4. Create task tracking for multi-step selected paths before execution and keep it synchronized.

**Modification beats research.** When a prompt mixes research and modification intent, treat it as modification (investigation is a substep of `$plan`).

---

## Workflow Step Advancement & Parallel Phases

<!-- Universal portable rule shipped by claude-md-init into every project — model-driven workflow progression, identical across Claude, Codex (AGENTS.md whole-file mirror), and Copilot (baked common-protocol), none of which depend on a hook. The runtime workflow-protocol injector and any step-tracker hook are accelerators only. -->

Workflow progression is **model-driven** — your responsibility, not a tool/hook/harness signal:

1. **Advancement.** A step is complete when its work returns — whether run **inline** (a skill/step call) OR dispatched as a **sub-agent** (Agent / Task tool). A sub-agent completion advances the step **identically** to an inline call. Do not wait for any hook or tool event to advance; advance by judgment and your task list.
2. **Parallel phase = all-return barrier.** When steps are declared a parallel-phase group, spawn **ALL** members together (one message), then advance **only after EVERY member returns**. Never start the next step — and never start any code-mutating step (e.g. `code-simplifier`) — until the whole group has returned. A conditional member whose trigger is absent counts as "returned."
3. **Workflow-in-workflow → sub-agent.** A step that itself activates a multi-step workflow MUST run as a sub-agent; it returns only a summary and writes full findings to `plans/reports/`. This preserves context containment.
4. **Hooks/trackers are accelerators only.** Any step-tracking hook (e.g. Claude's `workflow-step-tracker.cjs`) is an optimization that may emit "next step" hints; correctness MUST NOT depend on it. Codex and Copilot run with no hooks and advance entirely by this rule.

---

## Task Planning Rules

1. Before editing files, MUST create a task tracking item per change.
2. Break work into small todos; add a final review todo.
3. Mark todos `completed` immediately after each one finishes. Keep exactly one `in_progress`.
4. On context loss or compaction, call the current task list first — resume existing tasks, don't duplicate.
5. Recommendations need traced evidence (`file:line`, grep, graph). No speculation.
6. Recommendations that could break behavior require validation before proposing.

---

## Code Responsibility Hierarchy

Place logic in the lowest appropriate layer to enable reuse and prevent duplication.

```
Entity/Model (Lowest)  >  Service  >  Component/Handler (Highest)
```

| Layer            | Contains                                                                |
| ---------------- | ----------------------------------------------------------------------- |
| **Entity/Model** | Business logic, display helpers, static factory methods, default values |
| **Service**      | API calls, command factories, data transformation                       |
| **Component**    | UI event handling only — delegates all logic to lower layers            |

**Anti-pattern:** logic in a component/handler that belongs in the entity → leads to duplicated code.

---

## Naming Conventions

| Type        | Convention       | Example                                |
| ----------- | ---------------- | -------------------------------------- |
| Constants   | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`                      |
| Booleans    | Prefix with verb | `isActive`, `hasPermission`, `canEdit` |
| Collections | Plural           | `users`, `items`, `orders`             |

---

<!-- SECTION:key-locations -->

## Key File Locations

```
{key-locations-tree}
```

<!-- /SECTION:key-locations -->

<!-- SECTION:dev-commands -->

## Development Commands

```bash
{dev-commands}
```

<!-- /SECTION:dev-commands -->

<!-- SECTION:infra-ports -->

## Infrastructure Ports

| Service   | Port   | Credentials   |
| --------- | ------ | ------------- |
| {service} | {port} | {credentials} |

<!-- /SECTION:infra-ports -->

<!-- SECTION:api-ports -->

## API Service Ports

| API Service | Port   |
| ----------- | ------ |
| {service}   | {port} |

<!-- /SECTION:api-ports -->

<!-- SECTION:integration-testing -->

## Integration Testing

{integration-testing-summary}

<!-- /SECTION:integration-testing -->

<!-- SECTION:e2e-testing -->

## E2E Testing

{e2e-testing-summary}

<!-- /SECTION:e2e-testing -->

---

## Evidence-Based Reasoning & Investigation

Don't speculate. Every claim about code behavior — and every recommendation for changes — must be backed by evidence.

### Core Rules

1. **Evidence before conclusion** — cite `file:line`, grep results, or framework docs. Don't use "obviously…", "I think…" without proof.
2. **State your confidence** — every recommendation lists its confidence level and the evidence it rests on.
3. **Inference alone isn't enough** — upgrade to code evidence when possible. When unsure, say _"I don't have enough evidence yet."_
4. **Cross-service validation** — check all services before recommending architectural changes.
5. **Graph trace before conclusion** — when investigating code flow, run a graph trace on key files.

### Confidence Levels

| Level       | Meaning                                         | Action                 |
| ----------- | ----------------------------------------------- | ---------------------- |
| **95-100%** | Full trace, all items verified                  | Recommend freely       |
| **80-94%**  | Main paths verified, some edge cases unverified | Recommend with caveats |
| **60-79%**  | Implementation found, usage partially traced    | Recommend cautiously   |
| **<60%**    | Insufficient evidence                           | **DO NOT RECOMMEND**   |

---

## Graph Intelligence (when .code-graph/graph.db exists)

<HARD-GATE>
You MUST run at least one graph command on key files before concluding any investigation, plan, or fix verification. Skip only when `.code-graph/graph.db` is absent.
</HARD-GATE>

### Quick CLI Reference

```bash
python .claude/scripts/code_graph trace <file> --direction both --json                    # Full system flow
python .claude/scripts/code_graph trace <file> --direction both --node-mode file --json   # File-level overview
python .claude/scripts/code_graph connections <file> --json                               # Structural relationships
python .claude/scripts/code_graph query callers_of <function> --json                      # All callers
python .claude/scripts/code_graph query tests_for <function> --json                       # Test coverage
python .claude/scripts/code_graph batch-query <f1> <f2> <f3> --json                       # Multiple files at once
python .claude/scripts/code_graph search <keyword> --kind Function --json                 # Find by keyword
```

**Pattern:** Grep finds files > trace reveals system flow > grep verifies details.

---

## Automatic Skill Activation

<!-- SECTION:skill-activation -->

These skills auto-activate before file edits in their path patterns:

| Path Pattern   | Skill / Auto-Context | Pre-Read Files   |
| -------------- | -------------------- | ---------------- |
| {path-pattern} | {skill}              | {pre-read-files} |

<!-- /SECTION:skill-activation -->

**Spec-driven docs routing:** before writing or reviewing Feature Specs, test cases, derived spec indexes, or behavior-changing work, read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the local spec docs: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. Use fixed spec root `docs/specs/`.

---

<!-- SECTION:doc-index -->

## Documentation Index

{doc-index-tree}

<!-- /SECTION:doc-index -->

<!-- SECTION:doc-lookup -->

### Doc Lookup Guide

| If user prompt mentions... | Read first |
| -------------------------- | ---------- |
| {topic}                    | {doc-path} |

<!-- /SECTION:doc-lookup -->
