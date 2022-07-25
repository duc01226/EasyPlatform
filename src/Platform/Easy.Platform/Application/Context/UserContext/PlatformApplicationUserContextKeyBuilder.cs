namespace Easy.Platform.Application.Context.UserContext;

public class PlatformApplicationUserContextKeyBuilder
{
    public const string ContextKeyPrefix = "Platform-ContextKey-";

    private const string ContextKeyConvention = "Platform-ContextKey-{0}";

    public static string ComputedPlatformFormatContextKeyFor(string memberName)
    {
        return string.Format(ContextKeyConvention, memberName);
    }
}
