# Scan Target: feature-spec

> One entry of the scan target registry — index, selection rules, path roots and the custom-doc contract are in `../targets.md` (read it first). The `$scan --target=feature-spec` host (`../../SKILL.md`) loads this file for that run only.

- **doc:** `<ref>/feature-spec-reference.md`
- **applies when:** canonical feature/spec artifacts, an explicit spec root/profile, or a governed requirements corpus exists.
- **skip when:** there is no project-owned requirement/spec corpus or configured owner from which to derive its authoring contract.
- **description:** `[Documentation] Use when recording the local owner format, evidence rules, and lifecycle for existing feature/spec artifacts.`
- **sub-agents:** 2 — Agent 1: Native Artifact Structure & Lifecycle · Agent 2: Traceability, Evidence & Consumers

### Phase 0 detection — **[BLOCKING]** (config/profile validation and INIT vs SYNC)

1. Confirm the feature/spec output is selected and this target applies. Resolve the configured business-spec root through the project-config loader; inspect `specRoots.business` and `specArtifacts` only when declared.
2. Validate the config before reading artifacts. A valid `specArtifacts` profile supplies native section roles, identifiers, ownership, and evidence carriers. If it is absent, use the portable strict-default spec contract. If it is declared but malformed or unsupported, stop and route to `project-config`; do not silently fall back.
3. Verify the resolved root against repository evidence. If the configured/default root is empty but a separate spec corpus exists, report the mismatch and route config correction before scanning the wrong empty path.
4. Determine mode by reading `<ref>/feature-spec-reference.md`: **INIT** if missing or a placeholder; **SYNC** if it has content; **FORCE** only when the user explicitly requests rebuild/reset. INIT describes the real owner contract; SYNC updates changed facts only.
5. Identify the actual artifact organization (for example, folder-scoped, flat, source-embedded, or external-link based) from files and the validated config. Do not assume app/service buckets, section numbering, ID prefixes, or a particular spec template.

Path branching: INIT derives the guide from verified native artifacts/config; SYNC reuses its existing sections and updates only changed claims; FORCE rebuilds only when explicitly requested. Every mode ends with owner/ID/carrier checks that use the active native profile or strict fallback.

### Sub-agent Think scopes

**Agent 1: Native Artifact Structure & Lifecycle**
- **Think (Owner dimension):** Which artifacts are canonical owners, where are they rooted, and how do their native sections/headings, frontmatter, and lifecycle work?
- **Think (Quality dimension):** Which completeness, evidence, review, change, and validation rules are explicit in config or consistently enforced by source tooling? Separate normative rules from conventions merely observed.
- Scan targets: resolved spec roots and representative artifacts across their actual folders; project templates and authoring guides; configured profile roles/identifiers/carriers; validators and lifecycle tools. Use configured roots and patterns; do not impose fixed filenames, section counts, `TC-` IDs, or app/service mappings.
- Apply M1/M2 or other spec-quality checks only where the configured `specRoots` policy and active SDD contract govern that artifact. For a valid `specArtifacts` profile, use its native sections and carriers; when absent, use the portable strict-default contract. Report each issue with the actual artifact, line, and native section/ID.

**Agent 2: Traceability, Evidence & Consumers**
- **Think (Relationship dimension):** How do canonical intent, contracts, native scenario/case records, tests, implementation, and derived views link in this project?
- **Think (Coverage dimension):** Which intended capabilities have no linked executable evidence, and which implementation/test behavior lacks a canonical owner?
- Scan targets: configured carrier roots and accepted case identifiers; real owner-to-test links; import/API/event relationships only when present; cross-references between artifacts; doc generation and validation tools. Verify the assertion tied to each claimed owner + native case/scenario ID + optional variant; never infer coverage from an ID grep alone.

### Target Sections

| Section | Content |
| --- | --- |
| **Artifact Owners & Roots** | Canonical artifact kinds, resolved roots, ownership precedence, and derived outputs found in config/source |
| **Native Authoring Contract** | Configured section roles, frontmatter, identifiers, evidence carriers, and lifecycle; strict-default details only when no native profile exists |
| **Artifact Organization** | Actual naming and grouping patterns with verified paths; omit absent organization types |
| **Traceability & Verification** | Owner-to-native-case-to-assertion links, validation tools/commands, and evidence boundaries |
| **Coverage Gaps** | Missing or stale links proven against the active owner contract; mark unknowns instead of assuming a missing artifact |
| **Applicable Spec Quality Findings** | Profile/policy-governed issues only, with native artifact, line, and section/identifier evidence |

### Content Rules
- Use concise tables for native profile fields and verified owner-to-test relationships when they improve readability.
- Describe the actual root and naming pattern; link to representative files instead of emitting a directory tree or stale inventory count.
- Coverage gaps must be tied to configured owners/carriers and real artifacts. Label unresolved mappings `UNKNOWN`; do not call an absent artifact a defect until the root and carrier were verified.
- Preserve the project's native section/identifier contract. A valid `specArtifacts` profile takes precedence; absent profile uses the portable strict-default contract; malformed profile blocks the scan.

### Special slivers
- **[BLOCKING] Profile resolution:** read `specArtifacts`, `specRoots`, and the project config schema. For a valid native profile, use configured roles/carriers/IDs; when absent, use the portable strict-default spec contract; when malformed, stop and report the config error.
- **[BLOCKING] Phase 0 mode-detection** (INIT vs SYNC); avoid scanning an empty assumed root when configured or discovered roots conflict.
- Apply tech-agnostic/business-visibility criteria only to sections governed by the project’s declared spec policy and the active SDD contract; do not apply them indiscriminately to technical or derived artifacts.
- Verify only template, skill, validator, and test-carrier paths actually declared or found in this project. Do not assume a `README.{Feature}.md` format, a particular spec skill, a section number, or `TC-` IDs when a native profile exists.
- Sub-agent count = 2 (artifact structure/lifecycle + traceability/evidence).

### Anti-Rationalization rows

| Evasion | Rebuttal |
| --- | --- |
| "Mode obvious, skip Phase 0 detection" | Phase 0 mode detection is BLOCKING — INIT vs SYNC paths differ significantly |
| "Coverage Gaps not needed" | Keep verified gaps in the report; include only actionable limits or consumer-required gap data in the guide |
| "A framework template is probably the project's template" | Verify configured/native owner artifacts and generators before documenting a path |
| "An ID grep proves test coverage" | Trace the owner + native ID + optional variant to the executing assertion |
| "Skip Round 2 even when Round 1 found issues" | Clean Round 1 ends the scan. When issues exist, fresh-eyes mandatory after fixing — main agent rationalizes own section extractions. |

### prompt-enhance
`$prompt-enhance <ref>/feature-spec-reference.md`
