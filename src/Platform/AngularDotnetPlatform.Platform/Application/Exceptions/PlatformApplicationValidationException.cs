using AngularDotnetPlatform.Platform.Common.Validators;
using AngularDotnetPlatform.Platform.Common.Validators.Exceptions;
using FluentValidation.Results;

namespace AngularDotnetPlatform.Platform.Application.Exceptions
{
    public class PlatformApplicationValidationException : PlatformApplicationException, IPlatformValidationException
    {
        public static PlatformApplicationValidationException Create<TValue>(
            PlatformValidationResult<TValue> validationResult)
        {
            return new PlatformApplicationValidationException(new PlatformValidationResult(validationResult.Errors));
        }

        public PlatformApplicationValidationException(PlatformValidationResult validationResult) : base(validationResult.ToString())
        {
            ValidationResult = validationResult;
        }

        public PlatformValidationResult<object> ValidationResult { get; set; }
    }

    public class PlatformApplicationValidationException<TValue> : PlatformApplicationException, IPlatformValidationException<TValue>
    {
        public PlatformApplicationValidationException(PlatformValidationResult<TValue> validationResult) : base(validationResult.ToString())
        {
            ValidationResult = validationResult;
        }

        public TValue Value { get; set; }

        public PlatformValidationResult<TValue> ValidationResult { get; set; }
    }
}
