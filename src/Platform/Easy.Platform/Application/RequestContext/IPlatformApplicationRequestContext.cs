#region

using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.RequestContext;

#endregion

namespace Easy.Platform.Application.RequestContext;

/// <summary>
/// This is the current context data in the current local thread from IPlatformApplicationRequestContextAccessor. Please never save this context as a property in any Service/Command/Handler.
/// Should use the IPlatformApplicationRequestContextAccessor.Current to get the data.
/// </summary>
/// <remarks>
/// The IPlatformApplicationRequestContext interface represents the current context data in the current local thread. It's used to store and retrieve context-specific data as key-value pairs, where the keys are strings and the values are objects. This context is typically accessed via IPlatformApplicationRequestContextAccessor.Current.
/// <br />
/// This interface is crucial for scenarios where you need to access context-specific data that has been previously stored in the IPlatformApplicationRequestContext. For example, this could be user-specific data, request-specific data, or any other data that needs to be accessed across different parts of the application during the lifetime of a single request or operation.
/// <br />
/// The IPlatformApplicationRequestContext interface includes methods for getting and setting values by key, getting all keys, getting all key-value pairs, and clearing the context. It's implemented by classes like PlatformDefaultApplicationRequestContext and PlatformAspNetApplicationRequestContext, which provide specific implementations for different platforms or scenarios.
/// </remarks>
public interface IPlatformApplicationRequestContext : IDictionary<string, object>
{
    public static HashSet<string> DefaultIgnoreRequestContextKeys { get; } =
    [
        DefaultCommonIgnoredRequestContextKeys.Accept,
        DefaultCommonIgnoredRequestContextKeys.AcceptEncoding,
        DefaultCommonIgnoredRequestContextKeys.AcceptLanguage,
        DefaultCommonIgnoredRequestContextKeys.AuthTime,
        DefaultCommonIgnoredRequestContextKeys.Authorization,
        DefaultCommonIgnoredRequestContextKeys.ContentLength,
        DefaultCommonIgnoredRequestContextKeys.ContentType,
        DefaultCommonIgnoredRequestContextKeys.CorrelationId,
        DefaultCommonIgnoredRequestContextKeys.Exp,
        DefaultCommonIgnoredRequestContextKeys.Iat,
        DefaultCommonIgnoredRequestContextKeys.Priority,
        DefaultCommonIgnoredRequestContextKeys.SecChUa,
        DefaultCommonIgnoredRequestContextKeys.SecChUaMobile,
        DefaultCommonIgnoredRequestContextKeys.SecChUaPlatform,
        DefaultCommonIgnoredRequestContextKeys.SecFetchDest,
        DefaultCommonIgnoredRequestContextKeys.SecFetchMode,
        DefaultCommonIgnoredRequestContextKeys.SecFetchSite,
        DefaultCommonIgnoredRequestContextKeys.SessionId,
        DefaultCommonIgnoredRequestContextKeys.Sid,
        DefaultCommonIgnoredRequestContextKeys.UserAgent,
        DefaultCommonIgnoredRequestContextKeys.Nbf,
        DefaultCommonIgnoredRequestContextKeys.Jti,
        DefaultCommonIgnoredRequestContextKeys.Aud,
        DefaultCommonIgnoredRequestContextKeys.Iss,
        DefaultCommonIgnoredRequestContextKeys.Referer
    ];

    /// <summary>
    /// Retrieves the value associated with the specified context key.
    /// </summary>
    /// <typeparam name="T">The type of value to retrieve.</typeparam>
    /// <param name="contextKey">The key of the value to retrieve.</param>
    /// <returns>The value associated with the specified key, if it exists; otherwise, the default value for type T.</returns>
    /// <remarks>
    /// The GetValue[T](string contextKey) method is part of the IPlatformApplicationRequestContext interface, which represents the current context data in the current local thread. This interface is used to store and retrieve context-specific data as key-value pairs, where the keys are strings and the values are objects.
    /// <br />
    /// The GetValue[T](string contextKey) method is specifically used to retrieve the value associated with a specified context key.The method takes a context key as a parameter and returns the value associated with this key, if it exists. If the key does not exist in the context, the method returns the default value for the specified type T.
    /// <br />
    /// This method is useful in scenarios where you need to access context-specific data that has been previously stored in the IPlatformApplicationRequestContext. For example, this could be user-specific data, request-specific data, or any other data that needs to be accessed across different parts of the application during the lifetime of a single request or operation.
    /// </remarks>
    T GetValue<T>(string contextKey);

    /// <summary>
    /// Retrieves the value associated with the specified context key.
    /// </summary>
    /// <param name="valueType">The type of the value to retrieve.</param>
    /// <param name="contextKey">The key of the value to retrieve.</param>
    /// <returns>The value associated with the specified context key. If the specified key is not found, a default value for the type parameter is returned.</returns>
    /// <exception cref="ArgumentNullException">Thrown when the contextKey is null.</exception>
    /// <exception cref="KeyNotFoundException">Thrown when the contextKey does not exist in the context.</exception>
    /// <remarks>
    /// The GetValue method in the IPlatformApplicationRequestContext interface is used to retrieve a value of a specific type from the application user context. The application user context is a dictionary-like structure that stores key-value pairs, where the key is a string and the value can be any object.
    /// <br />
    /// The GetValue method takes two parameters: valueType and contextKey. The valueType parameter specifies the type of the value to retrieve, and the contextKey parameter is the key associated with the value in the context.
    /// <br />
    /// If the specified contextKey is found in the context, the method returns the associated value. If the contextKey is not found, the method throws a KeyNotFoundException. If the contextKey is null, the method throws an ArgumentNullException.
    /// <br />
    /// This method is implemented in different classes such as PlatformDefaultApplicationRequestContext and PlatformAspNetApplicationRequestContext, which means the actual behavior of the method can vary depending on the specific implementation.
    /// <br />
    /// In general, this method is useful for retrieving user-specific data stored in the application context, which can be used for various purposes such as personalization, session management, and more.
    /// </remarks>
    object GetValue(Type valueType, string contextKey);

    /// <summary>
    /// Sets a single value in the request context associated with the specified key.
    /// This method allows storing context-specific data that can be retrieved later during the request lifecycle.
    /// </summary>
    /// <param name="value">
    /// The value to store in the context. Can be any object type including null.
    /// Common values include user IDs, request metadata, authorization data, and application-specific information.
    /// </param>
    /// <param name="contextKey">
    /// The unique key to associate with the value. Should use constants from
    /// <see cref="PlatformApplicationCommonRequestContextKeys"/> or application-specific key conventions.
    /// </param>
    /// <param name="onlySelf">
    /// When true, sets the value only in the current context instance without propagating to parent/child contexts.
    /// When false (default), may propagate the value through the context hierarchy depending on the implementation.
    /// </param>
    /// <remarks>
    /// <para>
    /// <strong>Usage Patterns:</strong>
    /// - Store user authentication information after login validation
    /// - Set request tracking data like correlation IDs and request IDs
    /// - Cache computed values for reuse within the same request
    /// - Store authorization context like user roles and permissions
    /// </para>
    ///
    /// <para>
    /// <strong>Key Conventions:</strong>
    /// Use predefined constants from <see cref="PlatformApplicationCommonRequestContextKeys"/> for standard values:
    /// - UserIdContextKey, UserNameContextKey, EmailContextKey for user data
    /// - RequestIdContextKey for request tracking
    /// - UserRolesContextKey for authorization data
    /// </para>
    ///
    /// <para>
    /// <strong>Thread Safety:</strong>
    /// Thread safety depends on the specific implementation. The default implementations
    /// use thread-safe collections and synchronization mechanisms.
    /// </para>
    /// </remarks>
    /// <example>
    /// <code>
    /// // Set user information in context
    /// context.SetValue("user123", PlatformApplicationCommonRequestContextKeys.UserIdContextKey);
    /// context.SetValue("john.doe@company.com", PlatformApplicationCommonRequestContextKeys.EmailContextKey);
    ///
    /// // Set request tracking information
    /// context.SetValue(Guid.NewGuid().ToString(), PlatformApplicationCommonRequestContextKeys.RequestIdContextKey);
    ///
    /// // Set custom application data
    /// context.SetValue("Engineering", "Department", onlySelf: true);
    /// </code>
    /// </example>
    void SetValue(object? value, string contextKey, bool onlySelf = false);

    /// <summary>
    /// Sets multiple key-value pairs in the request context in a single operation.
    /// This method provides an efficient way to update multiple context values simultaneously.
    /// </summary>
    /// <param name="values">
    /// A dictionary containing key-value pairs to set in the context. Keys should follow
    /// the same conventions as <see cref="SetValue"/> method. Null or empty dictionaries are handled gracefully.
    /// </param>
    /// <param name="onlySelf">
    /// When true, sets values only in the current context instance without propagating to parent/child contexts.
    /// When false (default), may propagate values through the context hierarchy depending on the implementation.
    /// </param>
    /// <remarks>
    /// <para>
    /// <strong>Behavior:</strong>
    /// - Replaces existing values for keys that already exist
    /// - Creates new entries for keys that don't exist
    /// - Null values are stored as-is and can be used to clear specific keys
    /// - Empty dictionaries result in no changes to the context
    /// </para>
    ///
    /// <para>
    /// <strong>Performance Benefits:</strong>
    /// - More efficient than multiple individual SetValue calls
    /// - Reduces lock contention in thread-safe implementations
    /// - Optimized for bulk context initialization scenarios
    /// </para>
    ///
    /// <para>
    /// <strong>Common Use Cases:</strong>
    /// - Initial context population from authentication data
    /// - Bulk updates from external data sources
    /// - Merging context data from multiple sources
    /// - Restoring context state in background jobs
    /// </para>
    /// </remarks>
    /// <example>
    /// <code>
    /// // Set multiple user context values at once
    /// var userContextValues = new Dictionary&lt;string, object?&gt;
    /// {
    ///     { PlatformApplicationCommonRequestContextKeys.UserIdContextKey, "user123" },
    ///     { PlatformApplicationCommonRequestContextKeys.UserNameContextKey, "john.doe" },
    ///     { PlatformApplicationCommonRequestContextKeys.EmailContextKey, "john.doe@company.com" },
    ///     { PlatformApplicationCommonRequestContextKeys.UserRolesContextKey, new[] { "Employee", "Manager" } }
    /// };
    ///
    /// context.SetValues(userContextValues);
    ///
    /// // Set request-specific data
    /// var requestData = new Dictionary&lt;string, object?&gt;
    /// {
    ///     { PlatformApplicationCommonRequestContextKeys.RequestIdContextKey, Guid.NewGuid().ToString() },
    ///     { "CorrelationId", Activity.Current?.Id },
    ///     { "StartTime", DateTime.UtcNow }
    /// };
    ///
    /// context.SetValues(requestData, onlySelf: true);
    /// </code>
    /// </example>
    void SetValues(IDictionary<string, object?> values, bool onlySelf = false);

    /// <summary>
    /// Copies all values from another request context instance into the current context.
    /// This method enables context inheritance and merging between different context instances.
    /// </summary>
    /// <param name="values">
    /// The source context from which to copy values. All key-value pairs from this context
    /// will be copied to the current context. If null, no operation is performed.
    /// </param>
    /// <param name="onlySelf">
    /// When true, copies values only to the current context instance without propagating to parent/child contexts.
    /// When false (default), may propagate values through the context hierarchy depending on the implementation.
    /// </param>
    /// <remarks>
    /// <para>
    /// <strong>Context Inheritance Scenarios:</strong>
    /// - Parent-child scope relationships in dependency injection
    /// - Background job context preservation from the originating request
    /// - Context merging in distributed processing scenarios
    /// - Test context setup from template contexts
    /// </para>
    ///
    /// <para>
    /// <strong>Behavior:</strong>
    /// - Copies all accessible key-value pairs from the source context
    /// - Overwrites existing keys in the target context
    /// - Respects ignored keys based on implementation settings
    /// - Handles null source context gracefully
    /// </para>
    ///
    /// <para>
    /// <strong>Performance Considerations:</strong>
    /// - More efficient than manually iterating and setting individual values
    /// - Optimized for context cloning and inheritance scenarios
    /// - May involve serialization/deserialization for cross-process scenarios
    /// </para>
    /// </remarks>
    /// <example>
    /// <code>
    /// // Copy context from parent scope to child scope
    /// var parentContext = parentServiceProvider.GetService&lt;IPlatformApplicationRequestContextAccessor&gt;().Current;
    /// var childContext = childServiceProvider.GetService&lt;IPlatformApplicationRequestContextAccessor&gt;().Current;
    ///
    /// childContext.SetValues(parentContext);
    ///
    /// // Preserve request context for background job
    /// var backgroundJobContext = backgroundJobServiceProvider.GetService&lt;IPlatformApplicationRequestContextAccessor&gt;().Current;
    /// backgroundJobContext.SetValues(originalRequestContext, onlySelf: true);
    ///
    /// // Create test context from template
    /// var testContext = testServiceProvider.GetService&lt;IPlatformApplicationRequestContextAccessor&gt;().Current;
    /// testContext.SetValues(templateContext);
    /// </code>
    /// </example>
    void SetValues(IPlatformApplicationRequestContext values, bool onlySelf = false);

    /// <summary>
    /// Sets or updates a single key-value pair in the request context and returns the current context instance for fluent chaining.
    /// This method provides a convenient way to set values while maintaining a fluent interface for method chaining.
    /// </summary>
    /// <param name="key">
    /// The unique key to associate with the value. Should follow the same conventions as other context methods,
    /// preferably using constants from <see cref="PlatformApplicationCommonRequestContextKeys"/>.
    /// </param>
    /// <param name="value">
    /// The value to store in the context. Can be any object type including null.
    /// </param>
    /// <param name="onlySelf">
    /// When true, sets the value only in the current context instance without propagating to parent/child contexts.
    /// When false (default), may propagate the value through the context hierarchy depending on the implementation.
    /// </param>
    /// <returns>
    /// The current <see cref="IPlatformApplicationRequestContext"/> instance to enable fluent method chaining.
    /// </returns>
    /// <remarks>
    /// <para>
    /// This method is essentially a fluent wrapper around <see cref="SetValue"/> that enables method chaining patterns.
    /// It performs the same operation as SetValue but returns the context instance for continued operations.
    /// </para>
    ///
    /// <para>
    /// <strong>Fluent Interface Benefits:</strong>
    /// - Enables chaining multiple context operations in a single statement
    /// - Improves code readability and conciseness
    /// - Reduces temporary variable usage
    /// - Supports builder-pattern scenarios
    /// </para>
    /// </remarks>
    /// <example>
    /// <code>
    /// // Fluent chaining of context operations
    /// context.Upsert(PlatformApplicationCommonRequestContextKeys.UserIdContextKey, "user123")
    ///        .Upsert(PlatformApplicationCommonRequestContextKeys.RequestIdContextKey, Guid.NewGuid().ToString())
    ///        .Upsert("Department", "Engineering", onlySelf: true);
    ///
    /// // Combined with other fluent operations
    /// var result = context
    ///     .Upsert("ProcessingStart", DateTime.UtcNow)
    ///     .GetValue&lt;string&gt;(PlatformApplicationCommonRequestContextKeys.UserIdContextKey);
    /// </code>
    /// </example>
    public IPlatformApplicationRequestContext Upsert(string key, object value, bool onlySelf = false)
    {
        SetValue(value, key, onlySelf);

        return this;
    }

    /// <summary>
    /// Sets or updates multiple key-value pairs in the request context and returns the current context instance for fluent chaining.
    /// This method provides a convenient way to bulk update values while maintaining a fluent interface for method chaining.
    /// </summary>
    /// <param name="values">
    /// A dictionary containing key-value pairs to set in the context. Null or empty dictionaries are handled gracefully.
    /// </param>
    /// <param name="onlySelf">
    /// When true, sets values only in the current context instance without propagating to parent/child contexts.
    /// When false (default), may propagate values through the context hierarchy depending on the implementation.
    /// </param>
    /// <returns>
    /// The current <see cref="IPlatformApplicationRequestContext"/> instance to enable fluent method chaining.
    /// </returns>
    /// <remarks>
    /// <para>
    /// This method is essentially a fluent wrapper around <see cref="SetValues(IDictionary{string, object?}, bool)"/>
    /// that enables method chaining patterns. It performs the same operation as SetValues but returns the context instance.
    /// </para>
    ///
    /// <para>
    /// <strong>Bulk Update Benefits:</strong>
    /// - Efficient bulk updates with fluent interface
    /// - Combines the performance benefits of SetValues with method chaining
    /// - Ideal for context initialization and complex setup scenarios
    /// - Supports conditional updates and transformations
    /// </para>
    /// </remarks>
    /// <example>
    /// <code>
    /// // Fluent bulk context setup
    /// var userData = new Dictionary&lt;string, object?&gt;
    /// {
    ///     { PlatformApplicationCommonRequestContextKeys.UserIdContextKey, "user123" },
    ///     { PlatformApplicationCommonRequestContextKeys.EmailContextKey, "user@company.com" }
    /// };
    ///
    /// var requestData = new Dictionary&lt;string, object?&gt;
    /// {
    ///     { PlatformApplicationCommonRequestContextKeys.RequestIdContextKey, Guid.NewGuid().ToString() },
    ///     { "StartTime", DateTime.UtcNow }
    /// };
    ///
    /// context.Upsert(userData)
    ///        .Upsert(requestData, onlySelf: true)
    ///        .Upsert("Status", "Processing");
    /// </code>
    /// </example>
    public IPlatformApplicationRequestContext Upsert(IDictionary<string, object?> values, bool onlySelf = false)
    {
        SetValues(values, onlySelf);

        return this;
    }

    /// <summary>
    /// Retrieves all keys present in the current request context, including keys that are normally ignored by other operations.
    /// This method provides access to the complete key collection without applying any filtering rules.
    /// </summary>
    /// <returns>
    /// A list of all string keys present in the context, including those defined in
    /// <see cref="DefaultIgnoreRequestContextKeys"/> and any implementation-specific ignored keys.
    /// Returns an empty list if the context contains no keys.
    /// </returns>
    /// <remarks>
    /// <para>
    /// This method is useful for debugging, logging, or scenarios where you need to inspect the complete
    /// content of the request context without any filtering. Unlike <see cref="GetAllKeys()"/>, this method
    /// includes keys that are typically considered internal or system-level keys.
    /// </para>
    ///
    /// <para>
    /// <strong>Common Use Cases:</strong>
    /// - Debugging context content issues
    /// - Full context serialization for logging
    /// - Administrative tools that need complete context visibility
    /// - Context analysis and auditing scenarios
    /// </para>
    ///
    /// <para>
    /// <strong>Performance Considerations:</strong>
    /// - May return a large number of keys including HTTP headers and JWT claims
    /// - Consider using <see cref="GetAllKeys()"/> for most application scenarios
    /// - The returned list is a snapshot and modifications won't affect the original context
    /// </para>
    /// </remarks>
    /// <example>
    /// <code>
    /// // Get all keys for debugging purposes
    /// var allKeys = context.GetAllIncludeIgnoredKeys();
    /// foreach (var key in allKeys)
    /// {
    ///     var value = context.GetValue&lt;object&gt;(key);
    ///     Console.WriteLine($"Key: {key}, Value: {value}");
    /// }
    ///
    /// // Compare filtered vs unfiltered keys
    /// var allKeys = context.GetAllIncludeIgnoredKeys();
    /// var filteredKeys = context.GetAllKeys();
    /// var ignoredKeys = allKeys.Except(filteredKeys).ToList();
    /// </code>
    /// </example>
    List<string> GetAllIncludeIgnoredKeys();

    /// <summary>
    /// Retrieves all key-value pairs present in the current request context, including pairs that are normally ignored by other operations.
    /// This method provides access to the complete context data without applying any filtering rules.
    /// </summary>
    /// <returns>
    /// A dictionary containing all key-value pairs present in the context, including those with keys defined in
    /// <see cref="DefaultIgnoreRequestContextKeys"/> and any implementation-specific ignored keys.
    /// Returns an empty dictionary if the context contains no data.
    /// </returns>
    /// <remarks>
    /// <para>
    /// This method complements <see cref="GetAllIncludeIgnoredKeys()"/> by providing both keys and their associated values.
    /// It's particularly useful for complete context serialization, debugging, and scenarios where you need
    /// unrestricted access to all context data.
    /// </para>
    ///
    /// <para>
    /// <strong>Data Included:</strong>
    /// - User-set application data
    /// - HTTP headers (Authorization, User-Agent, etc.)
    /// - JWT token claims (exp, iat, aud, etc.)
    /// - System-generated metadata
    /// - Any other context data regardless of ignore rules
    /// </para>
    ///
    /// <para>
    /// <strong>Security Considerations:</strong>
    /// - May contain sensitive data like authorization tokens
    /// - Use caution when logging or transmitting the complete context
    /// - Consider data sanitization for security-sensitive scenarios
    /// </para>
    /// </remarks>
    /// <example>
    /// <code>
    /// // Get complete context for debugging
    /// var allContextData = context.GetAllIncludeIgnoredKeyValues();
    ///
    /// // Serialize for detailed logging (be careful with sensitive data)
    /// var contextJson = JsonSerializer.Serialize(allContextData, new JsonSerializerOptions
    /// {
    ///     WriteIndented = true
    /// });
    ///
    /// // Filter sensitive data before logging
    /// var sanitizedContext = allContextData
    ///     .Where(kvp => !kvp.Key.Contains("Authorization") && !kvp.Key.Contains("token"))
    ///     .ToDictionary(kvp => kvp.Key, kvp => kvp.Value);
    /// </code>
    /// </example>
    IDictionary<string, object?> GetAllIncludeIgnoredKeyValues();

    /// <summary>
    /// Retrieves all keys present in the current request context, excluding keys that are configured to be ignored.
    /// This method provides access to application-relevant keys by filtering out system-level and infrastructure keys.
    /// </summary>
    /// <returns>
    /// A list of string keys present in the context, excluding those defined in <see cref="DefaultIgnoreRequestContextKeys"/>
    /// and any additional ignored keys from <see cref="IPlatformApplicationSettingContext.GetIgnoreRequestContextKeys"/>.
    /// Returns an empty list if no application-relevant keys are present.
    /// </returns>
    /// <remarks>
    /// <para>
    /// This method is the recommended way to retrieve context keys for most application scenarios. It filters out
    /// infrastructure-level keys like HTTP headers, JWT standard claims, and other system metadata that are
    /// typically not relevant for business logic.
    /// </para>
    ///
    /// <para>
    /// <strong>Filtered Keys Include:</strong>
    /// - HTTP headers (Authorization, User-Agent, Content-Type, etc.)
    /// - Standard JWT claims (exp, iat, aud, iss, etc.)
    /// - System metadata (correlation IDs, session IDs, etc.)
    /// - Any additional keys configured via IPlatformApplicationSettingContext
    /// </para>
    ///
    /// <para>
    /// <strong>Typical Remaining Keys:</strong>
    /// - User identification data (UserIdContextKey, EmailContextKey)
    /// - Application-specific context values
    /// - Business process data
    /// - Custom request metadata
    /// </para>
    /// </remarks>
    /// <example>
    /// <code>
    /// // Get application-relevant keys for processing
    /// var appKeys = context.GetAllKeys();
    /// foreach (var key in appKeys)
    /// {
    ///     // Process only business-relevant context data
    ///     var value = context.GetValue&lt;object&gt;(key);
    ///     ProcessBusinessContextData(key, value);
    /// }
    ///
    /// // Use for context validation in business logic
    /// var requiredKeys = new[] {
    ///     PlatformApplicationCommonRequestContextKeys.UserIdContextKey,
    ///     PlatformApplicationCommonRequestContextKeys.EmailContextKey
    /// };
    /// var presentKeys = context.GetAllKeys();
    /// var missingKeys = requiredKeys.Except(presentKeys).ToList();
    /// </code>
    /// </example>
    List<string> GetAllKeys();

    /// <summary>
    /// Retrieves all key-value pairs present in the current request context, excluding pairs with keys that are configured to be ignored.
    /// This method provides access to application-relevant context data by filtering out system-level and infrastructure data.
    /// </summary>
    /// <returns>
    /// A dictionary containing key-value pairs from the context, excluding those with keys defined in
    /// <see cref="DefaultIgnoreRequestContextKeys"/> and any additional ignored keys from
    /// <see cref="IPlatformApplicationSettingContext.GetIgnoreRequestContextKeys"/>.
    /// Returns an empty dictionary if no application-relevant data is present.
    /// </returns>
    /// <remarks>
    /// <para>
    /// This method is the recommended way to retrieve context data for most application scenarios. It provides
    /// a clean view of the context by excluding infrastructure-level data that is typically not relevant
    /// for business logic or application processing.
    /// </para>
    ///
    /// <para>
    /// <strong>Use Cases:</strong>
    /// - Context serialization for business logic
    /// - Data transfer to business services
    /// - Context validation and processing
    /// - Clean context logging without sensitive/system data
    /// - Context cloning for business scenarios
    /// </para>
    ///
    /// <para>
    /// <strong>Performance Benefits:</strong>
    /// - Smaller data set compared to GetAllIncludeIgnoredKeyValues()
    /// - Reduced serialization overhead
    /// - Faster iteration for business logic scenarios
    /// </para>
    /// </remarks>
    /// <example>
    /// <code>
    /// // Get clean context data for business processing
    /// var businessContext = context.GetAllKeyValues();
    /// var contextDto = new BusinessContextDto
    /// {
    ///     UserId = businessContext.GetRequestContextValue&lt;string&gt;(PlatformApplicationCommonRequestContextKeys.UserIdContextKey),
    ///     Email = businessContext.GetRequestContextValue&lt;string&gt;(PlatformApplicationCommonRequestContextKeys.EmailContextKey),
    ///     AdditionalData = businessContext.Where(kvp => !IsStandardKey(kvp.Key)).ToDictionary()
    /// };
    ///
    /// // Serialize for clean logging
    /// var cleanContextJson = JsonSerializer.Serialize(businessContext);
    ///
    /// // Pass to business services
    /// await businessService.ProcessWithContext(businessContext);
    /// </code>
    /// </example>
    IDictionary<string, object?> GetAllKeyValues();

    /// <summary>
    /// Retrieves the accessor instance that manages this request context.
    /// This method provides access to the underlying context management system for advanced scenarios.
    /// </summary>
    /// <returns>
    /// The <see cref="IPlatformApplicationRequestContextAccessor"/> instance that manages the lifecycle
    /// and scope of this context instance.
    /// </returns>
    /// <remarks>
    /// <para>
    /// This method provides access to the context accessor for scenarios where you need to interact with
    /// the context management system beyond basic value operations. The accessor provides capabilities
    /// for context lifecycle management, scope handling, and advanced context operations.
    /// </para>
    ///
    /// <para>
    /// <strong>Advanced Use Cases:</strong>
    /// - Context scope management and nesting
    /// - Parent-child context relationships
    /// - Context lifetime control in custom scenarios
    /// - Integration with dependency injection systems
    /// - Custom context initialization and cleanup
    /// </para>
    ///
    /// <para>
    /// <strong>Typical Scenarios:</strong>
    /// - Background job context setup
    /// - Custom middleware context management
    /// - Test environment context isolation
    /// - Multi-tenant context switching
    /// </para>
    ///
    /// <para>
    /// <strong>Caution:</strong>
    /// Direct accessor usage should be limited to advanced scenarios. Most applications should use
    /// the context methods directly rather than accessing the underlying accessor.
    /// </para>
    /// </remarks>
    /// <example>
    /// <code>
    /// // Access the context accessor for advanced operations
    /// var accessor = context.RequestContextAccessor();
    ///
    /// // Use accessor for bulk operations
    /// var additionalData = new Dictionary&lt;string, object?&gt;
    /// {
    ///     { "ProcessStart", DateTime.UtcNow },
    ///     { "RequestId", Guid.NewGuid().ToString() }
    /// };
    /// accessor.AddValues(additionalData);
    ///
    /// // Access context lifecycle information
    /// var isFirstAccess = accessor.FirstAccessCurrentInitiated;
    ///
    /// // Get accessor for dependency injection or service location
    /// serviceCollection.AddTransient(provider => context.RequestContextAccessor());
    /// </code>
    /// </example>
    IPlatformApplicationRequestContextAccessor RequestContextAccessor();

    /// <summary>
    /// Sets a transient in-memory value that is isolated from the main context and excluded from all serialization operations.
    /// This method stores values in a separate internal cache that is only accessible via <see cref="GetTransientValue{T}"/>.
    /// </summary>
    /// <param name="value">The value to store. Can be any object type including null.</param>
    /// <param name="contextKey">The unique key to associate with the value.</param>
    /// <remarks>
    /// <para>
    /// <strong>Key Characteristics:</strong>
    /// - Values are stored in a separate isolated dictionary, NOT in the main context data
    /// - Values are NOT included in <see cref="GetAllKeys"/>, <see cref="GetAllKeyValues"/>,
    ///   <see cref="GetAllIncludeIgnoredKeys"/>, or <see cref="GetAllIncludeIgnoredKeyValues"/>
    /// - Values are NOT serialized to background jobs, message bus consumers, or inbox patterns
    /// - Values exist only for the lifetime of the current request/scope in memory
    /// - Values can only be retrieved using <see cref="GetTransientValue{T}"/>
    /// </para>
    ///
    /// <para>
    /// <strong>Use Cases:</strong>
    /// - Storing large temporary objects that should not be serialized (e.g., survey responses, file streams)
    /// - Caching expensive computations within a single request without polluting the serializable context
    /// - Passing temporary data between services within the same request without cross-layer propagation
    /// - Avoiding context bloat when storing request-scoped data that is only needed locally
    /// </para>
    ///
    /// <para>
    /// <strong>Important:</strong>
    /// Unlike <see cref="SetValue"/>, transient values do not propagate through the context hierarchy
    /// and are completely invisible to any context enumeration or serialization operations.
    /// </para>
    /// </remarks>
    /// <example>
    /// <code>
    /// // Store a large temporary object that should not be serialized
    /// var surveyResponses = await LoadLargeSurveyResponses();
    /// context.SetTransientValue(surveyResponses, "TempSurveyResponses");
    ///
    /// // Later in the same request, retrieve it
    /// var responses = context.GetTransientValue&lt;SurveyResponseCollection&gt;("TempSurveyResponses");
    ///
    /// // This value will NOT appear in:
    /// // - context.GetAllKeys()
    /// // - context.GetAllKeyValues()
    /// // - Background job context serialization
    /// // - Message bus consumer context
    /// </code>
    /// </example>
    void SetTransientValue(object? value, string contextKey);

    /// <summary>
    /// Retrieves a transient in-memory value that was previously set using <see cref="SetTransientValue"/>.
    /// This method only accesses the isolated transient cache, not the main context data.
    /// </summary>
    /// <typeparam name="T">The type of value to retrieve.</typeparam>
    /// <param name="contextKey">The key of the value to retrieve.</param>
    /// <returns>
    /// The value associated with the specified key cast to type T, or default(T) if the key is not found
    /// or the value cannot be converted to the specified type.
    /// </returns>
    /// <remarks>
    /// <para>
    /// This method provides access to values stored via <see cref="SetTransientValue"/> only.
    /// It does not fall back to the main context data, HTTP context, claims, or any other data source.
    /// </para>
    ///
    /// <para>
    /// <strong>Behavior:</strong>
    /// - Returns the transient value if found and convertible to type T
    /// - Returns default(T) if the key is not found in the transient cache
    /// - Does NOT search in <see cref="GetValue{T}"/> data sources
    /// - Thread-safe access to the transient cache
    /// </para>
    /// </remarks>
    /// <example>
    /// <code>
    /// // Set a transient value earlier in the request
    /// context.SetTransientValue(new ExpensiveComputationResult { Data = result }, "CachedComputation");
    ///
    /// // Retrieve it later in the same request
    /// var cached = context.GetTransientValue&lt;ExpensiveComputationResult&gt;("CachedComputation");
    /// if (cached != null)
    /// {
    ///     // Use cached result
    /// }
    /// </code>
    /// </example>
    T? GetTransientValue<T>(string contextKey);

    /// <summary>
    /// Contains constant field names for keys in HTTP and JWT contexts that can be ignored.
    /// </summary>
    public static class DefaultCommonIgnoredRequestContextKeys
    {
        /// <summary>
        /// Contains the credentials or token used for authorization, typically in the format "Bearer {token}". Part of the HTTP context.
        /// </summary>
        public const string Authorization = "Authorization";

        /// <summary>
        /// Represents a priority level, often used to indicate request priority.
        /// </summary>
        public const string Priority = "priority";

        /// <summary>
        /// The length of the request body, in bytes. Part of the HTTP context.
        /// </summary>
        public const string ContentLength = "Content-Length";

        /// <summary>
        /// Indicates if the user agent is on a mobile device. Part of the HTTP context.
        /// </summary>
        public const string SecChUaMobile = "sec-ch-ua-mobile";

        /// <summary>
        /// Specifies accepted content-encoding methods for the response, such as gzip or deflate. Part of the HTTP context.
        /// </summary>
        public const string AcceptEncoding = "Accept-Encoding";

        /// <summary>
        /// Unique session identifier for the user session. Part of the HTTP context.
        /// </summary>
        public const string SessionId = "session_id";

        /// <summary>
        /// Specifies accepted content types for the response, such as application/json. Part of the HTTP context.
        /// </summary>
        public const string Accept = "Accept";

        /// <summary>
        /// Session ID used to track user sessions. Part of the HTTP context.
        /// </summary>
        public const string Sid = "sid";

        /// <summary>
        /// Indicates the preferred language of the client. Part of the HTTP context.
        /// </summary>
        public const string AcceptLanguage = "Accept-Language";

        /// <summary>
        /// Specifies the user agent (browser and version) making the request. Part of the HTTP context.
        /// </summary>
        public const string UserAgent = "User-Agent";

        /// <summary>
        /// Specifies the platform (e.g., Windows, MacOS) of the user agent. Part of the HTTP context.
        /// </summary>
        public const string SecChUaPlatform = "sec-ch-ua-platform";

        /// <summary>
        /// Indicates the relationship between the current request URL and the referrer. Part of the HTTP context.
        /// </summary>
        public const string SecFetchSite = "sec-fetch-site";

        /// <summary>
        /// Unique identifier for tracking requests across distributed systems. Part of the HTTP context.
        /// </summary>
        public const string CorrelationId = "Correlation-Id";

        /// <summary>
        /// Specifies accepted brands of user agents, often for content optimization. Part of the HTTP context.
        /// </summary>
        public const string SecChUa = "sec-ch-ua";

        /// <summary>
        /// Specifies the destination of the fetch request, e.g., document, image, or empty. Part of the HTTP context.
        /// </summary>
        public const string SecFetchDest = "sec-fetch-dest";

        /// <summary>
        /// The media type of the request body. Part of the HTTP context.
        /// </summary>
        public const string ContentType = "Content-Type";

        /// <summary>
        /// The authentication time of the JWT token, representing when the token was issued.
        /// </summary>
        public const string AuthTime = "auth_time";

        /// <summary>
        /// The expiration time of the JWT token, representing when the token will expire.
        /// </summary>
        public const string Exp = "exp";

        /// <summary>
        /// The issued-at time of the JWT token, representing when the token was created.
        /// </summary>
        public const string Iat = "iat";

        /// <summary>
        /// Specifies the fetch request mode, e.g., cors, no-cors, same-origin. Part of the HTTP context.
        /// </summary>
        public const string SecFetchMode = "sec-fetch-mode";

        /// <summary>
        /// The Not Before time of the JWT token, representing the earliest time at which the token is valid.
        /// </summary>
        public const string Nbf = "nbf";

        /// <summary>
        /// A unique identifier for the JWT token, often used to prevent replay attacks. Part of the JWT context.
        /// </summary>
        public const string Jti = "jti";

        /// <summary>
        /// The audience(s) that the JWT token is intended for, typically identifying the recipient(s) that the token is meant for.
        /// </summary>
        public const string Aud = "aud";

        /// <summary>
        /// The issuer of the JWT token, identifying the principal that issued the token.
        /// </summary>
        public const string Iss = "iss";

        /// <summary>
        /// The address of the previous web page from which a request was made. Part of the HTTP context.
        /// </summary>
        public const string Referer = "Referer";
    }
}

/// <summary>
/// Provides extension methods for <see cref="IPlatformApplicationRequestContext"/> and related dictionary interfaces
/// to enhance context manipulation capabilities with fluent interfaces and conditional value operations.
/// </summary>
/// <remarks>
/// This static class extends the core request context functionality with additional convenience methods
/// that support conditional value addition, cross-context value copying, and seamless integration
/// with generic dictionary interfaces. These extensions are particularly useful for scenarios involving
/// context merging, conditional updates, and working with contexts through different interface abstractions.
/// </remarks>
public static class PlatformApplicationRequestContextExtensions
{
    /// <summary>
    /// Conditionally adds key-value pairs to the request context, setting values only for keys that don't already exist or have null values.
    /// This method provides additive behavior rather than replacement, making it ideal for default value scenarios and context initialization.
    /// </summary>
    /// <param name="context">
    /// The target request context to add values to. Must not be null.
    /// </param>
    /// <param name="values">
    /// A dictionary containing key-value pairs to conditionally add. Keys that already exist with non-null values
    /// in the context will be skipped. Null or empty dictionaries are handled gracefully.
    /// </param>
    /// <param name="onlySelf">
    /// When true, adds values only to the current context instance without propagating to parent/child contexts.
    /// When false (default), uses the context accessor's AddValues method which may propagate through the context hierarchy.
    /// </param>
    /// <returns>
    /// The current <see cref="IPlatformApplicationRequestContext"/> instance to enable fluent method chaining.
    /// </returns>
    /// <remarks>
    /// <para>
    /// <strong>Conditional Logic:</strong>
    /// - Only adds values for keys that don't exist or have null values in the target context
    /// - Existing non-null values are preserved and not overwritten
    /// - Provides safe default value population without data loss
    /// </para>
    ///
    /// <para>
    /// <strong>Behavior Differences by onlySelf Parameter:</strong>
    /// - When onlySelf=true: Uses direct context manipulation with filtered values
    /// - When onlySelf=false: Delegates to the context accessor's AddValues method for hierarchy-aware operations
    /// </para>
    ///
    /// <para>
    /// <strong>Common Use Cases:</strong>
    /// - Setting default context values without overwriting existing data
    /// - Safely merging contexts with preservation of existing values
    /// - Initializing context with fallback values
    /// - Conditional context population in middleware or background services
    /// </para>
    /// </remarks>
    /// <example>
    /// <code>
    /// // Add default values without overwriting existing context
    /// var defaultValues = new Dictionary&lt;string, object?&gt;
    /// {
    ///     { PlatformApplicationCommonRequestContextKeys.UserIdContextKey, "anonymous" },
    ///     { PlatformApplicationCommonRequestContextKeys.RequestIdContextKey, Guid.NewGuid().ToString() },
    ///     { "DefaultRegion", "US-East" }
    /// };
    ///
    /// // Only adds values that don't already exist
    /// context.AddValues(defaultValues)
    ///        .AddValues(additionalDefaults, onlySelf: true);
    ///
    /// // Chain with other context operations
    /// context.AddValues(systemDefaults)
    ///        .SetValue("ProcessingStart", DateTime.UtcNow);
    /// </code>
    /// </example>
    public static IPlatformApplicationRequestContext AddValues(
        this IPlatformApplicationRequestContext context,
        IDictionary<string, object?> values,
        bool onlySelf = false)
    {
        if (onlySelf)
            context.Upsert(values.Where(item => context!.GetValue<object?>(item.Key) is null).ToDictionary(), true);
        else
            context.RequestContextAccessor().AddValues(values);

        return context;
    }

    /// <summary>
    /// Conditionally adds all values from another request context instance to the current context,
    /// copying only keys that don't already exist or have null values in the target context.
    /// This method enables safe context inheritance and merging between different context instances.
    /// </summary>
    /// <param name="context">
    /// The target request context to add values to. Must not be null.
    /// </param>
    /// <param name="values">
    /// The source request context from which to copy values. All accessible key-value pairs from this context
    /// will be evaluated for conditional addition. If null, no operation is performed.
    /// </param>
    /// <param name="onlySelf">
    /// When true, adds values only to the current context instance without propagating to parent/child contexts.
    /// When false (default), may propagate values through the context hierarchy depending on the underlying implementation.
    /// </param>
    /// <returns>
    /// The current <see cref="IPlatformApplicationRequestContext"/> instance to enable fluent method chaining.
    /// </returns>
    /// <remarks>
    /// <para>
    /// This method is a specialized version of <see cref="AddValues(IPlatformApplicationRequestContext, IDictionary{string, object?}, bool)"/>
    /// that operates directly on request context instances. It uses <see cref="IPlatformApplicationRequestContext.GetAllIncludeIgnoredKeyValues"/>
    /// to retrieve all data from the source context, including normally filtered keys.
    /// </para>
    ///
    /// <para>
    /// <strong>Context Inheritance Scenarios:</strong>
    /// - Merging parent context into child scopes while preserving child-specific values
    /// - Combining template contexts with instance-specific contexts
    /// - Safe context restoration from backup contexts
    /// - Cross-service context propagation with conflict resolution
    /// </para>
    ///
    /// <para>
    /// <strong>Data Handling:</strong>
    /// - Includes all context data, even normally ignored keys like HTTP headers
    /// - Applies conditional logic to prevent overwriting existing values
    /// - Preserves the complete context state from the source
    /// </para>
    /// </remarks>
    /// <example>
    /// <code>
    /// // Safely merge parent context into child without overwriting child values
    /// var parentContext = parentScope.GetService&lt;IPlatformApplicationRequestContextAccessor&gt;().Current;
    /// var childContext = childScope.GetService&lt;IPlatformApplicationRequestContextAccessor&gt;().Current;
    ///
    /// // Child values take precedence over parent values
    /// childContext.AddValues(parentContext);
    ///
    /// // Restore context from template while preserving current values
    /// currentContext.AddValues(templateContext, onlySelf: true);
    ///
    /// // Chain context operations
    /// targetContext.AddValues(sourceContext)
    ///              .SetValue("MergedAt", DateTime.UtcNow);
    /// </code>
    /// </example>
    public static IPlatformApplicationRequestContext AddValues(
        this IPlatformApplicationRequestContext context,
        IPlatformApplicationRequestContext values,
        bool onlySelf = false)
    {
        context.AddValues(values.GetAllIncludeIgnoredKeyValues(), onlySelf);

        return context;
    }

    /// <summary>
    /// Retrieves a strongly-typed value from a dictionary-based context, with intelligent handling for both
    /// request context instances and generic dictionaries. This method provides a unified interface for
    /// value retrieval across different context representations.
    /// </summary>
    /// <typeparam name="T">
    /// The type of value to retrieve and cast the result to. Must be compatible with the stored value type.
    /// </typeparam>
    /// <param name="context">
    /// The context dictionary from which to retrieve the value. Can be an <see cref="IPlatformApplicationRequestContext"/>
    /// instance or any generic dictionary with string keys and object values.
    /// </param>
    /// <param name="contextKey">
    /// The key of the value to retrieve. Should follow standard context key conventions.
    /// </param>
    /// <returns>
    /// The value associated with the specified key, cast to type T. Returns the default value for type T
    /// if the key is not found, the value is null, or the cast fails.
    /// </returns>
    /// <remarks>
    /// <para>
    /// <strong>Polymorphic Behavior:</strong>
    /// - When context is <see cref="IPlatformApplicationRequestContext"/>: Uses the context's native GetValue method
    /// - When context is a generic dictionary: Uses <see cref="PlatformRequestContextHelper.TryGetAndConvertValue{T,TItem}"/> for safe retrieval
    /// - Provides consistent behavior regardless of the underlying context implementation
    /// </para>
    ///
    /// <para>
    /// <strong>Type Safety:</strong>
    /// - Performs safe type casting with fallback to default values
    /// - Handles null values and missing keys gracefully
    /// - Compatible with value types, reference types, and nullable types
    /// </para>
    ///
    /// <para>
    /// <strong>Use Cases:</strong>
    /// - Retrieving context values in generic methods that work with various context types
    /// - Safe value extraction in scenarios where context type is unknown at compile time
    /// - Integration with third-party libraries that use dictionary interfaces
    /// - Context value access in serialization/deserialization scenarios
    /// </para>
    /// </remarks>
    /// <example>
    /// <code>
    /// // Works with request context instances
    /// IPlatformApplicationRequestContext requestContext = GetCurrentContext();
    /// var userId = requestContext.GetRequestContextValue&lt;string&gt;(PlatformApplicationCommonRequestContextKeys.UserIdContextKey);
    /// var roles = requestContext.GetRequestContextValue&lt;string[]&gt;(PlatformApplicationCommonRequestContextKeys.UserRolesContextKey);
    ///
    /// // Works with generic dictionaries
    /// IDictionary&lt;string, object?&gt; contextDict = GetContextAsDictionary();
    /// var email = contextDict.GetRequestContextValue&lt;string&gt;(PlatformApplicationCommonRequestContextKeys.EmailContextKey);
    /// var processStart = contextDict.GetRequestContextValue&lt;DateTime&gt;("ProcessingStartTime");
    ///
    /// // Safe handling of missing or null values
    /// var department = contextDict.GetRequestContextValue&lt;string&gt;("Department") ?? "Unknown";
    /// var priority = contextDict.GetRequestContextValue&lt;int&gt;("Priority"); // Returns 0 if missing
    /// </code>
    /// </example>
    public static T GetRequestContextValue<T>(this IDictionary<string, object?> context, string contextKey)
    {
        if (context is IPlatformApplicationRequestContext userContext)
            return userContext.GetValue<T>(contextKey);
        if (PlatformRequestContextHelper.TryGetAndConvertValue(context, contextKey, out T item))
            return item;

        return default;
    }

    /// <summary>
    /// Sets a value in a dictionary-based context with intelligent handling for both request context instances
    /// and generic dictionaries. This method provides a unified interface for value storage across different
    /// context representations.
    /// </summary>
    /// <param name="context">
    /// The context dictionary in which to set the value. Can be an <see cref="IPlatformApplicationRequestContext"/>
    /// instance or any mutable generic dictionary with string keys and object values.
    /// </param>
    /// <param name="value">
    /// The value to store in the context. Can be any object type including null.
    /// </param>
    /// <param name="contextKey">
    /// The key to associate with the value. Should follow standard context key conventions and be unique within the context.
    /// </param>
    /// <remarks>
    /// <para>
    /// <strong>Polymorphic Behavior:</strong>
    /// - When context is <see cref="IPlatformApplicationRequestContext"/>: Uses the context's native SetValue method with default parameters
    /// - When context is a generic dictionary: Uses dictionary's indexer or Upsert extension method for safe insertion
    /// - Provides consistent value storage regardless of the underlying context implementation
    /// </para>
    ///
    /// <para>
    /// <strong>Value Handling:</strong>
    /// - Overwrites existing values for the same key
    /// - Handles null values appropriately based on the context type
    /// - Maintains type safety and context integrity
    /// </para>
    ///
    /// <para>
    /// <strong>Use Cases:</strong>
    /// - Setting context values in generic methods that work with various context types
    /// - Context manipulation in scenarios where context type is determined at runtime
    /// - Integration with serialization frameworks that work with dictionary interfaces
    /// - Unified context operations in abstracted service layers
    /// </para>
    ///
    /// <para>
    /// <strong>Thread Safety:</strong>
    /// Thread safety depends on the underlying context implementation. Request context instances
    /// typically provide thread-safe operations, while generic dictionaries may require external synchronization.
    /// </para>
    /// </remarks>
    /// <example>
    /// <code>
    /// // Works with request context instances
    /// IPlatformApplicationRequestContext requestContext = GetCurrentContext();
    /// requestContext.SetRequestContextValue("user123", PlatformApplicationCommonRequestContextKeys.UserIdContextKey);
    /// requestContext.SetRequestContextValue(new[] { "Admin", "User" }, PlatformApplicationCommonRequestContextKeys.UserRolesContextKey);
    ///
    /// // Works with generic dictionaries
    /// IDictionary&lt;string, object?&gt; contextDict = new Dictionary&lt;string, object?&gt;();
    /// contextDict.SetRequestContextValue("john.doe@company.com", PlatformApplicationCommonRequestContextKeys.EmailContextKey);
    /// contextDict.SetRequestContextValue(DateTime.UtcNow, "LastActivity");
    ///
    /// // Null value handling
    /// contextDict.SetRequestContextValue(null, "OptionalField"); // Explicitly set to null
    ///
    /// // Generic method usage
    /// public void UpdateContext&lt;TContext&gt;(TContext context, string userId)
    ///     where TContext : IDictionary&lt;string, object?&gt;
    /// {
    ///     context.SetRequestContextValue(userId, PlatformApplicationCommonRequestContextKeys.UserIdContextKey);
    /// }
    /// </code>
    /// </example>
    public static void SetRequestContextValue(this IDictionary<string, object?> context, object? value, string contextKey)
    {
        if (context is IPlatformApplicationRequestContext userContext)
            userContext.SetValue(value, contextKey);
        else
            context.Upsert(contextKey, value);
    }
}
