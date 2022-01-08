using AngularDotnetPlatform.Platform.Application.EventBus;
using AngularDotnetPlatform.Platform.Common.Cqrs;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;

namespace AngularDotnetPlatform.Platform.MongoDB.Domain.Repositories
{
    public class PlatformDefaultMongoDbInboxEventBusMessageRepository<TDbContext> :
        PlatformDefaultMongoDbRootRepository<PlatformInboxEventBusMessage, string, TDbContext>, IPlatformInboxEventBusMessageRepository
        where TDbContext : IPlatformMongoDbContext<TDbContext>
    {
        public PlatformDefaultMongoDbInboxEventBusMessageRepository(IUnitOfWorkManager unitOfWorkManager, IPlatformCqrs cqrs) : base(unitOfWorkManager, cqrs)
        {
        }
    }
}
