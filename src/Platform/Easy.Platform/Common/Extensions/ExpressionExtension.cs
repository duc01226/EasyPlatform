using System.Linq.Expressions;

namespace Easy.Platform.Common.Extensions
{
    public static class ExpressionExtension
    {
        public static Expression<Func<T, bool>> AndAlsoIf<T>(
            this Expression<Func<T, bool>> expression,
            bool andIfTrue,
            Expression<Func<T, bool>> andExpression)
        {
            if (andIfTrue)
                return expression.AndAlso(andExpression);

            return expression;
        }

        public static Expression<Func<T, bool>> OrIf<T>(
            this Expression<Func<T, bool>> expression,
            bool orIfTrue,
            Expression<Func<T, bool>> andExpression)
        {
            if (orIfTrue)
                return expression.Or(andExpression);

            return expression;
        }
    }
}
