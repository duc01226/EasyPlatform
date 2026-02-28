#!/usr/bin/env python3
"""
Sync Skills to AI Tools (Claude Code & GitHub Copilot)

This script synchronizes skill definitions from the single source of truth
(docs/templates/skills/) to both Claude Code (.claude/skills/) and
GitHub Copilot (.github/skills/) directories.

Usage:
    python .claude/scripts/sync-skills-to-tools.py [--dry-run] [--skill SKILL_NAME]

Arguments:
    --dry-run       Show what would be copied without making changes
    --skill         Sync only a specific skill (e.g., feature-docs)
    --verbose       Show detailed output

Source of Truth:
    docs/templates/skills/*-skill.md

Targets:
    .claude/skills/{skill-name}/SKILL.md
    .github/skills/{skill-name}/SKILL.md

The script:
1. Reads skill files from docs/templates/skills/
2. Copies content to both .claude/skills/ and .github/skills/
3. Creates directories if they don't exist
4. Reports any differences found
"""

import os
import sys
import argparse
import shutil
from pathlib import Path
from datetime import datetime


def get_project_root() -> Path:
    """Get the project root directory."""
    script_path = Path(__file__).resolve()
    # Navigate up from .claude/scripts/ to project root
    return script_path.parent.parent.parent


def get_skill_name_from_file(filename: str) -> str:
    """Extract skill name from filename (e.g., 'feature-docs-skill.md' -> 'feature-docs')."""
    return filename.replace('-skill.md', '')


def read_file_content(filepath: Path) -> str:
    """Read and return file content."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return ""


def write_file_content(filepath: Path, content: str, dry_run: bool = False) -> bool:
    """Write content to file, creating directories if needed."""
    if dry_run:
        print(f"  [DRY-RUN] Would write to: {filepath}")
        return True

    try:
        filepath.parent.mkdir(parents=True, exist_ok=True)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    except Exception as e:
        print(f"  [ERROR] Failed to write {filepath}: {e}")
        return False


def sync_skill(source_file: Path, skill_name: str, project_root: Path,
               dry_run: bool = False, verbose: bool = False) -> dict:
    """
    Sync a single skill from source to both Claude and Copilot.

    Returns dict with sync status for each target.
    """
    results = {
        'skill': skill_name,
        'source': str(source_file),
        'claude': {'status': 'skipped', 'path': None},
        'copilot': {'status': 'skipped', 'path': None}
    }

    # Read source content
    source_content = read_file_content(source_file)
    if not source_content:
        results['claude']['status'] = 'error'
        results['copilot']['status'] = 'error'
        print(f"  [ERROR] Could not read source: {source_file}")
        return results

    # Define target paths
    targets = {
        'claude': project_root / '.claude' / 'skills' / skill_name / 'SKILL.md',
        'copilot': project_root / '.github' / 'skills' / skill_name / 'SKILL.md'
    }

    for target_name, target_path in targets.items():
        existing_content = read_file_content(target_path)

        if existing_content == source_content:
            results[target_name]['status'] = 'unchanged'
            results[target_name]['path'] = str(target_path)
            if verbose:
                print(f"  [{target_name.upper()}] Unchanged: {target_path}")
        else:
            if write_file_content(target_path, source_content, dry_run):
                results[target_name]['status'] = 'updated' if existing_content else 'created'
                results[target_name]['path'] = str(target_path)
                action = 'Would update' if dry_run else ('Updated' if existing_content else 'Created')
                print(f"  [{target_name.upper()}] {action}: {target_path}")
            else:
                results[target_name]['status'] = 'error'

    return results


def main():
    parser = argparse.ArgumentParser(
        description='Sync skills from docs/templates/skills/ to Claude and Copilot'
    )
    parser.add_argument('--dry-run', action='store_true',
                        help='Show what would be done without making changes')
    parser.add_argument('--skill', type=str,
                        help='Sync only a specific skill (e.g., feature-docs)')
    parser.add_argument('--verbose', '-v', action='store_true',
                        help='Show detailed output')

    args = parser.parse_args()

    project_root = get_project_root()
    source_dir = project_root / 'docs' / 'templates' / 'skills'

    print("=" * 60)
    print("Skill Sync: docs/templates/skills/ -> Claude & Copilot")
    print("=" * 60)
    print(f"Project root: {project_root}")
    print(f"Source directory: {source_dir}")
    print(f"Mode: {'DRY-RUN' if args.dry_run else 'LIVE'}")
    print("-" * 60)

    if not source_dir.exists():
        print(f"[ERROR] Source directory not found: {source_dir}")
        print("Create skill files in docs/templates/skills/ first.")
        sys.exit(1)

    # Find all skill files
    skill_files = list(source_dir.glob('*-skill.md'))

    if not skill_files:
        print("[WARNING] No skill files found in source directory.")
        print("Expected pattern: *-skill.md (e.g., feature-docs-skill.md)")
        sys.exit(0)

    # Filter to specific skill if requested
    if args.skill:
        skill_files = [f for f in skill_files
                       if get_skill_name_from_file(f.name) == args.skill]
        if not skill_files:
            print(f"[ERROR] Skill not found: {args.skill}")
            available = [get_skill_name_from_file(f.name) for f in source_dir.glob('*-skill.md')]
            print(f"Available skills: {', '.join(available)}")
            sys.exit(1)

    # Process each skill
    all_results = []
    for skill_file in sorted(skill_files):
        skill_name = get_skill_name_from_file(skill_file.name)
        print(f"\n[SKILL] {skill_name}")
        result = sync_skill(skill_file, skill_name, project_root,
                           args.dry_run, args.verbose)
        all_results.append(result)

    # Summary
    print("\n" + "=" * 60)
    print("SYNC SUMMARY")
    print("=" * 60)

    stats = {'created': 0, 'updated': 0, 'unchanged': 0, 'error': 0}
    for result in all_results:
        for target in ['claude', 'copilot']:
            status = result[target]['status']
            if status in stats:
                stats[status] += 1

    print(f"Created:   {stats['created']}")
    print(f"Updated:   {stats['updated']}")
    print(f"Unchanged: {stats['unchanged']}")
    print(f"Errors:    {stats['error']}")

    if args.dry_run:
        print("\n[DRY-RUN] No changes were made. Run without --dry-run to apply.")

    print(f"\nCompleted at: {datetime.now().isoformat()}")

    sys.exit(0 if stats['error'] == 0 else 1)


if __name__ == '__main__':
    main()
