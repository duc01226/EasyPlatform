using Easy.Platform.Common.Validations;
using Easy.Platform.Common.Validations.Exceptions;

namespace Easy.Platform.Domain.Exceptions;

/// <summary>
/// Represents an exception that is thrown when a domain validation fails.
/// </summary>
public class PlatformDomainValidationException : PlatformDomainException, IPlatformValidationException
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformDomainValidationException"/> class.
    /// </summary>
    /// <param name="validationResult">The validation result that contains the validation errors.</param>
    public PlatformDomainValidationException(PlatformValidationResult validationResult)
        : base(validationResult.ToString())
    {
        ValidationResult = validationResult;
    }

    /// <summary>
    /// Gets or sets the validation result.
    /// </summary>
    public PlatformValidationResult ValidationResult { get; set; }
}
