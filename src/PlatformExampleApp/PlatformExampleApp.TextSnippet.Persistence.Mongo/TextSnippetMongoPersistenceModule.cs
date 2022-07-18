using Easy.Platform.MongoDB;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace PlatformExampleApp.TextSnippet.Persistence.Mongo
{
    public class TextSnippetMongoPersistenceModule : PlatformMongoDbPersistenceModule<TextSnippetDbContext>
    {
        public TextSnippetMongoPersistenceModule(
            IServiceProvider serviceProvider,
            IConfiguration configuration) : base(serviceProvider, configuration)
        {
        }

        protected override void ConfigureMongoOptions(PlatformMongoOptions<TextSnippetDbContext> options)
        {
            options.ConnectionString = Configuration.GetSection("MongoDB:ConnectionString").Value;
            options.Database = Configuration.GetSection("MongoDB:Database").Value;
        }

        protected override bool IsDevEnvironment()
        {
            return ServiceProvider.GetRequiredService<IHostEnvironment>().EnvironmentName.Contains("Development");
        }

        protected override bool EnableInboxEventBusMessageRepository()
        {
            return true;
        }

        protected override bool EnableOutboxEventBusMessageRepository()
        {
            return true;
        }
    }
}
