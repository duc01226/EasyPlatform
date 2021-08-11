using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using AngularDotnetPlatform.Platform.EfCore;

namespace PlatformExampleApp.TextSnippet.Persistence
{
    public class TextSnippetEfCorePersistencePlatformModule : PlatformEfCorePersistenceModule<TextSnippetDbContext>
    {
        public TextSnippetEfCorePersistencePlatformModule(
            IServiceProvider serviceProvider,
            IConfiguration configuration,
            ILogger<TextSnippetEfCorePersistencePlatformModule> logger) : base(serviceProvider, configuration, logger)
        {
        }

        protected override Type GetIUnitOfWorkConcreteType()
        {
            return typeof(TextSnippetPersistenceUnitOfWork);
        }

        protected override Action<DbContextOptionsBuilder> DbContextOptionsBuilderActionProvider(IServiceCollection serviceCollection)
        {
            return options =>
                options.UseSqlServer(Configuration.GetConnectionString("DefaultConnection"));
        }
    }
}
