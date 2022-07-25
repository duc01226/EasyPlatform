using Easy.Platform.Common.Cqrs.Commands;
using Easy.Platform.Domain.UnitOfWork;

namespace Easy.Platform.Application.Cqrs.Commands
{
    public abstract class PlatformCqrsCommandEventApplicationHandler<TCommand> : PlatformCqrsEventApplicationHandler<PlatformCqrsCommandEvent<TCommand>>
        where TCommand : class, IPlatformCqrsCommand, new()
    {
        protected PlatformCqrsCommandEventApplicationHandler(IUnitOfWorkManager unitOfWorkManager) : base(
            unitOfWorkManager)
        {
        }
    }
}
