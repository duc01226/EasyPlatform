using NoCeiling.Duc.Interview.Test.Platform.Domain.Entities;

namespace NoCeiling.Duc.Interview.Test.Platform.Application.Dtos
{
    public abstract class PlatformEntityDto<TEntity, TId>
        where TEntity : Entity<TEntity, TId>, new()
        where TId : struct
    {
        public PlatformEntityDto() { }

        public PlatformEntityDto(TEntity entity)
        {
            Id = entity.Id;
        }

        public TId? Id { get; set; }

        public abstract TEntity MapToEntity();
    }
}
