#region

using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Extensions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.Application.Cqrs;

/// <summary>
/// Abstract base class for application-level Platform CQRS request handlers.
/// Provides application-specific infrastructure including request context access, logging, and audit information management.
/// </summary>
/// <typeparam name="TRequest">The type of CQRS request handled by this application handler, must implement IPlatformCqrsRequest</typeparam>
/// <remarks>
/// <para>
/// <strong>Application Layer Integration:</strong>
/// This base class bridges the gap between the common CQRS infrastructure and application-specific concerns,
/// providing access to application request context, user information, and application-scoped services.
/// </para>
///
/// <para>
/// <strong>Key Features:</strong>
/// - Application request context access for user identification and security
/// - Structured logging with handler-specific categorization
/// - Automatic audit information building with user correlation
/// - Service provider access for application-layer dependencies
/// - Integration with Platform application infrastructure
/// </para>
///
/// <para>
/// <strong>Usage Pattern:</strong>
/// Application layer command and query handlers inherit from this class to gain:
/// - Access to current user context and security information
/// - Consistent logging and audit trail generation
/// - Application-scoped dependency resolution
/// - Request context propagation and correlation
/// </para>
///
/// <para>
/// <strong>Integration Points:</strong>
/// - Platform application request context for user and security data
/// - Dependency injection for application services and repositories
/// - Logging infrastructure for structured application event logging
/// - Audit system integration for compliance and monitoring
/// </para>
/// </remarks>
public abstract class PlatformCqrsRequestApplicationHandler<TRequest> : PlatformCqrsRequestHandler<TRequest>
    where TRequest : IPlatformCqrsRequest
{
    /// <summary>
    /// Gets the logger factory for creating categorized loggers throughout the handler lifecycle.
    /// Provides consistent logging infrastructure with proper categorization and configuration.
    /// </summary>
    /// <value>
    /// ILoggerFactory instance for creating loggers with appropriate categories and configuration.
    /// Used for creating both handler-specific and operation-specific loggers.
    /// </value>
    /// <remarks>
    /// Logger factory enables creation of properly categorized loggers that include:
    /// - Handler type information for filtering and routing
    /// - Application context for correlation and debugging
    /// - Structured logging capabilities for monitoring and analysis
    /// - Configuration-based log level and destination management
    /// </remarks>
    protected readonly ILoggerFactory LoggerFactory;

    /// <summary>
    /// Gets the application request context accessor for accessing current user and request information.
    /// Provides access to security context, user identity, and request-specific data.
    /// </summary>
    /// <value>
    /// IPlatformApplicationRequestContextAccessor for accessing current application request context.
    /// Essential for user identification, security checks, and audit trail generation.
    /// </value>
    /// <remarks>
    /// Request context accessor provides access to:
    /// - Current user identity and security claims
    /// - Request correlation and tracking information
    /// - Tenant and organization context
    /// - Application-specific request metadata
    ///
    /// Critical for security, auditing, and multi-tenant scenarios.
    /// Used throughout application handlers for user-specific processing.
    /// </remarks>
    protected readonly IPlatformApplicationRequestContextAccessor RequestContextAccessor;

    /// <summary>
    /// Gets the root service provider for accessing platform-wide singleton services and creating new scopes.
    /// Enables background processing and cross-scope service resolution.
    /// </summary>
    /// <value>
    /// IPlatformRootServiceProvider for accessing root container services and scope creation.
    /// Essential for background processing and service discovery scenarios.
    /// </value>
    /// <remarks>
    /// Root service provider enables:
    /// - Access to singleton services across scopes
    /// - Creation of new dependency injection scopes
    /// - Service discovery and dynamic resolution
    /// - Background processing coordination
    ///
    /// Used for scenarios requiring scope isolation or singleton access.
    /// Critical for background job processing and cross-scope operations.
    /// </remarks>
    protected readonly IPlatformRootServiceProvider RootServiceProvider;

    /// <summary>
    /// Gets the current scoped service provider for resolving dependencies within the current request context.
    /// Provides access to scoped services and request-specific dependencies.
    /// </summary>
    /// <value>
    /// IServiceProvider for the current dependency injection scope.
    /// Used for resolving repositories, domain services, and application services.
    /// </value>
    /// <remarks>
    /// Scoped service provider provides access to:
    /// - Repository interfaces and data access components
    /// - Domain services and business logic components
    /// - Application services and workflow coordinators
    /// - Request-scoped configuration and context
    ///
    /// Lifecycle tied to current request or operation scope.
    /// Essential for proper dependency management and resource cleanup.
    /// </remarks>
    protected readonly IServiceProvider ServiceProvider;

    /// <summary>
    /// Lazy-initialized logger instance specific to this handler type.
    /// Provides efficient logger creation with handler-specific categorization.
    /// </summary>
    /// <remarks>
    /// Lazy initialization ensures logger is created only when needed.
    /// Logger category includes base type and concrete handler type for precise filtering.
    /// Enables handler-specific log configuration and routing.
    /// </remarks>
    private readonly Lazy<ILogger> loggerLazy;

    /// <summary>
    /// Initializes a new instance of the application request handler with required application infrastructure.
    /// Sets up logging, request context access, and dependency injection for application-layer processing.
    /// </summary>
    /// <param name="requestContextAccessor">Application request context accessor for user and security information</param>
    /// <param name="loggerFactory">Logger factory for creating categorized loggers</param>
    /// <param name="serviceProvider">Current scope service provider for dependency resolution</param>
    /// <remarks>
    /// <para>
    /// <strong>Initialization Process:</strong>
    /// 1. Stores provided dependencies for handler lifecycle
    /// 2. Resolves root service provider from current scope
    /// 3. Configures lazy logger with handler-specific categorization
    /// 4. Prepares infrastructure for request processing
    /// </para>
    ///
    /// <para>
    /// <strong>Logger Configuration:</strong>
    /// Logger category combines base handler type with concrete implementation type
    /// for precise log filtering and routing. Format: "PlatformCqrsRequestApplicationHandler-{ConcreteHandlerName}"
    /// </para>
    ///
    /// <para>
    /// <strong>Dependency Strategy:</strong>
    /// Constructor injection ensures all required application infrastructure is available
    /// before handler processing begins. Root service provider is resolved from scope
    /// to enable background processing and scope isolation scenarios.
    /// </para>
    /// </remarks>
    public PlatformCqrsRequestApplicationHandler(
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider)
    {
        RequestContextAccessor = requestContextAccessor;
        LoggerFactory = loggerFactory;
        ServiceProvider = serviceProvider;
        // Resolve root service provider for background processing capabilities
        RootServiceProvider = serviceProvider.GetRequiredService<IPlatformRootServiceProvider>();
        // Configure lazy logger with handler-specific categorization
        loggerLazy =
            new Lazy<ILogger>(() => loggerFactory.CreateLogger(typeof(PlatformCqrsRequestApplicationHandler<>).GetNameOrGenericTypeName() + $"-{GetType().Name}"));
    }

    /// <summary>
    /// Gets the current application request context containing user identity and security information.
    /// Provides access to user context, security claims, and application-specific request data.
    /// </summary>
    /// <value>
    /// Current application request context with user identity, security information, and request metadata.
    /// Essential for user-specific processing, security checks, and audit trail generation.
    /// </value>
    /// <remarks>
    /// Application request context provides access to:
    /// - User identity and authentication status
    /// - Security claims and authorization information
    /// - Tenant and organization context for multi-tenant scenarios
    /// - Request correlation and tracking identifiers
    /// - Application-specific metadata and configuration
    ///
    /// Used throughout application handlers for:
    /// - Security and authorization decisions
    /// - User-specific business logic
    /// - Audit trail and compliance tracking
    /// - Multi-tenant data isolation
    /// </remarks>
    public IPlatformApplicationRequestContext RequestContext => RequestContextAccessor.Current;

    /// <summary>
    /// Gets the logger instance for this specific handler type with appropriate categorization.
    /// Provides structured logging capabilities with handler-specific context and configuration.
    /// </summary>
    /// <value>
    /// ILogger instance categorized for this specific handler type.
    /// Includes handler type information for filtering and routing log messages.
    /// </value>
    /// <remarks>
    /// Logger instance provides:
    /// - Handler-specific categorization for precise log filtering
    /// - Structured logging capabilities with consistent formatting
    /// - Configuration-based log level and destination management
    /// - Integration with application monitoring and alerting systems
    ///
    /// Logger category format: "PlatformCqrsRequestApplicationHandler-{ConcreteHandlerName}"
    /// Enables filtering logs by specific handler types for debugging and monitoring.
    /// </remarks>
    public ILogger Logger => loggerLazy.Value;

    /// <summary>
    /// Gets or sets a value indicating whether exceptions encountered during command processing should be automatically logged.
    /// </summary>
    /// <value>
    /// Set to <c>true</c> to enable automatic exception logging within the handler's execution pipeline.
    /// The default is <c>false</c>, meaning exceptions are not automatically logged by this handler and must be handled by custom logic or higher-level components.
    /// </value>
    /// <remarks>
    /// When enabled (<c>true</c>), any exception thrown during command execution is caught and logged with detailed context:
    /// - The exception message and a beautified stack trace.
    /// - The Audit Track ID for correlation.
    /// - The full request object payload.
    /// - The current request context.
    /// The logging level is intelligently chosen: <see cref="LogLevel.Warning"/> for known business exceptions (IPlatformLogicException)
    /// and <see cref="LogLevel.Error"/> for unexpected system exceptions.
    /// Set this to <c>false</c> to prevent duplicate logging if another layer (e.g., global exception middleware) already handles it,
    /// or to implement more specific logging logic within the handler itself.
    /// </remarks>
    public virtual bool AutoLogOnException { get; set; }

    /// <summary>
    /// Builds audit information for the specified CQRS request using current application context.
    /// Creates standardized audit trail with user identification and request correlation.
    /// </summary>
    /// <param name="request">The CQRS request for which to build audit information</param>
    /// <returns>Constructed audit information with tracking ID and user context</returns>
    /// <remarks>
    /// <para>
    /// <strong>Audit Information Construction:</strong>
    /// Creates comprehensive audit information including:
    /// - Unique tracking identifier using ULID for time-ordered uniqueness
    /// - Current user identifier from application request context
    /// - Timestamp information for compliance and monitoring
    /// - Request correlation for distributed tracing
    /// </para>
    ///
    /// <para>
    /// <strong>Compliance and Security:</strong>
    /// Audit information supports:
    /// - Regulatory compliance requirements
    /// - Security audit trails and investigation
    /// - User activity tracking and analytics
    /// - Request correlation across distributed systems
    /// </para>
    ///
    /// <para>
    /// <strong>Usage Pattern:</strong>
    /// Called by application handlers to establish audit context before processing.
    /// Ensures consistent audit information across all application-layer operations.
    /// Critical for maintaining compliance and security standards.
    /// </para>
    /// </remarks>
    public IPlatformCqrsRequestAuditInfo BuildRequestAuditInfo(TRequest request)
    {
        return new PlatformCqrsRequestAuditInfo(auditTrackId: Ulid.NewUlid().ToString(), auditRequestByUserId: RequestContextAccessor.Current.UserId());
    }
}
