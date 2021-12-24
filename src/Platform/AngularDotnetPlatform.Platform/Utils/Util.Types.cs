using System;

namespace AngularDotnetPlatform.Platform.Utils
{
    public static partial class Util
    {
        public static class Types
        {
            /// <summary>
            /// References: https://stackoverflow.com/questions/3117090/getinterfaces-returns-generic-interface-type-with-fullname-null/3117293
            /// <br/>
            /// This function used to fix when a Type is generic, get Interfaces will lead to missing fullName => lead to register into ServiceCollection for generic type get errors
            /// </summary>
            /// <param name="type"></param>
            /// <returns></returns>
            public static Type FixTypeReference(Type type)
            {
                if (type.FullName != null)
                    return type;

                var typeQualifiedName = type.DeclaringType != null
                    ? type.DeclaringType.FullName + "+" + type.Name + ", " + type.Assembly.FullName
                    : type.Namespace + "." + type.Name + ", " + type.Assembly.FullName;

                return Type.GetType(typeQualifiedName, true);
            }

            public static Type FindMatchedGenericType(Type givenType, Type matchedToGenericTypeDefinition)
            {
                var interfaceTypes = givenType.GetInterfaces();

                foreach (var interfaceType in interfaceTypes)
                {
                    if (interfaceType.IsGenericType && interfaceType.GetGenericTypeDefinition() == matchedToGenericTypeDefinition)
                        return interfaceType;
                }

                if (givenType.IsGenericType && givenType.GetGenericTypeDefinition() == matchedToGenericTypeDefinition)
                    return givenType;

                var baseType = givenType.BaseType;
                if (baseType == null)
                    return null;

                return FindMatchedGenericType(baseType, matchedToGenericTypeDefinition);
            }
        }
    }
}
