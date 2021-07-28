using FluentValidation.Results;

namespace AngularDotnetPlatform.Platform.Application.Exceptions
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
