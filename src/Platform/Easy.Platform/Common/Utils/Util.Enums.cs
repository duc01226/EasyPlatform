namespace Easy.Platform.Common.Utils;

public static partial class Util
{
    public static class Enums
    {
        /// <summary>
        ///     Map an Enum to another Enum which has the same key
        /// </summary>
        public static TEnumResult Map<TEnumSource, TEnumResult>(TEnumSource input)
            where TEnumSource : Enum where TEnumResult : Enum
        {
            return Parse<TEnumResult>(input.ToString("g"));
        }

        /// <summary>
        ///     Parse a string to Enum of scpecified type
        /// </summary>
        public static TEnum Parse<TEnum>(string enumString) where TEnum : Enum
        {
            return (TEnum)Enum.Parse(typeof(TEnum), enumString);
        }
    }
}
