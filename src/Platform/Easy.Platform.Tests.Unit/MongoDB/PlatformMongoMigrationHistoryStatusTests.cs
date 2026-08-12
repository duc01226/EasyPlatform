using Easy.Platform.MongoDB.Migration;
using Easy.Platform.Persistence.DataMigration;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.MongoDB;

/// <summary>
/// Guards the migration-history status model — TC-MONGOMIGSTATUS-008.
/// </summary>
public class PlatformMongoMigrationHistoryStatusTests
{
    /// <summary>
    /// TC-MONGOMIGSTATUS-008 — the mongo status enum's member NAMES must stay a subset of the data-migration status enum's names.
    /// </summary>
    /// <remarks>
    /// <para>
    /// <b>Why this test exists.</b> bravoINSIGHTS maps its mongo-migration collection and its data-migration collection to the SAME
    /// physical collection (<c>AnalyzeDbContext.cs:69,71</c>). One <c>Status</c> field there therefore holds strings written by BOTH
    /// <see cref="PlatformMongoMigrationHistory.Statuses" /> and <see cref="PlatformDataMigrationHistory.Statuses" />. Nothing in the
    /// compiler couples the two enums — this test is the only thing that does. Rename a member on either side and reads of that
    /// collection start failing to parse an unknown string, breaking service startup.
    /// </para>
    /// <para>
    /// <b>Why names and not ordinal values.</b> The hybrid enum serializer persists <c>value.ToString()</c>, so the stored
    /// representation is the NAME. Asserting ordinals would test a contract that does not exist and would fail spuriously whenever a
    /// member is inserted mid-enum without changing any stored string.
    /// </para>
    /// <para>
    /// <b>Why subset rather than equality.</b> The data-migration side owns extra states the mongo path has no concept of (there is no
    /// <c>CanSkipIfFailed</c> on a mongo migration executor). What must never happen is the mongo side writing a string the shared
    /// vocabulary does not contain.
    /// </para>
    /// </remarks>
    [Fact]
    [Trait("TestSpec", "TC-MONGOMIGSTATUS-008")]
    public void MongoStatusNames_ShouldBeSubsetOfDataMigrationStatusNames()
    {
        var mongoStatusNames = Enum.GetNames<PlatformMongoMigrationHistory.Statuses>();
        var dataMigrationStatusNames = Enum.GetNames<PlatformDataMigrationHistory.Statuses>();

        mongoStatusNames.Should().BeSubsetOf(
            dataMigrationStatusNames,
            "both enums persist as strings into ONE shared Status field in bravoINSIGHTS' migrationHistories collection; a mongo-only "
                + "member name would be an unparseable value for readers of the data-migration type");
    }

    /// <summary>
    /// TC-MONGOMIGSTATUS-008 (companion) — pins the four names the ledger and its documented operator procedures depend on.
    /// </summary>
    /// <remarks>
    /// The subset assertion above would still pass if a member were simply DELETED from the mongo enum. These four names are written
    /// into the database, quoted in the operator runbook, and typed by hand by an operator forcing a re-run, so each one is a
    /// published contract rather than an internal detail.
    /// </remarks>
    [Fact]
    [Trait("TestSpec", "TC-MONGOMIGSTATUS-008")]
    public void MongoStatusNames_ShouldContainTheFourPublishedLifecycleStates()
    {
        Enum.GetNames<PlatformMongoMigrationHistory.Statuses>()
            .Should()
            .BeEquivalentTo(
                ["New", "Processing", "Processed", "Failed"],
                "these names are persisted values and appear verbatim in the operator re-run procedure — renaming or dropping one "
                    + "silently invalidates existing rows and the documentation that tells an operator what to type");
    }

    /// <summary>
    /// TC-MONGOMIGSTATUS-011 — <see cref="PlatformMongoMigrationHistory.LiveProcessingExpr" /> must treat a row as live only while its
    /// ping is INSIDE the staleness window, and must release it once the window has passed.
    /// </summary>
    /// <remarks>
    /// <para>
    /// <b>Why this needs its own test even though the claim path is covered.</b> The staleness rule is written TWICE: once here as
    /// <c>LastProcessingPingTime &gt;= stalePingThreshold</c>, and once as its hand-written negation inside
    /// <c>PlatformMongoDbContext.TryClaimMigrationProcessingAsync</c>'s server-side filter (spelled out deliberately, so every operand
    /// stays a plain comparison the BSON translator supports). The integration tests exercise the CLAIM copy; inverting the comparison in
    /// THIS copy was verified to leave the entire migration suite green. That is the gap this test closes.
    /// </para>
    /// <para>
    /// <b>What this copy governs.</b> Which migrations <c>NotExecutedMigrationExecutors</c> lists as pending, and whether
    /// <c>ResolveLostClaimAsync</c> reports <c>HeldByLivePeer</c> — i.e. whether a run STOPS to preserve migration ordering. An inverted
    /// comparison here would report a crashed owner as live (stalling every later migration on every start) and a live owner as dead
    /// (letting later migrations run out of order past one that is still executing).
    /// </para>
    /// <para>
    /// <b>The two copies must remain exact logical complements.</b> Nothing in the compiler enforces that; this test plus the
    /// TC-MONGOMIGSTATUS-010 integration test are what hold the pair together, so both boundary sides are pinned here.
    /// </para>
    /// </remarks>
    [Theory]
    [Trait("TestSpec", "TC-MONGOMIGSTATUS-011")]
    [InlineData(0, true, "a ping written just now is unambiguously live")]
    [InlineData(WellInsideWindowSeconds, true, "an owner that missed a few pings is slow, not dead")]
    [InlineData(StaleWindowSeconds + 1, false, "past the window the owner is presumed dead and the migration must be reclaimable")]
    [InlineData(StaleWindowSeconds * 10, false, "a long-abandoned row must never count as live")]
    public void LiveProcessingExpr_ShouldTreatRowAsLiveOnlyWhileItsPingIsInsideTheStalenessWindow(
        int pingAgeSeconds,
        bool expectedLive,
        string because)
    {
        // Guard: the InlineData boundaries are computed from the two const factors because attribute arguments must be compile-time
        // constants, while the shipped window is a static readonly. If the shipped value ever stops being that product, every boundary
        // above silently tests the wrong instant — so fail loudly here instead.
        StaleWindowSeconds.Should().Be(
            PlatformMongoMigrationHistory.MaxProcessingWaitPingSeconds,
            "the boundaries in this test's InlineData are derived from the interval x misses product and must track the shipped window");

        var row = new PlatformMongoMigrationHistory("any-migration")
        {
            Status = PlatformMongoMigrationHistory.Statuses.Processing,
            LastProcessingPingTime = DateTime.UtcNow.AddSeconds(-pingAgeSeconds)
        };

        PlatformMongoMigrationHistory.LiveProcessingExpr().Compile()(row).Should().Be(expectedLive, because);
    }

    /// <summary>
    /// TC-MONGOMIGSTATUS-011 (companion) — the two non-<c>Processing</c> escape hatches of
    /// <see cref="PlatformMongoMigrationHistory.LiveProcessingExpr" />, which the age cases above cannot reach.
    /// </summary>
    /// <remarks>
    /// A row with no ping at all is the crashed-before-first-ping case AND the legacy pre-lease case; treating it as live would make those
    /// rows permanently unclaimable, which is the exact deadlock the ping was introduced to remove.
    /// </remarks>
    [Fact]
    [Trait("TestSpec", "TC-MONGOMIGSTATUS-011")]
    public void LiveProcessingExpr_ShouldNotTreatAPinglessOrNonProcessingRowAsLive()
    {
        var pinglessRow = new PlatformMongoMigrationHistory("any-migration")
        {
            Status = PlatformMongoMigrationHistory.Statuses.Processing,
            LastProcessingPingTime = null
        };

        var processedRow = new PlatformMongoMigrationHistory("any-migration")
        {
            Status = PlatformMongoMigrationHistory.Statuses.Processed,
            LastProcessingPingTime = DateTime.UtcNow
        };

        var isLive = PlatformMongoMigrationHistory.LiveProcessingExpr().Compile();

        isLive(pinglessRow).Should().BeFalse(
            "a Processing row that never recorded a ping is abandoned, not live — holding it live forever is the permanent deadlock the "
                + "lease design exists to avoid");
        isLive(processedRow).Should().BeFalse(
            "only a Processing row can be live; a fresh ping left on a Processed row must not resurrect it");
    }

    private const int WellInsideWindowSeconds = 5;

    private const int StaleWindowSeconds =
        PlatformMongoMigrationHistory.ProcessingPingIntervalSeconds * PlatformMongoMigrationHistory.MaxAllowedProcessingPingMisses;
}
