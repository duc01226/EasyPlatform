using System;
using AngularDotnetPlatform.Platform.Cqrs;
using AngularDotnetPlatform.Platform.Domain.Entities;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.MongoDB.Domain.Repositories;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

namespace PlatformExampleApp.TextSnippet.Persistence.Mongo
{
    internal class TextSnippetRepository<TEntity> : PlatformMongoDbRepository<TEntity, Guid, TextSnippetDbContext>, ITextSnippetMongoRepository<TEntity>
        where TEntity : Entity<TEntity, Guid>, new()
    {
        public TextSnippetRepository(IUnitOfWorkManager unitOfWorkManager, IPlatformCqrs cqrs) : base(unitOfWorkManager, cqrs)
        {
        }
    }

    internal class TextSnippetRootRepository<TEntity> : PlatformMongoDbRootRepository<TEntity, Guid, TextSnippetDbContext>, ITextSnippetMongoRootRepository<TEntity>
        where TEntity : RootEntity<TEntity, Guid>, new()
    {
        public TextSnippetRootRepository(IUnitOfWorkManager unitOfWorkManager, IPlatformCqrs cqrs) : base(unitOfWorkManager, cqrs)
        {
        }
    }
}
