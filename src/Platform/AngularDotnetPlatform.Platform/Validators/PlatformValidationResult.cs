using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentValidation.Results;

namespace AngularDotnetPlatform.Platform.Validators
{
    public class PlatformValidationResult : ValidationResult
    {
        public PlatformValidationResult() : base()
        {
        }

        public PlatformValidationResult(List<PlatformValidationFailure> failures) : base(failures)
        {
            Errors = failures ?? new List<PlatformValidationFailure>();
        }

        public new List<PlatformValidationFailure> Errors { get; } = new List<PlatformValidationFailure>();

        public static implicit operator bool(PlatformValidationResult validation)
        {
            return validation.IsValid;
        }

        public static implicit operator string(PlatformValidationResult validation)
        {
            return validation.ToString();
        }

        public static implicit operator PlatformValidationResult(string error)
        {
            return Invalid(error);
        }

        public static implicit operator PlatformValidationResult(List<string> errors)
        {
            return Invalid(errors.Select(p => (PlatformValidationFailure)p).ToArray());
        }

        public static implicit operator PlatformValidationResult(List<PlatformValidationFailure> errors)
        {
            return Invalid(errors.Select(p => p).ToArray());
        }

        /// <summary>
        /// Return a valid validation result.
        /// </summary>
        /// <returns>A valid validation result.</returns>
        public static PlatformValidationResult Valid()
        {
            return new PlatformValidationResult();
        }

        /// <summary>
        /// Return a invalid validation result.
        /// </summary>
        /// <param name="errors">The validation errors.</param>
        /// <returns>A invalid validation result.</returns>
        public static PlatformValidationResult Invalid(params PlatformValidationFailure[] errors)
        {
            return errors.Any()
                ? new PlatformValidationResult(errors.ToList())
                : new PlatformValidationResult(new List<PlatformValidationFailure> { "Invalid!" });
        }

        /// <summary>
        /// Return a valid validation result if the condition is true, otherwise return a invalid validation with errors.
        /// </summary>
        /// <param name="validCondition">The valid condition.</param>
        /// <param name="errors">The errors if the valid condition is false.</param>
        /// <returns>A validation result.</returns>
        public static PlatformValidationResult ValidIf(bool validCondition, params PlatformValidationFailure[] errors)
        {
            return validCondition ? Valid() : Invalid(errors);
        }

        /// <inheritdoc cref="ValidIf(bool,AngularDotnetPlatform.Platform.Validators.PlatformValidationFailure[])"/>
        public static PlatformValidationResult ValidIf(Func<bool> validConditionFunc, params PlatformValidationFailure[] errors)
        {
            return ValidIf(validConditionFunc(), errors);
        }

        public static PlatformValidationResult FailFast(params Func<PlatformValidationResult>[] validations)
        {
            return validations.Aggregate(Valid(), (acc, validator) => acc.Bind(validator));
        }

        public static PlatformValidationResult FailFast(params PlatformValidationResult[] validations)
        {
            return validations.Aggregate(Valid(), (acc, validator) => acc.Bind(() => validator));
        }

        public static PlatformValidationResult HarvestErrors(params PlatformValidationResult[] validations)
        {
            var errors = validations.SelectMany(p => p.Errors).ToArray();
            return !errors.Any() ? Valid() : Invalid(errors);
        }

        public static PlatformValidationResult HarvestErrors(params Func<PlatformValidationResult>[] validations)
        {
            return HarvestErrors(validations.Select(p => p()).ToArray());
        }

        public string ErrorsMsg()
        {
            return Errors?.Aggregate(
                string.Empty,
                (currentMsg, error) => $"{(currentMsg == string.Empty ? string.Empty : ". ")}{error}.");
        }

        public override string ToString()
        {
            return ErrorsMsg();
        }

        public PlatformValidationResult Bind(Func<PlatformValidationResult> f)
        {
            return Match(
                invalid: err => Invalid(err.ToArray()),
                valid: () => f());
        }

        public PlatformValidationResult Match(Func<IEnumerable<PlatformValidationFailure>, PlatformValidationResult> invalid, Func<PlatformValidationResult> valid)
        {
            return IsValid ? valid() : invalid(Errors);
        }

        public PlatformValidationResult And(PlatformValidationResult val)
        {
            return !IsValid ? this : val;
        }

        public PlatformValidationResult And(bool validCondition, params PlatformValidationFailure[] errors)
        {
            return !IsValid ? this : ValidIf(validCondition, errors);
        }

        public PlatformValidationResult And(Func<PlatformValidationResult> val)
        {
            return !IsValid ? this : val();
        }

        public PlatformValidationResult Or(PlatformValidationResult val)
        {
            return IsValid ? this : val;
        }

        public PlatformValidationResult Or(Func<PlatformValidationResult> val)
        {
            return IsValid ? this : val();
        }

        public async Task<PlatformValidationResult> And(Task<PlatformValidationResult> val)
        {
            return !IsValid ? this : await val;
        }

        public async Task<PlatformValidationResult> And(Func<Task<PlatformValidationResult>> val)
        {
            return !IsValid ? this : await val();
        }

        public async Task<PlatformValidationResult> Or(Task<PlatformValidationResult> val)
        {
            return IsValid ? this : await val;
        }

        public async Task<PlatformValidationResult> Or(Func<Task<PlatformValidationResult>> val)
        {
            return IsValid ? this : await val();
        }

        /// <summary>
        /// Throw exception provided from <see cref="exceptionProviderIfNotValid"/>
        /// </summary>
        public void EnsureValid(Func<PlatformValidationResult, Exception> exceptionProviderIfNotValid)
        {
            if (!IsValid)
            {
                throw exceptionProviderIfNotValid(this);
            }
        }
    }
}
