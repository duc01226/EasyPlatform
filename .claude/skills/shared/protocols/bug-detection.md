> **Bug Detection** — MUST ATTENTION check categories 1-4 for EVERY review. Never skip.
>
> 1. **Null Safety:** Can params/returns be null? Are they guarded? Optional chaining gaps? `.find()` returns checked?
> 2. **Boundary Conditions:** Off-by-one (`<` vs `<=`)? Empty collections handled? Zero/negative values? Max limits?
> 3. **Error Handling:** Try-catch scope correct? Silent swallowed exceptions? Error types specific? Cleanup in finally?
> 4. **Resource Management:** Connections/streams closed? Subscriptions unsubscribed on destroy? Timers cleared? Memory bounded?
> 5. **Concurrency (if async):** Missing `await`? Race conditions on shared state? Stale closures? Retry storms?
> 6. **Stack-Specific:** Check the configured language/runtime pitfalls and framework-specific failure modes discovered from local code.
>
> **Admit a finding only with a reachable trigger path** (the caller, input or state that reaches the defect) and a consequence; an unreachable concern is an observation, and unsettled reachability is `NOT VERIFIABLE` only when the concern would be MEDIUM or higher (`SYNC:severity-rubric`).
>
> **Classify every finding by consequence, not by fix effort; `SYNC:severity-rubric` is authoritative and this is only a quick reminder:**
> - **CRITICAL → block immediately:** an immediate material security/authorization or safety bypass, secret/PII exposure, destructive action, data loss/corruption, or silent failure on a critical path. A failed binary gate is a separate hard blocker (represented as synthetic CRITICAL by the executable policy), not an ordinary tier judgment.
> - **HIGH → must fix before PASS/merge:** wrong behavior on a supported path, violated business/data invariant, meaningful privacy/authority gap, breaking contract/compatibility change, likely material harm, or missing proof for a behavior-changing fix.
> - **MEDIUM → clear before the current round can pass:** a bounded but consequential edge case, resilience/observability/testability/maintainability gap, credible future defect, or local architectural drift with real impact but no immediate material loss. If the fix needs an owner/product decision, stop and escalate with an explicit follow-up and residual-risk record; that record is not a clean-pass waiver.
> - **LOW → record/defer from round 2 onward:** wording/formatting, minor documentation or convention drift, optional defensive cleanup, or cosmetic refinement with no credible present correctness, security, privacy, authority, availability, or data-integrity impact.
> Assign the highest tier supported by evidence. An observation is not a finding until it names the affected asset/user/data/contract, consequence, evidence, and tier. Effort, annoyance, implementation cost, and proximity to the round cap are never severity inputs. `NOT VERIFIABLE` is an evidence state, not a tier; if the unresolved claim could affect a required behavior or binary gate, keep it blocking until proved or explicitly owner-accepted with residual risk. Failed tests, parity, required artifacts, and security-must-fix checks are binary gates and block independently of severity. For the full decision tree, boundary examples, score mappings, and domain-vocabulary normalization, follow `SYNC:severity-rubric`.
