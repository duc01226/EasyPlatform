namespace AngularDotnetPlatform.Platform.Cqrs
{
    public abstract class PlatformCqrsCommandEventHandler<TCommand, TCommandResult> : PlatformCqrsEventHandler<PlatformCqrsCommandEvent<TCommand, TCommandResult>>
        where TCommand : PlatformCqrsCommand<TCommandResult>
        where TCommandResult : PlatformCqrsCommandResult, new()
    {
    }

    public abstract class PlatformCqrsCommandEventHandler<TCommandEvent, TCommand, TCommandResult> : PlatformCqrsEventHandler<TCommandEvent>
        where TCommandEvent : PlatformCqrsCommandEvent<TCommand, TCommandResult>
        where TCommand : PlatformCqrsCommand<TCommandResult>
        where TCommandResult : PlatformCqrsCommandResult, new()
    {
    }
}
