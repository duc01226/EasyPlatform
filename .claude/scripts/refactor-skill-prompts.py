#!/usr/bin/env python3
"""
Refactor skill SKILL.md files for AI attention anchoring best practices.

Two transformations:
1. Replace bare "MUST ATTENTION READ" references with inline summary + read instruction
2. Add "Closing Reminders" bottom anchoring section if missing

Usage:
    python .claude/scripts/refactor-skill-prompts.py --dry-run     # Preview changes
    python .claude/scripts/refactor-skill-prompts.py --apply        # Apply changes
    python .claude/scripts/refactor-skill-prompts.py --apply --only cook,fix  # Specific skills
    python .claude/scripts/refactor-skill-prompts.py --verify       # Verify all skills
"""

import os
import re
import sys
import argparse
from pathlib import Path

# Inline summary map: protocol filename → (short_label, inline_summary)
INLINE_SUMMARIES = {
    # --- All shared protocol files deleted, content now inlined via SYNC tags ---
    # understand-code-first-protocol.md — removed (inlined via SYNC:understand-code-first)
    # evidence-based-reasoning-protocol.md — removed (inlined via SYNC:evidence-based-reasoning)
    # rationalization-prevention-protocol.md — removed (inlined via SYNC:rationalization-prevention)
    # red-flag-stop-conditions-protocol.md — removed (inlined via SYNC:red-flag-stop-conditions)
    # graph-assisted-investigation-protocol.md — removed (inlined via SYNC:graph-assisted-investigation)
    # ui-system-context.md — removed (inlined via SYNC:ui-system-context)
    # iterative-phase-quality-protocol.md — removed (inlined via SYNC:iterative-phase-quality)
    # plan-quality-protocol.md — removed (inlined via SYNC:plan-quality)
    # two-stage-task-review-protocol.md — removed (inlined via SYNC:two-stage-task-review)
    # estimation-framework.md — removed (inlined via SYNC:estimation-framework)
    # design-patterns-quality-checklist.md — removed (inlined via SYNC:design-patterns-quality)
    # double-round-trip-review-protocol.md — removed (inlined via SYNC:double-round-trip-review)
    # scaffold-production-readiness-protocol.md — removed (inlined via SYNC:scaffold-production-readiness)
    # cross-cutting-quality-concerns-protocol.md — removed (content inlined in consuming skills)
    # ba-team-decision-model-protocol.md — removed (inlined via SYNC:ba-team-decision-model)
    # refinement-dor-checklist-protocol.md — removed (inlined via SYNC:refinement-dor-checklist)
    # design-system-check.md — removed (inlined via SYNC:design-system-check)
    # ui-wireframe-protocol.md — removed (content inlined in consuming skills)
    # web-research-protocol.md — removed (content inlined in consuming skills)
    # scan-and-update-reference-doc-protocol.md — removed (content inlined in consuming skills)
    # graph-intelligence-queries.md — removed (inlined via SYNC:graph-intelligence-queries)
    # graph-impact-analysis-protocol.md — removed (inlined via SYNC:graph-impact-analysis)
}

# Standard Closing Reminders text
CLOSING_REMINDERS = """
---

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
"""

# Skill-type-specific closing reminders additions
CLOSING_EXTRAS_BY_TYPE = {
    "review": "- **MANDATORY IMPORTANT MUST ATTENTION** execute two review rounds (Round 1: understand, Round 2: catch missed issues)\n",
    "fix": "- **MANDATORY IMPORTANT MUST ATTENTION** STOP after 3 failed fix attempts — report outcomes, ask user before #4\n",
    "cook": "- **MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via `AskUserQuestion` — never auto-decide\n",
    "plan": "- **MANDATORY IMPORTANT MUST ATTENTION** include Test Specifications section and story_points in plan frontmatter\n",
    "implementation": "- **MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via `AskUserQuestion` — never auto-decide\n",
}


def get_skill_type(skill_name):
    """Determine skill type from name for type-specific closing extras."""
    if any(k in skill_name for k in ["review", "code-review", "sre-review"]):
        return "review"
    if any(k in skill_name for k in ["fix", "debug", "prove-fix"]):
        return "fix"
    if any(k in skill_name for k in ["cook", "code-auto", "code-no-test", "code-parallel"]):
        return "cook"
    if any(k in skill_name for k in ["plan", "planning"]):
        return "plan"
    if any(k in skill_name for k in ["feature-implementation", "create-feature"]):
        return "implementation"
    return None


def find_protocol_filename(text):
    """Extract protocol filename from a MUST ATTENTION READ reference line."""
    # Match patterns like `.claude/skills/shared/filename.md` or `shared/filename.md`
    match = re.search(r'(?:\.claude/skills/)?shared/([a-z0-9-]+\.md)', text)
    if match:
        return match.group(1)
    return None


def build_inline_reference(protocol_filename, original_path):
    """Build inline summary + read instruction for a protocol reference."""
    if protocol_filename not in INLINE_SUMMARIES:
        return None
    label, summary = INLINE_SUMMARIES[protocol_filename]
    return f"> **{label}** — {summary}\n> MUST ATTENTION READ `{original_path}` for full protocol and checklists."


def has_closing_reminders(content):
    """Check if skill already has a Closing Reminders section."""
    return bool(re.search(r'##\s*Closing Reminders', content))


def has_quick_summary(content):
    """Check if skill already has a Quick Summary section."""
    return bool(re.search(r'##\s*Quick Summary', content))


def is_workflow_redirect(content):
    """Check if skill is a simple workflow redirect (minimal content)."""
    # Workflow redirects typically just say "activate the X workflow"
    return bool(re.search(r'Activate the `\w+` workflow\. Run `/workflow-start', content))


def transform_must_read_references(content):
    """Transform bare MUST ATTENTION READ references into inline summary + read instructions."""
    changes = 0

    # Pattern 1: **Prerequisites:** **MUST ATTENTION READ** `path` before executing.
    # This is usually a standalone line or combined with AND
    def replace_prereq_line(match):
        nonlocal changes
        full_line = match.group(0)
        # Find all protocol paths in this line
        paths = re.findall(r'`(\.claude/skills/shared/[a-z0-9-]+\.md)`', full_line)
        if not paths:
            return full_line

        replacements = []
        for path in paths:
            filename = os.path.basename(path)
            inline = build_inline_reference(filename, path)
            if inline:
                replacements.append(inline)
                changes += 1

        if not replacements:
            return full_line

        return "\n\n".join(replacements)

    # Match prerequisite lines with MUST ATTENTION READ shared protocol references
    content = re.sub(
        r'\*\*Prerequisites:\*\*\s*\*\*(?:MUST ATTENTION READ|⚠️ MUST ATTENTION READ)\*\*\s*`\.claude/skills/shared/[^`]+`(?:\s*AND\s*`\.claude/skills/shared/[^`]+`)*\s*before executing\.',
        replace_prereq_line,
        content
    )

    # Pattern 2: > **Process Discipline:** MUST ATTENTION READ `path` — description
    def replace_process_line(match):
        nonlocal changes
        full_line = match.group(0)
        path_match = re.search(r'`(\.claude/skills/shared/([a-z0-9-]+\.md))`', full_line)
        if not path_match:
            return full_line
        path, filename = path_match.group(1), path_match.group(2)
        inline = build_inline_reference(filename, path)
        if inline:
            changes += 1
            return inline
        return full_line

    content = re.sub(
        r'>\s*\*\*Process Discipline:\*\*\s*MUST ATTENTION READ\s*`\.claude/skills/shared/[^`]+`\s*[^\n]*',
        replace_process_line,
        content
    )

    # Pattern 3: > **Graph Intelligence (MANDATORY when graph.db exists):** MUST ATTENTION READ `path`. ...rest
    def replace_graph_line(match):
        nonlocal changes
        full_line = match.group(0)
        path_match = re.search(r'`(\.claude/skills/shared/([a-z0-9-]+\.md))`', full_line)
        if not path_match:
            return full_line
        path, filename = path_match.group(1), path_match.group(2)
        inline = build_inline_reference(filename, path)
        if inline:
            # Preserve any additional instructions after the MUST ATTENTION READ
            after_read = re.search(r'\.md`[.\s]*((?:Run|After|Use)[^\n]*)', full_line)
            extra = ""
            if after_read:
                extra = f"\n> {after_read.group(1).strip()}"
            changes += 1
            return f"{inline}{extra}"
        return full_line

    content = re.sub(
        r'>\s*\*\*Graph Intelligence[^:]*:\*\*\s*MUST ATTENTION READ\s*`\.claude/skills/shared/[^`]+`[^\n]*',
        replace_graph_line,
        content
    )

    # Pattern 4: > **Iterative Quality Gate:** **MUST ATTENTION READ** `path`.
    def replace_quality_gate_line(match):
        nonlocal changes
        full_line = match.group(0)
        path_match = re.search(r'`(\.claude/skills/shared/([a-z0-9-]+\.md))`', full_line)
        if not path_match:
            return full_line
        path, filename = path_match.group(1), path_match.group(2)
        inline = build_inline_reference(filename, path)
        if inline:
            # Preserve follow-up instructions
            after_match = re.search(r'\.md`\.\s*(.*)', full_line)
            extra = ""
            if after_match and after_match.group(1).strip():
                extra = f"\n> {after_match.group(1).strip()}"
            changes += 1
            return f"{inline}{extra}"
        return full_line

    content = re.sub(
        r'>\s*\*\*Iterative Quality Gate:\*\*\s*\*\*MUST ATTENTION READ\*\*\s*`\.claude/skills/shared/[^`]+`[^\n]*',
        replace_quality_gate_line,
        content
    )

    # Pattern 5: Follow `path`: (in HARD-GATE blocks or standalone)
    def replace_follow_line(match):
        nonlocal changes
        full_line = match.group(0)
        path_match = re.search(r'`(\.claude/skills/shared/([a-z0-9-]+\.md))`', full_line)
        if not path_match:
            return full_line
        path, filename = path_match.group(1), path_match.group(2)
        inline = build_inline_reference(filename, path)
        if inline:
            # Preserve the rest of the line after the path
            rest = re.search(r'\.md`[:\s]*(.*)', full_line)
            extra = ""
            if rest and rest.group(1).strip():
                extra_text = rest.group(1).strip()
                # Don't duplicate if it's just a period or common suffix
                if extra_text not in [".", ":"]:
                    extra = f"\n> {extra_text}"
            changes += 1
            return f"{inline}{extra}"
        return full_line

    content = re.sub(
        r'Follow\s*`\.claude/skills/shared/[^`]+`[^\n]*',
        replace_follow_line,
        content
    )

    # Pattern 6: **⚠️ MUST ATTENTION READ:** path for ... (standalone warning blocks)
    def replace_warning_read(match):
        nonlocal changes
        full_line = match.group(0)
        path_match = re.search(r'`(\.claude/skills/shared/([a-z0-9-]+\.md))`', full_line)
        if not path_match:
            return full_line
        path, filename = path_match.group(1), path_match.group(2)
        inline = build_inline_reference(filename, path)
        if inline:
            changes += 1
            return inline
        return full_line

    content = re.sub(
        r'\*\*⚠️ MUST ATTENTION READ:\*\*\s*`\.claude/skills/shared/[^`]+`[^\n]*',
        replace_warning_read,
        content
    )

    # Pattern 7: - Must read `path` before executing (in list items)
    def replace_list_read(match):
        nonlocal changes
        full_line = match.group(0)
        path_match = re.search(r'`(\.claude/skills/shared/([a-z0-9-]+\.md))`', full_line)
        if not path_match:
            return full_line
        path, filename = path_match.group(1), path_match.group(2)
        inline = build_inline_reference(filename, path)
        if inline:
            changes += 1
            return inline
        return full_line

    content = re.sub(
        r'-\s*Must read\s*`\.claude/skills/shared/[^`]+`\s*before executing',
        replace_list_read,
        content
    )

    # Pattern 8: When ... **MUST ATTENTION READ** `shared/path` and ... (standalone MUST ATTENTION READ in sentences)
    def replace_standalone_must_read(match):
        nonlocal changes
        full_line = match.group(0)
        path_match = re.search(r'`(\.claude/skills/shared/([a-z0-9-]+\.md))`', full_line)
        if not path_match:
            return full_line
        path, filename = path_match.group(1), path_match.group(2)
        inline = build_inline_reference(filename, path)
        if inline:
            # Extract any prefix context (like "When this task involves frontend...")
            prefix_match = re.match(r'((?:When|If)[^*]*)', full_line)
            prefix = ""
            if prefix_match:
                prefix = f"> {prefix_match.group(1).strip()}\n\n"
            changes += 1
            return f"{prefix}{inline}"
        return full_line

    content = re.sub(
        r'(?:When|If)\s+[^*\n]*\*\*MUST ATTENTION READ\*\*\s*`\.claude/skills/shared/[^`]+`[^\n]*',
        replace_standalone_must_read,
        content
    )

    # Pattern 9: **⚠️ MUST ATTENTION READ:** `shared/path` for ... (with backtick path)
    def replace_warning_read2(match):
        nonlocal changes
        full_line = match.group(0)
        path_match = re.search(r'`(\.claude/skills/shared/([a-z0-9-]+\.md))`', full_line)
        if not path_match:
            return full_line
        path, filename = path_match.group(1), path_match.group(2)
        inline = build_inline_reference(filename, path)
        if inline:
            # Preserve extra context after the path
            after = re.search(r'\.md`\s*(.*)', full_line)
            extra = ""
            if after and after.group(1).strip():
                text = after.group(1).strip()
                if not text.startswith("for full") and len(text) > 5:
                    extra = f"\n> {text}"
            changes += 1
            return f"{inline}{extra}"
        return full_line

    # Broader pattern for ⚠️ MUST ATTENTION READ with shared protocol refs
    content = re.sub(
        r'\*\*⚠️\s*MUST ATTENTION READ:?\*\*\s*`\.claude/skills/shared/[^`]+`[^\n]*',
        replace_warning_read2,
        content
    )

    # Pattern 10: **MUST ATTENTION READ** `shared/path` then ... (at start of line or in blockquote)
    def replace_bold_must_read(match):
        nonlocal changes
        full_line = match.group(0)
        path_match = re.search(r'`(\.claude/skills/shared/([a-z0-9-]+\.md))`', full_line)
        if not path_match:
            return full_line
        path, filename = path_match.group(1), path_match.group(2)
        inline = build_inline_reference(filename, path)
        if inline:
            # Preserve text after the path reference
            after = re.search(r'\.md`\s*(.*)', full_line)
            extra = ""
            if after and after.group(1).strip():
                text = after.group(1).strip()
                if len(text) > 5 and not text.startswith("for full"):
                    extra = f"\n> {text}"
            changes += 1
            return f"{inline}{extra}"
        return full_line

    content = re.sub(
        r'\*\*MUST ATTENTION READ\*\*\s*`\.claude/skills/shared/[^`]+`[^\n]*',
        replace_bold_must_read,
        content
    )

    # Pattern 11: - `shared/path` — Description (list items referencing shared protocols as prerequisites)
    def replace_list_ref(match):
        nonlocal changes
        full_line = match.group(0)
        path_match = re.search(r'`(\.claude/skills/shared/([a-z0-9-]+\.md))`', full_line)
        if not path_match:
            return full_line
        path, filename = path_match.group(1), path_match.group(2)
        inline = build_inline_reference(filename, path)
        if inline:
            changes += 1
            return inline
        return full_line

    content = re.sub(
        r'-\s*`\.claude/skills/shared/[^`]+`\s*[—\-]\s*[^\n]+',
        replace_list_ref,
        content
    )

    return content, changes


def strip_old_task_planning_notes(content):
    """Remove old 'IMPORTANT Task Planning Notes' sections that are superseded by Closing Reminders."""
    # Pattern: standalone IMPORTANT Task Planning Notes block (with --- separator)
    pattern1 = re.compile(
        r'\n---\s*\n+\*\*IMPORTANT Task Planning Notes \(MUST ATTENTION FOLLOW\)\*\*\s*\n+'
        r'[-*]\s*Always plan and break work into many small todo tasks[^\n]*\n'
        r'[-*]\s*Always add a final review todo task[^\n]*\n*',
        re.DOTALL
    )
    content = pattern1.sub('\n', content)

    # Pattern: without --- separator
    pattern2 = re.compile(
        r'\n\*\*IMPORTANT Task Planning Notes \(MUST ATTENTION FOLLOW\)\*\*\s*\n+'
        r'[-*]\s*Always plan and break work into many small todo tasks[^\n]*\n'
        r'[-*]\s*Always add a final review todo task[^\n]*\n*',
        re.DOTALL
    )
    content = pattern2.sub('\n', content)

    return content


def add_closing_reminders(content, skill_name):
    """Add Closing Reminders section at the bottom if missing."""
    # Always strip old Task Planning Notes if Closing Reminders exists
    if has_closing_reminders(content):
        cleaned = strip_old_task_planning_notes(content)
        return cleaned, cleaned != content

    # Don't add to workflow redirect skills (they're too simple)
    if is_workflow_redirect(content):
        return content, False

    # Build the closing reminders
    reminders = CLOSING_REMINDERS.rstrip()

    # Add type-specific extras
    skill_type = get_skill_type(skill_name)
    if skill_type and skill_type in CLOSING_EXTRAS_BY_TYPE:
        reminders += "\n" + CLOSING_EXTRAS_BY_TYPE[skill_type]

    # Strip old "IMPORTANT Task Planning Notes" section (superseded by Closing Reminders)
    content = strip_old_task_planning_notes(content)
    content = content.rstrip()

    content += "\n" + reminders + "\n"
    return content, True


def process_skill(skill_path, dry_run=False):
    """Process a single SKILL.md file."""
    with open(skill_path, 'r', encoding='utf-8') as f:
        original = f.read()

    skill_name = skill_path.parent.name
    content = original

    # Transform 1: Inline summaries for MUST ATTENTION READ references
    content, read_changes = transform_must_read_references(content)

    # Transform 2: Add Closing Reminders
    content, added_reminders = add_closing_reminders(content, skill_name)

    if content == original:
        return {"skill": skill_name, "changed": False, "read_changes": 0, "added_reminders": False}

    if not dry_run:
        with open(skill_path, 'w', encoding='utf-8') as f:
            f.write(content)

    return {
        "skill": skill_name,
        "changed": True,
        "read_changes": read_changes,
        "added_reminders": added_reminders,
    }


def verify_skills(skills_dir):
    """Verify all skills follow the new patterns."""
    issues = []
    for skill_md in sorted(skills_dir.rglob("SKILL.md")):
        with open(skill_md, 'r', encoding='utf-8') as f:
            content = f.read()

        skill_name = skill_md.parent.name
        if skill_name == "_templates":
            continue

        # Check for bare MUST ATTENTION READ without inline summary (shared protocols only)
        # Find all lines with MUST ATTENTION READ references to shared protocols
        for line_num, line in enumerate(content.split('\n')):
            if 'MUST ATTENTION READ' not in line or '.claude/skills/shared/' not in line:
                continue
            # Skip lines that ARE the inline reference (start with "> MUST ATTENTION READ")
            stripped = line.strip()
            if stripped.startswith('> MUST ATTENTION READ'):
                continue
            # Skip lines in our new inline format (contain "for full protocol")
            if 'for full protocol' in line:
                continue
            # Check if this line has an inline summary on the PREVIOUS line
            lines = content.split('\n')
            if line_num > 0:
                prev_line = lines[line_num].strip() if line_num < len(lines) else ""
                prev_prev = lines[line_num - 1].strip() if line_num > 0 else ""
                # If previous line has inline summary marker, this is part of the block
                if re.search(r'> \*\*[A-Z][^*]+\*\*\s', prev_prev):
                    continue
            issues.append(f"  {skill_name}: bare MUST ATTENTION READ without inline summary (line {line_num+1})")

        # Check for Closing Reminders (skip workflow redirects)
        if not is_workflow_redirect(content) and not has_closing_reminders(content):
            if len(content) > 500:  # Skip very short skills
                issues.append(f"  {skill_name}: missing Closing Reminders")

    return issues


def main():
    parser = argparse.ArgumentParser(description="Refactor skill prompts for AI attention anchoring")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without writing")
    parser.add_argument("--apply", action="store_true", help="Apply changes")
    parser.add_argument("--verify", action="store_true", help="Verify all skills follow patterns")
    parser.add_argument("--only", type=str, help="Comma-separated skill names to process")
    parser.add_argument("--stats", action="store_true", help="Show statistics only")
    args = parser.parse_args()

    if not any([args.dry_run, args.apply, args.verify, args.stats]):
        parser.print_help()
        sys.exit(1)

    skills_dir = Path(".claude/skills")
    if not skills_dir.exists():
        print("Error: .claude/skills directory not found")
        sys.exit(1)

    if args.verify:
        print("Verifying skill prompt patterns...")
        issues = verify_skills(skills_dir)
        if issues:
            print(f"\nFound {len(issues)} issues:")
            for issue in issues[:50]:
                print(issue)
            if len(issues) > 50:
                print(f"  ... and {len(issues) - 50} more")
        else:
            print("All skills follow the pattern!")
        return

    # Collect all SKILL.md files
    skill_files = sorted(skills_dir.rglob("SKILL.md"))

    if args.only:
        only_names = set(args.only.split(","))
        skill_files = [f for f in skill_files if f.parent.name in only_names]

    results = []
    for skill_path in skill_files:
        result = process_skill(skill_path, dry_run=args.dry_run or args.stats)
        results.append(result)

    # Report
    changed = [r for r in results if r["changed"]]
    unchanged = [r for r in results if not r["changed"]]
    total_read_changes = sum(r["read_changes"] for r in results)
    total_reminders = sum(1 for r in results if r["added_reminders"])

    mode = "DRY RUN" if args.dry_run else ("STATS" if args.stats else "APPLIED")
    print(f"\n{'='*60}")
    print(f"Skill Prompt Refactoring — {mode}")
    print(f"{'='*60}")
    print(f"Total skills processed: {len(results)}")
    print(f"Skills changed: {len(changed)}")
    print(f"Skills unchanged: {len(unchanged)}")
    print(f"MUST ATTENTION READ -> inline summary: {total_read_changes} replacements")
    print(f"Closing Reminders added: {total_reminders}")
    print()

    if changed and not args.stats:
        print("Changed skills:")
        for r in changed:
            extras = []
            if r["read_changes"]:
                extras.append(f"{r['read_changes']} read->inline")
            if r["added_reminders"]:
                extras.append("+ closing reminders")
            print(f"  {r['skill']}: {', '.join(extras)}")


if __name__ == "__main__":
    main()
