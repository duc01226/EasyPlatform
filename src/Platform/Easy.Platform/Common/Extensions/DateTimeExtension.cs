using System;
using Easy.Platform.Common.Extensions.DateTimeExtensions;

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

        public static DateTime DateOfMonToSunWeek(this DateTime currentDate, DayOfMonToSunWeek dayOfWeek)
        {
            var firstDateOfWeek = currentDate.AddDays(-(int)currentDate.DayOfMonToSunWeek());

            return firstDateOfWeek.AddDays((int)dayOfWeek);
        }

        public static DayOfMonToSunWeek DayOfMonToSunWeek(this DateTime currentDate)
        {
            return currentDate.DayOfWeek switch
            {
                DayOfWeek.Monday => DateTimeExtensions.DayOfMonToSunWeek.Monday,
                DayOfWeek.Tuesday => DateTimeExtensions.DayOfMonToSunWeek.Tuesday,
                DayOfWeek.Wednesday => DateTimeExtensions.DayOfMonToSunWeek.Wednesday,
                DayOfWeek.Thursday => DateTimeExtensions.DayOfMonToSunWeek.Thursday,
                DayOfWeek.Friday => DateTimeExtensions.DayOfMonToSunWeek.Friday,
                DayOfWeek.Saturday => DateTimeExtensions.DayOfMonToSunWeek.Saturday,
                DayOfWeek.Sunday => DateTimeExtensions.DayOfMonToSunWeek.Sunday,
                _ => throw new ArgumentException()
            };
        }
    }
}

namespace Easy.Platform.Common.Extensions.DateTimeExtensions
{
    public enum DayOfMonToSunWeek
    {
        Monday,
        Tuesday,
        Wednesday,
        Thursday,
        Friday,
        Saturday,
        Sunday
    }
}
