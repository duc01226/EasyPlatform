using System.Collections.Generic;

namespace AngularDotnetPlatform.Platform.Common.Dtos
{
    public interface IPlatformPagedResult<TItem> : IPlatformDto
    {
        List<TItem> Items { get; set; }
        int TotalCount { get; set; }
        int PageSize { get; set; }
    }
}
