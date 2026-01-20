#region

using Easy.Platform.Application.Cqrs.Queries;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Cqrs.Queries;
using Easy.Platform.Common.Dtos;
using Easy.Platform.Infrastructures.Caching;
using Easy.Platform.Persistence.Services;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Application.Dtos.EntityDtos;
using PlatformExampleApp.TextSnippet.Application.Helpers;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

#endregion

namespace PlatformExampleApp.TextSnippet.Application.UseCaseQueries;

public sealed class SearchSnippetTextQuery : PlatformCqrsPagedQuery<SearchSnippetTextQueryResult, TextSnippetEntityDto>
{
    public string SearchText { get; set; }
    public string SearchId { get; set; }
    public string SearchAddress { get; set; }
    public string SearchAddressString { get; set; }
    public string SearchSingleAddress { get; set; }

    public static string[] BuildCacheRequestKeyParts(
        SearchSnippetTextQuery request,
        string userId,
        string companyId)
    {
        return IPlatformCqrsRequest.BuildCacheRequestKeyParts(
            request,
            userId,
            companyId);
    }

    public static async Task ClearCache(
        IPlatformCacheRepositoryProvider cacheRepositoryProvider,
        TextSnippetEntity changedEntityData,
        Dictionary<string, object> requestContext,
        Func<ILogger> loggerFactory,
        CancellationToken cancellationToken = default)
    {
        // Queue task to clear cache every 5 seconds for 2 times.
        // Delay because when save data, fulltext index take amount of time to update, so that we wait amount of time for fulltext index update
        // We also set executeOnceImmediately=true to clear cache immediately in case of some index is updated fast
        Util.TaskRunner.QueueIntervalAsyncActionInBackground(
            token => cacheRepositoryProvider.Get().RemoveByTagsAsync([BuildCacheRequestTag(changedEntityData.CreatedByUserId)], token: token),
            intervalTimeInSeconds: 5,
            loggerFactory,
            maximumIntervalExecutionCount: 2,
            executeOnceImmediately: true,
            cancellationToken);
    }

    public static string BuildCacheRequestTag(string createdByUserId)
    {
        return $"Query:{nameof(SearchSnippetTextQuery)};CreatedByUserId:{createdByUserId}";
    }
}

public sealed class SearchSnippetTextQueryResult : PlatformCqrsQueryPagedResult<TextSnippetEntityDto>
{
    public SearchSnippetTextQueryResult() { }

    public SearchSnippetTextQueryResult(List<TextSnippetEntityDto> items, long totalCount, IPlatformPagedRequest pagedRequest) : base(items, totalCount, pagedRequest)
    {
    }
}

internal sealed class SearchSnippetTextQueryHandler : PlatformCqrsQueryApplicationHandler<SearchSnippetTextQuery, SearchSnippetTextQueryResult>
{
    // This is just a demo that helper is used by Application Commands/Queries
    // ReSharper disable once NotAccessedField.Local
#pragma warning disable IDE0052
#pragma warning disable S4487 // Unread "private" fields should be removed
    private readonly ExampleHelper exampleHelper;
#pragma warning restore S4487 // Unread "private" fields should be removed
#pragma warning restore IDE0052

    private readonly IPlatformFullTextSearchPersistenceService fullTextSearchPersistenceService;

    // If get default repository/unitOfWork will get from the latest registered module. See TextSnippetApplicationModule.
    private readonly ITextSnippetRepository<TextSnippetEntity> repository;

    public SearchSnippetTextQueryHandler(
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider,
        IPlatformCacheRepositoryProvider cacheRepositoryProvider,
        ITextSnippetRepository<TextSnippetEntity> repository,
        IPlatformFullTextSearchPersistenceService fullTextSearchPersistenceService,
        ExampleHelper exampleHelper) : base(requestContextAccessor, loggerFactory, serviceProvider, cacheRepositoryProvider)
    {
        this.repository = repository;
        this.fullTextSearchPersistenceService = fullTextSearchPersistenceService;
        this.exampleHelper = exampleHelper;
    }

    protected override async Task<SearchSnippetTextQueryResult> HandleAsync(
        SearchSnippetTextQuery request,
        CancellationToken cancellationToken)
    {
        // NOT RELATED TO MAIN LOGIC. DEMO HOW TO JOIN QUERY
        //var joinQuery = await repository.GetAllAsync(
        //    queryBuilder: (uow, query) => query.Join(
        //        multiDbDemoEntityRepository.GetAllQuery(uow),
        //        p => p.Id,
        //        p => p.Id,
        //        (entity, demoEntity) => entity),
        //    cancellationToken);

        // NOT RELATED TO MAIN LOGIC. TEST GET DYNAMIC DATA LAZY_LOADING STILL WORKS
        //var testDynamicDataHasPropIsEntityHavingLazyLoading = await repository.FirstOrDefaultAsync(
        //    queryBuilder: query => query.AsEnumerable().Select(p => new { entity = p }),
        //    cancellationToken: cancellationToken);

        // STEP 1: Build Queries
        var fullItemsQueryBuilder = repository.GetQueryBuilder(
            builderFn: query => query
                .Where(p => p.CreatedByUserId == RequestContext.UserId())
                .PipeIf(
                    request.SearchText.IsNotNullOrEmpty(),
                    _ => fullTextSearchPersistenceService.Search(
                        query,
                        request.SearchText,
                        [
                            e => e.SnippetText,
                            e => e.FullText
                        ],
                        true,
                        [
                            e => e.SnippetText
                        ]))
                .PipeIf(
                    request.SearchAddress.IsNotNullOrEmpty(),
                    e => e.Where(p => p.Addresses.Any(add => add.Street == request.SearchAddress)))
                .PipeIf(
                    request.SearchSingleAddress.IsNotNullOrEmpty(),
                    e => e.Where(p => p.Address.Street == request.SearchSingleAddress))
                .PipeIf(
                    request.SearchAddressString.IsNotNullOrEmpty(),
                    e => e.Where(p => p.AddressStrings.Any() && p.AddressStrings.Contains(request.SearchAddressString)))
                .WhereIf(request.SearchId != null, p => p.Id == request.SearchId));

        // STEP 2: Get Data
        var (pagedEntities, totalCount) = await Util.TaskRunner.WhenAll(
            repository.GetAllAsync(
                query => fullItemsQueryBuilder(query)
                    .OrderByDescending(p => p.CreatedDate)
                    .PageBy(request.SkipCount, request.MaxResultCount),
                cancellationToken),
            repository.CountAsync(fullItemsQueryBuilder, cancellationToken));

        // STEP 3: Build and return result
        return new SearchSnippetTextQueryResult(
            pagedEntities.Select(p => new TextSnippetEntityDto(p)).ToList(),
            totalCount,
            request);
    }
}
