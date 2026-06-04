# Workflow Spec Test Code Cycle Reference

> Project-Specific Workflow Extension for the local workflow sequence that keeps specs, tests, code, docs, and generated mirrors aligned.

Shared rules live in `shared/sdd-artifact-contract.md`. This file records only local workflow ordering, local commands, and local closure gates. It is read alongside `AGENTS.md` when Codex needs project-specific workflow context.

## 1. Local Workflow Sequence

Use this local workflow sequence when behavior, public contracts, specs, tests, docs, or generated prompt surfaces can change:

1. Identify the intended behavior and unchanged behavior to preserve.
2. Update the local spec or feature artifact through its configured owner.
3. Update test specifications or test fixtures that guard the behavior.
4. Implement code or documentation changes at the responsible layer.
5. Run targeted tests first, then the configured full verification command.
6. Refresh generated mirrors and indexes through their owning sync or scan command.
7. Run a fresh review after fixes when the active workflow requires it.

## 2. Local Artifact Owners

- Project config: `docs/project-config.json`
- Project docs index: `docs/project-reference/docs-index-reference.md`
- Codex context mirror: `.codex/CODEX_CONTEXT.md`
- Root instruction mirror: `AGENTS.md`
- Shared reusable contract: `shared/sdd-artifact-contract.md`

## 3. Local Closure Gates

Before closing a workflow:

- Required project-reference docs exist through the standard initialization path.
- Generated docs indexes and prompt mirrors are refreshed through scan or sync commands.
- Test fixtures used by committed tests are present in the repository.
- Targeted and full verification commands have observable output.

## 4. Local Extension Rule

Do not copy reusable workflow rules into this file. Add only local sequence details, configured commands, artifact ownership, and project-specific closure gates.
