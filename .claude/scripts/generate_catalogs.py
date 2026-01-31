#!/usr/bin/env python3
"""Generate skill catalogs.

Outputs YAML to stdout by default for easy consumption by Claude.
Use --output to write to a specific file instead.
Note: Commands were merged into skills (2026-01-31). Only skills catalog remains.
"""

import argparse
import sys
import yaml
from pathlib import Path
from datetime import datetime

# Script directory for resolving relative paths
SCRIPT_DIR = Path(__file__).parent

# Windows UTF-8 compatibility (use shared utility)
try:
    from win_compat import ensure_utf8_stdout
    ensure_utf8_stdout()
except ImportError:
    if sys.platform == 'win32':
        import io
        if hasattr(sys.stdout, 'buffer'):
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


def load_yaml(filename):
    """Load YAML file from script directory with helpful error handling."""
    path = SCRIPT_DIR / filename
    if not path.exists():
        print(f"Error: {path} not found", file=sys.stderr)
        print(f"Hint: Run scan_skills.py first to generate data files", file=sys.stderr)
        sys.exit(1)
    return yaml.safe_load(path.read_text(encoding='utf-8'))



def generate_skills_yaml():
    """Generate SKILLS.yaml catalog."""
    skills = load_yaml('skills_data.yaml')

    # Group by category
    categories = {}
    for skill in skills:
        cat = skill['category']
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(skill)

    # Sort skills within each category
    for cat in categories:
        categories[cat] = sorted(categories[cat], key=lambda x: x['name'])

    # Generate catalog structure
    catalog = {
        'metadata': {
            'title': 'Skills Catalog',
            'description': 'Auto-generated catalog of all available skills in ClaudeKit Engineer',
            'last_updated': datetime.now().strftime('%Y-%m-%d'),
            'total_skills': len(skills)
        },
        'categories': {
            'ai-ml': 'AI & Machine Learning',
            'frontend': 'Frontend & Design',
            'backend': 'Backend Development',
            'infrastructure': 'Infrastructure & DevOps',
            'database': 'Database & Storage',
            'dev-tools': 'Development Tools',
            'multimedia': 'Multimedia & Processing',
            'frameworks': 'Frameworks & Platforms',
            'utilities': 'Utilities & Helpers',
            'other': 'Other'
        },
        'legend': {
            'has_scripts': '📦 Has executable scripts',
            'has_references': '📚 Has reference documentation'
        },
        'skills': categories
    }

    return yaml.dump(catalog, sort_keys=False, allow_unicode=True, default_flow_style=False)


def write_output(content, output_path=None, label=None):
    """Write content to stdout or file."""
    if output_path:
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding='utf-8')
        print(f"✓ Generated {output_path}", file=sys.stderr)
    else:
        print(content)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Generate command and skill catalogs',
        epilog='Outputs to stdout by default. Use --output to write to a file.'
    )
    parser.add_argument('--skills', action='store_true', help='Generate skills catalog (default)')
    parser.add_argument('--commands', action='store_true', help='Deprecated: commands merged into skills')
    parser.add_argument('--output', '-o', metavar='PATH', help='Write output to file instead of stdout')
    args = parser.parse_args()

    if args.commands:
        print("Warning: --commands is deprecated. Commands were merged into skills.", file=sys.stderr)
        print("Use --skills instead.", file=sys.stderr)

    skills_yaml = generate_skills_yaml()
    write_output(skills_yaml, args.output if args.output else None)
