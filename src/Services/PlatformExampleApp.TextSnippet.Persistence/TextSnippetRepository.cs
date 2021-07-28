using System;
using AngularDotnetPlatform.Platform.Cqrs;
using AngularDotnetPlatform.Platform.Domain.Entities;
using AngularDotnetPlatform.Platform.EfCore.Domain.Repositories;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

namespace PlatformExampleApp.TextSnippet.Persistence
{
    internal class TextSnippetRepository<TEntity> : PlatformEfCoreRepository<TEntity, Guid, TextSnippetDbContext>, ITextSnippetRepository<TEntity>
        where TEntity : Entity<TEntity, Guid>, new()
    {
        public TextSnippetRepository(TextSnippetDbContext dbContext, IPlatformCqrs cqrs) : base(dbContext, cqrs)
        {
        }

        protected override string EntityEventRoutingKeyPrefix => "Interview.Test.TextSnippet";
    }

    internal class TextSnippetRootRepository<TEntity> : PlatformEfCoreRootRepository<TEntity, Guid, TextSnippetDbContext>, ITextSnippetRootRepository<TEntity>
        where TEntity : RootEntity<TEntity, Guid>, new()
    {
        public TextSnippetRootRepository(TextSnippetDbContext dbContext, IPlatformCqrs cqrs) : base(dbContext, cqrs)
        {
        }

        protected override string EntityEventRoutingKeyPrefix => "Interview.Test.TextSnippet";
    }
}
