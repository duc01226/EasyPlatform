# Claude Code Scripts

Centralized utility scripts for Claude Code skills.

## Installation

`scan_skills.py` and `generate_catalogs.py` recover missing PyYAML on use through
`lib/python_dependencies.py`. They reuse an existing local target first, then try
one interpreter-wide install and one local target under project-root
`tmp/claude-temp/python-packages`. Each attempt has a 30-second deadline, uses
literal argv and noninteractive wheel-only pip, and verifies the actual import.
Managed Python or denied/offline installs fall back without overriding system
protection. If both attempts fail, the required tool exits 3 with its existing
installation recipe; it never reports a skipped check as passing.

Set `CK_AUTO_INSTALL_DEPENDENCIES=0` to disable automatic attempts. Python `-S`
probes intentionally disable recovery too. Broken transitive imports still surface.
Read `requirements.txt` when changing the declared PyYAML constraint, and
`lib/python_dependencies.py` when changing recovery. Project dependencies remain
owned by the existing local startup installer; graph setup keeps its separate
install-on-use owner.

Manual installation from the project root:

```powershell
# Windows
py -3 -m pip install -r .claude/scripts/requirements.txt
```

```sh
# macOS / Linux
python3 -m pip install -r .claude/scripts/requirements.txt
```

See [pip installation options](https://pip.pypa.io/en/stable/cli/pip_install/) when
checking interpreter/target behavior. The same running interpreter is used on all three
platforms; neither shell activation nor global PATH rewriting is needed.

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
sections those changes can make stale. Backs the impact-scoped context checks in `/docs-manager --mode=update`,
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
node .claude/scripts/doc-impact-map.cjs claims --json      # every reference doc under the configured root (docs/project-config.json -> docsRoots.projectReference.path; default docs/project-reference)
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
The suffix lookup reads `git ls-files`; where git cannot list the project (no work tree, no git on the
host) it walks the project tree instead and records the git failure in `warnings`, so a live file is
not reported dead for want of git.

The configured business-spec root's explicit `INDEX.md` citation resolves at
that root, including a nested configured root. It is not interpreted as a
module index underneath the root a second time. Missing files, traversal and
symlinks escaping the configured root still fail; an unrelated index with the
same basename cannot satisfy the citation.

The same check runs as a hard gate: the `reference-doc-freshness` suite fails the build when any
reference doc cites a path that no longer exists.

A doc that names a file precisely BECAUSE it is gone (a retired artifact, a deliberately-recorded
broken link) exempts that citation with a line-scoped `<!-- dead-link-ok -->` marker. It applies to
its own line only — never doc-wide — so later rot in the same file still fails the gate.

Tests: `node .claude/hooks/tests/run-all-tests.cjs --filter=doc-impact-map`
`node .claude/hooks/tests/run-all-tests.cjs --filter=reference-doc-freshness`

## Context delivery tools

Read this section when comparing compatible and candidate concise delivery or
retrieving workflow selection depth. The shipping default stays compatible until
all required behavioral, deterministic and native host/platform evidence passes.
These tools never change that default or grant permissions. Read
[the profile contract](../docs/configuration/README.md#context-delivery-profile)
for precedence and checkout rollback, and
[portable evidence](../docs/framework-portability.md#concise-guidance-evidence)
for adapter prerequisites and assessment inputs.

The Node commands use the same form on Windows, macOS and Linux, from the project
root. Renderer output is public synthetic context, not private host instructions.

| Tool | Command | Output / boundary |
| --- | --- | --- |
| Workflow catalog | `node .claude/scripts/workflow-catalog.cjs [--mode=ask\|auto\|off]` | Existing bounded catalog with activation tiers and registry discovery; read before selecting a workflow in concise delivery |
| Both-profile renderer | `node .claude/scripts/context-delivery-audit.cjs render` | Seven first-prompt carriers at ask/default, no project route prose, plus separate later catalog/diagnosis text; JSON transport excluded equally |
| Evaluation preparation | `node .claude/scripts/context-delivery-evaluate.cjs` | Writes the frozen job list under project `tmp/` and builds no world; preparation reports behavioral evidence NOT RUN. A run builds each world with its bounded public discovery bundle just before its job and removes it after grading unless `--keep-worlds` is given |
| Authorized evaluation | `node .claude/scripts/context-delivery-evaluate.cjs --adapter <adapter.json>` | Isolated external host trials and graded receipts; requires an authorized adapter, actual usage/tool results and separately established isolation |
| Evidence assessment | `node .claude/scripts/context-delivery-audit.cjs assess <evidence.json>` | Current source/policy/bundle-bound complete-pair/outcome/cost/native-proof assessment; exit 1 when adoption evidence is missing or fails |

For optional token estimates, pipe renderer JSON to
`context-delivery-tokens.py` after installing `tiktoken` in an isolated Python
environment. Windows: `py -3 .claude/scripts/context-delivery-tokens.py`;
macOS/Linux: `python3 .claude/scripts/context-delivery-tokens.py`. It records the
installed tokenizer version and `o200k_base` estimate. The scoped target is at
most 2,500 concise tokens and at least 60% below compatible; later reads and actual
whole-session traffic remain separate. Token savings alone do not establish
behavioral quality or authorize promotion.

Frozen evaluation v4 allows observed evidence files under `tmp/reports/` and
`tmp/analysis/` before task-input reads, while those reads must still precede
task-state changes. Limits are 64 regular artifacts, 256 KiB per file and 2 MiB
total; inventory is bounded to 10,000 entries and depth 32. Grading reads only
contained regular task files up to 1 MiB through checked, closed descriptors.
Exceeding artifact/inventory budgets makes observation incomplete. Required
outlier diagnoses are trimmed nonblank strings of at most 4,096 characters.
The custom-route case proves selection and actual definition loading, not
completed audit quality. Every changed world invalidates older evidence. Complete skill reads may span successful pre-edit outputs. Trusted optional `readChunks` uses UTF-8 byte offsets for framed or out-of-order output; its exact content and complete coverage are checked. Output plus chunk text is bounded to 4 MiB and 4,096 relevant chunks per required file (4,096 chunks per event); malformed or over-budget evidence is incomplete.

## Protocol, profile and report tools

Run every command from the project root; each works the same on Windows, macOS and Linux (`node <script>`; Python modules are imported, not run).

| Script | Command | Purpose |
| --- | --- | --- |
| `build-protocol-projection.cjs` | `node .claude/scripts/build-protocol-projection.cjs [--check]` | Generates `.claude/skills/shared/protocols/` (one `<tag>.md` per shared protocol, `<tag>.part-<n>.md` for a tag over the bin, and `index.json`) from `.claude/skills/shared/sync-inline-versions.md` and `.claude/skills/shared/protocol-groups.json`. Also validates the `universal` group's authored `bins` layout (every universal tag in exactly one bin, each rendered bin within the 9,500-character limit). Rebuild in the same change as any canonical protocol edit; `--check` is read-only and exits 1 when the output is stale or the group data is invalid |
| `lib/protocol-guide-carrier.cjs` | `require` only | JavaScript recognizer of the `PROTOCOL-GUIDES` guide-line format and of the retired `Root-carried protocols` pointer line that guards must not find (twins of `format_guide_line` and `root_pointer_lines` in `sync_blocks.py`; `sync-update-blocks.py --mode=strip-root-pointer` removes one); sensors and injectors call it instead of copying the regex |
| `sync-skill-profile.cjs` | `node .claude/scripts/sync-skill-profile.cjs [--check]` | Applies `skillProfile` from `docs/project-config.json` to `.claude/settings.json` `skillOverrides` (owned keys only, ledger `.claude/skill-profile.generated.json`); exports `resolveProfile`, which the Codex and OpenCode syncs use for the called-skill set (workflow steps, agent skills, `calledByOthers`, `entrySkills`) and refusals, plus the crash-consistent writers `writeTextAtomic` and `writePairCrashConsistent` they share. Read `.claude/config/README.md#skill-profile` for the contract |
| `session-usage-report.cjs` | `node .claude/scripts/session-usage-report.cjs --transcript <path> [--compare <path>] [--run <runId>] [--json]` | Offline token usage of one Claude session (main + sub-agents, each response once; non-cached total apart from cache reads), an A/B comparison, and a run's deviation log (step id and kind only, never evidence text) |
| `open-report.cjs` | `node .claude/scripts/open-report.cjs <path>` | Opens a generated report under the project `tmp/` or `temp/` in the default viewer with a literal argv — only report file types (`.html`, `.htm`, `.md`, `.txt`, `.pdf`, `.png`, `.jpg`, `.jpeg`, `.svg`, `.json`, checked case-insensitively on the resolved file); opens nothing under `CI` or `CK_NO_AUTO_OPEN=1`, or on Linux without a display, and always prints the path |
| `line_endings.py` | imported by the block injectors | `read_text`/`write_text` keep a file's own line-ending style (any CRLF → CRLF, else LF; new files LF), so an injector never flips a file's newlines on Windows |

Tests: `node --test .claude/scripts/tests/build-protocol-projection.test.cjs` · `sync-skill-profile.test.cjs` · `open-report.test.cjs` · `injectors-respect-guides.test.cjs` (same folder); `node .claude/hooks/tests/run-all-tests.cjs --filter=session-usage`
