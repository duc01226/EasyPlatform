using System;
using NoCeiling.Duc.Interview.Test.Platform.Timing;

namespace NoCeiling.Duc.Interview.Test.Platform.Domain.Entities
{
    public interface IAuditedEntity<TUserId> where TUserId : struct
    {
        public TUserId? CreatedBy { get; }

        public TUserId? LastUpdatedBy { get; set; }

        public DateTime? CreatedDate { get; }

        public DateTime? LastUpdatedDate { get; set; }
    }

    public abstract class AuditedEntity<TEntity, TPrimaryKey, TUserId> : Entity<TEntity, TPrimaryKey>, IAuditedEntity<TUserId>
        where TEntity : Entity<TEntity, TPrimaryKey>, new()
        where TPrimaryKey : IEquatable<TPrimaryKey>
        where TUserId : struct
    {
        public AuditedEntity(TUserId? createdBy = null)
        {
            CreatedDate ??= Clock.Now;
            LastUpdatedDate ??= CreatedDate;
            CreatedBy = createdBy;
            LastUpdatedBy ??= CreatedBy;
        }

        public TUserId? CreatedBy { get; }
        public TUserId? LastUpdatedBy { get; set; }
        public DateTime? CreatedDate { get; }
        public DateTime? LastUpdatedDate { get; set; }
    }

    public abstract class AuditedEntity<TEntity, TUserId> : AuditedEntity<TEntity, Guid, TUserId>,
        IAuditedEntity<TUserId>
        where TEntity : Entity<TEntity, Guid>, new()
        where TUserId : struct
    {
    }
}
