#region

using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Repositories;

#endregion

namespace PlatformExampleApp.TextSnippet.Domain.Repositories;

public interface IUserRepository<TEntity> : IPlatformQueryableRepository<TEntity, string>
    where TEntity : class, IEntity<string>, new()
{
}

public interface IUserRootRepository<TEntity> : IPlatformQueryableRootRepository<TEntity, string>, IUserRepository<TEntity>
    where TEntity : class, IRootEntity<string>, new()
{
}
