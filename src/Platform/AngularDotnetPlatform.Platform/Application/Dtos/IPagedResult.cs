using System.Collections.Generic;

namespace AngularDotnetPlatform.Platform.Application.Dtos
{
    public interface IPagedResult<T>
    {
        List<T> Items { get; set; }
        int TotalCount { get; set; }
        int PageSize { get; set; }
    }
}
