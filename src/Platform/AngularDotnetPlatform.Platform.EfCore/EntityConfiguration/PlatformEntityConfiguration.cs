using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using AngularDotnetPlatform.Platform.Domain.Entities;

namespace AngularDotnetPlatform.Platform.EfCore.EntityConfiguration
{
    public abstract class PlatformEntityConfiguration<TEntity, TPrimaryKey> : IEntityTypeConfiguration<TEntity>
        where TEntity : Entity<TEntity, TPrimaryKey>, new()
    {
        public virtual void Configure(EntityTypeBuilder<TEntity> builder)
        {
            builder.HasKey(p => p.Id);
        }
    }

    public abstract class PlatformAuditedEntityConfiguration<TEntity, TPrimaryKey, TUserId> : IEntityTypeConfiguration<TEntity>
        where TEntity : AuditedEntity<TEntity, TPrimaryKey, TUserId>, new()
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
