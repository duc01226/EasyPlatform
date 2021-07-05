using System.Collections.Generic;
using FluentValidation;
using FluentValidation.Results;

namespace NoCeiling.Duc.Interview.Test.Platform.Validators
{
    public class PlatformValidator<T> : AbstractValidator<T>
    {
        public static ValidationResult Invalid(string property, string errorMsg)
        {
            return new ValidationResult(new List<ValidationFailure>() { new ValidationFailure(property, errorMsg) });
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
    }
}
