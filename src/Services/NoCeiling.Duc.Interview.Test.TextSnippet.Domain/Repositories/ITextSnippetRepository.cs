using System;
using NoCeiling.Duc.Interview.Test.Platform.Domain.Entities;
using NoCeiling.Duc.Interview.Test.Platform.Domain.Repositories;

namespace NoCeiling.Duc.Interview.Test.TextSnippet.Domain.Repositories
{
    public interface ITextSnippetRepository<TEntity> : IRepository<TEntity, Guid>
        where TEntity : Entity<TEntity, Guid>, new()
    {
    }
}
