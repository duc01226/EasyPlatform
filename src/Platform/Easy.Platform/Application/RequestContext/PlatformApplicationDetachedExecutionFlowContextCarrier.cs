#nullable enable

#region

using System.Diagnostics.Metrics;
using Easy.Platform.Common.Diagnostics;
using Easy.Platform.Common.Execution;
using Microsoft.Extensions.DependencyInjection;

#endregion

namespace Easy.Platform.Application.RequestContext;

/// <summary>
/// Carries the request context across a background dispatch boundary, so work spawned from a request keeps the
/// identity and tenancy that request established even though the spawned flow is forbidden to read the request's
/// ambient state.
/// </summary>
/// <remarks>
/// <para>
/// <strong>The gap this closes.</strong> <see cref="PlatformDetachedExecutionFlow" /> stops a background flow from
/// reading the originating request's ambient state — necessary, because that state is recycled underneath it. What
/// the background flow inherits instead is the AsyncLocal-flowed context that <c>InitContext</c> copies into every
/// new scope. That copy is NOT equivalent: the flowed context materialises itself once, on the first
/// <c>.Current</c> access of the request, and in an ASP.NET pipeline that first access happens in the request-id
/// middleware — BEFORE authentication has run, so the principal is still empty. Worse, the materialisation walks
/// CLAIM TYPES (<c>sub</c>, <c>email</c>, <c>role</c>), while callers look keys up by CONTEXT KEY
/// (<c>UserId</c>, <c>Email</c>, <c>UserRoles</c>), which the claim-type mapper deliberately maps to different
/// names. Both effects point the same way: every claim-derived key is absent from the snapshot a background scope
/// inherits. Before the detach marker existed those keys were still recovered — by racing the recycled
/// HttpContext, which is the crash the marker fixed. Without something to carry them forward, closing the race
/// converts an intermittent crash into a permanent, silent loss of <c>UserId</c>, roles and selected company on
/// every root-derived background flow.
/// </para>
///
/// <para>
/// <strong>Why capture reads the execution flow, not <c>accessor.Current</c>.</strong> See
/// <see cref="PlatformDefaultApplicationRequestContextAccessor.CurrentExecutionFlowContext" />: nearly every
/// background dispatch site holds the ROOT service provider, and an accessor resolved from there would answer with
/// a process-wide scope's context rather than this request's. Reading the flow-scoped context is correct no matter
/// which provider the dispatcher happens to hold.
/// </para>
///
/// <para>
/// <strong>Why capture resolves the propagation allowlist, and ONLY the allowlist.</strong> Reading
/// <see cref="IPlatformApplicationRequestContext.GetAllKeyValues" /> is not merely a read: resolving a key caches
/// it, so asking for the allowlisted keys while the request is still alive is what MATERIALISES the identity keys
/// that the one-shot snapshot missed. That single call is the whole of the carry, deliberately. Widening it to the
/// full cached view would add nothing a detached scope does not already receive — scope inheritance copies that
/// same cache into every new scope — while making WHAT gets carried depend on whether some earlier, unrelated part
/// of the request happened to force the cache to materialise first. Same code, two different carried sets, decided
/// by history rather than by rule. The allowlist is the rule, so the allowlist is the carry.
/// </para>
///
/// <para>
/// <strong>Why the result is copied.</strong> Not every implementation hands back a private dictionary:
/// <see cref="PlatformDefaultApplicationRequestContext.GetAllKeyValues" /> returns the context's own live one,
/// which the still-running scheduling flow keeps writing to while the detached flow reads it. The copy also fixes
/// the values at the instant the request was known to be alive, which is the property this whole class exists to
/// provide. The comparer is left at the source dictionary's default on purpose — imposing a case-insensitive one
/// here would silently merge two keys the source treats as distinct, dropping one of their values.
/// </para>
///
/// <para>
/// <strong>Why restore ADDS rather than SETS.</strong> The detached scope has already inherited whatever scope
/// inheritance gave it, and a caller further in (a CQRS event handler applying the event's own captured context,
/// for instance) is entitled to override what the scheduling request had. Filling only the gaps makes this carrier
/// a floor, never a ceiling.
/// </para>
///
/// <para>
/// <strong>Precondition — this carrier is INERT under
/// <see cref="PlatformDefaultApplicationRequestContextAccessor.ContextLifeTimeModes.PerScope" />.</strong> That
/// mode never populates the flowed context, so <c>CurrentExecutionFlowContext</c> is null, capture returns null,
/// and nothing is carried — silently, because "this flow has no ambient context" is also the legitimate answer for
/// a background job or a bus consumer and must not be counted as a failure. Both platform registrations default to
/// <c>PerScopeCombinedWithAsyncLocalTaskFlow</c> and no service overrides them today, but a service that opts into
/// <c>PerScope</c> gets no carry from here AND no scope inheritance of the flowed context either — it must
/// establish background context by another route.
/// </para>
///
/// <para>
/// <strong>Known duplication, deliberately not resolved here.</strong>
/// <c>IPlatformBackgroundJobSchedulerCarryRequestContextService</c> already carries request context across an
/// async boundary for scheduled jobs. The two should converge on this one — its restore takes the destination
/// scope explicitly, whereas the older service accepts a scope parameter and then ignores it in favour of its own
/// injected accessor. Converging was left out of the bugfix that introduced this class on purpose: it would pull
/// job scheduling, which every service uses, into a change scoped to a request-context race. It belongs in a
/// dedicated refactor.
/// </para>
///
/// <para>
/// <strong>Bounded by the propagation caps.</strong> The carry is exactly what the allowlist resolves, so it
/// inherits that view's key-count and total-size caps. A typical host allowlist sits well inside them, and
/// identity keys sort first by propagation priority so they can never be the ones dropped — but an allowlist grown
/// past the cap would start truncating this carry too, without an error.
/// </para>
/// </remarks>
public class PlatformApplicationDetachedExecutionFlowContextCarrier : IPlatformDetachedExecutionFlowContextCarrier
{
    /// <summary>
    /// Counter of carry attempts that failed, tagged by <c>phase</c> (capture/restore) and exception type.
    /// </summary>
    /// <remarks>
    /// Both phases swallow their failures by contract — capture must not fail the request that is merely
    /// scheduling follow-up work, and restore has no caller left to report to. A swallow nobody can observe is how
    /// the defect this subsystem already fixed once survived four attempts, so the swallow is counted. A non-zero
    /// value means background work is running with a degraded request context: it will not crash, but it will act
    /// without the user, roles or company the originating request established. Declared here, in the layer that
    /// owns the concern, so <see cref="PlatformMeter" /> keeps no request vocabulary of its own.
    /// </remarks>
    private static readonly Counter<long> DetachedFlowContextCarryFailureTotal =
        PlatformMeter.Instance.CreateCounter<long>("easyplatform.requestcontext.detached_flow_carry_failure_total");

    /// <inheritdoc />
    public object? CaptureFromSchedulingFlow()
    {
        try
        {
            var schedulingFlowContext = PlatformDefaultApplicationRequestContextAccessor.CurrentExecutionFlowContext;

            // No ambient request context on this flow — a background job, a startup task, a bus consumer. Nothing
            // to carry, and nothing wrong: the detached flow will establish its own context from its own source.
            if (schedulingFlowContext == null) return null;

            // Resolved while this flow's ambient state is provably alive — the step that puts the claim-derived
            // identity keys within reach of the detached flow at all — and deliberately nothing wider than the
            // allowlist, so the carried set is the same on every dispatch from every request.
            var propagatedValues = schedulingFlowContext.GetAllKeyValues();

            // Copied, not referenced: some implementations return the context's own live dictionary, which the
            // still-running scheduling flow keeps writing to while the detached flow reads it.
            return new Dictionary<string, object?>(propagatedValues);
        }
        catch (Exception e)
        {
            RecordCarryFailure("capture", e);
            return null;
        }
    }

    /// <inheritdoc />
    public void RestoreIntoDetachedFlow(IServiceProvider detachedScopeServiceProvider, object? capturedState)
    {
        if (capturedState is not IDictionary<string, object?> capturedValues || capturedValues.Count == 0) return;

        try
        {
            detachedScopeServiceProvider
                .GetRequiredService<IPlatformApplicationRequestContextAccessor>()
                .Current.AddValues(capturedValues, onlySelf: true);
        }
        catch (Exception e)
        {
            RecordCarryFailure("restore", e);
        }
    }

    private static void RecordCarryFailure(string phase, Exception e)
    {
        try
        {
            DetachedFlowContextCarryFailureTotal.Add(
                1,
                new KeyValuePair<string, object?>("phase", phase),
                new KeyValuePair<string, object?>("exception", e.GetType().Name));
        }
        catch
        {
            // Telemetry must never change control flow: if the meter pipeline is disposed during host shutdown,
            // carrying still degrades to "carried nothing" exactly as it does for any other failure here.
        }
    }
}
