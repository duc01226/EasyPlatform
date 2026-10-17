# E2E Quality Protocol

Portable shared gate for executable E2E, browser, and user-flow artifacts. Consumer skills keep their own mutation and execution boundaries; this file owns the common quality contract.

## Quick Summary

**Goal:** Make every applicable E2E/user-flow check prove the intended business journey with stable, isolated, secure, deterministic, inspectable, cleaned-up, and spec-traceable evidence.

**Workflow:** detect an executable surface → read project contract and intent → record the scenario in the project's native format with its invariant and owned outcome → evaluate every applicable gate → capture configured/required run evidence → classify PASS, NOT-APPLICABLE, ENVIRONMENT-BLOCKED, or UNVERIFIED → hand findings to the owning skill.

**Key Rules:**

- Apply this protocol only when executable E2E/browser/user-flow evidence exists; prose that merely mentions E2E is not a trigger.
- Use the project's native test/spec format; Given/When/Then is one option. Every assertion must prove the business/user outcome owned by the system, not runner bookkeeping, setup side effects, or delivery metadata.
- Read project config/reference docs before selecting a runner; never infer a framework, command, selector, credential, or data path.
- Resolve and record locator/action organization from the project E2E config/reference and representative cases. A configured object path is location information, not proof that page objects are required; follow the declared or established pattern. If none is declared, keep one-off locators in the test and extract a small helper/object only when demonstrated reuse gives it a clear owner.
- Resolve the business owner root from `specRoots.business.path`, using the framework config loader's fallback only when the project leaves it unset, and validate the optional `specArtifacts` profile. When valid, follow its identifiers, ownership, carriers, cardinality, and intent/contract/evidence section roles; only when absent, the strict default uses TC cases and §8/Test Specifications. A malformed or unsupported declaration, unknown owner/ID, or missing executor/assertion remains unresolved; never fall back or invent a parallel case registry.
- `NOT-APPLICABLE` means no executable surface; a relevant surface with missing capability is `ENVIRONMENT-BLOCKED`, never a pass.

## Applicability and ownership

Trigger evidence includes changed E2E test/spec files, browser configuration, fixtures, page/component objects, browser helpers, recordings, or source changes that alter an exercised user journey. Exclude generic skill/docs prose that only describes E2E.

| Consumer | Owns | Shared gate use |
| --- | --- | --- |
| `e2e-test` | Selects, writes, or updates tests | Apply before authoring; preserve the native scenario format, invariant, and gate record. |
| `e2e-test --mode=verify` | Report-only inspection and one configured verification invocation | Evaluate every applicable row; never edit source, tests, fixtures, baselines, or user data. |
| `e2e-test --mode=verify --fix-loop` | Full-scope convergence, repair, and fresh reruns | Reapply the gate each round; retain scope, evidence, and cleanup integrity. |
| `experience-review` | Runtime and configured visual acceptance evidence | Apply runtime/visual rows; own required per-capture case records and cross-capture synthesis; route static source findings to the code/UI owner. |
| `changes-review` / `workflow-review-changes` | Conditional diff routing and finding integration | Trigger only from executable-surface evidence; preserve the existing review sequence. |

## Scenario contract

Every behavior-bearing E2E case uses the project's native test/spec organization and makes its actor/starting state, real interface action, and expected system-owned outcome clear. Given/When/Then is one suitable representation, not a shared syntax requirement. The fields below are an evidence checklist for the gate record, not a required test annotation or case-carrier format.

```text
SCENARIO <native preconditions/starting state, real interface action, and owned outcome>
OWNER <configured canonical artifact path or authoritative source-contract owner>
CASE <owner-qualified configured scenario/case ID and optional variant>
INTENT <configured requirement/acceptance ID and protected invariant or source rule>
EVIDENCE <configured specArtifacts.sections.evidence heading and test carrier; strict-default §8/Test Specifications only when specArtifacts is absent>
EXECUTOR(S) <actual test/case carrier(s)> · ASSERTION(S) <actual assertion(s)> · RESULT(S) <exact run result(s) or UNVERIFIED>, honoring configured cardinality
```

The default-profile `TC` label is used only when `specArtifacts` is absent. A malformed or unsupported declared profile blocks without fallback. In every valid profile, a missing/unknown owner or case ID, or a case that cannot be traced to its real test assertion and run result, stays unresolved and must be reported as `UNVERIFIED`; it cannot receive `PASS`.

## Quality gate

Apply one row per scenario and record `PASS`, `NOT-APPLICABLE`, `ENVIRONMENT-BLOCKED`, or `UNVERIFIED` with evidence and owner.

| Gate | Known state / evidence | Exercise | Pass condition |
| --- | --- | --- | --- |
| Business/user-flow intent | Actor, entry state, intent, and applicable states are known | The real journey is exercised | The observable/persisted result and failure/recovery behavior match the governing intent |
| Locator/action ownership | The configured project pattern and representative examples are identified and recorded | Each control is located or used | Stable semantic/data/accessible locators follow the project's owner pattern; scoped test-local locators, helpers, or page/component objects are used as that pattern warrants. Keep final behavior assertions in the test |
| Isolation/fixtures/data | Run identity, fixture scope, and reference/idempotent/additive data policy are known | The case runs alone, repeats, or runs in parallel | Mutable data cannot collide, setup is restart-safe, and no shared state is reset |
| Auth/permissions | Actor identity and project-owned auth path are verified | Authorized and applicable denied paths are exercised | Access matches the contract and no credential/secret value enters code, prompt, or evidence |
| Accessibility/responsive/visual (when relevant) | Accessibility requirements and states/viewports in scope are known; use WCAG 2.2 AA as the web baseline unless an applicable legal or project requirement is stricter, and identify the documented platform standard for non-web interfaces. Resolve `uiStateCapture.mode` only when visual capture is configured or requested | Exercise relevant states through the configured test/inspection path; produce visual captures only when the project evidence contract or task requires visual review, following `uiStateCapture.mode` | Controls remain usable/readable/responsive and meet the selected accessibility baseline. When visual evidence is required, follow `.claude/skills/shared/ui-state-capture-protocol.md`, read each required capture, and report gaps; missing required evidence cannot PASS. |
| Async/wait determinism | Readiness, actionability, postcondition, and relevant error-state signals are named | Each meaningful control action occurs | Use the configured runner's native waits or an evidenced project helper; apply post-action pacing only when the project contract configures it |
| Failure evidence/artifacts | Configured log/console/request listeners and evidence collection are attached before interaction; screenshot/trace capture only when configured or required | The run succeeds or fails | Exact command, counts, exit status, run identity, readable redacted required artifacts, and failure diagnostics are persisted |
| Cleanup | Started processes and current-run ephemeral resources are identified | Evidence capture finishes | Only resources started by this run are torn down; accepted, seeded, reference, additive, and shared data remain intact |
| Owner/case-to-test traceability | The configured canonical owner, requirement/acceptance references, profile, and intended invariant are identified | Each configured case/variant maps to its actual executor(s) under the profile's cardinality | Assertion(s) protect the named intent and exact run evidence is recorded; unknown owners/IDs stay unresolved and coverage gaps reach both the canonical owner and test |

## Verdict and handoff

- `PASS` requires every applicable row, exact runner output, and readable evidence; a passing command alone is insufficient.
- `NOT-APPLICABLE` requires evidence that no executable E2E/user-flow surface exists. `ENVIRONMENT-BLOCKED` names the relevant missing runner, auth, data, service, browser, or evidence capability. `UNVERIFIED` names incomplete inspection.
- Route test-code/fixture/locator findings to `e2e-test` or `e2e-test --mode=verify`; route convergence and owning-layer repairs to `e2e-test --mode=verify --fix-loop`; route runtime and configured visual-evidence findings to `experience-review`; route static UI source findings to `ui-design --mode=review`.

## Required record

Persist: trigger/scope evidence · native scenario/precondition/action/outcome record + invariant · canonical owner path + configured requirement/acceptance and case/variant identities + evidence section · actual executor(s)/assertion(s) and exact run result(s), preserving configured cardinality · config/command/auth/data evidence and visual matrix only when required · one verdict per gate row · exact counts/exit status · required artifact paths/read/redaction status · cleanup result · final verdict, owner, and next step.

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Make every applicable E2E/user-flow check prove the intended business journey with stable, isolated, secure, deterministic, inspectable, cleaned-up, and spec-traceable evidence.

**IMPORTANT MUST ATTENTION** detect the executable surface first, use the project's native scenario format (GWT is one option), name the protected invariant and assert the system-owned outcome, apply every applicable quality row, preserve exact evidence and scope, and route findings to the owning consumer.

**IMPORTANT MUST ATTENTION** use `NOT-APPLICABLE` only for an absent executable surface; use `ENVIRONMENT-BLOCKED` or `UNVERIFIED` for missing capability/evidence; never convert an incomplete check into PASS.
