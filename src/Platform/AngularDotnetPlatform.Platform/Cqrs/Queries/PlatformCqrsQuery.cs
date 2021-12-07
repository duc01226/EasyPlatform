using System;
using AngularDotnetPlatform.Platform.Application.Dtos;
using AngularDotnetPlatform.Platform.Validators;
using MediatR;

namespace AngularDotnetPlatform.Platform.Cqrs.Queries
{
    public interface IPlatformCqrsQuery : IPlatformCqrsRequest
    {
    }

    public abstract class PlatformCqrsQuery<TResult> : IPlatformCqrsQuery, IRequest<TResult>
        where TResult : PlatformCqrsQueryResult
    {
        public Guid? HandleAuditedTrackId { get; set; }

        public DateTime? HandleAuditedDate { get; set; }

        public string HandleAuditedByUserId { get; set; }

        public void PopulateAuditInfo(
            Guid? handleAuditedTrackId,
            DateTime? handleAuditedDate,
            string handleAuditedByUserId)
        {
            HandleAuditedTrackId = handleAuditedTrackId;
            HandleAuditedDate = handleAuditedDate;
            HandleAuditedByUserId = handleAuditedByUserId;
        }

        public virtual PlatformValidationResult Validate()
        {
            return PlatformValidationResult.Valid();
        }
    }

    public abstract class PlatformCqrsPagedResultQuery<TResult, TItem> : PlatformCqrsQuery<TResult>, IPlatformPagedRequest
        where TResult : PlatformCqrsQueryPagedResult<TItem>
    {
        public int SkipCount { get; set; }
        public int MaxResultCount { get; set; } = 10;
        public bool IsPagedRequestValid()
        {
            return SkipCount >= 0 && MaxResultCount >= 0;
        }
    }
}
