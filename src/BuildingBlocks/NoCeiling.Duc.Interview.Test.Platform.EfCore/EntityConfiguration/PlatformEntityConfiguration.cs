using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NoCeiling.Duc.Interview.Test.Platform.Domain.Entities;

namespace NoCeiling.Duc.Interview.Test.Platform.EfCore.EntityConfiguration
{
    public abstract class PlatformEntityConfiguration<TEntity, TPrimaryKey> : IEntityTypeConfiguration<TEntity>
        where TEntity : Entity<TEntity, TPrimaryKey>, new()
        where TPrimaryKey : struct
    {
        public virtual void Configure(EntityTypeBuilder<TEntity> builder)
        {
            builder.HasKey(p => p.Id);
        }
    }

    public abstract class PlatformAuditedEntityConfiguration<TEntity, TUserId> : IEntityTypeConfiguration<TEntity>
        where TEntity : AuditedEntity<TEntity, TUserId>, new()
        where TUserId : struct
    {
        public virtual void Configure(EntityTypeBuilder<TEntity> builder)
        {
            builder.HasKey(p => p.Id);

            builder.HasIndex(p => p.CreatedBy);
            builder.HasIndex(p => p.CreatedDate);
            builder.HasIndex(p => p.LastUpdatedBy);
            builder.HasIndex(p => p.LastUpdatedDate);
        }
    }
}
