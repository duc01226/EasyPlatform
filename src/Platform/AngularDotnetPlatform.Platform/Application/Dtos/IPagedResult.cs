using System.Collections.Generic;
using AngularDotnetPlatform.Platform.Validators;

namespace AngularDotnetPlatform.Platform.Application.Dtos
{
    public interface IPlatformPagedResult<TItem> : IPlatformDto
    {
        List<TItem> Items { get; set; }
        int TotalCount { get; set; }
        int PageSize { get; set; }
    }

    public class PlatformPlatformPagedResult<TItem> : IPlatformPagedResult<TItem>
    {
        public List<TItem> Items { get; set; }
        public int TotalCount { get; set; }
        public int PageSize { get; set; }

        public PlatformValidationResult Validate()
        {
            return PlatformValidationResult.Valid();
        }
    }
}
