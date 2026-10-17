# why-review — Code-Change Review Path

> Read in full by `/why-review` full mode (BLOCKING) when `references/full-mode.md` → **Route References** names it. `validate-findings` mode never reads this file. It adds route-only steps; every `references/full-mode.md` gate still applies.

## Code-Change Review Path

When target is code changes:

1. Resolve the diff source:
    - Commit SHA: use `git show --name-status` and diff against its first parent.
    - Merge commit: default to first-parent diff unless the user specifies another parent/range.
    - Branch/range: use the user-supplied range.
    - Uncommitted changes: use `git diff` plus staged diff if relevant.
2. **Comprehend change context + trace full pipeline across BOTH boundaries (MANDATORY for code-change targets; N/A for pure plan/task/doc targets).** Before deep file judging, write a one-line Change Context (what · intent · originating tier · main affected flow), then apply BOTH full protocols named by the router guides (read absent applicable text first): `SYNC:cross-stack-impact-trace` for the client↔server tier seam (BE→FE forward, FE→BE backward) and `SYNC:cross-service-check` for the microservice / event / external / loosely-coupled boundary. Classify each seam/touchpoint NONE / ADDITIVE / BREAKING; a BREAKING seam whose other-side consumer is un-updated in the same diff is a HIGH-min finding. State `Single-tier / monolith — N/A` when no cross-boundary seam exists.
3. Read the changed files and any nearby tests/docs required to prove behavior.
4. **Integration-test detection (CONDITIONAL).** If the target contains integration/E2E test files, OR changes behavior-bearing code that has covering integration tests, run the **Integration-Test-Review Linkage** below before judging the `Test/spec/doc sync` dimension. State `No integration tests in target — linkage N/A` when neither holds.
5. Read project reference docs based on changed file types before judging patterns.
6. Optional: for a high-risk change and when `.code-graph/graph.db` exists, graph blast-radius or trace can hint at impacted files — a stale-able hint; verify by reading.
7. Apply embedded code-review protocols by serial focused pass: bug detection, design patterns quality, logic/intention, test/spec verification, optional graph hint, Easy-to-Change.
8. Output findings first, with `file:line` evidence, severity, confidence, and tests/docs gaps.

## Integration-Test-Review Linkage (CONDITIONAL — advisory, guarded)

> **Purpose:** this skill's `Test/spec/doc sync` dimension asks *"does evidence prove tests/specs/docs protect the intended invariant?"* — but the 8 gates answering it (assertion value · data state · repeatability · domain logic · spec traceability · three-way sync · change coverage · scenario fidelity) belong to `/integration-test --mode=review`. Route to that owner; NEVER re-derive a weaker copy here. — why: a rationale review judging test quality by eye endorses assertions it never mutation-tested.

**Recursion guard — SKIP entirely when ANY row holds.** Record the deferral line, then proceed; NEVER invoke or read:

| Suppressing context | Evidence | Deferral line to record |
| --- | --- | --- |
| Mode is `validate-findings` | Terminal mode — no sub-skill calls at all | `Linkage N/A — validate-findings is terminal.` |
| Invoked by `/integration-test --mode=review` finding validation | `integration-test/references/mode-review.md` → "Finding Validation and Verdict" calls this skill in `validate-findings` mode, and that section's terminal rule guards the reverse edge | `Linkage deferred — invoked by /integration-test --mode=review finding validation.` |
| Invoked by `changes-review` in ANY phase — its whole-target rationale pass (run by itself or by the caller that `--defer=whole-target` names) or its findings validation — or inside `/workflow-review-changes` | `changes-review/SKILL.md` → "Review concerns" runs `/integration-test --mode=review` itself when integration tests are in the target or guard changed behavior (a named parent may own that gate; deferral never waives it), and "Validation, fixes and re-review" calls this skill with `--validate-findings`; inside `/workflow-review-changes` its `/integration-test --mode=review --prove-tests` gate step owns the gate | `Linkage deferred to changes-review → Review concerns (integration-test review) / parent workflow step.` |
| Invoked by `/investigate --mode=debug`'s Root Cause Validation gate | `investigate/references/mode-debug.md` → "Root Cause Validation (`/why-review` Gate)"; inside `integration-test --mode=verify --fix-loop` that gate fires in a round already running `/integration-test --mode=review` (`integration-test/references/fix-loop.md` → Fix-Loop Key Rules, FL-0b nested gates, FL-1 step 5) | `Linkage deferred — investigate --mode=debug gate; the verify loop owns the audit.` |

> — why: unguarded, this edge closes a cycle (`why-review` → `integration-test --mode=review` → finding validation → `why-review`) and re-creates the duplicate-ownership defect that `integration-test --mode=verify --fix-loop` removes (`integration-test/references/fix-loop.md` → "Why this mode exists").

**Mode A — READ the protocol (DEFAULT).** Read `.claude/skills/integration-test/references/mode-review.md` §"Single Review Pass — Eight Gates"; apply Gates 1-8 as review lenses over target tests. Cheap — no recursion, no sub-skill call. Findings enter this review's normal finding set with `file:line` evidence + severity.

**Mode B — DELEGATE to `/integration-test --mode=review` (ESCALATION).** Invoke ONLY when ALL hold: no guard row fired · standalone full-mode review · target diff itself contains integration test files. Its GAP / SPEC-GAP verdicts become ordinary findings for this review's Findings Validation Gate.

**Advisory, NEVER blocking** — matches this skill's `Enforcement: Advisory` scope; mandatory coverage lives in `changes-review` → "Review concerns" (`/integration-test --mode=review`). — why: without this linkage a standalone rationale review silently skips test quality.
