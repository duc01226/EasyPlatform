# Lessons

<!-- This file is referenced by Claude skills and agents for project-specific context. -->
<!-- Auto-injected into EVERY prompt and EVERY file edit via lessons-injector.cjs hook. -->
<!-- Written via /learn skill. Budget: 3000 chars max. Format: - [YYYY-MM-DD] <lesson> -->

## Purpose

Incident-based lessons learned by AI across sessions. Each entry records a real mistake to prevent recurrence. Injected on every prompt so AI never repeats known errors.

**How lessons are used:**

- Hook `lessons-injector.cjs` reads this file and injects content into every AI prompt
- `/learn <text>` appends new lessons; `/learn trim` enforces the 3000-char budget
- System-level lessons (context compaction, dependency tracing) live separately in `prompt-injections.cjs`

**Categories:** Architecture decisions, pattern misuse, missed reuse, wrong assumptions, hallucinated APIs, over-engineering, test gaps, doc staleness.

## Project Lessons

<!-- Add lessons below in format: - [YYYY-MM-DD] <lesson text> -->
<!-- One lesson per line. Keep each under 250 chars. -->

---

## Closing Reminders

- **Verify before acting on old lessons** -- check if the lesson still applies to current code (APIs change, patterns evolve)
- **Confirm lesson targets exist** -- grep for referenced classes/methods before applying a lesson; the code may have been refactored
- **Lessons are injected every prompt** -- keep entries concise; verbose lessons waste token budget across all interactions
- **Distinguish project-specific vs universal** -- project-specific patterns belong in `backend-patterns-reference.md` or `code-review-rules.md`, not here
