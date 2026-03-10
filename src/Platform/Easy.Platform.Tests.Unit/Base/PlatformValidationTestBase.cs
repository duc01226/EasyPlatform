using Easy.Platform.Common.Validations;

namespace Easy.Platform.Tests.Unit.Base;

/// <summary>
/// Base class for testing <see cref="PlatformValidationResult{TValue}"/> logic.
/// Provides factory methods and assertion helpers specific to validation scenarios.
/// </summary>
/// <typeparam name="TValue">The type of value being validated.</typeparam>
public abstract class PlatformValidationTestBase<TValue> : PlatformUnitTestBase
{
    /// <summary>
    /// Create a valid validation result with a value.
    /// </summary>
    protected static PlatformValidationResult<TValue> ValidResult(TValue value = default!)
        => PlatformValidationResult<TValue>.Valid(value);

    /// <summary>
    /// Create an invalid validation result with error messages.
    /// </summary>
    protected static PlatformValidationResult<TValue> InvalidResult(TValue value, params string[] errors)
        => PlatformValidationResult<TValue>.Invalid(value, errors.Select(e => (PlatformValidationError)e).ToArray());

    /// <summary>
    /// Create a validation result using a condition.
    /// </summary>
    protected static PlatformValidationResult<TValue> ValidateCondition(TValue value, bool condition, string error)
        => PlatformValidationResult<TValue>.Validate(value, condition, (PlatformValidationError)error);

    /// <summary>
    /// Assert that chaining multiple And() validations produces the expected validity.
    /// </summary>
    protected static void AssertChainResult(PlatformValidationResult<TValue> result, bool expectedValid)
    {
        if (expectedValid)
            AssertValid(result);
        else
            AssertInvalid(result);
    }
}
