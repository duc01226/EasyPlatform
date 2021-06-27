/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { clone, cloneDeep, keyBy, keys } from 'lodash';
import { Observable, of, pipe, Subscription } from 'rxjs';
import { delay, filter, takeUntil } from 'rxjs/operators';

export class Utils {
  public static delay(
    callback: () => void,
    delayTime?: number,
    cancelOnFirstTrueValue$?: Observable<boolean>
  ): Subscription {
    if (typeof delayTime === 'number' && delayTime <= 0) {
      callback();
      return new Subscription();
    }

    const delayObs = pipe(
      cancelOnFirstTrueValue$ != null
        ? takeUntil(cancelOnFirstTrueValue$?.pipe(filter(x => x == true)))
        : (obs: Observable<unknown>) => obs,
      delay(delayTime == null ? 10 : delayTime)
    );
    return delayObs(of({})).subscribe(() => {
      callback();
    });
  }

  public static debounce(func: (...args: any[]) => void, wait: number): (...args: any[]) => void {
    if (wait <= 0) {
      return func;
    }

    let timeout: number;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = <number>(<any>setTimeout(() => func(args), wait));
    };
  }

  public static cloneDeep<T>(value: T): T {
    if (value == null) return <any>null;
    return cloneDeep<T>(value);
  }

  public static clone<T>(value: T, updateClonedValueFn?: (clonedValue: T) => undefined | T | void): T {
    if (value == null) {
      return value;
    }
    let clonedValue: T = clone(value);
    if (updateClonedValueFn != null) {
      const updatedClonedValue: undefined | T | void = updateClonedValueFn(clonedValue);
      if (updatedClonedValue != null) {
        clonedValue = updatedClonedValue;
      }
    }
    return clonedValue;
  }

  public static isDifferent<T>(value1: T, value2: T): boolean {
    if (value1 == null && value2 == null) {
      return false;
    }
    if (value1 == null && value2 != null) {
      return true;
    }
    if (value1 != null && value2 == null) {
      return true;
    }
    if (typeof value1 !== 'object' && typeof value2 !== 'object') {
      return value1 !== value2;
    }
    if (value1 instanceof Array && value2 instanceof Array) {
      if (value1.length !== value2.length) {
        return true;
      }
    }
    return JSON.stringify(value1) !== JSON.stringify(value2);
  }

  public static toJsonObj(source: any, ignorePrivate: boolean = true): any {
    if (source == undefined) return undefined;
    if (typeof source != 'object') return source;
    if (source instanceof Array) {
      return source.map(p => Utils.toJsonObj(p, ignorePrivate));
    }
    if (source instanceof Date) return source;
    const objResult: any = {};
    Utils.keys(source, ignorePrivate).forEach(key => {
      objResult[key] = Utils.toJsonObj(source[key], ignorePrivate);
    });
    return objResult;
  }

  public static keys(source: any, ignorePrivate: boolean = true): string[] {
    if (typeof source != 'object') return [];
    const result: string[] = [];
    for (const key in source) {
      if (typeof source[key] != 'function' && (ignorePrivate == false || !key.startsWith('_'))) {
        if (key.startsWith('_')) {
          const publicKey = key.substring(1);
          if (!ignorePrivate) result.push(key);
          if (source[key] === source[publicKey]) {
            result.push(publicKey);
          }
        } else {
          result.push(key);
        }
      }
    }
    return result;
  }

  /**
   * Assign deep all properties from source to target object
   */
  public static assignDeep<T extends object>(target: T, source: T, cloneSource: boolean = false): T {
    return mapObject(target, source, cloneSource, false, false);
  }

  public static upsertDic<T>(
    currentData: Dictionary<T>,
    newData: Dictionary<Partial<T>> | Partial<T>[],
    getItemKey: (item: T | Partial<T>) => string | number,
    // tslint:disable-next-line:no-any
    initItem: (data: T | Partial<T>) => T,
    removeNotExistedItems?: boolean,
    removeNotExistedItemsFilter?: (item: Partial<T>) => boolean,
    replaceEachItem?: boolean,
    // tslint:disable-next-line:no-any
    onHasNewStateDifferent?: (newState: Dictionary<T>) => any,
    optionalProps: (keyof T)[] = []
  ): Dictionary<T> {
    return modifyDic(currentData, newState => {
      const newDataDic = newData instanceof Array ? Utils.toDictionary(newData, x => getItemKey(x)) : newData;
      if (removeNotExistedItems) {
        removeNotExistedItemsInNewData(newState, newDataDic);
      }

      keys(newDataDic).forEach(id => {
        if (
          newState[id] == null ||
          newDataDic[id] == null ||
          typeof newDataDic[id] !== 'object' ||
          typeof newState[id] !== 'object'
        ) {
          // eslint-disable-next-line no-param-reassign
          newState[id] = initItem(newDataDic[id]);
        } else {
          const prevNewStateItem = newState[id];
          const newStateItemData = replaceEachItem
            ? newDataDic[id]
            : Utils.assign<Partial<T>>(Utils.clone(newState[id]), newDataDic[id]);
          if (optionalProps.length > 0) {
            optionalProps.forEach(optionalProp => {
              if (prevNewStateItem[optionalProp] != null && newStateItemData[optionalProp] == null) {
                newStateItemData[optionalProp] = prevNewStateItem[optionalProp];
              }
            });
          }
          // eslint-disable-next-line no-param-reassign
          newState[id] = initItem(newStateItemData);
        }
      });
    });

    function removeNotExistedItemsInNewData(state: Dictionary<Partial<T>>, newDataDic: Dictionary<Partial<T>>): void {
      const removeItemIds = keys(state).filter(
        id => newDataDic[id] == null && (removeNotExistedItemsFilter == null || removeNotExistedItemsFilter(state[id]))
      );
      removeItemIds.forEach(id => {
        // eslint-disable-next-line no-param-reassign
        delete state[id];
      });
    }

    function modifyDic(
      state: Dictionary<T>,
      modifyDicAction: (state: Dictionary<T>) => void | Dictionary<T>
    ): Dictionary<T> {
      const newState = Utils.clone(state);
      const modifiedState = modifyDicAction(newState);
      if (modifiedState === state) {
        return state;
      }
      if (Utils.isDifferent(state, newState)) {
        if (onHasNewStateDifferent != null) {
          onHasNewStateDifferent(newState);
        }
        return newState;
      }
      return state;
    }
  }

  public static toDictionary<T>(
    collection: ArrayLike<T> | undefined,
    dictionaryKeySelector: (item: T) => string | number
  ): Dictionary<T> {
    return keyBy(collection, dictionaryKeySelector);
  }

  public static assign<T extends object>(target: T, ...sources: Partial<T>[]): T {
    sources.forEach(source => {
      Utils.keys(source).forEach(sourceKey => {
        if ((<any>source)[sourceKey] != null) {
          // Catch this to prevent can not set get only prop
          try {
            // eslint-disable-next-line no-param-reassign
            (<any>target)[sourceKey] = (<any>source)[sourceKey];
          } catch (error) {
            // Not throw error
          }
        }
      });
    });

    return target;
  }

  public static isEqual<T>(value1: T, value2: T): boolean {
    return !Utils.isDifferent(value1, value2);
  }

  public static removeNullProps<T>(obj: T): T {
    if (obj == null || typeof obj !== 'object') {
      return obj;
    }
    const objKeys = Object.keys(obj);
    for (let i = 0; i < objKeys.length; i += 1) {
      const key = objKeys[i];
      if ((<any>obj)[key] == null) {
        // eslint-disable-next-line no-param-reassign
        delete (<any>obj)[key];
      }
    }
    return obj;
  }
}

/**
 * Assign deep all properties from source to target object
 */
function mapObject<T extends any>(
  target: T,
  source: T,
  cloneSource: boolean = false,
  makeTargetValuesSameSourceValues: boolean = false,
  checkDiff: false | true | 'deepCheck' = false
) {
  if (target instanceof Array && source instanceof Array) {
    mapArray(target, source, cloneSource, makeTargetValuesSameSourceValues, checkDiff);
  } else {
    if (makeTargetValuesSameSourceValues) removeTargetKeysNotInSource(target, source);
    const sourceKeys = Object.keys(<any>source);
    sourceKeys.forEach(key => {
      if (checkDiff === true && (<any>target)[key] == (<any>source)[key]) return;
      if (checkDiff === 'deepCheck' && !Utils.isDifferent((<any>target)[key], (<any>source)[key])) return;

      if (mapObjectCheckTwoValueCanSetDirectly((<any>target)[key], (<any>source)[key])) {
        // eslint-disable-next-line no-param-reassign
        (<any>target)[key] = cloneSource ? Utils.cloneDeep((<any>source)[key]) : (<any>source)[key];
      } else {
        // eslint-disable-next-line no-param-reassign
        (<any>target)[key] = Utils.clone((<any>target)[key]);

        if ((<any>target)[key] instanceof Array && (<any>source)[key] instanceof Array) {
          mapArray((<any>target)[key], (<any>source)[key], cloneSource, makeTargetValuesSameSourceValues, checkDiff);
        } else {
          mapObject((<any>target)[key], (<any>source)[key], cloneSource, makeTargetValuesSameSourceValues, checkDiff);
        }
      }
    });
  }
  return target;
}

function mapObjectCheckTwoValueCanSetDirectly(targetValue: any, sourceValue: any) {
  if (
    targetValue == undefined ||
    sourceValue == undefined ||
    typeof targetValue != 'object' ||
    typeof sourceValue != 'object' ||
    targetValue.constructor != sourceValue.constructor
  ) {
    return true;
  }

  return false;
}

function mapArray(
  targetArray: any[],
  sourceArray: any[],
  cloneSource: boolean = false,
  makeTargetValuesSameSourceValues: boolean = false,
  checkDiff: false | true | 'deepCheck' = false
) {
  if (targetArray.length > sourceArray.length && makeTargetValuesSameSourceValues) {
    targetArray.splice(sourceArray.length);
  }

  for (let i = 0; i < sourceArray.length; i += 1) {
    if (checkDiff === true && targetArray[i] == sourceArray[i]) continue;
    if (checkDiff === 'deepCheck' && !Utils.isDifferent(targetArray[i], sourceArray[i])) continue;
    if (mapObjectCheckTwoValueCanSetDirectly(targetArray[i], sourceArray[i])) {
      // eslint-disable-next-line no-param-reassign
      targetArray[i] = cloneSource ? Utils.cloneDeep(sourceArray[i]) : sourceArray[i];
    } else {
      // eslint-disable-next-line no-param-reassign
      targetArray[i] = Utils.clone(targetArray[i], newTargetArrayItem => {
        mapObject(newTargetArrayItem, sourceArray[i], cloneSource, makeTargetValuesSameSourceValues, checkDiff);
      });
    }
  }
}

function removeTargetKeysNotInSource<T extends any>(target: T, source: T): T {
  if (target == undefined || source == undefined) return target;
  if (target instanceof Array && source instanceof Array) {
    return <T>(<any>target.slice(0, source.length));
  }
  const targetKeys = Utils.keys(target);
  const sourceKeys = new Set(Utils.keys(source));

  targetKeys.forEach(targetKey => {
    // eslint-disable-next-line no-param-reassign
    if (!sourceKeys.has(targetKey)) delete (<any>target)[targetKey];
  });

  return target;
}
