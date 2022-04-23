using Easy.Platform.Common.Validators;
using Easy.Platform.Common.Validators.Exceptions;

namespace Easy.Platform.Application.Exceptions
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
