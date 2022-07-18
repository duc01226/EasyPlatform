using System.Linq.Expressions;
using FluentValidation;

namespace Easy.Platform.Common.Validators
{
    public class PlatformExpressionValidator<T> : PlatformValidator<T>
    {
        public PlatformExpressionValidator(Expression<Func<T, bool>> isValidExpression, string errorMessage) : base()
        {
            IsValidExpression = isValidExpression;
            ErrorMessage = errorMessage;

            RuleFor(x => x).Must(isValidExpression.Compile()).WithMessage(errorMessage);
        }

        public Expression<Func<T, bool>> IsValidExpression { get; private set; }
        public string ErrorMessage { get; private set; }
    }
}
