using System.Linq.Expressions;
using FluentValidation;

namespace Easy.Platform.Common.Validators;

public class PlatformExpressionValidator<T> : PlatformValidator<T>
{
    public PlatformExpressionValidator(Expression<Func<T, bool>> must, string errorMessage)
    {
        MustExpr = must;
        ErrorMessage = errorMessage;

        RuleFor(x => x).Must(must.Compile()).WithMessage(errorMessage);
    }

    public Expression<Func<T, bool>> MustExpr { get; }
    public string ErrorMessage { get; }
}
