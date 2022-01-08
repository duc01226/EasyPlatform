using AngularDotnetPlatform.Platform.Common.Cqrs.Events;

namespace AngularDotnetPlatform.Platform.Common.Cqrs.Commands
{
    public abstract class PlatformCqrsCommandEvent : PlatformCqrsEvent
    {
        public const string EventTypeValue = "CommandEvent";
        public static string EventNameValue<TCommand>()
        {
            return typeof(TCommand).Name;
        }
    }

    public class PlatformCqrsCommandEvent<TCommand> : PlatformCqrsCommandEvent
        where TCommand : class, IPlatformCqrsCommand, new()
    {
        public PlatformCqrsCommandEvent() { }

        public PlatformCqrsCommandEvent(TCommand commandData, PlatformCqrsCommandEventAction? action = null)
        {
            Id = commandData.HandleAuditedTrackId.ToString();
            CommandData = commandData;
            Action = action;
        }

        public TCommand CommandData { get; set; }
        public PlatformCqrsCommandEventAction? Action { get; set; }

        public override string EventType => EventTypeValue;
        public override string EventName => EventNameValue<TCommand>();
        public override string EventAction => Action?.ToString();
    }

    public enum PlatformCqrsCommandEventAction
    {
        Executing,
        Executed
    }
}
