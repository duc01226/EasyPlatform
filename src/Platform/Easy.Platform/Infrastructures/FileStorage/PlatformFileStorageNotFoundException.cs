namespace Easy.Platform.Infrastructures.FileStorage;

/// <summary>
/// Thrown when a requested file/blob does not exist in the configured file storage.
/// <para>
/// This is the PROVIDER-NEUTRAL representation of "no such file", mirroring how the persistence layer exposes
/// <c>PlatformDomainUniqueConstraintViolationException</c> and <c>PlatformDomainRowVersionConflictException</c>.
/// Each storage provider recognises its own native not-found signal and re-throws THIS type before it escapes:
/// <list type="bullet">
/// <item><description>Azure Blob Storage — <c>RequestFailedException</c> with HTTP status 404 (<c>BlobNotFound</c>).</description></item>
/// </list>
/// </para>
/// <para>
/// <b>Why this type exists.</b> Callers consume <see cref="IPlatformFileStorageService" />, a storage-agnostic
/// abstraction — so they must be able to detect "the file is gone" without naming an Azure SDK type. The common
/// workaround, matching <c>ex.GetType().Name.Contains("RequestFailed")</c>, defeats the abstraction twice over: it
/// hard-codes one vendor's exception name into provider-agnostic code, AND it keeps compiling after a rename or a
/// provider swap while silently never matching again. Catch this type instead — stable across providers and
/// enforced by the compiler.
/// </para>
/// <para>The provider-native exception is preserved as <see cref="Exception.InnerException" /> for diagnostics.</para>
/// </summary>
public class PlatformFileStorageNotFoundException : Exception
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformFileStorageNotFoundException"/> class.
    /// </summary>
    /// <param name="errorMsg">The error message that explains the reason for the exception.</param>
    /// <param name="innerException">The provider-native exception that caused this failure.</param>
    public PlatformFileStorageNotFoundException(string errorMsg, Exception innerException = null)
        : base(errorMsg, innerException) { }
}
