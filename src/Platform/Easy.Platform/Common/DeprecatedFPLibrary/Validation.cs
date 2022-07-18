using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Utils;

namespace Easy.Platform.Common.DeprecatedFPLibrary
{
    public static partial class F
    {
        public static Validation<T> Valid<T>(T value = default)
        {
            return new Validation<T>(value);
        }

        public static Validation<T> ValidIfNotNull<T>(T value, params Error[] errors)
        {
            return value != null ? new Validation<T>(value) : new Validation.Invalid(errors);
        }

        public static Validation<T> ValidIf<T>(bool condition, Func<T> valid, params Error[] errors)
        {
            return condition ? new Validation<T>(valid()) : new Validation.Invalid(errors);
        }

        public static Validation<T> ValidIf<T>(bool condition, Func<T> valid, List<Error> errors)
        {
            return condition ? new Validation<T>(valid()) : new Validation.Invalid(errors);
        }

        public static Validation<ValueTuple> ValidIf(bool condition, params Error[] errors)
        {
            return condition ? new Validation<ValueTuple>(Unit()) : new Validation.Invalid(errors);
        }

        public static Validation<ValueTuple> InvalidIf(bool condition, params Error[] errors)
        {
            return condition ? new Validation.Invalid(errors) : new Validation<ValueTuple>(Unit());
        }

        public static Validation<ValueTuple> InvalidIf(Func<bool> condition, params Error[] errors)
        {
            return condition() ? new Validation.Invalid(errors) : new Validation<ValueTuple>(Unit());
        }

        public static Validation<IEnumerable<TValidation>> HarvestErrors<TValidation>(IEnumerable<Validation<TValidation>> validations)
        {
            var validationsList = validations.ToList();
            var errors = validationsList.Bind(p => p.Errors()).ToList();
            var items = validationsList.Bind(p => p.AsEnumerable());
            return errors.IsEmpty() ? Valid(items) : Invalid(errors);
        }

        public static Validation<IEnumerable<TValidation>> HarvestErrors<TValidation>(params Validation<TValidation>[] validations)
        {
            return HarvestErrors(validations.AsEnumerable());
        }

        public static Validation<ValueTuple> FailFast<TValidation>(params Validation<TValidation>[] validations)
        {
            return validations.Aggregate(Valid(Unit()), (acc, validator) => acc.Bind(p => validator.Map(p1 => Unit())));
        }

        public static Validation<ValueTuple> FailFast<TValidation>(IEnumerable<Func<Validation<TValidation>>> validations)
        {
            return validations.Aggregate(Valid(Unit()), (acc, validator) => acc.Bind(p => validator().Map(p1 => Unit())));
        }

        public static Validation<ValueTuple> FailFast<TValidation>(params Func<Validation<TValidation>>[] validations)
        {
            return FailFast(validations.AsEnumerable());
        }

        // create a Validation in the Invalid state
        public static Validation.Invalid Invalid(params Error[] errors)
        {
            return new Validation.Invalid(errors);
        }

        public static Validation<TR> Invalid<TR>(params Error[] errors)
        {
            return new Validation.Invalid(errors);
        }

        public static Validation.Invalid Invalid(IEnumerable<Error> errors)
        {
            return new Validation.Invalid(errors);
        }

        public static Validation<TR> Invalid<TR>(List<Error> errors)
        {
            return new Validation.Invalid(errors);
        }
    }

    public static class Validation
    {
        public struct Invalid
        {
            internal List<Error> Errors;
            public Invalid(IEnumerable<Error> errors)
            {
                Errors = errors.ToList();
            }
        }

        public static T GetOrElse<T>(this Validation<T> opt, T defaultValue)
        {
            return opt.Match(
                (errs) => defaultValue,
                (t) => t);
        }

        public static T GetOrElse<T>(this Validation<T> opt, Func<T> fallback)
        {
            return opt.Match(
                (errs) => fallback(),
                (t) => t);
        }

        public static List<Error> Errors<T>(this Validation<T> opt)
        {
            return opt.Match(errors => errors, _ => F.List<Error>());
        }

        public static Validation<TR> Apply<T, TR>(this Validation<Func<T, TR>> valF, Validation<T> valT)
        {
            return valF.Match(
                valid: (f) => valT.Match(
                    valid: (t) => F.Valid(f(t)),
                    invalid: (err) => F.Invalid(err)),
                invalid: (errF) => valT.Match(
                    valid: (_) => F.Invalid(errF),
                    invalid: (errT) => F.Invalid(errF.Concat(errT))));
        }

        public static Validation<Func<T2, TR>> Apply<T1, T2, TR>(
            this Validation<Func<T1, T2, TR>> @this, Validation<T1> arg)
        {
            return Apply(@this.Map(F.Curry), arg);
        }

        public static Validation<Func<T2, T3, TR>> Apply<T1, T2, T3, TR>(
            this Validation<Func<T1, T2, T3, TR>> @this, Validation<T1> arg)
        {
            return Apply(@this.Map(F.CurryFirst), arg);
        }

        public static Validation<TRr> Map<TR, TRr>(
            this Validation<TR> @this, Func<TR, TRr> f)
        {
            return @this.IsValid
                ? F.Valid(f(@this.Value))
                : F.Invalid(@this.Errors);
        }

        public static Validation<T> MapErrors<T>(
            this Validation<T> @this, Func<List<Error>, List<Error>> fMapErrors)
        {
            return @this.IsValid
                ? @this
                : F.Invalid(fMapErrors(@this.Errors));
        }

        public static Validation<T> MapErrors<T>(
            this Validation<T> @this, Func<List<Error>, IEnumerable<string>> fMapErrors)
        {
            return @this.IsValid
                ? @this
                : F.Invalid(fMapErrors(@this.Errors).Select(p => (Error)p));
        }

        public static Validation<Func<T2, TR>> Map<T1, T2, TR>(this Validation<T1> @this,
            Func<T1, T2, TR> func)
        {
            return @this.Map(func.Curry());
        }

        public static Validation<ValueTuple> ForEach<TR>(
            this Validation<TR> @this, Action<TR> act)
        {
            return Map(@this, act.ToFunc());
        }

        public static Validation<T> Do<T>(
            this Validation<T> @this, Action<T> action)
        {
            @this.ForEach(action);
            return @this;
        }

        public static Validation<TR> Bind<T, TR>(
            this Validation<T> val, Func<T, Validation<TR>> f)
        {
            return val.Match(
                invalid: (err) => F.Invalid(err),
                valid: (r) => f(r));
        }

        public static Validation<TR> Bind<T, TR>(
            this Validation<T> val, Validation<TR> valNext)
        {
            return val.Match(
                invalid: (err) => F.Invalid(err),
                valid: (r) => valNext);
        }

        public static Validation<(T, TR)> BindCombine<T, TR>(
            this Validation<T> val, Func<T, Validation<TR>> f)
        {
            return val.Bind(t => f(t).Map(r => (t, r)));
        }

        // Task
        public static Task<Validation<TR>> BindAsync<T, TR>(
            this Task<Validation<T>> val, Func<T, Task<Validation<TR>>> f)
        {
            return val.Bind(valT => valT.TraverseBind(f));
        }

        public static Task<Validation<TR>> BindAsync<T, TR>(
            this Validation<T> val, Func<T, Task<Validation<TR>>> f)
        {
            return val.TraverseBind(f);
        }

        public static Task<Validation<TR>> BindAsync<T, TR>(
            this Task<Validation<T>> val, Func<T, Validation<TR>> f)
        {
            return val.Map(validationT => validationT.Bind(f));
        }

        public static Task<Validation<TR>> TraverseBind<T, TR>(this Validation<T> @this, Func<T, Task<Validation<TR>>> func)
        {
            return @this.Match(
                invalid: reasons => Util.Tasks.Async(F.Invalid<TR>(reasons)),
                valid: t => func(t));
        }

        public static Task<Validation<TR>> MapAsync<T, TR>(
            this Task<Validation<T>> val, Func<T, Task<TR>> f)
        {
            return val.Bind(valT => valT.TraverseMap(f));
        }

        public static Task<Validation<TR>> MapAsync<T, TR>(
            this Validation<T> val, Func<T, Task<TR>> f)
        {
            return val.TraverseMap(f);
        }

        public static Task<Validation<TR>> MapAsync<T, TR>(
            this Task<Validation<T>> val, Func<T, TR> f)
        {
            return val.Map(validationT => validationT.Map(f));
        }

        public static Task<Validation<TR>> TraverseMap<T, TR>(this Validation<T> @this, Func<T, Task<TR>> func)
        {
            return @this.Match(
                invalid: reasons => Util.Tasks.Async(F.Invalid<TR>(reasons)),
                valid: t => func(t).Map(_ => F.Valid(_)));
        }

        public static Task<Validation<T>> DoAsync<T, TAction>(
            this Task<Validation<T>> @this, Func<T, Task<TAction>> action)
        {
            return @this.MapAsync(t => action(t).Map(tAction => t));
        }

        public static Task<Validation<T>> DoAsync<T, TAction>(
            this Task<Validation<T>> @this, Func<T, TAction> action)
        {
            return @this.MapAsync(t => action(t).Pipe(tAction => t));
        }

        // LINQ

        public static Validation<TR> Select<T, TR>(this Validation<T> @this,
            Func<T, TR> map)
        {
            return @this.Map(map);
        }

        public static Validation<TRr> SelectMany<T, TR, TRr>(this Validation<T> @this,
            Func<T, Validation<TR>> bind, Func<T, TR, TRr> project)
        {
            return @this.Match(
                invalid: (err) => F.Invalid(err),
                valid: (t) => bind(t).Match(
                    invalid: (err) => F.Invalid(err),
                    valid: (r) => F.Valid(project(t, r))));
        }
    }

    public struct Validation<T>
    {
        public List<Error> Errors { get; }
        public T Value { get; }

        public bool IsValid { get; }

        // the Return function for Validation
        public static readonly Func<T, Validation<T>> Return = t => F.Valid(t);

        public static Validation<T> Fail(List<Error> errors)
        {
            return new Validation<T>(errors);
        }

        public static Validation<T> Fail(params Error[] errors)
        {
            return new Validation<T>(errors.ToList());
        }

        private Validation(IEnumerable<Error> errors)
        {
            IsValid = false;
            Errors = errors.ToList();
            Value = default;
        }

        internal Validation(T right)
        {
            IsValid = true;
            Value = right;
            Errors = new List<Error>();
        }

        public static implicit operator Validation<T>(Error error) => new Validation<T>(new[] { error });

        public static implicit operator Validation<T>(Validation.Invalid left) => new Validation<T>(left.Errors);

        public static implicit operator Validation<T>(T right) => F.Valid(right);

        public static implicit operator Validation<ValueTuple>(Validation<T> target) => target.Map(p => F.Unit());

        public static bool operator ==(Validation<T> left, Validation<T> right) => left.Equals(right);

        public static bool operator !=(Validation<T> left, Validation<T> right) => !(left == right);

        public TR Match<TR>(Func<List<Error>, TR> invalid, Func<T, TR> valid)
        {
            return IsValid ? valid(Value) : invalid(Errors);
        }

        public ValueTuple Match(Action<List<Error>> invalid, Action<T> valid)
        {
            return Match(invalid.ToFunc(), valid.ToFunc());
        }

        public Task<TR> MatchAsync<TR>(Func<List<Error>, TR> invalid, Func<T, Task<TR>> valid)
        {
            return Match(errors => Util.Tasks.Async(invalid(errors)), valid);
        }

        public Task<ValueTuple> MatchAsync(Action<List<Error>> invalid, Action<T> valid)
        {
            return Match(errors => Util.Tasks.Async(invalid.ToFunc()(errors)), value => Util.Tasks.Async(valid.ToFunc()(value)));
        }

        public IEnumerable<T> AsEnumerable()
        {
            if (IsValid)
            {
                yield return Value;
            }
        }

        public override string ToString()
        {
            return IsValid
                ? $"Valid({Value})"
                : $"Invalid([{string.Join(", ", Errors)}])";
        }

        public override bool Equals(object obj)
        {
            if (obj is Validation<T> validationObj)
            {
                return validationObj.ToString() == ToString();
            }

            return false;
        }

        public override int GetHashCode()
        {
            return ToString().GetHashCode();
        }
    }
}
