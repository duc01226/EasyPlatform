using Easy.Platform.Application;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Infrastructures.Caching;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Application.RequestContext;

/// <summary>
/// Example code to register a custom request context key via <see cref="PlatformApplicationModule.LazyLoadRequestContextAccessorRegistersFactory" />
/// </summary>
public static class ApplicationCustomRequestContextKeys
{
    public const string CurrentEmployeeKey = "CurrentEmployee";

    public static List<string> CurrentEmployeeCacheTags(string exampleCurrentLoggingSelectedInfo)
    {
        return [$"{TextSnippetApplicationConstants.ApplicationName}_{CurrentEmployeeKey}_{exampleCurrentLoggingSelectedInfo}"];
    }

    public static PlatformCacheKey CurrentEmployeeCacheKey(string exampleCurrentLoggingSelectedInfo)
    {
        return new PlatformCacheKey(
            TextSnippetApplicationConstants.ApplicationName,
            CurrentEmployeeKey,
            requestKeyParts: [exampleCurrentLoggingSelectedInfo]);
    }

    public static Task<TextSnippetEntity> CurrentEmployee(this IPlatformApplicationRequestContext context)
    {
        return context.GetValue<Task<TextSnippetEntity>>(CurrentEmployeeKey);
    }
}
