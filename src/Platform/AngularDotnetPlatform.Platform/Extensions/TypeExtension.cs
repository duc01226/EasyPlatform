using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace AngularDotnetPlatform.Platform.Extensions
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
    }
}
