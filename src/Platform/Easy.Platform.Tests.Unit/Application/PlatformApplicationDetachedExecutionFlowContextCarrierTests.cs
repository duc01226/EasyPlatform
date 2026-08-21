using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Easy.Platform.Tests.Unit.Application;

/// <summary>
/// Guards the carry half of the request-detached background dispatch contract.
/// <para />The marker that forbids a background flow from reading its originating request's ambient state is only
/// half a fix: on its own it converts an intermittent crash into a permanent silent loss of the caller's identity.
/// This carrier is the other half, and these tests pin the three properties the dispatch boundary relies on.
/// <para />1. <b>A flow with nothing to carry is not a failure.</b> Background jobs, startup tasks and bus consumers
/// schedule work with no ambient request context at all; capture must answer "nothing" rather than fabricate or
/// throw.
/// <para />2. <b>Neither phase may ever throw into its caller.</b> Capture runs on a request thread that is merely
/// scheduling follow-up work, and restore runs inside a detached flow that has no caller left to report to. A carry
/// failure must degrade the context, never kill the work — every <c>ExecuteScopedInBackground*</c> call site depends
/// on this and none of them guards it.
/// <para />3. <b>What is captured actually reaches the detached flow.</b> Asserted against a genuinely fresh
/// execution flow (<see cref="ExecutionContext.SuppressFlow" />), because in an inheriting flow the ambient
/// AsyncLocal would supply the same values and the assertion would pass whether or not the carrier did anything.
/// </summary>
public class PlatformApplicationDetachedExecutionFlowContextCarrierTests
{
    private readonly PlatformApplicationDetachedExecutionFlowContextCarrier carrier = new();

    [Fact]
    public void CaptureFromSchedulingFlow_WhenTheFlowHasNoAmbientRequestContext_ReturnsNothingRatherThanFailing()
    {
        // No accessor has been touched on this flow, so the platform's flowed context is absent — the state a
        // background job, startup task or bus consumer schedules from.
        var captured = carrier.CaptureFromSchedulingFlow();

        captured.Should().BeNull(
            "a flow with no ambient request context has nothing to carry, which is a legitimate answer and must not "
            + "be reported as a carry failure");
    }

    [Fact]
    public void RestoreIntoDetachedFlow_WhenNothingWasCaptured_NeverTouchesTheDestinationScope()
    {
        var destination = new ThrowingServiceProvider();

        carrier.RestoreIntoDetachedFlow(destination, capturedState: null);

        destination.ResolveAttempts.Should().Be(
            0,
            "an empty carry must short-circuit before resolving anything, so scheduling from a context-less flow "
            + "costs a detached scope nothing");
    }

    [Fact]
    public void RestoreIntoDetachedFlow_WhenTheCarriedSetIsEmpty_NeverTouchesTheDestinationScope()
    {
        var destination = new ThrowingServiceProvider();

        carrier.RestoreIntoDetachedFlow(destination, new Dictionary<string, object?>());

        destination.ResolveAttempts.Should().Be(0, "there is nothing to write, so nothing needs resolving");
    }

    [Fact]
    public void RestoreIntoDetachedFlow_WhenTheCarriedStateIsNotAContextDictionary_NeverTouchesTheDestinationScope()
    {
        var destination = new ThrowingServiceProvider();

        // The capture payload is deliberately opaque (object?) so the shared dispatch layer stays free of request
        // vocabulary. Opaque means a wrong payload is possible, so the type guard is part of the contract.
        carrier.RestoreIntoDetachedFlow(destination, "not a request context");

        destination.ResolveAttempts.Should().Be(0, "an unrecognized payload must be ignored, not coerced");
    }

    [Fact]
    public void RestoreIntoDetachedFlow_WhenTheDestinationCannotResolveAnAccessor_DegradesInsteadOfKillingTheWork()
    {
        var destination = new ThrowingServiceProvider();

        var restore = () => carrier.RestoreIntoDetachedFlow(
            destination,
            new Dictionary<string, object?> { { PlatformApplicationCommonRequestContextKeys.UserIdContextKey, "user-1" } });

        restore.Should().NotThrow(
            "restore runs inside a detached flow with no caller left to report to; a carry failure must degrade the "
            + "context, never fail the background work the dispatch boundary was asked to run");
        destination.ResolveAttempts.Should().Be(1, "it must have genuinely attempted the resolve it then swallowed");
    }

    [Fact]
    public async Task CaptureThenRestore_CarriesTheSchedulingFlowsContextIntoAFlowThatInheritsNoneOfIt()
    {
        var services = BuildRequestContextServices();
        var carriedUserId = $"user-{Guid.NewGuid():N}";

        // Establish an ambient request context on THIS flow, the way a request does, then write through the flowed
        // context so the value lives where a detached scope would otherwise have to find it.
        using var schedulingScope = services.CreateScope();
        _ = schedulingScope.ServiceProvider.GetRequiredService<IPlatformApplicationRequestContextAccessor>().Current;

        PlatformDefaultApplicationRequestContextAccessor.CurrentExecutionFlowContext
            .Should()
            .NotBeNull("touching Current must establish the flowed context this carrier snapshots");
        PlatformDefaultApplicationRequestContextAccessor.CurrentExecutionFlowContext!
            .SetValue(carriedUserId, PlatformApplicationCommonRequestContextKeys.UserIdContextKey);

        var captured = carrier.CaptureFromSchedulingFlow();

        captured.Should().NotBeNull("the scheduling flow has a context, so there is something to carry");

        string? seenInDetachedFlow = null;

        // A genuinely detached flow. Without SuppressFlow the AsyncLocal would follow the task in and hand the
        // destination accessor the same values by inheritance, so this assertion would hold with the carrier
        // deleted — the exact vacuity this test exists to avoid.
        //
        // The task is STARTED inside the suppression and AWAITED outside it: AsyncFlowControl.Undo must run on the
        // thread that created it, and awaiting inside the using would resume the continuation on another thread.
        Task detachedFlowWork;

        using (ExecutionContext.SuppressFlow())
        {
            detachedFlowWork = Task.Run(() =>
            {
                PlatformDefaultApplicationRequestContextAccessor.CurrentExecutionFlowContext
                    .Should()
                    .BeNull("the detached flow must start with no inherited ambient context, or the test is vacuous");

                using var detachedScope = services.CreateScope();

                carrier.RestoreIntoDetachedFlow(detachedScope.ServiceProvider, captured);

                seenInDetachedFlow = detachedScope.ServiceProvider
                    .GetRequiredService<IPlatformApplicationRequestContextAccessor>()
                    .Current.GetValue<string>(PlatformApplicationCommonRequestContextKeys.UserIdContextKey);
            });
        }

        await detachedFlowWork;

        seenInDetachedFlow.Should().Be(
            carriedUserId,
            "follow-up work must still act as the user its originating request established; losing this is how "
            + "closing the ambient-read race turns an intermittent crash into permanently anonymous background work");
    }

    private static ServiceProvider BuildRequestContextServices()
    {
        var services = new ServiceCollection();
        ServiceProvider? built = null;

        var rootServiceProvider = new Mock<IPlatformRootServiceProvider>();
        rootServiceProvider.Setup(p => p.GetScopedRootServiceProvider()).Returns(() => built!);

        services.AddSingleton<IConfiguration>(new ConfigurationBuilder().Build());
        services.AddSingleton(rootServiceProvider.Object);

        // Required: the context constructor dereferences this, so an unregistered one fails setup rather than the
        // behavior under test. Empty register list — this test carries plain values, not lazily-resolved ones.
        services.AddScoped(
            sp => new PlatformApplicationLazyLoadRequestContextAccessorRegisters(
                sp,
                sp.GetRequiredService<IPlatformApplicationRequestContextAccessor>(),
                []));
        services.AddScoped<IPlatformApplicationRequestContextAccessor>(
            sp => new PlatformDefaultApplicationRequestContextAccessor(
                sp,
                PlatformDefaultApplicationRequestContextAccessor.ContextLifeTimeModes.PerScopeCombinedWithAsyncLocalTaskFlow,
                NullLoggerFactory.Instance));

        built = services.BuildServiceProvider();

        return built;
    }

    /// <summary>
    /// A destination scope that fails every resolve, standing in for a minimal or already-disposed container.
    /// Counts attempts so a test can tell "guarded before resolving" apart from "resolved, threw, and swallowed" —
    /// two outcomes that look identical from the outside and mean opposite things.
    /// </summary>
    private sealed class ThrowingServiceProvider : IServiceProvider
    {
        public int ResolveAttempts { get; private set; }

        public object? GetService(Type serviceType)
        {
            ResolveAttempts++;

            throw new InvalidOperationException($"No service for type '{serviceType}' has been registered.");
        }
    }
}
