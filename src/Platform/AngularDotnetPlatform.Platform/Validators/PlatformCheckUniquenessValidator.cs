using System;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;
using FluentValidation.Results;

namespace AngularDotnetPlatform.Platform.Validators
{
    public class PlatformCheckUniquenessValidator<T>
    {
        public PlatformCheckUniquenessValidator(
            T targetItem,
            Expression<Func<T, bool>> findOtherDuplicatedItemExpression,
            string errorMessage)
        {
            TargetItem = targetItem;
            FindOtherDuplicatedItemExpression = findOtherDuplicatedItemExpression;
            ErrorMessage = errorMessage;
        }

        public T TargetItem { get; private set; }

        public Expression<Func<T, bool>> FindOtherDuplicatedItemExpression { get; private set; }

        public string ErrorMessage { get; private set; }

        public ValidationResult Validate(Func<Expression<Func<T, bool>>, bool> checkAnyDuplicatedFn)
        {
            if (checkAnyDuplicatedFn(FindOtherDuplicatedItemExpression))
                return PlatformValidator<T>.Invalid("", ErrorMessage);
            return new ValidationResult();
        }

        public async Task<ValidationResult> Validate(Func<Expression<Func<T, bool>>, Task<bool>> checkAnyDuplicatedFn)
        {
            if (await checkAnyDuplicatedFn(FindOtherDuplicatedItemExpression))
                return PlatformValidator<T>.Invalid("", ErrorMessage);
            return new ValidationResult();
        }

        public ValidationResult Validate(IQueryable<T> checkUniquenessScope)
        {
            if (checkUniquenessScope.Any(FindOtherDuplicatedItemExpression))
                return PlatformValidator<T>.Invalid("", ErrorMessage);
            return new ValidationResult();
        }
    }
}
