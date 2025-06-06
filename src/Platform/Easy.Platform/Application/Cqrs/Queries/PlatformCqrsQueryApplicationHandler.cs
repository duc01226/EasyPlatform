#region

using System.Diagnostics;
using Easy.Platform.Application.Cqrs.Commands;
using Easy.Platform.Application.Exceptions.Extensions;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Cqrs.Queries;
using Easy.Platform.Common.Exceptions;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Utils;
using Easy.Platform.Common.Validations.Exceptions;
using Easy.Platform.Common.Validations.Extensions;
using Easy.Platform.Infrastructures.Caching;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.Application.Cqrs.Queries;

public interface IPlatformCqrsQueryApplicationHandler
{
    public static readonly List<Type> IgnoreFailedRetryExceptionTypes = [typeof(IPlatformValidationException), typeof(PlatformNotFoundException)];
    public static readonly ActivitySource ActivitySource = new($"{nameof(IPlatformCqrsQueryApplicationHandler)}");
}

/// <summary>
/// Provides a base class for application-level handlers of CQRS query requests with a specified result type.
/// </summary>
/// <typeparam name="TQuery">The type of CQRS query handled by this class.</typeparam>
/// <typeparam name="TResult">The type of the result returned by the query handler.</typeparam>
public abstract class PlatformCqrsQueryApplicationHandler<TQuery, TResult>
    : PlatformCqrsRequestApplicationHandler<TQuery>, IPlatformCqrsQueryApplicationHandler, IRequestHandler<TQuery, TResult>
    where TQuery : PlatformCqrsQuery<TResult>, IPlatformCqrsRequest
{
    /// <summary>
    /// The cache repository provider for handling caching operations.
    /// </summary>
    protected readonly IPlatformCacheRepositoryProvider CacheRepositoryProvider;

    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformCqrsQueryApplicationHandler{TQuery, TResult}" /> class.
    /// </summary>
    /// <param name="requestContextAccessor">The request context accessor providing information about the current application request context.</param>
    /// <param name="loggerFactory">The logger factory used for creating loggers.</param>
    /// <param name="serviceProvider">The root service provider for resolving dependencies.</param>
    /// <param name="cacheRepositoryProvider">The cache repository provider for handling caching operations.</param>
    protected PlatformCqrsQueryApplicationHandler(
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider,
        IPlatformCacheRepositoryProvider cacheRepositoryProvider)
        : base(requestContextAccessor, loggerFactory, serviceProvider)
    {
        CacheRepositoryProvider = cacheRepositoryProvider;
        IsDistributedTracingEnabled = serviceProvider.GetService<PlatformModule.DistributedTracingConfig>()?.Enabled == true;
        ApplicationSettingContext = serviceProvider.GetRequiredService<IPlatformApplicationSettingContext>();
    }

    /// <summary>
    /// Gets a value indicating whether distributed tracing is enabled.
    /// </summary>
    protected bool IsDistributedTracingEnabled { get; }

    protected IPlatformApplicationSettingContext ApplicationSettingContext { get; }

    /// <summary>
    /// Gets the number of retry attempts after a failure.
    /// </summary>
    public virtual int RetryOnFailedTimes { get; set; } = 0;

    public virtual double RetryOnFailedDelaySeconds { get; set; } = Util.TaskRunner.DefaultResilientDelaySeconds;

    /// <summary>
    /// Handles the specified CQRS query asynchronously.
    /// </summary>
    /// <param name="request">The CQRS query to handle.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <returns>The result of handling the CQRS query.</returns>
    public async Task<TResult> Handle(TQuery request, CancellationToken cancellationToken)
    {
        return await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
            () => DoExecuteHandleAsync(request, cancellationToken),
            retryCount: RetryOnFailedTimes,
            sleepDurationProvider: i => RetryOnFailedDelaySeconds.Seconds(),
            ignoreExceptionTypes: IPlatformCqrsQueryApplicationHandler.IgnoreFailedRetryExceptionTypes,
            cancellationToken: cancellationToken);
    }

    /// <summary>
    /// Executes the handling logic for the CQRS query
    /// </summary>
    protected virtual async Task<TResult> DoExecuteHandleAsync(TQuery request, CancellationToken cancellationToken)
    {
        try
        {
            return await HandleWithTracing(
                request,
                async () =>
                {
                    request.SetAuditInfo<TQuery>(BuildRequestAuditInfo(request));

                    await ValidateRequestAsync(request, cancellationToken).EnsureValidAsync();

                    var result = await Util.TaskRunner.CatchExceptionContinueThrowAsync(
                        () => HandleAsync(request, cancellationToken),
                        onException: ex =>
                        {
                            LoggerFactory.CreateLogger(typeof(PlatformCqrsQueryApplicationHandler<,>).GetNameOrGenericTypeName() + $"-{GetType().Name}")
                                .Log(
                                    !ex.IsPlatformLogicException() ? LogLevel.Error : LogLevel.Warning,
                                    ex.BeautifyStackTrace(),
                                    "[{Tag1}] Query:{RequestName} has error {Error}. AuditTrackId:{AuditTrackId}. Request:{@Request}. RequestContext:{@RequestContext}",
                                    "UnknownError",
                                    request.GetType().Name,
                                    ex.Message,
                                    request.AuditInfo?.AuditTrackId,
                                    request,
                                    RequestContext.GetAllKeyValues());
                        });

                    return result;
                });
        }
        finally
        {
            ApplicationSettingContext.ProcessAutoGarbageCollect();
        }
    }

    /// <summary>
    /// Handles the specified CQRS query with distributed tracing.
    /// </summary>
    /// <param name="request">The CQRS query to handle.</param>
    /// <param name="handleFunc">The function representing the handling logic.</param>
    /// <returns>The result of handling the CQRS query.</returns>
    protected async Task<TResult> HandleWithTracing(TQuery request, Func<Task<TResult>> handleFunc)
    {
        if (ApplicationSettingContext.IsDebugInformationMode)
            Logger.LogInformation("{Type} {Method} STARTED", GetType().FullName, nameof(Handle));

        if (IsDistributedTracingEnabled)
        {
            using (var activity =
                IPlatformCqrsCommandApplicationHandler.ActivitySource.StartActivity($"QueryApplicationHandler.{nameof(Handle)}"))
            {
                activity?.SetTag("RequestType", request.GetType().Name);
                activity?.SetTag("Request", request.ToFormattedJson());

                return await handleFunc();
            }
        }

        var result = await handleFunc();

        if (ApplicationSettingContext.IsDebugInformationMode)
            Logger.LogInformation("{Type} {Method} STARTED", GetType().FullName, nameof(Handle));

        return result;
    }

    /// <summary>
    /// Handles the specified CQRS query asynchronously.
    /// </summary>
    /// <param name="request">The CQRS query to handle.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <returns>The result of handling the CQRS query.</returns>
    protected abstract Task<TResult> HandleAsync(TQuery request, CancellationToken cancellationToken);
}
