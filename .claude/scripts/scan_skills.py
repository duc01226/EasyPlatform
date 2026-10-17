#!/usr/bin/env python3
"""
Scan .claude/skills directory and extract skill metadata.
"""

import os
import re
import sys
from pathlib import Path
from typing import Dict, List
from win_compat import ensure_utf8_stderr, ensure_utf8_stdout

ensure_utf8_stdout()
ensure_utf8_stderr()

# After the stream setup: on Windows the install hint must print a non-ASCII path verbatim.
try:
    import yaml
except ModuleNotFoundError as error:
    # Recover the declared PyYAML dependency before printing an actionable diagnostic.
    # Any other missing module is a different fault and re-raises.
    if error.name != 'yaml':
        raise
    _requirements = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'requirements.txt')
    try:
        from lib.python_dependencies import ensure_pyyaml
    except ModuleNotFoundError as helper_error:
        # A standalone copied script retains its actionable diagnostic.
        if helper_error.name not in ('lib', 'lib.python_dependencies'):
            raise
        _recovered = False
    else:
        _recovered = ensure_pyyaml(_requirements)
    if _recovered:
        import yaml
    else:
        # Quoted for the shell it names, so the hint still pastes when a path holds a space or a
        # metacharacter such as '&'. On Windows that is PowerShell: list2cmdline renders C-runtime
        # arguments and leaves '&' bare for the shell. A PowerShell single-quoted string is literal
        # except for its quote characters, which are doubled. U+2018-U+201B are quote characters too
        # (language spec 2.3.5.2, single-quote-character): left bare, one would end the literal.
        if os.name == 'nt':
            import re
            def _quote(part):
                if re.fullmatch(r'[A-Za-z0-9._-]+', part):
                    return part
                return "'" + re.sub("(['\u2018\u2019\u201a\u201b])", r'\1\1', part) + "'"
            def _command(argv):
                return '& ' + ' '.join(_quote(part) for part in argv)
            _shell = 'from PowerShell '
        else:
            import shlex
            def _command(argv):
                # shlex.join is 3.8+; the installers advertise Python 3.7+, so quote by hand.
                return ' '.join(shlex.quote(part) for part in argv)
            _shell = ''
        _install = ['-m', 'pip', 'install', '-r', _requirements]
        # pip refuses to install into an interpreter marked EXTERNALLY-MANAGED (PEP 668) unless it
        # runs inside a virtual environment, so that host gets a venv recipe instead. Same rule as pip.
        # The probe is advisory: if sysconfig cannot answer, fall back to the plain pip hint rather
        # than replace the message this block exists to print with a traceback.
        try:
            import sysconfig
            _managed = sys.prefix == getattr(sys, 'base_prefix', sys.prefix) and os.path.isfile(
                os.path.join(sysconfig.get_path('stdlib'), 'EXTERNALLY-MANAGED'))
        except Exception:
            _managed = False
        if _managed:
            # The framework's shared venv; hooks/lib/graph-utils.cjs creates the same one.
            _project = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            _venv = os.path.join(_project, 'tmp', 'claude-temp', '.venv')
            _bin = os.path.join(_venv, 'Scripts' if os.name == 'nt' else 'bin')
            _venv_python = os.path.join(_bin, 'python.exe' if os.name == 'nt' else 'python')
            if os.name == 'nt':
                _path = f"$env:Path = {_quote(_bin + ';')} + $env:Path"
            else:
                _path = f'export PATH={shlex.quote(_bin)}:"$PATH"'
            _hint = (
                "This Python is externally managed (PEP 668), so pip will not install into it.\n"
                f"Create a virtual environment {_shell}with: {_command([sys.executable, '-m', 'venv', _venv])}\n"
                f"Install it {_shell}with: {_command([_venv_python] + _install)}\n"
                f"Then put the environment first on PATH: {_path}\n"
            )
        else:
            _hint = f"Install it {_shell}with: {_command([sys.executable] + _install)}\n"
        sys.stderr.write(f"{os.path.basename(__file__)} requires PyYAML, declared in {_requirements}.\n" + _hint)
        sys.exit(3)

def extract_frontmatter(content: str) -> Dict:
    """Extract YAML frontmatter from markdown content."""
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
    if match:
        try:
            return yaml.safe_load(match.group(1))
        except:
            return {}
    return {}

def normalize_date(value) -> str:
    """Render YAML date/datetime/string lifecycle fields as ISO-8601 strings.

    PyYAML deserializes unquoted `YYYY-MM-DD` literals into `datetime.date`
    objects. Catalog consumers expect strings, so we stringify defensively.
    Returns None when the field is absent or empty.
    """
    if value is None or value == '':
        return None
    # datetime.date / datetime.datetime both expose .isoformat()
    if hasattr(value, 'isoformat'):
        return value.isoformat()
    return str(value)


def extract_first_paragraph(content: str) -> str:
    """Extract first meaningful paragraph after frontmatter."""
    # Remove frontmatter
    content = re.sub(r'^---\s*\n.*?\n---\s*\n', '', content, flags=re.DOTALL)

    # Find first paragraph (after headings)
    lines = content.split('\n')
    paragraph = []

    for line in lines:
        line = line.strip()
        # Skip headings and empty lines
        if line.startswith('#') or not line:
            if paragraph:  # If we've started collecting, stop
                break
            continue

        paragraph.append(line)

        # Stop after first paragraph
        if line.endswith('.') and len(' '.join(paragraph)) > 50:
            break

    return ' '.join(paragraph)[:200]

def scan_skills(base_path: Path) -> List[Dict]:
    """Scan all skill files and extract metadata."""
    skills = []

    for skill_file in sorted(base_path.glob('*/SKILL.md')):
        # Get skill directory name
        skill_dir = skill_file.parent
        skill_name = skill_dir.name

        # Skip template
        if skill_name == 'template-skill':
            continue

        # Handle nested skills (e.g. subdirectory-grouped skills)
        if skill_dir.parent.name != 'skills':
            parent_name = skill_dir.parent.name
            skill_name = f"{parent_name}/{skill_name}"

        try:
            content = skill_file.read_text(encoding='utf-8')
            frontmatter = extract_frontmatter(content)

            description = frontmatter.get('description', '')
            if not description:
                description = extract_first_paragraph(content)

            # Categorize based on content/name
            category = categorize_skill(skill_name, description, content)

            # Lifecycle fields per ADR-0001 (additive, all optional).
            # Absent `status` defaults to 'active'; other fields stay None when
            # the skill has not been deprecated.
            status = frontmatter.get('status') or 'active'

            skills.append({
                'name': skill_name,
                'path': skill_file.relative_to(base_path).as_posix(),
                'description': description,
                'category': category,
                # Empty directories are absent from Git and export payloads. Report a capability
                # only when at least one file can actually travel with the copied framework.
                'has_scripts': any(path.is_file() for path in (skill_dir / 'scripts').rglob('*'))
                if (skill_dir / 'scripts').is_dir() else False,
                'has_references': any(path.is_file() for path in (skill_dir / 'references').rglob('*'))
                if (skill_dir / 'references').is_dir() else False,
                'status': status,
                'deprecated_by': frontmatter.get('deprecated_by'),
                'deprecated_since': normalize_date(frontmatter.get('deprecated_since')),
                'removal_after': normalize_date(frontmatter.get('removal_after')),
            })
        except Exception as e:
            print(f"Error processing {skill_file}: {e}")

    return skills

DESCRIPTION_PREFIX_TO_CATEGORY = {
    '[architecture]': 'other',
    '[decision support]': 'utilities',
}


def name_matches(lower_name: str, keyword: str) -> bool:
    """Match a category keyword against a hyphen/underscore-delimited skill name.

    A bare keyword must match a whole name token, so 'ui' matches `ui-design` but
    not `demo-guide`. Keywords that are themselves prefixes ('ai-') or already
    hyphenated ('skill-creator') keep substring semantics.
    """
    if keyword.endswith('-'):
        return lower_name.startswith(keyword)
    if '-' in keyword:
        return keyword in lower_name
    return keyword in re.split(r'[-_]', lower_name)


def categorize_skill(name: str, description: str, content: str) -> str:
    """Categorize skill based on name and content."""
    lower_name = name.lower()
    lower_desc = description.lower()
    lower_content = content[:500].lower()

    # Description-prefix override — explicit `[Category]` tag wins over name heuristics
    for prefix, bucket in DESCRIPTION_PREFIX_TO_CATEGORY.items():
        if lower_desc.lstrip().startswith(prefix):
            return bucket

    # AI/ML
    if any(name_matches(lower_name, x) for x in ['ai-', 'gemini', 'multimodal', 'adk']):
        return 'ai-ml'

    # Frontend
    if any(name_matches(lower_name, x) for x in ['frontend', 'ui', 'design', 'aesthetic']):
        return 'frontend'

    # Backend
    if any(name_matches(lower_name, x) for x in ['backend', 'auth', 'payment']):
        return 'backend'

    # Infrastructure
    if any(name_matches(lower_name, x) for x in ['devops', 'docker', 'cloudflare', 'gcloud']):
        return 'infrastructure'

    # Database
    if any(name_matches(lower_name, x) for x in ['database', 'mongodb', 'postgresql', 'sql']):
        return 'database'

    # Development Tools
    if any(name_matches(lower_name, x) for x in ['mcp', 'skill-creator', 'repomix']):
        return 'dev-tools'

    # Multimedia
    if any(name_matches(lower_name, x) for x in ['media', 'chrome-devtools']):
        return 'multimedia'

    # Frameworks
    if any(name_matches(lower_name, x) for x in ['web-frameworks', 'mobile', 'shopify']):
        return 'frameworks'

    # Utilities
    if any(name_matches(lower_name, x) for x in ['debug', 'problem', 'code-quality-review', 'plan', 'research', 'source-deep-dive', 'sequential']):
        return 'utilities'

    return 'other'

def group_by_category(skills: List[Dict]) -> Dict[str, List[Dict]]:
    """Group skills by category."""
    categories = {}

    for skill in skills:
        category = skill['category']
        if category not in categories:
            categories[category] = []
        categories[category].append(skill)

    return categories

def main():
    """Main execution."""
    base_path = Path('.claude/skills')

    if not base_path.exists():
        print(f"Error: {base_path} not found")
        return

    print("Scanning skills...")
    skills = scan_skills(base_path)

    print(f"\nFound {len(skills)} skills\n")

    # Group by category
    categories = group_by_category(skills)

    category_names = {
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
    }

    for category, skills_list in sorted(categories.items()):
        print(f"\n{category_names.get(category, category.upper())}:")
        for skill in skills_list:
            scripts = '📦' if skill['has_scripts'] else '  '
            refs = '📚' if skill['has_references'] else '  '
            print(f"  {scripts}{refs} {skill['name']:30} {skill['description'][:80]}")

    # Output YAML for processing (generate_catalogs.py reads YAML)
    output_path = Path('.claude/scripts/skills_data.yaml')
    # newline='' writes yaml.dump's '\n' verbatim. Default text mode translates it to os.linesep,
    # so on Windows every rescan rewrote this LF-committed catalog as CRLF — a whole-file diff that
    # buries the actual skill-entry changes. Same rule as generate_catalogs.py's writers.
    with output_path.open('w', encoding='utf-8', newline='') as handle:
        handle.write(yaml.dump(skills, allow_unicode=True, default_flow_style=False))
    print(f"\n✓ Saved metadata to {output_path}")

if __name__ == '__main__':
    main()
