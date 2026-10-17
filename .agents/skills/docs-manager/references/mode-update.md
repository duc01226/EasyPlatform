# `$docs-manager --mode=update` — documentation sync

Read this reference when updating documentation impacted by code, spec or test changes, standalone or inside a workflow.

## Contents

- [Quick Summary](#quick-summary)
- [Scope and inputs](#scope-and-inputs)
- [Ownership and update boundaries](#ownership-and-update-boundaries)
- [Context quality gates](#context-quality-gates)
- [Stamp discipline](#stamp-discipline)
- [Business intent and coverage gates](#business-intent-and-coverage-gates)
- [Existing demo-guide relevance](#existing-demo-guide-relevance)
- [Completion and report](#completion-and-report)
- [Closing Reminders](#closing-reminders)

## Quick Summary

**Goal:** Keep impacted documentation, configuration and spec/test traceability accurate through their canonical owners.

**Summary:** Resolve the exact change scope → verify affected context and route necessary owner updates → check business intent, coverage and derived outputs → report evidence and unresolved gaps. Choose tasks, tools and delegation to fit the work; no fixed task count or phase itinerary is required.

**Critical rules:**

- Patch context narrowly; route Feature Specs, TCs, derived views and demo guides to their owners.
- Claim freshness only for checks actually completed. An unchanged verification writes nothing and never advances a full-scan stamp.
- Resolve code/spec contradictions explicitly; passing tests do not excuse a weakened `[HARD]` business rule.

## Scope and inputs

Resolve project paths and applicability from `.claude/hooks/lib/project-config-loader.cjs`, configured references and repository evidence. Absent config is supported; malformed declared capabilities require repair through `$project-config`. Business and reference roots come from `specRoots.business.path` and `docsRoots.projectReference.path` in `docs/project-config.json` (defaults `docs/specs` and `docs/project-reference`). Declared native `specArtifacts` profiles own section roles, IDs and evidence carriers; the §/AC/BR/TC names below describe the strict-default profile.

Resolve scope once: explicit `changed_files` → caller `base` diff → default working-tree diff. Include deleted paths; record the source and immutable `resolved_changed_files`. Explicit paths exclude unrelated Git changes. If the default diff is empty, establish a relevant comparison from caller context or repository history and report it; do not assume a particular remote branch. If the resolved list is empty, record an empty-scope no-op and skip mapping. Pass paths as separate literal arguments, never interpolate raw caller text.

The impact mapper can identify reference docs, config sections, checks and exact scan routes:

```text
node .claude/scripts/doc-impact-map.cjs --json <resolved_changed_files...>
```

Classify every `unrouted` path manually and verify `heuristicOnly` matches. Missing routing does not establish no impact. When the mapper is unavailable, derive the same scope from config matchers, modules and changed artifacts. Deduplicate module assignments and keep one writer per artifact.

| Input | Meaning |
| --- | --- |
| `modules` | Supplied module scope; otherwise derive from project evidence |
| `changed_files` | Exact repository-relative paths, including deletions; overrides Git discovery |
| `base` | Comparison base for `git diff --name-only <base>...HEAD` |
| `mode` | The `mode=update` caller flag (no dashes) only overrides `$spec` mode detection; `--mode=update` selects this skill mode |
| `tc_mode` | `TDD-first`, `implement-first`, `update`, `sync` or `from-integration-tests`; select by available intent, code and TCs |
| `freshness` | `impact` (default): scoped checks; `full`: route affected docs/config to full owners; `off`: explicit user instruction only, report affected context as `UNVERIFIED` |
| `phases`, `skip_phases` | Compatibility scope filters: 1=context, 2=feature intent, 2.5=index, 2.6=technical views, 3=TCs, 4=test links, 4.5=demo. Report excluded checks; these labels impose no execution itinerary and cannot waive a required quality gate |

<additional_requests>
$ARGUMENTS
</additional_requests>

## Ownership and update boundaries

| Artifact | Canonical owner | This mode's responsibility |
| --- | --- | --- |
| Reference docs | `$scan --target=<key>` | Scoped verification and surgical patches; route full authoring/rebuilds to the exact map `scanTarget`, including generic `--filename` |
| Project config | `$project-config` | Merge only impacted existing sections; validate schema and prove touched paths/matchers resolve. New sections, module classes, stacks or validation failures require the owner |
| README and project context | Existing project owner; `$ai-context-refresh` for generated context sections | Update changed setup/scope claims; preserve unmanaged prose and generated boundaries |
| Feature intent (§1–§7) | `$spec` | Pass changed paths, deduplicated modules and impacted intent; review the returned result |
| Business test cases (§8) | `$spec [mode=tests]` | Pass business outcomes and selected `tc_mode`; never author TCs here |
| TC ↔ executing-test links | `$spec [mode=sync]` | Pass changed capabilities/TCs; verify actual coverage and unresolved cases |
| Maintained derived INDEX/ERD | `$spec [mode=index]` | Refresh only affected, lagging outputs; honor `spec_discovery_update=false` and avoid duplicate refreshes |
| Derived technical views | `$tech-spec` | Route affected code/test topology and annotations; never hand-author generated output |
| Existing demo guides | `$demo-guide` | Detect relevance and request refresh at the same path; never hand-edit proof claims |

Keep Feature Specs, test specs, derived indexes/ERDs, technical views and demo guides outside every context-patching brief/write set. The owning child skill performs those writes. Full reference initialization belongs to `$docs-manager --mode=init`; whole-set staleness belongs to `$scan-all`, rather than expanding an impact-scoped patch.

Read `.claude/skills/shared/sdd-artifact-contract.md` when checking spec ownership and traceability: canonical intent precedes derived views; preserve logical IDs and explicit unknowns; executing tests must guard intent. Read `spec-system-reference.md` and `spec-principles.md` under the resolved reference root when applying the project's formats and tech-agnostic prose rules.

## Context quality gates

For each affected doc/config section, check applicable claims, added/deleted-artifact coverage, generated counts, conventions, commands, versions, ports and links against current evidence. Report violations of a convention; do not document them as accepted practice. Re-derive inventories and values from their sources.

Repository path claims must resolve. Workspace package subpaths require an existing file and, when present, a resolving `exports` entry. Same-line `<!-- dead-link-ok -->` permits intentional historical/negative-control citations; `<!-- path-role: generated-output|proposed|user-local -->` marks those destinations. Unknown roles suppress nothing; markers never hide stale source paths.

| Verdict | Required evidence |
| --- | --- |
| `FRESH` | All applicable scoped checks passed; no edit needed |
| `PATCHED` | Changed sections, source evidence and verified result |
| `RESCAN REQUIRED` | Why a surgical patch cannot restore truth, exact owner route and whether completed or queued |
| `UNVERIFIED` | Missing check/evidence and next action; unchecked content is never `FRESH` |

Enhance changed hand-owned reference guidance with `$prompt-enhance`; record a skip for stamp/count-only edits or an owner scan that already enhanced its output. Keep useful conditions and discoverable owner references. Route added/renamed/retired docs through the docs-index owner; route changed `referenceDocs` selection through `$project-config` and generated root context through `$ai-context-refresh`.

## Stamp discipline

Resolve and read `docs-index-reference.md` under `docsRoots.projectReference.path` in `docs/project-config.json` (default `docs/project-reference`) before applying local stamp policy.

- Only a full scan may add, update or move `<!-- Last scanned: YYYY-MM-DD -->`. An impact-scoped pass MUST NOT add, update, or move `Last scanned`.
- If an applicable local rule explicitly requires `Last verified`, write or update it exactly as specified. Honor its scope, format, placement and no-stamp exceptions; otherwise write NO tracked date stamp. Existing stamps do not establish policy.
- Remove a disallowed pre-existing `Last verified` only during an otherwise-required content patch, never a stamp-only write.
- A verify pass that changes nothing writes nothing, regardless of any local stamp rule. Guard a candidate before application:

```text
node .claude/hooks/lib/doc-stamp-guard.cjs --check <doc> --candidate <file> --baseline <baseline-file>
```

Exit 3 = no-op: skip the write. Exit 4 = concurrent change: retain both versions and reconcile against live content. Read `.claude/skills/shared/protocols/scan-and-update-reference-doc.md` when applying candidates for baseline, no-op and freshness ownership. Only completed full owner scans record `--record-verified <doc filename>` in the reference freshness ledger; scoped/editorial checks remain in the run report and never clear full-scan staleness. Non-reference docs receive no ledger entry. After a full rescan, refresh the staleness flag through `.claude/hooks/lib/session-init-helpers.cjs`'s `refreshScanStaleFlag()`.

## Business intent and coverage gates

Derive impact from changed behavior, not file category alone. Tooling, technical coverage or style-only changes need no invented business TCs. Changed business behavior without a governing Feature Spec blocks completion: route creation through `$spec`, then continue synchronization.

- Verify changed outcomes against Acceptance Criteria, Business Rules and TCs (or their native equivalents). Preserve intended behavior instead of rewriting the spec to excuse an implementation defect. A weakened/removed `[HARD]` rule blocks until resolved or explicitly owner-accepted; record accepted contradictions as residuals, never a clean result.
- Update logical `FR-`/`BR-`/`OP-`/`TC-` mappings before dependent prose. Retain IDs across file moves; logical renames/splits require re-resolution, while physical coordinates belong in provenance sidecars.
- Keep governed business prose and headings tech-agnostic. Preserve permitted evidence carriers: `**Evidence**`, `CoveredBy`, legacy `IntegrationTest`, `[Source:]`, frontmatter and Mermaid. API/DTO/bus/job mechanics remain code-canonical.
- New/changed business outcomes need noncolliding, evidence-backed TCs. Use configured task/initiative artifact roots from `docs/project-config.json` or reference docs for detection/delegation only; route content to `$spec` and its tests/sync modes. Missing artifact roots need owner/config clarification, not guessed paths.
- Every `Tested` case's `CoveredBy: {File}::{Method}` (or approved native carrier) must reach an executing assertion. Flag uncovered cases `Untested` with rationale; every test `TestSpec` annotation must resolve to the canonical registry. Legacy `IntegrationTest:` is migration input only.
- Derived indexes must reflect current canonical specs, with valid links and the DERIVED banner. Refresh only when affected and maintained. Technical outputs belong to `$tech-spec`; absent `techSpecScan` is a reported skip, malformed declarations block. Do not invent annotations or unsupported generator flags.

Before completion, check each touched module for AC/BR/TC drift and affected derived-view freshness. Route remaining gaps to the corresponding owner; show coverage limitations explicitly.

## Existing demo-guide relevance

Discover guides under `demoGuide.outputDir` in `docs/project-config.json` (default `docs/demo-guides`); never guess filenames. Check headers, case IDs and quick-reference rows. A match in Sources, Governing spec/rules, changed TC IDs or mapped Scope establishes relevance; record the deciding key.

- No guide, or verified unrelated guides: `NOT-APPLICABLE`, with paths/globs and reasons.
- Insufficient relevance metadata: `UNVERIFIED`, with required follow-up.
- A downstream workflow `$demo-guide` step owns refresh: `DEFERRED`; detect/report without creating another writer.
- Related existing guide: invoke `$demo-guide --output {existing path}` with its scope and affected sections. Recheck task fences (an existing `<!-- PBI:START -->` / `<!-- PBI:END -->` block is the same block and is replaced in place), Cases split, TC IDs, expected outcomes, storage evidence, proof rungs and transparency note. Do not invent execution proof. New guide authoring requires its own request.

Read `.claude/skills/demo-guide/SKILL.md` when routing a refresh; it owns output paths, case identity and proof requirements.

## Completion and report

Write `tmp/reports/docs-update-{YYMMDD}-{HHMM}.md`, including empty-scope results. Record scope/source, affected modules, doc/config verdicts with checks/evidence, owner updates/skips, AC/BR/TC drift, coverage and derived/demo status, stamp actions, unresolved gaps and next owner actions. No fixed report inventory or task subjects are required.

For skills/hooks/workflows/sync-tool changes, record `$sync-codex` completion or an explicit N/A reason; never hand-edit generated mirrors. An unavailable required owner/check remains `UNVERIFIED` or blocked, not completed. Final consistency review confirms affected claims are true, owner boundaries hold and every scoped artifact has a result.

## Closing Reminders

**Goal:** Keep impacted documentation, configuration and spec/test traceability accurate through their canonical owners.

Resolve scope → verify context and route owner updates → check intent/coverage/derived outputs → report evidence and gaps. Choose the execution plan to fit the work.

- Preserve canonical ownership; context patches exclude specs, generated views and demo guides.
- Freshness requires evidence; no-op checks write nothing and scoped checks never advance full-scan freshness.
- Resolve business-rule contradictions explicitly and report unverified coverage without inventing proof.
