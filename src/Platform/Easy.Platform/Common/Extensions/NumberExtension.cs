namespace Easy.Platform.Common.Extensions;

public static class NumberExtension
{
    public static string ToCompactDecimalString(this double value)
    {
        return value % 1 == 0
            ? ((int)value).ToString()
            : value.ToString("0.##");
    }
}
