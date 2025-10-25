import { MonoTypeOperatorFunction } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

import { isDifferent } from '../utils';

export function distinctUntilObjectValuesChanged<T>(): MonoTypeOperatorFunction<T> {
    return distinctUntilChanged((prev, current) => !isDifferent(prev, current));
}
