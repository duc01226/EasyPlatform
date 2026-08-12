using System.Linq.Expressions;
using Easy.Platform.Common.Timing;

namespace Easy.Platform.MongoDB.Migration;

/// <summary>
/// Ledger row recording that a <see cref="PlatformMongoMigrationExecutor{TDbContext}" /> has been applied to this database.
/// </summary>
/// <remarks>
/// <para>
/// <b>Lifecycle.</b> The row is CLAIMED as <see cref="Statuses.Processing" /> BEFORE the migration body runs, then updated to
/// <see cref="Statuses.Processed" /> once it completes. If the body throws, the row is best-effort updated to
/// <see cref="Statuses.Failed" /> with the serialized exception in <see cref="LastProcessError" /> and the original exception is rethrown.
/// A row therefore exists for the whole duration of a migration, which is what makes a running or hung migration visible in the database.
/// </para>
/// <para>
/// <b>The row is a LEASE, not just a status.</b> The claim is a single conditional update, so exactly one container can win it: two
/// replicas starting together no longer both run the same migration. The lease is held for as long as its owner keeps refreshing
/// <see cref="LastProcessingPingTime" /> (every <see cref="ProcessingPingIntervalSeconds" /> seconds), and every subsequent lifecycle
/// write is conditioned on <see cref="ConcurrencyUpdateToken" /> still matching, so a superseded owner cannot report a result over the
/// new one.
/// </para>
/// <para>
/// <b>What counts as "must not start now".</b> Already applied — <see cref="Statuses.Processed" />, and <c>null</c>, see
/// <see cref="Status" /> — OR currently held by a live owner (<see cref="LiveProcessingExpr" />). Everything else
/// (<see cref="Statuses.New" />, <see cref="Statuses.Failed" />, and <see cref="Statuses.Processing" /> whose ping has gone stale) is
/// claimable on the next startup.
/// </para>
/// <para>
/// <b>Crash recovery is preserved, and now bounded.</b> A process that dies mid-migration still recovers by itself with no database
/// surgery — but no longer instantly: its row stops being refreshed, goes stale after
/// <see cref="MaxProcessingWaitPingSeconds" /> seconds (default 120), and is then reclaimed by the next container to start. That delay
/// IS the feature: an unconditional immediate re-run cannot tell a dead owner from a live one, which is precisely how two containers
/// end up executing the same migration at once.
/// </para>
/// <para>
/// <b>Manual re-run procedure.</b> To force one migration to execute again, set its row's <see cref="Status" /> back to
/// <see cref="Statuses.New" /> and restart the service — do NOT delete the row, which loses the audit trail. Mongo migrations are
/// expected to be idempotent, so re-running one is safe by design.
/// </para>
/// </remarks>
public class PlatformMongoMigrationHistory
{
    /// <summary>
    /// How often the owner of a <see cref="Statuses.Processing" /> row refreshes <see cref="LastProcessingPingTime" /> to prove it is
    /// still alive. Deliberately identical to
    /// <see cref="Easy.Platform.Persistence.DataMigration.PlatformDataMigrationHistory.ProcessingPingIntervalSeconds" /> — on
    /// bravoINSIGHTS both ledgers share ONE physical collection, so two different staleness windows over the same rows would let each
    /// side reach a different verdict about whether the same migration is still running.
    /// </summary>
    public const int ProcessingPingIntervalSeconds = 10;

    /// <summary>
    /// How many consecutive pings may be missed before the owner is presumed dead and the migration becomes claimable again. The
    /// tolerance exists because a ping is a network write on a pod that is busy running a migration: a single slow write, a GC pause, or
    /// a brief mongo blip must NOT hand the lease to a second container while the first is still working.
    /// </summary>
    public const int MaxAllowedProcessingPingMisses = 12;

    /// <summary>
    /// Age at which a <see cref="Statuses.Processing" /> row stops counting as live (default 120s). A crashed container's migration
    /// becomes runnable again this long after its last ping — the self-healing property, now bounded instead of unconditional.
    /// </summary>
    public static readonly int MaxProcessingWaitPingSeconds = ProcessingPingIntervalSeconds * MaxAllowedProcessingPingMisses;

    /// <summary>
    /// Value stamped into <see cref="RowKind" /> on every row this ledger creates, marking it as owned by the MONGO migration side.
    /// </summary>
    public const string MongoMigrationRowKind = "MongoMigration";

    private DateTime? createdDate;

    public PlatformMongoMigrationHistory()
    {
    }

    public PlatformMongoMigrationHistory(string name)
    {
        Name = name;
    }

    public string Name { get; set; }

    /// <summary>
    /// Current state of this migration. <b>Nullable on purpose:</b> <c>null</c> means the row was written before status tracking existed,
    /// so it MUST be treated as <see cref="Statuses.Processed" /> and never re-executed. This mirrors the identical convention on
    /// <see cref="Easy.Platform.Persistence.DataMigration.PlatformDataMigrationHistory.Status" /> and keeps this change a pure schema
    /// addition — no backfill over existing <c>migrationHistories</c> documents in any deployed database.
    /// </summary>
    public Statuses? Status { get; set; } = Statuses.New;

    /// <summary>
    /// Serialized exception from the last failed run, or <c>null</c> if this migration never failed. Written only on the failure path.
    /// </summary>
    public string? LastProcessError { get; set; }

    /// <summary>
    /// Heartbeat proving the process holding a <see cref="Statuses.Processing" /> row is still alive. Refreshed every
    /// <see cref="ProcessingPingIntervalSeconds" /> seconds for as long as the migration body runs; <c>null</c> on any row not currently
    /// being processed, and on legacy rows written before the lease existed.
    /// </summary>
    /// <remarks>
    /// <b>This field is what makes a lease safe.</b> Without it, a container that dies mid-migration would leave its row at
    /// <see cref="Statuses.Processing" /> forever, and every future startup would skip that migration — a permanent deadlock that no
    /// restart clears. With it, the row simply goes stale after <see cref="MaxProcessingWaitPingSeconds" /> and the next container
    /// reclaims it. A lease and a liveness ping are one mechanism; neither is correct without the other.
    /// </remarks>
    public DateTime? LastProcessingPingTime { get; set; }

    /// <summary>
    /// Identifies WHICH process currently owns the lease on this row — a fresh value is written by every successful claim.
    /// </summary>
    /// <remarks>
    /// <b>Why ownership is needed on top of the ping.</b> Consider a container that stalls long enough for its ping to go stale, loses
    /// the migration to a second container, and then wakes up. Without a token it would happily write <see cref="Statuses.Processed" />
    /// over a migration that the new owner is still running, and the ledger would report success while work was in flight. Every
    /// lifecycle write after the claim is therefore conditioned on the token still matching, so a superseded owner's writes are rejected
    /// by the server instead of silently landing. Same role as
    /// <see cref="Easy.Platform.Application.MessageBus.InboxPattern.PlatformInboxBusMessage.ConcurrencyUpdateToken" />.
    /// </remarks>
    public string? ConcurrencyUpdateToken { get; set; }

    /// <summary>
    /// Marks which ledger OWNS this row — always <see cref="MongoMigrationRowKind" /> for rows created here. <c>null</c> on rows written
    /// before this field existed, and on rows belonging to a different ledger that happens to share the physical collection.
    /// </summary>
    /// <remarks>
    /// <para>
    /// <b>Why row identity needs more than <see cref="Name" />.</b> bravoINSIGHTS maps this ledger and the data-migration ledger onto ONE
    /// physical collection (<c>AnalyzeDbContext.cs:69,71</c>), and the two name-spaces are validated independently — the mongo-side
    /// <c>EnsureAllMigrationExecutorsHasUniqueName</c> never sees the data-migration names. So a single duplicated name puts two logically
    /// distinct migrations on one document. Keying writes on <see cref="Name" /> alone would then let a mongo migration claim a FOREIGN
    /// row: flipping its <see cref="Status" /> and clearing its <see cref="LastProcessError" />, silently destroying another subsystem's
    /// audit trail.
    /// </para>
    /// <para>
    /// <b>And it is more than two writers.</b> Observed live in <c>analyticsStore.migrationHistories</c>, that one collection is written by
    /// THREE independent producers: this ledger, the data-migration ledger (<c>PlatformDataMigrationHistory</c>, including the
    /// <c>DbInitialized</c> marker written at <c>PlatformMongoDbContext.InsertDbInitializedApplicationDataMigrationHistory</c>), and an
    /// application seeder using its own service-local history entity
    /// (<c>SeedSampleDataSourceAndTemplateDashboardCommandHandler</c>, row <c>SeedSampleDataSourceAndTemplateDashboard_v{n}</c>). Nothing
    /// coordinates their name-spaces, which is precisely why ownership has to be stamped rather than inferred.
    /// </para>
    /// <para>
    /// <b>Why a null kind is not treated as "ours".</b> Read through <c>MigrationHistoryCollection</c> on a shared-collection database, rows
    /// carrying a <see cref="Status" /> but NO <c>RowKind</c> already exist today — <c>PlatformDataMigrationHistory</c> is untouched by the
    /// change that introduced this field and has always had its own <c>Status</c>, so every data-migration row deserializes here as
    /// status-bearing and kind-less. Those rows are exactly the foreign rows a strict <c>RowKind == MongoMigration</c> claim filter must
    /// exclude, so the exclusion is doing real work rather than none.
    /// </para>
    /// <para>
    /// <b>And why excluding them costs nothing on the mongo side.</b> The MONGO ledger never wrote a status-bearing row before this change —
    /// <see cref="Status" /> shipped with <c>RowKind</c> — so no genuine mongo row can be status-bearing yet kind-less, and none is locked
    /// out. Pre-existing mongo rows carry a null status and are already excluded from claiming by the <c>Status != null</c> guard (null
    /// status means "legacy, already applied"). A permissive "null counts as ours" rule would have re-admitted exactly the collision this
    /// field exists to stop — and, given the third writer above, would have admitted rows from a producer that has no relationship to
    /// migrations at all.
    /// </para>
    /// </remarks>
    public string? RowKind { get; set; }

    public DateTime CreatedDate
    {
        get => createdDate ?? DateTime.UtcNow;
        set => createdDate = value;
    }

    /// <summary>
    /// Selects rows whose migration must NOT be executed again. Expressed as an <see cref="Expression" /> rather than an instance
    /// property so the MongoDB driver can translate it and run the filter server-side — a computed C# property cannot be translated.
    /// Same reason <see cref="Easy.Platform.Persistence.DataMigration.PlatformDataMigrationHistory.ProcessedExpr" /> is an expression.
    /// </summary>
    public static Expression<Func<PlatformMongoMigrationHistory, bool>> ProcessedExpr()
    {
        // Null for old PlatformMongoMigrationHistory rows written before status tracking existed
        return p => p.Status == null ||
                    p.Status == Statuses.Processed;
    }

    /// <summary>
    /// Selects rows a LIVE process is currently working on — <see cref="Statuses.Processing" /> with a ping young enough to prove the
    /// owner is still alive. This is what makes <see cref="Statuses.Processing" /> mean "another container holds this migration" rather
    /// than merely "someone started it once".
    /// </summary>
    /// <remarks>
    /// <b>Why the ping threshold is captured into a local first.</b> The expression must run SERVER-SIDE, so every operand has to be a
    /// constant the MongoDB LINQ provider can translate. A closure over a pre-computed <see cref="DateTime" /> becomes a literal in the
    /// generated query; referencing a clock property inside the lambda would leave a member access the driver cannot translate.
    /// <br />
    /// <b>Why a missing ping counts as stale, not live.</b> A row written by an older build (or by the data-migration side on
    /// bravoINSIGHTS' shared collection) has no <see cref="LastProcessingPingTime" />. Treating null as live would let one such row block
    /// its migration forever — exactly the deadlock the ping exists to prevent.
    /// </remarks>
    public static Expression<Func<PlatformMongoMigrationHistory, bool>> LiveProcessingExpr()
    {
        var stalePingThreshold = Clock.UtcNow.AddSeconds(-MaxProcessingWaitPingSeconds);

        return p => p.Status == Statuses.Processing &&
                    p.LastProcessingPingTime != null &&
                    p.LastProcessingPingTime >= stalePingThreshold;
    }

    /// <summary>
    /// Selects rows whose migration must not be started right now — either already applied (<see cref="ProcessedExpr" />) or actively
    /// held by a live process (<see cref="LiveProcessingExpr" />). Mirrors
    /// <see cref="Easy.Platform.Persistence.DataMigration.PlatformDataMigrationHistory.ProcessedOrProcessingExpr" />.
    /// </summary>
    public static Expression<Func<PlatformMongoMigrationHistory, bool>> ProcessedOrLiveProcessingExpr()
    {
        return ProcessedExpr().Or(LiveProcessingExpr());
    }

    /// <summary>
    /// True when this row does not block a fresh run — never applied, failed, or abandoned by a crashed owner whose ping went stale.
    /// </summary>
    public bool CanStartOrRetryProcess()
    {
        return !this.Is(ProcessedOrLiveProcessingExpr());
    }

    /// <summary>
    /// Migration lifecycle states.
    /// </summary>
    /// <remarks>
    /// <b>Member names are load-bearing and must not be renamed casually.</b> bravoINSIGHTS maps this collection and the
    /// <c>PlatformDataMigrationHistory</c> collection to the SAME physical collection (<c>AnalyzeDbContext.cs:69,71</c>), so one
    /// <c>Status</c> field holds strings written by BOTH this enum and
    /// <see cref="Easy.Platform.Persistence.DataMigration.PlatformDataMigrationHistory.Statuses" />. They coexist only because enums
    /// persist as strings (<c>PlatformHybridEnumSerializationProvider</c> writes <c>value.ToString()</c>) and the member names coincide.
    /// Nothing in the compiler enforces that — <b>TC-MONGOMIGSTATUS-008</b> is the guard that fails the build on a divergent rename.
    /// </remarks>
    public enum Statuses
    {
        New,
        Processing,
        Processed,
        Failed
    }
}

/// <summary>
/// Why an attempt to claim a migration's ledger lease did not win it. The distinction decides whether the migration run may CONTINUE to
/// later migrations, so it is a behavioural signal, not diagnostics.
/// </summary>
public enum PlatformMongoMigrationClaimLostReason
{
    /// <summary>
    /// The migration reached <see cref="PlatformMongoMigrationHistory.Statuses.Processed" /> between being listed as pending and being
    /// claimed. Nothing is running, so later migrations cannot end up out of order and the run continues.
    /// </summary>
    AlreadyApplied,

    /// <summary>
    /// Another process holds a LIVE lease — it is running this migration right now. Later migrations MUST NOT run, because they are ordered
    /// and one of them may assume this migration already applied. The caller ends the run; the next start picks up the remainder.
    /// </summary>
    HeldByLivePeer,

    /// <summary>
    /// The row wearing this name belongs to a DIFFERENT ledger sharing the same physical collection. This ledger must not touch it, and the
    /// run continues — halting here would strand every following migration on a dormant name collision, on every single start.
    /// </summary>
    NotOwned
}
