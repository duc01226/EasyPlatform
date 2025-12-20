import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { EnvironmentProviders, ModuleWithProviders, NgModule, Provider, Type } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { PlatformApiService } from './api-services';
import { PlatformRepository, PlatformRepositoryContext, PlatformRepositoryErrorEvent, PlatformRepositoryErrorEventHandler } from './domain';
import { PlatformEventManagerSubscriptionsMap } from './events';

/**
 * Angular module for platform domain-related features, providing repository and API management.
 *
 * This module serves as the domain layer foundation for Angular applications using the platform architecture.
 * It provides essential infrastructure for:
 * - Repository pattern implementation with context management
 * - API service registration and configuration
 * - Domain event handling for repository operations
 * - Error handling specific to repository operations
 *
 * @remarks
 * The PlatformDomainModule follows the Clean Architecture principles by providing a clear separation
 * between domain logic and infrastructure concerns. It should be imported once at the application
 * root level using `forRoot()`, and can be imported in feature modules using `forChild()` for
 * module-specific repositories and APIs.
 *
 * Key architectural concepts:
 * - **Repository Context**: Provides scoped data access context for repositories
 * - **Repository Pattern**: Abstracts data access logic from business logic
 * - **API Services**: HTTP-based services following platform conventions
 * - **Domain Events**: Event-driven architecture for repository operations
 * - **Error Handling**: Centralized error handling for repository operations
 *
 * @example
 * **Basic usage in AppModule:**
 * ```typescript
 * import { PlatformDomainModule } from '@libs/platform-core';
 *
 * @NgModule({
 *   imports: [
 *     PlatformDomainModule.forRoot({
 *       appRepositoryContext: AppRepositoryContext,
 *       appRepositories: [UserRepository, ProductRepository],
 *       appApis: [UserApiService, ProductApiService],
 *       appRepositoryErrorEventHandlers: [DatabaseErrorHandler]
 *     })
 *   ]
 * })
 * export class AppModule { }
 * ```
 *
 * @example
 * **Advanced configuration with custom providers:**
 * ```typescript
 * import { PlatformDomainModule } from '@libs/platform-core';
 *
 * @NgModule({
 *   imports: [
 *     PlatformDomainModule.forRoot({
 *       appRepositoryContext: CustomRepositoryContext,
 *       appRepositories: [
 *         UserRepository,
 *         ProductRepository,
 *         OrderRepository
 *       ],
 *       appApis: [
 *         UserApiService,
 *         ProductApiService,
 *         OrderApiService,
 *         PaymentApiService
 *       ],
 *       appRepositoryErrorEventHandlers: [
 *         DatabaseConnectionErrorHandler,
 *         ValidationErrorHandler,
 *         ConcurrencyErrorHandler
 *       ],
 *       additionalProviders: [
 *         CustomDomainService,
 *         { provide: DOMAIN_CONFIG, useValue: domainConfig }
 *       ]
 *     })
 *   ]
 * })
 * export class AppModule { }
 * ```
 *
 * @example
 * **Usage in feature modules:**
 * ```typescript
 * import { PlatformDomainModule } from '@libs/platform-core';
 *
 * @NgModule({
 *   imports: [
 *     PlatformDomainModule.forChild({
 *       appModuleRepositoryContext: FeatureRepositoryContext,
 *       appModuleRepositories: [FeatureRepository],
 *       appModuleApis: [FeatureApiService],
 *       appRepositoryErrorEventHandlers: [FeatureErrorHandler]
 *     })
 *   ]
 * })
 * export class FeatureModule { }
 * ```
 *
 * @ngModule PlatformDomainModule
 * @exports CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule
 */
@NgModule({
    imports: [],
    exports: [CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule]
})
export class PlatformDomainModule {
    /**
     * Creates and configures the PlatformDomainModule for the root application module.
     *
     * This method sets up the complete domain infrastructure including:
     * - Repository context configuration for scoped data access
     * - Repository registration with dependency injection
     * - API service registration and configuration
     * - Domain event handlers for repository error handling
     * - Additional custom providers as needed
     *
     * @param config - Configuration options for the platform domain module
     * @param config.appRepositoryContext - Optional repository context class for the application
     * @param config.appRepositories - Optional array of repository classes to register
     * @param config.appApis - Optional array of API service classes to register
     * @param config.appRepositoryErrorEventHandlers - Optional array of repository error event handlers
     * @param config.additionalProviders - Optional array of additional providers to register
     * @returns Array of Angular module configurations for the root application
     *
     * @example
     * **Repository-focused application setup:**
     * ```typescript
     * // Define your repository context
     * export class AppRepositoryContext extends PlatformRepositoryContext {
     *   constructor(
     *     @Inject(DATABASE_CONNECTION) private dbConnection: DatabaseConnection
     *   ) { super(); }
     * }
     *
     * // Configure the module
     * PlatformDomainModule.forRoot({
     *   appRepositoryContext: AppRepositoryContext,
     *   appRepositories: [
     *     UserRepository,
     *     ProductRepository,
     *     OrderRepository
     *   ],
     *   appApis: [
     *     UserApiService,
     *     ProductApiService,
     *     OrderApiService
     *   ],
     *   appRepositoryErrorEventHandlers: [
     *     DatabaseTimeoutErrorHandler,
     *     ValidationErrorHandler
     *   ],
     *   additionalProviders: [
     *     DatabaseConnectionService,
     *     { provide: DATABASE_CONFIG, useValue: databaseConfig }
     *   ]
     * })
     * ```
     */
    public static forRoot(config: {
        appRepositoryContext?: Type<PlatformRepositoryContext>;
        appRepositories?: Type<PlatformRepository<PlatformRepositoryContext>>[];
        appApis?: Type<PlatformApiService>[];
        appRepositoryErrorEventHandlers?: Type<PlatformRepositoryErrorEventHandler>[];
        additionalProviders?: Array<Provider | EnvironmentProviders>;
    }): ModuleWithProviders<PlatformDomainModule>[] {
        return [
            {
                ngModule: PlatformDomainModule,
                providers: [
                    ...this.buildRepositoryRelatedProviders({
                        repositoryContext: config.appRepositoryContext,
                        repositories: config.appRepositories,
                        apis: config.appApis,
                        repositoryErrorEventHandlers: config.appRepositoryErrorEventHandlers
                    }),
                    ...(config.additionalProviders != null ? config.additionalProviders : [])
                ]
            }
        ];
    }

    /**
     * Creates and configures the PlatformDomainModule for feature modules.
     *
     * This method provides domain infrastructure for feature modules, allowing them to:
     * - Register feature-specific repositories and repository contexts
     * - Add feature-specific API services
     * - Handle feature-specific repository errors
     *
     * @param config - Configuration options for the platform domain module in feature modules
     * @param config.appModuleRepositoryContext - Optional repository context specific to the feature module
     * @param config.appModuleRepositories - Optional array of repository classes specific to the feature module
     * @param config.appModuleApis - Optional array of API service classes specific to the feature module
     * @param config.appRepositoryErrorEventHandlers - Optional array of repository error handlers for the feature module
     * @returns Array of Angular module configurations for feature modules
     *
     * @example
     * **Feature module with its own repositories:**
     * ```typescript
     * // Feature-specific repository context
     * export class ReportingRepositoryContext extends PlatformRepositoryContext {
     *   constructor(
     *     @Inject(REPORTING_DATABASE) private reportingDb: ReportingDatabase
     *   ) { super(); }
     * }
     *
     * // Feature module configuration
     * @NgModule({
     *   imports: [
     *     PlatformDomainModule.forChild({
     *       appModuleRepositoryContext: ReportingRepositoryContext,
     *       appModuleRepositories: [
     *         ReportRepository,
     *         AnalyticsRepository
     *       ],
     *       appModuleApis: [
     *         ReportingApiService,
     *         AnalyticsApiService
     *       ],
     *       appRepositoryErrorEventHandlers: [
     *         ReportingErrorHandler
     *       ]
     *     })
     *   ],
     *   declarations: [ReportListComponent, AnalyticsDashboardComponent]
     * })
     * export class ReportingModule { }
     * ```
     */
    public static forChild(config: {
        appModuleRepositoryContext?: Type<PlatformRepositoryContext>;
        appModuleRepositories?: Type<PlatformRepository<PlatformRepositoryContext>>[];
        appModuleApis?: Type<PlatformApiService>[];
        appRepositoryErrorEventHandlers?: Type<PlatformRepositoryErrorEventHandler>[];
    }): ModuleWithProviders<PlatformDomainModule>[] {
        return [
            {
                ngModule: PlatformDomainModule,
                providers: [
                    ...this.buildRepositoryRelatedProviders({
                        repositoryContext: config.appModuleRepositoryContext,
                        repositories: config.appModuleRepositories,
                        apis: config.appModuleApis,
                        repositoryErrorEventHandlers: config.appRepositoryErrorEventHandlers
                    })
                ]
            }
        ];
    }

    /**
     * Builds an array of providers related to repositories, APIs, and repository error handling.
     *
     * This method creates the provider configuration for:
     * - Repository context registration
     * - Repository service registration with proper dependency injection
     * - API service registration
     * - Repository error event handler registration
     * - Event manager subscriptions for repository error events
     *
     * @param config - Configuration options for repository-related providers
     * @param config.repositoryContext - Optional repository context class
     * @param config.repositories - Optional array of repository classes
     * @param config.apis - Optional array of API service classes
     * @param config.repositoryErrorEventHandlers - Optional array of repository error event handlers
     * @returns Array of Angular providers
     *
     * @internal
     * @remarks
     * This method is used internally by both forRoot() and forChild() methods to ensure
     * consistent provider registration across the application. It follows the dependency
     * injection patterns required for the platform's repository architecture.
     *
     * The method automatically sets up event subscriptions for repository error handling,
     * ensuring that all registered error handlers are properly wired to respond to
     * repository error events.
     */
    private static buildRepositoryRelatedProviders(config: {
        repositoryContext?: Type<PlatformRepositoryContext>;
        repositories?: Type<PlatformRepository<PlatformRepositoryContext>>[];
        apis?: Type<PlatformApiService>[];
        repositoryErrorEventHandlers?: Type<PlatformRepositoryErrorEventHandler>[];
    }): Provider[] {
        return [
            ...(config.repositoryContext ? [config.repositoryContext] : []),
            ...(config.repositories ? config.repositories : []),
            ...(config.apis ? config.apis : []),

            ...(config.repositoryErrorEventHandlers ?? []),
            {
                provide: PlatformEventManagerSubscriptionsMap,
                useValue: new PlatformEventManagerSubscriptionsMap(
                    config.repositoryErrorEventHandlers ? [[PlatformRepositoryErrorEvent, config.repositoryErrorEventHandlers]] : []
                ),
                multi: true
            }
        ];
    }
}
