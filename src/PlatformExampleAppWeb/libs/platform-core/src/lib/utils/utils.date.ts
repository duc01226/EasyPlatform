import dayjs, { Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

import { Time } from '../../lib/common-types';
import { MONTH, MONTH_DISPLAY, WEEKDAY, WORKING_TIME_DAY_DISPLAY } from '../common-values/weekdays.const';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(quarterOfYear);
dayjs.extend(isoWeek);

// Type alias for backwards compatibility
export type Moment = Dayjs;

export function date_setHours(date: Date, hours: number): Date {
    return new Date(new Date(date).setHours(hours));
}

export function date_setToEndOfDay(date: Date): Date {
    return new Date(new Date(date).setHours(23, 59, 59, 0));
}

/**
 * Sets date to end of day (23:59:59) in UTC. May shift to next day depending on timezone.
 * @example date_setToEndOfDayUTC(new Date('2023-01-01')) // Could be 2023-01-02 in UTC if in negative offset timezone
 */
export function date_setToEndOfDayUTC(date: Date): Date {
    return date_toUTCTime(date_setToEndOfDay(date));
}

export function date_getStartOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Gets the first day of the month in UTC. May shift to previous month depending on timezone.
 * @example date_getStartOfMonthUTC(new Date('2023-01-15')) // Could be 2022-12-31 in UTC if in positive offset timezone
 */
export function date_getStartOfMonthUTC(date: Date): Date {
    return date_toUTCTime(date_getStartOfMonth(date));
}

export function date_getEndOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Gets the last day of the month in UTC. May shift to next month depending on timezone.
 * @example date_getEndOfMonthUTC(new Date('2023-01-15')) // Could be 2023-02-01 in UTC if in negative offset timezone
 */
export function date_getEndOfMonthUTC(date: Date): Date {
    return date_toUTCTime(date_getEndOfMonth(date));
}

export function date_setToStartOfDay(date: Date): Date {
    return new Date(new Date(date).setHours(0, 0, 0, 0));
}

/**
 * Sets date to start of day (00:00:00) in UTC. May shift to previous day depending on timezone.
 * @example date_setToStartOfDayUTC(new Date('2023-01-01 15:30')) // Could be 2022-12-31 in UTC if in positive offset timezone
 */
export function date_setToStartOfDayUTC(date: Date): Date {
    return date_toUTCTime(date_setToStartOfDay(date));
}

export function date_setToMiddleOfDay(date: Date): Date {
    return new Date(new Date(date).setHours(12, 0, 0, 0));
}

/**
 * Sets date to middle of day (12:00:00) in UTC. May shift to different day depending on timezone.
 * @example date_setToMiddleOfDayUTC(new Date('2023-01-01')) // Could be 2022-12-31 or 2023-01-02 in UTC depending on timezone
 */
export function date_setToMiddleOfDayUTC(date: Date): Date {
    return date_toUTCTime(date_setToMiddleOfDay(date));
}

export function date_getStartOfYear(date: Date): Date {
    return new Date(date.getFullYear(), 0, 1);
}

export function date_daysInRange(startDate: Date, stopDate: Date): Date[] {
    const dateArray: Date[] = [];
    let currentDate: Date = new Date(startDate);
    while (currentDate <= stopDate) {
        dateArray.push(new Date(currentDate));
        currentDate = dayjs(currentDate).add(1, 'day').toDate();
    }

    return dateArray;
}

export function date_countDaysToNow(value: Date): number {
    const diff: number = Date.now() - new Date(value).getTime();
    return Math.floor(diff / (60 * 60 * 24 * 1000));
}

export function date_countDaysFromNow(value: Date): number {
    const diff: number = new Date(value).getTime() - Date.now();
    return Math.floor(diff / (60 * 60 * 24 * 1000));
}

export function date_countWeeksFromNow(value: Date): number {
    const present = new Date();
    const date = new Date(value);
    const diff = dayjs(date).diff(dayjs(present), 'week', true);
    return Math.floor(diff);
}

export function date_countMonthsFromNow(value: Date): number {
    const present = new Date();
    const date = new Date(value);
    const diff = dayjs(date).diff(dayjs(present), 'month', true);
    return Math.floor(diff);
}

export function date_addYear(date: Date, year: number): Date {
    const newDate = new Date(date); // Create a copy
    newDate.setFullYear(newDate.getFullYear() + year);
    return newDate;
}

export function date_getDurationInfo(miliseconds: number): {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
} {
    const secondsForOneDay = 60 * 60 * 24;
    const secondsForOneHour = 60 * 60;
    const secondsForOneMinute = 60;

    const totalSecondDiff = Math.round(miliseconds / 1000);
    const days = miliseconds <= 0 ? 0 : Math.floor(totalSecondDiff / secondsForOneDay);

    const totalHoursSecondDiff = totalSecondDiff - days * secondsForOneDay;
    const hours = miliseconds <= 0 ? 0 : Math.floor(totalHoursSecondDiff / secondsForOneHour);

    const totalMinutesSecondDiff = totalHoursSecondDiff - hours * secondsForOneHour;
    const minutes = miliseconds <= 0 ? 0 : Math.floor(totalMinutesSecondDiff / secondsForOneMinute);

    const seconds = miliseconds <= 0 ? 0 : totalMinutesSecondDiff - minutes * secondsForOneMinute;
    return { days: days, hours: hours, minutes: minutes, seconds: seconds };
}

export function date_removeTime(date: Date | null): Date {
    if (date == null) {
        date = new Date();
    }
    return new Date(new Date(date).toDateString());
}

export function date_compareDate(firstDate: Date, secondDate: Date, includeTime: boolean = true): number {
    const toCompareFirstDate = includeTime ? firstDate : date_removeTime(firstDate);
    const toCompareSecondDate = includeTime ? secondDate : date_removeTime(secondDate);
    if (toCompareFirstDate.getTime() === toCompareSecondDate.getTime()) {
        return 0;
    }
    if (toCompareFirstDate.getTime() > toCompareSecondDate.getTime()) {
        return 1;
    }
    return -1;
}

export function date_compareOnlyDay(firstDate: Date, secondDate: Date): number {
    const toCompareFirstDate = date_setToStartOfDay(firstDate).getTime();
    const toCompareSecondDate = date_setToStartOfDay(secondDate).getTime();
    if (toCompareFirstDate === toCompareSecondDate) {
        return 0;
    }
    if (toCompareFirstDate > toCompareSecondDate) {
        return 1;
    }
    return -1;
}

/**
 * Compare two dates without times and return diff in days.
 * @param startDate first date
 * @param endDate second date
 * @param floor round down or not
 */
export function date_dayDiffs(startDate?: Date, endDate?: Date, floor: boolean = true): number {
    const firstDate = startDate != null ? new Date(startDate) : new Date();
    const secondDate = endDate != null ? new Date(endDate) : new Date();
    firstDate.setHours(0, 0, 0, 0);
    secondDate.setHours(0, 0, 0, 0);
    const diffDays: number = (secondDate.getTime() - firstDate.getTime()) / (1000 * 3600 * 24);
    return floor ? Math.floor(diffDays) : diffDays;
}

export function date_compareOnlyTime(firstDate: Date, secondDate: Date): number {
    if (secondDate != null && firstDate != null) {
        const secondHour = secondDate.getHours();
        const firstHour = firstDate.getHours();
        if (secondHour < firstHour) {
            return 1;
        } else if (secondHour === firstHour && secondDate.getMinutes() < firstDate.getMinutes()) {
            return 1;
        } else if (secondHour === firstHour && secondDate.getMinutes() === firstDate.getMinutes()) {
            return 0;
        }
    }
    return -1;
}

export function date_isInRange(start: Date, end: Date, date: Date, includeTime: boolean = true): boolean {
    return date_compareDate(start, date, includeTime) <= 0 && date_compareDate(date, end, includeTime) <= 0;
}

export function date_addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60000);
}

export function date_addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function date_addMonths(date: Date, months: number): Date {
    const result = new Date(date.getTime());

    result.setMonth(date.getMonth() + months);

    return result;
}

export function date_now(): Date {
    return new Date();
}

export function date_startOfToday(): Date {
    const now = date_now();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
}

/**
 * Gets the start of today (00:00:00) in UTC. May shift to yesterday depending on timezone.
 * @example date_startOfTodayUTC() // If today is Jan 1 locally, could be Dec 31 in UTC if in positive offset timezone
 */
export function date_startOfTodayUTC(): Date {
    return date_toUTCTime(date_startOfToday());
}

export function date_endOfToday(): Date {
    const now = date_now();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
}

/**
 * Gets the end of today (23:59:59) in UTC. May shift to tomorrow depending on timezone.
 * @example date_endOfTodayUTC() // If today is Jan 1 locally, could be Jan 2 in UTC if in negative offset timezone
 */
export function date_endOfTodayUTC(): Date {
    return date_toUTCTime(date_endOfToday());
}

export function date_startOfYear(year?: number): Date {
    if (year == null) {
        return new Date(date_now().getFullYear(), 0, 1, 0, 0, 1, 0);
    }
    return new Date(year, 0, 1, 0, 0, 0, 0);
}

/**
 * Gets the first day of the year (Jan 1) in UTC. May shift to previous year depending on timezone.
 * @example date_startOfYearUTC(2023) // Could be 2022-12-31 in UTC if in positive offset timezone
 */
export function date_startOfYearUTC(year?: number): Date {
    return date_toUTCTime(date_startOfYear(year));
}

export function date_endOfYear(year?: number): Date {
    if (year == null) {
        return new Date(date_now().getFullYear(), 11, 31, 23, 59, 59);
    }
    return new Date(year, 11, 31, 23, 59, 59);
}

/**
 * Gets the last day of the year (Dec 31) in UTC. May shift to next year depending on timezone.
 * @example date_endOfYearUTC(2023) // Could be 2024-01-01 in UTC if in negative offset timezone
 */
export function date_endOfYearUTC(year?: number): Date {
    return date_toUTCTime(date_endOfYear(year));
}

export function date_endOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
}

/**
 * Gets the last moment of the month (23:59:59) in UTC. May shift to next month depending on timezone.
 * @example date_endOfMonthUTC(new Date('2023-01-15')) // Could be 2023-02-01 in UTC if in negative offset timezone
 */
export function date_endOfMonthUTC(date: Date): Date {
    return date_toUTCTime(date_endOfMonth(date));
}

export function date_startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0);
}

/**
 * Gets the first moment of the month (00:00:00) in UTC. May shift to previous month depending on timezone.
 * @example date_startOfMonthUTC(new Date('2023-01-15')) // Could be 2022-12-31 in UTC if in positive offset timezone
 */
export function date_startOfMonthUTC(date: Date): Date {
    return date_toUTCTime(date_startOfMonth(date));
}

export function date_MondayOfWeek(date: Date): Date {
    const lessDays = date.getDay() === 0 ? 6 : date.getDay() - 1;
    return new Date(new Date(date).setDate(date.getDate() - lessDays));
}

export function date_SundayOfWeek(date: Date): Date {
    const moreDays = date.getDay() === 0 ? 0 : 7 - date.getDay();
    return new Date(new Date(date).setDate(date.getDate() + moreDays));
}

export function date_format(date: Date, format: string): string {
    return dayjs(date).format(format);
}

export function date_timeDiff(value1: Date, value2: Date): number {
    return value1.getTime() - value2.getTime();
}

export function date_startOfQuarter(date: Date): Date {
    return dayjs(date).startOf('quarter').toDate();
}

/**
 * Gets the first day of the quarter in UTC. May shift to previous quarter depending on timezone.
 * @example date_startOfQuarterUTC(new Date('2023-04-01')) // Could be 2023-03-31 in UTC if in positive offset timezone
 */
export function date_startOfQuarterUTC(date: Date): Date {
    return date_toUTCTime(date_startOfQuarter(date));
}

export function date_endOfQuarter(date: Date): Date {
    return dayjs(date).endOf('quarter').toDate();
}

/**
 * Gets the last day of the quarter in UTC. May shift to next quarter depending on timezone.
 * @example date_endOfQuarterUTC(new Date('2023-06-30')) // Could be 2023-07-01 in UTC if in negative offset timezone
 */
export function date_endOfQuarterUTC(date: Date): Date {
    return date_toUTCTime(date_endOfQuarter(date));
}

export function date_startOfWeek(date: Date): Date {
    return dayjs(date).startOf('isoWeek').toDate();
}

/**
 * Gets the first day of the ISO week (Monday) in UTC. May shift to previous week depending on timezone.
 * @example date_startOfWeekUTC(new Date('2023-01-02')) // Could be 2022-12-26 in UTC if in positive offset timezone
 */
export function date_startOfWeekUTC(date: Date): Date {
    return date_toUTCTime(date_startOfWeek(date));
}

export function date_endOfWeek(date: Date): Date {
    return dayjs(date).endOf('isoWeek').toDate();
}

/**
 * Gets the last day of the ISO week (Sunday) in UTC. May shift to next week depending on timezone.
 * @example date_endOfWeekUTC(new Date('2023-01-01')) // Could be 2023-01-02 in UTC if in negative offset timezone
 */
export function date_endOfWeekUTC(date: Date): Date {
    return date_toUTCTime(date_endOfWeek(date));
}

export function date_addQuarters(currentDate: Date, numberOfQuarters: number): Date {
    return dayjs(currentDate).add(numberOfQuarters, 'quarter').toDate();
}

export function date_addWeeks(currentDate: Date, numberOfWeeks: number): Date {
    return dayjs(currentDate).add(numberOfWeeks, 'week').toDate();
}

export function date_isDateExist(dateList: Date[], dateToFind: Date): boolean {
    return dateList.some(date => date_compareOnlyDay(dateToFind, date) === 0);
}

export type WeekDays = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

const WEEKDAY_INDEX_MAP: Record<WeekDays, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6
};

export function date_getNextWeekday(date: Date, dayToFind: WeekDays): Date {
    const dayIndex = WEEKDAY_INDEX_MAP[dayToFind];
    const dateCopy = new Date(date.getTime());
    return new Date(dateCopy.setDate(dateCopy.getDate() + ((7 - dateCopy.getDay() + dayIndex) % 7 || 7)));
}

export function date_getDayName(date: Date, shortName?: boolean): string {
    if (date == null) return '';

    const weekDays: string[] = [];
    Object.keys(WEEKDAY).forEach(key => {
        weekDays.push(shortName ? WORKING_TIME_DAY_DISPLAY[key]! : key);
    });

    return weekDays[date.getDay()]!;
}

export function date_getMonthName(date: Date): string {
    if (date == null) return '';

    const months: string[] = [];
    Object.keys(MONTH).forEach(key => {
        months.push(MONTH_DISPLAY[key]!);
    });

    return months[date.getMonth()]!;
}

export function date_getHourAndMinute(date: Date): string {
    if (date == null) return '';

    const hours = date.getHours();
    const minutes = date.getMinutes();

    return `${hours < 10 ? '0' + hours : hours}:${minutes < 10 ? '0' + minutes : minutes}`;
}

/**
 * Converts a local date to UTC by adjusting for timezone offset.
 * Note: This can shift the date value (e.g., from Jan 1 to Dec 31) when crossing day boundaries.
 *
 * @param date - The local date to convert to UTC
 * @returns A new Date object with UTC time values
 *
 * @example
 * // If local timezone is UTC+7 and date is 2023-01-01 02:00:00 local time
 * const localDate = new Date(2023, 0, 1, 2, 0, 0);
 * const utcDate = date_toUTCTime(localDate);
 * // utcDate will be 2022-12-31 19:00:00 UTC (shifted to previous day)
 */
export function date_toUTCTime(date: Date): Date {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000);
}

export function date_ordinalSuffix(d: number) {
    if (d > 3 && d < 21) return d + 'th';

    switch (d % 10) {
        case 1:
            return d + 'st';
        case 2:
            return d + 'nd';
        case 3:
            return d + 'rd';
        default:
            return d + 'th';
    }
}

export function date_remainingDaysUntilToday(inputDateValue: string | Date): number {
    const inputDate = new Date(inputDateValue);
    inputDate.setHours(0, 0, 0, 0);

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    // The timeDifference variable represents the difference between two timestamps in milliseconds. By dividing timeDifference by 1000, we are converting the time difference from milliseconds to seconds.
    const timeDifference = inputDate.getTime() - currentDate.getTime();
    const remainingDays = Math.floor(timeDifference / (1000 * 60 * 60 * 24));

    return remainingDays;
}

export function date_setTime(date: Date, time: Time): Date {
    return new Date(new Date(date).setHours(time.hour, time.minute));
}

/**
 * Return timezone offset of local in hours
 */
export function date_localTimeZoneOffset(): number {
    return -(new Date().getTimezoneOffset() / 60);
}

export function date_convertToTimeZone(date: Date, timeZone: string): Dayjs {
    // Convert the date to the target timezone using dayjs-timezone
    const convertedDate = dayjs(date).tz(timeZone);
    return convertedDate;
}
