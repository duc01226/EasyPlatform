#region

using Easy.Platform.Application.Cqrs.Queries;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Cqrs.Queries;
using Easy.Platform.Infrastructures.Caching;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Application.Dtos.EntityDtos;
using PlatformExampleApp.TextSnippet.Application.RequestContext;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

#endregion

namespace PlatformExampleApp.TextSnippet.Application.UseCaseQueries;

/// <summary>
/// Example query that demonstrates using LazyLoadRequestContextAccessorRegistersFactory
/// to filter results based on CurrentUser context.
/// </summary>
public sealed class GetMyTextSnippetsQuery : PlatformCqrsQuery<List<TextSnippetEntityDto>>
{
    public string? Category { get; set; }
    public int? MaxResults { get; set; } = 50;

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return this.Validate(MaxResults is null or > 0, "MaxResults must be greater than 0 if specified")
            .Validate(MaxResults is null or <= 100, "MaxResults cannot exceed 100")
            .Of<IPlatformCqrsRequest>();
    }
}

/// <summary>
/// Query handler demonstrating LazyLoadRequestContextAccessorRegistersFactory usage.
/// Shows how to use CurrentUser for filtering and authorization in queries.
/// </summary>
internal sealed class GetMyTextSnippetsQueryHandler : PlatformCqrsQueryApplicationHandler<GetMyTextSnippetsQuery, List<TextSnippetEntityDto>>
{
    private readonly ITextSnippetRootRepository<TextSnippetEntity> repository;

    public GetMyTextSnippetsQueryHandler(
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider,
        IPlatformCacheRepositoryProvider cacheRepositoryProvider,
        ITextSnippetRootRepository<TextSnippetEntity> repository
    )
        : base(requestContextAccessor, loggerFactory, serviceProvider, cacheRepositoryProvider)
    {
        this.repository = repository;
    }

    protected override async Task<List<TextSnippetEntityDto>> HandleAsync(GetMyTextSnippetsQuery request, CancellationToken cancellationToken)
    {
        var currentUser = await RequestContext.CurrentUser();
        if (currentUser == null)
            throw new UnauthorizedAccessException("Current user not found in request context");

        var snippetsQueryBuilder = repository.GetQueryBuilder(builderFn: query =>
        {
            IQueryable<TextSnippetEntity> snippetsQuery = query.Where(s => s.CreatedBy == currentUser.Id).OrderByDescending(s => s.CreatedDate);

            if (!string.IsNullOrWhiteSpace(request.Category))
                snippetsQuery = snippetsQuery.Where(s => s.Category == request.Category);

            if (request.MaxResults.HasValue)
                snippetsQuery = snippetsQuery.Take(request.MaxResults.Value);

            return snippetsQuery;
        });

        var snippets = await repository.GetAllAsync(snippetsQueryBuilder, cancellationToken);
        var currentUserName = await RequestContext.CurrentUserFullName() ?? "Unknown";
        var currentUserDepartment = await RequestContext.CurrentUserDepartmentId() ?? "Unknown";

        var result = snippets
            .Select(snippet => new TextSnippetEntityDto
            {
                Id = snippet.Id,
                SnippetText = snippet.SnippetText,
                FullText = snippet.FullText,
                Title = snippet.Title,
                Category = snippet.Category,
                CreatedDate = snippet.CreatedDate,
                // Use cached user data for additional context
                CreatedByName = currentUserName,
                CreatedByDepartment = currentUserDepartment,
            })
            .ToList();

        return result;
    }
}
