using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentValidation.Results;

namespace AngularDotnetPlatform.Platform.Common.Validators
{
    public class PlatformValidationResult<TValue> : ValidationResult
    {
        public PlatformValidationResult() : base()
        {
        }

        public PlatformValidationResult(TValue value, List<PlatformValidationFailure> failures) : base(failures ?? new List<PlatformValidationFailure>())
        {
            Errors = failures ?? new List<PlatformValidationFailure>();
            Value = value;
        }

        public new List<PlatformValidationFailure> Errors { get; } = new List<PlatformValidationFailure>();
        public TValue Value { get; set; }

        public static implicit operator TValue(PlatformValidationResult<TValue> validation)
        {
            return validation.Value;
        }

        public static implicit operator bool(PlatformValidationResult<TValue> validation)
        {
            return validation.IsValid;
        }

        public static implicit operator string(PlatformValidationResult<TValue> validation)
        {
            return validation.ToString();
        }

        public static implicit operator PlatformValidationResult<TValue>((TValue value, string error) invalidValidationInfo)
        {
            return Invalid(value: invalidValidationInfo.value, invalidValidationInfo.error);
        }

        public static implicit operator PlatformValidationResult<TValue>((TValue value, List<string> errors) invalidValidationInfo)
        {
            return invalidValidationInfo.errors?.Any() == true
                ? Invalid(value: invalidValidationInfo.value, invalidValidationInfo.errors.Select(p => (PlatformValidationFailure)p).ToArray())
                : Valid();
        }

        public static implicit operator PlatformValidationResult<TValue>((TValue value, List<PlatformValidationFailure> errors) invalidValidationInfo)
        {
            return invalidValidationInfo.errors?.Any() == true
                ? Invalid(value: invalidValidationInfo.value, invalidValidationInfo.errors.Select(p => p).ToArray())
                : Valid();
        }

        /// <summary>
        /// Return a valid validation result.
        /// </summary>
        /// <returns>A valid validation result.</returns>
        public static PlatformValidationResult<TValue> Valid(TValue value = default)
        {
            return new PlatformValidationResult<TValue>(value, null);
        }

        /// <summary>
        /// Return a invalid validation result.
        /// </summary>
        /// <param name="value">The validation target object.</param>
        /// <param name="errors">The validation errors.</param>
        /// <returns>A invalid validation result.</returns>
        public static PlatformValidationResult<TValue> Invalid(
            TValue value,
            params PlatformValidationFailure[] errors)
        {
            return errors.Any()
                ? new PlatformValidationResult<TValue>(value, errors.ToList())
                : new PlatformValidationResult<TValue>(value, new List<PlatformValidationFailure> { "Invalid!" });
        }

        /// <summary>
        /// Return a valid validation result if the condition is true, otherwise return a invalid validation with errors.
        /// </summary>
        /// <param name="value">The validation target object.</param>
        /// <param name="validCondition">The valid condition.</param>
        /// <param name="errors">The errors if the valid condition is false.</param>
        /// <returns>A validation result.</returns>
        public static PlatformValidationResult<TValue> ValidIf(
            TValue value,
            bool validCondition,
            params PlatformValidationFailure[] errors)
        {
            return validCondition ? Valid(value) : Invalid(value, errors);
        }

        /// <inheritdoc cref="ValidIf(TValue,bool,AngularDotnetPlatform.Platform.Common.Validators.PlatformValidationFailure[])"/>
        public static PlatformValidationResult<TValue> ValidIf(
            TValue value,
            Func<bool> validConditionFunc,
            params PlatformValidationFailure[] errors)
        {
            return ValidIf(value, validConditionFunc(), errors);
        }

        public static PlatformValidationResult<TValue> FailFast(
            params Func<PlatformValidationResult<TValue>>[] validations)
        {
            return validations.Aggregate(Valid(), (acc, validator) => acc.Bind(value => validator()));
        }

        public static PlatformValidationResult<TValue> FailFast(
            params Func<TValue, PlatformValidationResult<TValue>>[] validations)
        {
            return validations.Aggregate(Valid(), (acc, validator) => acc.Bind(validator));
        }

        public static PlatformValidationResult<TValue> FailFast(
            params PlatformValidationResult<TValue>[] validations)
        {
            return validations.Aggregate(Valid(), (acc, validator) => acc.Bind(value => validator));
        }

        public static PlatformValidationResult<TValue> HarvestErrors(
            params PlatformValidationResult<TValue>[] validations)
        {
            var errors = validations.SelectMany(p => p.Errors).ToArray();
            return !errors.Any() ? Valid() : Invalid(validations.Last().Value, errors);
        }

        public static PlatformValidationResult<TValue> HarvestErrors(
            params Func<PlatformValidationResult<TValue>>[] validations)
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

        public PlatformValidationResult<TBindValidationTarget> Bind<TBindValidationTarget>(
            Func<TValue, PlatformValidationResult<TBindValidationTarget>> f)
        {
            return Match(
                valid: value => f(value),
                invalid: err => PlatformValidationResult<TBindValidationTarget>.Invalid(value: f(Value).Value, err.ToArray()));
        }

        public PlatformValidationResult<TMatchValidationTarget> Match<TMatchValidationTarget>(
            Func<TValue, PlatformValidationResult<TMatchValidationTarget>> valid,
            Func<IEnumerable<PlatformValidationFailure>, PlatformValidationResult<TMatchValidationTarget>> invalid)
        {
            return IsValid ? valid(Value) : invalid(Errors);
        }

        public PlatformValidationResult<TValue> And(PlatformValidationResult<TValue> nextValidation)
        {
            return !IsValid ? this : nextValidation;
        }

        public PlatformValidationResult<TValue> And(Func<TValue, bool> validCondition, params PlatformValidationFailure[] errors)
        {
            return !IsValid ? this : ValidIf(value: Value, validCondition(Value), errors);
        }

        public PlatformValidationResult<TValue> And(Func<TValue, PlatformValidationResult<TValue>> nextValidation)
        {
            return !IsValid ? this : nextValidation(Value);
        }

        public PlatformValidationResult<TValue> And(Func<PlatformValidationResult<TValue>> nextValidation)
        {
            return !IsValid ? this : nextValidation();
        }

        public PlatformValidationResult<TValue> Or(PlatformValidationResult<TValue> nextValidation)
        {
            return IsValid ? this : nextValidation;
        }

        public PlatformValidationResult<TValue> Or(Func<PlatformValidationResult<TValue>> nextValidation)
        {
            return IsValid ? this : nextValidation();
        }

        public async Task<PlatformValidationResult<TValue>> AndAsync(Task<PlatformValidationResult<TValue>> nextValidation)
        {
            return !IsValid ? this : await nextValidation;
        }

        public async Task<PlatformValidationResult<TValue>> AndAsync(Func<TValue, Task<PlatformValidationResult<TValue>>> nextValidation)
        {
            return !IsValid ? this : await nextValidation(Value);
        }

        public async Task<PlatformValidationResult<TValue>> OrAsync(Task<PlatformValidationResult<TValue>> nextValidation)
        {
            return IsValid ? this : await nextValidation;
        }

        public async Task<PlatformValidationResult<TValue>> OrAsync(Func<Task<PlatformValidationResult<TValue>>> nextValidation)
        {
            return IsValid ? this : await nextValidation();
        }

        /// <summary>
        /// Throw exception provided from <see cref="exceptionProviderIfNotValid"/>
        /// </summary>
        public void EnsureValid(Func<PlatformValidationResult<TValue>, Exception> exceptionProviderIfNotValid)
        {
            if (!IsValid)
            {
                throw exceptionProviderIfNotValid(this);
            }
        }

        public PlatformValidationResult<T> Map<T>(Func<TValue, T> mapFunc)
        {
            return new PlatformValidationResult<T>(mapFunc(Value), Errors);
        }
    }

    public class PlatformValidationResult : PlatformValidationResult<object>
    {
        public PlatformValidationResult() : base()
        {
        }

        public PlatformValidationResult(List<PlatformValidationFailure> failures) : base(null, failures ?? new List<PlatformValidationFailure>())
        {
        }

        public PlatformValidationResult(PlatformValidationResult<object> validation) : base(null, validation.Errors)
        {
        }

        public static implicit operator PlatformValidationResult(string error)
        {
            return Invalid(error);
        }

        public static implicit operator PlatformValidationResult(List<string> errors)
        {
            return errors?.Any() == true
                ? Invalid(errors.Select(p => (PlatformValidationFailure)p).ToArray())
                : Valid();
        }

        public static implicit operator PlatformValidationResult(List<PlatformValidationFailure> errors)
        {
            return errors?.Any() == true
                ? Invalid(errors.Select(p => p).ToArray())
                : Valid();
        }

        /// <summary>
        /// Return a valid validation result if the condition is true, otherwise return a invalid validation with errors.
        /// </summary>
        /// <param name="validCondition">The valid condition.</param>
        /// <param name="errors">The errors if the valid condition is false.</param>
        /// <returns>A validation result.</returns>
        public static PlatformValidationResult ValidIf(
            bool validCondition,
            params PlatformValidationFailure[] errors)
        {
            return validCondition ? Valid() : Invalid(errors);
        }

        /// <inheritdoc cref="ValidIf(bool,AngularDotnetPlatform.Platform.Common.Validators.PlatformValidationFailure[])"/>
        public static PlatformValidationResult ValidIf(
            Func<bool> validConditionFunc,
            params PlatformValidationFailure[] errors)
        {
            return ValidIf(validConditionFunc(), errors);
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
            return new PlatformValidationResult(errors.ToList());
        }

        public static PlatformValidationResult FailFast(
            params Func<PlatformValidationResult>[] validations)
        {
            return validations.Aggregate(Valid(), (acc, validator) => acc.Bind(validator));
        }

        public static PlatformValidationResult FailFast(
            params PlatformValidationResult[] validations)
        {
            return validations.Aggregate(Valid(), (acc, validator) => acc.Bind(() => validator));
        }

        public static PlatformValidationResult HarvestErrors(
            params PlatformValidationResult[] validations)
        {
            var errors = validations.SelectMany(p => p.Errors).ToArray();
            return !errors.Any() ? Valid() : Invalid(errors);
        }

        public static PlatformValidationResult HarvestErrors(
            params Func<PlatformValidationResult>[] validations)
        {
            return HarvestErrors(validations.Select(p => p()).ToArray());
        }

        public PlatformValidationResult Bind(
            Func<PlatformValidationResult> f)
        {
            return Match(
                invalid: err => Invalid(err.ToArray()),
                valid: () => f());
        }

        public PlatformValidationResult Match(
            Func<IEnumerable<PlatformValidationFailure>, PlatformValidationResult> invalid,
            Func<PlatformValidationResult> valid)
        {
            return IsValid ? valid() : invalid(Errors);
        }

        public PlatformValidationResult And(PlatformValidationResult nextValidation)
        {
            return !IsValid ? this : nextValidation;
        }

        public new PlatformValidationResult And(Func<bool> validCondition, params PlatformValidationFailure[] errors)
        {
            return !IsValid ? this : ValidIf(validCondition, errors);
        }

        public PlatformValidationResult And(Func<PlatformValidationResult> nextValidation)
        {
            return !IsValid ? this : nextValidation();
        }

        public PlatformValidationResult Or(PlatformValidationResult nextValidation)
        {
            return IsValid ? this : nextValidation;
        }

        public PlatformValidationResult Or(Func<PlatformValidationResult> nextValidation)
        {
            return IsValid ? this : nextValidation();
        }

        public async Task<PlatformValidationResult> AndAsync(Task<PlatformValidationResult> nextValidation)
        {
            return !IsValid ? this : await nextValidation;
        }

        public async Task<PlatformValidationResult> AndAsync(Func<Task<PlatformValidationResult>> nextValidation)
        {
            return !IsValid ? this : await nextValidation();
        }

        public async Task<PlatformValidationResult> OrAsync(Task<PlatformValidationResult> nextValidation)
        {
            return IsValid ? this : await nextValidation;
        }

        public async Task<PlatformValidationResult> OrAsync(Func<Task<PlatformValidationResult>> nextValidation)
        {
            return IsValid ? this : await nextValidation();
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
