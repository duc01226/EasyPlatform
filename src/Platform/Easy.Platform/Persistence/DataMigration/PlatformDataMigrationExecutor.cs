#region

// Required: Exception.BeautifyStackTrace() is an extension method declared in namespace System.Diagnostics
// (Common/Exceptions/StackTraceBeautifier/ExceptionExtensions.cs), not a Stopwatch/Activity usage. Do not "clean up" as unused.
using System.Diagnostics;
using System.Reflection;
using Easy.Platform.Application.Persistence;
using Easy.Platform.Common;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Utils;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

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

    /// <summary>
    /// Runs the migration, wrapping <see cref="InternalExecute" /> with STARTED / FINISHED / FAILED logging so EVERY
    /// data migration reports its own lifecycle no matter which caller drives it.
    ///
    /// <para><strong>Why the wrapper lives here and not at the call site.</strong> This mirrors the platform's existing
    /// template-method convention (<c>PlatformBackgroundJobExecutor.Execute</c> → <c>InternalExecuteAsync</c> →
    /// <c>ProcessAsync</c>, <c>PlatformApplicationDataSeeder.SeedData</c> → <c>InternalSeedData</c>): the cross-cutting
    /// concern is implemented ONCE in the base and subclasses only supply the migration body. Logging placed in the
    /// orchestrators instead would have to be repeated in every current and future caller, and a migration invoked from
    /// anywhere else would silently produce no lifecycle log at all.</para>
    ///
    /// <para>Failures log FAILED and rethrow — the caller owns the migration-history status transition (Failed vs
    /// SkipFailed); this only guarantees a STARTED line is always terminated by an outcome line.</para>
    ///
    /// <para><strong>What FINISHED asserts, and what it does NOT.</strong> This wrapper spans the migration BODY only.
    /// FINISHED means "<see cref="InternalExecute" /> returned without throwing" — it does NOT mean the migration history
    /// recorded <c>Processed</c>, because that upsert runs in the caller after this method returns and is itself retried.
    /// So FINISHED necessarily precedes the row transition, and a caller that dies in between leaves FINISHED in the log
    /// with the row still at <c>Processing</c>. When diagnosing, the row is the record; the log is the narrative. The
    /// message text is deliberately NOT reworded to say so, because operational searches are keyed on the literal
    /// <c>"DataMigration … FINISHED"</c> prefix.</para>
    /// </summary>
    public Task Execute(TDbContext dbContext)
    {
        return Util.TaskRunner.ProfileExecutionAsync(
            asyncTask: async () =>
            {
                try
                {
                    await InternalExecute(dbContext);
                }
                catch (Exception e)
                {
                    dbContext.Logger.LogError(
                        e.BeautifyStackTrace(),
                        "DataMigration {MigrationName} FAILED. ExecutorType:{ExecutorType}",
                        Name,
                        GetType().FullName);

                    throw;
                }
            },
            beforeExecution: () => dbContext.Logger.LogInformation(
                "DataMigration {MigrationName} STARTED. ExecutorType:{ExecutorType}",
                Name,
                GetType().FullName),
            afterExecution: elapsedMilliseconds => dbContext.Logger.LogInformation(
                "DataMigration {MigrationName} FINISHED. ElapsedMilliseconds:{ElapsedMilliseconds}. ExecutorType:{ExecutorType}",
                Name,
                elapsedMilliseconds,
                GetType().FullName));
    }

    /// <summary>
    /// Implement the actual migration body here. <see cref="Execute" /> adds the STARTED/FINISHED/FAILED logging around
    /// this method, so never log the migration start/end again inside an override.
    /// </summary>
    protected abstract Task InternalExecute(TDbContext dbContext);

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
