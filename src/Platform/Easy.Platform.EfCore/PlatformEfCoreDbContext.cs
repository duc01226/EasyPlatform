using Easy.Platform.Application.Persistence;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Domain.Entities;
using Easy.Platform.EfCore.EntityConfiguration;
using Easy.Platform.Persistence.DataMigration;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.EfCore
{
    public abstract class PlatformEfCoreDbContext<TDbContext> : DbContext, IPlatformDbContext where TDbContext : PlatformEfCoreDbContext<TDbContext>
    {
        private readonly ILogger logger;

        public PlatformEfCoreDbContext(
            DbContextOptions<TDbContext> options,
            ILoggerFactory loggerFactory) : base(options)
        {
            logger = loggerFactory.CreateLogger(GetType());
        }

        public DbSet<PlatformDataMigrationHistory> ApplicationDataMigrationHistoryDbSet => Set<PlatformDataMigrationHistory>();

        public IQueryable<PlatformDataMigrationHistory> ApplicationDataMigrationHistoryQuery =>
            ApplicationDataMigrationHistoryDbSet.AsQueryable();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Auto apply configuration by convention for the current dbcontext (usually persistence layer) assembly.
            modelBuilder.ApplyConfigurationsFromAssembly(GetType().Assembly);
            modelBuilder.ApplyConfiguration(new PlatformDataMigrationHistoryEntityConfiguration());
            modelBuilder.ApplyConfiguration(new PlatformInboxEventBusMessageEntityConfiguration());
            modelBuilder.ApplyConfiguration(new PlatformOutboxEventBusMessageEntityConfiguration());

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

        public virtual void Initialize(IServiceProvider serviceProvider, bool isDevEnvironment)
        {
            Database.Migrate();
            ExecuteMigrateApplicationDataAsync();

            void ExecuteMigrateApplicationDataAsync()
            {
                try
                {
                    MigrateApplicationDataAsync(serviceProvider).Wait();
                }
                catch (Exception ex)
                {
                    if (!isDevEnvironment)
                        throw;
                    else
                        logger.LogError(ex, "MigrateApplicationDataAsync has errors. For dev environment it may happens if migrate cross db, when other service db is not initiated. Usually for dev environment migrate cross service db when run system in the first-time could be ignored.");
                }
            }
        }

        public async Task<List<T>> GetAllAsync<T>(IQueryable<T> query, CancellationToken cancellationToken = default)
        {
            return await query.ToListAsync(cancellationToken);
        }

        public Task<T> FirstOrDefaultAsync<T>(IQueryable<T> query, CancellationToken cancellationToken = default)
        {
            return query.FirstOrDefaultAsync(cancellationToken);
        }
    }
}
