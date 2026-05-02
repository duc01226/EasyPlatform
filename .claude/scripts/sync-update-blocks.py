#!/usr/bin/env python3
"""
sync-update-blocks.py
Operation A from sync-protocols: replace SYNC: block contents in all SKILL.md / agent .md
files using canonical content from .claude/skills/shared/sync-inline-versions.md.

Usage:
    python sync-update-blocks.py <tag> [<tag> ...]
    python sync-update-blocks.py --dry-run <tag> [<tag> ...]

Touches ONLY content between <!-- SYNC:tag --> and <!-- /SYNC:tag -->.
Does NOT touch :reminder blocks.
"""
import os
import re
import sys
import glob

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CANONICAL = os.path.join(PROJECT_DIR, ".claude", "skills", "shared", "sync-inline-versions.md")


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
        os.path.join(PROJECT_DIR, ".claude", "agents", "*.md"),
    ]
    files = []
    for p in patterns:
        files.extend(sorted(glob.glob(p)))
    return files


def replace_block_in_file(path, tag, body, dry_run=False):
    """Replace content between <!-- SYNC:tag --> and <!-- /SYNC:tag --> with body.
    Skip the :reminder variant. Returns (changed, error_msg_or_None)."""
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Match open/close tags but NOT the :reminder variant
    # Open: <!-- SYNC:tag -->   (must NOT be followed by ":reminder")
    # Close: <!-- /SYNC:tag -->
    open_re = re.compile(rf"<!--\s*SYNC:{re.escape(tag)}\s*-->")
    close_re = re.compile(rf"<!--\s*/SYNC:{re.escape(tag)}\s*-->")

    open_matches = [m for m in open_re.finditer(content)]
    close_matches = [m for m in close_re.finditer(content)]

    # Filter out :reminder occurrences (those are SYNC:tag:reminder which won't match the strict regex above
    # because of the trailing :reminder before the -->. Our regex requires \s*--> so :reminder is excluded.)

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
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_content)
    return True, None


def main(argv):
    args = argv[1:]
    dry_run = False
    if args and args[0] == "--dry-run":
        dry_run = True
        args = args[1:]
    if not args:
        print("Usage: sync-update-blocks.py [--dry-run] <tag> [<tag> ...]", file=sys.stderr)
        return 2

    files = find_target_files()
    print(f"Found {len(files)} target files (SKILL.md + agent .md)")

    overall_changed = 0
    overall_errors = []
    for tag in args:
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


if __name__ == "__main__":
    sys.exit(main(sys.argv))
