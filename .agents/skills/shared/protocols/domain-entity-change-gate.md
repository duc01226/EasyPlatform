> **Domain Entity Change Gate** — Preserve valid business state and cheap, provable domain changes across planning, implementation and review.
>
> **Trigger:** new or changed entities, value objects, aggregates, or their fields, invariants, relationships, write/load/event paths. Inspect semantics and accepted architecture; DTO/config filenames alone do not qualify. No surface → `No domain-entity surface — gate N/A`.
>
> **Read only when triggered:** `.claude/skills/domain-analysis/references/entity-quality.md` owns fit, six decisions, quality dimensions and proof. Detect paradigm/subdomain first; non-DDD/CRUD uses normal invariant ownership with an evidence-backed DDD-specific N/A. Never impose rich models, inheritance, repositories or events without a domain need.
>
> **Feedforward → feedback:** plan the applicable classification, invariants/failures, consistency/concurrency, creation/load/evolution, events/dependencies and test proof with owners and acceptance gates; implementation follows them through bypass paths; review checks the same decisions against source and assertions. Missing material decisions block edits; unavailable required proof blocks completion. Direct fixes use a brief pre-edit record, not a new planning ceremony.
>
> **One review owner:** `$domain-analysis --mode=review` is the canonical owner of the full A–P checklist and consumes the same quality reference. Apply inline for focused work; route specialist depth by risk/uncertainty, not entity-file count. The running skill IS `$domain-analysis --mode=review` → `Gate is this skill's own body — A–P checklist owns it.` Under `workflow-review-changes`, defer to `domain-entities-design-review`; terminal `why-review --validate-findings` makes no sub-skill calls. Leaves return gaps without fan-out.
>
> **Gate:** relevance/fit evidenced · applicable decisions owned · success/rejection proof named (actual verified proof for completed implementation) · no duplicate pass. Preserve existing scope, modes and authority.
