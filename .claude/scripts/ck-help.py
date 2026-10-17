#!/usr/bin/env python3
"""
ClaudeKit Help Command - All-in-one guide with dynamic skill discovery.
Scans .claude/skills/ directory to build catalog at runtime.

Usage:
    python ck-help.py                    # Overview with quick start
    python ck-help.py fix                # Category guide with workflow
    python ck-help.py plan                # Skill details
    python ck-help.py debug login error  # Task recommendations
    python ck-help.py auth               # Search (unknown word)
"""

import sys
import re
import subprocess
from pathlib import Path
from win_compat import ensure_utf8_stdout

# Fix Windows console encoding for Unicode characters
ensure_utf8_stdout(errors='replace')


# Output type markers for LLM presentation guidance
# Format: @CK_OUTPUT_TYPE:<type>
# Types:
#   - comprehensive-docs: Full documentation, show verbatim + add context
#   - category-guide: Workflow guide, show full + explain workflow
#   - command-details: Single command, show + offer to run
#   - search-results: Search matches, show + offer alternatives
#   - task-recommendations: Task-based suggestions, explain reasoning
OUTPUT_TYPES = {
    "comprehensive-docs": "Show FULL output verbatim, then ADD helpful context, examples, and real-world tips",
    "category-guide": "Show complete workflow, then ENHANCE with practical usage scenarios",
    "command-details": "Show command info, then ADD usage examples and related commands",
    "search-results": "Show all matches, then HELP user narrow down or explore",
    "task-recommendations": "Show recommendations, then EXPLAIN why these fit and offer to start",
}


def emit_output_type(output_type: str) -> None:
    """Emit output type marker for LLM presentation guidance."""
    print(f"@CK_OUTPUT_TYPE:{output_type}")
    print()


# Task keyword mappings for intent detection
TASK_MAPPINGS = {
    "fix": ["fix", "bug", "error", "broken", "issue", "debug", "crash", "fail", "wrong", "not working"],
    "plan": ["plan", "design", "architect", "research", "think", "analyze", "strategy", "how to", "approach"],
    "feature-implement": ["implement", "build", "create", "add", "feature", "code", "develop", "make", "write"],

    "test": ["test", "check", "verify", "validate", "spec", "unit", "integration", "coverage"],
    "docs": ["document", "readme", "docs", "explain", "comment", "documentation"],
    "git": ["commit", "push", "pr", "merge", "branch", "pull", "request", "git"],
    "design": ["ui", "ux", "style", "layout", "visual", "css", "component", "page", "responsive"],
    "review": ["review", "audit", "inspect", "quality", "refactor", "clean"],
    "content": ["copy", "text", "marketing", "content", "blog", "seo"],
    "integrate": ["integrate", "payment", "api", "connect", "webhook", "third-party"],
    "skill": ["skill", "agent", "automate", "workflow"],
    "investigate": ["find", "search", "locate", "explore", "scan", "where", "trace", "investigate"],
    "config": ["config", "configure", "settings", "ck.json", ".ck.json", "setup", "locale", "language", "paths"],
}

# Category workflows and tips
CATEGORY_GUIDES = {
    "fix": {
        "title": "Fixing Issues",
        "workflow": [
            ("Start", "`/fix` \"describe your issue\""),
            ("If stuck", "`/investigate --mode=debug` \"more details\""),
            ("Verify", "`/test`"),
        ],
        "tip": "Include error messages for better results",
    },
    "plan": {
        "title": "Planning",
        "workflow": [
            ("Plan", "`/plan` \"your task\" (after saving, interviews you to confirm decisions; `plan.validation.mode` sets auto, prompt or off)"),
            ("Validate again", "`/plan --mode=validate` (only after a skipped interview or a changed plan)"),
            ("Execute plan", "`/plan --mode=execute` (runs the plan)"),
        ],
        "tip": "A standalone /plan validates its own plan; run /plan --mode=validate yourself only after a skipped interview or a changed plan",
    },
    "feature-implement": {
        "title": "Implementation",
        "workflow": [
            ("Implement", "`/feature-implement` \"your feature\""),
            ("Test", "`/test`"),
        ],
        "tip": "/feature-implement is standalone - it plans internally. Use /plan → /plan --mode=execute for explicit planning",
    },
    "test": {
        "title": "Testing",
        "workflow": [
            ("Run tests", "`/test`"),
            ("Fix failures", "`/fix --target=test`"),
        ],
        "tip": "Run tests frequently during development",
    },
    "docs": {
        "title": "Documentation",
        "workflow": [
            ("Initialize", "`/docs-manager --mode=init`"),
            ("Update", "`/docs-manager --mode=update`"),
        ],
        "tip": "Keep docs close to code for accuracy",
    },
    "git": {
        "title": "Git Workflow",
        "workflow": [
            ("Commit", "`/commit`"),
            ("Push", "`/commit --push`"),
        ],
        "tip": "Commit often with clear messages",
    },
    "design": {
        "title": "Design",
        "workflow": [
            ("Quick design", "`/ui-design --mode=fast` \"description\""),
            ("From screenshot", "`/ui-design --mode=screenshot` <path>"),
            # No "3D design" entry on purpose: there is no /design-3d skill (no .claude/skills/design-3d/SKILL.md).
            # It was removed as a dead entry and a framework re-sync re-added it twice; `/ck-help design` then
            # advertised a command that does not exist. Re-add only together with the skill itself.
        ],
        "tip": "Reference existing designs for consistency",
    },
    "review": {
        "title": "Code Review",
        "workflow": [
            ("Full review", "`/code-quality-review`"),
        ],
        "tip": "Review before merging to main",
    },
    "content": {
        "title": "Content Creation",
        "workflow": [
            ("Quick copy", "`/content-fast` \"requirements\""),
            ("Quality copy", "`/content-good` \"requirements\""),
            ("Optimize", "`/content-cro`"),
        ],
        "tip": "Know your audience before writing",
    },
    "integrate": {
        "title": "Integration",
        "workflow": [
            ("Payment Systems", "`/payment-integration`"),
        ],
        "tip": "Read API docs before integrating",
    },
    "skill": {
        "title": "Skill Management",
        "workflow": [
            ("Create", "`/skill-creator`"),
            ("Optimize", "`/skill-creator` (Mode 5)"),
            ("Fix from logs", "`/skill-creator` (Mode 6)"),
        ],
        "tip": "Skills extend agent capabilities — optimize/fix-logs are skill-creator modes",
    },
    "investigate": {
        "title": "Codebase Exploration",
        "workflow": [
            ("Investigate", "`/investigate` \"what to find\""),
            ("Trace flow", "`/investigate` \"trace how it works\""),
        ],
        "tip": "Be specific about what you're looking for",
    },
    "config": {
        "title": "ClaudeKit Configuration (.ck.json)",
        "workflow": [
            ("Global", "Set user prefs in `~/.claude/.ck.json`"),
            ("Local", "Override per-project in `./.claude/.ck.json`"),
            ("Resolution", "DEFAULT → global → local (deep merge)"),
        ],
        "tip": "Global config works in fresh dirs; local overrides for projects",
    },
}


def detect_prefix(skills_dir: Path) -> str:
    """Detect if skills use /ck- prefix based on directory structure."""
    # Check if any skill starts with "ck-"
    return ""  # No prefix needed for skills


def parse_frontmatter(file_path: Path) -> dict:
    """Parse YAML frontmatter from a markdown file."""
    try:
        content = file_path.read_text(encoding='utf-8')
    except Exception:
        return {}

    # Check for frontmatter
    if not content.startswith('---'):
        return {}

    # Find closing ---
    end_idx = content.find('---', 3)
    if end_idx == -1:
        return {}

    frontmatter = content[3:end_idx].strip()
    result = {}

    for line in frontmatter.split('\n'):
        if ':' in line:
            key, value = line.split(':', 1)
            result[key.strip()] = value.strip()

    return result


def discover_skills(skills_dir: Path, prefix: str) -> dict:
    """Scan .claude/skills/ and build skill catalog."""
    commands = {}
    categories = {}

    if not skills_dir.exists():
        return {"commands": commands, "categories": categories}

    # A skill is one directory deep (same rule as scan_skills.py); a recursive walk
    # would enter dependency folders such as node_modules, which may link back to the repo.
    for skill_file in sorted(skills_dir.glob("*/SKILL.md")):
        skill_dir = skill_file.parent
        skill_name = skill_dir.name

        # Derive category from skill name prefix (e.g., workflow-feature -> workflow)
        parts = skill_name.split('-')
        category = parts[0] if len(parts) > 1 else "core"

        # Parse frontmatter
        fm = parse_frontmatter(skill_file)
        description = fm.get('description', '')

        # Skip if no description
        if not description:
            continue

        # Clean description (remove emoji indicators)
        clean_desc = re.sub(r'^[^\w\s]+\s*', '', description).strip()

        # Format skill name as command trigger
        formatted_name = f"/{prefix}{skill_name}" if prefix else f"/{skill_name}"

        # Add to commands
        if category not in commands:
            commands[category] = []

        commands[category].append({
            "name": formatted_name,
            "description": clean_desc,
            "category": category,
        })

        # Track categories
        if category not in categories:
            categories[category] = category.title()

    # Sort commands within each category
    for cat in commands:
        commands[cat].sort(key=lambda x: x["name"])

    return {"commands": commands, "categories": categories}


def detect_intent(input_str: str, categories: list) -> str:
    """Smart auto-detection of user intent."""
    if not input_str:
        return "overview"

    input_lower = input_str.lower()

    # Check if it's a known category
    if input_lower in [c.lower() for c in categories]:
        return "category"

    # Check if it looks like a specific skill (has hyphen suggesting compound name)
    if '-' in input_str and len(input_str.split()) == 1:
        return "command"

    # Multiple words = task description
    if len(input_str.split()) >= 2:
        return "task"

    return "search"


def show_overview(data: dict, prefix: str) -> None:
    """Display overview with quick start guide."""
    emit_output_type("category-guide")

    commands = data["commands"]
    categories = data["categories"]
    total = sum(len(cmds) for cmds in commands.values())
    help_cmd = f"/{prefix}framework-config --mode=help" if prefix else "/framework-config --mode=help"

    print("# ClaudeKit Commands")
    print()
    print(f"{total} commands across {len(categories)} categories.")
    print()
    print("**Quick Start:**")
    print(f"- `/{prefix}feature-implement` - Implement features (standalone)")
    print(f"- `/{prefix}plan` + `/{prefix}plan --mode=execute` - Plan then execute")
    print(f"- `/{prefix}fix` - Fix bugs intelligently")
    print(f"- `/{prefix}test` - Run and analyze tests")
    print()
    print("**Categories:**")
    for cat_key in sorted(categories.keys()):
        count = len(commands.get(cat_key, []))
        print(f"- `{cat_key}` ({count})")
    print()
    print("**Usage:**")
    print(f"- `{help_cmd} <category>` - Category guide with workflow")
    print(f"- `{help_cmd} <command>` - Command details")
    print(f"- `{help_cmd} <task description>` - Recommendations")


def show_category_guide(data: dict, category: str, prefix: str) -> None:
    """Display category guide with workflow and tips."""
    emit_output_type("category-guide")

    categories = data["categories"]
    commands = data["commands"]

    # Find matching category (case-insensitive)
    cat_key = None
    for key in categories:
        if key.lower() == category.lower():
            cat_key = key
            break

    if not cat_key:
        print(f"Category '{category}' not found.")
        print()
        print("Available: " + ", ".join(f"`{c}`" for c in sorted(categories.keys())))
        return

    cmds = commands.get(cat_key, [])
    guide = CATEGORY_GUIDES.get(cat_key, {})

    print(f"# {guide.get('title', cat_key.title())}")
    print()

    # Workflow first (most important)
    if "workflow" in guide:
        print("**Workflow:**")
        for step, cmd in guide["workflow"]:
            print(f"- {step}: {cmd}")
        print()

    # Commands list
    print("**Commands:**")
    for cmd in cmds:
        print(f"- `{cmd['name']}` - {cmd['description']}")

    # Tip at the end
    if "tip" in guide:
        print()
        print(f"*Tip: {guide['tip']}*")


def show_command(data: dict, command: str, prefix: str) -> None:
    """Display command details."""
    emit_output_type("command-details")

    commands = data["commands"]

    # Normalize search term
    search = command.lower().replace("/ck-", "").replace("/", "").replace(":", "-")

    found = None
    for cmds in commands.values():
        for cmd in cmds:
            # Normalize command name for comparison
            name = cmd["name"].lower().replace("/ck-", "").replace("/", "")
            if name == search:
                found = cmd
                break
        if found:
            break

    if not found:
        print(f"Command '{command}' not found.")
        print()
        do_search(data, command.replace(":", " "), prefix)
        return

    print(f"# `{found['name']}`")
    print()
    print(found['description'])
    print()
    print(f"**Category:** {found['category']}")
    print()
    print(f"**Usage:** `{found['name']} <your-input>`")

    # Show related commands (same category)
    cat = found['category']
    if cat in commands:
        related = [c for c in commands[cat] if c['name'] != found['name']][:3]
        if related:
            related_names = ", ".join(f"`{r['name']}`" for r in related)
            print()
            print(f"**Related:** {related_names}")


def do_search(data: dict, term: str, prefix: str) -> None:
    """Search commands by keyword."""
    emit_output_type("search-results")

    commands = data["commands"]
    term_lower = term.lower()
    matches = []

    for cmds in commands.values():
        for cmd in cmds:
            if term_lower in cmd["name"].lower() or term_lower in cmd["description"].lower():
                matches.append(cmd)

    if not matches:
        print(f"No commands found for '{term}'.")
        print()
        print("Try browsing categories: " + ", ".join(f"`{c}`" for c in sorted(data["categories"].keys())))
        return

    print(f"# Search: {term}")
    print()
    print(f"Found {len(matches)} matches:")
    for cmd in matches[:8]:
        print(f"- `{cmd['name']}` - {cmd['description']}")


def recommend_task(data: dict, task: str, prefix: str) -> None:
    """Recommend commands for a task description."""
    emit_output_type("task-recommendations")

    commands = data["commands"]
    task_lower = task.lower()

    # Score categories by keyword matches
    scores = {}
    for cat, keywords in TASK_MAPPINGS.items():
        score = sum(1 for kw in keywords if kw in task_lower)
        if score > 0:
            scores[cat] = score

    if not scores:
        print(f"Not sure about: {task}")
        print()
        print("Try being more specific, or browse categories: " + ", ".join(f"`{c}`" for c in sorted(data["categories"].keys())))
        return

    sorted_cats = sorted(scores.items(), key=lambda x: -x[1])
    top_cat = sorted_cats[0][0]
    guide = CATEGORY_GUIDES.get(top_cat, {})

    print(f"# Recommended for: {task}")
    print()

    # Show workflow first (most actionable)
    if "workflow" in guide:
        print("**Workflow:**")
        for step, cmd in guide["workflow"][:3]:
            print(f"- {step}: {cmd}")
        print()

    # Show relevant commands
    print("**Commands:**")
    shown = 0
    for cat, _ in sorted_cats[:2]:
        if cat in commands:
            for cmd in commands[cat][:2]:
                print(f"- `{cmd['name']}` - {cmd['description']}")
                shown += 1
                if shown >= 4:
                    break
        if shown >= 4:
            break

    if "tip" in guide:
        print()
        print(f"*Tip: {guide['tip']}*")


def print_generated_settings() -> None:
    """Print every setting from its owning schema/doc via ck-config-help.cjs (never a transcribed list)."""
    script = Path(__file__).resolve().parent / "ck-config-help.cjs"
    reason = "no output"
    try:
        result = subprocess.run(["node", str(script)], capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=60)
        if result.returncode == 0 and result.stdout.strip():
            print(result.stdout.rstrip())
            return
        if (result.stderr or "").strip():
            reason = result.stderr.strip().splitlines()[-1]
    except (OSError, subprocess.SubprocessError) as error:
        reason = str(error)
    print("## Every setting")
    print()
    print(f"_Generated list unavailable ({reason})._ Run: `node .claude/scripts/ck-config-help.cjs`")
    print("Project-config options: `node .claude/skills/project-config/scripts/project-config-help.cjs --sections`")


def show_config_guide() -> None:
    """Display comprehensive .ck.json configuration guide."""
    emit_output_type("comprehensive-docs")

    print("# ClaudeKit Configuration (.ck.json)")
    print()
    print("**Locations (cascading resolution):**")
    print("- Global: `~/.claude/.ck.json` (user preferences, all projects)")
    print("- Project: `./.claude/.ck.json` (shared, committed to git)")
    print("- Personal: `./.claude/.ck.local.json` (gitignored, per-developer override)")
    print()
    print("**Resolution Order:** `DEFAULT → global → project → personal`")
    print("- Each layer deep-merges over the previous — set only the values you override")
    print("- Use .ck.local.json for personal preferences without affecting teammates")
    print("- **AI config-update default target:** `.ck.local.json` unless the user says \"update project config\" / \"share with team\"")
    print()
    print("**Purpose:** Customize plan naming, paths, locale, and hook behavior.")
    print()
    print("---")
    print()
    print("## Quick Start")
    print()
    print("**Global config** (`~/.claude/.ck.json`) - your preferences:")
    print("```json")
    print('{')
    print('  "locale": {')
    print('    "thinkingLanguage": "en",')
    print('    "responseLanguage": "vi"')
    print('  },')
    print('  "plan": { "issuePrefix": "GH-" }')
    print('}')
    print("```")
    print()
    print("**Local override** (`./.claude/.ck.json`) - project-specific:")
    print("```json")
    print('{')
    print('  "plan": { "issuePrefix": "JIRA-" },')
    print('  "paths": { "docs": "documentation" }')
    print('}')
    print("```")
    print()
    print("---")
    print()
    print_generated_settings()
    print()
    print("---")
    print()
    print("## `plan` sub-keys")
    print()
    print("`plan` is free-form in the schema; these are the keys the plan tooling reads:")
    print("```json")
    print('{')
    print('  "plan": {')
    print('    "namingFormat": "{date}-{issue}-{slug}",  // Plan folder naming')
    print('    "dateFormat": "YYMMDD-HHmm",              // Date format in names')
    print('    "issuePrefix": null,                        // Optional issue ID prefix (null = #)')
    print('    "reportsDir": "reports",                  // Reports subfolder')
    print('    "resolution": {')
    print('      "order": ["session", "branch"],  // Resolution chain')
    print('      "branchPattern": "(?:feat|fix|...)/.+"  // Branch slug regex')
    print('    },')
    print('    "validation": {')
    print('      "mode": "auto",         // "auto" | "prompt" | "off"')
    print('      "minQuestions": 3,      // Breadth floor: look wider below this')
    print('      "maxQuestions": 8,      // Size of one question round, not a cap')
    print('      "focusAreas": ["assumptions", "risks", "tradeoffs", "architecture"]')
    print('    }')
    print('  }')
    print('}')
    print("```")
    print()
    print("---")
    print()
    print("## Key Concepts")
    print()
    print("**Plan Resolution Chain:**")
    print("1. `session` - Check session temp file for active plan")
    print("2. `branch` - Match git branch slug to plan folder")
    print()
    print("**Naming Format Variables:**")
    print("- `{date}` - Formatted date (per dateFormat)")
    print("- `{issue}` - Issue ID with prefix")
    print("- `{slug}` - Descriptive slug from branch or input")
    print()
    print("**Language Settings:**")
    print("- `thinkingLanguage` - Language for internal reasoning (\"en\" recommended)")
    print("- `responseLanguage` - Language for user-facing output (\"vi\", \"fr\", etc.)")
    print()
    print("When both are set, Claude thinks in one language but responds in another.")
    print("This improves precision (English) while maintaining natural output (your language).")
    print()
    print("**Plan Validation:**")
    print("- `mode: \"auto\"` - Run the validation interview after a standalone `/plan` saves its plan (default)")
    print("- `mode: \"prompt\"` - Ask first whether to run it")
    print("- `mode: \"off\"` - Skip; user runs `/plan --mode=validate` manually")
    print("- `maxQuestions` sizes one question round; rounds continue until every material decision is asked")
    print()
    print("Validation interviews the user with critical questions to confirm")
    print("assumptions, risks, and architectural decisions before implementation.")
    print()
    print("SessionStart exports supported settings; commands read project-specific conventions from the project config and reference docs.")
    print()
    print("---")
    print()
    print("## Assertions (Optional Reminders)")
    print()
    print("`assertions` is an optional array of stack-neutral reminders.")
    print("This repository's SessionStart hook loads settings but does not inject this array into prompt text.")
    print("Keep durable project-specific conventions in `docs/project-config.json` and its referenced project docs.")
    print("```json")
    print('{')
    print('  "assertions": [')
    print('    "Read the project reference docs before applying architecture-specific conventions",')
    print('    "Prefer an existing implementation when it fits the requirement"')
    print('  ]')
    print('}')
    print("```")
    print("Validated as an array of strings; invalid entries warn but never block.")
    print()
    print("---")
    print()
    print("## Reference Docs Staleness (`referenceDocs.staleDays`)")
    print()
    print("Controls how old reference docs may be before the staleness gate activates.")
    print("- `60` (default): warn after 60 days until scanned or dismissed")
    print("- `1-365`: custom threshold in days")
    print()
    print("**How it works:**")
    print("1. On session start, checks `<!-- Last scanned: YYYY-MM-DD -->` in each reference doc,")
    print("   plus the untracked `tmp/claude-temp/.scan-verified` ledger — a scan that found nothing")
    print("   to change records the pass there instead of rewriting the doc, so re-running a scan")
    print("   produces no git diff. A ledger entry counts only while its content hash still matches.")
    print("2. If any doc exceeds `staleDays` by BOTH measures, a warning lists the stale docs")
    print("3. The warning asks you to run `/scan-all` (or a `/scan-*`); it does not block the prompt")
    print("4. `skip scan` dismisses the gate for 7 days")
    print()
    print("---")
    print()
    print("## Code Review Graph (optional)")
    print()
    print("Builds a knowledge graph of the codebase for blast-radius analysis and smarter reviews.")
    print("- **Setup:** Python 3.10+ required; `/graph-code --mode=build` installs the rest into the hooks' environment")
    print("- **Mode:** `hooks.codeGraph.enabled` in `docs/project-config.json` — `auto` (default), `on`, `off`")
    print("- **Skills:** `/graph-code --mode={build|query|trace|blast-radius|connect-api|export}`")
    print("- **Config:** frontend->backend detection via `graphConnectors` in the project config (default `docs/project-config.json`)")
    print("- Docs: `.claude/docs/code-graph-mechanism.md`")
    print()
    print("---")
    print()
    print("## Edge Cases & Validation")
    print()
    print("**Path Handling:**")
    print("- Trailing slashes normalized (`plans/` → `plans`)")
    print("- Empty/whitespace-only paths fall back to defaults")
    print("- Absolute paths supported (e.g., `/home/user/all-plans`)")
    print("- Path traversal (`../`) blocked for relative paths")
    print("- Null bytes and control chars rejected")
    print()
    print("**Slug Sanitization:**")
    print("- Invalid filename chars removed: `< > : \" / \\ | ? *`")
    print("- Non-alphanumeric replaced with hyphen")
    print("- Multiple hyphens collapsed: `foo---bar` → `foo-bar`")
    print("- Leading/trailing hyphens removed")
    print("- Max 100 chars to prevent filesystem issues")
    print()
    print("**Naming Pattern Validation:**")
    print("- Pattern must contain `{slug}` placeholder")
    print("- Result must be non-empty after variable substitution")
    print("- Unresolved placeholders (except `{slug}`) trigger error")
    print("- Malformed JSON config falls back to defaults")
    print()
    print("**Consolidated Plans (advanced):**")
    print("```json")
    print('{')
    print('  "paths": {')
    print('    "plans": "/home/user/all-my-plans"')
    print('  }')
    print('}')
    print("```")
    print("Absolute paths allow storing all plans in one location across projects.")
    print()
    print("---")
    print()
    print("## Examples")
    print()
    print("**Global install user (fresh directories work):**")
    print("```bash")
    print("# ~/.claude/.ck.json - applies everywhere")
    print("cd /tmp/new-project && claude  # Uses global config")
    print("```")
    print()
    print("**Project with local override:**")
    print("```bash")
    print("# Global: issuePrefix = \"GH-\"")
    print("# Local (.claude/.ck.json): issuePrefix = \"JIRA-\"")
    print("# Result: issuePrefix = \"JIRA-\" (local wins)")
    print("```")
    print()
    print("**Deep merge behavior:**")
    print("```")
    print("Global: { plan: { issuePrefix: \"GH-\", dateFormat: \"YYMMDD\" } }")
    print("Local:  { plan: { issuePrefix: \"JIRA-\" } }")
    print("Result: { plan: { issuePrefix: \"JIRA-\", dateFormat: \"YYMMDD\" } }")
    print("```")
    print()
    print("*Tip: Config is optional - all fields have sensible defaults.*")


def main():
    # Find .claude/skills directory
    script_path = Path(__file__).resolve()
    claude_dir = script_path.parent.parent  # .claude/scripts -> .claude
    skills_dir = claude_dir / "skills"

    if not skills_dir.exists():
        print("Error: .claude/skills/ directory not found.")
        sys.exit(1)

    # Discover skills
    prefix = ""
    data = discover_skills(skills_dir, prefix)

    if not data["commands"]:
        print("No skills found in .claude/skills/")
        sys.exit(1)

    # Parse input
    args = sys.argv[1:]
    input_str = " ".join(args).strip()

    # Special case: config documentation (not a command category)
    if input_str.lower() in ["config", "configuration", ".ck.json", "ck.json", "settings", "options", "switches", "env", "environment", "environment variables"]:
        show_config_guide()
        return

    # Detect intent and route
    intent = detect_intent(input_str, list(data["categories"].keys()))

    if intent == "overview":
        show_overview(data, prefix)
    elif intent == "category":
        show_category_guide(data, input_str, prefix)
    elif intent == "command":
        show_command(data, input_str, prefix)
    elif intent == "task":
        recommend_task(data, input_str, prefix)
    else:
        do_search(data, input_str, prefix)


if __name__ == "__main__":
    main()
