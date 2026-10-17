# `/docs-manager --mode=init` — reference-doc initialization reference

Read this full contract for explicit `/docs-manager --mode=init`: initialize or reconcile the selected reference-doc set through applicable `scan` targets. It takes no other arguments.

## Quick Summary

**Goal:** Initialize or reconcile project reference documentation from optional validated project config, the repository's actual capabilities, and the configured document selection.

**Summary:** Validate optional config → resolve always-on inputs and exact doc selection → identify placeholders → select applicable owners → scan and verify results → report. Preserve curated docs and native spec formats.

**Workflow:**

1. **Validate** -- Resolve optional config and validate it when present.
2. **Resolve** -- Separate project-init-owned always-on inputs from task-specific reference docs; resolve the effective selection.
3. **Select** -- Resolve selected built-in targets, explicitly generic custom targets, and manual custom docs; check capability evidence where a built-in target defines one.
4. **Populate** -- Run only applicable selected scans, then verify each changed or unchanged result.

**Key Rules:**

- `docs/project-config.json` (or its configured path) is OPTIONAL; absent config uses portable defaults and repository evidence. Present config needs a non-empty `project.name`; omitted capabilities use neutral defaults or evidence-backed skips.
- A declared but malformed or incomplete config section fails visibly. Repair it through `project-init` / `project-config` before scanning; do not infer replacement values.
- Let the configured docs owner create placeholders; do not hand-create generated scan output.
- The built-in target list is an option catalog, not a required document floor. Scan only a selected, applicable target.
- `lessons.md` and `docs-index-reference.md` are project-init-owned always-on inputs; they are ensured independently from the task-specific `referenceDocs` selection.

Ground claims in traced evidence; confidence >80% to act, otherwise verify first.

## Step 1: Validate Project Config

Read the configured project-config path through `.claude/hooks/lib/project-config-loader.cjs` (default `docs/project-config.json`) and confirm its status is `valid`. The minimum valid shape is:

```json
{ "project": { "name": "Project name" } }
```

If the file is absent, use portable defaults and repository evidence without creating config solely to scan. If it is invalid, report the schema errors and repair through the config workflow. Do not continue with guessed stack, spec, test, UI, or architecture facts.

## Step 2: Resolve Always-On and Task-Specific Docs

Project initialization owns the always-on `lessons.md` and docs-index inputs. Confirm they exist at their configured owner paths; repair them through `project-init` if absent or stale. They are not added to the task-specific selection.

For task-specific docs, use the resolved `referenceDocs` selection from `.claude/hooks/lib/session-init-helpers.cjs`:

- If the property is absent, the resolver supplies the portable baseline plus only capability-supported docs.
- If it is an array, that selection is exact, including `[]`; never append the full registry or infer extra docs.
- `docsRoots.projectReference.path` in `docs/project-config.json` relocates the reference-doc directory (default `docs/project-reference/`).
- A custom doc is declared in `referenceDocs` with required `filename` and `purpose`, and optional `sections`, `templatePath`, and `scanTarget`. The filename is relative to the configured reference-doc root; `templatePath` is project-relative. Both paths use safe POSIX-relative segments and runtime containment checks.
- Built-in filenames use only the exact framework-owned target in `scan/references/targets.md`. A custom doc defaults to manual ownership; `scanTarget: "generic"` opts it into `/scan --target=generic-reference-doc --filename="<filename>"`. Never infer a built-in scanner from a basename.

Compare only selected task-specific docs plus the two always-on inputs against the resolved reference-doc root. Do not treat the target manifest or helper registry as a required-document floor.

## Step 2: Detect Placeholder vs Populated

Read the first 512 bytes of each selected file. If it contains the placeholder sentinel, it needs its applicable scan or template owner. A missing optional capability doc is not a failure when it is unselected or unsupported by config/repository evidence.

## Step 3: Select Applicable Scans

Read the target manifest and resolve each selected task-specific doc by exact filename and configured `scanTarget`. Before launching a built-in target, [BLOCKING] read the head of its own file `.claude/skills/scan/references/targets/<key>.md` (its `applies when` and `skip when` lines) and verify that applicability using project config and repository evidence. A target entry is not proof that the project uses that stack or capability. Generic scans use the selected doc's `purpose` and optional `sections`; manual docs are initialized if absent but are not auto-scanned or freshness-tracked.

- Run clearly applicable selected scans without a routine user-choice gate.
- Record `SKIPPED` with the checked config/repository evidence when a selected target's capability is absent.
- Report custom manual docs as owner-managed; do not route them to a nearby built-in target.
- Ask only when real evidence conflicts or the owner/format cannot be determined safely. If no selected scan applies, report that result and stop without fabricating a document.

For each applicable target, invoke its registered built-in command or the exact generic command (for example, `/scan --target=backend-patterns` or `/scan --target=generic-reference-doc --filename="guides/architecture.md"`).

## Step 4: M1-M5/M7 Compliance Gate (BLOCKING)

Apply the shared SDD quality contract only when the selected scan produces or updates a project spec artifact or spec-specific reference. Resolve `specArtifacts` and `specRoots` from the valid project config first:

- A valid native `specArtifacts` profile owns its section roles, identifiers, and evidence carriers. Preserve its native format and trace intent to executable assertions.
- If `specArtifacts` is absent, use the portable strict-default spec contract. Do not apply its section names or ID prefixes to a declared native profile.
- A declared malformed profile is a configuration error; stop and repair it rather than guessing a fallback.
- Apply tech-agnostic/business-visibility rules only to artifact locations governed by the local spec policy, not every project-reference document. Keep claims testable, observable, and evidence-backed under the project's actual contract.

Run the exact verifier declared by the project/framework contract and resolve failures before reporting completion. Do not invent a verifier command; report when none is configured or applicable.

The project config schema owns accepted properties; `.claude/hooks/lib/session-init-helpers.cjs` resolves selection and templates.

---

> **[IMPORTANT]** Track multi-target initialization as small tasks with a final consistency review. Do not interrupt an otherwise clear initialization to ask which applicable configured scans to run.

## Closing Reminders

**Goal:** Initialize or reconcile selected reference documentation through its applicable owners.

**MUST ATTENTION Main steps:** validate optional config → resolve always-on inputs and exact selection → identify placeholders → select applicable scans → populate and verify → report.

- Preserve exact selection, capability gates and curated-document ownership; do not hand-create generated scan output.
- Repair malformed declarations through their owner; do not invent a verifier command or unsupported project facts.
- Track tasks before acting, cite `file:line` evidence (confidence >80% to act), and finish with a consistency review.
