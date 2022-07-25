namespace Easy.Platform.Common.Extensions;

public static class StringExtension
{
    public static string TakeTop(this string strValue, int takeMaxLength)
    {
        return strValue.Length >= takeMaxLength ? strValue.Substring(0, takeMaxLength) : strValue;
    }

    public static string ThrowIfNullOrWhiteSpace(this string target, Func<Exception> exception)
    {
        return target.ThrowIf(isThrow: target => string.IsNullOrWhiteSpace(target), exception);
    }

    public static string ThrowIfNullOrEmpty(this string target, Func<Exception> exception)
    {
        return target.ThrowIf(isThrow: target => string.IsNullOrEmpty(target), exception);
    }
}
