# Root Cause Debugging Protocol

> **TL;DR:** Ask "whose responsibility?" first. Trace data lifecycle (creation → transformation → consumption). Fix at the responsible layer. Code is caller-agnostic — no seeding/test references in business logic. Verify async waits match actual counts.

> Apply these principles BEFORE proposing any fix. Fixes without root cause analysis create technical debt.

## 1. Responsibility Attribution (MANDATORY first step)

When code fails, ask: **"Whose responsibility is this?"**

- **Caller fault** (wrong input/data): Fix where data is created — the producer, test, or upstream service
- **Callee fault** (wrong handling): Fix the handler, consumer, or service that processes incorrectly
- **Never patch the symptom site.** If a handler receives null data that should never be null in production, the fix belongs in whoever creates that data — not in the handler.
- **Code is caller-agnostic.** Comments describe business intent, never reference specific callers. Guards are justified by business logic, not caller quirks. Error messages describe what's wrong with the data, not who created it.

## 2. Data Lifecycle Tracing

Follow data from **creation -> transformation -> consumption**:

1. Where was the data created? (command, API, migration)
2. How was it transformed? (event handlers, bus consumers, background jobs)
3. Where did it fail? (the consumption point)

The bug is usually at step 1 or 2, not step 3. Step 3 is where you NOTICE the bug, not where you FIX it.

## 3. Async Wait Verification

When debugging "data not ready" issues in eventual-consistency systems:

- **Wait thresholds**: "At least one" is almost always wrong — verify the expected count matches the actual dependency.
- **Snapshot staleness**: Data loaded once and never refreshed? Async systems need fresh reads after waits.
- **Full chain trace**: Trace every hop (Service A -> bus -> B -> bus -> C). The bottleneck is usually in a hop you didn't check.

## 4. Fix Validation Checklist

- [ ] Root cause identified (not just the symptom)
- [ ] Fix is at the responsible layer (producer vs consumer)
- [ ] No business code references testing/seeding context
- [ ] No defensive guards for impossible production states
- [ ] Async waits use correct thresholds (count, not existence)
- [ ] Changed code works for ALL callers, not just the broken case

---

## Closing Reminders

- **MUST** ask "whose responsibility?" before touching any code
- **MUST** trace data lifecycle (creation → consumption) before proposing a fix
- **MUST** keep business code caller-agnostic — no test/seeder references
- **MUST** verify async waits match actual dependency counts
