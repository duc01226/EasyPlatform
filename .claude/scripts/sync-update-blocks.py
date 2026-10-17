#!/usr/bin/env python3
"""
sync-update-blocks.py
Operation A from sync-skills-shared-protocols: replace SYNC: block contents in all SKILL.md / agent .md
files using canonical content from .claude/skills/shared/sync-inline-versions.md.

Usage (Windows: `py -3`; macOS/Linux: `python3`):
    sync-update-blocks.py [--dry-run] <tag> [<tag> ...]
    sync-update-blocks.py [--dry-run] --mode=guide --tags <tag>[,<tag> ...]
    sync-update-blocks.py [--dry-run] --mode=strip-root-pointer

Default mode (`--mode=sync`) touches ONLY content between the exact requested fence pair:
    <!-- SYNC:tag --> ... <!-- /SYNC:tag -->
or:
    <!-- SYNC:tag:reminder --> ... <!-- /SYNC:tag:reminder -->
in every carrier of find_target_files(): skill SKILL.md (the `_templates/*/SKILL.md` skill template
included), skill references/*.md AND agent .md.

Guide mode (`--mode=guide`) converts a skill to the hybrid policy
(`SYNC:shared-protocol-duplication-policy`): each requested `<!-- SYNC:tag -->` body block in a
skill's SKILL.md is replaced by ONE guide line in that file's PROTOCOL-GUIDES block, and the
`:reminder` digests stay. It writes only `.claude/skills/<name>/SKILL.md`, never an agent file,
never a `references/*.md` file, and never a skill listed in `inlineSkills` of
`.claude/skills/shared/protocol-groups.json`. Guide text comes from the generated projection index
(`.claude/skills/shared/protocols/index.json`; build it with
`node .claude/scripts/build-protocol-projection.cjs`). Re-running is a no-op. `--dry-run` writes
nothing and prints the byte delta per skill. A universal tag (the hook-delivered `universal` group) is
never converted to a guide line.

Strip mode (`--mode=strip-root-pointer`) applies the universal-bundle contract of
`SYNC:shared-protocol-duplication-policy` to every skill SKILL.md (inline skills included) and
every agent .md: any body or `:reminder` of a universal tag and any retired `Root-carried protocols`
pointer line is removed, and nothing is added (agents also drop the agent-folded tags,
`sync_blocks.AGENT_FOLDED_TAGS`). The hooks deliver the bundle, so no carrier holds any part of it.
It takes no tags, never touches `references/*.md`, and re-running is a no-op. `--dry-run` prints the
byte delta per kind.
"""
import argparse
import glob
import json
import os
import re
import sys

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CANONICAL = os.path.join(PROJECT_DIR, ".claude", "skills", "shared", "sync-inline-versions.md")
GROUPS_FILE = os.path.join(PROJECT_DIR, ".claude", "skills", "shared", "protocol-groups.json")
PROJECTION_INDEX = os.path.join(PROJECT_DIR, ".claude", "skills", "shared", "protocols", "index.json")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sync_blocks import (  # noqa: E402  (path set up above so the tool runs from any cwd)
    AGENT_FOLDED_TAGS,
    GUIDE_BLOCK_END,
    GUIDE_BLOCK_START,
    format_guide_line,
    guide_entries,
    remove_fenced_block,
    strip_universal,
    universal_tags,
)
# One owner for the keep-the-file's-own-newline rule (read_text / write_text).
from line_endings import read_text, write_text  # noqa: E402

# The fallback instruction every PROTOCOL-GUIDES block opens with. Changing it changes every
# converted skill on the next guide run, so keep it short and stable.
GUIDE_BLOCK_INTRO = (
    "> **Protocol guides** — Apply each protocol only when its read-when condition holds. "
    "If a protocol's text is not in your context, read its file below before you act on it."
)
BASE_TAG_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")


def read_canonical_block(tag):
    """Return body text (between open and close tags) from canonical for tag."""
    with open(CANONICAL, "r", encoding="utf-8") as f:
        text = f.read()
    # Find the section header "## SYNC:{tag}" then read until next "---" line at column 0
    section_re = re.compile(rf"^## SYNC:{re.escape(tag)}\s*\n(.*?)(?=\n---\s*\n|\n## SYNC:)", re.DOTALL | re.MULTILINE)
    m = section_re.search(text)
    if not m:
        raise SystemExit(f"ERROR: section '## SYNC:{tag}' not found in {CANONICAL}")
    body = m.group(1).strip("\n")
    return body


def find_target_files():
    patterns = [
        os.path.join(PROJECT_DIR, ".claude", "skills", "*", "SKILL.md"),
        # The skill template is the file every new skill is cloned from: a stale SYNC block there
        # ships to each skill created from it, so it is a carrier like any SKILL.md. It is not a
        # guide-conversion target (find_guide_target_files keeps only direct skills/<name>/SKILL.md).
        os.path.join(PROJECT_DIR, ".claude", "skills", "_templates", "*", "SKILL.md"),
        # A skill's reference bodies are loaded as procedure and duplicate across skills
        # exactly like SKILL.md does. Excluding them made a SYNC: block there inert —
        # written once, propagated never, and invisible to sync-carrier-parity, which
        # derives its carrier set the same way. Both scopes must match — and that match is
        # ASSERTED by the PARITY test in sync-carrier-parity.test.cjs, which shells this
        # function and compares the two sets. A comment is not a sensor; that test is.
        os.path.join(PROJECT_DIR, ".claude", "skills", "*", "references", "*.md"),
        os.path.join(PROJECT_DIR, ".claude", "agents", "*.md"),
    ]
    files = []
    for p in patterns:
        files.extend(sorted(glob.glob(p)))
    return files


def replace_block_in_file(path, tag, body, dry_run=False):
    """Replace content between the exact requested SYNC fence pair with body.
    Returns (changed, error_msg_or_None)."""
    content, newline = read_text(path)

    # Match the exact open/close tags. A plain tag does not match its :reminder
    # variant because the regex requires whitespace before the closing marker.
    open_re = re.compile(rf"<!--\s*SYNC:{re.escape(tag)}\s*-->")
    close_re = re.compile(rf"<!--\s*/SYNC:{re.escape(tag)}\s*-->")

    open_matches = [m for m in open_re.finditer(content)]
    close_matches = [m for m in close_re.finditer(content)]

    if not open_matches and not close_matches:
        return False, None  # tag not present in this file
    if len(open_matches) != 1 or len(close_matches) != 1:
        return False, f"unbalanced SYNC:{tag} tags ({len(open_matches)} open / {len(close_matches)} close)"

    open_end = open_matches[0].end()
    close_start = close_matches[0].start()
    if open_end > close_start:
        return False, f"SYNC:{tag} close tag appears before open tag"

    # Preserve any leading/trailing whitespace style of the original block
    new_block = "\n\n" + body + "\n\n"
    new_content = content[:open_end] + new_block + content[close_start:]

    if new_content == content:
        return False, None

    if not dry_run:
        write_text(path, new_content, newline)
    return True, None


# ─── Guide mode ─────────────────────────────────────────────────────────────


def load_inline_skills():
    """`inlineSkills` from protocol-groups.json. Fails closed: without the list, guide mode
    cannot know which skills must keep their full bodies (BR-PDL-11)."""
    try:
        with open(GROUPS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, ValueError) as exc:
        raise SystemExit(f"ERROR: cannot read inlineSkills from {GROUPS_FILE}: {exc}")
    inline = data.get("inlineSkills")
    if not isinstance(inline, list) or not all(isinstance(s, str) and s for s in inline):
        raise SystemExit(f"ERROR: {GROUPS_FILE} has no valid inlineSkills list")
    return set(inline)


def load_guide_rows():
    """{tag: index row} from the projection index. Fails closed: a guide line must point at a
    published file, so guide mode never runs without the projection."""
    try:
        with open(PROJECTION_INDEX, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, ValueError) as exc:
        raise SystemExit(
            f"ERROR: cannot read the projection index {PROJECTION_INDEX}: {exc}\n"
            "Build it first: node .claude/scripts/build-protocol-projection.cjs"
        )
    rows = data.get("tags") if isinstance(data, dict) else None
    if not isinstance(rows, list):
        raise SystemExit(f"ERROR: {PROJECTION_INDEX} has no tags list")
    return {row["tag"]: row for row in rows if isinstance(row, dict) and isinstance(row.get("tag"), str)}


def find_guide_target_files(inline_skills):
    """Guide carriers: find_target_files() minus agents, minus references/*.md, minus inline skills.
    Derived from the propagation set so the two scopes can only narrow, never diverge."""
    skills_dir = os.path.normcase(os.path.join(PROJECT_DIR, ".claude", "skills"))
    out = []
    for path in find_target_files():
        parent, name = os.path.split(path)
        if name != "SKILL.md":
            continue
        grand, skill = os.path.split(parent)
        if os.path.normcase(grand) != skills_dir or skill in inline_skills:
            continue
        out.append(path)
    return out


def _remove_body_block(content, tag):
    """Remove one tag's full body block (the shared owner is `sync_blocks.remove_fenced_block`)."""
    return remove_fenced_block(content, tag)


def _render_guide_block(lines):
    return GUIDE_BLOCK_START + "\n\n" + GUIDE_BLOCK_INTRO + "\n\n" + "\n".join(lines) + "\n\n" + GUIDE_BLOCK_END + "\n"


_EXISTING_BLOCK_RE = re.compile(
    r"^[ \t]*<!-- PROTOCOL-GUIDES:START -->[ \t]*\n.*?^[ \t]*<!-- PROTOCOL-GUIDES:END -->[ \t]*(?:\n|\Z)",
    re.MULTILINE | re.DOTALL,
)


def convert_to_guides(content, tags, rows):
    """Pure conversion of one SKILL.md text. Returns (new_content, converted_tags, errors)."""
    errors = []
    removed_at = []
    converted = []
    for tag in tags:
        content, at, err = _remove_body_block(content, tag)
        if err:
            errors.append(err)
        elif at is not None:
            removed_at.append(at)
            converted.append(tag)
    if errors:
        return None, [], errors

    existing = guide_entries(content)
    wanted = dict(existing)
    for tag in tags:
        if tag in converted or tag in existing:
            row = rows[tag]
            # Refresh existing lines too, so a changed summary/when reaches every carrier.
            wanted[tag] = format_guide_line(tag, row["summary"], row["when"], row["file"])
    if not wanted:
        return content, [], []  # this skill carries none of the tags as body or guide

    block_text = _render_guide_block([wanted[t] for t in sorted(wanted)])
    match = _EXISTING_BLOCK_RE.search(content)
    if match:
        return content[: match.start()] + block_text + content[match.end():], converted, []
    # New block: where the first converted body was, followed by one blank line.
    at = min(removed_at)
    return content[:at] + block_text + "\n" + content[at:], converted, []


def run_guide_mode(tags, dry_run):
    bad = [t for t in tags if not BASE_TAG_RE.match(t)]
    if bad:
        print(f"ERROR: guide mode converts base tags only (no :reminder/:full variants): {', '.join(bad)}", file=sys.stderr)
        return 2
    universal = [t for t in tags if t in set(universal_tags())]
    if universal:
        print(
            f"ERROR: universal tags are never converted to guide lines: {', '.join(universal)} "
            "(the universal hook delivers them; no skill or agent carries any part of them)",
            file=sys.stderr,
        )
        return 2
    rows = load_guide_rows()
    unknown = [t for t in tags if t not in rows]
    if unknown:
        print(
            f"ERROR: no published projection for: {', '.join(unknown)} "
            "(a guide line must point at a published file; rebuild with node .claude/scripts/build-protocol-projection.cjs)",
            file=sys.stderr,
        )
        return 2
    inline_skills = load_inline_skills()
    files = find_guide_target_files(inline_skills)
    print(
        f"Guide mode: {len(files)} skill SKILL.md files (agents, references/*.md and "
        f"{len(inline_skills)} inlineSkills excluded); tags: {', '.join(tags)}"
    )

    changed, errors, total_delta = 0, [], 0
    for path in files:
        content, newline = read_text(path)
        new_content, converted, errs = convert_to_guides(content, tags, rows)
        rel = os.path.relpath(path, PROJECT_DIR).replace(os.sep, "/")
        if errs:
            errors.extend((rel, e) for e in errs)
            continue
        if new_content == content:
            continue
        delta = len(new_content.encode("utf-8")) - len(content.encode("utf-8"))
        total_delta += delta
        changed += 1
        label = ", ".join(converted) if converted else "guide lines refreshed"
        print(f"  {rel}: {delta:+d} bytes ({label})")
        if not dry_run:
            write_text(path, new_content, newline)

    if errors:
        print("\nERRORS (file left unchanged):")
        for rel, err in errors:
            print(f"  {rel}: {err}")
    print(f"\nTotal skills changed: {changed}, byte delta {total_delta:+d} (dry-run={dry_run})")
    return 0 if not errors else 1


# ─── Strip mode ─────────────────────────────────────────────────────────────


def find_strip_target_files():
    """[(path, kind)] for every skill SKILL.md (inline skills included) and every agent .md.
    Derived from find_target_files(); skill references/*.md never carried the universal set."""
    out = []
    for path in find_target_files():
        parent, name = os.path.split(path)
        if name == "SKILL.md":
            out.append((path, "skill"))
        elif os.path.basename(parent) == "agents":
            out.append((path, "agent"))
    return out


def run_strip_mode(dry_run):
    files = find_strip_target_files()
    print(f"Strip mode: {len(files)} files (skill SKILL.md + agent .md); universal tags: {', '.join(universal_tags())}")
    changed, errors = 0, []
    totals = {"skill": [0, 0], "agent": [0, 0]}
    for path, kind in files:
        content, newline = read_text(path)
        strip = list(AGENT_FOLDED_TAGS) if kind == "agent" else None
        new_content, removed, errs = strip_universal(content, strip)
        rel = os.path.relpath(path, PROJECT_DIR).replace(os.sep, "/")
        if errs:
            errors.extend((rel, e) for e in errs)
            continue
        if new_content == content:
            continue
        delta = len(new_content.encode("utf-8")) - len(content.encode("utf-8"))
        totals[kind][0] += 1
        totals[kind][1] += delta
        changed += 1
        print(f"  {rel}: {delta:+d} bytes ({len(removed)} removed)")
        if not dry_run:
            write_text(path, new_content, newline)
    if errors:
        print("\nERRORS (file left unchanged):")
        for rel, err in errors:
            print(f"  {rel}: {err}")
    for kind, (n, delta) in totals.items():
        print(f"{kind}: {n} changed, byte delta {delta:+d}")
    print(f"\nTotal files changed: {changed} (dry-run={dry_run})")
    return 0 if not errors else 1


# ─── CLI ────────────────────────────────────────────────────────────────────


def run_sync_mode(tags, dry_run):
    files = find_target_files()
    print(f"Found {len(files)} target files (SKILL.md + skill references/*.md + agent .md)")

    overall_changed = 0
    overall_errors = []
    for tag in tags:
        body = read_canonical_block(tag)
        print(f"\n=== Syncing SYNC:{tag} ({len(body)} chars from canonical) ===")
        changed_count = 0
        skipped_count = 0
        for path in files:
            changed, err = replace_block_in_file(path, tag, body, dry_run=dry_run)
            if err:
                overall_errors.append((path, tag, err))
                continue
            if changed:
                changed_count += 1
            else:
                skipped_count += 1
        print(f"  changed: {changed_count}, no-op or absent: {skipped_count}")
        overall_changed += changed_count

    if overall_errors:
        print("\nERRORS:")
        for path, tag, err in overall_errors:
            print(f"  [{tag}] {path}: {err}")

    print(f"\nTotal files changed: {overall_changed} (dry-run={dry_run})")
    return 0 if not overall_errors else 1


def parse_args(argv):
    parser = argparse.ArgumentParser(
        prog="sync-update-blocks.py",
        description="Propagate canonical SYNC bodies (default) or convert skills to guide lines (--mode=guide).",
    )
    parser.add_argument("--dry-run", action="store_true", help="write nothing; guide mode prints the byte delta per skill")
    parser.add_argument("--mode", choices=("sync", "guide", "strip-root-pointer"), default="sync")
    parser.add_argument("--tags", default="", help="comma-separated tags (also accepted as positional arguments)")
    parser.add_argument("tag", nargs="*")
    args = parser.parse_args(argv)
    tags = [t for t in args.tag] + [t.strip() for t in args.tags.split(",") if t.strip()]
    args.tags = list(dict.fromkeys(tags))
    if args.mode == "strip-root-pointer":
        if args.tags:
            parser.error("--mode=strip-root-pointer takes no tags (it strips the universal group)")
    elif not args.tags:
        parser.error("name at least one tag (positional or --tags)")
    return args


def main(argv):
    args = parse_args(argv[1:])
    if args.mode == "strip-root-pointer":
        return run_strip_mode(args.dry_run)
    if args.mode == "guide":
        return run_guide_mode(args.tags, args.dry_run)
    return run_sync_mode(args.tags, args.dry_run)


if __name__ == "__main__":
    sys.exit(main(sys.argv))
