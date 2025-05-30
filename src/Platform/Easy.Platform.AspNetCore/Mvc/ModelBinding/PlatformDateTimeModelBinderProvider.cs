#region

using Easy.Platform.Common.JsonSerialization.Converters.Helpers;
using Microsoft.AspNetCore.Mvc.ModelBinding;

#endregion

namespace Easy.Platform.AspNetCore.Mvc.ModelBinding;

/// <summary>
/// Model binder provider for <see cref="DateTime"/> and <see cref="DateTime?"/> types in ASP.NET Core MVC.
/// This provider creates custom model binders that offer enhanced date-time parsing capabilities
/// for incoming HTTP requests, supporting multiple date-time formats beyond the default ASP.NET Core behavior.
/// </summary>
/// <remarks>
/// <para>
/// <strong>Enhanced parsing capabilities:</strong> This provider creates model binders that use the same
/// <see cref="PlatformStringToDateTimeConverterHelper"/> used by the JSON converters, ensuring consistent
/// date-time parsing across JSON APIs and form-based requests.
/// </para>
/// <para>
/// <strong>Request binding scenarios:</strong>
/// </para>
/// <list type="bullet">
/// <item><description>Query parameters: ?startDate=2023-12-25&amp;endDate=25/12/2023</description></item>
/// <item><description>Route parameters: /api/reports/{date} where date is in various formats</description></item>
/// <item><description>Form data: HTML form submissions with date input fields</description></item>
/// <item><description>Header values: Custom headers containing date-time information</description></item>
/// </list>
/// <para>
/// <strong>Supported date-time formats:</strong> The model binder can parse the same variety of formats
/// supported by the platform's JSON converters, including:
/// </para>
/// <list type="bullet">
/// <item><description>ISO 8601 formats (2023-12-25T10:30:00Z)</description></item>
/// <item><description>Regional date formats (DD/MM/YYYY, MM/DD/YYYY)</description></item>
/// <item><description>Database-style formats (YYYY-MM-DD HH:mm:ss)</description></item>
/// <item><description>Custom business formats specific to the platform</description></item>
/// </list>
/// <para>
/// <strong>Error handling:</strong> When date parsing fails, the model binder sets the model binding result
/// to failed, which integrates with ASP.NET Core's model validation system to provide appropriate error responses.
/// </para>
/// <para>
/// <strong>Registration priority:</strong> This provider is registered at the beginning of the model binder
/// provider list through <see cref="AddPlatformModelBinderProviders"/>, ensuring it takes precedence over
/// the default DateTime model binders.
/// </para>
/// <para>
/// <strong>Integration with validation:</strong> Failed binding attempts integrate with ASP.NET Core's
/// model state system, allowing controllers to check ModelState.IsValid and return appropriate error responses.
/// </para>
/// </remarks>
/// <example>
/// Examples of HTTP requests that this model binder can handle:
/// <code>
/// // Query parameters
/// GET /api/events?startDate=2023-12-25T10:30:00Z&amp;endDate=25/12/2023
///
/// // Route parameters
/// GET /api/reports/2023-12-25  (where {date} parameter is DateTime)
///
/// // Form data
/// POST /api/appointments
/// Content-Type: application/x-www-form-urlencoded
/// appointmentDate=25/12/2023 10:30 AM
/// </code>
/// </example>
/// <seealso cref="PlatformDateTimeModelBinder"/>
/// <seealso cref="PlatformStringToDateTimeConverterHelper"/>
/// <seealso cref="PlatformDateTimeJsonConverter"/>
/// <seealso cref="AddPlatformModelBinderProviders"/>
/// Provides a model binder for DateTime and DateTime? types in the ASP.NET Core MVC framework.
/// </summary>
public class PlatformDateTimeModelBinderProvider : IModelBinderProvider
{
    public IModelBinder GetBinder(ModelBinderProviderContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        if (context.Metadata.ModelType == typeof(DateTime) || context.Metadata.ModelType == typeof(DateTime?))
            return new PlatformDateTimeModelBinder(context.Metadata.ModelType == typeof(DateTime?));

        return null;
    }
}

/// <summary>
/// Model binder implementation for binding <see cref="DateTime"/> and <see cref="DateTime?"/> types from HTTP request values.
/// This binder provides enhanced date-time parsing capabilities compared to the default ASP.NET Core DateTime model binder.
/// </summary>
/// <remarks>
/// <para>
/// <strong>Enhanced parsing logic:</strong> This model binder uses <see cref="PlatformStringToDateTimeConverterHelper.TryRead"/>
/// to parse date-time strings, which supports multiple formats and provides more flexibility than the default binder.
/// </para>
/// <para>
/// <strong>Null handling:</strong> The binder is configured during creation to handle either nullable or non-nullable
/// DateTime types, ensuring appropriate behavior for both scenarios:
/// </para>
/// <list type="bullet">
/// <item><description>Non-nullable (DateTime): Requires successful parsing or binding fails</description></item>
/// <item><description>Nullable (DateTime?): Allows null values and graceful failure handling</description></item>
/// </list>
/// <para>
/// <strong>Model state integration:</strong> The binder properly integrates with ASP.NET Core's model state system:
/// </para>
/// <list type="bullet">
/// <item><description>Sets model value in ModelState for validation and error display</description></item>
/// <item><description>Returns Success result for valid parsing</description></item>
/// <item><description>Returns Failed result for invalid parsing, triggering validation errors</description></item>
/// </list>
/// <para>
/// <strong>Value provider integration:</strong> The binder retrieves values from all configured value providers
/// (query string, form data, route values, headers) in the standard ASP.NET Core order of precedence.
/// </para>
/// <para>
/// <strong>Asynchronous operation:</strong> While the parsing logic is synchronous, the binder implements
/// the async model binding interface and executes parsing on a background task to maintain consistency
/// with the ASP.NET Core model binding pipeline.
/// </para>
/// </remarks>
/// <example>
/// This model binder handles various request scenarios:
/// <code>
/// // Controller action parameter
/// public IActionResult GetEvents(DateTime startDate, DateTime? endDate)
/// {
///     // startDate bound from: ?startDate=2023-12-25T10:30:00Z
///     // endDate bound from: &amp;endDate=25/12/2023 (or null if not provided)
/// }
///
/// // Route parameter
/// [Route("reports/{reportDate}")]
/// public IActionResult GetReport(DateTime reportDate)
/// {
///     // reportDate bound from URL segment with flexible parsing
/// }
/// </code>
/// </example>
/// <seealso cref="PlatformDateTimeModelBinderProvider"/>
/// <seealso cref="PlatformStringToDateTimeConverterHelper"/>
/// <seealso cref="ModelBindingContext"/>
/// Model binder for binding DateTime and DateTime? types from request values in the ASP.NET Core MVC framework.
/// </summary>
public class PlatformDateTimeModelBinder : IModelBinder
{
    private readonly bool isNullable;

    public PlatformDateTimeModelBinder(bool isNullable)
    {
        this.isNullable = isNullable;
    }

    public Task BindModelAsync(ModelBindingContext bindingContext)
    {
        return Task.Run(() =>
        {
            // Try to fetch the value of the argument by name
            var valueProviderResult = bindingContext.ValueProvider.GetValue(bindingContext.ModelName);
            if (valueProviderResult == ValueProviderResult.None)
                return;

            bindingContext.ModelState.SetModelValue(bindingContext.ModelName, valueProviderResult);

            try
            {
                var dateStr = valueProviderResult.FirstValue;

                var parsedDate = PlatformStringToDateTimeConverterHelper.TryRead(dateStr).Ensure(v => isNullable || v != null, "Parse DateTime failed");

                bindingContext.Result = ModelBindingResult.Success(parsedDate);
            }
            catch (Exception)
            {
                bindingContext.Result = ModelBindingResult.Failed();
            }
        });
    }
}
