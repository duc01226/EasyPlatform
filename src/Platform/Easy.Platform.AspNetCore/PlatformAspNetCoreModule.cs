#region

using System.Reflection;
using Easy.Platform.Application;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.AspNetCore.Constants;
using Easy.Platform.AspNetCore.Context.RequestContext;
using Easy.Platform.AspNetCore.Context.RequestContext.RequestContextKeyToClaimTypeMapper;
using Easy.Platform.AspNetCore.Context.RequestContext.RequestContextKeyToClaimTypeMapper.Abstract;
using Easy.Platform.AspNetCore.ExceptionHandling;
using Easy.Platform.AspNetCore.Middleware;
using Easy.Platform.AspNetCore.Middleware.Abstracts;
using Easy.Platform.AspNetCore.OpenApi;
using Easy.Platform.Common;
using Easy.Platform.Common.DependencyInjection;
using Easy.Platform.Common.HostingBackgroundServices;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Persistence;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using OpenTelemetry.Trace;

#endregion

namespace Easy.Platform.AspNetCore;

/// <summary>
/// Abstract base class for ASP.NET Core platform modules in the Easy.Platform infrastructure.
/// This class provides comprehensive ASP.NET Core integration including middleware pipeline configuration,
/// CORS policies, OpenAPI documentation, request context management, and distributed tracing capabilities.
/// </summary>
/// <remarks>
/// This module serves as the foundation for all ASP.NET Core-based EasyPlatform microservices and provides:
/// - Standardized middleware pipeline configuration with platform-specific components
/// - Request context management with multiple lifetime modes for distributed scenarios
/// - CORS policy configuration for cross-origin resource sharing
/// - OpenAPI/Swagger documentation integration with Bearer authentication
/// - Distributed tracing and telemetry instrumentation
/// - HTTP client factory configuration for service-to-service communication
/// - Background service registration and lifecycle management
/// - Data seeding and migration execution for application initialization
/// - JSON serialization configuration using platform standards
///
/// Key architectural responsibilities:
/// - Establishes the ASP.NET Core hosting environment for platform services
/// - Configures the middleware pipeline with exception handling, request correlation, and performance monitoring
/// - Provides request context that flows across async operations and service boundaries
/// - Integrates with platform dependency injection and service registration patterns
/// - Manages application lifecycle including initialization, data seeding, and graceful shutdown
/// - Ensures consistent configuration across all EasyPlatform web services
///
/// Integration with platform infrastructure:
/// - Extends PlatformModule to inherit core platform functionality
/// - Integrates with Easy.Platform persistence layer for data access patterns
/// - Supports platform CQRS patterns through automatic command/query registration
/// - Provides telemetry and monitoring integration for observability
/// - Manages configuration from multiple sources (appsettings, environment, etc.)
///
/// Usage patterns:
/// All ASP.NET Core services in the EasyPlatform platform should inherit from this module
/// to ensure consistent behavior, configuration, and integration with platform infrastructure.
/// This includes web APIs, background services with HTTP endpoints, and hybrid services
/// that combine web and background processing capabilities.
///
/// Derived classes must implement:
/// - GetAllowCorsOrigins(): Define allowed CORS origins for the service
/// - Service-specific configuration overrides as needed
///
/// The module automatically handles:
/// - Platform middleware registration and configuration
/// - Request context setup with appropriate lifetime management
/// - CORS policy configuration for development and production
/// - OpenAPI documentation with authentication schemes
/// - Background service discovery and registration
/// - Database migration and data seeding orchestration
/// </remarks>
/// <summary>
/// Represents a platform module for ASP.NET Core applications. This class is abstract.
/// </summary>
public abstract class PlatformAspNetCoreModule : PlatformModule
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformAspNetCoreModule"/> class with the specified dependencies.
    /// This constructor establishes the foundational services and configuration needed for ASP.NET Core platform integration.
    /// </summary>
    /// <param name="serviceProvider">
    /// The service provider used for dependency resolution and service instantiation throughout the module lifecycle.
    /// This provides access to all registered services and enables dependency injection patterns.
    /// </param>
    /// <param name="configuration">
    /// The configuration provider containing application settings, connection strings, and environment-specific values.
    /// Used to configure services, middleware, and platform behavior based on deployment environment.
    /// </param>
    /// <remarks>
    /// This constructor calls the base PlatformModule constructor to establish core platform functionality
    /// before adding ASP.NET Core-specific capabilities. The provided dependencies are essential for
    /// all platform operations including service registration, configuration binding, and lifecycle management.
    /// </remarks>
    public PlatformAspNetCoreModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration)
    {
    }

    /// <summary>
    /// Gets the action that configures distributed tracing instrumentation for ASP.NET Core applications.
    /// This configuration enables comprehensive observability across the EasyPlatform platform by instrumenting
    /// both ASP.NET Core request processing and outbound HTTP client calls.
    /// </summary>
    /// <remarks>
    /// The tracing configuration provides:
    /// - ASP.NET Core instrumentation for incoming HTTP requests, including request/response details,
    ///   status codes, execution times, and exception tracking
    /// - HTTP client instrumentation for outbound service-to-service communication, enabling
    ///   distributed trace correlation across microservices
    /// - Integration with OpenTelemetry standards for vendor-neutral observability
    /// - Automatic trace context propagation for distributed request correlation
    ///
    /// This instrumentation is essential for:
    /// - Performance monitoring and optimization across the platform
    /// - Distributed tracing in microservices architecture
    /// - Root cause analysis for issues spanning multiple services
    /// - Service dependency mapping and impact analysis
    /// - Compliance with observability best practices
    ///
    /// The configuration automatically integrates with platform monitoring infrastructure
    /// and supports various telemetry exporters including Jaeger, Zipkin, and cloud providers.
    /// </remarks>
    /// <value>
    /// An action that configures the <see cref="TracerProviderBuilder"/> to add ASP.NET Core
    /// and HTTP client instrumentation for comprehensive distributed tracing capabilities.
    /// </value>
    /// <summary>
    /// Gets the action that configures additional tracing for the ASP.NET Core platform module.
    /// </summary>
    /// <remarks>
    /// This action is used to add instrumentation for ASP.NET Core and HTTP client operations.
    /// </remarks>
    /// <value>
    /// The action that configures the <see cref="TracerProviderBuilder" /> for additional tracing.
    /// </value>
    public override Action<TracerProviderBuilder> AdditionalTracingSetup => builder => builder.AddAspNetCoreInstrumentation().AddHttpClientInstrumentation();

    /// <summary>
    /// Gets a value indicating whether the module should automatically scan and register CQRS handlers.
    /// When enabled, the module will automatically discover and register command handlers, query handlers,
    /// and related CQRS components from the module's assembly.
    /// </summary>
    /// <value>
    /// <c>true</c> to enable automatic CQRS handler registration; otherwise, <c>false</c>.
    /// For ASP.NET Core modules, this defaults to <c>true</c> to support the platform's CQRS patterns.
    /// </value>
    /// <remarks>
    /// This property controls the automatic registration of CQRS (Command Query Responsibility Segregation)
    /// components including:
    /// - Command handlers for write operations and business logic execution
    /// - Query handlers for read operations and data retrieval
    /// - Domain event handlers for event-driven architecture
    /// - Validators and other CQRS infrastructure components
    ///
    /// When enabled, the module scans its assembly for types implementing platform CQRS interfaces
    /// and automatically registers them with the dependency injection container using appropriate lifetimes.
    /// This reduces boilerplate code and ensures consistent registration patterns across services.
    ///
    /// Override this property to return <c>false</c> if manual CQRS registration is required
    /// or if the service doesn't use the platform's CQRS patterns.
    /// </remarks>
    /// <summary>
    /// Gets a value indicating whether the module should automatically seed application data on initialization.
    /// </summary>
    protected override bool ShouldAutoRegisterCqrsByAssembly => true;

    /// <summary>
    /// Gets a value indicating whether the module should automatically seed application data during initialization.
    /// When enabled, the module will execute data seeding operations for all dependency modules and the current module
    /// to ensure the application starts with required baseline data.
    /// </summary>
    /// <value>
    /// <c>true</c> to enable automatic data seeding during module initialization; otherwise, <c>false</c>.
    /// Default is <c>true</c> for convenience in development and deployment scenarios.
    /// </value>
    /// <remarks>
    /// This property controls whether the module automatically executes data seeding operations during
    /// the initialization phase. Data seeding includes:
    /// - Master data required for application functionality (lookup tables, default settings)
    /// - Reference data needed for business operations
    /// - Default user accounts, roles, and permissions for initial system access
    /// - Configuration data specific to the deployment environment
    ///
    /// The seeding process executes in dependency order, ensuring that prerequisite data
    /// is available before dependent modules attempt to seed their data.
    ///
    /// Override this property to return <c>false</c> when:
    /// - Manual data seeding control is required
    /// - Data seeding should be performed through separate deployment processes
    /// - The service operates in environments where automatic seeding is not appropriate
    /// - Custom seeding logic needs to be implemented
    ///
    /// When disabled, data seeding must be explicitly triggered through the
    /// <see cref="SeedDependentModulesDataAsync"/> method or external processes.
    /// </remarks>
    /// Default is True. Override this return to False if you need to seed data manually
    /// </summary>
    protected virtual bool EnableAutomaticDataSeedingOnInit => true;

    /// <summary>
    /// Gets a value indicating whether OpenAPI (Swagger) documentation should be automatically configured for the module.
    /// When enabled, the module will register OpenAPI services and configure documentation generation
    /// with platform-standard authentication and API specifications.
    /// </summary>
    /// <value>
    /// <c>true</c> to enable automatic OpenAPI documentation; otherwise, <c>false</c>.
    /// Default is <c>false</c> to allow services to opt-in to documentation generation.
    /// </value>
    /// <remarks>
    /// This property controls the automatic registration of OpenAPI/Swagger documentation services including:
    /// - OpenAPI document generation for all API endpoints
    /// - Swagger UI for interactive API exploration and testing
    /// - Platform-standard security scheme definitions (Bearer token authentication)
    /// - Consistent API documentation formatting across services
    ///
    /// When enabled, the module automatically:
    /// - Registers OpenAPI services with the dependency injection container
    /// - Configures document transformers for authentication schemes
    /// - Sets up consistent API documentation standards
    /// - Integrates with platform security configurations
    ///
    /// Override this property to return <c>true</c> for services that expose HTTP APIs
    /// and require documentation. The <see cref="AddOpenApiOptionsConfig"/> method
    /// can be overridden to customize OpenAPI configuration for specific service requirements.
    ///
    /// Services without HTTP endpoints or those requiring custom documentation
    /// solutions should keep this disabled and implement their own documentation strategy.
    /// </remarks>
    protected virtual bool AddOpenApi => false;

    /// <summary>
    /// Configures OpenAPI documentation options with platform-standard settings and authentication schemes.
    /// This method is called when <see cref="AddOpenApi"/> is enabled to customize the OpenAPI document generation
    /// with platform-specific transformers and configurations.
    /// </summary>
    /// <param name="options">
    /// The OpenAPI options instance to configure. This object contains settings for document generation,
    /// transformers, and other OpenAPI-related configurations.
    /// </param>
    /// <remarks>
    /// The default configuration includes:
    /// - <see cref="PlatformBearerSecuritySchemeTransformer"/> for automatic Bearer token authentication setup
    /// - Standard security scheme definitions for JWT token authentication
    /// - Consistent API documentation formatting across all platform services
    ///
    /// This method can be overridden in derived classes to:
    /// - Add custom document transformers for service-specific requirements
    /// - Configure additional security schemes beyond Bearer tokens
    /// - Customize API documentation appearance and behavior
    /// - Add service-specific metadata and descriptions
    ///
    /// The platform transformer automatically:
    /// - Detects configured authentication schemes in the application
    /// - Adds appropriate security definitions to the OpenAPI document
    /// - Applies authentication requirements to all API operations
    /// - Ensures consistent security documentation across services
    ///
    /// Override this method when services require:
    /// - Multiple authentication schemes (API keys, OAuth, etc.)
    /// - Custom API documentation formatting
    /// - Service-specific OpenAPI extensions
    /// - Integration with external documentation systems
    /// </remarks>
    protected virtual void AddOpenApiOptionsConfig(OpenApiOptions options)
    {
        options.AddDocumentTransformer<PlatformBearerSecuritySchemeTransformer>();
    }

    /// <summary>
    /// Configures the options for the platform slow request warning middleware.
    /// This method customizes the behavior of <see cref="PlatformSlowRequestWarningMiddleware"/>
    /// to monitor and log requests that exceed performance thresholds.
    /// </summary>
    /// <param name="options">
    /// The middleware options instance containing configuration settings for slow request detection
    /// including warning thresholds, enablement flags, and logging behavior.
    /// </param>
    /// <remarks>
    /// The default configuration:
    /// - Enables slow request monitoring in non-development environments
    /// - Uses platform-standard warning thresholds for request duration
    /// - Integrates with platform logging infrastructure for performance alerts
    ///
    /// This middleware provides essential performance monitoring by:
    /// - Measuring request execution time with high precision
    /// - Logging detailed information about slow requests including request details and context
    /// - Capturing request payloads for POST/PUT/PATCH operations for debugging
    /// - Integration with distributed tracing for performance correlation
    ///
    /// Override this method to customize:
    /// - Warning threshold values based on service-specific performance requirements
    /// - Enable/disable behavior based on environment or configuration
    /// - Additional monitoring and alerting integration
    /// - Custom logging formats or destinations
    ///
    /// The middleware is typically disabled in development environments to reduce
    /// noise during development activities but enabled in staging and production
    /// for continuous performance monitoring and optimization.
    ///
    /// Performance considerations:
    /// - The middleware has minimal overhead on request processing
    /// - Logging is performed asynchronously to avoid blocking requests
    /// - Request payload capture is limited to specific content types to manage memory usage
    /// </remarks>
    /// <param name="options"></param>
    protected virtual void SlowRequestWarningMiddlewareOptionsConfig(PlatformSlowRequestWarningMiddlewareOptions options)
    {
        options.Enabled = !PlatformEnvironment.IsDevelopment;
    }

    /// <summary>
    /// Gets the allowed CORS (Cross-Origin Resource Sharing) origins for the module.
    /// This method must be implemented by derived classes to define which external domains
    /// are permitted to make cross-origin requests to the service endpoints.
    /// </summary>
    /// <param name="configuration">
    /// The application configuration containing settings and environment-specific values
    /// that may influence CORS origin determination.
    /// </param>
    /// <returns>
    /// An array of strings representing the allowed CORS origins (e.g., "https://example.com").
    /// Return an empty array to disallow all cross-origin requests, or specific URLs to allow
    /// controlled access from external domains.
    /// </returns>
    /// <remarks>
    /// This abstract method requires implementation in derived classes to define service-specific
    /// CORS policies. The returned origins are used to configure both development and production
    /// CORS policies with appropriate security measures.
    ///
    /// CORS configuration considerations:
    /// - Development policy: Allows any origin for convenience during development
    /// - Production policy: Uses the origins returned by this method with stricter security
    /// - Wildcard subdomain support is automatically enabled for production policies
    /// - Credentials (cookies, authorization headers) are supported in production policies
    ///
    /// Common implementation patterns:
    /// - Load allowed origins from configuration files or environment variables
    /// - Return different origins based on deployment environment
    /// - Include both web client domains and mobile app domains as needed
    /// - Consider API gateway or reverse proxy configurations
    ///
    /// Security implications:
    /// - Overly permissive CORS policies can enable security vulnerabilities
    /// - Always use HTTPS origins in production environments
    /// - Validate that origins match expected client applications
    /// - Consider the principle of least privilege when defining allowed origins
    ///
    /// Example implementations:
    /// <code>
    /// // Load from configuration
    /// protected override string[] GetAllowCorsOrigins(IConfiguration configuration)
    /// {
    ///     return configuration.GetSection("CorsOrigins").Get&lt;string[]&gt;() ?? Array.Empty&lt;string&gt;();
    /// }
    ///
    /// // Environment-specific origins
    /// protected override string[] GetAllowCorsOrigins(IConfiguration configuration)
    /// {
    ///     return PlatformEnvironment.IsProduction
    ///         ? new[] { "https://app.example.com", "https://admin.example.com" }
    ///         : new[] { "http://localhost:3000", "http://localhost:4200" };
    /// }
    /// </code>
    /// </remarks>
    /// <param name="configuration">The configuration for the module.</param>
    /// <returns>An array of strings representing the allowed CORS origins.</returns>
    protected abstract string[] GetAllowCorsOrigins(IConfiguration configuration);

    /// <summary>
    /// <inheritdoc cref="PlatformModule.GetAssembliesForServiceScanning" />  <br></br>
    /// For PlatformAspNetCoreModule, by default do not support scan parent application module
    /// </summary>
    public override List<Assembly> GetAssembliesForServiceScanning()
    {
        return [Assembly];
    }

    protected override void InternalRegister(IServiceCollection serviceCollection)
    {
        base.InternalRegister(serviceCollection);

        serviceCollection.Configure<JsonOptions>(options => PlatformJsonSerializer.ConfigApplyCurrentOptions(options.SerializerOptions));
        RegisterRequestContext(serviceCollection);
        AddDefaultCorsPolicy(serviceCollection);
        serviceCollection.AddHttpClient();
        GetAssembliesForServiceScanning().ForEach(assembly => serviceCollection.RegisterHostedServicesFromType(assembly, typeof(PlatformHostingBackgroundService)));
        if (AddOpenApi)
            serviceCollection.AddOpenApi(AddOpenApiOptionsConfig);
        serviceCollection.Configure<PlatformSlowRequestWarningMiddlewareOptions>(SlowRequestWarningMiddlewareOptionsConfig);

        RegisterMiddleware(serviceCollection);
    }

    private void RegisterMiddleware(IServiceCollection serviceCollection)
    {
        serviceCollection.RegisterAllFromType<IPlatformMiddleware>(Assembly, ServiceLifeTime.Scoped);

        serviceCollection.Register<PlatformGlobalExceptionHandlerMiddleware>(ServiceLifeTime.Scoped);
        serviceCollection.Register<PlatformRequestIdGeneratorMiddleware>(ServiceLifeTime.Scoped);
        serviceCollection.Register<PlatformSlowRequestWarningMiddleware>(ServiceLifeTime.Scoped);
    }

    protected override async Task InternalInit(IServiceScope serviceScope)
    {
        await IPlatformPersistenceModule.MigrateDependentModulesApplicationDataAsync(
            moduleTypeDependencies: GetDependentModuleTypes().Select(moduleTypeProvider => moduleTypeProvider(Configuration)).ToList(),
            ServiceProvider
        );

        if (IsRootModule && EnableAutomaticDataSeedingOnInit)
            await SeedDependentModulesDataAsync();

        LogCommonAspEnvironmentVariableValues();

        void LogCommonAspEnvironmentVariableValues()
        {
            Logger.LogInformation("[PlatformModule] EnvironmentVariable AspCoreEnvironmentValue={AspCoreEnvironmentValue}", PlatformEnvironment.AspCoreEnvironmentValue);
            Logger.LogInformation("[PlatformModule] EnvironmentVariable AspCoreUrlsValue={AspCoreUrlsValue}", PlatformEnvironment.AspCoreUrlsValue);
        }
    }

    /// <summary>
    /// Executes the seed data for the application module.
    /// </summary>
    /// <returns>A Task representing the asynchronous operation.</returns>
    public async Task SeedDependentModulesDataAsync()
    {
        await PlatformApplicationModule.SeedDependentModulesDataAsync(
            moduleTypeDependencies: GetDependentModuleTypes().Select(moduleTypeProvider => moduleTypeProvider(Configuration)).ToList(),
            ServiceProvider
        );
    }

    /// <summary>
    /// Adds the default CORS policy for the module.
    /// </summary>
    /// <param name="serviceCollection">The service collection to add the policy to.</param>
    protected virtual void AddDefaultCorsPolicy(IServiceCollection serviceCollection)
    {
        serviceCollection.AddCors(options =>
            options.AddPolicy(
                PlatformAspNetCoreModuleDefaultPolicies.DevelopmentCorsPolicy,
                builder =>
                    builder
                        .AllowAnyOrigin()
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                        .WithExposedHeaders(DefaultCorsPolicyExposedHeaders())
                        .SetPreflightMaxAge(DefaultCorsPolicyPreflightMaxAge())
            )
        );

        serviceCollection.AddCors(options =>
            options.AddPolicy(
                PlatformAspNetCoreModuleDefaultPolicies.CorsPolicy,
                builder =>
                    builder
                        .WithOrigins(GetAllowCorsOrigins(Configuration) ?? [])
                        .SetIsOriginAllowedToAllowWildcardSubdomains()
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                        .AllowCredentials()
                        .WithExposedHeaders(DefaultCorsPolicyExposedHeaders())
                        .SetPreflightMaxAge(DefaultCorsPolicyPreflightMaxAge())
            )
        );
    }

    /// <summary>
    /// Used to override WithExposedHeaders for Cors. Default has
    /// <see cref="PlatformAspnetConstant.CommonHttpHeaderNames.RequestId" />
    /// </summary>
    protected virtual string[] DefaultCorsPolicyExposedHeaders()
    {
        return [PlatformAspnetConstant.CommonHttpHeaderNames.RequestId, "Content-Disposition"];
    }

    /// <summary>
    /// DefaultCorsPolicyPreflightMaxAge for AddDefaultCorsPolicy and UseDefaultCorsPolicy. Default is 1 day.
    /// </summary>
    protected virtual TimeSpan DefaultCorsPolicyPreflightMaxAge()
    {
        return 1.Days();
    }

    /// <summary>
    /// Registers the user context in the provided service collection.
    /// </summary>
    /// <param name="serviceCollection">The service collection where the user context will be registered.</param>
    /// <remarks>
    /// This method adds the HttpContextAccessor to the service collection and registers the PlatformAspNetApplicationRequestContextAccessor as a singleton service for the IPlatformApplicationRequestContextAccessor interface.
    /// It also registers the RequestContextKeyToClaimTypeMapper in the service collection.
    /// </remarks>
    protected void RegisterRequestContext(
        IServiceCollection serviceCollection,
        PlatformDefaultApplicationRequestContextAccessor.ContextLifeTimeModes contextLifeTimeMode =
            PlatformDefaultApplicationRequestContextAccessor.ContextLifeTimeModes.PerScopeCombinedWithAsyncLocalTaskFlow
    )
    {
        serviceCollection.AddHttpContextAccessor();
        serviceCollection.Register(
            typeof(IPlatformApplicationRequestContextAccessor),
            sp => new PlatformAspNetApplicationRequestContextAccessor(sp, contextLifeTimeMode, sp.GetRequiredService<ILoggerFactory>()),
            ServiceLifeTime.Scoped,
            replaceIfExist: true,
            DependencyInjectionExtension.CheckRegisteredStrategy.ByService
        );

        RegisterRequestContextKeyToClaimTypeMapper(serviceCollection);
    }

    /// <summary>
    /// This function is used to register implementation for
    /// <see cref="IPlatformApplicationRequestContextKeyToClaimTypeMapper" />
    /// Default implementation is <see cref="PlatformApplicationRequestContextKeyToJwtClaimTypeMapper" />
    /// </summary>
    /// <returns></returns>
    protected virtual Type RequestContextKeyToClaimTypeMapperType()
    {
        return typeof(PlatformApplicationRequestContextKeyToJwtClaimTypeMapper);
    }

    /// <summary>
    /// Registers the RequestContextKeyToClaimTypeMapper in the service collection.
    /// </summary>
    /// <param name="serviceCollection">The service collection to add the service to.</param>
    private void RegisterRequestContextKeyToClaimTypeMapper(IServiceCollection serviceCollection)
    {
        serviceCollection.Register(typeof(IPlatformApplicationRequestContextKeyToClaimTypeMapper), RequestContextKeyToClaimTypeMapperType(), ServiceLifeTime.Singleton);
    }
}

public static class InitPlatformAspNetCoreModuleExtension
{
    /// <summary>
    /// Init module to start running init for all other modules and this module itself
    /// </summary>
    public static async Task InitPlatformAspNetCoreModule<TModule>(this IApplicationBuilder app)
        where TModule : PlatformAspNetCoreModule
    {
        using (var scope = app.ApplicationServices.CreateTrackedScope())
            await scope.ServiceProvider.GetRequiredService<TModule>().InitializeAsync(app);
    }
}
