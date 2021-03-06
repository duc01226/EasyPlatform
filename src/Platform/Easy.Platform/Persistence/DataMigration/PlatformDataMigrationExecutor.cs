using System.Reflection;
using Easy.Platform.Application.Persistence;

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
    string Name { get; }
    int Order { get; }
    DateTime? ExpiredAt { get; }
    bool IsDisposed { get; set; }
    void Execute(TDbContext dbContext);
    bool IsExpired();

    /// <summary>
    /// Get order value string. This will be used to order migrations for execution.
    /// <br/>
    /// Example: "00001_MigrationName"
    /// </summary>
    string GetOrderByValue();

    bool IsObsolete();
}

/// <summary>
/// This class is used to run APPLICATION DATA migration, when you need to migrate your data in your whole micro services application.
/// Each class will be initiated and executed via Execute method.
/// The order of execution of all migration classes will be order ascending by Order then by Name;
/// </summary>
public abstract class PlatformDataMigrationExecutor<TDbContext> : IPlatformDataMigrationExecutor<TDbContext>
    where TDbContext : IPlatformDbContext
{
    public abstract string Name { get; }
    public virtual int Order => 0;
    public virtual DateTime? ExpiredAt => null;
    public abstract void Execute(TDbContext dbContext);
    public bool IsDisposed { get; set; }

    public bool IsExpired()
    {
        return ExpiredAt.HasValue && ExpiredAt < DateTime.UtcNow;
    }

    /// <summary>
    /// Get order value string. This will be used to order migrations for execution.
    /// <br/>
    /// Example: "00001_MigrationName"
    /// </summary>
    public string GetOrderByValue()
    {
        return $"{Order:D5}_{Name}";
    }

    public void Dispose()
    {
        if (IsDisposed)
            return;

        Dispose(true);
        GC.SuppressFinalize(this);

        IsDisposed = true;
    }

    public virtual bool IsObsolete()
    {
        return false;
    }

    public static List<PlatformDataMigrationExecutor<TDbContext>> ScanAllDataMigrationExecutors(
        Assembly scanAssembly,
        IServiceProvider serviceProvider)
    {
        var results = scanAssembly.GetTypes()
            .Where(p => p.IsAssignableTo(typeof(PlatformDataMigrationExecutor<TDbContext>)) && !p.IsAbstract)
            .Select(p => (PlatformDataMigrationExecutor<TDbContext>)serviceProvider.GetService(p))
            .Where(p => p != null)
            .ToList();
        return results;
    }

    public static void EnsureAllDataMigrationExecutorsHasUniqueName(
        Assembly scanAssembly,
        IServiceProvider serviceProvider)
    {
        var applicationDataMigrationExecutionNames = new HashSet<string>();
        foreach (var mongoMigrationExecution in ScanAllDataMigrationExecutors(scanAssembly, serviceProvider))
        {
            if (applicationDataMigrationExecutionNames.Contains(mongoMigrationExecution.Name))
                throw new Exception(
                    $"Application Data Migration Executor Names is duplicated. Duplicated name: {mongoMigrationExecution.Name}");

            applicationDataMigrationExecutionNames.Add(mongoMigrationExecution.Name);
            mongoMigrationExecution.Dispose();
        }
    }

    public static List<PlatformDataMigrationExecutor<TDbContext>> GetCanExecuteDataMigrationExecutors(
        Assembly scanAssembly,
        IServiceProvider serviceProvider,
        IQueryable<PlatformDataMigrationHistory> allApplicationDataMigrationHistoryQuery)
    {
        var executedMigrationNames = allApplicationDataMigrationHistoryQuery.Select(p => p.Name).ToHashSet();

        var canExecutedMigrations = new List<PlatformDataMigrationExecutor<TDbContext>>();

        ScanAllDataMigrationExecutors(scanAssembly, serviceProvider)
            .OrderBy(x => x.GetOrderByValue())
            .ToList()
            .ForEach(
                migrationExecution =>
                {
                    if (!executedMigrationNames.Contains(migrationExecution.Name) &&
                        !migrationExecution.IsExpired())
                        canExecutedMigrations.Add(migrationExecution);
                    else
                        migrationExecution.Dispose();
                });

        return canExecutedMigrations;
    }

    protected virtual void Dispose(bool disposing)
    {
    }
}
