using Easy.Platform.HangfireBackgroundJob;
using Microsoft.Extensions.Configuration;

namespace PlatformExampleApp.TextSnippet.Api
{
    public class TextSnippetHangfireBackgroundJobModule : PlatformHangfireBackgroundJobModule
    {
        public TextSnippetHangfireBackgroundJobModule(IServiceProvider serviceProvider, IConfiguration configuration) :
            base(serviceProvider, configuration)
        {
        }

        protected override PlatformHangfireBackgroundJobStorageType UseBackgroundJobStorage()
        {
            return Configuration.GetSection("UseDbType").Get<string>() == "MongoDb"
                ? PlatformHangfireBackgroundJobStorageType.Mongo
                : PlatformHangfireBackgroundJobStorageType.Sql;
        }

        protected override string StorageOptionsConnectionString()
        {
            return Configuration.GetSection("UseDbType").Get<string>() == "MongoDb"
                ? Configuration.GetSection("MongoDB:ConnectionString").Get<string>()
                : Configuration.GetSection("ConnectionStrings:DefaultConnection").Get<string>();
        }

        protected override PlatformHangfireUseMongoStorageOptions UseMongoStorageOptions()
        {
            var options = base.UseMongoStorageOptions();
            options.DatabaseName = Configuration.GetSection("MongoDB:Database").Get<string>();
            return options;
        }
    }
}
