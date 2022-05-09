using System;
using Easy.Platform.Application.EventBus.OutboxPattern;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Easy.Platform.EfCore;

namespace PlatformExampleApp.TextSnippet.Persistence
{
    public class TextSnippetEfCorePersistenceModule : PlatformEfCorePersistenceModule<TextSnippetDbContext>
    {
        public TextSnippetEfCorePersistenceModule(
            IServiceProvider serviceProvider,
            IConfiguration configuration) : base(serviceProvider, configuration)
        {
        }

        protected override bool EnableInboxEventBusMessageRepository()
        {
            return true;
        }

        protected override bool EnableOutboxEventBusMessageRepository()
        {
            return true;
        }

        // This example config help to override to config outbox config
        //protected override PlatformOutboxConfig OutboxConfigProvider(IServiceProvider serviceProvider)
        //{
        //    var defaultConfig = new PlatformOutboxConfig
        //    {
        //        // You may only want to set this to true only when you are using mix old system and new platform code. You do not call uow.complete
        //        // after call sendMessages. This will force sending message always start use there own uow
        //        ForceAlwaysSendOutboxInNewUow = true
        //    };

        //    return defaultConfig;
        //}

        protected override Action<DbContextOptionsBuilder> DbContextOptionsBuilderActionProvider(IServiceProvider serviceProvider)
        {
            return options =>
                options.UseSqlServer(Configuration.GetConnectionString("DefaultConnection"));
        }
    }
}
