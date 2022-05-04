using Easy.Platform.Application.EventBus.InboxPattern;
using Easy.Platform.Application.EventBus.OutboxPattern;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Domain.UnitOfWork;

namespace Easy.Platform.MongoDB.Domain.Repositories
{
    public class PlatformDefaultMongoDbOutboxEventBusMessageRepository<TDbContext> :
        PlatformDefaultMongoDbRootRepository<PlatformOutboxEventBusMessage, string, TDbContext>, IPlatformOutboxEventBusMessageRepository
        where TDbContext : IPlatformMongoDbContext<TDbContext>
    {
        public PlatformDefaultMongoDbOutboxEventBusMessageRepository(IUnitOfWorkManager unitOfWorkManager, IPlatformCqrs cqrs) : base(unitOfWorkManager, cqrs)
        {
        }
    }
}
