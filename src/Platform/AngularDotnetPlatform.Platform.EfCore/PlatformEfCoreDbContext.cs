using AngularDotnetPlatform.Platform.EfCore.EntityConfiguration;
using Microsoft.EntityFrameworkCore;

namespace AngularDotnetPlatform.Platform.EfCore
{
    public abstract class PlatformEfCoreDbContext<TDbContext> : DbContext where TDbContext : PlatformEfCoreDbContext<TDbContext>
    {
        private readonly PlatformEfCoreOptions efCoreOptions;

        public PlatformEfCoreDbContext(DbContextOptions<TDbContext> options, PlatformEfCoreOptions efCoreOptions) : base(options)
        {
            this.efCoreOptions = efCoreOptions;
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Auto apply configuration by convention.
            modelBuilder.ApplyConfigurationsFromAssembly(GetType().Assembly);

            if (efCoreOptions.EnableDefaultInboxEventBusMessageEntityConfiguration == true)
                modelBuilder.ApplyConfiguration(new PlatformDefaultInboxEventBusMessageConfiguration());

            base.OnModelCreating(modelBuilder);
        }
    }
}
