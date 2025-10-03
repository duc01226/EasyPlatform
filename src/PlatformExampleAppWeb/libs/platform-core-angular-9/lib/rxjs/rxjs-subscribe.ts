import { Observable, PartialObserver, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export function subscribe<T>(outSubscriptionFn?: (subscription: Subscription) => void): (source: Observable<T>) => Observable<T> {
    return sourceObservable => {
        if (outSubscriptionFn != undefined) outSubscriptionFn(sourceObservable.subscribe());
        else sourceObservable.subscribe();

        return sourceObservable;
    };
}

export function subscribeUntil<T>(
    notifier: Observable<unknown>,
    observerOrNext?: PartialObserver<T> | ((value: T) => void),
    outSubscriptionFn?: (subscription: Subscription) => void
): (source: Observable<T>) => Observable<T> {
    return sourceObservable => {
        const resultObservable = sourceObservable.pipe(takeUntil(notifier));

        let subscription: Subscription;
        if (observerOrNext) {
            // Handle function vs observer object
            if (typeof observerOrNext === 'function') {
                subscription = resultObservable.subscribe(observerOrNext);
            } else {
                subscription = resultObservable.subscribe(observerOrNext);
            }
        } else {
            subscription = resultObservable.subscribe();
        }

        if (outSubscriptionFn != undefined) {
            outSubscriptionFn(subscription);
        }

        return resultObservable;
    };
}
