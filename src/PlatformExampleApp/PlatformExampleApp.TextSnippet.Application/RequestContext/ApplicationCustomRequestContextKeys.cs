using Easy.Platform.Application;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Infrastructures.Caching;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Application.RequestContext;

/// <summary>
/// Example code to demonstrate LazyLoadRequestContextAccessorRegistersFactory pattern with CurrentUser functionality.
/// This shows how to implement lazy-loaded, cached context values that are resolved only when first accessed.
/// </summary>
public static class ApplicationCustomRequestContextKeys
{
    public const string CurrentUserKey = "CurrentUser";
    public const string CurrentUserCacheTag = "current_user";

    public static List<string> CurrentUserCacheTags(string userId)
    {
        return [$"{TextSnippetApplicationConstants.ApplicationName}_{CurrentUserCacheTag}_{userId}"];
    }

    public static PlatformCacheKey CurrentUserCacheKey(string userId)
    {
        return new PlatformCacheKey(TextSnippetApplicationConstants.ApplicationName, CurrentUserKey, requestKeyParts: [userId]);
    }

    /// <summary>
    /// Extension method to easily access the current user from request context.
    /// This will trigger lazy loading on first access and return cached value on subsequent calls.
    /// Since lazy loading is async, this returns a Task&lt;UserEntity?&gt;.
    /// </summary>
    public static Task<UserEntity?> CurrentUser(this IPlatformApplicationRequestContext context)
    {
        return context.GetRequestContextValue<Task<UserEntity?>>(CurrentUserKey);
    }

    /// <summary>
    /// Generic extension method to access the current user with a specific type.
    /// This follows the same pattern as CurrentEmployee&lt;TEmployee&gt;.
    /// </summary>
    public static Task<TUser> CurrentUser<TUser>(this IPlatformApplicationRequestContext context)
    {
        return context.GetRequestContextValue<Task<TUser>>(CurrentUserKey);
    }

    /// <summary>
    /// Extension method to get the current user ID directly.
    /// </summary>
    public static async Task<string?> CurrentUserId(this IPlatformApplicationRequestContext context)
    {
        var user = await context.CurrentUser();
        return user?.Id;
    }

    /// <summary>
    /// Extension method to get the current user's full name.
    /// </summary>
    public static async Task<string?> CurrentUserFullName(this IPlatformApplicationRequestContext context)
    {
        var user = await context.CurrentUser();
        return user?.FullName;
    }

    /// <summary>
    /// Extension method to get the current user's department ID.
    /// </summary>
    public static async Task<string?> CurrentUserDepartmentId(this IPlatformApplicationRequestContext context)
    {
        var user = await context.CurrentUser();
        return user?.DepartmentId;
    }
}
