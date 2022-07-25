#nullable enable
using Easy.Platform.Domain.Exceptions;

namespace Easy.Platform.Domain.Entities.Extensions;

public static class PlatformEntityExtensions
{
    public static T? Find<T, TId>(this ICollection<T> entities, TId id) where T : IEntity<TId>
    {
        return entities.FirstOrDefault(p => p.Id != null && p.Id.Equals(id));
    }

    public static T Get<T, TId>(this ICollection<T> entities, TId id, Func<Exception>? notFoundException = null) where T : IEntity<TId>
    {
        return entities.Find(id) ??
               (notFoundException != null ? throw notFoundException() : throw new PlatformEntityNotFoundDomainException<T>(id?.ToString()));
    }
}
