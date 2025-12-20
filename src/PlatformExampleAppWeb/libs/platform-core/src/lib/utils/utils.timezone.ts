import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

export function timezone_getCurrentTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || dayjs.tz.guess();
}

export function timezone_getCurrentTimezoneWithLocalTime() {
    return `${dayjs().tz(timezone_getCurrentTimezone()).format('Z')} ${timezone_getCurrentTimezone()}`;
}
