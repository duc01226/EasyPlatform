import { Directive } from '@angular/core';
import { PlatformVm, PlatformVmStore, PlatformVmStoreComponent } from '@libs/platform-core';

/**
 * Base component class for playground-text-snippet components with external store.
 *
 * Extend this class instead of PlatformVmStoreComponent directly for components
 * that use PlatformVmStore for state management.
 *
 * @example
 * ```typescript
 * @Component({
 *   providers: [MyStore]
 * })
 * export class MyComponent extends AppBaseVmStoreComponent<MyVm, MyStore> {
 *   constructor(store: MyStore) {
 *     super(store);
 *   }
 * }
 * ```
 */
@Directive()
export abstract class AppBaseVmStoreComponent<
    TViewModel extends PlatformVm,
    TStore extends PlatformVmStore<TViewModel>
> extends PlatformVmStoreComponent<TViewModel, TStore> {
    // App-wide store component customizations can be added here:
    // - Override reload behavior
    // - Add store event tracking
    // - Custom error state handling
}
