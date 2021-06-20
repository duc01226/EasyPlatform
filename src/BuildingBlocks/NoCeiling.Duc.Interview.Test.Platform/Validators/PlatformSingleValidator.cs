using System;
using System.Linq.Expressions;
using FluentValidation;

namespace NoCeiling.Duc.Interview.Test.Platform.Validators
{
    public class PlatformSingleValidator<TTarget, TProperty> : PlatformValidator<TTarget>
    {
        public Expression<Func<TTarget, TProperty>> RuleForPropExpr { get; }

        protected PlatformSingleValidator(Expression<Func<TTarget, TProperty>> ruleForPropExpr)
        {
            this.RuleForPropExpr = ruleForPropExpr;
        }

        public static PlatformSingleValidator<TTarget, TProperty> New(
            Expression<Func<TTarget, TProperty>> ruleForPropExpr,
            Action<IRuleBuilderInitial<TTarget, TProperty>> ruleBuilder)
        {
            var validator = new PlatformSingleValidator<TTarget, TProperty>(ruleForPropExpr);
            ruleBuilder(validator.RuleFor(ruleForPropExpr));
            return validator;
        }
    }
}
