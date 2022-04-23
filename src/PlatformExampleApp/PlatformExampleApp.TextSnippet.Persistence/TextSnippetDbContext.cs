using Microsoft.EntityFrameworkCore;
using Easy.Platform.EfCore;
using Microsoft.EntityFrameworkCore.Design;

namespace PlatformExampleApp.TextSnippet.Persistence
{
    public class TextSnippetDbContext : PlatformEfCoreDbContext<TextSnippetDbContext>
    {
        public TextSnippetDbContext(DbContextOptions<TextSnippetDbContext> options, PlatformEfCoreOptions efCoreOptions) : base(options, efCoreOptions)
        {
        }
    }

    /// <summary>
    /// We use IDesignTimeDbContextFactory because we are supporting switching db demo,
    /// which we couldn't create migration at design time.
    /// References: https://docs.microsoft.com/en-us/ef/core/cli/dbcontext-creation?tabs=dotnet-core-cli#from-a-design-time-factory
    /// </summary>
    public class TextSnippetDesignTimeDbContextFactory : IDesignTimeDbContextFactory<TextSnippetDbContext>
    {
        public TextSnippetDbContext CreateDbContext(string[] args)
        {
            var optionsBuilder = new DbContextOptionsBuilder<TextSnippetDbContext>();
            optionsBuilder.UseSqlServer("Data Source=localhost,14330;Initial Catalog=TextSnippedDb;User ID=sa;Password=123456Abc");

            return new TextSnippetDbContext(
                optionsBuilder.Options,
                new PlatformEfCoreOptions()
                {
                    EnableDefaultInboxEventBusMessageEntityConfiguration = new TextSnippetEfCorePersistenceModule(null, null).GetEnableDefaultInboxEventBusMessageEntityConfigurationDefaultValue()
                });
        }
    }
}
