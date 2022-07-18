using Easy.Platform.Common.Dtos;
using Easy.Platform.Common.Validators;

namespace Easy.Platform.Common.Cqrs.Queries
{
    public abstract class PlatformCqrsQueryResult
    {
        public PlatformCqrsQueryResult() { }
    }

    public abstract class PlatformCqrsQueryPagedResult<TItem> : PlatformCqrsQueryResult, IPlatformPagedResult<TItem>
    {
        public PlatformCqrsQueryPagedResult() { }

        public PlatformCqrsQueryPagedResult(List<TItem> items, int totalCount, int? pageSize)
        {
            Items = items;
            TotalCount = totalCount;
            PageSize = pageSize;
        }

        public List<TItem> Items { get; set; }
        public long TotalCount { get; set; }
        public int? PageSize { get; set; }

        public PlatformValidationResult Validate()
        {
            return PlatformValidationResult.Valid();
        }
    }
}
