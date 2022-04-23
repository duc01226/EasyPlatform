using System;

namespace Easy.Platform.Common.Extensions
{
    public static class DateTimeExtension
    {
        public static DateTime FirstDateOfMonth(this DateTime dateTime)
        {
            return new DateTime(dateTime.Year, dateTime.Month, 1, 0, 0, 0, dateTime.Kind);
        }

        public static DateTime LastDateOfMonth(this DateTime dateTime)
        {
            return dateTime.FirstDateOfMonth().AddMonths(1).AddSeconds(-1);
        }

        public static DateTime MiddleDateOfMonth(this DateTime dateTime)
        {
            return new DateTime(dateTime.Year, dateTime.Month, 15, 0, 0, 0, dateTime.Kind);
        }

        public static DateTime EndOfDate(this DateTime dateTime)
        {
            return dateTime.Date.AddDays(1).AddSeconds(-1);
        }
    }
}
