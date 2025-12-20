using System.Linq.Expressions;
using MongoDB.Driver.Linq;

namespace Easy.Platform.MongoDB.Extensions;

public static class MongoQueryableExtensions
{
    public static Task<List<TSource>> MongoToListAsync<TSource>(this IQueryable<TSource> source, CancellationToken cancellationToken = default)
    {
        return source.ToListAsync(cancellationToken);
    }

    public static Task<TSource> MongoFirstOrDefaultAsync<TSource>(this IQueryable<TSource> source, CancellationToken cancellationToken = default)
    {
        return source.FirstOrDefaultAsync(cancellationToken);
    }

    public static Task<TSource> MongoFirstOrDefaultAsync<TSource>(
        this IQueryable<TSource> source,
        Expression<Func<TSource, bool>> predicate,
        CancellationToken cancellationToken = default)
    {
        return source.FirstOrDefaultAsync(predicate, cancellationToken);
    }

    public static Task<TSource> MongoFirstAsync<TSource>(this IQueryable<TSource> source, CancellationToken cancellationToken = default)
    {
        return source.FirstAsync(cancellationToken);
    }

    public static Task<int> MongoCountAsync<TSource>(
        this IQueryable<TSource> source,
        CancellationToken cancellationToken = default)
    {
        return source.CountAsync(cancellationToken);
    }

    public static Task<bool> MongoAnyAsync<TSource>(
        this IQueryable<TSource> source,
        CancellationToken cancellationToken = default)
    {
        return source.AnyAsync(cancellationToken);
    }

    public static Task<int> MongoCountAsync<TSource>(
        this IQueryable<TSource> source,
        Expression<Func<TSource, bool>> predicate,
        CancellationToken cancellationToken = default)
    {
        return source.CountAsync(predicate, cancellationToken);
    }

    public static Task<bool> MongoAnyAsync<TSource>(
        this IQueryable<TSource> source,
        Expression<Func<TSource, bool>> predicate,
        CancellationToken cancellationToken = default)
    {
        return source.AnyAsync(predicate, cancellationToken);
    }
}
