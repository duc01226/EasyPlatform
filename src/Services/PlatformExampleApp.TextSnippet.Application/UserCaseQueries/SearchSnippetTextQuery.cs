using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.Context.UserContext;
using AngularDotnetPlatform.Platform.Cqrs.Queries;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.Extensions;
using AngularDotnetPlatform.Platform.Persistence.Helpers;
using PlatformExampleApp.TextSnippet.Application.EntityDtos;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

namespace PlatformExampleApp.TextSnippet.Application.UserCaseQueries
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

    public class SearchSnippetTextQueryHandler : PlatformCqrsQueryHandler<SearchSnippetTextQuery, SearchSnippetTextQueryResult>
    {
        // If get default repository/unitOfWork will get from the latest registered module. See TextSnippetApplicationModule.
        private readonly ITextSnippetRepository<TextSnippetEntity> repository;
        private readonly IPlatformFullTextSearchPersistenceHelper fullTextSearchPersistenceHelper;

        public SearchSnippetTextQueryHandler(
            IPlatformApplicationUserContextAccessor userContext,
            IUnitOfWorkManager unitOfWorkManager,
            ITextSnippetRepository<TextSnippetEntity> repository,
            IPlatformFullTextSearchPersistenceHelper fullTextSearchPersistenceHelper) : base(userContext, unitOfWorkManager)
        {
            this.repository = repository;
            this.fullTextSearchPersistenceHelper = fullTextSearchPersistenceHelper;
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
                        inFullTextSearchProps: new Expression<Func<TextSnippetEntity, string>>[] { e => e.SnippetText },
                        exactMatch: true))
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
