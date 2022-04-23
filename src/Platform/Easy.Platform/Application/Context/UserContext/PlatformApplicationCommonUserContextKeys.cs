using System.Collections.Generic;
using Easy.Platform.Common.Utils;

namespace Easy.Platform.Application.Context.UserContext
{
    public static class PlatformApplicationCommonUserContextKeys
    {
        public const string RequestId = "RequestId";
        public const string UserId = "UserId";
        public const string UserName = "UserName";
        public const string Email = "Email";
        public const string UserRoles = "UserRoles";
        public const string UserPermissions = "UserPermissions";
        public const string UserFullName = "UserFullName";
        public const string UserFirstName = "UserFirstName";
        public const string UserMiddleName = "UserMiddleName";
        public const string UserLastName = "UserLastName";

        public static string GetRequestId(this IPlatformApplicationUserContext context)
        {
            return context.GetValue<string>(RequestId);
        }

        public static string GetUserId(this IPlatformApplicationUserContext context)
        {
            return context.GetValue<string>(UserId);
        }

        public static T GetUserId<T>(this IPlatformApplicationUserContext context)
        {
            return Util.Strings.Parse<T>(context.GetUserId());
        }

        public static string GetUserName(this IPlatformApplicationUserContext context)
        {
            return context.GetValue<string>(UserName);
        }

        public static string GetEmail(this IPlatformApplicationUserContext context)
        {
            return context.GetValue<string>(Email);
        }

        public static List<string> GetUserRoles(this IPlatformApplicationUserContext context)
        {
            return context.GetValue<List<string>>(UserRoles);
        }

        public static T GetUserPermissions<T>(this IPlatformApplicationUserContext context)
        {
            return context.GetValue<T>(UserPermissions);
        }

        public static string GetUserFullName(this IPlatformApplicationUserContext context)
        {
            return context.GetValue<string>(UserFullName);
        }

        public static string GetUserFirstName(this IPlatformApplicationUserContext context)
        {
            return context.GetValue<string>(UserFirstName);
        }

        public static string GetUserMiddleName(this IPlatformApplicationUserContext context)
        {
            return context.GetValue<string>(UserMiddleName);
        }

        public static string GetUserLastName(this IPlatformApplicationUserContext context)
        {
            return context.GetValue<string>(UserLastName);
        }

        public static void SetRequestId(this IPlatformApplicationUserContext context, string value)
        {
            context.SetValue(value, RequestId);
        }

        public static void SetUserId(this IPlatformApplicationUserContext context, string value)
        {
            context?.SetValue(value, UserId);
        }

        public static void SetUserName(this IPlatformApplicationUserContext context, string value)
        {
            context.SetValue(value, UserName);
        }

        public static void SetUserFullName(this IPlatformApplicationUserContext context, string value)
        {
            context.SetValue(value, UserFullName);
        }

        public static void SetUserLastName(this IPlatformApplicationUserContext context, string value)
        {
            context.SetValue(value, UserLastName);
        }

        public static void SetUserFirstName(this IPlatformApplicationUserContext context, string value)
        {
            context.SetValue(value, UserFirstName);
        }
    }
}
