# Spec System Reference

> Project-specific extension for local spec routing and ownership. Shared AI-SDD principles live in `shared/sdd-artifact-contract.md`; keep this file focused on local paths, owners, fixed spec root, and generated-artifact rules.

## Quick Summary

Use this file to answer where specs live, which artifact is canonical, where test cases are stored, and which generated spec aids are safe to refresh.

## 1. Fixed Spec Root

Primary config source: `docs/project-config.json`.

- Feature/spec root: `docs/specs/`
- Feature template: `workflowPatterns.featureDocTemplate`

When this `.claude` folder is copied to a new project, keep the portable `docs/specs/` root unless the runtime loader and project reference docs are intentionally changed together.

## 2. Canonical Artifact

One capability should have one canonical Feature Spec under the fixed spec root:

```text
docs/specs/{Bucket}/README.{FeatureName}.md
```

The Feature Spec is the business-facing source of truth. Code is the technical source of truth. Do not create a parallel engineering-spec tree unless the runtime loader and project reference docs are intentionally changed together.

## 3. Test Case Registry

Test cases live in the Feature Spec's Test Specifications section.

Default TC format:

```text
TC-{FEATURE}-{NNN}
```

Keep each TC mapped to the business rule, invariant, or observable outcome it protects.

## 4. Derived Artifacts

Indexes, ERDs, dashboards, reimplementation guides, and mirrors are derived aids. They must be regenerated from canonical Feature Specs or source code through their owning scan/sync command.

Do not hand-maintain derived outputs as a second source of truth.

## 5. Required Companion Docs

Read these together when the task touches specs, test cases, or behavior-changing work:

- `docs/project-reference/feature-spec-reference.md` — Feature Spec structure and authoring rules
- `docs/project-reference/spec-principles.md` — spec quality, evidence, and tech-agnostic prose rules
- `docs/project-reference/workflow-spec-test-code-cycle-reference.md` — local sequence for keeping specs, tests, code, docs, and generated mirrors synchronized
- `docs/project-reference/docs-index-reference.md` — project doc router

## 6. Local Extension Rule

Add only project-specific paths, owners, formats, and generated-artifact conventions here. Put reusable AI-SDD rules in `shared/sdd-artifact-contract.md` and sync generated mirrors through the configured sync command.
