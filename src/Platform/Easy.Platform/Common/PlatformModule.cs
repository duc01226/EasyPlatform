#region

using System.Collections.Concurrent;
using System.Reflection;
using System.Text.Json;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Cqrs.Events;
using Easy.Platform.Common.DependencyInjection;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.HostingBackgroundServices;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Common.Utils;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using OpenTelemetry.Exporter;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Pyroscope;

#endregion

namespace Easy.Platform.Common;

/// <summary>
/// Defines the contract for platform modules in the Easy.Platform infrastructure.
/// Platform modules are the fundamental building blocks of the EasyPlatform architecture,
/// providing modular service registration, dependency management, and lifecycle coordination.
/// </summary>
/// <remarks>
/// This interface establishes the core contract that all platform modules must implement,
/// enabling the platform's modular architecture with the following key capabilities:
///
/// <strong>Module Lifecycle Management:</strong>
/// - Service registration phase for dependency injection setup
/// - Initialization phase for application startup and data seeding
/// - Priority-based execution ordering for complex dependency scenarios
/// - Graceful shutdown and resource cleanup
///
/// <strong>Dependency Management:</strong>
/// - Hierarchical module dependencies with parent-child relationships
/// - Automatic dependency resolution and ordering
/// - Child module discovery and management
/// - Cross-module service sharing and integration
///
/// <strong>Service Integration:</strong>
/// - Dependency injection container integration
/// - Configuration management and binding
/// - Logging infrastructure setup
/// - Distributed tracing and observability
///
/// <strong>Module Types:</strong>
/// - Root modules: Entry points for applications (typically ASP.NET Core or Application modules)
/// - Child modules: Dependency modules that provide specific functionality
/// - Infrastructure modules: Core platform services (persistence, caching, messaging)
/// - Domain modules: Business logic and domain-specific functionality
///
/// The platform uses a sophisticated initialization system that:
/// - Executes modules in dependency order based on priority values
/// - Supports parallel initialization where dependencies allow
/// - Provides comprehensive logging and monitoring of the initialization process
/// - Handles complex scenarios like database initialization and data seeding
///
/// Common module implementation patterns:
/// - PlatformAspNetCoreModule: Web applications and APIs
/// - PlatformApplicationModule: Business logic and application services
/// - PlatformPersistenceModule: Data access and persistence
/// - PlatformInfrastructureModule: Cross-cutting concerns and utilities
/// </remarks>
public interface IPlatformModule
{
    /// <summary>
    /// The default maximum wait time in seconds for module initialization completion.
    /// This timeout ensures that the application doesn't hang indefinitely waiting for modules to initialize.
    /// </summary>
    /// <value>
    /// 432,000 seconds (5 days), providing ample time for complex initialization scenarios
    /// including large data migrations, external service integrations, and distributed system coordination.
    /// </value>
    /// <remarks>
    /// This generous timeout accommodates:
    /// - Large database migrations and data seeding operations
    /// - External service dependency resolution and health checks
    /// - Distributed cache warming and content pre-loading
    /// - Complex business rule validation and system verification
    /// - Network-dependent initialization in cloud environments
    /// </remarks>
    public const int DefaultInitializationTimeoutSeconds = 86400 * 5;

    /// <summary>
    /// The default log category used for platform module logging operations.
    /// This provides a consistent logging namespace for all platform infrastructure components.
    /// </summary>
    /// <value>
    /// "Easy.Platform" - the root namespace for all platform-related logging events.
    /// </value>
    /// <remarks>
    /// This category is used for:
    /// - Module lifecycle events (registration, initialization, disposal)
    /// - Dependency resolution and management
    /// - Service registration and configuration
    /// - Error handling and diagnostic information
    /// - Performance monitoring and optimization insights
    ///
    /// Logging under this category enables:
    /// - Centralized platform infrastructure monitoring
    /// - Consistent log filtering and aggregation
    /// - Operational visibility into platform behavior
    /// - Debugging and troubleshooting capabilities
    /// </remarks>
    public const string DefaultLogCategory = "Easy.Platform";

    /// <summary>
    /// Gets the execution priority for module initialization, determining the order in which modules are initialized.
    /// Higher priority values are executed before lower priority values within the same dependency level.
    /// </summary>
    /// <value>
    /// An integer representing the initialization priority. Default value is 10.
    /// </value>
    /// <remarks>
    /// The platform uses a sophisticated priority-based initialization system to handle complex dependency scenarios:
    ///
    /// <strong>Standard Priority Levels:</strong>
    /// - Infrastructure Modules (Database-independent): Priority 50-100
    /// - Persistence Modules: Priority 30-49
    /// - Infrastructure Modules (Database-dependent): Priority 20-29
    /// - Application/Domain Modules: Priority 10 (default)
    /// - Integration/API Modules: Priority 1-9
    ///
    /// <strong>Initialization Flow:</strong>
    /// 1. Modules are grouped by dependency level (parent → child relationships)
    /// 2. Within each level, modules are ordered by InitializationPriority (descending)
    /// 3. Higher priority modules in the same level initialize first
    /// 4. Modules with the same priority can initialize in parallel
    ///
    /// <strong>Common Scenarios:</strong>
    /// - Database connection setup before data access layers
    /// - Configuration loading before dependent services
    /// - External service health checks before business logic
    /// - Cache warming before request processing
    ///
    /// This priority system ensures reliable startup sequences in complex distributed systems
    /// while maintaining optimal parallel initialization where dependencies allow.
    /// </remarks>
    public int InitializationPriority { get; }

    /// <summary>
    /// Gets the service collection used for dependency injection registration during the module registration phase.
    /// This collection contains all services that will be available in the application's dependency injection container.
    /// </summary>
    /// <value>
    /// The <see cref="IServiceCollection"/> instance used for service registration.
    /// </value>
    /// <remarks>
    /// This property provides access to the service collection during module registration and initialization.
    /// It enables modules to:
    /// - Register their own services and dependencies
    /// - Access previously registered services from other modules
    /// - Configure service lifetimes and implementations
    /// - Set up cross-module service dependencies
    ///
    /// The service collection is populated during the RegisterServices phase and becomes read-only
    /// after the service provider is built during application startup.
    /// </remarks>
    public IServiceCollection ServiceCollection { get; }

    /// <summary>
    /// Gets the service provider used for dependency resolution and service instantiation.
    /// This is the fully configured dependency injection container after all modules have registered their services.
    /// </summary>
    /// <value>
    /// The <see cref="IServiceProvider"/> instance used for dependency resolution.
    /// </value>
    /// <remarks>
    /// The service provider is the core of the platform's dependency injection system, providing:
    ///
    /// <strong>Service Resolution:</strong>
    /// - Singleton services shared across the application
    /// - Scoped services tied to request/operation lifecycles
    /// - Transient services created on each resolution
    /// - Complex dependency graphs with automatic injection
    ///
    /// <strong>Module Integration:</strong>
    /// - Cross-module service access and communication
    /// - Shared infrastructure services (logging, configuration, tracing)
    /// - Platform services (CQRS, event handling, background tasks)
    ///
    /// <strong>Lifecycle Management:</strong>
    /// - Automatic disposal of disposable services
    /// - Scope creation for isolated operations
    /// - Memory management and resource cleanup
    ///
    /// The service provider becomes available after module registration completes
    /// and remains accessible throughout the application lifecycle.
    /// </remarks>
    public IServiceProvider ServiceProvider { get; }

    /// <summary>
    /// Gets the configuration object providing access to application settings and environment-specific values.
    /// This includes appsettings.json files, environment variables, and other configuration sources.
    /// </summary>
    /// <value>
    /// The <see cref="IConfiguration"/> instance containing all application configuration data.
    /// </value>
    /// <remarks>
    /// The configuration system provides hierarchical access to application settings with:
    ///
    /// <strong>Configuration Sources (in order of precedence):</strong>
    /// - Command line arguments (highest priority)
    /// - Environment variables
    /// - User secrets (development only)
    /// - appsettings.{Environment}.json
    /// - appsettings.json (lowest priority)
    ///
    /// <strong>Module Configuration Patterns:</strong>
    /// - Module-specific configuration sections
    /// - Environment-aware settings (Development, Staging, Production)
    /// - Feature flags and conditional behavior
    /// - Connection strings and external service endpoints
    /// - Security settings and API keys
    ///
    /// <strong>Usage Examples:</strong>
    /// - Database connection string resolution
    /// - Feature toggle evaluation
    /// - External service endpoint configuration
    /// - Performance tuning parameters
    /// - Environment-specific behavior modification
    ///
    /// Configuration values are resolved at runtime, enabling dynamic behavior
    /// based on deployment environment and operational requirements.
    /// </remarks>
    public IConfiguration Configuration { get; }

    /// <summary>
    /// Gets or sets a value indicating whether this module is a child module that other modules depend on.
    /// Child modules are typically infrastructure, persistence, or shared service modules.
    /// </summary>
    /// <value>
    /// <c>true</c> if this module is a dependency of other modules; <c>false</c> if it's a root module.
    /// </value>
    /// <remarks>
    /// The child module designation affects module lifecycle and initialization behavior:
    ///
    /// <strong>Child Module Characteristics:</strong>
    /// - Provides services that other modules consume
    /// - Initializes before modules that depend on it
    /// - Cannot be a root module (mutually exclusive)
    /// - Often represents cross-cutting concerns or shared functionality
    ///
    /// <strong>Common Child Module Types:</strong>
    /// - PlatformPersistenceModule: Data access and database services
    /// - PlatformInfrastructureModule: Logging, caching, messaging
    /// - PlatformSecurityModule: Authentication and authorization
    /// - Domain-specific shared modules: Common business logic
    ///
    /// <strong>Dependency Resolution:</strong>
    /// - Child modules are automatically discovered through GetDependentModuleTypes()
    /// - The platform sets IsChildModule = true when a module is referenced as a dependency
    /// - Child modules initialize first to ensure their services are available
    ///
    /// This property is automatically managed by the platform's dependency resolution system
    /// but can be explicitly set for custom initialization scenarios.
    /// </remarks>
    public bool IsChildModule { get; set; }

    /// <summary>
    /// Gets a value indicating whether this module is a root module - the primary entry point for the application.
    /// Root modules are typically ASP.NET Core API modules or standalone application modules.
    /// </summary>
    /// <value>
    /// <c>true</c> if this module is a root module; <c>false</c> if it's a child module.
    /// </value>
    /// <remarks>
    /// Root modules have special responsibilities in the platform architecture:
    ///
    /// <strong>Root Module Responsibilities:</strong>
    /// - Application entry point and startup coordination
    /// - Global service configuration (tracing, logging, profiling)
    /// - Module dependency tree initialization
    /// - Application lifecycle management
    /// - Cross-cutting concern setup (CORS, security, middleware)
    ///
    /// <strong>Common Root Module Types:</strong>
    /// - PlatformAspNetCoreModule: Web APIs and HTTP-based applications
    /// - PlatformApplicationModule: Console applications and background services
    /// - Custom application-specific root modules
    ///
    /// <strong>Initialization Behavior:</strong>
    /// - Root modules initialize last, after all dependencies
    /// - Only root modules configure global settings like distributed tracing
    /// - Root modules coordinate the overall application startup sequence
    ///
    /// The platform automatically determines root module status based on dependency relationships.
    /// A module is considered root when no other modules declare it as a dependency.
    /// </remarks>
    public bool IsRootModule => CheckIsRootModule(this);

    /// <summary>
    /// Gets the assembly containing the current module implementation.
    /// This assembly is used for service scanning, resource loading, and reflection-based operations.
    /// </summary>
    /// <value>
    /// The <see cref="Assembly"/> instance containing this module's implementation.
    /// </value>
    /// <remarks>
    /// The module assembly is used throughout the platform for various operations:
    ///
    /// <strong>Service Registration:</strong>
    /// - Automatic scanning for service implementations
    /// - Discovery of CQRS handlers, validators, and pipeline behaviors
    /// - Registration of module-specific helpers and utilities
    ///
    /// <strong>Resource Management:</strong>
    /// - Embedded resource loading (configuration files, templates)
    /// - Assembly metadata access (version, name, description)
    /// - Localization and resource string resolution
    ///
    /// <strong>Reflection Operations:</strong>
    /// - Type discovery and instantiation
    /// - Attribute-based configuration and behavior
    /// - Dynamic proxy generation and interception
    ///
    /// <strong>Distributed Tracing:</strong>
    /// - Assembly name used for service identification in traces
    /// - Module-specific activity source configuration
    /// - Performance profiling and monitoring
    ///
    /// The assembly property provides the foundation for the platform's convention-based
    /// service discovery and configuration patterns.
    /// </remarks>
    public Assembly Assembly { get; }

    /// <summary>
    /// Gets a value indicating whether the RegisterServices method has been executed for this module.
    /// This prevents duplicate service registration and ensures proper module lifecycle management.
    /// </summary>
    /// <value>
    /// <c>true</c> if services have been registered; <c>false</c> otherwise.
    /// </value>
    /// <remarks>
    /// This property is used by the platform to track module registration state and prevent issues like:
    /// - Duplicate service registrations that could cause conflicts
    /// - Premature service resolution before registration completes
    /// - Circular dependency registration loops
    /// - Memory leaks from repeated registration operations
    ///
    /// The platform uses this flag in conjunction with thread-safe registration locks
    /// to ensure reliable module initialization in concurrent scenarios.
    /// </remarks>
    public bool AreServicesRegistered { get; }

    /// <summary>
    /// Gets a value indicating whether the module initialization (Init method) has completed successfully.
    /// This ensures modules are fully ready before dependent modules or application logic proceeds.
    /// </summary>
    /// <value>
    /// <c>true</c> if the module has been fully initialized; <c>false</c> otherwise.
    /// </value>
    /// <remarks>
    /// Module initialization completion indicates that:
    /// - All dependency modules have been successfully initialized
    /// - Module-specific initialization logic has executed
    /// - Services are registered and available for dependency injection
    /// - External resources (databases, caches, services) are connected and ready
    /// - Performance profiling and distributed tracing are configured
    ///
    /// The platform uses this property to coordinate complex initialization sequences
    /// and provide reliable startup ordering in distributed system scenarios.
    /// </remarks>
    public bool IsFullyInitialized { get; }

    /// <summary>
    /// Gets the action that configures additional tracing settings for the platform module.
    /// </summary>
    /// <value>
    /// The action that accepts a <see cref="TracerProviderBuilder" /> and configures it.
    /// </value>
    /// <remarks>
    /// This property can be used to add custom tracing configurations for the platform module.
    /// </remarks>
    public Action<TracerProviderBuilder> AdditionalTracingSetup { get; }

    /// <summary>
    /// Creates a default logger instance using the platform's standard logging configuration.
    /// This provides a consistent logging experience across all platform modules and components.
    /// </summary>
    /// <param name="serviceProvider">The service provider used to resolve the logger factory and create the logger instance.</param>
    /// <returns>
    /// An <see cref="ILogger"/> instance configured with the platform's default log category and settings.
    /// </returns>
    /// <remarks>
    /// This static factory method ensures consistent logger creation across the platform by:
    /// - Using the standardized DefaultLogCategory for consistent log filtering
    /// - Leveraging the DI container's configured ILoggerFactory
    /// - Providing a fallback when modules don't have access to their own logger instances
    ///
    /// The created logger inherits all configuration from the application's logging setup,
    /// including log levels, output targets, and formatting rules.
    /// </remarks>
    public static ILogger CreateDefaultLogger(IServiceProvider serviceProvider)
    {
        return serviceProvider.GetRequiredService<ILoggerFactory>().CreateLogger(DefaultLogCategory);
    }

    /// <summary>
    /// Waits until all modules of a specific type are initiated.
    /// This method provides synchronization capabilities for complex module initialization scenarios.
    /// </summary>
    /// <param name="serviceProvider">The service provider to fetch services.</param>
    /// <param name="moduleType">The type of the modules to wait for.</param>
    /// <param name="logger">The logger to log information. If null, a default logger will be created.</param>
    /// <param name="logSuffix">The suffix for the log information.</param>
    /// <param name="notLogging">If true not log information</param>
    /// <returns>A Task representing the asynchronous operation.</returns>
    /// <remarks>
    /// This method is essential for coordinating complex initialization sequences where:
    /// - Multiple modules of the same type need to complete initialization
    /// - Dependent services must wait for infrastructure modules to be ready
    /// - Database seeding operations require all persistence modules to be online
    /// - External service integrations need coordination across module boundaries
    ///
    /// The method uses a polling mechanism with configurable timeout and interval settings,
    /// ensuring robust operation in distributed and high-latency environments.
    /// </remarks>
    public static async Task WaitForAllModulesInitializedAsync(
        IServiceProvider serviceProvider,
        Type moduleType,
        ILogger logger = null,
        string logSuffix = null,
        bool notLogging = true)
    {
        if (serviceProvider.GetServices(moduleType).Select(p => p.As<IPlatformModule>()).All(p => p.IsFullyInitialized))
            return;

        var useLogger = logger ?? CreateDefaultLogger(serviceProvider);

        if (!notLogging)
            useLogger.LogInformation("[PlatformModule] Start WaitAllModulesInitiated of type {ModuleType} {LogSuffix} STARTED", moduleType.Name, logSuffix);

        await Util.TaskRunner.WaitUntilAsync(
            () =>
            {
                var modules = serviceProvider.GetServices(moduleType).Select(p => p.As<IPlatformModule>());

                return Task.FromResult(modules.All(p => p.IsFullyInitialized));
            },
            serviceProvider.GetServices(moduleType).Count() * DefaultInitializationTimeoutSeconds,
            waitForMsg: $"Wait for all modules of type {moduleType.Name} get initiated",
            waitIntervalSeconds: 5
        );

        if (!notLogging)
            useLogger.LogInformation("[Platform] WaitAllModulesInitiated of type {ModuleType} {LogSuffix} FINISHED", moduleType.Name, logSuffix);
    }

    /// <summary>
    /// Retrieves all dependent child modules of the current platform module.
    /// </summary>
    /// <param name="useServiceCollection">Optional. The service collection to use. If null, the service provider of the current module is used.</param>
    /// <param name="includeDeepChildModules">Optional. If true, includes all deep child modules in the returned list. Default is true.</param>
    /// <returns>A list of all dependent child modules.</returns>
    public List<IPlatformModule> GetDependentModules(IServiceCollection useServiceCollection = null, bool includeDeepChildModules = true);

    public static bool CheckIsRootModule(IPlatformModule module)
    {
        return !module.IsChildModule;
    }

    /// <summary>
    /// Registers the services provided by this module into the provided service collection.
    /// </summary>
    public void RegisterServices(IServiceCollection serviceCollection);

    /// <summary>
    /// Initializes the platform module.
    /// </summary>
    /// <param name="currentApp">Optional. The current application builder. If null, the application builder of the current module is used.</param>
    /// <returns>A Task representing the asynchronous operation.</returns>
    public Task InitializeAsync(IApplicationBuilder currentApp = null);

    /// <summary>
    /// Defines the list of module dependencies that this module requires to function properly.
    /// This method establishes the dependency graph that controls module initialization order and service availability.
    /// </summary>
    /// <returns>
    /// A list of functions that take an <see cref="IConfiguration"/> parameter and return a <see cref="Type"/>
    /// representing a platform module that this module depends on.
    /// </returns>
    /// <remarks>
    /// This method is the cornerstone of the platform's dependency management system, enabling:
    ///
    /// <strong>Dependency Declaration:</strong>
    /// - Explicit declaration of required infrastructure and service modules
    /// - Configuration-driven dependency resolution for environment-specific scenarios
    /// - Type-safe dependency specification with compile-time validation
    /// - Support for conditional dependencies based on configuration settings
    ///
    /// <strong>Initialization Ordering:</strong>
    /// - Ensures dependent modules initialize before the current module
    /// - Supports complex dependency chains and hierarchical relationships
    /// - Enables parallel initialization of independent module branches
    /// - Prevents circular dependency issues through dependency graph analysis
    ///
    /// <strong>Service Integration:</strong>
    /// - Guarantees required services are registered before consumption
    /// - Enables cross-module service sharing and communication
    /// - Supports dependency injection across module boundaries
    /// - Facilitates modular architecture with loose coupling
    ///
    /// <strong>Common Dependency Patterns:</strong>
    /// - Infrastructure modules: Logging, caching, messaging, configuration
    /// - Persistence modules: Database access, data repositories, migrations
    /// - Application modules: Business logic, domain services, CQRS handlers
    /// - Integration modules: External service clients, API adapters
    ///
    /// <strong>Configuration-Driven Dependencies:</strong>
    /// The method accepts IConfiguration to enable conditional dependencies:
    /// - Feature flag-based module inclusion/exclusion
    /// - Environment-specific dependency variations
    /// - Runtime dependency resolution based on configuration
    ///
    /// Each dependency module will be automatically:
    /// - Registered in the service collection if not already present
    /// - Marked as a child module (IsChildModule = true)
    /// - Initialized before the current module based on priority
    /// - Made available for dependency injection resolution
    /// </remarks>
    /// <example>
    /// <code>
    /// public override List&lt;Func&lt;IConfiguration, Type&gt;&gt; GetDependentModuleTypes()
    /// {
    ///     return new List&lt;Func&lt;IConfiguration, Type&gt;&gt;
    ///     {
    ///         // Always depend on application module
    ///         config => typeof(XXXPlatformApplicationModule),
    ///
    ///         // Always depend on persistence module
    ///         config => typeof(XXXPlatformPersistenceModule),
    ///
    ///         // Conditionally depend on caching based on configuration
    ///         config => config.GetValue&lt;bool&gt;("Features:CachingEnabled")
    ///             ? typeof(XXXPlatformCachingModule)
    ///             : null
    ///     }.Where(func => func != null).ToList();
    /// }
    /// </code>
    /// </example>
    public List<Func<IConfiguration, Type>> GetDependentModuleTypes();

    /// <summary>
    /// Override this to call every time a new platform module is registered
    /// </summary>
    public void OnNewOtherModuleRegistered(IServiceCollection serviceCollection, PlatformModule newOtherRegisterModule);

    public void RegisterDependentModule<TModule>(IServiceCollection serviceCollection)
        where TModule : PlatformModule;

    public string[] TracingSources();
}

/// <summary>
/// Represents a platform module that provides a set of functionalities and services.
/// </summary>
/// <remarks>
/// This class is an abstract base class for all platform modules. It provides a common set of properties and methods
/// that are used to manage the lifecycle of a module, such as initialization, registration of services, and disposal.
/// </remarks>
/// <example>
/// Here is an example of how to use this class:
/// <code>
/// services.RegisterModule{XXXApiModule}(); // Register module into service collection
/// // Get module service in collection and call module.InitializeAsync();
/// // Init module to start running init for all other modules and this module itself
/// </code>
/// </example>
public abstract class PlatformModule : IPlatformModule, IDisposable
{
    public const int DefaultInitializationPriority = 10;
    public const int InitializationPriorityTierGap = 10;

    protected static readonly ConcurrentDictionary<string, Assembly> ExecutedRegisterByAssemblies = new();

    protected readonly SemaphoreSlim InitLockAsync = new(1, 1);
    protected readonly SemaphoreSlim RegisterLockAsync = new(1, 1);
    private bool disposed;

    public PlatformModule(IServiceProvider serviceProvider, IConfiguration configuration)
    {
        ServiceProvider = serviceProvider;
        Configuration = configuration;
        LoggerFactory = serviceProvider?.GetService<ILoggerFactory>();
        Logger = serviceProvider?.GetService<ILoggerFactory>()?.Pipe(CreateLogger);
    }

    protected ILogger Logger { get; init; }
    protected ILoggerFactory LoggerFactory { get; init; }

    /// <summary>
    /// Gets a value indicating whether the module should automatically scan its assemblies for CQRS components.
    /// When enabled, the platform will automatically discover and register CQRS handlers, validators, and pipeline behaviors.
    /// </summary>
    /// <value>
    /// <c>true</c> if automatic CQRS assembly scanning is enabled; <c>false</c> otherwise. Default is <c>false</c>.
    /// </value>
    /// <remarks>
    /// This property controls the automatic registration of CQRS (Command Query Responsibility Segregation) components:
    ///
    /// <strong>When Enabled (true):</strong>
    /// - Automatically scans module assemblies for IRequestHandler implementations
    /// - Registers MediatR handlers for commands, queries, and events
    /// - Discovers and registers IPipelineBehavior implementations
    /// - Registers validation behaviors and cross-cutting concerns
    /// - Enables convention-based CQRS pattern implementation
    ///
    /// <strong>Components Automatically Registered:</strong>
    /// - Command handlers (IRequestHandler&lt;TCommand&gt;)
    /// - Query handlers (IRequestHandler&lt;TQuery, TResponse&gt;)
    /// - Event handlers (INotificationHandler&lt;TEvent&gt;)
    /// - Pipeline behaviors (IPipelineBehavior&lt;TRequest, TResponse&gt;)
    /// - Validation behaviors and other cross-cutting concerns
    ///
    /// <strong>Performance Considerations:</strong>
    /// - Assembly scanning occurs only once during module registration
    /// - Results are cached to prevent duplicate registrations
    /// - Scanning is performed across module inheritance hierarchy
    /// - Only executed for modules that explicitly enable this feature
    ///
    /// <strong>Usage Patterns:</strong>
    /// - Enable in application and domain modules that contain business logic
    /// - Disable in infrastructure modules that don't contain CQRS handlers
    /// - Useful for modules following domain-driven design patterns
    /// - Reduces boilerplate service registration code
    ///
    /// Override this property in derived modules to enable automatic CQRS registration
    /// when the module contains command/query handlers and related components.
    /// </remarks>
    protected virtual bool ShouldAutoRegisterCqrsByAssembly => false;

    /// <summary>
    /// Gets or sets the current application builder instance used for configuring the HTTP request pipeline.
    /// This builder is used during module initialization to configure middleware and application-level services.
    /// </summary>
    /// <value>
    /// The <see cref="IApplicationBuilder"/> instance representing the current application's HTTP pipeline configuration.
    /// </value>
    /// <remarks>
    /// The CurrentAppBuilder property serves as the central configuration point for HTTP pipeline setup:
    ///
    /// <strong>Initialization Context:</strong>
    /// - Set during the Init() method when an IApplicationBuilder is provided
    /// - Passed down to dependency modules during their initialization
    /// - Used to configure middleware pipeline ordering and behavior
    /// - Available throughout the module initialization lifecycle
    ///
    /// <strong>Middleware Configuration:</strong>
    /// - Enables modules to register middleware components
    /// - Supports conditional middleware registration based on configuration
    /// - Allows for complex middleware pipeline orchestration
    /// - Facilitates cross-module middleware coordination
    ///
    /// <strong>ASP.NET Core Integration:</strong>
    /// - Bridges platform module system with ASP.NET Core pipeline
    /// - Enables access to application services and configuration
    /// - Supports both development and production pipeline configurations
    /// - Facilitates integration with ASP.NET Core hosting model
    ///
    /// <strong>Module Hierarchy:</strong>
    /// - Root modules typically receive the initial IApplicationBuilder
    /// - Child modules inherit the builder through the initialization chain
    /// - Enables consistent pipeline configuration across module dependencies
    ///
    /// This property is primarily used by ASP.NET Core-based modules and may be null
    /// in console applications or non-HTTP scenarios.
    /// </remarks>
    protected IApplicationBuilder CurrentAppBuilder { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the module initialization (Init method) has been executed.
    /// This property tracks the internal execution state to prevent duplicate initialization and coordinate module startup.
    /// </summary>
    /// <value>
    /// <c>true</c> if the Init() method has completed execution; <c>false</c> otherwise.
    /// </value>
    /// <remarks>
    /// This property is a critical component of the platform's module lifecycle management:
    ///
    /// <strong>Initialization Tracking:</strong>
    /// - Set to true when the Init() method completes successfully
    /// - Used to prevent duplicate initialization attempts
    /// - Provides thread-safe initialization state tracking
    /// - Enables reliable module startup coordination
    ///
    /// <strong>Dependency Coordination:</strong>
    /// - Other modules can check this property to determine readiness
    /// - Used by WaitForAllModulesInitializedAsync for synchronization
    /// - Enables complex initialization dependency chains
    /// - Supports parallel initialization where dependencies allow
    ///
    /// <strong>Lifecycle Management:</strong>
    /// - Remains true throughout the application lifetime after initialization
    /// - Used in conjunction with thread-safe initialization locks
    /// - Provides reliable state information for debugging and monitoring
    /// - Supports graceful shutdown and resource cleanup scenarios
    ///
    /// <strong>Implementation Details:</strong>
    /// - Protected setter allows derived classes to control initialization state
    /// - Used by the virtual Initiated property in the IPlatformModule interface
    /// - Coordinated with AreServicesRegistered for complete lifecycle tracking
    ///
    /// This property is automatically managed by the platform's initialization system
    /// and should not typically be modified by derived module implementations.
    /// </remarks>
    public bool InitExecuted { get; protected set; }

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    public bool IsRootModule => IPlatformModule.CheckIsRootModule(this);

    public virtual int InitializationPriority => DefaultInitializationPriority;

    public IServiceCollection ServiceCollection { get; private set; }
    public IServiceProvider ServiceProvider { get; }
    public IConfiguration Configuration { get; }

    /// <summary>
    /// True if the module is in a dependency list of other module, not a root module
    /// </summary>
    public bool IsChildModule { get; set; }

    /// <summary>
    /// Current runtime module instance Assembly
    /// </summary>
    public Assembly Assembly => GetType().Assembly;

    public bool AreServicesRegistered { get; protected set; }

    public virtual bool IsFullyInitialized => InitExecuted;

    /// <summary>
    /// Override this to call every time a new other module is registered
    /// </summary>
    public virtual void OnNewOtherModuleRegistered(IServiceCollection serviceCollection, PlatformModule newOtherRegisterModule) { }

    public void RegisterDependentModule<TModule>(IServiceCollection serviceCollection)
        where TModule : PlatformModule
    {
        serviceCollection.RegisterModule<TModule>(true);
    }

    /// <summary>
    /// Registers the services provided by this module into the provided service collection.
    /// </summary>
    /// <param name="serviceCollection">The service collection to which the services will be registered.</param>
    /// <remarks>
    /// This method performs several operations:
    /// - It registers all module dependencies.
    /// - It registers default logs.
    /// - It registers CQRS.
    /// - It registers helpers.
    /// - It registers distributed tracing.
    /// - It performs internal registration.
    /// - It registers the platform root service provider.
    /// - It sets the current JSON serializer options if they are not null.
    /// After all these operations, it sets the AreServicesRegistered property to true.
    /// </remarks>
    /// <exception cref="InvalidOperationException">Thrown when the services have already been registered.</exception>
    public void RegisterServices(IServiceCollection serviceCollection)
    {
        try
        {
            RegisterLockAsync.Wait();

            if (AreServicesRegistered)
                return;

            ServiceCollection = serviceCollection;
            RegisterDependentModules(serviceCollection);
            RegisterDefaultLogs(serviceCollection);
            RegisterCqrs(serviceCollection);
            RegisterHelpers(serviceCollection);
            RegisterDistributedTracing(serviceCollection);
            InternalRegister(serviceCollection);
            serviceCollection.Register<IPlatformRootServiceProvider>(sp => new PlatformRootServiceProvider(sp, ServiceCollection), ServiceLifeTime.Singleton);

            AreServicesRegistered = true;

            if (ProvideCustomJsonSerializerOptions() != null)
                PlatformJsonSerializer.SetCurrentOptions(ProvideCustomJsonSerializerOptions());
        }
        finally
        {
            RegisterLockAsync.Release();
        }
    }

    public virtual async Task InitializeAsync(IApplicationBuilder currentApp = null)
    {
        try
        {
            if (currentApp != null)
                CurrentAppBuilder = currentApp;

            await InitLockAsync.WaitAsync();

            if (InitExecuted)
                return;

            Logger.LogInformation("[PlatformModule] {Module} Init STARTED", GetType().Name);

            ServiceCollection ??= CurrentAppBuilder?.ApplicationServices.GetRequiredService<IServiceCollection>();

            await InitializeDependentModulesAsync();
            await InitPerformanceProfiling();

            using (var scope = ServiceProvider.CreateTrackedScope())
                await InternalInit(scope);

            InitExecuted = true;

            Logger.LogInformation("[PlatformModule] {Module} Init FINISHED", GetType().Name);
        }
        finally
        {
            InitLockAsync.Release();
        }
    }

    /// <summary>
    /// Get all dependency modules, also init the value of <see cref="IsChildModule" />, which also affect <see cref="IsRootModule" />
    /// </summary>
    public List<IPlatformModule> GetDependentModules(IServiceCollection useServiceCollection = null, bool includeDeepChildModules = true)
    {
        return GetDependentModuleTypes()
            .Select(moduleTypeProvider =>
            {
                var moduleType = moduleTypeProvider(Configuration);
                var serviceProvider = useServiceCollection?.BuildServiceProvider() ?? ServiceProvider;

                var dependModule = serviceProvider
                    .GetService(moduleType)
                    .As<IPlatformModule>()
                    .Ensure(
                        dependModule => dependModule != null,
                        $"Module {GetType().Name} depend on {moduleType.Name} but Module {moduleType.Name} does not implement IPlatformModule"
                    );

                dependModule.IsChildModule = true;

                return includeDeepChildModules ? dependModule.GetDependentModules(useServiceCollection).ConcatSingle(dependModule) : [dependModule];
            })
            .Flatten()
            .ToList();
    }

    public virtual string[] TracingSources()
    {
        return [];
    }

    public virtual Action<TracerProviderBuilder> AdditionalTracingSetup => null;

    public virtual List<Func<IConfiguration, Type>> GetDependentModuleTypes()
    {
        return [];
    }

    /// <summary>
    /// Initializes the performance profiling settings for the platform module.
    /// </summary>
    protected async Task InitPerformanceProfiling()
    {
        if (!IsRootModule)
            return;

        var config = ConfigurePerformanceProfiling();

        if (config.Enabled == true)
        {
            Logger.LogInformation("[PlatformModule] InitPerformanceProfiling. Config:{Config}", config.ToFormattedJson());

            Profiler.Instance.SetCPUTrackingEnabled(config.Enabled == true && (config.CpuTrackingEnabled ?? true));
            Profiler.Instance.SetAllocationTrackingEnabled(config.Enabled == true && (config.AllocationTrackingEnabled ?? true));
            Profiler.Instance.SetContentionTrackingEnabled(config.Enabled == true && (config.ContentionTrackingEnabled ?? false));
            Profiler.Instance.SetExceptionTrackingEnabled(config.Enabled == true && (config.ExceptionTrackingEnabled ?? false));
        }
    }

    /// <summary>
    /// Return the current Assembly of the module and it's parent not abstract module.
    /// Used to register scanning by assembly support scan the parent module too by default
    /// </summary>
    public virtual List<Assembly> GetAssembliesForServiceScanning()
    {
        var result = new List<Assembly>();

        // Process add ancestor platform parent module assemblies
        var currentCheckBaseTypeTargetType = GetType();
        while (currentCheckBaseTypeTargetType.BaseType is { IsAbstract: false } && currentCheckBaseTypeTargetType.BaseType.IsAssignableTo(typeof(PlatformModule)))
        {
            result.Add(currentCheckBaseTypeTargetType.BaseType.Assembly);

            currentCheckBaseTypeTargetType = currentCheckBaseTypeTargetType.BaseType;
        }

        result.Add(Assembly);

        return result;
    }

    protected virtual void Dispose(bool disposing)
    {
        if (!disposed)
        {
            if (disposing)
            {
                InitLockAsync?.Dispose();
                RegisterLockAsync?.Dispose();
            }

            // Release unmanaged resources

            disposed = true;
        }
    }

    // Finalizer (destructor)
    ~PlatformModule()
    {
        Dispose(false);
    }

    /// <summary>
    /// Registers the distributed tracing services to the provided service collection.
    /// </summary>
    /// <param name="serviceCollection">The service collection to which the distributed tracing services are added.</param>
    /// <remarks>
    /// This method should only be called if the current module is the root module and distributed tracing is enabled.
    /// </remarks>
    protected void RegisterDistributedTracing(IServiceCollection serviceCollection)
    {
        if (IsRootModule)
        {
            var distributedTracingConfig = ConfigureDistributedTracing();

            serviceCollection.Register(
                typeof(DistributedTracingConfig),
                _ => distributedTracingConfig,
                ServiceLifeTime.Singleton,
                true,
                DependencyInjectionExtension.CheckRegisteredStrategy.ByService
            );

            if (distributedTracingConfig.Enabled)
            {
                // Setup OpenTelemetry
                var allDependencyModules = GetDependentModules(serviceCollection);

                var allDependencyModulesTracingSources = allDependencyModules.SelectMany(p => p.TracingSources());

                serviceCollection
                    .AddOpenTelemetry()
                    .WithTracing(builder =>
                        builder
                            .SetResourceBuilder(ResourceBuilder.CreateDefault().AddService(distributedTracingConfig.AppName ?? GetType().Assembly.GetName().Name!))
                            .AddSource(TracingSources().Concat(CommonTracingSources()).Concat(allDependencyModulesTracingSources).Distinct().ToArray())
                            .WithIf(AdditionalTracingSetup != null, AdditionalTracingSetup)
                            .WithIf(distributedTracingConfig.AdditionalTraceConfig != null, distributedTracingConfig.AdditionalTraceConfig)
                            .WithIf(distributedTracingConfig.AddOtlpExporterConfig != null, p => p.AddOtlpExporter(distributedTracingConfig.AddOtlpExporterConfig))
                            .WithIf(
                                allDependencyModules.Any(),
                                p =>
                                    allDependencyModules
                                        .Where(dependencyModule => dependencyModule.AdditionalTracingSetup != null)
                                        .Select(dependencyModule => dependencyModule.AdditionalTracingSetup)
                                        .ForEach(dependencyModuleAdditionalTracingSetup => dependencyModuleAdditionalTracingSetup(p))
                            )
                    );
            }
        }
    }

    public static List<string> CommonTracingSources()
    {
        return [IPlatformCqrsEventHandler.ActivitySource.Name, PlatformIntervalHostingBackgroundService.ActivitySource.Name];
    }

    public ILogger CreateLogger(ILoggerFactory loggerFactory)
    {
        return loggerFactory.CreateLogger(typeof(PlatformModule).GetNameOrGenericTypeName() + $"-{GetType().Name}");
    }

    protected static void RegisterOncePerAssembly(Action<Assembly> action, List<Assembly> assemblies, string actionName)
    {
        assemblies.ForEach(assembly =>
        {
            var executedRegisterByAssemblyKey = $"Action:{ExecutedRegisterByAssemblies.ContainsKey(actionName)};Assembly:{assembly.FullName}";

            if (!ExecutedRegisterByAssemblies.ContainsKey(executedRegisterByAssemblyKey))
            {
                action(assembly);

                ExecutedRegisterByAssemblies.TryAdd(executedRegisterByAssemblyKey, assembly);
            }
        });
    }

    /// <summary>
    /// Registers services in the provided service collection.
    /// </summary>
    /// <param name="serviceCollection">The service collection to add the services to.</param>
    /// <remarks>
    /// This method is called internally by the platform module.
    /// Derived classes should override this method to register their specific services.
    /// </remarks>
    protected virtual void InternalRegister(IServiceCollection serviceCollection) { }

    protected virtual Task InternalInit(IServiceScope serviceScope)
    {
        return Task.CompletedTask;
    }

    /// <summary>
    /// Override this to setup custom value for <see cref="PlatformJsonSerializer.CurrentOptions" />
    /// </summary>
    /// <returns></returns>
    protected virtual JsonSerializerOptions ProvideCustomJsonSerializerOptions()
    {
        return null;
    }

    /// <summary>
    /// Initializes all module dependencies asynchronously.
    /// </summary>
    /// <remarks>
    /// This method groups all dependent modules by their execution priority, orders them in descending order of priority,
    /// and then initializes each group of modules in parallel. This ensures that higher-priority modules are initialized before lower-priority ones.
    /// </remarks>
    /// <returns>
    /// A <see cref="Task" /> representing the asynchronous operation.
    /// </returns>
    /// <example>
    ///     <code>
    /// await InitializeDependentModulesAsync();
    /// </code>
    /// </example>
    protected async Task InitializeDependentModulesAsync()
    {
        await GetDependentModules()
            .GroupBy(p => p.InitializationPriority)
            .OrderByDescending(p => p.Key)
            .ForEachAsync(p => p.ParallelAsync(module => module.InitializeAsync(CurrentAppBuilder)));
    }

    protected virtual void RegisterHelpers(IServiceCollection serviceCollection)
    {
        serviceCollection.RegisterAllFromType<IPlatformHelper>(GetAssembliesForServiceScanning());
    }

    /// <summary>
    /// Configures the distributed tracing settings for the platform module.
    /// </summary>
    /// <returns>
    /// A <see cref="DistributedTracingConfig" /> object that contains the configuration settings for distributed tracing.
    /// </returns>
    /// <remarks>
    /// This method can be overridden in derived classes to provide custom configuration for distributed tracing.
    /// </remarks>
    protected virtual DistributedTracingConfig ConfigureDistributedTracing()
    {
        return new DistributedTracingConfig();
    }

    /// <summary>
    /// Configures the performance profiling settings for the platform module. THIS SHOULD ONLY BE CONFIGURED ON ROOT MODULE (USUALLY API OR APPLICATION MODULE, MODULE IS INIT IN PROGRAM)
    /// </summary>
    /// <returns>
    /// A <see cref="PerformanceProfilingConfig" /> object that contains the configuration settings for performance profiling.
    /// </returns>
    /// <remarks>
    /// This method can be overridden in derived classes to provide custom configuration for performance profiling.
    /// </remarks>
    protected virtual PerformanceProfilingConfig ConfigurePerformanceProfiling()
    {
        return new PerformanceProfilingConfig();
    }

    protected static void RegisterDefaultLogs(IServiceCollection serviceCollection)
    {
        serviceCollection.RegisterIfServiceNotExist(typeof(ILoggerFactory), typeof(LoggerFactory), ServiceLifeTime.Singleton);
        serviceCollection.RegisterIfServiceNotExist(typeof(ILogger<>), typeof(Logger<>));
        serviceCollection.RegisterIfServiceNotExist(typeof(ILogger), IPlatformModule.CreateDefaultLogger);
    }

    protected void RegisterCqrs(IServiceCollection serviceCollection)
    {
        if (ShouldAutoRegisterCqrsByAssembly)
        {
            RegisterOncePerAssembly(
                assembly =>
                {
                    serviceCollection.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(assembly));

                    serviceCollection.Register<IPlatformCqrs, PlatformCqrs>(ServiceLifeTime.Scoped, supportLazyInject: true);
                    serviceCollection.RegisterAllSelfImplementationFromType(typeof(IPipelineBehavior<,>), assembly);
                },
                GetAssembliesForServiceScanning(),
                nameof(RegisterCqrs)
            );
        }
    }

    protected void RegisterDependentModules(IServiceCollection serviceCollection)
    {
        GetDependentModuleTypes()
            .Select(moduleTypeProvider => moduleTypeProvider(Configuration))
            .ForEach(moduleType => serviceCollection.RegisterModule(moduleType, true));
    }

    /// <summary>
    /// Represents the configuration settings for distributed tracing.
    /// </summary>
    public class DistributedTracingConfig
    {
        /// <summary>
        /// Gets or sets a value indicating whether distributed tracing is enabled.
        /// </summary>
        public bool Enabled { get; set; }

        /// <summary>
        /// Gets or sets the action to configure additional trace settings.
        /// </summary>
        public Action<TracerProviderBuilder> AdditionalTraceConfig { get; set; }

        /// <summary>
        /// Gets or sets the action to configure the OpenTelemetry Protocol (OTLP) exporter options.
        /// </summary>
        public Action<OtlpExporterOptions> AddOtlpExporterConfig { get; set; }

        /// <summary>
        /// Gets or sets the name of the application.
        /// </summary>
        public string AppName { get; set; }

        public string? GetStackTraceIfEnabled()
        {
            return IsStackTraceEnabled() ? PlatformEnvironment.StackTrace() : null;
        }

        public bool IsStackTraceEnabled()
        {
            return Enabled;
        }
    }

    public class PerformanceProfilingConfig
    {
        public bool? Enabled { get; set; } = false;

        /// <summary>
        /// Enables or disables CPU/wall profiling dynamically.
        /// This function works in conjunction with the PYROSCOPE_PROFILING_CPU_ENABLED and
        /// PYROSCOPE_PROFILING_WALLTIME_ENABLED environment variables. If CPU/wall profiling is not
        /// configured, this function will have no effect.
        /// </summary>
        public bool? CpuTrackingEnabled { get; set; } = true;

        /// <summary>
        /// Enables or disables allocation profiling dynamically.
        /// This function works in conjunction with the PYROSCOPE_PROFILING_ALLOCATION_ENABLED environment variable.
        /// If allocation profiling is not configured, this function will have no effect.
        /// </summary>
        public bool? AllocationTrackingEnabled { get; set; } = true;

        /// <summary>
        /// Enables or disables allocation profiling dynamically.
        /// This function works in conjunction with the PYROSCOPE_PROFILING_LOCK_ENABLED environment variable.
        /// If allocation profiling is not configured, this function will have no effect.
        /// </summary>
        public bool? ContentionTrackingEnabled { get; set; } = false;

        /// <summary>
        /// Enables or disables allocation profiling dynamically.
        /// This function works in conjunction with the PYROSCOPE_PROFILING_EXCEPTION_ENABLED environment variable.
        /// If allocation profiling is not configured, this function will have no effect.
        /// </summary>
        public bool? ExceptionTrackingEnabled { get; set; } = false;
    }
}
