import { Directive } from '@angular/core';
import { IPlatformVm, PlatformVmComponent } from '@libs/platform-core';

/**
 * Base component class for playground-text-snippet components with view model.
 *
 * Extend this class instead of PlatformVmComponent directly for components
 * that manage their own view model state (without external store).
 *
 * Required implementations:
 * - `initOrReloadVm(isReload: boolean)` - Initialize or reload view model
 *
 * @example
 * ```typescript
 * export class MyComponent extends AppBaseVmComponent<MyVm> {
 *   protected override initOrReloadVm = (isReload: boolean): Observable<MyVm> => {
 *     return of(new MyVm({ initialData: 'value' }));
 *   };
 * }
 * ```
 */
@Directive()
export abstract class AppBaseVmComponent<TViewModel extends IPlatformVm> extends PlatformVmComponent<TViewModel> {
    // App-wide VM component customizations can be added here
}
