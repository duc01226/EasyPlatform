#region

using System.Diagnostics.CodeAnalysis;

#endregion

namespace Easy.Platform.Application.RequestContext;

/// <summary>
/// Provides access to the current request context throughout the application lifecycle.
/// This accessor serves as the central mechanism for storing and retrieving request-scoped data
/// such as user information, request metadata, and application-specific context values.
/// </summary>
/// <remarks>
/// The accessor is designed to work across different architectural patterns and lifetime scenarios:
/// <para>
/// <strong>Core Functionality:</strong>
/// - Maintains thread-safe access to request context data
/// - Supports multiple lifetime management strategies (scope-based, async-local, or combined)
/// - Provides fluent API for setting and adding context values
/// - Automatically handles context inheritance from parent dependency injection scopes
/// </para>
///
/// <para>
/// <strong>Usage Patterns:</strong>
/// - Injected into controllers, middleware, application services, and background jobs
/// - Used to access current user information, request IDs, and authorization data
/// - Enables clean separation of concerns by eliminating explicit parameter passing
/// - Supports async/await scenarios with proper context flow
/// </para>
///
/// <para>
/// <strong>Typical Context Data:</strong>
/// - User ID, name, email, roles, and permissions
/// - Request ID, trace identifier, and session information
/// - Organization units, custom application settings
/// - Pipeline tracking for event handlers and message consumers
/// </para>
///
/// <para>
/// <strong>Implementation Notes:</strong>
/// The accessor is registered as a scoped service in dependency injection containers.
/// It uses AsyncLocal storage to ensure context flows properly across async boundaries
/// while maintaining thread safety through internal synchronization mechanisms.
/// </para>
/// </remarks>
/// <example>
/// <code>
/// // In a controller
/// public class UserController : PlatformBaseController
/// {
///     public async Task&lt;UserInfo&gt; GetCurrentUser()
///     {
///         var userId = RequestContext.GetValue&lt;string&gt;(PlatformApplicationCommonRequestContextKeys.UserIdContextKey);
///         return await userService.GetUserAsync(userId);
///     }
/// }
///
/// // In middleware
/// public class RequestIdMiddleware
/// {
///     public async Task InvokeAsync(HttpContext context)
///     {
///         requestContextAccessor.Current.SetValue(
///             context.TraceIdentifier,
///             PlatformApplicationCommonRequestContextKeys.RequestIdContextKey);
///
///         await next(context);
///     }
/// }
///
/// // In application service
/// public class OrderService
/// {
///     public async Task CreateOrderAsync(Order order)
///     {
///         var currentUserId = requestContextAccessor.Current
///             .GetValue&lt;string&gt;(PlatformApplicationCommonRequestContextKeys.UserIdContextKey);
///
///         order.CreatedBy = currentUserId;
///         await orderRepository.SaveAsync(order);
///     }
/// }
/// </code>
/// </example>
public interface IPlatformApplicationRequestContextAccessor
{
    /// <summary>
    /// Gets or sets the current request context instance that contains all request-scoped data.
    /// This property provides access to the active context based on the configured lifetime mode.
    /// </summary>
    /// <value>
    /// The current <see cref="IPlatformApplicationRequestContext"/> instance containing request-scoped data.
    /// The context includes user information, request metadata, and application-specific values.
    /// </value>
    /// <remarks>
    /// <para>
    /// <strong>Getter Behavior:</strong>
    /// - Initializes the context lazily on first access
    /// - Returns context based on the configured lifetime mode (scope, async-local, or combined)
    /// - Ensures thread-safe access to context data
    /// - Inherits values from parent scopes when available
    /// </para>
    ///
    /// <para>
    /// <strong>Setter Behavior:</strong>
    /// - Updates the context storage according to the lifetime mode
    /// - Manages internal initialization flags
    /// - Clears context when set to null
    /// - Maintains consistency between different storage mechanisms in combined mode
    /// </para>
    ///
    /// <para>
    /// <strong>Thread Safety:</strong>
    /// The property is thread-safe and can be accessed concurrently from multiple threads.
    /// Internal synchronization ensures atomic operations during initialization and updates.
    /// </para>
    /// </remarks>
    /// <example>
    /// <code>
    /// // Get current user ID from context
    /// var userId = requestContextAccessor.Current
    ///     .GetValue&lt;string&gt;(PlatformApplicationCommonRequestContextKeys.UserIdContextKey);
    ///
    /// // Set request ID in context
    /// requestContextAccessor.Current.SetValue(
    ///     Guid.NewGuid().ToString(),
    ///     PlatformApplicationCommonRequestContextKeys.RequestIdContextKey);
    ///
    /// // Clear context
    /// requestContextAccessor.Current = null;
    /// </code>
    /// </example>
    [NotNull]
    IPlatformApplicationRequestContext Current { get; set; }

    /// <summary>
    /// Gets a value indicating whether the <see cref="Current"/> property has been accessed and initialized for the first time.
    /// This flag is used internally to track the initialization state and coordinate different lifetime modes.
    /// </summary>
    /// <value>
    /// <c>true</c> if the current context has been initialized; otherwise, <c>false</c>.
    /// </value>
    /// <remarks>
    /// <para>
    /// This property is primarily used for internal state management and optimization purposes:
    /// - Prevents redundant initialization operations
    /// - Coordinates between scope-based and async-local storage mechanisms
    /// - Helps manage the lazy initialization of request contexts
    /// - Supports proper cleanup during disposal
    /// </para>
    ///
    /// <para>
    /// <strong>Usage Scenarios:</strong>
    /// - Debugging context lifecycle issues
    /// - Conditional logic in derived implementations
    /// - Testing context initialization behavior
    /// - Performance monitoring and optimization
    /// </para>
    /// </remarks>
    /// <example>
    /// <code>
    /// // Check if context has been initialized
    /// if (!requestContextAccessor.FirstAccessCurrentInitiated)
    /// {
    ///     logger.LogInformation("Context not yet initialized");
    /// }
    ///
    /// // Access current context (triggers initialization)
    /// var context = requestContextAccessor.Current;
    ///
    /// // Now it should be initialized
    /// Debug.Assert(requestContextAccessor.FirstAccessCurrentInitiated);
    /// </code>
    /// </example>
    public bool FirstAccessCurrentInitiated { get; }

    /// <summary>
    /// Sets the specified key-value pairs in the current request context, replacing any existing values.
    /// This method provides a fluent interface for updating context data and ensures proper initialization
    /// for combined lifetime modes.
    /// </summary>
    /// <param name="values">
    /// A dictionary containing key-value pairs to set in the context. Keys should be context key constants
    /// from <see cref="PlatformApplicationCommonRequestContextKeys"/> or custom application-specific keys.
    /// Values can be any object type that needs to be stored in the request scope.
    /// </param>
    /// <returns>
    /// The current instance of <see cref="IPlatformApplicationRequestContextAccessor"/> to enable fluent chaining.
    /// </returns>
    /// <remarks>
    /// <para>
    /// <strong>Behavior:</strong>
    /// - Replaces existing values for the specified keys
    /// - Creates new entries for keys that don't exist
    /// - Handles special initialization logic for combined lifetime modes
    /// - Ensures consistency between scope and async-local contexts when using combined mode
    /// </para>
    ///
    /// <para>
    /// <strong>Thread Safety:</strong>
    /// This method is thread-safe and uses internal synchronization to prevent race conditions
    /// during context updates and initialization operations.
    /// </para>
    ///
    /// <para>
    /// <strong>Performance Considerations:</strong>
    /// - Efficient bulk update operation for multiple values
    /// - Minimizes lock contention through batch operations
    /// - Optimized for scenarios where multiple context values need to be set at once
    /// </para>
    /// </remarks>
    /// <example>
    /// <code>
    /// // Set multiple context values at once
    /// requestContextAccessor
    ///     .SetValues(new Dictionary&lt;string, object&gt;
    ///     {
    ///         { PlatformApplicationCommonRequestContextKeys.UserIdContextKey, "user123" },
    ///         { PlatformApplicationCommonRequestContextKeys.UserNameContextKey, "john.doe" },
    ///         { PlatformApplicationCommonRequestContextKeys.RequestIdContextKey, Guid.NewGuid().ToString() }
    ///     })
    ///     .AddValues(new Dictionary&lt;string, object&gt;
    ///     {
    ///         { "CustomKey", "CustomValue" }
    ///     });
    ///
    /// // Overwrite existing user context
    /// requestContextAccessor.SetValues(new Dictionary&lt;string, object&gt;
    /// {
    ///     { PlatformApplicationCommonRequestContextKeys.UserIdContextKey, "newUser456" }
    /// });
    /// </code>
    /// </example>
    IPlatformApplicationRequestContextAccessor SetValues(IDictionary<string, object> values);

    /// <summary>
    /// Adds the specified key-value pairs to the current request context, merging with existing values.
    /// This method provides a fluent interface for extending context data and ensures proper initialization
    /// for combined lifetime modes.
    /// </summary>
    /// <param name="values">
    /// A dictionary containing key-value pairs to add to the context. Keys should be context key constants
    /// from <see cref="PlatformApplicationCommonRequestContextKeys"/> or custom application-specific keys.
    /// Values can be any object type that needs to be stored in the request scope.
    /// </param>
    /// <returns>
    /// The current instance of <see cref="IPlatformApplicationRequestContextAccessor"/> to enable fluent chaining.
    /// </returns>
    /// <remarks>
    /// <para>
    /// <strong>Behavior:</strong>
    /// - Merges new values with existing context data
    /// - Overwrites existing values if keys already exist
    /// - Creates new entries for keys that don't exist
    /// - Handles special initialization logic for combined lifetime modes
    /// - Ensures consistency between scope and async-local contexts when using combined mode
    /// </para>
    ///
    /// <para>
    /// <strong>Difference from SetValues:</strong>
    /// While <see cref="SetValues"/> is designed for replacing context values entirely,
    /// <c>AddValues</c> is optimized for incremental updates and merging with existing data.
    /// Both methods provide similar functionality but differ in semantic intent.
    /// </para>
    ///
    /// <para>
    /// <strong>Thread Safety:</strong>
    /// This method is thread-safe and uses internal synchronization to prevent race conditions
    /// during context updates and initialization operations.
    /// </para>
    ///
    /// <para>
    /// <strong>Use Cases:</strong>
    /// - Adding additional context data during request processing
    /// - Enriching context with computed or derived values
    /// - Merging context from different sources (e.g., headers, claims, database)
    /// - Progressive context building throughout the request pipeline
    /// </para>
    /// </remarks>
    /// <example>
    /// <code>
    /// // Start with basic user context
    /// requestContextAccessor.SetValues(new Dictionary&lt;string, object&gt;
    /// {
    ///     { PlatformApplicationCommonRequestContextKeys.UserIdContextKey, "user123" }
    /// });
    ///
    /// // Add additional context information
    /// requestContextAccessor
    ///     .AddValues(new Dictionary&lt;string, object&gt;
    ///     {
    ///         { PlatformApplicationCommonRequestContextKeys.UserNameContextKey, "john.doe" },
    ///         { PlatformApplicationCommonRequestContextKeys.EmailContextKey, "john.doe@company.com" }
    ///     })
    ///     .AddValues(new Dictionary&lt;string, object&gt;
    ///     {
    ///         { "OrganizationId", "org456" },
    ///         { "Department", "Engineering" }
    ///     });
    ///
    /// // Add request-specific tracking information
    /// requestContextAccessor.AddValues(new Dictionary&lt;string, object&gt;
    /// {
    ///     { "ProcessingStartTime", DateTime.UtcNow },
    ///     { "CorrelationId", Activity.Current?.Id }
    /// });
    /// </code>
    /// </example>
    IPlatformApplicationRequestContextAccessor AddValues(IDictionary<string, object> values);
}
