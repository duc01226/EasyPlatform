#region

using Easy.Platform.Common.Timing;
using Easy.Platform.MongoDB.Migration;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using PlatformExampleApp.TextSnippet.Persistence.Mongo;

#endregion

namespace PlatformExampleApp.IntegrationTests.Migrations;

/// <summary>
/// Direct tests of the ledger write helpers — TC-MONGOMIGSTATUS-002 and TC-MONGOMIGSTATUS-005.
/// </summary>
/// <remarks>
/// <para>
/// <b>Why the failure path is tested here rather than through a real failing migration.</b> A fixture executor that throws would
/// break the example app's own startup — every test in this project dies in fixture setup — so the <c>Failed</c> transition is
/// exercised through the helper that owns it.
/// </para>
/// <para>
/// <b>Why throwaway ULID names.</b> These tests write ledger rows directly. Using a unique name per run keeps them from ever
/// colliding with a real migration's row, and makes the suite infinitely repeatable: it never resets or deletes state another run
/// might depend on.
/// </para>
/// <para>
/// <b>Why each test then DELETES its own row, and why that does not break the additive rule.</b> The additive rule protects state
/// that another run — or an operator — could legitimately depend on. A <c>TestLedger_{Ulid}</c> row is depended on by nothing: the
/// name is unique to one execution and can never be read again. Left behind, these rows accumulate one per test per run in the very
/// collection this feature exists to make readable by a human, each one carrying a full serialized stack trace. Removing only the row
/// a test itself created keeps the collection meaning what it claims to mean, while touching no shared state.
/// </para>
/// </remarks>
[Collection(TextSnippetIntegrationTestCollection.Name)]
[Trait("Category", "Migration")]
public class MongoMigrationLedgerHelperIntegrationTests : TextSnippetIntegrationTestBase
{
    /// <summary>
    /// TC-MONGOMIGSTATUS-002 — <c>MarkMigrationProcessingAsync</c> upserts the row to <c>Processing</c> and clears any error left by
    /// a previous attempt. A stale error sitting next to a live <c>Processing</c> status would actively mislead the operator this
    /// feature exists for, so the clearing is part of the contract, not incidental.
    /// </summary>
    [Fact]
    [Trait("TestSpec", "TC-MONGOMIGSTATUS-002")]
    public async Task MarkMigrationProcessingAsync_ShouldUpsertProcessing_AndClearPreviousError()
    {
        await ExecuteWithServicesAsync(async sp =>
        {
            var dbContext = sp.GetRequiredService<TextSnippetDbContext>();

            await WithThrowawayLedgerRowAsync(dbContext, async migrationName =>
            {
                // Act 1 — the row does not exist yet, so this must CREATE it (upsert)
                await dbContext.MarkMigrationProcessingAsync(migrationName);

                var created = await FindRowAsync(dbContext, migrationName);
                created.Should().NotBeNull("the helper must upsert — a row may legitimately not exist yet on a first run");
                created!.Status.Should().Be(PlatformMongoMigrationHistory.Statuses.Processing);
                created.RowKind.Should().Be(
                    PlatformMongoMigrationHistory.MongoMigrationRowKind,
                    "an upsert that CREATES a ledger row must stamp ownership on it — an unstamped row can never be claimed, so a "
                        + "missing stamp would silently make the migration unrunnable on a database that shares this collection");

                // Arrange — simulate a previous failed attempt having left an error behind
                await dbContext.MarkMigrationFailedAsync(migrationName, new InvalidOperationException("previous attempt failure"));
                (await FindRowAsync(dbContext, migrationName))!.LastProcessError.Should().NotBeNullOrEmpty(
                    "arrangement guard: the stale error must actually be present, or the clearing assertion below proves nothing");

                // Act 2 — starting the migration again
                await dbContext.MarkMigrationProcessingAsync(migrationName);

                // Assert
                var restarted = await FindRowAsync(dbContext, migrationName);
                restarted!.Status.Should().Be(PlatformMongoMigrationHistory.Statuses.Processing);
                restarted.LastProcessError.Should().BeNull(
                    "an error from a previous attempt must be cleared when the migration restarts, otherwise the operator sees a "
                        + "'currently running' row carrying an error that no longer applies");
            });
        });
    }

    /// <summary>
    /// TC-MONGOMIGSTATUS-005 — <c>MarkMigrationFailedAsync</c> records <c>Failed</c> plus an error a human can actually diagnose from,
    /// after the pod restarted and its logs rotated away.
    /// </summary>
    /// <remarks>
    /// <para>
    /// <b>What is asserted, and why exactly these fields.</b> <c>Exception.Serialize()</c> emits <c>Message</c>,
    /// <c>InnerException</c> and <c>StackTrace</c> and nothing else (<c>ExceptionExtension.cs:11-17</c>) — notably NOT the exception
    /// TYPE name. So the diagnosable content available to an operator is the message plus the stack, and those are what this test
    /// pins. It deliberately does not assert an exact string or a whole-document match: the serializer's JSON shape is an
    /// implementation detail, and pinning it would fail on changes that break nothing real.
    /// </para>
    /// <para>
    /// <b>Why the exception is THROWN rather than constructed.</b> <c>StackTrace</c> is null on an exception that was never thrown, so
    /// a constructed one would silently prove less than it appears to — the stack assertion would be vacuous. Throwing reproduces the
    /// production shape, where the recorded exception always came out of a failing migration body.
    /// </para>
    /// <para>
    /// The exception is synthetic with a literal message — no real data becomes a permanent fixture in the repository.
    /// </para>
    /// </remarks>
    [Fact]
    [Trait("TestSpec", "TC-MONGOMIGSTATUS-005")]
    public async Task MarkMigrationFailedAsync_ShouldRecordFailedStatusAndDiagnosableError()
    {
        await ExecuteWithServicesAsync(async sp =>
        {
            var dbContext = sp.GetRequiredService<TextSnippetDbContext>();
            const string syntheticMessage = "synthetic migration failure for TC-MONGOMIGSTATUS-005";

            await WithThrowawayLedgerRowAsync(dbContext, async migrationName =>
            {
                await dbContext.MarkMigrationProcessingAsync(migrationName);

                var thrown = CaptureThrown(new InvalidOperationException(syntheticMessage));

                // Act
                await dbContext.MarkMigrationFailedAsync(migrationName, thrown);

                // Assert
                var row = await FindRowAsync(dbContext, migrationName);
                row.Should().NotBeNull();
                row!.Status.Should().Be(
                    PlatformMongoMigrationHistory.Statuses.Failed,
                    "a failed migration must be visible as Failed in the database, not merely in the logs");
                row.LastProcessError.Should().NotBeNullOrEmpty("the operator needs the error to diagnose the failure");
                row.LastProcessError.Should().Contain(
                    syntheticMessage,
                    "the failure message is the primary diagnostic an operator reads out of the ledger");
                row.LastProcessError.Should().Contain(
                    nameof(CaptureThrown),
                    "the stack trace must be persisted too — after a pod restart rotates the logs, the ledger row is the only remaining "
                        + "record of WHERE the migration failed. CaptureThrown is the frame the exception was thrown from, so its "
                        + "presence proves the real stack reached the database");
                row.LastProcessingPingTime.Should().BeNull(
                    "recording a failure ENDS the attempt, so the lease must be released — leaving a fresh ping behind would make the "
                        + "failed migration look like it was still running and block a retry for the whole staleness window");
                row.ConcurrencyUpdateToken.Should().BeNull("the lease token must be cleared alongside the ping when the lease is released");
            });
        });
    }

    /// <summary>
    /// Returns the given exception after actually throwing and catching it, so its <c>StackTrace</c> is populated the way a real
    /// migration failure's would be.
    /// </summary>
    private static Exception CaptureThrown(Exception exception)
    {
        try
        {
            throw exception;
        }
        catch (Exception e)
        {
            return e;
        }
    }

    /// <summary>
    /// TC-MONGOMIGSTATUS-005 (guard half) — the failure helper must NEVER throw. The whole point is that the exception leaving
    /// <c>Migrate()</c> is the MIGRATION's, never the bookkeeping write's: an infrastructure fault that fails a migration is exactly
    /// the fault that would fail this write too, and an unguarded helper would replace the real diagnosis with a write error.
    /// </summary>
    /// <remarks>
    /// <para>
    /// <b>How the failure is induced, and why this way.</b> The exception passed in has a <see cref="Exception.Message" /> getter that
    /// throws, so <c>e.Serialize()</c> — called INSIDE the helper's guarded block — blows up before the write is even issued. That is
    /// a deterministic, in-process fault needing no infrastructure manipulation, and it exercises the guard for real.
    /// </para>
    /// <para>
    /// <b>Why not simply pass a bad migration name.</b> That was the first attempt and it was VACUOUS: a null name is a perfectly
    /// legal filter, so the upsert succeeded (it silently created a row named <c>null</c>) and the catch block never ran — the test
    /// passed while proving nothing, and would have kept passing with the try/catch deleted. Verified by inspecting the collection
    /// after a run. A guard test that cannot fail is worse than no test, because it reads as coverage.
    /// </para>
    /// </remarks>
    [Fact]
    [Trait("TestSpec", "TC-MONGOMIGSTATUS-005")]
    public async Task MarkMigrationFailedAsync_WhenItsOwnWriteCannotSucceed_ShouldNotThrow()
    {
        await ExecuteWithServicesAsync(async sp =>
        {
            var dbContext = sp.GetRequiredService<TextSnippetDbContext>();

            await WithThrowawayLedgerRowAsync(dbContext, async migrationName =>
            {
                var act = async () => await dbContext.MarkMigrationFailedAsync(migrationName, new UnserializableException());

                await act.Should().NotThrowAsync(
                    "a failed ledger write must be logged and swallowed — if it propagated it would REPLACE the migration's real "
                        + "exception with a bookkeeping error, erasing the very diagnosis this feature exists to produce");
            });
        });
    }

    /// <summary>
    /// An exception that cannot be serialized, used to force <c>MarkMigrationFailedAsync</c>'s own work to throw from inside its
    /// guarded block.
    /// </summary>
    private sealed class UnserializableException : Exception
    {
        public override string Message => throw new InvalidOperationException("this exception cannot be read");
    }

    /// <summary>
    /// TC-MONGOMIGSTATUS-009 — the mutual-exclusion guarantee the lease exists for: while one process holds a LIVE lease, a second
    /// claimant is refused.
    /// </summary>
    /// <remarks>
    /// Every other test in this suite reaches <c>TryClaimMigrationProcessingAsync</c> through <c>Migrate()</c> with a single claimant, so
    /// the winning branch is well covered and the CONTENTION branch was covered by nothing. Without this test the whole feature —
    /// "two containers must not run the same migration" — could regress to always-grant and the suite would stay green.
    /// </remarks>
    [Fact]
    [Trait("TestSpec", "TC-MONGOMIGSTATUS-009")]
    public async Task TryClaimMigrationProcessingAsync_WhenALivePeerHoldsTheLease_ShouldRefuseTheSecondClaimant()
    {
        await ExecuteWithServicesAsync(async sp =>
        {
            var dbContext = sp.GetRequiredService<TextSnippetDbContext>();

            await WithThrowawayLedgerRowAsync(dbContext, async migrationName =>
            {
                // Act 1 — first claimant wins and now holds a live lease (the claim stamps LastProcessingPingTime = now)
                var firstLease = await dbContext.TryClaimMigrationProcessingAsync(migrationName);

                firstLease.Should().NotBeNull("an unclaimed migration must be claimable — otherwise nothing would ever run");

                // Act 2 — a second container claims the SAME migration while the first still holds it
                var secondLease = await dbContext.TryClaimMigrationProcessingAsync(migrationName);

                // Assert
                secondLease.Should().BeNull(
                    "a live lease must refuse a second claimant — this single conditional update is the ONLY mutual exclusion in the "
                        + "migration path, so if it grants twice, two containers execute the same migration concurrently against one database");

                (await FindRowAsync(dbContext, migrationName))!.ConcurrencyUpdateToken.Should().Be(
                    firstLease,
                    "a refused claim must leave the incumbent's lease untouched; overwriting the token would let the loser's outcome "
                        + "writes land and the winner's silently no-op");
            });
        });
    }

    /// <summary>
    /// TC-MONGOMIGSTATUS-010 — the staleness threshold itself: a lease whose ping stopped longer ago than
    /// <see cref="PlatformMongoMigrationHistory.MaxProcessingWaitPingSeconds" /> is reclaimable, and one still inside the window is not.
    /// </summary>
    /// <remarks>
    /// <para>
    /// This is the "a crashed container must not block the migration forever, but a slow one must not be trampled" contract. TC-006 covers
    /// only a row with <c>LastProcessingPingTime = null</c>, which short-circuits <c>LiveProcessingExpr</c> on its <c>!= null</c> test and
    /// therefore never evaluates the threshold comparison at all — the constant could be mis-scaled, or the comparison inverted, with the
    /// suite fully green.
    /// </para>
    /// <para>
    /// <b>The age is WRITTEN, never waited for.</b> Sleeping toward a 120-second threshold would make this test slow and timing-fragile for
    /// no added confidence — the production input is a stored timestamp, and a stored timestamp is exactly what is arranged here.
    /// </para>
    /// </remarks>
    [Fact]
    [Trait("TestSpec", "TC-MONGOMIGSTATUS-010")]
    public async Task TryClaimMigrationProcessingAsync_ShouldReclaimOnlyAfterThePingIsOlderThanTheStaleThreshold()
    {
        await ExecuteWithServicesAsync(async sp =>
        {
            var dbContext = sp.GetRequiredService<TextSnippetDbContext>();

            await WithThrowawayLedgerRowAsync(dbContext, async migrationName =>
            {
                var abandonedLease = await dbContext.TryClaimMigrationProcessingAsync(migrationName);
                abandonedLease.Should().NotBeNull("arrangement guard: there must be a lease to age, or both assertions below are vacuous");

                // Act/Assert 1 — still WELL INSIDE the window: the owner is slow, not dead. Reclaiming here would trample a running
                // migration. Half the window, not window-minus-a-few-seconds: the exact boundary is pinned deterministically in the
                // TC-MONGOMIGSTATUS-011 unit test, so buying precision here with a margin a slow CI agent could burn through is a bad trade.
                await SetPingAgeAsync(dbContext, migrationName, PlatformMongoMigrationHistory.MaxProcessingWaitPingSeconds / 2);

                (await dbContext.TryClaimMigrationProcessingAsync(migrationName)).Should().BeNull(
                    "a lease whose last ping is still inside the staleness window is LIVE — reclaiming it would run the migration "
                        + "concurrently with an owner that is merely slow");

                // Act/Assert 2 — one second PAST the window: the owner is gone and recovery must not need manual DB surgery.
                await SetPingAgeAsync(dbContext, migrationName, PlatformMongoMigrationHistory.MaxProcessingWaitPingSeconds + 1);

                var reclaimedLease = await dbContext.TryClaimMigrationProcessingAsync(migrationName);

                reclaimedLease.Should().NotBeNull(
                    $"after {PlatformMongoMigrationHistory.MaxAllowedProcessingPingMisses} consecutive missed pings the owner is "
                        + "presumed dead and the migration must become claimable again — otherwise one crashed container blocks it forever");
                reclaimedLease.Should().NotBe(
                    abandonedLease,
                    "a reclaim must issue a NEW token, so if the presumed-dead owner comes back its outcome writes match nothing "
                        + "instead of overwriting the new owner's result");
            });
        });
    }

    /// <summary>
    /// Ages a row's lease ping by writing an explicit past timestamp. Never sleeps — see TC-MONGOMIGSTATUS-010's remarks.
    /// </summary>
    private static async Task SetPingAgeAsync(TextSnippetDbContext dbContext, string migrationName, int ageSeconds)
    {
        await dbContext.MigrationHistoryCollection.UpdateOneAsync(
            p => p.Name == migrationName,
            Builders<PlatformMongoMigrationHistory>.Update.Set(p => p.LastProcessingPingTime, Clock.UtcNow.AddSeconds(-ageSeconds)));
    }

    private static Task<PlatformMongoMigrationHistory?> FindRowAsync(TextSnippetDbContext dbContext, string migrationName)
    {
        return dbContext.MigrationHistoryCollection.Find(p => p.Name == migrationName).FirstOrDefaultAsync()!;
    }

    /// <summary>
    /// Runs <paramref name="body" /> against a ledger row name unique to this execution, and removes that row afterwards.
    /// </summary>
    /// <remarks>
    /// The cleanup is in a <c>finally</c> so a failing assertion still leaves the collection clean — a test that only tidies up on the
    /// happy path leaves its worst-case debris behind, which is exactly the debris an operator would then be reading.
    /// </remarks>
    private static async Task WithThrowawayLedgerRowAsync(TextSnippetDbContext dbContext, Func<string, Task> body)
    {
        var migrationName = $"TestLedger_{Ulid.NewUlid()}";

        try
        {
            await body(migrationName);
        }
        finally
        {
            await dbContext.MigrationHistoryCollection.DeleteOneAsync(p => p.Name == migrationName);
        }
    }
}
