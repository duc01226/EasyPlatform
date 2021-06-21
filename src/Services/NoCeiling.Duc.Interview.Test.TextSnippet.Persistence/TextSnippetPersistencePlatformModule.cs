using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using NoCeiling.Duc.Interview.Test.Platform.Domain.Helpers;
using NoCeiling.Duc.Interview.Test.Platform.EfCore;
using NoCeiling.Duc.Interview.Test.Platform.EfCore.Domain.Helpers;

namespace NoCeiling.Duc.Interview.Test.TextSnippet.Persistence
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
