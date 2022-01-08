using System.Collections.Generic;
using AngularDotnetPlatform.Platform.Common.Dtos;
using AngularDotnetPlatform.Platform.Common.Validators;

namespace AngularDotnetPlatform.Platform.Common.Cqrs.Queries
{
    public abstract class PlatformCqrsQueryResult
    {
        public PlatformCqrsQueryResult() { }
    }

    public abstract class PlatformCqrsQueryPagedResult<TItem> : PlatformCqrsQueryResult, IPlatformPagedResult<TItem>
    {
        public PlatformCqrsQueryPagedResult() { }

        public PlatformCqrsQueryPagedResult(List<TItem> items, int totalCount, int pageSize)
        {
            Items = items;
            TotalCount = totalCount;
            PageSize = pageSize;
        }

        public List<TItem> Items { get; set; }
        public int TotalCount { get; set; }
        public int PageSize { get; set; }
        public PlatformValidationResult Validate()
        {
            return PlatformValidationResult.Valid();
        }
    }
}
