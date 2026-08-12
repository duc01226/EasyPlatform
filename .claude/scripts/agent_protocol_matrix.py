#!/usr/bin/env python3
"""Agent <-> quality-protocol-block adoption matrix (single source of truth).

WHY THIS FILE EXISTS
--------------------
Sub-agents under ``.claude/agents/*.md`` are wired into block *body* sync
(``sync-update-blocks.py`` targets agents too), but the role-specific
``inject_*`` coverage campaigns only ever targeted *skills*. Result: every
agent carries the same generic baseline and ZERO role-specific rigor -- the
flagship ``code-reviewer`` agent had none of the 14 review-quality blocks its
twin ``code-review`` / ``changes-review`` skills carry. This module is the
manifest that closes that gap: per-agent, which QUALITY blocks to ADD.

POLICY: QUALITY propagates, ORCHESTRATION does not
--------------------------------------------------
Skill protocol blocks split into two classes (research/agent-skill-mapping.md
section 3). Only the first propagates to a headless leaf sub-agent:

  * QUALITY / RIGOR  -> adopt into agents (severity-rubric,
    root-cause-debugging, estimation-framework, ...). These raise the craft of
    the agent's own output when the block matches the agent's role.
    Review-cycle quality blocks are additionally constrained by
    ``REVIEW_CYCLE_AGENTS`` below.
  * ORCHESTRATION / INTERACTION  -> do NOT blanket-copy (``EXCLUDED_ORCHESTRATION``
    below). A sub-agent runs headless under a caller: it does not expand workflow
    steps, does not choose/return-contract its own sub-agents, and does not drive
    the AskUserQuestion dialog. Copying these would tell the agent to perform
    actions it structurally cannot. The ONE exception is curated per-agent in
    ``ORCHESTRATION_WHITELIST`` (framework-maintainer reasons ABOUT sub-agent
    design as its subject matter, so ``sub-agent-selection`` is content for it).

CANONICAL-SOURCE RULE
---------------------
This module stores only block *names* (tags). The block *bodies* are ALWAYS
sourced at injection time from the canonical registry
``.claude/skills/shared/sync-inline-versions.md`` via
``sync_blocks.load_wrapped_sync_block`` -- never hand-typed here. ``validate()``
hard-fails on any tag absent from that registry (catches hallucinated tags).

TARGET-SET INVARIANT
--------------------
Each agent's list is the FULL set of quality blocks that agent should carry --
a persistent declarative target, not a one-shot delta. A block the agent already
carries STAYS listed: the manifest is the single source of truth for intended
per-agent state, so an audit can read the target here instead of reconstructing
it from 26 agent files.

Injection is therefore idempotent, not additive. The injector skips a block the
agent already carries (``inject_agent_protocol_blocks.py`` marks it ``present``)
and writes only the absent ones, so the REAL dry-run insert count is the number
of declared blocks NOT yet present -- see ``pending_insertions()``. Never report
the manifest's size as an insert count; at steady state every block is present
and a real run inserts zero.

``validate()`` check (c) warns on the inverse condition: a declared block MISSING
from its agent, meaning the manifest moved ahead of the agent files and the
injector has not been run.

SPAWN-CAPABILITY GUARD (/why-review F-WR2)
------------------------------------------
``SPAWN_INSTRUCTING_BLOCKS`` literally instruct the agent to spawn ``Agent`` /
``Task`` sub-agents. ``validate()`` hard-fails if any agent assigned one of these
lacks ``Agent``/``Task`` in its frontmatter ``tools`` (and is not an all-tools
grant). Zero violations today (every spawn-instructed agent is all-tools); the
guard catches the silent future failure mode where a no-spawn agent inherits a
block instructing an impossible action.

AGENT TIER POLICY (mirror sync-hooks-to-skills.py + TC-UAR-004)
--------------------------------------------------------------
``CODE_TIER_TAGS`` are code-investigation blocks that belong ONLY on
code-touching agents. A ``CORE_ONLY`` agent (research/docs/product/governance
role) must carry NONE of them -- the framework enforces this via TC-UAR-004.
``validate()`` check (e) mirrors that rule so a tier leak (e.g. a research agent
inheriting ``understand-code-first``) hard-fails HERE, before injection, instead
of slipping through to the framework test gate.

CONSUMERS
---------
``inject_agent_protocol_blocks.py`` imports ``AGENT_QUALITY_BLOCKS``,
``FAMILIES``, ``EXCLUDED_ORCHESTRATION`` and ``SPAWN_INSTRUCTING_BLOCKS`` from
here. Run ``python .claude/scripts/agent_protocol_matrix.py --validate`` to
self-check before any injection.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_CLAUDE_DIR = Path(__file__).resolve().parent.parent  # .../.claude
CANONICAL = _CLAUDE_DIR / "skills" / "shared" / "sync-inline-versions.md"
AGENTS_DIR = _CLAUDE_DIR / "agents"

# ---------------------------------------------------------------------------
# Orchestration policy
# ---------------------------------------------------------------------------
# Blocks that drive main-loop orchestration / user interaction. A headless leaf
# sub-agent cannot act on these, so they must NOT propagate into agent files.
EXCLUDED_ORCHESTRATION = {
    "nested-task-creation",       # expands a workflow step's child phase tasks
    "sub-agent-selection",        # a dispatcher choosing which sub-agents to spawn
    "subagent-return-contract",   # instructs *its* sub-agents how to return (inverted for a leaf)
    "parallel-phase-advancement", # all-return barrier across a parallel workflow phase group
    # Session-scoped goal-file loop owned by the CALLER, not a leaf agent: step 1
    # resolves the goal from "the current user request" (a sub-agent sees only its
    # task prompt, never the parent conversation), step 6 drives the review->fix
    # ->re-review convergence loop, and step 7 escalates to the user. A headless
    # leaf cannot do any of the three. Its per-finding rigor twin
    # ``trade-off-interrogation-gate`` (same 20 review skills) DOES propagate --
    # that block explicitly defines non-asking sub-agent behaviour.
    "goal-contract-satisfaction-loop",
}

# Per-agent exceptions: a normally-excluded block IS legitimate content for this
# agent because the agent reasons ABOUT that block's subject matter.
ORCHESTRATION_WHITELIST = {
    "framework-maintainer": {"sub-agent-selection"},  # designs agents -> selection is its domain
}

# Blocks whose body literally instructs the agent to spawn Agent/Task sub-agents.
# An agent assigned one of these MUST have Agent/Task (or an all-tools grant).
SPAWN_INSTRUCTING_BLOCKS = {
    "fresh-context-review",
    "review-protocol-injection",
}

# Review-cycle blocks are only relevant to agents whose primary job includes
# adversarial review, fix-cycle validation, or review-gate orchestration.
REVIEW_CYCLE_TAGS = {
    "fresh-context-review",
    "double-round-trip-review",
    "review-protocol-injection",
}
REVIEW_CYCLE_AGENTS = {
    "architect",
    "code-reviewer",
    "integration-tester",
    "planner",
    "quality-gate-review",
    "security-auditor",
    "spec-compliance-reviewer",
    "ui-ux-designer",
}

# Code-investigation tags that may live ONLY on code-touching agents. A CORE_ONLY
# agent (research/docs/product/governance role) carrying any of these is a tier
# leak the framework rejects (TC-UAR-004). Kept in sync with
# sync-hooks-to-skills.py CODE_TAGS and agent-universal-rules.test.cjs CORE_ONLY.
CODE_TIER_TAGS = {
    "understand-code-first",
    "evidence-based-reasoning",
    "cross-service-check",
    "fix-layer-accountability",
}
CORE_ONLY_AGENTS = {
    "business-analyst", "docs-manager", "git-manager", "journal-writer",
    "knowledge-worker", "product-owner", "project-manager", "quality-gate-review",
}

# CODE_TIER_TAGS splits on a second axis (agent-universal-rules.test.cjs TC-UAR-004):
# READONLY_CODE agents locate/read code but never mutate it, so they carry the
# reading-discipline tags ONLY. Assigning a MUTATION tag to one is a tier leak the
# framework test rejects -- guarded by check (g) so it fails HERE, not at the gate.
MUTATION_CODE_TAGS = {
    "cross-service-check",
    "fix-layer-accountability",
}
READONLY_CODE_AGENTS = {
    "researcher", "scout", "scout-external", "ui-ux-designer",
}

# Blocks deliberately REMOVED from a carrier as off-role (TC-UAR-016). Re-adding one
# silently regresses that decision, so check (h) hard-fails on it. Mirrors the
# ``removed`` manifest in agent-universal-rules.test.cjs.
OFF_ROLE_TRIMS = {
    "architect": {"source-test-drift-check", "scaffold-production-readiness"},
}

# ---------------------------------------------------------------------------
# Agent -> additive quality-block lists (source: research/agent-skill-mapping.md
# section 4; grouped per family for --family-scoped injection of <=5 agents/phase)
# ---------------------------------------------------------------------------
AGENT_QUALITY_BLOCKS = {
    # --- review family ---------------------------------------------------
    "code-reviewer": [
        "severity-rubric", "systematic-review-batching", "category-review-thinking",
        "fresh-context-review", "double-round-trip-review", "logic-and-intention-review",
        "review-protocol-injection", "bug-detection", "complexity-prevention",
        "design-patterns-quality", "rationalization-prevention",
        "graph-assisted-investigation", "source-test-drift-check", "test-spec-verification",
        # wave 2 (twin: code-review / changes-review)
        "trade-off-interrogation-gate", "cross-stack-impact-trace", "spec-drift-adjudication",
        "integration-test-sync-check",
    ],
    "security-auditor": [
        "severity-rubric", "systematic-review-batching", "category-review-thinking",
        "fresh-context-review", "graph-assisted-investigation", "incremental-persistence",
        "source-test-drift-check",
        # wave 2 (twin: security-review)
        "trade-off-interrogation-gate", "double-round-trip-review",
    ],
    "performance-optimizer": [
        "severity-rubric", "systematic-review-batching", "category-review-thinking",
        "graph-assisted-investigation", "graph-impact-analysis",
        # wave 2 (twin: performance-review)
        "trade-off-interrogation-gate", "scenario-stress-eval",
    ],
    "spec-compliance-reviewer": [
        "severity-rubric", "double-round-trip-review", "fresh-context-review",
        "review-protocol-injection", "behavioral-delta-matrix", "spec-drift-adjudication",
        "test-spec-verification",
        # wave 2 (twin: artifact-review / spec)
        "trade-off-interrogation-gate", "spec-tests-code-triangulation", "ui-intent-layer",
    ],
    "quality-gate-review": [
        "severity-rubric", "double-round-trip-review", "fresh-context-review",
        "review-protocol-injection", "refinement-dor-checklist", "estimation-framework",
        # wave 2 (twin: quality-gate-review / quality-gate)
        "trade-off-interrogation-gate", "source-test-drift-check",
    ],

    # --- investigation / research family ---------------------------------
    "debugger": [
        "end-to-start-debugger-trace", "root-cause-debugging", "red-flag-stop-conditions",
        "graph-assisted-investigation", "incremental-persistence",
        # wave 2 (twin: debug-investigate / investigate)
        "test-failure-fault-adjudication", "source-test-drift-check",
    ],
    # NOTE: the `scout` SKILL carries `cross-service-check`, but scout/scout-external
    # are READONLY_CODE agents -- that tag is a MUTATION_CODE_TAG reserved for
    # code-mutating agents (TC-UAR-004). Deliberate non-parity; do NOT "fix".
    "scout": [
        "graph-assisted-investigation",
        "incremental-persistence", "rationalization-prevention",
    ],
    "scout-external": [
        "graph-assisted-investigation",
        "incremental-persistence", "rationalization-prevention",
    ],
    "researcher": [
        "web-research", "incremental-persistence", "output-quality-principles",
    ],
    "knowledge-worker": [
        "web-research", "incremental-persistence", "output-quality-principles",
        "severity-rubric",
        # wave 2 (twin: knowledge-review)
        "trade-off-interrogation-gate",
    ],

    # --- planning / product / architecture family ------------------------
    "planner": [
        "estimation-framework", "plan-quality", "plan-granularity",
        "iterative-phase-quality", "preservation-inventory", "behavioral-delta-matrix",
        "severity-rubric", "fresh-context-review", "double-round-trip-review",
        "graph-assisted-investigation", "review-protocol-injection",
        # wave 2 (twin: plan-review)
        "trade-off-interrogation-gate",
    ],
    "architect": [
        "severity-rubric", "systematic-review-batching", "category-review-thinking",
        "double-round-trip-review", "graph-assisted-investigation",
        "design-patterns-quality",
        # wave 2 (twin: architecture-design / architecture-review)
        # NOT source-test-drift-check: an explicit off-role trim for architect
        # (TC-UAR-016, commit 698195a5). Deliberate non-parity; do NOT "fix".
        "trade-off-interrogation-gate", "scale-technique-gate", "scenario-stress-eval",
    ],
    "solution-architect": [
        "design-patterns-quality", "scaffold-production-readiness",
        "estimation-framework", "module-detection",
        # wave 2 -- already carries the companion `scenario-stress-eval`; the base
        # gate it explicitly pairs with was missing (twin: tech-stack-research)
        "scale-technique-gate",
    ],
    "business-analyst": [
        "estimation-framework", "refinement-dor-checklist", "ba-team-decision-model",
        "ai-sdd-artifact-contract", "ui-wireframe",
    ],
    "product-owner": [
        "estimation-framework", "refinement-dor-checklist", "ui-wireframe",
    ],

    # --- test family -----------------------------------------------------
    "integration-tester": [
        "repeatable-test-principle", "source-test-drift-check", "red-flag-stop-conditions",
        "graph-impact-analysis", "incremental-persistence", "rationalization-prevention",
        "severity-rubric", "systematic-review-batching", "category-review-thinking",
        "fresh-context-review", "double-round-trip-review", "review-protocol-injection",
        # wave 2 (twin: integration-test / integration-test-review)
        "trade-off-interrogation-gate", "test-failure-fault-adjudication",
        "integration-test-execution-discipline", "spec-tests-code-triangulation",
        "spec-drift-adjudication", "test-data-isolation",
        "real-world-fidelity-testing",
    ],
    "tester": [
        "source-test-drift-check", "repeatable-test-principle",
        "test-spec-verification", "red-flag-stop-conditions",
        # wave 2 (twin: test)
        "test-failure-fault-adjudication", "real-world-fidelity-testing",
    ],
    "e2e-runner": [
        "source-test-drift-check", "repeatable-test-principle",
        # wave 2 (twin: e2e-test)
        "test-failure-fault-adjudication", "real-world-fidelity-testing",
    ],
    "database-admin": [
        "graph-impact-analysis",
        # wave 2 (twin: db-migrate)
        "source-test-drift-check",
    ],

    # --- design / craft / docs family ------------------------------------
    "ui-ux-designer": [
        "ui-system-context", "ui-wireframe", "design-system-check",
        "design-patterns-quality", "severity-rubric", "systematic-review-batching",
        "category-review-thinking", "double-round-trip-review", "fresh-context-review",
        "source-test-drift-check", "graph-assisted-investigation",
        # wave 2 (twin: ui-review / design / design-spec)
        "trade-off-interrogation-gate", "ui-intent-layer", "existing-ui-research",
    ],
    "code-simplifier": [
        "complexity-prevention", "design-patterns-quality", "severity-rubric",
        "shared-protocol-duplication-policy",
        # wave 2 (twin: code-simplifier)
        "source-test-drift-check",
    ],
    "docs-manager": [
        "incremental-persistence",
    ],
    "framework-maintainer": [
        "context-engineering-principles", "sub-agent-selection",  # sub-agent-selection whitelisted
        # wave 2 (twin: skill-creator / custom-agent) -- it EDITS SYNC blocks, so the
        # policy governing inline-protocol duplication is core subject matter for it
        "shared-protocol-duplication-policy", "output-quality-principles",
    ],

    # --- implementer family (no review twin -> role-derived blocks) ------
    # `ui-system-context` goes only to the two UI-touching implementers -- its body
    # gates on .ts/.html/.scss/.css work, so it is dead weight on backend-developer.
    "backend-developer": [
        "design-patterns-quality", "complexity-prevention",
        # wave 2 (twin: plan-execute / feature-implement)
        "source-test-drift-check", "graph-assisted-investigation",
    ],
    "frontend-developer": [
        "design-patterns-quality", "complexity-prevention",
        # wave 2 (twin: plan-execute / feature-implement)
        "source-test-drift-check", "graph-assisted-investigation", "ui-system-context",
    ],
    "fullstack-developer": [
        "design-patterns-quality", "complexity-prevention",
        # wave 2 (twin: plan-execute / feature-implement)
        "source-test-drift-check", "graph-assisted-investigation", "ui-system-context",
    ],
}

# ---------------------------------------------------------------------------
# Family grouping (drives --family-scoped injection). Every enhanced agent
# appears in EXACTLY ONE family; the union must equal AGENT_QUALITY_BLOCKS keys.
# ---------------------------------------------------------------------------
FAMILIES = {
    "review": [
        "code-reviewer", "security-auditor", "performance-optimizer",
        "spec-compliance-reviewer", "quality-gate-review",
    ],
    "investigation": [
        "debugger", "scout", "scout-external", "researcher", "knowledge-worker",
    ],
    "planning": [
        "planner", "architect", "solution-architect", "business-analyst", "product-owner",
    ],
    "test": [
        "integration-tester", "tester", "e2e-runner", "database-admin",
    ],
    "craft": [
        "ui-ux-designer", "code-simplifier", "docs-manager", "framework-maintainer",
    ],
    "implementer": [
        "backend-developer", "frontend-developer", "fullstack-developer",
    ],
}

# Agents intentionally OUT of scope (ops agents already at parity for their role).
EXCLUDED_AGENTS = {"git-manager", "journal-writer", "project-manager"}


# ---------------------------------------------------------------------------
# Canonical / frontmatter helpers
# ---------------------------------------------------------------------------
def canonical_tags(path: Path = CANONICAL) -> set[str]:
    """Return the set of base ``## SYNC:<tag>`` header names in the registry.

    Excludes ``:reminder`` / ``:full`` variants -- those are derived, and a
    target block is keyed by its base tag.
    """
    text = path.read_text(encoding="utf-8")
    return set(re.findall(r"^## SYNC:([a-z0-9-]+)\s*$", text, flags=re.MULTILINE))


def agent_present_tags(agent: str) -> set[str]:
    """Return the SYNC block tags currently present in an agent file (base tags)."""
    f = AGENTS_DIR / f"{agent}.md"
    if not f.exists():
        return set()
    text = f.read_text(encoding="utf-8")
    return set(re.findall(r"<!-- SYNC:([a-z0-9-]+) -->", text))


def pending_insertions() -> tuple[int, dict[str, list[str]]]:
    """Return ``(count, {agent: [absent_tags]})`` -- the REAL dry-run insert count.

    Under the TARGET-SET INVARIANT the manifest lists every block an agent should
    carry, so its size is NOT an insert count. The injector writes only blocks the
    agent lacks (it marks an already-present block ``present`` rather than
    inserting it), so the number a dry run would actually insert is exactly the
    declared-but-absent set computed here. At steady state this is ``0``.
    """
    absent: dict[str, list[str]] = {}
    for agent, blocks in AGENT_QUALITY_BLOCKS.items():
        present = agent_present_tags(agent)
        missing = [tag for tag in blocks if tag not in present]
        if missing:
            absent[agent] = missing
    return sum(len(tags) for tags in absent.values()), absent


def agent_tools(agent: str) -> str | None:
    """Return the raw ``tools:`` frontmatter value, or None if the field is absent.

    Absent ``tools:`` means the agent inherits ALL tools (Claude Code default).
    """
    f = AGENTS_DIR / f"{agent}.md"
    if not f.exists():
        return None
    text = f.read_text(encoding="utf-8")
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, flags=re.DOTALL)
    frontmatter = m.group(1) if m else text
    tm = re.search(r"^tools:\s*(.+)$", frontmatter, flags=re.MULTILINE)
    return tm.group(1).strip() if tm else None


def _has_spawn_capability(agent: str) -> bool:
    """True if the agent can spawn Agent/Task sub-agents (all-tools or explicit)."""
    raw = agent_tools(agent)
    if raw is None:
        return True  # no tools: line -> all tools inherited
    low = raw.lower()
    if "all tools" in low or raw.strip() == "*":
        return True
    return bool(re.search(r"\b(Agent|Task)\b", raw))


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------
def validate() -> tuple[list[str], list[str]]:
    """Return ``(errors, warnings)``. Empty ``errors`` == matrix is sound."""
    errors: list[str] = []
    warnings: list[str] = []

    union_blocks = {b for blocks in AGENT_QUALITY_BLOCKS.values() for b in blocks}

    # (a) every block name exists as ## SYNC:<tag> in canonical -- HARD FAIL.
    canon = canonical_tags()
    for tag in sorted(union_blocks):
        if tag not in canon:
            errors.append(f"(a) tag '{tag}' has no ## SYNC:{tag} header in canonical registry")

    # (b) no excluded-orchestration block leaks except its declared whitelist.
    for agent, blocks in AGENT_QUALITY_BLOCKS.items():
        allowed = ORCHESTRATION_WHITELIST.get(agent, set())
        for tag in blocks:
            if tag in EXCLUDED_ORCHESTRATION and tag not in allowed:
                errors.append(
                    f"(b) agent '{agent}' assigns excluded-orchestration block "
                    f"'{tag}' without a whitelist entry"
                )

    # partition (TC-003): union of FAMILIES == keys of AGENT_QUALITY_BLOCKS, no dup.
    fam_flat: list[str] = [a for members in FAMILIES.values() for a in members]
    fam_set = set(fam_flat)
    if len(fam_flat) != len(fam_set):
        dups = sorted({a for a in fam_flat if fam_flat.count(a) > 1})
        errors.append(f"(partition) agent(s) appear in >1 family: {dups}")
    keys = set(AGENT_QUALITY_BLOCKS)
    if fam_set != keys:
        missing = sorted(keys - fam_set)
        extra = sorted(fam_set - keys)
        if missing:
            errors.append(f"(partition) agents in matrix but no family: {missing}")
        if extra:
            errors.append(f"(partition) agents in a family but no matrix row: {extra}")
    overlap = keys & EXCLUDED_AGENTS
    if overlap:
        errors.append(f"(partition) excluded ops agent(s) wrongly enhanced: {sorted(overlap)}")

    # (c) target-set drift -- WARN ONCE when agent files trail the manifest.
    # Presence is the EXPECTED steady state under the TARGET-SET INVARIANT (the
    # manifest asserts what each agent SHOULD carry), so it is never warned -- a
    # warning that fires on every row carries no signal and trains the maintainer
    # to ignore the channel. The actionable condition is the inverse: a declared
    # block ABSENT from its agent means the injector has not been run.
    n_pending, pending_by_agent = pending_insertions()
    if n_pending:
        detail = ", ".join(
            f"{agent}:{len(tags)}" for agent, tags in sorted(pending_by_agent.items())
        )
        warnings.append(
            f"(c) {n_pending} declared block(s) absent from {len(pending_by_agent)} "
            f"agent(s) [{detail}] -- run inject_agent_protocol_blocks.py to apply "
            f"the target set"
        )

    # (d) spawn-capability guard (F-WR2) -- HARD FAIL.
    for agent, blocks in AGENT_QUALITY_BLOCKS.items():
        if set(blocks) & SPAWN_INSTRUCTING_BLOCKS and not _has_spawn_capability(agent):
            offenders = sorted(set(blocks) & SPAWN_INSTRUCTING_BLOCKS)
            errors.append(
                f"(d) agent '{agent}' assigned spawn-instructing block(s) {offenders} "
                f"but frontmatter tools '{agent_tools(agent)}' lacks Agent/Task"
            )

    # (e) tier policy (TC-UAR-004) -- HARD FAIL. A CORE_ONLY agent must carry NO
    # code-investigation tag; those belong only to code-touching agents.
    for agent, blocks in AGENT_QUALITY_BLOCKS.items():
        if agent in CORE_ONLY_AGENTS:
            leaked = sorted(set(blocks) & CODE_TIER_TAGS)
            if leaked:
                errors.append(
                    f"(e) core-only agent '{agent}' assigns code-tier tag(s) {leaked} "
                    f"(TC-UAR-004 forbids CODE_TAGS on core-only agents)"
                )

    # (f) review-cycle relevance -- HARD FAIL. Research/synthesis agents should
    # not inherit fix-cycle re-review or review-prompt-template mechanics.
    for agent, blocks in AGENT_QUALITY_BLOCKS.items():
        leaked = sorted(set(blocks) & REVIEW_CYCLE_TAGS)
        if leaked and agent not in REVIEW_CYCLE_AGENTS:
            errors.append(
                f"(f) agent '{agent}' assigns review-cycle tag(s) {leaked} "
                f"but is not in REVIEW_CYCLE_AGENTS"
            )

    # (g) readonly-code tier (TC-UAR-004) -- HARD FAIL. A READONLY_CODE agent reads
    # and locates code but never mutates it, so mutation-tier tags are off-role even
    # when its twin SKILL carries them.
    for agent, blocks in AGENT_QUALITY_BLOCKS.items():
        if agent in READONLY_CODE_AGENTS:
            leaked = sorted(set(blocks) & MUTATION_CODE_TAGS)
            if leaked:
                errors.append(
                    f"(g) readonly-code agent '{agent}' assigns mutation-tier tag(s) "
                    f"{leaked} (TC-UAR-004 restricts these to code-mutating agents)"
                )

    # (h) off-role trim regression (TC-UAR-016) -- HARD FAIL. A block deliberately
    # removed from a carrier must not be re-added by a later parity sweep.
    for agent, blocks in AGENT_QUALITY_BLOCKS.items():
        regressed = sorted(set(blocks) & OFF_ROLE_TRIMS.get(agent, set()))
        if regressed:
            errors.append(
                f"(h) agent '{agent}' re-adds off-role-trimmed block(s) {regressed} "
                f"(TC-UAR-016 requires these stay removed)"
            )

    return errors, warnings


def _main(argv: list[str]) -> int:
    if "--validate" not in argv:
        print("usage: python agent_protocol_matrix.py --validate")
        return 2

    if not CANONICAL.exists():
        print(f"FAIL: canonical registry not found at {CANONICAL}")
        return 1

    errors, warnings = validate()
    n_agents = len(AGENT_QUALITY_BLOCKS)
    n_declared = sum(len(b) for b in AGENT_QUALITY_BLOCKS.values())
    n_pending, _ = pending_insertions()

    for w in warnings:
        print(f"WARN {w}")
    if errors:
        for e in errors:
            print(f"FAIL {e}")
        print(f"\nFAIL: {len(errors)} error(s) across {n_agents} agents.")
        return 1

    print(
        f"OK: {n_agents} agents, {n_declared} declared block(s), "
        f"{n_pending} pending insert(s), "
        f"{len(FAMILIES)} families. All tags canonical; no orchestration leak; "
        f"partition clean; spawn-capability guard clear; tier policy clear; "
        "review-cycle relevance clear."
        + (f" ({len(warnings)} drift warning(s))" if warnings else "")
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(_main(sys.argv[1:]))
