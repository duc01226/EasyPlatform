using AngularDotnetPlatform.Platform.Common.Validators;
using AngularDotnetPlatform.Platform.Common.Validators.Exceptions;
using FluentValidation.Results;

namespace AngularDotnetPlatform.Platform.Domain.Exceptions
{
    public class PlatformDomainValidationException : PlatformDomainException, IPlatformValidationException
    {
        public PlatformDomainValidationException(PlatformValidationResult validationResult) : base(validationResult.ToString())
        {
            ValidationResult = validationResult;
        }

        public PlatformValidationResult<object> ValidationResult { get; set; }
    }
}
