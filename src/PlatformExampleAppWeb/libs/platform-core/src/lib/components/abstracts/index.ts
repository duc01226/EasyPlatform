/**
 * @fileoverview Platform Abstract Components Module
 *
 * This module provides the foundational abstract component classes that form the backbone
 * of the platform's component architecture. These classes implement common patterns and
 * functionality that can be extended by application-specific components.
 *
 * ## Component Hierarchy
 *
 * The abstract components follow a well-defined inheritance hierarchy:
 *
 * ```
 * PlatformComponent (Base)
 * ├── PlatformVmComponent (View Model Management)
 * │   └── PlatformFormComponent (Form Management)
 * └── PlatformVmStoreComponent (NgRx Store Integration)
 * ```
 *
 * ## Core Classes
 *
 * ### PlatformComponent
 * - **Purpose**: Base class for all platform components
 * - **Features**: Lifecycle management, state tracking, error handling
 * - **Use When**: Creating any platform component that needs core functionality
 *
 * ### PlatformVmComponent
 * - **Purpose**: Components that manage a view model
 * - **Features**: Reactive view model management, signal integration, automatic updates
 * - **Use When**: Building components that work with reactive data models
 * - **Extends**: `PlatformComponent`
 *
 * ### PlatformFormComponent
 * - **Purpose**: Advanced form management with view model integration
 * - **Features**: Reactive forms, validation, mode management (create/update/view)
 * - **Use When**: Building complex forms with validation and state management
 * - **Extends**: `PlatformVmComponent`
 *
 * ### PlatformVmStoreComponent
 * - **Purpose**: NgRx ComponentStore integration for state management
 * - **Features**: Store-based state management, multiple store coordination
 * - **Use When**: Building components that need centralized state management
 * - **Extends**: `PlatformComponent`
 *
 * ## Architecture Benefits
 *
 * ### Consistency
 * - Standardized component patterns across the application
 * - Predictable API and behavior for all platform components
 * - Uniform error handling and state management
 *
 * ### Code Reuse
 * - Common functionality implemented once in base classes
 * - Reduced boilerplate code in derived components
 * - Consistent patterns for reactive programming
 *
 * ### Type Safety
 * - Full TypeScript support with generic constraints
 * - Strong typing for view models and form configurations
 * - Compile-time error detection for component contracts
 *
 * ### Performance
 * - Optimized change detection with Angular signals
 * - Efficient subscription management with automatic cleanup
 * - Smart caching and memory management
 *
 * ## Usage Examples
 *
 * ### Basic View Model Component
 * ```typescript
 * interface UserVm extends IPlatformVm {
 *   id: string;
 *   name: string;
 *   email: string;
 * }
 *
 * @Component({
 *   selector: 'user-detail',
 *   template: `
 *     <div *ngIf="vm() as user">
 *       <h1>{{user.name}}</h1>
 *       <p>{{user.email}}</p>
 *     </div>
 *   `
 * })
 * export class UserDetailComponent extends PlatformVmComponent<UserVm> {
 *   protected initOrReloadVm = (isReload: boolean) => {
 *     return this.userService.getUser(this.userId);
 *   };
 * }
 * ```
 *
 * ### Form Component
 * ```typescript
 * @Component({
 *   selector: 'user-form',
 *   template: `
 *     <form [formGroup]="form" (ngSubmit)="onSubmit()">
 *       <input formControlName="name" placeholder="Name">
 *       <input formControlName="email" placeholder="Email">
 *       <button type="submit" [disabled]="!canSubmitForm()">Save</button>
 *     </form>
 *   `
 * })
 * export class UserFormComponent extends PlatformFormComponent<UserFormVm> {
 *   protected initOrReloadVm = (isReload: boolean) => {
 *     return this.userId
 *       ? this.userService.getUser(this.userId)
 *       : of(new UserFormVm());
 *   };
 *
 *   protected initialFormConfig = () => ({
 *     controls: {
 *       name: new FormControl('', [Validators.required]),
 *       email: new FormControl('', [Validators.required, Validators.email])
 *     }
 *   });
 * }
 * ```
 *
 * ### Store Component
 * ```typescript
 * @Component({
 *   selector: 'user-list',
 *   template: `
 *     <div *ngIf="vm() as state">
 *       <user-card
 *         *ngFor="let user of state.users"
 *         [user]="user">
 *       </user-card>
 *     </div>
 *   `,
 *   providers: [UserListStore]
 * })
 * export class UserListComponent extends PlatformVmStoreComponent<UserListState, UserListStore> {
 *   constructor(store: UserListStore) {
 *     super(store);
 *   }
 * }
 * ```
 *
 * ## Integration with Application
 *
 * These abstract components are designed to be extended by application-specific base classes:
 *
 * ```typescript
 * // Application-specific base components
 * export abstract class AppBaseComponent extends PlatformComponent { }
 * export abstract class AppBaseVmComponent<T> extends PlatformVmComponent<T> { }
 * export abstract class AppBaseFormComponent<T> extends PlatformFormComponent<T> { }
 * export abstract class AppBaseVmStoreComponent<T, S> extends PlatformVmStoreComponent<T, S> { }
 * ```
 *
 * ## Related Modules
 *
 * - **View Models**: `../../view-models` - Interface definitions for view models
 * - **Form Validators**: `../../form-validators` - Custom validation logic
 * - **Common Types**: `../../common-types` - Shared type definitions
 * - **Utilities**: `../../utils` - Helper functions and utilities
 *
 * @module PlatformAbstractComponents
 * @since Platform Core v1.0.0
 * @author Platform Team
 *
 * @see {@link PlatformComponent} Base component class
 * @see {@link PlatformVmComponent} View model component class
 * @see {@link PlatformFormComponent} Form component class
 * @see {@link PlatformVmStoreComponent} Store component class
 */

export * from './platform.component';
export * from './platform.form-component';
export * from './platform.vm-component';
export * from './platform.vm-store-component';
