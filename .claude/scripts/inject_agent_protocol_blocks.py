#!/usr/bin/env python3
"""Inject role-specific QUALITY SYNC blocks into ``.claude/agents/*.md``.

Driven by ``agent_protocol_matrix.AGENT_QUALITY_BLOCKS``. For each (agent, tag):

  TOP main block  -> refreshed in place if drifted, else inserted BEFORE
                     ``sync_blocks.find_sync_region_start`` (after the agent's main
                     authored content, co-located with its existing SYNC blocks).
  REMINDER        -> ONLY when canonical defines ``## SYNC:<tag>:reminder``;
                     refreshed in place if drifted, else inserted before
                     ``## Closing Reminders`` (else appended at EOF).

REMINDER-OPTIONAL is the one substantive difference from the sibling
``inject_review_skill_blocks.py``: that script's 3 tags all have ``:reminder``
variants, so it injects a reminder unconditionally. Most role-specific quality
blocks have NO ``:reminder`` variant in canonical (only 11 base tags do), so the
reminder step here is GUARDED on existence -- calling ``load_wrapped_sync_block``
for a missing ``:reminder`` header would ValueError. Of the matrix's tags, only
severity-rubric, systematic-review-batching, category-review-thinking,
cross-service-check and end-to-start-debugger-trace carry a reminder.

Bodies are loaded from canonical via ``load_wrapped_sync_block`` -> they match
canonical by construction. Run ``sync-update-blocks.py`` afterwards to normalize
main-block bodies (guarantees ``--dry-run`` clean).

Targets ONLY ``.claude/agents/*.md``. Does NOT touch the mirrors (``.agents/``,
``.codex/``, ``AGENTS.md``) -- those are deferred to the
phase-09 handoff (intended divergence).

Usage:
    python inject_agent_protocol_blocks.py [--dry-run]
        [--family=review,test] [--agents=code-reviewer,debugger]

No selector  -> all 26 matrix agents (family order). Selectors union together.
"""
from __future__ import annotations

import re
import sys

from sync_blocks import SYNC_SOURCE, find_sync_region_start, load_wrapped_sync_block
from agent_protocol_matrix import AGENT_QUALITY_BLOCKS, AGENTS_DIR, FAMILIES

CLOSING_RE = re.compile(r"^## Closing Reminders\b.*$", re.MULTILINE)


def block_re(full_tag: str) -> re.Pattern:
    # Matches the main fence pair but NOT a ``:reminder`` variant -- the open tag
    # requires ` -->` directly after ``full_tag``, which ``full_tag:reminder`` breaks.
    return re.compile(
        rf"<!-- {re.escape(full_tag)} -->.*?<!-- /{re.escape(full_tag)} -->",
        re.DOTALL,
    )


def canonical_reminder_tags() -> set[str]:
    """Base tags that have a ``## SYNC:<tag>:reminder`` header in canonical."""
    text = SYNC_SOURCE.read_text(encoding="utf-8")
    return set(re.findall(r"^## SYNC:([a-z0-9-]+):reminder\s*$", text, flags=re.MULTILINE))


_REMINDER_TAGS = canonical_reminder_tags()


def inject_tag(text: str, tag: str) -> tuple[str, dict]:
    """Inject one quality block: TOP always; reminder iff canonical defines it."""
    full_tag = f"SYNC:{tag}"
    top_block = load_wrapped_sync_block(full_tag)
    top_re = block_re(full_tag)
    status = {"top": "-", "reminder": "n/a"}

    # --- TOP main block ---
    m = top_re.search(text)
    if m:
        if m.group(0).strip() != top_block.strip():
            text = text[: m.start()] + top_block + text[m.end():]
            status["top"] = "refreshed"
        else:
            status["top"] = "present"
    else:
        insert_at = find_sync_region_start(text)
        head = text[:insert_at].rstrip() + "\n\n"
        tail = "\n" + text[insert_at:].lstrip("\n")
        text = head + top_block + tail
        status["top"] = "inserted"

    # --- REMINDER (only when a canonical :reminder variant exists) ---
    if tag in _REMINDER_TAGS:
        reminder_full = f"SYNC:{tag}:reminder"
        reminder_block = load_wrapped_sync_block(reminder_full)
        rem_re = block_re(reminder_full)
        m = rem_re.search(text)
        if m:
            if m.group(0).strip() != reminder_block.strip():
                text = text[: m.start()] + reminder_block + text[m.end():]
                status["reminder"] = "refreshed"
            else:
                status["reminder"] = "present"
        else:
            cm = CLOSING_RE.search(text)
            if cm:
                text = text[: cm.start()] + reminder_block + "\n" + text[cm.start():]
                status["reminder"] = "before-closing"
            else:
                if not text.endswith("\n"):
                    text += "\n"
                text += "\n" + reminder_block
                status["reminder"] = "appended-eof"

    return text, status


def resolve_targets(argv: list[str]) -> list[str]:
    families: list[str] = []
    agents: list[str] = []
    for a in argv:
        if a.startswith("--family="):
            families += [x.strip() for x in a.split("=", 1)[1].split(",") if x.strip()]
        elif a.startswith("--agents="):
            agents += [x.strip() for x in a.split("=", 1)[1].split(",") if x.strip()]

    selected: list[str] = []
    for fam in families:
        if fam not in FAMILIES:
            raise SystemExit(f"Unknown family '{fam}'. Known: {', '.join(FAMILIES)}")
        selected += FAMILIES[fam]
    selected += agents
    if not selected:  # default: every matrix agent, family order (stable output)
        selected = [a for members in FAMILIES.values() for a in members]

    seen: set[str] = set()
    ordered: list[str] = []
    for a in selected:
        if a not in seen:
            seen.add(a)
            ordered.append(a)
    return ordered


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    known = ("--dry-run", "--family=", "--agents=")
    unknown = [a for a in sys.argv[1:] if not any(a == k or a.startswith(k) for k in known)]
    if unknown:
        print(f"Unknown argument(s): {', '.join(unknown)}", file=sys.stderr)
        return 2

    targets = resolve_targets(sys.argv[1:])

    results = []
    total_top_inserts = 0
    total_reminder_inserts = 0
    for agent in targets:
        tags = AGENT_QUALITY_BLOCKS.get(agent)
        if tags is None:
            results.append((agent, "NOT-IN-MATRIX", {}))
            continue
        path = AGENTS_DIR / f"{agent}.md"
        if not path.exists():
            results.append((agent, "MISSING", {}))
            continue
        original = path.read_text(encoding="utf-8")
        text = original
        per_tag = {}
        for tag in tags:
            text, st = inject_tag(text, tag)
            per_tag[tag] = st
            if st["top"] == "inserted":
                total_top_inserts += 1
            if st["reminder"] in ("before-closing", "appended-eof"):
                total_reminder_inserts += 1
        if text == original:
            results.append((agent, "NO-CHANGE", per_tag))
            continue
        if not dry_run:
            path.write_text(text, encoding="utf-8")
        results.append((agent, "DRY-RUN" if dry_run else "UPDATED", per_tag))

    print(f"{'AGENT':<26} {'STATUS':<13} TAG=top/reminder")
    print("-" * 100)
    for agent, kind, per_tag in results:
        if not per_tag:
            print(f"{agent:<26} {kind:<13}")
            continue
        parts = [f"{t}={s['top']}/{s['reminder']}" for t, s in per_tag.items()]
        print(f"{agent:<26} {kind:<13} " + "  ".join(parts))
    changed = sum(1 for _, k, _ in results if k in ("UPDATED", "DRY-RUN"))
    verb = "would change" if dry_run else "changed"
    print(
        f"\nAgents {verb}: {changed}  |  TOP inserts: {total_top_inserts}  |  "
        f"reminder inserts: {total_reminder_inserts}  (dry-run={dry_run})"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
