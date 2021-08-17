using System;
using AngularDotnetPlatform.Platform.Domain.Entities;
using AngularDotnetPlatform.Platform.Domain.Repositories;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;

namespace PlatformExampleApp.TextSnippet.Domain.Repositories
{
    public interface ITextSnippetRepository<TEntity> : IRepository<TEntity, Guid>
        where TEntity : Entity<TEntity, Guid>, new()
    {
    }

    public interface ITextSnippetRootRepository<TEntity> : IRootRepository<TEntity, Guid>
        where TEntity : RootEntity<TEntity, Guid>, new()
    {
    }

    #region Demo supporting multi database in one micro service

    public interface ITextSnippetSqlUnitOfWork : IUnitOfWork
    {
    }

    public interface ITextSnippetMongoUnitOfWork : IUnitOfWork
    {
    }

    /// <summary>
    /// These interface is used to demo supporting multi database in one micro service
    /// </summary>
    public interface ITextSnippetSqlRepository<TEntity> : ITextSnippetRepository<TEntity>
        where TEntity : Entity<TEntity, Guid>, new()
    {
    }

    /// <summary>
    /// These interface is used to demo supporting multi database in one micro service
    /// </summary>
    public interface ITextSnippetSqlRootRepository<TEntity> : ITextSnippetRootRepository<TEntity>
        where TEntity : RootEntity<TEntity, Guid>, new()
    {
    }

    /// <summary>
    /// These interface is used to demo supporting multi database in one micro service
    /// </summary>
    public interface ITextSnippetMongoRepository<TEntity> : ITextSnippetRepository<TEntity>
        where TEntity : Entity<TEntity, Guid>, new()
    {
    }

    /// <summary>
    /// These interface is used to demo supporting multi database in one micro service
    /// </summary>
    public interface ITextSnippetMongoRootRepository<TEntity> : ITextSnippetRootRepository<TEntity>
        where TEntity : RootEntity<TEntity, Guid>, new()
    {
    }
    #endregion
}
