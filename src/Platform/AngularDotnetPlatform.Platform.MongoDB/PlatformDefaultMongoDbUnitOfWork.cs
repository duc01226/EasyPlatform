using AngularDotnetPlatform.Platform.MongoDB.Domain.UnitOfWork;

namespace AngularDotnetPlatform.Platform.MongoDB
{
    public class PlatformDefaultMongoDbUnitOfWork<TDbContext> : PlatformMongoDbUnitOfWork<TDbContext> where TDbContext : IPlatformMongoDbContext<TDbContext>
    {
        public PlatformDefaultMongoDbUnitOfWork(TDbContext dbContext) : base(dbContext)
        {
        }
    }
}
