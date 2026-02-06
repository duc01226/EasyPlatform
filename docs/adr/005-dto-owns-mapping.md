# ADR-005: DTO Owns Mapping

**Status:** Accepted
**Date:** 2026-02-06

## Context

Data transfer between API layer and domain layer requires mapping between DTOs and entities. This mapping logic needs a consistent home to prevent duplication and ensure changes propagate correctly. The framework provides `PlatformEntityDto<T, TKey>` with `MapToEntity()` and `MapToObject()` methods that DTOs override.

## Decision

DTO classes own all transport-to-domain mapping. DTOs implement `MapToEntity()` (DTO -> Entity) and provide a constructor from entity (Entity -> DTO). Command handlers never perform manual property-by-property mapping. Command handlers call `dto.MapToEntity()` which uses `MapToEntityModes` to handle both create and update scenarios.

## Alternatives Rejected

- **Handler mapping (manual property assignment in handlers):** Creates transport-domain coupling. Every handler touching an entity must duplicate mapping logic. When DTO shape changes, every handler must be updated. Mapping errors scatter across multiple files.
- **AutoMapper:** Hides mapping logic behind convention-based configuration. Silent failures on property renames (maps to null instead of compile error). Debugging requires understanding AutoMapper's resolution chain. Adds external dependency for simple property assignment.

## Consequences

- **Positive:** Single place to update when DTO shape changes. DTO constructors document required data clearly. Compile-time safety for property mapping. No hidden magic -- explicit code shows exactly what maps where.
- **Negative:** DTOs have more code than pure data bags. Mapping logic in DTOs can grow complex for deeply nested structures.

## Revisit When

Mapping logic requires complex orchestration (multiple service calls to resolve values), or when a code-generation approach can provide the same safety guarantees with less boilerplate.
