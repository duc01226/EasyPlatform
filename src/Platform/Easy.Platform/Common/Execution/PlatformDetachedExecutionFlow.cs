namespace Easy.Platform.Common.Execution;

/// <summary>
/// Marks the current asynchronous execution flow as <b>detached</b> — running in a scope that no longer
/// belongs to whatever ambient scope scheduled it.
/// </summary>
/// <remarks>
/// <para>
/// <strong>Why this exists:</strong>
/// Work dispatched fire-and-forget from a root-derived scope still inherits the scheduling thread's ambient
/// (<see cref="AsyncLocal{T}" />-flowed) state, because that is what <c>ExecutionContext</c> capture does.
/// When the scheduler owns that ambient state and tears it down as soon as its own unit of work finishes,
/// the spawned flow is left holding a reference to state that is being recycled underneath it. Reading it is
/// then a use-after-recycle race: the object's internals can be reset mid-read, surfacing as an intermittent
/// failure deep inside the owning library rather than a clean error. No amount of null-checking at the read
/// site closes that window, because the check and the read cannot be made atomic with respect to the
/// teardown.
/// </para>
///
/// <para>
/// <strong>The contract:</strong>
/// A dispatch boundary that creates a root-derived scope marks its own flow detached. Any component holding
/// ambient scope-owned state consults <see cref="IsDetached" /> and, when it is <c>true</c>, resolves from
/// values captured at dispatch time instead of reading that ambient state.
/// </para>
///
/// <para>
/// <strong>Deliberately vocabulary-neutral.</strong>
/// This type states one execution-flow fact — "this flow is detached from its scheduling caller's ambient
/// state" — and nothing about what that ambient state <em>is</em>. It names no request, no tenant, no
/// culture, and no host type, so a dispatch utility can assert the fact without depending on any consumer's
/// interpretation of it. Each ambient concern owns its own reading of this flag in its own layer: for
/// per-request state that is the ASP.NET request-context layer, which returns no HTTP context while a flow
/// is detached.
/// </para>
///
/// <para>
/// <strong>Thread safety / flow semantics:</strong>
/// Backed by <see cref="AsyncLocal{T}" />. <see cref="MarkDetached" /> MUST be called from inside the
/// spawned background delegate, never on the scheduling thread. Writing an <see cref="AsyncLocal{T}" />
/// inside the spawned delegate mutates that task's copy-on-write execution context only: the value flows
/// forward into the delegate's own continuations and is never visible to the scheduling thread. Calling it
/// on the scheduling thread instead would wrongly mark the still-live scheduling flow as detached.
/// </para>
///
/// <para>
/// <strong>One-way within a flow.</strong>
/// There is deliberately no un-mark: a flow that has been detached stays detached for its whole lifetime.
/// Re-attaching would reopen the very race this type closes, because nothing can prove the scheduler's
/// ambient state is still alive at the moment of re-attachment. Work that legitimately needs scope-owned
/// values must receive them as captured dispatch-time values, not by reaching back for the ambient state.
/// </para>
/// </remarks>
public static class PlatformDetachedExecutionFlow
{
    private static readonly AsyncLocal<bool> IsDetachedAsyncLocal = new();

    /// <summary>
    /// Whether the current execution flow is running detached from the ambient state of whatever scheduled
    /// it, and therefore MUST NOT read that ambient state.
    /// </summary>
    public static bool IsDetached => IsDetachedAsyncLocal.Value;

    /// <summary>
    /// Marks the current execution flow detached.
    /// Call this as the FIRST statement inside a spawned background delegate — see the flow semantics note
    /// in the type remarks for why the call site matters.
    /// </summary>
    public static void MarkDetached()
    {
        IsDetachedAsyncLocal.Value = true;
    }
}
