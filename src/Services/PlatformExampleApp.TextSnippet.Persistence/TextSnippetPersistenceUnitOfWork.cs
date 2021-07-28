using AngularDotnetPlatform.Platform.EfCore.Domain.UnitOfWork;

namespace PlatformExampleApp.TextSnippet.Persistence
{
    internal class TextSnippetPersistenceUnitOfWork : PlatformEfCoreUnitOfWork<TextSnippetDbContext>
    {
        public TextSnippetPersistenceUnitOfWork(TextSnippetDbContext dbContext) : base(dbContext)
        {
        }
    }
}
