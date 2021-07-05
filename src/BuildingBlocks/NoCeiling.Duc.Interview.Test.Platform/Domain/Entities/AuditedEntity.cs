using System;
using NoCeiling.Duc.Interview.Test.Platform.Timing;

namespace NoCeiling.Duc.Interview.Test.Platform.Domain.Entities
{
    public interface IAuditedEntity<TUserId>
    {
        public TUserId CreatedBy { get; }

        public TUserId LastUpdatedBy { get; set; }

        public DateTime? CreatedDate { get; }

        public DateTime? LastUpdatedDate { get; set; }
    }

    public abstract class AuditedEntity<TEntity, TPrimaryKey, TUserId> : RootEntity<TEntity, TPrimaryKey>, IAuditedEntity<TUserId>
        where TEntity : Entity<TEntity, TPrimaryKey>, new()
    {
        public AuditedEntity(TUserId createdBy = default)
        {
            CreatedDate ??= Clock.Now;
            LastUpdatedDate ??= CreatedDate;
            CreatedBy = createdBy;
            LastUpdatedBy ??= CreatedBy;
        }

        public TUserId CreatedBy { get; }
        public TUserId LastUpdatedBy { get; set; }
        public DateTime? CreatedDate { get; }
        public DateTime? LastUpdatedDate { get; set; }
    }
}
