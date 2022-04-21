using System;
using System.Linq;

namespace AngularDotnetPlatform.Platform.Common.Extensions
{
    public static class TypeExtension
    {
        public static bool IsAssignableToGenericType(this Type givenType, Type genericType)
        {
            var interfaceTypes = givenType.GetInterfaces();

            foreach (var it in interfaceTypes)
            {
                if (it.IsGenericType && it.GetGenericTypeDefinition() == genericType)
                    return true;
            }

            if (givenType.IsGenericType && givenType.GetGenericTypeDefinition() == genericType)
                return true;

            var baseType = givenType.BaseType;
            if (baseType == null)
                return false;

            return IsAssignableToGenericType(baseType, genericType);
        }

        public static string GetGenericTypeName(this Type t)
        {
            if (!t.IsGenericType)
                return t.Name;

            var genericTypeName = t.GetGenericTypeDefinition().Name;

            var genericTypeClassNameOnly = genericTypeName.Substring(0, genericTypeName.IndexOf('`'));

            var genericArgs = string.Join(
                ",",
                t.GetGenericArguments().Select(GetGenericTypeName).ToArray());

            return genericTypeClassNameOnly + "<" + genericArgs + ">";
        }
    }
}
