using System;
using Easy.Platform.Application.Context;
using Easy.Platform.Application.MessageBus.OutboxPattern;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.RabbitMQ;

public class PlatformRabbitMqSendOutboxBusMessageHostedService : PlatformSendOutboxBusMessageHostedService
{
    public PlatformRabbitMqSendOutboxBusMessageHostedService(
        IHostApplicationLifetime applicationLifetime,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider,
        IPlatformApplicationSettingContext applicationSettingContext,
        PlatformOutboxConfig outboxConfig) : base(
        applicationLifetime,
        loggerFactory,
        serviceProvider,
        applicationSettingContext,
        outboxConfig)
    {
    }
}
