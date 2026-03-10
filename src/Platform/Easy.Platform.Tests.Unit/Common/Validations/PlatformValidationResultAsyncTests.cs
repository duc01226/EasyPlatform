using Easy.Platform.Common.Validations;
using Easy.Platform.Common.Validations.Exceptions;
using Easy.Platform.Common.Validations.Extensions;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Validations;

/// <summary>
/// Unit tests for <see cref="PlatformValidationResult{TValue}"/> async operations.
/// Covers: AndAsync, ThenValidateAsync, EnsureValidAsync, ThenAsync, OrAsync.
/// </summary>
public class PlatformValidationResultAsyncTests : PlatformValidationTestBase<string>
{
    private const string TestValue = "test-value";
    private const string ErrorMsg = "Async validation failed";
    // ── AndAsync ──

    [Fact]
    public async Task AndAsync_WhenValid_ExecutesNext()
    {
        var result = await ValidResult(TestValue)
            .AndAsync(v => Task.FromResult(true), (PlatformValidationError)ErrorMsg);

        AssertValid(result);
    }

    [Fact]
    public async Task AndAsync_WhenInvalid_ShortCircuits()
    {
        var nextCalled = false;

        var result = await InvalidResult(TestValue, ErrorMsg)
            .AndAsync(async v =>
            {
                nextCalled = true;
                return ValidResult(v);
            });

        AssertInvalid(result, ErrorMsg);
        nextCalled.Should().BeFalse();
    }

    [Fact]
    public async Task AndAsync_WithBoolTask_WhenFails_ReturnsInvalid()
    {
        var result = await ValidResult(TestValue)
            .AndAsync(v => Task.FromResult(false), (PlatformValidationError)ErrorMsg);

        AssertInvalid(result, ErrorMsg);
    }

    // ── AndNotAsync ──

    [Fact]
    public async Task AndNotAsync_WhenConditionFalse_ReturnsValid()
    {
        var result = await ValidResult(TestValue)
            .AndNotAsync(v => Task.FromResult(false), (PlatformValidationError)ErrorMsg);

        AssertValid(result);
    }

    [Fact]
    public async Task AndNotAsync_WhenConditionTrue_ReturnsInvalid()
    {
        var result = await ValidResult(TestValue)
            .AndNotAsync(v => Task.FromResult(true), (PlatformValidationError)ErrorMsg);

        AssertInvalid(result, ErrorMsg);
    }

    // ── ThenAsync ──

    [Fact]
    public async Task ThenAsync_WhenValid_ExecutesTransform()
    {
        var result = await ValidResult(TestValue)
            .ThenAsync(v => Task.FromResult(PlatformValidationResult<int>.Valid(v.Length)));

        AssertValid(result);
        result.Value.Should().Be(TestValue.Length);
    }

    [Fact]
    public async Task ThenAsync_WhenInvalid_SkipsTransform()
    {
        var result = await InvalidResult(TestValue, ErrorMsg)
            .ThenAsync(v => Task.FromResult(PlatformValidationResult<int>.Valid(v.Length)));

        AssertInvalid(result);
    }

    [Fact]
    public async Task ThenAsync_WithValueTransform_WhenValid_Transforms()
    {
        var result = await ValidResult(TestValue)
            .ThenAsync(v => Task.FromResult(v.Length));

        AssertValid(result);
        result.Value.Should().Be(TestValue.Length);
    }

    // ── ThenValidateAsync ──

    [Fact]
    public async Task ThenValidateAsync_WhenValid_ExecutesNextValidation()
    {
        var result = await ValidResult(TestValue)
            .ThenValidateAsync(v => Task.FromResult(PlatformValidationResult<int>.Valid(v.Length)));

        AssertValid(result);
        result.Value.Should().Be(TestValue.Length);
    }

    [Fact]
    public async Task ThenValidateAsync_WhenInvalid_SkipsNext()
    {
        var result = await InvalidResult(TestValue, ErrorMsg)
            .ThenValidateAsync(v => Task.FromResult(PlatformValidationResult<int>.Valid(v.Length)));

        AssertInvalid(result);
    }

    // ── OrAsync ──

    [Fact]
    public async Task OrAsync_WhenFirstValid_ReturnsFirst()
    {
        var result = await ValidResult(TestValue)
            .Or(Task.FromResult(InvalidResult(TestValue, ErrorMsg)));

        AssertValid(result);
    }

    [Fact]
    public async Task OrAsync_WhenFirstInvalid_ReturnsSecond()
    {
        var result = await InvalidResult(TestValue, ErrorMsg)
            .Or(Task.FromResult(ValidResult(TestValue)));

        AssertValid(result);
    }

    // ── EnsureValidAsync (extension) ──

    [Fact]
    public async Task EnsureValidAsync_WhenValid_ReturnsValue()
    {
        var value = await Task.FromResult(ValidResult(TestValue)).EnsureValidAsync();

        value.Should().Be(TestValue);
    }

    [Fact]
    public async Task EnsureValidAsync_WhenInvalid_ThrowsValidationException()
    {
        var act = () => Task.FromResult(InvalidResult(TestValue, ErrorMsg)).EnsureValidAsync();

        await act.Should().ThrowAsync<PlatformValidationException>();
    }

    // ── Extension: Task<T>.ThenValidateAsync ──

    [Fact]
    public async Task ThenValidateAsync_FromTask_WhenConditionTrue_ReturnsValid()
    {
        var result = await Task.FromResult(TestValue)
            .ThenValidateAsync(v => v.Length > 0, (PlatformValidationError)ErrorMsg);

        AssertValid(result);
    }

    [Fact]
    public async Task ThenValidateAsync_FromTask_WhenConditionFalse_ReturnsInvalid()
    {
        var result = await Task.FromResult(TestValue)
            .ThenValidateAsync(v => v.Length > 100, (PlatformValidationError)ErrorMsg);

        AssertInvalid(result, ErrorMsg);
    }

    // ── Extension: AndAsync on Task<PlatformValidationResult<T>> ──

    [Fact]
    public async Task AndAsync_Extension_WhenBothValid_ReturnsValid()
    {
        var result = await Task.FromResult(ValidResult(TestValue))
            .AndAsync(v => ValidateCondition(v, true, ErrorMsg));

        AssertValid(result);
    }

    [Fact]
    public async Task AndAsync_Extension_WhenSecondFails_ReturnsInvalid()
    {
        var result = await Task.FromResult(ValidResult(TestValue))
            .AndAsync(v => false, (PlatformValidationError)ErrorMsg);

        AssertInvalid(result, ErrorMsg);
    }

    // ── MatchAsync ──

    [Fact]
    public async Task MatchAsync_WhenValid_CallsValidBranch()
    {
        var result = await ValidResult(TestValue)
            .MatchAsync(
                valid: v => Task.FromResult(PlatformValidationResult<int>.Valid(v.Length)),
                invalid: _ => Task.FromResult(PlatformValidationResult<int>.Invalid(0)));

        AssertValid(result);
        result.Value.Should().Be(TestValue.Length);
    }

    [Fact]
    public async Task MatchAsync_WhenInvalid_CallsInvalidBranch()
    {
        var result = await InvalidResult(TestValue, ErrorMsg)
            .MatchAsync(
                valid: v => Task.FromResult(PlatformValidationResult<int>.Valid(v.Length)),
                invalid: _ => Task.FromResult(PlatformValidationResult<int>.Invalid(0, (PlatformValidationError)"fallback")));

        AssertInvalid(result, "fallback");
    }
}
