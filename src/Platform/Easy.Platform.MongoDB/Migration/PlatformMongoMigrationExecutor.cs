#region

// Required: Exception.BeautifyStackTrace() is an extension method declared in namespace System.Diagnostics
// (Easy.Platform/Common/Exceptions/StackTraceBeautifier/ExceptionExtensions.cs), not a Stopwatch/Activity usage.
// Do not "clean up" as unused.
using System.Diagnostics;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.MongoDB.Migration;

/// <summary>
/// This class is used to run migration for mongodb. Each class will be initiated and executed via Execute method.
/// The order of execution of all migration classes will be order ascending by Order then by Name;
/// </summary>
public abstract class PlatformMongoMigrationExecutor<TDbContext>
    where TDbContext : PlatformMongoDbContext<TDbContext>
{
    public abstract string Name { get; }

    /// <summary>
    /// The date that migration is expired and will never be executed
    /// </summary>
    public virtual DateTime? ExpirationDate { get; } = null;

    /// <summary>
    /// Override this prop define the date, usually the date you define your data migration. <br />
    /// When define it, for example OnlyForDbInitBeforeDate = 2000/12/31, mean that after 2000/12/31,
    /// if you run a fresh new system with no db, db is init created after 2000/12/31, the migration will be not executed.
    /// This will help to prevent run not necessary data migration for a new system fresh db
    ///
    /// <para><strong>Why skipping a fresh db is CORRECT, not a hole (read this before "fixing" it).</strong>
    /// <c>PlatformMongoDbContext.Migrate</c> runs <c>EnsureIndexesAsync</c> FIRST, then the migration loop. On a fresh
    /// db the one-shot gate <c>IsEnsureIndexesMigrationExecuted()</c> is still open, so <c>InternalEnsureIndexesAsync</c>
    /// has already created EVERY index the current build declares before this executor is even considered. A fresh db
    /// therefore ends up in the same state whether the migration runs or not — running it would only repeat work that
    /// just happened. The property exists precisely to skip that repeat; it is NOT a guard that leaves a fresh db
    /// unmigrated. The same reasoning holds for a collection/seed migration whose target state the current build also
    /// produces during fresh setup.</para>
    ///
    /// <para><strong>Why the null-date fallback is also correct.</strong> <c>Migrate</c> resolves the db-init date as
    /// <c>DbInitialized history CreatedDate ?? DateTime.UtcNow</c>. On the very first <c>Initialize</c> of a db the
    /// <c>DbInitialized</c> marker does not exist yet — it is written AFTER <c>Migrate</c> returns — so the fallback
    /// yields "now", which is the right answer: a db being initialised right now IS a fresh db, and its indexes were
    /// created moments earlier in the same call.</para>
    ///
    /// <para><strong>How to pick the date, and the one real caveat.</strong> Use the day the migration SHIPS (in
    /// practice: the migration's own date, or the day after). The only db that ends up missing the change is one
    /// initialised on/after the cutoff by a build that does NOT yet contain this migration — it gets nothing from
    /// <c>EnsureIndexesAsync</c> (the build does not declare the change) and nothing from here (skipped by date). So
    /// when unsure, later is the safe direction: a too-late cutoff only costs a redundant no-op run on fresh dbs, while
    /// a cutoff earlier than the actual rollout silently skips the backfill. Never back-date it before the release.</para>
    /// </summary>
    public virtual DateTime? OnlyForDbInitBeforeDate { get; } = null;

    /// <summary>
    /// Runs the migration, wrapping <see cref="InternalExecute" /> with STARTED / FINISHED / FAILED logging so EVERY
    /// mongo migration reports its own lifecycle no matter which caller drives it.
    ///
    /// <para><strong>Why the wrapper lives here and not at the call site.</strong> This mirrors the platform's existing
    /// template-method convention (<c>PlatformBackgroundJobExecutor.Execute</c> → <c>InternalExecuteAsync</c> →
    /// <c>ProcessAsync</c>, <c>PlatformApplicationDataSeeder.SeedData</c> → <c>InternalSeedData</c>): the cross-cutting
    /// concern is implemented ONCE in the base and subclasses only supply the migration body. Logging placed in
    /// <c>PlatformMongoDbContext.Migrate</c> instead would have to be repeated in every current and future caller, and a
    /// migration invoked from anywhere else would silently produce no lifecycle log at all.</para>
    ///
    /// <para>Failures log FAILED and rethrow. <c>PlatformMongoDbContext</c> does catch around the body, but only to record the
    /// <c>Failed</c> status in the ledger before rethrowing — it deliberately does not log the exception, because the STARTED line it
    /// would have to pair with is emitted here. Keeping both halves in one place is what guarantees a STARTED line is always terminated
    /// by an outcome line, for every caller, including any that has no ledger at all.</para>
    ///
    /// <para><strong>What FINISHED asserts, and what it does NOT.</strong> This wrapper spans the migration BODY only. FINISHED means
    /// "<see cref="InternalExecute" /> returned without throwing" — it does NOT mean the ledger recorded the migration as
    /// <c>Processed</c>, because the ledger write happens in the caller, after this method returns. The two can legitimately disagree:
    /// if this process's lease expired while the body ran, the <c>Processed</c> write is conditional and lands nowhere, so the log shows
    /// FINISHED while the row belongs to whichever process took the migration over (and that one records its own outcome). Do not read
    /// FINISHED as a ledger guarantee when diagnosing; read the row. The message text is deliberately NOT reworded to say so, because
    /// operational searches are keyed on the literal <c>"Migration … FINISHED"</c> prefix.</para>
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
                        "Migration {MigrationName} FAILED. ExecutorType:{ExecutorType}",
                        Name,
                        GetType().FullName);

                    throw;
                }
            },
            beforeExecution: () => dbContext.Logger.LogInformation(
                "Migration {MigrationName} STARTED. ExecutorType:{ExecutorType}",
                Name,
                GetType().FullName),
            afterExecution: elapsedMilliseconds => dbContext.Logger.LogInformation(
                "Migration {MigrationName} FINISHED. ElapsedMilliseconds:{ElapsedMilliseconds}. ExecutorType:{ExecutorType}",
                Name,
                elapsedMilliseconds,
                GetType().FullName));
    }

    /// <summary>
    /// Implement the actual migration body here. <see cref="Execute" /> adds the STARTED/FINISHED/FAILED logging around
    /// this method, so never log the migration start/end again inside an override.
    /// </summary>
    protected abstract Task InternalExecute(TDbContext dbContext);

    /// <summary>
    /// Get order value string. This will be used to order migrations for execution.
    /// </summary>
    public string GetOrderByValue()
    {
        return Name;
    }

    public bool IsExpired()
    {
        return ExpirationDate.HasValue && ExpirationDate < DateTime.UtcNow;
    }
}
