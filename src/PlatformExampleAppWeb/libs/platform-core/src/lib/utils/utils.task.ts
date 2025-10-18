/* eslint-disable @typescript-eslint/no-explicit-any */
import { asyncScheduler, Observable, of, pipe, Subscription } from 'rxjs';
import { delay as rxjs_delay, filter as rxjs_filter, takeUntil as rxjs_takeUntil } from 'rxjs/operators';

export function task_delay(callback: () => void, delayTimeMilliseconds?: number, cancelOnFirstTrueValue$?: Observable<boolean>): Subscription {
    if (typeof delayTimeMilliseconds === 'number' && delayTimeMilliseconds <= 0) {
        callback();
        return new Subscription();
    }

    const delayObs = pipe(
        cancelOnFirstTrueValue$ != null ? rxjs_takeUntil(cancelOnFirstTrueValue$?.pipe(rxjs_filter(x => x == true))) : (obs: Observable<unknown>) => obs,
        rxjs_delay(delayTimeMilliseconds ?? 10, asyncScheduler)
    );
    return delayObs(of({})).subscribe(() => {
        callback();
    });
}

export function task_debounce(func: (...args: any[]) => void, debounceTimeMs: number): (...args: any[]) => number | undefined {
    if (debounceTimeMs <= 0) {
        return (...args: any[]) => {
            func(args);

            return undefined;
        };
    }

    let timeout: number;
    return (...args: any[]) => {
        clearTimeout(timeout);
        timeout = <number>(<any>setTimeout(() => func(args), debounceTimeMs));

        return timeout;
    };
}

export function task_interval(func: (...args: any[]) => void, intervalMs: number): (...args: any[]) => number | undefined {
    if (intervalMs <= 0) {
        return (...args: any[]) => {
            func(args);

            return undefined;
        };
    }

    let interval: number;
    return (...args: any[]) => {
        clearInterval(interval);
        interval = <number>(<any>setInterval(() => func(args), intervalMs));

        return interval;
    };
}
