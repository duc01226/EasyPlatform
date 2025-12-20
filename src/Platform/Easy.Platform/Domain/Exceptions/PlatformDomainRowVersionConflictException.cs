namespace Easy.Platform.Domain.Exceptions;

/// <summary>
/// Represents an exception that is thrown when a row version conflict occurs in the domain.
/// This typically happens when trying to update an entity with an outdated row version.
/// </summary>
public class PlatformDomainRowVersionConflictException : PlatformDomainException
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformDomainRowVersionConflictException"/> class.
    /// </summary>
    /// <param name="errorMsg">The error message that explains the reason for the exception.</param>
    /// <param name="innerException">The exception that is the cause of the current exception, or a null reference if no inner exception is specified.</param>
    public PlatformDomainRowVersionConflictException(string errorMsg, Exception innerException = null)
        : base(errorMsg, innerException) { }
}
