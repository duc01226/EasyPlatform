using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Common.Cqrs;
using AngularDotnetPlatform.Platform.Common.Cqrs.Commands;
using MediatR;
using Microsoft.Extensions.Logging;

namespace PlatformExampleApp.TextSnippet.Application.CqrsPipelineMiddleware
{
    /// <summary>
    /// Example implementation of PlatformCqrsPipelineMiddleware
    /// We do audit log a command after it's executed here.
    /// </summary>
    public class CommandAuditLogCqrsPipelineMiddleware<TRequest, TResponse> : PlatformCqrsPipelineMiddleware<TRequest, TResponse>
    {
        private readonly ILogger<CommandAuditLogCqrsPipelineMiddleware<TRequest, TResponse>> logger;

        public CommandAuditLogCqrsPipelineMiddleware(ILogger<CommandAuditLogCqrsPipelineMiddleware<TRequest, TResponse>> logger)
        {
            this.logger = logger;
        }

        protected override async Task<TResponse> HandleAsync(TRequest request, CancellationToken cancellationToken, RequestHandlerDelegate<TResponse> next)
        {
            var response = await next();

            if (request is IPlatformCqrsCommand command)
            {
                logger.LogInformation($"Command {command.GetType().Name} has been executed. TrackId: {command.HandleAuditedTrackId}. UserId: {command.HandleAuditedByUserId}");
            }

            return response;
        }
    }
}
