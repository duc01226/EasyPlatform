namespace Easy.Platform.Domain.Entities;

/// <summary>
/// Represents an entity that supports optimistic concurrency control using a row version.
/// This interface ensures that concurrent updates to an entity are not conflicted by tracking the entity's version.
/// </summary>
public interface IRowVersionEntity : IEntity
{
    /// <summary>
    /// Gets or sets the concurrency token for the entity.
    /// This token is used as a concurrency stamp to track the version of the entity and prevent conflicts during concurrent updates.
    /// </summary>
    /// <returns>The concurrency update token.</returns>
    public string? ConcurrencyUpdateToken { get; set; }
}
