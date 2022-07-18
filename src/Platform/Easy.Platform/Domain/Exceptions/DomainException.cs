using Easy.Platform.Domain.Entities;

namespace Easy.Platform.Domain.Exceptions
{
    public class PlatformDomainException : Exception
    {
        public PlatformDomainException(string message, Exception innerException = null) : base(message, innerException)
        {
        }
    }

    public class PlatformEntityNotFoundDomainException<TEntity> : PlatformDomainException where TEntity : IEntity
    {
        public PlatformEntityNotFoundDomainException(string entityId, Exception innerException = null) : base(
            $"{typeof(TEntity).Name} with Id:{entityId} is not found",
            innerException)
        {
            EntityId = entityId;
        }

        public string EntityId { get; set; }
    }

    public class PlatformRowVersionConflictDomainException : PlatformDomainException
    {
        public PlatformRowVersionConflictDomainException(string message, Exception innerException = null) : base(
            message,
            innerException)
        {
        }
    }
}
