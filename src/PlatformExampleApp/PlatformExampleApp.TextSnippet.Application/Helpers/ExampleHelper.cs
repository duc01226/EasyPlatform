using System;
using System.Linq.Expressions;
using System.Threading.Tasks;
using Easy.Platform.Application.Helpers;
using Easy.Platform.Persistence.Services;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

namespace PlatformExampleApp.TextSnippet.Application.Helpers
{
    /// <summary>
    /// This is just an example helper to solve internal logic reuse code for application layer
    /// </summary>
    public class ExampleHelper : IPlatformApplicationHelper
    {
        private readonly ITextSnippetRepository<TextSnippetEntity> textSnippetRepository;
        private readonly ITextSnippetRepository<MultiDbDemoEntity> multiDbDemoEntityRepository;
        private readonly IPlatformFullTextSearchPersistenceService fullTextSearchPersistenceService;

        public ExampleHelper(
            ITextSnippetRepository<TextSnippetEntity> textSnippetRepository,
            ITextSnippetRepository<MultiDbDemoEntity> multiDbDemoEntityRepository,
            IPlatformFullTextSearchPersistenceService fullTextSearchPersistenceService)
        {
            this.textSnippetRepository = textSnippetRepository;
            this.multiDbDemoEntityRepository = multiDbDemoEntityRepository;
            this.fullTextSearchPersistenceService = fullTextSearchPersistenceService;
        }

        public async Task<SearchEntityByNameHelperResult> SearchEntityByName(string name)
        {
            var firstFoundTextSnippet = await textSnippetRepository.FirstOrDefaultAsync(
                query => fullTextSearchPersistenceService.Search(
                    query,
                    searchText: name,
                    inFullTextSearchProps: new Expression<Func<TextSnippetEntity, object>>[] { p => p.SnippetText }));
            var firstFoundMultiDemo = await multiDbDemoEntityRepository.FirstOrDefaultAsync(p => p.Name == name);

            return new SearchEntityByNameHelperResult()
            {
                FirstFoundMultiDbDemo = firstFoundMultiDemo,
                FirstFoundTextSnippet = firstFoundTextSnippet
            };
        }
    }

    public class SearchEntityByNameHelperResult
    {
        public TextSnippetEntity FirstFoundTextSnippet { get; set; }
        public MultiDbDemoEntity FirstFoundMultiDbDemo { get; set; }
    }
}
