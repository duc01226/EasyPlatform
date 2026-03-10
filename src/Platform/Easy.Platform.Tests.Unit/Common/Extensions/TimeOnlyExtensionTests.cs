using Easy.Platform.Common.Extensions;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Extensions;

/// <summary>
/// Unit tests for <see cref="TimeOnlyExtension"/>.
/// </summary>
public class TimeOnlyExtensionTests : PlatformUnitTestBase
{
    [Fact]
    public void ToString_Null_ReturnsEmpty()
    {
        TimeOnly? time = null;

        var result = TimeOnlyExtension.ToString(time);

        result.Should().BeEmpty();
    }

    [Fact]
    public void ToString_NonNull_ReturnsDefaultFormat()
    {
        TimeOnly? time = new TimeOnly(14, 30);

        var result = TimeOnlyExtension.ToString(time);

        result.Should().Be("14:30");
    }

    [Fact]
    public void ToString_NonNull_CustomFormat_ReturnsFormatted()
    {
        TimeOnly? time = new TimeOnly(9, 5, 30);

        var result = TimeOnlyExtension.ToString(time, "HH:mm:ss");

        result.Should().Be("09:05:30");
    }

    [Fact]
    public void ToString_Midnight_ReturnsZeroPadded()
    {
        TimeOnly? time = new TimeOnly(0, 0);

        var result = TimeOnlyExtension.ToString(time);

        result.Should().Be("00:00");
    }
}
