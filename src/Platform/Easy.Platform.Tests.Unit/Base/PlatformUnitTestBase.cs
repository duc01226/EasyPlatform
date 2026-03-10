using AutoFixture;
using AutoFixture.AutoMoq;
using Easy.Platform.Common.Validations;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Base;

/// <summary>
/// Root base class for all platform unit tests.
/// Provides AutoFixture with AutoMoq customization, generic data creation helpers,
/// and shared validation assertion methods.
/// </summary>
public abstract class PlatformUnitTestBase
{
    protected PlatformUnitTestBase()
    {
        Fixture = new Fixture().Customize(new AutoMoqCustomization { ConfigureMembers = true });
        ConfigureFixture(Fixture);
    }

    /// <summary>
    /// AutoFixture instance with AutoMoq. Override <see cref="ConfigureFixture"/> to customize.
    /// </summary>
    protected IFixture Fixture { get; }

    /// <summary>
    /// Override to add custom AutoFixture customizations (e.g., omit recursion, register builders).
    /// </summary>
    protected virtual void ConfigureFixture(IFixture fixture) { }

    /// <summary>
    /// Create a random instance of <typeparamref name="T"/> using AutoFixture.
    /// </summary>
    protected T Create<T>() => Fixture.Create<T>();

    /// <summary>
    /// Create multiple random instances of <typeparamref name="T"/>.
    /// </summary>
    protected List<T> CreateMany<T>(int count = 3) => Fixture.CreateMany<T>(count).ToList();

    /// <summary>
    /// Assert that a validation result is valid.
    /// </summary>
    protected static void AssertValid<T>(PlatformValidationResult<T> result)
    {
        result.IsValid.Should().BeTrue($"Expected valid but got errors: {result.ErrorsMsg()}");
    }

    /// <summary>
    /// Assert that a validation result is invalid and optionally contains a specific error message.
    /// </summary>
    protected static void AssertInvalid<T>(PlatformValidationResult<T> result, string? expectedErrorContains = null)
    {
        result.IsValid.Should().BeFalse("Expected validation to fail but it succeeded");
        if (expectedErrorContains != null)
            result.ErrorsMsg().Should().Contain(expectedErrorContains);
    }

    /// <summary>
    /// Assert that a validation result has exactly the expected number of errors.
    /// </summary>
    protected static void AssertErrorCount<T>(PlatformValidationResult<T> result, int expectedCount)
    {
        result.Errors.Should().HaveCount(expectedCount);
    }
}
