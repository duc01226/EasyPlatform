using Microsoft.EntityFrameworkCore;
using AngularDotnetPlatform.Platform.EfCore;

namespace PlatformExampleApp.TextSnippet.Persistence
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
