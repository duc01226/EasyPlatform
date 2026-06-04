---
name: graph-blast-radius
description: '[Code Intelligence] Use when you need to analyze the blast radius of current code changes using the structural knowledge graph.'
version: 1.0.0
---

## Quick Summary

**Goal:** [Code Intelligence] Analyze the blast radius of current code changes using the structural knowledge graph. Shows impacted files, functions, test coverage gaps, and risk level. Requires graph to be built first via /graph-build.

**Workflow:**

1. **Detect** — classify request scope and target artifacts.
2. **Execute** — apply required steps with evidence-backed actions.
3. **Verify** — confirm constraints, output quality, and completion evidence.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- NEVER skip mandatory workflow or skill gates.

## Prerequisites

- Graph must be built first: run `/graph-build` if `.code-graph/graph.db` doesn't exist
- Requires Python 3.10+ with tree-sitter, tree-sitter-language-pack, networkx

## Steps

1. **Check graph exists** — Verify `.code-graph/graph.db` exists. If not, suggest `/graph-build`.

2. **Run blast-radius analysis** via Bash:

    ```bash
    python .claude/scripts/code_graph blast-radius --json
    ```

3. **Parse JSON output** and present:
    - **Changed files:** List of modified files (auto-detected from git)
    - **Changed nodes:** Functions/classes directly modified
    - **Impacted nodes:** Functions/classes affected within 2 hops (callers, dependents, tests)
    - **Impacted files:** Additional files that may need attention
    - **Truncation:** If results were truncated, note total vs shown

4. **Risk assessment** based on blast radius size:
    - **Low risk:** <5 impacted nodes, changes well-contained
    - **Medium risk:** 5-20 impacted nodes, review callers carefully
    - **High risk:** >20 impacted nodes, consider splitting PR

5. **Recommendations:**
    - Flag untested changed functions
    - Suggest files to prioritize in review
    - Warn about inheritance/implementation relationship changes

## Run the CLI Live (never expect pre-injected blast-radius)

This skill is the on-invoke home for blast-radius analysis. There is no auto-injected, pre-computed blast-radius context — you MUST ATTENTION **run the CLI yourself** to get LIVE impact data for the current working tree. Frozen/stale numbers are wrong by definition once the diff changes:

```bash
python .claude/scripts/code_graph blast-radius --json
```

## Post-Grep Trace Trigger (run a trace after grep surfaces a key file)

When a grep/glob during this analysis surfaces an important entry-point file — an entity, command, query, event/command handler, controller, bus message/consumer, component, store, or api-service — immediately run a graph trace on it before concluding. Grep finds files; the trace reveals callers, consumers, bus messages, event chains, and tests that grep CANNOT find:

```bash
python .claude/scripts/code_graph trace <key-entry-file> --direction both --json
```

**Pattern: grep finds files → graph trace reveals full system flow → grep verifies specific details.**

## Trace for Deep Impact Analysis

For impact beyond direct callers/importers, use the `trace` command to follow the full chain through implicit connections:

```bash
python .claude/scripts/code_graph trace <changed-file> --direction downstream --depth 3 --json

# File-level overview first (10-30x less noise), then drill into functions:
python .claude/scripts/code_graph trace <changed-file> --direction downstream --node-mode file --json
```

This reveals downstream impact through MESSAGE_BUS edges (cross-service event consumers), TRIGGERS_EVENT (entity event handlers), and other implicit relationships that blast-radius may not surface directly.

## Additional Queries

For deeper investigation, run via Bash:

- `python ... query callers_of <function> --json` — who calls this function?
- `python ... query tests_for <function> --json` — what tests cover this?
- `python ... query inheritors_of <class> --json` — what inherits from this?
- `python ... query importers_of <file> --json` — who imports this file?

---

# Blast Radius

Analyze the structural impact of current code changes using the knowledge graph.

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

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries) — MUST ATTENTION honor each canonical body:**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** traced `file:line` proof per claim, confidence >80% to act, NEVER guess as fact.

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
