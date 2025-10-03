import { SimpleChanges } from '@angular/core';

import * as _ from 'lodash-es';

export class LifeCycleHelper {
    public static isInputChanged(changes: SimpleChanges): boolean {
        const keys = Object.keys(changes);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const change = changes[key];
            if (change && change.currentValue != undefined && !_.isEqual(change.previousValue, change.currentValue)) {
                return true;
            }
        }
        return false;
    }
}
