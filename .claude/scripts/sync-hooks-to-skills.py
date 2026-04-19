#!/usr/bin/env python3
"""
sync-hooks-to-skills.py
Inserts SYNC: blocks sourced from hooks into all SKILL.md and agent .md files.
Idempotent: skips files that already contain a given block.

Blocks inserted:
  - SYNC:critical-thinking-mindset  (from injectCriticalContext in prompt-injections.cjs)
  - SYNC:ai-mistake-prevention      (from injectAiMistakePrevention in prompt-injections.cjs)

Insertion point: after the first block of > lines (the [IMPORTANT] header), before ## headings.
Reminder lines: appended inside ## Closing Reminders if the section exists.
"""

import os
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
> - **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> - **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> - **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> - **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> - **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> - **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> - **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> - **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> - **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> - **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->""",
}

REMINDERS = {
    "critical-thinking-mindset": """\
  <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
  <!-- /SYNC:critical-thinking-mindset:reminder -->""",

    "ai-mistake-prevention": """\
  <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
  <!-- /SYNC:ai-mistake-prevention:reminder -->""",
}

BLOCK_ORDER = ["critical-thinking-mindset", "ai-mistake-prevention"]


# ─── File discovery ──────────────────────────────────────────────────────────

def find_target_files():
    skills_pattern = os.path.join(PROJECT_DIR, ".claude", "skills", "*", "SKILL.md")
    agents_pattern = os.path.join(PROJECT_DIR, ".claude", "agents", "*.md")
    files = sorted(glob_module.glob(skills_pattern)) + sorted(glob_module.glob(agents_pattern))
    return files


# ─── Insertion logic ─────────────────────────────────────────────────────────

def find_frontmatter_end(lines):
    """Return index of the line AFTER the closing --- of frontmatter. 0 if no frontmatter."""
    if not lines or lines[0].strip() != "---":
        return 0
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            return i + 1
    return 0


def find_body_insert_point(lines, fm_end):
    """
    Find insertion point: after the first contiguous block of > lines past frontmatter.
    If no > block exists, return fm_end (insert right after frontmatter).
    """
    i = fm_end
    # Skip leading blank lines
    while i < len(lines) and not lines[i].strip():
        i += 1

    if i >= len(lines):
        return i

    # If first content is a > block, consume it (including interior blank lines)
    if lines[i].startswith(">"):
        # Walk forward through > lines and blank separators between > paragraphs
        j = i
        while j < len(lines):
            stripped = lines[j].strip()
            if stripped.startswith(">"):
                j += 1
            elif stripped == "":
                # Peek ahead — if next non-blank is also >, continue; else stop
                k = j + 1
                while k < len(lines) and not lines[k].strip():
                    k += 1
                if k < len(lines) and lines[k].startswith(">"):
                    j = k
                else:
                    break
            else:
                break
        return j  # insert after the > block

    # No > block — insert right at start of content
    return i


def find_closing_reminders_end(lines):
    """
    Return index just before the end of ## Closing Reminders section.
    Returns -1 if the section doesn't exist.
    """
    start = -1
    for i, line in enumerate(lines):
        if line.strip().startswith("## Closing Reminders"):
            start = i
            break
    if start == -1:
        return -1

    # Find end: next ## heading or EOF
    for i in range(start + 1, len(lines)):
        if lines[i].startswith("## ") or lines[i].startswith("# "):
            return i  # insert before this heading
    return len(lines)  # insert at EOF


def block_present(content, block_name):
    return f"<!-- SYNC:{block_name} -->" in content or f"<!-- SYNC:{block_name}:reminder -->" in content


def process_file(path, dry_run=False):
    with open(path, "r", encoding="utf-8") as f:
        original = f.read()

    lines = original.splitlines()

    missing_blocks = [name for name in BLOCK_ORDER if not block_present(original, name)]
    missing_reminders = [name for name in BLOCK_ORDER
                         if f"<!-- SYNC:{name}:reminder -->" not in original
                         and f"<!-- SYNC:{name} -->" not in original]

    if not missing_blocks and not missing_reminders:
        return "skip"

    fm_end = find_frontmatter_end(lines)
    insert_at = find_body_insert_point(lines, fm_end)

    # Build the block text to inject
    blocks_to_insert = []
    for name in BLOCK_ORDER:
        if name in missing_blocks:
            blocks_to_insert.append(BLOCKS[name])

    if blocks_to_insert:
        insert_text = "\n\n" + "\n\n".join(blocks_to_insert) + "\n"
        insert_lines = insert_text.splitlines()
        lines = lines[:insert_at] + insert_lines + lines[insert_at:]

    # Re-compute content for reminder insertion (lines may have shifted)
    content_after_blocks = "\n".join(lines)

    if missing_reminders:
        lines2 = content_after_blocks.splitlines()
        closing_end = find_closing_reminders_end(lines2)
        if closing_end != -1:
            reminder_lines = []
            for name in BLOCK_ORDER:
                if name in missing_reminders and f"<!-- SYNC:{name}:reminder -->" not in content_after_blocks:
                    reminder_lines.extend(REMINDERS[name].splitlines())
            if reminder_lines:
                lines2 = lines2[:closing_end] + reminder_lines + lines2[closing_end:]
        content_after_blocks = "\n".join(lines2)

    if not dry_run:
        with open(path, "w", encoding="utf-8", newline="\n") as f:
            f.write(content_after_blocks)

    return "updated"


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    dry_run = "--dry-run" in sys.argv
    verbose = "--verbose" in sys.argv or "-v" in sys.argv

    files = find_target_files()
    if not files:
        print("No target files found. Check PROJECT_DIR.")
        sys.exit(1)

    updated = 0
    skipped = 0
    errors = []

    for path in files:
        rel = os.path.relpath(path, PROJECT_DIR)
        try:
            result = process_file(path, dry_run=dry_run)
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
    print(f"\n{mode}Done: {updated} updated, {skipped} skipped, {len(errors)} errors / {len(files)} total files")
    if errors:
        print("\nErrors:")
        for rel, msg in errors:
            print(f"  {rel}: {msg}")
        sys.exit(1)


if __name__ == "__main__":
    main()
