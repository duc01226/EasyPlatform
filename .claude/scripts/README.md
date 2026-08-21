# Claude Code Scripts

Centralized utility scripts for Claude Code skills.

## Installation

Install required dependencies:

```bash
pip install -r requirements.txt
```

## resolve_env.py

Centralized environment variable resolver that follows Claude Code's hierarchy.

### Priority Order (Highest to Lowest)

1. **process.env** - Runtime environment variables (HIGHEST)
2. **PROJECT/.claude/skills/\<skill\>/.env** - Project skill-specific
3. **PROJECT/.claude/skills/.env** - Project shared across skills
4. **PROJECT/.claude/.env** - Project global defaults
5. **~/.claude/skills/\<skill\>/.env** - User skill-specific
6. **~/.claude/skills/.env** - User shared across skills
7. **~/.claude/.env** - User global defaults (LOWEST)

### CLI Usage

```bash
# Resolve a variable for a specific skill
python ~/.claude/scripts/resolve_env.py GEMINI_API_KEY --skill visual analysis tooling

# With verbose output
python ~/.claude/scripts/resolve_env.py GEMINI_API_KEY --skill visual analysis tooling --verbose

# Find all locations where variable is defined
python ~/.claude/scripts/resolve_env.py GEMINI_API_KEY --find-all

# Show hierarchy for a skill
python ~/.claude/scripts/resolve_env.py --show-hierarchy --skill visual analysis tooling

# Export format for shell sourcing
eval $(python ~/.claude/scripts/resolve_env.py GEMINI_API_KEY --export)
```

### Python API Usage

```python
# Add to sys.path if needed
import sys
from pathlib import Path
sys.path.insert(0, str(Path.home() / '.claude' / 'scripts'))

from resolve_env import resolve_env, find_all, show_hierarchy

# Simple resolution
api_key = resolve_env('GEMINI_API_KEY', skill='visual analysis tooling')

# With default value
api_key = resolve_env('GEMINI_API_KEY', skill='visual analysis tooling', default='fallback-key')

# With verbose output
api_key = resolve_env('GEMINI_API_KEY', skill='visual analysis tooling', verbose=True)

# Find all locations
locations = find_all('GEMINI_API_KEY', skill='visual analysis tooling')
for description, value, path in locations:
    print(f"{description}: {value}")

# Show hierarchy
show_hierarchy(skill='visual analysis tooling')
```

### Integration Pattern

Skills should use this script instead of implementing their own resolution logic:

```python
#!/usr/bin/env python3
import sys
from pathlib import Path

# Import centralized resolver
sys.path.insert(0, str(Path.home() / '.claude' / 'scripts'))
from resolve_env import resolve_env

# Resolve API key
api_key = resolve_env('GEMINI_API_KEY', skill='visual analysis tooling')

if not api_key:
    print("Error: GEMINI_API_KEY not found")
    print("Run: python ~/.claude/scripts/resolve_env.py --show-hierarchy --skill visual analysis tooling")
    sys.exit(1)

# Use api_key...
```

### Benefits

- **Consistent**: All skills use the same resolution logic
- **Maintainable**: Single source of truth for hierarchy
- **Debuggable**: Built-in verbose mode and find-all functionality
- **Flexible**: Supports both project-local and user-global configs
- **Clear**: Shows exactly where each value comes from

### Testing

```bash
# Test without any config files
python ~/.claude/scripts/resolve_env.py TEST_VAR --verbose

# Test with environment variable
export TEST_VAR=from-runtime
python ~/.claude/scripts/resolve_env.py TEST_VAR --verbose

# Test with skill context
python ~/.claude/scripts/resolve_env.py GEMINI_API_KEY --skill visual analysis tooling --find-all
```

## generate_catalogs.py

Generate YAML catalogs from command and skill data files. Outputs to stdout by default for easy consumption by Claude.

### Usage

```bash
# Generate skills catalog (outputs to stdout)
python .claude/scripts/generate_catalogs.py --skills

# Generate commands catalog (outputs to stdout)
python .claude/scripts/generate_catalogs.py --commands

# Generate both catalogs (outputs to stdout)
python .claude/scripts/generate_catalogs.py

# Write to file instead of stdout
python .claude/scripts/generate_catalogs.py --skills --output .claude/SKILLS.yaml

# Verify committed catalog matches regeneration
python .claude/scripts/generate_catalogs.py --skills --check .claude/SKILLS.yaml

# Refresh/check marker-region inventory counts
python .claude/scripts/generate_catalogs.py --inject-counts CLAUDE.md
python .claude/scripts/generate_catalogs.py --check-counts CLAUDE.md

# View help
python .claude/scripts/generate_catalogs.py --help
```

### Input Files

Located in the same directory as the script:

- `commands_data.yaml` - Source data for commands
- `skills_data.yaml` - Source data for skills

### Output

By default, outputs YAML to stdout. Use `--output PATH` to write to a file instead.

**Note:** The script can be run from any directory - it resolves input files relative to the script location.

## doc-impact-map.cjs

Routes the current code changes to the `docs/project-reference/**` docs and `docs/project-config.json`
sections those changes can make stale. Backs the impact-scoped freshness pass in `/docs-update` Phase 1,
so a post-change freshness check costs a few targeted verifications instead of a full `/scan-all`.

Routing is derived from `docs/project-config.json` (`contextGroups`, `modules`, `testing`, `e2eTesting`,
`styling`, `designSystem`, `specRoots`) plus change-class rules for manifests, infra/CI, the docs tree, and
the AI-harness surface — no project paths are hardcoded. It is fail-open: bad config, bad regex, or a git
failure degrades to "route it anyway / warn", never to a false "fresh".

### CLI Usage

```bash
# Map the current changes (working tree -> last commit -> untracked)
node .claude/scripts/doc-impact-map.cjs --text
node .claude/scripts/doc-impact-map.cjs --json

# Map a branch diff instead of the working tree
node .claude/scripts/doc-impact-map.cjs --base=origin/main --text

# Map an explicit file list
node .claude/scripts/doc-impact-map.cjs --text src/Billing/Entities/Invoice.cs

# Claims mode: which file references inside a doc no longer resolve?
node .claude/scripts/doc-impact-map.cjs claims --text docs/project-reference/project-structure-reference.md
node .claude/scripts/doc-impact-map.cjs claims --json      # every reference doc
```

### Output (map mode)

Per impacted doc: `doc`, `exists`, `lastScanned`/`ageDays`, `scanTarget` (full-rescan escalation),
`checks` (which verifications apply), `changedFiles`/`addedFiles`/`deletedFiles`, `heuristicOnly`.
Plus `configSections` (impacted `project-config.json` sections), `unrouted` (files no rule matched —
these are UNKNOWN, not fresh), `fastExit`, and `warnings`.

### Output (claims mode)

Per doc: `checked` (path claims found), `missing` (resolves nowhere — a dead citation, i.e. a stale doc),
and `ambiguous` (short-form citations like `shared/contract.md` that resolve by suffix to a real file —
imprecise rather than dead). Splitting the two keeps the dead list short enough that people still read it.

The same check runs as a hard gate: the `reference-doc-freshness` suite fails the build when any
reference doc cites a path that no longer exists.

A doc that names a file precisely BECAUSE it is gone (a retired artifact, a deliberately-recorded
broken link) exempts that citation with a line-scoped `<!-- dead-link-ok -->` marker. It applies to
its own line only — never doc-wide — so later rot in the same file still fails the gate.

Tests: `node .claude/hooks/tests/run-all-tests.cjs --filter=doc-impact-map`
`node .claude/hooks/tests/run-all-tests.cjs --filter=reference-doc-freshness`
