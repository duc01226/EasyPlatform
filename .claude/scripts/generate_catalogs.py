#!/usr/bin/env python3
"""Generate updated command and skill catalogs.

Outputs YAML to stdout by default for easy consumption by Claude.
Use --output to write to a specific file instead.
"""

import argparse
import difflib
import io
import json
import os
import re
import sys
from pathlib import Path
from datetime import datetime

# Lifecycle statuses recognized by the catalog (ADR-0001).
SKILL_STATUSES = ('active', 'deprecated', 'experimental')

# Script directory for resolving relative paths
SCRIPT_DIR = Path(__file__).parent

# Windows UTF-8 compatibility. The fallback keeps this utility standalone when
# copied without its shared helper, and detaches legacy streams before wrapping.
def _ensure_utf8_fallback(stream):
    reconfigure = getattr(stream, 'reconfigure', None)
    if callable(reconfigure):
        try:
            reconfigure(encoding='utf-8')
        except (AttributeError, io.UnsupportedOperation, ValueError):
            pass
        else:
            return stream

    buffer = getattr(stream, 'buffer', None)
    detach = getattr(stream, 'detach', None)
    if buffer is None or not callable(detach):
        return stream

    previous_errors = getattr(stream, 'errors', None) or 'strict'
    line_buffering = bool(getattr(stream, 'line_buffering', False))
    write_through = bool(getattr(stream, 'write_through', False))
    try:
        detached_buffer = detach()
    except (AttributeError, OSError, ValueError):
        return stream

    return io.TextIOWrapper(
        detached_buffer,
        encoding='utf-8',
        errors=previous_errors,
        line_buffering=line_buffering,
        write_through=write_through,
    )


try:
    from win_compat import ensure_utf8_stderr, ensure_utf8_stdout
except ImportError:
    if sys.platform == 'win32':
        sys.stdout = _ensure_utf8_fallback(sys.stdout)
        sys.stderr = _ensure_utf8_fallback(sys.stderr)
else:
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

try:
    from scan_skills import scan_skills
except ImportError:
    scan_skills = None


def load_yaml(filename):
    """Load YAML file from script directory with helpful error handling."""
    path = SCRIPT_DIR / filename
    if not path.exists():
        print(f"Error: {path} not found", file=sys.stderr)
        print(f"Hint: Run scan_skills.py or scan_commands.py first to generate data files", file=sys.stderr)
        sys.exit(1)
    return yaml.safe_load(path.read_text(encoding='utf-8'))


def load_skills():
    """Load skill metadata from the live skills tree, falling back to cached YAML.

    `skills_data.yaml` remains a useful generated snapshot, but count checks and
    catalog generation should not depend on it being freshly regenerated after a
    skill add/remove. ADR-0002 defines the filesystem as the canonical count
    source.
    """
    skills_dir = REPO_ROOT / '.claude' / 'skills'
    if scan_skills and skills_dir.exists():
        return scan_skills(skills_dir)
    return load_yaml('skills_data.yaml')


def generate_commands_yaml():
    """Generate COMMANDS.yaml catalog."""
    commands = load_yaml('commands_data.yaml')

    # Group by category
    categories = {}
    for cmd in commands:
        cat = cmd['category']
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(cmd)

    # Sort commands within each category
    for cat in categories:
        categories[cat] = sorted(categories[cat], key=lambda x: x['name'])

    # Generate catalog structure
    catalog = {
        'metadata': {
            'title': 'Commands Catalog',
            'description': 'Auto-generated catalog of all available commands in ClaudeKit Engineer',
            'last_updated': datetime.now().strftime('%Y-%m-%d'),
            'total_commands': len(commands)
        },
        'categories': {
            'core': 'Core Commands',
            'bootstrap': 'Bootstrap Commands',
            'content': 'Content Creation',
            'cook': 'Cook Commands',
            'design': 'Design Commands',
            'docs': 'Documentation',
            'fix': 'Fix & Debug',
            'git': 'Git Commands',
            'integrate': 'Integrations',
            'plan': 'Planning',
            'review': 'Code Review',
            'investigate': 'Investigation Commands',
            'skill': 'Skill Management'
        },
        'commands': categories
    }

    return yaml.dump(catalog, sort_keys=False, allow_unicode=True, default_flow_style=False)


def _status_of(skill):
    """Resolve a skill record's lifecycle status with the active default."""
    status = skill.get('status') or 'active'
    if status not in SKILL_STATUSES:
        # Unknown status (likely typo) — warn but coerce to 'active' so
        # the catalog still builds. Per plan review M3.
        print(
            f"WARN: skill '{skill.get('name', '?')}' has unknown status "
            f"'{status}' (expected one of {SKILL_STATUSES}); coercing to 'active'.",
            file=sys.stderr,
        )
        return 'active'
    return status


def generate_skills_yaml():
    """Generate SKILLS.yaml catalog (status-aware split + dual-emit per ADR-0001)."""
    skills = load_skills()

    # Split by status, then group by category within each status bucket.
    by_status = {status: {} for status in SKILL_STATUSES}
    totals = {status: 0 for status in SKILL_STATUSES}
    for skill in skills:
        status = _status_of(skill)
        cat = skill['category']
        bucket = by_status[status]
        bucket.setdefault(cat, []).append(skill)
        totals[status] += 1

    # Sort skills within each (status, category) cell.
    for status in SKILL_STATUSES:
        for cat in by_status[status]:
            by_status[status][cat] = sorted(by_status[status][cat], key=lambda x: x['name'])

    # Generate catalog structure. Dual-emit `total_skills` (legacy int) and
    # `total_by_status` (new dict) during the migration release window.
    catalog = {
        'metadata': {
            'title': 'Skills Catalog',
            'description': 'Auto-generated catalog of all available skills in ClaudeKit Engineer',
            'last_updated': datetime.now().strftime('%Y-%m-%d'),
            'total_skills': len(skills),
            'total_by_status': totals,
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
            'has_references': '📚 Has reference documentation',
            'status_active': 'Current canonical skill',
            'status_deprecated': 'Superseded; pending removal after `removal_after`',
            'status_experimental': 'Opt-in; may break without deprecation window',
        },
        'skills': by_status,
    }

    return yaml.dump(catalog, sort_keys=False, allow_unicode=True, default_flow_style=False)


# Repository root resolved from this script's location: .claude/scripts/ -> repo root.
REPO_ROOT = SCRIPT_DIR.parent.parent

# Marker token regex (ADR-0002). `<filter>` optional; defaults to `total`.
# Anchored to `COUNT:` prefix + digits-only middle so user-content
# `<!-- COUNT -->` strings without `:kind` form are not matched.
COUNT_MARKER_RE = re.compile(
    r'<!--\s*COUNT:(?P<kind>[a-z][a-z0-9_-]*)'
    r'(?::(?P<filter>[a-z][a-z0-9_-]*))?\s*-->'
    r'(?P<value>\d+)'
    r'<!--\s*/COUNT\s*-->'
)


def count_kind(kind, filter_name='total'):
    """Return the canonical count for a (kind, filter) pair per ADR-0002.

    Kinds: skills, hooks, agents, workflows, shared, lib-modules.
    Filters: active|deprecated|experimental|total (only `skills` honors the
    status split; all other kinds support `total` only).
    """
    if kind == 'skills':
        skills = load_skills()
        if filter_name == 'total':
            return len(skills)
        if filter_name in SKILL_STATUSES:
            return sum(1 for s in skills if _status_of(s) == filter_name)
        raise ValueError(f"Unknown filter '{filter_name}' for kind 'skills'")

    if filter_name != 'total':
        raise ValueError(f"Kind '{kind}' supports only 'total' filter, got '{filter_name}'")

    if kind == 'hooks':
        hooks_dir = REPO_ROOT / '.claude' / 'hooks'
        return sum(1 for p in hooks_dir.glob('*.cjs') if p.is_file())

    if kind == 'agents':
        agents_dir = REPO_ROOT / '.claude' / 'agents'
        return sum(1 for p in agents_dir.glob('*.md') if p.is_file())

    if kind == 'workflows':
        workflows_path = REPO_ROOT / '.claude' / 'workflows.json'
        try:
            data = json.loads(workflows_path.read_text(encoding='utf-8'))
        except json.JSONDecodeError as e:
            raise ValueError(
                f"workflows.json is malformed ({workflows_path}): {e}"
            ) from e
        workflows = data.get('workflows', {})
        if not isinstance(workflows, dict):
            raise ValueError("workflows.json: top-level 'workflows' is not a dict")
        return len(workflows)

    if kind == 'shared':
        shared_dir = REPO_ROOT / '.claude' / 'skills' / 'shared'
        if not shared_dir.is_dir():
            # Fail loud: a COUNT:shared marker without the directory is a port
            # bug worth surfacing, not a silent zero. Per Phase 4 follow-up
            # /why-review finding LOW #6.
            raise FileNotFoundError(
                f"COUNT:shared marker requires {shared_dir} to exist "
                f"(Metric A per ADR-0002). Create the directory or remove the marker."
            )
        # Metric A per ADR-0002: direct children at depth 1, files + dirs.
        return sum(1 for _ in shared_dir.iterdir())

    if kind == 'lib-modules':
        lib_dir = REPO_ROOT / '.claude' / 'hooks' / 'lib'
        return sum(1 for p in lib_dir.glob('*.cjs') if p.is_file())

    raise ValueError(f"Unknown count kind: '{kind}'")


def inject_counts(file_path, verbose=True):
    """Idempotently rewrite all COUNT marker regions in `file_path`.

    Logs per-marker changes to stderr (kind:filter old→new) when `verbose=True`,
    so operators can audit which counts moved on a regen run.

    Returns (n_found, n_changed): markers found + markers whose value changed.
    Writes only if content changed.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"inject target does not exist: {file_path}")
    # newline='' keeps the file's own line endings byte-for-byte. Text mode would rewrite every
    # EOL to os.linesep on Windows, turning a one-digit count refresh into a whole-file CRLF
    # churn that downstream generators then mistake for content.
    with path.open(encoding='utf-8', newline='') as handle:
        text = handle.read()
    matches = list(COUNT_MARKER_RE.finditer(text))
    changes = []  # list of (kind, filter, old, new)

    def replacer(m):
        kind = m.group('kind')
        filt = m.group('filter') or 'total'
        old = int(m.group('value'))
        new = count_kind(kind, filt)
        if old != new:
            changes.append((kind, filt, old, new))
        filt_str = f':{filt}' if m.group('filter') else ''
        return f'<!-- COUNT:{kind}{filt_str} -->{new}<!-- /COUNT -->'

    new_text = COUNT_MARKER_RE.sub(replacer, text)
    if new_text != text:
        with path.open('w', encoding='utf-8', newline='') as handle:
            handle.write(new_text)
        if verbose:
            print(f"✓ Updated {len(changes)} marker(s) in {file_path}:", file=sys.stderr)
            for kind, filt, old, new in changes:
                print(f"    COUNT:{kind}:{filt} {old} → {new}", file=sys.stderr)
    elif verbose:
        print(f"✓ No drift in {file_path} ({len(matches)} marker(s) checked)", file=sys.stderr)
    return len(matches), len(changes)


def check_counts(file_path):
    """Compare on-disk marker values to fresh `count_kind` results.

    Returns (n_markers, drifts) where `drifts` is a list of
    (kind, filter, expected, actual) tuples. Empty drifts = clean.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"check target does not exist: {file_path}")
    text = path.read_text(encoding='utf-8')
    drifts = []
    n_markers = 0
    for m in COUNT_MARKER_RE.finditer(text):
        n_markers += 1
        kind = m.group('kind')
        filt = m.group('filter') or 'total'
        actual = int(m.group('value'))
        expected = count_kind(kind, filt)
        if expected != actual:
            drifts.append((kind, filt, expected, actual))
    return n_markers, drifts


def write_output(content, output_path=None, label=None):
    """Write content to stdout, or to a file ONLY when its meaning changed.

    `last_updated` is stamped from the clock on every run, so an unconditional
    write rewrites a tracked catalog whose entries are identical. That produces a
    conflict-prone one-line diff on any branch that merely re-ran the generator.
    The volatility rule already exists here — `normalize_catalog_for_check` masks
    exactly this field for `--check`; applying it on the write path too keeps one
    definition of "did anything real change" for both modes.
    """
    if not output_path:
        print(content)
        return

    path = Path(output_path)
    if path.exists():
        on_disk = path.read_text(encoding='utf-8')
        comparable_on_disk, comparable_generated = normalize_catalog_for_check(on_disk, content)
        if comparable_on_disk == comparable_generated:
            print(f"= Unchanged {output_path} (no content change — not rewritten)", file=sys.stderr)
            return

    path.parent.mkdir(parents=True, exist_ok=True)
    # newline='' writes the generated '\n' verbatim. Default text mode translates it to os.linesep,
    # so on Windows every regen rewrote the whole catalog as CRLF against an LF-committed file —
    # a whole-file diff that buries the real entry changes. Same rule as inject_counts() above; the
    # read side is universal-newline, so the unchanged-comparison was never the part that drifted.
    with path.open('w', encoding='utf-8', newline='') as handle:
        handle.write(content)
    print(f"✓ Generated {output_path}", file=sys.stderr)


def check_against_file(generated, target_path, label):
    """Compare freshly generated catalog against an on-disk file.

    Exit code contract (per ADR-0001 `--check` Mode + plan review M2):
      0 = identical (clean tree)
      1 = drift detected (unified diff on stderr)
      2 = target file does not exist (CI can't certify a nonexistent catalog)

    Distinguishing 1 vs 2 lets CI report 'catalog stale' separately from
    'catalog not committed yet' — operators need different remediations.
    """
    path = Path(target_path)
    if not path.exists():
        print(f"MISSING: target file does not exist: {target_path}", file=sys.stderr)
        return 2

    on_disk = path.read_text(encoding='utf-8')
    comparable_on_disk, comparable_generated = normalize_catalog_for_check(on_disk, generated)
    if comparable_on_disk == comparable_generated:
        return 0

    diff = difflib.unified_diff(
        comparable_on_disk.splitlines(keepends=True),
        comparable_generated.splitlines(keepends=True),
        fromfile=f'{target_path} (on disk)',
        tofile=f'{target_path} (regenerated)',
        n=3,
    )
    print(f"DRIFT: regenerated catalog differs from {target_path}", file=sys.stderr)
    sys.stderr.writelines(diff)
    return 1


def normalize_catalog_for_check(on_disk, generated):
    """Ignore volatile metadata fields that should not make CI date-sensitive."""
    last_updated_re = re.compile(r"^(\s*last_updated:\s*).*$", re.MULTILINE)
    return (
        last_updated_re.sub(r"\1<ignored>", on_disk),
        last_updated_re.sub(r"\1<ignored>", generated),
    )


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Generate command and skill catalogs',
        epilog='Outputs to stdout by default. Use --output to write to a file. '
               'Use --check to verify an on-disk catalog matches a fresh regeneration.'
    )
    parser.add_argument('--skills', action='store_true', help='Generate only skills catalog')
    parser.add_argument('--commands', action='store_true', help='Generate only commands catalog')
    parser.add_argument('--output', '-o', metavar='PATH', help='Write output to file instead of stdout')
    parser.add_argument('--check', metavar='PATH',
                        help='Verify PATH matches a fresh regeneration; exit 1 with diff on stderr if drift detected')
    parser.add_argument('--inject-counts', metavar='FILE',
                        help='Idempotently rewrite COUNT marker regions in FILE (ADR-0002)')
    parser.add_argument('--check-counts', metavar='FILE',
                        help='Exit 1 if any COUNT marker region in FILE diverges from filesystem truth')
    args = parser.parse_args()

    # --inject-counts / --check-counts: standalone modes, no other flag required.
    if args.inject_counts:
        n_found, n_changed = inject_counts(args.inject_counts)
        if n_found == 0:
            print(f"WARN: no COUNT markers found in {args.inject_counts}", file=sys.stderr)
        else:
            print(f"✓ Processed {n_found} marker(s) in {args.inject_counts} "
                  f"({n_changed} changed)", file=sys.stderr)
        sys.exit(0)

    if args.check_counts:
        n, drifts = check_counts(args.check_counts)
        if n == 0:
            print(f"WARN: no COUNT markers found in {args.check_counts}", file=sys.stderr)
            sys.exit(0)
        if drifts:
            for kind, filt, expected, actual in drifts:
                print(f"DRIFT {args.check_counts}: COUNT:{kind}:{filt} "
                      f"expected={expected} actual={actual}", file=sys.stderr)
            sys.exit(1)
        sys.exit(0)

    # Validate: --output and --check each require exactly one of --skills or --commands
    requires_single = args.output or args.check
    if requires_single and not (args.skills ^ args.commands):
        flag = '--output' if args.output else '--check'
        print(f"Error: {flag} requires exactly one of --skills or --commands", file=sys.stderr)
        sys.exit(1)
    if args.output and args.check:
        print("Error: --output and --check are mutually exclusive", file=sys.stderr)
        sys.exit(1)

    # --check mode: regenerate in-memory, compare to file, exit with drift signal.
    if args.check:
        generated = generate_skills_yaml() if args.skills else generate_commands_yaml()
        label = 'skills' if args.skills else 'commands'
        sys.exit(check_against_file(generated, args.check, label))

    # If no specific flag, generate both (to stdout only)
    generate_both = not (args.skills or args.commands)

    if args.commands or generate_both:
        commands_yaml = generate_commands_yaml()
        if generate_both:
            print("# === COMMANDS CATALOG ===")
        write_output(commands_yaml, args.output if args.commands else None)

    if args.skills or generate_both:
        skills_yaml = generate_skills_yaml()
        if generate_both:
            print("\n# === SKILLS CATALOG ===")
        write_output(skills_yaml, args.output if args.skills else None)
