#region

using System.Text.Json.Serialization;
using Easy.Platform.AspNetCore.Mvc.ModelBinding;
using Easy.Platform.AspNetCore.Mvc.NamedJsonFormatters;
using Easy.Platform.Common.JsonSerialization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

#endregion

namespace Easy.Platform.AspNetCore.Extensions;

/// <summary>
/// Provides extension methods for configuring ASP.NET Core MVC services with platform-specific functionality.
/// These extensions enhance the MVC builder with custom JSON serialization, model binding, and formatting capabilities
/// tailored for the Easy.Platform and EasyPlatform microservices architecture.
/// </summary>
/// <remarks>
/// This static class contains extension methods that enhance the IMvcBuilder with platform-specific
/// functionality including:
/// - Named JSON serialization options for supporting multiple JSON formats in a single application
/// - Platform-specific model binding configurations
/// - Custom JSON formatters for different API versioning scenarios
/// - Integration with platform JSON serialization standards
/// - Support for heterogeneous JSON format requirements across legacy and modern APIs
///
/// Key features:
/// - Multiple JSON serialization configurations within the same application
/// - Named JSON options for different API endpoints or versions
/// - Platform-standard JSON serialization settings
/// - Custom model binding for platform-specific data types
/// - Integration with platform logging and monitoring
///
/// These extensions are designed to support scenarios where different parts of an application
/// need different JSON serialization behaviors, such as maintaining backward compatibility
/// while introducing new API standards.
///
/// Usage:
/// These methods are typically called during service configuration in Startup.cs or Program.cs
/// to apply platform-standard MVC configurations and JSON handling.
///
/// Reference:
/// The named JSON options implementation is based on the pattern described at:
/// https://thomaslevesque.com/2022/09/19/using-multiple-json-serialization-settings-in-aspnet-core/
/// </remarks>
public static class MvcBuilderExtensions
{
    /// <summary>
    /// Adds support for multiple named JSON serialization configurations within the same ASP.NET Core application.
    /// This enables different API endpoints or versions to use different JSON serialization settings
    /// while maintaining consistency within each configuration.
    /// </summary>
    /// <param name="builder">
    /// The MVC builder instance to configure with named JSON options.
    /// </param>
    /// <param name="settingsName">
    /// The unique name identifier for this JSON configuration. This name will be used to reference
    /// the specific JSON settings when applied to controllers or actions.
    /// </param>
    /// <param name="configure">
    /// An action delegate that configures the JSON options for this named configuration.
    /// This allows customization of serialization behavior including property naming, date formats,
    /// enum handling, and other JSON serialization aspects.
    /// </param>
    /// <returns>
    /// The configured MVC builder instance for method chaining.
    /// </returns>
    /// <exception cref="ArgumentNullException">
    /// Thrown when <paramref name="builder"/>, <paramref name="settingsName"/>, or <paramref name="configure"/> is null.
    /// </exception>
    /// <remarks>
    /// This method enables scenarios where you need to support multiple JSON formats in the same application,
    /// such as:
    /// - Maintaining backward compatibility with legacy API formats
    /// - Supporting different JSON naming conventions for different client types
    /// - Implementing API versioning with different serialization requirements
    /// - Providing specialized JSON formats for specific endpoints
    ///
    /// The implementation:
    /// 1. Registers the named JSON configuration in the service collection
    /// 2. Creates a custom MVC options configurator for the named settings
    /// 3. Adds platform-specific JSON formatters that can select the appropriate configuration
    /// 4. Integrates with the platform's logging infrastructure for diagnostics
    ///
    /// Usage example:
    /// <code>
    /// services.AddMvc()
    ///     .AddPlatformNamedJsonOptions("LegacyApi", options => {
    ///         options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    ///     })
    ///     .AddPlatformNamedJsonOptions("ModernApi", options => {
    ///         options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;
    ///     });
    /// </code>
    ///
    /// Reference: Based on the pattern from Thomas Levesque's blog post about
    /// using multiple JSON serialization settings in ASP.NET Core.
    /// </remarks>
    /// Support customize multiple Heterogenous Json format in a same application if you have old and new api different json format standards
    /// https://thomaslevesque.com/2022/09/19/using-multiple-json-serialization-settings-in-aspnet-core/
    /// </summary>
    public static IMvcBuilder AddPlatformNamedJsonOptions(this IMvcBuilder builder, string settingsName, Action<JsonOptions> configure)
    {
        ArgumentNullException.ThrowIfNull(builder);
        ArgumentNullException.ThrowIfNull(configure);

        builder.Services.Configure(settingsName, configure);
        builder.Services.AddSingleton<IConfigureOptions<MvcOptions>>(sp =>
        {
            var options = sp.GetRequiredService<IOptionsMonitor<JsonOptions>>();
            var loggerFactory = sp.GetRequiredService<ILoggerFactory>();
            return new AddNamedJsonFormatterConfigureMvcOptions(settingsName, options, loggerFactory);
        });
        return builder;
    }

    /// <summary>
    /// Adds platform-specific JSON serialization options to the MVC builder with standardized JSON converters and settings.
    /// This method configures the ASP.NET Core JSON serialization system to use the platform's custom JSON converters
    /// and standard serialization settings, ensuring consistent JSON handling across all API endpoints.
    /// </summary>
    /// <param name="builder">The <see cref="IMvcBuilder" /> to configure.</param>
    /// <param name="useJsonStringEnumConverter">
    /// Indicates whether to use the <see cref="JsonStringEnumConverter" /> for enum values.
    /// When true (default), enums are serialized as strings instead of numeric values, improving readability.
    /// </param>
    /// <param name="useCamelCaseNaming">
    /// Indicates whether to use camelCase naming for JSON property names.
    /// When true, C# PascalCase properties are converted to camelCase in JSON (e.g., "UserName" becomes "userName").
    /// Default is false to maintain PascalCase naming for consistency with .NET conventions.
    /// </param>
    /// <param name="customConverters">
    /// A list of custom <see cref="JsonConverter" /> instances to be added to the serialization options.
    /// These converters are added after the platform converters, allowing for application-specific customizations.
    /// </param>
    /// <param name="ignoreJsonConverterTypes">
    /// A set of platform converter types to exclude from the default configuration.
    /// Use this to disable specific platform converters if they conflict with application requirements.
    /// </param>
    /// <returns>The configured <see cref="IMvcBuilder" /> for method chaining.</returns>
    /// <remarks>
    /// <para>
    /// This method applies the platform's standard JSON configuration through <see cref="PlatformJsonSerializer.ConfigOptions"/>,
    /// which includes:
    /// </para>
    /// <list type="bullet">
    /// <item><description>Custom type info resolver for handling types without public constructors</description></item>
    /// <item><description>Standard platform converters for DateTime, DateOnly, and object types</description></item>
    /// <item><description>Null value handling and reference cycle detection</description></item>
    /// <item><description>Comment handling and case-insensitive property matching</description></item>
    /// </list>
    /// <para>
    /// The method is typically used in Program.cs during application startup:
    /// </para>
    /// <code>
    /// services.AddControllers()
    ///     .AddPlatformJsonOptions(useCamelCaseNaming: true);
    /// </code>
    /// <para>
    /// For applications requiring multiple JSON formats, use <see cref="AddPlatformNamedJsonOptions"/>
    /// to configure additional named JSON formatters.
    /// </para>
    /// </remarks>
    /// <seealso cref="PlatformJsonSerializer.ConfigOptions"/>
    /// <seealso cref="AddPlatformNamedJsonOptions"/>
    public static IMvcBuilder AddPlatformJsonOptions(
        this IMvcBuilder builder,
        bool useJsonStringEnumConverter = true,
        bool useCamelCaseNaming = false,
        List<JsonConverter> customConverters = null,
        HashSet<Type> ignoreJsonConverterTypes = null
    )
    {
        return builder.AddJsonOptions(options =>
            PlatformJsonSerializer.ConfigOptions(options.JsonSerializerOptions, useJsonStringEnumConverter, useCamelCaseNaming, customConverters, ignoreJsonConverterTypes)
        );
    }

    /// <summary>
    /// Adds platform-specific model binder providers to the MVC builder.
    /// This method configures ASP.NET Core MVC to use custom model binders that handle platform-specific
    /// data type conversions and binding logic, particularly for DateTime, DateOnly, and collection types.
    /// </summary>
    /// <param name="builder">The MVC builder to which the model binder providers are added.</param>
    /// <returns>The MVC builder with the added model binder providers for method chaining.</returns>
    /// <remarks>
    /// <para>
    /// This method registers the following platform model binder providers at the beginning of the provider list
    /// to ensure they take priority over default ASP.NET Core model binders:
    /// </para>
    /// <list type="number">
    /// <item><description><see cref="PlatformEmptyListModelBinderProvider"/> - Handles empty list binding from form data with "[]" values</description></item>
    /// <item><description><see cref="PlatformDateOnlyModelBinderProvider"/> - Provides custom binding for DateOnly and DateOnly? types</description></item>
    /// <item><description><see cref="PlatformDateTimeModelBinderProvider"/> - Provides custom binding for DateTime and DateTime? types</description></item>
    /// </list>
    /// <para>
    /// The providers are inserted at index 0 (highest priority) in reverse order, so the actual priority order is
    /// DateTime → DateOnly → EmptyList, ensuring date/time binding takes precedence over collection binding.
    /// </para>
    /// <para>
    /// These custom model binders are essential for:
    /// </para>
    /// <list type="bullet">
    /// <item><description>Parsing date/time strings in various formats from query parameters and form data</description></item>
    /// <item><description>Handling empty collections properly in form submissions</description></item>
    /// <item><description>Ensuring consistent data binding behavior across the platform</description></item>
    /// </list>
    /// <para>
    /// Typical usage in Program.cs:
    /// </para>
    /// <code>
    /// services.AddControllers()
    ///     .AddPlatformModelBinderProviders();
    /// </code>
    /// </remarks>
    /// <seealso cref="PlatformDateTimeModelBinderProvider"/>
    /// <seealso cref="PlatformDateOnlyModelBinderProvider"/>
    /// <seealso cref="PlatformEmptyListModelBinderProvider"/>
    public static IMvcBuilder AddPlatformModelBinderProviders(this IMvcBuilder builder)
    {
        return builder.AddMvcOptions(opts =>
        {
            // Insert at starts to priority using platform model binder provider
            opts.ModelBinderProviders.Insert(0, new PlatformDateTimeModelBinderProvider());
            opts.ModelBinderProviders.Insert(0, new PlatformDateOnlyModelBinderProvider());
            opts.ModelBinderProviders.Insert(0, new PlatformEmptyListModelBinderProvider());
        });
    }
}
