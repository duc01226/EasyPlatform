using System;
using NoCeiling.Duc.Interview.Test.Platform.Cqrs;
using NoCeiling.Duc.Interview.Test.Platform.Domain.Entities;
using NoCeiling.Duc.Interview.Test.Platform.EfCore.Domain.Repositories;
using NoCeiling.Duc.Interview.Test.TextSnippet.Domain.Repositories;

namespace NoCeiling.Duc.Interview.Test.TextSnippet.Persistence
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
