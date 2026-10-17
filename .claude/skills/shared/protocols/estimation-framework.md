> **Estimation Framework** — Bottom-up; derive EP; min-max range at likely ≥3d. Stack-agnostic baseline: 3-5yr dev, 6 productive hrs/day; AI assumes Claude Code + project context.
>
> **Method:**
>
> 1. **Blast Radius pass** below — code AND test cost
> 2. Decompose phases → hours/phase → `bottom_up_hours = Σ phase_hours`
> 3. `likely_days = ceil(bottom_up_hours / 6) × productivity_factor`
> 4. Sum **Risk Margin** (base + add-ons) → `max_days = likely_days × (1 + margin)`
> 5. `min_days = likely_days × 0.9`
> 6. Range at `likely_days ≥3`; point allowed `<3`; always record margin
> 7. `man_days_ai` = same range × AI speedup
> 8. Derive `effort_points` from `likely_days` via EP-Days; NEVER driver. >50% disagreement → trust bottom-up
>
> **Existing estimates:** Read `effort_points` first; when absent, reuse an existing authored `story_points` value. Preserve historical metadata and commits. New artifacts write `effort_points` and use EP labels.
>
> **Productivity factor:** 0.8 strong scaffolding+codegen+AI hooks · 1.0 mature default · 1.2 weak patterns · 1.5 greenfield
>
> **Cost driver (BEFORE work-type row):**
>
> - **UI dominates** in CRUD/business apps — 1.5-3x backend (states, validation, responsive, a11y, polish)
> - **Backend dominates ONLY:** multi-aggregate invariants, cross-service contracts, schema migrations, heavy query/perf, new event flows
>
> **Reuse-vs-Create axis (PRIMARY lever, per layer):**
>
> | UI tier | Cost |
> | --- | --- |
> | Reuse component on existing screen | 0.1-0.3d |
> | Add control/column to existing screen | 0.3-0.8d |
> | Compose components into NEW screen | 1-2d |
> | NEW screen, custom layout/states/validation | 2-4d |
> | NEW shared/common component (themed, tested) | 3-6d+ |
>
> | Backend tier | Cost |
> | --- | --- |
> | Reuse query/handler from new place | 0.1-0.3d |
> | Small update existing handler/entity | 0.3-0.8d |
> | NEW query on existing repo/model | 0.5-1d |
> | NEW command/handler on existing aggregate (additive) | 1-2d |
> | NEW aggregate/entity (repo, validation, events) | 2-4d |
> | NEW cross-service contract OR schema migration | 2-4d each |
> | Multi-aggregate invariant / heavy domain rule | 3-5d |
>
> **Rule:** Sum UI+backend+test tiers; apply productivity factor; call out reuse shortcuts.
>
> **Test scope:** Compute `test_count` explicitly by driver; never hand-wave "+tests".
>
> | Driver | Count |
> | --- | --- |
> | Happy-path journeys | 1 per story / AC main flow |
> | State-machine transitions | reachable transitions × allowed actors |
> | Multi-entity state combos | state(A) × state(B) — REACHABLE only, not Cartesian |
> | Authorization matrix | (owner, non-owner, elevated, unauth) × each mutation |
> | Validation rules | 1 per required field / boundary / format / cross-field |
> | UI states (per new screen/dialog) | happy, loading, empty, error, partial — present only |
> | Negative paths / invariants | 1 per violatable business rule |
>
> | Test tier (Trad, incl. setup+assert+flake) | Cost |
> | --- | --- |
> | 1-5 cases, fixtures reused | 0.3-0.5d |
> | 6-12 cases, 1 new fixture | 0.5-1d |
> | 13-25 cases, multi-entity setup | 1-2d |
> | 26-50 cases OR new state-machine coverage | 2-3d |
> | >50 cases OR full E2E journey | 3-5d |
>
> **Test multipliers:** new fixture/seed harness +0.5d · cross-service/bus assertion +0.3d each · UI E2E ×1.5 · each new role +1-2 cases
>
> **Blast Radius (mandatory; code AND tests):**
>
> 1. Count directly modified files/components
> 2. Count complex touches (>500 LOC, multi-handler, central, frequently-modified)
> 3. List downstream callers, event subscribers, cross-service consumers
> 4. Shared/common multi-app touch — yes/no
> 5. Regression scope — areas needing re-test
>
> **Rule:** Complex touch → `risk_factors`; each downstream consumer → +1-3 regression cases; >5 areas OR >2 complex → reconsider SPLIT before estimating.
>
> **Risk Margin (drives max bound):**
>
> | likely_days | Base margin |
> | --- | --- |
> | <1d trivial | +10% |
> | 1-2d small additive | +20% |
> | 3-4d real feature | +35% |
> | 5-7d large | +50% |
> | 8-10d very large | +75% |
> | >10d | +100% AND **flag SHOULD SPLIT** |
>
> **Additive risk factors — enumerate in `risk_factors`:**
>
> | Factor | +margin |
> | --- | --- |
> | `touches-complex-existing-feature` (>500 LOC, multi-handler, central) | +20% |
> | `cross-service-contract` change | +25% |
> | `schema-migration-on-populated-data` | +25% |
> | `new-tech-or-unfamiliar-pattern` | +30% |
> | `regression-fan-out` (≥3 downstream areas re-test) | +20% |
> | `performance-or-latency-critical` | +20% |
> | `concurrency-race-event-ordering` | +25% |
> | `shared-common-code` (multi-consumer/multi-app) | +25% |
> | `unclear-requirements-or-design` | +30% |
>
> **Collapse:** margin >100% → STOP/split, never pad past 2x. Margin <15% at `likely_days ≥5` → widen.
>
> **Work-Type Caps (hard ceilings on `likely_days`):**
> | Work type | Max EP | Max likely |
> | --- | --- | --- |
> | Single field / config flag / style fix | 1 | 0.5d |
> | Add property to existing model + bind to existing UI | 2 | 1d |
> | **Additive endpoint + minor UI control** (button/menu/column), reuses fixtures | **3** | **2-3d** |
> | Additive endpoint + **NEW UI surface** OR additive multi-layer + new domain rule + 2+ test files | 5 | 3-5d |
> | NEW model/aggregate OR migration OR cross-module contract OR heavy test (>1.5d) OR NEW UI + non-trivial backend | 8 | 5-7d |
> | NEW UI surface + (NEW aggregate OR migration OR cross-service contract) | 13 | SHOULD split |
> | Cross-service contract + migration combined | 13 | SHOULD split |
> | Beyond | 21 | MUST split |
>
> **EP→Days (validation only):** 1=0.5d/0.25d · 2=1d/0.35d · 3=2d/0.65d · 5=4d/1.0d · 8=6d/1.5d · 13=10d/2.0d (Trad/AI likely)
> **AI speedup:** EP 1≈2x · 2-3≈3x · 5-8≈4x · 13+≈5x. AI cost = `(code_gen × 1.3) + (test_gen × 1.3)` (30% review overhead).
>
> **MANDATORY frontmatter:**
>
> ```yaml
> effort_points: <n>
> complexity: low | medium | high | critical
> man_days_traditional: '<min>-<max>d' # range when likely ≥3d; '<N>d' when <3d
> man_days_ai: '<min>-<max>d'
> risk_margin_pct: <n> # base + add-ons
> risk_factors: [touches-complex-existing-feature, regression-fan-out] # closed-list from add-ons; [] if none
> blast_radius:
>     touched_areas: <n>
>     complex_touched: <n>
>     downstream_consumers: [list or count]
>     shared_common_code: yes | no
> estimate_scope_included: [code, integration-tests, frontend, i18n, docs]
> estimate_scope_excluded: [unit-tests, e2e, perf, deployment, code-review-rounds]
> estimate_reasoning: |
>     5-7 lines covering:
>     (a) UI tier — row applied
>     (b) Backend tier — row applied
>     (c) Test scope — case breakdown by driver, file count, fixtures, tier row
>     (d) Cost driver — dominant tier + why
>     (e) Blast radius — touched, complex, regression scope
>     (f) Risk factors — list driving margin; why not larger/smaller
>     Example: "UI: compose Form/Table/Dialog → NEW screen (~1.5d). Backend: NEW command on existing aggregate,
>     reuses validation+repo (~1d). Tests: 4 transitions × 2 actors + 3 validation + 2 UI states = 13 cases,
>     1 new fixture → tier 13-25 ~1.5d. Driver: UI composition + new states. Blast: 4 areas, 1 complex.
>     Risk: base 35% + touches-complex +20% = 55% → max 3.9d → range 2.5-4d."
> ```
>
> **Reject/fix estimates failing these checks:**
>
> - `likely_days ≥3d` single-point → use range
> - Margin <15% at `likely_days ≥5d` → widen
> - Margin >100% → STOP/split
> - Complex touch without regression budget in `(c)` → reject
> - Blast `>5` areas OR `>2` complex without split discussion → reject
> - Additive existing model AND UI → cap EP 3 unless tests >1.5d
> - NEW page/complex form/dashboard → EP 5+ even with one backend endpoint
> - Cross-service/migration/multi-aggregate backend → EP 8+ regardless of UI
> - `bottom_up_hours / 6` vs EP-Days >50% disagreement → trust bottom-up, downgrade EP
> - Without tests EP drops ≥1 bucket → state tests dominate
> - Reasoning must cover UI/backend/blast/risk factors; add omissions
