using AngularDotnetPlatform.Platform.MongoDB.Domain.UnitOfWork;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

namespace PlatformExampleApp.TextSnippet.Persistence.Mongo
{
    internal class TextSnippetPersistenceUnitOfWork : PlatformMongoDbUnitOfWork<TextSnippetDbContext>, ITextSnippetMongoUnitOfWork
    {
        public TextSnippetPersistenceUnitOfWork(TextSnippetDbContext dbContext) : base(dbContext)
        {
        }
    }
}
