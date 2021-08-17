using AngularDotnetPlatform.Platform.Cqrs.Events;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;

namespace AngularDotnetPlatform.Platform.Cqrs.Commands
{
    public abstract class PlatformCqrsCommandEventHandler<TCommand, TCommandResult> : PlatformCqrsEventHandler<PlatformCqrsCommandEvent<TCommand, TCommandResult>>
        where TCommand : PlatformCqrsCommand<TCommandResult>, new()
        where TCommandResult : PlatformCqrsCommandResult, new()
    {
        protected PlatformCqrsCommandEventHandler(IUnitOfWorkManager unitOfWorkManager) : base(unitOfWorkManager)
        {
        }
    }

    public abstract class PlatformCqrsCommandEventHandler<TCommand, TCommandResult, TUnitOfWork> : PlatformCqrsCommandEventHandler<TCommand, TCommandResult>
        where TCommand : PlatformCqrsCommand<TCommandResult>, new()
        where TCommandResult : PlatformCqrsCommandResult, new()
        where TUnitOfWork : IUnitOfWork
    {
        protected PlatformCqrsCommandEventHandler(IUnitOfWorkManager unitOfWorkManager) : base(unitOfWorkManager)
        {
        }

        protected override IUnitOfWork BeginUnitOfWork()
        {
            return UnitOfWorkManager.Begin<TUnitOfWork>();
        }
    }
}
