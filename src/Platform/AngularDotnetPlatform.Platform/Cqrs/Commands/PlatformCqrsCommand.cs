using System;
using AngularDotnetPlatform.Platform.Validators;
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
        public Guid? HandleAuditedTrackId { get; private set; }

        public DateTime? HandleAuditedDate { get; private set; }

        public string HandleAuditedByUserId { get; private set; }

        public virtual PlatformValidationResult Validate()
        {
            return PlatformValidationResult.Valid();
        }

        public void PopulateAuditInfo(
            Guid? handleAuditedTrackId,
            DateTime? handleAuditedDate,
            string handleAuditedByUserId)
        {
            HandleAuditedTrackId = handleAuditedTrackId;
            HandleAuditedDate = handleAuditedDate;
            HandleAuditedByUserId = handleAuditedByUserId;
        }
    }
}
