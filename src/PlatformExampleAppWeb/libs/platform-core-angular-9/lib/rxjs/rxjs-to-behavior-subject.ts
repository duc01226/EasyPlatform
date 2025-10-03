import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Converts an Observable to a new BehaviorSubject.
 * When the returned BehaviorSubject is unsubscribed, the subscription
 * to the source observable is also automatically unsubscribed.
 *
 * @param source$ The source observable to convert.
 * @param initialValue The initial value for the BehaviorSubject.
 * @returns A new BehaviorSubject that stays updated with the source.
 */
export function rxjs_toBehaviorSubject<T>(source$: Observable<T>, initialValue: T): BehaviorSubject<T> {
    const subject = new BehaviorSubject(initialValue);
    const sourceSubscription = source$.subscribe(subject);

    // Keep a reference to the original unsubscribe method.
    const originalUnsubscribe = subject.unsubscribe;

    // Overwrite the subject's unsubscribe method with a new one.
    subject.unsubscribe = function () {
        // First, unsubscribe from the source observable.
        if (!sourceSubscription.closed) {
            sourceSubscription.unsubscribe();
        }

        // Then, call the original unsubscribe logic.
        originalUnsubscribe.call(this);
    };

    return subject;
}

/**
 * Creates a new, derived BehaviorSubject from a source BehaviorSubject
 * by applying a mapping function to its values.
 *
 * @param source The source BehaviorSubject.
 * @param mapFn The mapping function to apply to the source's values.
 * @returns A new, read-only BehaviorSubject that stays in sync with the source.
 */
export function rxjs_mapBehaviorSubject<T, R>(source: BehaviorSubject<T>, mapFn: (value: T) => R): BehaviorSubject<R> {
    // 1. Calculate the initial value for the new subject.
    const initialDerivedValue = mapFn(source.getValue());

    // 2. Create the new "derived" BehaviorSubject.
    const derived = new BehaviorSubject<R>(initialDerivedValue);

    // 3. Subscribe to the source to keep the derived subject in sync.
    const sourceSubscription = source.pipe(map(mapFn)).subscribe(derived);

    // 4. Augment the derived subject's unsubscribe method to also clean up
    // the subscription to the source, preventing memory leaks.
    const originalUnsubscribe = derived.unsubscribe;
    derived.unsubscribe = function () {
        sourceSubscription.unsubscribe();
        originalUnsubscribe.apply(this, arguments);
    };

    return derived;
}

/**
 * Creates a new BehaviorSubject that combines values from multiple source BehaviorSubjects
 * using a combiner function, similar to combineLatest but for BehaviorSubjects.
 */
export function rxjs_combineLatestBehaviorSubject<T1, T2, R>(
    source1: BehaviorSubject<T1>,
    source2: BehaviorSubject<T2>,
    combiner: (v1: T1, v2: T2) => R
): BehaviorSubject<R>;
export function rxjs_combineLatestBehaviorSubject<T1, T2, T3, R>(
    source1: BehaviorSubject<T1>,
    source2: BehaviorSubject<T2>,
    source3: BehaviorSubject<T3>,
    combiner: (v1: T1, v2: T2, v3: T3) => R
): BehaviorSubject<R>;
export function rxjs_combineLatestBehaviorSubject<T1, T2, T3, R>(
    source1: BehaviorSubject<T1>,
    source2: BehaviorSubject<T2>,
    source3OrCombiner: BehaviorSubject<T3> | ((v1: T1, v2: T2) => R),
    combiner?: (v1: T1, v2: T2, v3: T3) => R
): BehaviorSubject<R> {
    // Determine if we have 2 or 3 sources
    const isThreeParam = typeof source3OrCombiner !== 'function';
    const source3 = isThreeParam ? (source3OrCombiner as BehaviorSubject<T3>) : undefined;
    const actualCombiner = isThreeParam ? combiner! : (source3OrCombiner as (v1: T1, v2: T2) => R);

    const sources = source3 ? [source1, source2, source3] : [source1, source2];

    const initialValue = source3
        ? (actualCombiner as any)(source1.getValue(), source2.getValue(), source3.getValue())
        : (actualCombiner as any)(source1.getValue(), source2.getValue());

    const combined = new BehaviorSubject<R>(initialValue);

    const subscriptions = sources.map(source =>
        (<BehaviorSubject<unknown>>source).subscribe({
            next: v => {
                const newValue = source3
                    ? (actualCombiner as any)(source1.getValue(), source2.getValue(), source3.getValue())
                    : (actualCombiner as any)(source1.getValue(), source2.getValue());
                combined.next(newValue);
            }
        })
    );

    const originalUnsubscribe = combined.unsubscribe;
    combined.unsubscribe = function () {
        subscriptions.forEach(sub => sub.unsubscribe());
        originalUnsubscribe.apply(this, arguments);
    };

    return combined;
}
