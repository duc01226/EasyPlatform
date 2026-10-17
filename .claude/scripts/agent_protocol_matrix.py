#!/usr/bin/env python3
"""Agent <-> quality-protocol-block adoption matrix (single source of truth).

WHY THIS FILE EXISTS
--------------------
Sub-agents under ``.claude/agents/*.md`` are wired into block *body* sync
(``sync-update-blocks.py`` targets agents too), but the role-specific
``inject_*`` coverage campaigns only ever targeted *skills*. Result: every
agent carries the same generic baseline and ZERO role-specific rigor -- the
flagship ``code-reviewer`` agent had none of the 14 review-quality blocks its
twin ``code-quality-review`` / ``changes-review`` skills carry. This module is the
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
    the ask user question tool dialog. Copying these would tell the agent to perform
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
injector has not been run. The skill-connection manifest below is a second,
explicit link: it tells every agent which canonical skill contract owns the
role-specific behavior. It is rendered into each agent prompt by
``inject_agent_skill_connections.py`` so the connection survives Claude/Codex
mirror generation without blanket-injecting orchestrator instructions.

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

sys.path.insert(0, str(Path(__file__).resolve().parent))
from sync_blocks import AGENT_FOLDED_TAGS, has_root_pointer, universal_tags  # noqa: E402

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
    # Overlay resolution is performed by whoever INVOKES the skill; a headless leaf
    # sub-agent receives one already-scoped brief whose overlay the dispatching
    # orchestrator already resolved.
    "project-protocol-overlay",
    # Tracks the USER's prompts for a session: pin the original request, keep the
    # running P1..Pn list, re-anchor after compaction. A headless leaf sub-agent
    # never sees the user conversation -- it receives one brief that already carries
    # the goal verbatim -- and the prompt-ledger hook deliberately delivers nothing
    # inside a helper agent (spec SessionPromptLedger BR-SPL-06). The orchestrator
    # carries this block; the leaf would be told to track prompts it cannot see.
    "session-goal-ledger",
    # Two-way binding between a workflow SKILL.md and its ``.claude/workflows.json``
    # entry: whoever RESOLVES a step reads both projections and treats the registry
    # as authoritative on conflict. A headless leaf sub-agent never resolves a
    # sequence -- it receives one brief whose step the dispatching orchestrator
    # already selected and whose applicability it already evaluated.
    "workflow-registry-binding",
    # Review-loop orchestration: the round budget and re-review loop, batching,
    # reviewer-prompt construction and the durable round record belong to the
    # ORCHESTRATING review skill, which carries them inline. A leaf reviewer gets one
    # scoped brief with the rules it applies already embedded; carrying these bodies
    # too cost about 11k tokens per spawn and told a leaf to batch, loop and spawn
    # reviewers it must not.
    "systematic-review-batching",
    "review-protocol-injection",
    "review-policy",
    # Ordering of test runs across the steps of a task (build all phases, static review, ONE verify)
    # is owned by the ORCHESTRATING skill or workflow. A leaf sub-agent receives one brief; the rules
    # it must obey (a phase executor never runs a test suite, the tester runs once when told to) are
    # written directly in fullstack-developer.md / frontend-developer.md rather than carried as a block.
    "verify-last-order",
}

# Per-agent exceptions: a normally-excluded block IS legitimate content for this
# agent because the agent reasons ABOUT that block's subject matter.
ORCHESTRATION_WHITELIST = {
    "framework-maintainer": {"sub-agent-selection"},  # designs agents -> selection is its domain
}

# Blocks whose body literally instructs the agent to spawn Agent/Task sub-agents.
# An agent assigned one of these MUST have Agent/Task (or an all-tools grant).
SPAWN_INSTRUCTING_BLOCKS = {
    "review-protocol-injection",
}

# Review-cycle blocks are only relevant to agents whose primary job includes
# adversarial review, fix-cycle validation, or review-gate orchestration.
REVIEW_CYCLE_TAGS = {
    "review-protocol-injection",
}
REVIEW_CYCLE_AGENTS = {
    "architect",
    "code-reviewer",
    "integration-tester",
    "planner",
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
    "docs-manager", "git-manager", "journal-writer", "knowledge-worker",
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
    "researcher", "ui-ux-designer",
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
        "review-decision-autonomy",  # Applies only to review/audit decisions.
        "measured-capacity-engineering",
        "core-engineering-principles",
        "whole-diff-correctness",
        "severity-rubric", "category-review-thinking",
        "logic-and-intention-review",
        "bug-detection", "complexity-prevention",
        "design-patterns-quality", "rationalization-prevention",
        "graph-assisted-investigation", "source-test-drift-check", "test-spec-verification",
        # Leaf rules the reviewer template used to deliver: `fix` dispatches this agent directly for a
        # bugfix review, and hosts without a skill preload (Codex, OpenCode) would otherwise lose them.
        "behavioral-delta-matrix", "spec-tests-code-triangulation",
        # wave 2 (twin: code-quality-review / changes-review)
        "trade-off-interrogation-gate", "cross-stack-impact-trace", "spec-drift-adjudication",
        "integration-test-sync-check",
        # wave 3 (twin: changes-review Phase 3.8 -- domain entity gate)
        "domain-entity-change-gate",
        # The front-end review PROCEDURE (twin: changes-review / ui-design --mode=review). changes-review routes
        # an arbitrary diff here, and a sub-agent inherits nothing but its own .md -- so without
        # this row a frontend diff reviewed by this agent gets no screen-state or a11y pass at all.
        # Procedure only: the DD-* taste clauses stay off this agent deliberately, because a
        # general code reviewer adjudicating visual identity produces noise, not defects. The body
        # is self-gating on "has a user-facing front-end surface", so a backend diff costs one line.
        "design-review-checklist",
        # Test-architecture review is a production-quality concern too: this
        # agent is the production face of `architecture --mode=full` and the
        # review owner for seed-test-data.
        "test-architecture-execution-contract",
        # An agent that JUDGES a test must adjudicate a RED test on the same
        # five-way scale the author uses (/why-review F-M2). Without it, this
        # agent's only nearby rule permits "decide whether the test should
        # change" with no never-weaken prohibition -- exactly the reasoning the
        # taxonomy exists to forbid. Read-only role is not a counter-argument:
        # a reviewer that reaches the WRONG verdict recommends the wrong fix.
        "test-failure-fault-adjudication",
        "review-principle-awareness",
    ],
    # Expert AI-feature reviewer: plans and code that call models (twin: ai-engineering-review).
    # Read-only like security-auditor: it carries the three AI protocols in full (agents keep full
    # protocol text) plus the review-quality set its twin skill carries. It is the ONLY agent that
    # carries them: every other agent holds one conditional pointer line instead, so a task with no
    # AI surface pays nothing (guarded by the ai-gate-zero-cost suite).
    "ai-engineering-reviewer": [
        "review-decision-autonomy",  # Applies only to review/audit decisions.
        "measured-capacity-engineering",
        "core-engineering-principles",
        "severity-rubric", "category-review-thinking",
        "graph-assisted-investigation", "incremental-persistence",
        "source-test-drift-check",
        "trade-off-interrogation-gate",
        "review-principle-awareness",
        # twin: ai-engineering-review -- framing (AF), floor (AE) and procedure (AR)
        "ai-feature-framing-gate", "ai-engineering-gate", "ai-review-checklist",
    ],
    "security-auditor": [
        "review-decision-autonomy",  # Applies only to review/audit decisions.
        "measured-capacity-engineering",
        "severity-rubric", "category-review-thinking",
        "graph-assisted-investigation", "incremental-persistence",
        "source-test-drift-check",
        # wave 2 (twin: security-audit)
        "trade-off-interrogation-gate",
        "review-principle-awareness",
    ],
    "performance-optimizer": [
        "review-decision-autonomy",  # Applies only to review/audit decisions.
        "measured-capacity-engineering",
        "core-engineering-principles",
        "severity-rubric", "category-review-thinking",
        "graph-assisted-investigation", "graph-impact-analysis",
        # wave 2 (twin: performance-review)
        "trade-off-interrogation-gate", "scenario-stress-eval",
        "review-principle-awareness",
    ],
    "spec-compliance-reviewer": [
        "review-decision-autonomy",  # Applies only to review/audit decisions.
        "severity-rubric",
        "behavioral-delta-matrix", "spec-drift-adjudication",
        "test-spec-verification",
        # wave 2 (twin: work-item --mode=review / spec)
        "trade-off-interrogation-gate", "spec-tests-code-triangulation", "ui-intent-layer",
        # Judges spec<->test alignment, so it meets red tests and must reach a
        # verdict on the same five-way scale as the author (/why-review F-M2).
        "test-failure-fault-adjudication",
        # Leaf rules the reviewer template delivered before it left agent files: this agent is
        # dispatched directly too, and no rule may depend on a Claude-only skill preload.
        "bug-detection", "design-patterns-quality", "graph-assisted-investigation",
        "logic-and-intention-review", "rationalization-prevention",
        "review-principle-awareness",
    ],
    # --- investigation / research family ---------------------------------
    "debugger": [
        "measured-capacity-engineering",
        "core-engineering-principles",
        "end-to-start-debugger-trace", "root-cause-debugging", "red-flag-stop-conditions",
        "graph-assisted-investigation", "incremental-persistence",
        # wave 2 (twin: investigate --mode=debug / investigate)
        "test-failure-fault-adjudication", "source-test-drift-check",
    ],
    "researcher": [
        "web-research", "incremental-persistence", "output-quality-principles",
    ],
    "knowledge-worker": [
        "web-research", "incremental-persistence", "output-quality-principles",
        "severity-rubric",
        # wave 2 (twin: knowledge-review)
        "trade-off-interrogation-gate",
        "review-principle-awareness",
    ],
    # --- planning / product / architecture family ------------------------
    "planner": [
        "review-decision-autonomy",  # Applies only to review/audit decisions.
        "measured-capacity-engineering",
        "core-engineering-principles",
        "estimation-framework", "plan-quality", "plan-granularity",
        "iterative-phase-quality", "preservation-inventory", "behavioral-delta-matrix",
        "severity-rubric",
        "graph-assisted-investigation",
        # decision-quality lens used by planning and explicit plan review
        "trade-off-interrogation-gate",
        # shared Domain Entity Gate for planning and explicit plan review
        "domain-entity-change-gate",
        # Leaf rules the reviewer template delivered before it left agent files: this agent is
        # dispatched directly too, and no rule may depend on a Claude-only skill preload.
        "bug-detection", "design-patterns-quality", "logic-and-intention-review",
        "rationalization-prevention", "spec-tests-code-triangulation", "test-spec-verification",
        "review-principle-awareness",
    ],
    "architect": [
        "review-decision-autonomy",  # Applies only to review/audit decisions.
        "measured-capacity-engineering",
        "core-engineering-principles",
        "severity-rubric", "category-review-thinking",
        "graph-assisted-investigation",
        "design-patterns-quality",
        # wave 2 (twin: `architecture --mode=design` / `architecture --mode=review`)
        # NOT source-test-drift-check: an explicit off-role trim for architect
        # (TC-UAR-016, commit 698195a5). Deliberate non-parity; do NOT "fix".
        "trade-off-interrogation-gate", "scale-technique-gate", "scenario-stress-eval",
        "test-architecture-execution-contract",
        # wave 3 -- the third gate in the family: the companions judge the running
        # system's DESIGN, this one judges the project's engineering FOUNDATION
        # (build/run/test/change). Twin: `architecture --mode=design` / `architecture --mode=full`.
        "engineering-foundation-gate",
        # AI agents are a potential system actor; this is relevant to the
        # `architecture --mode=review` / `architecture --mode=design` agent's evidence-based audit.
        "ai-agent-as-user-access",
        "review-principle-awareness",
    ],
    "solution-architect": [
        "measured-capacity-engineering",
        "core-engineering-principles",
        "design-patterns-quality", "scaffold-production-readiness",
        "estimation-framework", "module-detection",
        # wave 2 -- already carries the companion `scenario-stress-eval`; the base
        # gate it explicitly pairs with was missing (twin: tech-stack-research)
        "scale-technique-gate",
        "test-architecture-execution-contract",
        # wave 3 -- greenfield inception CREATES the foundation, so this gate is in
        # its blocking mode here, not its advisory mode (twin: scaffold).
        "engineering-foundation-gate",
        # Greenfield architecture must decide whether and how non-human agents
        # can use the application before feature fan-out.
        "ai-agent-as-user-access",
    ],
    # --- test family -----------------------------------------------------
    "performance-tester": [
        "agent-code-standards", "agent-bootstrap", "sequential-thinking-protocol",
        "understand-code-first", "evidence-based-reasoning",
        "cross-service-check", "fix-layer-accountability",
        "core-engineering-principles", "measured-capacity-engineering",
        "real-world-fidelity-testing", "repeatable-test-principle",
        "test-architecture-execution-contract", "test-failure-fault-adjudication",
        "environment-fault-hypothesis", "source-test-drift-check",
        "review-decision-autonomy", "severity-rubric", "review-principle-awareness",
        "logic-and-intention-review", "bug-detection", "spec-tests-code-triangulation",
    ],
    "integration-tester": [
        "review-decision-autonomy",  # Applies only to review/audit decisions.
        "measured-capacity-engineering",
        "core-engineering-principles",
        "repeatable-test-principle", "source-test-drift-check", "red-flag-stop-conditions",
        "graph-impact-analysis", "incremental-persistence", "rationalization-prevention",
        "severity-rubric", "category-review-thinking",
        # wave 2 (twin: integration-test, incl. its review and verify modes)
        "trade-off-interrogation-gate", "test-failure-fault-adjudication",
        "integration-test-execution-discipline", "spec-tests-code-triangulation",
        "spec-drift-adjudication", "test-data-isolation",
        "real-world-fidelity-testing",
        "test-architecture-execution-contract",
        # Leaf rules the reviewer template delivered before it left agent files: this agent is
        # dispatched directly too, and no rule may depend on a Claude-only skill preload.
        "behavioral-delta-matrix", "bug-detection", "design-patterns-quality",
        "graph-assisted-investigation", "logic-and-intention-review", "test-spec-verification",
        "review-principle-awareness",
    ],
    "tester": [
        "measured-capacity-engineering",
        "core-engineering-principles",
        "source-test-drift-check", "repeatable-test-principle",
        "test-spec-verification", "red-flag-stop-conditions",
        # wave 2 (twin: test)
        "test-failure-fault-adjudication", "real-world-fidelity-testing",
        "test-architecture-execution-contract",
        # Carries "Tests verify intent" (clause 5). A test agent had the rule for
        # adjudicating a RED test but none for what a GREEN test is worth --
        # so a suite that mirrors current behavior and protects no invariant read
        # as success (/why-review F-M1). `integration-tester` already carries it;
        # this closes the author-side gap on the other two test agents.
        "logic-and-intention-review",
    ],
    "e2e-runner": [
        "measured-capacity-engineering",
        "core-engineering-principles",
        "source-test-drift-check", "repeatable-test-principle",
        # wave 2 (twin: e2e-test)
        "test-failure-fault-adjudication", "real-world-fidelity-testing",
        "test-architecture-execution-contract",
        # Visual baseline/generation handoff (twin: E2E visual-review skills).
        "e2e-visual-design-contract",
        # Same author-side gap as `tester`: clause 5 "Tests verify intent"
        # (/why-review F-M1).
        "logic-and-intention-review",
    ],
    "database-admin": [
        "measured-capacity-engineering",
        "core-engineering-principles",
        "graph-impact-analysis",
        # wave 2 (twin: db-migrate)
        "source-test-drift-check",
    ],
    # --- design / craft / docs family ------------------------------------
    "ui-ux-designer": [
        "review-decision-autonomy",  # Applies only to review/audit decisions.
        "core-engineering-principles",
        "ui-system-context", "ui-wireframe", "design-system-check",
        "design-patterns-quality", "severity-rubric",
        "category-review-thinking",
        "source-test-drift-check", "graph-assisted-investigation",
        # wave 2 (twin: ui-design / design-spec)
        "trade-off-interrogation-gate", "ui-intent-layer", "existing-ui-research",
        # UI/UX design principles -- 40 clauses (twin: ui-design / design-spec)
        "ui-ux-design-principles",
        # Visual IDENTITY, the question the 40 usability clauses do not ask (twin: ui-design /
        # design-spec). This agent AUTHORS the direction, so it owns both the
        # design plan + generic test (DD-3) and the interface voice.
        "design-distinctiveness-gate", "ui-copywriting", "design-review-checklist",
        "review-principle-awareness",
        # Journey-first order (twin: ui-design / design-spec / work-item --mode=mockup): this agent
        # is where a brief turns into a surface, so it must report the main user journeys and
        # read the project's design authority BEFORE it generates anything.
        "ux-journey-gate",
    ],
    "code-simplifier": [
        "core-engineering-principles",
        "complexity-prevention", "design-patterns-quality", "severity-rubric",
        "shared-protocol-duplication-policy",
        # wave 2 (twin: code-simplifier)
        "source-test-drift-check",
    ],
    "docs-manager": [
        "incremental-persistence",
    ],
    "framework-maintainer": [
        "review-decision-autonomy",  # Applies only to review/audit decisions.
        "core-engineering-principles",
        "context-engineering-principles", "sub-agent-selection",  # sub-agent-selection whitelisted
        # wave 2 (twin: skill-creator / custom-agent) -- it EDITS SYNC blocks, so the
        # policy governing inline-protocol duplication is core subject matter for it
        "shared-protocol-duplication-policy", "output-quality-principles",
    ],
    # --- implementer family (no review twin -> role-derived blocks) ------
    # `ui-system-context` goes only to the two UI-touching implementers -- its body
    # gates on .ts/.html/.scss/.css work, so it is dead weight on backend-developer.
    #
    # All three implementers additionally carry `test-failure-fault-adjudication`
    # and `logic-and-intention-review` (/why-review F-M3). An implementer is
    # routed `fix` on a red test, so it is a test ADJUDICATOR in practice whatever
    # the org chart says -- and without the taxonomy its nearest available rule
    # permits editing the test to reach green. Reaching the taxonomy through
    # `.claude/skills/fix/SKILL.md` is exactly the indirection this framework's own
    # duplication policy calls a compliance loss, and a sub-agent inherits nothing
    # but its own .md. The precedent is `code-reviewer`, given the test-architecture
    # contract in this same campaign for the same reason.
    "backend-developer": [
        "measured-capacity-engineering",
        "core-engineering-principles",
        "design-patterns-quality", "complexity-prevention",
        # wave 2 (twin: plan --mode=execute / feature-implement)
        "source-test-drift-check", "graph-assisted-investigation",
        # wave 3 -- authors entities, so it acts on all 6 gate decision points;
        # without it the implementer runs weaker rules than its own reviewer.
        "domain-entity-change-gate",
        # /why-review F-M3 -- see the family note above.
        "test-failure-fault-adjudication", "logic-and-intention-review",
    ],
    "frontend-developer": [
        "measured-capacity-engineering",
        "core-engineering-principles",
        "design-patterns-quality", "complexity-prevention",
        # wave 2 (twin: plan --mode=execute / feature-implement)
        "source-test-drift-check", "graph-assisted-investigation", "ui-system-context",
        # UI/UX design principles -- 40 clauses; the implementer gate for user-facing surfaces
        "ui-ux-design-principles",
        # The implementer is where a design plan silently stops being followed -- raw hex, a
        # borrowed card kit, a per-section entrance animation. DD-* binds it to the plan it
        # was handed; ui-copywriting binds the strings it types into templates.
        "design-distinctiveness-gate", "ui-copywriting", "design-review-checklist",
        # /why-review F-M3 -- see the family note above.
        "test-failure-fault-adjudication", "logic-and-intention-review",
    ],
    "fullstack-developer": [
        "measured-capacity-engineering",
        "core-engineering-principles",
        "design-patterns-quality", "complexity-prevention",
        # wave 2 (twin: plan --mode=execute / feature-implement)
        "source-test-drift-check", "graph-assisted-investigation", "ui-system-context",
        # UI/UX design principles -- 40 clauses; binds FRONTEND phases only (backend-only: N/A)
        "ui-ux-design-principles",
        # Same implementer rationale as frontend-developer; both blocks carry their own
        # "skip when there is no user-facing surface" clause, so a backend-only phase costs
        # one stated line rather than a wrong gate.
        "design-distinctiveness-gate", "ui-copywriting", "design-review-checklist",
        # /why-review F-M3 -- see the family note above. This is the agent the
        # report's concrete error path routed through.
        "test-failure-fault-adjudication", "logic-and-intention-review",
    ],
    # --- operations family ------------------------------------------------
    # These agents still receive the Core-2 tier and have an explicit skill connection.
    # Empty additive rows are valid when the twin skill has no role-specific
    # SYNC block; keeping the row makes the all-agent matrix complete and
    # prevents silent tier drift when a new block is introduced.
    "git-manager": [],
    "journal-writer": [],
}

# ---------------------------------------------------------------------------
# Agent -> canonical skill-contract connections
# ---------------------------------------------------------------------------
# This is routing/evidence metadata, not a request to auto-expand every skill
# into a leaf agent. Full skill expansion would also copy orchestrator-only
# instructions; the role-specific quality subset remains controlled by
# AGENT_QUALITY_BLOCKS. The connection block is rendered into every canonical
# agent prompt and therefore remains visible in Claude and Codex mirrors.
AGENT_SKILL_CONNECTIONS = {
    "ai-engineering-reviewer": ["ai-engineering-review"],
    "architect": [
        "architecture", "security-audit", "performance-review",
    ],
    "backend-developer": ["feature-implement", "fix"],
    "code-reviewer": [
        "code-quality-review", "changes-review", "architecture", "seed-test-data", "ui-design",
    ],
    "code-simplifier": ["code-simplifier"],
    "database-admin": ["db-migrate", "seed-test-data"],
    "debugger": ["investigate"],
    "docs-manager": ["docs-manager"],
    "e2e-runner": ["e2e-test", "workflow-e2e"],
    "framework-maintainer": ["custom-agent", "skill-creator", "sync-skills-shared-protocols"],
    "frontend-developer": ["feature-implement", "ui-design"],
    "fullstack-developer": ["feature-implement"],
    "git-manager": ["commit"],
    "integration-tester": [
        "integration-test",
        "workflow-integration-test",
    ],
    "journal-writer": ["learn"],
    "knowledge-worker": ["knowledge-review", "knowledge-synthesis"],
    "performance-optimizer": ["performance-review"],
    "performance-tester": ["performance-test"],
    "planner": ["plan"],
    "researcher": ["web-research"],
    "security-auditor": ["security-audit"],
    "solution-architect": [
        "architecture", "scaffold", "harness-setup",
        "workflow-greenfield-init", "tech-stack-research",
    ],
    "spec-compliance-reviewer": ["work-item", "spec"],
    "tester": ["test"],
    "ui-ux-designer": ["ui-design", "design-spec"],
}

# The test-architecture contract is intentionally connected across the full
# setup -> author -> verify -> review path. Keep this reverse-coverage set
# explicit so a future skill addition cannot silently become skill-only.
TEST_ARCHITECTURE_SKILLS = {
    "architecture",
    "scaffold", "harness-setup", "workflow-greenfield-init",
    "integration-test",
    "performance-test",
    "e2e-test", "workflow-e2e",
    "workflow-integration-test", "test",
    "seed-test-data",
}
TEST_ARCHITECTURE_AGENTS = {
    "architect", "code-reviewer", "e2e-runner", "integration-tester",
    "performance-tester",
    "solution-architect", "tester",
}

# ---------------------------------------------------------------------------
# Family grouping (drives --family-scoped injection). Every enhanced agent
# appears in EXACTLY ONE family; the union must equal AGENT_QUALITY_BLOCKS keys.
# ---------------------------------------------------------------------------
FAMILIES = {
    "review": [
        "code-reviewer", "ai-engineering-reviewer", "security-auditor", "performance-optimizer",
        "spec-compliance-reviewer",
    ],
    "investigation": [
        "debugger", "researcher", "knowledge-worker",
    ],
    "planning": [
        "planner", "architect", "solution-architect",
    ],
    "test": [
        "integration-tester", "performance-tester", "tester", "e2e-runner", "database-admin",
    ],
    "craft": [
        "ui-ux-designer", "code-simplifier", "docs-manager", "framework-maintainer",
    ],
    "implementer": [
        "backend-developer", "frontend-developer", "fullstack-developer",
    ],
    "operations": [
        "git-manager", "journal-writer",
    ],
}

AGENT_SKILL_CONNECTIONS_OPEN = "<!-- AGENT-SKILL-CONNECTIONS:START -->"
AGENT_SKILL_CONNECTIONS_CLOSE = "<!-- AGENT-SKILL-CONNECTIONS:END -->"


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


def agent_universal_problems(agent: str) -> list[str]:
    """Universal-bundle contract for one agent file: no body or reminder of a universal or
    agent-folded tag and no retired pointer line (`sync_blocks.strip_universal` owns both)."""
    f = AGENTS_DIR / f"{agent}.md"
    if not f.exists():
        return []
    text = f.read_text(encoding="utf-8")
    problems: list[str] = []
    for tag in [*universal_tags(), *AGENT_FOLDED_TAGS]:
        for variant in (tag, f"{tag}:reminder"):
            if re.search(rf"^<!-- SYNC:{re.escape(variant)} -->", text, flags=re.MULTILINE):
                problems.append(f"SYNC:{variant}")
    if has_root_pointer(text):
        problems.append("retired Root-carried protocols pointer line")
    return problems


def disk_agent_names() -> set[str]:
    """Return canonical agent basenames currently present on disk."""
    return {p.stem for p in AGENTS_DIR.glob("*.md")}


def skill_names() -> set[str]:
    """Return canonical skill directories that expose a SKILL.md entry point."""
    return {
        p.name for p in AGENTS_DIR.parent.joinpath("skills").iterdir()
        if p.is_dir() and p.joinpath("SKILL.md").exists()
    }


def frontmatter_skills(agent: str) -> list[str]:
    """Read an optional native ``skills:`` list from one agent frontmatter."""
    f = AGENTS_DIR / f"{agent}.md"
    if not f.exists():
        return []
    text = f.read_text(encoding="utf-8")
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, flags=re.DOTALL)
    frontmatter = m.group(1) if m else ""
    sm = re.search(r"^skills:\s*(.+)$", frontmatter, flags=re.MULTILINE)
    if not sm:
        return []
    raw = sm.group(1).strip()
    if raw in {"", "[]"}:
        return []
    return [item.strip().strip("'\"") for item in raw.split(",") if item.strip()]


def connection_marker_skills(agent: str) -> list[str]:
    """Read the generated skill names from an agent's explicit connection block."""
    f = AGENTS_DIR / f"{agent}.md"
    if not f.exists():
        return []
    text = f.read_text(encoding="utf-8")
    pattern = (
        rf"{re.escape(AGENT_SKILL_CONNECTIONS_OPEN)}"
        rf"(.*?){re.escape(AGENT_SKILL_CONNECTIONS_CLOSE)}"
    )
    match = re.search(pattern, text, flags=re.DOTALL)
    if not match:
        return []
    return re.findall(r"^- `([a-z0-9-]+)`", match.group(1), flags=re.MULTILINE)


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
    on_disk = disk_agent_names()

    # (i) stale-orchestration guard -- HARD FAIL. The injector can reconcile
    # exact fenced blocks, but a validation run must make the stale carrier
    # visible instead of allowing an excluded orchestration contract to linger.
    for agent in sorted(on_disk & set(AGENT_QUALITY_BLOCKS)):
        stale = sorted((agent_present_tags(agent) & EXCLUDED_ORCHESTRATION) - ORCHESTRATION_WHITELIST.get(agent, set()))
        if stale:
            errors.append(
                f"(i) agent '{agent}' still carries excluded-orchestration block(s) {stale}; "
                "run inject_agent_protocol_blocks.py to reconcile exact fences"
            )

    # (j) universal-bundle contract -- HARD FAIL. The universal hook delivers the universal group and
    # the agent-folded tags live in their folding block, so an agent holds none of their bodies or
    # reminders and no pointer line, and the matrix never assigns them.
    for tag in sorted(union_blocks & (set(universal_tags()) | set(AGENT_FOLDED_TAGS))):
        errors.append(f"(j) matrix assigns universal or agent-folded block '{tag}' to an agent")
    for agent in sorted(on_disk & set(AGENT_QUALITY_BLOCKS)):
        problems = agent_universal_problems(agent)
        if problems:
            errors.append(
                f"(j) agent '{agent}' breaks the universal-bundle contract: {problems}; "
                "run sync-update-blocks.py --mode=strip-root-pointer"
            )

    # (connection) every canonical agent has an explicit, valid skill link and
    # every native frontmatter link is represented by that connection. The
    # marker is generated from this manifest so Codex receives the same link.
    connection_keys = set(AGENT_SKILL_CONNECTIONS)
    if connection_keys != on_disk:
        missing = sorted(on_disk - connection_keys)
        ghosts = sorted(connection_keys - on_disk)
        if missing:
            errors.append(f"(connection) agent(s) on disk missing skill connection(s): {missing}")
        if ghosts:
            errors.append(f"(connection) skill connection(s) target missing agent file(s): {ghosts}")
    known_skills = skill_names()
    for agent, connected in AGENT_SKILL_CONNECTIONS.items():
        if not connected:
            errors.append(f"(connection) agent '{agent}' has no connected skill contract")
        duplicates = sorted({skill for skill in connected if connected.count(skill) > 1})
        if duplicates:
            errors.append(f"(connection) agent '{agent}' repeats skill contract(s): {duplicates}")
        unknown = sorted(set(connected) - known_skills)
        if unknown:
            errors.append(f"(connection) agent '{agent}' links unknown skill(s): {unknown}")
        marker = connection_marker_skills(agent)
        if marker != connected:
            errors.append(
                f"(connection) agent '{agent}' marker does not match manifest "
                f"(expected {connected}, found {marker}); run inject_agent_skill_connections.py"
            )
        native = frontmatter_skills(agent)
        native_unknown = sorted(set(native) - known_skills)
        if native_unknown:
            errors.append(f"(connection) agent '{agent}' frontmatter links unknown skill(s): {native_unknown}")
        native_unconnected = sorted(set(native) - set(connected))
        if native_unconnected:
            errors.append(
                f"(connection) agent '{agent}' frontmatter skill(s) not in connection manifest: "
                f"{native_unconnected}"
            )

    for skill in sorted(TEST_ARCHITECTURE_SKILLS):
        owners = sorted(agent for agent, links in AGENT_SKILL_CONNECTIONS.items() if skill in links)
        if not owners:
            errors.append(f"(test-architecture) skill '{skill}' has no connected agent owner")
    for agent in sorted(TEST_ARCHITECTURE_AGENTS):
        if agent not in AGENT_QUALITY_BLOCKS:
            errors.append(f"(test-architecture) owner agent '{agent}' has no quality matrix row")
        elif "test-architecture-execution-contract" not in AGENT_QUALITY_BLOCKS[agent]:
            errors.append(
                f"(test-architecture) owner agent '{agent}' lacks "
                "test-architecture-execution-contract"
            )

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
        "review-cycle relevance clear; all-agent skill connections clear."
        + (f" ({len(warnings)} drift warning(s))" if warnings else "")
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(_main(sys.argv[1:]))
