using AngularDotnetPlatform.Platform.Validators;
using FluentValidation.Results;

namespace AngularDotnetPlatform.Platform.Application.Exceptions
{
    public class PlatformApplicationValidationException : PlatformApplicationException
    {
        public PlatformApplicationValidationException(PlatformValidationResult validationResult) : base(validationResult.ToString())
        {
            ValidationResult = validationResult;
        }

        public PlatformValidationResult ValidationResult { get; set; }
    }
}
