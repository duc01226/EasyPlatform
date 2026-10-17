# AI-SDD Mandate Gate (M1-M5 and M7) — shared criteria

Single owner of the six per-artifact mandate checks that authoring and review skills apply to a task, story, design spec or test spec. Definitions, the M6 rule and carrier lists live in `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M7)"; this file holds the operational criteria only. Each consumer skill keeps its own role framing (verdict vocabulary, output template) and reads this file for the criteria.

## Consumers and framing

| Consumer | Role | Failure result |
| --- | --- | --- |
| `work-item --mode=review` | reviewer of any artifact type | `NEEDS WORK` + mandate ID + section/line |
| `work-item --mode=challenge` | cross-person challenge of a task | AI Verdict `REQUEST_REVISION` + challenge prompt naming the mandate |
| `work-item --mode=dor` | Readiness-check gate     | `FAIL` + Blocking Item naming the mandate |
| `work-item --mode=refine`, `work-item --mode=story` | author of the task / stories | rework before emitting; never write a violating artifact |

M6 binds the reviewing consumer, not the artifact: a reviewer that passes an M1-M5 or M7 violation is itself defective. The artifact-facing set is M1-M5 **and** M7 (never "M1-M6").

## Carrier exemption (M1/M2)

Source identifiers are correct inside the selected profile's declared evidence carriers; the strict default uses `[Source: ...]`, `**Evidence**`, `CoveredBy`, legacy `IntegrationTest`, YAML frontmatter and Mermaid blocks. Flag leakage only in narrative prose (problem statement, headings, AC/scenario text, scope, rule statements). The banned prose token list is `spec-principles.md` §3.2 under the configured reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides).

## Criteria

- **M1 — Tech-agnostic prose.** FAIL if narrative prose, headings, summaries or AC/scenario text name a framework/product, a language-native type, or a product/design-pattern class name. Cite the section + leaked token + a business-term replacement.
- **M2 — No source code in prose.** FAIL if behavior is expressed as a class/method/file-path/namespace used as a noun (for example "call the create-async method") instead of the business operation ("create the record"). Source identifiers belong only in evidence carriers. Cite section + line.
- **M3 — Profile-owned traceability.** FAIL if a requirement, rule, acceptance criterion or canonical case lacks the selected profile's logical identity or required source/evidence link. Under the strict default: a logical ID (`FR-`/`BR-`/`OP-`/`TC-`) is the PRIMARY citation spine, and a secondary `[Source: namespace/service/id]` abstract anchor is REQUIRED and KEPT — never removed, never replaced by `file:line` or repository-root paths (physical coordinates live only in the provenance sidecar). Under a native profile (declared by config or required references) use its declared identifiers and evidence carriers without imposing a second abstract-anchor or TC registry. If the profile does not resolve the required identity/evidence form, report `BLOCKED`/`UNKNOWN`; never infer a pass.
- **M4 — Unambiguous, observable criteria.** FAIL if AC/expected-result prose uses vague language ("should", "might", "handle appropriately", "process normally", "as needed", "various", "fast", "user-friendly"), two engineers could implement it differently while both claiming conformance, or no observable completion state / named error condition exists.
- **M5 — Rebuild-from-artifact.** FAIL if a competent team with ZERO codebase knowledge could not re-implement the described behavior on a different stack from the artifact alone (a rule, limit, role or failure mode must be guessed or read from source). Cite the section + the missing detail.
- **M7 — Business-visibility (business-tree artifacts only).** Apply the demo test to each case's BODY: *"what would a stakeholder SEE change?"* — no answer → FAIL as TECHNICAL-ONLY. Every `Given` is a state a user could arrange, every `When` an action a user could take, every `Then` an outcome a user could see. FAIL a case whose `When` is an invocation (a handler runs, a consumer receives, a job fires, a model is inspected, data syncs) or whose `Then` asserts a schema/type/nullability/column/call-count instead of a business outcome. Judge the BODY, never the title or ID. Never derive an AC/story/case count from an architecture inventory (handlers, consumers, jobs) — that count moves when the system is re-architected though no business behavior changed. Cite the case ID + the offending `When`/`Then` clause and offer a demoable rewrite.

> **M1 vs M7 — the distinction this gate exists for.** M1 governs **vocabulary**; M7 governs **subject matter**. A technical case written in impeccably tech-free prose satisfies M1 while violating M7 — that gap is the most common way business specs rot, one tech-free-sounding bugfix case at a time. A clean M1 pass is NEVER evidence of an M7 pass; run both. Conversely do not fail a case merely for a technical-sounding noun: if a user or QC can demo the outcome it is business — M7 asks what the case is ABOUT, not which words it uses.

## Authoring rules (producers: `work-item --mode=refine`, `work-item --mode=story`)

- Keep a tech-agnostic **Business Intent** narrative (description, business value, acceptance criteria) free of framework/product/language/design-pattern names and source identifiers; optional implementation hints go in a clearly separated Implementation Notes / Technical Notes block, and source references only in evidence carriers.
- Rework before emitting when ANY criterion above fails: tech-specific prose · source code in prose · missing logical ID or abstract-anchor evidence (or explicit `TBD (pre-implementation)` marker) · vague criteria · not implementable from the artifact alone · not demoable (TECHNICAL-ONLY belongs to the technical tree, not this artifact).

## Reusing an earlier verdict (`--reuse`)

`work-item --mode=challenge` and `work-item --mode=dor` accept `--reuse=<task review report path>`; a workflow passes the symbolic `--reuse=task-review`, which resolves to the report written by that run's `work-item --mode=review --type=task` step (path recorded in the run report; unresolvable → treat as no `--reuse`).

### Artifact identity

- The report header records `Artifact identity: {task path} · sha256:{hex digest}` — SHA-256 of the task file's raw bytes. A content hash is REQUIRED; size and mtime are NOT an identity (a same-size edit or a touched file defeats them) and never qualify a report for reuse.
- Recompute the digest of the task under review now and compare it with the header's digest for THAT task path. When the report covers several tasks, use only the section/path for this task; when more than one report matches the path, take the newest one for that path.
- Any mismatch, missing or unreadable digest, missing path, or unresolvable report → reuse is OFF for the whole run: evaluate EVERY criterion and mandate.

### Coverage map (the ONLY reusable criteria)

A consumer may satisfy a criterion from the report only when it appears in this map; everything not listed is NEVER reusable and is evaluated in full by the consumer on every run, even when the identity matches. A row is listed only when the consumer's criterion text is the same criterion as the report's.

| `work-item --mode=review --type=task` report row | `work-item --mode=dor` criterion it may satisfy | `work-item --mode=challenge` criterion it may satisfy |
| --- | --- | --- |
| M1, M2, M3, M4, M5, M7 verdicts (shared criteria above) | the M1-M7 compliance gate | the M1-M7 compliance gate |
| Row 1 — releasable outcome and full flow | Required row 3 (releasable outcome) and row 4 (full-flow surface) | Step 5 releasable outcome and UI full-flow surface checks |

Consumer-owned, never reusable: `work-item --mode=dor` — user-story template, AC format (GIVEN/WHEN/THEN, minimum 3 scenarios, 1 authorization scenario), UI design ready, effort points and estimation frontmatter, AI pre-review presence, dependency table Type/Status columns; `work-item --mode=challenge` — module confirm, feasibility and estimate alignment, the vagueness-token check (`TBD`, `etc.`, `various`, `appropriate`), AC coverage (happy/edge/error/authorization), dependencies, seed/migration/performance/cross-service checks, challenge prompts and the human decision. Report rows 2-9 (problem statement, AC testability, scope, dependencies, value, priority, AC-set completeness, sign-off readiness) are review-only and never stand in for a consumer criterion.

### Rules

1. Identity matches and the criterion is in the coverage map → cite the report's verdict and evidence instead of re-evaluating it.
2. Identity changed, missing or unreadable, or the criterion is not in the coverage map (a different `--type`, a check the report skipped, a consumer-owned check) → evaluate that criterion in full.
3. No `--reuse` input (standalone run) → evaluate EVERY criterion; never infer that an earlier step already did it.
4. A reused FAIL stays a FAIL; reuse never converts a violation into a pass and never waives the human decision or user-confirmation steps of the consumer.
