---
name: commit-review
description: '[Code Quality] Review an exact pending commit when the commit skill selects lightweight review or the user requests it. --fix-loop repairs and re-reviews; no Git publication authority.'
metadata:
  instruction-profile: concise
---

1. Resolve the intended commit and its purpose; load applicable project review rules and overlays. In `--fix-loop`, read [references/fix-loop.md](references/fix-loop.md) and snapshot the exact candidate before review; preserve unrelated work.
2. Inspect every changed file and affected callers for correctness, regressions, security and unnecessary complexity. Trace changed behavior through success, failure and boundary cases; check permissions and affected callers where relevant. Check changed behavior against its configured canonical owner/spec, profile-declared scenario/case and executing test evidence; read further references only for an actual concern. For changed behavior, identify a realistic bug the test should catch; use a targeted mutation probe only when test strength is unclear and edits are authorized.
3. Validate concerns inline against source and counterevidence. Findings need a reachable trigger, consequence, file:line, severity and ≥85% confidence; omit speculative advice, unrelated debt and issues already caught by checks. Missing required evidence blocks a pass.
4. Default to read-only. With `--fix-loop`, fix validated issues within scope and freshly review the whole updated candidate, at most two rounds; `--loop-owner=caller` stays read-only. Stop with unresolved MEDIUM+ or failed checks; defer nonblocking LOWs. Never extend the budget silently.
5. Report findings, fixes, checks, rounds and deferred LOWs briefly. Issue a receipt only after a fully covered fresh fix-loop pass and passing required checks, using its original snapshot. Never stage, commit or push from this review; do not load another review workflow routinely.
