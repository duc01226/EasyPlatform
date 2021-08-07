namespace AngularDotnetPlatform.Platform.Cqrs
{
    public abstract class PlatformCqrsCommandEventHandler<TCommandEvent, TCommand, TCommandResult> : PlatformCqrsEventHandler<TCommandEvent>
        where TCommandEvent : PlatformCqrsCommandEvent<TCommand, TCommandResult>
        where TCommand : PlatformCqrsCommand<TCommandResult>
        where TCommandResult : PlatformCqrsCommandResult, new()
    {
    }
}
