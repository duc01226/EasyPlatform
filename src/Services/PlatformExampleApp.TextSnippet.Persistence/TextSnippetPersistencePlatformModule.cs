using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using AngularDotnetPlatform.Platform.Domain.Helpers;
using AngularDotnetPlatform.Platform.EfCore;
using AngularDotnetPlatform.Platform.EfCore.Domain.Helpers;

namespace PlatformExampleApp.TextSnippet.Persistence
{
    public class TextSnippetPersistencePlatformModule : PlatformEfCorePersistenceModule<TextSnippetDbContext>
    {
        public TextSnippetPersistencePlatformModule(
            IServiceProvider serviceProvider,
            ILogger<TextSnippetPersistencePlatformModule> logger) : base(serviceProvider, logger)
        {
        }

        protected override Type GetIUnitOfWorkConcreteType()
        {
            return typeof(TextSnippetPersistenceUnitOfWork);
        }

        protected override Action<DbContextOptionsBuilder> DbContextOptionsBuilderActionProvider(
            IServiceCollection serviceCollection,
            IConfiguration configuration)
        {
            return options =>
                options.UseSqlServer(configuration.GetConnectionString("DefaultConnection"));
        }
    }
}
