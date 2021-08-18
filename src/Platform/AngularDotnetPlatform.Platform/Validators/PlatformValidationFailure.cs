using System.Collections.Generic;
using System.Linq;
using FluentValidation.Results;

namespace AngularDotnetPlatform.Platform.Validators
{
    public class PlatformValidationFailure : ValidationFailure
    {
        public PlatformValidationFailure(ValidationFailure failure) : base(failure.PropertyName, failure.ErrorMessage, failure.AttemptedValue)
        {
            ErrorCode = failure.ErrorCode;
            CustomState = failure.CustomState;
            FormattedMessagePlaceholderValues = failure.FormattedMessagePlaceholderValues;
            Severity = failure.Severity;
        }

        public PlatformValidationFailure(string propertyName, string errorMessage) : base(propertyName, errorMessage)
        {
        }

        public PlatformValidationFailure(string propertyName, string errorMessage, object attemptedValue) : base(propertyName, errorMessage, attemptedValue)
        {
        }

        public static implicit operator string(PlatformValidationFailure validationError)
        {
            return validationError.ToString();
        }

        public static implicit operator PlatformValidationFailure(string msg)
        {
            return Create(msg);
        }

        public static PlatformValidationFailure Create(string message, Dictionary<string, string> messageParams = null)
        {
            return Create(message, (string)null, messageParams);
        }

        public static PlatformValidationFailure Create(string message, string propName, Dictionary<string, string> messageParams = null)
        {
            return new PlatformValidationFailure(propName, message)
            {
                FormattedMessagePlaceholderValues = messageParams?.ToDictionary(p => p.Key, p => (object)p.Value)
            };
        }
    }
}
