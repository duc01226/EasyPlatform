using AngularDotnetPlatform.Platform.MongoDB.Domain.UnitOfWork;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

namespace PlatformExampleApp.TextSnippet.Persistence.MultiDbDemo.Mongo
{
    internal class TextSnippetMultiDbDemoMongoUnitOfWork : PlatformMongoDbUnitOfWork<TextSnippetMultiDbDemoDbContext>
    {
        public TextSnippetMultiDbDemoMongoUnitOfWork(TextSnippetMultiDbDemoDbContext dbContext) : base(dbContext)
        {
        }
    }
}
