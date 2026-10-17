# Development Rules

> **[IMPORTANT]** Create small todo tasks before starting work.

## Quick Summary

**Goal:** Enforce code quality, project-appropriate responsibility, and evidence-based development across implementation tasks.

**Workflow:** Understand code → Plan → Implement (follow project style and architecture) → Review → Test → Doc check

**Key Rules:**

- **Understand code first** — READ existing code, search 3+ patterns before ANY modification (the code graph is optional advice for high-risk blast radius)
- **Code style** — Follow the project formatter, conventions, and any path-scoped rules in config or references.
- **Responsibility** — Place behavior with the owner selected by the project's architecture and evidence; do not assume Entity/Model > Service > Component/Handler.
- **YAGNI / KISS / DRY** — No speculative abstractions, no over-engineering
- **Evidence-based** — Every claim needs `file:line` proof, confidence >80% to act
- **Zero broken builds** — Code must compile with no syntax errors
- **Names express PURPOSE** — "OrXxx/AndYyy" joining roles/types/statuses = content-driven red flag. Test: "if I add/remove one item, must I rename?" → YES = rename
- **Surgical changes (context-aware)** — Bug fix: every changed line traces to the bug (diff test). Review/enhancement: implement improvements AND announce them explicitly. Never silently scope-creep.
- **Surface ambiguity before coding** — List assumptions (scope, format, volume), present interpretations with effort estimates, push back when simpler approach exists. Never pick silently and run.
- **Goal-driven execution** — Define observable success criteria for the overall task; complete all planned work, then verify the final result in one consolidated pass.
- **Goal Contract** — Before planned, workflow, or non-trivial skill work: resolve the active Goal Contract (active plan `goal.md` → `goals/{YYMMDD-HHmm}-{slug}/goal.md` under the plans root — default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path — → create from request via `.claude/templates/goal-contract-template.md`), execute against its saved success criteria, append iteration evidence, and close only when the Goal Satisfaction matrix passes or a blocker is escalated. See `SYNC:goal-contract-satisfaction-loop` in `.claude/skills/shared/sync-inline-versions.md`. Tiny conversational tasks may skip only with a recorded reason.
- **Tests verify intent** — Tests must name the business rule or invariant they protect, not only assert observed behavior

---

## Contents

- [Quick Summary](#quick-summary)
- [General](#general)
- [Understand Code First (MANDATORY)](#understand-code-first-mandatory)
- [Code Quality Guidelines](#code-quality-guidelines)
- [Surgical Changes (MANDATORY — applies to every edit)](#surgical-changes-mandatory--applies-to-every-edit)
- [Task Decomposition & Iterative Quality](#task-decomposition--iterative-quality)
- [Surface Ambiguity Before Coding (MANDATORY)](#surface-ambiguity-before-coding-mandatory)
- [Goal-Driven Execution (MANDATORY)](#goal-driven-execution-mandatory)
- [Tests Verify Intent (MANDATORY)](#tests-verify-intent-mandatory)
- [Pre-commit/Push Rules](#pre-commitpush-rules)
- [Bulk Edit Safety (MANDATORY for multi-file replacements)](#bulk-edit-safety-mandatory-for-multi-file-replacements)
- [Doc Review (MANDATORY at session wrap-up)](#doc-review-mandatory-at-session-wrap-up)
- [Closing Reminders](#closing-reminders)

## General

- **File Naming**: Follow the language and project naming convention; if none is documented, match nearby files.
- **File Size**: Follow project guidance. Split when doing so improves cohesion and change cost, not to meet a universal line count.
- Skills/tools: `/web-research` (library docs; Context7 MCP optional), `investigate --mode=debug` (analysis), available image/video analysis tools, `gh` (GitHub)
- **[IMPORTANT]** Follow codebase structure and code standards in `./docs` during implementation
- **[IMPORTANT]** Always implement real code — never simulate or mock implementations
- **[CRITICAL] Responsibility Rule:**
    - Resolve the owner from project configuration, reference docs, accepted decisions, and existing code; do not impose an entity/service/component hierarchy.
    - Keep mapping, constants, derivation, and display behavior with the project-owned data or contract that makes them coherent; do not require DTO, entity, model, or component placement without project evidence.

## Understand Code First (MANDATORY)

> **Understand-Code-First** — Do NOT write code, create plans, or attempt fixes until you READ existing code.
> Search 3+ similar implementations first. The code graph is optional advice, never required.

- **Optional graph hint** — when grep and reading files alone may not reveal a high-risk blast radius (shared contract, many callers, cross-module/cross-service flow, public API), the code graph (`.code-graph/graph.db`) can add callers, dependents and impacted tests, e.g. `python .claude/scripts/code_graph trace <file> --direction both --json` (`--node-mode file` first for overview). Treat it as a hint, NOT proof: the graph can be stale or incomplete (it lags uncommitted edits and unindexed paths) — verify anything that matters by reading the files/grep. Skip it for low-risk or local changes. Read `.claude/skills/shared/protocols/graph-assisted-investigation.md` when you consider using it.

## Code Quality Guidelines

### Naming — Purpose vs Content

- **Name the PURPOSE, not the member list.** `OrXxx/AndYyy` joining roles/types/statuses → red flag. Test: "If I add/remove one item, must I rename?" → YES = content-driven = rename.
- **"Or" is fine in behavioral idioms** (`FirstOrDefault`, `SuccessOrThrow`) — it expresses WHAT HAPPENS, not WHO IS IN A SET.
- **For public/cross-layer abstractions, name the capability or domain contract, not the current provider, SDK, framework, database, or transport.** Keep those details on concrete adapters (`IStorage`/`Storage` → `AzureBlobStorage`); use a narrower contract when “storage” overpromises and preserve local interface syntax.
- Canonical portable protocol: `.claude/skills/shared/sync-inline-versions.md` (`SYNC:design-patterns-quality`); research synthesis: `tmp/reports/research-abstraction-naming-260820.md`.

### Standards

- **Zero tolerance for broken builds** — code must compile with no syntax errors
- Follow codebase structure and code standards in `./docs`
- Prioritize functionality and readability over strict style enforcement
- Handle edge cases and error scenarios; use try-catch & security standards
- Use `code-reviewer` agent to review code after every implementation
- **DO NOT** create new enhanced files — update existing files directly

<!-- SYNC:shared-protocol-duplication-policy -->

> **Shared Protocol Duplication Policy** — Author shared protocols only in `.claude/skills/shared/sync-inline-versions.md`; every other copy is a generated projection.
>
> - **Applicability:** adopt a protocol only for an evidenced procedure or mode. Keep conditional detail behind its read-when guide and delivery trigger in `protocol-groups.json`, or its selected mode/type reference. Ordinary test runs, list/help operations and non-UI artifacts do not load unrelated doc-authoring, debugging or UI depth. Preserve applicable gates, role reminders and full reviewer-template obligations.
> - **Guides:** skill entrypoints, including `changes-review`, `code-quality-review`, `why-review` and `workflow-review-changes`, carry one `PROTOCOL-GUIDES` line per applicable protocol: tag, summary, read-when trigger and published path. Hooks deliver applicable full text from `.claude/skills/shared/protocols/`; when an applicable rule is absent from the current context, read its published file before acting. Delivery overflow names the unread full sources; it never permits omission. Keep role-protocol `:reminder` digests in every carrier. The registry's `inlineSkills` list is empty; a future full-body exception requires an explicit owner decision.
> - **Full-text carriers:** agents retain full role protocols and are never converted to guides. Mode-only `references/*.md` load first on mode entry and retain their SYNC bodies. Copy the complete `SYNC:review-protocol-injection` template, with all 11 full protocol bodies, VERBATIM into every fresh reviewer prompt; never substitute guide lines, tags or a read pointer. A guide entrypoint changes discovery, not review gates or dispatch obligations.
> - **Universal:** the registry's `universal` group is hook-only, including for agents. Its `bins` are at most 9,500 characters, delivered on the first prompt, after about 150K tokens or compaction, and at every sub-agent start. Skills, agents, roots and mirrors carry no universal body, reminder, guide or pointer. Roots hold project information only; hosts without hooks are unsupported.
>
> **Update:** edit canonical first, then run `.claude/scripts/sync-update-blocks.py <tag>` (macOS/Linux `python3`; Windows `py -3`) to propagate skills and agents. Only that tool's `--mode=guide --tags <tag>` converts skill entrypoints; never convert a universal tag. Rebuild with `node .claude/scripts/build-protocol-projection.cjs`, then search `SYNC:<tag>` for copies outside the tool's scope, including `.claude/docs/development-rules.md`. Never hand-extract, deduplicate or replace a body outside this policy.

<!-- /SYNC:shared-protocol-duplication-policy -->

## Surgical Changes (MANDATORY — applies to every edit)

> **Touch only what you must. Clean up only your own mess.**

**The diff test** — Before submitting any change, ask: "Would this line appear in the diff if I hadn't been asked to do X?" If the answer is no, delete it.

### Rules

- **Don't improve adjacent code** — Don't refactor things that aren't broken. Don't add type hints, docstrings, or comments that weren't requested.
- **Match existing style** — Match existing quote style, spacing, naming conventions even if you'd do it differently. Style drift in a diff is noise that obscures the real change.
- **Orphan cleanup** — When your changes create unused imports/variables/functions, remove them. But do NOT remove pre-existing dead code unless asked. The distinction: YOU made it unused → remove it. It was already dead → mention it, don't touch it.
- **Scope discipline** — Two modes, same transparency rule:
    - **Bug fix context:** "Fix the bug" ≠ "improve the function." If you see a related improvement, announce it — don't silently implement it.
    - **Review / enhancement context:** If you see improvement opportunities, **implement them AND explicitly announce** what was enhanced beyond the main request. Never leave visible quality improvements unfixed when the task gives you license to improve. The rule either way: **never silently scope-creep**. Always declare what you did beyond the stated request.

---

## Task Decomposition & Iterative Quality

> **Iterative Phase Quality** — Split work only at a real dependency boundary, independently verifiable outcome, or disjoint write owner. Plan at decision-and-boundary altitude; execution discovers local mechanics.

- **Principle:** Use the fewest outcome phases that make ownership and dependency order clear. Do not force file-count, hour, or method-level slices.
- **Verification order:** write tests with implementation, use only static/type/compile checks between phases, review the settled whole change, then run the affected tests once at the final verify gate.

---

## Surface Ambiguity Before Coding (MANDATORY)

> **Never pick an interpretation silently and run. Surface it first.**

Before implementing any non-trivial request, surface ambiguity using this protocol:

**1. List assumptions explicitly:**

| Dimension       | Question to ask                                                        |
| --------------- | ---------------------------------------------------------------------- |
| **Scope**       | All records or filtered? Privacy implications?                         |
| **Format**      | File download? API response? Background job?                           |
| **Volume**      | How many records? (affects approach: in-memory vs streaming)           |
| **Constraints** | Performance targets? Security boundaries? Existing patterns to follow? |

**2. If multiple interpretations exist, present them with effort estimates:**

```
"[Request]" could mean:
1. [Interpretation A] — [approach] — ~[Nh] effort
2. [Interpretation B] — [approach] — ~[Nh] effort
3. [Interpretation C] — [approach] — ~[Nh] effort

Simplest approach: [X]. Need more context for [Y]. Which matters most?
```

**3. Push back when simpler exists:** State the simpler approach explicitly before implementing. NEVER silently pick the complex path because it was implied.

### Anti-Pattern: Silent Assumption

```
❌ User: "Export user data"
   AI: [immediately builds CSV/JSON exporter with file-writing, all users, all fields]

✅ User: "Export user data"
   AI: Before implementing, I need to clarify:
       1. Scope: Export all users or filtered? (privacy implications if all)
       2. Format: File download in browser, API endpoint, or background job with email?
       3. Fields: Which fields? Some may be sensitive.
       Simplest approach: API endpoint returning paginated JSON.
       Need more info for file-based or email-delivery exports. Which direction?
```

---

## Goal-Driven Execution (MANDATORY)

> **LLMs loop well when given success criteria. Vague tasks produce vague results.**

Transform imperative tasks into verifiable goals **before writing any code**. This is the difference between "I'll look into it" and a self-contained loop that runs to completion.

| Instead of...    | Transform to...                                                                   |
| ---------------- | --------------------------------------------------------------------------------- |
| "Fix the bug"    | "Write a failing test that reproduces it → make it pass"                          |
| "Add validation" | "Write tests for invalid inputs → make them pass"                                 |
| "Refactor X"     | "Ensure tests pass before AND after"                                              |
| "Make it faster" | Define: latency target? throughput? perceived? Then measure baseline → hit target |
| "Review this"    | List specific acceptance criteria — what does PASS look like?                     |

For multi-step tasks, define success criteria for the overall outcome. Complete all planned implementation steps and static review, then run one consolidated final verification pass. Do not require a separate verify criterion or routine verification run for every small todo task. Repeat verification only when a failure or later change invalidates the result; keep required prerequisite and safety gates at their specified points.

**Weak criteria** ("make it work", "improve it") require constant clarification — the loop stalls.
**Strong criteria** let you loop independently to completion — the loop self-terminates when done.

**Test-first application:** For bugs, write the failing test BEFORE fixing. The test is the success criterion made executable.

---

## Tests Verify Intent (MANDATORY)

> **Tests must encode WHY behavior matters, not just WHAT the code currently does.**

A valid test protects a business rule, invariant, user promise, or regression boundary. If a test would still pass after the protected rule is broken, the test is wrong even if it executes code.

For every meaningful test or test case, state the protected intent:

```
Business Intent / Invariant Guarded: [rule this test protects]
Failure Signal: [what change would make this test fail]
```

**Wrong:** Assert only that a method returns the current value or that no exception is thrown.
**Right:** Assert the observable outcome that proves the intended rule still holds.

When implementation and tests disagree, record a provisional verdict from the full
five-way taxonomy BEFORE tracing or editing either side (canonical: `.claude/skills/shared/protocols/ai-mistake-prevention.md`, delivered by the universal hook):

- **SOURCE-WRONG** — production violates the intended rule: fix source, keep/add the failing test.
- **TEST-WRONG** — the assertion or setup is stale: update the test/spec to the intended rule.
- **TEST-NOT-OPTIMAL** — the test is valid but fragile or low-signal: strengthen it toward the invariant.
- **ENVIRONMENT-BLOCKED** — external state prevents any verdict: fix the environment, do not judge the code.
- **AMBIGUOUS** — intent or evidence cannot choose safely: stop and ask; never encode accidental behavior.

Then trace the root cause and triangulate against the governing spec in the business
spec root — default `docs/specs`, overridden by `specRoots.business.path` in `docs/project-config.json`
— if one exists, AND the source.

**NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to
force green.** A three-way split without this clause reads as permission to pick
whichever side is cheaper to change, which is exactly how a real regression gets
retitled as a stale test.

---

## Pre-commit/Push Rules

**Consent and safety apply to Claude, Codex and OpenCode.**

- Stage, commit and push only on explicit user request; implementation approval grants none of them. A plain commit request creates a new commit.
- Amend only when explicitly requested, and only an unpushed commit created by this task. This includes `reset --soft HEAD~1` followed by commit. The review gate requires a receipt against HEAD's parent with `"amend":true`; merge-commit amendments fail closed.
- Create a feature branch before committing on `main` or `master`.
- Read-only inspection needs no approval. An explicit commit or push request authorizes that operation and its necessary preparation after required checks, with no second confirmation. Ask only when scope or a separate consequential operation lacks authorization. Listing branches, tags, remotes, configuration or stashes is read-only.
- GitHub CLI/MCP writes require explicit user authorization, including PR/release publication, merging, deletion and API writes.
- Consent remains the agent's responsibility: no hook enforces these authorization rules or blocks destructive Git operations. Only literal `permissions.ask` patterns in `.claude/settings.json` prompt, even under `bypassPermissions`; unmatched commands can run silently.
- Before recursive deletion outside `tmp/`, `temp/` or task-created paths, inspect the target and ask. Shipped settings do not prompt for recursive deletion; read `.claude/docs/configuration/README.md` when adding project-specific ask/deny rules.

**Hygiene:** lint before commit; test before push without hiding failures. Keep commits focused, use conventional messages, and exclude secrets and credentials.

## Bulk Edit Safety (MANDATORY for multi-file replacements)

When performing bulk find/replace across 3+ files:

1. **Preserve syntax integrity** — Never insert comments that break language syntax (e.g., `ClassName // comment<T>` breaks C# generics). Comments go AFTER complete type expressions.
2. **Grep verification** — After ALL replacements, grep entire repo for old term to catch missed references in docs, configs, catalog tables, tests.
3. **Doc cascade check** — When deleting/renaming components (agents, skills, hooks), map to affected docs:
    - `.claude/agents/**` → `.claude/docs/agents/README.md`, `.claude/docs/agents/agent-patterns.md`
    - `.claude/skills/**` → `.claude/docs/skills/README.md`
    - `.claude/hooks/**` → `.claude/docs/hooks/README.md`

## Doc Review (MANDATORY at session wrap-up)

After completing code changes, check for stale documentation:

1. Run `git diff --name-only` to list changed files
2. Map changed files to relevant docs:
    - Framework hook/skill/workflow files → their owning `.claude/docs/` references and any declared mirrors
    - Product code, tests, and docs → the canonical owners selected by `docs/project-config.json`, module metadata, and applicable project references (for example, the configured spec/test-case carrier or frontend/backend reference when that area is documented)
    - Generated context or mirror files → regenerate through their declared owner command; do not hand-edit generated outputs
    - `CLAUDE.md` structural changes → `.claude/docs/README.md` and the documented context/mirror sync route
3. Flag stale docs in final review task or update immediately
4. Output `No doc updates needed` if no mapping applies

**Use `/watzup` skill** for automatic end-of-session doc check.

---

## Closing Reminders

**MANDATORY IMPORTANT MUST ATTENTION** understand existing code FIRST — read, grep 3+ patterns before ANY modification (graph trace is optional advice)
**MANDATORY IMPORTANT MUST ATTENTION** follow formatters, conventions, and path-scoped style rules selected by project config or references; never assume blank lines encode dependencies
**MANDATORY IMPORTANT MUST ATTENTION** place logic with the owner selected by project config, references, accepted decisions, and existing code; do not assume a fixed layer hierarchy
**MANDATORY IMPORTANT MUST ATTENTION** ensure zero broken builds — code must compile with no syntax errors
**MANDATORY IMPORTANT MUST ATTENTION** follow YAGNI/KISS/DRY — no speculative abstractions
**MANDATORY IMPORTANT MUST ATTENTION** apply surgical changes (context-aware) — bug fix: diff test (every line traces to the bug). Review/enhancement: implement improvements you see AND announce them explicitly. Never silently scope-creep either way.
**MANDATORY IMPORTANT MUST ATTENTION** surface ambiguity before coding — list assumptions (scope/format/volume/constraints), present interpretations with effort estimates, push back when simpler exists. Never pick silently.
**MANDATORY IMPORTANT MUST ATTENTION** define overall task success criteria; verify the final result after all planned work, rather than routinely verifying every small step
**MANDATORY IMPORTANT MUST ATTENTION** tests verify intent — each meaningful test names the business rule/invariant it protects and must fail if that rule breaks
**MANDATORY IMPORTANT MUST ATTENTION** run doc review at session wrap-up (map changed files → affected docs)
**MANDATORY IMPORTANT MUST ATTENTION** activate relevant skills from catalog during the process
**MANDATORY IMPORTANT MUST ATTENTION** names express PURPOSE not CONTENT — "OrXxx/AndYyy" joining roles/types/statuses = content-driven = rename. "Or" in behavioral idioms (`FirstOrDefault`, `SuccessOrThrow`) is fine.
**MANDATORY IMPORTANT MUST ATTENTION** public/cross-layer abstractions express capability or domain contract, not provider/framework/transport; keep technical details on concrete adapters and verify the contract against callers and implementations.
