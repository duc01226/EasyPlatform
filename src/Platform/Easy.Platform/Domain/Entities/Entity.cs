using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Serialization;
using Easy.Platform.Common.JsonSerialization;
using FluentValidation.Results;
using Easy.Platform.Common.Validators;

namespace Easy.Platform.Domain.Entities
{
    /// <summary>
    /// This interface is used for conventional type scan for entity
    /// </summary>
    public interface IEntity
    {
    }

    public interface IEntity<TPrimaryKey> : IEntity
    {
        TPrimaryKey Id { get; set; }
    }

    public interface IValidatableEntity
    {
        PlatformValidationResult Validate();
    }

    public interface ISupportBusinessActionEventsEntity
    {
        /// <summary>
        /// Return list BusinessActionEvents. The key is BusinessAction name. The Value is BusinessActionPayload.
        /// </summary>
        /// <returns></returns>
        List<KeyValuePair<string, object>> GetBusinessActionEvents();
    }

    /// <summary>
    /// Ensure concurrent update is not conflicted
    /// </summary>
    public interface IRowVersionEntity : IEntity
    {
        /// <summary>
        /// This is used as a Concurrency Token to track entity version to prevent concurrent update
        /// </summary>
        public Guid? ConcurrencyUpdateToken { get; set; }
    }

    public interface IValidatableEntity<TEntity, TPrimaryKey> : IValidatableEntity, IEntity<TPrimaryKey>
        where TEntity : IEntity<TPrimaryKey>
    {
        PlatformCheckUniquenessValidator<TEntity> CheckUniquenessValidator();
    }

    public abstract class Entity<TEntity, TPrimaryKey> : IValidatableEntity<TEntity, TPrimaryKey>, ISupportBusinessActionEventsEntity
        where TEntity : Entity<TEntity, TPrimaryKey>, new()
    {
        protected readonly List<KeyValuePair<string, object>> BusinessActionEvents = new List<KeyValuePair<string, object>>();

        public TPrimaryKey Id { get; set; }

        public virtual TEntity Clone()
        {
            return PlatformJsonSerializer.Deserialize<TEntity>(PlatformJsonSerializer.Serialize(this));
        }

        public virtual PlatformValidationResult Validate()
        {
            var validator = GetValidator();

            return validator != null ? validator.Validate((TEntity)this) : new PlatformValidationResult();
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

        public List<KeyValuePair<string, object>> GetBusinessActionEvents()
        {
            return BusinessActionEvents;
        }

        protected TEntity AddBusinessActionEvents(string eventActionName, object eventActionPayload)
        {
            BusinessActionEvents.Add(new KeyValuePair<string, object>(eventActionName, eventActionPayload));
            return (TEntity)this;
        }
    }

    public interface IRootEntity<TPrimaryKey> : IEntity<TPrimaryKey>
    {
    }

    /// <summary>
    /// Root entity represent an aggregate root entity. Only root entity can be Create/Update/Delete via repository
    /// </summary>
    public abstract class RootEntity<TEntity, TPrimaryKey> : Entity<TEntity, TPrimaryKey>, IRootEntity<TPrimaryKey> where TEntity : Entity<TEntity, TPrimaryKey>, new()
    {
        public RootEntity() { }
    }
}
