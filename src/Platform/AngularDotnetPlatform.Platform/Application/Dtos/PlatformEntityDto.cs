using System;
using AngularDotnetPlatform.Platform.Domain.Entities;

namespace AngularDotnetPlatform.Platform.Application.Dtos
{
    public abstract class PlatformEntityDto<TEntity, TId>
        where TEntity : Entity<TEntity, TId>, new()
    {
        public PlatformEntityDto() { }

        public PlatformEntityDto(TEntity entity)
        {
            Id = entity.Id;
        }

        public TId Id { get; set; }

        public abstract TEntity MapToEntity();
    }
}
