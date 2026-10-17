# Project Init Use Cases And Test Cases

Use this matrix when planning, implementing, or reviewing portable project initialization. Config-file validity, capability selection, reference selection, and spec-format selection are separate decisions.

## Use Cases

| ID | Folder/config state | Trigger | Expected behavior |
| --- | --- | --- | --- |
| UC-PI-001 | Empty or minimal project with no evidenced capabilities | Explicit `$project-init` | Create or verify the required config with a derived non-empty `project.name`; omit unsupported capability sections and do not invent scans, specs, or test cases. |
| UC-PI-002 | Project config file missing or malformed | Ordinary project-specific work or `$project-init` | Block ordinary work and route through `$project-config` or `$project-init` repair until the configured file validates. |
| UC-PI-003 | Config contains only non-empty `project.name` | `$project-init` or a missing-context check | Accept as valid when no optional capability is selected or evidenced. |
| UC-PI-004 | Optional property omitted | Config validation or setup | Apply its documented neutral default or evidence-backed skip; do not create an empty declaration to simulate completeness. |
| UC-PI-005 | Optional section is explicitly incomplete or unsupported | Config validation | Fail visibly and repair or deliberately remove the declaration before dependent work; do not reinterpret it as absent. |
| UC-PI-006 | `referenceDocs` absent | Setup or task-context resolution | Use the resolver's portable baseline, which may be empty, plus only configured or repository-evidenced capability docs. Do not write the full catalog into config. |
| UC-PI-007 | `referenceDocs` lists a subset | Setup or task-context resolution | Keep exactly the explicit task-specific selection; never append unselected catalog entries. |
| UC-PI-008 | `referenceDocs: []` | Setup or task-context resolution | Select no task-specific docs; still ensure always-on `lessons.md` and configured docs-index inputs separately. |
| UC-PI-009 | Custom reference omits `scanTarget` or selects `manual` | Setup or refresh | Initialize it only when missing; leave scanning, freshness, and impact decisions to its project owner. |
| UC-PI-010 | Custom reference selects `scanTarget: "generic"` | Setup or refresh | Scan only the exact selected output using its configured purpose and optional sections; retain safe-path checks and generic impact routing. |
| UC-PI-009 | Always-on context input missing | `$project-init` | Create or refresh `lessons.md` and `docs-index-reference.md` at their configured owner paths, independently of `referenceDocs`. |
| UC-PI-010 | Applicable selected/evidenced scan targets exist | `$project-init` | Run only those targets; report absent capabilities as evidence-backed skips, not failed scans. |
| UC-PI-011 | Existing canonical spec corpus | `$project-init` or a relevant behavior change | Resolve its configured owner; audit existing artifacts, or update the owner when the active requirement/change selects that work. |
| UC-PI-012 | No corpus, but user-accepted capability scope names an owner | `$project-init` | Create artifacts only for that accepted scope, using the selected native or strict-default format. |
| UC-PI-013 | No canonical owner and no accepted capability scope | `$project-init` | Do not fabricate specs, sections, or test cases from package names or source-file presence; report what evidence or acceptance is needed. |
| UC-PI-014 | Valid native `specArtifacts` profile exists | Selected spec work | Preserve and use its native sections, IDs, ownership, and carriers without translating them to TC identifiers. |
| UC-PI-015 | `specArtifacts` is absent | Selected spec work | Apply the framework's strict business-spec and Section-8 TC defaults. |
| UC-PI-016 | `specArtifacts` is malformed or unsupported | Selected spec work | Fail closed for spec work and route profile repair; never drop the declaration and silently fall back. |
| UC-PI-017 | Graph tooling and relevant code relationships exist | Setup task needs graph coverage | Run the graph task in its required background lane and report its result; existing graph files alone do not make refresh mandatory. |
| UC-PI-018 | No graph capability or no relevant code relationships | `$project-init` | Record an evidence-backed graph skip; do not make graph tooling a prerequisite for docs-only, CLI, library, or other non-code work. |
| UC-PI-019 | Custom config, docs-index, or reference roots are configured | Any setup route | Resolve the configured locations before reading or writing; do not scaffold default-path duplicates. |
| UC-PI-020 | Claude/Codex root files or mirrors are installed or requested | Root-context setup | Preserve user-authored content and use the owning refresh/handoff route; skip host-specific files for hosts not selected. |
| UC-PI-021 | Observable surface has no accepted expectation | Setup or review | Keep first-run observations as candidate evidence; never promote current output to an accepted baseline automatically. |
| UC-PI-022 | Relevant observable surface cannot run or be inspected | Setup or review | Record `ENVIRONMENT-BLOCKED` with the missing capability and evidence; do not report PASS or `NOT-APPLICABLE`. |
| UC-PI-023 | Already initialized project is re-evaluated | `$project-init` | Preserve existing values, make no unnecessary edits, and report only applicable work and evidence-backed skips. |

## Test Cases

| ID | Covers | Setup | Assertion |
| --- | --- | --- | --- |
| TC-PI-001 | Required config gate | Config missing at the configured path | Ordinary project work is blocked and repair routes remain available. |
| TC-PI-002 | Minimum valid config | Config contains only `{ "project": { "name": "Example" } }` | Validation accepts the config without requiring optional sections. |
| TC-PI-003 | Identity derivation | Config must be bootstrapped; package/repository metadata is present or absent | Name is derived from metadata when available, otherwise from the repository-root directory; no stack/capability is inferred from the name. |
| TC-PI-004 | Optional omissions | Minimal config has no framework, test, UI, database, spec, or graph declaration | Defaults/skips are neutral and no empty capability sections are generated. |
| TC-PI-005 | Declared invalid capability | Config contains an incomplete or unsupported optional section | Validation reports the declaration error; dependent setup does not treat it as absent. |
| TC-PI-006 | Absent task-specific reference selection | Minimal config omits `referenceDocs`; repository has no evidenced reference capability | Resolver returns an empty task-specific selection when its baseline and evidence set are empty. |
| TC-PI-007 | Evidence-backed absent selection | Config omits `referenceDocs`; repository demonstrates a supported capability | Resolver selects only applicable capability references supported by config or repository evidence. |
| TC-PI-008 | Explicit subset selection | Config declares a subset of task-specific reference docs | Normalization preserves that selection without adding catalog entries. |
| TC-PI-009 | Explicit empty selection | Config declares `referenceDocs: []` | Task-specific selection stays empty; always-on docs resolve independently. |
| TC-PI-010 | Always-on context | Config uses absent, subset, or empty `referenceDocs` | `lessons.md` and configured docs-index inputs are ensured at their owner paths without being added to the task-specific list. |
| TC-PI-011 | Scan target selection | One or more reference capabilities are selected/evidenced | Only applicable scan targets run; unselected capabilities are recorded as evidence-backed skips. |
| TC-PI-012 | No scan capability | Config is minimal and source contains no supported scan capability | No scan is fabricated or required; initialization can complete after applicable config/context checks. |
| TC-PI-013 | Existing spec owner | Canonical specs exist under the configured business-spec root | Selected workflow audits or updates the existing owner according to the active task; it does not invent a new owner. |
| TC-PI-014 | Accepted capability scope | No existing specs, but accepted scope names the owner and requested capability | Only that scope is authored; unrelated packages/capabilities are not expanded into specs. |
| TC-PI-015 | No spec owner or accepted scope | No canonical corpus and no accepted capability scope | No spec or test case is fabricated; report an evidence-backed deferral. |
| TC-PI-016 | Valid native spec profile | Config declares a schema-valid `specArtifacts` profile | Existing native section, ID, ownership, and carrier rules are preserved. |
| TC-PI-017 | Strict default spec profile | Config omits `specArtifacts` and a real spec task is selected | The strict business-spec and Section-8 TC defaults apply. |
| TC-PI-018 | Invalid spec profile | Config declares malformed or unsupported `specArtifacts` | Spec setup fails closed and requests profile repair; no silent TC fallback occurs. |
| TC-PI-019 | Custom roots | Config relocates project config, docs index, reference docs, or spec roots | All reads/writes use configured paths; no default-path duplicate is created. |
| TC-PI-020 | Conditional graph work | Graph tooling is absent or task has no relevant code relationships | Graph task is skipped with evidence; project-init remains valid. |
| TC-PI-021 | Selected graph work | Graph tooling exists and active scope needs structural tracing | Graph task runs in its required background lane and its result/blocker is reported. |
| TC-PI-022 | Host-specific root context | One host is installed/requested and another is not | Selected root/mirror is refreshed through its owner route; unrelated host files are not required. |
| TC-PI-023 | Root-file preservation | Markerless root instruction file contains project-authored sections; the root template carries no universal-guide marker | Project-authored content is kept untouched; setup copies no universal rule or protocol text into the root (the hook delivers it); a legacy universal sentinel or section is removed only through `--strip-legacy-universal`, which writes a backup first. Covered by `generate-claude-md-content-guard.test.mjs` (TC-CLG-010) and `agent-files-gate.test.cjs` (markerless update leaves the root byte-identical; the shipped template holds project sections only). |
| TC-PI-024 | Experience expectation safety | Observable surface has no accepted baseline | Current observations remain candidate evidence; accepted expectations are unchanged. |
| TC-PI-025 | Experience environment block | Relevant configured surface lacks runnable/inspection prerequisites | Result is `ENVIRONMENT-BLOCKED` with the missing capability, not PASS or N/A. |
| TC-PI-026 | Idempotent minimal setup | Minimal valid project is initialized twice | The second pass creates no unsupported config, spec, scan, or graph work and makes no unnecessary edits. |
| TC-PI-027 | Project-neutral skill content | Setup skill or reference is checked by residue validation | No consumer-specific project names, paths, or symbols are embedded in generic instructions. |
| TC-PI-028 | Skill structure | `project-init/SKILL.md` is updated | Frontmatter, Quick Summary, SYNC fences, and inline shared-protocol rules remain valid. |
| TC-PI-029 | Generic custom reference | A selected custom doc declares `scanTarget: "generic"` | Only its exact safe path is scanned; purpose/sections shape the evidence review; freshness and impact commands name that output. |
| TC-PI-030 | Manual custom reference | A selected custom doc omits `scanTarget` or declares `manual` | No automated scan, stale notice, or source-impact route claims to refresh it. |
| TC-PI-031 | Custom reference path escape | A filename/template path traverses its root or resolves outside by symlink | Config validation rejects lexical escapes and runtime resolution rejects physical escapes before read/write. |

## Verification Commands

Run the focused checks that cover changed setup behavior. In the framework source repository, the relevant suites include:

```bash
node .claude/hooks/tests/run-all-tests.cjs --filter=init-reference-docs
node .claude/hooks/tests/run-all-tests.cjs --filter=doc-impact-map
node --test .claude/scripts/tests/project-config-validation.test.mjs
node .claude/hooks/tests/run-all-tests.cjs --filter=project-protocol-drift
node .claude/skills/skill-creator/scripts/validate-skills.cjs --path .claude/skills/project-init
node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --only=tests,wf-cycle,sk-proto,residue,sdd
```

Run only suites and read-only verifiers present in the installed framework and relevant to the changed contract. Broader harness gates belong to the change plan; project initialization alone does not require unrelated full-suite work.
