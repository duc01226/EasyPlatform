using System;
using System.Text.Json;
using FluentValidation.Results;
using NoCeiling.Duc.Interview.Test.Platform.Validators;

namespace NoCeiling.Duc.Interview.Test.Platform.Domain.Entities
{
    public abstract class Entity<TEntity, TPrimaryKey>
        where TEntity : Entity<TEntity, TPrimaryKey>, new()
        where TPrimaryKey : IEquatable<TPrimaryKey>
    {
        public virtual TPrimaryKey Id { get; set; }

        public virtual TEntity Clone()
        {
            return JsonSerializer.Deserialize<TEntity>(JsonSerializer.Serialize(this));
        }

        /// <summary>
        /// To get the entity validator.
        /// This will help us to centralize and reuse domain validation logic. Ensure any request which update/create domain entity
        /// use the same entity validation logic (Single Responsibility, Don't Repeat YourSelf).
        /// </summary>
        /// <returns></returns>
        protected abstract PlatformValidator<TEntity> GetValidator();

        public ValidationResult Validate()
        {
            var validator = GetValidator();

            return validator != null ? validator.Validate((TEntity)this) : new ValidationResult();
        }
    }

    /// <summary>
    /// A shortcut of <see cref="Entity{TPrimaryKey}"/> for most used primary key type (<see cref="Guid"/>).
    /// </summary>
    public abstract class Entity<TEntity> : Entity<TEntity, Guid>
        where TEntity : Entity<TEntity>, new()
    {
    }
}
