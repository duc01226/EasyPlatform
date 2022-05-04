using Easy.Platform.Application.EventBus.InboxPattern;
using Easy.Platform.Application.EventBus.OutboxPattern;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Domain.UnitOfWork;

namespace Easy.Platform.EfCore.Domain.Repositories
{
    public class PlatformDefaultEfCoreOutboxEventBusMessageRepository<TDbContext> :
        PlatformDefaultEfCoreRootRepository<PlatformOutboxEventBusMessage, string, TDbContext>,
        IPlatformOutboxEventBusMessageRepository
        where TDbContext : PlatformEfCoreDbContext<TDbContext>
    {
        public PlatformDefaultEfCoreOutboxEventBusMessageRepository(IUnitOfWorkManager unitOfWorkManager, IPlatformCqrs cqrs) : base(unitOfWorkManager, cqrs)
        {
        }
    }
}
