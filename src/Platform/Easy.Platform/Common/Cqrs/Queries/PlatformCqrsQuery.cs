using Easy.Platform.Common.Dtos;
using Easy.Platform.Common.Validators;
using MediatR;

namespace Easy.Platform.Common.Cqrs.Queries
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

    public abstract class PlatformCqrsPagedResultQuery<TResult, TItem> : PlatformCqrsQuery<TResult>,
        IPlatformPagedRequest
        where TResult : PlatformCqrsQueryPagedResult<TItem>
    {
        public virtual int? SkipCount { get; set; }
        public virtual int? MaxResultCount { get; set; }

        public bool IsPagedRequestValid()
        {
            return SkipCount >= 0 && MaxResultCount >= 0;
        }
    }
}
