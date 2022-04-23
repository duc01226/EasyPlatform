using System;
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

        protected override Action<DbContextOptionsBuilder> DbContextOptionsBuilderActionProvider(IServiceProvider serviceProvider)
        {
            return options =>
                options.UseSqlServer(Configuration.GetConnectionString("DefaultConnection"));
        }
    }
}
