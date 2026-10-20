/**
 * @fileoverview Platform Domain Module Exports
 *
 * This module serves as the main entry point for the platform's domain layer,
 * providing a comprehensive suite of domain-driven design (DDD) components
 * that implement the repository pattern, error handling, and data modeling
 * infrastructure.
 *
 * ## Domain Architecture Overview
 *
 * The platform domain layer implements a clean architecture approach with
 * the following key components:
 *
 * ```
 * Domain Layer Architecture
 * ├── Data Models
 * │   ├── IPlatformDataModel (Interface)
 * │   └── PlatformDataModel (Abstract Base)
 * ├── Repository Pattern
 * │   ├── PlatformRepositoryContext (Request Scoping)
 * │   └── PlatformRepository (Core Implementation)
 * └── Event System
 *     ├── PlatformRepositoryErrorEvent (Error Events)
 *     └── PlatformRepositoryErrorEventHandler (Error Handling)
 * ```
 *
 * ## Core Principles
 *
 * ### Domain-Driven Design (DDD)
 * - **Entities**: Data models with identity and lifecycle management
 * - **Repositories**: Data access abstraction with business logic
 * - **Events**: Domain events for reactive architecture
 * - **Value Objects**: Immutable data structures (Time, Dictionary)
 *
 * ### Repository Pattern Benefits
 * - **Data Access Abstraction**: Hide API complexity behind domain interfaces
 * - **Caching Strategy**: Intelligent caching with multiple strategies
 * - **Error Handling**: Centralized error processing and recovery
 * - **Testing**: Easy mocking and unit testing of data access
 * - **Consistency**: Standardized data access patterns across the application
 *
 * ### Event-Driven Architecture
 * - **Loose Coupling**: Components communicate through events
 * - **Error Handling**: Reactive error processing and recovery
 * - **Extensibility**: Easy addition of new event handlers
 * - **Monitoring**: Built-in observability and audit trails
 *
 * ## Key Components
 *
 * ### Data Models
 *
 * **IPlatformDataModel & PlatformDataModel**
 * - Foundation for all domain entities
 * - Standardized ID management and initialization
 * - Constructor-based property setting
 * - Type safety and validation
 *
 * ```typescript
 * // Entity definition
 * export interface IUser extends IPlatformDataModel {
 *   name: string;
 *   email: string;
 *   role: UserRole;
 * }
 *
 * export class User extends PlatformDataModel implements IUser {
 *   constructor(data: Partial<IUser>) {
 *     super(data);
 *   }
 * }
 * ```
 *
 * ### Repository Context
 *
 * **PlatformRepositoryContext**
 * - Request-scoped dependency injection container
 * - Manages repository instances and their dependencies
 * - Handles subscription lifecycle and cleanup
 * - Provides caching coordination across repositories
 *
 * ```typescript
 * // Context usage in repository
 * @Injectable()
 * export class UserRepository extends PlatformRepository<UserRepositoryContext> {
 *   constructor(context: UserRepositoryContext) {
 *     super(context);
 *   }
 * }
 * ```
 *
 * ### Repository Pattern
 *
 * **PlatformRepository**
 * - Core repository implementation with multiple caching strategies
 * - Reactive data streams with RxJS observables
 * - Automatic error handling and event publishing
 * - Built-in subscription management and cleanup
 *
 * ```typescript
 * // Repository method implementation
 * getUsers(query: GetUsersQuery): Observable<User[]> {
 *   return this.getList({
 *     cacheKey: 'users',
 *     cachingStrategy: PlatformRepositoryCachingStrategy.LoadOnce,
 *     requestFactory: () => this.userApiService.getUsers(query),
 *     requestName: 'getUsers',
 *     requestPayload: query
 *   });
 * }
 * ```
 *
 * ### Error Handling System
 *
 * **PlatformRepositoryErrorEvent & Handler**
 * - Centralized error event publishing from repositories
 * - Extensible error handler registration system
 * - Context-aware error processing with full request details
 * - Support for multiple handlers per error type
 *
 * ```typescript
 * // Error handler implementation
 * @Injectable()
 * export class UserErrorHandler extends PlatformRepositoryErrorEventHandler {
 *   handle(event: PlatformRepositoryErrorEvent): void {
 *     if (event.repositoryRequestName === 'getUsers') {
 *       this.notificationService.showError('Failed to load users');
 *     }
 *   }
 * }
 * ```
 *
 * ## Integration Patterns
 *
 * ### Module Registration
 *
 * ```typescript
 * @NgModule({
 *   imports: [
 *     PlatformDomainModule.forRoot({
 *       repositoryContext: AppRepositoryContext,
 *       repositories: [UserRepository, OrderRepository],
 *       apis: [UserApiService, OrderApiService],
 *       repositoryErrorEventHandlers: [
 *         GlobalErrorHandler,
 *         UserErrorHandler
 *       ]
 *     })
 *   ]
 * })
 * export class AppModule { }
 * ```
 *
 * ### Component Integration
 *
 * ```typescript
 * @Component({
 *   template: `
 *     <div *ngIf="users$ | async as users">
 *       <user-card *ngFor="let user of users" [user]="user"></user-card>
 *     </div>
 *   `
 * })
 * export class UserListComponent {
 *   users$ = this.userRepository.getUsers(new GetUsersQuery());
 *
 *   constructor(private userRepository: UserRepository) {}
 * }
 * ```
 *
 * ### Testing Support
 *
 * ```typescript
 * // Repository testing with mocked context
 * describe('UserRepository', () => {
 *   let repository: UserRepository;
 *   let mockApiService: jasmine.SpyObj<UserApiService>;
 *   let mockContext: jasmine.SpyObj<UserRepositoryContext>;
 *
 *   beforeEach(() => {
 *     const mockApi = jasmine.createSpyObj('UserApiService', ['getUsers']);
 *     const mockCtx = jasmine.createSpyObj('UserRepositoryContext', ['getApiService']);
 *
 *     mockCtx.getApiService.and.returnValue(mockApi);
 *     repository = new UserRepository(mockCtx);
 *   });
 *
 *   it('should load users with caching', () => {
 *     mockApiService.getUsers.and.returnValue(of([new User({ id: '1', name: 'Test' })]));
 *
 *     repository.getUsers(new GetUsersQuery()).subscribe(users => {
 *       expect(users).toHaveLength(1);
 *       expect(users[0].name).toBe('Test');
 *     });
 *   });
 * });
 * ```
 *
 * ## Performance Optimizations
 *
 * ### Caching Strategies
 * - **LoadOnce**: Cache indefinitely until manual refresh
 * - **ImplicitReload**: Cache with automatic background refresh
 * - **ExplicitReload**: Always fetch fresh data
 *
 * ### Subscription Management
 * - Automatic subscription cleanup on context disposal
 * - Shared observables to prevent duplicate requests
 * - Memory leak prevention through proper unsubscription
 *
 * ### Change Detection
 * - OnPush change detection support with reactive streams
 * - Signal integration for modern Angular applications
 * - Minimal re-rendering through intelligent caching
 *
 * ## Error Recovery Patterns
 *
 * ### Automatic Retry
 * ```typescript
 * @Injectable()
 * export class RetryErrorHandler extends PlatformRepositoryErrorEventHandler {
 *   handle(event: PlatformRepositoryErrorEvent): void {
 *     if (this.isRetryableError(event.apiError)) {
 *       // Implement exponential backoff retry logic
 *       this.retryWithBackoff(event);
 *     }
 *   }
 * }
 * ```
 *
 * ### Fallback Data
 * ```typescript
 * getUsersWithFallback(): Observable<User[]> {
 *   return this.getUsers(new GetUsersQuery()).pipe(
 *     catchError(() => this.getCachedUsers()),
 *     catchError(() => of(this.getDefaultUsers()))
 *   );
 * }
 * ```
 *
 * ### Offline Support
 * ```typescript
 * @Injectable()
 * export class OfflineErrorHandler extends PlatformRepositoryErrorEventHandler {
 *   handle(event: PlatformRepositoryErrorEvent): void {
 *     if (this.isNetworkError(event.apiError)) {
 *       this.offlineService.enableOfflineMode();
 *       this.fallbackToLocalData(event);
 *     }
 *   }
 * }
 * ```
 *
 * ## Migration Guide
 *
 * ### From Legacy Data Services
 *
 * **Before (Legacy Service):**
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   getUsers(): Observable<User[]> {
 *     return this.http.get<User[]>('/api/users').pipe(
 *       catchError(error => {
 *         this.notificationService.showError('Failed to load users');
 *         return throwError(error);
 *       })
 *     );
 *   }
 * }
 * ```
 *
 * **After (Repository Pattern):**
 * ```typescript
 * @Injectable()
 * export class UserRepository extends PlatformRepository<UserRepositoryContext> {
 *   getUsers(query: GetUsersQuery): Observable<User[]> {
 *     return this.getList({
 *       cacheKey: 'users',
 *       cachingStrategy: PlatformRepositoryCachingStrategy.LoadOnce,
 *       requestFactory: () => this.userApiService.getUsers(query),
 *       requestName: 'getUsers',
 *       requestPayload: query
 *     });
 *   }
 * }
 * ```
 *
 * ## Related Documentation
 *
 * - **API Services**: `../api-services` - HTTP communication layer
 * - **Events**: `../events` - Platform event system
 * - **Caching**: `../caching` - Caching infrastructure
 * - **Components**: `../components` - UI component integration
 *
 * @module PlatformDomain
 * @since Platform Core v1.0.0
 * @author Platform Team
 *
 * @see {@link IPlatformDataModel} - Data model interface
 * @see {@link PlatformDataModel} - Data model base class
 * @see {@link PlatformRepositoryContext} - Repository context container
 * @see {@link PlatformRepository} - Repository pattern implementation
 * @see {@link PlatformRepositoryErrorEvent} - Error event class
 * @see {@link PlatformRepositoryErrorEventHandler} - Error handler base class
 */
// Data Model exports
export * from './data-model/platform.data-model';

// Event system exports
export * from './events/abstracts/repository-error.event-handler';
export * from './events/repository-error.event';

// Repository infrastructure exports
export * from './platform.repository-context';
export * from './repository/platform.repository';
