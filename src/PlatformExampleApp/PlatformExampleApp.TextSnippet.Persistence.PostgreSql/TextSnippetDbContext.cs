using Easy.Platform.EfCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using PlatformExampleApp.TextSnippet.Application.Persistence;

namespace PlatformExampleApp.TextSnippet.Persistence.PostgreSql;

public sealed class TextSnippetDbContext : PlatformEfCoreDbContext<TextSnippetDbContext>, ITextSnippetDbContext
{
    public TextSnippetDbContext(
        DbContextOptions<TextSnippetDbContext> options) : base(
        options)
    {
    }

    /// <summary>
    /// We use IDesignTimeDbContextFactory to help use "dotnet ef migrations add" at this project rather than at api project
    /// which we couldn't do it because we are implementing switch db
    /// References: https://docs.microsoft.com/en-us/ef/core/cli/dbcontext-creation?tabs=dotnet-core-cli#from-a-design-time-factory
    /// </summary>
    public class TextSnippetDesignTimeDbContextFactory : IDesignTimeDbContextFactory<TextSnippetDbContext>
    {
        public TextSnippetDbContext CreateDbContext(string[] args)
        {
            var optionsBuilder = new DbContextOptionsBuilder<TextSnippetDbContext>();
            optionsBuilder.UseNpgsql("Host=localhost;Port=54320;Username=postgres;Password=postgres;Database=TextSnippedDb");

            return new TextSnippetDbContext(optionsBuilder.Options);
        }
    }
}
