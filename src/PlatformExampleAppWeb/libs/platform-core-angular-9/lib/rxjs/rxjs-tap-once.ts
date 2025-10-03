import { MonoTypeOperatorFunction, Observable, PartialObserver } from 'rxjs';
import { tap } from 'rxjs/operators';

export function tapOnce<T>(observer: PartialObserver<T>): MonoTypeOperatorFunction<T> {
    let tappedNext = false;
    let tappedError = false;
    let tappedComplete = false;

    return (source: Observable<T>): Observable<T> =>
        source.pipe(
            tap({
                next: value => {
                    if (!tappedNext) {
                        if (observer.next != undefined) observer.next(value);
                        tappedNext = true;
                    }
                },
                error: error => {
                    if (!tappedError) {
                        if (observer.error != undefined) observer.error(error);
                        tappedError = true;
                    }
                },
                complete: () => {
                    if (!tappedComplete) {
                        if (observer.complete != undefined) observer.complete();
                        tappedComplete = true;
                    }
                }
            })
        );
}
