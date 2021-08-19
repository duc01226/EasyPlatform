using AngularDotnetPlatform.Platform.EfCore.Domain.UnitOfWork;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

namespace PlatformExampleApp.TextSnippet.Persistence
{
    internal class TextSnippetEfCoreUnitOfWork : PlatformEfCoreUnitOfWork<TextSnippetDbContext>
    {
        public TextSnippetEfCoreUnitOfWork(TextSnippetDbContext dbContext) : base(dbContext)
        {
        }
    }
}
