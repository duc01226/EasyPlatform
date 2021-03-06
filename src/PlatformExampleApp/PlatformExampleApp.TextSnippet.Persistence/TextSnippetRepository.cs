using Easy.Platform.Common.Cqrs;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.EfCore.Domain.Repositories;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

namespace PlatformExampleApp.TextSnippet.Persistence;

internal class TextSnippetRepository<TEntity> : PlatformEfCoreRepository<TEntity, Guid, TextSnippetDbContext>,
    ITextSnippetRepository<TEntity>
    where TEntity : class, IEntity<Guid>, new()
{
    public TextSnippetRepository(IUnitOfWorkManager unitOfWorkManager, IPlatformCqrs cqrs) : base(
        unitOfWorkManager,
        cqrs)
    {
    }
}

internal class TextSnippetRootRepository<TEntity> :
    PlatformEfCoreRootRepository<TEntity, Guid, TextSnippetDbContext>,
    ITextSnippetRootRepository<TEntity>
    where TEntity : class, IRootEntity<Guid>, new()
{
    public TextSnippetRootRepository(IUnitOfWorkManager unitOfWorkManager, IPlatformCqrs cqrs) : base(
        unitOfWorkManager,
        cqrs)
    {
    }
}
