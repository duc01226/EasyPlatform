using System;
using System.Linq.Expressions;
using System.Text.Json;
using FluentValidation.Results;
using NoCeiling.Duc.Interview.Test.Platform.Validators;

namespace NoCeiling.Duc.Interview.Test.Platform.Domain.Entities
{
    public abstract class Entity<TEntity, TPrimaryKey>
        where TEntity : Entity<TEntity, TPrimaryKey>, new()
    {
        public virtual TPrimaryKey Id { get; set; }

        public virtual TEntity Clone()
        {
            return JsonSerializer.Deserialize<TEntity>(JsonSerializer.Serialize(this));
        }

        public ValidationResult Validate()
        {
            var validator = GetValidator();

            return validator != null ? validator.Validate((TEntity)this) : new ValidationResult();
        }

        /// <summary>
        /// To get the entity validator.
        /// This will help us to centralize and reuse domain validation logic. Ensure any request which update/create domain entity
        /// use the same entity validation logic (Single Responsibility, Don't Repeat YourSelf).
        /// </summary>
        /// <returns></returns>
        public virtual PlatformValidator<TEntity> GetValidator()
        {
            return null;
        }

        public virtual PlatformCheckUniquenessValidator<TEntity> CheckUniquenessValidator()
        {
            return null;
        }
    }

    /// <summary>
    /// Root entity represent an aggregate root entity. Only root entity can be Create/Update/Delete via repository
    /// </summary>
    public abstract class RootEntity<TEntity, TPrimaryKey> : Entity<TEntity, TPrimaryKey>
        where TEntity : Entity<TEntity, TPrimaryKey>, new()
    {
    }
}
