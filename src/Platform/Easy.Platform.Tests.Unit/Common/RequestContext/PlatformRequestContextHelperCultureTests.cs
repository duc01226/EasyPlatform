using System.Globalization;
using Easy.Platform.Common.RequestContext;
using FluentAssertions;
using Xunit;

namespace Easy.Platform.Tests.Unit.Common.RequestContext;

/// <summary>
/// Guards the platform request-context numeric conversion used by query strings, headers, and claims.
/// </summary>
public class PlatformRequestContextHelperCultureTests
{
    [Theory]
    [InlineData("en-US")]
    [InlineData("de-DE")]
    [InlineData("fr-FR")]
    [InlineData("vi-VN")]
    public void TryParseFromStrings_DotDecimalIsCultureIndependent(string cultureName)
    {
        WithCulture(cultureName, () =>
        {
            PlatformRequestContextHelper.TryParseFromStrings<double>(out var value, ["1.5"]).Should().BeTrue();
            value.Should().Be(1.5d);
        });
    }

    private static void WithCulture(string cultureName, Action action)
    {
        var originalCulture = CultureInfo.CurrentCulture;
        var originalUiCulture = CultureInfo.CurrentUICulture;

        try
        {
            var culture = CultureInfo.GetCultureInfo(cultureName);
            CultureInfo.CurrentCulture = culture;
            CultureInfo.CurrentUICulture = culture;
            action();
        }
        finally
        {
            CultureInfo.CurrentCulture = originalCulture;
            CultureInfo.CurrentUICulture = originalUiCulture;
        }
    }
}
