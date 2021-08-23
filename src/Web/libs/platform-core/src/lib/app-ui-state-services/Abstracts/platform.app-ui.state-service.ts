import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

import { PlatformCoreModuleConfig } from '../../platform-core.config';
import { Utils } from '../../Utils';

@Injectable()
export abstract class PlatformAppUiStateService<TAppUiStateData> {
  public constructor(private moduleConfig: PlatformCoreModuleConfig) {
    this.dataSubject = new BehaviorSubject(this.initialUiState());
    if (moduleConfig.isDevelopment) {
      this.developmentClonedDeepUiStateData = Utils.cloneDeep(this.dataSubject.value);
    }
  }

  protected abstract initialUiState(): TAppUiStateData;
  protected dataSubject: BehaviorSubject<TAppUiStateData>;

  private updateUiStateDataDelaySub: Subscription = new Subscription();
  private developmentClonedDeepUiStateData: TAppUiStateData | null = null;

  public selectUiStateData<T>(selector: (uiStateData: TAppUiStateData) => T): Observable<T> {
    return this.dataSubject.asObservable().pipe(
      map(data => selector(data)),
      distinctUntilChanged((x, y) => x === y)
    );
  }

  public updateUiStateData(updateDataFn: (current: TAppUiStateData) => TAppUiStateData, delayTime: number = 100): void {
    this.updateUiStateDataDelaySub.unsubscribe();
    this.updateUiStateDataDelaySub = Utils.delay(() => {
      if (this.moduleConfig.isDevelopment) {
        const originalData = Utils.cloneDeep(this.dataSubject.value);
        const newData = updateDataFn(Utils.clone(this.dataSubject.value));

        // Check that updateDataFn has changed data but
        // the data in observable and newData is equal or
        // the data in observable is different from developmentClonedDeepUiStateData
        if (
          Utils.isDifferent(originalData, newData) &&
          (Utils.isEqual(this.dataSubject.value, newData) ||
            Utils.isDifferent(this.dataSubject.value, this.developmentClonedDeepUiStateData))
        ) {
          throw new Error(
            `The new updated data and original data have the same value or original data has been changed directly via object references.
            Please do not modify the original data directly by references.
            Ensure the data is immutable by using clone to edit.`
          );
        }
        this.developmentClonedDeepUiStateData = Utils.cloneDeep(newData);

        this.dataSubject.next(newData);
      } else {
        const newData = updateDataFn(Utils.clone(this.dataSubject.value));
        this.dataSubject.next(newData);
      }
    }, delayTime);
  }

  public currentData(): TAppUiStateData {
    return this.dataSubject.value;
  }

  protected updateUiStateDataImmediate(updateDataFn: (current: TAppUiStateData) => TAppUiStateData): void {
    this.updateUiStateData(current => updateDataFn(current), 0);
  }
}
