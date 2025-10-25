import { MonoTypeOperatorFunction, Observable, PartialObserver } from 'rxjs';
import { tap } from 'rxjs/operators';

export function tapLimit<T>(observer: PartialObserver<T>, itemsLimit: number): MonoTypeOperatorFunction<T> {
    let tappedNextCount = 0;
    let tappedError = false;
    let tappedComplete = false;

    return (source: Observable<T>): Observable<T> =>
        source.pipe(
            tap({
                next: value => {
                    if (tappedNextCount < itemsLimit) {
                        if (observer.next != undefined) observer.next(value);

                        tappedNextCount++;
                    }

                    if (tappedNextCount == itemsLimit) setTimeout(() => complete());
                },
                error: error => {
                    if (!tappedError) {
                        if (observer.error != undefined) observer.error(error);
                        tappedError = true;
                    }
                },
                complete: () => {
                    complete();
                }
            })
        );

    function complete() {
        if (!tappedComplete) {
            if (observer.complete != undefined) observer.complete();
            tappedComplete = true;
        }
    }
}
