"""One-shot injector for the "First Principle — Easy to Change" block.

Inserts the canonical principle block into a fixed list of SKILL.md files
(weaving it as a new H2 section IMMEDIATELY BEFORE the file's existing
principles/mindset/rules anchor heading) and appends the closing reminder at
end-of-file. Idempotent: skips files that already contain the marker.

Usage:
    python .claude/scripts/inject_easy_to_change_principle.py [--dry-run]

Designed to be deleted after one successful run.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

MARKER = "## First Principle — Easy to Change"
CLOSING_MARKER = "**Closing reminder — Easy to Change is the success metric.**"

BLOCK = """## First Principle — Easy to Change

> **The success metric of every coding decision is _future change cost_.**
> DRY, SRP, abstraction, design patterns, naming, layering, tests — every
> technique exists to serve one goal: **making the next change cheaper**.

When evaluating code, a refactor, a test, or an abstraction, ask:
**does this make the next change cheaper or more expensive?**

- Reject "best practices" that raise change cost (premature abstraction,
  speculative generality, leaky indirection, ceremony without payoff).
- Name the real enemies in findings: **coupling, hidden state, duplicated
  knowledge, unclear intent, irreversible decisions exposed too early**.
- A simpler design that is easy to change beats a sophisticated design that
  isn't.

Apply this lens **before** invoking any specific rule, pattern, or checklist
below — if a downstream rule would raise change cost, this principle wins.

---

"""

CLOSING = """

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: *does this make
> the next change cheaper or more expensive?* If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.
"""

# (skill_dir, ordered list of anchor heading regexes — first match wins).
# Each regex matches a full heading line (e.g. `## Core Principles ...`).
# If none match, the block is inserted right after the `## Quick Summary`
# section (before the next `## ` heading). If neither exists, after the
# frontmatter / first `# ` title.
TARGETS: list[tuple[str, list[str]]] = [
    # --- Review tier ---
    ("code-review", [r"^## Core Principles \(ENFORCE ALL\)"]),
    ("changes-review", [r"^## Core Principles \(ENFORCE ALL\)"]),
    ("architecture-review", [r"^## Review Mindset \(NON-NEGOTIABLE\)"]),
    ("domain-entities-review", [r"^## Phase 0: "]),
    ("artifact-review", [r"^## Adversarial Review Mindset \(NON-NEGOTIABLE\)"]),
    ("why-review", [r"^## Adversarial Review Mindset \(NON-NEGOTIABLE\)"]),
    ("plan-review", [r"^## Adversarial Review Mindset \(NON-NEGOTIABLE\)"]),
    ("integration-test-review", [r"^## Phase 0: Scope Detection"]),
    ("knowledge-review", [r"^## Adversarial Review Mindset \(NON-NEGOTIABLE\)"]),
    ("workflow-review-changes", [r"^## Mandatory Task Creation"]),
    # --- Simplification / refactor ---
    ("code-simplifier", [r"^## Simplification Mindset"]),
    ("refactoring", [r"^## Investigation Mindset \(NON-NEGOTIABLE\)"]),
    # --- Test authoring ---
    ("integration-test", [r"^## Project Pattern Discovery"]),
    ("integration-test-verify", [r"^## Step 1: Read Project Config"]),
    ("e2e-test", [r"^## Core Principles"]),
    ("test", [r"^## Workflow Recommendation"]),
    # --- Implementation / quality ---
    ("plan-execute", [r"^## Critical Enforcement Rules"]),
    ("feature-implement", [r"^## Default Mode Policy"]),
    ("plan", [r"^## Default Mode Policy"]),
    ("plan-validate", [r"^## Phase 0: Detect Plan Type"]),
]


def insert_block(text: str, anchor_patterns: list[str]) -> tuple[str, str]:
    """Return (new_text, strategy). Raises on failure."""
    if MARKER in text:
        return text, "skipped-already-present"

    for pattern in anchor_patterns:
        rx = re.compile(pattern, re.MULTILINE)
        m = rx.search(text)
        if m:
            insert_at = m.start()
            return text[:insert_at] + BLOCK + text[insert_at:], f"anchor:{pattern}"

    # Fallback: insert before the second `## ` heading
    # (first is typically `## Quick Summary`).
    h2_rx = re.compile(r"^## ", re.MULTILINE)
    matches = list(h2_rx.finditer(text))
    if len(matches) >= 2:
        insert_at = matches[1].start()
        return text[:insert_at] + BLOCK + text[insert_at:], "fallback:second-h2"

    if matches:
        insert_at = matches[0].end()
        return text[:insert_at] + "\n\n" + BLOCK + text[insert_at:], "fallback:after-first-h2"

    return text + "\n\n" + BLOCK, "fallback:append"


def append_closing(text: str) -> tuple[str, bool]:
    if CLOSING_MARKER in text:
        return text, False
    if not text.endswith("\n"):
        text += "\n"
    return text + CLOSING, True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    skills_root = REPO_ROOT / ".claude" / "skills"
    errors: list[str] = []
    inserted_count = 0
    closing_count = 0
    already_count = 0

    for skill_dir, anchors in TARGETS:
        path = skills_root / skill_dir / "SKILL.md"
        if not path.exists():
            errors.append(f"missing: {path}")
            continue

        original = path.read_text(encoding="utf-8")
        new_text, strategy = insert_block(original, anchors)
        new_text, closing_added = append_closing(new_text)

        if strategy.startswith("skipped"):
            already_count += 1
        else:
            inserted_count += 1
        if closing_added:
            closing_count += 1

        relpath = path.relative_to(REPO_ROOT).as_posix()
        print(f"{relpath:60s}  {strategy:35s}  closing={closing_added}")

        if not args.dry_run and new_text != original:
            path.write_text(new_text, encoding="utf-8", newline="\n")

    print()
    print(f"Total files     : {len(TARGETS)}")
    print(f"Blocks inserted : {inserted_count}")
    print(f"Already present : {already_count}")
    print(f"Closings added  : {closing_count}")
    if errors:
        print("ERRORS:")
        for e in errors:
            print(f"  {e}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
