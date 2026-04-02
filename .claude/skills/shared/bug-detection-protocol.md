# Bug Detection Protocol

> **TL;DR — Systematically hunt for potential bugs in changed code. Don't trust that code "looks correct" — verify each category. Most production bugs come from null access, boundary errors, missing error handling, and concurrency issues.**

> **MANDATORY** for: `/review-changes`, `/code-review`, `/review-post-task`
> **When to read:** During any code review evaluating changed code
> **Key principle:** For each changed function, check ALL categories below. A bug missed in review costs 10x more than one caught here.

---

<HARD-GATE>
DO NOT skip bug detection because "the code is simple" or "it's just a refactor."
Simple code has null pointer bugs. Refactors break implicit contracts.
You MUST check at least categories 1-4 for EVERY review.
</HARD-GATE>

## Bug Detection Categories (check ALL for changed code)

### 1. Null / Undefined Safety (MOST COMMON BUG SOURCE)

- [ ] **Parameters:** Can any function parameter be null/undefined? Is it guarded at entry?
- [ ] **Return values:** Can called functions return null? Is the caller handling null returns?
- [ ] **Object access chains:** `a.b.c.d` — can any intermediate be null? Use optional chaining or guard checks
- [ ] **Collection operations:** `.find()`, `.first()`, `.single()` — can return null. Is it checked before use?
- [ ] **Async results:** Can promise/task resolve to null? Is the null case handled?

### 2. Boundary Conditions (SECOND MOST COMMON)

- [ ] **Off-by-one:** `<` vs `<=`, `>` vs `>=` — is the boundary inclusive or exclusive per the requirement?
- [ ] **Empty collections:** What happens when array/list is empty? `.length === 0`, empty `.forEach()`, `.reduce()` on empty
- [ ] **Zero values:** Does `0` pass truthiness checks? (`if (count)` is false when count is 0)
- [ ] **Negative values:** Can quantities, indices, or amounts go negative? Is it prevented?
- [ ] **Max values:** Integer overflow, string length limits, array size limits — are they bounded?
- [ ] **Empty strings:** `""` passes type checks but may be functionally invalid

### 3. Error Handling & Propagation

- [ ] **Try-catch scope:** Is the try block too broad (catching unrelated errors) or too narrow (missing throwable calls)?
- [ ] **Silent failures:** Are errors caught and swallowed without logging or re-throwing?
- [ ] **Error types:** Is the catch clause handling the right error type? Generic `catch(e)` may hide bugs
- [ ] **Cleanup on error:** In try-catch-finally — are resources cleaned up in the finally block?
- [ ] **Error messages:** Do thrown errors include enough context for debugging? (user ID, operation, input)
- [ ] **Validation errors vs system errors:** Are user input errors returned as 400, not 500?

### 4. Resource Management

- [ ] **Connections/streams:** Database connections, file handles, HTTP connections — are they closed/disposed?
- [ ] **Subscriptions:** RxJS subscriptions, event listeners, WebSocket connections — unsubscribed on destroy?
- [ ] **Timers:** `setInterval`/`setTimeout` — cleared on component/service destruction?
- [ ] **Memory:** Large objects stored in closures, growing arrays without bounds, event listener accumulation

### 5. Concurrency & Async

- [ ] **Missing await:** Async function called without `await` — fire-and-forget intentional or bug?
- [ ] **Race conditions:** Two async operations modifying same state — is there a lock or serialization?
- [ ] **Stale closures:** Async callbacks capturing variables that change before callback executes
- [ ] **Parallel mutations:** `Promise.all()` with operations that modify shared state
- [ ] **Retry storms:** Error → retry → error → retry — is there exponential backoff and max retries?

### 6. Data Type & Conversion Issues

- [ ] **Implicit coercion:** `==` instead of `===`, string concatenation with numbers, truthy/falsy surprises
- [ ] **Date/timezone:** Are dates compared in the same timezone? UTC vs local confusion?
- [ ] **Floating point:** Money calculations using float? (use integer cents or Decimal)
- [ ] **Enum safety:** Switch on enum — is there a default case for unknown values?
- [ ] **JSON serialization:** Are circular references possible? Are Dates serialized correctly?

### 7. Stack-Specific Patterns

**JavaScript/TypeScript:**

- [ ] `===` vs `==`, `!==` vs `!=`
- [ ] `Array.includes()` with NaN
- [ ] `typeof null === 'object'`
- [ ] Mutable default parameters in functions

**C# / .NET:**

- [ ] `async void` (should be `async Task` — exceptions are unobservable)
- [ ] Missing `.ConfigureAwait(false)` in library code
- [ ] `IDisposable` not disposed (use `using` statement)
- [ ] LINQ deferred execution — `.ToList()` missing before multiple enumeration

**General:**

- [ ] N+1 queries (loop with DB call inside — batch instead)
- [ ] Missing database indexes for WHERE clauses
- [ ] SQL injection via string concatenation

## Severity Classification

| Severity     | Criteria                                       | Action                         |
| ------------ | ---------------------------------------------- | ------------------------------ |
| **CRITICAL** | Will crash or corrupt data in production       | FAIL — must fix before merge   |
| **HIGH**     | Will cause incorrect behavior under normal use | FAIL — should fix before merge |
| **MEDIUM**   | Will fail under edge cases or high load        | WARN — fix recommended         |
| **LOW**      | Defensive improvement, unlikely to trigger     | INFO — nice to have            |

## Skip Conditions

- **Documentation-only changes:** Skip entirely
- **Config/env changes:** Only check sections 3 (error handling) and 4 (resource mgmt)
- **Test file changes:** Only check that test assertions are correct (not production bug checks)

---

## Closing Reminders

- **MUST** check categories 1-4 (null safety, boundaries, error handling, resources) for EVERY review
- **MUST** classify each finding by severity (CRITICAL/HIGH/MEDIUM/LOW)
- **MUST NOT** skip bug detection because "the code is simple" — simple code has null pointer bugs
- **MUST** check stack-specific patterns (section 7) when reviewing JS/TS or C#/.NET code
- **MUST** verify async code for missing awaits and race conditions (section 5)

> **REMINDER — Bug Detection Protocol:** Check null safety, boundary conditions, error handling, and resource management for EVERY changed function. Most production bugs are null access, off-by-one, silent error swallowing, and resource leaks. Don't trust "looks correct" — verify systematically.
