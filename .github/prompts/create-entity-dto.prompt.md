---
mode: 'agent'
tools: ['editFiles', 'codebase', 'terminal']
description: 'Scaffold PlatformEntityDto with fluent With* methods'
---

# Create Entity DTO

Generate a PlatformEntityDto for the following entity:

**Entity Name:** ${input:entityName}
**Service Name:** ${input:serviceName}
**Related Entities (comma-separated):** ${input:relatedEntities}

## Requirements

1. Extend `PlatformEntityDto<TEntity, TKey>` base class
2. Constructor maps core properties from entity
3. Use `With*` fluent methods for optional/related entity loading
4. Override required methods: `GetSubmittedId()`, `MapToEntity()`, `GenerateNewId()`

---

## File Location

`{ServiceName}.Application/EntityDtos/{Entity}EntityDto.cs`

---

## Template

```csharp
#region

using Easy.Platform.Application.Dtos;

using {ServiceName}.Domain.Entities;

#endregion

namespace {ServiceName}.Application.EntityDtos;

/// <summary>
/// DTO for {Entity} entity with fluent With* methods for optional related data loading.
/// </summary>
public sealed class {Entity}EntityDto : PlatformEntityDto<{Entity}, string>
{
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTORS
    // ═══════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Parameterless constructor required for serialization.
    /// </summary>
    public {Entity}EntityDto() { }

    /// <summary>
    /// Constructor that maps core properties from entity.
    /// </summary>
    /// <param name="entity">The source entity.</param>
    public {Entity}EntityDto({Entity} entity) : base(entity)
    {
        Id = entity.Id;
        Name = entity.Name;
        Code = entity.Code;
        IsActive = entity.IsActive;
        CreatedDate = entity.CreatedDate;
        UpdatedDate = entity.UpdatedDate;
        // Map other core properties...
    }

    /// <summary>
    /// Constructor with related entity data.
    /// </summary>
    public {Entity}EntityDto({Entity} entity, RelatedEntity? relatedEntity) : this(entity)
    {
        // Map data from related entities
        RelatedName = relatedEntity?.Name ?? string.Empty;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CORE PROPERTIES
    // ═══════════════════════════════════════════════════════════════════════════

    public string? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public bool IsActive { get; set; }
    public DateTime? CreatedDate { get; set; }
    public DateTime? UpdatedDate { get; set; }

    // Properties from related entities (mapped in constructor)
    public string RelatedName { get; set; } = string.Empty;

    // ═══════════════════════════════════════════════════════════════════════════
    // OPTIONAL LOAD PROPERTIES (populated via With* methods)
    // ═══════════════════════════════════════════════════════════════════════════

    public ParentEntityDto? Parent { get; set; }
    public List<ChildEntityDto>? Children { get; set; }
    public AssociatedEntityDto? Associated { get; set; }

    // ═══════════════════════════════════════════════════════════════════════════
    // WITH* FLUENT METHODS FOR OPTIONAL LOADING
    // ═══════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Attaches parent entity data to the DTO.
    /// </summary>
    public {Entity}EntityDto WithParent(ParentEntity? parent)
    {
        if (parent != null)
            Parent = new ParentEntityDto(parent);
        return this;
    }

    /// <summary>
    /// Attaches child entities data to the DTO.
    /// </summary>
    public {Entity}EntityDto WithChildren(List<ChildEntity>? children)
    {
        Children = children?.Select(c => new ChildEntityDto(c)).ToList();
        return this;
    }

    /// <summary>
    /// Attaches associated entity data to the DTO.
    /// </summary>
    public {Entity}EntityDto WithAssociated(AssociatedEntity? associated)
    {
        if (associated != null)
            Associated = new AssociatedEntityDto(associated);
        return this;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PLATFORM ENTITY DTO OVERRIDES
    // ═══════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Returns the submitted ID for create vs update detection.
    /// Returns null for new entities (triggers GenerateNewId).
    /// </summary>
    protected override object? GetSubmittedId() => Id;

    /// <summary>
    /// Generates a new unique identifier for entity creation.
    /// </summary>
    protected override string GenerateNewId() => Ulid.NewUlid().ToString();

    /// <summary>
    /// Maps DTO properties back to entity for save operations.
    /// </summary>
    /// <param name="entity">The entity to update.</param>
    /// <param name="mode">The mapping mode (Create or Update).</param>
    /// <returns>The updated entity.</returns>
    protected override {Entity} MapToEntity({Entity} entity, MapToEntityModes mode)
    {
        entity.Name = Name;
        entity.Code = Code;
        entity.IsActive = IsActive;
        // Map other properties...

        return entity;
    }
}
```

---

## Usage Examples

### In Query Handler (Read)

```csharp
protected override async Task<Get{Entity}ListQueryResult> HandleAsync(
    Get{Entity}ListQuery request, CancellationToken cancellationToken)
{
    var entities = await repository.GetAllAsync(
        expr,
        cancellationToken,
        e => e.Parent,      // Eager load related entities
        e => e.Children);

    var dtos = entities.SelectList(e => new {Entity}EntityDto(e)
        .WithParent(e.Parent)
        .WithChildren(e.Children?.ToList()));

    return new Get{Entity}ListQueryResult(dtos);
}
```

### In Command Handler (Write)

```csharp
protected override async Task<Save{Entity}CommandResult> HandleAsync(
    Save{Entity}Command request, CancellationToken cancellationToken)
{
    var dto = request.Data;

    // Create or update based on submitted ID
    var entity = dto.NotHasSubmitId()
        ? dto.MapToNewEntity().With(e => e.CreatedBy = RequestContext.UserId())
        : await repository.GetByIdAsync(dto.Id!, cancellationToken)
            .EnsureFound($"Entity not found: {dto.Id}")
            .Then(existing => dto.UpdateToEntity(existing));

    var saved = await repository.CreateOrUpdateAsync(entity, cancellationToken);

    return new Save{Entity}CommandResult
    {
        Entity = new {Entity}EntityDto(saved)
    };
}
```

---

## Key Methods Reference

| Method | Purpose |
|--------|---------|
| `GetSubmittedId()` | Returns ID for create vs update detection |
| `GenerateNewId()` | Creates new ULID when ID is null |
| `MapToEntity(entity, mode)` | Maps DTO properties to entity |
| `MapToNewEntity()` | Creates new entity from DTO (calls MapToEntity with Create mode) |
| `UpdateToEntity(existing)` | Updates existing entity from DTO (calls MapToEntity with Update mode) |
| `NotHasSubmitId()` | Returns true if GetSubmittedId() is null/empty |
| `HasSubmitId()` | Returns true if GetSubmittedId() has value |

---

## With* Method Pattern

```csharp
// Pattern: Return 'this' for fluent chaining
public {Entity}EntityDto With{RelatedEntity}({RelatedEntity}? relatedEntity)
{
    if (relatedEntity != null)
        {RelatedEntity} = new {RelatedEntity}EntityDto(relatedEntity);
    return this;
}

// For collections
public {Entity}EntityDto With{RelatedEntities}(List<{RelatedEntity}>? items)
{
    {RelatedEntities} = items?.Select(x => new {RelatedEntity}EntityDto(x)).ToList();
    return this;
}
```

---

## Export Configuration

Update barrel exports in `{ServiceName}.Application/EntityDtos/`:

```csharp
// In a shared EntityDtos barrel file or direct usage
public static class EntityDtos
{
    // DTOs are typically used directly via namespace import
}
```

---

## Anti-Patterns to Avoid

- **Never** map to entity in command/query handlers (mapping is DTO's responsibility)
- **Never** use `PlatformEntityDto` for command/query-specific result objects
- **Never** forget empty parameterless constructor (required for serialization)
- **Never** include computed properties that don't map back to entity
- **Always** use `With*` methods for optional related data (not constructor overloads)
