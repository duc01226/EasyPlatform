using System;
using MediatR;
using NoCeiling.Duc.Interview.Test.Platform.Application.Dtos;
using NoCeiling.Duc.Interview.Test.Platform.Timing;

namespace NoCeiling.Duc.Interview.Test.Platform.Cqrs
{
    public abstract class PlatformCqrsQuery<TResult> : IRequest<TResult> where TResult : PlatformCqrsQueryResult
    {
        public Guid Id { get; } = Guid.NewGuid();

        public DateTime CreatedDate { get; } = Clock.Now;
    }

    public abstract class PlatformCqrsPagedResultQuery<TResult, TItem> : PlatformCqrsQuery<TResult>, IPagedRequest where TResult : PlatformCqrsQueryPagedResult<TItem>
    {
        public int SkipCount { get; set; }
        public int MaxResultCount { get; set; } = 10;
        public bool IsPagedRequestValid()
        {
            return SkipCount >= 0 && MaxResultCount >= 0;
        }
    }
}
