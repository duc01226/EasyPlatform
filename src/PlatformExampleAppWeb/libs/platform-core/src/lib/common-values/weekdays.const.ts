/**
 * @fileoverview Date and Time Constants
 *
 * This module provides standardized constants for working with dates, weekdays, and months.
 * All constants follow JavaScript's Date object conventions for consistency and compatibility.
 */

/**
 * Weekday constants mapped to JavaScript Date.getDay() values.
 *
 * @remarks
 * These constants follow JavaScript's Date object convention where Sunday = 0.
 * This ensures compatibility with native Date methods and provides a consistent
 * reference for weekday operations throughout the platform.
 *
 * **JavaScript Date Compatibility:**
 * - Sunday = 0 (Date.getDay() returns 0 for Sunday)
 * - Monday = 1 (Date.getDay() returns 1 for Monday)
 * - And so on through Saturday = 6
 *
 * **Common Use Cases:**
 * - Converting date objects to readable weekday names
 * - Business logic for working days vs weekends
 * - Calendar and scheduling operations
 * - Time-based access control and validation
 *
 * @example
 * **Working with Date objects:**
 * ```typescript
 * const today = new Date();
 * const dayNumber = today.getDay(); // 0-6
 *
 * // Find weekday name
 * const dayName = Object.keys(WEEKDAY).find(key => WEEKDAY[key] === dayNumber);
 * console.log(`Today is ${dayName}`); // "Today is Monday"
 * ```
 *
 * @example
 * **Business hours validation:**
 * ```typescript
 * const isWorkingDay = (date: Date): boolean => {
 *   const dayOfWeek = date.getDay();
 *   return dayOfWeek >= WEEKDAY.Monday && dayOfWeek <= WEEKDAY.Friday;
 * };
 *
 * const isWeekend = (date: Date): boolean => {
 *   const dayOfWeek = date.getDay();
 *   return dayOfWeek === WEEKDAY.Saturday || dayOfWeek === WEEKDAY.Sunday;
 * };
 * ```
 */
// WEEKDAY ORDER BY JAVASCRIPT DATETIME DEFAULT
export const WEEKDAY: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6
};

/**
 * Abbreviated weekday names for compact display purposes.
 *
 * @remarks
 * These shortened forms are commonly used in:
 * - Calendar widgets and date pickers
 * - Mobile interfaces with limited space
 * - Data tables and reports
 * - Time tracking and scheduling interfaces
 *
 * **Display Standards:**
 * - Uses standard 3-letter abbreviations
 * - Consistent capitalization (first letter uppercase)
 * - Internationally recognized abbreviations
 *
 * @example
 * **Calendar header display:**
 * ```typescript
 * const calendarHeaders = Object.values(WORKING_TIME_DAY_DISPLAY);
 * // Result: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
 *
 * // Render calendar header
 * calendarHeaders.forEach(day => {
 *   console.log(`<th>${day}</th>`);
 * });
 * ```
 *
 * @example
 * **Working schedule display:**
 * ```typescript
 * const workingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
 * const abbreviatedSchedule = workingDays.map(day => WORKING_TIME_DAY_DISPLAY[day]);
 * console.log(abbreviatedSchedule.join(' - ')); // "Mon - Tue - Wed - Thu - Fri"
 * ```
 */
export const WORKING_TIME_DAY_DISPLAY: Record<string, string> = {
    Monday: 'Mon',
    Tuesday: 'Tue',
    Wednesday: 'Wed',
    Thursday: 'Thu',
    Friday: 'Fri',
    Saturday: 'Sat',
    Sunday: 'Sun'
};

/**
 * Month constants mapped to JavaScript Date.getMonth() values.
 *
 * @remarks
 * These constants follow JavaScript's Date object convention where January = 0.
 * This ensures compatibility with Date methods and provides consistent month
 * references throughout the platform.
 *
 * **JavaScript Date Compatibility:**
 * - January = 0 (Date.getMonth() returns 0 for January)
 * - February = 1 (Date.getMonth() returns 1 for February)
 * - And so on through December = 11
 *
 * **Common Use Cases:**
 * - Converting date objects to readable month names
 * - Date manipulation and calculation
 * - Report generation with month-based grouping
 * - Calendar and scheduling operations
 *
 * @example
 * **Date to month name conversion:**
 * ```typescript
 * const date = new Date('2024-03-15');
 * const monthNumber = date.getMonth(); // 2 (March is index 2)
 *
 * // Find month name
 * const monthName = Object.keys(MONTH).find(key => MONTH[key] === monthNumber);
 * console.log(`Month: ${monthName}`); // "Month: March"
 * ```
 *
 * @example
 * **Financial quarter calculation:**
 * ```typescript
 * const getQuarter = (date: Date): number => {
 *   const month = date.getMonth();
 *   return Math.floor(month / 3) + 1;
 * };
 *
 * const isEndOfQuarter = (date: Date): boolean => {
 *   const month = date.getMonth();
 *   return month === MONTH.March || month === MONTH.June ||
 *          month === MONTH.September || month === MONTH.December;
 * };
 * ```
 */
export const MONTH: Record<string, number> = {
    January: 0,
    February: 1,
    March: 2,
    April: 3,
    May: 4,
    June: 5,
    July: 6,
    August: 7,
    September: 8,
    October: 9,
    November: 10,
    December: 11
};

/**
 * Full month names for display purposes.
 *
 * @remarks
 * These full month names are used when space allows for complete names
 * rather than abbreviations. They provide a more formal and readable
 * display option for reports, forms, and user interfaces.
 *
 * **Usage Guidelines:**
 * - Use for formal reports and documents
 * - Ideal for dropdown selectors and forms
 * - Appropriate for printed materials
 * - Better for accessibility and screen readers
 *
 * @example
 * **Month selector dropdown:**
 * ```typescript
 * const monthOptions = Object.entries(MONTH_DISPLAY).map(([name, display]) => ({
 *   value: MONTH[name],
 *   label: display
 * }));
 *
 * // Generates options like:
 * // { value: 0, label: 'January' }
 * // { value: 1, label: 'February' }
 * // etc.
 * ```
 *
 * @example
 * **Report header formatting:**
 * ```typescript
 * const formatReportTitle = (date: Date): string => {
 *   const monthNumber = date.getMonth();
 *   const year = date.getFullYear();
 *
 *   const monthName = Object.keys(MONTH).find(key => MONTH[key] === monthNumber);
 *   const displayName = MONTH_DISPLAY[monthName!];
 *
 *   return `${displayName} ${year} Sales Report`;
 * };
 * ```
 *
 * @example
 * **Date formatting for user display:**
 * ```typescript
 * const formatUserFriendlyDate = (date: Date): string => {
 *   const day = date.getDate();
 *   const monthNumber = date.getMonth();
 *   const year = date.getFullYear();
 *
 *   const monthName = Object.keys(MONTH).find(key => MONTH[key] === monthNumber);
 *   const displayName = MONTH_DISPLAY[monthName!];
 *
 *   return `${displayName} ${day}, ${year}`; // "March 15, 2024"
 * };
 * ```
 */
export const MONTH_DISPLAY: Record<string, string> = {
    January: 'January',
    February: 'February',
    March: 'March',
    April: 'April',
    May: 'May',
    June: 'June',
    July: 'July',
    August: 'August',
    September: 'September',
    October: 'October',
    November: 'November',
    December: 'December'
};
