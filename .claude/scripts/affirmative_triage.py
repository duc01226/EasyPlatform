#!/usr/bin/env python3
"""
affirmative_triage.py — scanner + heuristic classifier for the affirmative-directive
(#10) + rationale (#11) skill-enhancement pass.

Scans in-scope `.claude` skill/shared markdown, extracts every prohibition occurrence
with context, flags each as sync-managed vs local (matched open/close tag pairs — NOT
find_sync_region_start), pre-buckets A/B + missing-why, emits a normalized guardrail
fingerprint per row, and writes an auditable worksheet.

The script REDUCES volume and locates work; it does NOT replace human/subagent judgment.

Usage:
    py .claude/scripts/affirmative_triage.py --stats
    py .claude/scripts/affirmative_triage.py --scope all --out plans/<dir>/reports/triage-worksheet.md --stats
    py .claude/scripts/affirmative_triage.py --scope skills --fingerprints-out plans/<dir>/reports/fingerprints-pre.json
    py .claude/scripts/affirmative_triage.py --self-test fix code-review changes-review

Enumerates files via `git ls-files` (the Windows FS is case-insensitive; `find`/`ls`
conflate SKILL.md / skill.md — git ls-files preserves true case so the 2 lowercase
`skill.md` are counted).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from win_compat import ensure_utf8_stdout  # noqa: E402

ensure_utf8_stdout()

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SHARED_DIR = os.path.join(".claude", "skills", "shared")
SYNC_SOURCE_REL = os.path.join(SHARED_DIR, "sync-inline-versions.md").replace("\\", "/")

# Files excluded from triage: meta-docs whose prohibition text is INTENTIONAL
# (the rubric ships BAD-example "Don't X" pairs that must never be rewritten).
EXCLUDE_BASENAMES = {"affirmative-rewrite-rubric.md"}

# ---------------------------------------------------------------------------
# Lexicon — case-INSENSITIVE stems. CORE stems are reconciled against an
# independent `rg -i` count (Phase 2); SUPPLEMENTARY stems are tallied but not
# part of the +-5% reconciliation gate (they are noisier / lower-signal).
# ---------------------------------------------------------------------------
CORE_LEXEMES = {
    # `\s*` (not `\s?`) so multi-space "do  not" still matches alongside "do not"/"don't".
    "do-not": re.compile(r"do\s*n['’o]t", re.IGNORECASE),  # do not / do  not / don't / Do NOT / DON'T
    "never": re.compile(r"\bnever\b", re.IGNORECASE),
    "avoid": re.compile(r"\bavoid\b", re.IGNORECASE),
    # add the contraction so "mustn't" is not a blind spot ("must not" keeps `\s+` multi-space).
    "must-not": re.compile(r"\bmust\s+not\b|\bmustn['’]t\b", re.IGNORECASE),  # must not / must  not / mustn't
    # `can\s*not` folds the two-word "can not" (and multi-space) into the cannot family.
    "cannot": re.compile(r"\bcan\s*not\b", re.IGNORECASE),  # cannot / can not / can  not
}
SUPP_LEXEMES = {
    "refrain-from": re.compile(r"\brefrain\s+from\b", re.IGNORECASE),
    "no-Cap": re.compile(r"\bno\s+[A-Z]"),  # "no Foo" — capitalized object; supplementary only
}
ALL_LEXEMES = {**CORE_LEXEMES, **SUPP_LEXEMES}

# Uppercase guardrail tokens → class A unconditionally (the machine rule, R8).
# `\s+` (not a literal space) so multi-space/tab variants ("MUST   ATTENTION")
# still bucket class A — a literal space silently misbuckets them as soft prose.
UPPER_GUARDRAIL_RE = re.compile(
    r"\b(NEVER|MUST\s+ATTENTION|MUST\s+NOT|ALWAYS|MANDATORY|BLOCKING|HARD-GATE)\b"
)
# Density lexemes counted (all casings) for the post>=pre invariant (Phase 10).
# Same `\s+` tolerance so the density gate cannot be evaded by whitespace.
GUARDRAIL_FAMILIES = ("MUST ATTENTION", "NEVER", "ALWAYS", "MANDATORY", "BLOCKING")
DENSITY_RE = re.compile(
    "(" + "|".join(f.replace(" ", r"\s+") for f in GUARDRAIL_FAMILIES) + ")",
    re.IGNORECASE,
)
FAMILY_RES = {f: re.compile(f.replace(" ", r"\s+"), re.IGNORECASE) for f in GUARDRAIL_FAMILIES}
# A rule "has a why" when it carries an explicit rationale clause.
WHY_RE = re.compile(r"(—\s*why\s*:|--\s*why\s*:|\bbecause\b|\bso that\b)", re.IGNORECASE)

INLINE_CODE_RE = re.compile(r"`[^`]*`")
FENCE_RE = re.compile(r"^\s*(```|~~~)")
SYNC_OPEN_RE = re.compile(r"^\s*<!--\s*SYNC:([^>/]+?)\s*-->\s*$")
SYNC_CLOSE_RE = re.compile(r"^\s*<!--\s*/SYNC:([^>]+?)\s*-->\s*$")
PE_OPEN_RE = re.compile(r"^\s*<!--\s*(PROMPT-ENHANCE:[A-Z0-9-]+):START\s*-->\s*$")
PE_CLOSE_RE = re.compile(r"^\s*<!--\s*(PROMPT-ENHANCE:[A-Z0-9-]+):END\s*-->\s*$")
SECTION_SYNC_RE = re.compile(r"^##\s+SYNC:(\S+)\s*$")


# ---------------------------------------------------------------------------
# File enumeration (git ls-files — preserves true case)
# ---------------------------------------------------------------------------
def git_ls_files(*subpaths):
    out = subprocess.run(
        ["git", "ls-files", "-z", *subpaths],
        cwd=PROJECT_DIR, capture_output=True, text=True, check=True,
    ).stdout
    return [p for p in out.split("\0") if p]


def in_scope_files(scope):
    skill_files, shared_files = [], []
    for p in git_ls_files(".claude/skills"):
        base = os.path.basename(p)
        if base in EXCLUDE_BASENAMES:
            continue
        if p.replace("\\", "/").startswith(SHARED_DIR.replace("\\", "/") + "/") and p.endswith(".md"):
            shared_files.append(p)
        elif base in ("SKILL.md", "skill.md"):
            skill_files.append(p)
    skill_files.sort()
    shared_files.sort()
    if scope == "sync-source":
        return [f for f in shared_files if f.replace("\\", "/") == SYNC_SOURCE_REL]
    if scope == "shared":
        return shared_files
    if scope == "skills":
        return skill_files
    return skill_files + shared_files  # all


# ---------------------------------------------------------------------------
# Region detection — matched open/close pairs (ports sync-update-blocks.py:56-77,
# generalized to all SYNC tags incl. :reminder, plus PROMPT-ENHANCE anchor pairs).
# A line is managed iff strictly inside a matched pair. NOT find_sync_region_start.
# ---------------------------------------------------------------------------
def detect_regions(lines, is_sync_source):
    """Return dict: line_no(1-based) -> sync_tag for managed lines.

    For the canonical source file, lines under a `## SYNC:tag` header map to
    `source:tag` (those lines ARE the edit target for Phase 3)."""
    managed = {}
    if is_sync_source:
        cur = None
        for i, line in enumerate(lines, start=1):
            m = SECTION_SYNC_RE.match(line)
            if m:
                cur = m.group(1)
                continue
            if cur:
                managed[i] = "source:" + cur
        return managed

    open_at = {}  # key -> open_line
    spans = []    # (start, end, tag)
    for i, line in enumerate(lines, start=1):
        m = SYNC_OPEN_RE.match(line)
        if m:
            open_at[("SYNC", m.group(1))] = i
            continue
        m = SYNC_CLOSE_RE.match(line)
        if m:
            key = ("SYNC", m.group(1))
            if key in open_at:
                spans.append((open_at.pop(key), i, "SYNC:" + m.group(1)))
            continue
        m = PE_OPEN_RE.match(line)
        if m:
            open_at[("PE", m.group(1))] = i
            continue
        m = PE_CLOSE_RE.match(line)
        if m:
            key = ("PE", m.group(1))
            if key in open_at:
                spans.append((open_at.pop(key), i, m.group(1)))
            continue
    for start, end, tag in spans:
        for n in range(start + 1, end):
            managed.setdefault(n, tag)
    return managed


# ---------------------------------------------------------------------------
# Per-line scanning
# ---------------------------------------------------------------------------
def code_spans(line):
    return [(m.start(), m.end()) for m in INLINE_CODE_RE.finditer(line)]


def in_code(pos, spans):
    return any(s <= pos < e for s, e in spans)


def fingerprint(lexeme_text, line, match_start):
    tail = line[match_start:]
    toks = re.findall(r"[A-Za-z0-9]+", tail.lower())[:8]
    norm = " ".join(toks) if toks else lexeme_text.lower()
    return hashlib.sha1(norm.encode("utf-8")).hexdigest()[:12]


def batch_for(rel_path, sync_tag):
    if sync_tag.startswith("source:"):
        return "sync"
    if sync_tag.endswith(":reminder") or sync_tag.startswith("PROMPT-ENHANCE:"):
        return "hook"
    if sync_tag.startswith("SYNC:"):
        return "sync-propagated"  # a propagated copy — verified in Phase 10, not edited locally
    name = os.path.basename(os.path.dirname(rel_path)).lower()
    if name.startswith("workflow"):
        return "workflow"
    if any(k in name for k in ("review", "qa", "spec", "tdd", "acceptance", "prove", "verify", "sweep", "test")):
        return "review"
    if any(k in name for k in ("scan", "graph", "skill-", "sync", "codex", "infra", "devops", "docker", "k8s", "gcloud", "cloudflare", "mcp", "git")):
        return "scan"
    if any(k in name for k in ("backend", "frontend", "code", "cook", "plan", "fix", "debug", "refactor", "migration", "database", "implement", "arch")):
        return "core"
    return "product"  # catch-all (Phase 9)


def scan_file(rel_path):
    abspath = os.path.join(PROJECT_DIR, rel_path)
    try:
        with open(abspath, "r", encoding="utf-8") as f:
            text = f.read()
    except (OSError, UnicodeDecodeError):
        return []
    lines = text.split("\n")
    is_sync_source = rel_path.replace("\\", "/") == SYNC_SOURCE_REL
    managed = detect_regions(lines, is_sync_source)

    rows = []
    in_fence = False
    in_frontmatter = False
    for i, line in enumerate(lines, start=1):
        if i == 1 and line.strip() == "---":
            in_frontmatter = True
            continue
        if in_frontmatter:
            if line.strip() == "---":
                in_frontmatter = False
            continue
        if FENCE_RE.match(line):
            in_fence = not in_fence
            continue
        if in_fence:
            continue

        spans = code_spans(line)
        for lexeme, rx in ALL_LEXEMES.items():
            for m in rx.finditer(line):
                if in_code(m.start(), spans):
                    continue
                sync_tag = managed.get(i, "")
                sync_managed = "y" if sync_tag else "n"
                has_upper = bool(UPPER_GUARDRAIL_RE.search(line))
                # supplementary lexemes never trigger an A guardrail on their own
                if has_upper:
                    prebucket = "A"
                else:
                    prebucket = "B"
                missing_why = "n" if WHY_RE.search(line) else "y"
                rows.append({
                    "file": rel_path.replace("\\", "/"),
                    "line": i,
                    "raw_text": line.strip(),
                    "lexeme": lexeme,
                    "core": lexeme in CORE_LEXEMES,
                    "sync_managed": sync_managed,
                    "sync_tag": sync_tag,
                    "guardrail_fingerprint": fingerprint(lexeme, line, m.start()),
                    "prebucket": prebucket,
                    "missing_why": missing_why,
                    "batch": batch_for(rel_path, sync_tag),
                    "class_A_reason": "",
                    "rewrite_justification": "",
                    "suggested_rewrite": "",
                    "disposition": "",
                })
                break  # one row per lexeme-family per line (avoid double count of overlapping casings)
    return rows


def scan_scope(scope):
    rows = []
    for rel in in_scope_files(scope):
        rows.extend(scan_file(rel))
    for idx, r in enumerate(rows, start=1):
        r["id"] = f"AF-{idx:04d}"
    return rows


# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------
def md_escape(s):
    return s.replace("|", "\\|").replace("\n", " ")


WORKSHEET_COLS = [
    "id", "file", "line", "lexeme", "sync_managed", "sync_tag", "guardrail_fingerprint",
    "prebucket", "missing_why", "batch", "class_A_reason", "rewrite_justification",
    "suggested_rewrite", "disposition", "raw_text",
]


def write_worksheet(rows, out_path):
    by_batch = {}
    for r in rows:
        by_batch.setdefault(r["batch"], []).append(r)
    lines = ["# Triage Worksheet — Affirmative-Directive (#10) + Rationale (#11)", ""]
    lines.append(f"Total occurrences: **{len(rows)}** across "
                 f"**{len({r['file'] for r in rows})}** files. "
                 "Generated by `affirmative_triage.py`. Disposition columns start blank — "
                 "fill `disposition` (`kept-A`/`rewritten`/`why-added`/`no-change`); "
                 "`class_A_reason` required for `kept-A`, `rewrite_justification` required for `rewritten`.")
    lines.append("")
    for batch in sorted(by_batch):
        brows = by_batch[batch]
        lines.append(f"## Batch: {batch} ({len(brows)} rows)")
        lines.append("")
        lines.append("| " + " | ".join(WORKSHEET_COLS) + " |")
        lines.append("| " + " | ".join(["---"] * len(WORKSHEET_COLS)) + " |")
        for r in sorted(brows, key=lambda x: (x["file"], x["line"])):
            cells = [md_escape(str(r.get(c, ""))) for c in WORKSHEET_COLS]
            lines.append("| " + " | ".join(cells) + " |")
        lines.append("")
    os.makedirs(os.path.dirname(os.path.join(PROJECT_DIR, out_path)), exist_ok=True)
    with open(os.path.join(PROJECT_DIR, out_path), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"Worksheet written: {out_path} ({len(rows)} rows)")


def write_fingerprints(rows, out_path):
    dump = {}
    for r in rows:
        dump.setdefault(r["file"], []).append({
            "line": r["line"], "fp": r["guardrail_fingerprint"],
            "lexeme": r["lexeme"], "prebucket": r["prebucket"],
        })
    os.makedirs(os.path.dirname(os.path.join(PROJECT_DIR, out_path)), exist_ok=True)
    with open(os.path.join(PROJECT_DIR, out_path), "w", encoding="utf-8") as f:
        json.dump(dump, f, indent=1, ensure_ascii=False)
    print(f"Fingerprints written: {out_path} ({len(dump)} files)")


def print_stats(rows):
    files = {r["file"] for r in rows}
    print(f"\n=== TRIAGE STATS ===")
    print(f"files scanned (with >=1 hit): {len(files)}")
    print(f"total occurrences:           {len(rows)}")
    print("\nby lexeme:")
    by_lex = {}
    for r in rows:
        by_lex[r["lexeme"]] = by_lex.get(r["lexeme"], 0) + 1
    for lex in sorted(by_lex, key=lambda k: -by_lex[k]):
        tag = "CORE" if lex in CORE_LEXEMES else "supp"
        print(f"  {lex:14} {by_lex[lex]:5}  [{tag}]")
    print("\nby prebucket:")
    for b in ("A", "B"):
        n = sum(1 for r in rows if r["prebucket"] == b)
        print(f"  {b}: {n}")
    print(f"  C (missing-why, any bucket): {sum(1 for r in rows if r['missing_why'] == 'y')}")
    print("\nby batch:")
    by_batch = {}
    for r in rows:
        by_batch[r["batch"]] = by_batch.get(r["batch"], 0) + 1
    for b in sorted(by_batch, key=lambda k: -by_batch[k]):
        print(f"  {b:16} {by_batch[b]:5}")
    print("\nsync_managed:")
    for v in ("y", "n"):
        print(f"  {v}: {sum(1 for r in rows if r['sync_managed'] == v)}")
    # Explicit Do NOT / avoid tallies (the historical case-sensitive blind spot)
    donot = sum(1 for r in rows if r["lexeme"] == "do-not")
    avoid = sum(1 for r in rows if r["lexeme"] == "avoid")
    print(f"\nblind-spot tallies:  do-not={donot}  avoid={avoid}  (both must be > 0)")


def run_self_test(skill_names):
    """Behavior assertions (line-drift-robust) on the trap files."""
    failures = []
    for name in skill_names:
        rel = f".claude/skills/{name}/SKILL.md"
        rows = scan_file(rel)
        if name == "fix":
            # (a) Do NOT captured, with local vs sync-managed split
            donot = [r for r in rows if r["lexeme"] == "do-not"]
            if not donot:
                failures.append("fix: no Do NOT rows captured")
            local_donot = [r for r in donot if r["sync_managed"] == "n"]
            sync_donot = [r for r in donot if r["sync_managed"] == "y"]
            if not local_donot:
                failures.append("fix: expected >=1 LOCAL 'Do NOT' (Debug Mindset / Next Steps)")
            if not sync_donot:
                failures.append("fix: expected >=1 SYNC-managed 'Do NOT' (understand-code-first)")
            # (b) R5 trap: two "crash site" NEVER lines exist — the in-SYNC one
            # (SYNC:fix-layer-accountability) must be sync_managed=y, and the LATER
            # local `## Closing Reminders` one must be sync_managed=n. The bug R5
            # guards against is the local Closing-Reminders line being mislabeled y.
            cr = sorted([r for r in rows if "crash site" in r["raw_text"].lower()
                         and r["lexeme"] == "never"], key=lambda r: r["line"])
            if not cr:
                failures.append("fix: did not find any crash-site NEVER line")
            else:
                closing = cr[-1]  # highest line = the local Closing-Reminders occurrence
                if closing["sync_managed"] != "n":
                    failures.append(
                        f"fix: R5 FAIL — local Closing-Reminders NEVER (line {closing['line']}) "
                        f"mislabeled sync_managed={closing['sync_managed']}")
                if len(cr) >= 2 and cr[0]["sync_managed"] != "y":
                    failures.append(
                        f"fix: in-SYNC NEVER (line {cr[0]['line']}) should be sync_managed=y")
            # (c) a line inside a :reminder pair is sync_managed=y
            rem = [r for r in rows if r["sync_tag"].endswith(":reminder")]
            if not rem:
                failures.append("fix: expected >=1 row inside a :reminder pair (sync_managed=y)")
            # (d) lowercase 'never' captured as a guardrail-token row
            low = [r for r in rows if r["lexeme"] == "never"]
            if not low:
                failures.append("fix: lowercase 'never' not captured")
        print(f"  {name}: {len(rows)} rows "
              f"(A={sum(1 for r in rows if r['prebucket']=='A')}, "
              f"B={sum(1 for r in rows if r['prebucket']=='B')}, "
              f"sync_y={sum(1 for r in rows if r['sync_managed']=='y')})")
    if failures:
        print("\nSELF-TEST FAILURES:")
        for f in failures:
            print(f"  [FAIL] {f}")
        return 1
    print("\nSELF-TEST PASS — all trap assertions hold.")
    return 0


def git_show_head(rel_path):
    """Return the HEAD blob text for rel_path, or None if absent in HEAD."""
    r = subprocess.run(
        ["git", "show", f"HEAD:{rel_path}"],
        cwd=PROJECT_DIR, capture_output=True, text=True, encoding="utf-8",
    )
    return r.stdout if r.returncode == 0 else None


def density_counts(text):
    """(total guardrail lexemes, {family: count}) across ALL casings."""
    per_family = {f: len(rx.findall(text)) for f, rx in FAMILY_RES.items()}
    return len(DENSITY_RE.findall(text)), per_family


def run_density_check(scope):
    """Enforce the rubric's HARD density invariant (affirmative-rewrite-rubric.md
    'Density-preservation invariant'): per file, the working-tree guardrail-lexeme
    count MUST be >= its HEAD count. Fail-loud (exit 1) on any drop so the rewrite
    pass cannot silently relax a guardrail. New files (no HEAD baseline) always pass.
    Per-guardrail fingerprint stability is covered separately by --fingerprints-out."""
    files = in_scope_files(scope)
    violations = []
    print(f"=== DENSITY CHECK (scope='{scope}', {len(files)} files) — working tree vs HEAD ===")
    for rel in files:
        try:
            with open(os.path.join(PROJECT_DIR, rel), encoding="utf-8") as fh:
                work_text = fh.read()
        except OSError:
            continue  # deleted in working tree — nothing to enforce
        base_text = git_show_head(rel)
        if base_text is None:
            continue  # new file — no pre-edit baseline, any density passes
        base_total, base_fam = density_counts(base_text)
        work_total, work_fam = density_counts(work_text)
        if work_total < base_total:
            dropped = {f: (base_fam[f], work_fam[f]) for f in GUARDRAIL_FAMILIES
                       if work_fam[f] < base_fam[f]}
            violations.append((rel, base_total, work_total, dropped))
    if violations:
        print(f"\n[FAIL] {len(violations)} file(s) dropped guardrail density (post < pre):")
        for rel, b, w, dropped in violations:
            fam_str = ", ".join(f"{f} {pre}->{post}" for f, (pre, post) in dropped.items())
            print(f"  {rel}: total {b}->{w}   [{fam_str}]")
        return 1
    print("\n[PASS] No file dropped guardrail-lexeme density below its HEAD baseline.")
    return 0


def main(argv):
    ap = argparse.ArgumentParser(description="Affirmative-directive triage classifier.")
    ap.add_argument("--scope", choices=["sync-source", "skills", "shared", "all"], default="all")
    ap.add_argument("--out", help="write worksheet MD to this repo-relative path")
    ap.add_argument("--fingerprints-out", help="write per-file guardrail fingerprint JSON")
    ap.add_argument("--stats", action="store_true", help="print per-bucket stats")
    ap.add_argument("--density-check", action="store_true",
                    help="enforce HARD density invariant: per-file guardrail lexeme count must be >= HEAD")
    ap.add_argument("--self-test", nargs="*", metavar="SKILL", help="run trap-file behavior assertions")
    args = ap.parse_args(argv[1:])

    if args.density_check:
        return run_density_check(args.scope)

    if args.self_test is not None:
        names = args.self_test or ["fix", "code-review", "changes-review"]
        print(f"=== SELF-TEST on {names} ===")
        return run_self_test(names)

    rows = scan_scope(args.scope)
    print(f"Scope='{args.scope}': {len(rows)} occurrences across "
          f"{len({r['file'] for r in rows})} files.")
    if args.out:
        write_worksheet(rows, args.out)
    if args.fingerprints_out:
        write_fingerprints(rows, args.fingerprints_out)
    if args.stats or (not args.out and not args.fingerprints_out):
        print_stats(rows)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
