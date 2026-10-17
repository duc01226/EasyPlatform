Read in full FIRST for positional `verify`. This is the positional branch of the integration-test skill; entrypoint-wide case-profile, authority and execution contracts remain in force.

# VERIFY-TRACEABILITY Mode — Test ↔ Spec ↔ Feature Doc Verification

Mode = VERIFY: bidirectional traceability check between test code, test specs, feature docs.

> **Relationship to Mandatory "no missing integration tests" task (Mandatory Task Ordering, step 3).** That task already runs SAME bidirectional logic, feature-area-scoped, EVERY run (workflow / git-changes-present / user-request) — not only when user explicitly types `verify`. This standalone VERIFY mode exists for on-demand, potentially broader (multi-feature-doc or whole-service) traceability sweep user invokes by name — not a separate, narrower obligation. Both apply same run → audit once, satisfy both.

## Verify Workflow

1. **Collect test methods** — Grep for test-spec annotations across all test projects/suites (integration **and** unit)
2. **Collect doc TCs** — Read feature doc Section 8 for all TC entries
3. **Build 3-way matrix** — Test code ↔ specs/ ↔ feature doc Section 8
4. **Identify mismatches** — Orphans, stale references, behavior drift
5. **Classify mismatches** — Which source is correct?
6. **Report** — Traceability matrix + recommended fixes

## Mismatch Classification

| Scenario                                          | Likely Correct Source                 | Action                                                                 |
| ------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------- |
| Test passes, spec describes different behavior    | Adjudication required                 | Compare against canonical product/spec intent before changing anything |
| Test fails, spec describes expected behavior      | Spec, unless spec intent is disproved | Update test to match intended spec behavior                            |
| Test exists, no spec                              | Adjudication required                 | Create spec from test only after confirming the test protects intent   |
| Spec exists, no test                              | Spec                                  | Generate test from spec                                                |
| Test and spec agree, but code behaves differently | Spec, unless both are stale           | Fix code or update spec+test after intent adjudication                 |

**Rule:** Passing code or tests NEVER automatically outrank canonical product/spec intent. NEVER update spec, test, or code on a behavior-changing mismatch until it reaches adjudication-required status with explicit evidence. — why: a green test can encode a regression, so code agreement alone cannot ratify a spec change.

## Verification Requirements

MUST ATTENTION verify ALL of the following:

- Every test method has matching TC in feature doc Section 8
- Every TC in Section 8 has matching test method (or marked `Status: Untested`)
- TC descriptions in docs match what test actually validates
- Evidence file paths in TCs point to current (not stale) code locations
- Business `TestSpec` annotations match TC IDs (no typos, no orphaned IDs); technical-only tests use `TechnicalSpec` and do not create §8 obligations
- Priority levels in docs match test categorization
- The business spec root dashboard (default `docs/specs/`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) is in sync with feature doc Section 8

## Verify Report Format

```markdown
# Traceability Report — {Service}

## Summary

- TCs in feature docs: {N}
- Test methods with TC annotations: {N}
- Fully traced (both directions): {N}
- Orphaned tests (no matching TC): {N}
- Orphaned TCs (no matching test): {N}
- Mismatched behavior: {N}

## Traceability Matrix

| TC ID     | Feature Doc? | Test Code? | Dashboard? | Status       |
| --------- | ------------ | ---------- | ---------- | ------------ |
| TC-OM-001 | ✅           | ✅         | ✅         | Traced       |
| TC-OM-005 | ✅           | ❌         | ✅         | Missing test |
| TC-OM-010 | ❌           | ✅         | ❌         | Missing spec |

## Orphaned Tests (no matching TC in docs)

| Test File | Method   | Annotation | Action                   |
| --------- | -------- | ---------- | ------------------------ |
| {file}    | {method} | TC-OM-010  | Create TC in feature doc |

## Orphaned TCs (no matching test)

| TC ID     | Doc Location | Priority | Action                              |
| --------- | ------------ | -------- | ----------------------------------- |
| TC-OM-005 | Section 8    | P0       | Generate test via /integration-test |

## Behavior Mismatches

| TC ID | Doc Says | Test Does | Correct Source | Action |
| ----- | -------- | --------- | -------------- | ------ |

## Recommendations

1. {Prioritized actions}
```

---
