using System.Linq.Expressions;

namespace Easy.Platform.Common.Validators;

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

    public T TargetItem { get; }

    public Expression<Func<T, bool>> FindOtherDuplicatedItemExpr { get; }

    public string ErrorMessage { get; }

    public PlatformValidationResult Validate(Func<Expression<Func<T, bool>>, bool> checkAnyDuplicatedItemFunction)
    {
        if (checkAnyDuplicatedItemFunction(FindOtherDuplicatedItemExpr))
            return Invalid("", ErrorMessage);
        return new PlatformValidationResult();
    }

    public async Task<PlatformValidationResult> Validate(
        Func<Expression<Func<T, bool>>, Task<bool>> checkAnyDuplicatedItemAsyncFunction)
    {
        if (await checkAnyDuplicatedItemAsyncFunction(FindOtherDuplicatedItemExpr))
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
