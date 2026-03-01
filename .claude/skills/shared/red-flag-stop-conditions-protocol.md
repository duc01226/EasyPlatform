# Red Flag / STOP Conditions Protocol

**Version:** 1.0.0 | **Last Updated:** 2026-03-10

When any of these conditions occur, **STOP the current approach** and reassess. Pushing forward despite red flags wastes effort and compounds problems.

---

## Universal Red Flags (Apply to ALL Skills)

| Red Flag                                               | What It Means                  | Action                                                      |
| ------------------------------------------------------ | ------------------------------ | ----------------------------------------------------------- |
| Using "should work", "probably fixed", "seems correct" | No fresh verification evidence | STOP — run verification command, read output, cite evidence |
| Expressing satisfaction before verification            | Premature completion claim     | STOP — verify THEN claim success                            |
| 3+ fix attempts on same issue                          | Root cause not identified      | STOP — abandon current approach, investigate root cause     |
| Each fix reveals a NEW problem in different place      | Upstream root cause            | STOP — trace dependency chain, fix at source                |
| Fix requires modifying 5+ files for a "simple" change  | Wrong abstraction layer        | STOP — reassess which layer owns the logic                  |
| Test passes but behavior differs from expectation      | Testing the wrong thing        | STOP — verify test asserts the actual requirement           |
| Trusting agent/tool success without reading output     | Blind trust                    | STOP — read actual output, verify claims independently      |

## Debugging-Specific Red Flags

| Red Flag                                   | Action                                                                     |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| "One more fix attempt" (already tried 2+)  | STOP — you're guessing, not investigating. Go back to root cause analysis. |
| Same error message after fix               | The fix didn't address the root cause. Re-investigate.                     |
| Fix works locally but concept is uncertain | Accidental fix. Understand WHY it works before claiming success.           |
| Error disappears without explanation       | Masked, not fixed. The error WILL return. Find what changed.               |

## Implementation-Specific Red Flags

| Red Flag                                              | Action                                                                  |
| ----------------------------------------------------- | ----------------------------------------------------------------------- |
| Copy-pasting code instead of reusing existing pattern | STOP — search for existing abstraction. DRY.                            |
| Creating new file when similar file exists            | STOP — extend existing file unless architecture demands separation.     |
| Implementing without reading existing code first      | STOP — read understand-code-first-protocol.                             |
| Plan says X but implementation does Y                 | STOP — either update plan or align implementation. No silent deviation. |

## How to Use

When a red flag is detected:

1. **STOP** — Do not continue current approach
2. **Report** — Tell the user: "Red flag detected: [condition]. Current approach may be wrong."
3. **Evidence** — Show what triggered the red flag (error output, file count, attempt count)
4. **Reassess** — Propose alternative approach or request architectural guidance
5. **Resume** — Only after user confirms new direction

<HARD-GATE>
After 3 failed fix attempts on the same issue, you MUST:
1. Report all 3 attempts and their outcomes
2. State "Root cause not identified — architectural reassessment needed"
3. Ask user for guidance before attempting fix #4
No exceptions. Attempt #4 without reassessment is FORBIDDEN.
</HARD-GATE>

---

## Cross-Reference

- **Consumed by:** `/debug`, `/fix`, `/cook`, `/cook-fast`, `/cook-auto`, `/cook-auto-fast`, `/cook-auto-parallel`, `/cook-parallel`, `/integration-test`, `/fix-parallel`
- **Related:** `.claude/skills/shared/rationalization-prevention-protocol.md` (step-skipping prevention)
- **Related:** `.claude/skills/shared/two-stage-task-review-protocol.md` (review red flags)
- **Related:** `.claude/skills/shared/evidence-based-reasoning-protocol.md` (evidence requirements)
