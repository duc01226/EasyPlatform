using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Cqrs;
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
        private readonly ITextSnippetRepository<TextSnippetEntity> repository;
        private readonly IPlatformFullTextSearchPersistenceHelper fullTextSearchPersistenceHelper;

        public SearchSnippetTextQueryHandler(
            ITextSnippetRepository<TextSnippetEntity> repository,
            IPlatformFullTextSearchPersistenceHelper fullTextSearchPersistenceHelper)
        {
            this.repository = repository;
            this.fullTextSearchPersistenceHelper = fullTextSearchPersistenceHelper;
        }

        protected override async Task<SearchSnippetTextQueryResult> HandleAsync(SearchSnippetTextQuery request, CancellationToken cancellationToken)
        {
            var fullItemsQuery = repository
                .GetAllQuery()
                .Pipe(query => !string.IsNullOrEmpty(request.SearchText)
                    ? fullTextSearchPersistenceHelper.Search(query, request.SearchText, e => e.SnippetText)
                    : query)
                .WhereIf(request.SearchId != null, p => p.Id == request.SearchId);

            var pagedEntities = await repository.GetAllAsync(
                fullItemsQuery
                    .OrderBy(p => p.SnippetText)
                    .Pipe(query => request.IsPagedRequestValid()
                        ? query.PageBy(request.SkipCount, request.MaxResultCount)
                        : query),
                cancellationToken);
            var totalCount = await repository.CountAsync(fullItemsQuery, cancellationToken);

            return new SearchSnippetTextQueryResult(
                pagedEntities.Select(p => new TextSnippetEntityDto(p)).ToList(),
                totalCount,
                request.MaxResultCount);
        }
    }
}
