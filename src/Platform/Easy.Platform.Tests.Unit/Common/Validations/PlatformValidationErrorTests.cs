using Easy.Platform.Common.Validations;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Validations;

/// <summary>
/// Unit tests for <see cref="PlatformValidationError"/>.
/// Covers: creation, implicit conversions, factory methods.
/// </summary>
public class PlatformValidationErrorTests
{
    private const string TestMessage = "Field is required";
    private const string TestProperty = "Name";

    [Fact]
    public void Create_WithMessage_SetsErrorMessage()
    {
        var error = PlatformValidationError.Create(TestMessage);

        error.ErrorMessage.Should().Be(TestMessage);
    }

    [Fact]
    public void Create_WithPropertyName_SetsBothFields()
    {
        var error = PlatformValidationError.Create(TestMessage, TestProperty);

        error.ErrorMessage.Should().Be(TestMessage);
        error.PropertyName.Should().Be(TestProperty);
    }

    [Fact]
    public void Create_WithMessageParams_SetsPlaceholders()
    {
        var param = new Dictionary<string, string> { { "min", "5" } };
        var error = PlatformValidationError.Create(TestMessage, messageParams: param);

        error.FormattedMessagePlaceholderValues.Should().ContainKey("min");
    }

    [Fact]
    public void ImplicitString_FromError_ReturnsToString()
    {
        var error = PlatformValidationError.Create(TestMessage);

        string msg = error;

        msg.Should().Contain(TestMessage);
    }

    [Fact]
    public void ImplicitError_FromString_CreatesError()
    {
        PlatformValidationError error = TestMessage;

        error.ErrorMessage.Should().Be(TestMessage);
    }

    [Fact]
    public void Constructor_WithValidationFailure_CopiesAllFields()
    {
        var original = new FluentValidation.Results.ValidationFailure(TestProperty, TestMessage)
        {
            ErrorCode = "ERR001",
            Severity = FluentValidation.Severity.Warning
        };

        var error = new PlatformValidationError(original);

        error.PropertyName.Should().Be(TestProperty);
        error.ErrorMessage.Should().Be(TestMessage);
        error.ErrorCode.Should().Be("ERR001");
        error.Severity.Should().Be(FluentValidation.Severity.Warning);
    }
}
