> **Refinement DoR Checklist** — ALL 8 criteria MUST ATTENTION pass before planning:
>
> 1. **User story template** — "As a {role}, I want {goal}, so that {benefit}" format
> 2. **AC testable & unambiguous** — State the actor/precondition, trigger/action, and expected outcome in the project's accepted format (GWT is one option). No "should/might/TBD/various/appropriate". Min 3 scenarios (happy, edge, error) + 1 auth scenario
> 3. **Releasable outcome defined** — one actor-facing outcome with an entry-to-result journey, visible/persisted truth, applicable access/failure/recovery behavior, scope, and evidence; enabling work is attached rather than emitted as a technical-only task
> 4. **Full-flow wireframes/mock app attached** — UI features: `## UI Layout` or mock-app evidence covering every required page/view, navigation edge, common/domain/page component, applicable state, and end-to-end demo flow. Backend-only: explicit "N/A" plus no-UI reason
> 5. **UI design ready** — Visual design + component decomposition tree + design-spec linked (`$design-spec` artifact or inline UI specs in `## UI Layout`) for any task with UI work. Backend-only: "N/A"
> 6. **AI pre-review passed** — `$work-item --mode=review --type=task` or `$work-item --mode=challenge` returned PASS or WARN (not FAIL)
> 7. **Effort points estimated** — Fibonacci 1-21 + complexity (Low/Medium/High). >13 EP → recommend split
> 8. **Dependencies table complete** — Dependency, Type (must-before/can-parallel/blocked-by/independent), Status
>
> **Failure fixes:** Vague AC → specify exact CRUD + roles. Missing auth → add roles × CRUD table. No wireframes → UX BA creates. TBD in AC → replace with decision.
