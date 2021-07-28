using System;
using System.Linq.Expressions;
using FluentValidation;

namespace AngularDotnetPlatform.Platform.Validators
{
    public class PlatformSingleValidator<TTarget, TProperty> : PlatformValidator<TTarget>
    {
        public PlatformSingleValidator(
            Expression<Func<TTarget, TProperty>> ruleForPropExpr,
            Action<IRuleBuilderInitial<TTarget, TProperty>> ruleBuilder)
        {
            RuleForPropExpr = ruleForPropExpr;
            ruleBuilder(RuleFor(RuleForPropExpr));
        }

        public Expression<Func<TTarget, TProperty>> RuleForPropExpr { get; }
    }
}
