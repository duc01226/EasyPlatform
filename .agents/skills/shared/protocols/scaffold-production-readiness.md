> **Scaffold Readiness** — Evaluate these foundation areas against the requested artifact, project config, and deployment model. Include applicable foundations; mark non-applicable areas N/A with a reason instead of adding unrelated stack requirements:
>
> 1. **Quality tooling** — use or propose tooling appropriate to the language, repository, and delivery process; document selected tools in project references/config when available.
> 2. **Error handling** — define behavior at applicable process, API, CLI, library, or user-interface boundaries; use HTTP status handling or user notifications only when those surfaces exist.
> 3. **Asynchronous interaction** — provide progress/loading and cancellation behavior when the artifact exposes long-running work to a user or caller; do not add a universal loading tracker to non-interactive projects.
> 4. **Runtime and deployment** — use the declared hosting and deployment model. Container files and multiple run modes are required only when selected by the project; prove each supported mode with its actual command.
> 5. **External integrations** — document and test applicable outbound boundaries; choose timeout, retry, idempotency, or circuit-breaking behavior to fit the protocol and failure modes.
>
> **Gate:** resolve every applicable foundation before implementation. Ask for a decision only when an unresolved choice materially changes the architecture or user-visible behavior.
