namespace Easy.Platform.Domain.Exceptions;

/// <summary>
/// Represents errors that occur during domain logic execution.
/// </summary>
public class PlatformDomainException : Exception
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformDomainException"/> class.
    /// </summary>
    /// <param name="errorMsg">The error message that explains the reason for the exception.</param>
    /// <param name="innerException">The exception that is the cause of the current exception, or a null reference if no inner exception is specified.</param>
    public PlatformDomainException(string errorMsg, Exception innerException = null)
        : base(errorMsg, innerException) { }
}
