#!/usr/bin/env python3
"""Render the canonical skill connection block into every agent prompt.

The connection map lives in ``agent_protocol_matrix.AGENT_SKILL_CONNECTIONS``.
This injector keeps that routing metadata visible in the source agent prompt so
both Claude and Codex can see which skill contract owns an agent's task. It is
deliberately separate from the quality-block injector: the map does not blanket
copy skill bodies or orchestration instructions into a leaf sub-agent.

Only the marked connection section is replaced. All authored agent content,
design guidance, and SYNC blocks outside that section are preserved byte-for-
byte. The operation is idempotent.

Usage:
    python inject_agent_skill_connections.py [--dry-run]
        [--agents=architect,tester]
"""
from __future__ import annotations

import re
import sys

from line_endings import read_text, write_text
from agent_protocol_matrix import (
    AGENT_SKILL_CONNECTIONS,
    AGENT_SKILL_CONNECTIONS_CLOSE,
    AGENT_SKILL_CONNECTIONS_OPEN,
    AGENTS_DIR,
)


CONNECTION_RE = re.compile(
    rf"{re.escape(AGENT_SKILL_CONNECTIONS_OPEN)}.*?"
    rf"{re.escape(AGENT_SKILL_CONNECTIONS_CLOSE)}",
    re.DOTALL,
)
FRONTMATTER_RE = re.compile(r"^---\s*\n.*?\n---\s*\n", re.DOTALL)


def render_connection_block(agent: str) -> str:
    """Render one agent's current canonical skill connection block."""
    skills = AGENT_SKILL_CONNECTIONS[agent]
    lines = [
        AGENT_SKILL_CONNECTIONS_OPEN,
        "## Connected Skill Contracts",
        "",
        "> **Skill connection:** Apply the task-specific procedure from the connected canonical skill contract that matches the assigned brief.",
        "> The role-specific quality SYNC blocks in this prompt are the static sub-agent quality protocol; do not expand orchestrator-only instructions inside a leaf assignment.",
        "",
        "Connected contracts:",
    ]
    lines.extend(f"- `{skill}`" for skill in skills)
    lines.append(AGENT_SKILL_CONNECTIONS_CLOSE)
    return "\n".join(lines)


def replace_or_insert(text: str, agent: str) -> tuple[str, str]:
    """Replace the generated block or insert it immediately after frontmatter."""
    block = render_connection_block(agent)
    match = CONNECTION_RE.search(text)
    if match:
        if match.group(0).strip() == block.strip():
            return text, "present"
        return text[: match.start()] + block + text[match.end():], "refreshed"

    frontmatter = FRONTMATTER_RE.match(text)
    insert_at = frontmatter.end() if frontmatter else 0
    head = text[:insert_at].rstrip()
    tail = text[insert_at:].lstrip("\n")
    rendered = block + (f"\n\n{tail}" if tail else "\n")
    return (f"{head}\n\n{rendered}" if head else rendered), "inserted"


def resolve_targets(argv: list[str]) -> list[str]:
    """Resolve an optional comma-separated agent selector in stable order."""
    selectors = []
    for arg in argv:
        if arg.startswith("--agents="):
            selectors.extend(x.strip() for x in arg.split("=", 1)[1].split(",") if x.strip())
    targets = selectors or list(AGENT_SKILL_CONNECTIONS)
    unknown = sorted(set(targets) - set(AGENT_SKILL_CONNECTIONS))
    if unknown:
        raise SystemExit(
            f"Unknown agent(s): {', '.join(unknown)}. "
            f"Known: {', '.join(AGENT_SKILL_CONNECTIONS)}"
        )
    seen: set[str] = set()
    return [agent for agent in targets if not (agent in seen or seen.add(agent))]


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    unknown = [
        arg for arg in sys.argv[1:]
        if arg != "--dry-run" and not arg.startswith("--agents=")
    ]
    if unknown:
        print(f"Unknown argument(s): {', '.join(unknown)}", file=sys.stderr)
        return 2

    try:
        targets = resolve_targets(sys.argv[1:])
    except SystemExit as error:
        print(error, file=sys.stderr)
        return 2

    results: list[tuple[str, str]] = []
    for agent in targets:
        path = AGENTS_DIR / f"{agent}.md"
        if not path.exists():
            results.append((agent, "MISSING"))
            continue
        original, newline = read_text(path)
        updated, status = replace_or_insert(original, agent)
        if status != "present" and not dry_run:
            write_text(path, updated, newline)
        results.append((agent, "DRY-RUN" if dry_run and status != "present" else status.upper()))

    print(f"{'AGENT':<26} STATUS")
    print("-" * 42)
    for agent, status in results:
        print(f"{agent:<26} {status}")
    changed = sum(status in {"DRY-RUN", "INSERTED", "REFRESHED"} for _, status in results)
    verb = "would change" if dry_run else "changed"
    print(f"\nAgents {verb}: {changed}  (dry-run={dry_run})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
