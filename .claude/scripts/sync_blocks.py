"""Helpers for loading canonical SYNC blocks from shared markdown."""
from __future__ import annotations

import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SYNC_SOURCE = PROJECT_ROOT / ".claude" / "skills" / "shared" / "sync-inline-versions.md"

# End-boundary markers for `find_sync_region_start` — priority order.
_REMINDER_OPEN_RE = re.compile(r"^<!-- SYNC:[^\n]*?:reminder -->\s*$", re.MULTILINE)
_STEP_TASK_CLOSING_RE = re.compile(r"^<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->\s*$", re.MULTILINE)
_CLOSING_REMINDERS_RE = re.compile(r"^## Closing Reminders\b.*$", re.MULTILINE)


def load_sync_body(tag: str) -> str:
    text = SYNC_SOURCE.read_text(encoding="utf-8")
    pattern = re.compile(rf"^## {re.escape(tag)}\s*\n(?P<body>.*?)(?=^---\s*$)", re.MULTILINE | re.DOTALL)
    match = pattern.search(text)
    if not match:
        raise ValueError(f"SYNC block not found: {tag}")
    return match.group("body").strip()


def load_wrapped_sync_block(tag: str) -> str:
    body = load_sync_body(tag)
    return f"<!-- {tag} -->\n\n{body}\n\n<!-- /{tag} -->\n"


def find_sync_region_start(text: str, search_from: int = 0) -> int:
    """Char offset of the first end-boundary marker that opens the SYNC region.

    The SYNC region sits between the main authored content and `## Closing Reminders`.
    Inject scripts insert TOP blocks BEFORE this offset; the migration script uses
    the same offset to determine where main content ends.

    Priority (canonical layout contract):
      1. `<!-- SYNC:*:reminder -->`
      2. `<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->`
      3. `## Closing Reminders`
      4. EOF (returns len(text))

    `search_from` lets callers skip matches that precede the main-content cursor.
    """
    for pattern in (_REMINDER_OPEN_RE, _STEP_TASK_CLOSING_RE, _CLOSING_REMINDERS_RE):
        m = pattern.search(text, pos=search_from)
        if m:
            return m.start()
    return len(text)


# ─── Guide carriers ─────────────────────────────────────────────────────────
# A converted skill carries a protocol as ONE guide line inside its PROTOCOL-GUIDES block
# instead of the full `<!-- SYNC:tag -->` body; hooks deliver the full text, and the line
# is the fallback pointer. `sync-update-blocks.py --mode=guide` writes the lines with
# `format_guide_line`; every sensor and injector asks `has_guide_entry`. This module and
# its twin `.claude/scripts/lib/protocol-guide-carrier.cjs` are the ONLY owners of the
# format: never copy the regex elsewhere. The twin-parity test in
# `.claude/scripts/tests/sync-update-blocks-guide.test.cjs` fails if the two disagree.
#
# Line format:  - `tag` — summary; when → path
# `summary` holds no `;`, neither text holds `→` or a line break (enforced where the text
# is authored, `.claude/skills/shared/protocol-groups.json`), and the path must end in
# `<tag>.md`, so a line cannot name one protocol while pointing at another's file.

GUIDE_BLOCK_START = "<!-- PROTOCOL-GUIDES:START -->"
GUIDE_BLOCK_END = "<!-- PROTOCOL-GUIDES:END -->"

_GUIDE_BLOCK_RE = re.compile(
    r"^[ \t]*<!-- PROTOCOL-GUIDES:START -->[ \t]*$(?P<body>.*?)^[ \t]*<!-- PROTOCOL-GUIDES:END -->[ \t]*$",
    re.MULTILINE | re.DOTALL,
)
_GUIDE_LINE_RE = re.compile(
    r"^- `(?P<tag>[a-z0-9][a-z0-9-]*)` — (?P<summary>[^;\n→]+?); (?P<when>[^\n→]+?) → (?P<path>\S+)[ \t]*$",
    re.MULTILINE,
)


def format_guide_line(tag: str, summary: str, when: str, path: str) -> str:
    """The one guide line for `tag`. Raises ValueError unless the recognizer reads back exactly
    the fields given (a `;` in the summary, for example, would silently shift into `when`)."""
    line = f"- `{tag}` — {summary}; {when} → {path}"
    parsed = _parse_guide_lines(line)
    if len(parsed) != 1 or parsed[0] != (tag, line, summary, when, path):
        raise ValueError(f"guide line for {tag!r} does not match the guide format: {line!r}")
    return line


def _parse_guide_lines(block_body: str) -> list:
    """Well-formed guide lines as (tag, line, summary, when, path) tuples."""
    out = []
    for m in _GUIDE_LINE_RE.finditer(block_body):
        tag, path = m.group("tag"), m.group("path")
        # The path must name this tag's own file (`<tag>.md`, any directory spelling, so a
        # host mirror's path rewrite still counts).
        if path.replace("\\", "/").rsplit("/", 1)[-1] == f"{tag}.md":
            out.append((tag, m.group(0), m.group("summary"), m.group("when"), path))
    return out


def guide_entries(text: str) -> dict:
    """{tag: guide line} for every well-formed guide line inside a PROTOCOL-GUIDES block."""
    normalized = str(text).replace("\r\n", "\n").replace("\r", "\n")
    entries = {}
    for block in _GUIDE_BLOCK_RE.finditer(normalized):
        for tag, line, _summary, _when, _path in _parse_guide_lines(block.group("body")):
            entries.setdefault(tag, line)
    return entries


def guide_tags(text: str) -> list:
    """Tags the text carries as guide entries, in first-seen order."""
    return list(guide_entries(text).keys())


def has_guide_entry(text: str, tag: str) -> bool:
    """True when the text carries `tag` as a guide entry (the shared carrier recognizer)."""
    return tag in guide_entries(text)


# ─── Universal bundle ───────────────────────────────────────────────────────
# The `universal` group of `.claude/skills/shared/protocol-groups.json` is the hook-delivered bundle
# of framework rules every task follows. No skill or agent carries any part of it: no body, no
# `:reminder`, no guide line and no pointer line. `strip_universal` is the one normaliser that keeps
# it that way (`sync-update-blocks.py --mode=strip-root-pointer`, and `sync-hooks-to-skills.py`); the
# recognizer of the retired `Root-carried protocols` pointer line below exists only so the strip and
# the verifiers can find a line that must not be there. This module and its twin
# `.claude/scripts/lib/protocol-guide-carrier.cjs` are the ONLY owners of that recognizer.
#
# Retired line format:  > **Root-carried protocols** — <text naming every tag>

GROUPS_FILE = PROJECT_ROOT / ".claude" / "skills" / "shared" / "protocol-groups.json"
UNIVERSAL_GROUP = "universal"
ROOT_POINTER_LEAD = "> **Root-carried protocols** — "
_ROOT_POINTER_RE = re.compile(r"^> \*\*Root-carried protocols\*\* — [^\n]*$", re.MULTILINE)

# Protocols an agent never carries because another agent block already states them: the folded
# tag's rules live in the named block, so the agent keeps one statement instead of two.
AGENT_FOLDED_TAGS = {"task-tracking-external-report": "agent-bootstrap"}


def universal_tags() -> list[str]:
    """Tags of the `universal` group, in file order. Fails closed: without the list every strip
    would silently cover the wrong set."""
    import json

    try:
        data = json.loads(GROUPS_FILE.read_text(encoding="utf-8"))
        tags = list(data["groups"][UNIVERSAL_GROUP]["tags"].keys())
    except (OSError, ValueError, KeyError, TypeError, AttributeError) as exc:
        raise SystemExit(f"ERROR: cannot read the universal group from {GROUPS_FILE}: {exc}")
    if not tags:
        raise SystemExit(f"ERROR: the universal group in {GROUPS_FILE} holds no tags")
    return tags


def root_pointer_lines(text: str) -> list[str]:
    """Every retired pointer-shaped line in the text (a duplicate counts)."""
    return _ROOT_POINTER_RE.findall(str(text).replace("\r\n", "\n").replace("\r", "\n"))


def has_root_pointer(text: str) -> bool:
    """True when the text carries the retired pointer line (the shared recognizer)."""
    return bool(root_pointer_lines(text))


def line_block_re(tag: str):
    """Whole-line `<!-- SYNC:tag -->` … `<!-- /SYNC:tag -->` fences. Line-anchored so a prose
    MENTION of a marker never counts, and exact so `tag` never matches `tag:reminder`."""
    t = re.escape(tag)
    open_re = re.compile(rf"^[ \t]*<!--\s*SYNC:{t}\s*-->[ \t]*\n", re.MULTILINE)
    close_re = re.compile(rf"^[ \t]*<!--\s*/SYNC:{t}\s*-->[ \t]*(?:\n|\Z)", re.MULTILINE)
    return open_re, close_re


def remove_fenced_block(content: str, full_tag: str):
    """Remove one whole fenced block (`full_tag` is `tag` or `tag:reminder`).
    Returns (new_content, removed_at or None, error or None)."""
    open_re, close_re = line_block_re(full_tag)
    opens = list(open_re.finditer(content))
    closes = list(close_re.finditer(content))
    if not opens and not closes:
        return content, None, None
    if len(opens) != 1 or len(closes) != 1:
        return content, None, f"unbalanced SYNC:{full_tag} tags ({len(opens)} open / {len(closes)} close)"
    start, end = opens[0].start(), closes[0].end()
    if end <= opens[0].end():
        return content, None, f"SYNC:{full_tag} close tag appears before open tag"
    # Drop the blank line that separated the block from what follows, so repeated
    # conversions do not accumulate blank lines.
    while content.startswith("\n", end):
        end += 1
    return content[:start] + content[end:], start, None


def strip_universal(content: str, strip_tags=None):
    """Bring one skill or agent text to the universal-bundle contract. Pure text function.

    Removes every body and `:reminder` fence of a universal tag (plus `strip_tags`, e.g. the
    agent-folded tags) and every line of the retired `Root-carried protocols` pointer, and never
    adds anything. A file that carries none of these is returned unchanged.
    Returns (new_content, removed_labels, errors). Idempotent.
    """
    strip = list(universal_tags()) + [t for t in (strip_tags or []) if t not in universal_tags()]
    removed: list[str] = []
    errors: list[str] = []
    for tag in strip:
        for full in (tag, f"{tag}:reminder"):
            content, at, err = remove_fenced_block(content, full)
            if err:
                errors.append(err)
            elif at is not None:
                removed.append(full)
    if errors:
        return content, [], errors

    for match in reversed(list(_ROOT_POINTER_RE.finditer(content))):
        start, end = match.start(), match.end()
        while content[end:end + 1] == "\n":
            end += 1
        if end >= len(content):
            content = content[:start].rstrip("\n") + "\n"
        else:
            content = content[:start] + content[end:]
        removed.append("root-pointer")
    return content, removed, []
