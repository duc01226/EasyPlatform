using FluentValidation.Results;

namespace NoCeiling.Duc.Interview.Test.Platform.Domain.Exceptions
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
