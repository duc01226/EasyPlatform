using System;
using System.Text.Json;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform;
using AngularDotnetPlatform.Platform.Application.EventBus;
using AngularDotnetPlatform.Platform.Application.EventBus.Consumers;
using AngularDotnetPlatform.Platform.Application.EventBus.InboxPattern;
using AngularDotnetPlatform.Platform.Common.JsonSerialization;
using AngularDotnetPlatform.Platform.Domain.Events;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.Infrastructures.EventBus;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Application.EventBus.Consumers.EntityEventConsumers
{
    /// <summary>
    /// Demo using <see cref="PlatformInboxCqrsEntityEventBusConsumer{TEntity,TPrimaryKey}"/> to support inbox consumer
    /// <br/>
    /// <inheritdoc cref="PlatformInboxCqrsEntityEventBusConsumer{TEntity,TPrimaryKey}"/>
    /// </summary>
    [PlatformEventBusConsumer(PlatformCqrsEntityEvent.EventTypeValue, TextSnippetApplicationConstants.ApplicationName, "TextSnippetEntity")]
    public class SnippetTextEntityEventBusConsumer : PlatformInboxCqrsEntityEventBusConsumer<TextSnippetEntity, Guid>
    {
        public SnippetTextEntityEventBusConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IPlatformInboxEventBusMessageRepository inboxEventBusMessageRepo) : base(loggerFactory, uowManager, inboxEventBusMessageRepo)
        {
        }

        protected override Task InternalHandleAsync(PlatformEventBusMessage<TextSnippetEntity> message)
        {
            Logger.LogInformation($"{GetType().FullName} has handled message. Message Detail: ${JsonSerializer.Serialize(message, PlatformJsonSerializer.CurrentOptions.Value)}");
            return Task.CompletedTask;
        }
    }
}
