# Spec System Reference

## Quick Summary

**Goal:** Route each specification to its canonical configured owner and test carrier, while keeping portable format defaults conditional on the absence of a native profile.

**Summary:**

- Resolve spec roots and artifact format independently from `docs/project-config.json`.
- With `specArtifacts`, use configured section roles, identifiers, and carriers; without it, retain the strict default TC model.
- Keep one canonical business owner per capability; generated technical views remain derived outputs.
- Preserve shared semantic, invariant, evidence, execution, and review gates in every format.

> **Shared SDD contract:** A representation profile changes formats and cardinality only; it does not waive applicable quality or proof obligations. MUST ATTENTION READ `.claude/skills/shared/sdd-artifact-contract.md` for the complete contract.

## 1. Profile and Root Resolution

Read and validate `docs/project-config.json` before authoring, reviewing, or routing specs.

- `specRoots` determines paths independently of `specArtifacts`. If either root has no configured `path`, use the framework config loader's fallback for that root.
- A declared business or technical root object requires `path`. `authorship` and `m1Policy` are optional metadata fields; if a consumer relies on them, resolve its requirements from that consumer and the project references instead of inferring semantics from a folder name.
- `workflowPatterns.featureDocTemplate` selects the feature-spec template. The strict default format does not establish a universal path or filename for projects with a configured native format.
- When `specArtifacts` is present, it selects configured `intent`, `contracts`, and `evidence` headings, logical identifier prefixes/grammars, ownership, and supported carrier roots/extensions/field mappings. A `yaml-cases-v1` carrier may set `acceptedStatuses` to its local lifecycle value(s); existing profiles that omit it keep the compatibility default `approved`. An observed value outside the configured set is UNKNOWN, never a successful omission.
- A malformed declared profile is a configuration error. Report it and stop affected spec work until corrected; NEVER reinterpret it as the default TC format.
- Shared M1-M7 and all applicable intent, invariant/property, boundary, preservation, evidence, execution, and review requirements remain in force. A profile adapts representation and cardinality only.

## 2. Canonical Ownership

Keep one canonical business owner for each capability under the configured business root. Code is the technical source of truth; the canonical spec owns intended business behavior. Do not create a parallel authored spec tree.

Use the configured feature template or local spec system for artifact shape. Only when no native `specArtifacts` profile exists does the strict default use:

```text
<business-spec-root>/{Bucket}/README.{FeatureName}.md
```

The exact post-root path grammar in that default does not apply to an adopter whose configured template declares another structure.

A generated technical root is a derived view, not another authored business tree. Use its configured generator and ownership rules; never hand-edit generated files or treat them as canonical requirements.

## 3. Test and Scenario Identity

**Strict default only — when `specArtifacts` is absent:** test cases live in the Feature Spec Test Specifications section and use `TC-{FEATURE}-{NNN}`. Map each case to the business rule, invariant, or observable outcome it protects.

**Configured profile:** use `specArtifacts.identifiers` and the declared carrier dialects. Read each carrier's roots, extensions, field mapping, and configured YAML `acceptedStatuses`; preserve its scenario/case and variant identity. Do not add a parallel Section 8 or TC registry to an established native format.

A matching ID, file count, or generated index is not execution evidence. Trace each reported outcome to a real test/assertion or an explicitly supported manual-QC carrier; keep conditional criteria unexecuted until their preconditions are verified.

## 4. Derived Artifacts

Indexes, ERDs, dashboards, reimplementation guides, mirrors, and technical-spec trees are derived aids. Regenerate an affected output from its canonical source using the owning scan/sync command. Do not hand-maintain a projection as a second source of truth.

## 5. Companion References

Read the project-reference docs root from `docsRoots.projectReference.path` and follow its docs index. Load the feature-spec, principles, and workflow-cycle references required by the task; read source specs from the configured business root.

## 6. Local Extension Rule

Keep reusable semantic rules in the shared SDD contract. Keep project-specific roots, templates, identifiers, carriers, lifecycle, commands, and owners in project configuration and project-reference docs. A profile does not authorize weakening shared gates.

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Route each specification to its canonical configured owner and test carrier, while keeping portable format defaults conditional on the absence of a native profile.

- MUST ATTENTION resolve roots, templates, profile roles, IDs, and carriers from validated project configuration.
- MUST ATTENTION preserve one canonical business owner and keep technical views derived and single-writer.
- MUST ATTENTION use TC/Section 8 only for the strict default; a configured profile owns its declared identities and carriers.
- MUST ATTENTION preserve shared quality gates and inspect actual assertions; a matching ID is never proof that behavior ran.
