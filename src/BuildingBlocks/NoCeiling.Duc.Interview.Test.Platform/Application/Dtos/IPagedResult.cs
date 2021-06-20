using System.Collections.Generic;

namespace NoCeiling.Duc.Interview.Test.Platform.Application.Dtos
{
    public interface IPagedResult<T>
    {
        List<T> Items { get; set; }
        int TotalCount { get; set; }
        int PageSize { get; set; }
    }
}
