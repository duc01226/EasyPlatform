using Easy.Platform.Common.Validations;

namespace Easy.Platform.Domain.Exceptions.Extensions;

/// <summary>
/// Provides extension methods for <see cref="PlatformValidationResult{T}"/> to handle domain-specific exceptions.
/// </summary>
public static class WithDomainExceptionValidationExtension
{
    /// <summary>
    /// Configures the validation result to throw a <see cref="PlatformDomainException"/> if the validation is invalid.
    /// This method is used to enforce domain rules, where a failure to validate represents a domain error rather than a simple validation failure.
    /// It wraps the validation errors into a <see cref="PlatformDomainException"/>.
    /// </summary>
    /// <typeparam name="T">The type of the value being validated.</typeparam>
    /// <param name="val">The platform validation result.</param>
    /// <returns>The configured platform validation result.</returns>
    public static PlatformValidationResult<T> WithDomainException<T>(this PlatformValidationResult<T> val)
    {
        return val.WithInvalidException(val => new PlatformDomainException(val.ErrorsMsg()));
    }

    /// <summary>
    /// Configures the validation result to throw a <see cref="PlatformDomainValidationException"/> if the validation is invalid.
    /// This method is used for validation scenarios that are critical to the domain's integrity, where a failure constitutes a specific domain validation error.
    /// It wraps the validation errors into a <see cref="PlatformDomainValidationException"/>.
    /// </summary>
    /// <typeparam name="T">The type of the value being validated.</typeparam>
    /// <param name="val">The platform validation result.</param>
    /// <returns>The configured platform validation result.</returns>
    public static PlatformValidationResult<T> WithDomainValidationException<T>(this PlatformValidationResult<T> val)
    {
        return val.WithInvalidException(val => new PlatformDomainValidationException(val.ErrorsMsg()));
    }

    /// <summary>
    /// Asynchronously configures the validation result to throw a <see cref="PlatformDomainException"/> if the validation is invalid.
    /// This method awaits the validation task and then applies the domain exception configuration.
    /// It is useful for validation logic that involves asynchronous operations.
    /// </summary>
    /// <typeparam name="T">The type of the value being validated.</typeparam>
    /// <param name="valTask">The task representing the asynchronous validation result.</param>
    /// <returns>A task that represents the asynchronous operation, containing the configured platform validation result.</returns>
    public static async Task<PlatformValidationResult<T>> WithDomainException<T>(this Task<PlatformValidationResult<T>> valTask)
    {
        var applicationVal = await valTask;
        return applicationVal.WithDomainException();
    }

    /// <summary>
    /// Asynchronously configures the validation result to throw a <see cref="PlatformDomainValidationException"/> if the validation is invalid.
    /// This method awaits the validation task and then applies the domain validation exception configuration.
    /// It is useful for validation logic that involves asynchronous operations and requires a specific domain validation exception on failure.
    /// </summary>
    /// <typeparam name="T">The type of the value being validated.</typeparam>
    /// <param name="valTask">The task representing the asynchronous validation result.</param>
    /// <returns>A task that represents the asynchronous operation, containing the configured platform validation result.</returns>
    public static async Task<PlatformValidationResult<T>> WithDomainValidationException<T>(this Task<PlatformValidationResult<T>> valTask)
    {
        var applicationVal = await valTask;
        return applicationVal.WithDomainValidationException();
    }
}
