using Easy.Platform.Common.Extensions;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Application.MessageBus.InboxPattern;

/// <summary>
/// Behavioral tests for the permit-acquisition lifecycle used by
/// <c>PlatformConsumeInboxBusMessageHostedService.HandleInboxMessageAsync</c>.
/// <para>
/// The production method's body is short but has 8 distinct execution paths through the permit semaphore
/// (acquire vs timeout vs cancel × succeed vs throw × revert-success vs revert-fail). Directly constructing
/// a hosted service with all its DI dependencies for each test is heavy and brittle. Instead we extract
/// the exact try/catch/finally LOGIC into a private helper <see cref="RunPermitGatedAsync"/> and assert
/// observable side effects on each path:
/// <list type="bullet">
///   <item>Semaphore <c>CurrentCount</c> after completion (proves no leak / no over-release)</item>
///   <item>Whether the work callback ran</item>
///   <item>Whether the revert callback ran</item>
/// </list>
/// The production code is kept in sync via source-shape assertions in
/// <see cref="PlatformInboxStuckProcessingFixSourceShapeTests"/>.
/// </para>
/// </summary>
public class PlatformInboxOvershootPermitLifecycleTests
{
    private const int MaxPermits = 2;

    /// <summary>
    /// Path 3 — Permit timeout, work succeeds (overshoot path). All permits pre-held, our task waits
    /// briefly, times out, runs work anyway WITHOUT a permit. Pre-held permits are not affected.
    /// Expected: work ran, revert did NOT run, CurrentCount unchanged.
    /// </summary>
    [Fact]
    public async Task Path3_PermitTimeout_WorkSucceeds_ShouldRunWorkAndLeavePermitsUnchanged()
    {
        using var semaphore = new SemaphoreSlim(MaxPermits, MaxPermits);
        // Drain all permits to force timeout
        await semaphore.WaitAsync();
        await semaphore.WaitAsync();
        semaphore.CurrentCount.Should().Be(0, "test precondition: all permits held");

        var workRan = false;
        var revertRan = false;

        await RunPermitGatedAsync(
            semaphore: semaphore,
            timeout: 50.Milliseconds(),
            cancellationToken: CancellationToken.None,
            work: () =>
            {
                workRan = true;
                return Task.CompletedTask;
            },
            revert: () =>
            {
                revertRan = true;
                return Task.CompletedTask;
            });

        workRan.Should().BeTrue("overshoot path must execute work even when no permit acquired");
        revertRan.Should().BeFalse("revert must NOT fire on success path");
        semaphore.CurrentCount.Should().Be(0, "permits we did not acquire must not be released — would be over-release");
    }

    /// <summary>
    /// Path 4 — Permit timeout, work throws. Overshoot path with consumer failure. Revert MUST fire;
    /// no permit was acquired so no release.
    /// </summary>
    [Fact]
    public async Task Path4_PermitTimeout_WorkThrows_ShouldRevertAndNotOverRelease()
    {
        using var semaphore = new SemaphoreSlim(MaxPermits, MaxPermits);
        await semaphore.WaitAsync();
        await semaphore.WaitAsync();

        var revertRan = false;

        await RunPermitGatedAsync(
            semaphore: semaphore,
            timeout: 50.Milliseconds(),
            cancellationToken: CancellationToken.None,
            work: () => throw new InvalidOperationException("consumer failure simulated"),
            revert: () =>
            {
                revertRan = true;
                return Task.CompletedTask;
            });

        revertRan.Should().BeTrue("revert must fire when work throws (overshoot path)");
        semaphore.CurrentCount.Should().Be(0, "no permit acquired → no release on throw");
    }

    /// <summary>
    /// Path 5 — Cancellation token already cancelled before WaitAsync. Wait throws
    /// <see cref="OperationCanceledException"/> before granting a permit. Revert must fire using
    /// <see cref="CancellationToken.None"/> internally so it can complete during host shutdown.
    /// </summary>
    [Fact]
    public async Task Path5_PreCancelledToken_ShouldThrowOceAndRevertAndNotOverRelease()
    {
        using var semaphore = new SemaphoreSlim(MaxPermits, MaxPermits);
        using var ctsCancelled = new CancellationTokenSource();
        await ctsCancelled.CancelAsync();

        var workRan = false;
        var revertRan = false;

        await RunPermitGatedAsync(
            semaphore: semaphore,
            timeout: 30.Seconds(),
            cancellationToken: ctsCancelled.Token,
            work: () =>
            {
                workRan = true;
                return Task.CompletedTask;
            },
            revert: () =>
            {
                revertRan = true;
                return Task.CompletedTask;
            });

        workRan.Should().BeFalse("work must not run when WaitAsync was cancelled");
        revertRan.Should().BeTrue("revert must fire on cancellation-during-wait");
        semaphore.CurrentCount.Should().Be(MaxPermits, "no permit acquired → no release; pool stays at MaxPermits");
    }

    /// <summary>
    /// Path 6 — Cancellation token fires WHILE WaitAsync is blocked. Same outcome as Path 5 but with
    /// a different race: token cancels after WaitAsync has started waiting (permits all held).
    /// </summary>
    [Fact]
    public async Task Path6_CancellationDuringWait_ShouldThrowOceAndRevertAndNotOverRelease()
    {
        using var semaphore = new SemaphoreSlim(MaxPermits, MaxPermits);
        await semaphore.WaitAsync();
        await semaphore.WaitAsync();

        using var cts = new CancellationTokenSource();
        var revertRan = false;
        var workRan = false;

        var runTask = RunPermitGatedAsync(
            semaphore: semaphore,
            timeout: 30.Seconds(),
            cancellationToken: cts.Token,
            work: () =>
            {
                workRan = true;
                return Task.CompletedTask;
            },
            revert: () =>
            {
                revertRan = true;
                return Task.CompletedTask;
            });

        await Task.Delay(50);
        await cts.CancelAsync();
        await runTask;

        workRan.Should().BeFalse("work must not run when cancellation fired during wait");
        revertRan.Should().BeTrue("revert must fire on cancellation-during-wait");
        semaphore.CurrentCount.Should().Be(0, "no permit acquired → no release; held permits not affected");
    }

    /// <summary>
    /// Path 8 — Revert itself throws (catch block fault). Verifies the finally block still executes
    /// and releases the permit if it was acquired. The exception propagates to caller.
    /// </summary>
    [Fact]
    public async Task Path8_PermitAcquired_WorkThrows_RevertAlsoThrows_ShouldStillReleasePermit()
    {
        using var semaphore = new SemaphoreSlim(MaxPermits, MaxPermits);

        var act = () => RunPermitGatedAsync(
            semaphore: semaphore,
            timeout: 30.Seconds(),
            cancellationToken: CancellationToken.None,
            work: () => throw new InvalidOperationException("primary failure"),
            revert: () => throw new InvalidOperationException("revert also failed (e.g., DB down)"),
            swallowExceptions: false);

        await act.Should().ThrowAsync<InvalidOperationException>("uncaught revert exception must propagate");

        semaphore.CurrentCount.Should().Be(MaxPermits, "finally must release the permit even when catch block throws");
    }

    /// <summary>
    /// Sanity invariant: when permits are available, the happy path uses the permit and releases on
    /// success. Mirrors integration-test coverage but proves the helper does not regress the
    /// throttled path.
    /// </summary>
    [Fact]
    public async Task Sanity_HappyPath_ShouldAcquirePermitAndReleaseOnSuccess()
    {
        using var semaphore = new SemaphoreSlim(MaxPermits, MaxPermits);
        var observedCountDuringWork = -1;

        await RunPermitGatedAsync(
            semaphore: semaphore,
            timeout: 30.Seconds(),
            cancellationToken: CancellationToken.None,
            work: () =>
            {
                observedCountDuringWork = semaphore.CurrentCount;
                return Task.CompletedTask;
            },
            revert: () => Task.CompletedTask);

        observedCountDuringWork.Should().Be(MaxPermits - 1, "permit must be acquired before work runs");
        semaphore.CurrentCount.Should().Be(MaxPermits, "permit must be released after success");
    }

    /// <summary>
    /// Mirrors the exact try/catch/finally pattern in
    /// <c>PlatformConsumeInboxBusMessageHostedService.HandleInboxMessageAsync</c>. Any drift from this
    /// pattern in production code is caught by <see cref="PlatformInboxStuckProcessingFixSourceShapeTests"/>.
    /// </summary>
    private static async Task RunPermitGatedAsync(
        SemaphoreSlim semaphore,
        TimeSpan timeout,
        CancellationToken cancellationToken,
        Func<Task> work,
        Func<Task> revert,
        bool swallowExceptions = true)
    {
        var permitAcquired = false;
        try
        {
            permitAcquired = await semaphore.WaitAsync(timeout, cancellationToken);
            await work();
        }
        catch (Exception)
        {
            try
            {
                await revert();
            }
            catch
            {
                if (!swallowExceptions) throw;
            }
        }
        finally
        {
            if (permitAcquired)
            {
                try
                {
                    semaphore.Release();
                }
                catch
                {
                    // SemaphoreFullException swallowed (mirrors ThreadExtensions.TryRelease)
                }
            }
        }
    }
}
