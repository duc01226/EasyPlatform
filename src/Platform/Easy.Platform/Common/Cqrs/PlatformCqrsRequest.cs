#region

using Easy.Platform.Common.Dtos;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Validations;

#endregion

namespace Easy.Platform.Common.Cqrs;

/// <summary>
/// Base interface for all Platform CQRS requests. Provides core functionality for command/query operations
/// including audit tracking, validation, and cache key generation.
/// This interface enables the CQRS pattern implementation across the platform.
/// </summary>
/// <remarks>
/// All commands, queries, and events in the Platform CQRS framework implement this interface.
/// Provides standardized audit information tracking and cache key building capabilities.
/// Used extensively in Growth, Employee, and Permission Provider services.
/// </remarks>
public interface IPlatformCqrsRequest : IPlatformDto<IPlatformCqrsRequest>, ICloneable
{
    /// <summary>
    /// Gets or sets audit information for request tracking and compliance.
    /// Contains tracking ID, user ID who initiated the request, and timestamp.
    /// </summary>
    /// <value>
    /// Audit information including track ID, requesting user ID, and request timestamp.
    /// Automatically populated by the CQRS framework during request processing.
    /// </value>
    /// <remarks>
    /// Used for compliance tracking, debugging, and audit trail generation.
    /// Set to null during cache key generation to exclude from cache keys.
    /// </remarks>
    public IPlatformCqrsRequestAuditInfo AuditInfo { get; set; }

    /// <summary>
    /// Sets audit information for the request with track ID and user ID.
    /// Creates a new audit info instance with current UTC timestamp.
    /// </summary>
    /// <typeparam name="TRequest">The specific request type being audited</typeparam>
    /// <param name="auditTrackId">Unique identifier for tracking this request across systems</param>
    /// <param name="auditRequestByUserId">ID of the user who initiated this request</param>
    /// <returns>The request instance with audit information set, enabling fluent API usage</returns>
    /// <remarks>
    /// Used by controllers and handlers to track request execution context.
    /// Enables request correlation across distributed systems and audit compliance.
    /// </remarks>
    public TRequest SetAuditInfo<TRequest>(
        string auditTrackId,
        string auditRequestByUserId) where TRequest : class, IPlatformCqrsRequest;

    /// <summary>
    /// Sets pre-constructed audit information for the request.
    /// Allows setting audit info from existing audit context.
    /// </summary>
    /// <typeparam name="TRequest">The specific request type being audited</typeparam>
    /// <param name="auditInfo">Pre-constructed audit information to associate with the request</param>
    /// <returns>The request instance with audit information set, enabling fluent API usage</returns>
    /// <remarks>
    /// Used when audit information is already available from request context.
    /// Common in message bus scenarios and request forwarding.
    /// </remarks>
    public TRequest SetAuditInfo<TRequest>(IPlatformCqrsRequestAuditInfo auditInfo) where TRequest : class, IPlatformCqrsRequest;

    /// <summary>
    /// Builds cache key components for the request to enable automatic caching.
    /// Generates consistent cache keys by combining request type, serialized request data, and additional parts.
    /// </summary>
    /// <typeparam name="TRequest">The specific request type for cache key generation</typeparam>
    /// <param name="request">The request instance to generate cache key from</param>
    /// <param name="otherRequestKeyParts">Additional key parts to include in the cache key</param>
    /// <returns>Array of cache key components that uniquely identify this request</returns>
    /// <remarks>
    /// Cache key structure: ["RequestType=ClassName", "serialized_request_json", ...additional_parts]
    /// Audit info is excluded from serialization to ensure consistent cache keys.
    /// Used by PlatformCacheRepository for automatic cache management.
    /// Essential for query caching in Growth, Employee, and Permission Provider services.
    /// </remarks>
    /// <example>
    /// Cache key for GetEmployeeQuery with EmployeeId=123:
    /// ["RequestType=GetEmployeeQuery", "{\"EmployeeId\":123}", "Department"]
    /// </example>
    /// Essential for query caching in Growth, Employee, and Permission Provider services.
    /// </remarks>
    /// <example>
    /// Cache key for GetEmployeeQuery with EmployeeId=123:
    /// ["RequestType=GetEmployeeQuery", "{\"EmployeeId\":123}", "Department"]
    /// </example>
    public static string[] BuildCacheRequestKeyParts<TRequest>(TRequest request, params string[] otherRequestKeyParts) where TRequest : class, IPlatformCqrsRequest
    {
        var requestJsonStr = request?.Clone().Cast<TRequest>().With(cqrsRequest => cqrsRequest.AuditInfo = null).ToJson();
        return new[] { $"RequestType={typeof(TRequest).Name}", requestJsonStr }.Concat(otherRequestKeyParts).ToArray();
    }
}

/// <summary>
/// Abstract base class providing common functionality for all Platform CQRS requests.
/// Implements core request capabilities including validation, audit tracking, and cloning.
/// </summary>
/// <remarks>
/// Serves as the foundation for all commands, queries, and events in the Platform CQRS framework.
/// Provides standardized implementation of validation, audit information management, and object cloning.
/// Used extensively across Growth, Employee, Talents, and Permission Provider services.
/// </remarks>
public class PlatformCqrsRequest : IPlatformCqrsRequest
{
    /// <summary>
    /// Validates the current request instance using platform validation framework.
    /// Provides base validation logic that can be overridden by derived classes.
    /// </summary>
    /// <returns>
    /// A validation result indicating the request is valid by default.
    /// Derived classes should override to implement specific validation rules.
    /// </returns>
    /// <remarks>
    /// Base implementation always returns valid result. Derived classes should:
    /// - Override this method to implement specific validation logic
    /// - Use PlatformValidationResult to return detailed validation errors
    /// - Validate business rules, data integrity, and security constraints
    /// </remarks>
    public virtual PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return PlatformValidationResult<IPlatformCqrsRequest>.Valid(value: this);
    }

    /// <summary>
    /// Gets or sets audit information for request tracking and compliance.
    /// Contains tracking ID, user ID who initiated the request, and timestamp.
    /// </summary>
    /// <value>
    /// Audit information including track ID, requesting user ID, and request timestamp.
    /// Automatically populated by the CQRS framework during request processing.
    /// </value>
    /// <remarks>
    /// Used for compliance tracking, debugging, and audit trail generation.
    /// Set to null during cache key generation to exclude from cache keys.
    /// Essential for regulatory compliance and security auditing.
    /// </remarks>
    public IPlatformCqrsRequestAuditInfo AuditInfo { get; set; }

    /// <summary>
    /// Sets audit information for the request with track ID and user ID.
    /// Creates a new audit info instance with current UTC timestamp.
    /// </summary>
    /// <typeparam name="TRequest">The specific request type being audited</typeparam>
    /// <param name="auditTrackId">Unique identifier for tracking this request across systems</param>
    /// <param name="auditRequestByUserId">ID of the user who initiated this request</param>
    /// <returns>The request instance with audit information set, enabling fluent API usage</returns>
    /// <remarks>
    /// Used by controllers and handlers to track request execution context.
    /// Enables request correlation across distributed systems and audit compliance.
    /// Commonly called from PlatformBaseController and message bus consumers.
    /// </remarks>
    public TRequest SetAuditInfo<TRequest>(
        string auditTrackId,
        string auditRequestByUserId) where TRequest : class, IPlatformCqrsRequest
    {
        // Create new audit info with provided tracking and user information
        AuditInfo = new PlatformCqrsRequestAuditInfo(auditTrackId, auditRequestByUserId);

        // Return typed instance for fluent API usage
        return this.As<TRequest>();
    }

    /// <summary>
    /// Sets pre-constructed audit information for the request.
    /// Allows setting audit info from existing audit context.
    /// </summary>
    /// <typeparam name="TRequest">The specific request type being audited</typeparam>
    /// <param name="auditInfo">Pre-constructed audit information to associate with the request</param>
    /// <returns>The request instance with audit information set, enabling fluent API usage</returns>
    /// <remarks>
    /// Used when audit information is already available from request context.
    /// Common in message bus scenarios and request forwarding.
    /// Preserves original audit trail when requests are passed between services.
    /// </remarks>
    public TRequest SetAuditInfo<TRequest>(IPlatformCqrsRequestAuditInfo auditInfo) where TRequest : class, IPlatformCqrsRequest
    {
        // Set the provided audit information directly
        AuditInfo = auditInfo;

        // Return typed instance for fluent API usage
        return this.As<TRequest>();
    }

    /// <summary>
    /// Creates a shallow copy of the current request instance.
    /// Implements ICloneable interface for request duplication scenarios.
    /// </summary>
    /// <returns>A shallow copy of the current request object</returns>
    /// <remarks>
    /// Used primarily for cache key generation where audit info needs to be excluded.
    /// Shallow copy is sufficient as request objects should be immutable after creation.
    /// Essential for IPlatformCqrsRequest.BuildCacheRequestKeyParts static method.
    /// </remarks>
    public object Clone()
    {
        // Use MemberwiseClone for efficient shallow copying
        return MemberwiseClone();
    }

    /// <summary>
    /// Validates the current request instance and returns typed validation result.
    /// Provides generic validation result casting for type safety.
    /// </summary>
    /// <typeparam name="TRequest">The specific request type for validation result</typeparam>
    /// <returns>
    /// A typed validation result for the specific request type.
    /// Base implementation returns valid result, override for specific validation.
    /// </returns>
    /// <remarks>
    /// Generic version of the Validate method enabling type-safe validation results.
    /// Used by validation pipelines and request handlers for strongly-typed validation.
    /// Derived classes should implement specific validation logic appropriate to their domain.
    /// </remarks>
    public virtual PlatformValidationResult<TRequest> Validate<TRequest>() where TRequest : IPlatformCqrsRequest
    {
        // Convert base validation result to typed result for type safety
        return PlatformValidationResult<IPlatformCqrsRequest>.Valid(value: this).Of<TRequest>();
    }
}

/// <summary>
/// Interface defining audit information for Platform CQRS requests.
/// Provides contract for tracking request execution context including user, timestamp, and correlation ID.
/// </summary>
/// <remarks>
/// Essential for compliance, debugging, and audit trail generation across all Platform services.
/// Implemented by PlatformCqrsRequestAuditInfo with automatic timestamp and ULID generation.
/// Used extensively in Growth, Employee, Talents, and Permission Provider services for request tracking.
/// </remarks>
public interface IPlatformCqrsRequestAuditInfo
{
    /// <summary>
    /// Gets the unique tracking identifier for correlating this request across distributed systems.
    /// Generated using ULID (Universally Unique Lexicographically Sortable Identifier) for time-ordered uniqueness.
    /// </summary>
    /// <value>
    /// A ULID string that uniquely identifies this request execution.
    /// Used for request correlation in logs and distributed tracing.
    /// </value>
    /// <remarks>
    /// ULID provides both uniqueness and lexicographical sorting based on timestamp.
    /// Essential for debugging distributed request flows and performance analysis.
    /// Automatically generated during audit info creation.
    /// </remarks>
    public string AuditTrackId { get; }

    /// <summary>
    /// Gets the UTC timestamp when this request was initiated.
    /// Provides precise timing information for performance monitoring and compliance.
    /// </summary>
    /// <value>
    /// UTC DateTime representing when the request audit info was created.
    /// Used for performance monitoring, compliance reporting, and debugging.
    /// </value>
    /// <remarks>
    /// Always stored in UTC to ensure consistency across different time zones.
    /// Set automatically during audit info construction for accuracy.
    /// Critical for compliance reporting and performance analysis.
    /// </remarks>
    public DateTime AuditRequestDate { get; }

    /// <summary>
    /// Gets the identifier of the user who initiated this request.
    /// Used for security tracking, authorization, and audit compliance.
    /// </summary>
    /// <value>
    /// User identifier (typically user ID or username) who initiated the request.
    /// May be null for system-initiated requests or background processes.
    /// </value>
    /// <remarks>
    /// Essential for security auditing and compliance requirements.
    /// Used to track user actions across the platform for accountability.
    /// May be populated from JWT tokens, session context, or service accounts.
    /// </remarks>
    public string AuditRequestByUserId { get; }
}

/// <summary>
/// Default implementation of audit information for Platform CQRS requests.
/// Provides automatic generation of tracking IDs, timestamps, and user tracking capabilities.
/// </summary>
/// <remarks>
/// Immutable audit information class with automatic ULID generation and UTC timestamps.
/// Supports both parameterless construction (for automatic generation) and explicit construction.
/// Used throughout the Platform CQRS framework for consistent audit trail generation.
/// </remarks>
public class PlatformCqrsRequestAuditInfo : IPlatformCqrsRequestAuditInfo
{
    /// <summary>
    /// Initializes a new instance with automatically generated audit information.
    /// Creates ULID tracking ID, sets current UTC timestamp, and leaves user ID null.
    /// </summary>
    /// <remarks>
    /// Used for system-initiated requests or when audit info will be set later.
    /// Automatically generates ULID for tracking and sets timestamp to current UTC time.
    /// User ID remains null and should be set through constructor or property.
    /// </remarks>
    public PlatformCqrsRequestAuditInfo() { }

    /// <summary>
    /// Initializes audit information with specific tracking and user details.
    /// Creates audit info with provided track ID and user ID, setting timestamp to current UTC.
    /// </summary>
    /// <param name="auditTrackId">Unique identifier for tracking this request across systems</param>
    /// <param name="auditRequestByUserId">ID of the user who initiated this request</param>
    /// <remarks>
    /// Primary constructor used by SetAuditInfo methods for explicit audit tracking.
    /// Preserves provided track ID while setting timestamp to current UTC for accuracy.
    /// Commonly used in controllers and message handlers for user-initiated requests.
    /// </remarks>
    public PlatformCqrsRequestAuditInfo(
        string auditTrackId,
        string auditRequestByUserId)
    {
        // Set provided tracking information
        AuditTrackId = auditTrackId;
        // Always use current UTC time for consistency
        AuditRequestDate = DateTime.UtcNow;
        // Track the requesting user
        AuditRequestByUserId = auditRequestByUserId;
    }

    /// <summary>
    /// Gets the unique tracking identifier for this request.
    /// Automatically generated using ULID if not provided in constructor.
    /// </summary>
    /// <value>
    /// ULID string providing unique, time-ordered identification for request tracking.
    /// Generated automatically or set via constructor parameter.
    /// </value>
    /// <remarks>
    /// ULID (Universally Unique Lexicographically Sortable Identifier) provides:
    /// - 128-bit compatibility with UUID
    /// - Lexicographically sortable
    /// - Canonically encoded as 26 character string
    /// Essential for distributed request correlation and debugging.
    /// </remarks>
    public string AuditTrackId { get; } = Ulid.NewUlid().ToString();

    /// <summary>
    /// Gets the UTC timestamp when this audit information was created.
    /// Automatically set to current UTC time during construction.
    /// </summary>
    /// <value>
    /// UTC DateTime representing the exact moment this audit info was instantiated.
    /// Used for precise timing and performance monitoring.
    /// </value>
    /// <remarks>
    /// Always in UTC to ensure consistency across time zones.
    /// Set automatically during construction for maximum accuracy.
    /// Critical for compliance reporting and performance analysis.
    /// </remarks>
    public DateTime AuditRequestDate { get; } = DateTime.UtcNow;

    /// <summary>
    /// Gets the identifier of the user who initiated this request.
    /// Set via constructor or remains null for system-initiated requests.
    /// </summary>
    /// <value>
    /// User identifier string or null for system/background processes.
    /// Used for security auditing and user action tracking.
    /// </value>
    /// <remarks>
    /// May be null for:
    /// - System-initiated background processes
    /// - Scheduled jobs and automated tasks
    /// - Inter-service communications
    /// Essential for user accountability and security auditing.
    /// </remarks>
    public string AuditRequestByUserId { get; }
}
