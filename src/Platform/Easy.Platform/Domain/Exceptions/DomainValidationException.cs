using Easy.Platform.Common.Validators;
using Easy.Platform.Common.Validators.Exceptions;

namespace Easy.Platform.Domain.Exceptions;

public class PlatformDomainValidationException : PlatformDomainException, IPlatformValidationException
{
    public PlatformDomainValidationException(PlatformValidationResult validationResult) : base(
        validationResult.ToString())
    {
        ValidationResult = validationResult;
    }

    public PlatformValidationResult<object> ValidationResult { get; set; }
}
