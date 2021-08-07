namespace AngularDotnetPlatform.Platform.Cqrs
{
    public class PlatformCqrsCommandEvent<TCommand, TCommandResult> : PlatformCqrsEvent
        where TCommand : PlatformCqrsCommand<TCommandResult>
        where TCommandResult : PlatformCqrsCommandResult, new()
    {
        public PlatformCqrsCommandEvent() { }

        public PlatformCqrsCommandEvent(TCommand commandData, string routingKeyPrefix)
        {
            CommandData = commandData;
            RoutingKeyPrefix = routingKeyPrefix;
        }

        public TCommand CommandData { get; set; }

        /// <summary>
        /// Routing Key Prefix is used as a prefix for command event. The RoutingKey of an event is used to binding a event-bus queue to event for listening events.
        /// RoutingKey = $"{RoutingKeyPrefix}.CommandEvent.{typeof(TCommand).Name}"
        /// Usually RoutingKeyPrefix should be the unique name of a micro-service.
        /// </summary>
        public string RoutingKeyPrefix { get; }

        public override string GetRoutingKey()
        {
            return $"{RoutingKeyPrefix}.CommandEvent.{typeof(TCommand).Name}";
        }
    }
}
