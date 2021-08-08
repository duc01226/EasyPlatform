using System.Collections.Generic;

namespace AngularDotnetPlatform.Platform.Application.Dtos
{
    public interface IPagedResult<TItem> : IPlatformDto
    {
        List<TItem> Items { get; set; }
        int TotalCount { get; set; }
        int PageSize { get; set; }
    }
}
