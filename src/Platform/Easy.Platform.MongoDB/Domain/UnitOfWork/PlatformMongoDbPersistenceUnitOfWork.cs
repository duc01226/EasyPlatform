using Easy.Platform.Common;
using Easy.Platform.Persistence.Domain;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.MongoDB.Domain.UnitOfWork;

public interface IPlatformMongoDbPersistenceUnitOfWork<out TDbContext> : IPlatformPersistenceUnitOfWork<TDbContext>
    where TDbContext : PlatformMongoDbContext<TDbContext>
{
}

public class PlatformMongoDbPersistenceUnitOfWork<TDbContext>
    : PlatformPersistenceUnitOfWork<TDbContext>, IPlatformMongoDbPersistenceUnitOfWork<TDbContext> where TDbContext : PlatformMongoDbContext<TDbContext>
{
    public PlatformMongoDbPersistenceUnitOfWork(
        IPlatformRootServiceProvider rootServiceProvider,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider) : base(
        rootServiceProvider,
        loggerFactory,
        serviceProvider)
    {
    }

    public override bool IsPseudoTransactionUow()
    {
        return true;
    }

    public override bool MustKeepUowForQuery()
    {
        return false;
    }

    public override bool DoesSupportParallelQuery()
    {
        return true;
    }
}
