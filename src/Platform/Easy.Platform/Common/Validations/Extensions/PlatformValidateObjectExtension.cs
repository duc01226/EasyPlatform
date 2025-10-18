#nullable enable
using System.Linq.Expressions;
using Easy.Platform.Common.Extensions;

namespace Easy.Platform.Common.Validations.Extensions;

public static class PlatformValidateObjectExtension
{
    #region Validate

    public static PlatformValidationResult<TValue> Validate<TValue>(
        this TValue value,
        Func<TValue, bool> must,
        params PlatformValidationError[] errorMsgs)
    {
        return PlatformValidationResult<TValue>.Validate(value, () => must(value), errorMsgs);
    }

    public static PlatformValidationResult<TValue> Validate<TValue>(
        this TValue value,
        Func<TValue, bool> must,
        PlatformValidationError errorMsg)
    {
        return PlatformValidationResult<TValue>.Validate(value, () => must(value), errorMsg);
    }

    public static PlatformValidationResult<TValue> Validate<TValue>(
        this TValue value,
        Func<TValue, bool> must,
        Func<TValue, PlatformValidationError> errorMsg)
    {
        return PlatformValidationResult<TValue>.Validate(value, () => must(value), errorMsg(value));
    }

    public static PlatformValidationResult<TValue> Validate<TValue>(
        this TValue value,
        Func<bool> must,
        params PlatformValidationError[] errorMsgs)
    {
        return PlatformValidationResult<TValue>.Validate(value, must, errorMsgs);
    }

    public static PlatformValidationResult<TValue> Validate<TValue>(
        this TValue value,
        bool must,
        params PlatformValidationError[] errorMsgs)
    {
        return Validate(value, () => must, errorMsgs);
    }


    public static PlatformValidationResult<TValue> Validate<TValue>(
        this TValue value,
        Func<TValue, bool> must,
        string expected,
        string? actual)
    {
        return PlatformValidationResult<TValue>.Validate(
            value,
            () => must(value),
            $"Expected: {expected}".PipeIf(_ => actual.IsNotNullOrEmpty(), s => s + $".{Environment.NewLine}Actual: {actual}"));
    }

    public static PlatformValidationResult<TValue> Validate<TValue>(
        this TValue value,
        Func<TValue, bool> must,
        Func<TValue, string> expected,
        string actual)
    {
        return PlatformValidationResult<TValue>.Validate(
            value,
            () => must(value),
            $"Expected: {expected}".PipeIf(_ => actual.IsNotNullOrEmpty(), s => s + $".{Environment.NewLine}Actual: {actual}"));
    }

    public static PlatformValidationResult<TValue> Validate<TValue>(
        this TValue value,
        Func<bool> must,
        string expected,
        string actual)
    {
        return PlatformValidationResult<TValue>.Validate(
            value,
            must,
            $"Expected: {expected}".PipeIf(_ => actual.IsNotNullOrEmpty(), s => s + $".{Environment.NewLine}Actual: {actual}"));
    }

    public static PlatformValidationResult<TValue> Validate<TValue>(
        this TValue value,
        bool must,
        string expected,
        string actual)
    {
        return Validate(
            value,
            () => must,
            $"Expected: {expected}".PipeIf(_ => actual.IsNotNullOrEmpty(), s => s + $".{Environment.NewLine}Actual: {actual}"));
    }

    #endregion

    #region ValidateNot

    public static PlatformValidationResult<TValue> ValidateNot<TValue>(
        this TValue value,
        Func<TValue, bool> mustNot,
        params PlatformValidationError[] errorMsgs)
    {
        return PlatformValidationResult<TValue>.ValidateNot(value, () => mustNot(value), errorMsgs);
    }

    public static PlatformValidationResult<TValue> ValidateNot<TValue>(
        this TValue value,
        Func<TValue, bool> mustNot,
        Func<TValue, PlatformValidationError> errorMsgs)
    {
        return PlatformValidationResult<TValue>.ValidateNot(value, () => mustNot(value), errorMsgs(value));
    }

    public static PlatformValidationResult<TValue> ValidateNot<TValue>(
        this TValue value,
        Func<bool> mustNot,
        params PlatformValidationError[] errorMsgs)
    {
        return PlatformValidationResult<TValue>.ValidateNot(value, mustNot, errorMsgs);
    }

    public static PlatformValidationResult<TValue> ValidateNot<TValue>(
        this TValue value,
        bool mustNot,
        params PlatformValidationError[] errorMsgs)
    {
        return ValidateNot(value, () => mustNot, errorMsgs);
    }


    public static PlatformValidationResult<TValue> ValidateNot<TValue>(
        this TValue value,
        Func<TValue, bool> mustNot,
        string expected,
        string? actual)
    {
        return PlatformValidationResult<TValue>.ValidateNot(
            value,
            () => mustNot(value),
            $"Expected: {expected}".PipeIf(_ => actual.IsNotNullOrEmpty(), s => s + $".{Environment.NewLine}Actual: {actual}"));
    }

    public static PlatformValidationResult<TValue> ValidateNot<TValue>(
        this TValue value,
        Func<TValue, bool> mustNot,
        Func<TValue, string> expected,
        string actual)
    {
        return PlatformValidationResult<TValue>.ValidateNot(
            value,
            () => mustNot(value),
            $"Expected: {expected}".PipeIf(_ => actual.IsNotNullOrEmpty(), s => s + $".{Environment.NewLine}Actual: {actual}"));
    }

    public static PlatformValidationResult<TValue> ValidateNot<TValue>(
        this TValue value,
        Func<bool> mustNot,
        string expected,
        string actual)
    {
        return PlatformValidationResult<TValue>.ValidateNot(
            value,
            mustNot,
            $"Expected: {expected}".PipeIf(_ => actual.IsNotNullOrEmpty(), s => s + $".{Environment.NewLine}Actual: {actual}"));
    }

    public static PlatformValidationResult<TValue> ValidateNot<TValue>(
        this TValue value,
        bool mustNot,
        string expected,
        string actual)
    {
        return ValidateNot(
            value,
            () => mustNot,
            $"Expected: {expected}".PipeIf(_ => actual.IsNotNullOrEmpty(), s => s + $".{Environment.NewLine}Actual: {actual}"));
    }

    #endregion

    #region ValidateFound

    public const string DefaultNotFoundMessage = "Not found";

    public static PlatformValidationResult<T> ValidateFound<T>(this T? obj, string errorMsg = DefaultNotFoundMessage)
    {
        return obj is not null
            ? PlatformValidationResult.Valid(obj)
            : PlatformValidationResult.Invalid(obj!, errorMsg == DefaultNotFoundMessage ? BuildDefaultNotFoundErrorMsg<T>(errorMsg) : errorMsg);
    }

    private static string BuildDefaultNotFoundErrorMsg<T>(string errorMsg)
    {
        if (typeof(T) == typeof(string) || typeof(T).IsPrimitive || typeof(T) == typeof(DateTime)) return errorMsg;

        return $"{errorMsg} {typeof(T).GetNameOrGenericTypeName()}";
    }

    public static PlatformValidationResult<T[]> ValidateFound<T>(this T[]? objects, string errorMsg = DefaultNotFoundMessage)
    {
        var objectsList = objects?.ToList();

        return objectsList?.Any() == true
            ? PlatformValidationResult.Valid(objectsList.As<T[]>())
            : PlatformValidationResult.Invalid(objectsList.As<T[]>(), errorMsg == DefaultNotFoundMessage ? BuildDefaultNotFoundErrorMsg<T>(errorMsg) : errorMsg);
    }

    public static PlatformValidationResult<List<T>> ValidateFound<T>(this List<T>? objects, string errorMsg = DefaultNotFoundMessage)
    {
        var objectsList = objects?.ToList();

        return objectsList?.Any() == true
            ? PlatformValidationResult.Valid(objectsList.As<List<T>>())
            : PlatformValidationResult.Invalid(objectsList.As<List<T>>(), errorMsg == DefaultNotFoundMessage ? BuildDefaultNotFoundErrorMsg<T>(errorMsg) : errorMsg);
    }

    public static PlatformValidationResult<IEnumerable<T>> ValidateFound<T>(this IEnumerable<T>? objects, string errorMsg = DefaultNotFoundMessage)
    {
        var objectsList = objects?.ToList();

        return objectsList?.Any() == true
            ? PlatformValidationResult.Valid(objectsList.As<IEnumerable<T>>())
            : PlatformValidationResult.Invalid(
                objectsList.As<IEnumerable<T>>(),
                errorMsg == DefaultNotFoundMessage ? BuildDefaultNotFoundErrorMsg<T>(errorMsg) : errorMsg);
    }

    public static PlatformValidationResult<List<T>?> ValidateFoundAll<T>(
        this List<T>? objects,
        List<T> mustFoundAllItems,
        Func<List<T>, string> notFoundObjectsToErrorMsg)
    {
        var notFoundObjects = mustFoundAllItems.Except(objects ?? []).ToList();

        return notFoundObjects.Any() ? PlatformValidationResult.Invalid(objects, notFoundObjectsToErrorMsg(notFoundObjects)) : PlatformValidationResult.Valid(objects);
    }

    public static PlatformValidationResult<List<T>> ValidateFoundAllBy<T, TFoundBy>(
        this List<T> objects,
        Func<T, TFoundBy> foundBy,
        List<TFoundBy> toFoundByObjects,
        Func<List<TFoundBy>, string>? notFoundByObjectsToErrorMsg = null)
    {
        var notFoundByObjects = toFoundByObjects.Except(objects.Select(foundBy)).ToList();

        return notFoundByObjects.Any()
            ? PlatformValidationResult.Invalid(objects, notFoundByObjectsToErrorMsg?.Invoke(notFoundByObjects) ?? $"{DefaultNotFoundMessage} {typeof(T).Name}")
            : PlatformValidationResult.Valid(objects);
    }

    public static PlatformValidationResult<T> ValidateFound<T>(this T? obj, Func<T, bool> and, string errorMsg = DefaultNotFoundMessage)
    {
        return obj is not null && and(obj)
            ? PlatformValidationResult.Valid(obj)
            : PlatformValidationResult.Invalid(obj!, errorMsg == DefaultNotFoundMessage ? BuildDefaultNotFoundErrorMsg<T>(errorMsg) : errorMsg);
    }

    public static PlatformValidationResult<T> ValidateFound<T>(this T? obj, Func<T, Task<bool>> and, string errorMsg = DefaultNotFoundMessage)
    {
        return obj.ValidateFound(p => and(p).GetResult(), errorMsg == DefaultNotFoundMessage ? BuildDefaultNotFoundErrorMsg<T>(errorMsg) : errorMsg);
    }

    public static async Task<PlatformValidationResult<T>> ValidateFoundAsync<T>(this T? obj, Func<T, Task<bool>> and, string errorMsg = DefaultNotFoundMessage)
    {
        var andResultCondition = obj is not null && await and(obj);

        return obj.ValidateFound(p => andResultCondition, errorMsg == DefaultNotFoundMessage ? BuildDefaultNotFoundErrorMsg<T>(errorMsg) : errorMsg);
    }

    public static Task<PlatformValidationResult<List<T>>> ValidateFoundAsync<T>(this Task<List<T>>? listTask, string errorMsg = DefaultNotFoundMessage)
    {
        return listTask.Then(items => items.ValidateFound(errorMsg == DefaultNotFoundMessage ? BuildDefaultNotFoundErrorMsg<T>(errorMsg) : errorMsg));
    }

    public static PlatformValidationResult<IQueryable<T>> ValidateFoundAny<T>(
        this IQueryable<T> query,
        Expression<Func<T, bool>> any,
        string errorMsg = DefaultNotFoundMessage)
    {
        return query.Any(any)
            ? PlatformValidationResult.Valid(query)
            : PlatformValidationResult.Invalid(query, errorMsg == DefaultNotFoundMessage ? BuildDefaultNotFoundErrorMsg<T>(errorMsg) : errorMsg);
    }

    #endregion
}
