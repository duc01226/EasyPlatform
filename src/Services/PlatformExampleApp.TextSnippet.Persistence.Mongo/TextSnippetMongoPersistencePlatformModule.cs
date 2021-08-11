using System;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using AngularDotnetPlatform.Platform.MongoDB;

namespace PlatformExampleApp.TextSnippet.Persistence.Mongo
{
    public class TextSnippetMongoPersistencePlatformModule : PlatformMongoDbPersistenceModule<TextSnippetMongoClientContext, TextSnippetDbContext>
    {
        public TextSnippetMongoPersistencePlatformModule(
            IServiceProvider serviceProvider,
            IConfiguration configuration,
            ILogger<TextSnippetMongoPersistencePlatformModule> logger) : base(serviceProvider, configuration, logger)
        {
        }

        protected override Type GetIUnitOfWorkConcreteType()
        {
            return typeof(TextSnippetPersistenceUnitOfWork);
        }

        protected override void ConfigureMongoOptions(PlatformMongoOptions options)
        {
            options.ConnectionString = Configuration.GetSection("MongoDB:ConnectionString").Value;
            options.Database = Configuration.GetSection("MongoDB:Database").Value;
        }
    }
}
