#!/usr/bin/env python3
"""
sync-hooks-to-skills.py
Inserts SYNC: blocks sourced from canonical (sync-inline-versions.md) into all
SKILL.md and agent .md files. Idempotent: skips files that already contain a block.
A guide entry (`sync_blocks.has_guide_entry`) counts as the block, so a skill converted
to guide lines never gets its body back. Files keep their own line-ending style.

The universal bundle (the `universal` group of `protocol-groups.json`) is never inserted here: the
universal hook delivers it and no skill or agent carries any part of it (`sync_blocks.strip_universal`;
`sync-update-blocks.py --mode=strip-root-pointer` applies it to the whole tree). `main()` also
brings each target to that contract.

Tiered blocks (agents):
  Core-2 (every agent):
    - SYNC:sequential-thinking-protocol
    - SYNC:agent-bootstrap
    (`task-tracking-external-report` is folded into agent-bootstrap and never inserted.)
  Code-6 (Core-2 + 4, for code/review agents in CODE_AGENTS):
    - SYNC:understand-code-first
    - SYNC:evidence-based-reasoning
    - SYNC:cross-service-check
    - SYNC:fix-layer-accountability
  Readonly-Code-4 (Core-2 + 2, for read-only/design agents in READONLY_CODE_AGENTS):
    - SYNC:understand-code-first
    - SYNC:evidence-based-reasoning
    (EXCLUDES cross-service-check + fix-layer-accountability — those two are
    mutation-oriented and waste tokens on agents that only locate/read/design
    code and never fix at a layer or cross a service boundary.)
  agent-code-standards (gated INDEPENDENTLY by CODE_STANDARDS_AGENTS — NOT the
  same set as CODE_AGENTS): dev-rules + coding-pattern pointers for agents that
  write/modify/review/debug/optimize/test code. Appended on top of whichever tier
  (Core or Code) the agent already has. Non-code-standards agents never receive it.
Skills carry no inserted blocks (both skill tier orders are empty). `--prune` removes a PRUNABLE_BLOCKS block from
any file whose tier no longer grants it — without it, leaving a tier is a one-way
door.

Agent tier is set by explicit CODE_AGENTS / READONLY_CODE_AGENTS /
CORE_ONLY_AGENTS membership; an agent in none of the three sets (or in more than
one) raises (no silent default).
agent-code-standards membership (CODE_STANDARDS_AGENTS) is a SEPARATE axis: an
agent can be in CODE_AGENTS (code-investigation tier) yet NOT in
CODE_STANDARDS_AGENTS (e.g. researcher/ui-ux-designer read or locate code
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

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from line_endings import read_text, write_text  # noqa: E402  (path set up above: runs from any cwd)
from sync_blocks import has_guide_entry  # noqa: E402

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ─── Canonical block content ────────────────────────────────────────────────
# Every body and reminder this script inserts is read from the canonical file
# (`.claude/skills/shared/sync-inline-versions.md`) at import time, so a newly tiered file never
# receives a stale copy. The universal bundle (the `universal` group of
# `protocol-groups.json`) and the agent-folded `task-tracking-external-report` are never inserted:
# `sync_blocks.strip_universal` owns them.

from sync_blocks import (  # noqa: E402  (path set up above: runs from any cwd)
    AGENT_FOLDED_TAGS,
    load_wrapped_sync_block,
    strip_universal,
)

BODY_TAGS = (
    "sequential-thinking-protocol",
    "understand-code-first",
    "evidence-based-reasoning",
    "cross-service-check",
    "fix-layer-accountability",
    "agent-bootstrap",
    "agent-code-standards",
)
REMINDER_TAGS = ("sequential-thinking-protocol", "cross-service-check")

BLOCKS = {tag: load_wrapped_sync_block(f"SYNC:{tag}").rstrip() for tag in BODY_TAGS}
REMINDERS = {tag: load_wrapped_sync_block(f"SYNC:{tag}:reminder").rstrip() for tag in REMINDER_TAGS}

# ─── Tier ordering ───────────────────────────────────────────────────────────
# No default skill or orchestrator protocol is inserted. Keep the tier names for
# callers that use process_file; agent tiers below retain their quality protocols.
SKILL_BLOCK_ORDER = []
ORCHESTRATOR_SKILL_BLOCK_ORDER = []
ORCHESTRATOR_SKILLS = set()
PRUNABLE_BLOCKS = set()

# Core: every agent. agent-bootstrap is the self-contained subagent startup contract for hosts
# whose SubagentStart hook is unavailable; it also carries the task-tracking and report rules
# (task-tracking-external-report is folded into it). The universal protocols come from the
# universal hook. Regenerated from canonical via sync-update-blocks.py <tag>.
CORE_BLOCK_ORDER = [
    "sequential-thinking-protocol",
    "agent-bootstrap",
]

# Code-6: Core-2 + 4 code-investigation blocks for agents that read/review code.
CODE_BLOCK_ORDER = CORE_BLOCK_ORDER + [
    "understand-code-first",
    "evidence-based-reasoning",
    "cross-service-check",
    "fix-layer-accountability",
]

# Readonly-Code-4: Core-2 + understand-code-first + evidence-based-reasoning for
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
    "ai-engineering-reviewer", "architect", "backend-developer", "code-reviewer", "code-simplifier",
    "database-admin", "debugger", "e2e-runner", "framework-maintainer", "frontend-developer",
    "fullstack-developer", "integration-tester", "performance-optimizer", "performance-tester",
    "planner", "security-auditor",
    "solution-architect", "spec-compliance-reviewer", "tester",
}
# Read-only/design agents: full code-investigation reading discipline
# (understand-code-first + evidence-based-reasoning) but NOT the mutation-oriented
# cross-service-check + fix-layer-accountability blocks — they locate/read/design
# code, they do not fix at a layer or evaluate a service-boundary change.
READONLY_CODE_AGENTS = {
    "researcher", "ui-ux-designer",
}
CORE_ONLY_AGENTS = {
    "docs-manager", "git-manager", "journal-writer", "knowledge-worker",
}

# agent-code-standards audience — SEPARATE axis from CODE_AGENTS. Only agents that
# author/modify/review/debug/optimize/test production or framework code. An agent
# in CODE_AGENTS may be excluded here (researcher research or
# locate code but do not author/review it; ui-ux-designer produces design artifacts).
# Membership is NOT validated against the disk set the way CODE/CORE_ONLY are — it is
# a pure inclusion list; absence simply means "no code-standards block".
CODE_STANDARDS_AGENTS = {
    "ai-engineering-reviewer", "architect", "backend-developer", "code-reviewer", "code-simplifier",
    "database-admin", "debugger", "e2e-runner", "framework-maintainer",
    "frontend-developer", "fullstack-developer", "integration-tester",
    "performance-optimizer", "performance-tester", "planner", "security-auditor", "solution-architect",
    "spec-compliance-reviewer", "tester",
}


# ─── File discovery ──────────────────────────────────────────────────────────

def find_target_files(agents_only=False):
    """Return [(path, block_order)] — skills get SKILL_BLOCK_ORDER, or
    ORCHESTRATOR_SKILL_BLOCK_ORDER when named in ORCHESTRATOR_SKILLS; each agent is
    classified by explicit tier membership. Raises SystemExit on any agent that is
    unclassified or double-classified (no silent default), and on any
    ORCHESTRATOR_SKILLS entry with no skill directory on disk.
    agents_only=True skips skills (scope a run to .claude/agents)."""
    skills_pattern = os.path.join(PROJECT_DIR, ".claude", "skills", "*", "SKILL.md")
    agents_pattern = os.path.join(PROJECT_DIR, ".claude", "agents", "*.md")

    targets = []
    if not agents_only:
        skill_paths = sorted(glob_module.glob(skills_pattern))
        # Unlike agents, an unlisted skill is NOT an error — the base tier is the
        # correct default. The real failure mode here is the opposite one: a name in
        # ORCHESTRATOR_SKILLS that no longer matches a directory (typo, rename, or
        # deletion) would silently stop granting the block to a skill that needs it.
        # Fail loudly instead.
        on_disk = {os.path.basename(os.path.dirname(p)) for p in skill_paths}
        unknown = sorted(ORCHESTRATOR_SKILLS - on_disk)
        if unknown:
            raise SystemExit(
                f"ORCHESTRATOR_SKILLS names {len(unknown)} skill(s) that do not exist "
                f"on disk: {', '.join(unknown)} - fix the name(s) or remove them "
                f"(edit {os.path.basename(__file__)})."
            )
        for path in skill_paths:
            name = os.path.basename(os.path.dirname(path))
            order = (ORCHESTRATOR_SKILL_BLOCK_ORDER if name in ORCHESTRATOR_SKILLS
                     else SKILL_BLOCK_ORDER)
            targets.append((path, order))

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


def main_carried(content, block_name):
    """The file carries the protocol itself: its full body, or a guide entry for it (a skill
    converted by `sync-update-blocks.py --mode=guide`). A guide entry counts exactly like the
    body, so no run of this script puts a converted body back."""
    return f"<!-- SYNC:{block_name} -->" in content or has_guide_entry(content, block_name)


def block_present(content, block_name):
    return main_carried(content, block_name) or f"<!-- SYNC:{block_name}:reminder -->" in content


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


def _prune_re(block_name):
    """Match one fenced SYNC region (main or :reminder) plus its surrounding blank
    lines, so removal never leaves a double blank gap behind."""
    tag = re.escape(block_name)
    return re.compile(
        r"\n*^<!-- SYNC:" + tag + r" -->.*?^<!-- /SYNC:" + tag + r" -->[ \t]*$\n*",
        re.MULTILINE | re.DOTALL,
    )


def prune_blocks(content, block_order):
    """Remove every PRUNABLE_BLOCKS region this file's tier order does not grant.

    Counterpart to the insertion path: without it a skill that leaves a tier keeps
    the block forever, which makes any tier narrowing a one-way door. Only names in
    PRUNABLE_BLOCKS are ever touched. The `:reminder` fence is removed first — the
    main-block pattern requires an exact `<tag> -->` and so cannot match it, and
    removing the parent first would orphan the reminder.
    """
    removed = []
    for name in sorted(PRUNABLE_BLOCKS - set(block_order)):
        for variant in (f"{name}:reminder", name):
            new_content = _prune_re(variant).sub("\n\n", content)
            if new_content != content:
                content, _ = new_content, removed.append(variant)
    return content, removed


def process_file(path, block_order, dry_run=False, prune=False):
    original, newline = read_text(path)

    # Repair malformed (indented) fences first so the work is idempotent even when
    # no block is missing — covers present-but-malformed blocks (see TC-UAR-006).
    content = normalize_fences(original)

    # Prune BEFORE computing what is missing: a block this tier no longer grants
    # must not be counted as "present" and left in place.
    if prune:
        content, _pruned = prune_blocks(content, block_order)

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
    # A guide entry is a carried main block here too (`main_carried`).
    missing_reminders = [name for name in block_order
                         if name in REMINDERS
                         and f"<!-- SYNC:{name}:reminder -->" not in content
                         and not main_carried(content, name)]

    if not missing_blocks and not missing_reminders:
        # Nothing to insert — but a fence repair may still have changed content.
        if content != original:
            if not dry_run:
                write_text(path, content, newline)
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
        write_text(path, new_content, newline)

    return "updated"


def process_strip(path, dry_run=False):
    """Bring one target to the universal-bundle contract: no universal body or reminder and no
    retired pointer line (agents also drop the agent-folded tags). Idempotent."""
    original, newline = read_text(path)
    is_agent = os.path.basename(os.path.dirname(path)) == "agents"
    content, _removed, errors = strip_universal(original, list(AGENT_FOLDED_TAGS) if is_agent else None)
    if errors:
        raise ValueError("; ".join(errors))
    if content == original:
        return "skip"
    if not dry_run:
        write_text(path, content, newline)
    return "updated"


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    dry_run = "--dry-run" in sys.argv
    verbose = "--verbose" in sys.argv or "-v" in sys.argv
    agents_only = "--agents-only" in sys.argv
    # Opt-in: removal is destructive, so it never rides along with a plain sync.
    prune = "--prune" in sys.argv

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
            result = process_file(path, block_order, dry_run=dry_run, prune=prune)
            # process_file's write is already on disk (unless dry-run), so the strip step reads it back.
            strip_result = process_strip(path, dry_run=dry_run)
            if "updated" in (result, strip_result):
                result = "updated"
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
