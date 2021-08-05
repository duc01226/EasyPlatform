namespace AngularDotnetPlatform.Platform.Caching
{
    /// <summary>
    /// Cache Provider provide cache repository like MemoryCache, DistributedCache.
    /// </summary>
    public interface IPlatformCacheProvider
    {
        /// <summary>
        /// Get last registered cache repository or default cache repository
        /// </summary>
        public IPlatformCache Get();

        /// <summary>
        /// Get cache repository by type
        /// </summary>
        public IPlatformCache Get(PlatformCacheRepositoryType cacheRepositoryType);

        /// <summary>
        /// Get default cache repository
        /// </summary>
        public IPlatformCache GetDefault();
    }
}
