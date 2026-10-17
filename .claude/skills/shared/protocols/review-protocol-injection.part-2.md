```
### Behavioral Delta Matrix
MANDATORY for any bugfix review. Produce input-state × pre-fix × post-fix × delta table BEFORE writing verdict.
- Minimum 3 rows; include at least one row OUTSIDE the original bug report.
- Any "REGRESSION" delta → review returns FAIL until a preservation test is added.
- Narrative descriptions do NOT substitute for the matrix.
Example rows (external-record sync fix):
| Input                 | Pre-fix | Post-fix                  | Delta      |
| --------------------- | ------- | ------------------------- | ---------- |
| Record exists (valid) | Reused  | Always recreated → orphan | REGRESSION |
| Record missing (404)  | Error   | Recreated                 | Fixed      |

### Fix-Layer Accountability
Trace execution/data flow; fix the violated contract's owner, never assume the crash site.
MANDATORY before ANY fix:
1. Trace actual origin, transformations, boundaries, failure; invent no absent layers.
2. Identify invalid-state/behavior contract owner from architecture/code evidence.
3. Fix authoritative owner; retain untrusted-boundary validation. Justify multi-file fixes by owned contracts, not file-count thresholds.
4. Inspect relevant existing bypass entries: constructors/adapters/parsers/caches/persistence.
BLOCKED until: The affected path is traced; the owner is supported by file:line evidence; relevant consumers and bypass paths are checked; and the correction point fits the project's architecture.
Anti-patterns (REJECT): assuming the symptom site is the owner; scattering workarounds without tracing the contract; assuming the lowest technical layer is always authoritative; removing validation from a real trust boundary to force a single correction point.

### Rationalization Prevention
AI skips steps via these evasions. Recognize and reject:
- "Too simple for a plan" → Simple + wrong assumptions = wasted time. Plan anyway.
- "I'll test after" → RED before GREEN. Write/verify test first.
- "Already searched" → Show grep evidence with file:line. No proof = no search.
- "Just do it" → Still need TaskCreate. Skip depth, never skip tracking.
- "Just a small fix" → Small fix in wrong location cascades. Verify file:line first.
- "Code is self-explanatory" → Future readers need evidence trail. Document anyway.
- "Combine steps to save time" → Combined steps dilute focus. Each step has distinct purpose.

### Graph-Assisted Investigation (optional advice)
Optional: for high-risk blast radius (shared contract/many callers/cross-module/cross-service/public API), .code-graph/graph.db suggests callers/dependents/impacted tests. Treat it as a hint, NOT proof: stale/incomplete graphs lag uncommitted edits/unindexed paths. Verify important results by files/grep; skip low-risk/local changes. An absent or stale graph is never a finding.
Pattern: grep/read → optional graph suggestions → grep/read verification.
- High-risk investigation: trace --direction both on 2-3 entry files
- Fix/debug with wide reach: callers_of on buggy function + tests_for
- Feature touching a shared contract: connections on files to be modified
- Review of a high-risk change: tests_for on changed functions
- Blast radius: trace --direction downstream
CLI: python .claude/scripts/code_graph {command} --json. Use --node-mode file first (10-30x less noise), then --node-mode function for detail.

### Understand Code First
HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
1. Search 3+ similar patterns (grep/glob) — cite file:line evidence.
2. Read existing files in target area — understand structure, base classes, conventions.
3. Optional high-risk hints: python .claude/scripts/code_graph trace <file> --direction both --json if .code-graph/graph.db exists; verify stale-capable caller/dependent hints by files.
4. Map dependents by grep/read callers; optional graph connections/callers_of adds hints.
5. Write investigation to tmp/analysis/ for non-trivial tasks (3+ files).
6. Re-read analysis file before implementing — never work from memory alone.
7. NEVER invent new patterns when existing ones work — match exactly or document deviation.
BLOCKED until: Read target files; Grep 3+ patterns; Assumptions verified with evidence. (The code graph is optional advice, never a gate.)

## Reference Docs (READ before reviewing)
Read only lane-resolved docs; do not re-resolve the whole set.
- `code-review-rules.md`, inside the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path)
- {lane-specific docs the orchestrator resolved — e.g., the pattern doc for the files under review, integration-test-reference.md for a test lane, the governing spec for a spec-compliance lane}

## Target Files
{explicit file list OR "run git diff to see uncommitted changes" OR "read all files under {plan-dir}"}

## Output
Write a structured report to tmp/reports/{review-type}-round{N}-{date}.md with sections:
- Status: PASS | FAIL
- Issue Count: {number}
- Critical Issues (with file:line evidence)
- High Priority Issues (with file:line evidence)
- Medium / Low Issues
- Cross-cutting findings

Return the report path and status to the main agent.
Every finding MUST have file:line evidence. Speculation is forbidden.
`
})
```

### Rules

- DO copy the template wholesale — including all 11 embedded protocol sections
- DO replace only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific content
- DO choose `code-reviewer` subagent_type for code reviews and `general-purpose` for plan / doc / artifact reviews
- DO NOT paraphrase, summarize, or skip any protocol section
- DO NOT pass file contents inline — the sub-agent reads via its own tool calls so it has a fresh context
- DO NOT reference protocols by file path or tag name — the bodies are already embedded above
- DO NOT introduce placeholder markers for the protocols — they must stay literally expanded
