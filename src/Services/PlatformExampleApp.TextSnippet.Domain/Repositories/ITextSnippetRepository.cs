using System;
using AngularDotnetPlatform.Platform.Domain.Entities;
using AngularDotnetPlatform.Platform.Domain.Repositories;

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
}
