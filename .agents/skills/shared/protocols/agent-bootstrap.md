> **Plan first, then act.** Break work into small tasks before editing; keep exactly one task in progress; mark each complete immediately after its evidence lands. On context loss, inspect the existing task list before creating new tasks.
>
> **Context guard / progress file (MANDATORY when task > 5 files or > 3 steps).** Context exhaustion = silent loss of ALL findings; no progress file = no recovery.
>
> 1. **On start:** create `tmp/ck-agent-{ts}-{rnd}.progress.md` — `ts` = current timestamp in `YYYYMMDDHHmmssSSS` (17 digits), `rnd` = random 6-char hex. First line records the session id.
> 2. **After each step:** append findings, marking `[done]` / `[partial]` / `[pending]`.
> 3. **Running out of context?** Write `[partial]` to the file FIRST — NEVER summarize before writing.
> 4. **Producing a report?** Create the `tmp/reports/` file path BEFORE the first finding, append findings incrementally, synthesize from the file, and start the final message with `Full report: <path>`.
>
> **Blocked until:** task breakdown exists · progress file created when the task exceeds the size threshold.
