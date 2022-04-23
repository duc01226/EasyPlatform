using Easy.Platform.Application.EventBus;
using Easy.Platform.Application.EventBus.InboxPattern;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Domain.UnitOfWork;

namespace Easy.Platform.EfCore.Domain.Repositories
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
