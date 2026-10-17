> **Complexity Prevention (Ousterhout)** — Use change cost as a review lens, not as a technology checklist. Apply each concern only when its code path and project architecture make it relevant; absence of a pattern is not a defect.
>
> 1. **Change amplification** — estimate edit sites for a plausible change in this area. Several coordinated edits may indicate duplication or a missing owner, but assess cohesion and trade-offs before calling it structural.
> 2. **Cognitive load** — look for unnecessary dependencies, implicit ordering, boolean traps, hidden state, or nesting that makes a local change hard to reason about.
> 3. **Repeated cross-cutting behavior** — where logging, validation, authorization, error handling, or transactions recur, consider an existing shared mechanism that fits the project's runtime; do not prescribe middleware/interceptors/aspects where none exist.
> 4. **Leaked implementation detail** — when an abstraction boundary exists, check whether callers depend on provider/query/storage details unnecessarily. ORM queries, cursors, repositories, and query sets are examples only.
> 5. **Scattered variant logic** — repeated switches or conditionals over the same discriminator may signal a useful owner or dispatch point; retain simple local branches when they fit better.
> 6. **Invariant ownership** — verify that rules are protected by the owner chosen in this architecture. Rich entities, value objects, functional modules, and service-owned rules are all valid when consistent with project evidence.
> 7. **Primitive/domain types** — introduce a richer type only when it reduces repeated validation or protects an evidenced invariant; do not wrap every primitive by default.
> 8. **Cross-cutting policy** — centralize recurring policy when the project has a suitable extension point; one-off behavior may remain local.
> 9. **Module depth** — assess whether an abstraction hides meaningful work or adds more concepts than it removes; class/interface counts are examples, not requirements.
> 10. **Repeated lifecycle behavior** — repeated component, handler, job, or resource lifecycle may justify the project's idiomatic abstraction (function, hook, composable, trait, class, or helper), but only after fit and consumer evidence.
> 11. **Abstraction timing** — repetition triggers evaluation, not automatic extraction. Compare the cost of duplication with the indirection and future variation an abstraction creates.
> 12. **Reusable algorithms** — when a non-trivial stack-generic algorithm repeats, prefer a coherent existing helper or an evidenced shared owner; do not create utility layers for hypothetical reuse.
> 13. **Place computation with its data and invariant owner** — trace callers and use the architecture's documented responsibility model. There is no universal controller/service/entity/model order.
> 14. **Extraction decision** — move or share a rule when doing so gives it one clear owner or serves real consumers. A single use is not sufficient evidence by itself; keep code local when extraction would add ceremony.
>
> **Illustrative shapes only:** entity method, DTO mapper, domain service, application service, pure function, module, middleware, repository, store, or component can be appropriate depending on project evidence. Never use this list as a required target architecture.
>
> **Operating heuristics:** read callers and sibling implementations, count affected edit sites, prefer removing unnecessary code, surface assumptions at boundaries, and ask what changes when the requirement shifts. Measure good code by safe change cost in its actual context, not by a universal layer diagram.
