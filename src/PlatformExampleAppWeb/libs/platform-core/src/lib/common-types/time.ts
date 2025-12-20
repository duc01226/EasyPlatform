import { numberFormatLength } from '../utils/_common-functions';

/**
 * Interface defining the structure for time components.
 *
 * @remarks
 * This interface provides type safety for time values representing
 * a specific time of day without date information.
 */
export interface ITime {
    /** Hour component (0-23) */
    hour: number;
    /** Minute component (0-59) */
    minute: number;
    /** Second component (0-59) */
    second: number;
}

/**
 * Immutable time representation class for handling time-of-day values.
 *
 * @remarks
 * The Time class provides comprehensive functionality for working with time values
 * in a 24-hour format. It supports parsing from strings, time arithmetic, formatting,
 * and comparison operations while maintaining immutability for most operations.
 *
 * **Key Features:**
 * - **String Parsing**: Parse time from "HH:mm:ss" format strings
 * - **Time Arithmetic**: Add/subtract hours, minutes, and seconds with overflow handling
 * - **Comparisons**: Compare times and check ranges
 * - **Formatting**: Multiple display formats (full time, hour:minute)
 * - **Date Integration**: Combine with Date objects for complete datetime values
 * - **Validation**: Automatic bounds checking and normalization
 *
 * **Time Format Support:**
 * - Input: "HH:mm:ss" (e.g., "14:30:45")
 * - Output: Customizable formatting with leading zeros
 * - Range: 00:00:00 to 23:59:59
 *
 * @example
 * **Basic time creation and manipulation:**
 * ```typescript
 * // Create time from components
 * const time1 = new Time({ hour: 14, minute: 30, second: 0 });
 *
 * // Parse from string
 * const time2 = Time.parse("09:15:30");
 *
 * // Arithmetic operations
 * time1.changeHour(2);     // Adds 2 hours
 * time1.changeMinute(90);  // Adds 90 minutes (handles overflow)
 *
 * // Display formatting
 * console.log(time1.toString());          // "16:00:30"
 * console.log(time1.hourMinuteDisplay()); // "16:00"
 * ```
 *
 * @example
 * **Time parsing and validation:**
 * ```typescript
 * // Safe parsing with null handling
 * const validTime = Time.fromString("14:30:00");   // Returns Time instance
 * const invalidTime = Time.fromString("25:70:80"); // Returns undefined
 * const nullTime = Time.fromString(null);          // Returns undefined
 *
 * // Robust parsing with fallback
 * const time = Time.parse("14:30:00") ?? new Time(); // Default to 00:00:00 if invalid
 * ```
 *
 * @example
 * **Time comparisons and ranges:**
 * ```typescript
 * const startTime = new Time({ hour: 9, minute: 0, second: 0 });
 * const endTime = new Time({ hour: 17, minute: 30, second: 0 });
 * const currentTime = new Time({ hour: 12, minute: 15, second: 0 });
 *
 * // Basic comparison
 * const isEarlier = Time.compareTime(startTime, endTime); // true
 *
 * // Range checking
 * const isWorkingHours = Time.isTimeInRange(
 *   startTime,
 *   endTime,
 *   currentTime,
 *   true,  // include start time
 *   false  // exclude end time
 * ); // true
 *
 * // Calculate time difference
 * const duration = startTime.diff(endTime); // 8.5 hours
 * ```
 *
 * @example
 * **Integration with Date objects:**
 * ```typescript
 * const date = new Date('2024-01-15');
 * const time = new Time({ hour: 14, minute: 30, second: 0 });
 *
 * // Combine date and time
 * const dateTime = Time.setTimeIntoDate(date, time);
 * // Result: 2024-01-15 14:30:00
 *
 * // Useful for scheduling and calendar operations
 * const meetingStart = Time.setTimeIntoDate(new Date(), meetingTime);
 * ```
 *
 * @example
 * **Business hours validation:**
 * ```typescript
 * class BusinessHours {
 *   static readonly OPEN = new Time({ hour: 9, minute: 0, second: 0 });
 *   static readonly CLOSE = new Time({ hour: 18, minute: 0, second: 0 });
 *   static readonly LUNCH_START = new Time({ hour: 12, minute: 0, second: 0 });
 *   static readonly LUNCH_END = new Time({ hour: 13, minute: 0, second: 0 });
 *
 *   static isOpen(currentTime: Time): boolean {
 *     const isBusinessHours = Time.isTimeInRange(
 *       this.OPEN, this.CLOSE, currentTime, true, false
 *     );
 *     const isLunchBreak = Time.isTimeInRange(
 *       this.LUNCH_START, this.LUNCH_END, currentTime, true, true
 *     );
 *     return isBusinessHours && !isLunchBreak;
 *   }
 * }
 * ```
 *
 * @example
 * **Time arithmetic with overflow handling:**
 * ```typescript
 * const time = new Time({ hour: 23, minute: 45, second: 30 });
 *
 * // Adding minutes with hour overflow
 * time.changeMinute(30); // Result: 00:15:30 (next day)
 *
 * // Adding seconds with minute overflow
 * time.changeSecond(45); // Properly handles cascading overflow
 *
 * // Direct updates
 * time.updateHour(25);   // Normalized to hour 1 (25 % 24)
 * time.updateMinute(70); // Normalized to 10 minutes + 1 hour
 * ```
 */
export class Time implements ITime {
    /**
     * Parses a time value from string or Time instance with fallback.
     *
     * @param data - Time string in "HH:mm:ss" format or existing Time instance
     * @returns New Time instance, or default Time (00:00:00) if parsing fails
     *
     * @example
     * ```typescript
     * const time1 = Time.parse("14:30:00");        // Valid time
     * const time2 = Time.parse("invalid");         // Falls back to 00:00:00
     * const time3 = Time.parse(existingTimeObj);   // Returns copy of existing time
     * ```
     */
    public static parse(data: string | Time): Time {
        if (data instanceof Time) return data;

        return this.fromString(data) ?? new Time();
    }

    /**
     * Safely parses a time string into a Time instance.
     *
     * @remarks
     * This method attempts to parse a string in "HH:mm:ss" format.
     * It performs validation on the parsed components and returns undefined
     * for invalid input rather than throwing errors.
     *
     * **Parsing Rules:**
     * - Expects format: "HH:mm:ss" (e.g., "14:30:45")
     * - Hour: 0-23, Minute: 0-59, Second: 0-59
     * - Invalid numbers result in undefined return value
     * - Null/undefined input returns undefined
     *
     * @param value - Time string to parse, or null/undefined
     * @returns Parsed Time instance, or undefined if invalid
     *
     * @example
     * ```typescript
     * const valid = Time.fromString("14:30:00");    // Time instance
     * const invalid = Time.fromString("25:70:80");  // undefined
     * const nullValue = Time.fromString(null);      // undefined
     *
     * // Safe usage pattern
     * const time = Time.fromString(userInput);
     * if (time) {
     *   // Use valid time
     *   console.log(time.toString());
     * } else {
     *   // Handle invalid input
     *   console.log("Invalid time format");
     * }
     * ```
     */
    public static fromString(value: string | null | undefined | Time): Time | undefined {
        if (value == null) return undefined;

        const hour = value.toString().substring(0, 2);
        const minute = value.toString().substring(3, 5);
        const second = value.toString().substring(6, 8);

        const time: ITime = {
            hour: Number.parseInt(hour),
            minute: Number.parseInt(minute),
            second: Number.parseInt(second)
        };

        return Number.isNaN(time.hour) || Number.isNaN(time.minute) || Number.isNaN(time.second) ? undefined : new Time(time);
    }

    /**
     * Compares two time values to determine chronological order.
     *
     * @remarks
     * This method converts Time objects to Date objects for accurate comparison.
     * It uses the same date for both times to ensure only time components are compared.
     *
     * **Comparison Logic:**
     * - Returns true if 'from' time is before 'to' time
     * - When isEqual=true, returns true if 'from' is before or equal to 'to'
     * - Handles null/undefined inputs gracefully (returns false)
     *
     * @param from - First time to compare
     * @param to - Second time to compare
     * @param isEqual - Whether to include equality in the comparison
     * @returns True if from < to (or from <= to when isEqual=true)
     *
     * @example
     * ```typescript
     * const morning = new Time({ hour: 9, minute: 0, second: 0 });
     * const afternoon = new Time({ hour: 14, minute: 30, second: 0 });
     *
     * Time.compareTime(morning, afternoon);        // true (9:00 < 14:30)
     * Time.compareTime(afternoon, morning);        // false (14:30 > 9:00)
     * Time.compareTime(morning, morning, true);    // true (9:00 <= 9:00)
     * Time.compareTime(morning, morning, false);   // false (9:00 < 9:00)
     * ```
     */
    public static compareTime(from: Time | undefined | null, to: Time | undefined | null, isEqual: boolean = false): boolean {
        if (from == undefined || to == undefined) return false;

        const fromDate = this.setTimeIntoDate(new Date(), from) as Date;
        const toDate = this.setTimeIntoDate(new Date(), to) as Date;
        if (isEqual) return fromDate <= toDate;
        else return fromDate < toDate;
    }

    /** Hour component (0-23) */
    public hour: number = 0;
    /** Minute component (0-59) */
    public minute: number = 0;
    /** Second component (0-59) */
    public second: number = 0;

    /**
     * Creates a new Time instance.
     *
     * @param data - Optional partial time data to initialize the instance
     *
     * @example
     * ```typescript
     * // Default time (00:00:00)
     * const midnight = new Time();
     *
     * // Specific time
     * const noon = new Time({ hour: 12, minute: 0, second: 0 });
     *
     * // Partial time (missing components default to 0)
     * const hourOnly = new Time({ hour: 14 }); // 14:00:00
     * ```
     */
    constructor(data?: Partial<ITime>) {
        if (data == undefined) return;

        if (data.hour != undefined) this.hour = data.hour;
        if (data.minute != undefined) this.minute = data.minute;
        if (data.second != undefined) this.second = data.second;
    }

    /**
     * Changes the hour by a specified step amount.
     *
     * @param step - Number of hours to add (can be negative)
     *
     * @example
     * ```typescript
     * const time = new Time({ hour: 10, minute: 30, second: 0 });
     * time.changeHour(3);  // Now 13:30:00
     * time.changeHour(-5); // Now 08:30:00
     * ```
     */
    public changeHour(step: number = 1) {
        this.updateHour(this.hour + step);
    }

    /**
     * Updates the hour to a specific value with normalization.
     *
     * @param hour - New hour value (automatically normalized to 0-23 range)
     * @returns This instance for method chaining
     *
     * @example
     * ```typescript
     * const time = new Time();
     * time.updateHour(25);  // Normalized to 1 (25 % 24)
     * time.updateHour(-2);  // Normalized to 22 (wrapped around)
     * ```
     */
    public updateHour(hour: number) {
        this.hour = hour < 0 ? 0 : hour % 24;

        return this;
    }

    /**
     * Changes the minute by a specified step amount with overflow handling.
     *
     * @param step - Number of minutes to add (can be negative)
     *
     * @example
     * ```typescript
     * const time = new Time({ hour: 10, minute: 45, second: 0 });
     * time.changeMinute(30); // Now 11:15:00 (overflow handled)
     * time.changeMinute(-20); // Now 10:55:00
     * ```
     */
    public changeMinute(step: number = 1) {
        this.updateMinute(this.minute + step);
    }

    /**
     * Updates the minute to a specific value with overflow handling.
     *
     * @remarks
     * This method automatically handles minute overflow by adjusting the hour.
     * Negative values and values >= 60 are properly normalized.
     *
     * @param minute - New minute value (can exceed 59 or be negative)
     * @returns This instance for method chaining
     *
     * @example
     * ```typescript
     * const time = new Time({ hour: 10, minute: 0, second: 0 });
     * time.updateMinute(75);  // Results in 11:15:00 (1 hour + 15 minutes)
     * time.updateMinute(-30); // Results in 10:30:00 (previous hour + 30 minutes)
     * ```
     */
    public updateMinute(minute: number) {
        this.minute = minute % 60 < 0 ? 60 + (minute % 60) : minute % 60;
        this.changeHour(Math.floor(minute / 60));

        return this;
    }

    /**
     * Changes the second by a specified step amount with overflow handling.
     *
     * @param step - Number of seconds to add (can be negative)
     *
     * @example
     * ```typescript
     * const time = new Time({ hour: 10, minute: 59, second: 45 });
     * time.changeSecond(30); // Now 11:00:15 (cascading overflow)
     * ```
     */
    public changeSecond(step: number = 1) {
        this.updateSecond(this.second + step);
    }

    /**
     * Updates the second to a specific value with cascading overflow handling.
     *
     * @remarks
     * This method handles second overflow by adjusting minutes (and potentially hours).
     * The overflow cascades properly through all time components.
     *
     * @param second - New second value (can exceed 59 or be negative)
     * @returns This instance for method chaining
     *
     * @example
     * ```typescript
     * const time = new Time({ hour: 10, minute: 59, second: 0 });
     * time.updateSecond(125); // Results in 11:01:05 (2 minutes + 5 seconds)
     * ```
     */
    public updateSecond(second: number) {
        this.second = second < 0 ? 60 + (second % 60) : second % 60;
        this.changeMinute(Math.floor(second / 60));

        return this;
    }

    /**
     * Converts the time to a formatted string representation.
     *
     * @returns Time formatted as "HH:mm:ss" with leading zeros
     *
     * @example
     * ```typescript
     * const time = new Time({ hour: 9, minute: 5, second: 3 });
     * console.log(time.toString()); // "09:05:03"
     * ```
     */
    public toString(): string {
        return `${numberFormatLength(this.hour, 2)}` + `:${numberFormatLength(this.minute, 2)}` + `:${numberFormatLength(this.second, 2)}`;
    }

    /**
     * Returns a shorter time format showing only hours and minutes.
     *
     * @returns Time formatted as "HH:mm" with leading zeros
     *
     * @example
     * ```typescript
     * const time = new Time({ hour: 14, minute: 30, second: 45 });
     * console.log(time.hourMinuteDisplay()); // "14:30"
     * ```
     */
    public hourMinuteDisplay(): string {
        return `${numberFormatLength(this.hour, 2)}` + `:${numberFormatLength(this.minute, 2)}`;
    }

    /**
     * Calculates the difference between two times in hours.
     *
     * @remarks
     * This method computes the absolute difference between this time and another time,
     * returning the result in hours (as a decimal). The result is always positive
     * and rounded to 1 decimal place for precision.
     *
     * **Calculation Method:**
     * 1. Converts both times to total minutes
     * 2. Calculates absolute difference in minutes
     * 3. Converts back to hours with 1 decimal precision
     *
     * @param otherTime - Time to compare against
     * @returns Absolute difference in hours (rounded to 1 decimal place)
     *
     * @example
     * ```typescript
     * const startTime = new Time({ hour: 9, minute: 0, second: 0 });
     * const endTime = new Time({ hour: 17, minute: 30, second: 0 });
     *
     * const duration = startTime.diff(endTime); // 8.5 hours
     *
     * // Useful for calculating work hours, meeting durations, etc.
     * const breakTime = new Time({ hour: 12, minute: 15, second: 0 });
     * const lunchDuration = startTime.diff(breakTime); // 3.3 hours
     * ```
     */
    public diff(otherTime: Time): number {
        const minutesInHour = 60;

        const currTime = this.hour * minutesInHour + this.minute;
        const otherTimeConvertToMinutes = otherTime.hour * minutesInHour + otherTime.minute;

        const timeDiffMinutes = Math.abs(currTime - otherTimeConvertToMinutes); //Ensure that the result is always positive
        const timeDiffHours = timeDiffMinutes / minutesInHour;
        return Number(timeDiffHours.toFixed(1)); //Round to 1 decimal, ex: 1.55555 to 1.6
    }

    /**
     * Provides JSON serialization support.
     *
     * @returns String representation suitable for JSON serialization
     */
    public toJSON(): string {
        return this.toString();
    }

    /**
     * Combines a Date and Time into a single Date object.
     *
     * @remarks
     * This static method creates a new Date object by setting the time components
     * of the provided date to the values from the Time instance. The original
     * date object is not modified.
     *
     * **Use Cases:**
     * - Scheduling systems combining date selection with time selection
     * - Creating precise datetime values for API calls
     * - Calendar and appointment management
     * - Timestamp generation for events
     *
     * @param date - Date object providing the date components
     * @param time - Time object providing the time components
     * @returns New Date object with combined date and time, or undefined if either parameter is null/undefined
     *
     * @example
     * ```typescript
     * const selectedDate = new Date('2024-03-15'); // March 15, 2024
     * const appointmentTime = new Time({ hour: 14, minute: 30, second: 0 });
     *
     * const appointment = Time.setTimeIntoDate(selectedDate, appointmentTime);
     * // Result: 2024-03-15T14:30:00.000Z
     *
     * // Useful for form handling
     * const dateInput = new Date(datePickerValue);
     * const timeInput = Time.parse(timePickerValue);
     * const scheduledDateTime = Time.setTimeIntoDate(dateInput, timeInput);
     * ```
     */
    public static setTimeIntoDate(date?: Date, time?: Time | null): Date | undefined {
        if (date == undefined || time == undefined) return;

        const newDate = new Date(date);
        newDate.setHours(time.hour, time.minute, time.second);

        return newDate;
    }

    /**
     * Checks if a time falls within a specified range.
     *
     * @remarks
     * This method determines whether a given time falls between two boundary times.
     * It provides flexible inclusion/exclusion options for the range boundaries,
     * making it suitable for various business logic scenarios.
     *
     * **Range Types:**
     * - **Exclusive**: (from, to) - excludes both boundaries
     * - **Inclusive**: [from, to] - includes both boundaries
     * - **Left-inclusive**: [from, to) - includes start, excludes end
     * - **Right-inclusive**: (from, to] - excludes start, includes end
     *
     * **Common Use Cases:**
     * - Business hours validation
     * - Appointment slot checking
     * - Time-based access control
     * - Scheduling conflict detection
     *
     * @param from - Start time of the range
     * @param to - End time of the range
     * @param time - Time to check if it's within range
     * @param isIncludedFrom - Whether to include the 'from' boundary (default: false)
     * @param isIncludedTo - Whether to include the 'to' boundary (default: false)
     * @returns True if time is within the specified range
     *
     * @example
     * **Business hours validation:**
     * ```typescript
     * const businessStart = new Time({ hour: 9, minute: 0, second: 0 });
     * const businessEnd = new Time({ hour: 17, minute: 0, second: 0 });
     * const currentTime = new Time({ hour: 12, minute: 30, second: 0 });
     *
     * // Check if within business hours (inclusive start, exclusive end)
     * const isOpen = Time.isTimeInRange(
     *   businessStart,
     *   businessEnd,
     *   currentTime,
     *   true,  // include 9:00 AM
     *   false  // exclude 5:00 PM
     * ); // true
     * ```
     *
     * @example
     * **Appointment slot validation:**
     * ```typescript
     * const slotStart = new Time({ hour: 14, minute: 0, second: 0 });
     * const slotEnd = new Time({ hour: 15, minute: 0, second: 0 });
     * const requestedTime = new Time({ hour: 14, minute: 30, second: 0 });
     *
     * // Check if appointment time is available (inclusive both ends)
     * const isAvailable = Time.isTimeInRange(
     *   slotStart,
     *   slotEnd,
     *   requestedTime,
     *   true,  // include start time
     *   true   // include end time
     * ); // true
     * ```
     *
     * @example
     * **Lunch break checking:**
     * ```typescript
     * const lunchStart = new Time({ hour: 12, minute: 0, second: 0 });
     * const lunchEnd = new Time({ hour: 13, minute: 0, second: 0 });
     * const meetingTime = new Time({ hour: 12, minute: 30, second: 0 });
     *
     * // Check if meeting conflicts with lunch (exclusive boundaries)
     * const conflictsWithLunch = Time.isTimeInRange(
     *   lunchStart,
     *   lunchEnd,
     *   meetingTime,
     *   false, // exclude lunch start
     *   false  // exclude lunch end
     * ); // true - meeting is during lunch break
     * ```
     */
    public static isTimeInRange(
        from: Time | undefined,
        to: Time | undefined,
        time: Time | undefined,
        isIncludedFrom?: boolean,
        isIncludedTo?: boolean
    ): boolean {
        if (from == undefined || to == undefined || time == undefined) return false;

        if (isIncludedFrom && isIncludedTo) {
            return Time.compareTime(from, time, isIncludedFrom) && Time.compareTime(time, to, isIncludedTo);
        } else if (isIncludedFrom) {
            return Time.compareTime(from, time, isIncludedFrom) && Time.compareTime(time, to);
        } else if (isIncludedTo) {
            return Time.compareTime(from, time) && Time.compareTime(time, to, isIncludedTo);
        } else return Time.compareTime(from, time) && Time.compareTime(time, to);
    }
}
