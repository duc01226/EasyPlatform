using System.Collections.Generic;
using AngularDotnetPlatform.Platform.Application.Dtos;

namespace AngularDotnetPlatform.Platform.Cqrs
{
    public abstract class PlatformCqrsQueryResult
    {
        public PlatformCqrsQueryResult() { }
    }

    public abstract class PlatformCqrsQueryPagedResult<TItem> : PlatformCqrsQueryResult, IPagedResult<TItem>
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
    }
}
