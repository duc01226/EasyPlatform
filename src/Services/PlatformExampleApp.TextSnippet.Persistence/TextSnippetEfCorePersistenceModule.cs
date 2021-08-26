using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using AngularDotnetPlatform.Platform.EfCore;

namespace PlatformExampleApp.TextSnippet.Persistence
{
    public class TextSnippetEfCorePersistenceModule : PlatformEfCorePersistenceModule<TextSnippetDbContext>
    {
        public TextSnippetEfCorePersistenceModule(
            IServiceProvider serviceProvider,
            IConfiguration configuration,
            ILogger<TextSnippetEfCorePersistenceModule> logger) : base(serviceProvider, configuration, logger)
        {
        }

        protected override Action<DbContextOptionsBuilder> DbContextOptionsBuilderActionProvider(IServiceCollection serviceCollection)
        {
            return options =>
                options.UseSqlServer(Configuration.GetConnectionString("DefaultConnection"));
        }
    }
}
