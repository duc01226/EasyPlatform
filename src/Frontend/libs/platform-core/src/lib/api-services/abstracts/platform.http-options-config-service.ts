import { HttpClientOptions } from '../../http-services';

/**
 * Abstract base class for customizing HTTP options used by platform API services.
 *
 * @description
 * This service provides a standardized way to configure HTTP options for all
 * platform API requests. Implementations can customize headers, timeouts,
 * interceptors, and other HTTP behavior globally across the application.
 *
 * **Common Use Cases:**
 * - **Authentication**: Add Bearer tokens to all requests
 * - **Request Tracking**: Add correlation IDs for request tracing
 * - **Custom Headers**: Set application-specific headers
 * - **Timeout Configuration**: Customize request timeout values
 * - **Cache Control**: Configure cache headers for different endpoints
 *
 * **Configuration Hierarchy:**
 * 1. Default platform options (Content-Type, basic headers)
 * 2. Module configuration options (from PlatformCoreModuleConfig)
 * 3. HTTP options service customizations (this service)
 * 4. Per-request options (from individual API calls)
 *
 * @example
 * Basic authentication header injection:
 * ```typescript
 * @Injectable()
 * export class AuthHttpOptionsService extends PlatformHttpOptionsConfigService {
 *   constructor(private authService: AuthService) {
 *     super();
 *   }
 *
 *   public configOptions(options?: HttpClientOptions): HttpClientOptions {
 *     const configuredOptions = options ?? {};
 *
 *     // Add authentication header if user is logged in
 *     const token = this.authService.getAccessToken();
 *     if (token) {
 *       configuredOptions.headers = configuredOptions.headers?.set('Authorization', `Bearer ${token}`);
 *     }
 *
 *     return configuredOptions;
 *   }
 * }
 * ```
 *
 * @example
 * Request correlation and timeout configuration:
 * ```typescript
 * @Injectable()
 * export class CorrelationHttpOptionsService extends PlatformHttpOptionsConfigService {
 *   public configOptions(options?: HttpClientOptions): HttpClientOptions {
 *     const configuredOptions = options ?? {};
 *
 *     // Add correlation ID for request tracking
 *     const correlationId = this.generateCorrelationId();
 *     configuredOptions.headers = configuredOptions.headers
 *       ?.set('X-Correlation-ID', correlationId)
 *       ?.set('X-Client-Version', '1.0.0');
 *
 *     // Set custom timeout for API requests
 *     configuredOptions.timeout = 30000; // 30 seconds
 *
 *     return configuredOptions;
 *   }
 *
 *   private generateCorrelationId(): string {
 *     return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
 *   }
 * }
 * ```
 *
 * @example
 * Environment-specific configuration:
 * ```typescript
 * @Injectable()
 * export class EnvironmentHttpOptionsService extends PlatformHttpOptionsConfigService {
 *   constructor(private environmentService: EnvironmentService) {
 *     super();
 *   }
 *
 *   public configOptions(options?: HttpClientOptions): HttpClientOptions {
 *     const configuredOptions = options ?? {};
 *
 *     // Add environment-specific headers
 *     if (this.environmentService.isDevelopment()) {
 *       configuredOptions.headers = configuredOptions.headers
 *         ?.set('X-Debug-Mode', 'true')
 *         ?.set('X-Environment', 'development');
 *     }
 *
 *     // Enable detailed error reporting in non-production
 *     if (!this.environmentService.isProduction()) {
 *       configuredOptions.reportProgress = true;
 *     }
 *
 *     return configuredOptions;
 *   }
 * }
 * ```
 *
 * Registration:
 * ```typescript
 * @NgModule({
 *   providers: [
 *     {
 *       provide: PlatformHttpOptionsConfigService,
 *       useClass: AuthHttpOptionsService // or your custom implementation
 *     }
 *   ]
 * })
 * export class AppModule {}
 * ```
 *
 * @see {@link HttpClientOptions} - Angular HTTP client configuration options
 * @see {@link PlatformApiService} - Base API service that uses this configuration
 * @see {@link PlatformCoreModuleConfig} - Module-level HTTP configuration
 */
export abstract class PlatformHttpOptionsConfigService {
    /**
     * Configures HTTP options for platform API requests.
     *
     * @description
     * This method receives the base HTTP options and should return the configured
     * options with any customizations applied. The returned options will be used
     * for all HTTP requests made by platform API services.
     *
     * Configuration Guidelines:
     * - Always return a valid HttpClientOptions object
     * - Preserve existing options when possible (use spread operator)
     * - Be careful with header modifications (use HttpHeaders.set/append)
     * - Consider performance impact of heavy operations
     * - Avoid throwing exceptions (may break all API requests)
     *
     * @param options - Base HTTP options to configure (may be undefined)
     * @returns Configured HTTP options for API requests
     *
     * @example
     * ```typescript
     * public configOptions(options?: HttpClientOptions): HttpClientOptions {
     *   const configuredOptions = { ...options } ?? {};
     *
     *   // Add custom headers
     *   configuredOptions.headers = configuredOptions.headers
     *     ?.set('X-API-Version', '2.0')
     *     ?.set('Accept-Language', this.localeService.getCurrentLocale());
     *
     *   return configuredOptions;
     * }
     * ```
     */
    public abstract configOptions(options?: HttpClientOptions): HttpClientOptions;
}

/**
 * Default implementation of PlatformHttpOptionsConfigService that provides no-op configuration.
 *
 * @description
 * This default implementation returns the input options unchanged, providing
 * a safe fallback when no custom HTTP options configuration is needed.
 * It's automatically used when no custom implementation is provided.
 *
 * **When to Use:**
 * - During initial development when no custom HTTP configuration is needed
 * - In simple applications that don't require header customization
 * - As a base class for implementations that only need minimal changes
 *
 * **Behavior:**
 * - Returns input options unchanged if provided
 * - Returns empty options object if no input is provided
 * - Safe for all HTTP request scenarios
 * - Zero performance overhead
 *
 * @example
 * Default registration (automatic):
 * ```typescript
 * // This is used automatically when no custom service is provided
 * @NgModule({
 *   // No explicit registration needed - used as fallback
 * })
 * export class AppModule {}
 * ```
 *
 * @example
 * Explicit registration for clarity:
 * ```typescript
 * @NgModule({
 *   providers: [
 *     {
 *       provide: PlatformHttpOptionsConfigService,
 *       useClass: DefaultPlatformHttpOptionsConfigService
 *     }
 *   ]
 * })
 * export class AppModule {}
 * ```
 *
 * @example
 * Extending for minimal customization:
 * ```typescript
 * @Injectable()
 * export class MinimalHttpOptionsService extends DefaultPlatformHttpOptionsConfigService {
 *   public override configOptions(options?: HttpClientOptions): HttpClientOptions {
 *     const baseOptions = super.configOptions(options);
 *
 *     // Add just one custom header
 *     baseOptions.headers = baseOptions.headers?.set('X-App-Name', 'MyApp');
 *
 *     return baseOptions;
 *   }
 * }
 * ```
 */
export class DefaultPlatformHttpOptionsConfigService extends PlatformHttpOptionsConfigService {
    /**
     * Returns the input options unchanged or an empty options object.
     *
     * @param options - Optional HTTP options to pass through
     * @returns The same options or empty object if none provided
     */
    public configOptions(options?: HttpClientOptions | undefined): HttpClientOptions {
        return options ?? {};
    }
}
