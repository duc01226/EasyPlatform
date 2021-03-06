using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Cqrs.Commands;
using Easy.Platform.Common.Extensions;
using MediatR;
using Microsoft.Extensions.Logging;

namespace PlatformExampleApp.TextSnippet.Application.CqrsPipelineMiddleware;

/// <summary>
/// Example implementation of PlatformCqrsPipelineMiddleware
/// We do audit log a command after it's executed here.
/// </summary>
public class CommandAuditLogCqrsPipelineMiddleware<TRequest, TResponse> : PlatformCqrsPipelineMiddleware<TRequest, TResponse>
{
    private readonly ILogger<CommandAuditLogCqrsPipelineMiddleware<TRequest, TResponse>> logger;

    public CommandAuditLogCqrsPipelineMiddleware(
        ILogger<CommandAuditLogCqrsPipelineMiddleware<TRequest, TResponse>> logger)
    {
        this.logger = logger;
    }

    protected override async Task<TResponse> HandleAsync(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        var response = await next();

        if (request is IPlatformCqrsCommand command)
            logger.LogInformationIfEnabled(
                $"Command {command.GetType().Name} has been executed. TrackId: {command.HandleAuditedTrackId}. UserId: {command.HandleAuditedByUserId}");

        return response;
    }
}
