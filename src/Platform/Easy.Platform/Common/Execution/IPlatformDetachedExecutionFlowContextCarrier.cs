#nullable enable

namespace Easy.Platform.Common.Execution;

/// <summary>
/// Carries ambient flow state ACROSS a detach boundary: snapshotted on the still-live scheduling flow, then
/// re-established inside the spawned flow after it has been marked
/// <see cref="PlatformDetachedExecutionFlow.MarkDetached" />.
/// </summary>
/// <remarks>
/// <para>
/// <strong>Why this is the other half of <see cref="PlatformDetachedExecutionFlow" />.</strong>
/// The marker states what a detached flow must NOT do — read ambient state it no longer owns. On its own that
/// closes the use-after-recycle race by making the spawned work blind, which trades a crash for a silent loss of
/// whatever that ambient state carried. The marker's own contract already names the remedy ("resolves from values
/// captured at dispatch time"); this interface is that remedy, expressed as something a dispatch boundary can
/// actually call. A dispatcher that marks without carrying is only half-implemented.
/// </para>
///
/// <para>
/// <strong>Ordering is the whole contract, and it is not interchangeable.</strong>
/// <see cref="CaptureFromSchedulingFlow" /> MUST run on the synchronous scheduling thread BEFORE the work is
/// queued — that is the last moment the ambient state is provably alive. Capturing inside the spawned delegate
/// would race the very teardown this exists to survive, and capturing after <c>MarkDetached</c> would read
/// through a flag that already denies the read.
/// <see cref="RestoreIntoDetachedFlow" /> MUST run inside the spawned delegate, after <c>MarkDetached</c> and
/// before the caller's work, so the work observes a fully-populated context on its first touch rather than a
/// half-populated one that a later restore would have to reconcile.
/// </para>
///
/// <para>
/// <strong>Deliberately vocabulary-neutral, like the marker.</strong>
/// The captured state is <see cref="object" />: this layer knows only that SOMETHING ambient must survive the
/// boundary, never that it is a request, a tenant, a culture or a principal. Each ambient concern implements this
/// in its own layer and keeps its own vocabulary there, so the shared dispatch utility depends on no consumer's
/// interpretation of what it is carrying.
/// </para>
///
/// <para>
/// <strong>Implementations MUST NOT throw.</strong>
/// Both members run on paths that must not be able to break their caller: capture runs on the scheduling flow,
/// where an exception would fail the very request that was merely trying to schedule follow-up work, and restore
/// runs on a fire-and-forget path with no one to observe a failure. Reading ambient state that is being torn
/// down is inherently racy, so an implementation swallows its own failures and degrades to "carried nothing"
/// rather than propagating. A null return from capture is a valid, expected outcome — it simply means there was
/// no ambient state to carry (a flow scheduled from a background job, a startup task, or a test host).
/// </para>
/// </remarks>
public interface IPlatformDetachedExecutionFlowContextCarrier
{
    /// <summary>
    /// Snapshots the scheduling flow's ambient state. Called on the SYNCHRONOUS scheduling thread, before the
    /// background work is queued and before the spawned flow is marked detached.
    /// </summary>
    /// <returns>
    /// An opaque snapshot to hand back to <see cref="RestoreIntoDetachedFlow" />, or <c>null</c> when there is no
    /// ambient state to carry. Never throws.
    /// </returns>
    object? CaptureFromSchedulingFlow();

    /// <summary>
    /// Re-establishes the captured state inside the detached flow's own scope. Called from inside the spawned
    /// delegate, after <see cref="PlatformDetachedExecutionFlow.MarkDetached" /> and before the caller's work.
    /// </summary>
    /// <param name="detachedScopeServiceProvider">The service provider of the scope the detached work will run in.</param>
    /// <param name="capturedState">The value returned by <see cref="CaptureFromSchedulingFlow" />; may be <c>null</c>.</param>
    void RestoreIntoDetachedFlow(IServiceProvider detachedScopeServiceProvider, object? capturedState);
}
