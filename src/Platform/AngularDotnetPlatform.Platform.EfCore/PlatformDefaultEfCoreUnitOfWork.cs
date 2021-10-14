using AngularDotnetPlatform.Platform.EfCore.Domain.UnitOfWork;

namespace AngularDotnetPlatform.Platform.EfCore
{
    public class PlatformDefaultEfCoreUnitOfWork<TDbContext> : PlatformEfCoreUnitOfWork<TDbContext> where TDbContext : PlatformEfCoreDbContext<TDbContext>
    {
        public PlatformDefaultEfCoreUnitOfWork(TDbContext dbContext) : base(dbContext)
        {
        }
    }
}
