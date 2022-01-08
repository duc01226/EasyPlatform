using AngularDotnetPlatform.Platform.Application.EventBus;
using AngularDotnetPlatform.Platform.Common.Cqrs;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;

namespace AngularDotnetPlatform.Platform.EfCore.Domain.Repositories
{
    public class PlatformDefaultEfCoreInboxEventBusMessageRepository<TDbContext> :
        PlatformDefaultEfCoreRootRepository<PlatformInboxEventBusMessage, string, TDbContext>,
        IPlatformInboxEventBusMessageRepository
        where TDbContext : PlatformEfCoreDbContext<TDbContext>
    {
        public PlatformDefaultEfCoreInboxEventBusMessageRepository(IUnitOfWorkManager unitOfWorkManager, IPlatformCqrs cqrs) : base(unitOfWorkManager, cqrs)
        {
        }
    }
}
