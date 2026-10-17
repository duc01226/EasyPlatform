# Scan Target: code-review-rules

> One entry of the scan target registry — index, selection rules, path roots and the custom-doc contract are in `../targets.md` (read it first). The `$scan --target=code-review-rules` host (`../../SKILL.md`) loads this file for that run only.

- **doc:** `<ref>/code-review-rules.md`
- **applies when:** project source and at least one real quality signal exist (tests, lint/format/type checks, CI, architecture rules, or code-quality-review docs).
- **skip when:** no code or project-owned quality signal exists from which local review guidance can be evidenced.
- **description:** `[Documentation] Use when recording project-specific code-review checks and evidence-backed quality rules.`
- **sub-agents:** up to 3 conditional branches — server/data code, UI/client code, and cross-cutting architecture/quality controls. Route only branches evidenced by the project; no language or app type is assumed.

### Phase 0 detection — source scope, quality signals, and mode

Read the selected doc/template and valid project config. In Sync mode preserve its local sections, then compare their rules to current source, tests, CI, configuration, and quality tooling.

- Discover languages/modules and quality signals from all actual project manifests, source roots, tests, CI, linters/formatters/type checks, scanners, standards docs, git hooks, and project-owned review rules. Tool names here are search examples only.
- Route conditional analysis to server/data, UI/client, infrastructure, or other project areas only when those sources exist. Cross-cutting quality tooling and architecture are included when evidenced.

**Evidence gate:** If a quality signal or area is uncertain, include only verified rules, record `UNKNOWN` where relevant, and ask only when the unresolved scope changes required output and repository evidence cannot settle it.

### Sub-agent Think scopes

**Agent 1: Server & Data Rules** (when present)
- **Think:** Which rules govern server-side behavior, persistence, error handling, configuration, and data ownership in this project?
- Scan targets: actual request/handler patterns; validation and errors; data access, transactions, and schema changes; dependency/configuration practices; logging and security controls. Do not assume a language, DI container, framework, or layer model.

**Agent 2: UI & Client Rules** (when present)
- **Think:** Which local conventions make this project's user-facing code reliable, accessible, and maintainable?
- Scan targets: observed view/component boundaries, state/data flow, input behavior, styling, accessibility, performance, and cleanup where relevant. Derive patterns from the actual platform and documented standards.

**Agent 3: Cross-Cutting Quality & Architecture** (when present)
- **Think:** What boundaries and quality checks does the project actually enforce, and which failures do they prevent?
- Scan targets: dependency boundaries, module/service communication when present, shared-code ownership, testing conventions, security controls, build/release checks, and configuration/secret handling. Distinguish executable sensors and CI gates from prose guidance.

### Target Sections

| Section | Content |
| --- | --- |
Use the selected project's declared sections. If none are declared, group verified review rules by actual source area and quality gate, distinguish required checks from recommendations, and include observed defects only when found. Do not require backend/UI/architecture sections or a fixed number of rules for projects that do not have those surfaces.

### Content Rules / exceptions
- Ground every rule in project-owned source, configuration, CI, a test/sensor, an ADR, or an authoritative project document. Cite the actual path and relevant lines.
- Add examples only when they clarify a non-obvious rule. Label inferred examples; never present hypothetical anti-patterns as observed violations.
- Prioritize checks by impact and the project’s declared quality goals. Standard `output-quality-principles` applies.

### Special slivers
- Confirm the selected project source areas and quality signals before routing; unknown languages can still contribute verified rules.
- Delegate only independent branches that have evidence and a meaningful scope.
- Fresh-eyes verification confirms every rule's owner and verifies all cited code/config/check paths. Observations with limited evidence stay qualified, not generalized into a mandatory convention.
- Keep observed violations separate from standards and quality gates; this target documents guidance and does not rewrite tests/configuration.

### Anti-Rationalization rows

| Evasion | Rebuttal |
| --- | --- |
| "The repository is an unfamiliar language, skip it" | Discover its manifests and source roots; record only what evidence supports |
| "This style rule is universal, so local evidence is unnecessary" | Distinguish a portable best-practice baseline from the project's enforced convention |
| "A likely anti-pattern belongs in the violations list" | Report observed violations only with concrete source evidence |
| "Round 2 review not needed" | Main agent rationalizes own decisions. Fresh sub-agent is non-negotiable. |
| "Doc has content, skip re-read" | Show section list extracted from doc as proof of re-read |

### prompt-enhance
`$prompt-enhance <ref>/code-review-rules.md`
