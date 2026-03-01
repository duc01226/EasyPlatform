# Two-Stage Task-Level Review Protocol

> **Purpose:** Enforce spec compliance BEFORE code quality review at the task level.
> **Applies to:** Any task review within implementation workflows (cook, fix-parallel, code).

## The Rule

Every completed task goes through two review stages **in strict order**:

1. **Stage 1: Spec Compliance** — Does the implementation match the requirements?
2. **Stage 2: Code Quality** — Is the implementation well-built?

<HARD-GATE>
Do NOT start Stage 2 (Code Quality) until Stage 1 (Spec Compliance) passes with zero
FAIL items. No exceptions. Code quality review on wrong implementation wastes effort.
</HARD-GATE>

**Stage 2 is BLOCKED until Stage 1 passes.** No exceptions.

## Why This Order Matters

Code quality review on the wrong implementation wastes effort. A beautifully architected feature that doesn't match the spec is worthless. Catch spec drift first, then polish.

## Stage 1: Spec Compliance Review

**Dispatch:** `spec-compliance-reviewer` agent

**Input to agent:**

```
- What was requested: [full task text from plan]
- What implementer claims: [implementer's report/summary]
- Changed files: [git diff --name-only or file list]
```

**Pass criteria:** All requirements marked PASS. Zero FAIL items.

**On failure:** Fix missing/wrong requirements. Re-run Stage 1. Do NOT proceed to Stage 2.

## Stage 2: Code Quality Review

**Dispatch:** `code-reviewer` agent (only after Stage 1 passes)

**Input to agent:**

```
- Scope: [changed files from Stage 1]
- Context: Spec compliance already verified
```

**Pass criteria:** No critical issues. High/medium issues documented for follow-up.

## When to Apply

- **Always:** After each task in `/cook` or `/fix-parallel` workflows
- **Always:** Before marking a plan phase as complete
- **Optional:** For trivial single-file changes (1-3 lines), spec compliance can be self-verified

## Integration Points

- `cook/SKILL.md` — Code Review section should dispatch spec-compliance-reviewer first
- `fix-parallel/SKILL.md` — Step 5 Code Review should follow this protocol
- `code-reviewer.md` agent — Has Spec Compliance Mode for lightweight inline checks

## Red Flags — STOP

If you're thinking:

- "The code looks clean, skip spec check" — Clean code that doesn't match spec = wrong product
- "I wrote it, I know it's compliant" — Self-assessment is unreliable. External review required.
- "Spec compliance is obvious for this task" — Obvious tasks have hidden misunderstandings
- "Let's do both reviews at once to save time" — Combining reviews dilutes spec focus

## Stage 3: Verification-Before-Completion Gate

<HARD-GATE>
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE

Before marking ANY task as complete, you MUST:

1. **Run** the relevant verification command (test, build, lint)
2. **Read** the actual output (not assume from prior runs)
3. **Cite** specific evidence: "[command] → [output] shows [result]"

FORBIDDEN language in completion claims:

- "Should pass" / "Should work" / "Should be correct"
- "Looks good" / "Appears correct" / "Seems right"
- "I believe" / "I think" / "Probably"
- "Based on my changes" (without running verification)

✅ CORRECT: "Ran `node tests.cjs` → 300/300 passed. All tests pass."
❌ WRONG: "Tests should pass based on my changes."
</HARD-GATE>

## Cross-Reference

- **Related:** `.claude/skills/shared/rationalization-prevention-protocol.md` — Anti-evasion rebuttals
- **Related:** `.claude/skills/shared/red-flag-stop-conditions-protocol.md` — When to abandon approach
