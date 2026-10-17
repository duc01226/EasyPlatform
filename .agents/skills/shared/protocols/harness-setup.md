> **Harness Engineering** — An outer agent harness has two jobs: raise first-attempt quality + provide self-correction feedback loops before human review.
>
> **Controls split:**
>
> | Axis        | Type          | Examples                                                                      | Frequency        |
> | ----------- | ------------- | ----------------------------------------------------------------------------- | ---------------- |
> | Feedforward | Computational | `.editorconfig`, strict compiler flags, enforced module boundaries            | Always-on        |
> | Feedforward | Inferential   | `CLAUDE.md` conventions, skill prompts, architecture notes, pattern catalogs  | Always-on        |
> | Feedback    | Computational | Linters, type checks, selected architecture tests, fault/mutation checks where useful, CI gates | Local/commit → CI |
> | Feedback    | Inferential   | `$code-quality-review` skill, `$production-readiness-review`, `$security-audit`, LLM-as-judge passes         | Post-commit → CI |
>
> **Test-strength evidence — protect intent, choose signals by risk and fit.** Line coverage is a diagnostic: low coverage can reveal untested areas, while high coverage does not prove assertions protect behavior. Do not make a mutation score, property-test tool, or manual defect-seeding exercise a universal build gate. For important or high-risk invariants, choose useful evidence supported by the project's stack and budget: assertion-intent review, targeted mutation/fault injection, property/metamorphic checks, contract checks, or a focused defect-seeding probe. If a sensor is automated, gate only on a meaningful threshold the team can maintain; record what it proves and its limits. See `SYNC:engineering-foundation-gate` **F4** for the profile-aware foundation check.
>
> **Three harness types:**
>
> 1. **Maintainability** — Complexity, duplication, line-coverage (diagnostic only — never a gate), style. Easiest: rich deterministic tooling.
> 2. **Architecture fitness** — Module boundaries, dependency direction, performance budgets, observability conventions, and **build scalability** (an unchanged module is not rebuilt; the affected-only set is computable because dependencies are declared; cache hit-rate is measured, not assumed). Build scoping belongs here because it is enforced by the same boundary declarations — unenforced boundaries decay until the affected set is "everything".
> 3. **Behaviour** — Functional correctness. Assert important owned outcomes; add mutation, property, contract, or change-coverage sensors when their benefit and tool support justify them. Line coverage stays a diagnostic.
>
> **Keep quality left:** pre-commit sensors fire first (cheap), CI sensors fire second, post-review last (expensive).
>
> **Research-driven:** Never hardcode tool choices. Detect tech stack → research ecosystem → present top 2-3 options → user decides. Enforce strictest defaults; loosen only with explicit approval.
>
> **Harnessability signals:** Strong typing, explicit module boundaries, opinionated frameworks = easier to harness. Treat these as greenfield architectural choices, not just style preferences.
