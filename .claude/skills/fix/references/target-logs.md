# fix — `--target=logs` — log / stack-trace branch

> Read by `/fix --target=logs` FIRST, before any other step of the branch (the router `SKILL.md` → **Target Routing**). The Debug Mindset, Confidence & Evidence Gate, Root-Cause Prerequisite Gate and the `SYNC:*` protocol bodies this branch cites live in `SKILL.md`.

## `--target=logs` — log / stack-trace branch

**Goal:** Analyze application logs to diagnose and fix runtime errors or unexpected behavior.

**Key Rules:**

- Focus on log patterns: stack traces, error codes, timing anomalies.
- Cross-reference logs with source code to find the actual root cause.

**Workflow:**

1. Check whether `./logs.txt` exists. If missing, capture one diagnostic invocation externally without rewriting the project script/config. Preserve stdout, stderr and the producer exit status. **Bash:** in a Bash subprocess run `set -o pipefail; <command> 2>&1 | tee logs.txt; producer_status=${PIPESTATUS[0]}; exit "$producer_status"` (capture immediately after the pipeline). **PowerShell native command:** invoke `& <executable> <args> *> logs.txt`, save `$producerStatus = $LASTEXITCODE` immediately, display the file if needed, and `exit $producerStatus`; PowerShell cmdlet/script failures require their documented error/exit contract rather than assuming `$LASTEXITCODE`. A successful logging sink never proves the producer succeeded. Record command and producer status with the log. Persistent logging changes require an actual product requirement and a status-preserving stack-native wrapper, separately verified; do not add them merely for diagnostics.
2. Use the `debugger` subagent to analyze `./logs.txt`: read with `Grep` `head_limit: 30` (last 30 lines; increase if needed — avoid loading the whole file). Write analysis to `tmp/analysis/{issue-name}.analysis.md`; re-read before fixing.
3. Use the `/investigate` skill to locate the exact source of the issue; report back.
4. Use the `planner` subagent to create an implementation plan; report back.
5. **🛑 Present root cause + fix plan → `ask user question tool` → wait for approval.**
6. Implement the fix.
7. Use the `tester` subagent to verify; report back.
8. Use the `code-reviewer` subagent to review the changes; report back.
9. If tests fail, repeat from step 3.
10. Report a summary; suggest next steps.

The Debug Mindset, Confidence & Evidence Gate, and all SYNC gates below apply to this branch unchanged.
