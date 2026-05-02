#!/usr/bin/env python3
"""
sweep-review-contradictions.py
Replace stale review-protocol phrases that contradict the new fix-triggered re-review policy.

NEW POLICY: review → if issues → fix → fresh sub-agent re-review; if no issues → END.
A clean Round 1 ENDS the review. Re-review is triggered by a FIX cycle, not a round count.

Touches only top-level skill .md files (skips sync-inline-versions.md and the shared dir).
"""
import os
import re
import sys
import glob

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Replacements: ordered list of (regex_pattern, replacement, description).
# Use re.MULTILINE. Each is applied independently per file.
REPLACEMENTS = [
    # 1. "execute TWO review rounds. Round 2 delegates ... never skip or combine with Round 1."
    (
        r"\*\*MANDATORY IMPORTANT MUST ATTENTION\*\* execute TWO review rounds\. Round 2 delegates to fresh code-reviewer sub-agent \(zero prior context\) — never skip or combine with Round 1\.",
        "**MANDATORY IMPORTANT MUST ATTENTION** execute the review loop: review → if issues → fix → fresh sub-agent re-review. A round that finds zero issues ENDS the review.",
        "execute TWO review rounds — never skip",
    ),
    (
        r"\*\*MANDATORY MUST ATTENTION\*\* execute TWO review rounds\. Round 2 delegates to fresh code-reviewer sub-agent \(zero prior context\) — never skip or combine with Round 1\.",
        "**MANDATORY MUST ATTENTION** execute the review loop: review → if issues → fix → fresh sub-agent re-review. A round that finds zero issues ENDS the review.",
        "execute TWO review rounds (alt) — never skip",
    ),
    (
        r"\*\*IMPORTANT MUST ATTENTION\*\* execute TWO review rounds\. Round 2 delegates to fresh code-reviewer sub-agent \(zero prior context\)\.",
        "**IMPORTANT MUST ATTENTION** execute the review loop: review → if issues → fix → fresh sub-agent re-review. A round that finds zero issues ENDS the review.",
        "execute TWO review rounds (post-task)",
    ),
    # 2. "execute two review rounds (Round 1: understand, Round 2: catch missed issues)"
    (
        r"\*\*IMPORTANT MUST ATTENTION\*\* execute two review rounds \(Round 1: understand, Round 2: catch missed issues\)",
        "**IMPORTANT MUST ATTENTION** execute the review loop: review → if issues → fix → fresh sub-agent re-review. If a round finds no issues, the review ENDS.",
        "two review rounds (Round 1 understand)",
    ),
    # 3. "NEVER declare PASS after Round 1 alone — always spawn fresh sub-agent for Round 2"
    (
        r"- \*\*NEVER declare PASS after Round 1 alone\*\* — always spawn fresh sub-agent for Round 2",
        "- **A clean Round 1 ENDS the review.** Spawn a fresh sub-agent for Round 2 ONLY after a fix cycle.",
        "NEVER declare PASS after Round 1 alone (always spawn)",
    ),
    # 4. "spawn fresh sub-agent for Round 2 review — NEVER declare PASS after Round 1 alone"
    (
        r"\*\*MANDATORY IMPORTANT MUST ATTENTION\*\* spawn fresh sub-agent for Round 2 review — NEVER declare PASS after Round 1 alone",
        "**MANDATORY IMPORTANT MUST ATTENTION** spawn fresh sub-agent for re-review ONLY after a fix cycle. A clean Round 1 ENDS the review.",
        "spawn fresh sub-agent for Round 2 — NEVER declare PASS",
    ),
    # 5. Plain "NEVER declare PASS after Round 1 alone" reminders
    (
        r"\*\*MANDATORY IMPORTANT MUST ATTENTION\*\* recursive quality loop — NEVER declare PASS after Round 1 alone",
        "**MANDATORY IMPORTANT MUST ATTENTION** recursive quality loop — review → if issues → fix → fresh sub-agent re-review. Clean round ENDS the loop.",
        "recursive quality loop NEVER declare PASS",
    ),
    (
        r"\*\*IMPORTANT MUST ATTENTION\*\* NEVER declare PASS after Round 1 alone — fresh sub-agent Round 2 required",
        "**IMPORTANT MUST ATTENTION** fresh sub-agent re-review required ONLY after a fix cycle. Clean Round 1 ENDS the review.",
        "NEVER declare PASS — fresh Round 2 required",
    ),
    (
        r"\*\*MANDATORY IMPORTANT MUST ATTENTION\*\* NEVER declare PASS after Round 1 alone — fresh sub-agent review is mandatory",
        "**MANDATORY IMPORTANT MUST ATTENTION** fresh sub-agent re-review is mandatory ONLY after a fix cycle. Clean Round 1 ENDS the review.",
        "NEVER declare PASS (review-changes)",
    ),
    (
        r"\*\*MANDATORY IMPORTANT MUST ATTENTION\*\* NEVER declare PASS after Round 1 alone — Round 2 MUST spawn fresh sub-agent with zero prior context",
        "**MANDATORY IMPORTANT MUST ATTENTION** when issues found, Round 2 MUST spawn fresh sub-agent with zero prior context. Clean Round 1 ENDS the review.",
        "NEVER declare PASS — sre-review",
    ),
    (
        r"\*\*MANDATORY MUST ATTENTION\*\* NEVER declare PASS after Round 1 — always spawn fresh sub-agent for Round 2\.",
        "**MANDATORY MUST ATTENTION** when Round 1 finds issues, always spawn fresh sub-agent for Round 2 after fixing. Clean Round 1 ENDS the review.",
        "NEVER declare PASS (domain-entities)",
    ),
    # 6. Inline rule-list "NEVER declare PASS after Round 1 alone — main agent rationalizes own work"
    (
        r"5\. \*\*NEVER declare PASS after Round 1 alone\*\* — main agent rationalizes own work",
        "5. **Clean Round 1 ENDS the review.** When issues are found, fix and spawn a fresh sub-agent for Round 2 — main agent rationalizes own work, fresh eyes catch what was dismissed.",
        "list-item NEVER declare PASS",
    ),
    # 7. "NEVER declare PASS after Round 1 alone." (period; sre-review.md:416 / seed-test-data:228)
    (
        r"NEVER declare PASS after Round 1 alone\. Round 2 MUST spawn a fresh sub-agent with ZERO Round 1 memory — NEVER re-review in the same session\.",
        "When Round 1 finds issues, Round 2 MUST spawn a fresh sub-agent with ZERO Round 1 memory after fixing — NEVER re-review in the same session. A clean Round 1 ENDS the review.",
        "sre-review:416",
    ),
    (
        r"NEVER reuse sub-agent across rounds\. NEVER declare PASS after Round 1 alone\.",
        "NEVER reuse sub-agent across rounds. A clean round ENDS the review; a round with issues triggers fix → fresh sub-agent re-review.",
        "seed-test-data:228",
    ),
    # 8. review-domain-entities.md:18 — embedded in CRITICAL RULES list
    (
        r"\(2\) NEVER declare PASS without fresh sub-agent Round 2\.",
        "(2) When Round 1 finds issues, NEVER declare PASS without fresh sub-agent Round 2 after fixing. Clean Round 1 ENDS the review.",
        "domain-entities CRITICAL RULES (2)",
    ),
    (
        r"^- NEVER declare PASS without fresh sub-agent Round 2$",
        "- Clean Round 1 ENDS the review. When issues are found, NEVER declare PASS without fresh sub-agent Round 2 after fixing.",
        "domain-entities bullet",
    ),
    # 9. review-changes "NEVER declare PASS after Round 1 alone — fresh sub-agent review mandatory (Round 2+)"
    (
        r"> 2\. \*\*NEVER declare PASS after Round 1 alone\*\* — fresh sub-agent review mandatory \(Round 2\+\)",
        "> 2. **Clean Round 1 ENDS the review.** When issues found, fresh sub-agent re-review mandatory after fixing.",
        "review-changes top reminder",
    ),
    # 10. shared/sub-agent-selection-guide.md
    (
        r"^- NEVER declare PASS after Round 1 alone — main agent rationalizes its own work$",
        "- Clean Round 1 ENDS the review. When issues found, fix → fresh sub-agent re-review (main agent rationalizes its own work; fresh eyes catch dismissed findings).",
        "sub-agent-selection-guide",
    ),
    # 11. scan-* "Round 2 fresh-eyes is non-negotiable" reminders
    (
        r"\*\*IMPORTANT MUST ATTENTION\*\* Round 2 fresh-eyes is non-negotiable — NEVER declare PASS after Round 1",
        "**IMPORTANT MUST ATTENTION** if Round 1 finds issues, Round 2 fresh-eyes is non-negotiable after fixing. Clean Round 1 ENDS the scan.",
        "scan Round 2 non-negotiable + NEVER declare",
    ),
    (
        r"\*\*IMPORTANT MUST ATTENTION\*\* Round 2 fresh-eyes is non-negotiable — validates `file:line` and class names",
        "**IMPORTANT MUST ATTENTION** when Round 1 finds issues, Round 2 fresh-eyes after fixing validates `file:line` and class names. Clean Round 1 ENDS the scan.",
        "scan-domain-entities reminder",
    ),
    (
        r"\*\*IMPORTANT MUST ATTENTION\*\* Round 2 fresh-eyes is non-negotiable — validates paths and token values",
        "**IMPORTANT MUST ATTENTION** when Round 1 finds issues, Round 2 fresh-eyes after fixing validates paths and token values. Clean Round 1 ENDS the scan.",
        "scan-design-system reminder",
    ),
    (
        r"\*\*IMPORTANT MUST ATTENTION\*\* Round 2 fresh-eyes is non-negotiable — validates variable names and values",
        "**IMPORTANT MUST ATTENTION** when Round 1 finds issues, Round 2 fresh-eyes after fixing validates variable names and values. Clean Round 1 ENDS the scan.",
        "scan-scss-styling reminder",
    ),
    (
        r"\*\*IMPORTANT MUST ATTENTION\*\* Round 2 fresh-eyes is non-negotiable — validates ports and paths",
        "**IMPORTANT MUST ATTENTION** when Round 1 finds issues, Round 2 fresh-eyes after fixing validates ports and paths. Clean Round 1 ENDS the scan.",
        "scan-project-structure reminder",
    ),
    (
        r"\*\*IMPORTANT MUST ATTENTION\*\* two review rounds — Round 2 fresh sub-agent catches what main agent missed",
        "**IMPORTANT MUST ATTENTION** when Round 1 finds issues, Round 2 fresh sub-agent after fixing catches what main agent missed. Clean Round 1 ENDS the scan.",
        "scan-code-review-rules reminder",
    ),
    # 12. "Round 1 was clean, skip Round 2" anti-pattern row → reverse the message
    (
        r"\| \"Round 1 was clean, skip Round 2\" \| Every fix triggers fresh sub-agent round\. No exceptions\.\s+\|",
        '| "Skip Round 2 even after fixing" | Every fix triggers fresh sub-agent round. Clean Round 1 (zero issues) does end the review — but ANY fix invalidates the prior verdict. |',
        "code-simplifier rationalization row",
    ),
    # 13. scan-* "Round 2 verification not needed" rows — same reversal
    (
        r'\| "Round 2 verification not needed for small scan"\s+\| Main agent rationalizes own mistakes\. Fresh-eyes mandatory\.\s+\|',
        '| "Skip Round 2 even when Round 1 found issues" | Clean Round 1 (zero issues) does end the scan. But when issues exist, fresh-eyes is mandatory after fixing — main agent rationalizes own mistakes. |',
        "scan rationalization row (small scan, design-system)",
    ),
    (
        r'\| "Round 2 verification not needed for small doc set" \| Fresh-eyes mandatory — main agent\'s counts carry confirmation bias \|',
        '| "Skip Round 2 even when Round 1 found issues" | Clean Round 1 ends the scan. When issues exist, fresh-eyes mandatory after fixing — main agent\'s counts carry confirmation bias. |',
        "scan-docs-index row",
    ),
    (
        r'\| "Round 2 verification not needed for structural scan" \| Port numbers and paths are the most hallucination-prone data\. Fresh-eyes mandatory\. \|',
        '| "Skip Round 2 even when Round 1 found issues" | Clean Round 1 ends the scan. When issues exist, fresh-eyes mandatory after fixing — port numbers and paths are the most hallucination-prone data. |',
        "scan-project-structure row",
    ),
    (
        r'\| "Round 2 not needed for small scan"\s+\| Main agent rationalizes own entity discoveries\. Fresh-eyes mandatory\.\s+\|',
        '| "Skip Round 2 even when Round 1 found issues" | Clean Round 1 ends the scan. When issues exist, fresh-eyes mandatory after fixing — main agent rationalizes own entity discoveries. |',
        "scan-domain-entities row",
    ),
    (
        r'\| "Round 2 not needed for styling docs"\s+\| Main agent rationalizes fabricated variable values\. Fresh-eyes mandatory\.\s+\|',
        '| "Skip Round 2 even when Round 1 found issues" | Clean Round 1 ends the scan. When issues exist, fresh-eyes mandatory after fixing — main agent rationalizes fabricated variable values. |',
        "scan-scss-styling row",
    ),
    (
        r'\| "Round 2 not needed for test docs"\s+\| Main agent rationalizes own fabricated examples\. Fresh-eyes mandatory\.\s+\|',
        '| "Skip Round 2 even when Round 1 found issues" | Clean Round 1 ends the scan. When issues exist, fresh-eyes mandatory after fixing — main agent rationalizes own fabricated examples. |',
        "scan-integration-tests row",
    ),
    (
        r'\| "Round 2 not needed for frontend scan"\s+\| Main agent rationalizes own fabricated examples\. Fresh-eyes mandatory\.\s+\|',
        '| "Skip Round 2 even when Round 1 found issues" | Clean Round 1 ends the scan. When issues exist, fresh-eyes mandatory after fixing — main agent rationalizes own fabricated examples. |',
        "scan-frontend-patterns row",
    ),
    (
        r'\| "Round 2 not needed for documentation scan" \| Main agent rationalizes own section extractions\. Fresh-eyes mandatory\.\s+\|',
        '| "Skip Round 2 even when Round 1 found issues" | Clean Round 1 ends the scan. When issues exist, fresh-eyes mandatory after fixing — main agent rationalizes own section extractions. |',
        "scan-feature-docs row",
    ),
    (
        r'\| "Examples look right, skip Round 2"\s+\| NEVER declare PASS after Round 1\. Main agent rationalizes fabricated examples\. \|',
        '| "Skip Round 2 even when Round 1 found issues" | Clean Round 1 ends the scan. When issues exist, fresh-eyes mandatory after fixing — main agent rationalizes fabricated examples. |',
        "scan-e2e-tests row",
    ),
]


def find_target_files():
    patterns = [
        os.path.join(PROJECT_DIR, ".claude", "skills", "*", "SKILL.md"),
        os.path.join(PROJECT_DIR, ".claude", "skills", "*", "skill.md"),
        os.path.join(PROJECT_DIR, ".claude", "skills", "shared", "sub-agent-selection-guide.md"),
        os.path.join(PROJECT_DIR, ".claude", "agents", "*.md"),
    ]
    files = []
    for p in patterns:
        files.extend(sorted(glob.glob(p)))
    # Skip canonical
    canonical = os.path.join(PROJECT_DIR, ".claude", "skills", "shared", "sync-inline-versions.md")
    files = [f for f in files if os.path.abspath(f) != os.path.abspath(canonical)]
    return files


def apply_replacements(content):
    """Return (new_content, list of (description, count) for changes applied)."""
    changes = []
    for pattern, replacement, desc in REPLACEMENTS:
        new_content, n = re.subn(pattern, replacement, content, flags=re.MULTILINE)
        if n > 0:
            changes.append((desc, n))
            content = new_content
    return content, changes


def main(argv):
    dry_run = "--dry-run" in argv
    files = find_target_files()
    print(f"Sweeping {len(files)} files (dry-run={dry_run})")

    total_files_changed = 0
    total_replacements = 0
    by_pattern = {}

    for path in files:
        with open(path, "r", encoding="utf-8") as f:
            original = f.read()
        new_content, changes = apply_replacements(original)
        if not changes:
            continue
        total_files_changed += 1
        rel = os.path.relpath(path, PROJECT_DIR)
        print(f"  {rel}")
        for desc, n in changes:
            print(f"    [{n}] {desc}")
            total_replacements += n
            by_pattern[desc] = by_pattern.get(desc, 0) + n
        if not dry_run:
            with open(path, "w", encoding="utf-8") as f:
                f.write(new_content)

    print(f"\nFiles changed: {total_files_changed}")
    print(f"Replacements: {total_replacements}")
    print("\nBy pattern:")
    for desc, n in sorted(by_pattern.items(), key=lambda x: -x[1]):
        print(f"  [{n}] {desc}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
