using System;
using MediatR;
using AngularDotnetPlatform.Platform.Timing;

namespace AngularDotnetPlatform.Platform.Cqrs
{
    public abstract class PlatformCqrsCommand<TResult> : IPlatformCqrsRequest, IRequest<TResult>
        where TResult : PlatformCqrsCommandResult, new()
    {
        public Guid? HandleAuditedTrackId { get; set; }

        public DateTime? HandleAuditedDate { get; set; }

        public string HandleAuditedByUserId { get; set; }
    }
}
