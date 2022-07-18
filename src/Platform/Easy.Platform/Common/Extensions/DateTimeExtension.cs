namespace Easy.Platform.Common.Extensions
{
    public static class DateTimeExtension
    {
        public static DateTime FirstDateOfMonth(this DateTime dateTime)
        {
            return new DateTime(
                dateTime.Year,
                dateTime.Month,
                1,
                0,
                0,
                0,
                dateTime.Kind);
        }

        public static DateTime LastDateOfMonth(this DateTime dateTime)
        {
            return dateTime.FirstDateOfMonth().AddMonths(1).AddSeconds(-1);
        }

        public static DateTime MiddleDateOfMonth(this DateTime dateTime)
        {
            return new DateTime(
                dateTime.Year,
                dateTime.Month,
                15,
                0,
                0,
                0,
                dateTime.Kind);
        }

        public static DateTime EndOfDate(this DateTime dateTime)
        {
            return dateTime.Date.AddDays(1).AddSeconds(-1);
        }

        public static DateTime DateOfMonToSunWeek(this DateTime currentDate, DayOfMonToSunWeek dayOfWeek)
        {
            var firstDateOfWeek = currentDate.AddDays(-(int)currentDate.ToDayOfMonToSunWeek());

            return firstDateOfWeek.AddDays((int)dayOfWeek);
        }

        public static DayOfMonToSunWeek ToDayOfMonToSunWeek(this DateTime currentDate)
        {
            return currentDate.DayOfWeek switch
            {
                DayOfWeek.Monday => DayOfMonToSunWeek.Monday,
                DayOfWeek.Tuesday => DayOfMonToSunWeek.Tuesday,
                DayOfWeek.Wednesday => DayOfMonToSunWeek.Wednesday,
                DayOfWeek.Thursday => DayOfMonToSunWeek.Thursday,
                DayOfWeek.Friday => DayOfMonToSunWeek.Friday,
                DayOfWeek.Saturday => DayOfMonToSunWeek.Saturday,
                DayOfWeek.Sunday => DayOfMonToSunWeek.Sunday,
                _ => throw new ArgumentException()
            };
        }

        public static DateTime ConvertToTimeZone(this DateTime dateTime, int timeZoneOffset)
        {
            return dateTime.ToUniversalTime().AddHours(-timeZoneOffset / 60);
        }

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
}
