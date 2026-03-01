#!/usr/bin/env python3
"""
CSO (Claude Search Optimization) Audit Script

Audits all SKILL.md frontmatter descriptions for:
1. Descriptions that don't start with "Use when..." or "Use for..."
2. Descriptions that summarize workflow steps (should only describe triggering conditions)
3. Descriptions >500 characters
4. Descriptions in first person (should be third person)

Usage:
    python .claude/scripts/audit-skill-descriptions.py [--fix] [--top N]

Output: Report listing violations ranked by skill name.
"""

import os
import re
import sys
import argparse
from pathlib import Path


def extract_frontmatter(filepath: str) -> dict | None:
    """Extract YAML frontmatter from a SKILL.md file."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
    except (OSError, UnicodeDecodeError):
        return None

    # Match YAML frontmatter between --- delimiters
    match = re.match(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
    if not match:
        return None

    frontmatter = {}
    for line in match.group(1).split("\n"):
        if ":" in line:
            key, _, value = line.partition(":")
            key = key.strip()
            value = value.strip().strip("'\"")
            if key and value:
                frontmatter[key] = value

    # Handle multi-line description (YAML folded/literal blocks)
    desc_match = re.search(
        r"description:\s*[>|]-?\s*\n((?:\s+.+\n?)+)", match.group(1)
    )
    if desc_match:
        lines = desc_match.group(1).split("\n")
        frontmatter["description"] = " ".join(
            line.strip() for line in lines if line.strip()
        )

    return frontmatter


def audit_description(name: str, description: str) -> list[dict]:
    """Audit a single skill description. Returns list of violations."""
    violations = []

    if not description:
        violations.append({"type": "MISSING", "message": "No description found"})
        return violations

    # Check 1: Starts with triggering condition
    triggers = ("use when", "use for", "use to", "use this", "[")
    if not description.lower().startswith(triggers):
        violations.append(
            {
                "type": "NO_TRIGGER",
                "message": f'Description doesn\'t start with "Use when/for...": "{description[:80]}..."',
            }
        )

    # Check 2: Contains workflow step summaries (numbered steps, arrows, sequential language)
    workflow_patterns = [
        r"\d+\.\s+\w+\s*→",  # "1. Plan → 2. Build"
        r"step\s+\d+",  # "step 1", "step 2"
        r"then\s+(run|execute|create|build|deploy)",  # "then run", "then execute"
    ]
    for pattern in workflow_patterns:
        if re.search(pattern, description, re.IGNORECASE):
            violations.append(
                {
                    "type": "WORKFLOW_SUMMARY",
                    "message": f"Description contains workflow steps (should be triggering conditions only)",
                }
            )
            break

    # Check 3: Length >500 characters
    if len(description) > 500:
        violations.append(
            {
                "type": "TOO_LONG",
                "message": f"Description is {len(description)} chars (max 500)",
            }
        )

    # Check 4: First person ("I will", "I can", "my")
    first_person = re.search(
        r"\b(I will|I can|I\'ll|I am|my |we will|we can)\b",
        description,
        re.IGNORECASE,
    )
    if first_person:
        violations.append(
            {
                "type": "FIRST_PERSON",
                "message": f'Uses first person: "{first_person.group()}"',
            }
        )

    return violations


def find_all_skills(root_dir: str) -> list[dict]:
    """Find all SKILL.md files and extract their descriptions."""
    skills = []
    skills_dir = os.path.join(root_dir, ".claude", "skills")

    if not os.path.isdir(skills_dir):
        print(f"Error: Skills directory not found: {skills_dir}")
        sys.exit(1)

    for dirpath, dirnames, filenames in os.walk(skills_dir):
        for filename in filenames:
            if filename == "SKILL.md":
                filepath = os.path.join(dirpath, filename)
                rel_path = os.path.relpath(filepath, root_dir)
                skill_name = os.path.basename(dirpath)

                frontmatter = extract_frontmatter(filepath)
                description = frontmatter.get("description", "") if frontmatter else ""

                skills.append(
                    {
                        "name": skill_name,
                        "path": rel_path,
                        "description": description,
                        "frontmatter": frontmatter,
                    }
                )

    return sorted(skills, key=lambda s: s["name"])


def main():
    parser = argparse.ArgumentParser(description="Audit skill descriptions for CSO compliance")
    parser.add_argument("--top", type=int, default=0, help="Show only top N violations")
    parser.add_argument(
        "--root",
        type=str,
        default=os.getcwd(),
        help="Project root directory",
    )
    args = parser.parse_args()

    skills = find_all_skills(args.root)

    if not skills:
        print("No skills found.")
        sys.exit(1)

    # Audit each skill
    results = []
    for skill in skills:
        violations = audit_description(skill["name"], skill["description"])
        if violations:
            results.append({"skill": skill, "violations": violations})

    # Print report
    total_skills = len(skills)
    total_violations = sum(len(r["violations"]) for r in results)
    skills_with_violations = len(results)

    print("=" * 70)
    print("CSO SKILL DESCRIPTION AUDIT REPORT")
    print("=" * 70)
    print(f"Total skills scanned: {total_skills}")
    print(f"Skills with violations: {skills_with_violations}")
    print(f"Total violations: {total_violations}")
    print(
        f"Compliance rate: {((total_skills - skills_with_violations) / total_skills * 100):.0f}%"
    )
    print()

    # Violation type summary
    type_counts: dict[str, int] = {}
    for r in results:
        for v in r["violations"]:
            type_counts[v["type"]] = type_counts.get(v["type"], 0) + 1

    print("VIOLATION TYPES:")
    for vtype, count in sorted(type_counts.items(), key=lambda x: -x[1]):
        print(f"  {vtype}: {count}")
    print()

    # Detailed results
    display_results = results[: args.top] if args.top > 0 else results

    print("DETAILED VIOLATIONS:")
    print("-" * 70)
    for r in display_results:
        skill = r["skill"]
        print(f"\n  {skill['name']} ({skill['path']})")
        if skill["description"]:
            print(f"  Current: \"{skill['description'][:100]}...\"")
        for v in r["violations"]:
            print(f"    [{v['type']}] {v['message']}")

    if args.top > 0 and len(results) > args.top:
        print(f"\n  ... and {len(results) - args.top} more skills with violations")

    print()
    print("=" * 70)
    print("CSO PRINCIPLE: Descriptions should contain triggering conditions ONLY.")
    print('Start with "Use when..." or "Use for..." — never summarize workflow steps.')
    print("=" * 70)


if __name__ == "__main__":
    main()
