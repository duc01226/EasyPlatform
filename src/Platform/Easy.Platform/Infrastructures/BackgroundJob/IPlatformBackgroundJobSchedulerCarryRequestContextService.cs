using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Infrastructures.BackgroundJob;

/// <summary>
/// Represents a service that manages request context data when scheduling background jobs.
/// This service ensures that the current request context (such as user information, tenant data, etc.)
/// is preserved and carried over to background job execution, maintaining contextual information across async operations.
/// </summary>
public interface IPlatformBackgroundJobSchedulerCarryRequestContextService
{
    /// <summary>
    /// Retrieves the current request context data as a dictionary of key-value pairs.
    /// This method captures contextual information from the current request that needs to be
    /// preserved when the background job is executed later.
    /// </summary>
    /// <returns>A dictionary containing the current request context data where keys represent context property names and values represent the corresponding context values.</returns>
    public IDictionary<string, object?> CurrentRequestContext();

    /// <summary>
    /// Sets the request context values in the specified service scope.
    /// This method restores the previously captured request context when the background job executes,
    /// ensuring the job runs with the same contextual information as the original request.
    /// </summary>
    /// <param name="serviceScope">The service scope in which to set the context values.</param>
    /// <param name="requestContextValues">The dictionary of request context values to restore.</param>
    public void SetCurrentRequestContextValues(IServiceScope serviceScope, IDictionary<string, object?> requestContextValues);
}
