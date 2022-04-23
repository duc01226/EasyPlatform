using Easy.Platform.Application.EventBus;
using Easy.Platform.Application.EventBus.InboxPattern;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Domain.UnitOfWork;

namespace Easy.Platform.MongoDB.Domain.Repositories
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
