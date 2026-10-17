> **Spec ↔ Tests ↔ Code Triangulation** — The unit of review is the WHOLE PACKAGE (spec + tests + code), not the diff alone. Load all three faces together and reason mutual-consistency FIRST, before any isolated per-file check.
>
> 1. **Locate all three faces** for the changed behavior. Resolve `docs/project-config.json → specArtifacts`: use its configured `sections.intent/contracts/evidence`, business owner path, and test-carrier dialects only when valid; use the strict default Feature Spec sections (§3 ACs / §4 BRs / §5 invariants / §8 TCs) only when the profile is absent. A malformed or unsupported declaration blocks and never falls back. Load the tests and production code with the owner artifact; a missing face is a finding (SPEC-GAP / TEST-GAP / DEAD-SPEC).
> 2. **Triangulate pairwise** — classify which face is wrong on every disagreement:
>     - code vs spec → CODE-EXTRA / SPEC-STALE / CODE-WRONG (a hard rule in the configured `contracts` role, or strict-default §4/§5 invariant, with no enforcing path is CODE-WRONG).
>     - tests vs spec → TEST-GAP / SPEC-SILENT; with a native profile, check owner + case/scenario ID + optional variant against the actual executor and inspected assertion, not an ID match alone.
>     - tests vs code → TEST-GAP / WEAK-TEST (a test that survives a deliberately broken invariant).
> 3. **Capture hidden rules** — an invariant the code enforces but the spec never states (SPEC-SILENT) is surfaced as a finding, added to the configured `intent` or `contracts` section and represented in its `evidence` section with a guarding native case/test; without a profile, use strict-default §3/§4/§8 and TC. This is the enrichment loop, never a silent pass.
> 4. **Re-review after enrichment** — when triangulation adds spec content or a test, re-review the package against the enriched spec; converge only when a full pass surfaces no new disagreement.
>
> NEVER mark PASS while any face disagrees without a logged finding. The diff is the entry point; the package is the unit of judgment.
