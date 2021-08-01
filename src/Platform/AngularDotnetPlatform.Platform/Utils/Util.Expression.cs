using System;
using System.Linq.Expressions;
using System.Reflection;

namespace AngularDotnetPlatform.Platform.Utils
{
    public static partial class Util
    {
        public static class Expression
        {
            /// <summary>
            ///     Returns the name of the specified property of the specified type.
            /// </summary>
            /// <typeparam name="T">
            ///     The type the property is a member of.
            /// </typeparam>
            /// <typeparam name="TProp">The type of the property.</typeparam>
            /// <param name="property">
            ///     The property.
            /// </param>
            /// <returns>
            ///     The property name.
            /// </returns>
            public static string GetPropertyName<T, TProp>(Expression<Func<T, TProp>> property)
            {
                LambdaExpression lambda = property;
                MemberExpression memberExpression;

                if (lambda.Body is UnaryExpression unaryExpression)
                {
                    memberExpression = (MemberExpression)unaryExpression.Operand;
                }
                else
                {
                    memberExpression = (MemberExpression)lambda.Body;
                }

                return ((PropertyInfo)memberExpression.Member).Name;
            }
        }
    }
}
