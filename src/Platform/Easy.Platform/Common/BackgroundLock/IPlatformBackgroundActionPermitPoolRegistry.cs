namespace Easy.Platform.Common.BackgroundLock;

/// <summary>
/// Lazy registry that resolves named <see cref="IPlatformBackgroundActionPermitPool"/> instances
/// from <c>PlatformBackgroundLockConfig</c>. When the feature is disabled, every name resolves to
/// the same shared <c>NoOpBackgroundActionPermitPool</c> singleton — callers stay branch-free.
/// </summary>
/// <remarks>
/// The registry is the factory and cache boundary for the permit-pool design. Call sites should
/// ask for a logical pool name and then pass the returned pool to TaskRunner; they should not
/// construct semaphore pools directly or read configuration on every background action.
/// </remarks>
public interface IPlatformBackgroundActionPermitPoolRegistry
{
    /// <summary>
    /// Reserved pool name applied by the legacy <c>ExecuteScopedInBackgroundAsync</c> overload
    /// (no <c>permitPoolName</c> argument) so existing service callers gain bounded-wait +
    /// auto-release + metrics without any code change.
    /// </summary>
    public const string DefaultPoolName = "Default";

    /// <summary>
    /// Returns the pool for <paramref name="poolName"/>. Lazy-constructs on first access; subsequent
    /// calls return the cached instance. Names not present in <c>Pools</c> fall back to
    /// <c>DefaultPool</c>. When the feature is disabled, returns the shared no-op pool regardless of name.
    /// </summary>
    /// <remarks>
    /// When <c>PlatformBackgroundLockConfig.Enabled == false</c>, returns a <c>NoOpBackgroundActionPermitPool</c>
    /// whose <c>AcquireAsync</c> delegates to the legacy global
    /// <c>Util.TaskRunner.BackgroundActionQueueLimitLock</c> semaphore with infinite wait + the configured
    /// <c>MaxHoldTime</c> auto-release safety net. Service authors should NOT branch on disabled-mode
    /// behavior — the pool contract is uniform.
    /// </remarks>
    IPlatformBackgroundActionPermitPool Get(string poolName);

    /// <summary>
    /// Cached reference to the <see cref="DefaultPoolName"/> pool. Hot-path callers
    /// (legacy <c>ExecuteScopedInBackgroundAsync</c> auto-route) avoid the
    /// <c>ConcurrentDictionary</c> lookup entirely.
    /// </summary>
    /// <remarks>
    /// When <c>PlatformBackgroundLockConfig.Enabled == false</c>, returns a <c>NoOpBackgroundActionPermitPool</c>
    /// whose <c>AcquireAsync</c> delegates to the legacy global
    /// <c>Util.TaskRunner.BackgroundActionQueueLimitLock</c> semaphore with infinite wait + the configured
    /// <c>MaxHoldTime</c> auto-release safety net. Service authors should NOT branch on disabled-mode
    /// behavior — the pool contract is uniform.
    /// </remarks>
    IPlatformBackgroundActionPermitPool DefaultPool { get; }
}
