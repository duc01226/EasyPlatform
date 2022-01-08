namespace AngularDotnetPlatform.Platform.Common.Extensions
{
    public static class StringExtension
    {
        public static string TakeTop(this string strValue, int takeMaxLength)
        {
            return strValue.Length >= takeMaxLength ? strValue.Substring(0, takeMaxLength) : strValue;
        }
    }
}
