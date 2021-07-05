using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using NoCeiling.Duc.Interview.Test.Platform.Cqrs;
using NoCeiling.Duc.Interview.Test.Platform.Domain.Helpers;
using NoCeiling.Duc.Interview.Test.Platform.Extensions;
using NoCeiling.Duc.Interview.Test.TextSnippet.Application.EntityDtos;
using NoCeiling.Duc.Interview.Test.TextSnippet.Domain.Entities;
using NoCeiling.Duc.Interview.Test.TextSnippet.Domain.Repositories;

namespace NoCeiling.Duc.Interview.Test.TextSnippet.Application.UserCaseQueries
{
    public class SearchSnippetTextQuery : PlatformCqrsPagedResultQuery<SearchSnippetTextQueryResult, TextSnippetEntityDto>
    {
        public string SearchText { get; set; }
        public Guid? SearchId { get; set; }
    }

    public class SearchSnippetTextQueryResult : PlatformCqrsQueryPagedResult<TextSnippetEntityDto>
    {
        public SearchSnippetTextQueryResult(List<TextSnippetEntityDto> items, int totalCount, int pageSize) : base(items, totalCount, pageSize)
        {
        }
    }

    public class SearchSnippetTextQueryHandler : PlatformCqrsQueryHandler<SearchSnippetTextQuery, SearchSnippetTextQueryResult>
    {
        private readonly ITextSnippetRepository<TextSnippetEntity> repository;
        private readonly IPlatformFullTextSearchDomainHelper fullTextSearchDomainHelper;

        public SearchSnippetTextQueryHandler(
            ITextSnippetRepository<TextSnippetEntity> repository,
            IPlatformFullTextSearchDomainHelper fullTextSearchDomainHelper)
        {
            this.repository = repository;
            this.fullTextSearchDomainHelper = fullTextSearchDomainHelper;
        }

        protected override async Task<SearchSnippetTextQueryResult> HandleAsync(SearchSnippetTextQuery request, CancellationToken cancellationToken)
        {
            var fullItemsQuery = repository
                .GetAllQuery()
                .Pipe(query => !string.IsNullOrEmpty(request.SearchText)
                    ? fullTextSearchDomainHelper.Search(query, request.SearchText, e => e.SnippetText)
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
