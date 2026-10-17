> **Test Data Isolation** — Tests MUST be independent across supported concurrency modes; stateful suites must not depend on order or mutate another test/run's data.
>
> 1. Use harness-supported transactions, per-test databases/schemas, namespaces, fixtures, or unique data. Shared namespaces require unique IDs; isolated disposable fixtures may use stable IDs.
> 2. Isolate concurrently observable/mutable state. Share mutable state only under an explicit runner/project isolation guarantee; immutable reference data may be shared.
> 3. Inspect relevant bulk rebuild/recompute/cascade consumers when rewriting shared-parent descendants could affect any test/run's assertions.
> 4. For intermittent contradictions, trace the path and inspect competing writers/consumers before attributing the outcome to product code; consider contamination.
> 5. Prove isolation through scoped searches of relevant tests/consumers; repository-wide searches are unnecessary for an owned isolated store/transaction.
