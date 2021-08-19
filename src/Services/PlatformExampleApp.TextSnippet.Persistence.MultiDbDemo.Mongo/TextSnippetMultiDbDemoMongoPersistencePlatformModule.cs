using System;
using System.Collections.Generic;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using AngularDotnetPlatform.Platform.MongoDB;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Persistence.MultiDbDemo.Mongo
{
    /// <summary>
    /// This is an example for using multi mixed db in one micro service.
    /// We can implement an ef-core module for TextSnippetMultiDbDemoPersistencePlatformModule too
    /// and import the right module as we needed.
    /// </summary>
    public class TextSnippetMultiDbDemoMongoPersistencePlatformModule :
        PlatformMongoDbPersistenceModule<TextSnippetMultiDbDemoMongoClientContext, TextSnippetMultiDbDemoDbContext, TextSnippetMultiDbDemoMongoOptions>
    {
        public TextSnippetMultiDbDemoMongoPersistencePlatformModule(
            IServiceProvider serviceProvider,
            IConfiguration configuration,
            ILogger<TextSnippetMultiDbDemoMongoPersistencePlatformModule> logger) : base(serviceProvider, configuration, logger)
        {
        }

        protected override void ConfigureMongoOptions(TextSnippetMultiDbDemoMongoOptions options)
        {
            options.ConnectionString = Configuration.GetSection("MongoDB:ConnectionString").Value;
            options.Database = Configuration.GetSection("MongoDB:MultiDbDemoDbDatabase").Value;
        }

        protected override List<Type> RegisterLimitedRepositoryImplementationTypes()
        {
            return new List<Type>() { typeof(TextSnippetMultiDbDemoRootRepository<MultiDbDemoEntity>) };
        }
    }
}
