using System.Linq.Expressions;
using Easy.Platform.Application.Context.UserContext;
using Easy.Platform.Application.Cqrs.Queries;
using Easy.Platform.Common.Cqrs.Queries;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Persistence.Services;
using PlatformExampleApp.TextSnippet.Application.EntityDtos;
using PlatformExampleApp.TextSnippet.Application.Helpers;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

namespace PlatformExampleApp.TextSnippet.Application.UseCaseQueries
{
    public class
        SearchSnippetTextQuery : PlatformCqrsPagedResultQuery<SearchSnippetTextQueryResult, TextSnippetEntityDto>
    {
        public string SearchText { get; set; }
        public Guid? SearchId { get; set; }
    }

    public class SearchSnippetTextQueryResult : PlatformCqrsQueryPagedResult<TextSnippetEntityDto>
    {
        public SearchSnippetTextQueryResult() { }

        public SearchSnippetTextQueryResult(List<TextSnippetEntityDto> items, int totalCount, int? pageSize) : base(
            items,
            totalCount,
            pageSize)
        {
        }
    }

    public class SearchSnippetTextQueryHandler : PlatformCqrsQueryApplicationHandler<SearchSnippetTextQuery,
        SearchSnippetTextQueryResult>
    {
        // If get default repository/unitOfWork will get from the latest registered module. See TextSnippetApplicationModule.
        private readonly ITextSnippetRepository<TextSnippetEntity> repository;

        private readonly IPlatformFullTextSearchPersistenceService fullTextSearchPersistenceService;

        // This is just a demo that helper is used by Application Commands/Queries
        // ReSharper disable once NotAccessedField.Local
        private readonly ExampleHelper exampleHelper;

        public SearchSnippetTextQueryHandler(
            IPlatformApplicationUserContextAccessor userContext,
            IUnitOfWorkManager unitOfWorkManager,
            ITextSnippetRepository<TextSnippetEntity> repository,
            IPlatformFullTextSearchPersistenceService fullTextSearchPersistenceService,
            ExampleHelper exampleHelper) : base(userContext, unitOfWorkManager)
        {
            this.repository = repository;
            this.fullTextSearchPersistenceService = fullTextSearchPersistenceService;
            this.exampleHelper = exampleHelper;
        }

        protected override async Task<SearchSnippetTextQueryResult> HandleAsync(
            SearchSnippetTextQuery request,
            CancellationToken cancellationToken)
        {
            // STEP 1: Build Queries
            var fullItemsQuery = repository
                .GetAllQuery()
                .PipeIf(
                    ifTrue: !string.IsNullOrEmpty(request.SearchText),
                    thenPipe: query => fullTextSearchPersistenceService.Search(
                        query,
                        request.SearchText,
                        inFullTextSearchProps: new Expression<Func<TextSnippetEntity, object>>[]
                        {
                            e => e.SnippetText
                        },
                        fullTextExactMatch: true,
                        includeStartWithProps: new Expression<Func<TextSnippetEntity, object>>[]
                        {
                            e => e.SnippetText
                        }))
                .WhereIf(request.SearchId != null, p => p.Id == request.SearchId);
            var orderedPagedItemsQuery = fullItemsQuery
                .OrderBy(p => p.SnippetText)
                .PipeIf(
                    request.IsPagedRequestValid(),
                    query => query.PageBy(request.SkipCount, request.MaxResultCount));

            // STEP 2: Get Data
            var pagedEntities = await repository.GetAllAsync(query: orderedPagedItemsQuery, cancellationToken);
            var totalCount = await repository.CountAsync(fullItemsQuery, cancellationToken);

            // STEP 3: Build and return result
            return new SearchSnippetTextQueryResult(
                pagedEntities.Select(p => new TextSnippetEntityDto(p)).ToList(),
                totalCount,
                request.MaxResultCount);
        }
    }
}
