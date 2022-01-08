using AngularDotnetPlatform.Platform.Common.Validators;
using AngularDotnetPlatform.Platform.Common.Validators.Exceptions;
using FluentValidation.Results;

namespace AngularDotnetPlatform.Platform.Application.Exceptions
{
    public class PlatformApplicationValidationException : PlatformApplicationException, IPlatformValidationException
    {
        public PlatformApplicationValidationException(PlatformValidationResult validationResult) : base(validationResult.ToString())
        {
            ValidationResult = validationResult;
        }

        public PlatformValidationResult ValidationResult { get; set; }
    }
}
