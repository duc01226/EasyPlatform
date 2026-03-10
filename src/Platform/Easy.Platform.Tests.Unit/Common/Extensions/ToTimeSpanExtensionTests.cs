using Easy.Platform.Common.Extensions;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Extensions;

/// <summary>
/// Unit tests for <see cref="ToTimeSpanExtension"/>.
/// </summary>
public class ToTimeSpanExtensionTests : PlatformUnitTestBase
{
    // ── int overloads ──

    [Theory]
    [InlineData(100)]
    [InlineData(0)]
    [InlineData(500)]
    public void Milliseconds_Int_ReturnsCorrectTimeSpan(int value)
    {
        value.Milliseconds().Should().Be(TimeSpan.FromMilliseconds(value));
    }

    [Theory]
    [InlineData(1)]
    [InlineData(30)]
    [InlineData(60)]
    public void Seconds_Int_ReturnsCorrectTimeSpan(int value)
    {
        value.Seconds().Should().Be(TimeSpan.FromSeconds(value));
    }

    [Theory]
    [InlineData(1)]
    [InlineData(15)]
    [InlineData(60)]
    public void Minutes_Int_ReturnsCorrectTimeSpan(int value)
    {
        value.Minutes().Should().Be(TimeSpan.FromMinutes(value));
    }

    [Theory]
    [InlineData(1)]
    [InlineData(12)]
    [InlineData(24)]
    public void Hours_Int_ReturnsCorrectTimeSpan(int value)
    {
        value.Hours().Should().Be(TimeSpan.FromHours(value));
    }

    [Theory]
    [InlineData(1)]
    [InlineData(7)]
    [InlineData(30)]
    public void Days_Int_ReturnsCorrectTimeSpan(int value)
    {
        value.Days().Should().Be(TimeSpan.FromDays(value));
    }

    [Theory]
    [InlineData(1)]
    [InlineData(5)]
    public void Years_Int_ReturnsCorrectTimeSpan(int value)
    {
        value.Years().Should().Be(TimeSpan.FromDays(value * 365));
    }

    // ── long overloads ──

    [Theory]
    [InlineData(100L)]
    [InlineData(0L)]
    public void Milliseconds_Long_ReturnsCorrectTimeSpan(long value)
    {
        value.Milliseconds().Should().Be(TimeSpan.FromMilliseconds(value));
    }

    [Theory]
    [InlineData(1L)]
    [InlineData(60L)]
    public void Seconds_Long_ReturnsCorrectTimeSpan(long value)
    {
        value.Seconds().Should().Be(TimeSpan.FromSeconds(value));
    }

    [Theory]
    [InlineData(1L)]
    [InlineData(60L)]
    public void Minutes_Long_ReturnsCorrectTimeSpan(long value)
    {
        value.Minutes().Should().Be(TimeSpan.FromMinutes(value));
    }

    [Theory]
    [InlineData(1L)]
    [InlineData(24L)]
    public void Hours_Long_ReturnsCorrectTimeSpan(long value)
    {
        value.Hours().Should().Be(TimeSpan.FromHours(value));
    }

    [Theory]
    [InlineData(1L)]
    [InlineData(30L)]
    public void Days_Long_ReturnsCorrectTimeSpan(long value)
    {
        value.Days().Should().Be(TimeSpan.FromDays(value));
    }

    [Theory]
    [InlineData(1L)]
    [InlineData(3L)]
    public void Years_Long_ReturnsCorrectTimeSpan(long value)
    {
        value.Years().Should().Be(TimeSpan.FromDays(value * 365));
    }

    // ── double overloads ──

    [Theory]
    [InlineData(100.5)]
    [InlineData(0.0)]
    public void Milliseconds_Double_ReturnsCorrectTimeSpan(double value)
    {
        value.Milliseconds().Should().Be(TimeSpan.FromMilliseconds(value));
    }

    [Theory]
    [InlineData(1.5)]
    [InlineData(30.0)]
    public void Seconds_Double_ReturnsCorrectTimeSpan(double value)
    {
        value.Seconds().Should().Be(TimeSpan.FromSeconds(value));
    }

    [Theory]
    [InlineData(1.5)]
    [InlineData(30.0)]
    public void Minutes_Double_ReturnsCorrectTimeSpan(double value)
    {
        value.Minutes().Should().Be(TimeSpan.FromMinutes(value));
    }

    [Theory]
    [InlineData(1.5)]
    [InlineData(12.0)]
    public void Hours_Double_ReturnsCorrectTimeSpan(double value)
    {
        value.Hours().Should().Be(TimeSpan.FromHours(value));
    }

    [Theory]
    [InlineData(1.5)]
    [InlineData(7.0)]
    public void Days_Double_ReturnsCorrectTimeSpan(double value)
    {
        value.Days().Should().Be(TimeSpan.FromDays(value));
    }

    [Theory]
    [InlineData(1.0)]
    [InlineData(2.5)]
    public void Years_Double_ReturnsCorrectTimeSpan(double value)
    {
        value.Years().Should().Be(TimeSpan.FromDays(value * 365));
    }
}
