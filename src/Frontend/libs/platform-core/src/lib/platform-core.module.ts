import { CommonModule } from '@angular/common';
import { ErrorHandler, ModuleWithProviders, NgModule, Provider, Type } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { MissingTranslationHandler, TranslateModule, TranslateModuleConfig } from '@ngx-translate/core';
import { GlobalConfig, ToastrModule } from 'ngx-toastr';

import {
    DefaultPlatformHttpOptionsConfigService,
    PlatformApiErrorEvent,
    PlatformApiErrorEventHandler,
    PlatformApiService,
    PlatformHttpOptionsConfigService
} from './api-services';
import { PlatformCacheStorageCachingService, PlatformCachingService } from './caching';
import { IPlatformEventManager, PlatformEvent, PlatformEventHandler, PlatformEventManager, PlatformEventManagerSubscriptionsMap } from './events';
import { PlatformPipe } from './pipes';
import { PLATFORM_CORE_GLOBAL_ENV } from './platform-core-global-environment';
import { PlatformCoreModuleConfig } from './platform-core.config';
import { PlatformGlobalErrorHandler } from './platform-global-error-handler';
import { PlatformServiceWorkerService } from './platform-service-worker';
import { PlatformDefaultMissingTranslationHandler, PlatformTranslateConfig } from './translations';
import { list_selectMany } from './utils';

/* eslint-disable @typescript-eslint/no-unused-vars */
type ForRootModules = PlatformCoreModule | BrowserModule | BrowserAnimationsModule;
type ForChildModules = PlatformCoreModule;

/**
 * Angular module for core platform features, providing essential services and configurations.
 *
 * This module serves as the foundational layer for Angular applications using the platform architecture.
 * It includes common Angular modules, platform-specific services, event management, caching,
 * internationalization, error handling, and HTTP configuration.
 *
 * @remarks
 * The PlatformCoreModule is designed to be imported once at the application root level using `forRoot()`,
 * and can be imported in feature modules using `forChild()` for additional services.
 *
 * Key features provided:
 * - Event management system with custom event handlers
 * - HTTP interceptors and configuration services
 * - Caching services with configurable storage backends
 * - Internationalization with platform-specific translation configuration
 * - Global error handling
 * - Service worker integration
 * - Toast notification system
 *
 * @example
 * **Basic usage in AppModule:**
 * ```typescript
 * import { PlatformCoreModule } from '@libs/platform-core';
 *
 * @NgModule({
 *   imports: [
 *     PlatformCoreModule.forRoot({
 *       moduleConfig: {
 *         type: PlatformCoreModuleConfig,
 *         configFactory: () => new PlatformCoreModuleConfig({
 *           isDevelopment: !environment.production
 *         })
 *       },
 *       translate: {
 *         platformConfig: new PlatformTranslateConfig({
 *           defaultLanguage: 'en',
 *           slowRequestBreakpoint: 500
 *         })
 *       }
 *     })
 *   ],
 *   // ...other module configuration
 * })
 * export class AppModule { }
 * ```
 *
 * @example
 * **Advanced configuration with custom services:**
 * ```typescript
 * import { PlatformCoreModule } from '@libs/platform-core';
 *
 * @NgModule({
 *   imports: [
 *     PlatformCoreModule.forRoot({
 *       moduleConfig: {
 *         type: AppModuleConfig,
 *         configFactory: () => new AppModuleConfig({ isDevelopment: !environment.production })
 *       },
 *       httpOptionsConfigService: CustomHttpOptionsConfigService,
 *       apiServices: [UserApiService, ProductApiService],
 *       cachingServiceFactory: () => new CustomCachingService(),
 *       appApiErrorEventHandlers: [NoPermissionApiErrorEventHandler],
 *       eventHandlerMaps: [
 *         [CustomEvent, [CustomEventHandler]]
 *       ],
 *       translate: {
 *         platformConfig: new PlatformTranslateConfig({
 *           defaultLanguage: 'en',
 *           availableLangs: [
 *             new PlatformLanguageItem('English', 'en', 'ENG'),
 *             new PlatformLanguageItem('Vietnamese', 'vi', 'VN')
 *           ]
 *         })
 *       },
 *       toastConfig: {
 *         newestOnTop: true,
 *         positionClass: 'toast-bottom-right',
 *         preventDuplicates: true
 *       }
 *     })
 *   ]
 * })
 * export class AppModule { }
 * ```
 *
 * @example
 * **Usage in feature modules:**
 * ```typescript
 * import { PlatformCoreModule } from '@libs/platform-core';
 *
 * @NgModule({
 *   imports: [
 *     PlatformCoreModule.forChild({
 *       apiServices: [FeatureApiService],
 *       httpOptionsConfigService: FeatureHttpOptionsConfigService
 *     })
 *   ]
 * })
 * export class FeatureModule { }
 * ```
 *
 * @ngModule PlatformCoreModule
 * @exports CommonModule, FormsModule, ReactiveFormsModule
 */
@NgModule({
    declarations: [],
    exports: [CommonModule, FormsModule, ReactiveFormsModule]
})
export class PlatformCoreModule {
    /**
     * Creates and configures the PlatformCoreModule for the root application module.
     *
     * This method sets up the core platform infrastructure including:
     * - Module configuration and dependency injection
     * - Event management system with custom event handlers
     * - HTTP services and interceptors
     * - Caching services
     * - Internationalization and translation services
     * - Global error handling
     * - Toast notifications
     * - Service worker integration
     *
     * @template TModuleConfig - The type of module configuration extending PlatformCoreModuleConfig
     * @param config - Configuration options for the platform core module
     * @param config.moduleConfig - Optional module configuration with custom type and factory
     * @param config.eventManager - Optional custom event manager implementation
     * @param config.eventHandlerMaps - Optional mapping of events to their handlers
     * @param config.apiServices - Optional array of API service classes to register
     * @param config.httpOptionsConfigService - Optional custom HTTP options configuration service
     * @param config.translate - Optional translation configuration including platform and ngx-translate settings
     * @param config.toastConfig - Optional toast notification configuration
     * @param config.cachingServiceFactory - Optional factory function for custom caching service
     * @param config.appApiErrorEventHandlers - Optional array of API error event handlers
     * @returns Array of Angular module configurations for the root application
     *
     * @example
     * **Real-world usage from growth-for-company app:**
     * ```typescript
     * PlatformCoreModule.forRoot({
     *   moduleConfig: {
     *     type: PlatformCoreModuleConfig,
     *     configFactory: () => new PlatformCoreModuleConfig({
     *       isDevelopment: environment.isLocalDev == true,
     *       disableMissingTranslationWarnings: environment.disableMissingTranslationWarnings == true
     *     })
     *   },
     *   translate: {
     *     platformConfig: new PlatformTranslateConfig({
     *       defaultLanguage: 'en',
     *       slowRequestBreakpoint: 500,
     *       availableLangs: [
     *         new PlatformLanguageItem('English', 'en', 'ENG'),
     *         new PlatformLanguageItem('Vietnamese', 'vi', 'VN'),
     *         new PlatformLanguageItem('Norsk', 'nb', 'NO'),
     *         new PlatformLanguageItem('Svenska (Beta)', 'sv', 'SE')
     *       ]
     *     }),
     *     config: {
     *       loader: {
     *         provide: TranslateLoader,
     *         useFactory: TranslateHttpLoaderFactory,
     *         deps: [HttpClient]
     *       }
     *     }
     *   },
     *   toastConfig: {
     *     newestOnTop: true,
     *     positionClass: 'toast-bottom-right',
     *     preventDuplicates: true,
     *     enableHtml: true,
     *     toastComponent: TranslatedToastComponent
     *   },
     *   httpOptionsConfigService: CustomHttpOptionsConfigService,
     *   appApiErrorEventHandlers: [NoPermissionApiErrorEventHandler]
     * })
     * ```
     */
    public static forRoot<TModuleConfig extends PlatformCoreModuleConfig = PlatformCoreModuleConfig>(config: {
        moduleConfig?: {
            type: Type<TModuleConfig>;
            configFactory: () => TModuleConfig;
        };
        eventManager?: Type<IPlatformEventManager>;
        eventHandlerMaps?: [Type<PlatformEvent>, Type<PlatformEventHandler<PlatformEvent>>[]][];

        apiServices?: Type<PlatformApiService>[];
        httpOptionsConfigService?: Type<PlatformHttpOptionsConfigService>;
        translate?: { platformConfig?: PlatformTranslateConfig; config?: TranslateModuleConfig };
        toastConfig?: Partial<GlobalConfig>;
        cachingServiceFactory?: () => PlatformCachingService;
        appApiErrorEventHandlers?: Type<PlatformApiErrorEventHandler>[];
    }): ModuleWithProviders<ForRootModules>[] {
        return [
            {
                ngModule: PlatformCoreModule,
                providers: [
                    ...(config.moduleConfig != null
                        ? [
                              { provide: PlatformCoreModuleConfig, useExisting: config.moduleConfig.type },
                              {
                                  provide: config.moduleConfig.type,
                                  useFactory: () => config.moduleConfig?.configFactory()
                              }
                          ]
                        : [
                              {
                                  provide: PlatformCoreModuleConfig,
                                  useFactory: () => new PlatformCoreModuleConfig()
                              }
                          ]),

                    {
                        provide: PlatformEventManagerSubscriptionsMap,
                        useValue: new PlatformEventManagerSubscriptionsMap(config.eventHandlerMaps ?? []),
                        multi: true
                    },
                    // Register all eventHandlers from eventHandlerMaps
                    ...(config.eventHandlerMaps != null ? list_selectMany(config.eventHandlerMaps, ([event, eventHandlers]) => eventHandlers) : []),
                    {
                        provide: PlatformEventManager,
                        useClass: config.eventManager ?? PlatformEventManager
                    },

                    ...this.buildCanBeInChildModuleProviders({
                        apiServices: config.apiServices,
                        httpOptionsConfigService: config.httpOptionsConfigService
                    }),
                    {
                        provide: PlatformTranslateConfig,
                        useValue: config.translate?.platformConfig != null ? config.translate.platformConfig : PlatformTranslateConfig.defaultConfig()
                    },
                    {
                        provide: PlatformCachingService,
                        useFactory: () => (config.cachingServiceFactory != null ? config.cachingServiceFactory() : new PlatformCacheStorageCachingService())
                    },
                    PlatformServiceWorkerService,
                    { provide: ErrorHandler, useClass: PlatformGlobalErrorHandler },

                    ...(config.appApiErrorEventHandlers ?? []),
                    {
                        provide: PlatformEventManagerSubscriptionsMap,
                        useValue: new PlatformEventManagerSubscriptionsMap(
                            config.appApiErrorEventHandlers ? [[PlatformApiErrorEvent, config.appApiErrorEventHandlers]] : []
                        ),
                        multi: true
                    }
                ]
            },
            {
                ngModule: BrowserModule
            },
            {
                ngModule: BrowserAnimationsModule
            },
            {
                ngModule: RouterModule
            },
            TranslateModule.forRoot({
                missingTranslationHandler: {
                    provide: MissingTranslationHandler,
                    useClass: PlatformDefaultMissingTranslationHandler
                },
                ...(config.translate?.config ?? {})
            }),
            ToastrModule.forRoot(
                config.toastConfig ?? {
                    newestOnTop: true,
                    positionClass: 'toast-bottom-right',
                    preventDuplicates: true,
                    enableHtml: true
                }
            )
        ];
    }

    /**
     * Creates and configures the PlatformCoreModule for feature modules.
     *
     * This method provides a subset of platform services for feature modules,
     * specifically focusing on API services and HTTP configuration that may be
     * module-specific.
     *
     * @param config - Configuration options for the platform core module in feature modules
     * @param config.apiServices - Optional array of API service classes specific to the feature module
     * @param config.httpOptionsConfigService - Optional HTTP options configuration service for the feature module
     * @returns Array of Angular module configurations for feature modules
     *
     * @example
     * **Usage in a feature module:**
     * ```typescript
     * // In a feature module like user management
     * @NgModule({
     *   imports: [
     *     PlatformCoreModule.forChild({
     *       apiServices: [UserApiService, RoleApiService],
     *       httpOptionsConfigService: UserModuleHttpOptionsConfigService
     *     })
     *   ],
     *   declarations: [UserListComponent, UserDetailComponent],
     *   providers: [UserService, RoleService]
     * })
     * export class UserModule { }
     * ```
     */
    public static forChild(config: {
        apiServices?: Type<PlatformApiService>[];
        httpOptionsConfigService?: Type<PlatformHttpOptionsConfigService>;
    }): ModuleWithProviders<ForChildModules>[] {
        return [
            {
                ngModule: PlatformCoreModule,
                providers: [
                    ...this.buildCanBeInChildModuleProviders({
                        apiServices: config.apiServices,
                        httpOptionsConfigService: config.httpOptionsConfigService
                    })
                ]
            }
        ];
    }

    /**
     * Builds an array of providers that can be shared between root and child modules.
     *
     * This method creates the common provider configuration for API services,
     * HTTP options configuration, and pipes that can be used across different
     * modules in the application.
     *
     * @param config - Configuration options for shared providers
     * @param config.apiServices - Optional array of API service classes to register
     * @param config.httpOptionsConfigService - Optional HTTP options configuration service
     * @param config.pipes - Optional array of custom pipe classes
     * @returns Array of Angular providers
     *
     * @internal
     * @remarks
     * This method is used internally by both forRoot() and forChild() methods to ensure
     * consistent provider registration across the application.
     */
    private static buildCanBeInChildModuleProviders(config: {
        apiServices?: Type<PlatformApiService>[];
        httpOptionsConfigService?: Type<PlatformHttpOptionsConfigService>;
        pipes?: Type<PlatformPipe<unknown, unknown, unknown>>[];
    }): Provider[] {
        return [
            DefaultPlatformHttpOptionsConfigService,
            ...(config.httpOptionsConfigService != null ? [config.httpOptionsConfigService] : []),
            {
                provide: PlatformHttpOptionsConfigService,
                useExisting: config.httpOptionsConfigService ?? DefaultPlatformHttpOptionsConfigService
            },
            ...(config.apiServices ?? []),
            ...(config.pipes ?? [])
        ];
    }

    /**
     * Constructor for PlatformCoreModule.
     *
     * @param moduleConfig - The platform core module configuration instance
     * @param cachingService - The platform caching service instance (injected for early initialization)
     *
     * @remarks
     * The caching service is injected in the constructor to ensure it's initialized
     * as soon as possible during the application bootstrap process. This is important
     * for modules that depend on caching functionality during their initialization.
     *
     * The constructor also configures the global platform environment based on the
     * module configuration, specifically setting the development mode flag that
     * affects various platform behaviors throughout the application.
     */
    constructor(
        public moduleConfig: PlatformCoreModuleConfig,
        public cachingService: PlatformCachingService // (I) Inject PlatformCachingService to make it init asap
    ) {
        PLATFORM_CORE_GLOBAL_ENV.isLocalDev = moduleConfig.isDevelopment;

        // (I) Inject PlatformCachingService to make it init asap
    }
}
