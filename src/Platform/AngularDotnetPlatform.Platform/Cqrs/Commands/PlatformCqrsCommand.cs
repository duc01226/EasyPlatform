using System;
using MediatR;

namespace AngularDotnetPlatform.Platform.Cqrs.Commands
{
    public interface IPlatformCqrsCommand : IPlatformCqrsRequest
    {
    }

    public interface IPlatformCqrsCommand<out TResult> : IPlatformCqrsCommand, IRequest<TResult>
        where TResult : PlatformCqrsCommandResult, new()
    {
    }

    public abstract class PlatformCqrsCommand<TResult> : IPlatformCqrsCommand<TResult>
        where TResult : PlatformCqrsCommandResult, new()
    {
        public Guid? HandleAuditedTrackId { get; set; }

        public DateTime? HandleAuditedDate { get; set; }

        public string HandleAuditedByUserId { get; set; }
    }
}
