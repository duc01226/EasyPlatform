using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Text;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Domain.Services;
using AngularDotnetPlatform.Platform.Persistence.Helpers;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

namespace PlatformExampleApp.TextSnippet.Domain.DomainServices
{
    /// <summary>
    /// Domain service is used to serve business logic operation related to many root domain entities,
    /// the business logic term is understood by domain expert.
    /// </summary>
    public class DemoDomainService : IPlatformDomainService
    {
        private readonly ITextSnippetRepository<TextSnippetEntity> textSnippetRepository;
        private readonly ITextSnippetRootRepository<MultiDbDemoEntity> multiDbDemoEntityRepository;
        private readonly IPlatformFullTextSearchPersistenceHelper fullTextSearchPersistenceHelper;

        public DemoDomainService(
            ITextSnippetRepository<TextSnippetEntity> textSnippetRepository,
            ITextSnippetRootRepository<MultiDbDemoEntity> multiDbDemoEntityRepository,
            IPlatformFullTextSearchPersistenceHelper fullTextSearchPersistenceHelper)
        {
            this.textSnippetRepository = textSnippetRepository;
            this.multiDbDemoEntityRepository = multiDbDemoEntityRepository;
            this.fullTextSearchPersistenceHelper = fullTextSearchPersistenceHelper;
        }

        public async Task TransferSnippetTextToMultiDbDemoEntityName(string snippetTextSearch, MultiDbDemoEntity multiDbDemoEntity)
        {
            var firstFoundTextSnippet = await textSnippetRepository.FirstOrDefaultAsync(
                query => fullTextSearchPersistenceHelper.Search(
                    query,
                    searchText: snippetTextSearch,
                    inFullTextSearchProps: new Expression<Func<TextSnippetEntity, string>>[] { p => p.SnippetText }));

            multiDbDemoEntity.Name = firstFoundTextSnippet.SnippetText;

            await multiDbDemoEntityRepository.Update(multiDbDemoEntity);
        }
    }
}
