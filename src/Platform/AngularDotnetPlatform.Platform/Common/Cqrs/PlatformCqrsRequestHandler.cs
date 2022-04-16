using System;
using AngularDotnetPlatform.Platform.Common.Validators;

namespace AngularDotnetPlatform.Platform.Common.Cqrs
{
    public abstract class PlatformCqrsRequestHandler<TRequest> where TRequest : IPlatformCqrsRequest
    {
        public PlatformCqrsRequestHandler()
        {
        }

        protected void EnsureValid(
            PlatformValidationResult[] validateResults,
            Func<PlatformValidationResult, Exception> exceptionProviderIfNotValid)
        {
            var finalValidationResult = PlatformValidationResult.HarvestErrors(validateResults);
            finalValidationResult.EnsureValid(exceptionProviderIfNotValid);
        }

        protected void EnsureValid(
            PlatformValidationResult validateResult,
            Func<PlatformValidationResult, Exception> exceptionProviderIfNotValid)
        {
            EnsureValid(new PlatformValidationResult[] { validateResult }, exceptionProviderIfNotValid);
        }

        protected void EnsureValid<TValue>(
            PlatformValidationResult<TValue>[] validateResults,
            Func<PlatformValidationResult<TValue>, Exception> exceptionProviderIfNotValid)
        {
            var finalValidationResult = PlatformValidationResult<TValue>.HarvestErrors(validateResults);
            finalValidationResult.EnsureValid(exceptionProviderIfNotValid);
        }

        protected void EnsureValid<TValue>(
            PlatformValidationResult<TValue> validateResult,
            Func<PlatformValidationResult<TValue>, Exception> exceptionProviderIfNotValid)
        {
            EnsureValid(new PlatformValidationResult<TValue>[] { validateResult }, exceptionProviderIfNotValid);
        }

        protected void EnsureNotNull(object target, string errorMessage, Func<PlatformValidationResult, Exception> exceptionProviderIfNotValid)
        {
            EnsureValid(PlatformValidationResult.ValidIf(() => target != null, errorMessage), exceptionProviderIfNotValid);
        }
    }
}
