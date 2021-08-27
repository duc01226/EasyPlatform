using System;
using System.Text.Json;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform;
using AngularDotnetPlatform.Platform.Application.EventBus.Consumers;
using AngularDotnetPlatform.Platform.Domain.Events;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.EventBus;
using AngularDotnetPlatform.Platform.JsonSerialization;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Application.EventBus.Consumers.EntityEventConsumers
{
    [PlatformEventBusConsumer(PlatformCqrsEntityEvent.EventTypeValue, TextSnippetApplicationConstants.ApplicationName, "TextSnippetEntity")]
    public class SnippetTextEntityEventBusConsumer : PlatformCqrsEntityEventBusConsumer<TextSnippetEntity, Guid>
    {
        public SnippetTextEntityEventBusConsumer(ILoggerFactory loggerFactory, IUnitOfWorkManager uowManager) : base(loggerFactory, uowManager)
        {
        }

        protected override Task InternalHandleAsync(PlatformEventBusMessage<TextSnippetEntity> message)
        {
            Logger.LogInformation($"{GetType().FullName} has handled message. Message Detail: ${JsonSerializer.Serialize(message, PlatformJsonSerializer.CurrentOptions.Value)}");
            return Task.CompletedTask;
        }
    }
}
