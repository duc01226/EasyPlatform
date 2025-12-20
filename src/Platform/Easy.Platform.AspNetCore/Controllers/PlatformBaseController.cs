using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Infrastructures.Caching;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace Easy.Platform.AspNetCore.Controllers;

/// <summary>
/// Abstract base controller that provides common functionality and dependencies for all API controllers
/// in the Easy.Platform ASP.NET Core infrastructure. This controller establishes a standardized foundation
/// for all EasyPlatform microservice controllers with essential platform services and patterns.
/// </summary>
/// <remarks>
/// This abstract controller serves as the foundation for all API controllers across the EasyPlatform platform
/// and provides access to core platform services including:
/// - CQRS pattern implementation for command and query separation
/// - Caching infrastructure for performance optimization
/// - Configuration access for application settings
/// - Request context for correlation and distributed tracing
/// - Standardized dependency injection patterns
///
/// Key architectural benefits:
/// - Consistent service access patterns across all controllers
/// - Centralized dependency management for platform services
/// - Standardized request context handling for distributed systems
/// - Built-in caching capabilities for improved performance
/// - CQRS pattern enforcement for clean architecture
/// - Configuration access following platform conventions
///
/// Core dependencies provided:
/// - IPlatformCqrs: Command and query execution with validation and logging
/// - IPlatformCacheRepositoryProvider: Distributed caching for data and responses
/// - IConfiguration: Application configuration and environment settings
/// - IPlatformApplicationRequestContextAccessor: Request-scoped context and correlation
///
/// Usage patterns:
/// All API controllers in EasyPlatform microservices should inherit from this base class
/// to ensure consistent access to platform services and adherence to architectural patterns.
/// Controllers can focus on HTTP-specific concerns while leveraging the platform's
/// infrastructure through the provided dependencies.
///
/// This base controller is widely used across the platform in services including:
/// - TextSnippet service for content management APIs
/// - User management service for authentication endpoints
/// - And many other EasyPlatform microservices
///
/// The controller follows the platform's dependency injection patterns and provides
/// a consistent foundation for implementing REST APIs with proper separation of concerns.
/// </remarks>
public abstract class PlatformBaseController : ControllerBase
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformBaseController"/> class with the required platform dependencies.
    /// This constructor establishes the foundational services that all platform controllers need for proper operation.
    /// </summary>
    /// <param name="cqrs">
    /// The platform CQRS implementation that provides command and query execution capabilities.
    /// This service handles the separation of read and write operations, validation, logging, and cross-cutting concerns.
    /// </param>
    /// <param name="cacheRepositoryProvider">
    /// The platform cache repository provider that offers distributed caching capabilities.
    /// This service provides high-performance caching for data, responses, and computed results across the platform.
    /// </param>
    /// <param name="configuration">
    /// The application configuration provider that gives access to settings, connection strings, and environment-specific values.
    /// This follows ASP.NET Core's configuration patterns and supports multiple configuration sources.
    /// </param>
    /// <param name="requestContextAccessor">
    /// The platform request context accessor that provides access to request-scoped data and correlation information.
    /// This service enables distributed tracing, user context, and cross-service correlation throughout the request lifecycle.
    /// </param>
    /// <exception cref="ArgumentNullException">
    /// Thrown when any of the required dependencies are null, as all parameters are essential for proper controller operation.
    /// </exception>
    /// <remarks>
    /// This constructor establishes the dependency injection pattern used throughout the platform
    /// and ensures that all controllers have access to the core services needed for:
    /// - Executing business logic through CQRS patterns
    /// - Implementing efficient caching strategies
    /// - Accessing application configuration
    /// - Maintaining request correlation and context
    ///
    /// The dependencies are stored as protected properties to allow derived controllers
    /// to access these services while maintaining encapsulation and testability.
    /// </remarks>
    public PlatformBaseController(
        IPlatformCqrs cqrs,
        IPlatformCacheRepositoryProvider cacheRepositoryProvider,
        IConfiguration configuration,
        IPlatformApplicationRequestContextAccessor requestContextAccessor
    )
    {
        Cqrs = cqrs;
        CacheRepositoryProvider = cacheRepositoryProvider;
        Configuration = configuration;
        RequestContextAccessor = requestContextAccessor;
    }

    /// <summary>
    /// Gets the platform CQRS implementation for executing commands and queries.
    /// This service provides the foundation for implementing the Command Query Responsibility Segregation pattern
    /// with built-in validation, logging, and cross-cutting concerns.
    /// </summary>
    /// <value>
    /// An <see cref="IPlatformCqrs"/> instance that handles command execution for write operations
    /// and query execution for read operations, ensuring proper separation of concerns and
    /// consistent handling of business logic across the platform.
    /// </value>
    public IPlatformCqrs Cqrs { get; }

    /// <summary>
    /// Gets the platform cache repository provider for high-performance distributed caching.
    /// This service enables efficient data caching, response caching, and computed result caching
    /// across the distributed EasyPlatform architecture.
    /// </summary>
    /// <value>
    /// An <see cref="IPlatformCacheRepositoryProvider"/> instance that provides access to
    /// various caching mechanisms including in-memory, distributed, and persistent caching
    /// options for optimizing application performance.
    /// </value>
    public IPlatformCacheRepositoryProvider CacheRepositoryProvider { get; }

    /// <summary>
    /// Gets the application configuration provider for accessing settings and environment-specific values.
    /// This provides access to connection strings, feature flags, API keys, and other configuration
    /// values following ASP.NET Core configuration patterns.
    /// </summary>
    /// <value>
    /// An <see cref="IConfiguration"/> instance that provides hierarchical access to application
    /// configuration from multiple sources including appsettings.json, environment variables,
    /// and other configuration providers.
    /// </value>
    public IConfiguration Configuration { get; }

    /// <summary>
    /// Gets the platform application request context accessor for accessing request-scoped data.
    /// This service provides access to correlation IDs, user context, and other request-specific
    /// information that needs to be maintained throughout the request lifecycle.
    /// </summary>
    /// <value>
    /// An <see cref="IPlatformApplicationRequestContextAccessor"/> instance that provides
    /// access to request-scoped context information for distributed tracing, user correlation,
    /// and cross-service communication.
    /// </value>
    public IPlatformApplicationRequestContextAccessor RequestContextAccessor { get; }

    /// <summary>
    /// Gets the current platform application request context for the active HTTP request.
    /// This property provides convenient access to the current request's context information
    /// including correlation IDs, user details, and other request-scoped data.
    /// </summary>
    /// <value>
    /// An <see cref="IPlatformApplicationRequestContext"/> instance representing the current
    /// request's context, which includes user information, correlation data, and other
    /// request-specific details needed for proper request processing and tracing.
    /// </value>
    public IPlatformApplicationRequestContext RequestContext => RequestContextAccessor.Current;
}
