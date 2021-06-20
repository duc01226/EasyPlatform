using Microsoft.EntityFrameworkCore;
using NoCeiling.Duc.Interview.Test.Platform.EfCore;

namespace NoCeiling.Duc.Interview.Test.TextSnippet.Persistence
{
    public class TextSnippetDbContext : PlatformEfCoreDbContext<TextSnippetDbContext>
    {
        public TextSnippetDbContext(DbContextOptions<TextSnippetDbContext> options) : base(options)
        {
        }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            optionsBuilder.UseLazyLoadingProxies();
            base.OnConfiguring(optionsBuilder);
        }
    }
}
