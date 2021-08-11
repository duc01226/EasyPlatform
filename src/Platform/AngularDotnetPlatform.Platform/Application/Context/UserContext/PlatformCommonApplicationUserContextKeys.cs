namespace AngularDotnetPlatform.Platform.Application.Context.UserContext
{
    public static class PlatformCommonApplicationUserContextKeys
    {
        public const string UserId = "UserId";
        public const string RequestId = "RequestId";

        public static string GetUserId(this IPlatformApplicationUserContext context)
        {
            return context?.GetValue<string>(UserId);
        }

        public static string GetRequestId(this IPlatformApplicationUserContext context)
        {
            return context?.GetValue<string>(RequestId);
        }
    }
}
