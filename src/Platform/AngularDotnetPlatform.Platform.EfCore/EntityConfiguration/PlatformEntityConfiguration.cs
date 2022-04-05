using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using AngularDotnetPlatform.Platform.Domain.Entities;

namespace AngularDotnetPlatform.Platform.EfCore.EntityConfiguration
{
    public abstract class PlatformEntityConfiguration<TEntity> : IEntityTypeConfiguration<TEntity>
        where TEntity : class, IEntity
    {
        public virtual void Configure(EntityTypeBuilder<TEntity> builder)
        {
        }
    }

    public abstract class PlatformEntityConfiguration<TEntity, TPrimaryKey> : IEntityTypeConfiguration<TEntity>
        where TEntity : class, IEntity<TPrimaryKey>
    {
        public virtual void Configure(EntityTypeBuilder<TEntity> builder)
        {
            builder.HasKey(p => p.Id);
        }
    }

    public abstract class PlatformAuditedEntityConfiguration<TEntity, TPrimaryKey, TUserId> : IEntityTypeConfiguration<TEntity>
        where TEntity : class, IEntity<TPrimaryKey>, IAuditedEntity<TUserId>
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
