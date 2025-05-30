using Easy.Platform.Common.Exceptions;
using Easy.Platform.Domain.Entities;

namespace Easy.Platform.Domain.Exceptions;

/// <summary>
/// Represents an exception that is thrown when a domain entity is not found.
/// </summary>
/// <typeparam name="TEntity">The type of the entity.</typeparam>
public class PlatformDomainEntityNotFoundException<TEntity> : PlatformNotFoundException
    where TEntity : IEntity
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformDomainEntityNotFoundException{TEntity}"/> class.
    /// </summary>
    /// <param name="entityId">The ID of the entity that was not found.</param>
    /// <param name="innerException">The exception that is the cause of the current exception, or a null reference if no inner exception is specified.</param>
    public PlatformDomainEntityNotFoundException(string entityId, Exception innerException = null)
        : base(BuildErrorMsg(entityId), innerException)
    {
        EntityId = entityId;
    }

    /// <summary>
    /// Gets or sets the ID of the entity that was not found.
    /// </summary>
    public string EntityId { get; set; }

    /// <summary>
    /// Builds the error message for the exception.
    /// </summary>
    /// <param name="entityId">The ID of the entity that was not found.</param>
    /// <param name="errorMsg">An optional custom error message.</param>
    /// <returns>The error message.</returns>
    public static string BuildErrorMsg(string entityId, string errorMsg = null)
    {
        return errorMsg ?? $"{typeof(TEntity).Name} with Id:{entityId} is not found";
    }
}
