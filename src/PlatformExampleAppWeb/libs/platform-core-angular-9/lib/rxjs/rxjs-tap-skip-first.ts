import { MonoTypeOperatorFunction, Observable, PartialObserver } from 'rxjs';
import { tap } from 'rxjs/operators';

export function tapSkipFirst<T>(observerOrNext: PartialObserver<T> | ((value: T) => void)): MonoTypeOperatorFunction<T> {
    let tappedOnce = false;

    return (source: Observable<T>): Observable<T> =>
        source.pipe(
            tap({
                next: value => {
                    if (tappedOnce) {
                        if (typeof observerOrNext == 'function') observerOrNext(value);
                        else if (observerOrNext.next != undefined) observerOrNext.next(value);
                    }
                    tappedOnce = true;
                },
                error: error => {
                    if (tappedOnce && typeof observerOrNext != 'function' && observerOrNext.error != undefined) observerOrNext.error(error);
                    tappedOnce = true;
                },
                complete: () => {
                    if (tappedOnce && typeof observerOrNext != 'function' && observerOrNext.complete != undefined) observerOrNext.complete();
                    tappedOnce = true;
                }
            })
        );
}
