using System;
using AngularDotnetPlatform.Platform.Common.Dtos;
using AngularDotnetPlatform.Platform.Common.Validators;
using AngularDotnetPlatform.Platform.Domain.Entities;

namespace AngularDotnetPlatform.Platform.Application.Dtos
{
    /// <summary>
    /// This represent entity data to be sent and return between client and server
    /// Why do we want dto?
    /// Sometimes you want to change the shape of the data that you send to client. For example, you might want to:
    /// - Remove circular references (entity framework entity, relation between entities present via navigation property)
    /// - Hide particular properties that clients are not supposed to view.
    /// - Omit some properties in order to reduce payload size.
    /// - Decouple your service layer from your database layer.
    /// </summary>
    public abstract class PlatformEntityDto<TEntity, TId> : IPlatformDto
        where TEntity : IEntity<TId>, new()
        where TId : struct
    {
        public PlatformEntityDto() { }

        public PlatformEntityDto(TEntity entity)
        {
            Id = entity.Id;
        }

        public TId? Id { get; set; }

        public virtual TEntity MapToEntity()
        {
            var initialEntity = Activator.CreateInstance<TEntity>();

            var updatedEntity = UpdateToEntity(initialEntity);

            return updatedEntity;
        }

        /// <summary>
        /// Modify the toBeUpdatedEntity by apply current data from entity dto to the target toBeUpdatedEntity.
        /// Return
        /// </summary>
        /// <returns>Return the modified toBeUpdatedEntity</returns>
        public abstract TEntity UpdateToEntity(TEntity toBeUpdatedEntity);

        public virtual PlatformValidationResult Validate()
        {
            return PlatformValidationResult.Valid();
        }
    }
}
