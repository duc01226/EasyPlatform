namespace Easy.Platform.Application.EventBus.OutboxPattern
{
    public class PlatformOutboxConfig
    {
        /// <summary>
        /// You may only want to set this to true only when you are using mix old system and new platform code. You do not call uow.complete
        /// after call sendMessages. This will force sending message always start use there own uow
        /// </summary>
        public bool ForceAlwaysSendOutboxInNewUow { get; set; }
    }
}
