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
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformEventBusProducer eventBusProducer,
            IPlatformApplicationSettingContext applicationSettingContext,
            IPlatformApplicationUserContextAccessor userContextAccessor,
            ILoggerFactory loggerFactory) : base(unitOfWorkManager, eventBusProducer, applicationSettingContext, userContextAccessor, loggerFactory)
        {
        }
    }
}
