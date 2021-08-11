using System;
using AngularDotnetPlatform.Platform.Cqrs;
using AngularDotnetPlatform.Platform.Domain.Entities;
using AngularDotnetPlatform.Platform.MongoDB.Domain.Repositories;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

namespace PlatformExampleApp.TextSnippet.Persistence.Mongo
{
    internal class TextSnippetRepository<TEntity> : PlatformMongoDbRepository<TEntity, Guid, TextSnippetDbContext>, ITextSnippetRepository<TEntity>
        where TEntity : Entity<TEntity, Guid>, new()
    {
        public TextSnippetRepository(TextSnippetDbContext dbContext, IPlatformCqrs cqrs) : base(dbContext, cqrs)
        {
        }
    }

    internal class TextSnippetRootRepository<TEntity> : PlatformMongoDbRootRepository<TEntity, Guid, TextSnippetDbContext>, ITextSnippetRootRepository<TEntity>
        where TEntity : RootEntity<TEntity, Guid>, new()
    {
        public TextSnippetRootRepository(TextSnippetDbContext dbContext, IPlatformCqrs cqrs) : base(dbContext, cqrs)
        {
        }
    }
}
