> **Repeatable Tests** — Preserve the same contract result across fresh runs and supported concurrency using the project's runner/isolation policy; no universal no-reset database procedure.
>
> 1. Isolate mutable data across tests/runs. Generate identities in shared namespaces/stores; stable IDs are valid in isolated disposable databases or deterministic fixtures.
> 2. Cleanup only resources created AND owned by the test/run. Use harness-supported transactions, ephemeral databases, namespaces, teardown, or additive fixtures; never reset shared/user-owned state.
> 3. Make repeatable shared setup idempotent. Retain contract-required schema/migration tests using the migration harness; assume no rollback unsupported in production.
> 4. Follow `integrationTestVerify.guidance`. If absent, an integration suite whose persistent/shared state or async effects make one run insufficient converges on two consecutive fresh green runs; any other suite converges on one fresh green run. Never delete another run's data to verify repeatability.
