using AngularDotnetPlatform.Platform.EfCore.Domain.UnitOfWork;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

namespace PlatformExampleApp.TextSnippet.Persistence
{
    internal class TextSnippetPersistenceUnitOfWork : PlatformEfCoreUnitOfWork<TextSnippetDbContext>, ITextSnippetSqlUnitOfWork
    {
        public TextSnippetPersistenceUnitOfWork(TextSnippetDbContext dbContext) : base(dbContext)
        {
        }
    }
}
