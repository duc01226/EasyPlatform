# Review caller ownership

Read when a workflow delegates review duties or a review receives `--loop-owner=caller`, `--defer` or `--tests=defer`.

- `--review-only` and `--report-only` return a validated one-pass report with no source edits. An explicit review-only request overrides the workflow's fix-loop default.
- `--fix-loop --loop-owner=caller` opts a child into the caller's review/fix/re-review cycle. The child reviews and validates its assigned pass read-only; the caller waits for all reports, fixes once, and requests fresh passes. It is never permission for parallel source mutation or a nested loop. The child's validation is the evidence bar applied inside that pass; the separate terminal `$why-review --validate-findings` call runs once, on the caller's merged report.
- Default workflow review calls use that caller-owned mode. Standalone `--fix-loop` owns its authorized fixes; standalone review otherwise defaults to review-only.
- When the caller is `workflow-review-changes`, all children share its default maximum of two coordinator-owned rounds. A child's generic three-round guidance does not grant another workflow round; hand remaining blockers to the coordinator at the workflow cap and wait for an explicit bounded extension decision.
- `--defer=whole-target,specialists,tests,entities,simplify` may assign named duties to a caller. Use only applicable names; record each duty's owner and completion evidence. Deferral never skips a gate. General review retains correctness and inline risk checks while specialists add depth.
- `--tests=prove` runs required test proof for standalone review; `--tests=defer` retains static quality/coverage review and names the parent's later execution step. Remove `--prove-tests` in deferred integration review and propagate the setting through every round.
- Terminal `--validate-findings` validates the supplied report once; it ignores fix-loop and never mutates source.

Preserve complete target coverage, required rules and report findings. At exhausted rounds, children hand unresolved issues to the main session, which asks whether to extend by a stated bounded number of rounds or stop.

## Duty ownership

| Deferred duty | Caller must own |
| --- | --- |
| `whole-target` / `specialists` | Complete rationale and every applicable domain review, reconciled with general coverage. |
| `tests` | Final execution evidence through the configured verification step; static coverage review still runs. |
| `entities` | Conditional domain-reference refresh after settled repairs. |
| `review` from `code-simplifier --defer=review` | A full fresh `$why-review` of the settled target after simplification. |
| none from `code-simplifier --report-only` (the review lens) | Nothing is deferred: the lens only reports; the coordinator's fix step applies validated simplifications and the fresh re-review of the settled target covers them. |

If a caller skips or merges the owning step, omit its deferral so the duty stays with the skill. Keep exact changed paths in the returned report.
