using System;
using AngularDotnetPlatform.Platform.Application.Context;
using AngularDotnetPlatform.Platform.Application.Context.UserContext;
using AngularDotnetPlatform.Platform.Application.EventBus.Producers;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.EventBus;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Application.EventBus.Producers.EntityEventBusProducer
{
    public class TextSnippetEntityEventBusProducer : PlatformCqrsEntityEventBusProducer<TextSnippetEntity, Guid>
    {
        public TextSnippetEntityEventBusProducer(
            IPlatformEventBusProducer eventBusProducer,
            IPlatformApplicationSettingContext applicationSettingContext,
            IPlatformApplicationUserContextAccessor userContextAccessor,
            IUnitOfWorkManager unitOfWorkManager,
            ILoggerFactory loggerFactory) : base(eventBusProducer, applicationSettingContext, userContextAccessor, unitOfWorkManager, loggerFactory)
        {
        }
    }
}
