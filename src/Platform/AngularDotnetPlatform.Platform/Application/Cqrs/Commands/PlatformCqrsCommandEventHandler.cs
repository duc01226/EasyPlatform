using AngularDotnetPlatform.Platform.Application.Cqrs.Events;
using AngularDotnetPlatform.Platform.Common.Cqrs.Commands;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;

namespace AngularDotnetPlatform.Platform.Application.Cqrs.Commands
{
    public abstract class PlatformCqrsCommandEventHandler<TCommand> : PlatformCqrsEventHandler<PlatformCqrsCommandEvent<TCommand>>
        where TCommand : class, IPlatformCqrsCommand, new()
    {
        protected PlatformCqrsCommandEventHandler(IUnitOfWorkManager unitOfWorkManager) : base(unitOfWorkManager)
        {
        }
    }
}
