#region

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.ModelBinding.Binders;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.AspNetCore.Mvc.ModelBinding;

/// <summary>
/// Model binder provider for handling empty list scenarios in form data submissions.
/// This provider creates model binders that detect when HTML forms submit empty collections
/// using the "[]" convention and properly instantiate empty collection objects instead of leaving them null.
/// </summary>
/// <remarks>
/// <para>
/// <strong>HTML form empty list problem:</strong> When HTML forms contain dynamic lists (like checkboxes,
/// multi-select dropdowns, or dynamically added form elements), browsers send no data when all items
/// are removed or unchecked. This causes ASP.NET Core model binding to leave collection properties as null
/// instead of empty collections, breaking business logic that expects non-null collections.
/// </para>
/// <para>
/// <strong>Solution approach:</strong> This provider detects a special form value "[]" that indicates
/// an intentionally empty list. When this value is the only value for a collection property,
/// it creates an appropriate empty collection instance instead of leaving the property null.
/// </para>
/// <para>
/// <strong>Supported collection types:</strong>
/// </para>
/// <list type="bullet">
/// <item><description>Generic lists: List&lt;T&gt;, IList&lt;T&gt;</description></item>
/// <item><description>Generic collections: ICollection&lt;T&gt;, IEnumerable&lt;T&gt;</description></item>
/// <item><description>Arrays: T[]</description></item>
/// <item><description>Custom collection types that implement IEnumerable&lt;T&gt;</description></item>
/// </list>
/// <para>
/// <strong>Exclusions:</strong> This provider specifically excludes:
/// </para>
/// <list type="bullet">
/// <item><description>String type (which implements IEnumerable&lt;char&gt; but shouldn't be treated as a collection)</description></item>
/// <item><description>Dictionary types (IDictionary&lt;,&gt;) which have different semantics</description></item>
/// <item><description>File upload collections (IFormFile, IFormFileCollection)</description></item>
/// <item><description>Non-form binding sources (JSON, XML, etc.)</description></item>
/// </list>
/// <para>
/// <strong>Integration with JavaScript frameworks:</strong> Modern JavaScript frameworks often send "[]"
/// to represent empty arrays in form data. This provider ensures such submissions are handled correctly
/// on the server side.
/// </para>
/// <para>
/// <strong>Business scenarios:</strong>
/// </para>
/// <list type="bullet">
/// <item><description>User permission forms where all permissions might be unchecked</description></item>
/// <item><description>Product category selections where no categories are chosen</description></item>
/// <item><description>Survey responses where optional multi-select questions are left empty</description></item>
/// <item><description>Shopping cart scenarios where all items are removed</description></item>
/// <item><description>Tag or label assignment forms where no tags are selected</description></item>
/// </list>
/// </remarks>
/// <example>
/// Example form submission scenarios this provider handles:
/// <code>
/// // HTML form with checkboxes - when none are checked:
/// // Browser sends: categories=[]
/// // Without provider: Categories property = null
/// // With provider: Categories property = new List&lt;string&gt;()
///
/// // JavaScript AJAX form submission:
/// // FormData: "permissions": "[]"
/// // Result: Permissions property = new List&lt;int&gt;() instead of null
///
/// // Multiple scenarios in one form:
/// // tags=[]&amp;categories=Web&amp;categories=API
/// // tags becomes empty list, categories gets populated normally
/// </code>
/// </example>
/// <seealso cref="PlatformEmptyListModelBinder"/>
/// <seealso cref="IEnumerable{T}"/>
/// <seealso cref="List{T}"/>
/// This provider supplies the PlatformEmptyListModelBinder for any property that is an enumerable type, such as List&lt;T&gt; or IEnumerable&lt;T&gt;.
/// </summary>
public class PlatformEmptyListModelBinderProvider : IModelBinderProvider
{
    public IModelBinder GetBinder(ModelBinderProviderContext context)
    {
        // Only care IEnumerable<T> except string.
        if (
            !context.Metadata.IsEnumerableType
            || context.Metadata.ModelType == typeof(string)
            || context.Metadata.ModelType.IsAssignableToGenericType(typeof(IDictionary<,>))
            || context.Metadata.ModelType.IsAssignableTo(typeof(IEnumerable<IFormFile>))
            || context.Metadata.ModelType.IsAssignableTo(typeof(IFormFileCollection))
            || !(context.BindingInfo.BindingSource == null || context.BindingInfo.BindingSource.CanAcceptDataFrom(BindingSource.Form))
            || context.Metadata.ElementMetadata == null
        )
            return null;

        var (modelType, modelElementType) = (context.Metadata.ModelType, context.Metadata.ElementMetadata!.ModelType);
        // Get the binder for the element type (simple or complex).
        var elementBinder = context.CreateBinder(context.Metadata.ElementMetadata);

        return new PlatformEmptyListModelBinder(modelType, modelElementType, elementBinder, context.Services.GetRequiredService<ILoggerFactory>());
    }
}

/// <summary>
/// Model binder implementation that detects and handles empty list submissions in form data.
/// This binder checks for the special "[]" form value that indicates an intentionally empty collection
/// and creates appropriate empty collection instances instead of leaving properties null.
/// </summary>
/// <remarks>
/// <para>
/// <strong>Empty list detection logic:</strong> The binder looks for form submissions where:
/// </para>
/// <list type="number">
/// <item><description>A collection property receives exactly one value</description></item>
/// <item><description>That value is the special <see cref="EmptyListSignal"/> ("[]")</description></item>
/// <item><description>No other values are present for that property</description></item>
/// </list>
/// <para>
/// <strong>Collection instantiation strategy:</strong>
/// </para>
/// <list type="bullet">
/// <item><description>Interface types (IList&lt;T&gt;, IEnumerable&lt;T&gt;): Creates List&lt;T&gt; instance</description></item>
/// <item><description>Array types (T[]): Creates appropriate array type using ArrayModelBinder&lt;T&gt;</description></item>
/// <item><description>Concrete types: Attempts to create instance using Activator.CreateInstance</description></item>
/// <item><description>Fallback: Delegates to the original collection model binder</description></item>
/// </list>
/// <para>
/// <strong>Fallback behavior:</strong> If the special empty list condition is not met, the binder
/// delegates to the default ASP.NET Core collection model binder, ensuring normal collection
/// binding behavior for populated lists.
/// </para>
/// <para>
/// <strong>Type safety:</strong> The binder uses generic type arguments to ensure type-safe
/// collection creation and maintains compatibility with strongly-typed model properties.
/// </para>
/// <para>
/// <strong>Performance considerations:</strong> The binder includes reflection-based type creation
/// for interface types, but this only occurs for empty list scenarios and shouldn't impact
/// normal collection binding performance.
/// </para>
/// <para>
/// <strong>Integration with validation:</strong> Empty collections created by this binder
/// participate normally in model validation, allowing validation attributes like [Required]
/// or [MinLength] to function correctly.
/// </para>
/// </remarks>
/// <example>
/// Form submission examples and resulting behavior:
/// <code>
/// // Case 1: Intentionally empty list
/// // Form data: "categories=[]"
/// // Result: Categories = new List&lt;string&gt;() (empty but not null)
///
/// // Case 2: Normal populated list
/// // Form data: "categories=Web&amp;categories=API"
/// // Result: Categories = ["Web", "API"] (normal binding)
///
/// // Case 3: Mixed scenario
/// // Form data: "tags=[]&amp;categories=Web"
/// // Result: Tags = new List&lt;string&gt;(), Categories = ["Web"]
///
/// // Case 4: No form data for property
/// // Form data: (no "categories" field)
/// // Result: Categories = null (default behavior preserved)
/// </code>
/// </example>
/// <seealso cref="PlatformEmptyListModelBinderProvider"/>
/// <seealso cref="ICollectionModelBinder"/>
/// <seealso cref="ModelBindingContext"/>
/// This model binder checks if a form value of "[]" was sent for an Enumerable property.
/// If it's the *only* value for that key, it creates an empty list. Otherwise, it does nothing,
/// letting the default collection model binder handle populating the list.
/// </summary>
public class PlatformEmptyListModelBinder : IModelBinder
{
    public const string EmptyListSignal = "[]";

    protected readonly ICollectionModelBinder FallbackCollectionBinder;

    public PlatformEmptyListModelBinder(Type modelType, Type modelElementType, IModelBinder elementBinder, ILoggerFactory loggerFactory)
    {
        FallbackCollectionBinder = BuildFallbackCollectionModelBinder(
            modelElementType,
            genericCollectionModelBinderType: modelType.IsArray ? typeof(ArrayModelBinder<>) : typeof(CollectionModelBinder<>),
            elementBinder,
            loggerFactory
        );
    }

    public Task BindModelAsync(ModelBindingContext bindingContext)
    {
        var valueProviderResult = bindingContext.ValueProvider.GetValue(bindingContext.ModelName);

        // Only trigger our custom logic if exactly one value was posted for this key,
        // and that value is our "[]" signal.
        if (valueProviderResult.Length == 1 && valueProviderResult.FirstValue == EmptyListSignal)
        {
            // Correctly instantiate a concrete List<T>.**
            // We can't create an instance of an interface like IEnumerable<T>.
            // Instead, we determine the list's generic item type (e.g., string from IEnumerable<string>)
            // and create a concrete List<T> of that type.
            var modelType = bindingContext.ModelType;
            if (modelType.IsInterface)
            {
                var itemType = modelType.GetGenericArguments().FirstOrDefault();

                // This check is important for non-generic enumerables like ArrayList.
                if (itemType != null)
                {
                    var listType = typeof(List<>).MakeGenericType(itemType);

                    var emptyList = Activator.CreateInstance(listType);

                    // Set the result to the new empty list and stop further binding.
                    bindingContext.Result = ModelBindingResult.Success(emptyList);
                }
            }
            else
            {
                var emptyList = Activator.CreateInstance(modelType);

                // Set the result to the new empty list and stop further binding.
                bindingContext.Result = ModelBindingResult.Success(emptyList);
            }

            // If we successfully created the empty list, we're done.
            return Task.CompletedTask;
        }

        // If our special case is not met, delegate to the default binder.
        return FallbackCollectionBinder.BindModelAsync(bindingContext);
    }

    private static ICollectionModelBinder BuildFallbackCollectionModelBinder(
        Type elementType,
        Type genericCollectionModelBinderType,
        IModelBinder elementBinder,
        ILoggerFactory loggerFactory
    )
    {
        var binderType = genericCollectionModelBinderType.MakeGenericType(elementType);
        return (ICollectionModelBinder)Activator.CreateInstance(binderType, elementBinder, loggerFactory);
    }
}
