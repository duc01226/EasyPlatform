# Project Spec Principles

## Quick Summary

**Goal:** Keep specifications precise about intent and traceable to real evidence by applying a project’s configured artifact profile without duplicating shared SDD rules.

**Summary:**

- Read the project config and select the native profile when present; otherwise use the strict default case model.
- Keep business intent, technical contracts, and evidence in their declared roles.
- Map every canonical case to its real executor and inspected assertion; preserve actual cardinality and conditionals.
- Apply shared M1-M7 and review requirements in either representation.

> **Shared SDD contract:** Profiles change representation and cardinality, not the applicable intent, invariant, evidence, execution, preservation, or review gates. MUST ATTENTION READ `.claude/skills/shared/sdd-artifact-contract.md` for the complete rules.

## 1. Profile Routing

Read and validate `docs/project-config.json` before writing or reviewing specs.

- With `specArtifacts`, use the configured section roles, logical identifier prefixes/grammars, ownership rule, and carrier roots/extensions/fields. Keep intent separate from explicitly classified contracts and evidence; unknown headings have no implicit role.
- Without `specArtifacts`, preserve the strict default: a single `TC-{FEATURE}-{NNN}` source of truth in the Feature Spec test section, with its intent, evidence, and configured test-mapping fields.
- A declared invalid profile is a configuration error. Stop affected spec work until corrected; never silently fall back to TC rules.
- Do not create a second registry beside an established native source. A configured representation does not waive M1-M7, business visibility, invariant/boundary/preservation coverage, actual execution, or review.

## 2. Local Authority and Source Routing

- Shared reusable rules: `.claude/skills/shared/sdd-artifact-contract.md`.
- Project paths, roots, commands, and reference docs come from `docs/project-config.json`; resolve the project-reference docs root from `docsRoots.projectReference.path`, then use its docs index.
- Canonical business root: `specRoots.business.path`; derived technical root: `specRoots.technical.path`. If either is unset, use the framework config loader's fallback. Follow each root owner and generator; never infer semantics from folder names.
- Feature shape: `workflowPatterns.featureDocTemplate` or the project-local feature-spec reference.

## 3. Local Prose and Evidence

### 3.1 Narrative and Evidence Carriers

Keep narrative focused on intent, user-observable outcomes, scope, constraints, and ownership. Keep implementation identifiers in explicit evidence carriers.

- With `specArtifacts`, use the declared scenario/case identity and carrier fields; preserve requirement, acceptance, variant, input, expected result, and status fields that the profile defines.
- Without a profile, use the strict default `Evidence: [Source: namespace/service/id]` and `CoveredBy` mapping. `IntegrationTest` is legacy migration input only. YAML frontmatter and diagrams remain structured carriers.
- Use stack-portable source anchors where the selected carrier supports them. Keep physical paths and line numbers in review/audit evidence unless project-local rules explicitly designate another carrier.
- Inspect the actual assertion or structured evidence row. An identifier match, passing aggregate, generated index, or file count alone does not prove a case executed.

### 3.2 Banned Prose Tokens

Apply the project’s banned-token rules only to the sections and prose areas named by its verifier. Evidence carriers remain governed by their declared format; do not broaden a ban to silence a legitimate configured carrier.

## 4. Local Test Mapping

Use the configured case/test format. Preserve the canonical owner and scenario/case identity plus each real variant identity; mapping can be many-to-many when the profile allows it. Every reported outcome must trace to an executor and assertion that actually reaches the case. Keep conditional criteria conditional until their precondition is satisfied and verified.

## 5. Generated Artifacts and Verification

Regenerate affected indexes, mirrors, dashboards, and technical views through their owning scan or sync command. Never hand-edit a generated projection.

Resolve cadence from an explicit project-local verification policy when one is declared. If none is declared, preserve the active framework skill or workflow default unchanged; this reference adds or removes no gate. Do not invent commands.

## 6. Local Extension Boundaries

Keep reusable semantic requirements in the shared contract. Keep local paths, lifecycle, identifier formats, evidence carriers, and verification commands in the project config and reference docs. Local extensions must not weaken shared gates.

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Keep specifications precise about intent and traceable to real evidence by applying a project’s configured artifact profile without duplicating shared SDD rules.

- MUST ATTENTION validate config first; follow configured roots, roles, IDs, and carrier fields, or the strict TC default when no profile exists.
- MUST ATTENTION keep intent distinct from technical contracts/evidence and resolve unknown headings explicitly.
- MUST ATTENTION preserve business visibility, invariant/boundary/preservation coverage, actual execution, and review requirements.
- MUST ATTENTION inspect the assertion, preserve identity/cardinality, and keep conditionals accurate; matching IDs are never execution proof.
