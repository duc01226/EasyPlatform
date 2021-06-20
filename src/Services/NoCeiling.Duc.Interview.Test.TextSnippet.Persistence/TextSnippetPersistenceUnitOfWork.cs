using NoCeiling.Duc.Interview.Test.Platform.EfCore.UnitOfWork;

namespace NoCeiling.Duc.Interview.Test.TextSnippet.Persistence
{
    internal class TextSnippetPersistenceUnitOfWork : PlatformEfCoreUnitOfWork<TextSnippetDbContext>
    {
        public TextSnippetPersistenceUnitOfWork(TextSnippetDbContext dbContext) : base(dbContext)
        {
        }
    }
}
