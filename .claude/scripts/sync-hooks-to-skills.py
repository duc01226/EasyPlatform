#!/usr/bin/env python3
"""
sync-hooks-to-skills.py
Inserts SYNC: blocks sourced from canonical (sync-inline-versions.md) into all
SKILL.md and agent .md files. Idempotent: skips files that already contain a block.

Tiered blocks (agents):
  Core-6 (every agent):
    - SYNC:critical-thinking-mindset
    - SYNC:ai-mistake-prevention
    - SYNC:sequential-thinking-protocol
    - SYNC:task-tracking-external-report
    - SYNC:project-reference-docs-guide
    - SYNC:agent-bootstrap
  Code-10 (Core-6 + 4, for code/review agents in CODE_AGENTS):
    - SYNC:understand-code-first
    - SYNC:evidence-based-reasoning
    - SYNC:cross-service-check
    - SYNC:fix-layer-accountability
  Readonly-Code-8 (Core-6 + 2, for read-only/design agents in READONLY_CODE_AGENTS):
    - SYNC:understand-code-first
    - SYNC:evidence-based-reasoning
    (EXCLUDES cross-service-check + fix-layer-accountability — those two are
    mutation-oriented and waste tokens on agents that only locate/read/design
    code and never fix at a layer or cross a service boundary.)
  agent-code-standards (gated INDEPENDENTLY by CODE_STANDARDS_AGENTS — NOT the
  same set as CODE_AGENTS): dev-rules + coding-pattern pointers for agents that
  write/modify/review/debug/optimize/test code. Appended on top of whichever tier
  (Core or Code) the agent already has. Non-code-standards agents never receive it.
Skills keep the original 2-block SKILL_BLOCK_ORDER (no skills regression).

Agent tier is set by explicit CODE_AGENTS / READONLY_CODE_AGENTS /
CORE_ONLY_AGENTS membership; an agent in none of the three sets (or in more than
one) raises (no silent default).
agent-code-standards membership (CODE_STANDARDS_AGENTS) is a SEPARATE axis: an
agent can be in CODE_AGENTS (code-investigation tier) yet NOT in
CODE_STANDARDS_AGENTS (e.g. researcher/scout/ui-ux-designer read or locate code
but do not author/review it), and vice versa.

Insertion point: all SYNC blocks (main + :reminder variants) are inserted as ONE
group in the bottom zone, immediately BEFORE the `## Closing Reminders` section
(or appended at EOF when that section is absent). Main blocks precede reminder
variants. Canonical layout: ...main body... -> SYNC main -> SYNC reminders ->
## Closing Reminders. Markers are emitted left-flush (matches refactor_*_layout.py).
"""

import os
import re
import sys
import glob as glob_module

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ─── Canonical block content ────────────────────────────────────────────────

BLOCKS = {
    "critical-thinking-mindset": """\
<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->""",

    "ai-mistake-prevention": """\
<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
**Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
**Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
**Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
**Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
**Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
**Assume existing values are intentional — ask WHY before changing.** Before changing a constant, limit, flag, wording, or pattern, read nearby context and history.
**Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
**Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->""",

    "sequential-thinking-protocol": """\
<!-- SYNC:sequential-thinking-protocol -->

> **Sequential Thinking Protocol** — Structured multi-step reasoning for complex/ambiguous work. Use when planning, reviewing, debugging, or refining ideas where one-shot reasoning is unsafe.
>
> **Trigger when:** complex problem decomposition · adaptive plans needing revision · analysis with course correction · unclear/emerging scope · multi-step solutions · hypothesis-driven debugging · cross-cutting trade-off evaluation.
>
> **Format (explicit mode — visible thought trail):**
>
> 1. `Thought N/M: [aspect]` — one aspect per thought, state assumptions/uncertainty
> 2. `Thought N/M [REVISION of Thought K]: ...` — when prior reasoning invalidated; state Original / Why revised / Impact
> 3. `Thought N/M [BRANCH A from Thought K]: ...` — explore alternative; converge with decision rationale
> 4. `Thought N/M [HYPOTHESIS]: ...` then `[VERIFICATION]: ...` — test before acting
> 5. `Thought N/N [FINAL]` — only when verified, all critical aspects addressed, confidence >80%
>
> **Mandatory closers:** Confidence % stated · Assumptions listed · Open questions surfaced · Next action concrete.
>
> **Stop conditions:** confidence <80% on any critical decision → escalate via AskUserQuestion · ≥3 revisions on same thought → re-frame the problem · branch count >3 → split into sub-task.
>
> **Implicit mode:** apply methodology internally without visible markers when adding markers would clutter the response (routine work where reasoning aids accuracy).
>
> **Deep-dive:** see `/sequential-thinking` skill (`.claude/skills/sequential-thinking/SKILL.md`) for worked examples (API design, debugging, architecture), advanced techniques (spiral refinement, hypothesis testing, convergence), and meta-strategies (uncertainty handling, revision cascades).

<!-- /SYNC:sequential-thinking-protocol -->""",

    "task-tracking-external-report": """\
<!-- SYNC:task-tracking-external-report -->

> **Task Tracking & External Report Persistence** — Bootstrap this before execution; then run project-reference doc prefetch before target/source work.
>
> 1. Create a small task breakdown before target file reads, grep, edits, or analysis. On context loss, inspect the current task list first.
> 2. Mark one task `in_progress` before work and `completed` immediately after evidence; never batch transitions.
> 3. For plan/review work, create `plans/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` before first finding.
> 4. Append findings after each file/section/decision and synthesize from the report file at the end.
> 5. Final output cites `Full report: plans/reports/{filename}`.
>
> **Blocked until:** task breakdown exists, report path declared for plan/review work, first finding persisted before the next finding.

<!-- /SYNC:task-tracking-external-report -->""",

    "project-reference-docs-guide": """\
<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate** — Run after task-tracking bootstrap and before target/source file reads, grep, edits, or analysis. Project docs override generic framework assumptions.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`; behavior/public-contract/spec-test-code sync `workflow-spec-test-code-cycle-reference.md`; derived spec index/ERD/reimplementation guides `spec-system-reference.md` + source Feature Specs under `docs/specs/`; architecture/new area `project-structure-reference.md`.
> 3. Read every required doc. If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `/project-init` or the narrow lower-level route (`/project-config`, `/docs-init`, `/scan-all`, `/scan --target=<key>`, `/claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `/sync-codex`; do not auto-run it.
> 4. Before target work, state: `Reference docs read: ... | Not applicable: ...`.
>
> **Ready when:** scope evaluated, required docs checked/read or setup route completed, `lessons.md` confirmed, citation emitted.

<!-- /SYNC:project-reference-docs-guide -->""",

    "understand-code-first": """\
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

<!-- /SYNC:understand-code-first -->""",

    "evidence-based-reasoning": """\
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

<!-- /SYNC:evidence-based-reasoning -->""",

    "cross-service-check": """\
<!-- SYNC:cross-service-check -->

> **Cross-Service Check** — Microservices/event-driven: MANDATORY before concluding investigation, plan, spec, or feature doc. Missing downstream consumer = silent regression.
>
> | Boundary            | Grep terms                                                                      |
> | ------------------- | ------------------------------------------------------------------------------- |
> | Event producers     | `Publish`, `Dispatch`, `Send`, `emit`, `EventBus`, `outbox`, `IntegrationEvent` |
> | Event consumers     | `Consumer`, `EventHandler`, `Subscribe`, `@EventListener`, `inbox`              |
> | Sagas/orchestration | `Saga`, `ProcessManager`, `Choreography`, `Workflow`, `Orchestrator`            |
> | Sync service calls  | HTTP/gRPC calls to/from other services                                          |
> | Shared contracts    | OpenAPI spec, proto, shared DTO — flag breaking changes                         |
> | Data ownership      | Other service reads/writes same table/collection → Shared-DB anti-pattern       |
>
> **Per touchpoint:** owner service · message name · consumers · risk (NONE / ADDITIVE / BREAKING).
>
> **BLOCKED until:** Producers scanned · Consumers scanned · Sagas checked · Contracts reviewed · Breaking-change risk flagged

<!-- /SYNC:cross-service-check -->""",

    "fix-layer-accountability": """\
<!-- SYNC:fix-layer-accountability -->

> **Fix-Layer Accountability** — NEVER fix at the crash site. Trace the full flow, fix at the owning layer.
>
> AI default behavior: see error at Place A → fix Place A. This is WRONG. The crash site is a SYMPTOM, not the cause.
>
> **MANDATORY before ANY fix:**
>
> 1. **Trace full data flow** — Map the complete path from data origin to crash site across ALL layers (storage → backend → API → frontend → UI). Identify where the bad state ENTERS, not where it CRASHES.
> 2. **Identify the invariant owner** — Which layer's contract guarantees this value is valid? That layer is responsible. Fix at the LOWEST layer that owns the invariant — not the highest layer that consumes it.
> 3. **One fix, maximum protection** — Ask: "If I fix here, does it protect ALL downstream consumers with ONE change?" If fix requires touching 3+ files with defensive checks, you are at the wrong layer — go lower.
> 4. **Verify no bypass paths** — Confirm all data flows through the fix point. Check for: direct construction skipping factories, clone/spread without re-validation, raw data not wrapped in domain models, mutations outside the model layer.
>
> **BLOCKED until:** `- [ ]` Full data flow traced (origin → crash) `- [ ]` Invariant owner identified with `file:line` evidence `- [ ]` All access sites audited (grep count) `- [ ]` Fix layer justified (lowest layer that protects most consumers)
>
> **Anti-patterns (REJECT these):**
>
> - "Fix it where it crashes" — Crash site ≠ cause site. Trace upstream.
> - "Add defensive checks at every consumer" — Scattered defense = wrong layer. One authoritative fix > many scattered guards.
> - "Both fix is safer" — Pick ONE authoritative layer. Redundant checks across layers send mixed signals about who owns the invariant.

<!-- /SYNC:fix-layer-accountability -->""",

    "agent-bootstrap": """\
<!-- SYNC:agent-bootstrap -->

> **Plan first, then act.** Break work into small tasks before editing; keep exactly one task in progress; mark each complete immediately after its evidence lands. On context loss, inspect the existing task list before creating new tasks.
>
> **Context guard / progress file (MANDATORY when task > 5 files or > 3 steps).** Context exhaustion = silent loss of ALL findings; no progress file = no recovery.
>
> 1. **On start:** create `tmp/ck-agent-{ts}-{rnd}.progress.md` — `ts` = current timestamp in `YYYYMMDDHHmmssSSS` (17 digits), `rnd` = random 6-char hex. First line records the session id.
> 2. **After each step:** append findings, marking `[done]` / `[partial]` / `[pending]`.
> 3. **Running out of context?** Write `[partial]` to the file FIRST — NEVER summarize before writing.
> 4. **Producing a report?** Persist it incrementally to `plans/reports/` and start the final message with its path.
>
> **Blocked until:** task breakdown exists · progress file created when the task exceeds the size threshold.

<!-- /SYNC:agent-bootstrap -->""",

    "agent-code-standards": """\
<!-- SYNC:agent-code-standards -->

> **Development rules.** YAGNI / KISS / DRY. Place logic in the LOWEST layer (Entity/Model > Service > Component/Handler) — mapping → Command/DTO, constants → Model. Kebab-case files. Search 3+ existing patterns before writing new code; read existing code before changing it. Read `.claude/docs/development-rules.md` for full coding standards, quality gates, and the pre-commit checklist (when present).
>
> **Coding patterns.** Before implementing, read the project pattern references named in `docs/project-config.json` / the docs index (e.g. `docs/project-reference/backend-patterns-reference.md`, `frontend-patterns-reference.md`) — local conventions override generic framework defaults.
>
> **Blocked until:** dev-rules + pattern docs read before writing or changing code.

<!-- /SYNC:agent-code-standards -->""",
}

REMINDERS = {
    "critical-thinking-mindset": """\
  <!-- SYNC:critical-thinking-mindset:reminder -->
**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.
  <!-- /SYNC:critical-thinking-mindset:reminder -->""",

    "ai-mistake-prevention": """\
  <!-- SYNC:ai-mistake-prevention:reminder -->
**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.
  <!-- /SYNC:ai-mistake-prevention:reminder -->""",

    "sequential-thinking-protocol": """\
  <!-- SYNC:sequential-thinking-protocol:reminder -->
**MUST ATTENTION** apply sequential-thinking — multi-step Thought N/M, REVISION/BRANCH/HYPOTHESIS markers, confidence % closer; see `/sequential-thinking` skill.
  <!-- /SYNC:sequential-thinking-protocol:reminder -->""",

    "task-tracking-external-report": """\
  <!-- SYNC:task-tracking-external-report:reminder -->
- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `plans/reports/` incrementally and synthesize from disk.
  <!-- /SYNC:task-tracking-external-report:reminder -->""",

    "project-reference-docs-guide": """\
  <!-- SYNC:project-reference-docs-guide:reminder -->
- **MANDATORY** After task-tracking bootstrap and before target/source work, read required project-reference docs and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project conventions override generic defaults.
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing or stale, auto-run `/project-init` or the narrow lower-level route before ordinary project-specific work.
  <!-- /SYNC:project-reference-docs-guide:reminder -->""",

    "cross-service-check": """\
  <!-- SYNC:cross-service-check:reminder -->
**IMPORTANT MUST ATTENTION** microservices/event-driven: scan producers, consumers, sagas, contracts in task scope. Per touchpoint: owner · message · consumers · risk (NONE/ADDITIVE/BREAKING). Missing consumer = silent regression.
  <!-- /SYNC:cross-service-check:reminder -->""",
}

# ─── Tier ordering ───────────────────────────────────────────────────────────
# Skills keep the original 2-block order (no skills regression).
SKILL_BLOCK_ORDER = ["critical-thinking-mindset", "ai-mistake-prevention"]

# Core: every agent. (critical-thinking + ai-mistake already present in agents.)
# agent-bootstrap (Phase 03): self-contained subagent startup contract for hookless
# harnesses (Codex has no SubagentStart hook). Regenerated from canonical
# via sync-update-blocks.py agent-bootstrap.
CORE_BLOCK_ORDER = [
    "critical-thinking-mindset",
    "ai-mistake-prevention",
    "sequential-thinking-protocol",
    "task-tracking-external-report",
    "project-reference-docs-guide",
    "agent-bootstrap",
]

# Code-10: Core-6 + 4 code-investigation blocks for agents that read/review code.
CODE_BLOCK_ORDER = CORE_BLOCK_ORDER + [
    "understand-code-first",
    "evidence-based-reasoning",
    "cross-service-check",
    "fix-layer-accountability",
]

# Readonly-Code-8: Core-6 + understand-code-first + evidence-based-reasoning for
# read-only/design agents that locate/read/design code but never fix a layer or
# cross a service boundary. EXCLUDES cross-service-check + fix-layer-accountability
# (mutation-oriented — over-propagating them to these agents wastes tokens).
READONLY_CODE_BLOCK_ORDER = CORE_BLOCK_ORDER + [
    "understand-code-first",
    "evidence-based-reasoning",
]

# Explicit tier membership by agent basename. find_target_files() raises on any
# agent in none of the three sets (or in more than one) — no silent default.
# Mirrors the regression test's completeness assertion so tooling + test enforce
# one invariant.
CODE_AGENTS = {
    "architect", "backend-developer", "code-reviewer", "code-simplifier",
    "database-admin", "debugger", "e2e-runner", "framework-maintainer", "frontend-developer",
    "fullstack-developer", "integration-tester", "performance-optimizer",
    "planner", "security-auditor",
    "solution-architect", "spec-compliance-reviewer", "tester",
}
# Read-only/design agents: full code-investigation reading discipline
# (understand-code-first + evidence-based-reasoning) but NOT the mutation-oriented
# cross-service-check + fix-layer-accountability blocks — they locate/read/design
# code, they do not fix at a layer or evaluate a service-boundary change.
READONLY_CODE_AGENTS = {
    "researcher", "scout", "scout-external", "ui-ux-designer",
}
CORE_ONLY_AGENTS = {
    "business-analyst", "docs-manager", "git-manager", "journal-writer",
    "knowledge-worker", "product-owner", "project-manager", "quality-gate-review",
}

# agent-code-standards audience — SEPARATE axis from CODE_AGENTS. Only agents that
# author/modify/review/debug/optimize/test production or framework code. An agent
# in CODE_AGENTS may be excluded here (researcher/scout/scout-external research or
# locate code but do not author/review it; ui-ux-designer produces design artifacts).
# Membership is NOT validated against the disk set the way CODE/CORE_ONLY are — it is
# a pure inclusion list; absence simply means "no code-standards block".
CODE_STANDARDS_AGENTS = {
    "architect", "backend-developer", "code-reviewer", "code-simplifier",
    "database-admin", "debugger", "e2e-runner", "framework-maintainer",
    "frontend-developer", "fullstack-developer", "integration-tester",
    "performance-optimizer", "planner", "security-auditor", "solution-architect",
    "spec-compliance-reviewer", "tester",
}


# ─── File discovery ──────────────────────────────────────────────────────────

def find_target_files(agents_only=False):
    """Return [(path, block_order)] — skills get SKILL_BLOCK_ORDER; each agent is
    classified by explicit tier membership. Raises SystemExit on any agent that is
    unclassified or double-classified (no silent default).
    agents_only=True skips skills (scope a run to .claude/agents)."""
    skills_pattern = os.path.join(PROJECT_DIR, ".claude", "skills", "*", "SKILL.md")
    agents_pattern = os.path.join(PROJECT_DIR, ".claude", "agents", "*.md")

    targets = [] if agents_only else [
        (path, SKILL_BLOCK_ORDER) for path in sorted(glob_module.glob(skills_pattern))
    ]

    for path in sorted(glob_module.glob(agents_pattern)):
        name = os.path.splitext(os.path.basename(path))[0]
        in_code = name in CODE_AGENTS
        in_readonly = name in READONLY_CODE_AGENTS
        in_core = name in CORE_ONLY_AGENTS
        # Exactly one tier per agent — no silent default, no double-classify.
        tier_count = in_code + in_readonly + in_core
        if tier_count > 1:
            raise SystemExit(
                f"Agent '{name}' is in MORE THAN ONE tier set "
                f"(CODE_AGENTS / READONLY_CODE_AGENTS / CORE_ONLY_AGENTS) - "
                f"put it in exactly one (edit {os.path.basename(__file__)})."
            )
        if tier_count == 0:
            raise SystemExit(
                f"Unclassified agent: '{name}' - add it to CODE_AGENTS, "
                f"READONLY_CODE_AGENTS, or CORE_ONLY_AGENTS "
                f"(edit {os.path.basename(__file__)})."
            )
        # Build a fresh list per agent (never mutate the shared *_BLOCK_ORDER
        # constants). agent-code-standards is gated on the SEPARATE
        # CODE_STANDARDS_AGENTS axis and appended for code-standards agents only.
        if in_code:
            order = list(CODE_BLOCK_ORDER)
        elif in_readonly:
            order = list(READONLY_CODE_BLOCK_ORDER)
        else:
            order = list(CORE_BLOCK_ORDER)
        if name in CODE_STANDARDS_AGENTS:
            order.append("agent-code-standards")
        targets.append((path, order))

    return targets


# ─── Insertion logic ─────────────────────────────────────────────────────────

def find_closing_reminders_start(lines):
    """Index of the `## Closing Reminders` heading line, or -1 if absent."""
    for i, line in enumerate(lines):
        if line.strip().startswith("## Closing Reminders"):
            return i
    return -1


def _normalize_block(text):
    """Strip the block and left-flush its SYNC marker lines (canonical form)."""
    out = []
    for ln in text.strip().splitlines():
        stripped = ln.lstrip()
        if stripped.startswith("<!-- SYNC:") or stripped.startswith("<!-- /SYNC:"):
            out.append(stripped)
        else:
            out.append(ln)
    return "\n".join(out)


def block_present(content, block_name):
    return f"<!-- SYNC:{block_name} -->" in content or f"<!-- SYNC:{block_name}:reminder -->" in content


# Idempotent fence repair: a real SYNC fence must sit at column 0 (the balance
# guard TC-UAR-006 counts only `^<!-- /?SYNC:`). A standalone fence line that got
# whitespace-indented is a malformed fence — flush it back to column 0. This is
# the present-but-malformed class process_file's missing-block check would skip
# (block_present() is True), so without this repair such a defect is "stuck".
# Scope is deliberately narrow: ONLY lines that are whitespace + a single fence
# marker. Blockquote (`>`-prefixed) and inline/backtick fence examples are left
# untouched — they are documentation, not real fences, and never counted.
FENCE_FLUSH_RE = re.compile(r"^[ \t]+(<!-- /?SYNC:[^\n]*?-->)[ \t]*$", re.MULTILINE)


def normalize_fences(text):
    """Flush whitespace-indented standalone SYNC fence lines to column 0."""
    return FENCE_FLUSH_RE.sub(r"\1", text)


def process_file(path, block_order, dry_run=False):
    with open(path, "r", encoding="utf-8") as f:
        original = f.read()

    # Repair malformed (indented) fences first so the work is idempotent even when
    # no block is missing — covers present-but-malformed blocks (see TC-UAR-006).
    content = normalize_fences(original)
    lines = content.splitlines()

    missing_blocks = [name for name in block_order if not block_present(content, name)]
    # Reminder backfill is deliberately coupled to fresh main-block insertion.
    # A block qualifies only if (a) it HAS a reminder variant — the code blocks
    # beyond cross-service-check have none, KeyError otherwise — AND (b) its MAIN
    # block is also absent. The `main not in original` clause is an INTENTIONAL
    # retrofit guard, not dead code: the generator bootstraps brand-new files with
    # main+reminder together, but never retrofits a reminder onto a file that
    # already carries the main block and deliberately omits the reminder (e.g.
    # workflow-* orchestration skills). Do NOT drop the 3rd clause — verified:
    # removing it retrofits 32 reminders across 16 workflow/setup skills.
    missing_reminders = [name for name in block_order
                         if name in REMINDERS
                         and f"<!-- SYNC:{name}:reminder -->" not in content
                         and f"<!-- SYNC:{name} -->" not in content]

    if not missing_blocks and not missing_reminders:
        # Nothing to insert — but a fence repair may still have changed content.
        if content != original:
            if not dry_run:
                with open(path, "w", encoding="utf-8", newline="\n") as f:
                    f.write(content)
            return "updated"
        return "skip"

    # Canonical layout: all SYNC blocks live in the bottom zone — main blocks
    # first, then :reminder variants — inserted as ONE group immediately BEFORE
    # the `## Closing Reminders` section (or appended at EOF when it is absent).
    chunks = [_normalize_block(BLOCKS[name]) for name in block_order if name in missing_blocks]
    chunks += [_normalize_block(REMINDERS[name]) for name in block_order if name in missing_reminders]
    block_text = "\n\n".join(chunks)

    insert_idx = find_closing_reminders_start(lines)
    if insert_idx == -1:
        new_content = content.rstrip("\n") + "\n\n" + block_text + "\n"
    else:
        before = "\n".join(lines[:insert_idx]).rstrip("\n")
        after = "\n".join(lines[insert_idx:]).rstrip("\n")
        new_content = before + "\n\n" + block_text + "\n\n" + after + "\n"

    if not dry_run:
        with open(path, "w", encoding="utf-8", newline="\n") as f:
            f.write(new_content)

    return "updated"


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    dry_run = "--dry-run" in sys.argv
    verbose = "--verbose" in sys.argv or "-v" in sys.argv
    agents_only = "--agents-only" in sys.argv

    targets = find_target_files(agents_only=agents_only)
    if not targets:
        print("No target files found. Check PROJECT_DIR.")
        sys.exit(1)

    updated = 0
    skipped = 0
    errors = []

    for path, block_order in targets:
        rel = os.path.relpath(path, PROJECT_DIR)
        try:
            result = process_file(path, block_order, dry_run=dry_run)
            if result == "updated":
                updated += 1
                if verbose:
                    print(f"  [updated] {rel}")
            else:
                skipped += 1
                if verbose:
                    print(f"  [skip]    {rel}")
        except Exception as e:
            errors.append((rel, str(e)))
            print(f"  [ERROR]   {rel}: {e}")

    mode = "(dry-run) " if dry_run else ""
    print(f"\n{mode}Done: {updated} updated, {skipped} skipped, {len(errors)} errors / {len(targets)} total files")
    if errors:
        print("\nErrors:")
        for rel, msg in errors:
            print(f"  {rel}: {msg}")
        sys.exit(1)


if __name__ == "__main__":
    main()
