using System;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;
using FluentValidation.Results;

namespace AngularDotnetPlatform.Platform.Common.Validators
{
    public class PlatformCheckUniquenessValidator<T> : PlatformValidator<T>
    {
        public PlatformCheckUniquenessValidator(
            T targetItem,
            Expression<Func<T, bool>> findOtherDuplicatedItemExpr,
            string errorMessage)
        {
            TargetItem = targetItem;
            FindOtherDuplicatedItemExpr = findOtherDuplicatedItemExpr;
            ErrorMessage = errorMessage;
        }

        public T TargetItem { get; private set; }

        public Expression<Func<T, bool>> FindOtherDuplicatedItemExpr { get; private set; }

        public string ErrorMessage { get; private set; }

        public PlatformValidationResult Validate(Func<Expression<Func<T, bool>>, bool> checkAnyDuplicatedFn)
        {
            if (checkAnyDuplicatedFn(FindOtherDuplicatedItemExpr))
                return Invalid("", ErrorMessage);
            return new PlatformValidationResult();
        }

        public async Task<PlatformValidationResult> Validate(Func<Expression<Func<T, bool>>, Task<bool>> checkAnyDuplicatedFn)
        {
            if (await checkAnyDuplicatedFn(FindOtherDuplicatedItemExpr))
                return Invalid("", ErrorMessage);
            return new PlatformValidationResult();
        }

        public PlatformValidationResult Validate(IQueryable<T> checkUniquenessScope)
        {
            if (checkUniquenessScope.Any(FindOtherDuplicatedItemExpr))
                return Invalid("", ErrorMessage);
            return new PlatformValidationResult();
        }
    }
}
