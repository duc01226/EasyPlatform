/**
 * @fileoverview View Models Module - Core state management and form handling.
 *
 * This module provides the essential building blocks for managing component state
 * and form operations across the platform. It includes base view model classes,
 * reactive store implementations, and type definitions for consistent state management.
 *
 * ## Key Components
 *
 * ### View Models
 * - **PlatformVm**: Base view model class with error handling, loading states, and multi-request tracking
 * - **IPlatformVm**: Core interface defining view model contracts
 * - **StateStatus**: Type union for tracking component lifecycle states
 *
 * ### Stores
 * - **PlatformVmStore**: Abstract reactive store with NgRx ComponentStore integration
 * - Intelligent caching and state persistence
 * - Loading state coordination and error management
 * - Performance optimization with throttling and deduplication
 *
 * ### Form Management
 * - **PlatformFormMode**: Type definitions for form operational modes ('view' | 'create' | 'update')
 * - Consistent form behavior across all platform components
 *
 * ## Architecture Pattern
 *
 * The view models module follows the MVVM (Model-View-ViewModel) pattern with reactive extensions:
 *
 * ```
 * Component (View)
 *     ↓ uses
 * PlatformVmStore (Reactive Store)
 *     ↓ manages
 * PlatformVm (View Model)
 *     ↓ contains
 * Domain Models + UI State
 * ```
 *
 * ## Usage Examples
 *
 * ### Basic Store Implementation
 * ```typescript
 * @Injectable()
 * export class UserListStore extends PlatformVmStore<UserListViewModel> {
 *   constructor(private userApi: UserApiService) {
 *     super(new UserListViewModel());
 *   }
 *
 *   protected beforeInitVm = () => {
 *     this.loadUsers();
 *   };
 *
 *   public vmConstructor = (data?: Partial<UserListViewModel>) =>
 *     new UserListViewModel(data);
 *
 *   protected cachedStateKeyName = () => 'UserListStore';
 *
 *   public initOrReloadVm = (isReload: boolean) => {
 *     return this.userApi.getUsers().pipe(
 *       this.tapResponse(users => this.updateState({ users }))
 *     );
 *   };
 * }
 * ```
 *
 * ### View Model with Multi-Request Tracking
 * ```typescript
 * export class FormTemplateViewModel extends PlatformVm {
 *   public template?: FormTemplate;
 *   public questions: FormTemplateQuestion[] = [];
 *
 *   constructor(data?: Partial<FormTemplateViewModel>) {
 *     super(data);
 *     if (data?.template) this.template = new FormTemplate(data.template);
 *     if (data?.questions) this.questions = data.questions.map(q => new FormTemplateQuestion(q));
 *   }
 *
 *   // Check specific operation states
 *   get isSavingTemplate(): boolean {
 *     return this.isLoading('saveTemplate');
 *   }
 *
 *   get isDeletingQuestion(): boolean {
 *     return this.isLoading('deleteQuestion');
 *   }
 * }
 * ```
 *
 * ### Component Integration
 * ```typescript
 * @Component({
 *   selector: 'user-management',
 *   template: `
 *     <div *ngIf="store.vm$ | async as vm">
 *       <div *ngIf="vm.isStateLoading">Loading...</div>
 *       <div *ngIf="vm.isStateError">{{ vm.error }}</div>
 *       <div *ngIf="vm.isStateSuccess">
 *         <user-list [users]="vm.users"></user-list>
 *       </div>
 *     </div>
 *   `,
 *   providers: [UserListStore]
 * })
 * export class UserManagementComponent {
 *   constructor(public store: UserListStore) {}
 * }
 * ```
 *
 * ### Form Mode Usage
 * ```typescript
 * @Component({
 *   template: `
 *     <form [formGroup]="formGroup">
 *       <input
 *         [readonly]="mode === 'view'"
 *         formControlName="name"
 *       />
 *       <button
 *         *ngIf="mode !== 'view'"
 *         [disabled]="vm?.isAnyLoadingRequest()"
 *         (click)="save()"
 *       >
 *         {{ mode === 'create' ? 'Create' : 'Update' }}
 *       </button>
 *     </form>
 *   `
 * })
 * export class EntityFormComponent {
 *   @Input() mode: PlatformFormMode = 'view';
 *
 *   get isReadonly(): boolean {
 *     return this.mode === 'view';
 *   }
 * }
 * ```
 *
 * ## Best Practices
 *
 * 1. **State Immutability**: Always use immutable updates for state changes
 * 2. **Error Handling**: Use request-specific error tracking for granular control
 * 3. **Loading States**: Leverage multi-request loading states for better UX
 * 4. **Caching**: Enable caching for performance optimization where appropriate
 * 5. **Cleanup**: Properly handle subscriptions and lifecycle management
 *
 * ## Performance Considerations
 *
 * - State updates are automatically throttled to prevent excessive renders
 * - Caching reduces redundant API calls and improves load times
 * - Observable selection uses memoization to prevent unnecessary recalculations
 * - Development mode includes state mutation detection for debugging
 *
 * @module ViewModels
 * @since 1.0.0
 * @see {@link ../components} For component integration patterns
 * @see {@link ../api-services} For API service integration
 * @see {@link ../caching} For caching service usage
 */

export * from './form.view-model';
export * from './generic.view-model';
export * from './view-model.store';
