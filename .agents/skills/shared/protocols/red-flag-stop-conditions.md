> **Red Flag Stop Conditions** — STOP and escalate to user via ask user question tool when:
>
> 1. Confidence drops below 70% on any critical decision
> 2. Cross-service boundary is being crossed
> 3. Security-sensitive code (auth, crypto, PII handling)
> 4. Breaking change detected (interface, API contract, DB schema)
> 5. Test coverage would decrease after changes
> 6. Approach requires technology/pattern not in the project
>
> **NEVER proceed past a red flag without explicit user approval.**
