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
        private readonly ILogger<TextSnippetPersistencePlatformModule> logger;

        public TextSnippetPersistencePlatformModule(
            IServiceProvider serviceProvider,
            ILogger<TextSnippetPersistencePlatformModule> logger) : base(serviceProvider, logger)
        {
            this.logger = logger;
        }

        protected override Type GetIUnitOfWorkConcreteType()
        {
            return typeof(TextSnippetPersistenceUnitOfWork);
        }

        protected override void InternalRegister(IServiceCollection serviceCollection, IConfiguration configuration)
        {
            base.InternalRegister(serviceCollection, configuration);
            serviceCollection.AddDbContext<TextSnippetDbContext>(options =>
                options.UseSqlServer(configuration.GetConnectionString("DefaultConnection")));
            serviceCollection.AddTransient<IPlatformFullTextSearchDomainHelper, EfCoreSqlPlatformFullTextSearchDomainHelper>();
        }
    }
}
