using System.Globalization;
using Easy.Platform.Common.Extensions;

namespace Easy.Platform.Common.Utils;

public static partial class Util
{
    /// <summary>
    /// Provides utility methods for parsing and converting date and time values.
    /// </summary>
    public static class DateTimeParser
    {
        /// <summary>
        /// Default supported date-only formats.
        /// </summary>
        /// <remarks>
        /// Single-digit day/month variants are declared EXPLICITLY. TryParseExact does not treat "dd" as also
        /// matching "1", so without them a day-first value like "1/6/2026" missed this list entirely and fell
        /// through to the InvariantCulture general parse — which is MONTH-first, and therefore read it as
        /// 6 January: the exact transposition this contract exists to prevent, inverted by the fallback.
        /// That shape is live in the system (the employee CSV importer declares "d/M/yyyy" among its own
        /// accepted formats), so omitting it here made the two lists disagree about the same cell.
        /// ISO forms stay FIRST: they are unambiguous, so matching them before any day-first form costs nothing
        /// and keeps a full ISO date from ever being reinterpreted.
        /// </remarks>
        public static readonly string[] DefaultSupportDateOnlyFormats =
        [
            "yyyy/MM/dd",
            "yyyy-MM-dd",
            "dd/MM/yyyy",
            "d/M/yyyy",
            "dd/M/yyyy",
            "d/MM/yyyy",
            "dd-MM-yyyy",
            "d-M-yyyy",
            "dd-M-yyyy",
            "d-MM-yyyy"
        ];

        /// <summary>
        /// Parses the specified string value into a <see cref="DateTimeOffset" /> instance.
        /// </summary>
        /// <param name="value">The string representation of the date and time.</param>
        /// <returns>
        /// A <see cref="DateTimeOffset" /> instance representing the parsed date and time.
        /// Returns <c>null</c> if the input string is empty or null, or if parsing fails.
        /// </returns>
        public static DateTimeOffset? ParseDateTimeOffset(string value)
        {
            if (value.IsNullOrEmpty()) return null;

            // Mirrors Parse: the declared day-first format contract is tried FIRST, then a culture-pinned general
            // parse. Previously this called DateTimeOffset.TryParse with no IFormatProvider, so the ambient
            // CultureInfo.CurrentCulture decided the result — an ambiguous value like "01/06/2026" became
            // 6 January on a month-first host (en-US, ja-JP) and 1 June elsewhere. Pinning alone is not enough:
            // Invariant is itself month-first, so it would lock in 6 January everywhere. The exact list must come
            // first for the day-first contract to hold.
            if (DateTime.TryParseExact(
                value,
                DefaultSupportDateOnlyFormats,
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var tryParseExactValue))
                return new DateTimeOffset(DateTime.SpecifyKind(tryParseExactValue, DateTimeKind.Utc));

            return DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dateTimeOffsetValue)
                ? dateTimeOffsetValue
                : null;
        }

        /// <summary>
        /// Parses the specified string value into a <see cref="DateTime" /> instance.
        /// </summary>
        /// <param name="value">The string representation of the date and time.</param>
        /// <returns>
        /// A <see cref="DateTime" /> instance representing the parsed date and time.
        /// Returns <c>null</c> if the input string is empty or null, or if parsing fails.
        /// </returns>
        public static DateTime? Parse(string value)
        {
            if (value.IsNullOrEmpty()) return null;

            // The explicit format contract MUST be tried BEFORE the general parse. DefaultSupportDateOnlyFormats
            // declares "dd/MM/yyyy" (day-first), but DateTime.TryParse without an IFormatProvider uses the ambient
            // CultureInfo.CurrentCulture — so under a month-first culture (en-US) it CLAIMS an ambiguous value like
            // "01/06/2026" and returns Jan 6 instead of Jun 1, making the declared day-first list unreachable for
            // exactly the values where day/month cannot be told apart (both components <= 12). That silently
            // transposed the stored date. Ordering the exact list first makes the declared contract authoritative
            // and the result independent of whichever process/host culture happens to run this code.
            if (DateTime.TryParseExact(
                value,
                DefaultSupportDateOnlyFormats,
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var tryParseExactValue))
                return tryParseExactValue.PipeIf(tryParseExactValue.Kind == DateTimeKind.Unspecified, t => t.SpecifyKind(DateTimeKind.Utc));

            // Fallback for everything the date-only contract does not cover — most importantly full ISO-8601
            // timestamps. Pinned to InvariantCulture so the outcome cannot vary by host culture.
            if (DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out var tryParsedValue))
                return tryParsedValue.PipeIf(tryParsedValue.Kind == DateTimeKind.Unspecified, t => t.SpecifyKind(DateTimeKind.Utc));

            return null;
        }

        /// <summary>
        /// Converts the specified string representation of a date and time to a <see cref="DateTime" /> instance,
        /// using the specified array of formats and the invariant culture.
        /// </summary>
        /// <param name="dateTime">The string representation of the date and time.</param>
        /// <param name="dateTimeFormats">An optional array of formats that defines the expected formats of the input string.</param>
        /// <returns>
        /// A <see cref="DateTime" /> instance representing the parsed date and time.
        /// Returns <c>null</c> if the input string is empty or null, or if parsing fails.
        /// </returns>
        public static DateTime? ToPredefinedDateTimeFormat(string dateTime, string[] dateTimeFormats = null)
        {
            if (dateTime.IsNullOrEmpty()) return null;

            // InvariantCulture, NOT null — the doc comment above always claimed invariant culture, and a null
            // provider silently broke that claim by resolving against the ambient culture's CALENDAR.
            // Probe-verified across en-US/en-GB/vi-VN/de-DE/ja-JP/fa-IR/ar-SA/th-TH:
            //   - Gregorian "/" cultures: null and Invariant are identical.
            //   - fa-IR / th-TH: null produced a DateTime whose real TICKS were the Persian/Buddhist year read as
            //     Gregorian ("2026-06-01" -> ticks at year 2647). It merely LOOKED correct because ToString() then
            //     re-rendered those ticks back through the same non-Gregorian calendar.
            //   - ar-SA: null failed to parse at all.
            // Invariant yields the correct instant (Gregorian 2026-06-01) in every one of those cultures. A value
            // that displays as 1405-03-11 under a Persian-calendar formatter is the SAME instant, only formatted.
            return DateTime.TryParseExact(
                s: dateTime.Trim(),
                dateTimeFormats ?? DefaultSupportDateOnlyFormats,
                provider: CultureInfo.InvariantCulture,
                style: DateTimeStyles.None,
                out var result)
                ? result.PipeIf(result.Kind == DateTimeKind.Unspecified, t => t.SpecifyKind(DateTimeKind.Utc))
                : null;
        }
    }
}
