# {project-name} - Code Instructions

<!-- SECTION:tldr -->

> **Project:** {project-name} — {project-description}
>
> **Tech Stack:** {tech-stack-summary}
>
> **Apps/Services:** {app-list}

<!-- /SECTION:tldr -->

**Sections:** [TL;DR](#tldr) | [Search First](#mandatory-search-existing-code-first) | [Task Planning](#important-task-planning-rules-must-follow) | [Code Hierarchy](#code-responsibility-hierarchy-critical) | [Naming](#naming-conventions) | [Key Locations](#key-file-locations) | [Dev Commands](#development-commands) | [Evidence](#evidence-based-reasoning--investigation-protocol-mandatory) | [Graph Intelligence](#graph-intelligence-mandatory-when-code-graphgraphdb-exists) | [Skill Activation](#automatic-skill-activation-mandatory)

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
3. **Own Your Abstractions** — Every dependency, framework, and platform decision is YOUR responsibility.
4. **Operational Awareness** — Code that works but can't be debugged, monitored, or rolled back is technical debt in disguise.
5. **Depth Over Breadth** — One well-understood solution beats ten AI-generated variants.

> **Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

<!-- SECTION:decision-quick-ref -->

**Decision Quick-Ref:**

| Task     | Pattern     |
| -------- | ----------- |
| {task-1} | {pattern-1} |

<!-- /SECTION:decision-quick-ref -->

## MANDATORY: Search Existing Code FIRST

**Before writing ANY code:**

1. **Grep/Glob search** for similar patterns (find 3+ examples)
2. **Follow codebase pattern**, NOT generic framework docs
3. **Provide evidence** in plan (file:line references)

**Why:** Projects have conventions that differ from framework defaults.

**Enforced by:** Feature/Bugfix/Refactor workflows (scout > investigate steps)

---

## FIRST ACTION DECISION (Before ANY tool call)

```
1. Explicit slash command? (e.g., /plan, /cook) -> Execute it
2. Detect nearest matching workflow from the Workflow Catalog
3. ALWAYS ask user via AskUserQuestion to confirm: activate workflow or execute directly
4. FALLBACK -> MUST invoke /plan <prompt> FIRST
```

**CRITICAL: Modification > Research.** If prompt contains BOTH research AND modification intent, **modification workflow wins** (investigation is a substep of `/plan`).

---

## IMPORTANT: Task Planning Rules (MUST FOLLOW)

1. **MANDATORY task creation for file-modifying prompts** — If the prompt could result in ANY file changes, you MUST create `TaskCreate` items BEFORE making changes.
2. **Always break work into many small todo tasks** — granular tasks prevent losing track of progress
3. **Always add a final review todo task** to review all work done
4. **Mark todos as completed IMMEDIATELY** after finishing each task
5. **Exactly ONE task in_progress at a time**
6. **On context loss/compaction**, ALWAYS call `TaskList` FIRST — resume existing tasks, do NOT create duplicates
7. **No speculation or hallucination** — always answer with proof
8. **Evidence-based recommendations** — complete investigation before recommending changes
9. **Breaking change assessment** — Any recommendation that could break functionality requires validation

---

## Code Responsibility Hierarchy (CRITICAL)

**Place logic in the LOWEST appropriate layer to enable reuse and prevent duplication.**

```
Entity/Model (Lowest)  >  Service  >  Component/Handler (Highest)
```

| Layer            | Contains                                                                |
| ---------------- | ----------------------------------------------------------------------- |
| **Entity/Model** | Business logic, display helpers, static factory methods, default values |
| **Service**      | API calls, command factories, data transformation                       |
| **Component**    | UI event handling ONLY — delegates all logic to lower layers            |

**Anti-Pattern**: Logic in component/handler that should be in entity > leads to duplicated code.

---

## Naming Conventions

| Type        | Convention       | Example                                |
| ----------- | ---------------- | -------------------------------------- |
| Constants   | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`                      |
| Booleans    | Prefix with verb | `isActive`, `hasPermission`, `canEdit` |
| Collections | Plural           | `users`, `items`, `employees`          |

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

## Evidence-Based Reasoning & Investigation Protocol (MANDATORY)

Speculation is FORBIDDEN. Every claim about code behavior, every recommendation for changes, must be backed by evidence.

### Core Rules

1. **Evidence before conclusion** — Cite `file:line`, grep results, or framework docs. Never use "obviously...", "I think..." without proof.
2. **Confidence declaration required** — Every recommendation must state confidence level with evidence list.
3. **Inference alone is FORBIDDEN** — Always upgrade to code evidence. When unsure: _"I don't have enough evidence yet."_
4. **Cross-service validation** — Check ALL services before recommending architectural changes.
5. **Graph trace before conclusion** — When investigating code flow, you MUST run graph trace on key files.

### Confidence Levels

| Level       | Meaning                                         | Action                 |
| ----------- | ----------------------------------------------- | ---------------------- |
| **95-100%** | Full trace, all items verified                  | Recommend freely       |
| **80-94%**  | Main paths verified, some edge cases unverified | Recommend with caveats |
| **60-79%**  | Implementation found, usage partially traced    | Recommend cautiously   |
| **<60%**    | Insufficient evidence                           | **DO NOT RECOMMEND**   |

---

## Graph Intelligence (MANDATORY when .code-graph/graph.db exists)

<HARD-GATE>
You MUST run at least ONE graph command on key files before concluding any investigation,
creating any plan, or verifying any fix. Proceeding without graph evidence is FORBIDDEN.
Skip only if `.code-graph/graph.db` does not exist.
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

## Automatic Skill Activation (MANDATORY)

<!-- SECTION:skill-activation -->

When working in specific areas, these skills MUST be automatically activated BEFORE any file creation or modification:

| Path Pattern   | Skill / Auto-Context | Pre-Read Files   |
| -------------- | -------------------- | ---------------- |
| {path-pattern} | {skill}              | {pre-read-files} |

<!-- /SECTION:skill-activation -->

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
