using System;
using Microsoft.Extensions.Configuration;

namespace AngularDotnetPlatform.Platform.Caching
{
    /// <summary>
    /// Provides the cache options for an entry in <see cref="IPlatformCacheRepository"/>.
    /// </summary>
    public class PlatformCacheEntryOptions
    {
        public static int DefaultExpirationInSeconds = 3600;

        /// <summary>
        /// Gets or sets how long a cache entry can be inactive (e.g. not accessed) before it will be removed.
        /// This will not extend the entry lifetime beyond the absolute expiration (if set).
        /// </summary>
        public virtual int? SlidingExpirationInSeconds { get; set; }

        /// <summary>
        /// Gets or sets an expiration time after seconds, relative to now.
        /// </summary>
        public virtual int? ExpirationInSeconds { get; set; } = DefaultExpirationInSeconds;

        /// <summary>
        /// Gets or sets an absolute expiration time, relative to now.
        /// </summary>
        public TimeSpan? AbsoluteExpirationRelativeToNow()
        {
            return ExpirationInSeconds.HasValue ? TimeSpan.FromSeconds(ExpirationInSeconds.Value) : null;
        }

        /// <summary>
        /// Gets or sets how long a cache entry can be inactive (e.g. not accessed) before it will be removed.
        /// This will not extend the entry lifetime beyond the absolute expiration (if set).
        /// </summary>
        public TimeSpan? SlidingExpiration()
        {
            return SlidingExpirationInSeconds.HasValue ? TimeSpan.FromSeconds(SlidingExpirationInSeconds.Value) : null;
        }
    }

    public abstract class PlatformConfigurationCacheEntryOptions : PlatformCacheEntryOptions
    {
        protected readonly IConfiguration Configuration;

        public PlatformConfigurationCacheEntryOptions(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public abstract override int? ExpirationInSeconds { get; }

        public abstract override int? SlidingExpirationInSeconds { get; }
    }
}
