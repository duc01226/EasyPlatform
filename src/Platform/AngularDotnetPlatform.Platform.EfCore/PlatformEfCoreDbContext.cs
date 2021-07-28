using Microsoft.EntityFrameworkCore;

namespace AngularDotnetPlatform.Platform.EfCore
{
    public abstract class PlatformEfCoreDbContext<TDbContext> : DbContext where TDbContext : PlatformEfCoreDbContext<TDbContext>
    {
        public PlatformEfCoreDbContext(DbContextOptions<TDbContext> options) : base(options)
        {
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Auto apply configuration by convention.
            modelBuilder.ApplyConfigurationsFromAssembly(GetType().Assembly);

            base.OnModelCreating(modelBuilder);
        }
    }
}
