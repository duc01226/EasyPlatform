#region

using System.Reflection;
using Easy.Platform.Application.Persistence;
using Easy.Platform.Common;
using Easy.Platform.Common.Extensions;
using Microsoft.Extensions.DependencyInjection;

#endregion

namespace Easy.Platform.Persistence.DataMigration;

/// <summary>
/// This interface is used for conventional registration for IPlatformDataMigrationExecutor[TDbContext]
/// </summary>
public interface IPlatformDataMigrationExecutor : IDisposable
{
}

public interface IPlatformDataMigrationExecutor<in TDbContext> : IPlatformDataMigrationExecutor
    where TDbContext : IPlatformDbContext
{
    /// <summary>
    /// The unique name of the migration. The name will be used to order. Convention should be: YYYYMMDDhhmmss_MigrationName
    /// </summary>
    public string Name { get; }

    /// <summary>
    /// Set this data to state that the data migration only valid if db initialized before a certain date. <br />
    /// Implement this prop define the date, usually the date you define your data migration. <br />
    /// When define it, for example ValidAfterDbCreationDate = 2000/12/31, mean that after 2000/12/31,
    /// if you run a fresh new system with no db, db is init created after 2000/12/31, the migration will be not executed.
    /// This will help to prevent run not necessary data migration for a new system fresh db.
    /// Default Return NULL mean that this migration will always run event for new db
    /// </summary>
    public DateTime? OnlyForDbsCreatedBeforeDate => null;

    /// <summary>
    /// The find the date that this migration will not be executed after a given date.
    /// </summary>
    public DateTime? ExpirationDate { get; }

    /// <summary>
    /// If true, Allow DataMigration execution in background thread, allow not wait, do not block the application start
    /// </summary>
    public bool AllowRunInBackgroundThread { get; }

    public bool CanSkipIfFailed { get; }

    public bool Ignored { get; }

    public Task Execute(TDbContext dbContext);

    public bool IsExpired();

    /// <summary>
    /// Get order value string. This will be used to order migrations for execution.
    /// <br />
    /// Example: "00001_MigrationName"
    /// </summary>
    public string GetOrderByValue();
}

/// <summary>
/// This class is used to run APPLICATION DATA migration, when you need to migrate your data in your whole micro services application.
/// Each class will be initiated and executed via Execute method.
/// The order of execution of all migration classes will be order ascending by Order then by Name;
/// </summary>
public abstract class PlatformDataMigrationExecutor<TDbContext> : IPlatformDataMigrationExecutor<TDbContext>
    where TDbContext : IPlatformDbContext
{
    protected bool Disposed;

    protected PlatformDataMigrationExecutor(IPlatformRootServiceProvider rootServiceProvider)
    {
        RootServiceProvider = rootServiceProvider;
    }

    public IPlatformRootServiceProvider RootServiceProvider { get; }

    public abstract string Name { get; }

    public virtual DateTime? ExpirationDate => null;

    public abstract DateTime? OnlyForDbsCreatedBeforeDate { get; }

    public virtual bool CanSkipIfFailed => false;

    public virtual bool Ignored => false;

    public abstract Task Execute(TDbContext dbContext);

    public virtual bool AllowRunInBackgroundThread => false;

    public bool IsExpired()
    {
        return ExpirationDate.HasValue && ExpirationDate < DateTime.UtcNow;
    }

    /// <summary>
    /// Get order value string. This will be used to order migrations for execution.
    /// <br />
    /// Example: "00001_MigrationName"
    /// </summary>
    public string GetOrderByValue()
    {
        return OnlyForDbsCreatedBeforeDate?.ToString("yyyyMMdd") + $"_{Name}";
    }

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    public static List<PlatformDataMigrationExecutor<TDbContext>> ScanAllDataMigrationExecutors(
        Assembly scanAssembly,
        IServiceProvider serviceProvider)
    {
        var results = scanAssembly.GetTypes()
            .Where(p => p.IsAssignableTo(typeof(PlatformDataMigrationExecutor<TDbContext>)) && !p.IsAbstract)
            .Select(migrationType => CreateNewInstance(serviceProvider, migrationType))
            .ToList();

        return results;
    }

    public static PlatformDataMigrationExecutor<TDbContext> CreateNewInstance(IServiceProvider serviceProvider, Type migrationType)
    {
        return ActivatorUtilities.CreateInstance(serviceProvider, migrationType).As<PlatformDataMigrationExecutor<TDbContext>>();
    }

    public static List<PlatformDataMigrationExecutor<TDbContext>> EnsureAllDataMigrationExecutorsHasUniqueName(
        List<PlatformDataMigrationExecutor<TDbContext>> migrationExecutors)
    {
        var applicationDataMigrationExecutionNames = new HashSet<string>();

        migrationExecutors.ForEach(dataMigrationExecutor =>
        {
            if (!applicationDataMigrationExecutionNames.Add(dataMigrationExecutor.Name))
            {
                throw new Exception(
                    $"Application DataMigration Executor Names is duplicated. Duplicated name: {dataMigrationExecutor.Name}");
            }
        });

        return migrationExecutors;
    }

    public static async Task<List<PlatformDataMigrationExecutor<TDbContext>>> GetCanExecuteDataMigrationExecutors(
        Assembly scanAssembly,
        IServiceProvider serviceProvider,
        IPlatformDbContext dbContext,
        string dbInitializedMigrationHistoryName)
    {
        var dbInitializedMigrationHistoryCreatedDate = await dbContext.FirstAsync(
            dbContext.DataMigrationHistoryQuery().Where(p => p.Name == dbInitializedMigrationHistoryName).Select(p => p.CreatedDate));
        var executedOrProcessingMigrationNames = await dbContext
            .GetAllAsync(
                dbContext.DataMigrationHistoryQuery()
                    .Where(PlatformDataMigrationHistory.ProcessedOrProcessingExpr())
                    .Where(p => p.Name != dbInitializedMigrationHistoryName)
                    .Select(p => p.Name))
            .Then(p => p.ToHashSet());

        return ScanAllDataMigrationExecutors(scanAssembly, serviceProvider)
            .Where(migrationExecution => !executedOrProcessingMigrationNames.Contains(migrationExecution.Name) &&
                                         !migrationExecution.IsExpired() &&
                                         (migrationExecution.OnlyForDbsCreatedBeforeDate == null ||
                                          migrationExecution.OnlyForDbsCreatedBeforeDate >= dbInitializedMigrationHistoryCreatedDate.Date) &&
                                         !migrationExecution.Ignored)
            .OrderBy(x => x.GetOrderByValue())
            .ToList()
            .Pipe(EnsureAllDataMigrationExecutorsHasUniqueName);
    }

    protected virtual void Dispose(bool disposing)
    {
        if (!Disposed)
        {
            if (disposing)
            {
                // Release managed resources
            }

            // Release unmanaged resources

            Disposed = true;
        }
    }
}
