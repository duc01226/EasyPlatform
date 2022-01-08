using AngularDotnetPlatform.Platform.Application.Cqrs.Events;
using AngularDotnetPlatform.Platform.Common.Cqrs.Commands;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;

namespace AngularDotnetPlatform.Platform.Application.Cqrs.Commands
{
    public abstract class PlatformCqrsApplicationCommandEventHandler<TCommand> : PlatformCqrsApplicationEventHandler<PlatformCqrsCommandEvent<TCommand>>
        where TCommand : class, IPlatformCqrsCommand, new()
    {
        protected PlatformCqrsApplicationCommandEventHandler(IUnitOfWorkManager unitOfWorkManager) : base(unitOfWorkManager)
        {
        }
    }
}
