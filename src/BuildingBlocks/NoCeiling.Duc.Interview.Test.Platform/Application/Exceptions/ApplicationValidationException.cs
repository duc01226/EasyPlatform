using FluentValidation.Results;

namespace NoCeiling.Duc.Interview.Test.Platform.Application.Exceptions
{
    public class PlatformApplicationValidationException : PlatformApplicationException
    {
        public PlatformApplicationValidationException(ValidationResult validationResult) : base(validationResult.ToString())
        {
            ValidationResult = validationResult;
        }

        public ValidationResult ValidationResult { get; set; }
    }
}
