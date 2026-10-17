# `/work-item --mode=review` — `--type=spec-tests` checklist and output template

Loaded by `references/mode-review.md` when the resolved type is `spec-tests`, including an untyped review of a Feature Spec (see [Spec body](#spec-body-1-7--required-when-in-scope)). Scoring, verdict rule, M1-M7 gate and the validated-fix loop stay in `references/mode-review.md`; the M1-M7 criteria live in `.claude/skills/shared/m1-m7-gates.md`.

## Checklist — Test Spec Review

> **[BLOCKING] MUST ATTENTION resolve the case profile before applying this rubric.** Read `docs/project-config.json`, the required project-reference docs, and `.claude/skills/shared/sdd-artifact-contract.md`. If the config or required references declare a native case contract, use its canonical owner, logical IDs, section/field roles, evidence carriers, and cardinality. Use `shared/tc-format.md` and the TC/Section 8 rules below only when no native case contract is declared. Invalid, incomplete, unreadable, or contradictory profile evidence is `BLOCKED`/`UNKNOWN`; do not fall back to the TC default or claim coverage.
> **[BLOCKING] Read** `spec-principles.md` under the configured reference-docs root for local prose/evidence rules. Under the strict default, also use `shared/tc-format.md` for TC fields, priorities, and coverage. Under a native profile, apply the same semantic checks through its declared case and evidence fields; do not require a duplicate Section 8 registry or default-only field.
> **[BLOCKING] Tech-agnostic check:** flag framework/product/language/design-pattern names in behavioral prose as findings (per the selected profile's prose policy). Source paths, class names, and test identifiers are valid only inside declared evidence carriers; the strict default uses `**Evidence**`, `CoveredBy`, legacy `IntegrationTest`, `[Source:]`, frontmatter, and Mermaid. Never flag a declared carrier as narrative leakage.
> **[BLOCKING] Business-oriented cases and cardinality:** Each business case must state an actor-facing acceptance outcome, not merely mirror a class/method. Flag a case split or narrowed only to match code structure when the user-observable behavior and invariant are the same. Preserve the strict default's one-TC-to-many-tests rule when selected; a native profile may declare another cardinality. In every profile, MUST ATTENTION preserve owner-qualified scenario identity and any variant identity, and MUST ATTENTION trace every claimed result to its actual executor and inspected assertion. Repeated scenario IDs with distinct declared variants are not duplicates; exact duplicate owner/scenario/variant identities are.

### Required (all must pass)

| #   | Check | Presence | Quality Depth |
| --- | --- | --- | --- |
| 1 | **Logical case identity** — every case follows the selected profile's identifier and owner rule; the strict default uses `TC-{FEATURE}-{NNN}`. | Does each case have a valid identity in the configured owner/carrier? | Are identities unique under the profile's full key, including owner and any declared variant? |
| 2 | **Actor/outcome coverage** — every in-scope user story or actor-facing outcome maps to at least one canonical case. | Is each story/outcome represented in the configured case set? | Does the case exercise the behavior, or merely cite a story ID? |
| 3 | **Requirement coverage** — each acceptance criterion or normative requirement maps to an applicable case. | Is every configured acceptance/requirement ID covered? | Would at least one mapped case fail if the criterion or requirement were violated? |
| 4 | **Healthy path** — each applicable outcome has a realistic success case. | Is a happy path present where the behavior permits success? | Does it assert the full observable outcome rather than a stub? |
| 5 | **Negative/failure path** — relevant errors, denied access, and invalid transitions have explicit cases. | Are negative paths represented where the contract requires them? | Do they assert the exact rejected outcome and preserve healthy behavior? |
| 6 | **No duplicate canonical cases** — identity uniqueness follows the selected profile. | Are exact profile identities unique? | Flag cases with the same intent and identity; under a native profile, distinct declared variants of one scenario are valid and must remain distinct. |
| 7 | **Meaningful expected outcome and assertion** — each case states a precise expected positive or negative outcome. | Is an authored expected value/state present in the configured carrier? | Would the mapped assertion fail if the protected outcome were wrong? An ID, comment, or aggregate result alone is not assertion proof. |
| 8 | **Intent / invariant guarded** — each executable case names the business intent or technical contract it protects. | Is the guarded intent stated in the profile's case/rationale field or an equivalent carrier? | Would the assertion fail if that intent or invariant broke? |
| 9 | **Authorization coverage** — each story or actor outcome with an authorization boundary includes a denied-access case. | Is a negative authorization case present for each applicable story/outcome? | Does it use a realistic unauthorized principal and assert the denied outcome while preserving authorized behavior? |
| 10 | **Profile format and coverage evidence** — the required fields and links match the selected profile. | Under the default, are required TC fields and `CoveredBy:` present? Under a native profile, are its required fields and case-to-test relation used? | For every claimed tested case, can the reviewer follow its owner/case/variant identity to the actual executor and inspected assertion, or an explicitly approved manual-QC carrier? `UNKNOWN`/unresolved is never PASS. |
| 11 | **Preservation cases (bugfix context)** — pre-existing healthy behavior remains protected. | Is the relevant preservation case present when a bug fix could regress existing behavior? | Would its assertion detect recurrence, not merely prove that no exception occurred? |
| 12 | **Invariant/property and boundary coverage** — each universal hard rule has a universally quantified property plus a boundary counter-case. | Does every applicable hard rule/invariant in the configured contract sections (default: `[HARD]` §4 and §5) map to both cases? | Would the property and boundary assertion fail if the invariant broke? A single example is insufficient. |
| 13 | **UI interaction intent (UI-bearing specs)** — required views, navigation, observable states, and user flows are present in the selected profile. | Under the default, are §6.2–§6.5 present or is the backend-only skip reason stated? Under a native profile, are its declared interaction fields covered? | Is UI intent linked to configured logical IDs and M1-clean, with visual fidelity left to its linked design artifact? An absent applicable interaction contract is a finding. |

> **[BLOCKING] Spec-Loop property coverage (`--type=spec-tests`):** Verify every universal hard rule/invariant in the selected contract sections maps to a universally quantified property case **and** a boundary counter-case. For the strict default, these are `[HARD]` §4/§5 invariants and property TCs. For a native profile, resolve the configured contract section and case carrier. Example-only coverage is a blocking finding; a missing/unresolvable property case is `NEEDS WORK` or `BLOCKED`, never a pass.

### Spec body (§1-7) — Required when in scope

There is no separate spec type: a Feature Spec is reviewed here, with this section added to the rows above. **In scope when** the review is untyped on a Feature Spec, the run authored or changed §1-7 before this review (an author, update or clarify step; confirm from the run report or the spec's diff), or the caller asks for it. Otherwise record `Spec body: N/A — only the cases changed`. Section names follow the strict default (`spec/SKILL.md` → 8 sections: Overview · Glossary · User Stories & Acceptance Criteria · Business Rules · Domain Model · Process Flows & Interaction Surface · Permissions & Roles · Test Specifications); under a native profile, apply each row to the profile's declared section roles.

| #   | Check | Presence | Quality Depth |
| --- | --- | --- | --- |
| S1 | **M1-M7 over the body** — mandates in `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M7)"; M1/M2 and M4 depth are rows S4 and S5 | Is a verdict recorded for each applicable mandate over §1-7, with the carrier exemption applied only to declared carriers? | Could a team with no codebase knowledge rebuild the same behavior from §1-7 alone (M5)? Are IDs the citation spine (M3)? Does every statement a case is built on describe something a user or QC could demo (M7)? |
| S2 | **Eight sections present and substantive** | Are all eight sections present in order, each with content rather than a heading, placeholder or "TBD"? For a UI-bearing spec, is §6 interaction intent present, or the backend-only reason stated? | Does §5 give every entity its purpose, attributes, constraints, lifecycle states and invariants, and every operation its validation, authorization, success result and named failures (Implementation-Complete Gate)? Does §7 say what each role may and may not do? |
| S3 | **Every AC and BR traced to §8** | Does every §3 acceptance criterion and every §4 business rule map to at least one §8 case? | Would the mapped case fail if the criterion or rule broke — a positive case per AC, a negative case per BR (Test-Complete Gate)? An AC or BR with no case is a finding even when row 3 passes from the case side. |
| S4 | **Tech-agnostic prose (M1/M2)** | Is §1-7 narrative free of framework, product, language-type, class, method and file-path names outside declared carriers? | Is behavior stated in business operation names a non-developer can follow? Never flag a declared carrier. |
| S5 | **One testable interpretation (M4)** | Does each requirement, rule and flow step state an observable completion state and its named failures? | Could two engineers build different behavior while both claiming conformance (AI-Implementability Gate)? If yes, name the missing rule, limit or example. |

### Recommended (≥50% should pass)

| #   | Check                                                                                                                                                       | Presence                                                                 | Quality Depth                                                                                                               |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Edge cases** — Boundary values, empty inputs, max limits tested                                                                                           | Are edge cases listed in the selected carrier?                           | Are these the RIGHT edge cases? Do they cover the 3 most likely production failure modes for this feature?                  |
| 2   | **Integration points** — Cross-service scenarios covered                                                                                                    | Are cross-service cases present where applicable?                        | Do integration cases verify actual data flow across services, or just that a downstream call was made?                     |
| 3   | **Performance cases** — Response time or throughput expectations where relevant; production-like data volume cases if >1000 records expected                 | Are performance cases present where data volume or SLA expectations exist?| Do they use production-like data volumes, not toy datasets that trivially pass?                                            |
| 4   | **Security cases** — Auth, authorization, input validation tested                                                                                           | Are security cases present for auth, authz, and input validation?        | Do they attempt realistic attack vectors (SQLi, over-posting, privilege escalation) not just "invalid token → 401"?       |
| 5   | **Seed data cases** — If feature needs reference data, cases verify data exists and seeding produces the intended state                                      | If reference data is needed, is a case present (or N/A)?                 | If present, does the case assert the exact seeded data shape, not just that the seeder ran without error?                   |
| 6   | **Data migration cases** — If schema changes exist, cases verify transforms, rollback behavior, and absence of data loss                                    | If schema changes exist, is a migration case present (or N/A)?           | If present, does it verify rollback behavior and zero data loss, not just forward migration success?                        |
| 7   | **Test data requirements specified** — the data setup needed to run each test is documented                                                                 | Are test data requirements stated per test?                              | Is test data specific enough to create fixtures without guessing? Vague data requirements ("a valid user") will cause test setup divergence across environments. |
| 8   | **GIVEN/WHEN/THEN format used** — tests follow the structured BDD format                                                                                    | Are all tests written in GIVEN/WHEN/THEN?                                | Are the THEN clauses assertions on observable outcomes, or on internal state? Tests asserting on internal state are brittle and break on refactoring.            |

## Output template

```markdown
## Test Spec Review Result

**Status:** PASS | WARN | FAIL
**Canonical cases reviewed:** {count} (strict default: TCs)
**Artifact identity:** {path} · sha256:{hex digest of the file bytes}
**Coverage:** {X}% of stories, {Y}% of acceptance criteria

### Coverage Matrix

| Story/AC | Case IDs (default: TC IDs) | Happy | Error | Edge |
| -------- | ------ | ----- | ----- | ---- |

### Required ({X}/{Y})

- ✅/❌ Check description

### Spec Body §1-7 ({X}/5 | N/A — {reason})

- ✅/❌ S1-S5 check description

### Recommended ({X}/{Y})

- ✅/⚠️ Check description

### Missing Coverage

- {Stories/AC without mapped canonical cases}
- {§4 business rules without a §8 case, when the spec body is in scope}

### Verdict

{PROCEED | REVISE_FIRST}
```
