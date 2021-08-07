using AngularDotnetPlatform.Platform.MongoDB.Domain.UnitOfWork;

namespace PlatformExampleApp.TextSnippet.Persistence.Mongo
{
    internal class TextSnippetPersistenceUnitOfWork : PlatformMongoDbUnitOfWork<TextSnippetDbContext>
    {
        public TextSnippetPersistenceUnitOfWork(TextSnippetDbContext dbContext) : base(dbContext)
        {
        }
    }
}
