using System.Collections.Generic;
using NoCeiling.Duc.Interview.Test.Platform.Application.Dtos;

namespace NoCeiling.Duc.Interview.Test.Platform.Cqrs
{
    public abstract class PlatformCqrsQueryResult
    {
    }

    public abstract class PlatformCqrsQueryPagedResult<TItem> : PlatformCqrsQueryResult, IPagedResult<TItem>
    {
        public PlatformCqrsQueryPagedResult(List<TItem> items, int totalCount, int pageSize)
        {
            Items = items;
            TotalCount = totalCount;
            PageSize = pageSize;
        }

        public List<TItem> Items { get; set; }
        public int TotalCount { get; set; }
        public int PageSize { get; set; }
    }
}
