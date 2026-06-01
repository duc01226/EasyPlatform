# Exclusion Markers

This spec uses explicit allow-markers for unavoidable tech references.

<!-- sdd022-allow:start -->

The legacy adapter still binds to MongoDB and RabbitMQ during cutover.
Angular shells remain until the migration completes.

<!-- sdd022-allow:end -->

A single inline exception is tagged here: MongoDB stays for now. <!-- sdd022-allow: legacy note -->

```ts
function buildQuery(filter: string): string {
    return `status == "open" && owner == "${filter}"`;
}
```

The handler validates input and returns a typed result object.
