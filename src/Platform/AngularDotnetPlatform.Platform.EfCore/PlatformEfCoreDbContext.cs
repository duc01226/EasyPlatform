using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.Persistence;
using AngularDotnetPlatform.Platform.Common.Extensions;
using AngularDotnetPlatform.Platform.Domain.Entities;
using AngularDotnetPlatform.Platform.EfCore.EntityConfiguration;
using AngularDotnetPlatform.Platform.Persistence;
using AngularDotnetPlatform.Platform.Persistence.DataMigration;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace AngularDotnetPlatform.Platform.EfCore
{
    public abstract class PlatformEfCoreDbContext<TDbContext> : DbContext, IPlatformDbContext where TDbContext : PlatformEfCoreDbContext<TDbContext>
    {
        private readonly PlatformEfCoreOptions efCoreOptions;

        public PlatformEfCoreDbContext(DbContextOptions<TDbContext> options, PlatformEfCoreOptions efCoreOptions) : base(options)
        {
            this.efCoreOptions = efCoreOptions;
        }

        public DbSet<PlatformDataMigrationHistory> ApplicationDataMigrationHistoryDbSet => Set<PlatformDataMigrationHistory>();

        public IQueryable<PlatformDataMigrationHistory> ApplicationDataMigrationHistoryQuery =>
            ApplicationDataMigrationHistoryDbSet.AsQueryable();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Auto apply configuration by convention.
            modelBuilder.ApplyConfigurationsFromAssembly(GetType().Assembly);
            modelBuilder.ApplyConfiguration(new PlatformApplicationDataMigrationHistoryConfiguration());

            if (efCoreOptions.EnableDefaultInboxEventBusMessageEntityConfiguration == true)
                modelBuilder.ApplyConfiguration(new PlatformDefaultInboxEventBusMessageConfiguration());

            base.OnModelCreating(modelBuilder);
        }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            base.OnConfiguring(optionsBuilder);

            optionsBuilder.UseLazyLoadingProxies();
        }

        public async Task SaveChangesAsync()
        {
            await base.SaveChangesAsync();
        }

        public IQueryable<TEntity> GetQuery<TEntity>() where TEntity : class, IEntity
        {
            return Set<TEntity>().AsQueryable();
        }

        public void RunCommand(string command)
        {
            Database.ExecuteSqlRaw(command);
        }

        public Task MigrateApplicationDataAsync(IServiceProvider serviceProvider)
        {
            PlatformDataMigrationExecutor<TDbContext>.EnsureAllDataMigrationExecutorsHasUniqueName(GetType().Assembly, serviceProvider);
            PlatformDataMigrationExecutor<TDbContext>.GetCanExecuteDataMigrationExecutors(GetType().Assembly, serviceProvider, ApplicationDataMigrationHistoryQuery).ForEach(migrationExecution =>
            {
                if (!migrationExecution.IsObsolete())
                {
                    var logger = serviceProvider
                        .GetService<ILoggerFactory>()
                        .CreateLogger(migrationExecution.GetType());

                    logger.LogInformationIfEnabled($"Migration {migrationExecution.Name} started.");

                    migrationExecution.Execute((TDbContext)this);

                    Set<PlatformDataMigrationHistory>()
                        .Add(new PlatformDataMigrationHistory(migrationExecution.Name));

                    logger.LogInformationIfEnabled($"Migration {migrationExecution.Name} finished.");

                    base.SaveChangesAsync().Wait();
                }

                migrationExecution.Dispose();
            });

            return Task.CompletedTask;
        }

        public virtual void Initialize(IServiceProvider serviceProvider)
        {
            Database.Migrate();
            MigrateApplicationDataAsync(serviceProvider).Wait();
        }

        public async Task<IEnumerable<T>> GetAllAsync<T>(IQueryable<T> query, CancellationToken cancellationToken = default)
        {
            return await query.ToListAsync(cancellationToken);
        }

        public Task<T> FirstOrDefaultAsync<T>(IQueryable<T> query, CancellationToken cancellationToken = default)
        {
            return query.FirstOrDefaultAsync(cancellationToken);
        }
    }
}
