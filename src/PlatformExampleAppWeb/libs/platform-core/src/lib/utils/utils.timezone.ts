import dayjs from 'dayjs/esm/index.js';
import timezone from 'dayjs/esm/plugin/timezone/index.js';
import utc from 'dayjs/esm/plugin/utc/index.js';

dayjs.extend(utc);
dayjs.extend(timezone);

export function timezone_getCurrentTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || dayjs.tz.guess();
}

export function timezone_getCurrentTimezoneWithLocalTime() {
    return `${dayjs().tz(timezone_getCurrentTimezone()).format('Z')} ${timezone_getCurrentTimezone()}`;
}
