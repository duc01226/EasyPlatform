# Workflow Spec Test Code Cycle Reference

## Quick Summary

**Goal:** Keep specifications, tests, implementation, and generated docs aligned with intended behavior while preserving the project's declared artifact model and verification policy.

**Summary:**

- Resolve the canonical spec owner and valid project profile; use the strict TC/Section 8 default only when no native profile is declared.
- Carry intended and preserved behavior through spec, test, and code changes without creating a second case registry.
- Verify actual assertions and apply the local verification policy when declared; otherwise preserve the active framework workflow default.
- Refresh affected generated outputs, complete required reviews, and report evidence and unresolved gaps.

> **Shared SDD contract:** Representation may vary by project profile, but intent, invariant, evidence, execution, preservation, and review obligations remain. Read `.claude/skills/shared/sdd-artifact-contract.md` for the full contract.

## 1. Resolve the Artifact Model

Read the project configuration and required local references before changing specifications, tests, or behavior.

- With a valid `specArtifacts` profile, use its business root, section roles, identifiers, ownership, and evidence carriers.
- Without that profile, use the framework's strict business-spec default: canonical `TC-{FEATURE}-{NNN}` cases in Section 8 with their required evidence and test mapping.
- A declared invalid profile is a configuration error. Stop affected work until it is corrected; do not silently fall back to the default.
- Resolve unknown headings explicitly. Never create a parallel registry beside the canonical case owner.

## 2. Keep Spec, Test, and Code in Sync

1. State the intended behavior, preserved behavior, invariant, and canonical owner; follow the project's configured lifecycle.
2. Record changed requirements, acceptance conditions, and scenarios in the configured native carriers, or update the strict-default cases when no profile is declared.
3. Update test specifications or fixtures that guard changed behavior. Map each case to the real test or approved evidence carrier; preserve owner, case, variant, and conditional identity. One aggregate result proves only the rows whose assertions actually execute.
4. Implement at the layer that owns the invariant. Keep code and tests aligned with the canonical contract; when documenting existing behavior, verify source and tests before changing the spec.

## 3. Verify and Reconcile

Inspect the assertions and evidence that support each reported outcome. An identifier match, generated index, aggregate pass, or file count alone does not prove execution; unresolved coverage remains `UNKNOWN` or blocked, never passed.

Resolve verification commands and cadence from an explicit project-local policy when one is declared. If none is declared, preserve the active framework skill or workflow default unchanged. A command's presence in configuration alone does not require it for every change.

## 4. Artifact Ownership and Closure

Keep reusable principles in the shared contract; this reference supplies only local workflow extensions. Confirm required project references resolve through the configured initialization route and test fixtures used by committed tests are present in the repository.

Refresh only affected generated indexes, mirrors, and technical views through their owning generator; never hand-edit generated output. Review the canonical spec, tests, implementation, and docs together, and repeat required reviews after fixes. Report the checks run, changed outputs, failures, and remaining gaps.

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Keep specifications, tests, implementation, and generated docs aligned with intended behavior while preserving the project's declared artifact model and verification policy.

- MUST ATTENTION resolve the canonical owner and valid profile first; use the strict TC/Section 8 default only when no native profile is declared.
- MUST ATTENTION carry intended and preserved behavior through spec, test, and code changes without creating a second registry.
- MUST ATTENTION map cases to inspected assertions, preserve identity and conditionals, and never report unknown coverage as passed.
- MUST ATTENTION follow explicit local verification policy or preserve the active workflow default; refresh affected outputs, complete required reviews, and report evidence and gaps.
