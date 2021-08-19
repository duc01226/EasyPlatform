using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using AngularDotnetPlatform.Platform.EfCore;
using PlatformExampleApp.TextSnippet.Domain.Entities;

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

        protected override Action<DbContextOptionsBuilder> DbContextOptionsBuilderActionProvider(IServiceCollection serviceCollection)
        {
            return options =>
                options.UseSqlServer(Configuration.GetConnectionString("DefaultConnection"));
        }

        protected override List<Type> RegisterLimitedRepositoryImplementationTypes()
        {
            return new List<Type>() { typeof(TextSnippetRootRepository<TextSnippetEntity>) };
        }
    }
}
