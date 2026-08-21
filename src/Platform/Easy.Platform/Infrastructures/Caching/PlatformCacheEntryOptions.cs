using Microsoft.Extensions.Configuration;

namespace Easy.Platform.Infrastructures.Caching;

/// <summary>
/// Provides the cache options for an entry in <see cref="IPlatformCacheRepository" />.
/// </summary>
public class PlatformCacheEntryOptions
{
    public const int DefaultExpirationInSeconds = 3600 * 24;

    /// <summary>
    /// Gets or sets how long a cache entry can be inactive (e.g. not accessed) before it will be removed.
    /// This will not extend the entry lifetime beyond the absolute expiration (if set).
    /// </summary>
    public virtual double? UnusedExpirationInSeconds { get; set; }

    /// <summary>
    /// Gets or sets an expiration time after seconds, relative to now.
    /// </summary>
    public virtual double? AbsoluteExpirationInSeconds { get; set; } = DefaultExpirationInSeconds;

    /// <summary>
    /// Gets or sets whether this entry must be written WITHOUT any expiration (neither absolute nor sliding),
    /// regardless of what <see cref="AbsoluteExpirationInSeconds" /> / <see cref="UnusedExpirationInSeconds" />
    /// currently hold.
    /// <br />
    /// This exists because <c>double?</c> cannot represent three distinct caller intents: "no override supplied,
    /// use the configured default", "an explicit expiration value", and "explicitly no expiration at all". A
    /// <see langword="null" /> field is indistinguishable from "unset" once this options object reaches the
    /// mapping layer (see <c>PlatformCacheRepository.MapToDistributedCacheEntryOptions</c> /
    /// <c>MapToHybridCacheEntryOptions</c>), so those mappers would otherwise silently substitute the settings
    /// default even when the caller's intent was "never expire" (e.g. the platform's own global cache-keys
    /// registry - see <c>PlatformCacheRepository.SetGlobalCachedKeysAsync</c>). Set this flag - via
    /// <see cref="NeverExpireOptions" /> - to make that intent explicit and bypass the per-field default fallback
    /// entirely.
    /// </summary>
    public bool NeverExpire { get; set; }

    /// <summary>
    /// Gets or sets an absolute expiration time, relative to now.
    /// </summary>
    public TimeSpan? AbsoluteExpirationRelativeToNow()
    {
        return AbsoluteExpirationInSeconds.HasValue
            ? TimeSpan.FromSeconds(AbsoluteExpirationInSeconds.Value)
            : null;
    }

    /// <summary>
    /// Builds options that explicitly request NO expiration (neither absolute nor sliding). Use this instead of
    /// constructing a bare <see cref="PlatformCacheEntryOptions" /> with both expiration fields set to
    /// <see langword="null" /> - a bare null-valued object is indistinguishable, at the mapping layer, from "no
    /// override supplied", and would silently receive the settings default expiration instead. See
    /// <see cref="NeverExpire" /> for the full rationale.
    /// </summary>
    public static PlatformCacheEntryOptions NeverExpireOptions()
    {
        return new PlatformCacheEntryOptions { NeverExpire = true };
    }

    /// <summary>
    /// Gets or sets how long a cache entry can be inactive (e.g. not accessed) before it will be removed.
    /// This will not extend the entry lifetime beyond the absolute expiration (if set).
    /// </summary>
    public TimeSpan? SlidingExpiration()
    {
        return UnusedExpirationInSeconds.HasValue ? TimeSpan.FromSeconds(UnusedExpirationInSeconds.Value) : null;
    }

    public PlatformCacheEntryOptions WithOptionalCustomAbsoluteExpirationInSeconds(double? value)
    {
        if (value != null)
            AbsoluteExpirationInSeconds = value;
        return this;
    }
}

/// <summary>
/// Extend from this class to define CacheEntryOptions which read from IConfiguration. This will be register and replace the default PlatformCacheEntryOptions
/// </summary>
public abstract class PlatformConfigurationCacheEntryOptions : PlatformCacheEntryOptions
{
    protected readonly IConfiguration Configuration;

    public PlatformConfigurationCacheEntryOptions(IConfiguration configuration)
    {
        Configuration = configuration;
    }

    public abstract override double? AbsoluteExpirationInSeconds { get; }

    public abstract override double? UnusedExpirationInSeconds { get; }
}
