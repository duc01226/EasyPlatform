using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Cqrs.Queries;
using Easy.Platform.Common.Dtos;

namespace PlatformExampleApp.TextSnippet.Application.UseCaseQueries;

/// <summary>
/// Paging policy for the example application's exposed lists. Omitted sizes return20 items;
/// explicit sizes must be1..200 and offsets must be absent or nonnegative. Reject invalid windows
/// instead of clamping so result metadata describes the submitted request. Shared platform queries
/// retain their separate nullable, unlimited contract.
/// </summary>
public abstract class TextSnippetPagedQuery<TResult, TItem> : PlatformCqrsPagedQuery<TResult, TItem>
    where TResult : PlatformCqrsQueryPagedResult<TItem>
{
    public const int DefaultPageSize = 20;
    public const int MaxPageSize = 200;

    public override int? MaxResultCount { get; set; } = DefaultPageSize;

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return base.Validate()
            .And(_ => MaxResultCount is > 0 and <= MaxPageSize, $"MaxResultCount must be between 1 and {MaxPageSize}")
            .And(_ => SkipCount is null or >= 0, "SkipCount must be nonnegative");
    }
}
