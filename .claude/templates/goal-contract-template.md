# Goal Contract

> External, durable record of the user goal. Resolution order: active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create this file from the current user request.
> NEVER store secrets, tokens, credentials, or private customer data here — reference evidence locations and redact sensitive values.

## Original Request

{Verbatim or faithfully condensed user request. Redact any secrets.}

## Purpose

{Why the user wants this — the outcome that makes the work worthwhile, independent of implementation details.}

## Success Criteria

> Mark each criterion `(required)` or `(optional)`. The loop closes only when every required criterion passes.

- [ ] {Criterion 1} (required)
- [ ] {Criterion 2} (required)
- [ ] {Criterion 3} (optional)

## Constraints

- {Scope, technology, file-location, or process constraints that bound the work.}
- {Explicit exclusions — what must NOT change.}

## Evidence Required

- {File evidence — `file:line` references for changed artifacts.}
- {Command evidence — verification/test commands whose output proves criteria.}
- {Review evidence — report paths from review gates.}

## Iteration Log

### Iteration 1

Result: {What was executed and what it produced.}

Evidence:

- {`file:line`, command summary, or report path.}

Gaps:

- {Validated remaining gaps mapped to success criteria, or "none".}

Next action: {Fix the validated gap / re-review affected criteria / escalate blocker.}

## Goal Satisfaction

> Updated by review gates. Overall status is PASS only when every required criterion is PASS.
> Escalate after two consecutive iterations with no criterion progressing, or any blocker needing user input.

| Success Criterion | Evidence                     | Status            |
| ----------------- | ---------------------------- | ----------------- |
| {Criterion 1}     | {file:line, command, report} | PASS/FAIL/BLOCKED |

**Overall:** {PASS / FAIL / BLOCKED — reason and escalation note when not PASS}
