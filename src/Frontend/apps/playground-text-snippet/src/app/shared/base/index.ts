/**
 * App base component exports for playground-text-snippet.
 *
 * All feature components should extend these base classes instead of
 * platform-core classes directly. This enables app-wide customizations
 * without modifying individual feature components.
 *
 * Hierarchy:
 * - AppBaseComponent → PlatformComponent
 * - AppBaseVmComponent → PlatformVmComponent
 * - AppBaseFormComponent → PlatformFormComponent
 * - AppBaseVmStoreComponent → PlatformVmStoreComponent
 */
export * from './app-base.component';
export * from './app-base-vm.component';
export * from './app-base-form.component';
export * from './app-base-vm-store.component';
