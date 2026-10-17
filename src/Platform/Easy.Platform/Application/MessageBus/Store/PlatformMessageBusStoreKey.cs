namespace Easy.Platform.Application.MessageBus.Store;

/// <summary>
/// Identifies a logical message-bus persistence lane.
/// </summary>
/// <remarks>
/// The key is deliberately provider-neutral. It identifies the composition contract used by the
/// application and persistence modules; it does not identify a database, connection, queue, or payload.
/// </remarks>
public readonly struct PlatformMessageBusStoreKey : IEquatable<PlatformMessageBusStoreKey>
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformMessageBusStoreKey" /> struct.
    /// </summary>
    /// <param name="value">The logical store key. Leading and trailing whitespace is removed.</param>
    public PlatformMessageBusStoreKey(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException("A message-bus store key must not be empty.", nameof(value));

        Value = value.Trim();
    }

    /// <summary>
    /// Gets the normalized logical key value.
    /// </summary>
    public string Value { get; }

    /// <summary>
    /// Gets the legacy single-store key.
    /// </summary>
    public static PlatformMessageBusStoreKey Default { get; } = new("Default");

    /// <summary>
    /// Gets a value indicating whether this key is the legacy default key.
    /// </summary>
    public bool IsDefault => string.Equals(Value, Default.Value, StringComparison.Ordinal);

    /// <summary>
    /// Gets a value indicating whether this instance was created by the parameterless struct constructor.
    /// </summary>
    public bool IsEmpty => string.IsNullOrEmpty(Value);

    /// <inheritdoc />
    public bool Equals(PlatformMessageBusStoreKey other)
    {
        return string.Equals(Value, other.Value, StringComparison.Ordinal);
    }

    /// <inheritdoc />
    public override bool Equals(object obj)
    {
        return obj is PlatformMessageBusStoreKey other && Equals(other);
    }

    /// <inheritdoc />
    public override int GetHashCode()
    {
        return StringComparer.Ordinal.GetHashCode(Value ?? string.Empty);
    }

    /// <inheritdoc />
    public override string ToString()
    {
        return Value ?? string.Empty;
    }

    public static bool operator ==(PlatformMessageBusStoreKey left, PlatformMessageBusStoreKey right)
    {
        return left.Equals(right);
    }

    public static bool operator !=(PlatformMessageBusStoreKey left, PlatformMessageBusStoreKey right)
    {
        return !left.Equals(right);
    }
}
