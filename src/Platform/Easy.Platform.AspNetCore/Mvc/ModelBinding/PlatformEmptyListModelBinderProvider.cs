#region

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.ModelBinding.Binders;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.AspNetCore.Mvc.ModelBinding;

/// <summary>
/// This provider supplies the PlatformEmptyListModelBinder for any property that is an enumerable type, such as List<T> or IEnumerable<T>.
/// </summary>
public class PlatformEmptyListModelBinderProvider : IModelBinderProvider
{
    public IModelBinder GetBinder(ModelBinderProviderContext context)
    {
        // Only care IEnumerable<T> except string.
        if (!context.Metadata.IsEnumerableType ||
            context.Metadata.ModelType == typeof(string) ||
            context.Metadata.ModelType.IsAssignableToGenericType(typeof(IDictionary<,>)) ||
            context.Metadata.ModelType.IsAssignableTo(typeof(IEnumerable<IFormFile>)) ||
            context.Metadata.ModelType.IsAssignableTo(typeof(IFormFileCollection)) ||
            !(context.BindingInfo.BindingSource == null || context.BindingInfo.BindingSource.CanAcceptDataFrom(BindingSource.Form)) ||
            context.Metadata.ElementMetadata == null)
            return null;

        var (modelType, modelElementType) = (context.Metadata.ModelType, context.Metadata.ElementMetadata!.ModelType);
        // Get the binder for the element type (simple or complex).
        var elementBinder = context.CreateBinder(context.Metadata.ElementMetadata);

        return new PlatformEmptyListModelBinder(modelType, modelElementType, elementBinder, context.Services.GetRequiredService<ILoggerFactory>());
    }
}

/// <summary>
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
            genericCollectionModelBinderType: modelType.IsArray
                ? typeof(ArrayModelBinder<>)
                : typeof(CollectionModelBinder<>),
            elementBinder,
            loggerFactory);
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
        ILoggerFactory loggerFactory)
    {
        var binderType = genericCollectionModelBinderType.MakeGenericType(elementType);
        return (ICollectionModelBinder)Activator.CreateInstance(binderType, elementBinder, loggerFactory);
    }
}
