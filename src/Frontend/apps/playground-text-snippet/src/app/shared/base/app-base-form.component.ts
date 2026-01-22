import { Directive } from '@angular/core';
import { IPlatformVm, PlatformFormComponent } from '@libs/platform-core';

/**
 * Base component class for playground-text-snippet form components.
 *
 * Extend this class instead of PlatformFormComponent directly for components
 * that handle form input with validation.
 *
 * Required implementations:
 * - `initOrReloadVm(isReload: boolean)` - Initialize or reload view model
 * - `initialFormConfig()` - Define form controls and validation
 *
 * @example
 * ```typescript
 * export class MyFormComponent extends AppBaseFormComponent<MyFormVm> {
 *   protected override initOrReloadVm = (isReload: boolean): Observable<MyFormVm> => {
 *     return of(new MyFormVm());
 *   };
 *
 *   protected initialFormConfig = (): PlatformFormConfig<MyFormVm> => ({
 *     controls: {
 *       name: new FormControl(this.currentVm().name, [Validators.required])
 *     }
 *   });
 * }
 * ```
 */
@Directive()
export abstract class AppBaseFormComponent<TFormVm extends IPlatformVm> extends PlatformFormComponent<TFormVm> {
    // App-wide form customizations can be added here:
    // - Default validation message overrides
    // - Form analytics tracking
    // - Custom submit handling
}
