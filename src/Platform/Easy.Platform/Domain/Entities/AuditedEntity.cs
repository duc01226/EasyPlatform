using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Timing;

namespace Easy.Platform.Domain.Entities;

/// <summary>
/// Represents an entity that has date audit tracking properties.
/// </summary>
public interface IDateAuditedEntity
{
    /// <summary>
    /// Gets or sets the creation date of the entity.
    /// </summary>
    public DateTime? CreatedDate { get; set; }

    /// <summary>
    /// Gets or sets the last updated date of the entity.
    /// </summary>
    public DateTime? LastUpdatedDate { get; set; }
}

/// <summary>
/// Represents an entity that has user audit tracking properties.
/// </summary>
public interface IUserAuditedEntity
{
    /// <summary>
    /// Sets the creator of the entity.
    /// </summary>
    /// <param name="value">The ID of the creator user.</param>
    /// <returns>The current instance of <see cref="IUserAuditedEntity"/>.</returns>
    public IUserAuditedEntity SetCreatedBy(object value);

    /// <summary>
    /// Sets the last updater of the entity.
    /// </summary>
    /// <param name="value">The ID of the last updater user.</param>
    /// <returns>The current instance of <see cref="IUserAuditedEntity"/>.</returns>
    public IUserAuditedEntity SetLastUpdatedBy(object value);

    /// <summary>
    /// Gets the creator of the entity.
    /// </summary>
    /// <returns>The ID of the creator user.</returns>
    public object GetCreatedBy();

    /// <summary>
    /// Gets the last updater of the entity.
    /// </summary>
    /// <returns>The ID of the last updater user.</returns>
    public object GetLastUpdatedBy();
}

/// <summary>
/// Represents an entity that has user audit tracking properties with a specific user ID type.
/// </summary>
/// <typeparam name="TUserId">The type of the user ID.</typeparam>
public interface IUserAuditedEntity<TUserId> : IUserAuditedEntity
{
    /// <summary>
    /// Gets or sets the ID of the user who created the entity.
    /// </summary>
    public TUserId CreatedBy { get; set; }

    /// <summary>
    /// Gets or sets the ID of the user who last updated the entity.
    /// </summary>
    public TUserId LastUpdatedBy { get; set; }
}

/// <summary>
/// Represents an entity that has full audit tracking properties (date and user).
/// </summary>
/// <typeparam name="TUserId">The type of the user ID.</typeparam>
public interface IFullAuditedEntity<TUserId> : IDateAuditedEntity, IUserAuditedEntity<TUserId> { }

/// <summary>
/// Abstract base class for an audited entity.
/// </summary>
/// <typeparam name="TEntity">The type of the entity.</typeparam>
/// <typeparam name="TPrimaryKey">The type of the primary key.</typeparam>
/// <typeparam name="TUserId">The type of the user ID.</typeparam>
public abstract class AuditedEntity<TEntity, TPrimaryKey, TUserId> : Entity<TEntity, TPrimaryKey>, IFullAuditedEntity<TUserId>
    where TEntity : Entity<TEntity, TPrimaryKey>, new()
{
    private DateTime? createdDate = Clock.UtcNow;
    private TUserId lastUpdatedBy;
    private DateTime? lastUpdatedDate = Clock.UtcNow;

    /// <summary>
    /// Initializes a new instance of the <see cref="AuditedEntity{TEntity, TPrimaryKey, TUserId}"/> class.
    /// </summary>
    public AuditedEntity() { }

    /// <summary>
    /// Initializes a new instance of the <see cref="AuditedEntity{TEntity, TPrimaryKey, TUserId}"/> class.
    /// </summary>
    /// <param name="createdBy">The ID of the user who created the entity.</param>
    public AuditedEntity(TUserId createdBy)
        : this()
    {
        CreatedBy = createdBy;
        LastUpdatedBy ??= CreatedBy;
    }

    /// <inheritdoc />
    public TUserId CreatedBy { get; set; }

    /// <inheritdoc />
    public TUserId LastUpdatedBy
    {
        get => lastUpdatedBy ?? CreatedBy;
        set => lastUpdatedBy = value;
    }

    /// <inheritdoc />
    public DateTime? CreatedDate
    {
        get => createdDate ??= Clock.UtcNow;
        set => createdDate = value;
    }

    /// <inheritdoc />
    public DateTime? LastUpdatedDate
    {
        get => lastUpdatedDate ??= CreatedDate;
        set => lastUpdatedDate = value;
    }

    /// <inheritdoc />
    public IUserAuditedEntity SetCreatedBy(object value)
    {
        if (value != typeof(TUserId).GetDefaultValue())
        {
            CreatedBy = (TUserId)value;
            LastUpdatedBy = CreatedBy;
        }

        return this;
    }

    /// <inheritdoc />
    public IUserAuditedEntity SetLastUpdatedBy(object value)
    {
        if (value != typeof(TUserId).GetDefaultValue())
            LastUpdatedBy = (TUserId)value;

        return this;
    }

    /// <inheritdoc />
    public object GetCreatedBy()
    {
        return CreatedBy;
    }

    /// <inheritdoc />
    public object GetLastUpdatedBy()
    {
        return LastUpdatedBy;
    }
}

/// <summary>
/// Abstract base class for a root audited entity.
/// </summary>
/// <typeparam name="TEntity">The type of the entity.</typeparam>
/// <typeparam name="TPrimaryKey">The type of the primary key.</typeparam>
/// <typeparam name="TUserId">The type of the user ID.</typeparam>
public abstract class RootAuditedEntity<TEntity, TPrimaryKey, TUserId> : RootEntity<TEntity, TPrimaryKey>, IFullAuditedEntity<TUserId>
    where TEntity : Entity<TEntity, TPrimaryKey>, new()
{
    private DateTime? createdDate = Clock.UtcNow;
    private TUserId lastUpdatedBy;
    private DateTime? lastUpdatedDate = Clock.UtcNow;

    /// <summary>
    /// Initializes a new instance of the <see cref="RootAuditedEntity{TEntity, TPrimaryKey, TUserId}"/> class.
    /// </summary>
    public RootAuditedEntity() { }

    /// <summary>
    /// Initializes a new instance of the <see cref="RootAuditedEntity{TEntity, TPrimaryKey, TUserId}"/> class.
    /// </summary>
    /// <param name="createdBy">The ID of the user who created the entity.</param>
    public RootAuditedEntity(TUserId createdBy)
        : this()
    {
        CreatedBy = createdBy;
        LastUpdatedBy ??= CreatedBy;
    }

    /// <inheritdoc />
    public TUserId CreatedBy { get; set; }

    /// <inheritdoc />
    public TUserId LastUpdatedBy
    {
        get => lastUpdatedBy ?? CreatedBy;
        set => lastUpdatedBy = value;
    }

    /// <inheritdoc />
    public DateTime? CreatedDate
    {
        get => createdDate ??= Clock.UtcNow;
        set => createdDate = value;
    }

    /// <inheritdoc />
    [PlatformIgnoreCheckValueDiff]
    public DateTime? LastUpdatedDate
    {
        get => lastUpdatedDate ??= CreatedDate;
        set => lastUpdatedDate = value;
    }

    /// <inheritdoc />
    public IUserAuditedEntity SetCreatedBy(object value)
    {
        if (value != typeof(TUserId).GetDefaultValue())
        {
            CreatedBy = (TUserId)value;
            LastUpdatedBy = CreatedBy;
        }

        return this;
    }

    /// <inheritdoc />
    public IUserAuditedEntity SetLastUpdatedBy(object value)
    {
        if (value != typeof(TUserId).GetDefaultValue())
            LastUpdatedBy = (TUserId)value;

        return this;
    }

    /// <inheritdoc />
    public object GetCreatedBy()
    {
        return CreatedBy;
    }

    /// <inheritdoc />
    public object GetLastUpdatedBy()
    {
        return lastUpdatedBy;
    }
}
