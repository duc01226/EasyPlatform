#!/usr/bin/env python3
"""Agent <-> quality-protocol-block adoption matrix (single source of truth).

WHY THIS FILE EXISTS
--------------------
Sub-agents under ``.claude/agents/*.md`` are wired into block *body* sync
(``sync-update-blocks.py`` targets agents too), but the role-specific
``inject_*`` coverage campaigns only ever targeted *skills*. Result: every
agent carries the same generic baseline and ZERO role-specific rigor -- the
flagship ``code-reviewer`` agent had none of the 14 review-quality blocks its
twin ``code-review`` / ``review-changes`` skills carry. This module is the
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

ADDITIVE INVARIANT
------------------
Each agent's list is the set of blocks to ADD, computed by DIFFING the agent's
current ``SYNC:`` set against the target. A block the agent already carries must
NOT appear here -- a non-additive entry skews the injector's dry-run insert
count. ``validate()`` warns on any such already-present block.

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
    ],
    "security-auditor": [
        "severity-rubric", "systematic-review-batching", "category-review-thinking",
        "fresh-context-review", "graph-assisted-investigation", "incremental-persistence",
        "source-test-drift-check",
    ],
    "performance-optimizer": [
        "severity-rubric", "systematic-review-batching", "category-review-thinking",
        "graph-assisted-investigation", "graph-impact-analysis",
    ],
    "spec-compliance-reviewer": [
        "severity-rubric", "double-round-trip-review", "fresh-context-review",
        "review-protocol-injection", "behavioral-delta-matrix", "spec-drift-adjudication",
        "test-spec-verification",
    ],
    "quality-gate-review": [
        "severity-rubric", "double-round-trip-review", "fresh-context-review",
        "review-protocol-injection", "refinement-dor-checklist", "estimation-framework",
    ],

    # --- investigation / research family ---------------------------------
    "debugger": [
        "end-to-start-debugger-trace", "root-cause-debugging", "red-flag-stop-conditions",
        "graph-assisted-investigation", "incremental-persistence",
    ],
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
    ],

    # --- planning / product / architecture family ------------------------
    "planner": [
        "estimation-framework", "plan-quality", "plan-granularity",
        "iterative-phase-quality", "preservation-inventory", "behavioral-delta-matrix",
        "severity-rubric", "fresh-context-review", "double-round-trip-review",
        "graph-assisted-investigation", "review-protocol-injection",
    ],
    "architect": [
        "severity-rubric", "systematic-review-batching", "category-review-thinking",
        "double-round-trip-review", "graph-assisted-investigation",
        "design-patterns-quality",
    ],
    "solution-architect": [
        "design-patterns-quality", "scaffold-production-readiness",
        "estimation-framework", "module-detection",
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
    ],
    "tester": [
        "source-test-drift-check", "repeatable-test-principle",
        "test-spec-verification", "red-flag-stop-conditions",
    ],
    "e2e-runner": [
        "source-test-drift-check", "repeatable-test-principle",
    ],
    "database-admin": [
        "graph-impact-analysis",
    ],

    # --- design / craft / docs family ------------------------------------
    "ui-ux-designer": [
        "ui-system-context", "ui-wireframe", "design-system-check",
        "design-patterns-quality", "severity-rubric", "systematic-review-batching",
        "category-review-thinking", "double-round-trip-review", "fresh-context-review",
        "source-test-drift-check", "graph-assisted-investigation",
    ],
    "code-simplifier": [
        "complexity-prevention", "design-patterns-quality", "severity-rubric",
        "shared-protocol-duplication-policy",
    ],
    "docs-manager": [
        "incremental-persistence",
    ],
    "framework-maintainer": [
        "context-engineering-principles", "sub-agent-selection",  # sub-agent-selection whitelisted
    ],

    # --- implementer family (no review twin -> role-derived blocks) ------
    "backend-developer": [
        "design-patterns-quality", "complexity-prevention",
    ],
    "frontend-developer": [
        "design-patterns-quality", "complexity-prevention",
    ],
    "fullstack-developer": [
        "design-patterns-quality", "complexity-prevention",
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

    # (c) additive-only -- WARN if a target block is already present in the agent.
    for agent, blocks in AGENT_QUALITY_BLOCKS.items():
        present = agent_present_tags(agent)
        for tag in blocks:
            if tag in present:
                warnings.append(
                    f"(c) agent '{agent}' already carries '{tag}' (non-additive; "
                    f"would skew dry-run insert count)"
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
    n_blocks = sum(len(b) for b in AGENT_QUALITY_BLOCKS.values())

    for w in warnings:
        print(f"WARN {w}")
    if errors:
        for e in errors:
            print(f"FAIL {e}")
        print(f"\nFAIL: {len(errors)} error(s) across {n_agents} agents.")
        return 1

    print(
        f"OK: {n_agents} agents, {n_blocks} block insertions, "
        f"{len(FAMILIES)} families. All tags canonical; no orchestration leak; "
        f"partition clean; spawn-capability guard clear; tier policy clear; "
        "review-cycle relevance clear."
        + (f" ({len(warnings)} additive warning(s))" if warnings else "")
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(_main(sys.argv[1:]))
