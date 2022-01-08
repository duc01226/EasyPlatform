using System;
using AngularDotnetPlatform.Platform.Common.Cqrs;
using AngularDotnetPlatform.Platform.Domain.Entities;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.MongoDB.Domain.Repositories;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

namespace PlatformExampleApp.TextSnippet.Persistence.MultiDbDemo.Mongo
{
    internal class TextSnippetMultiDbDemoRepository<TEntity> : PlatformMongoDbRepository<TEntity, Guid, TextSnippetMultiDbDemoDbContext>, ITextSnippetRepository<TEntity>
        where TEntity : class, IEntity<Guid>, new()
    {
        public TextSnippetMultiDbDemoRepository(IUnitOfWorkManager unitOfWorkManager, IPlatformCqrs cqrs) : base(unitOfWorkManager, cqrs)
        {
        }
    }

    internal class TextSnippetMultiDbDemoRootRepository<TEntity> : PlatformMongoDbRootRepository<TEntity, Guid, TextSnippetMultiDbDemoDbContext>, ITextSnippetRootRepository<TEntity>
        where TEntity : class, IRootEntity<Guid>, new()
    {
        public TextSnippetMultiDbDemoRootRepository(IUnitOfWorkManager unitOfWorkManager, IPlatformCqrs cqrs) : base(unitOfWorkManager, cqrs)
        {
        }
    }
}
