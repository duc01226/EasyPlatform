using FluentValidation.Results;

namespace AngularDotnetPlatform.Platform.Domain.Exceptions
{
    public class PlatformDomainValidationException : PlatformDomainException
    {
        public PlatformDomainValidationException(ValidationResult validationResult) : base(validationResult.ToString())
        {
            ValidationResult = validationResult;
        }

        public ValidationResult ValidationResult { get; set; }
    }
}
