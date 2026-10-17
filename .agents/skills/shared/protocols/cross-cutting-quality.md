> **Cross-Cutting Quality** — Check relevant changed paths using the project's declared architecture and operational requirements:
>
> 1. **Error handling** — follow documented conventions and keep related paths consistent.
> 2. **Diagnostics** — use the project's logging and tracing facilities; add correlation context only where the runtime supports it and the operation needs it.
> 3. **Security** — protect secrets and validate untrusted inputs at applicable boundaries; check authorization where the project has an authorization contract.
> 4. **Performance** — inspect relevant hot paths and resource use; check query behavior, allocations, or asynchronous work only where those mechanisms exist.
> 5. **Operations** — verify health checks, metrics, tracing, or endpoint behavior only for declared runtime surfaces and operational requirements. Do not add infrastructure solely to satisfy a generic checklist.
