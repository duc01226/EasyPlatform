using System.Collections.Generic;
using System.Linq;
using FluentValidation;

namespace AngularDotnetPlatform.Platform.Common.Validators
{
    public class PlatformValidator<T> : AbstractValidator<T>
    {
        public static PlatformValidationResult Invalid(string property, string errorMsg)
        {
            return new PlatformValidationResult(new List<PlatformValidationFailure>() { new PlatformValidationFailure(property, errorMsg) });
        }

        public static PlatformValidationResult Valid()
        {
            return new PlatformValidationResult(new List<PlatformValidationFailure>() { });
        }

        public static PlatformValidator<T> Create()
        {
            return new PlatformValidator<T>();
        }

        public static PlatformValidator<T> Create(params PlatformValidator<T>[] includeValidators)
        {
            var result = new PlatformValidator<T>();

            foreach (var platformValidator in includeValidators)
            {
                result.Include(platformValidator);
            }

            return result;
        }

        public static PlatformValidator<T> Create(params PlatformSingleValidator<T, object>[] includeValidators)
        {
            return Create(includeValidators.Select(p => (PlatformValidator<T>)p).ToArray());
        }

        public override PlatformValidationResult Validate(ValidationContext<T> context)
        {
            var validationResult = base.Validate(context);
            return new PlatformValidationResult(validationResult.Errors.Select(p => new PlatformValidationFailure(p)).ToList());
        }

        public new PlatformValidationResult Validate(T instance)
        {
            return new PlatformValidationResult(
                base.Validate(instance).Errors.Select(p => new PlatformValidationFailure(p)).ToList());
        }
    }
}
