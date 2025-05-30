#region

using Easy.Platform.Common.JsonSerialization.Converters.Helpers;
using Microsoft.AspNetCore.Mvc.ModelBinding;

#endregion

namespace Easy.Platform.AspNetCore.Mvc.ModelBinding;

/// <summary>
/// Model binder provider for <see cref="DateOnly"/> and <see cref="DateOnly?"/> types in ASP.NET Core MVC.
/// This provider creates custom model binders that offer enhanced date parsing capabilities for incoming HTTP requests,
/// supporting multiple date formats and providing consistency with the platform's JSON date handling.
/// </summary>
/// <remarks>
/// <para>
/// <strong>DateOnly type support:</strong> DateOnly (.NET 6+) represents calendar dates without time components,
/// making it ideal for business scenarios like birth dates, due dates, event dates, and scheduling where
/// time-of-day information is not relevant or should be ignored.
/// </para>
/// <para>
/// <strong>Enhanced parsing capabilities:</strong> This provider creates model binders that use
/// <see cref="PlatformStringToDateTimeConverterHelper.TryReadDateOnly"/> to parse date strings,
/// offering the same flexible format support as the platform's JSON DateOnly converters.
/// </para>
/// <para>
/// <strong>Request binding scenarios:</strong>
/// </para>
/// <list type="bullet">
/// <item><description>Query parameters: ?birthDate=1990-05-15&amp;hireDate=15/05/2020</description></item>
/// <item><description>Route parameters: /api/schedule/{date} where date contains only date part</description></item>
/// <item><description>Form data: HTML date input fields that send date-only values</description></item>
/// <item><description>Header values: Custom headers with date information (no time component)</description></item>
/// </list>
/// <para>
/// <strong>Supported date formats:</strong>
/// </para>
/// <list type="bullet">
/// <item><description>ISO 8601 date format (YYYY-MM-DD)</description></item>
/// <item><description>Regional formats (DD/MM/YYYY, MM/DD/YYYY)</description></item>
/// <item><description>Alternative separators (YYYY.MM.DD, YYYY-MM-DD)</description></item>
/// <item><description>Custom business date formats</description></item>
/// </list>
/// <para>
/// <strong>Business use cases:</strong>
/// </para>
/// <list type="bullet">
/// <item><description>Employee management: hire dates, birth dates, review dates</description></item>
/// <item><description>Project management: milestone dates, deadline dates</description></item>
/// <item><description>Financial systems: transaction dates, reporting period dates</description></item>
/// <item><description>Scheduling systems: appointment dates, event dates</description></item>
/// <item><description>HR systems: leave dates, performance review cycles</description></item>
/// </list>
/// <para>
/// <strong>Registration priority:</strong> This provider is registered at the beginning of the model binder
/// provider list, ensuring it takes precedence over any default DateOnly model binders that may exist.
/// </para>
/// </remarks>
/// <example>
/// Examples of HTTP requests that this model binder handles:
/// <code>
/// // Query parameters with date-only values
/// GET /api/employees?hireDate=2020-05-15&amp;birthDate=15/05/1990
///
/// // Route parameters for date-based routing
/// GET /api/schedule/2023-12-25  (where {date} is DateOnly)
///
/// // Form data from HTML date inputs
/// POST /api/appointments
/// Content-Type: application/x-www-form-urlencoded
/// appointmentDate=2023-12-25
/// </code>
/// </example>
/// <seealso cref="PlatformDateOnlyModelBinder"/>
/// <seealso cref="PlatformStringToDateTimeConverterHelper"/>
/// <seealso cref="PlatformDateOnlyJsonConverter"/>
/// <seealso cref="DateOnly"/>
/// Provides a model binder for DateOnly and DateOnly? types in the ASP.NET Core MVC framework.
/// </summary>
public class PlatformDateOnlyModelBinderProvider : IModelBinderProvider
{
    public IModelBinder GetBinder(ModelBinderProviderContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        if (context.Metadata.ModelType == typeof(DateOnly) || context.Metadata.ModelType == typeof(DateOnly?))
            return new PlatformDateOnlyModelBinder(context.Metadata.ModelType == typeof(DateOnly?));

        return null;
    }
}

/// <summary>
/// Model binder implementation for binding <see cref="DateOnly"/> and <see cref="DateOnly?"/> types from HTTP request values.
/// This binder provides enhanced date parsing capabilities specifically designed for date-only scenarios
/// where time components are not needed or should be ignored.
/// </summary>
/// <remarks>
/// <para>
/// <strong>Date-only parsing logic:</strong> This model binder uses <see cref="PlatformStringToDateTimeConverterHelper.TryReadDateOnly"/>
/// to parse date strings, ensuring consistent behavior with the platform's JSON DateOnly converters
/// and supporting multiple regional date formats.
/// </para>
/// <para>
/// <strong>Null handling strategy:</strong> The binder is configured during creation to handle either nullable
/// or non-nullable DateOnly types appropriately:
/// </para>
/// <list type="bullet">
/// <item><description>Non-nullable (DateOnly): Requires successful parsing or binding fails with validation error</description></item>
/// <item><description>Nullable (DateOnly?): Allows null values when no input is provided or parsing fails gracefully</description></item>
/// </list>
/// <para>
/// <strong>Model state integration:</strong> The binder integrates seamlessly with ASP.NET Core's model validation:
/// </para>
/// <list type="bullet">
/// <item><description>Sets model value in ModelState for proper validation pipeline integration</description></item>
/// <item><description>Returns Success result for valid date parsing</description></item>
/// <item><description>Returns Failed result for invalid input, allowing validation attributes to trigger</description></item>
/// </list>
/// <para>
/// <strong>Input source handling:</strong> The binder can retrieve date values from any configured value provider
/// in ASP.NET Core, including query strings, form data, route values, and custom headers.
/// </para>
/// <para>
/// <strong>Business logic advantages:</strong> By using DateOnly instead of DateTime for date-only scenarios,
/// the application avoids timezone confusion, time component artifacts, and clearly expresses intent
/// that only the calendar date is significant.
/// </para>
/// <para>
/// <strong>Asynchronous execution:</strong> The binder executes parsing logic asynchronously to maintain
/// compatibility with the ASP.NET Core model binding pipeline, even though the actual parsing is synchronous.
/// </para>
/// </remarks>
/// <example>
/// Examples of controller actions using this model binder:
/// <code>
/// // API endpoint for employee information
/// public IActionResult GetEmployeesByHireDate(DateOnly hireDate, DateOnly? terminationDate)
/// {
///     // hireDate: required, bound from ?hireDate=2020-05-15
///     // terminationDate: optional, bound from &amp;terminationDate=15/05/2023 or null
/// }
///
/// // Route-based date filtering
/// [Route("events/{eventDate}")]
/// public IActionResult GetDailyEvents(DateOnly eventDate)
/// {
///     // eventDate bound from URL segment: /events/2023-12-25
/// }
///
/// // Form-based appointment scheduling
/// [HttpPost]
/// public IActionResult ScheduleAppointment(DateOnly appointmentDate, TimeOnly appointmentTime)
/// {
///     // Separates date and time concerns for cleaner business logic
/// }
/// </code>
/// </example>
/// <seealso cref="PlatformDateOnlyModelBinderProvider"/>
/// <seealso cref="PlatformStringToDateTimeConverterHelper"/>
/// <seealso cref="DateOnly"/>
/// Model binder for binding DateOnly and DateOnly? types from request values in the ASP.NET Core MVC framework.
/// </summary>
public class PlatformDateOnlyModelBinder : IModelBinder
{
    private readonly bool isNullable;

    public PlatformDateOnlyModelBinder(bool isNullable)
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

                var parsedDate = PlatformStringToDateTimeConverterHelper.TryReadDateOnly(dateStr).Ensure(v => isNullable || v != null, "Parse DateOnly failed");

                bindingContext.Result = ModelBindingResult.Success(parsedDate);
            }
            catch (Exception)
            {
                bindingContext.Result = ModelBindingResult.Failed();
            }
        });
    }
}
