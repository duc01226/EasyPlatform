using System;
using AngularDotnetPlatform.Platform.Cqrs;
using AngularDotnetPlatform.Platform.Domain.Entities;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.EfCore.Domain.Repositories;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

namespace PlatformExampleApp.TextSnippet.Persistence
{
    internal class TextSnippetRepository<TEntity> : PlatformEfCoreRepository<TEntity, Guid, TextSnippetDbContext>, ITextSnippetSqlRepository<TEntity>
        where TEntity : Entity<TEntity, Guid>, new()
    {
        public TextSnippetRepository(IUnitOfWorkManager unitOfWorkManager, IPlatformCqrs cqrs) : base(unitOfWorkManager, cqrs)
        {
        }
    }

    internal class TextSnippetRootRepository<TEntity> : PlatformEfCoreRootRepository<TEntity, Guid, TextSnippetDbContext>, ITextSnippetSqlRootRepository<TEntity>
        where TEntity : RootEntity<TEntity, Guid>, new()
    {
        public TextSnippetRootRepository(IUnitOfWorkManager unitOfWorkManager, IPlatformCqrs cqrs) : base(unitOfWorkManager, cqrs)
        {
        }
    }
}
