using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.Context.UserContext;
using AngularDotnetPlatform.Platform.Application.Cqrs.Queries;
using AngularDotnetPlatform.Platform.Common.Cqrs.Queries;
using AngularDotnetPlatform.Platform.Common.Extensions;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.Persistence.Helpers;
using PlatformExampleApp.TextSnippet.Application.EntityDtos;
using PlatformExampleApp.TextSnippet.Application.Helpers;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

namespace PlatformExampleApp.TextSnippet.Application.UseCaseQueries
{
    public class SearchSnippetTextQuery : PlatformCqrsPagedResultQuery<SearchSnippetTextQueryResult, TextSnippetEntityDto>
    {
        public string SearchText { get; set; }
        public Guid? SearchId { get; set; }
    }

    public class SearchSnippetTextQueryResult : PlatformCqrsQueryPagedResult<TextSnippetEntityDto>
    {
        public SearchSnippetTextQueryResult() { }

        public SearchSnippetTextQueryResult(List<TextSnippetEntityDto> items, int totalCount, int pageSize) : base(items, totalCount, pageSize)
        {
        }
    }

    public class SearchSnippetTextQueryHandler : PlatformCqrsQueryApplicationHandler<SearchSnippetTextQuery, SearchSnippetTextQueryResult>
    {
        // If get default repository/unitOfWork will get from the latest registered module. See TextSnippetApplicationModule.
        private readonly ITextSnippetRepository<TextSnippetEntity> repository;
        private readonly IPlatformFullTextSearchPersistenceHelper fullTextSearchPersistenceHelper;
        // This is just a demo that helper is used by Application Commands/Queries
        private readonly ExampleHelper exampleHelper;

        public SearchSnippetTextQueryHandler(
            IPlatformApplicationUserContextAccessor userContext,
            IUnitOfWorkManager unitOfWorkManager,
            ITextSnippetRepository<TextSnippetEntity> repository,
            IPlatformFullTextSearchPersistenceHelper fullTextSearchPersistenceHelper,
            ExampleHelper exampleHelper) : base(userContext, unitOfWorkManager)
        {
            this.repository = repository;
            this.fullTextSearchPersistenceHelper = fullTextSearchPersistenceHelper;
            this.exampleHelper = exampleHelper;
        }

        protected override async Task<SearchSnippetTextQueryResult> HandleAsync(SearchSnippetTextQuery request, CancellationToken cancellationToken)
        {
            // STEP 1: Build Queries
            var fullItemsQuery = repository
                .GetAllQuery()
                .PipeIf(
                    ifTrue: !string.IsNullOrEmpty(request.SearchText),
                    thenPipe: query => fullTextSearchPersistenceHelper.Search(
                        query,
                        request.SearchText,
                        inFullTextSearchProps: new Expression<Func<TextSnippetEntity, object>>[] { e => e.SnippetText },
                        fullTextExactMatch: true,
                        includeStartWithProps: new Expression<Func<TextSnippetEntity, object>>[] { e => e.SnippetText }))
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
