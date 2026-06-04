# Project Spec Principles

> Project-specific extension for local spec, test, and documentation rules.

This file records repository-local conventions only. Do not add reusable AI-SDD principles here; keep shared rules in `shared/sdd-artifact-contract.md`.

## 1. Local Authority

- Shared contract: `shared/sdd-artifact-contract.md`
- Local configuration: `docs/project-config.json`
- Local docs index: `docs/project-reference/docs-index-reference.md`
- Local workflow cycle reference: `docs/project-reference/workflow-spec-test-code-cycle-reference.md`

## 2. Local Source Routing

Use `docs/project-config.json` to discover project-specific paths, commands, and reference docs before writing or reviewing specs.

When a project defines custom spec, feature, or test locations, record those local paths in `docs/project-config.json` and refresh `docs/project-reference/docs-index-reference.md` through the docs index scan.

## 3. Local Prose Rules

### 3.1 Evidence Carriers

Implementation identifiers belong in evidence carriers only:

- `[Source: namespace/service/id]`
- `**Evidence:**`
- `**IntegrationTest:**`
- frontmatter
- diagrams

Narrative prose should describe business behavior, observable outcomes, local constraints, and ownership rules.

### 3.2 Banned Prose Tokens

Each project may add a local banned-token list when feature/spec prose risks leaking framework, product, language, persistence, messaging, auth, or project-internal implementation names.

The local banned-token list is enforced only where the project verifier says it applies. Evidence carriers remain allowed.

## 4. Local Evidence Format

Use stack-portable anchors in `[Source: ...]` fields. Physical paths and line numbers belong in review reports, provenance sidecars, or debugging notes, not in portable spec prose.

## 5. Local Test Mapping

When local feature docs contain test cases, use the project's configured test-case format and keep each case mapped to the behavior or invariant it guards.

## 6. Local Generated Artifacts

Generated indexes, dashboards, mirrors, and context files must be refreshed by their owning scan or sync command. Do not hand-edit generated outputs when a scan or sync path exists.

## 7. Local Extension Boundaries

Add local details here only when they name project paths, commands, ownership rules, configured doc locations, verifier commands, or repository-specific evidence formats.

## 8. Verification Commands

Record project-specific verification commands here when available:

- SDD verifier: configure in project tooling, then run before closing spec/doc sync work.
- Docs index: refresh through the docs index scan after adding or removing project-reference docs.
- Context mirror: run the configured context sync after changing generated prompt surfaces.
