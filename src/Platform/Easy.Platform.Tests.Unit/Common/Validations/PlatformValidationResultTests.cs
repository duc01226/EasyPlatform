using Easy.Platform.Common.Validations;
using Easy.Platform.Common.Validations.Exceptions;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Validations;

/// <summary>
/// Unit tests for <see cref="PlatformValidationResult{TValue}"/> synchronous operations.
/// Covers: creation, And/Or chaining, Combine/Aggregate, EnsureValid, implicit operators, error messages.
/// </summary>
public class PlatformValidationResultTests : PlatformValidationTestBase<string>
{
    private const string TestValue = "test-value";
    private const string ErrorMsg = "Validation failed";
    private const string ErrorMsg2 = "Second error";

    // ── Factory Methods ──

    [Fact]
    public void Valid_ReturnsValidResult()
    {
        var result = ValidResult(TestValue);

        AssertValid(result);
        result.Value.Should().Be(TestValue);
    }

    [Fact]
    public void Invalid_ReturnsInvalidResultWithErrors()
    {
        var result = InvalidResult(TestValue, ErrorMsg);

        AssertInvalid(result, ErrorMsg);
        result.Value.Should().Be(TestValue);
    }

    [Fact]
    public void Invalid_WithNoErrors_DefaultsToInvalidMessage()
    {
        var result = PlatformValidationResult.Invalid<string>(TestValue);

        AssertInvalid(result, "Invalid!");
    }

    // ── Validate / ValidateNot ──

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void Validate_ReturnsBasedOnCondition(bool condition)
    {
        var result = ValidateCondition(TestValue, condition, ErrorMsg);

        AssertChainResult(result, condition);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void ValidateNot_ReturnsInverseOfCondition(bool mustNot)
    {
        var result = PlatformValidationResult<string>.ValidateNot(TestValue, mustNot, (PlatformValidationError)ErrorMsg);

        AssertChainResult(result, !mustNot);
    }

    [Fact]
    public void Validate_WithFuncCondition_EvaluatesLazily()
    {
        var callCount = 0;
        var result = PlatformValidationResult<string>.Validate(TestValue, () => { callCount++; return true; }, (PlatformValidationError)ErrorMsg);

        AssertValid(result);
        callCount.Should().Be(1);
    }

    // ── And Chaining (Fail-Fast) ──

    [Fact]
    public void And_WhenAllValid_ReturnsValid()
    {
        var result = ValidResult(TestValue)
            .And(v => ValidateCondition(v, true, "err1"))
            .And(v => ValidateCondition(v, true, "err2"));

        AssertValid(result);
    }

    [Fact]
    public void And_WhenFirstFails_ShortCircuits()
    {
        var secondCalled = false;

        var result = ValidResult(TestValue)
            .And(v => ValidateCondition(v, false, ErrorMsg))
            .And(v =>
            {
                secondCalled = true;
                return ValidResult(v);
            });

        AssertInvalid(result, ErrorMsg);
        secondCalled.Should().BeFalse("And should short-circuit on first failure");
    }

    [Fact]
    public void And_WithBoolFunc_ValidatesValue()
    {
        var result = ValidResult(TestValue)
            .And(v => v.Length > 0, (PlatformValidationError)"Must have length");

        AssertValid(result);
    }

    [Fact]
    public void And_WithBoolFunc_WhenFails_ReturnsInvalid()
    {
        var result = ValidResult(TestValue)
            .And(v => v.Length > 100, (PlatformValidationError)ErrorMsg);

        AssertInvalid(result, ErrorMsg);
    }

    [Fact]
    public void AndNot_WhenConditionFalse_ReturnsValid()
    {
        var result = ValidResult(TestValue)
            .AndNot(v => false, (PlatformValidationError)ErrorMsg);

        AssertValid(result);
    }

    [Fact]
    public void AndNot_WhenConditionTrue_ReturnsInvalid()
    {
        var result = ValidResult(TestValue)
            .AndNot(v => true, (PlatformValidationError)ErrorMsg);

        AssertInvalid(result, ErrorMsg);
    }

    // ── Or Chaining ──

    [Fact]
    public void Or_WhenFirstValid_ReturnsFirst()
    {
        var secondCalled = false;
        var result = ValidResult(TestValue).Or(() =>
        {
            secondCalled = true;
            return InvalidResult(TestValue, ErrorMsg);
        });

        AssertValid(result);
        secondCalled.Should().BeFalse("Or should short-circuit when first is valid");
    }

    [Fact]
    public void Or_WhenFirstInvalid_ReturnsSecond()
    {
        var result = InvalidResult(TestValue, ErrorMsg)
            .Or(() => ValidResult(TestValue));

        AssertValid(result);
    }

    // ── Combine (Fail-Fast) ──

    [Fact]
    public void Combine_WhenAllValid_ReturnsValid()
    {
        var result = PlatformValidationResult<string>.Combine(
            () => ValidResult(TestValue),
            () => ValidResult(TestValue));

        AssertValid(result);
    }

    [Fact]
    public void Combine_WhenAnyInvalid_FailsFast()
    {
        var secondCalled = false;
        var result = PlatformValidationResult<string>.Combine(
            () => InvalidResult(TestValue, ErrorMsg),
            () =>
            {
                secondCalled = true;
                return ValidResult(TestValue);
            });

        AssertInvalid(result, ErrorMsg);
        secondCalled.Should().BeFalse();
    }

    [Fact]
    public void Combine_WithEmptyArray_ReturnsValid()
    {
        var result = PlatformValidationResult<string>.Combine(Array.Empty<PlatformValidationResult<string>>());

        AssertValid(result);
    }

    // ── Aggregate (Collect All Errors) ──

    [Fact]
    public void Aggregate_CollectsAllErrors()
    {
        var result = PlatformValidationResult<string>.Aggregate(
            InvalidResult(TestValue, ErrorMsg),
            InvalidResult(TestValue, ErrorMsg2));

        AssertInvalid(result);
        result.Errors.Should().HaveCount(2);
        result.ErrorsMsg().Should().Contain(ErrorMsg).And.Contain(ErrorMsg2);
    }

    [Fact]
    public void Aggregate_WhenAllValid_ReturnsValid()
    {
        var result = PlatformValidationResult<string>.Aggregate(
            ValidResult(TestValue),
            ValidResult(TestValue));

        AssertValid(result);
    }

    [Fact]
    public void Aggregate_WithTuples_CollectsFailedConditions()
    {
        var result = PlatformValidationResult<string>.Aggregate(
            TestValue,
            (true, (PlatformValidationError)"ok"),
            (false, (PlatformValidationError)ErrorMsg));

        AssertInvalid(result, ErrorMsg);
        AssertErrorCount(result, 1);
    }

    // ── EnsureValid ──

    [Fact]
    public void EnsureValid_WhenValid_ReturnsValue()
    {
        var result = ValidResult(TestValue);

        result.EnsureValid().Should().Be(TestValue);
    }

    [Fact]
    public void EnsureValid_WhenInvalid_ThrowsValidationException()
    {
        var result = InvalidResult(TestValue, ErrorMsg);

        var act = () => result.EnsureValid();

        act.Should().Throw<PlatformValidationException>();
    }

    [Fact]
    public void EnsureValid_WithCustomException_ThrowsCustom()
    {
        var result = InvalidResult(TestValue, ErrorMsg);

        var act = () => result.EnsureValid(_ => new InvalidOperationException("custom"));

        act.Should().Throw<InvalidOperationException>().WithMessage("custom");
    }

    // ── Then / ThenValidate ──

    [Fact]
    public void Then_WhenValid_TransformsValue()
    {
        var result = ValidResult(TestValue).Then(v => v.Length);

        AssertValid(result);
        result.Value.Should().Be(TestValue.Length);
    }

    [Fact]
    public void Then_WhenInvalid_PropagatesErrors()
    {
        var result = InvalidResult(TestValue, ErrorMsg).Then(v => v.Length);

        AssertInvalid(result);
    }

    [Fact]
    public void ThenValidate_WhenValid_ExecutesNextValidation()
    {
        var result = ValidResult(TestValue)
            .ThenValidate(v => PlatformValidationResult<int>.Validate(v.Length, v.Length > 0, (PlatformValidationError)"empty"));

        AssertValid(result);
        result.Value.Should().Be(TestValue.Length);
    }

    [Fact]
    public void ThenValidate_WhenInvalid_SkipsNext()
    {
        var nextCalled = false;

        var result = InvalidResult(TestValue, ErrorMsg)
            .ThenValidate(v =>
            {
                nextCalled = true;
                return PlatformValidationResult<int>.Valid(v.Length);
            });

        AssertInvalid(result);
        nextCalled.Should().BeFalse();
    }

    // ── Match ──

    [Fact]
    public void Match_WhenValid_CallsValidBranch()
    {
        var result = ValidResult(TestValue)
            .Match(
                valid: v => PlatformValidationResult<int>.Valid(v.Length),
                invalid: _ => PlatformValidationResult<int>.Invalid(0, (PlatformValidationError)"error"));

        AssertValid(result);
        result.Value.Should().Be(TestValue.Length);
    }

    [Fact]
    public void Match_WhenInvalid_CallsInvalidBranch()
    {
        var result = InvalidResult(TestValue, ErrorMsg)
            .Match(
                valid: v => PlatformValidationResult<int>.Valid(v.Length),
                invalid: _ => PlatformValidationResult<int>.Invalid(0, (PlatformValidationError)"matched-error"));

        AssertInvalid(result, "matched-error");
    }

    // ── Of ──

    [Fact]
    public void Of_TransfersErrorsToNewType()
    {
        var result = InvalidResult(TestValue, ErrorMsg).Of<int>(42);

        AssertInvalid(result, ErrorMsg);
        result.Value.Should().Be(42);
    }

    [Fact]
    public void Of_WhenValid_TransfersValue()
    {
        var result = ValidResult(TestValue).Of<int>(42);

        AssertValid(result);
        result.Value.Should().Be(42);
    }

    // ── Implicit Operators ──

    [Fact]
    public void ImplicitBool_WhenValid_ReturnsTrue()
    {
        var result = ValidResult(TestValue);

        bool isValid = result;

        isValid.Should().BeTrue();
    }

    [Fact]
    public void ImplicitBool_WhenInvalid_ReturnsFalse()
    {
        var result = InvalidResult(TestValue, ErrorMsg);

        bool isValid = result;

        isValid.Should().BeFalse();
    }

    [Fact]
    public void ImplicitString_ReturnsErrorsMsg()
    {
        var result = InvalidResult(TestValue, ErrorMsg);

        var msg = result.ErrorsMsg();

        msg.Should().Contain(ErrorMsg);
    }

    [Fact]
    public void ImplicitTuple_CreatesInvalidResult()
    {
        PlatformValidationResult<string> result = (TestValue, ErrorMsg);

        AssertInvalid(result, ErrorMsg);
    }

    // ── ErrorsMsg ──

    [Fact]
    public void ErrorsMsg_ConcatenatesMultipleErrors()
    {
        var result = InvalidResult(TestValue, ErrorMsg, ErrorMsg2);

        result.ErrorsMsg().Should().Contain(ErrorMsg).And.Contain(ErrorMsg2);
        result.ErrorsMsg().Should().Contain(";", "Multiple errors should be separated by semicolons");
    }

    [Fact]
    public void ErrorsMsg_WhenValid_ReturnsEmpty()
    {
        var result = ValidResult(TestValue);

        result.ErrorsMsg().Should().BeEmpty();
    }

    // ── WithInvalidException ──

    [Fact]
    public void WithInvalidException_SetsCustomException()
    {
        var result = InvalidResult(TestValue, ErrorMsg)
            .WithInvalidException(_ => new InvalidOperationException("custom"));

        var act = () => result.EnsureValid();

        act.Should().Throw<InvalidOperationException>().WithMessage("custom");
    }

    // ── AggregateErrors ──

    [Fact]
    public void AggregateErrors_CollectsFromAndChain()
    {
        var result = ValidResult(TestValue)
            .And(v => InvalidResult(v, ErrorMsg))
            .And(v => InvalidResult(v, ErrorMsg2));

        var errors = result.AggregateErrors();

        errors.Should().HaveCountGreaterOrEqualTo(1);
    }

    // ── Non-generic PlatformValidationResult ──

    [Fact]
    public void NonGeneric_Valid_ReturnsValid()
    {
        var result = PlatformValidationResult.Valid<string>(TestValue);

        AssertValid(result);
    }

    [Fact]
    public void NonGeneric_Invalid_ReturnsInvalid()
    {
        var result = PlatformValidationResult.Invalid<string>(TestValue, (PlatformValidationError)ErrorMsg);

        AssertInvalid(result, ErrorMsg);
    }

    [Fact]
    public void NonGeneric_ImplicitFromString_CreatesInvalid()
    {
        PlatformValidationResult result = ErrorMsg;

        AssertInvalid(result, ErrorMsg);
    }

    [Fact]
    public void NonGeneric_ImplicitFromStringList_CreatesInvalid()
    {
        PlatformValidationResult result = new List<string> { ErrorMsg, ErrorMsg2 };

        AssertInvalid(result);
    }

    [Fact]
    public void NonGeneric_Combine_FailsFast()
    {
        var result = PlatformValidationResult.Combine(
            () => PlatformValidationResult.Valid<object>(null!),
            () => (PlatformValidationResult)ErrorMsg);

        AssertInvalid(result, ErrorMsg);
    }

    [Fact]
    public void NonGeneric_Aggregate_CollectsAllErrors()
    {
        var result = PlatformValidationResult.Aggregate(
            (PlatformValidationResult)ErrorMsg,
            (PlatformValidationResult)ErrorMsg2);

        AssertInvalid(result);
        result.Errors.Should().HaveCount(2);
    }
}
