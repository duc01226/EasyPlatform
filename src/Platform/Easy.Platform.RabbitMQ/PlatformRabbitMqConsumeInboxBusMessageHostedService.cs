using System;
using Easy.Platform.Application.Context;
using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.RabbitMQ;

public class PlatformRabbitMqConsumeInboxBusMessageHostedService : PlatformConsumeInboxBusMessageHostedService
{
    private readonly PlatformRabbitMqOptions options;

    public PlatformRabbitMqConsumeInboxBusMessageHostedService(
        IHostApplicationLifetime applicationLifetime,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider,
        IPlatformApplicationSettingContext applicationSettingContext,
        PlatformRabbitMqOptions options,
        IPlatformMessageBusManager messageBusManager,
        PlatformInboxConfig inboxConfig) : base(
        applicationLifetime,
        loggerFactory,
        serviceProvider,
        applicationSettingContext,
        messageBusManager,
        inboxConfig)
    {
        this.options = options;
    }

    protected override bool IsLogConsumerProcessTime()
    {
        return options.IsLogConsumerProcessTime;
    }

    protected override double LogErrorSlowProcessWarningTimeMilliseconds()
    {
        return options.LogErrorSlowProcessWarningTimeMilliseconds;
    }
}
