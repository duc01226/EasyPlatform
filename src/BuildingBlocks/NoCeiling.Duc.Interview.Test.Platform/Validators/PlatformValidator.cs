using System.Linq;
using FluentValidation;

namespace NoCeiling.Duc.Interview.Test.Platform.Validators
{
    public abstract class PlatformValidator<T> : AbstractValidator<T>
    {
        public static PlatformValidator<T> MergeAllValidators(params PlatformValidator<T>[] validators)
        {
            if (!validators.Any())
                return null;
            return validators.Aggregate((PlatformValidator<T>)validators[0].MemberwiseClone(), (source, next) =>
            {
                source.Include(next);
                return source;
            });
        }
    }
}
