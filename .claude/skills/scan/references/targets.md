# Scan Targets Registry

> The `/scan --target=<key>` host (`../SKILL.md`) reads this index plus ONE target file, `targets/<key>.md`, per run. Each target file is the single source of truth for that scan: doc path, applicability gate, sub-agent count + roles, Phase-0 detection tables, verbatim sub-agent Think scopes, output Target Sections, Content-Rule exceptions, target-unique Special slivers, and the target-specific Anti-Rationalization rows. The shared 4-phase engine + SYNC blocks live ONCE in the host body — the target files carry only the per-target DATA.

> **Portability rule:** Host-owned instruction files keep their native skill-invocation prefix. Content written into shared generated project docs MUST instead use bare skill names without a host-specific prefix, unless it explicitly documents every supported host syntax.

**Registered keys:** `project-structure` · `backend-patterns` · `frontend-patterns` · `scss-styling` · `design-system` · `code-review-rules` · `domain-entities` · `feature-spec` · `docs-index` · `e2e-tests` · `integration-tests` · `performance-tests` · `seed-test-data` · `ui-system`. `generic-reference-doc` is a reserved dynamic target described below. These targets form an optional capability catalog, not a list of scans every project should run.

## Shared quality and output ownership

Target Sections are evidence lenses, not a requirement to fill every heading or emit every discovery. Keep audit/coverage details in temporary reports unless they change correct action or a verified consumer requires them. Template defaults are scaffolds; trace local consumers before changing existing headings, anchors, frontmatter, registry headers or rows. Curated documents keep their declared owner and are not automatically rewritten.

## Selection and Applicability

- `docs/project-config.json` (or its configured path) is OPTIONAL. With no config, scan on the portable defaults and repository evidence — do not refuse to scan. When present it must be schema-valid with a non-empty `project.name`; omitted capability properties use neutral defaults or skip that capability, while a DECLARED invalid section blocks scanning of that capability (its author made it authoritative, so a silent default would mis-scan).
- Resolve `referenceDocs` through `.claude/hooks/lib/session-init-helpers.cjs`. When absent, a minimal project with no evidenced capabilities resolves to no task-specific docs and only evidence-supported capabilities add docs. An explicit array, including `[]`, is the exact task-specific selection.
- The always-on `lessons.md` and docs-index inputs are ensured by project initialization outside this task-specific selection. Do not add them to the selection or use them as evidence that a code capability exists.
- For each selected task-specific document, match its filename exactly to one built-in `doc` in the Target Registry table below. Custom `referenceDocs` entries can declare `filename`, `purpose`, optional `sections`, `templatePath`, and `scanTarget`. A custom doc defaults to manual ownership; only `scanTarget: "generic"` opts it into the evidence-based dynamic scanner. Built-in docs keep their framework-owned target.
- Each target's `applies when` and `skip when` lines define its portable evidence gate. Explicit selection requests the check but does not replace capability evidence. A missing capability is `SKIPPED` with the config/source evidence checked; it is never filled by generic example code.
- Configured paths and framework names are search hints that must be verified in repository sources. Do not infer architecture, test lanes, domain concepts, or design-system ownership from dependencies, empty folders, filenames, or target names alone.

## Dynamic Target: generic-reference-doc

Use `/scan --target=generic-reference-doc --filename="<relative-path>"` only when that exact filename is selected in `referenceDocs` with `scanTarget: "generic"`. A custom entry without `scanTarget`, with `scanTarget: "manual"`, or outside the resolved selection is not scannable. Custom paths use project-relative POSIX segments beneath `<ref>/`; reject traversal, absolute paths, backslashes, and physical symlink escapes.

The selected entry's `purpose` defines the question the reference should answer; its optional `sections` define the requested headings. If no sections are configured, derive a small neutral outline from the purpose and evidence rather than importing another target's template. Inspect only sources that answer that purpose, record unknowns explicitly, and describe observed practices and trade-offs without requiring a particular language, framework, architecture, testing model, or styling system. Write only the configured output file, using the shared no-op stamp guard and normal scan evidence rules. Generic docs are conservatively impact-routed after non-disposable repository changes because the config does not declare a narrower source scope; choose `manual` when the project owner wants curated updates without automatic scan/freshness claims.

**Path roots used throughout the target files.** Every `**doc:**` output path, `/prompt-enhance` argument, glob and probe below is written against one of these two roots — resolve the root FIRST, then compose:

- `<ref>/` = the project-reference docs root — default `docs/project-reference/`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path. Resolve: `node -e "console.log(require('./.claude/hooks/lib/project-config-loader.cjs').getDocsRoot('projectReference'))"`. Built-in targets own only their declared output filenames; project-config may also declare custom filenames, but does not map them to a built-in scan.
- `<specs>/` = the business/feature spec root — default `docs/specs/`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path. Resolve: `node -e "console.log(require('./.claude/hooks/lib/project-config-loader.cjs').getSpecDocsPath())"`.

**Confidence vocab note:** most targets use sub-agent confidence tiers `>80% document / 60-80% "observed (unverified)" / <60% omit`. `code-review-rules` instead classifies rules HIGH / MEDIUM / LOW. `domain-entities` uses %-based thresholds. Honor the per-entry vocab.

---

## Target Registry — read the row, then ONLY that file

| Key | Output doc (`<ref>/` = reference-docs root) | Target file (MANDATORY read for `--target=<key>`) |
| --- | --- | --- |
| `project-structure` | `<ref>/project-structure-reference.md` | `targets/project-structure.md` |
| `backend-patterns` | `<ref>/backend-patterns-reference.md` | `targets/backend-patterns.md` |
| `frontend-patterns` | `<ref>/frontend-patterns-reference.md` | `targets/frontend-patterns.md` |
| `scss-styling` | `<ref>/scss-styling-guide.md` | `targets/scss-styling.md` |
| `design-system` | `<ref>/design-system/README.md` | `targets/design-system.md` |
| `code-review-rules` | `<ref>/code-review-rules.md` | `targets/code-review-rules.md` |
| `domain-entities` | `<ref>/domain-entities-reference.md` | `targets/domain-entities.md` |
| `feature-spec` | `<ref>/feature-spec-reference.md` | `targets/feature-spec.md` |
| `docs-index` | `<ref>/docs-index-reference.md` | `targets/docs-index.md` |
| `e2e-tests` | `<ref>/e2e-test-reference.md` | `targets/e2e-tests.md` |
| `integration-tests` | `<ref>/integration-test-reference.md` | `targets/integration-tests.md` |
| `performance-tests` | `<ref>/performance-test-reference.md` | `targets/performance-tests.md` |
| `seed-test-data` | `<ref>/seed-test-data-reference.md` | `targets/seed-test-data.md` |
| `ui-system` | _(none of its own)_ — selected children write their own configured target docs. | `targets/ui-system.md` |

Each target file opens with its entry header — `doc`, `applies when`, `skip when`, `description`, `sub-agents` — so a caller that only needs an applicability gate (for example `scan-all`, `docs-manager --mode=init`) reads that head, never the whole file. `generic-reference-doc` has no target file: its contract is the Dynamic Target section above.
